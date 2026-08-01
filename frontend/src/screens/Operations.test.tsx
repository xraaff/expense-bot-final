import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Operations } from './Operations';
import type { Expense } from '../lib/types';
import { getLocalTimeZone, today as todayIn } from '@internationalized/date';

// Диапазон по умолчанию — последние три месяца, поэтому фикстуры строятся
// относительно сегодняшнего дня, иначе тесты протухнут со временем.
const iso = (daysAgo: number): string => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString().slice(0, 10);
};

const D0 = iso(0);
const D1 = iso(1);

const mk = (p: Partial<Expense>): Expense => ({
  id: 'x', date: D0, amount: 100, currency: 'UAH', category: 'Продукты',
  description: '', payer: 'Vova', source: 'Общий', user_id: '1',
  created_at: `${D0} 10:00:00`, ...p,
});

const ITEMS = [
  mk({ id: 'a', amount: 200, category: 'Продукты', description: 'молоко' }),
  mk({ id: 'b', amount: 300, category: 'Кафе', description: 'латте' }),
];

const T = todayIn(getLocalTimeZone());
const props = {
  items: ITEMS, currency: 'UAH' as const, rates: {}, onPickExpense: vi.fn(),
  period: { start: T.subtract({ months: 3 }), end: T },
  onPeriodChange: (): void => {},
};

describe('Operations', () => {
  it('показывает все операции', () => {
    render(<Operations {...props} />);
    expect(screen.getAllByTestId('tx')).toHaveLength(2);
  });

  it('фильтрует по поисковому запросу', async () => {
    const user = userEvent.setup();
    render(<Operations {...props} />);
    await user.type(screen.getByRole('searchbox', { name: 'Поиск' }), 'латте');
    expect(screen.getAllByTestId('tx')).toHaveLength(1);
  });

  it('на пустом списке показывает пустое состояние', () => {
    render(<Operations {...props} items={[]} />);
    expect(screen.getByText('Ничего не найдено')).toBeInTheDocument();
  });

  it('показывает выбор периода', () => {
    render(<Operations {...props} />);
    expect(screen.getByText('Период')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Этот месяц' })).toBeInTheDocument();
  });

  it('операции вне выбранного периода не показываются', () => {
    const old = mk({ id: 'old', date: '2020-01-01', description: 'древнее' });
    render(<Operations {...props} items={[...ITEMS, old]} />);
    expect(screen.getAllByTestId('tx')).toHaveLength(2);
  });

  it('рисует ячейку хитмапа на каждый день с тратами', () => {
    render(<Operations {...props} />);
    expect(screen.getByTestId(`heat-${D0}`)).toBeInTheDocument();
  });

  it('насыщенность ячейки пропорциональна сумме дня', () => {
    const items = [
      mk({ id: 'a', date: D1, amount: 100 }),
      mk({ id: 'b', date: D0, amount: 400 }),
    ];
    render(<Operations {...props} items={items} />);
    const weak = Number(screen.getByTestId(`heat-${D1}`).style.opacity);
    const strong = Number(screen.getByTestId(`heat-${D0}`).style.opacity);
    expect(strong).toBeGreaterThan(weak);
    expect(weak).toBeGreaterThanOrEqual(0.15);
  });
});
