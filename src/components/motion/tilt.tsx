'use client';

import { useRef } from 'react';
import { gsap, MOTION_OK, useGSAP } from './gsap';

type Props = { children: React.ReactNode; className?: string; /** Largest tilt in degrees. */ max?: number };

/** Tilts toward the pointer in 3D and settles back when it leaves. Mouse and trackpad only. */
export function Tilt({ children, className, max = 7 }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      gsap.matchMedia().add(`${MOTION_OK} and (hover: hover) and (pointer: fine)`, () => {
        gsap.set(el, { transformPerspective: 900 });
        const rotateX = gsap.quickTo(el, 'rotationX', { duration: 0.6, ease: 'power3' });
        const rotateY = gsap.quickTo(el, 'rotationY', { duration: 0.6, ease: 'power3' });
        const scale = gsap.quickTo(el, 'scale', { duration: 0.6, ease: 'power3' });
        const move = (e: PointerEvent) => {
          const r = el.getBoundingClientRect();
          rotateY(((e.clientX - r.left) / r.width - 0.5) * 2 * max);
          rotateX(-((e.clientY - r.top) / r.height - 0.5) * 2 * max);
          scale(1.02);
        };
        const leave = () => {
          rotateX(0);
          rotateY(0);
          scale(1);
        };
        el.addEventListener('pointermove', move);
        el.addEventListener('pointerleave', leave);
        return () => {
          el.removeEventListener('pointermove', move);
          el.removeEventListener('pointerleave', leave);
        };
      });
    },
    { scope: ref },
  );

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
