'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

export type FilmCaption = { from: number; to: number; title: string; body: string; marker?: string };

type Props = {
  basePath: string;
  count: number;
  /** Last frame; shown before the canvas is ready and to people who prefer reduced motion. */
  poster: string;
  intro: { title: string; hint: string; as?: 'h1' | 'h2' };
  captions: FilmCaption[];
  reveal: { at: number; title: string; meta?: string; body?: string; action: React.ReactNode };
  labels: { steps: string };
  /** On portrait screens, how many times the screen width the frame is drawn at. */
  portraitZoom?: number;
  /** Where (0–1 across the frame) the portrait view is centred by the end of the film; 0.5 is the middle. */
  portraitFocusEnd?: number;
  className?: string;
};

const ramp = (a: number, b: number, x: number) => Math.min(1, Math.max(0, (x - a) / (b - a)));

/**
 * A film scrubbed by scroll: rendered frames drawn on a canvas inside a sticky stage, with
 * captions that switch on per stage and a closing reveal. Reduced motion gets the last frame
 * and every caption as a list.
 */
export function ScrollFilm({ basePath, count, poster, intro, captions, reveal, labels, portraitZoom = 1.75, portraitFocusEnd = 0.5, className }: Props) {
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [p, setP] = useState(0);
  const [still, setStill] = useState(false);
  const Heading = intro.as ?? 'h1';

  useEffect(() => {
    const section = sectionRef.current;
    const canvas = canvasRef.current;
    if (!section || !canvas) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time switch to the static layout
      setStill(true);
      return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const frames: (HTMLImageElement & { ready?: boolean })[] = new Array(count);
    let shown = -1;
    let smooth = 0;
    let raf = 0;
    let running = false;

    const src = (i: number) => `${basePath}/f${String(i + 1).padStart(3, '0')}.webp`;
    const load = (i: number) => {
      if (frames[i]) return;
      const im = new Image() as HTMLImageElement & { ready?: boolean };
      im.decoding = 'async';
      im.onload = () => {
        im.ready = true;
        if (Math.abs(i - Math.round(smooth * (count - 1))) < 4) shown = -1;
      };
      im.src = src(i);
      frames[i] = im;
    };
    const preload = () => {
      // a coarse pass first so scrubbing never lands on a blank, then fill the gaps
      for (const step of [12, 4, 1]) for (let i = 0; i < count; i += step) load(i);
    };
    const nearest = (i: number) => {
      for (let d = 0; d < count; d++) {
        if (frames[i - d]?.ready) return frames[i - d];
        if (frames[i + d]?.ready) return frames[i + d];
      }
      return null;
    };
    const tiny = Object.assign(document.createElement('canvas'), { width: 32, height: 18 });
    const tctx = tiny.getContext('2d');
    const size = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(canvas.clientWidth * dpr);
      canvas.height = Math.round(canvas.clientHeight * dpr);
      shown = -1;
    };
    const draw = (i: number) => {
      const im = nearest(i);
      if (!im) return;
      const cw = canvas.width, ch = canvas.height, iw = im.naturalWidth, ih = im.naturalHeight;
      const cover = Math.max(cw / iw, ch / ih);
      if (cw / ch >= 0.9 || !tctx) {
        ctx.drawImage(im, (cw - iw * cover) / 2, (ch - ih * cover) / 2, iw * cover, ih * cover);
        return;
      }
      // portrait: show more of the frame; the studio colour at its top and bottom edge fills the rest
      tctx.drawImage(im, 0, 0, tiny.width, tiny.height);
      const edge = (row: number) => {
        const [r, g, b] = tctx.getImageData(tiny.width / 2, row, 1, 1).data;
        return [r, g, b] as const;
      };
      const top = edge(0), bottom = edge(tiny.height - 1);
      ctx.fillStyle = `rgb(${top.join(',')})`;
      ctx.fillRect(0, 0, cw, ch / 2);
      ctx.fillStyle = `rgb(${bottom.join(',')})`;
      ctx.fillRect(0, ch / 2, cw, ch / 2);
      ctx.imageSmoothingQuality = 'high';
      const s = Math.min(cover, (cw * portraitZoom) / iw);
      const w = iw * s, h = ih * s, y = ch * 0.44 - h / 2;
      const focus = 0.5 + (portraitFocusEnd - 0.5) * ramp(0.7, 0.95, smooth);
      const x = Math.min(0, Math.max(cw - w, cw / 2 - focus * w));
      ctx.drawImage(im, x, y, w, h);
      const fade = 56 * (cw / 390);
      for (const [y0, y1, [r, g, b]] of [[y, y + fade, top], [y + h, y + h - fade, bottom]] as const) {
        const grad = ctx.createLinearGradient(0, y0, 0, y1);
        grad.addColorStop(0, `rgba(${r},${g},${b},1)`);
        grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
        ctx.fillStyle = grad;
        ctx.fillRect(0, Math.min(y0, y1), cw, Math.abs(y1 - y0));
      }
    };
    const progress = () => {
      const r = section.getBoundingClientRect();
      const stage = canvas.clientHeight || window.innerHeight;
      return Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - stage)));
    };
    let last = 0;
    const tick = (now: number) => {
      const target = progress();
      // time-based easing (~90 ms) so a throttled or slow frame rate still catches up
      const dt = last ? Math.min(now - last, 1000) : 16;
      last = now;
      smooth += (target - smooth) * (1 - Math.exp(-dt / 90));
      if (Math.abs(target - smooth) < 0.0005) smooth = target;
      const idx = Math.round(smooth * (count - 1));
      if (idx !== shown) {
        draw(idx);
        shown = idx;
      }
      setP(Math.round(smooth * 1000) / 1000);
      raf = running ? requestAnimationFrame(tick) : 0;
    };
    const io = new IntersectionObserver(
      ([entry]) => {
        running = entry.isIntersecting;
        if (running && !raf) {
          last = 0;
          raf = requestAnimationFrame(tick);
        }
      },
      { rootMargin: '50% 0px' },
    );
    size();
    load(0);
    preload();
    io.observe(section);
    window.addEventListener('resize', size);
    return () => {
      io.disconnect();
      window.removeEventListener('resize', size);
      cancelAnimationFrame(raf);
      running = false;
    };
  }, [basePath, count, portraitZoom, portraitFocusEnd]);

  const introOpacity = 1 - ramp(0.03, 0.07, p);
  const revealOn = p >= reveal.at;

  if (still) {
    return (
      <section className={cn('relative bg-studio text-ink', className)}>
        {/* eslint-disable-next-line @next/next/no-img-element -- a plain still; the film frames bypass next/image too */}
        <img src={poster} alt="" className="aspect-video w-full object-cover" />
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
          <Heading className="font-display text-5xl leading-none sm:text-6xl">{intro.title}</Heading>
          <ol aria-label={labels.steps} className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {captions.map((c, i) => (
              <li key={c.title}>
                <span className="font-display text-2xl">{c.marker ?? i + 1}</span>
                <p className="mt-1 text-lg font-semibold">{c.title}</p>
                <p className="mt-1 text-pretty">{c.body}</p>
              </li>
            ))}
          </ol>
          <div className="mt-10">{reveal.action}</div>
        </div>
      </section>
    );
  }

  return (
    <section ref={sectionRef} className={cn('relative h-[380vh] bg-studio text-ink sm:h-[440vh]', className)}>
      <div className="sticky top-16 h-[calc(100svh-4rem)] overflow-hidden">
        <canvas ref={canvasRef} aria-hidden className="absolute inset-0 size-full" />

        <div
          className="absolute inset-x-0 top-0 z-10 mx-auto max-w-7xl px-4 pt-10 sm:px-6 sm:pt-16"
          style={{ opacity: introOpacity, transform: `translateY(${-24 * (1 - introOpacity)}px)` }}
        >
          <Heading className="max-w-[12ch] font-display text-[clamp(2.8rem,7vw,6rem)] leading-[0.95] text-balance">
            {intro.title}
          </Heading>
          <p className="mt-4 text-sm font-medium">{intro.hint}</p>
        </div>

        <ol
          aria-label={labels.steps}
          className="absolute inset-x-4 bottom-20 z-10 sm:inset-x-6 lg:inset-x-auto lg:bottom-auto lg:start-[max(1.5rem,calc((100vw-80rem)/2+1.5rem))] lg:top-[30%] lg:w-[22rem]"
        >
          {captions.map((c, i) => {
            const on = p >= c.from && p < c.to;
            return (
              <li
                key={c.title}
                aria-current={on ? 'step' : undefined}
                className={cn(
                  'absolute inset-x-0 bottom-0 rounded-3xl bg-studio/70 p-5 backdrop-blur-sm transition duration-500 motion-reduce:transition-none lg:bottom-auto lg:top-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none',
                  on ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0',
                )}
              >
                <span className="grid size-11 place-items-center rounded-full bg-ink font-display text-xl text-bubblegum">
                  {c.marker ?? i + 1}
                </span>
                <p className="mt-3 font-display text-3xl leading-tight sm:text-4xl">{c.title}</p>
                <p className="mt-2 max-w-[30ch] text-base leading-relaxed text-pretty sm:text-lg">{c.body}</p>
              </li>
            );
          })}
        </ol>

        <div
          inert={!revealOn}
          className={cn(
            'absolute inset-x-4 bottom-12 z-10 rounded-3xl bg-studio/75 p-5 backdrop-blur-sm transition duration-500 motion-reduce:transition-none sm:inset-x-6 lg:inset-x-auto lg:start-[max(1.5rem,calc((100vw-80rem)/2+1.5rem))] lg:bottom-24 lg:bg-transparent lg:p-0 lg:backdrop-blur-none',
            revealOn ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0',
          )}
        >
          <p className="font-display text-4xl leading-none sm:text-5xl">{reveal.title}</p>
          {reveal.meta ? <p className="mt-3 text-xl font-semibold tabular-nums">{reveal.meta}</p> : null}
          {reveal.body ? <p className="mt-3 max-w-md text-lg leading-relaxed text-pretty">{reveal.body}</p> : null}
          <div className="mt-5">{reveal.action}</div>
        </div>

        <div aria-hidden className="absolute inset-x-4 bottom-6 z-10 h-0.5 rounded-full bg-ink/15 sm:inset-x-6">
          <span
            className="absolute inset-y-0 start-0 w-full origin-left rounded-full bg-ink rtl:origin-right"
            style={{ transform: `scaleX(${p})` }}
          />
        </div>
      </div>
    </section>
  );
}
