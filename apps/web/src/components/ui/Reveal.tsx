import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';

/**
 * Scroll reveal with a hard safety net: if the IntersectionObserver never fires
 * (background tab, prerender, observer unsupported) the content is shown anyway
 * after a short delay, so text can never be stranded at opacity 0.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  y = 18,
  as = 'div',
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  as?: 'div' | 'li' | 'section';
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setFallback(true), 1400);
    return () => window.clearTimeout(t);
  }, []);

  if (reduce) {
    const Tag = as;
    return <Tag className={className}>{children}</Tag>;
  }

  const MotionTag = motion[as] as typeof motion.div;
  const shown = inView || fallback;

  return (
    <MotionTag
      ref={ref as RefObject<HTMLDivElement>}
      className={className}
      initial={{ opacity: 0, y }}
      animate={shown ? { opacity: 1, y: 0 } : { opacity: 0, y }}
      transition={{ duration: 0.28, delay: shown ? delay : 0, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </MotionTag>
  );
}
