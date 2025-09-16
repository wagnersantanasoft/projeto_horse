import { http } from "./fetchClient.js";

const BASE = "https://sua-api.exemplo.com"; // ajuste

export async function listarProdutos() {
  return http(`${BASE}/produtos`);
}

export async function criarProduto(dados) {
  return http(`${BASE}/produtos`, { method: "POST", body: dados });
}

export async function atualizarProduto(id, dados) {
  return http(`${BASE}/produtos/${id}`, { method: "PUT", body: dados });
}

export async function removerProduto(id) {
  return http(`${BASE}/produtos/${id}`, { method: "DELETE" });
}