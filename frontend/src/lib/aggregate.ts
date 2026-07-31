import type { Currency, Expense, Rates } from './types';
import { convert } from './money';

export function monthKey(date: string): string {
  return date.slice(0, 7);
}

export function filterMonth(items: Expense[], month: string): Expense[] {
  return items.filter((e) => monthKey(e.date) === month);
}

export function totalFor(items: Expense[], to: Currency, rates: Rates): number {
  return items.reduce((sum, e) => sum + convert(e.amount, e.currency, to, rates), 0);
}

function groupSum(
  items: Expense[],
  to: Currency,
  rates: Rates,
  key: (e: Expense) => string
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const e of items) {
    const k = key(e);
    out[k] = (out[k] ?? 0) + convert(e.amount, e.currency, to, rates);
  }
  return out;
}

export function byCategory(
  items: Expense[],
  to: Currency,
  rates: Rates
): { category: string; total: number }[] {
  const grouped = groupSum(items, to, rates, (e) => e.category);
  return Object.entries(grouped)
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);
}

export function byPayer(items: Expense[], to: Currency, rates: Rates): Record<string, number> {
  return groupSum(items, to, rates, (e) => e.payer);
}

export function byDay(items: Expense[], to: Currency, rates: Rates): Record<string, number> {
  return groupSum(items, to, rates, (e) => e.date);
}
