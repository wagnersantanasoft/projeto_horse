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
let daysThreshold = 30;
let currentStatusFilter = '';
let currentGrupo = '';
let currentMarca = '';
let estoquePositivo = false;
let groupBy = '';
let sortField = '';
let sortDir = 'asc';
let loading = false;
let isUserTyping = false;

const refs = {};
function qs(id) { return document.getElementById(id); }
function storageKey(k){ return CONFIG.STORAGE_PREFIX + k; }

// AUTENTICAÇÃO: funções para verificar e gerenciar login
const SESSION_TIMEOUT = 15 * 60 * 1000; // 15 minutos em millisegundos
let sessionTimer = null;
let lastActivity = Date.now();

function getCurrentUser() {
  try {
    const userSession = localStorage.getItem('app_user');
    if (!userSession) return null;
    return JSON.parse(userSession);
  } catch (error) {
    console.warn('Erro ao obter usuário atual:', error);
    return null;
  }
}

function getSessionTimestamp() {
  try {
    const timestamp = localStorage.getItem('app_session_timestamp');
    return timestamp ? parseInt(timestamp) : null;
  } catch (error) {
    console.warn('Erro ao obter timestamp da sessão:', error);
    return null;
  }
}

function updateSessionTimestamp() {
  try {
    localStorage.setItem('app_session_timestamp', Date.now().toString());
    lastActivity = Date.now();
  } catch (error) {
    console.warn('Erro ao atualizar timestamp da sessão:', error);
  }
}

function isSessionExpired() {
  const timestamp = getSessionTimestamp();
  if (!timestamp) return true;
  
  const timeDiff = Date.now() - timestamp;
  return timeDiff > SESSION_TIMEOUT;
}

function isUserLoggedIn() {
  const user = getCurrentUser();
  const hasValidUser = user && (user.USE_CODIGO || user.USE_LOGIN);
  const sessionValid = !isSessionExpired();
  
  if (hasValidUser && !sessionValid) {
    console.log('Sessão expirada, fazendo logout automático...');
    logout();
    return false;
  }
  
  return hasValidUser && sessionValid;
}

function startSessionTimer() {
  // Limpar timer anterior se existir
  if (sessionTimer) {
    clearTimeout(sessionTimer);
  }
  
  // Criar novo timer
  sessionTimer = setTimeout(() => {
    console.log('Sessão expirou por inatividade (15 minutos)');
    logout();
  }, SESSION_TIMEOUT);
}

function resetSessionTimer() {
  updateSessionTimestamp();
  startSessionTimer();
}

function setupActivityDetection() {
  // Eventos que indicam atividade do usuário
  const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
  
  events.forEach(event => {
    document.addEventListener(event, () => {
      const now = Date.now();
      // Só resetar se passou mais de 30 segundos desde a última atividade
      if (now - lastActivity > 30000) {
        console.log('Atividade detectada, resetando timer de sessão');
        resetSessionTimer();
      }
    }, true);
  });
}

function logout() {
  try {
    // Limpar timer
    if (sessionTimer) {
      clearTimeout(sessionTimer);
      sessionTimer = null;
    }
    
    // Limpar dados de sessão
    localStorage.removeItem('app_user');
    localStorage.removeItem('app_session_timestamp');
    
    console.log('Usuário deslogado');
    window.location.href = 'login.html';
  } catch (error) {
    console.error('Erro ao fazer logout:', error);
    window.location.href = 'login.html';
  }
}

function initializeSession() {
  // Verificar se a sessão ainda é válida
  if (!isUserLoggedIn()) {
    return false;
  }
  
  // Atualizar timestamp e iniciar timer
  updateSessionTimestamp();
  startSessionTimer();
  setupActivityDetection();
  
  // Verificação periódica a cada 30 segundos para maior segurança
  setInterval(() => {
    if (!isUserLoggedIn()) {
      console.log('Verificação periódica: sessão inválida detectada');
      logout();
    }
  }, 30000);
  
  console.log('Sessão inicializada com timeout de 15 minutos');
  return true;
}

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
    estoquePositivo,
    theme: document.documentElement.getAttribute('data-theme')
  };
  localStorage.setItem(storageKey('prefs'), JSON.stringify(state));
}

function loadState() {
  try {
    const raw = localStorage.getItem(storageKey('prefs'));
    console.log('localStorage raw:', raw);
    
    if (!raw) {
      // Se não há dados salvos, usar valores padrão
      console.log('Nenhum estado salvo encontrado, usando valores padrão');
      console.log('Valores padrão aplicados: Status =', currentStatusFilter, ', Dias =', daysThreshold);
      return;
    }
    
    const s = JSON.parse(raw);
    console.log('Estado carregado do localStorage:', s);
    
    currentSearch = s.search ?? '';
    
    // Carregar status salvo pelo usuário (sem forçar padrão fixo)
    currentStatusFilter = s.status ?? '';
    daysThreshold = s.days && s.days > 0 ? s.days : 30;
    
    console.log('Valores após loadState: Status =', currentStatusFilter, ', Dias =', daysThreshold);
    
    currentGrupo = s.grupo ?? '';
    currentMarca = s.marca ?? '';
    groupBy = s.groupBy ?? '';
    estoquePositivo = s.estoquePositivo ?? false;
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
  refs.themeToggle = document.getElementById('theme-toggle');
  refs.logoutBtnMobile = document.getElementById('logout-btn-mobile');
  refs.settingsBtnMobile = document.getElementById('settings-btn-mobile');
  // Desktop controls
  refs.openDrawerDesktop = document.getElementById('open-drawer-desktop');
  refs.logoutBtnDesktop = document.getElementById('logout-btn-desktop');
  refs.settingsBtnDesktop = document.getElementById('settings-btn-desktop');
  // Shared
  refs.tbody = document.getElementById('product-tbody');
  refs.cardsContainer = document.getElementById('cards-container');
  refs.feedback = document.getElementById('feedback');
  refs.search = document.getElementById('search');
  refs.drawer = document.getElementById('filter-drawer');
  refs.closeDrawer = document.getElementById('close-drawer');
  refs.drawerBackdrop = document.getElementById('drawer-backdrop');
  // Settings modal
  refs.settingsModal = document.getElementById('settings-modal');
  refs.closeSettings = document.getElementById('close-settings');
  refs.themeToggleModal = document.getElementById('theme-toggle-modal');
  refs.themeLabel = document.getElementById('theme-label');
  refs.applyFiltersBtn = document.getElementById('apply-filters');
  refs.statusFilter = document.getElementById('status-filter');
  refs.filterGrupo = document.getElementById('filter-grupo');
  refs.filterMarca = document.getElementById('filter-marca');
  refs.groupBy = document.getElementById('group-by');
  refs.pagination = document.getElementById('pagination');
  refs.btnVoice = document.getElementById('btn-voice');
  refs.btnCameraMobile = document.getElementById('btn-camera-mobile');
  refs.btnCameraDesktop = document.getElementById('btn-camera-desktop');
  
  // Debug dos botões da câmera
  console.log('Botões da câmera encontrados:', {
    mobile: {
      element: refs.btnCameraMobile,
      id: refs.btnCameraMobile?.id,
      disabled: refs.btnCameraMobile?.disabled,
      classList: refs.btnCameraMobile ? Array.from(refs.btnCameraMobile.classList) : null
    },
    desktop: {
      element: refs.btnCameraDesktop,
      id: refs.btnCameraDesktop?.id,
      disabled: refs.btnCameraDesktop?.disabled,
      classList: refs.btnCameraDesktop ? Array.from(refs.btnCameraDesktop.classList) : null
    }
  });
  
  // Teste de clique direto para ambos os botões
  if (refs.btnCameraMobile) {
    refs.btnCameraMobile.addEventListener('click', (e) => {
      console.log('Clique direto detectado no botão da câmera mobile:', e);
    }, true); // Captura na fase de captura
  }
  
  if (refs.btnCameraDesktop) {
    refs.btnCameraDesktop.addEventListener('click', (e) => {
      console.log('Clique direto detectado no botão da câmera desktop:', e);
    }, true); // Captura na fase de captura
  }
  
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

// Sistema de notificação flash
function showFlashNotification(title, message, type = 'info', duration = 4000) {
  // Remove notificações anteriores
  const existingNotifications = document.querySelectorAll('.flash-notification');
  existingNotifications.forEach(notification => {
    notification.remove();
  });

  // Cria a nova notificação
  const notification = document.createElement('div');
  notification.className = `flash-notification ${type}`;

  // Define ícones para cada tipo
  const icons = {
    success: '✅',
    error: '❌', 
    warning: '⚠️',
    info: 'ℹ️'
  };

  notification.innerHTML = `
    <div class="flash-icon">${icons[type] || icons.info}</div>
    <div class="flash-content">
      <div class="flash-title">${title}</div>
      <div class="flash-message">${message}</div>
    </div>
    <button class="flash-close" type="button">×</button>
    <div class="flash-progress"></div>
  `;

  // Adiciona ao DOM
  document.body.appendChild(notification);

  // Mostra a notificação após um pequeno delay
  setTimeout(() => {
    notification.classList.add('show');
  }, 100);

  // Adiciona evento de fechar
  const closeBtn = notification.querySelector('.flash-close');
  closeBtn.addEventListener('click', () => {
    hideFlashNotification(notification);
  });

  // Auto-remove após o tempo especificado
  if (duration > 0) {
    setTimeout(() => {
      hideFlashNotification(notification);
    }, duration);
  }

  return notification;
}

function hideFlashNotification(notification) {
  notification.classList.add('hide');
  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  }, 400);
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
    
    // Feedback específico para busca vs carregamento inicial
    if (currentSearch.length > 0) {
      const searchType = /^\d+$/.test(currentSearch) ? 'código' : 'texto';
      setFeedback(`✅ Busca por ${searchType} atualizada: ${filtered.length} resultado(s) de ${allProducts.length} produtos.`, 'success');
    } else {
      setFeedback(`Carregado: ${allProducts.length} registros.`, 'success');
    }
  } catch (e) {
    setFeedback('Erro ao carregar: ' + e.message, 'error');
    
    // (Não exibe flash para erro de busca/carregamento)
  } finally {
    setLoading(false);
  }
}

// Função específica para busca em tempo real (opcional)
async function searchProducts() {
  if (currentSearch.length === 0) {
    applyFilters(false);
    return;
  }
  
  setLoading(true, 'Buscando...');
  try {
    // Recarregar dados da API para ter informações atualizadas
    allProducts = await productService.listAll();
    computeAllStatuses();
    applyFilters(false);
    setFeedback(`🔍 Busca concluída: ${filtered.length} resultados encontrados.`, 'success');
  } catch (e) {
    setFeedback('Erro na busca: ' + e.message, 'error');
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

  // Popular datalist de marcas
  const marcasList = document.getElementById('marcas-list');
  if (marcasList) {
    marcasList.innerHTML = '<option value="">Todas</option>' +
      marcas.map(m => `<option value="${escapeHtml(m)}">${escapeHtml(m)}</option>`).join('');
  }

  // Popular datalist de grupos
  const gruposList = document.getElementById('grupos-list');
  if (gruposList) {
    gruposList.innerHTML = '<option value="">Todos</option>' +
      grupos.map(g => `<option value="${escapeHtml(g)}">${escapeHtml(g)}</option>`).join('');
  }
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
  statusValidadeRow.style.gap = '6px';

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
  title.style.marginTop = '0px';
  title.innerHTML = highlight(prod.PRO_NOME, currentSearch);

  // Grid de metadados
  const meta = document.createElement('div');
  meta.className = 'meta-grid';
  
  // Criar elemento de preços com preço 1 e preço 2 abaixo
  let precosHTML = `<span class="meta-label">PREÇO</span>R$ ${formatNum(prod.PRO_PRECO1)}`;
  
  // Verifica se preço 2 existe e é maior que 0
  if (prod.PRO_PRECO2 && parseFloat(prod.PRO_PRECO2) > 0) {
    precosHTML += `<br>R$ ${formatNum(prod.PRO_PRECO2)}`;
  }
  
  meta.innerHTML = `
    <span><span class="meta-label">CÓD</span>${escapeHtml(prod.PRO_CODIGO)}</span>
    <span>${precosHTML}</span>
    <span class="meta-estoque">
      <span class="meta-label">ESTOQUE</span>
      <span class="estoque-valor">${formatNum(prod.PRO_ESTOQ1)} ${escapeHtml(prod.UND_NOME) || 'UN'}</span>
    </span>
    <span><span class="meta-label">CÓD. BARRA</span>${escapeHtml(prod.PRO_COD_BARRA)}</span>
    <span class="meta-marca"><span class="meta-label">MARCA</span>${escapeHtml(prod.MAR_DESCRI) || '-'}</span>
    <span class="meta-grupo"><span class="meta-label">GRUPO</span>${escapeHtml(prod.GP_DESCRI)}</span>
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

  // Verificar se estamos em um card mobile (dentro de .pc-validade)
  const isMobileCard = container.closest && container.closest('.pc-validade');
  
  if (window.innerWidth <= 760) {
    // Mobile: criar container para botões ficarem lado a lado abaixo do input
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'button-container';
    buttonContainer.append(btnSave, btnCancel);
    container.append(input, buttonContainer);
  } else {
    // Desktop: manter layout original (lado a lado)
    container.append(input, btnSave, btnCancel);
  }

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
    
    // Exibe notificação flash de sucesso
    showFlashNotification(
      'Validade Atualizada!',
      `Produto ${prod.PRO_CODIGO} - Nova validade: ${br}`,
      'success',
      3000
    );
    
    applyFilters(false);
  } catch (e) {
    prod.PRO_VALIDADE = oldVal;
    setFeedback('Erro ao atualizar: ' + e.message, 'error');
    
    // Exibe notificação flash de erro
    showFlashNotification(
      'Erro na Atualização',
      `Não foi possível atualizar a validade do produto ${prod.PRO_CODIGO}: ${e.message}`,
      'error',
      5000
    );
    
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

/* Settings Modal */
function openSettings() {
  refs.settingsModal.hidden = false;
  document.body.style.overflow = 'hidden';
  updateThemeLabel();
}
function closeSettings() {
  refs.settingsModal.hidden = true;
  document.body.style.overflow = '';
}
function updateThemeLabel() {
  if (refs.themeLabel) {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    refs.themeLabel.textContent = isDark ? 'Escuro' : 'Claro';
  }
}

function bindEvents() {
  // Mobile
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
  refs.logoutBtnMobile?.addEventListener('click', logout);
  refs.settingsBtnMobile?.addEventListener('click', openSettings);
  refs.openDrawer?.addEventListener('click', openDrawer);

  // Desktop
  refs.logoutBtnDesktop?.addEventListener('click', logout);
  refs.settingsBtnDesktop?.addEventListener('click', openSettings);
  refs.openDrawerDesktop?.addEventListener('click', openDrawer);

  // Settings modal
  refs.closeSettings?.addEventListener('click', closeSettings);
  refs.themeToggleModal?.addEventListener('click', () => toggleTheme(refs.themeToggleModal));
  refs.settingsModal?.addEventListener('click', (e) => {
    if (e.target === refs.settingsModal || e.target.classList.contains('modal-backdrop')) {
      closeSettings();
    }
  });

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
  
  // Eventos para grupo com busca digitável
  refs.filterGrupo?.addEventListener('change', () => {
    currentGrupo = refs.filterGrupo.value;
    applyFilters();
  });
  refs.filterGrupo?.addEventListener('input', () => {
    clearTimeout(debounceId);
    debounceId = setTimeout(() => {
      currentGrupo = refs.filterGrupo.value;
      applyFilters();
    }, 300);
  });
  
  // Eventos para marca com busca digitável
  refs.filterMarca?.addEventListener('change', () => {
    currentMarca = refs.filterMarca.value;
    applyFilters();
  });
  refs.filterMarca?.addEventListener('input', () => {
    clearTimeout(debounceId);
    debounceId = setTimeout(() => {
      currentMarca = refs.filterMarca.value;
      applyFilters();
    }, 300);
  });
  
  refs.groupBy?.addEventListener('change', () => {
    groupBy = refs.groupBy.value;
    applyFilters();
  });
  
  // Evento para checkbox de estoque positivo
  refs.estoquePositivo?.addEventListener('change', () => {
    estoquePositivo = refs.estoquePositivo.checked;
    applyFilters();
    saveState();
  });
  
  let debounceId;
  
  refs.search.addEventListener('focus', () => {
    isUserTyping = true;
  });
  
  refs.search.addEventListener('blur', () => {
    isUserTyping = false;
  });
  
  refs.search.addEventListener('input', () => {
    clearTimeout(debounceId);
    isUserTyping = true;
    
    // Indicador visual imediato
    const searchValue = refs.search.value.trim();
    
    // Evitar loop infinito se o valor já é o mesmo
    if (searchValue === currentSearch) {
      return;
    }
    
    if (searchValue.length > 0) {
      refs.search.style.borderColor = 'var(--c-accent)';
      refs.search.style.backgroundColor = 'rgba(33, 150, 243, 0.1)';
    } else {
      refs.search.style.borderColor = '';
      refs.search.style.backgroundColor = '';
    }
    
    debounceId = setTimeout(() => {
      currentSearch = searchValue;
      
      // Se há busca, recarregar dados da API para ter informações atualizadas
      if (currentSearch.length > 0) {
        setFeedback('🔍 Buscando dados atualizados na API...', 'info');
        loadProducts(); // Recarregar da API
      } else {
        // Se não há busca, aplicar filtros nos dados em cache
        applyFilters(false);
      }
      
      // Resetar flag após processamento
      setTimeout(() => {
        isUserTyping = false;
      }, 100);
    }, 500); // 500ms para evitar muitas chamadas à API
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
    openButtonMobile: refs.btnCameraMobile,
    openButtonDesktop: refs.btnCameraDesktop,
    closeButton: refs.closeCamera,
    overlay: refs.cameraOverlay,
    video: refs.cameraVideo,
    statusEl: refs.cameraStatus,
    onCode: async (code) => {
      showFlashNotification(`Código escaneado: ${code}`, 'success');
      
      try {
        // Busca específica por código de barras
        showFlashNotification('Buscando produto...', 'info');
        
        const response = await fetch(`${API_BASE_URL}/produtos?search=${encodeURIComponent(code)}`);
        
        if (!response.ok) {
          throw new Error(`Erro na busca: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.data && data.data.length > 0) {
          // Produto encontrado
          await displayProducts(data.data, data.current_page, data.last_page);
          showFlashNotification(`Produto encontrado: ${data.data[0].nome}`, 'success');
        } else {
          // Produto não encontrado, fazer busca normal
          refs.search.value = code;
          currentSearch = code;
          applyFilters(false);
          showFlashNotification('Produto não encontrado por código. Fazendo busca geral...', 'warning');
        }
        
        refs.search.focus();
        
      } catch (error) {
        console.error('Erro ao buscar produto:', error);
        // Fallback para busca normal
        refs.search.value = code;
        currentSearch = code;
        applyFilters(false);
        refs.search.focus();
        showFlashNotification('Erro na busca específica. Fazendo busca geral...', 'error');
      }
    }
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!refs.cameraOverlay.hidden) {
        const evt = new Event('click');
        refs.closeCamera.dispatchEvent(evt);
      } else if (!refs.settingsModal.hidden) {
        closeSettings();
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
  // Sincroniza símbolo nos outros botões
  if (refs.themeToggle && refs.themeToggle !== btn) refs.themeToggle.textContent = btn.textContent;
  if (refs.themeToggleModal && refs.themeToggleModal !== btn) refs.themeToggleModal.textContent = btn.textContent;
  // Atualiza label no modal de configurações
  updateThemeLabel();
}

function syncInputsFromState() {
  // Não sobrescrever o input de busca se o usuário estiver digitando ou se estiver focado
  if (refs.search && !isUserTyping && document.activeElement !== refs.search) {
    refs.search.value = currentSearch;
  }
  if (refs.statusFilter) refs.statusFilter.value = currentStatusFilter;
  if (refs.filterGrupo) refs.filterGrupo.value = currentGrupo;
  if (refs.filterMarca) refs.filterMarca.value = currentMarca;
  if (refs.groupBy) refs.groupBy.value = groupBy;
  // Sincroniza checkbox de estoque positivo
  if (refs.estoquePositivo) refs.estoquePositivo.checked = estoquePositivo;
  // Sincroniza ambos inputs de dias
  if (refs.daysThreshold) refs.daysThreshold.value = daysThreshold;
  // Sincroniza botões de tema
  const themeSymbol = document.documentElement.getAttribute('data-theme') === 'light' ? '🌙' : '☀️';
  if (refs.themeToggle) refs.themeToggle.textContent = themeSymbol;
  if (refs.themeToggleModal) refs.themeToggleModal.textContent = themeSymbol;
}

function init() {
  document.documentElement.setAttribute('data-theme', loadTheme());
  
  // Inicializar sistema de sessão ANTES de tudo
  if (!initializeSession()) {
    console.log('Sessão inválida, redirecionando para login...');
    return; // Para a execução se a sessão for inválida
  }
  
  loadState();
  // update order button to reflect persisted state
  updateOrderBtnLabel();
  window.__USER_INTERACTED__ = false;
  window.addEventListener('pointerdown', () => { window.__USER_INTERACTED__ = true; }, { once: true });
  window.addEventListener('keydown', () => { window.__USER_INTERACTED__ = true; }, { once: true });
  initRefs();
  
  // Aplicar valores padrão IMEDIATAMENTE após initRefs
  console.log('Aplicando valores padrão: Status =', currentStatusFilter, ', Dias =', daysThreshold);
  if (refs.statusFilter) {
    refs.statusFilter.value = currentStatusFilter;
    console.log('Status filter definido para:', refs.statusFilter.value);
  }
  if (refs.daysThreshold) {
    refs.daysThreshold.value = daysThreshold;
    console.log('Days threshold definido para:', refs.daysThreshold.value);
  }
  
  bindEvents();
  // Sincronizar inputs com o estado carregado ANTES de carregar produtos
  syncInputsFromState();
  
  // Verificação final para garantir que os valores estão corretos
  setTimeout(() => {
    console.log('Verificação final:');
    console.log('Status filter atual:', refs.statusFilter?.value);
    console.log('Days threshold atual:', refs.daysThreshold?.value);
    console.log('Variáveis JS: Status =', currentStatusFilter, ', Dias =', daysThreshold);
    
    // Forçar valores se necessário
    if (refs.statusFilter && refs.statusFilter.value !== currentStatusFilter) {
      console.log('Forçando status filter para:', currentStatusFilter);
      refs.statusFilter.value = currentStatusFilter;
    }
    if (refs.daysThreshold && refs.daysThreshold.value != daysThreshold) {
      console.log('Forçando days threshold para:', daysThreshold);
      refs.daysThreshold.value = daysThreshold;
    }
  }, 100);
  
  loadProducts();
}
document.addEventListener('DOMContentLoaded', init);