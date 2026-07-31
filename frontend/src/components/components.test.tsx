import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Tag } from '@phosphor-icons/react';
import { ErrorBoundary } from './ErrorBoundary';
import { MoneyText } from './MoneyText';
import { Skeleton } from './Skeleton';
import { EmptyState } from './EmptyState';

function Boom(): JSX.Element {
  throw new Error('сломалось');
}

describe('ErrorBoundary', () => {
  it('показывает текст ошибки вместо пустого экрана', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<ErrorBoundary><Boom /></ErrorBoundary>);
    expect(screen.getByRole('alert')).toHaveTextContent('сломалось');
    spy.mockRestore();
  });

  it('рендерит детей, когда ошибки нет', () => {
    render(<ErrorBoundary><span>ок</span></ErrorBoundary>);
    expect(screen.getByText('ок')).toBeInTheDocument();
  });
});

describe('MoneyText', () => {
  it('печатает сумму с символом валюты', () => {
    render(<MoneyText value={1234} currency="UAH" />);
    expect(screen.getByText('1 234 ₴')).toBeInTheDocument();
  });

  it('всегда несёт класс табулярных цифр', () => {
    render(<MoneyText value={1} currency="USD" />);
    expect(screen.getByText('1 $')).toHaveClass('tnum');
  });
});

describe('инвариант видимости', () => {
  it('Skeleton не скрыт нулевой прозрачностью', () => {
    const { container } = render(<Skeleton />);
    expect(container.firstElementChild?.className).not.toContain('opacity-0');
  });

  it('EmptyState не скрыт нулевой прозрачностью', () => {
    const { container } = render(<EmptyState icon={Tag} title="Пусто" />);
    expect(container.firstElementChild?.className).not.toContain('opacity-0');
  });
});
