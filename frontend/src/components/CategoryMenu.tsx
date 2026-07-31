import { Button, Menu, MenuItem, MenuTrigger, Popover } from 'react-aria-components';
import { DotsThree } from '@phosphor-icons/react';

interface Props {
  name: string;
  onRename: (name: string) => void;
  onDelete: (name: string) => void;
}

export function CategoryMenu({ name, onRename, onDelete }: Props) {
  return (
    <MenuTrigger>
      <Button aria-label={`Действия с категорией ${name}`} className="p-1"
              style={{ color: 'var(--tx2)' }}>
        <DotsThree size={18} weight="bold" />
      </Button>
      <Popover className="rounded-xl border py-1 shadow-xl"
               style={{ borderColor: 'var(--bd)', background: 'var(--s1)' }}>
        <Menu className="min-w-40 outline-none">
          <MenuItem onAction={() => onRename(name)}
                    className="cursor-pointer px-4 py-2 text-sm outline-none focus:bg-[var(--s2)]">
            Переименовать
          </MenuItem>
          <MenuItem onAction={() => onDelete(name)}
                    className="cursor-pointer px-4 py-2 text-sm outline-none focus:bg-[var(--s2)]"
                    style={{ color: 'var(--color-neg)' }}>
            Удалить
          </MenuItem>
        </Menu>
      </Popover>
    </MenuTrigger>
  );
}
