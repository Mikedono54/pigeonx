import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

type Tone = 'neutral' | 'accent' | 'teal' | 'warning' | 'success' | 'outline';

const tones: Record<Tone, string> = {
  neutral: 'bg-white/[0.06] text-fg-muted border-white/10',
  accent: 'bg-accent/12 text-accent border-accent/30',
  teal: 'bg-teal/12 text-teal border-teal/30',
  warning: 'bg-warning/12 text-warning border-warning/30',
  success: 'bg-success/12 text-success border-success/30',
  outline: 'bg-transparent text-fg-muted border-border-line',
};

export function Badge({
  children,
  tone = 'neutral',
  className,
  icon,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
  icon?: ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-wide uppercase',
        tones[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}

export function Pill({
  children,
  className,
  icon,
}: {
  children: ReactNode;
  className?: string;
  icon?: ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-xs font-medium text-fg-muted backdrop-blur',
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}
