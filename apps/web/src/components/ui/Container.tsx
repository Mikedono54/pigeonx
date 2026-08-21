import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

export function Container({
  children,
  className,
  size = 'default',
}: {
  children: ReactNode;
  className?: string;
  size?: 'default' | 'narrow';
}) {
  return (
    <div
      className={cn(
        'mx-auto w-full px-5 sm:px-8 lg:px-12',
        size === 'narrow' ? 'max-w-[52rem]' : 'max-w-[76rem]',
        className,
      )}
    >
      {children}
    </div>
  );
}
