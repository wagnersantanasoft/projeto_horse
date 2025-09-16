import { diffFromToday, isValidBrDate } from './dateUtils.js';

export function computeStatus(prod, daysThreshold) {
  const v = prod.PRO_VALIDADE;
  if (!v || !isValidBrDate(v)) {
    return { status: 'OK', dias: null };
  }
  const diff = diffFromToday(v);
  if (diff === null) return { status: 'OK', dias: null };
  if (diff < 0) return { status: 'VENCIDO', dias: diff };
  if (diff <= daysThreshold) return { status: 'ALERTA', dias: diff };
  return { status: 'OK', dias: diff };
}