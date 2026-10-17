'use client';

import { Box, Rotate3d } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';

type Props = { src: string; poster: string; name: string };

/**
 * Drag-to-turn 3D view of a product, with "view in your space" AR on supported phones.
 * The model-viewer web component is loaded on the client only; until it upgrades, the
 * poster (the studio photo) is what people see.
 */
export function ProductViewer({ src, poster, name }: Props) {
  const t = useTranslations('product.viewer');
  const ref = useRef<HTMLElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    import('@google/model-viewer');
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) el.removeAttribute('auto-rotate');
    const onLoad = () => setLoaded(true);
    el.addEventListener('load', onLoad);
    return () => el.removeEventListener('load', onLoad);
  }, []);

  return (
    <div className="relative size-full bg-[radial-gradient(ellipse_at_50%_42%,#fbd3df_0%,var(--studio)_70%)]">
      <model-viewer
        ref={ref}
        src={src}
        poster={poster}
        alt={t('label', { name })}
        camera-controls=""
        touch-action="pan-y"
        disable-pan=""
        auto-rotate=""
        auto-rotate-delay="2500"
        rotation-per-second="18deg"
        interaction-prompt="auto"
        camera-orbit="0deg 82deg auto"
        min-camera-orbit="auto 45deg auto"
        max-camera-orbit="auto 100deg auto"
        field-of-view="26deg"
        shadow-intensity="1"
        shadow-softness="0.9"
        exposure="1.05"
        environment-image="neutral"
        ar=""
        ar-modes="webxr scene-viewer quick-look"
        ar-scale="fixed"
        style={{ width: '100%', height: '100%', backgroundColor: 'transparent', '--poster-color': 'transparent' } as React.CSSProperties}
      >
        <button
          slot="ar-button"
          type="button"
          className="absolute end-4 top-4 inline-flex h-10 items-center gap-2 rounded-full bg-ink px-4 text-sm font-medium text-white"
        >
          <Box className="size-4" aria-hidden />
          {t('ar')}
        </button>
        <div slot="progress-bar" />
      </model-viewer>

      <p
        className={`pointer-events-none absolute inset-x-0 bottom-4 flex justify-center transition-opacity duration-500 motion-reduce:transition-none ${loaded ? 'opacity-100' : 'opacity-0'}`}
      >
        <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3.5 py-1.5 text-xs font-medium text-ink backdrop-blur">
          <Rotate3d className="size-4" aria-hidden />
          {t('hint')}
        </span>
      </p>
    </div>
  );
}
