import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CategoryMenu } from './CategoryMenu';
import { Toast } from './Toast';

describe('CategoryMenu', () => {
  it('открывает пункты переименования и удаления', async () => {
    const user = userEvent.setup();
    render(<CategoryMenu name="Крипта" onRename={vi.fn()} onDelete={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Действия с категорией Крипта' }));
    expect(await screen.findByRole('menuitem', { name: 'Переименовать' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Удалить' })).toBeInTheDocument();
  });

  it('вызывает удаление с именем категории', async () => {
    const onDelete = vi.fn();
    const user = userEvent.setup();
    render(<CategoryMenu name="Крипта" onRename={vi.fn()} onDelete={onDelete} />);
    await user.click(screen.getByRole('button', { name: 'Действия с категорией Крипта' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Удалить' }));
    expect(onDelete).toHaveBeenCalledWith('Крипта');
  });
});

describe('Toast', () => {
  it('ничего не рендерит без сообщения', () => {
    const { container } = render(<Toast message={null} onDismiss={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('показывает сообщение и кнопку повтора', async () => {
    const onRetry = vi.fn();
    const user = userEvent.setup();
    render(<Toast message="Не удалось записать" onRetry={onRetry} onDismiss={vi.fn()} />);
    expect(screen.getByRole('status')).toHaveTextContent('Не удалось записать');
    await user.click(screen.getByRole('button', { name: 'Повторить' }));
    expect(onRetry).toHaveBeenCalled();
  });
});
