import { useEffect, useRef, type FormEvent, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { errorMessage } from '../lib/errors';

/**
 * One square panel over the page. Escape closes it, the first field takes
 * focus, and the error sits above the buttons where the eye already is.
 */
export function Dialog({
  open,
  title,
  onClose,
  onSubmit,
  submitLabel = 'Save',
  busy,
  error,
  children,
  danger,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  onSubmit?: () => void;
  submitLabel?: string;
  busy?: boolean;
  error?: unknown;
  children: ReactNode;
  danger?: boolean;
}) {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const first = panel.current?.querySelector<HTMLElement>(
      'input, select, textarea, button[type="submit"]',
    );
    first?.focus();
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  function submit(e: FormEvent) {
    e.preventDefault();
    onSubmit?.();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panel}
        className="max-h-[92dvh] w-full max-w-[32rem] overflow-y-auto border border-line bg-bg"
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-[18px] font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid size-8 cursor-pointer place-items-center border border-line text-muted hover:border-ink hover:text-ink"
          >
            <X size={16} strokeWidth={1.75} aria-hidden />
          </button>
        </div>
        <form onSubmit={submit}>
          <div className="space-y-4 px-5 py-5">{children}</div>
          {error ? (
            <p className="border-t border-line bg-alt px-5 py-3 text-[14px] text-ink">
              {errorMessage(error)}
            </p>
          ) : null}
          <div className="flex flex-wrap justify-end gap-3 border-t border-line px-5 py-4">
            {/* A sheet with nothing to save is read, not cancelled. */}
            <Button type="button" variant="secondary" onClick={onClose}>
              {onSubmit ? 'Cancel' : 'Close'}
            </Button>
            {onSubmit ? (
              <Button
                type="submit"
                disabled={busy}
                className={danger ? 'border-[color:var(--px-danger)] bg-[color:var(--px-danger)]' : ''}
              >
                {busy ? 'Working' : submitLabel}
              </Button>
            ) : null}
          </div>
        </form>
      </div>
    </div>
  );
}
