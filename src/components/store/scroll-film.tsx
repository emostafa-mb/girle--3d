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
  /** On portrait screens, the zoom by the end of the film, so a wide ending (bottles side by side) fits. */
  portraitZoomEnd?: number;
  /** Where (0–1 of the film) the ending starts; the portrait view eases to its end framing just after. */
  portraitEndAt?: number;
  /**
   * From lg up the words float beside the film: at the reading start ('start'), or always on the left
   * ('left') when the frame keeps its empty space there whatever the language.
   */
  textSide?: 'start' | 'left';
  className?: string;
};

const ramp = (a: number, b: number, x: number) => Math.min(1, Math.max(0, (x - a) / (b - a)));

/**
 * A film scrubbed by scroll: rendered frames drawn on a canvas inside a sticky stage, with
 * captions that switch on per stage and a closing reveal. Reduced motion gets the last frame
 * and every caption as a list.
 */
export function ScrollFilm({
  basePath,
  count,
  poster,
  intro,
  captions,
  reveal,
  labels,
  portraitZoom = 2.2,
  portraitFocusEnd = 0.5,
  portraitZoomEnd,
  portraitEndAt = 0.7,
  textSide = 'start',
  className,
}: Props) {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [p, setP] = useState(0);
  const [still, setStill] = useState(false);
  const Heading = intro.as ?? 'h1';

  useEffect(() => {
    const section = sectionRef.current;
    const stageEl = stageRef.current;
    const canvas = canvasRef.current;
    if (!section || !stageEl || !canvas) return;
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
      // Wide stage (lg up, words beside the film): fill it. Below lg the words sit under the film, so
      // frame it for the phone however wide the stage is (browser bars can make it wider than tall).
      if (window.innerWidth >= 1024 && cw / ch >= 0.9) {
        ctx.drawImage(im, (cw - iw * cover) / 2, (ch - ih * cover) / 2, iw * cover, ih * cover);
        return;
      }
      // phone: show more of the frame and feather its top and bottom into the studio pink
      const studio = getComputedStyle(stageEl).getPropertyValue('--studio').trim() || '#e9a5b7';
      ctx.fillStyle = studio;
      ctx.fillRect(0, 0, cw, ch);
      ctx.imageSmoothingQuality = 'high';
      const end = ramp(portraitEndAt, portraitEndAt + 0.08, smooth);
      const zoom = portraitZoom + ((portraitZoomEnd ?? portraitZoom) - portraitZoom) * end;
      const s = Math.min(cover, (cw * zoom) / iw);
      const w = iw * s, h = ih * s, y = ch * 0.5 - h / 2;
      const focus = 0.5 + (portraitFocusEnd - 0.5) * end;
      const x = Math.min(0, Math.max(cw - w, cw / 2 - focus * w));
      ctx.drawImage(im, x, y, w, h);
      if (h < ch) {
        const fade = Math.min(h / 4, 56 * (cw / 390));
        for (const [y0, y1] of [[y, y + fade], [y + h, y + h - fade]]) {
          const grad = ctx.createLinearGradient(0, y0, 0, y1);
          grad.addColorStop(0, studio);
          grad.addColorStop(1, 'transparent');
          ctx.fillStyle = grad;
          ctx.fillRect(0, Math.min(y0, y1), cw, Math.abs(y1 - y0));
        }
      }
    };
    const progress = () => {
      const r = section.getBoundingClientRect();
      const stage = stageEl.clientHeight || window.innerHeight;
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
  }, [basePath, count, portraitZoom, portraitFocusEnd, portraitZoomEnd, portraitEndAt]);

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

  // Phones: the film fills the top of the screen and the words sit underneath it, never on it.
  // From lg up the film is full-bleed and the words float on its left.
  const textStart =
    textSide === 'left' ? 'lg:left-6' : 'lg:start-[max(1.5rem,calc((100vw-80rem)/2+1.5rem))]';
  return (
    <section ref={sectionRef} className={cn('relative h-[380vh] bg-studio text-ink sm:h-[440vh]', className)}>
      <div ref={stageRef} className="sticky top-16 flex h-[calc(100svh-4rem)] flex-col overflow-hidden lg:block">
        <div className="relative h-[56%] shrink-0 lg:absolute lg:inset-0 lg:h-auto">
          <canvas ref={canvasRef} aria-hidden className="absolute inset-0 size-full" />
          <div aria-hidden className="absolute inset-x-0 bottom-0 h-10 bg-linear-to-b from-transparent to-studio lg:hidden" />
        </div>

        <div className="relative flex-1 lg:static">
          <div
            className="absolute inset-x-0 top-0 z-10 mx-auto max-w-7xl px-4 pt-4 sm:px-6 lg:pt-16"
            style={{ opacity: introOpacity, transform: `translateY(${-24 * (1 - introOpacity)}px)` }}
          >
            <Heading className="max-w-[12ch] font-display text-[clamp(2.25rem,7vw,6rem)] leading-[0.95] text-balance">
              {intro.title}
            </Heading>
            <p className="mt-3 text-sm font-medium lg:mt-4">{intro.hint}</p>
          </div>

          <ol
            aria-label={labels.steps}
            className={cn('absolute inset-x-4 top-4 z-10 sm:inset-x-6 lg:inset-x-auto lg:top-[30%] lg:w-[22rem]', textStart)}
          >
            {captions.map((c, i) => {
              const on = p >= c.from && p < c.to;
              return (
                <li
                  key={c.title}
                  aria-current={on ? 'step' : undefined}
                  className={cn(
                    'absolute inset-x-0 top-0 grid grid-cols-[auto_1fr] items-start gap-x-4 transition duration-500 motion-reduce:transition-none lg:block',
                    on ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-3 opacity-0',
                  )}
                >
                  <span className="row-span-2 grid size-10 place-items-center rounded-full bg-ink font-display text-lg text-bubblegum lg:size-11 lg:text-xl">
                    {c.marker ?? i + 1}
                  </span>
                  <p className="font-display text-2xl leading-tight sm:text-3xl lg:mt-3 lg:text-4xl">{c.title}</p>
                  <p className="mt-1 max-w-[32ch] text-[0.95rem] leading-relaxed text-pretty sm:text-base lg:mt-2 lg:text-lg">
                    {c.body}
                  </p>
                </li>
              );
            })}
          </ol>

          <div
            inert={!revealOn}
            className={cn(
              'absolute inset-x-4 top-4 z-10 transition duration-500 motion-reduce:transition-none sm:inset-x-6 lg:inset-x-auto lg:top-auto lg:bottom-24',
              textStart,
              // the left-hand space narrows with the screen; below xl the film's crop can reach under
              // the words, so they get a frosted panel
              textSide === 'left' &&
                'lg:w-[min(24rem,26vw)] lg:max-xl:rounded-3xl lg:max-xl:bg-studio/75 lg:max-xl:p-5 lg:max-xl:backdrop-blur-sm',
              revealOn ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-3 opacity-0',
            )}
          >
            <p className="font-display text-3xl leading-none sm:text-4xl lg:text-5xl">{reveal.title}</p>
            {reveal.meta ? <p className="mt-2 text-lg font-semibold tabular-nums lg:mt-3 lg:text-xl">{reveal.meta}</p> : null}
            {reveal.body ? (
              <p className="mt-2 max-w-md text-[0.95rem] leading-relaxed text-pretty sm:text-base lg:mt-3 lg:text-lg">
                {reveal.body}
              </p>
            ) : null}
            <div className="mt-4 lg:mt-5">{reveal.action}</div>
          </div>
        </div>

        <div aria-hidden className="absolute inset-x-4 bottom-5 z-10 h-0.5 rounded-full bg-ink/15 sm:inset-x-6 lg:bottom-6">
          <span
            className="absolute inset-y-0 start-0 w-full origin-left rounded-full bg-ink rtl:origin-right"
            style={{ transform: `scaleX(${p})` }}
          />
        </div>
      </div>
    </section>
  );
}
