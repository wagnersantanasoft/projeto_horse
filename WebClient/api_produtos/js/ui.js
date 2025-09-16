import { CONFIG } from './config.js';
import { paginate, buildPagination } from './pagination.js';
import { brToIso, isoToBr } from './dateUtils.js';

export const ui = {
  refs: {},
  currentSearchTerm: '',
  highlightTerm: '',

  initRefs() {
    this.refs.tbody = document.getElementById('product-tbody');
    this.refs.rowTemplate = document.getElementById('row-template');
    this.refs.pagination = document.getElementById('pagination');
    this.refs.feedback = document.getElementById('feedback');
    this.refs.createForm = document.getElementById('create-form');
    this.refs.editModal = document.getElementById('edit-modal');
    this.refs.editForm = document.getElementById('edit-form');
    this.refs.reloadBtn = document.getElementById('reload-btn');
    this.refs.cancelEdit = document.getElementById('cancel-edit');
    this.refs.search = document.getElementById('search');
    this.refs.clearSearch = document.getElementById('clear-search');
  },

  showFeedback(msg, type = '') {
    const fb = this.refs.feedback;
    fb.className = 'feedback';
    if (type) fb.classList.add(type);
    fb.textContent = msg || '';
  },

  clearFeedback() {
    this.showFeedback('');
  },

  escapeHtml(str) {
    return String(str)
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;')
      .replace(/'/g,'&#39;');
  },

  applyHighlight(text, term) {
    if (!term) return this.escapeHtml(text);
    const escTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escTerm})`, 'ig');
    return this.escapeHtml(text).replace(regex, '<mark>$1</mark>');
  },

  // Normaliza número digitado em formato PT-BR ou misto
  parseNumberInput(value) {
    if (value == null) return undefined;
    let v = String(value).trim();
    if (v === '') return undefined;
    // Remove espaços e separadores de milhar usuais
    // Estratégia: remove pontos quando aparentam ser milhar e troca vírgula por ponto
    // Ex: 1.234,56 -> 1234,56 -> 1234.56
    v = v.replace(/\s/g,'');
    // Se houver mais de uma vírgula, inválido
    if ((v.match(/,/g) || []).length > 1) return undefined;
    // Remove pontos que antecedem 3 dígitos (milhar)
    v = v.replace(/\.(?=\d{3}(\D|$))/g, '');
    // Troca vírgula decimal por ponto
    v = v.replace(/,/g, '.');
    const n = Number(v);
    if (Number.isNaN(n)) return undefined;
    return n;
  },

  renderTable(productsPage, searchTerm = '') {
    this.refs.tbody.innerHTML = '';
    for (const prod of productsPage) {
      const rowFrag = document.importNode(this.refs.rowTemplate.content, true);
      const tr = rowFrag.querySelector('tr');
      Object.entries(prod).forEach(([k,v]) => {
        const cell = tr.querySelector(`[data-col="${k}"]`);
        if (!cell) return;
        const valueStr = v == null ? '' : String(v);
        if (searchTerm && ['PRO_CODIGO','PRO_COD_BARRA','PRO_NOME','GP_DESCRI','MAR_DESCRI','UND_NOME'].includes(k)) {
          cell.innerHTML = this.applyHighlight(valueStr, searchTerm);
        } else {
          cell.textContent = valueStr;
        }
      });

      tr.querySelector('[data-action="edit"]')
        .addEventListener('click', () => this.openEditModal(prod));

      tr.querySelector('[data-action="delete"]')
        .addEventListener('click', () => this.onDelete && this.onDelete(prod));

      this.refs.tbody.appendChild(rowFrag);
    }

    if (productsPage.length === 0) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 11;
      td.textContent = 'Nenhum registro.';
      td.style.textAlign = 'center';
      tr.appendChild(td);
      this.refs.tbody.appendChild(tr);
    }
  },

  renderPagination(fullList, currentPage, onChange) {
    const state = paginate(fullList, currentPage, CONFIG.PAGE_SIZE);
    buildPagination(this.refs.pagination, state, (p) => onChange(p));
    return state;
  },

  openEditModal(prod) {
    this.refs.editForm.reset();
    this.refs.editForm.elements['PRO_CODIGO'].value = prod.PRO_CODIGO;
    this.refs.editForm.elements['PRO_ESTOQ1'].value = prod.PRO_ESTOQ1;
    this.refs.editForm.elements['PRO_PRECO1'].value = prod.PRO_PRECO1;
    this.refs.editForm.elements['PRO_PRECO2'].value = prod.PRO_PRECO2;
    this.refs.editForm.elements['PRO_VALIDADE'].value = brToIso(prod.PRO_VALIDADE);
    this.refs.editModal.showModal();
  },

  closeEditModal() {
    if (this.refs.editModal.open) this.refs.editModal.close();
  },

  bindEvents({ onCreate, onUpdate, onDelete, onReload, onSearch }) {
    this.onDelete = onDelete;

    this.refs.createForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const raw = Object.fromEntries(fd.entries());

      const produto = {
        PRO_COD_BARRA: raw.PRO_COD_BARRA?.trim(),
        PRO_NOME: raw.PRO_NOME?.trim(),
        UND_NOME: raw.UND_NOME?.trim(),
        GP_DESCRI: raw.GP_DESCRI?.trim(),
        MAR_DESCRI: raw.MAR_DESCRI?.trim()
      };

      // Números
      ['PRO_ESTOQ1','PRO_PRECO1','PRO_PRECO2'].forEach(f => {
        const parsed = this.parseNumberInput(raw[f]);
        if (parsed === undefined) {
          this.showFeedback(`Valor inválido no campo ${f}.`, 'error');
          return;
        }
        produto[f] = parsed;
      });

      // Data (ISO -> BR)
      if (!raw.PRO_VALIDADE) {
        this.showFeedback('Informe a validade.', 'error');
        return;
      }
      produto.PRO_VALIDADE = brToIso(raw.PRO_VALIDADE);

      onCreate(produto);
    });

    this.refs.editForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);

      const estoque = this.parseNumberInput(fd.get('PRO_ESTOQ1'));
      const preco1 = this.parseNumberInput(fd.get('PRO_PRECO1'));
      const preco2 = this.parseNumberInput(fd.get('PRO_PRECO2'));
      const isoDate = brToIso(fd.get('PRO_VALIDADE'));
      

      if (estoque === undefined) {
        this.showFeedback('Estoque inválido.', 'error');
        return;
      }
      if (preco1 === undefined) {
        this.showFeedback('Preço 1 inválido.', 'error');
        return;
      }
      if (preco2 === undefined) {
        this.showFeedback('Preço 2 inválido.', 'error');
        return;
      }
      if (!isoDate) {
        this.showFeedback('Validade obrigatória.', 'error');
        return;
      }

      const payload = {
        PRO_CODIGO: Number(fd.get('PRO_CODIGO')),
        PRO_ESTOQ1: estoque,
        PRO_PRECO1: preco1,
        PRO_PRECO2: preco2,
        PRO_VALIDADE: brToIso(isoDate)
      };

      onUpdate(payload);
    });

    this.refs.cancelEdit.addEventListener('click', () => {
      this.closeEditModal();
    });

    this.refs.reloadBtn.addEventListener('click', () => {
      onReload();
    });

    let debounceId;
    const handle = () => {
      const term = this.refs.search.value.trim();
      onSearch(term);
    };
    this.refs.search.addEventListener('input', () => {
      clearTimeout(debounceId);
      debounceId = setTimeout(handle, 250);
    });

    this.refs.clearSearch.addEventListener('click', () => {
      this.refs.search.value = '';
      onSearch('');
      this.refs.search.focus();
    });
  }
};