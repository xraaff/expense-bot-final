import { useCallback, useEffect, useState } from 'react';
import { fetchStats, saveExpense } from './api';
import type { Expense, ExpenseInput } from './types';

function newId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function stamp(): string {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

export function useExpenses(range: { from: string; to: string }) {
  const [items, setItems] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await fetchStats(range.from, range.to));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось загрузить');
    } finally {
      setLoading(false);
    }
  }, [range.from, range.to]);

  useEffect(() => { void reload(); }, [reload]);

  const add = useCallback(async (input: ExpenseInput) => {
    const optimistic: Expense = {
      ...input,
      id: input.id ?? newId(),
      created_at: stamp(),
    };
    setItems((prev) => [...prev, optimistic]);
    setError(null);
    try {
      await saveExpense({ ...input, id: optimistic.id }, 'add');
    } catch (e) {
      setItems((prev) => prev.filter((x) => x.id !== optimistic.id));
      setError(e instanceof Error ? e.message : 'Не удалось записать');
    }
  }, []);

  const update = useCallback(async (next: Expense) => {
    const previous = items.find((x) => x.id === next.id);
    setItems((prev) => prev.map((x) => (x.id === next.id ? next : x)));
    setError(null);
    try {
      await saveExpense(next, 'update');
    } catch (e) {
      if (previous) {
        setItems((prev) => prev.map((x) => (x.id === previous.id ? previous : x)));
      }
      setError(e instanceof Error ? e.message : 'Не удалось изменить');
    }
  }, [items]);

  const remove = useCallback(async (id: string) => {
    const removed = items.find((x) => x.id === id);
    setItems((prev) => prev.filter((x) => x.id !== id));
    setError(null);
    try {
      await saveExpense({ id } as unknown as ExpenseInput, 'delete');
    } catch (e) {
      if (removed) {
        setItems((prev) => (prev.some((x) => x.id === removed.id) ? prev : [...prev, removed]));
      }
      setError(e instanceof Error ? e.message : 'Не удалось удалить');
    }
  }, [items]);

  return { items, loading, error, add, update, remove, reload };
}
