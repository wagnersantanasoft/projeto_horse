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
    console.log('🔄 [MOBILE DEBUG] ProductService.listAll() iniciado');
    console.log('🌐 [MOBILE DEBUG] Endpoint:', CONFIG.ENDPOINT_PRODUCTS);
    console.log('🌐 [MOBILE DEBUG] URL base:', CONFIG.API_BASE_URL);
    
    try {
      const data = await apiClient.get(CONFIG.ENDPOINT_PRODUCTS);
      console.log('📡 [MOBILE DEBUG] Resposta da API recebida');
      console.log('📊 [MOBILE DEBUG] Tipo de dados:', typeof data);
      console.log('📊 [MOBILE DEBUG] É array?', Array.isArray(data));
      console.log('📊 [MOBILE DEBUG] Quantidade de itens:', data ? data.length : 'N/A');
      
      if (!Array.isArray(data)) {
        console.error('❌ [MOBILE DEBUG] Formato inesperado da API:', data);
        throw new Error('Formato inesperado da API.');
      }
      
      const normalized = data.map(normalizeProduto);
      console.log('✅ [MOBILE DEBUG] Produtos normalizados:', normalized.length);
      return normalized;
    } catch (error) {
      console.error('❌ [MOBILE DEBUG] Erro em productService.listAll():', error);
      throw error;
    }
  },

  async updateValidade(id, validadeBr) {
    return apiClient.put(`${CONFIG.ENDPOINT_PRODUCTS}/${id}`, {
      pro_validade: validadeBr
      
    });
  }
};