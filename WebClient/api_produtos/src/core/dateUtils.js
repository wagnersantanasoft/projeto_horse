const PADRAO_ISO = /^\d{4}-\d{2}-\d{2}$/;

export function dataHojeISO() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

export function normalizarData(valor) {
  if (!valor) return null;
  let v = valor.trim();
  // dd/mm/yyyy -> yyyy-mm-dd
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(v)) {
    const [dia, mes, ano] = v.split("/");
    return `${ano}-${mes}-${dia}`;
  }
  if (PADRAO_ISO.test(v)) return v;
  // tentar Date parse
  const dt = new Date(v);
  if (isNaN(dt.getTime())) return null;
  return dt.toISOString().slice(0, 10);
}

export function diasEntre(inicioISO, fimISO) {
  const ms = Date.parse(fimISO) - Date.parse(inicioISO);
  return Math.floor(ms / 86400000);
}