import { useMemo, useState } from 'react';
import {
  SearchField, Label, Input, Button,
  DateRangePicker, Group, DateInput, DateSegment, Popover, Dialog,
  RangeCalendar, CalendarGrid, CalendarCell, Heading,
} from 'react-aria-components';
import { MagnifyingGlass } from '@phosphor-icons/react';
import { getLocalTimeZone, today as todayIn, type CalendarDate } from '@internationalized/date';
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
  const [range, setRange] = useState<{ start: CalendarDate; end: CalendarDate }>(() => {
    const t = todayIn(getLocalTimeZone());
    return { start: t.subtract({ months: 3 }), end: t };
  });

  const inRange = useMemo(() => {
    const from = range.start.toString();
    const to = range.end.toString();
    return items.filter((e) => e.date >= from && e.date <= to);
  }, [items, range]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return inRange;
    return inRange.filter(
      (e) =>
        e.description.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q) ||
        e.source.toLowerCase().includes(q)
    );
  }, [inRange, query]);

  const totals = useMemo(() => byDay(filtered, currency, rates), [filtered, currency, rates]);

  const days = useMemo(
    () =>
      Object.keys(totals)
        .sort((a, b) => b.localeCompare(a))
        .map((d) => ({ date: d, total: totals[d], rows: filtered.filter((e) => e.date === d) })),
    [totals, filtered]
  );

  const heatDates = Object.keys(totals).sort();
  const heatMax = heatDates.length ? Math.max(...heatDates.map((d) => totals[d])) : 0;

  return (
    <div className="pb-28">
      <div className="px-5 pt-5 pb-3 space-y-3">
        <DateRangePicker aria-label="Период" value={range}
                         onChange={(v) => v && setRange(v as { start: CalendarDate; end: CalendarDate })}
                         className="space-y-2">
          <Label className="text-[10px] font-semibold uppercase tracking-[0.15em]"
                 style={{ color: 'var(--tx2)' }}>Период</Label>
          <Group className="flex items-center gap-2 rounded-2xl border px-4 py-2.5"
                 style={{ borderColor: 'var(--bd)', background: 'var(--s1)' }}>
            <DateInput slot="start" className="tnum flex gap-0.5 text-sm">
              {(s) => <DateSegment segment={s} className="px-0.5 outline-none" />}
            </DateInput>
            <span style={{ color: 'var(--tx2)' }}>—</span>
            <DateInput slot="end" className="tnum flex gap-0.5 text-sm">
              {(s) => <DateSegment segment={s} className="px-0.5 outline-none" />}
            </DateInput>
            <Button className="ml-auto text-sm" style={{ color: 'var(--color-ac)' }}>Выбрать</Button>
          </Group>
          <Popover className="rounded-2xl border p-3 shadow-xl"
                   style={{ borderColor: 'var(--bd)', background: 'var(--s1)' }}>
            <Dialog>
              <RangeCalendar>
                <header className="mb-2 flex items-center justify-between">
                  <Button slot="previous" className="px-2">‹</Button>
                  <Heading className="text-sm font-medium" />
                  <Button slot="next" className="px-2">›</Button>
                </header>
                <CalendarGrid className="text-sm">
                  {(d) => (
                    <CalendarCell date={d}
                      className="flex h-9 w-9 items-center justify-center rounded-lg
                                 selected:bg-[var(--color-ac)] selected:text-black" />
                  )}
                </CalendarGrid>
              </RangeCalendar>
            </Dialog>
          </Popover>
        </DateRangePicker>

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

      {heatDates.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1 px-5">
          {heatDates.map((d) => (
            <span key={d} data-testid={`heat-${d}`} title={d}
                  className="h-6 w-6 rounded-md"
                  style={{
                    background: 'var(--color-ac)',
                    // минимум 0.15 — самая мелкая трата всё равно остаётся видимой
                    opacity: String(Math.max(0.15, totals[d] / heatMax)),
                  }} />
          ))}
        </div>
      )}

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
