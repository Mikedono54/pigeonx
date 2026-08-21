import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

export function Container({
  children,
  className,
  size = 'default',
}: {
  children: ReactNode;
  className?: string;
  size?: 'default' | 'narrow' | 'wide';
}) {
  const width =
    size === 'narrow' ? 'max-w-3xl' : size === 'wide' ? 'max-w-[88rem]' : 'max-w-6xl';
  return <div className={cn('mx-auto w-full px-5 sm:px-6 lg:px-8', width, className)}>{children}</div>;
}
