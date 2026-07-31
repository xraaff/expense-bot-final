import type { CategoryMeta, Currency, Expense, ExpenseInput, Rates } from './types';

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return (await r.json()) as T;
}

export async function fetchStats(from: string, to: string): Promise<Expense[]> {
  const r = await fetch(`/api/stats?from=${from}&to=${to}`);
  const j = (await r.json()) as { ok: boolean; rows?: Expense[] };
  return j.rows ?? [];
}

export async function saveExpense(
  input: ExpenseInput,
  action: 'add' | 'update' | 'delete'
): Promise<void> {
  const j = await postJson<{ ok: boolean; error?: string }>('/api/expense', {
    ...input,
    _action: action,
  });
  if (!j.ok) throw new Error(j.error ?? 'Не удалось сохранить');
}

export async function fetchMeta(): Promise<{ categories: CategoryMeta[]; sources: string[] }> {
  try {
    const r = await fetch('/api/meta');
    const j = (await r.json()) as { ok: boolean; categories?: CategoryMeta[]; sources?: string[] };
    return { categories: j.categories ?? [], sources: j.sources ?? [] };
  } catch {
    return { categories: [], sources: [] };
  }
}

export async function fetchRates(base: Currency = 'UAH'): Promise<Rates> {
  try {
    const r = await fetch(`/api/rates?base=${base}`);
    const j = (await r.json()) as { rates?: Rates };
    return j.rates ?? {};
  } catch {
    return {};
  }
}

export async function authenticate(
  key: string,
  userId: string,
  chatId: string
): Promise<string | null> {
  const j = await postJson<{ ok: boolean; role?: string }>('/api/auth', {
    key,
    user_id: userId,
    chat_id: chatId,
  });
  return j.ok ? (j.role ?? null) : null;
}
