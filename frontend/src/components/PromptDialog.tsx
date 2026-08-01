import { useEffect, useState } from 'react';
import {
  Button, Dialog, Modal, ModalOverlay, TextField, Label, Input,
} from 'react-aria-components';

interface Props {
  isOpen: boolean;
  title: string;
  label?: string;
  defaultValue?: string;
  confirmText?: string;
  onSubmit: (value: string) => void;
  onClose: () => void;
}

/**
 * Замена window.prompt: Telegram WebView браузерные диалоги игнорирует,
 * поэтому ввод обязан жить внутри приложения.
 */
export function PromptDialog({
  isOpen, title, label = 'Название', defaultValue = '',
  confirmText = 'Сохранить', onSubmit, onClose,
}: Props) {
  const [value, setValue] = useState(defaultValue);

  useEffect(() => { if (isOpen) setValue(defaultValue); }, [isOpen, defaultValue]);

  function commit(): void {
    const v = value.trim();
    if (!v) return;
    onSubmit(v);
    onClose();
  }

  return (
    <ModalOverlay isOpen={isOpen} onOpenChange={(o) => { if (!o) onClose(); }}
                  isDismissable className="fixed inset-0 z-[60] bg-black/40 p-6 flex items-center">
      <Modal className="w-full rounded-3xl p-5 shadow-2xl" style={{ background: 'var(--s1)' }}>
        <Dialog aria-label={title} className="outline-none space-y-4">
          <p className="text-base font-semibold" style={{ color: 'var(--tx)' }}>{title}</p>
          <TextField value={value} onChange={setValue} autoFocus className="space-y-2">
            <Label className="label-cap">{label}</Label>
            <Input
              onKeyDown={(e) => { if (e.key === 'Enter') commit(); }}
              className="w-full rounded-2xl border px-4 py-3 text-base outline-none"
              style={{ borderColor: 'var(--bd)', background: 'var(--bg)', color: 'var(--tx)' }} />
          </TextField>
          <div className="flex gap-2">
            <Button onPress={onClose}
              className="flex-1 rounded-2xl border py-3 text-sm font-medium"
              style={{ borderColor: 'var(--bd)', color: 'var(--tx2)' }}>
              Отмена
            </Button>
            <Button onPress={commit} isDisabled={!value.trim()}
              className="flex-1 rounded-2xl py-3 text-sm font-semibold text-white disabled:opacity-40"
              style={{ background: 'var(--ink)' }}>
              {confirmText}
            </Button>
          </div>
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}
