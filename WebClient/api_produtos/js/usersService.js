import { apiClient } from './apiClient.js';
import { CONFIG } from './config.js';

function normalizeUser(u) {
  // Normaliza a resposta da API para o formato esperado pelo cliente (campos USE_*)
  return {
    USE_CODIGO: u.USE_CODIGO ?? u.id ?? u.USR_ID ?? u.codigo ?? null,
  USE_NOME: u.USE_NOME ?? u.nome ?? u.name ?? u.USR_NOME ?? '',
  USE_LOGIN: u.USE_LOGIN ?? u.login ?? u.user ?? (u.USE_NOME ?? u.nome ?? u.name ?? ''),
    USE_SENHA: u.USE_SENHA ?? u.senha ?? u.password ?? u.pwd ?? '',
    USE_AUT_VALIDADE: (typeof u.USE_AUT_VALIDADE !== 'undefined') ? Boolean(u.USE_AUT_VALIDADE) : (Boolean(u.aut_validade ?? u.autValidade ?? u.aut_validade ?? false)),
    USE_AUT_ESTOQUE: (typeof u.USE_AUT_ESTOQUE !== 'undefined') ? Boolean(u.USE_AUT_ESTOQUE) : (Boolean(u.aut_estoque ?? u.autEstoque ?? u.aut_estoque ?? false)),
    USE_AUT_PRECO: (typeof u.USE_AUT_PRECO !== 'undefined') ? Boolean(u.USE_AUT_PRECO) : (Boolean(u.aut_preco ?? u.autPreco ?? u.aut_preco ?? false))
  };
}

export const usersService = {
  async listAll() {
    const res = await apiClient.get(CONFIG.ENDPOINT_USERS);
    const data = Array.isArray(res) ? res : (res && Array.isArray(res.data) ? res.data : null);
    if (!Array.isArray(data)) {
      console.error('usersService.listAll: resposta inesperada', res);
      throw new Error('Formato inesperado da API de usuários.');
    }
    return data.map(normalizeUser);
  },

  async get(id) {
    if (!id) throw new Error('ID de usuário é necessário');
    const res = await apiClient.get(`${CONFIG.ENDPOINT_USERS}/${id}`);
    if (!res) return null;
    return normalizeUser(res);
  },

  async create(payload) {
    const body = payload || {};
    const res = await apiClient.post(CONFIG.ENDPOINT_USERS, body);
    return res;
  },

  async update(id, payload) {
    if (!id) throw new Error('ID de usuário é necessário para atualizar');
    const body = payload || {};
    const res = await apiClient.put(`${CONFIG.ENDPOINT_USERS}/${id}`, body);
    return res;
  },

  async remove(id) {
    if (!id) throw new Error('ID de usuário é necessário para remover');
    const res = await apiClient.delete(`${CONFIG.ENDPOINT_USERS}/${id}`);
    return res;
  }
};
