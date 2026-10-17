'use client';

import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import { useEffect } from 'react';
import { gsap, ScrollTrigger } from './gsap';

/**
 * Lenis smooth scrolling for wheel and trackpad (touch keeps the native scroll), driven by GSAP's
 * ticker so ScrollTrigger and the scroll films read the same position. In-page links (#details,
 * #routine) glide too, clearing the 4rem header. Off for reduced motion.
 */
export function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const lenis = new Lenis({ autoRaf: false, lerp: 0.12, anchors: { offset: -64 } });
    lenis.on('scroll', ScrollTrigger.update);
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
    };
  }, []);
  return null;
}
