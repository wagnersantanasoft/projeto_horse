import { productService } from './productService.js';
import { CONFIG } from './config.js';
import { computeStatus } from './status.js';
import { brToIso, isoToBr } from './dateUtils.js';
import { paginate, buildPagination } from './pagination.js';
import { initVoiceSearch, initBarcodeScanner } from './voiceCamera.js';

// Adiciona formatador de número padrão brasileiro
function formatNum(num) {
  return Number(num).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

let allProducts = [];
let filtered = [];
let currentPage = 1;
let currentSearch = '';
let daysThreshold = 15;
let currentStatusFilter = '';
let currentGrupo = '';
let currentMarca = '';
let estoquePositivo = false;
let customDateStart = '';
let customDateEnd = '';
let groupBy = '';
let sortField = '';
let sortDir = 'asc';
let loading = false;

const refs = {};
function qs(id) { return document.getElementById(id); }
function storageKey(k){ return CONFIG.STORAGE_PREFIX + k; }

// TEMA: alternância automática por horário, mas sempre pode ser ajustado manualmente
function getDefaultTheme() {
  const hour = new Date().getHours();
  return (hour >= 6 && hour < 18) ? 'light' : 'dark';
}
function loadTheme() {
  const userPref = localStorage.getItem(storageKey('theme'));
  if (userPref) return userPref;
  return getDefaultTheme();
}
function saveTheme(theme) {
  localStorage.setItem(storageKey('theme'), theme);
}

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
      // if no saved sortField, prefer status-priority
      if (!sortField) sortField = '_status';
    // tema preferido do usuário
    const themePref = s.theme || loadTheme();
    document.documentElement.setAttribute('data-theme', themePref);
  } catch {}
}

function initRefs() {
  refs.estoquePositivo = document.getElementById('estoque-positivo');
  refs.customDateStart = document.getElementById('custom-date-start');
  refs.customDateEnd = document.getElementById('custom-date-end');
  // Define datas padrão ao abrir (após garantir que os elementos existem)
  if (refs.customDateStart && refs.customDateEnd) {
    const hoje = new Date();
    const padStart = hoje.toISOString().slice(0,10);
    const padEnd = new Date(hoje.getTime() + 30*24*60*60*1000).toISOString().slice(0,10);
    refs.customDateStart.value = padStart;
    refs.customDateEnd.value = padEnd;
    customDateStart = padStart;
    customDateEnd = padEnd;
  }
  // Progresso para fonte
  refs.progressBar = document.getElementById('progress-bar');
  refs.progressValue = document.getElementById('progress-value');
  refs.progressBarContainer = document.getElementById('progress-bar-container');
  // Carregar tamanho da fonte salvo
  const fontSize = localStorage.getItem(storageKey('fontSize'));
  if (fontSize) {
    setFontSize(Number(fontSize));
    updateProgressBar(Number(fontSize));
  }
// Atualiza o tamanho da fonte dos cards e da tabela
function setFontSize(percent) {
  const minDate = 0.567, maxDate = 0.9234;
  const minDateBtn = 0.5265, maxDateBtn = 0.81;
  const dateFont = minDate + (maxDate-minDate)*(percent/100);
  const dateBtnFont = minDateBtn + (maxDateBtn-minDateBtn)*(percent/100);
  document.documentElement.style.setProperty('--card-date-font', dateFont+'em');
  document.documentElement.style.setProperty('--card-date-btn-font', dateBtnFont+'em');
  // percent: 0 a 100
  // Cards (mobile)
  const minCard = 0.6885, maxCard = 1.0125;
  const minTitle = 0.6075, maxTitle = 1.215;
  const minMeta = 0.567, maxMeta = 0.972;
  const minStatus = 0.567, maxStatus = 0.891;
  const minBadge = 0.5265, maxBadge = 0.81;
  // Tabela (desktop)
  const minTable = 0.6885, maxTable = 0.9558;
  const minTh = 0.6885, maxTh = 0.9558;
  // Calcula valores
  const cardFont = minCard + (maxCard-minCard)*(percent/100);
  const titleFont = minTitle + (maxTitle-minTitle)*(percent/100);
  const metaFont = minMeta + (maxMeta-minMeta)*(percent/100);
  const statusFont = minStatus + (maxStatus-minStatus)*(percent/100);
  const badgeFont = minBadge + (maxBadge-minBadge)*(percent/100);
  const tableFont = minTable + (maxTable-minTable)*(percent/100);
  const thFont = minTh + (maxTh-minTh)*(percent/100);
  // Cards
  document.documentElement.style.setProperty('--card-font', cardFont+'rem');
  document.documentElement.style.setProperty('--card-title-font', titleFont+'rem');
  document.documentElement.style.setProperty('--card-meta-font', metaFont+'em');
  document.documentElement.style.setProperty('--card-status-font', statusFont+'rem');
  document.documentElement.style.setProperty('--card-badge-font', badgeFont+'rem');
  // Tabela
  document.documentElement.style.setProperty('--table-font', tableFont+'rem');
  document.documentElement.style.setProperty('--table-th-font', thFont+'rem');
  // Salva
  localStorage.setItem(storageKey('fontSize'), percent);
}

function updateProgressBar(percent) {
  if (refs.progressBar) {
    refs.progressBar.style.width = percent + '%';
  }
  if (refs.progressValue) {
    refs.progressValue.textContent = percent + '%';
  }
}

function initFontSizeControl() {
  if (!refs.progressBarContainer) return;
  let percent = 50;
  const saved = localStorage.getItem(storageKey('fontSize'));
  if (saved) percent = Number(saved);
  setFontSize(percent);
  updateProgressBar(percent);
  refs.progressBarContainer.onclick = function(e) {
    const rect = refs.progressBarContainer.getBoundingClientRect();
    const x = e.clientX - rect.left;
    let percent = Math.round((x/rect.width)*100);
    percent = Math.max(0, Math.min(100, percent));
    setFontSize(percent);
    updateProgressBar(percent);
  };
}
  // Inicializa controle de fonte
  setTimeout(initFontSizeControl, 300);
  // Mobile controls
  refs.mobileControls = document.getElementById('mobile-controls');
  refs.openDrawer = document.getElementById('open-drawer');
  refs.orderByBtnMobile = document.getElementById('order-by-btn-mobile');
  refs.daysThreshold = document.getElementById('days-threshold');
  refs.reloadBtn = document.getElementById('reload-btn');
  refs.themeToggle = document.getElementById('theme-toggle');
  // Desktop controls
  refs.openDrawerDesktop = document.getElementById('open-drawer-desktop');
  refs.daysThresholdDesktop = document.getElementById('days-threshold-desktop');
  refs.reloadBtnDesktop = document.getElementById('reload-btn-desktop');
  refs.themeToggleDesktop = document.getElementById('theme-toggle-desktop');
  // Shared
  refs.tbody = document.getElementById('product-tbody');
  refs.cardsContainer = document.getElementById('cards-container');
  refs.feedback = document.getElementById('feedback');
  refs.search = document.getElementById('search');
  refs.clearSearch = document.getElementById('clear-search');
  refs.drawer = document.getElementById('filter-drawer');
  refs.closeDrawer = document.getElementById('close-drawer');
  refs.drawerBackdrop = document.getElementById('drawer-backdrop');
  refs.applyFiltersBtn = document.getElementById('apply-filters');
  refs.statusFilter = document.getElementById('status-filter');
  refs.filterGrupo = document.getElementById('filter-grupo');
  refs.filterMarca = document.getElementById('filter-marca');
  refs.groupBy = document.getElementById('group-by');
  refs.pagination = document.getElementById('pagination');
  refs.btnVoice = document.getElementById('btn-voice');
  refs.btnCamera = document.getElementById('btn-camera');
  refs.orderByBtn = document.getElementById('order-by-btn');
  refs.cameraOverlay = document.getElementById('camera-overlay');
  refs.cameraVideo = document.getElementById('camera-video');
  refs.cameraStatus = document.getElementById('camera-status');
  refs.closeCamera = document.getElementById('close-camera');
  refs.table = document.getElementById('product-table');
}

// ORDER BY cycling support
const ORDER_OPTIONS = [
  { field: '_status', label: 'Status' },
  { field: 'PRO_NOME', label: 'Nome' },
  { field: 'PRO_VALIDADE', label: 'Validade' },
  { field: 'MAR_DESCRI', label: 'Marca' },
  { field: 'GP_DESCRI', label: 'Grupo' },
  { field: 'PRO_ESTOQ1', label: 'Estoque' },
  { field: 'PRO_PRECO1', label: 'Preço' }
];

function applySortInMemory() {
  if (!sortField) return;
  const f = sortField;
  const dir = sortDir === 'asc' ? 1 : -1;
  filtered.sort((a,b) => {
    const va = (a[f] === undefined || a[f] === null) ? '' : a[f];
    const vb = (b[f] === undefined || b[f] === null) ? '' : b[f];
    if (va === vb) return 0;
    if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;
    return String(va).localeCompare(String(vb), 'pt-BR', { numeric: true }) * dir;
  });
}

function setOrder(field, dir = 'asc') {
  sortField = field;
  sortDir = dir;
  saveState();
  applySortInMemory();
  currentPage = 1;
  renderCurrent();
  updateOrderBtnLabel();
  // brief toast to indicate change
  setFeedback(`Ordenado por ${field} ${dir === 'asc' ? '↑' : '↓'}`);
  setTimeout(() => { setFeedback(''); }, 1500);
}

function cycleOrder() {
  const idx = ORDER_OPTIONS.findIndex(o => o.field === sortField);
  let next = 0;
  if (idx === -1) next = 0;
  else next = (idx + 1) % ORDER_OPTIONS.length;
  // if same field, toggle dir
  if (ORDER_OPTIONS[next].field === sortField) {
    sortDir = sortDir === 'asc' ? 'desc' : 'asc';
  }
  setOrder(ORDER_OPTIONS[next].field, sortDir);
}

function updateOrderBtnLabel() {
  if (!refs.orderByBtn) return;
  const opt = ORDER_OPTIONS.find(o => o.field === sortField);
  const label = opt ? opt.label : 'Ordenar';
  const arrow = sortDir === 'asc' ? '↑' : '↓';
  refs.orderByBtn.textContent = label + ' ' + arrow;
  if (refs.orderByBtnMobile) {
    // mobile: show just arrow to save space
    refs.orderByBtnMobile.textContent = arrow;
  }
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
    // Filtro de estoque positivo
    if (estoquePositivo && Number(p.PRO_ESTOQ1) <= 0) return false;
    // Evento para filtro de estoque positivo
    if (refs.estoquePositivo) {
      refs.estoquePositivo.onchange = function(e) {
        estoquePositivo = e.target.checked;
        applyFilters();
      };
    }
    // Filtro personalizado por intervalo de datas
    if (customDateStart && customDateEnd) {
      const val = p.PRO_VALIDADE;
      if (!val) return false;
      const valIso = brToIso(val);
      if (valIso < customDateStart || valIso > customDateEnd) return false;
    }
    // Filtro por status
    if (currentStatusFilter === 'ALERTA') {
      if (!(p._status === 'ALERTA' && p._dias >= 0 && p._dias <= daysThreshold)) return false;
    } else if (currentStatusFilter === 'VENCIDO') {
      if (!(p._status === 'VENCIDO' && p._dias < 0)) return false;
    } else if (currentStatusFilter === 'OK') {
      if (p._status !== 'OK') return false;
    } else if (!currentStatusFilter || currentStatusFilter === '') {
      // Todos: ignora filtro de dias
    } else {
      if (p._status !== currentStatusFilter) return false;
    }
    if (currentGrupo && p.GP_DESCRI !== currentGrupo) return false;
    if (currentMarca && p.MAR_DESCRI !== currentMarca) return false;

    // Busca inteligente: prioriza código, mas também busca por código de barras
    if (tokens.length === 1 && /^\d+$/.test(tokens[0])) {
      const cod = String(p.PRO_CODIGO);
      const barra = String(p.PRO_COD_BARRA);
      if (tokens[0].length <= 7) {
        // Busca prioritária por código
        if (cod.includes(tokens[0])) return true;
        // Se não encontrar pelo código, busca pelo código de barras
        return barra.includes(tokens[0]);
      } else {
        // Para mais de 7 dígitos, busca direto pelo código de barras
        return barra.includes(tokens[0]);
      }
    } else if (tokens.length) {
      const hay = [
        p.PRO_CODIGO,p.PRO_COD_BARRA,p.PRO_NOME,p.MAR_DESCRI,p.GP_DESCRI,p.UND_NOME
      ].map(v => String(v ?? '').toLowerCase());
      if (!tokens.every(t => hay.some(h => h.includes(t)))) return false;
    }
    return true;
  });
  // Eventos para filtro personalizado
  if (refs.customDateStart) {
    refs.customDateStart.onchange = function(e) {
      customDateStart = e.target.value;
      applyFilters();
    };
  }
  if (refs.customDateEnd) {
    refs.customDateEnd.onchange = function(e) {
      customDateEnd = e.target.value;
      applyFilters();
    };
  }
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
  const tdEstoque = document.createElement('td'); tdEstoque.textContent = formatNum(prod.PRO_ESTOQ1);
  const tdPreco1 = document.createElement('td'); tdPreco1.textContent = formatNum(prod.PRO_PRECO1);
  const tdPreco2 = document.createElement('td'); tdPreco2.textContent = formatNum(prod.PRO_PRECO2);

  const tdValidade = document.createElement('td');
  tdValidade.className = 'inline-validade';
  tdValidade.appendChild(buildInlineDateDisplay(prod));

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

// ...código anterior...

function renderCard(prod) {
  const card = document.createElement('div');
  card.className = `product-card status-${prod._status}`;

  // Linha de status + validade
  const statusValidadeRow = document.createElement('div');
  statusValidadeRow.style.display = 'flex';
  statusValidadeRow.style.alignItems = 'center';
  statusValidadeRow.style.gap = '10px';

  const statusDiv = document.createElement('div');
  statusDiv.className = 'pc-status';
  statusDiv.innerHTML = statusBadge(prod._status, prod._dias);

  const validadeRow = document.createElement('div');
  validadeRow.className = 'pc-validade';
  validadeRow.style.margin = '0';
  validadeRow.appendChild(buildInlineDateDisplay(prod));

  statusValidadeRow.appendChild(statusDiv);
  statusValidadeRow.appendChild(validadeRow);

  // Título
  const title = document.createElement('div');
  title.className = 'pc-title';
  title.style.marginTop = '2px';
  title.innerHTML = highlight(prod.PRO_NOME, currentSearch);

  // Grid de metadados
  const meta = document.createElement('div');
  meta.className = 'meta-grid';
  meta.innerHTML = `
    <span><span class="meta-label">CÓD</span>${escapeHtml(prod.PRO_CODIGO)}</span>
    <span><span class="meta-label">CÓD. BARRA</span>${escapeHtml(prod.PRO_COD_BARRA)}</span>
    <span class="meta-grupo"><span class="meta-label">GRUPO</span>${escapeHtml(prod.GP_DESCRI)}</span>
    <span><span class="meta-label">PREÇO 1</span>${formatNum(prod.PRO_PRECO1)}</span>
    <span><span class="meta-label">PREÇO 2</span>${formatNum(prod.PRO_PRECO2)}</span>
    <span class="meta-marca"><span class="meta-label">MARCA</span>${escapeHtml(prod.MAR_DESCRI) || '-'}</span>
    <span class="meta-estoque">
      <span class="meta-label">ESTOQUE</span>
      <span style="display: flex; align-items: baseline; gap: 0.22em;">
        <span class="estoque-valor">${formatNum(prod.PRO_ESTOQ1)} ${escapeHtml(prod.UND_NOME)}</span>
      </span>
    </span>
  `;

  card.append(statusValidadeRow, title, meta);
  return card;
}

// ...restante igual...

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
  // Mobile
  refs.reloadBtn?.addEventListener('click', () => loadProducts());
  refs.daysThreshold?.addEventListener('change', () => {
    const v = Number(refs.daysThreshold.value);
    if (v > 0) {
      daysThreshold = v;
      computeAllStatuses();
      applyFilters(false);
      saveState();
    }
  });
  refs.themeToggle?.addEventListener('click', () => toggleTheme(refs.themeToggle));
  refs.openDrawer?.addEventListener('click', openDrawer);

  // Desktop
  refs.reloadBtnDesktop?.addEventListener('click', () => loadProducts());
  refs.daysThresholdDesktop?.addEventListener('change', () => {
    const v = Number(refs.daysThresholdDesktop.value);
    if (v > 0) {
      daysThreshold = v;
      computeAllStatuses();
      applyFilters(false);
      saveState();
    }
  });
  refs.themeToggleDesktop?.addEventListener('click', () => toggleTheme(refs.themeToggleDesktop));
  refs.openDrawerDesktop?.addEventListener('click', openDrawer);

  // Shared
  refs.closeDrawer.addEventListener('click', closeDrawer);
  refs.drawerBackdrop.addEventListener('click', closeDrawer);
  refs.applyFiltersBtn?.addEventListener('click', () => {
    // legacy: button removed in markup; keep compatibility if present
    currentStatusFilter = refs.statusFilter.value;
    currentGrupo = refs.filterGrupo.value;
    currentMarca = refs.filterMarca.value;
    groupBy = refs.groupBy.value;
    applyFilters();
    closeDrawer();
  });
  // Apply immediately when filters change (no need for an Apply button)
  refs.statusFilter?.addEventListener('change', () => {
    currentStatusFilter = refs.statusFilter.value;
    applyFilters();
  });
  refs.filterGrupo?.addEventListener('change', () => {
    currentGrupo = refs.filterGrupo.value;
    applyFilters();
  });
  refs.filterMarca?.addEventListener('change', () => {
    currentMarca = refs.filterMarca.value;
    applyFilters();
  });
  refs.groupBy?.addEventListener('change', () => {
    groupBy = refs.groupBy.value;
    applyFilters();
  });
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
  refs.table.querySelector('thead').addEventListener('click', handleHeaderClick);

  initVoiceSearch({
    button: refs.btnVoice,
    input: refs.search,
    onResult: (val) => {
      currentSearch = val.trim();
      applyFilters(false);
    }
  });
  // order-by button cycles through predefined options; Shift+click toggles direction
  refs.orderByBtn?.addEventListener('click', (e) => {
    if (e.shiftKey) {
      sortDir = sortDir === 'asc' ? 'desc' : 'asc';
      saveState();
      applySortInMemory();
      renderCurrent();
      updateOrderBtnLabel();
    } else {
      cycleOrder();
    }
  });
  refs.orderByBtnMobile?.addEventListener('click', (e) => {
    if (e.shiftKey) {
      sortDir = sortDir === 'asc' ? 'desc' : 'asc';
      saveState();
      applySortInMemory();
      renderCurrent();
      updateOrderBtnLabel();
    } else {
      cycleOrder();
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

function bindFontSizeControls() {
  const controls = document.getElementById('font-size-controls');
  if (!controls) return;
  controls.querySelectorAll('.font-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      controls.querySelectorAll('.font-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.body.classList.remove('font-size-small', 'font-size-normal', 'font-size-large');
      document.body.classList.add('font-size-' + btn.dataset.size);
      localStorage.setItem(storageKey('fontSize'), btn.dataset.size);
    });
  });
  // carregar preferência
  const saved = localStorage.getItem(storageKey('fontSize')) || 'normal';
  document.body.classList.remove('font-size-small', 'font-size-normal', 'font-size-large');
  document.body.classList.add('font-size-' + saved);
  controls.querySelectorAll('.font-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.size === saved);
  });
}
bindFontSizeControls();

function toggleTheme(btn) {
  const current = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', current);
  btn.textContent = current === 'light' ? '🌙' : '☀️';
  saveTheme(current);
  saveState();
  // Sincroniza símbolo no outro botão
  if (refs.themeToggle && refs.themeToggle !== btn) refs.themeToggle.textContent = btn.textContent;
  if (refs.themeToggleDesktop && refs.themeToggleDesktop !== btn) refs.themeToggleDesktop.textContent = btn.textContent;
}

function syncInputsFromState() {
  refs.search.value = currentSearch;
  refs.statusFilter.value = currentStatusFilter;
  refs.filterGrupo.value = currentGrupo;
  refs.filterMarca.value = currentMarca;
  refs.groupBy.value = groupBy;
  // Sincroniza ambos inputs de dias
  if (refs.daysThreshold) refs.daysThreshold.value = daysThreshold;
  if (refs.daysThresholdDesktop) refs.daysThresholdDesktop.value = daysThreshold;
  // Sincroniza ambos botões de tema
  const themeSymbol = document.documentElement.getAttribute('data-theme') === 'light' ? '🌙' : '☀️';
  if (refs.themeToggle) refs.themeToggle.textContent = themeSymbol;
  if (refs.themeToggleDesktop) refs.themeToggleDesktop.textContent = themeSymbol;
}

function init() {
  document.documentElement.setAttribute('data-theme', loadTheme());
  loadState();
  // update order button to reflect persisted state
  updateOrderBtnLabel();
  window.__USER_INTERACTED__ = false;
  window.addEventListener('pointerdown', () => { window.__USER_INTERACTED__ = true; }, { once: true });
  window.addEventListener('keydown', () => { window.__USER_INTERACTED__ = true; }, { once: true });
  initRefs();
  bindEvents();
  loadProducts();
}
document.addEventListener('DOMContentLoaded', init);