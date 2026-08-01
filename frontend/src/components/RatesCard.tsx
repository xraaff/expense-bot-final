import { useCallback, useEffect, useState } from 'react';
import { Button } from 'react-aria-components';
import { ArrowsClockwise } from '@phosphor-icons/react';
import { PromptDialog } from './PromptDialog';
import { fetchRatesFull, setUsdPln, setUsdEur } from '../lib/api';

const SOURCE_LABEL: Record<string, string> = {
  binance_p2p: 'Binance P2P · ПУМБ · от 800 ₴',
  pumb: 'ПУМБ через Минфин · курс продажи',
  derived_from_usd: 'выведен из доллара',
  fallback: 'запасное значение',
};

type Ask = 'pln' | 'eur' | null;

export function RatesCard() {
  const [data, setData] = useState<Awaited<ReturnType<typeof fetchRatesFull>>>(null);
  const [ask, setAsk] = useState<Ask>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    setData(await fetchRatesFull());
    setBusy(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const q = data?.quotes;
  const src = data?.sources;

  function save(value: string, kind: Exclude<Ask, null>): void {
    const n = Number(value.replace(',', '.'));
    if (!Number.isFinite(n) || n <= 0) return;
    void (kind === 'pln' ? setUsdPln(n) : setUsdEur(n)).then(load);
  }

  return (
    <section className="surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="label-cap">Курсы валют к гривне</p>
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
              <span className="text-sm">1 usdt</span>
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

          <li>
            <div className="flex items-baseline justify-between">
              <span className="text-sm">1 евро</span>
              <span className="tnum text-sm font-semibold">{q.UAH_per_EUR} ₴</span>
            </div>
            <p className="text-[11px]" style={{ color: 'var(--tx3)' }}>выведен из доллара</p>
          </li>

          <li className="border-t pt-3" style={{ borderColor: 'var(--bd)' }}>
            <p className="label-cap">Курс стейблкоина к фиату</p>
          </li>
          <li className="flex items-center justify-between">
            <div>
              <div className="text-sm">1 usdt в злотых</div>
              <p className="text-[11px]" style={{ color: 'var(--tx3)' }}>задаётся вручную</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="tnum text-sm font-semibold">{q.USD_per_PLN} zł</span>
              <Button onPress={() => setAsk('pln')}
                className="rounded-full border px-3 py-1.5 text-xs font-medium"
                style={{ borderColor: 'var(--bd)', color: 'var(--color-ac)' }}>
                Изменить
              </Button>
            </div>
          </li>

          <li className="flex items-center justify-between">
            <div>
              <div className="text-sm">1 usdt в евро</div>
              <p className="text-[11px]" style={{ color: 'var(--tx3)' }}>задаётся вручную</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="tnum text-sm font-semibold">{q.USD_per_EUR} €</span>
              <Button onPress={() => setAsk('eur')}
                className="rounded-full border px-3 py-1.5 text-xs font-medium"
                style={{ borderColor: 'var(--bd)', color: 'var(--color-ac)' }}>
                Изменить
              </Button>
            </div>
          </li>
        </ul>
      )}

      <PromptDialog
        isOpen={ask !== null}
        title={ask === 'eur' ? 'Курс стейблкоина к евро' : 'Курс стейблкоина к злотому'}
        label={ask === 'eur' ? 'Сколько евро за 1 доллар' : 'Сколько злотых за 1 доллар'}
        defaultValue={
          ask === 'eur'
            ? String(q?.USD_per_EUR ?? '0.84')
            : String(q?.USD_per_PLN ?? '3.840')
        }
        onClose={() => setAsk(null)}
        onSubmit={(v) => { if (ask) save(v, ask); }}
      />
    </section>
  );
}
