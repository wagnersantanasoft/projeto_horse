import { productService } from './productService.js';
import { CONFIG } from './config.js';
import { computeStatus } from './status.js';
import { brToIso, isoToBr } from './dateUtils.js';
import { paginate, buildPagination } from './pagination.js';
import { initVoiceSearch, initBarcodeScanner } from './voiceCamera.js';

let allProducts = [];
let filtered = [];
let currentPage = 1;
let currentSearch = '';
let daysThreshold = 15;
let currentStatusFilter = '';
let currentGrupo = '';
let currentMarca = '';
let groupBy = '';
let sortField = '';
let sortDir = 'asc';
let loading = false;

const refs = {};
function qs(id) { return document.getElementById(id); }
function storageKey(k){ return CONFIG.STORAGE_PREFIX + k; }

function saveState() {
  const state = {
    search: currentSearch,
    status: currentStatusFilter,
    days: daysThreshold,
    grupo: currentGrupo,
    marca: currentMarca,
    groupBy,
    sortField,
    sortDir,
    theme: document.documentElement.getAttribute('data-theme')
  };
  localStorage.setItem(storageKey('prefs'), JSON.stringify(state));
}

function loadState() {
  try {
    const raw = localStorage.getItem(storageKey('prefs'));
    if (!raw) return;
    const s = JSON.parse(raw);
    currentSearch = s.search ?? '';
    currentStatusFilter = s.status ?? '';
    daysThreshold = s.days ?? 15;
    currentGrupo = s.grupo ?? '';
    currentMarca = s.marca ?? '';
    groupBy = s.groupBy ?? '';
    sortField = s.sortField ?? '';
    sortDir = s.sortDir ?? 'asc';
    if (s.theme) document.documentElement.setAttribute('data-theme', s.theme);
  } catch {}
}

function initRefs() {
  refs.tbody = qs('product-tbody');
  refs.cardsContainer = qs('cards-container');
  refs.feedback = qs('feedback');
  refs.reloadBtn = qs('reload-btn');
  refs.search = qs('search');
  refs.clearSearch = qs('clear-search');

  // Drawer
  refs.drawer = qs('filter-drawer');
  refs.openDrawer = qs('open-drawer');
  refs.closeDrawer = qs('close-drawer');
  refs.drawerBackdrop = qs('drawer-backdrop');
  refs.applyFiltersBtn = qs('apply-filters');

  // Filtros no drawer
  refs.statusFilter = qs('status-filter');
  refs.daysThreshold = qs('days-threshold');
  refs.filterGrupo = qs('filter-grupo');
  refs.filterMarca = qs('filter-marca');
  refs.groupBy = qs('group-by');
  refs.themeSelect = qs('theme-select');

  refs.pagination = qs('pagination');
  refs.btnVoice = qs('btn-voice');
  refs.btnCamera = qs('btn-camera');
  refs.cameraOverlay = qs('camera-overlay');
  refs.cameraVideo = qs('camera-video');
  refs.cameraStatus = qs('camera-status');
  refs.closeCamera = qs('close-camera');
  refs.table = qs('product-table');
}

function setFeedback(msg, type='') {
  refs.feedback.className = 'feedback';
  if (type) refs.feedback.classList.add(type);
  refs.feedback.textContent = msg;
}

function setLoading(value, message='') {
  loading = value;
  if (value) setFeedback(message || 'Processando...');
  else if (!message) setFeedback('');
}

async function loadProducts() {
  setLoading(true, 'Carregando produtos...');
  try {
    allProducts = await productService.listAll();
    computeAllStatuses();
    buildMarcaGrupoOptions();
    syncInputsFromState();
    applyFilters(false);
    setFeedback(`Carregado: ${allProducts.length} registros.`, 'success');
  } catch (e) {
    setFeedback('Erro ao carregar: ' + e.message, 'error');
  } finally {
    setLoading(false);
  }
}

function computeAllStatuses() {
  for (const p of allProducts) {
    const { status, dias } = computeStatus(p, daysThreshold);
    p._status = status;
    p._dias = dias;
  }
}

function buildMarcaGrupoOptions() {
  const marcas = Array.from(new Set(allProducts.map(p => p.MAR_DESCRI).filter(Boolean))).sort();
  const grupos = Array.from(new Set(allProducts.map(p => p.GP_DESCRI).filter(Boolean))).sort();

  refs.filterMarca.innerHTML = '<option value="">Todas</option>' +
    marcas.map(m => `<option value="${escapeHtml(m)}">${escapeHtml(m)}</option>`).join('');
  refs.filterGrupo.innerHTML = '<option value="">Todos</option>' +
    grupos.map(g => `<option value="${escapeHtml(g)}">${escapeHtml(g)}</option>`).join('');
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]||c));
}
function tokenize(s){ return s.toLowerCase().split(/\s+/).filter(Boolean); }

function applyFilters(recalcStatus = true) {
  if (recalcStatus) computeAllStatuses();
  const tokens = tokenize(currentSearch);
  filtered = allProducts.filter(p => {
    if (currentStatusFilter && p._status !== currentStatusFilter) return false;
    if (currentGrupo && p.GP_DESCRI !== currentGrupo) return false;
    if (currentMarca && p.MAR_DESCRI !== currentMarca) return false;
    if (tokens.length) {
      const hay = [
        p.PRO_CODIGO,p.PRO_COD_BARRA,p.PRO_NOME,p.MAR_DESCRI,p.GP_DESCRI,p.UND_NOME
      ].map(v => String(v ?? '').toLowerCase());
      if (!tokens.every(t => hay.some(h => h.includes(t)))) return false;
    }
    return true;
  });
  sortFiltered();
  currentPage = 1;
  render();
  saveState();
}

function sortFiltered() {
  if (!sortField) return;
  const dir = sortDir === 'asc' ? 1 : -1;
  filtered.sort((a,b) => {
    let va = a[sortField];
    let vb = b[sortField];
    if (sortField === '_status') {
      const order = { 'VENCIDO':0, 'ALERTA':1, 'OK':2 };
      va = order[a._status] ?? 99;
      vb = order[b._status] ?? 99;
    }
    if (typeof va === 'string') va = va.toLowerCase();
    if (typeof vb === 'string') vb = vb.toLowerCase();
    if (va < vb) return -1 * dir;
    if (va > vb) return  1 * dir;
    return 0;
  });
}

function highlight(text, term) {
  if (!term) return escapeHtml(text);
  const esc = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return escapeHtml(text).replace(new RegExp(`(${esc})`,'ig'), '<mark>$1</mark>');
}

function render() {
  const state = paginate(filtered, currentPage, CONFIG.PAGE_SIZE);
  buildPagination(refs.pagination, state, (p)=>{ currentPage = p; render(); });
  refs.tbody.innerHTML = '';
  if (groupBy) {
    const groups = groupArray(state.slice, groupBy);
    for (const g of groups) {
      refs.tbody.appendChild(buildGroupRow(g.key, g.items.length));
      g.items.forEach(p => refs.tbody.appendChild(renderRow(p)));
    }
    if (state.slice.length === 0) refs.tbody.appendChild(emptyRow());
  } else {
    for (const p of state.slice) refs.tbody.appendChild(renderRow(p));
    if (state.slice.length === 0) refs.tbody.appendChild(emptyRow());
  }
  renderCards(state.slice);
  updateSortIndicators();
}

function groupArray(list, field) {
  const map = new Map();
  list.forEach(item => {
    const key = item[field] || '(vazio)';
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
  });
  return Array.from(map.entries()).map(([key, items]) => ({ key, items }));
}

function buildGroupRow(label, count) {
  const tr = document.createElement('tr');
  tr.className = 'group-row';
  const td = document.createElement('td');
  td.colSpan = 11;
  td.textContent = `${label} (${count})`;
  tr.appendChild(td);
  return tr;
}

function emptyRow() {
  const tr = document.createElement('tr');
  const td = document.createElement('td');
  td.colSpan = 11;
  td.style.textAlign = 'center';
  td.textContent = 'Nenhum registro.';
  tr.appendChild(td);
  return tr;
}

function statusBadge(status, dias) {
  if (dias == null) {
    if (status === 'VENCIDO') return `<span class="badge status-vencido">Vencido</span>`;
    if (status === 'ALERTA') return `<span class="badge status-alerta">Alerta</span>`;
    return `<span class="badge status-ok">OK</span>`;
  }
  if (status === 'VENCIDO') return `<span class="badge status-vencido">Vencido (${dias})</span>`;
  if (status === 'ALERTA') return `<span class="badge status-alerta">${dias} dias</span>`;
  return `<span class="badge status-ok">${dias} dias</span>`;
}

function renderRow(prod) {
  const tr = document.createElement('tr');
  tr.classList.add(`status-${prod._status}`);

  const tdCodigo = document.createElement('td'); tdCodigo.textContent = prod.PRO_CODIGO;
  const tdBarra = document.createElement('td'); tdBarra.innerHTML = highlight(prod.PRO_COD_BARRA, currentSearch);
  const tdNome = document.createElement('td'); tdNome.innerHTML = highlight(prod.PRO_NOME, currentSearch);
  const tdUnid = document.createElement('td'); tdUnid.textContent = prod.UND_NOME;
  const tdEstoque = document.createElement('td'); tdEstoque.textContent = prod.PRO_ESTOQ1;
  const tdPreco1 = document.createElement('td'); tdPreco1.textContent = prod.PRO_PRECO1;
  const tdPreco2 = document.createElement('td'); tdPreco2.textContent = prod.PRO_PRECO2;
  const tdValidade = document.createElement('td'); tdValidade.appendChild(buildInlineDateDisplay(prod));
  const tdStatus = document.createElement('td'); tdStatus.className='status-cell'; tdStatus.innerHTML = statusBadge(prod._status, prod._dias);
  const tdMarca = document.createElement('td'); tdMarca.innerHTML = highlight(prod.MAR_DESCRI, currentSearch);
  const tdGrupo = document.createElement('td'); tdGrupo.innerHTML = highlight(prod.GP_DESCRI, currentSearch);

  tr.append(tdCodigo, tdBarra, tdNome, tdUnid, tdEstoque, tdPreco1, tdPreco2, tdValidade, tdStatus, tdMarca, tdGrupo);
  return tr;
}

function renderCards(slice) {
  refs.cardsContainer.innerHTML = '';
  if (slice.length === 0) {
    const div = document.createElement('div');
    div.textContent = 'Nenhum registro.';
    div.style.padding = '1rem';
    refs.cardsContainer.appendChild(div);
    return;
  }
  if (groupBy) {
    const groups = groupArray(slice, groupBy);
    for (const g of groups) {
      const header = document.createElement('div');
      header.className = 'group-row';
      header.style.padding = '.35rem .5rem';
      header.style.borderRadius = '4px';
      header.textContent = `${g.key} (${g.items.length})`;
      refs.cardsContainer.appendChild(header);
      g.items.forEach(p => refs.cardsContainer.appendChild(renderCard(p)));
    }
  } else {
    slice.forEach(p => refs.cardsContainer.appendChild(renderCard(p)));
  }
}

function renderCard(prod) {
  const card = document.createElement('div');
  card.className = `product-card status-${prod._status}`;

  const header = document.createElement('div');
  header.className = 'pc-header';

  const title = document.createElement('h3');
  title.className = 'pc-title';
  title.innerHTML = highlight(prod.PRO_NOME, currentSearch);

  const unit = document.createElement('div');
  unit.className = 'pc-unit';
  unit.textContent = prod.UND_NOME || '-';

  const statusDiv = document.createElement('div');
  statusDiv.className = 'pc-status';
  statusDiv.innerHTML = statusBadge(prod._status, prod._dias);

  header.append(title, unit, statusDiv);

  const meta = document.createElement('div');
  meta.className = 'meta-grid';
  meta.innerHTML = `
    <span><span class="meta-label">Cód</span>${escapeHtml(prod.PRO_CODIGO)}</span>
    <span><span class="meta-label">Cód. Barra</span>${highlight(prod.PRO_COD_BARRA, currentSearch) || '-'}</span>
    <span><span class="meta-label">Estoque</span>${escapeHtml(prod.PRO_ESTOQ1)}</span>
    <span><span class="meta-label">Preço 1</span>${escapeHtml(prod.PRO_PRECO1)}</span>
    <span><span class="meta-label">Preço 2</span>${escapeHtml(prod.PRO_PRECO2)}</span>
    <span><span class="meta-label">Marca</span>${highlight(prod.MAR_DESCRI, currentSearch) || '-'}</span>
    <span><span class="meta-label">Grupo</span>${highlight(prod.GP_DESCRI, currentSearch) || '-'}</span>
  `;

  const validadeRow = document.createElement('div');
  validadeRow.className = 'pc-validade';
  validadeRow.appendChild(buildInlineDateDisplay(prod));

  card.append(header, meta, validadeRow);
  return card;
}

function buildInlineDateDisplay(prod) {
  const wrapper = document.createElement('div');
  wrapper.className = 'inline-date-wrapper';
  const display = document.createElement('div');
  display.className = 'inline-date-display';
  const spanDate = document.createElement('span');
  spanDate.className = 'date-text';
  spanDate.textContent = prod.PRO_VALIDADE || '-';

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.textContent = '✎';
  btn.title = 'Editar validade';
  btn.addEventListener('click', () => {
    display.replaceWith(buildInlineEditor(prod));
  });

  display.append(spanDate, btn);
  wrapper.appendChild(display);
  return wrapper;
}

function buildInlineEditor(prod) {
  const container = document.createElement('div');
  container.className = 'inline-date-editor';
  const input = document.createElement('input');
  input.type = 'date';
  const iso = brToIso(prod.PRO_VALIDADE);
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) input.value = iso;

  const btnSave = document.createElement('button');
  btnSave.type = 'button';
  btnSave.className = 'act';
  btnSave.textContent = '✔';
  btnSave.title = 'Salvar';

  const btnCancel = document.createElement('button');
  btnCancel.type = 'button';
  btnCancel.className = 'act';
  btnCancel.textContent = '↺';
  btnCancel.title = 'Cancelar';

  btnSave.addEventListener('click', async () => {
    if (!input.value) return;
    await handleInlineValidadeUpdate(prod, input.value, container);
  });
  btnCancel.addEventListener('click', () => {
    container.replaceWith(buildInlineDateDisplay(prod));
  });

  container.append(input, btnSave, btnCancel);
  return container;
}

async function handleInlineValidadeUpdate(prod, iso, editorEl) {
  const br = isoToBr(iso);
  const oldVal = prod.PRO_VALIDADE;
  editorEl.classList.add('inline-loading');
  setFeedback(`Atualizando validade do produto ${prod.PRO_CODIGO}...`);
  try {
    await productService.updateValidade(prod.PRO_CODIGO, br);
    prod.PRO_VALIDADE = br;
    const { status, dias } = computeStatus(prod, daysThreshold);
    prod._status = status;
    prod._dias = dias;
    setFeedback('Validade atualizada.', 'success');
    applyFilters(false);
  } catch (e) {
    prod.PRO_VALIDADE = oldVal;
    setFeedback('Erro ao atualizar: ' + e.message, 'error');
    editorEl.classList.remove('inline-loading');
  }
}

function updateSortIndicators() {
  const ths = refs.table.querySelectorAll('thead th');
  ths.forEach(th => {
    const field = th.getAttribute('data-sort-field');
    if (!field) return;
    th.classList.add('sortable');
    let ind = th.querySelector('.sort-indicator');
    if (!ind) {
      ind = document.createElement('span');
      ind.className = 'sort-indicator';
      th.appendChild(ind);
    }
    if (field === sortField) {
      ind.textContent = sortDir === 'asc' ? '↑' : '↓';
      ind.style.visibility = 'visible';
    } else {
      ind.textContent = '•';
      ind.style.visibility = 'hidden';
    }
  });
}

function handleHeaderClick(e) {
  const th = e.target.closest('th');
  if (!th) return;
  const field = th.getAttribute('data-sort-field');
  if (!field) return;
  if (sortField === field) sortDir = (sortDir === 'asc') ? 'desc' : 'asc';
  else { sortField = field; sortDir = 'asc'; }
  sortFiltered();
  currentPage = 1;
  render();
  saveState();
}

/* Drawer */
function openDrawer() {
  refs.drawer.classList.add('open');
  refs.drawer.setAttribute('aria-hidden','false');
  refs.drawerBackdrop.hidden = false;
  document.body.style.overflow = 'hidden';
}

function closeDrawer() {
  refs.drawer.classList.remove('open');
  refs.drawer.setAttribute('aria-hidden','true');
  refs.drawerBackdrop.hidden = true;
  document.body.style.overflow = '';
}

function bindEvents() {
  refs.reloadBtn.addEventListener('click', () => loadProducts());
  refs.clearSearch.addEventListener('click', () => {
    refs.search.value = '';
    currentSearch = '';
    applyFilters(false);
    refs.search.focus();
  });

  let debounceId;
  refs.search.addEventListener('input', () => {
    clearTimeout(debounceId);
    debounceId = setTimeout(() => {
      currentSearch = refs.search.value.trim();
      applyFilters(false);
    }, 220);
  });

  // Drawer events
  refs.openDrawer.addEventListener('click', openDrawer);
  refs.closeDrawer.addEventListener('click', closeDrawer);
  refs.drawerBackdrop.addEventListener('click', closeDrawer);
  refs.applyFiltersBtn.addEventListener('click', () => {
    currentStatusFilter = refs.statusFilter.value;
    daysThreshold = Number(refs.daysThreshold.value) || 15;
    currentGrupo = refs.filterGrupo.value;
    currentMarca = refs.filterMarca.value;
    groupBy = refs.groupBy.value;
    // tema
    const theme = refs.themeSelect.value;
    document.documentElement.setAttribute('data-theme', theme);
    applyFilters();
    closeDrawer();
  });

  refs.table.querySelector('thead').addEventListener('click', handleHeaderClick);

  initVoiceSearch({
    button: refs.btnVoice,
    input: refs.search,
    onResult: (val) => {
      currentSearch = val.trim();
      applyFilters(false);
    }
  });

  initBarcodeScanner({
    openButton: refs.btnCamera,
    closeButton: refs.closeCamera,
    overlay: refs.cameraOverlay,
    video: refs.cameraVideo,
    statusEl: refs.cameraStatus,
    onCode: (code) => {
      refs.search.value = code;
      currentSearch = code;
      applyFilters(false);
      refs.search.focus();
    }
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!refs.cameraOverlay.hidden) {
        const evt = new Event('click');
        refs.closeCamera.dispatchEvent(evt);
      } else if (refs.drawer.classList.contains('open')) {
        closeDrawer();
      }
    }
  });
}

function syncInputsFromState() {
  refs.search.value = currentSearch;
  refs.statusFilter.value = currentStatusFilter;
  refs.daysThreshold.value = daysThreshold;
  refs.filterGrupo.value = currentGrupo;
  refs.filterMarca.value = currentMarca;
  refs.groupBy.value = groupBy;
  refs.themeSelect.value = document.documentElement.getAttribute('data-theme') || 'dark';
}

function init() {
  loadState();
  window.__USER_INTERACTED__ = false;
  window.addEventListener('pointerdown', () => { window.__USER_INTERACTED__ = true; }, { once: true });
  window.addEventListener('keydown', () => { window.__USER_INTERACTED__ = true; }, { once: true });

  initRefs();
  bindEvents();
  loadProducts();
}

document.addEventListener('DOMContentLoaded', init);