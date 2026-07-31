import { MoneyText } from './MoneyText';
import type { Currency } from '../lib/types';

interface Props { totals: Record<string, number>; currency: Currency }

export function PayerSplit({ totals, currency }: Props) {
  const names = Object.keys(totals);
  const sum = names.reduce((a, n) => a + totals[n], 0);
  if (sum === 0) return null;
  return (
    <section className="mx-5 mb-4 rounded-2xl border p-4"
             style={{ borderColor: 'var(--bd)', background: 'var(--s1)' }}>
      <div className="mb-3 flex h-2 overflow-hidden rounded-full" style={{ background: 'var(--s2)' }}>
        {names.map((n, i) => (
          <div key={n} style={{
            width: `${(totals[n] / sum) * 100}%`,
            background: i === 0 ? 'var(--color-ac)' : 'var(--color-pos)',
          }} />
        ))}
      </div>
      <div className="flex justify-between">
        {names.map((n) => (
          <p key={n} data-testid={`payer-${n}`} className="text-sm">
            <span style={{ color: 'var(--tx2)' }}>{n} </span>
            <MoneyText value={totals[n]} currency={currency} className="font-medium" />
          </p>
        ))}
      </div>
    </section>
  );
}
