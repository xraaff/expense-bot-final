import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './app';
import * as api from './lib/api';

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
  vi.spyOn(api, 'fetchStats').mockResolvedValue([]);
  vi.spyOn(api, 'fetchMeta').mockResolvedValue({ categories: [], sources: [] });
  vi.spyOn(api, 'fetchRates').mockResolvedValue({});
});

describe('App', () => {
  it('без сохранённой роли показывает экран входа', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: 'Войти' })).toBeInTheDocument();
  });

  it('с сохранённой ролью сразу показывает вкладки', async () => {
    localStorage.setItem('role', 'Vova');
    render(<App />);
    await waitFor(() =>
      expect(screen.getByRole('tab', { name: /Обзор/ })).toBeInTheDocument()
    );
  });

  it('корень приложения не скрыт нулевой прозрачностью', async () => {
    localStorage.setItem('role', 'Vova');
    const { container } = render(<App />);
    await waitFor(() => expect(screen.getByRole('tablist')).toBeInTheDocument());
    expect(container.firstElementChild?.className).not.toContain('opacity-0');
  });

  it('неверный ключ показывает сообщение об ошибке', async () => {
    vi.spyOn(api, 'authenticate').mockResolvedValue(null);
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByLabelText('Ключ доступа'), 'плохой');
    await user.click(screen.getByRole('button', { name: 'Войти' }));
    await waitFor(() => expect(screen.getByText('Неверный ключ')).toBeInTheDocument());
  });

  it('кнопка добавления траты доступна', async () => {
    localStorage.setItem('role', 'Vova');
    render(<App />);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Добавить трату' })).toBeInTheDocument()
    );
  });

  it('вторая открытая трата показывает свои поля, а не первой', async () => {
    const day = new Date().toISOString().slice(0, 10);
    const mk = (id: string, amount: number, description: string) => ({
      id, date: day, amount, currency: 'UAH' as const, category: 'Продукты',
      description, source: 'Общий', payer: '', user_id: '1', created_at: `${day} 10:00:00`,
    });
    vi.spyOn(api, 'fetchStats').mockResolvedValue([mk('a', 111, 'первая'), mk('b', 222, 'вторая')]);
    localStorage.setItem('role', 'Vova');
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole('tab', { name: /Операции/ }));
    const rows = await screen.findAllByTestId('tx');
    expect(rows).toHaveLength(2);

    await user.click(rows[0].firstElementChild as HTMLElement);
    expect((await screen.findByLabelText('Сумма')).getAttribute('value')).toBe('111');
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByLabelText('Сумма')).toBeNull());

    await user.click(screen.getAllByTestId('tx')[1].firstElementChild as HTMLElement);
    expect((await screen.findByLabelText('Сумма')).getAttribute('value')).toBe('222');
  });
});
