/**
 * Club color helpers: turn a team's palette into readable highlight styles
 * (podium rows, champion box, trophy room cards) with automatic contrast.
 */
import type { CSSProperties } from "react";

const HEX = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

export function normalizeHex(input?: string | null): string | null {
  if (!input) return null;
  const raw = input.trim();
  if (!HEX.test(raw)) return null;
  let h = raw.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  return `#${h.toLowerCase()}`;
}

export interface TeamPalette {
  primary: string;
  secondary: string;
  /** Every valid club color (up to 5), in order. Tricolores/quadricolores included. */
  all: string[];
}

/** Normalized club colors, capped at 5 entries. */
export function teamColorList(colors?: string[] | null): string[] {
  return (colors || [])
    .map(normalizeHex)
    .filter((c): c is string => !!c)
    .slice(0, 5);
}

export function teamPalette(colors?: string[] | null): TeamPalette | null {
  const list = teamColorList(colors);
  if (list.length === 0) return null;
  return { primary: list[0], secondary: list[1] || list[0], all: list };
}

function rgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
}

function luminance(hex: string): number {
  const [r, g, b] = rgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Black or white, whichever reads better on the given background. */
export function onColorText(hex: string): string {
  return contrastRatio(hex, "#0a0a0a") >= contrastRatio(hex, "#ffffff") ? "#0a0a0a" : "#ffffff";
}

export function withAlpha(hex: string, alpha: number): string {
  const [r, g, b] = rgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Evenly distributed gradient stops for any number of colors
 * (1 color = flat, 3 colors = 0/50/100%, and so on).
 */
function stopsFor(list: string[], alpha?: (index: number) => number, from = 0, to = 100): string {
  const colorAt = (i: number) => (alpha ? withAlpha(list[i], alpha(i)) : list[i]);
  if (list.length === 1) return `${colorAt(0)} ${from}%, ${colorAt(0)} ${to}%`;
  const span = to - from;
  return list.map((_, i) => `${colorAt(i)} ${(from + (span * i) / (list.length - 1)).toFixed(2)}%`).join(", ");
}

/** Text color that reads well over a multi-color gradient (average luminance). */
function textOverList(list: string[]): string {
  const avg = list.reduce((sum, c) => sum + luminance(c), 0) / list.length;
  return avg > 0.35 ? "#0a0a0a" : "#ffffff";
}

function styleSet(container: CSSProperties, text: string) {
  return {
    container: { ...container, color: text } as CSSProperties,
    accent: { backgroundColor: withAlpha(text, 0.16), color: text } as CSSProperties,
    text: { color: text } as CSSProperties,
    subtleText: { color: withAlpha(text, 0.78) } as CSSProperties,
    divider: { borderColor: withAlpha(text, 0.22), backgroundColor: withAlpha(text, 0.08) } as CSSProperties,
  };
}

/**
 * Soft row highlight for podium positions: a colored left bar plus a translucent
 * tint that never overpowers the theme text color.
 */
export function podiumRowStyle(colors: string[] | undefined, position: number, enabled = true): CSSProperties | undefined {
  if (!enabled || position > 3) return undefined;
  const palette = teamPalette(colors);
  if (!palette) return undefined;
  const intensity = position === 1 ? 0.3 : position === 2 ? 0.22 : 0.15;
  const list = palette.all;
  // Fade the tint out towards the right so the row never overpowers the text.
  const fade = (i: number) => intensity * (1 - (i / Math.max(list.length, 2)) * 0.55);
  return {
    boxShadow: `inset 6px 0 0 0 ${palette.primary}${
      list.length > 1 ? `, inset 12px 0 0 0 ${palette.secondary}` : ""
    }`,
    backgroundImage: `linear-gradient(90deg, ${stopsFor(list, fade, 0, 85)}, transparent 100%)`,
  };
}

/** Champion card styling: club gradient with guaranteed readable text. */
export function championBoxStyle(colors: string[] | undefined, enabled = true) {
  const palette = enabled ? teamPalette(colors) : null;
  if (!palette) return null;
  const list = palette.all;
  const text = list.length > 1 ? textOverList(list) : onColorText(list[0]);
  return styleSet(
    {
      backgroundImage: `linear-gradient(160deg, ${stopsFor(list)})`,
      borderColor: list[list.length - 1],
    },
    text
  );
}

/**
 * Card style for a shared title (two or more champions in the same year):
 * each club gets a slice of the gradient, with a single readable text color.
 */
export function splitChampionStyle(colorSets: (string[] | undefined)[], enabled = true) {
  if (!enabled) return null;
  const palettes = colorSets.map((c) => teamPalette(c)).filter((p): p is TeamPalette => !!p);
  if (palettes.length === 0) return null;
  if (palettes.length === 1) return championBoxStyle(palettes[0].all, enabled);

  const step = 100 / palettes.length;
  // Each club owns a slice; inside its slice every club color is represented.
  const stops = palettes.map((p, i) => stopsFor(p.all, undefined, i * step, (i + 1) * step)).join(", ");
  const text = textOverList(palettes.flatMap((p) => p.all));
  return styleSet(
    {
      backgroundImage: `linear-gradient(120deg, ${stops})`,
      borderColor: palettes[palettes.length - 1].all.slice(-1)[0],
    },
    text
  );
}
