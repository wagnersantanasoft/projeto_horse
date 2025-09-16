// Conversões entre formatos de data usados:
// Input de formulário (type="date"): ISO = yyyy-MM-dd
// API / tabela: dd/MM/yyyy

export function isoToBr(iso) {
  if (!iso) return '';
  const [y,m,d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

export function brToIso(br) {
  if (!br) return '';
  const parts = br.split('/');
  if (parts.length !== 3) return br;
  const [d,m,y] = parts;
  return `${y}-${m}-${d}`;
}

// Validação básica dd/MM/yyyy
export function isValidBrDate(br) {
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(br)) return false;
  const [d,m,y] = br.split('/').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && (dt.getMonth()+1) === m && dt.getDate() === d;
}