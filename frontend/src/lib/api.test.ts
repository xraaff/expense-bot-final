import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchStats, saveExpense, fetchRates, authenticate } from './api';

const mockFetch = (body: unknown, ok = true) =>
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok, json: async () => body,
  }));

afterEach(() => vi.unstubAllGlobals());

describe('fetchStats', () => {
  it('возвращает строки из ответа', async () => {
    mockFetch({ ok: true, rows: [{ id: 'a', amount: 5 }] });
    const rows = await fetchStats('2026-03-01', '2026-03-31');
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe('a');
  });

  it('передаёт диапазон в query', async () => {
    mockFetch({ ok: true, rows: [] });
    await fetchStats('2026-03-01', '2026-03-31');
    const url = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(url).toContain('from=2026-03-01');
    expect(url).toContain('to=2026-03-31');
  });
});

describe('saveExpense', () => {
  const input = {
    date: '2026-03-03', amount: 100, currency: 'UAH' as const, category: 'Кафе',
    description: '', payer: 'Vova', source: 'Общий', user_id: '1',
  };

  it('шлёт действие в поле _action', async () => {
    mockFetch({ ok: true });
    await saveExpense(input, 'add');
    const init = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1] as RequestInit;
    expect(JSON.parse(init.body as string)._action).toBe('add');
  });

  it('бросает ошибку, когда бэкенд вернул ok:false', async () => {
    mockFetch({ ok: false, error: 'id not found' });
    await expect(saveExpense(input, 'update')).rejects.toThrow('id not found');
  });
});

describe('fetchRates', () => {
  it('возвращает курсы', async () => {
    mockFetch({ ok: true, base: 'UAH', rates: { USD: 0.024 } });
    expect(await fetchRates('UAH')).toEqual({ USD: 0.024 });
  });
  it('на сетевой ошибке отдаёт пустой объект', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    expect(await fetchRates('UAH')).toEqual({});
  });
});

describe('authenticate', () => {
  it('возвращает роль при успехе', async () => {
    mockFetch({ ok: true, role: 'Vova' });
    expect(await authenticate('key', '1', '2')).toBe('Vova');
  });
  it('возвращает null при неверном ключе', async () => {
    mockFetch({ ok: false });
    expect(await authenticate('bad', '1', '2')).toBeNull();
  });
});
