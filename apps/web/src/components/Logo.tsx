import type { CSSProperties } from 'react';
import { cn } from '../lib/cn';

/**
 * Original PigeonX bird mark: a minimal bird in flight (a gull-like silhouette with
 * swept, lifted wings) inside a rounded-square gradient badge.
 */
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

export function LogoMark({ className, size = 36 }: { className?: string; size?: number }) {
  return (
    <span
      className={cn(
        'relative grid shrink-0 place-items-center rounded-[10px] px-gradient-bg',
        'shadow-[0_6px_20px_-8px_rgba(45,212,191,0.75)]',
        className,
      )}
      style={{ width: size, height: size }}
    >
      <BirdGlyph className="text-on-accent" style={{ width: size * 0.62, height: size * 0.62 }} />
    </span>
  );
}

export function Logo({
  className,
  size = 36,
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
          className="font-display text-[1.05rem] font-bold tracking-[-0.02em] text-fg"
          style={{ fontSize: size * 0.52 }}
        >
          Pigeon<span className="px-gradient-text">X</span>
        </span>
      ) : null}
    </span>
  );
}
