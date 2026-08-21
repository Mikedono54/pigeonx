import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { Reveal } from './Reveal';

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'center',
  className,
  id,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  align?: 'center' | 'left';
  className?: string;
  id?: string;
}) {
  return (
    <Reveal
      className={cn(
        'flex flex-col gap-4',
        align === 'center' ? 'items-center text-center' : 'items-start text-left',
        className,
      )}
    >
      {eyebrow ? (
        <span className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-[0.18em] text-teal uppercase">
          <span aria-hidden className="h-px w-6 bg-gradient-to-r from-transparent to-teal" />
          {eyebrow}
        </span>
      ) : null}
      <h2
        id={id}
        className="max-w-2xl text-[clamp(1.75rem,4vw,2.6rem)] leading-[1.12] font-bold text-fg"
      >
        {title}
      </h2>
      {description ? (
        <p className="max-w-2xl text-[15px] leading-relaxed text-fg-muted sm:text-base">
          {description}
        </p>
      ) : null}
    </Reveal>
  );
}
