import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, Tooltip } from 'recharts';
import { ChartPie } from '@phosphor-icons/react';
import { EmptyState } from '../components/EmptyState';
import { MoneyText } from '../components/MoneyText';
import { byCategory, byDay, bySource, totalFor } from '../lib/aggregate';
import { pctDelta, formatMoney } from '../lib/money';
import { sourceIcon } from '../lib/icons';
import { RatesCard } from '../components/RatesCard';
import { categoryColor, magnitudeColor } from '../lib/palette';
import { PeriodPicker, type Period } from '../components/PeriodPicker';
import type { Currency, Expense, Rates } from '../lib/types';



function DayTooltip({ active, payload, currency }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload as { label: string; total: number };
  return (
    <div className="rounded-xl border px-3 py-2 text-xs shadow-lg"
         style={{ borderColor: 'var(--bd)', background: 'var(--s1)', color: 'var(--tx)' }}>
      <p style={{ color: 'var(--tx2)' }}>{p.label}</p>
      <p className="tnum mt-0.5 font-semibold">{formatMoney(p.total, currency)}</p>
    </div>
  );
}

interface Props {
  items: Expense[];
  currency: Currency;
  rates: Rates;
  period: Period;
  onPeriodChange: (p: Period) => void;
}

/** Зазор нужен только между секторами. Единственная категория — это сектор
 *  в 360°, и с ненулевым зазором recharts вырождает его: бублик пропадал. */
export function donutPadding(categories: number): number {
  return categories > 1 ? 2 : 0;
}

/** Предыдущее окно той же длины — честное сравнение для любого периода. */
function shiftBack(p: Period): { from: string; to: string } {
  const days = p.end.compare(p.start);
  return {
    from: p.start.subtract({ days: days + 1 }).toString(),
    to: p.start.subtract({ days: 1 }).toString(),
  };
}

function inWindow(items: Expense[], from: string, to: string): Expense[] {
  return items.filter((e) => e.date >= from && e.date <= to);
}

export function Analytics({ items, currency, rates, period, onPeriodChange }: Props) {
  const current = inWindow(items, period.start.toString(), period.end.toString());

  if (current.length === 0) {
    return (
      <div className="space-y-4 px-5 pt-5 pb-28">
        <PeriodPicker value={period} onChange={onPeriodChange} />
        <EmptyState icon={ChartPie} title="Нет данных за период"
                    hint="Запишите первую трату" />
        <RatesCard />
      </div>
    );
  }

  const currentTotal = totalFor(current, currency, rates);
  const back = shiftBack(period);
  const previousTotal = totalFor(inWindow(items, back.from, back.to), currency, rates);
  const delta = pctDelta(currentTotal, previousTotal);

  const cats = byCategory(current, currency, rates);
  const srcs = bySource(current, currency, rates);
  const daily = Object.entries(byDay(current, currency, rates))
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([iso, total]) => ({
      iso,
      day: String(Number(iso.slice(8))),
      label: new Date(`${iso}T00:00:00Z`).toLocaleDateString('ru-RU',
        { day: 'numeric', month: 'long' }),
      total: Math.round(total),
    }));
  const dailyMax = daily.length ? Math.max(...daily.map((d) => d.total)) : 0;

  return (
    <div className="space-y-4 px-5 pt-5 pb-28">
      <PeriodPicker value={period} onChange={onPeriodChange} />
      {delta !== null && (
        <section className="rounded-2xl border p-4"
                 style={{ borderColor: 'var(--bd)', background: 'var(--s1)' }}>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.15em]"
             style={{ color: 'var(--tx2)' }}>Против прошлого периода</p>
          <p data-testid="period-delta" className="tnum text-2xl font-medium"
             style={{ color: delta <= 0 ? 'var(--color-pos)' : 'var(--color-neg)' }}>
            {delta <= 0 ? '↓' : '↑'} {Math.abs(delta).toFixed(0)}%
          </p>
          <p className="mt-1 text-xs" style={{ color: 'var(--tx2)' }}>
            было <MoneyText value={previousTotal} currency={currency} />
          </p>
        </section>
      )}

      <section className="rounded-2xl border p-4"
               style={{ borderColor: 'var(--bd)', background: 'var(--s1)' }}>
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.15em]"
           style={{ color: 'var(--tx2)' }}>Структура трат</p>
        <div style={{ height: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={cats} dataKey="total" nameKey="category"
                   innerRadius={58} outerRadius={88}
                   paddingAngle={donutPadding(cats.length)} stroke="none">
                {cats.map((_, i) => (
                  <Cell key={i} fill={categoryColor(i)} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
        <ul className="mt-3 space-y-2">
          {cats.map((c, i) => (
            <li key={c.category} className="flex items-center gap-2 text-sm">
              <span className="h-2.5 w-2.5 rounded-full"
                    style={{ background: categoryColor(i) }} />
              <span className="flex-1">{c.category}</span>
              <MoneyText value={c.total} currency={currency} className="font-medium" />
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border p-4"
               style={{ borderColor: 'var(--bd)', background: 'var(--s1)' }}>
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.15em]"
           style={{ color: 'var(--tx2)' }}>По дням</p>
        <div style={{ height: 160 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={daily}>
              <XAxis dataKey="day" tick={{ fill: 'var(--tx2)', fontSize: 10 }}
                     axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: 'var(--s2)' }} content={<DayTooltip currency={currency} />} />
              <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                {daily.map((d) => (
                  <Cell key={d.iso} fill={magnitudeColor(d.total, dailyMax)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="rounded-2xl border p-4"
               style={{ borderColor: 'var(--bd)', background: 'var(--s1)' }}>
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.15em]"
           style={{ color: 'var(--tx2)' }}>Источники денег</p>
        <ul className="space-y-2">
          {srcs.map((s) => {
            const IconCmp = sourceIcon(s.source);
            return (
              <li key={s.source} data-testid={`src-${s.source}`}
                  className="flex items-center gap-2 text-sm">
                <IconCmp size={16} weight="duotone" color="var(--color-ac)" />
                <span className="flex-1">{s.source}</span>
                <MoneyText value={s.total} currency={currency} className="font-medium" />
              </li>
            );
          })}
        </ul>
      </section>
      <RatesCard />
    </div>
  );
}
