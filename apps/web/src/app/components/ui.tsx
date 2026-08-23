import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';
import { AlertCircle, RotateCw } from 'lucide-react';
import { cn } from '../../lib/cn';
import { errorMessage } from '../lib/errors';

/* ── page furniture ────────────────────────────────────────────────────── */

export function PageHead({
  title,
  intro,
  action,
}: {
  title: string;
  intro?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 border-b border-line pb-5 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-[clamp(1.5rem,3vw,2rem)] leading-[1.1] font-semibold">{title}</h1>
        {intro ? <p className="mt-2 max-w-[60ch] text-[15px] text-muted">{intro}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function Card({
  children,
  className,
  as: As = 'div',
}: {
  children: ReactNode;
  className?: string;
  as?: 'div' | 'section' | 'li';
}) {
  return <As className={cn('border border-line bg-bg p-5', className)}>{children}</As>;
}

export function Label({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn('px-label text-muted', className)}>{children}</p>;
}

export function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="border border-line p-5">
      <Label>{label}</Label>
      <p className="px-num mt-3 text-[clamp(1.375rem,2.2vw,1.75rem)] leading-tight text-ink">
        {value}
      </p>
      {note ? <p className="mt-2 text-[14px] text-muted">{note}</p> : null}
    </div>
  );
}

/* ── status ────────────────────────────────────────────────────────────── */

export function Pill({
  children,
  tone = 'quiet',
}: {
  children: ReactNode;
  tone?: 'quiet' | 'live' | 'warn' | 'off';
}) {
  const tones = {
    quiet: 'border-line text-muted',
    live: 'border-accent text-accent',
    warn: 'border-line text-[color:var(--px-warning)]',
    off: 'border-line text-muted',
  };
  return (
    <span
      className={cn(
        'px-label inline-flex items-center gap-1.5 border px-2 py-1 whitespace-nowrap',
        tones[tone],
      )}
    >
      {tone === 'live' ? (
        <span className="inline-block size-1.5 shrink-0 bg-accent" aria-hidden />
      ) : null}
      {children}
    </span>
  );
}

/* ── loading, empty, error ─────────────────────────────────────────────── */

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse bg-alt', className)} aria-hidden />;
}

export function SkeletonRows({ rows = 3, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn('space-y-3', className)} role="status" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full" />
      ))}
    </div>
  );
}

export function SkeletonCards({ count = 3 }: { count?: number }) {
  return (
    <div
      className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
      role="status"
      aria-label="Loading"
    >
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-40 w-full" />
      ))}
    </div>
  );
}

export function ErrorNote({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-3 border border-line bg-alt p-4">
      <AlertCircle size={18} strokeWidth={1.75} className="shrink-0 text-ink" aria-hidden />
      <p className="flex-1 text-[15px] text-ink">{errorMessage(error)}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex h-9 cursor-pointer items-center gap-2 border border-ink px-3 text-[14px] font-medium text-ink hover:bg-ink hover:text-bg"
        >
          <RotateCw size={14} strokeWidth={1.75} aria-hidden />
          Try again
        </button>
      ) : null}
    </div>
  );
}

export function Empty({
  title,
  action,
}: {
  /** One sentence that names the next thing to do. */
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="border border-line p-8 text-center">
      <p className="mx-auto max-w-[46ch] text-[16px] text-muted">{title}</p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}

/* ── form parts ────────────────────────────────────────────────────────── */

const control =
  'h-11 w-full border border-line bg-bg px-3 text-[15px] text-ink placeholder:text-muted focus:border-accent focus:outline-none';

export function Field({
  label,
  hint,
  children,
  htmlFor,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  htmlFor?: string;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="px-label block text-muted">
        {label}
      </label>
      <div className="mt-2">{children}</div>
      {hint ? <p className="mt-1.5 text-[13px] text-muted">{hint}</p> : null}
    </div>
  );
}

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(control, className)} {...rest} />;
}

export function Select({
  className,
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(control, 'cursor-pointer pr-8', className)} {...rest}>
      {children}
    </select>
  );
}

/* ── tables ────────────────────────────────────────────────────────────── */

export function TableWrap({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto border border-line">
      <table className="w-full min-w-[42rem] border-collapse text-left">{children}</table>
    </div>
  );
}

export function Th({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <th
      scope="col"
      className={cn('px-label border-b border-line px-4 py-3 text-muted', className)}
    >
      {children}
    </th>
  );
}

export function Td({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <td className={cn('border-b border-line px-4 py-3 align-middle text-[15px]', className)}>
      {children}
    </td>
  );
}

/* ── small buttons ─────────────────────────────────────────────────────── */

export function GhostButton({
  children,
  onClick,
  danger,
  type = 'button',
  disabled,
  className,
}: {
  children: ReactNode;
  onClick?: () => void;
  danger?: boolean;
  type?: 'button' | 'submit';
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex h-9 cursor-pointer items-center gap-2 border px-3 text-[14px] font-medium whitespace-nowrap transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50',
        danger
          ? 'border-line text-[color:var(--px-danger)] hover:border-[color:var(--px-danger)]'
          : 'border-line text-ink hover:border-ink',
        className,
      )}
    >
      {children}
    </button>
  );
}
