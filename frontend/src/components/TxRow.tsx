import { Button } from 'react-aria-components';
import { MoneyText } from './MoneyText';
import { categoryIcon } from '../lib/icons';
import type { Currency, Expense, Rates } from '../lib/types';
import { convert } from '../lib/money';

interface Props {
  expense: Expense;
  currency: Currency;
  rates: Rates;
  onPress: () => void;
}

export function TxRow({ expense, currency, rates, onPress }: Props) {
  const IconCmp = categoryIcon(expense.category);
  const value = convert(expense.amount, expense.currency, currency, rates);
  return (
    <Button onPress={onPress}
      className="flex w-full items-center gap-3 px-5 py-3 text-left transition-colors duration-200">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
            style={{ background: 'var(--s2)' }}>
        <IconCmp size={18} weight="duotone" color="var(--color-ac)" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{expense.category}</span>
        <span className="block truncate text-xs" style={{ color: 'var(--tx2)' }}>
          {expense.description || expense.source}
        </span>
      </span>
      <MoneyText value={value} currency={currency} className="text-sm font-medium" />
    </Button>
  );
}
