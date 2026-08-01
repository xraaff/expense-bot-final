import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Analytics } from './Analytics';
import type { Expense } from '../lib/types';
import { CalendarDate } from '@internationalized/date';

const PERIOD = { start: new CalendarDate(2026, 3, 1), end: new CalendarDate(2026, 3, 31) };
const noop = (): void => {};

const mk = (p: Partial<Expense>): Expense => ({
  id: 'x', date: '2026-03-03', amount: 100, currency: 'UAH', category: 'Продукты',
  description: '', payer: 'Vova', source: 'Общий', user_id: '1',
  created_at: '2026-03-03 10:00:00', ...p,
});

describe('Analytics', () => {
  it('перечисляет категории с суммами', () => {
    render(<Analytics items={[mk({ amount: 200 }), mk({ id: 'b', amount: 300, category: 'Кафе' })]}
                      currency="UAH" rates={{}} period={PERIOD} onPeriodChange={noop} />);
    expect(screen.getByText('Кафе')).toBeInTheDocument();
    expect(screen.getByText('Продукты')).toBeInTheDocument();
  });

  it('на пустых данных показывает пустое состояние', () => {
    render(<Analytics items={[]} currency="UAH" rates={{}} period={PERIOD} onPeriodChange={noop} />);
    expect(screen.getByText('Нет данных за период')).toBeInTheDocument();
  });

  it('показывает сравнение с предыдущим месяцем', () => {
    const items = [
      mk({ id: 'a', date: '2026-03-03', amount: 500 }),
      mk({ id: 'b', date: '2026-02-03', amount: 1000 }),
    ];
    render(<Analytics items={items} currency="UAH" rates={{}} period={PERIOD} onPeriodChange={noop} />);
    expect(screen.getByTestId('period-delta')).toHaveTextContent('50');
  });

  it('показывает разбивку по источникам', () => {
    const items = [mk({ id: 'a', amount: 200, source: 'Наличные' })];
    render(<Analytics items={items} currency="UAH" rates={{}} period={PERIOD} onPeriodChange={noop} />);
    expect(screen.getByTestId('src-Наличные')).toHaveTextContent('200');
  });

  it('данные другого месяца не попадают в итог', () => {
    const items = [
      mk({ id: 'a', date: '2026-03-03', amount: 500 }),
      mk({ id: 'b', date: '2026-02-03', amount: 1000, category: 'Кафе' }),
    ];
    render(<Analytics items={items} currency="UAH" rates={{}} period={PERIOD} onPeriodChange={noop} />);
    expect(screen.queryByText('Кафе')).not.toBeInTheDocument();
  });
});
