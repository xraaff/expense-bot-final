export type Currency = 'UAH' | 'USD' | 'PLN' | 'EUR';
export type Rates = Record<string, number>;

export interface Expense {
  id: string;
  date: string;
  amount: number;
  currency: Currency;
  category: string;
  description: string;
  payer: string;
  source: string;
  user_id: string;
  created_at: string;
}

export interface ExpenseInput {
  id?: string;
  date: string;
  amount: number;
  currency: Currency;
  category: string;
  description: string;
  payer: string;
  source: string;
  user_id: string;
}

export interface CategoryMeta {
  n: string;
  i?: string;
}
