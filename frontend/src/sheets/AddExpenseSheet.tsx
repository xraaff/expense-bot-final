import { useState } from 'react';
import {
  Button, Dialog, Modal, ModalOverlay, TextField, Label, Input, TextArea,
  ToggleButton, ToggleButtonGroup,
  DatePicker, Group, DateInput, DateSegment, Popover, Calendar,
  CalendarGrid, CalendarCell, Heading,
} from 'react-aria-components';
import { CalendarDate, getLocalTimeZone, today as todayIn } from '@internationalized/date';
import { CategoryTile } from '../components/CategoryTile';
import { sourceIcon } from '../lib/icons';
import type { Currency, Expense, ExpenseInput } from '../lib/types';

const CURRENCIES: Currency[] = ['UAH', 'USD', 'PLN'];

interface Props {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  categories: string[];
  sources: string[];
  role: string;
  userId: string;
  initial?: Expense;
  onSubmit: (input: ExpenseInput) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

function parseISO(iso: string): CalendarDate {
  return new CalendarDate(
    Number(iso.slice(0, 4)),
    Number(iso.slice(5, 7)),
    Number(iso.slice(8, 10))
  );
}

export function AddExpenseSheet(props: Props) {
  const { isOpen, onOpenChange, categories, sources, role, userId, initial } = props;
  const [amount, setAmount] = useState(initial ? String(initial.amount) : '');
  const [currency, setCurrency] = useState<Currency>(initial?.currency ?? 'UAH');
  const [category, setCategory] = useState(initial?.category ?? '');
  const [source, setSource] = useState(initial?.source ?? sources[0] ?? 'Общий');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [payer, setPayer] = useState(initial?.payer ?? role);
  const [date, setDate] = useState<CalendarDate>(
    initial ? parseISO(initial.date) : todayIn(getLocalTimeZone())
  );
  const [busy, setBusy] = useState(false);

  const numeric = Number(amount.replace(',', '.'));
  const valid = Number.isFinite(numeric) && numeric > 0 && category !== '';

  async function submit(): Promise<void> {
    if (!valid || busy) return;
    setBusy(true);
    try {
      await props.onSubmit({
        id: initial?.id,
        date: date.toString(), amount: numeric, currency, category,
        description, payer, source, user_id: userId,
      });
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <ModalOverlay
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      isDismissable
      className="fixed inset-0 z-50 bg-black/40"
    >
      <Modal className="fixed inset-x-0 bottom-0 max-h-[92vh] overflow-y-auto rounded-t-3xl"
             style={{ background: 'var(--bg)' }}>
        <Dialog aria-label="Новая трата" className="outline-none">
          <div className="space-y-5 p-5 pb-8">
            <TextField value={amount} onChange={setAmount} className="space-y-2">
              <Label className="text-[10px] font-semibold uppercase tracking-[0.15em]"
                     style={{ color: 'var(--tx2)' }}>
                Сумма
              </Label>
              <Input
                inputMode="decimal"
                placeholder="0"
                className="tnum w-full rounded-2xl border px-4 py-3 text-3xl font-medium outline-none"
                style={{ borderColor: 'var(--bd)', background: 'var(--s1)', color: 'var(--tx)' }}
              />
            </TextField>

            <ToggleButtonGroup
              selectionMode="single"
              selectedKeys={[currency]}
              onSelectionChange={(k) => {
                const v = [...k][0] as Currency | undefined;
                if (v) setCurrency(v);
              }}
              className="flex gap-2"
            >
              {CURRENCIES.map((c) => (
                <ToggleButton key={c} id={c}
                  className="flex-1 rounded-xl border py-2 text-sm font-medium
                             selected:border-[var(--color-ac)] selected:text-[var(--color-ac)]"
                  style={{ borderColor: 'var(--bd)' }}>
                  {c}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>

            <DatePicker aria-label="Дата" value={date} onChange={(v) => v && setDate(v)}
                        className="space-y-2">
              <Label className="text-[10px] font-semibold uppercase tracking-[0.15em]"
                     style={{ color: 'var(--tx2)' }}>Дата</Label>
              <Group aria-label="Дата"
                     className="flex items-center justify-between rounded-2xl border px-4 py-3"
                     style={{ borderColor: 'var(--bd)', background: 'var(--s1)' }}>
                <DateInput className="tnum flex gap-0.5 text-sm">
                  {(segment) => (
                    <DateSegment segment={segment}
                                 className="px-0.5 outline-none focus:text-[var(--color-ac)]" />
                  )}
                </DateInput>
                <Button className="text-sm" style={{ color: 'var(--color-ac)' }}>Выбрать</Button>
              </Group>
              <Popover className="rounded-2xl border p-3 shadow-xl"
                       style={{ borderColor: 'var(--bd)', background: 'var(--s1)' }}>
                <Dialog>
                  <Calendar>
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
                  </Calendar>
                </Dialog>
              </Popover>
            </DatePicker>

            <section className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em]"
                 style={{ color: 'var(--tx2)' }}>Категория</p>
              <div className="grid grid-cols-4 gap-2">
                {categories.map((c) => (
                  <CategoryTile key={c} name={c} selected={category === c}
                                onSelect={() => setCategory(c)} />
                ))}
              </div>
            </section>

            <section className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em]"
                 style={{ color: 'var(--tx2)' }}>Источник денег</p>
              <div className="flex flex-wrap gap-2">
                {sources.map((s) => {
                  const IconCmp = sourceIcon(s);
                  const on = source === s;
                  return (
                    <Button key={s} aria-label={s} onPress={() => setSource(s)}
                      className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium"
                      style={{
                        borderColor: on ? 'var(--color-ac)' : 'var(--bd)',
                        color: on ? 'var(--color-ac)' : 'var(--tx)',
                      }}>
                      <IconCmp size={14} weight="duotone" />
                      {s}
                    </Button>
                  );
                })}
              </div>
            </section>

            <TextField value={description} onChange={setDescription} className="space-y-2">
              <Label className="text-[10px] font-semibold uppercase tracking-[0.15em]"
                     style={{ color: 'var(--tx2)' }}>Описание</Label>
              <TextArea rows={2} placeholder="На что потрачено"
                className="w-full rounded-2xl border px-4 py-3 text-sm outline-none"
                style={{ borderColor: 'var(--bd)', background: 'var(--s1)', color: 'var(--tx)' }} />
            </TextField>

            <ToggleButtonGroup
              selectionMode="single"
              selectedKeys={[payer]}
              onSelectionChange={(k) => {
                const v = [...k][0] as string | undefined;
                if (v) setPayer(v);
              }}
              className="flex gap-2"
            >
              {['Vova', 'Karina'].map((p) => (
                <ToggleButton key={p} id={p}
                  className="flex-1 rounded-xl border py-2 text-sm font-medium
                             selected:border-[var(--color-ac)] selected:text-[var(--color-ac)]"
                  style={{ borderColor: 'var(--bd)' }}>
                  {p}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>

            <Button isDisabled={!valid || busy} onPress={submit}
              className="w-full rounded-2xl py-4 text-base font-semibold text-black
                         disabled:opacity-40"
              style={{ background: 'var(--grad)' }}>
              Записать
            </Button>

            {initial && props.onDelete && (
              <Button aria-label="Удалить"
                onPress={() => { void props.onDelete!(initial.id); onOpenChange(false); }}
                className="w-full rounded-2xl border py-3 text-sm font-medium"
                style={{ borderColor: 'var(--bd)', color: 'var(--color-neg)' }}>
                Удалить
              </Button>
            )}
          </div>
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}
