import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, Tooltip } from 'recharts';
import { ChartPie } from '@phosphor-icons/react';
import { EmptyState } from '../components/EmptyState';
import { MoneyText } from '../components/MoneyText';
import { byCategory, byDay, bySource, filterMonth, totalFor } from '../lib/aggregate';
import { pctDelta, formatMoney } from '../lib/money';
import { sourceIcon } from '../lib/icons';
import { RatesCard } from '../components/RatesCard';
import type { Currency, Expense, Rates } from '../lib/types';

const PALETTE = ['#AA00FF', '#FF9500', '#FFE620', '#68CE66', '#FF5A5F', '#8a8a9a'];

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
  month: string;
}

function previousMonth(month: string): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 2, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function Analytics({ items, currency, rates, month }: Props) {
  const current = filterMonth(items, month);

  if (current.length === 0) {
    return (
      <div className="space-y-4 px-5 pt-5 pb-28">
        <EmptyState icon={ChartPie} title="Нет данных за период"
                    hint="Запишите первую трату" />
        <RatesCard />
      </div>
    );
  }

  const currentTotal = totalFor(current, currency, rates);
  const previousTotal = totalFor(filterMonth(items, previousMonth(month)), currency, rates);
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

  return (
    <div className="space-y-4 px-5 pt-5 pb-28">
      {delta !== null && (
        <section className="rounded-2xl border p-4"
                 style={{ borderColor: 'var(--bd)', background: 'var(--s1)' }}>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.15em]"
             style={{ color: 'var(--tx2)' }}>Против прошлого месяца</p>
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
                   innerRadius={58} outerRadius={88} paddingAngle={2} stroke="none">
                {cats.map((_, i) => (
                  <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
        <ul className="mt-3 space-y-2">
          {cats.map((c, i) => (
            <li key={c.category} className="flex items-center gap-2 text-sm">
              <span className="h-2.5 w-2.5 rounded-full"
                    style={{ background: PALETTE[i % PALETTE.length] }} />
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
              <Bar dataKey="total" fill="var(--color-ac)" radius={[6, 6, 0, 0]} />
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
