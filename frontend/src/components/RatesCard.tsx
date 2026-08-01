import { useCallback, useEffect, useState } from 'react';
import { Button } from 'react-aria-components';
import { ArrowsClockwise } from '@phosphor-icons/react';
import { PromptDialog } from './PromptDialog';
import { fetchRatesFull, setUsdPln } from '../lib/api';

const SOURCE_LABEL: Record<string, string> = {
  binance_p2p: 'Binance P2P · ПУМБ · от 800 ₴',
  pumb: 'ПУМБ через Минфин',
  derived_from_usd: 'выведен из доллара',
  fallback: 'запасное значение',
};

export function RatesCard() {
  const [data, setData] = useState<Awaited<ReturnType<typeof fetchRatesFull>>>(null);
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    setData(await fetchRatesFull());
    setBusy(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const q = data?.quotes;
  const src = data?.sources;

  return (
    <section className="surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="label-cap">Курсы валют</p>
        <Button aria-label="Обновить курсы" onPress={() => { void load(); }}
                className="flex items-center gap-1 text-xs font-medium"
                style={{ color: 'var(--color-ac)' }}>
          <ArrowsClockwise size={14} weight="bold" />
          {busy ? 'Обновляю' : 'Обновить'}
        </Button>
      </div>

      {!q ? (
        <p className="text-sm" style={{ color: 'var(--tx3)' }}>Курсы недоступны</p>
      ) : (
        <ul className="space-y-3">
          <li>
            <div className="flex items-baseline justify-between">
              <span className="text-sm">1 доллар</span>
              <span className="tnum text-sm font-semibold">{q.UAH_per_USD} ₴</span>
            </div>
            <p className="text-[11px]" style={{ color: 'var(--tx3)' }}>
              {SOURCE_LABEL[src?.USD ?? ''] ?? src?.USD}
            </p>
          </li>
          <li>
            <div className="flex items-baseline justify-between">
              <span className="text-sm">1 злотый</span>
              <span className="tnum text-sm font-semibold">{q.UAH_per_PLN} ₴</span>
            </div>
            <p className="text-[11px]" style={{ color: 'var(--tx3)' }}>
              {SOURCE_LABEL[src?.PLN ?? ''] ?? src?.PLN}
            </p>
          </li>
          <li className="flex items-center justify-between border-t pt-3"
              style={{ borderColor: 'var(--bd)' }}>
            <div>
              <div className="text-sm">1 доллар в злотых</div>
              <p className="text-[11px]" style={{ color: 'var(--tx3)' }}>задаётся вручную</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="tnum text-sm font-semibold">{q.USD_per_PLN} zł</span>
              <Button onPress={() => setAsking(true)}
                className="rounded-full border px-3 py-1.5 text-xs font-medium"
                style={{ borderColor: 'var(--bd)', color: 'var(--color-ac)' }}>
                Изменить
              </Button>
            </div>
          </li>
        </ul>
      )}

      <PromptDialog
        isOpen={asking}
        title="Курс стейблкоина к злотому"
        label="Сколько злотых за 1 доллар"
        defaultValue={q ? String(q.USD_per_PLN) : '3.840'}
        onClose={() => setAsking(false)}
        onSubmit={(v) => {
          const n = Number(v.replace(',', '.'));
          if (!Number.isFinite(n) || n <= 0) return;
          void setUsdPln(n).then(load);
        }}
      />
    </section>
  );
}
