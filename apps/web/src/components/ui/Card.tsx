import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

export function Card({
  children,
  className,
  interactive = false,
  glow = false,
  as: Tag = 'div',
}: {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
  glow?: boolean;
  as?: 'div' | 'li' | 'article' | 'section';
}) {
  return (
    <Tag
      className={cn(
        'relative rounded-[var(--radius-lg)] border border-border-line bg-card p-6',
        'shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset,0_18px_40px_-24px_rgba(0,0,0,0.9)]',
        interactive &&
          'transition-[border-color,background-color,box-shadow] duration-200 ease-[var(--ease-out-expo)] hover:border-teal/35 hover:bg-elevated hover:shadow-[0_1px_0_0_rgba(255,255,255,0.06)_inset,0_24px_50px_-30px_rgba(45,212,191,0.3)]',
        glow && 'px-hairline',
        className,
      )}
    >
      {children}
    </Tag>
  );
}
