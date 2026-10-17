'use client';

import { useRef } from 'react';
import { gsap, MOTION_OK, useGSAP } from './gsap';

type Props = {
  children: React.ReactNode;
  className?: string;
  as?: 'div' | 'ol' | 'ul';
  /** Seconds between children. */
  stagger?: number;
  /** Rise distance in px. */
  y?: number;
};

/** Fades and lifts its direct children into place, one after another, the first time it scrolls into view. */
export function Reveal({ children, className, as = 'div', stagger = 0.08, y = 32 }: Props) {
  const ref = useRef<HTMLElement>(null);
  const Tag = as as React.ElementType;

  useGSAP(
    () => {
      const root = ref.current;
      if (!root) return;
      gsap.matchMedia().add(MOTION_OK, () => {
        gsap.from(root.children, {
          autoAlpha: 0,
          y,
          duration: 0.9,
          ease: 'power3.out',
          stagger,
          scrollTrigger: { trigger: root, start: 'top 85%', once: true },
        });
      });
    },
    { scope: ref },
  );

  return (
    <Tag ref={ref} className={className}>
      {children}
    </Tag>
  );
}
