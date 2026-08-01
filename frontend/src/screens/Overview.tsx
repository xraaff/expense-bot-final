import { Meter, Label } from 'react-aria-components';
import { KpiHero } from '../components/KpiHero';
import { categoryColor } from '../lib/palette';
import { TxRow } from '../components/TxRow';
import { MoneyText } from '../components/MoneyText';
import { EmptyState } from '../components/EmptyState';
import { Receipt } from '@phosphor-icons/react';
import { byCategory, filterMonth, totalFor } from '../lib/aggregate';
import { pctDelta } from '../lib/money';
import type { Currency, Expense, Rates } from '../lib/types';

interface Props {
  items: Expense[];
  currency: Currency;
  rates: Rates;
  month: string;
  onPickExpense: (e: Expense) => void;
}

function previousMonth(month: string): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 2, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function Overview({ items, currency, rates, month, onPickExpense }: Props) {
  const current = filterMonth(items, month);
  const previous = filterMonth(items, previousMonth(month));
  const total = totalFor(current, currency, rates);
  const delta = pctDelta(total, totalFor(previous, currency, rates));
  const cats = byCategory(current, currency, rates).slice(0, 5);
  const recent = [...current].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 5);

  if (current.length === 0) {
    return (
      <div>
        <KpiHero total={0} deltaPct={null} currency={currency} />
        <EmptyState icon={Receipt} title="Трат пока нет"
                    hint="Нажмите плюс, чтобы записать первую" />
      </div>
    );
  }

  return (
    <div className="pb-28">
      <KpiHero total={total} deltaPct={delta} currency={currency} />

      <section className="mx-5 mb-4 rounded-2xl border p-4"
               style={{ borderColor: 'var(--bd)', background: 'var(--s1)' }}>
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.15em]"
           style={{ color: 'var(--tx2)' }}>Категории</p>
        <div className="space-y-3">
          {cats.map((c, i) => (
            <Meter key={c.category} value={c.total} maxValue={total} className="block">
              <div className="mb-1 flex justify-between text-sm">
                <Label data-testid="cat-name" className="font-medium">{c.category}</Label>
                <MoneyText value={c.total} currency={currency} />
              </div>
              <div className="h-1.5 overflow-hidden rounded-full" style={{ background: 'var(--s2)' }}>
                <div className="h-full rounded-full transition-[width] duration-500"
                     style={{ width: `${(c.total / total) * 100}%`, background: categoryColor(i) }} />
              </div>
            </Meter>
          ))}
        </div>
      </section>

      <section>
        <p className="mb-1 px-5 text-[10px] font-semibold uppercase tracking-[0.15em]"
           style={{ color: 'var(--tx2)' }}>Последние операции</p>
        {recent.map((e) => (
          <TxRow key={e.id} expense={e} currency={currency} rates={rates}
                 onPress={() => onPickExpense(e)} />
        ))}
      </section>
    </div>
  );
}
