import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router';
import { cn } from '../../lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

const base =
  'group relative inline-flex cursor-pointer items-center justify-center gap-2 rounded-[var(--radius-md)] font-semibold whitespace-nowrap transition-[transform,box-shadow,background-color,border-color,color] duration-200 ease-[var(--ease-out-expo)] disabled:cursor-not-allowed disabled:opacity-50';

const variants: Record<Variant, string> = {
  primary:
    'px-gradient-bg text-on-accent shadow-[0_10px_30px_-12px_rgba(45,212,191,0.75)] hover:shadow-[0_16px_40px_-12px_rgba(45,212,191,0.9)] hover:brightness-[1.06] active:translate-y-px',
  secondary:
    'border border-border-line bg-white/[0.03] text-fg hover:border-teal/45 hover:bg-white/[0.07] active:translate-y-px',
  ghost: 'text-fg-muted hover:bg-white/[0.06] hover:text-fg',
};

const sizes: Record<Size, string> = {
  sm: 'h-10 px-4 text-[13px]',
  md: 'h-11 px-5 text-sm',
  lg: 'h-13 px-6 text-[15px]',
};

type CommonProps = {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
};

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...rest
}: CommonProps & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={cn(base, variants[variant], sizes[size], className)} {...rest}>
      {children}
    </button>
  );
}

export function ButtonLink({
  variant = 'primary',
  size = 'md',
  className,
  children,
  href,
  ...rest
}: CommonProps & AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  const classes = cn(base, variants[variant], sizes[size], className);
  const isInternal = href.startsWith('/') && !href.startsWith('//');
  if (isInternal) {
    return (
      <Link to={href} className={classes}>
        {children}
      </Link>
    );
  }
  return (
    <a href={href} className={classes} {...rest}>
      {children}
    </a>
  );
}
