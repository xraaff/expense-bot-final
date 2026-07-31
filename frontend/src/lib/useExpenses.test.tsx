import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useExpenses } from './useExpenses';
import * as api from './api';
import type { Expense } from './types';

const existing: Expense = {
  id: 'a', date: '2026-03-03', amount: 200, currency: 'UAH', category: 'Кафе',
  description: '', payer: 'Vova', source: 'Общий', user_id: '1',
  created_at: '2026-03-03 10:00:00',
};

const input = {
  date: '2026-03-04', amount: 50, currency: 'UAH' as const, category: 'Продукты',
  description: 'хлеб', payer: 'Vova', source: 'Общий', user_id: '1',
};

const RANGE = { from: '2026-03-01', to: '2026-03-31' };

beforeEach(() => {
  vi.spyOn(api, 'fetchStats').mockResolvedValue([existing]);
});

describe('useExpenses', () => {
  it('загружает операции при монтировании', async () => {
    const { result } = renderHook(() => useExpenses(RANGE));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.items).toHaveLength(1);
  });

  it('добавляет операцию оптимистично, до ответа сервера', async () => {
    let resolveSave: () => void = () => {};
    vi.spyOn(api, 'saveExpense').mockReturnValue(
      new Promise<void>((res) => { resolveSave = res; })
    );
    const { result } = renderHook(() => useExpenses(RANGE));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => { void result.current.add(input); });
    expect(result.current.items).toHaveLength(2);

    await act(async () => { resolveSave(); });
    expect(result.current.items).toHaveLength(2);
  });

  it('откатывает добавление, если сервер ответил ошибкой', async () => {
    vi.spyOn(api, 'saveExpense').mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useExpenses(RANGE));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => { await result.current.add(input); });
    expect(result.current.items).toHaveLength(1);
    expect(result.current.error).toBe('boom');
  });

  it('удаляет операцию оптимистично и откатывает при ошибке', async () => {
    vi.spyOn(api, 'saveExpense').mockRejectedValue(new Error('нет доступа'));
    const { result } = renderHook(() => useExpenses(RANGE));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => { await result.current.remove('a'); });
    expect(result.current.items).toHaveLength(1);
    expect(result.current.error).toBe('нет доступа');
  });
});
