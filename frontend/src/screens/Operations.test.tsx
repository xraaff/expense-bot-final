import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Operations } from './Operations';
import type { Expense } from '../lib/types';

const mk = (p: Partial<Expense>): Expense => ({
  id: 'x', date: '2026-03-03', amount: 100, currency: 'UAH', category: 'Продукты',
  description: '', payer: 'Vova', source: 'Общий', user_id: '1',
  created_at: '2026-03-03 10:00:00', ...p,
});

const ITEMS = [
  mk({ id: 'a', amount: 200, category: 'Продукты', description: 'молоко' }),
  mk({ id: 'b', amount: 300, category: 'Кафе', description: 'латте' }),
];

const props = { items: ITEMS, currency: 'UAH' as const, rates: {}, onPickExpense: vi.fn() };

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
});
