import type { Currency, Rates } from './types';

export const SYMBOLS: Record<Currency, string> = { UAH: '₴', USD: '$', PLN: 'zł', EUR: '€' };

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
  if (!rateFrom || !rateTo || rateFrom <= 0 || rateTo <= 0) return amount;
  const inBase = amount / rateFrom;
  return inBase * rateTo;
}

export function pctDelta(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

/**
 * Разбор суммы, введённой человеком. Принимает и точку, и запятую как
 * десятичный разделитель, терпит пробелы и неразрывные пробелы между разрядами.
 * Возвращает NaN, если из строки не выходит осмысленного положительного числа.
 */
export function parseAmount(raw: string): number {
  const cleaned = raw
    .replace(/[\s\u00A0\u202F]/g, '')  // пробелы, в том числе неразрывные
    .replace(/,/g, '.');                 // запятая как десятичный разделитель
  if (cleaned === '' || cleaned === '.') return NaN;
  // Несколько точек: последняя считается десятичной, остальные — разрядные
  const parts = cleaned.split('.');
  const normalized = parts.length <= 2
    ? cleaned
    : `${parts.slice(0, -1).join('')}.${parts[parts.length - 1]}`;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : NaN;
}
