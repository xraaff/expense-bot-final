import { Button, DialogTrigger, Popover, Dialog } from 'react-aria-components';
import { CaretDown } from '@phosphor-icons/react';

const MONTHS = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];

interface Props {
  /** Месяц в формате ГГГГ-ММ */
  value: string;
  onChange: (month: string) => void;
}

export function MonthPicker({ value, onChange }: Props) {
  const [y, m] = value.split('-').map(Number);
  const years = [y - 2, y - 1, y, y + 1];

  return (
    <DialogTrigger>
      <Button aria-label="Выбрать месяц"
        className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold"
        style={{ borderColor: 'var(--bd)', background: 'var(--s1)', color: 'var(--tx)' }}>
        {MONTHS[m - 1]} {y}
        <CaretDown size={12} weight="bold" />
      </Button>
      <Popover className="rounded-2xl border p-3 shadow-2xl"
               style={{ borderColor: 'var(--bd)', background: 'var(--s1)' }}>
        <Dialog className="outline-none space-y-3">
          {({ close }) => (
            <>
              <div className="flex gap-1.5">
                {years.map((yy) => (
                  <Button key={yy} onPress={() => onChange(`${yy}-${String(m).padStart(2, '0')}`)}
                    className="flex-1 rounded-lg border py-1.5 text-xs font-semibold"
                    style={{
                      borderColor: yy === y ? 'var(--color-ac)' : 'var(--bd)',
                      color: yy === y ? 'var(--color-ac)' : 'var(--tx2)',
                    }}>
                    {yy}
                  </Button>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {MONTHS.map((name, i) => {
                  const on = i + 1 === m;
                  return (
                    <Button key={name}
                      onPress={() => { onChange(`${y}-${String(i + 1).padStart(2, '0')}`); close(); }}
                      className="rounded-lg border px-2 py-2 text-xs font-medium"
                      style={{
                        borderColor: on ? 'var(--color-ac)' : 'var(--bd)',
                        background: on ? 'var(--color-ac)' : 'transparent',
                        color: on ? '#0B3B2A' : 'var(--tx)',
                      }}>
                      {name.slice(0, 3)}
                    </Button>
                  );
                })}
              </div>
            </>
          )}
        </Dialog>
      </Popover>
    </DialogTrigger>
  );
}
