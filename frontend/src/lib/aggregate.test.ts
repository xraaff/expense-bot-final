import { describe, it, expect } from 'vitest';
import { bySource, monthKey, totalFor, filterMonth, byCategory, byPayer, byDay } from './aggregate';
import type { Expense } from './types';

const RATES = { USD: 0.024, PLN: 0.096 };

const mk = (p: Partial<Expense>): Expense => ({
  id: 'x', date: '2026-03-03', amount: 100, currency: 'UAH',
  category: 'Продукты', description: '', payer: 'Vova',
  source: 'Общий', user_id: '1', created_at: '2026-03-03 10:00:00', ...p,
});

const ITEMS: Expense[] = [
  mk({ id: 'a', date: '2026-03-03', amount: 200, category: 'Продукты', payer: 'Vova' }),
  mk({ id: 'b', date: '2026-03-03', amount: 300, category: 'Кафе', payer: 'Karina' }),
  mk({ id: 'c', date: '2026-03-05', amount: 24, currency: 'USD', category: 'Продукты', payer: 'Vova' }),
  mk({ id: 'd', date: '2026-04-01', amount: 999, category: 'Кафе', payer: 'Vova' }),
];

describe('monthKey', () => {
  it('обрезает дату до месяца', () => {
    expect(monthKey('2026-03-14')).toBe('2026-03');
  });
});

describe('filterMonth', () => {
  it('оставляет только нужный месяц', () => {
    expect(filterMonth(ITEMS, '2026-03').map((e) => e.id)).toEqual(['a', 'b', 'c']);
  });
});

describe('totalFor', () => {
  it('суммирует с приведением валют', () => {
    expect(totalFor(filterMonth(ITEMS, '2026-03'), 'UAH', RATES)).toBeCloseTo(1500, 5);
  });
  it('на пустом списке возвращает ноль', () => {
    expect(totalFor([], 'UAH', RATES)).toBe(0);
  });
});

describe('byCategory', () => {
  it('группирует и сортирует по убыванию', () => {
    const r = byCategory(filterMonth(ITEMS, '2026-03'), 'UAH', RATES);
    expect(r[0]).toEqual({ category: 'Продукты', total: 1200 });
    expect(r[1]).toEqual({ category: 'Кафе', total: 300 });
  });
});

describe('byPayer', () => {
  it('разносит суммы по плательщикам', () => {
    const r = byPayer(filterMonth(ITEMS, '2026-03'), 'UAH', RATES);
    expect(r.Vova).toBeCloseTo(1200, 5);
    expect(r.Karina).toBeCloseTo(300, 5);
  });
});

describe('byDay', () => {
  it('разносит суммы по дням', () => {
    const r = byDay(filterMonth(ITEMS, '2026-03'), 'UAH', RATES);
    expect(r['2026-03-03']).toBeCloseTo(500, 5);
    expect(r['2026-03-05']).toBeCloseTo(1000, 5);
  });
});

describe('bySource', () => {
  it('группирует по источнику и сортирует по убыванию', () => {
    const items = [
      mk({ id: 'a', amount: 100, source: 'Общий' }),
      mk({ id: 'b', amount: 400, source: 'Наличные' }),
      mk({ id: 'c', amount: 50, source: 'Общий' }),
    ];
    const r = bySource(items, 'UAH', RATES);
    expect(r[0]).toEqual({ source: 'Наличные', total: 400 });
    expect(r[1]).toEqual({ source: 'Общий', total: 150 });
  });
});
