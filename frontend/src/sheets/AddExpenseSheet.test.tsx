import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AddExpenseSheet } from './AddExpenseSheet';

const base = {
  isOpen: true,
  onOpenChange: () => {},
  categories: ['Продукты', 'Кафе'],
  sources: ['Общий', 'Наличные'],
  role: 'Vova',
  userId: '821378781',
};

describe('AddExpenseSheet', () => {
  it('кнопка записи заблокирована, пока нет суммы и категории', () => {
    render(<AddExpenseSheet {...base} onSubmit={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Записать' })).toBeDisabled();
  });

  it('после заполнения суммы и категории отправляет корректные данные', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<AddExpenseSheet {...base} onSubmit={onSubmit} />);

    await user.type(screen.getByRole('textbox', { name: 'Сумма' }), '250');
    await user.click(screen.getByRole('button', { name: 'Кафе' }));
    await user.click(screen.getByRole('button', { name: 'Записать' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const payload = onSubmit.mock.calls[0][0];
    expect(payload.amount).toBe(250);
    expect(payload.category).toBe('Кафе');
    expect(payload.currency).toBe('UAH');
    expect(payload.payer).toBe(''); // персонализация по человеку убрана
    expect(payload.user_id).toBe('821378781');
  });

  it('в режиме правки показывает удаление', () => {
    const initial = {
      id: 'a', date: '2026-03-03', amount: 200, currency: 'UAH' as const, category: 'Кафе',
      description: '', payer: 'Vova', source: 'Общий', user_id: '1',
      created_at: '2026-03-03 10:00:00',
    };
    render(<AddExpenseSheet {...base} initial={initial} onSubmit={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Удалить' })).toBeInTheDocument();
  });

  it('по умолчанию подставляет сегодняшнюю дату', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<AddExpenseSheet {...base} onSubmit={onSubmit} />);
    await user.type(screen.getByRole('textbox', { name: 'Сумма' }), '100');
    await user.click(screen.getByRole('button', { name: 'Кафе' }));
    await user.click(screen.getByRole('button', { name: 'Записать' }));
    const today = new Date().toISOString().slice(0, 10);
    expect(onSubmit.mock.calls[0][0].date).toBe(today);
  });

  it('даёт быстрый выбор даты чипами', () => {
    render(<AddExpenseSheet {...base} onSubmit={vi.fn()} />);
    expect(screen.getByText('Дата')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Сегодня' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Вчера' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Выбрать дату в календаре' })).toBeInTheDocument();
  });

  it('чип Вчера подставляет вчерашнюю дату', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<AddExpenseSheet {...base} onSubmit={onSubmit} />);
    await user.type(screen.getByRole('textbox', { name: 'Сумма' }), '100');
    await user.click(screen.getByRole('button', { name: 'Кафе' }));
    await user.click(screen.getByRole('button', { name: 'Вчера' }));
    await user.click(screen.getByRole('button', { name: 'Записать' }));
    const d = new Date(); d.setDate(d.getDate() - 1);
    expect(onSubmit.mock.calls[0][0].date).toBe(d.toISOString().slice(0, 10));
  });
});
