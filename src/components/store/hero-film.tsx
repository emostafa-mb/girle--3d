'use client';

import { Pause, Play, RotateCcw } from 'lucide-react';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { cn } from '@/lib/utils';
import type { FilmCaption } from './scroll-film';

type Props = {
  /** MP4 of the film, and posters for its first and last frames. */
  src: string;
  posterStart: string;
  posterEnd: string;
  title: string;
  captions: FilmCaption[];
  /** The closing words and buttons, from `at` (0–1 of the film) to the end. */
  reveal: { at: number; title: string; body?: string; action: React.ReactNode };
  labels: { steps: string; play: string; pause: string; replay: string };
};

const REDUCED = '(prefers-reduced-motion: reduce)';
const subscribeReduced = (onChange: () => void) => {
  const mq = window.matchMedia(REDUCED);
  mq.addEventListener('change', onChange);
  return () => mq.removeEventListener('change', onChange);
};

/** The intro title stays up while the products drop in, then hands over to the captions. */
const INTRO_UNTIL = 0.15;

/**
 * A film that plays by itself, muted, as soon as the page opens: captions switch on over it as it goes
 * and it ends on the closing words. It pauses while scrolled out of view, and has a pause / replay
 * button. People who prefer reduced motion get the last frame with the closing words and can press play.
 * Phones show the whole frame with the words underneath; from lg up the film fills the stage and the
 * words sit on its left, where the frame keeps its empty space.
 */
export function HeroFilm({ src, posterStart, posterEnd, title, captions, reveal, labels }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  const reduced = useSyncExternalStore(subscribeReduced, () => window.matchMedia(REDUCED).matches, () => false);
  // reduced motion shows the last frame until someone presses play
  const still = reduced && !started;
  const p = still ? 1 : progress;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let raf = 0;
    const tick = () => {
      if (video.duration) setProgress(video.currentTime / video.duration);
      raf = requestAnimationFrame(tick);
    };
    const onPlay = () => {
      setPlaying(true);
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(tick);
    };
    const onStop = () => {
      setPlaying(false);
      cancelAnimationFrame(raf);
      if (video.duration) setProgress(video.currentTime / video.duration);
    };
    const onSeeked = () => {
      if (video.duration) setProgress(video.currentTime / video.duration);
    };
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onStop);
    video.addEventListener('ended', onStop);
    video.addEventListener('seeked', onSeeked);
    // Off screen it rests, and carries on when it scrolls back, unless someone paused it or it ended.
    let heldOffscreen = false;
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting && !video.paused) {
        heldOffscreen = true;
        video.pause();
      } else if (entry.isIntersecting && heldOffscreen) {
        heldOffscreen = false;
        video.play().catch(() => {});
      }
    });
    io.observe(video);
    // Autoplay can be refused (low power mode); the play button is there either way. Ask the media query
    // itself: on the first render `reduced` still holds the server's answer.
    if (!window.matchMedia(REDUCED).matches) video.play().catch(() => {});
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onStop);
      video.removeEventListener('ended', onStop);
      video.removeEventListener('seeked', onSeeked);
    };
  }, [reduced]);

  const toggle = () => {
    const video = videoRef.current;
    if (!video) return;
    if (still) setStarted(true);
    if (still || video.ended || p >= 0.999) video.currentTime = 0;
    if (video.paused) video.play().catch(() => {});
    else video.pause();
  };

  const ended = !still && !playing && p >= 0.999;
  const introOn = !still && p < INTRO_UNTIL;
  const revealOn = still || p >= reveal.at;
  const Icon = playing ? Pause : ended ? RotateCcw : Play;
  const buttonLabel = playing ? labels.pause : ended ? labels.replay : labels.play;
  const fade = (on: boolean) =>
    cn(
      'transition duration-500 motion-reduce:transition-none',
      on ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-3 opacity-0',
    );

  return (
    <section className="relative bg-studio text-ink">
      <div className="relative lg:h-[calc(100svh-4rem)] lg:min-h-[34rem]">
        <div className="relative aspect-video w-full lg:absolute lg:inset-0 lg:aspect-auto">
          <video
            ref={videoRef}
            src={src}
            poster={still ? posterEnd : posterStart}
            muted
            playsInline
            preload="auto"
            aria-hidden
            className="absolute inset-0 size-full object-cover"
          />
        </div>

        <div className="relative min-h-[15.5rem] px-4 pt-5 pb-14 sm:min-h-[14rem] sm:px-6 lg:static lg:min-h-0 lg:p-0">
          <h1
            className={cn(
              'absolute inset-x-4 top-5 z-10 max-w-[12ch] font-display text-[clamp(2.25rem,7vw,6rem)] leading-[0.95] text-balance sm:inset-x-6 lg:top-16 lg:left-6 lg:inset-x-auto',
              fade(introOn),
            )}
          >
            {title}
          </h1>

          <ol aria-label={labels.steps} className="absolute inset-x-4 top-5 z-10 sm:inset-x-6 lg:inset-x-auto lg:top-[30%] lg:left-6 lg:w-[22rem]">
            {captions.map((c, i) => {
              const on = !still && p >= c.from && p < c.to;
              return (
                <li
                  key={c.title}
                  aria-current={on ? 'step' : undefined}
                  className={cn('absolute inset-x-0 top-0 grid grid-cols-[auto_1fr] items-start gap-x-4 lg:block', fade(on))}
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
              'absolute inset-x-4 top-5 z-10 sm:inset-x-6 lg:inset-x-auto lg:top-auto lg:bottom-24 lg:left-6 lg:w-[min(24rem,26vw)]',
              // below xl the film's crop can reach under the words, so they get a frosted panel
              'lg:max-xl:rounded-3xl lg:max-xl:bg-studio/75 lg:max-xl:p-5 lg:max-xl:backdrop-blur-sm',
              fade(revealOn),
            )}
          >
            <p className="font-display text-3xl leading-none sm:text-4xl lg:text-5xl">{reveal.title}</p>
            {reveal.body ? (
              <p className="mt-2 max-w-md text-[0.95rem] leading-relaxed text-pretty sm:text-base lg:mt-3 lg:text-lg">
                {reveal.body}
              </p>
            ) : null}
            <div className="mt-4 lg:mt-5">{reveal.action}</div>
          </div>

          <div className="absolute inset-x-4 bottom-5 z-10 flex items-center gap-3 sm:inset-x-6 lg:bottom-6">
            <button
              type="button"
              onClick={toggle}
              aria-label={buttonLabel}
              title={buttonLabel}
              className="grid size-9 shrink-0 place-items-center rounded-full bg-ink text-white transition hover:bg-ink/80"
            >
              <Icon aria-hidden className="size-4" />
            </button>
            <div aria-hidden className="relative h-0.5 flex-1 rounded-full bg-ink/15">
              <span
                className="absolute inset-y-0 start-0 w-full origin-left rounded-full bg-ink rtl:origin-right"
                style={{ transform: `scaleX(${p})` }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
