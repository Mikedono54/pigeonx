import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router';
import { cn } from '../../lib/cn';

type Variant = 'primary' | 'secondary';

const base =
  'inline-flex h-11 cursor-pointer items-center justify-center gap-2 border px-5 text-[15px] font-medium whitespace-nowrap transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50';

const variants: Record<Variant, string> = {
  primary: 'border-accent bg-accent text-on-accent hover:bg-ink hover:border-ink',
  secondary: 'border-ink bg-bg text-ink hover:bg-ink hover:text-bg',
};

type Common = { variant?: Variant; className?: string; children: ReactNode };

export function Button({
  variant = 'primary',
  className,
  children,
  ...rest
}: Common & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={cn(base, variants[variant], className)} {...rest}>
      {children}
    </button>
  );
}

export function ButtonLink({
  variant = 'primary',
  className,
  children,
  href,
  ...rest
}: Common & AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  const classes = cn(base, variants[variant], className);
  const internal = href.startsWith('/') && !href.startsWith('//');
  if (internal) {
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
