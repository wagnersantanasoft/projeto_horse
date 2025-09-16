export function renderTabela(produtos, root) {
  root.innerHTML = `
    <table class="tabela-produtos">
      <thead>
        <tr>
          <th>Nome</th>
          <th>Lote</th>
            <th>Validade</th>
          <th>Dias</th>
          <th>Qtd</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${produtos.map(p => linhaProduto(p)).join("")}
      </tbody>
    </table>
  `;
}

function linhaProduto(p) {
  const classeStatus = `status-${p.statusValidade.toLowerCase()}`;
  const badgeDup = p.duplicado ? `<span class="badge badge-dup">Duplicado</span>` : "";
  const badgeMin = (p.minimo != null && p.quantidade < p.minimo)
    ? `<span class="badge badge-min">Estoque baixo</span>` : "";
  const erros = p.erros?.length ? `<div class="erros">${p.erros.join("<br>")}</div>` : "";

  return `
    <tr class="${classeStatus}">
      <td>${escapeHTML(p.nome || "")} ${badgeDup}</td>
      <td>${escapeHTML(p.lote || "-")}</td>
      <td>${p.validade || "-"}</td>
      <td>${p.diasParaVencer ?? "-"}</td>
      <td>${p.quantidade ?? "-" } ${badgeMin}</td>
      <td>${p.statusValidade}${erros}</td>
    </tr>
  `;
}

function escapeHTML(str) {
  return str.replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}