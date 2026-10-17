'use client';

import { useRef } from 'react';
import { cn } from '@/lib/utils';
import { gsap, MOTION_OK, ScrollTrigger, useGSAP } from './gsap';

type Row = { items: React.ReactNode[]; className?: string; /** Drift the other way. */ reverse?: boolean };

/** Copies of a row per track; the track loops over half its width, so two halves must cover the widest screen. */
const COPIES = 4;

/**
 * Rows of words that drift sideways forever, run faster while the page scrolls and turn round with
 * the scroll direction. Decorative: hidden from assistive tech, and still for reduced motion.
 */
export function VelocityMarquee({ rows, className, speed = 2.2 }: { rows: Row[]; className?: string; speed?: number }) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const root = ref.current;
      if (!root) return;
      gsap.matchMedia().add(MOTION_OK, () => {
        const tracks = gsap.utils.toArray<HTMLElement>('[data-track]', root);
        const setters = tracks.map((t) => gsap.quickSetter(t, 'xPercent'));
        const wrap = gsap.utils.wrap(-50, 0);
        let offset = 0;
        let direction = 1;
        let boost = 1;
        let active = false;
        const trigger = ScrollTrigger.create({
          trigger: root,
          start: 'top bottom',
          end: 'bottom top',
          onToggle: (self) => (active = self.isActive),
          onUpdate: (self) => {
            direction = self.direction;
            boost = Math.max(boost, 1 + Math.min(Math.abs(self.getVelocity()) / 250, 7));
          },
        });
        const tick = (_time: number, deltaMs: number) => {
          if (!active) return;
          boost += (1 - boost) * 0.06;
          offset += (speed * direction * boost * deltaMs) / 1000;
          setters.forEach((set, i) => set(wrap(tracks[i].dataset.reverse ? offset : -offset)));
        };
        gsap.ticker.add(tick);
        return () => {
          gsap.ticker.remove(tick);
          trigger.kill();
        };
      });
    },
    { scope: ref },
  );

  return (
    // The loop is laid out left to right in either language; each word keeps its own direction.
    <div ref={ref} aria-hidden dir="ltr" className={cn('overflow-hidden', className)}>
      {rows.map((row, r) => (
        <div
          key={r}
          data-track
          data-reverse={row.reverse ? '' : undefined}
          className="flex w-max will-change-transform"
        >
          {Array.from({ length: COPIES }, (_, c) => (
            <div key={c} className={cn('flex shrink-0 items-center', row.className)}>
              {row.items.map((item, i) => (
                <span key={i} dir="auto" className="flex shrink-0 items-center">
                  {item}
                </span>
              ))}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
