import type { Currency, Rates } from './types';

export const SYMBOLS: Record<Currency, string> = { UAH: '₴', USD: '$', PLN: 'zł' };

export function formatMoney(
  value: number,
  currency: Currency,
  opts: { compact?: boolean } = {}
): string {
  const n = new Intl.NumberFormat('ru-RU', {
    notation: opts.compact ? 'compact' : 'standard',
    maximumFractionDigits: opts.compact ? 1 : 0,
  }).format(value);
  return `${n} ${SYMBOLS[currency]}`;
}

export function convert(amount: number, from: Currency, to: Currency, rates: Rates): number {
  if (from === to) return amount;
  const rateFrom = from === 'UAH' ? 1 : rates[from];
  const rateTo = to === 'UAH' ? 1 : rates[to];
  if (!rateFrom || !rateTo) return amount;
  const inBase = amount / rateFrom;
  return inBase * rateTo;
}

export function pctDelta(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}
