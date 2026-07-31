import { MoneyText } from './MoneyText';
import type { Currency } from '../lib/types';

interface Props { total: number; deltaPct: number | null; currency: Currency }

export function KpiHero({ total, deltaPct, currency }: Props) {
  const positive = deltaPct !== null && deltaPct <= 0;
  return (
    <section className="px-5 pt-6 pb-4">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.15em]"
         style={{ color: 'var(--tx2)' }}>
        Потрачено за месяц
      </p>
      <MoneyText value={total} currency={currency}
                 className="gradient-text block text-5xl font-medium tracking-[-0.02em]" />
      {deltaPct !== null && (
        <p data-testid="delta" className="tnum mt-2 text-sm font-medium"
           style={{ color: positive ? 'var(--color-pos)' : 'var(--color-neg)' }}>
          {positive ? '↓' : '↑'} {Math.abs(deltaPct).toFixed(0)}% к прошлому месяцу
        </p>
      )}
    </section>
  );
}
