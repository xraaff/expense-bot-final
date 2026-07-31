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
});
