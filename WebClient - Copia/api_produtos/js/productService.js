import { apiClient } from './apiClient.js';
import { CONFIG } from './config.js';

function normalizeProduto(p) {
  return {
    PRO_CODIGO: p.PRO_CODIGO,
    PRO_COD_BARRA: p.PRO_COD_BARRA || '',
    PRO_NOME: p.PRO_NOME || '',
    PRO_ESTOQ1: p.PRO_ESTOQ1 ?? 0,
    PRO_PRECO1: p.PRO_PRECO1 ?? 0,
    PRO_PRECO2: p.PRO_PRECO2 ?? 0,
    PRO_VALIDADE: p.PRO_VALIDADE || '',
    UND_NOME: p.UND_NOME || '',
    GP_DESCRI: p.GP_DESCRI || '',
    MAR_DESCRI: p.MAR_DESCRI || ''
  };
}

export const productService = {
  async listAll() {
    const { ENDPOINT_PRODUCTS } = CONFIG;
    const data = await apiClient.get(ENDPOINT_PRODUCTS);
    if (!Array.isArray(data)) throw new Error('Formato inesperado na resposta da API (esperado array).');
    return data.map(normalizeProduto);
  },

  async create(prod) {
    const { ENDPOINT_PRODUCTS } = CONFIG;
    return apiClient.post(ENDPOINT_PRODUCTS, prod);
  },

async updatePartial(id, fields) {
  // converte para as chaves esperadas pelo backend (minúsculas)
  const map = {
    PRO_ESTOQ1: 'pro_estoq1',
    PRO_PRECO1: 'pro_preco1',
    PRO_PRECO2: 'pro_preco2',
    PRO_VALIDADE: 'pro_validade'
  };
  const body = {};
  Object.entries(fields).forEach(([k,v]) => {
    if (v !== undefined && map[k]) {
      body[map[k]] = v;
    }
  });
  if (Object.keys(body).length === 0) {
    throw new Error('Nenhum campo para atualizar.');
  }
  return apiClient.put(`${CONFIG.ENDPOINT_PRODUCTS}/${id}`, body);
},

  async remove(id) {
    return apiClient.delete(`${CONFIG.ENDPOINT_PRODUCTS}/${id}`);
  }
};