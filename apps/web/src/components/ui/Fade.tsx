import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '../../lib/cn';

/**
 * A single 180ms opacity fade on entry. If the observer never fires the content
 * is shown anyway, so nothing can be stranded at opacity 0.
 */
export function Fade({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const node = ref.current;
    const reveal = () => setShown(true);
    const timer = window.setTimeout(reveal, 1200);
    if (!node || typeof IntersectionObserver === 'undefined') {
      reveal();
      return () => window.clearTimeout(timer);
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          reveal();
          io.disconnect();
        }
      },
      { rootMargin: '-40px 0px' },
    );
    io.observe(node);
    return () => {
      window.clearTimeout(timer);
      io.disconnect();
    };
  }, []);

  return (
    <div ref={ref} data-shown={shown} className={cn('px-fade', className)}>
      {children}
    </div>
  );
}
