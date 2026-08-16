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

export function teamPalette(colors?: string[] | null): { primary: string; secondary: string } | null {
  const list = (colors || []).map(normalizeHex).filter((c): c is string => !!c);
  if (list.length === 0) return null;
  return { primary: list[0], secondary: list[1] || list[0] };
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
 * Soft row highlight for podium positions: a colored left bar plus a translucent
 * tint that never overpowers the theme text color.
 */
export function podiumRowStyle(colors: string[] | undefined, position: number, enabled = true): CSSProperties | undefined {
  if (!enabled || position > 3) return undefined;
  const palette = teamPalette(colors);
  if (!palette) return undefined;
  const intensity = position === 1 ? 0.18 : position === 2 ? 0.13 : 0.09;
  return {
    boxShadow: `inset 4px 0 0 0 ${palette.primary}`,
    backgroundImage: `linear-gradient(90deg, ${withAlpha(palette.primary, intensity)}, ${withAlpha(
      palette.secondary,
      intensity * 0.35
    )} 60%, transparent)`,
  };
}

/** Champion card styling: club gradient with guaranteed readable text. */
export function championBoxStyle(colors: string[] | undefined, enabled = true) {
  const palette = enabled ? teamPalette(colors) : null;
  if (!palette) return null;
  const text = onColorText(palette.primary);
  return {
    container: {
      backgroundImage: `linear-gradient(160deg, ${palette.primary}, ${withAlpha(palette.secondary, 0.92)})`,
      borderColor: palette.secondary,
      color: text,
    } as CSSProperties,
    accent: { backgroundColor: withAlpha(text, 0.16), color: text } as CSSProperties,
    text: { color: text } as CSSProperties,
    subtleText: { color: withAlpha(text, 0.78) } as CSSProperties,
    divider: { borderColor: withAlpha(text, 0.22), backgroundColor: withAlpha(text, 0.08) } as CSSProperties,
  };
}
