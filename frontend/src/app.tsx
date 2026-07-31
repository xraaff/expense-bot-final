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
import { useExpenses } from './lib/useExpenses';
import { authenticate, fetchMeta, fetchRates, updateMeta } from './lib/api';
import { initTheme } from './lib/theme';
import { monthKey } from './lib/aggregate';
import type { Currency, Expense, Rates } from './lib/types';

const Analytics = lazy(() =>
  import('./screens/Analytics').then((m) => ({ default: m.Analytics }))
);

const DEFAULT_CATEGORIES = [
  'Продукты', 'Кафе', 'Транспорт', 'Жильё', 'Здоровье', 'Одежда',
  'Подписки', 'Развлечения', 'Бизнес', 'Образование', 'Красота',
];
const DEFAULT_SOURCES = ['Общий', 'Карта Vova', 'Карта Karina', 'Наличные'];

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
  const [currency] = useState<Currency>('UAH');
  const [rates, setRates] = useState<Rates>({});
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [sources, setSources] = useState<string[]>(DEFAULT_SOURCES);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | undefined>(undefined);
  const [dismissed, setDismissed] = useState(false);
  const [customCats, setCustomCats] = useState<string[]>([]);

  const range = useMemo(() => rangeLastMonths(3), []);
  const { items, loading, error, add, update, remove, reload } = useExpenses(range);

  useEffect(() => { initTheme(); }, []);
  useEffect(() => { setDismissed(false); }, [error]);

  useEffect(() => {
    if (!role) return;
    void fetchRates('UAH').then(setRates);
    void fetchMeta().then((m) => {
      if (m.categories.length) {
        const custom = m.categories.map((c) => c.n);
        setCustomCats(custom);
        setCategories([...DEFAULT_CATEGORIES, ...custom]);
      }
      if (m.sources.length) setSources([...DEFAULT_SOURCES, ...m.sources]);
    });
  }, [role]);

  async function editCategory(name: string, rename: boolean): Promise<void> {
    const next = rename ? window.prompt('Новое имя категории', name)?.trim() : null;
    if (rename && !next) return;
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
  const month = monthKey(new Date().toISOString().slice(0, 10));

  return (
    <div className="min-h-screen">
      <Tabs defaultSelectedKey="overview">
        <TabPanel id="overview">
          {loading ? <Skeleton className="m-5 h-40" /> : (
            <Overview items={items} currency={currency} rates={rates} month={month}
                      onPickExpense={(e) => { setEditing(e); setSheetOpen(true); }} />
          )}
        </TabPanel>
        <TabPanel id="operations">
          <Operations items={items} currency={currency} rates={rates}
                      onPickExpense={(e) => { setEditing(e); setSheetOpen(true); }} />
        </TabPanel>
        <TabPanel id="analytics">
          <Suspense fallback={<Skeleton className="m-5 h-56" />}>
            <Analytics items={items} currency={currency} rates={rates} month={month} />
          </Suspense>
        </TabPanel>

        {/* Кнопка добавления живёт СНАРУЖИ TabList: TabList — коллекция React Aria
            и отрисовывает только Tab, любые другие дети молча теряются. */}
        <div className="fixed inset-x-0 bottom-0 z-40 flex flex-col items-center gap-3 pb-5">
          <Button aria-label="Добавить трату"
            onPress={() => { setEditing(undefined); setSheetOpen(true); }}
            className="flex h-14 w-14 items-center justify-center rounded-full text-black shadow-xl"
            style={{ background: 'var(--grad)' }}>
            <Plus size={26} weight="bold" />
          </Button>
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
        onRenameCategory={(n) => { void editCategory(n, true); }}
        onDeleteCategory={(n) => { void editCategory(n, false); }}
      />
    </div>
  );
}
