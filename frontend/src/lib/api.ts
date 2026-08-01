import type { CategoryMeta, Currency, Expense, ExpenseInput, Rates } from './types';

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return (await r.json()) as T;
}

/** Google Sheets умеет отдать дату числом-серийником, а id — числом.
 *  Один кривой тип валил весь интерфейс (created_at.localeCompare),
 *  поэтому приводим строковые поля к строкам прямо на входе. */
function normalize(r: Expense): Expense {
  const s = (v: unknown): string => (v === null || v === undefined ? '' : String(v));
  return {
    ...r,
    id: s(r.id),
    date: s(r.date),
    currency: s(r.currency) as Expense['currency'],
    category: s(r.category),
    description: s(r.description),
    source: s(r.source),
    user_id: s(r.user_id),
    created_at: s(r.created_at),
    amount: Number(r.amount) || 0,
  };
}

export async function fetchStats(from: string, to: string): Promise<Expense[]> {
  const r = await fetch(`/api/stats?from=${from}&to=${to}`);
  const j = (await r.json()) as { ok: boolean; rows?: Expense[] };
  return (j.rows ?? []).map(normalize);
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

export type MetaTarget = 'categories' | 'sources';

export type MetaUpdate =
  | { action: 'add'; target: MetaTarget; item: unknown }
  | { action: 'rename'; target: MetaTarget; old_name: string; new_name: string; new_icon?: string }
  | { action: 'delete'; target: MetaTarget; name: string };

export async function updateMeta(payload: MetaUpdate): Promise<void> {
  const j = await postJson<{ ok: boolean; error?: string }>('/api/meta', payload);
  if (!j.ok) throw new Error(j.error ?? 'Не удалось сохранить справочник');
}

export async function fetchSettings(): Promise<{ usd_pln: number } | null> {
  try {
    const r = await fetch('/api/settings');
    const j = (await r.json()) as { ok: boolean; usd_pln?: number };
    return j.ok && typeof j.usd_pln === 'number' ? { usd_pln: j.usd_pln } : null;
  } catch {
    return null;
  }
}

export async function setUsdPln(value: number): Promise<void> {
  const j = await postJson<{ ok: boolean; error?: string }>('/api/settings', { usd_pln: value });
  if (!j.ok) throw new Error(j.error ?? 'Не удалось сохранить курс');
}

export interface RatesFull {
  quotes: { UAH_per_USD: number; UAH_per_PLN: number; UAH_per_EUR: number;
            USD_per_PLN: number; USD_per_EUR: number };
  sources: { USD: string; PLN: string };
}

export async function fetchRatesFull(): Promise<RatesFull | null> {
  try {
    const r = await fetch(`/api/rates?base=UAH&t=${Date.now()}`);
    const j = (await r.json()) as Partial<RatesFull> & { ok?: boolean };
    return j.quotes && j.sources ? { quotes: j.quotes, sources: j.sources } : null;
  } catch {
    return null;
  }
}

export async function setUsdEur(value: number): Promise<void> {
  const j = await postJson<{ ok: boolean; error?: string }>('/api/settings', { usd_eur: value });
  if (!j.ok) throw new Error(j.error ?? 'Не удалось сохранить курс');
}
