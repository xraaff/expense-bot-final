import { Button } from 'react-aria-components';
import { categoryIcon } from '../lib/icons';

interface Props { name: string; selected: boolean; onSelect: () => void }

export function CategoryTile({ name, selected, onSelect }: Props) {
  const IconCmp = categoryIcon(name);
  return (
    <Button
      aria-label={name}
      onPress={onSelect}
      className={`flex flex-col items-center gap-1.5 rounded-2xl border px-2 py-3
                 transition-colors duration-200 ${selected ? 'bg-[var(--color-ac)]/8' : ''}`}
      style={{
        borderColor: selected ? 'var(--color-ac)' : 'var(--bd)',
        background: selected ? undefined : 'var(--s1)',
      }}
    >
      <IconCmp size={24} weight="duotone" color="var(--color-ac)" />
      <span className="text-xs font-medium leading-tight" style={{ color: 'var(--tx)' }}>
        {name}
      </span>
    </Button>
  );
}
