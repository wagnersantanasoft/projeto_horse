import { normalizarData } from "./dateUtils.js";

export function validarProdutoEntrada(input) {
  const erros = [];

  if (!input.nome || input.nome.trim().length < 2) erros.push("Nome obrigatório.");
  if (input.quantidade == null || isNaN(input.quantidade)) erros.push("Quantidade inválida.");
  if (input.quantidade < 0) erros.push("Quantidade não pode ser negativa.");

  if (input.validade) {
    const iso = normalizarData(input.validade);
    if (!iso) erros.push("Data de validade inválida.");
    else {
      const cincoAnos = new Date();
      cincoAnos.setFullYear(cincoAnos.getFullYear() + 5);
      if (Date.parse(iso) > cincoAnos.getTime()) erros.push("Data de validade muito distante.");
    }
  }

  return { ok: erros.length === 0, erros };
}