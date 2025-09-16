import { productService } from './productService.js';
import { ui } from './ui.js';
import { CONFIG } from './config.js';

let allProducts = [];
let filteredProducts = [];
let currentPage = 1;
let loading = false;
let currentSearchTerm = '';

async function loadProducts() {
  setLoading(true, 'Carregando produtos...');
  try {
    allProducts = await productService.listAll();
    applySearch(currentSearchTerm);
    ui.showFeedback(`Carregado: ${allProducts.length} registros.`, 'success');
  } catch (err) {
    ui.showFeedback('Erro ao carregar: ' + err.message, 'error');
  } finally {
    setLoading(false);
  }
}

function setLoading(isLoading, msg='') {
  loading = isLoading;
  if (isLoading) {
    ui.showFeedback(msg || 'Processando...');
  } else if (!msg) {
    ui.clearFeedback();
  }
}

function applySearch(term) {
  currentSearchTerm = term;
  if (!term) {
    filteredProducts = [...allProducts];
  } else {
    const tokens = term.toLowerCase().split(/\s+/).filter(Boolean);
    filteredProducts = allProducts.filter(p => {
      const hay = [
        p.PRO_CODIGO,
        p.PRO_COD_BARRA,
        p.PRO_NOME,
        p.GP_DESCRI,
        p.MAR_DESCRI,
        p.UND_NOME
      ].map(v => String(v ?? '').toLowerCase());
      return tokens.every(t => hay.some(field => field.includes(t)));
    });
  }
  currentPage = 1;
  render();
}

function render() {
  const perPage = CONFIG.PAGE_SIZE;
  const total = filteredProducts.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  currentPage = Math.min(Math.max(1, currentPage), totalPages);
  const start = (currentPage - 1) * perPage;
  const end = start + perPage;
  const pageSlice = filteredProducts.slice(start, end);

  ui.renderTable(pageSlice, currentSearchTerm);
  ui.renderPagination(filteredProducts, currentPage, (p) => {
    currentPage = p;
    render();
  });
}

async function handleCreate(data) {
  setLoading(true, 'Salvando novo produto...');
  try {
    await productService.create(data);
    ui.showFeedback('Produto criado com sucesso.', 'success');
    await loadProducts();
  } catch (err) {
    ui.showFeedback('Erro ao criar: ' + err.message, 'error');
  } finally {
    setLoading(false);
  }
}

async function handleUpdate(payload) {
  setLoading(true, 'Atualizando produto...');
  try {
    // Log dos dados recebidos
    console.log('[DEBUG] handleUpdate payload:', payload);
    if (payload.PRO_ESTOQ1 === undefined ||
        payload.PRO_PRECO1 === undefined ||
        payload.PRO_PRECO2 === undefined ||
        !payload.PRO_VALIDADE) {
      console.error('[DEBUG] Dados incompletos:', payload);
      throw new Error('Dados incompletos para atualização.');
    }

    // Converte data para formato ISO (yyyy-MM-dd) para o backend
    let dataIso = '';
    if (payload.PRO_VALIDADE) {
      const partes = payload.PRO_VALIDADE.split('/');
      if (partes.length === 3) {
        // dd/MM/yyyy -> yyyy-MM-dd
        dataIso = `${partes[2]}-${partes[1].padStart(2,'0')}-${partes[0].padStart(2,'0')}`;
      } else {
        dataIso = payload.PRO_VALIDADE;
      }
    }
    const result = await productService.updatePartial(payload.PRO_CODIGO, {
      PRO_ESTOQ1: payload.PRO_ESTOQ1,
      PRO_PRECO1: payload.PRO_PRECO1,
      PRO_PRECO2: payload.PRO_PRECO2,
      PRO_VALIDADE: dataIso
    });
    console.log('[DEBUG] PUT result:', result);
    // Atualiza o produto na lista local imediatamente
    const idx = allProducts.findIndex(p => p.PRO_CODIGO === payload.PRO_CODIGO);
    if (idx !== -1) {
      allProducts[idx] = {
        ...allProducts[idx],
        PRO_ESTOQ1: payload.PRO_ESTOQ1,
        PRO_PRECO1: payload.PRO_PRECO1,
        PRO_PRECO2: payload.PRO_PRECO2,
        PRO_VALIDADE: payload.PRO_VALIDADE
      };
    }
    applySearch(currentSearchTerm); // re-renderiza a lista
    ui.closeEditModal();
    ui.showFeedback('Produto atualizado.', 'success');
    // await loadProducts(); // não recarrega toda a lista
  } catch (err) {
    console.error('[DEBUG] Erro ao atualizar:', err);
    ui.showFeedback('Erro ao atualizar: ' + err.message, 'error');
  } finally {
    setLoading(false);
  }
}

async function handleDelete(prod) {
  if (!confirm(`Excluir produto ${prod.PRO_CODIGO} - ${prod.PRO_NOME}?`)) return;
  setLoading(true, 'Excluindo...');
  try {
    await productService.remove(prod.PRO_CODIGO);
    ui.showFeedback('Produto excluído.', 'success');
    await loadProducts();
  } catch (err) {
    ui.showFeedback('Erro ao excluir: ' + err.message, 'error');
  } finally {
    setLoading(false);
  }
}

function init() {
  ui.initRefs();
  ui.bindEvents({
    onCreate: handleCreate,
    onUpdate: handleUpdate,
    onDelete: handleDelete,
    onReload: loadProducts,
    onSearch: applySearch
  });
  loadProducts();
}

document.addEventListener('DOMContentLoaded', init);