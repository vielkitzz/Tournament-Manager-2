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
};

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
