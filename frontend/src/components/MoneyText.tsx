import { formatMoney } from '../lib/money';
import type { Currency } from '../lib/types';

interface Props {
  value: number;
  currency: Currency;
  compact?: boolean;
  className?: string;
}

export function MoneyText({ value, currency, compact, className = '' }: Props) {
  return <span className={`tnum ${className}`}>{formatMoney(value, currency, { compact })}</span>;
}
