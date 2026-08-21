import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { Container } from './Container';
import { Fade } from './Fade';

export function Section({
  id,
  num,
  label,
  title,
  intro,
  children,
  alt = false,
  className,
}: {
  id?: string;
  num?: string;
  label?: string;
  title?: ReactNode;
  intro?: ReactNode;
  children: ReactNode;
  alt?: boolean;
  className?: string;
}) {
  const hasHeader = Boolean(label || title);
  return (
    <section id={id} className={cn('border-b border-line', alt && 'bg-alt', className)}>
      <Container className="py-10 sm:py-14 lg:py-20">
        <Fade>
          {hasHeader ? (
            <div className="grid gap-4 border-b border-line pb-6 md:grid-cols-12 md:gap-8">
              <div className="md:col-span-3">
                <p className="px-label text-muted">
                  {num ? <span className="text-accent">{num}</span> : null}
                  {num && label ? ' / ' : null}
                  {label}
                </p>
              </div>
              <div className="md:col-span-9">
                {title ? (
                  <h2 className="max-w-[24ch] text-[clamp(1.6rem,3vw,2.25rem)] leading-[1.1] font-semibold">
                    {title}
                  </h2>
                ) : null}
                {intro ? (
                  <p className="mt-3 max-w-[62ch] text-[16px] text-muted">{intro}</p>
                ) : null}
              </div>
            </div>
          ) : null}
          <div className={cn(hasHeader && 'pt-8 lg:pt-10')}>{children}</div>
        </Fade>
      </Container>
    </section>
  );
}

export function Tag({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn('px-label border border-line px-2 py-1 text-muted', className)}>
      {children}
    </span>
  );
}
