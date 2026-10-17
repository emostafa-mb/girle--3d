export const DEFAULT_PRIMARY = '#e8590c';
const DEFAULT_RADIUS = 0.75;
/** Approximates the `.dark` --background in globals.css. */
const DARK_BACKGROUND = '#0a0a0a';

export function normalizeHex(input: string | null | undefined, fallback = DEFAULT_PRIMARY): string {
  if (!input) return fallback;
  let v = input.trim();
  if (/^#[0-9a-f]{3}$/i.test(v)) {
    v = `#${v.slice(1).split('').map((c) => c + c).join('')}`;
  }
  return /^#[0-9a-f]{6}$/i.test(v) ? v.toLowerCase() : fallback;
}

export function relativeLuminance(hex: string): number {
  const n = Number.parseInt(normalizeHex(hex).slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

export function readableForeground(bg: string): '#ffffff' | '#000000' {
  return contrastRatio(bg, '#ffffff') >= contrastRatio(bg, '#000000') ? '#ffffff' : '#000000';
}

/**
 * CSS that overrides the shadcn brand variables. `html:root` / `html.dark` outrank the
 * `:root` / `.dark` rules in globals.css regardless of stylesheet order.
 */
export function buildThemeCss(input: { primaryColor: string; radius: number }): string {
  const primary = normalizeHex(input.primaryColor);
  const radius = Number.isFinite(input.radius) && input.radius >= 0 && input.radius <= 2 ? input.radius : DEFAULT_RADIUS;
  const css =
    `html:root,html.dark{` +
    `--primary:${primary};` +
    `--primary-foreground:${readableForeground(primary)};` +
    `--ring:${primary};` +
    `--radius:${radius}rem;` +
    `}`;
  // A very dark primary (e.g. black) vanishes on the dark background, so dark mode falls back to white.
  if (contrastRatio(primary, DARK_BACKGROUND) >= 3) return css;
  return `${css}html.dark{--primary:#ffffff;--primary-foreground:#000000;--ring:#ffffff;}`;
}
