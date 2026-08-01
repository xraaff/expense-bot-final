import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import {
  Tabs, TabList, Tab, TabPanel, Button, TextField, Label, Input,
} from 'react-aria-components';
import { Plus, House, ListBullets, ChartPie } from '@phosphor-icons/react';
import { Overview } from './screens/Overview';
import { Operations } from './screens/Operations';
import { AddExpenseSheet } from './sheets/AddExpenseSheet';
import { Skeleton } from './components/Skeleton';
import { Toast } from './components/Toast';
import { PromptDialog } from './components/PromptDialog';
import { useExpenses } from './lib/useExpenses';
import { authenticate, fetchMeta, fetchRates, updateMeta } from './lib/api';
import { initTheme } from './lib/theme';
import { monthKey } from './lib/aggregate';
import { MonthPicker } from './components/MonthPicker';
import type { Period } from './components/PeriodPicker';
import { CalendarDate, getLocalTimeZone, today as todayIn } from '@internationalized/date';
import type { Currency, Expense, Rates } from './lib/types';

const Analytics = lazy(() =>
  import('./screens/Analytics').then((m) => ({ default: m.Analytics }))
);

const DEFAULT_CATEGORIES = [
  'Продукты', 'Кафе', 'Транспорт', 'Жильё', 'Здоровье', 'Одежда',
  'Подписки', 'Развлечения', 'Бизнес', 'Образование', 'Красота',
];
const DEFAULT_SOURCES = ['Общий', 'Карта Vova', 'Карта Karina', 'Наличные'];
const DISPLAY_CURRENCIES: Currency[] = ['UAH', 'USD', 'PLN', 'EUR'];

function rangeLastMonths(count: number): { from: string; to: string } {
  const now = new Date();
  const to = now.toISOString().slice(0, 10);
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - count + 1, 1));
  return { from: start.toISOString().slice(0, 10), to };
}

function telegram(): any {
  return (window as any).Telegram?.WebApp;
}

export default function App() {
  const [role, setRole] = useState<string | null>(() => localStorage.getItem('role'));
  const [key, setKey] = useState('');
  const [authError, setAuthError] = useState('');
  const [currency, setCurrency] = useState<Currency>(
    () => (localStorage.getItem('displayCurrency') as Currency) || 'UAH'
  );
  const [rates, setRates] = useState<Rates>({});
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [sources, setSources] = useState<string[]>(DEFAULT_SOURCES);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | undefined>(undefined);
  const [dismissed, setDismissed] = useState(false);
  const [customCats, setCustomCats] = useState<string[]>([]);
  const [customSrcs, setCustomSrcs] = useState<string[]>([]);
  const [tab, setTab] = useState('overview');
  // Период один на операции и аналитику; по умолчанию — текущий месяц с первого числа
  const [period, setPeriodState] = useState<Period>(() => {
    const t = todayIn(getLocalTimeZone());
    try {
      const raw = localStorage.getItem('period');
      if (raw) {
        const p = JSON.parse(raw) as { start: string; end: string };
        const parse = (iso: string): CalendarDate => new CalendarDate(
          Number(iso.slice(0, 4)), Number(iso.slice(5, 7)), Number(iso.slice(8, 10)));
        return { start: parse(p.start), end: parse(p.end) };
      }
    } catch { /* повреждённое значение просто игнорируем */ }
    return { start: t.set({ day: 1 }), end: t };
  });
  const setPeriod = (p: Period): void => {
    setPeriodState(p);
    localStorage.setItem('period',
      JSON.stringify({ start: p.start.toString(), end: p.end.toString() }));
  };
  const [month, setMonth] = useState(() => monthKey(new Date().toISOString().slice(0, 10)));
  const [ask, setAsk] = useState<
    { title: string; value: string; run: (v: string) => void } | null
  >(null);

  const range = useMemo(() => rangeLastMonths(3), []);
  const { items, loading, error, add, update, remove, reload } = useExpenses(range);

  useEffect(() => { initTheme(); }, []);
  useEffect(() => { setDismissed(false); }, [error]);

  // Данные меняются с другого устройства — перечитываем, когда приложение
  // снова становится видимым, иначе телефон и ноутбук расходятся.
  useEffect(() => {
    const sync = (): void => { if (!document.hidden) void reload(); };
    document.addEventListener('visibilitychange', sync);
    window.addEventListener('focus', sync);
    return () => {
      document.removeEventListener('visibilitychange', sync);
      window.removeEventListener('focus', sync);
    };
  }, [reload]);

  useEffect(() => {
    if (!role) return;
    void fetchRates('UAH').then(setRates);
    void fetchMeta().then((m) => {
      if (m.categories.length) {
        const custom = m.categories.map((c) => c.n);
        setCustomCats(custom);
        setCategories([...DEFAULT_CATEGORIES, ...custom]);
      }
      if (m.sources.length) { setCustomSrcs(m.sources); setSources([...DEFAULT_SOURCES, ...m.sources]); }
    });
  }, [role]);

  function askSource(name: string | null, mode: 'add' | 'rename' | 'delete'): void {
    if (mode === 'add') {
      setAsk({ title: 'Новый источник', value: '', run: (v) => { void editSource(null, 'add', v); } });
    } else if (mode === 'rename') {
      setAsk({ title: 'Переименовать источник', value: name!,
               run: (v) => { void editSource(name, 'rename', v); } });
    } else {
      void editSource(name, 'delete');
    }
  }

  async function editSource(name: string | null, mode: 'add' | 'rename' | 'delete', value?: string): Promise<void> {
    let next: string[] = customSrcs;
    let payload: Parameters<typeof updateMeta>[0];
    if (mode === 'add') {
      const v = value!;
      if (!v || sources.includes(v)) return;
      next = [...customSrcs, v];
      payload = { action: 'add', target: 'sources', item: v };
    } else if (mode === 'rename') {
      const v = value!;
      if (!v) return;
      next = customSrcs.map((c) => (c === name ? v : c));
      payload = { action: 'rename', target: 'sources', old_name: name!, new_name: v };
    } else {
      next = customSrcs.filter((c) => c !== name);
      payload = { action: 'delete', target: 'sources', name: name! };
    }
    const prev = customSrcs;
    setCustomSrcs(next);
    setSources([...DEFAULT_SOURCES, ...next]);
    try {
      await updateMeta(payload);
    } catch {
      setCustomSrcs(prev);
      setSources([...DEFAULT_SOURCES, ...prev]);
    }
  }

  function addCategory(): void {
    setAsk({ title: 'Новая категория', value: '', run: (name) => { void applyAddCategory(name); } });
  }

  async function applyAddCategory(name: string): Promise<void> {
    if (!name || categories.includes(name)) return;
    const optimistic = [...customCats, name];
    setCustomCats(optimistic);
    setCategories([...DEFAULT_CATEGORIES, ...optimistic]);
    try {
      await updateMeta({ action: 'add', target: 'categories', item: { n: name, i: '' } });
    } catch {
      setCustomCats(customCats);
      setCategories([...DEFAULT_CATEGORIES, ...customCats]);
    }
  }

  function editCategory(name: string, rename: boolean): void {
    if (rename) {
      setAsk({ title: 'Переименовать категорию', value: name,
               run: (v) => { void applyEditCategory(name, v); } });
    } else {
      void applyEditCategory(name, null);
    }
  }

  async function applyEditCategory(name: string, next: string | null): Promise<void> {
    const rename = next !== null;
    const optimistic = rename
      ? customCats.map((c) => (c === name ? next! : c))
      : customCats.filter((c) => c !== name);
    setCustomCats(optimistic);
    setCategories([...DEFAULT_CATEGORIES, ...optimistic]);
    try {
      await updateMeta(rename
        ? { action: 'rename', target: 'categories', old_name: name, new_name: next! }
        : { action: 'delete', target: 'categories', name });
    } catch {
      setCustomCats(customCats);
      setCategories([...DEFAULT_CATEGORIES, ...customCats]);
    }
  }

  async function doAuth(): Promise<void> {
    const tg = telegram();
    const uid = String(tg?.initDataUnsafe?.user?.id ?? 'web');
    const cid = String(tg?.initDataUnsafe?.chat?.id ?? '');
    const r = await authenticate(key, uid, cid);
    if (r) {
      localStorage.setItem('role', r);
      setRole(r);
      setAuthError('');
    } else {
      setAuthError('Неверный ключ');
    }
  }

  if (!role) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-8">
        <h1 className="gradient-text text-2xl font-semibold">Homebase</h1>
        <TextField value={key} onChange={setKey} className="w-full space-y-2">
          <Label className="text-sm" style={{ color: 'var(--tx2)' }}>Ключ доступа</Label>
          <Input type="password"
                 className="w-full rounded-2xl border px-4 py-3 outline-none"
                 style={{ borderColor: 'var(--bd)', background: 'var(--s1)', color: 'var(--tx)' }} />
        </TextField>
        {authError && <p className="text-sm" style={{ color: 'var(--color-neg)' }}>{authError}</p>}
        <Button onPress={doAuth}
                className="w-full rounded-2xl py-3 font-semibold text-black"
                style={{ background: 'var(--grad)' }}>
          Войти
        </Button>
      </div>
    );
  }

  const userId = String(telegram()?.initDataUnsafe?.user?.id ?? 'web');

  return (
    <div className="min-h-screen">
      <div className="flex items-center justify-between px-5 pt-3">
        {tab === 'overview'
          ? <MonthPicker value={month} onChange={setMonth} />
          : <span />}
        <div className="flex gap-1 rounded-full border p-0.5"
             style={{ borderColor: 'var(--bd)', background: 'var(--s1)' }}>
          {DISPLAY_CURRENCIES.map((c) => {
            const on = currency === c;
            return (
              <Button key={c} aria-label={`Показывать в ${c}`}
                onPress={() => { setCurrency(c); localStorage.setItem('displayCurrency', c); }}
                className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
                style={{ background: on ? 'var(--ink)' : 'transparent',
                         color: on ? '#fff' : 'var(--tx2)' }}>
                {c}
              </Button>
            );
          })}
        </div>
      </div>

      <Tabs selectedKey={tab} onSelectionChange={(k) => setTab(String(k))}>
        <TabPanel id="overview">
          {loading ? <Skeleton className="m-5 h-40" /> : (
            <Overview items={items} currency={currency} rates={rates} month={month}
                      onPickExpense={(e) => { setEditing(e); setSheetOpen(true); }} />
          )}
        </TabPanel>
        <TabPanel id="operations">
          <Operations items={items} currency={currency} rates={rates}
                      period={period} onPeriodChange={setPeriod}
                      onPickExpense={(e) => { setEditing(e); setSheetOpen(true); }} />
        </TabPanel>
        <TabPanel id="analytics">
          <Suspense fallback={<Skeleton className="m-5 h-56" />}>
            <Analytics items={items} currency={currency} rates={rates}
                       period={period} onPeriodChange={setPeriod} />
          </Suspense>
        </TabPanel>

        {/* Кнопка добавления живёт СНАРУЖИ TabList: TabList — коллекция React Aria
            и отрисовывает только Tab, любые другие дети молча теряются. */}
        <div className="fixed inset-x-0 bottom-0 z-40 flex flex-col items-center gap-3 pb-5">
          {tab === 'overview' && (
            <Button aria-label="Добавить трату"
              onPress={() => { setEditing(undefined); setSheetOpen(true); }}
              className="flex h-14 w-14 items-center justify-center rounded-full text-white shadow-xl"
              style={{ background: 'var(--ink)' }}>
              <Plus size={26} weight="bold" />
            </Button>
          )}
          <TabList aria-label="Разделы"
            className="flex items-center gap-1 rounded-full border px-2 py-1.5 shadow-lg"
            style={{ borderColor: 'var(--bd)', background: 'var(--s1)' }}>
            <Tab id="overview" className="flex flex-col items-center rounded-full px-4 py-1.5 text-[10px] selected:text-[var(--color-ac)]">
              <House size={20} weight="duotone" />Обзор
            </Tab>
            <Tab id="operations" className="flex flex-col items-center rounded-full px-4 py-1.5 text-[10px] selected:text-[var(--color-ac)]">
              <ListBullets size={20} weight="duotone" />Операции
            </Tab>
            <Tab id="analytics" className="flex flex-col items-center rounded-full px-4 py-1.5 text-[10px] selected:text-[var(--color-ac)]">
              <ChartPie size={20} weight="duotone" />Аналитика
            </Tab>
          </TabList>
        </div>
      </Tabs>

      <PromptDialog
        isOpen={ask !== null}
        title={ask?.title ?? ''}
        defaultValue={ask?.value ?? ''}
        onClose={() => setAsk(null)}
        onSubmit={(v) => ask?.run(v)}
      />

      <Toast message={dismissed ? null : error}
             onRetry={() => { setDismissed(true); void reload(); }}
             onDismiss={() => setDismissed(true)} />

      <AddExpenseSheet
        isOpen={sheetOpen}
        onOpenChange={(o) => { setSheetOpen(o); if (!o) setEditing(undefined); }}
        categories={categories}
        sources={sources}
        role={role}
        userId={userId}
        initial={editing}
        onSubmit={async (input) => {
          if (editing) await update({ ...editing, ...input, id: editing.id });
          else await add(input);
        }}
        onDelete={editing ? (id) => remove(id) : undefined}
        customCategories={customCats}
        onAddCategory={() => addCategory()}
        onRenameCategory={(n) => editCategory(n, true)}
        onDeleteCategory={(n) => editCategory(n, false)}
        customSources={customSrcs}
        onAddSource={() => askSource(null, 'add')}
        onRenameSource={(n) => askSource(n, 'rename')}
        onDeleteSource={(n) => askSource(n, 'delete')}
      />
    </div>
  );
}
