import { listarProdutos } from "./api/produtosService.js";
import { enriquecerProdutos } from "./core/statusEngine.js";
import { renderTabela } from "./ui/renderTable.js";

async function init() {
  const container = document.getElementById("tabela-container");
  try {
    const dados = await listarProdutos();
    const processados = enriquecerProdutos(dados, { limiteAlerta: 15 });
    renderTabela(processados, container);
  } catch (err) {
    container.innerHTML = `<p style="color:#b00020">Erro ao carregar: ${err.message}</p>`;
  }
}

init();