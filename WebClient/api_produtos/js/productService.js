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
    const data = await apiClient.get(CONFIG.ENDPOINT_PRODUCTS);
    if (!Array.isArray(data)) throw new Error('Formato inesperado da API.');
    return data.map(normalizeProduto);
  },

  async updateValidade(id, validadeBr) {
    return apiClient.put(`${CONFIG.ENDPOINT_PRODUCTS}/${id}`, {
      pro_validade: validadeBr
    });
  }
};