import { Button } from 'react-aria-components';

interface Props {
  message: string | null;
  onRetry?: () => void;
  onDismiss: () => void;
}

export function Toast({ message, onRetry, onDismiss }: Props) {
  if (!message) return null;
  return (
    <div role="status" aria-live="polite"
         className="fixed inset-x-4 bottom-24 z-50 flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm shadow-lg"
         style={{ borderColor: 'var(--bd)', background: 'var(--s1)', color: 'var(--tx)' }}>
      <span className="flex-1">{message}</span>
      {onRetry && (
        <Button onPress={onRetry} className="font-medium" style={{ color: 'var(--color-ac)' }}>
          Повторить
        </Button>
      )}
      <Button aria-label="Закрыть" onPress={onDismiss} style={{ color: 'var(--tx2)' }}>×</Button>
    </div>
  );
}
