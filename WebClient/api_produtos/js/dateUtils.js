export function isoToBr(iso) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '';
  const [y,m,d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export function brToIso(br) {
  if (!br) return '';
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(br)) {
    const [d,m,y] = br.split('/');
    return `${y}-${m}-${d}`;
  }
  return br;
}

export function isValidBrDate(br) {
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(br)) return false;
  const [d,m,y] = br.split('/').map(Number);
  const dt = new Date(y, m-1, d);
  return dt.getFullYear() === y && dt.getMonth() === m-1 && dt.getDate() === d;
}

export function diffFromToday(brDate) {
  if (!isValidBrDate(brDate)) return null;
  const [d,m,y] = brDate.split('/').map(Number);
  const today = new Date();
  const dt = new Date(y, m-1, d, 0,0,0,0);
  const todayMid = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diffMs = dt.getTime() - todayMid.getTime();
  return Math.round(diffMs / 86400000);
}