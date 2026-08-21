import type { CSSProperties } from 'react';
import { cn } from '../lib/cn';

/** The PigeonX bird: a flat, single-colour glyph. No gradient, no glow. */
export function BirdGlyph({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" className={className} style={style}>
      <path
        fill="currentColor"
        fillRule="evenodd"
        transform="translate(0 2.4)"
        d="M1.3 19.6C5.6 10.8 11.2 7.6 15.2 12.9l.8 1.05.8-1.05c4-5.3 9.6-2.1 13.9 6.7.35.75-.5 1.5-1.15.95-4.3-3.6-8.3-4.1-11-1.4l-2.1 2.1c-.25.25-.65.25-.9 0l-2.1-2.1c-2.7-2.7-6.7-2.2-11 1.4-.65.55-1.5-.2-1.15-.95Z"
      />
    </svg>
  );
}

export function LogoMark({ className, size = 28 }: { className?: string; size?: number }) {
  return (
    <span
      className={cn('grid shrink-0 place-items-center bg-ink', className)}
      style={{ width: size, height: size }}
    >
      <BirdGlyph className="text-bg" style={{ width: size * 0.66, height: size * 0.66 }} />
    </span>
  );
}

export function Logo({
  className,
  size = 28,
  showWordmark = true,
}: {
  className?: string;
  size?: number;
  showWordmark?: boolean;
}) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark size={size} />
      {showWordmark ? (
        <span
          className="font-display font-bold tracking-[-0.03em] text-ink"
          style={{ fontSize: size * 0.66 }}
        >
          Pigeon<span className="text-accent">X</span>
        </span>
      ) : null}
    </span>
  );
}
