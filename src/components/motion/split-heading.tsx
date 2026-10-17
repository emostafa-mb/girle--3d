'use client';

import { useRef } from 'react';
import { gsap, MOTION_OK, SplitText, useGSAP } from './gsap';

type Props = { children: string; as?: 'h1' | 'h2' | 'h3'; id?: string; className?: string };

/**
 * A heading whose words rise and settle in turn when it scrolls into view. Splits by word only:
 * splitting Arabic into letters would break how they join. SplitText keeps the full text as the
 * heading's accessible name.
 */
export function SplitHeading({ children, as: Tag = 'h2', id, className }: Props) {
  const ref = useRef<HTMLHeadingElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      gsap.matchMedia().add(MOTION_OK, () => {
        const split = SplitText.create(el, {
          type: 'words',
          autoSplit: true,
          onSplit: (self) =>
            gsap.from(self.words, {
              autoAlpha: 0,
              yPercent: 70,
              rotate: 3,
              duration: 0.9,
              ease: 'power4.out',
              stagger: 0.07,
              scrollTrigger: { trigger: el, start: 'top 88%', once: true },
            }),
        });
        return () => split.revert();
      });
    },
    { scope: ref },
  );

  return (
    <Tag ref={ref} id={id} className={className}>
      {children}
    </Tag>
  );
}
