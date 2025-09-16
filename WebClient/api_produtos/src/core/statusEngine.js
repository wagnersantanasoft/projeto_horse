import { dataHojeISO, normalizarData, diasEntre } from "./dateUtils.js";

const LIMITE_ALERTA_PADRAO = 15;

export function enriquecerProdutos(produtos, { limiteAlerta = LIMITE_ALERTA_PADRAO } = {}) {
  const hoje = dataHojeISO();
  const chaveDuplicados = new Map(); // key: nome+lote+validade -> count

  // Primeiro passa: contar duplicados
  produtos.forEach(p => {
    const chave = `${p.nome || ""}::${p.lote || ""}::${p.validade || ""}`;
    chaveDuplicados.set(chave, (chaveDuplicados.get(chave) || 0) + 1);
  });

  return produtos.map(p => {
    let statusValidade = "SEM_DATA";
    let diasParaVencer;
    const erros = [];

    if (p.validade) {
      const iso = normalizarData(p.validade);
      if (!iso) {
        statusValidade = "ERRO";
        erros.push("Data inválida.");
      } else {
        diasParaVencer = diasEntre(hoje, iso);
        if (diasParaVencer < 0) statusValidade = "VENCIDO";
        else if (diasParaVencer <= limiteAlerta) statusValidade = "ALERTA";
        else statusValidade = "VALIDO";
      }
    }

    if (p.quantidade != null && p.minimo != null && p.quantidade < p.minimo) {
      // apenas anota, renderização cuida
    }

    const chave = `${p.nome || ""}::${p.lote || ""}::${p.validade || ""}`;
    const duplicado = chaveDuplicados.get(chave) > 1;

    return {
      ...p,
      statusValidade,
      diasParaVencer,
      duplicado,
      erros
    };
  });
}