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

/**
 * Club colors are applied as a SOFT TINT over the theme surface instead of a
 * full-bleed gradient: text keeps the theme foreground (always readable in any
 * skin / any club palette) and the identity comes from a solid side bar plus a
 * low-opacity glow that fades out before it reaches the text.
 */
const THEME_TEXT = "hsl(var(--foreground))";
const THEME_SUBTLE = "hsl(var(--muted-foreground))";

/** Max tint alpha allowed for a color: bright colors tint less, dark ones more. */
function safeAlpha(hex: string, base: number): number {
  const l = luminance(hex);
  // Very light or very dark colors wash out text the most — damp them further.
  const damp = l > 0.6 ? 0.55 : l < 0.06 ? 0.7 : 1;
  return Math.min(0.32, base * damp);
}

/** Side bar with every club color (tri/quadricolores keep their identity). */
function sideBar(list: string[], width = 5): string {
  const slice = 100 / list.length;
  const stops = list
    .map((c, i) => `${c} ${(i * slice).toFixed(2)}%, ${c} ${((i + 1) * slice).toFixed(2)}%`)
    .join(", ");
  return `linear-gradient(180deg, ${stops})`;
}

function tintLayer(list: string[], base: number, to = 78): string {
  const span = to;
  const stops = list
    .map((c, i) => {
      const pos = list.length === 1 ? 0 : (span * i) / (list.length - 1) * 0.75;
      return `${withAlpha(c, safeAlpha(c, base) * (1 - i / (list.length + 1)))} ${pos.toFixed(2)}%`;
    })
    .join(", ");
  return `linear-gradient(100deg, ${stops}, transparent ${span}%)`;
}

function styleSet(list: string[], intensity: number, barWidth: number) {
  const primary = list[0];
  return {
    container: {
      backgroundImage: `${tintLayer(list, intensity)}, ${sideBar(list)}`,
      backgroundRepeat: "no-repeat, no-repeat",
      backgroundSize: `100% 100%, ${barWidth}px 100%`,
      backgroundPosition: "left center, left center",
      borderColor: withAlpha(primary, 0.45),
      color: THEME_TEXT,
    } as CSSProperties,
    accent: { backgroundColor: withAlpha(primary, 0.22), color: THEME_TEXT } as CSSProperties,
    text: { color: THEME_TEXT } as CSSProperties,
    subtleText: { color: THEME_SUBTLE } as CSSProperties,
    divider: { borderColor: withAlpha(primary, 0.28) } as CSSProperties,
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
  const intensity = position === 1 ? 0.2 : position === 2 ? 0.15 : 0.1;
  return styleSet(palette.all, intensity, 5).container;
}

/** Champion card styling: club gradient with guaranteed readable text. */
export function championBoxStyle(colors: string[] | undefined, enabled = true) {
  const palette = enabled ? teamPalette(colors) : null;
  if (!palette) return null;
  return styleSet(palette.all, 0.26, 7);
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
  // Every co-champion contributes its colors to the shared tint and side bar.
  return styleSet(palettes.flatMap((p) => p.all).slice(0, 6), 0.22, 7);
}
