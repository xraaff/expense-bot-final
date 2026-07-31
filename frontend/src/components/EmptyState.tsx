import type { Icon } from '@phosphor-icons/react';

interface Props { icon: Icon; title: string; hint?: string }

export function EmptyState({ icon: IconCmp, title, hint }: Props) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      <IconCmp size={40} weight="duotone" color="var(--color-ac)" />
      <p className="font-medium">{title}</p>
      {hint && <p className="text-sm" style={{ color: 'var(--tx2)' }}>{hint}</p>}
    </div>
  );
}
