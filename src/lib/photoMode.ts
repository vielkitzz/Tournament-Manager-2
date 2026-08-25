/**
 * Photo mode (modo foto) configuration.
 * Controls how the camera button renders tournament screenshots:
 * capture width, typographic scale (readability) and color palette.
 */

export interface PhotoModeSettings {
  /** Capture canvas width in px. Smaller = information looks bigger/closer. */
  width: number;
  /** Typographic/element scale. 1 = app default, 1.4 = 40% bigger. */
  scale: number;
  /** "app" follows the current skin/theme, "custom" uses the colors below. */
  palette: "app" | "custom";
  bg: string;
  surface: string;
  accent: string;
  text: string;
  /** Show a title header band above the captured content. */
  showHeader: boolean;
  title: string;
  subtitle: string;
  padding: number;
  /** Boosts text/border contrast inside the capture for easier reading. */
  highContrast: boolean;
  /** Pixel budget for the exported PNG (smaller = lighter file). */
  maxPixels: number;
  /** When true, width/scale come from the per-content preset (see PHOTO_PRESETS). */
  autoPreset: boolean;
  /** Internal capture hint used to select layout-specific framing rules. */
  layout?: PhotoLayoutKind;
}

export const DEFAULT_PHOTO_MODE: PhotoModeSettings = {
  width: 1100,
  scale: 1.3,
  palette: "app",
  bg: "#0b1020",
  surface: "#131b33",
  accent: "#3b6fe0",
  text: "#f5f7ff",
  showHeader: true,
  title: "",
  subtitle: "",
  padding: 40,
  highContrast: true,
  maxPixels: 5_000_000,
  autoPreset: true,
};

/** Content kinds captured by the camera buttons. */
export type PhotoLayoutKind = "table" | "rounds" | "bracket" | "gallery" | "stats";

/**
 * Ideal image width + base zoom per content kind. Tables/rounds are narrow and
 * benefit from a closer framing; brackets and stats need room for many columns.
 */
export const PHOTO_PRESETS: Record<PhotoLayoutKind, { width: number; scale: number; label: string }> = {
  table: { width: 920, scale: 1.35, label: "Tabela" },
  rounds: { width: 720, scale: 1.45, label: "Rodadas" },
  bracket: { width: 1400, scale: 1.15, label: "Chaveamento" },
  gallery: { width: 1100, scale: 1.3, label: "Sala de troféus" },
  stats: { width: 1200, scale: 1.25, label: "Estatísticas" },
};

/** Applies the per-kind preset when the user hasn't overridden width/zoom manually. */
export function resolvePhotoMode(
  settings: PhotoModeSettings,
  kind?: PhotoLayoutKind
): PhotoModeSettings {
  if (!kind || settings.autoPreset === false) return { ...settings, layout: kind };
  const preset = PHOTO_PRESETS[kind];
  if (!preset) return settings;
  return { ...settings, width: preset.width, scale: preset.scale, layout: kind };
}

/**
 * Width used to lay content out before it is magnified. Keeping the exported
 * width stable is what makes a larger zoom visibly larger instead of merely
 * producing a larger PNG with the same proportions.
 */
export function photoLayoutWidth(s: Pick<PhotoModeSettings, "width" | "scale">): number {
  const zoom = Math.min(2, Math.max(0.8, s.scale || 1));
  const outputWidth = Math.min(6000, Math.max(560, Math.round(s.width || 1100)));
  return Math.round(outputWidth / zoom);
}

export const QUALITY_PRESETS = [
  { label: "Leve", value: 3_000_000, hint: "menor arquivo" },
  { label: "Equilibrado", value: 5_000_000, hint: "recomendado" },
  { label: "Nítido", value: 8_000_000, hint: "máxima nitidez" },
];


const KEY = "tm2-photo-mode";

export function loadPhotoMode(tournamentId?: string): PhotoModeSettings {
  const read = (k: string) => {
    try {
      const raw = localStorage.getItem(k);
      return raw ? (JSON.parse(raw) as Partial<PhotoModeSettings>) : null;
    } catch {
      return null;
    }
  };
  const specific = tournamentId ? read(`${KEY}:${tournamentId}`) : null;
  const global = read(KEY);
  return { ...DEFAULT_PHOTO_MODE, ...(global || {}), ...(specific || {}) };
}

export function savePhotoMode(settings: PhotoModeSettings, tournamentId?: string) {
  try {
    localStorage.setItem(tournamentId ? `${KEY}:${tournamentId}` : KEY, JSON.stringify(settings));
  } catch {
    /* storage unavailable */
  }
}

export function resetPhotoMode(tournamentId?: string) {
  try {
    localStorage.removeItem(tournamentId ? `${KEY}:${tournamentId}` : KEY);
  } catch {
    /* noop */
  }
}

/** Converts #rrggbb (or #rgb) into the "H S% L%" triplet used by the design tokens. */
export function hexToHslTriplet(hex: string): string {
  let h = hex.replace("#", "").trim();
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  if ([r, g, b].some((v) => Number.isNaN(v))) return "0 0% 0%";
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let s = 0;
  let hue = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) hue = ((g - b) / d + (g < b ? 6 : 0)) * 60;
    else if (max === g) hue = ((b - r) / d + 2) * 60;
    else hue = ((r - g) / d + 4) * 60;
  }
  return `${Math.round(hue)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function mix(hex: string, other: string, amount: number): string {
  const parse = (x: string) => {
    let s = x.replace("#", "");
    if (s.length === 3) s = s.split("").map((c) => c + c).join("");
    return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16));
  };
  const a = parse(hex);
  const b = parse(other);
  const out = a.map((v, i) => Math.round(v + (b[i] - v) * amount));
  return `#${out.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

/** Returns extra CSS overriding the design tokens with the custom palette. */
export function paletteCss(s: PhotoModeSettings): string {
  if (s.palette !== "custom") return "";
  const t = hexToHslTriplet;
  const isDark = parseInt(hexToHslTriplet(s.bg).split(" ")[2]) < 50;
  const muted = mix(s.text, s.bg, 0.42);
  const border = mix(s.surface, s.text, isDark ? 0.16 : 0.12);
  return `#capture-root, #capture-root *{
    --background:${t(s.bg)};
    --foreground:${t(s.text)};
    --card:${t(s.surface)};
    --card-foreground:${t(s.text)};
    --popover:${t(s.surface)};
    --popover-foreground:${t(s.text)};
    --primary:${t(s.accent)};
    --primary-foreground:${t(isDark ? "#ffffff" : "#0b1020")};
    --secondary:${t(mix(s.surface, s.text, 0.07))};
    --secondary-foreground:${t(s.text)};
    --muted:${t(mix(s.surface, s.text, 0.07))};
    --muted-foreground:${t(muted)};
    --accent:${t(mix(s.accent, s.bg, 0.55))};
    --accent-foreground:${t(s.text)};
    --border:${t(border)};
    --input:${t(border)};
    --ring:${t(s.accent)};
  }`;
}

export function photoBackground(s: PhotoModeSettings, fallback: string): string {
  return s.palette === "custom" ? s.bg : fallback;
}

/**
 * Extra CSS applied inside the capture frame to make small/faded UI readable:
 * stronger muted text, visible borders and no translucent overlays.
 */
export function contrastCss(s: PhotoModeSettings): string {
  if (!s.highContrast) return "";
  return `#capture-root, #capture-root *{
    --muted-foreground: var(--foreground);
  }
  #capture-root *{ -webkit-font-smoothing:antialiased; text-shadow:none !important; }
  #capture-root *:not([style*="opacity: 0"]){ opacity:1 !important; }
  #capture-root *{ border-color: hsl(var(--border)) ; }
  #capture-root svg{ stroke-width:2 ; }`;
}

/** Same overrides as paletteCss, but as inline CSS variables for the live preview. */
export function paletteVars(s: PhotoModeSettings): Record<string, string> {
  if (s.palette !== "custom") return {};
  const css = paletteCss(s);
  const body = css.slice(css.indexOf("{") + 1, css.lastIndexOf("}"));
  const out: Record<string, string> = {};
  body
    .split(";")
    .map((d) => d.trim())
    .filter(Boolean)
    .forEach((d) => {
      const i = d.indexOf(":");
      if (i > 0) out[d.slice(0, i).trim()] = d.slice(i + 1).trim();
    });
  return out;
}

/**
 * Same math as the capture engine: the clone is laid out at `width / scale` and
 * scaled back up, so an element with `baseFont` px occupies `baseFont * scale`
 * of a `width`-wide image. Rendering that ratio inside a preview of
 * `previewWidth` px gives a faithful simulation of the exported PNG.
 */
export function photoPreviewFontSize(
  s: Pick<PhotoModeSettings, "width" | "scale">,
  previewWidth: number,
  baseFont = 12
): number {
  const scale = Math.min(2, Math.max(0.8, s.scale || 1));
  const width = Math.min(6000, Math.max(560, Math.round(s.width || 1100)));
  return (baseFont * scale * previewWidth) / width;
}
