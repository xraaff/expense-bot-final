import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Overview } from './Overview';
import type { Expense } from '../lib/types';

const mk = (p: Partial<Expense>): Expense => ({
  id: 'x', date: '2026-03-03', amount: 100, currency: 'UAH', category: 'Продукты',
  description: '', payer: 'Vova', source: 'Общий', user_id: '1',
  created_at: '2026-03-03 10:00:00', ...p,
});

const ITEMS = [
  mk({ id: 'a', amount: 200, category: 'Продукты', payer: 'Vova' }),
  mk({ id: 'b', amount: 300, category: 'Кафе', payer: 'Karina' }),
  mk({ id: 'c', date: '2026-02-10', amount: 1000, category: 'Кафе', payer: 'Vova' }),
];

const props = {
  items: ITEMS, currency: 'UAH' as const, rates: {}, month: '2026-03',
  onPickExpense: vi.fn(),
};

describe('Overview', () => {
  it('показывает итог текущего месяца', () => {
    render(<Overview {...props} />);
    expect(screen.getByText('500 ₴')).toBeInTheDocument();
  });

  it('показывает дельту к прошлому месяцу', () => {
    render(<Overview {...props} />);
    expect(screen.getByTestId('delta')).toHaveTextContent('50');
  });

  it('перечисляет категории по убыванию', () => {
    render(<Overview {...props} />);
    const names = screen.getAllByTestId('cat-name').map((n) => n.textContent);
    expect(names).toEqual(['Кафе', 'Продукты']);
  });

  it('не показывает разбивку по плательщикам — персонализация убрана', () => {
    render(<Overview {...props} />);
    expect(screen.queryByTestId('payer-Vova')).not.toBeInTheDocument();
  });

  it('на пустом месяце показывает пустое состояние', () => {
    render(<Overview {...props} items={[]} />);
    expect(screen.getByText('Трат пока нет')).toBeInTheDocument();
  });
});

// Дополнительные тесты сверх брифа (5 тестов выше — дословная копия брифа).
// Причина: бриф проверяет дельту только через toHaveTextContent('50'), а эта
// проверка проходит независимо от направления (рост/снижение), поскольку
// Math.abs() убирает знак. Задание отдельно предупреждает, что направление
// цвета легко перепутать ("снижение — позитивный цвет, рост — негативный"),
// поэтому здесь дельта закрепляется явной проверкой цветового токена, чтобы
// инверсия знака в реализации ловилась тестом, а не только глазами.
describe('направление цвета дельты (доп. регрессия)', () => {
  it('при снижении трат к прошлому месяцу — положительный цвет (--color-pos)', () => {
    render(<Overview {...props} />); // март 500 vs февраль 1000 — снижение
    const delta = screen.getByTestId('delta');
    expect(delta.style.color).toBe('var(--color-pos)');
  });

  it('при росте трат к прошлому месяцу — отрицательный цвет (--color-neg)', () => {
    const items: Expense[] = [
      mk({ id: 'd', date: '2026-04-05', amount: 300, category: 'Продукты', payer: 'Vova' }),
      mk({ id: 'e', date: '2026-03-05', amount: 100, category: 'Продукты', payer: 'Vova' }),
    ];
    render(
      <Overview items={items} currency="UAH" rates={{}} month="2026-04" onPickExpense={vi.fn()} />
    );
    const delta = screen.getByTestId('delta');
    expect(delta.style.color).toBe('var(--color-neg)');
  });
});

// Дополнительный тест сверх брифа: граница года для расчёта предыдущего месяца.
// Задание отдельно требует проверить, что для января предыдущий месяц — декабрь
// прошлого года, а не "месяц 13" или откат в тот же год.
describe('граница года для предыдущего месяца (доп. регрессия)', () => {
  it('для января текущим важен декабрь ПРОШЛОГО года, а не тот же год', () => {
    const items: Expense[] = [
      // Текущий месяц: январь 2026, 100.
      mk({ id: 'jan', date: '2026-01-15', amount: 100, category: 'Продукты', payer: 'Vova' }),
      // "Ложный" декабрь ТОГО ЖЕ 2026 года — если бы граница года считалась
      // неверно (например, откатом внутри того же года), реализация могла бы
      // по ошибке подхватить эту запись как "предыдущий месяц".
      mk({ id: 'dec26', date: '2026-12-01', amount: 999, category: 'Продукты', payer: 'Vova' }),
      // Настоящий предыдущий месяц: декабрь 2025, 200.
      mk({ id: 'dec25', date: '2025-12-20', amount: 200, category: 'Продукты', payer: 'Vova' }),
    ];
    render(
      <Overview items={items} currency="UAH" rates={{}} month="2026-01" onPickExpense={vi.fn()} />
    );
    // База сравнения — 200 (декабрь 2025), а не 999 (декабрь 2026) и не null/NaN.
    // current=100, previous=200 => pctDelta = -50%.
    expect(screen.getByTestId('delta')).toHaveTextContent('50');
    expect(screen.getByTestId('delta').style.color).toBe('var(--color-pos)');
  });
});
