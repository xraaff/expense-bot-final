import { useMemo, useState } from 'react';
import { SearchField, Label, Input } from 'react-aria-components';
import { MagnifyingGlass } from '@phosphor-icons/react';
import { TxRow } from '../components/TxRow';
import { EmptyState } from '../components/EmptyState';
import { MoneyText } from '../components/MoneyText';
import { byDay } from '../lib/aggregate';
import type { Currency, Expense, Rates } from '../lib/types';

interface Props {
  items: Expense[];
  currency: Currency;
  rates: Rates;
  onPickExpense: (e: Expense) => void;
}

export function Operations({ items, currency, rates, onPickExpense }: Props) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (e) =>
        e.description.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q) ||
        e.source.toLowerCase().includes(q)
    );
  }, [items, query]);

  const days = useMemo(() => {
    const totals = byDay(filtered, currency, rates);
    return Object.keys(totals).sort((a, b) => b.localeCompare(a)).map((d) => ({
      date: d,
      total: totals[d],
      rows: filtered.filter((e) => e.date === d),
    }));
  }, [filtered, currency, rates]);

  return (
    <div className="pb-28">
      <div className="px-5 pt-5 pb-3">
        <SearchField value={query} onChange={setQuery} className="block">
          <Label className="sr-only">Поиск</Label>
          <div className="flex items-center gap-2 rounded-2xl border px-4 py-2.5"
               style={{ borderColor: 'var(--bd)', background: 'var(--s1)' }}>
            <MagnifyingGlass size={16} weight="duotone" color="var(--tx2)" />
            <Input placeholder="Поиск по тратам"
                   className="w-full bg-transparent text-sm outline-none"
                   style={{ color: 'var(--tx)' }} />
          </div>
        </SearchField>
      </div>

      {days.length === 0 ? (
        <EmptyState icon={MagnifyingGlass} title="Ничего не найдено"
                    hint="Измените запрос или период" />
      ) : (
        days.map((d) => (
          <section key={d.date} className="mb-2">
            <div className="flex items-baseline justify-between px-5 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em]"
                 style={{ color: 'var(--tx2)' }}>{d.date}</p>
              <MoneyText value={d.total} currency={currency} className="text-xs" />
            </div>
            {d.rows.map((e) => (
              <div key={e.id} data-testid="tx">
                <TxRow expense={e} currency={currency} rates={rates}
                       onPress={() => onPickExpense(e)} />
              </div>
            ))}
          </section>
        ))
      )}
    </div>
  );
}
