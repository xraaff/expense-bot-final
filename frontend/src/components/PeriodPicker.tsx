import {
  Button, DialogTrigger, Popover, Dialog,
  RangeCalendar, CalendarGrid, CalendarGridHeader, CalendarHeaderCell,
  CalendarGridBody, CalendarCell, Heading,
} from 'react-aria-components';
import { CalendarBlank } from '@phosphor-icons/react';
import { getLocalTimeZone, today as todayIn, type CalendarDate } from '@internationalized/date';

export interface Period { start: CalendarDate; end: CalendarDate }

interface Props {
  value: Period;
  onChange: (p: Period) => void;
}

function ru(d: CalendarDate): string {
  return d.toDate(getLocalTimeZone())
    .toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

/** Быстрые пресеты — на телефоне ими пользуются чаще, чем календарём. */
function presets(): { label: string; make: () => Period }[] {
  const t = todayIn(getLocalTimeZone());
  return [
    { label: 'Этот месяц', make: () => ({ start: t.set({ day: 1 }), end: t }) },
    {
      label: 'Прошлый месяц',
      make: () => {
        const p = t.set({ day: 1 }).subtract({ months: 1 });
        return { start: p, end: p.set({ day: p.calendar.getDaysInMonth(p) }) };
      },
    },
    { label: '3 месяца', make: () => ({ start: t.subtract({ months: 3 }), end: t }) },
    { label: 'Год', make: () => ({ start: t.set({ month: 1, day: 1 }), end: t }) },
  ];
}

export function PeriodPicker({ value, onChange }: Props) {
  return (
    <div className="space-y-2">
      <p className="label-cap">Период</p>

      <div className="flex flex-wrap gap-1.5">
        {presets().map((p) => {
          const r = p.make();
          const on = value.start.compare(r.start) === 0 && value.end.compare(r.end) === 0;
          return (
            <Button key={p.label} onPress={() => onChange(r)}
              className="rounded-full border px-3 py-1.5 text-xs font-medium"
              style={{
                borderColor: on ? 'var(--color-ac)' : 'var(--bd)',
                background: on ? 'var(--color-ac)' : 'var(--s1)',
                color: on ? '#0B3B2A' : 'var(--tx2)',
              }}>
              {p.label}
            </Button>
          );
        })}

        <DialogTrigger>
          <Button aria-label="Выбрать период в календаре"
            className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium"
            style={{ borderColor: 'var(--bd)', background: 'var(--s1)', color: 'var(--tx)' }}>
            <CalendarBlank size={14} weight="duotone" />
            {ru(value.start)} — {ru(value.end)}
          </Button>
          <Popover className="rounded-2xl border p-3 shadow-2xl"
                   style={{ borderColor: 'var(--bd)', background: 'var(--s1)' }}>
            <Dialog className="outline-none">
              <RangeCalendar aria-label="Период" value={value}
                             onChange={(v) => onChange(v as Period)}>
                <header className="mb-3 flex items-center justify-between gap-4">
                  <Button slot="previous" aria-label="Предыдущий месяц"
                    className="flex h-9 w-9 items-center justify-center rounded-xl border text-base"
                    style={{ borderColor: 'var(--bd)', color: 'var(--tx)' }}>‹</Button>
                  <Heading className="text-sm font-semibold capitalize" />
                  <Button slot="next" aria-label="Следующий месяц"
                    className="flex h-9 w-9 items-center justify-center rounded-xl border text-base"
                    style={{ borderColor: 'var(--bd)', color: 'var(--tx)' }}>›</Button>
                </header>
                <CalendarGrid weekdayStyle="short" className="w-full border-separate border-spacing-y-1">
                  <CalendarGridHeader>
                    {(day) => (
                      <CalendarHeaderCell className="pb-1 text-[10px] font-semibold uppercase"
                                          style={{ color: 'var(--tx3)' }}>
                        {day}
                      </CalendarHeaderCell>
                    )}
                  </CalendarGridHeader>
                  <CalendarGridBody>
                    {(d) => (
                      <CalendarCell date={d}
                        /* outside-month гасим — иначе непонятно, где чужой месяц */
                        className="flex h-10 w-10 items-center justify-center rounded-xl text-sm
                                   outside-month:opacity-25
                                   hover:bg-[var(--s2)]
                                   selected:bg-[var(--color-ac)]/25
                                   selection-start:bg-[var(--color-ac)] selection-start:text-black
                                   selection-end:bg-[var(--color-ac)] selection-end:text-black" />
                    )}
                  </CalendarGridBody>
                </CalendarGrid>
              </RangeCalendar>
            </Dialog>
          </Popover>
        </DialogTrigger>
      </div>
    </div>
  );
}
