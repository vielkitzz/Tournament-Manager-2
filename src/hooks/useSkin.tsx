import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { useRef } from "react";
import { saveImage, loadImage, deleteImages } from "./useSkinImageStore";

/**
 * Skin system
 * — A skin is a set of overrides applied on top of the base theme (light/dark).
 * — Tokens use HSL triplet strings (ex.: "222 47% 8%") matching index.css.
 * — Built-in presets are immutable; user-defined skins are fully editable.
 * — Applied directly to <html> via inline custom properties so every component
 *   that reads the existing semantic tokens reacts instantly.
 */

export type SkinTokens = Partial<Record<string, string>>;

export type GradientTarget = "background" | "card" | "primary" | "accent" | "sidebar" | "button";

export interface SkinGradient {
  enabled: boolean;
  from: string; // hex
  to: string; // hex
  angle: number; // degrees
}

export interface SkinExtras {
  /** Border radius in rem (overrides --radius). */
  radius?: number;
  /** Optional data URL of a background image applied to body. */
  backgroundImage?: string | null;
  backgroundSize?: "cover" | "contain" | "auto";
  backgroundPosition?: string;
  backgroundBlur?: number; // px
  backgroundOpacity?: number; // 0..1 overlay strength
  /** Per-element gradient overrides. */
  gradients?: Partial<Record<GradientTarget, SkinGradient>>;
  /** Custom font import (CSS @import URL, e.g. Google Fonts). */
  fontUrl?: string;
  /** Font family for body / UI. */
  fontSans?: string;
  /** Font family for headings. */
  fontHeading?: string;
  /** Font scale multiplier (1 = base). */
  fontScale?: number;
  /** Letter spacing in em. */
  letterSpacing?: number;
  /** Shadow intensity multiplier (0 = flat, 1 = base, 2 = dramatic). */
  shadowIntensity?: number;
  /** Global UI density: 0.85=compact, 1=normal, 1.15=cozy. */
  density?: number;
  uploadedFonts?: Array<{
    name: string;
    url: string;
    format: string;
  }>;
}

export interface Skin {
  id: string;
  label: string;
  description?: string;
  builtin?: boolean;
  base: "light" | "dark";
  tokens: SkinTokens;
  logoUrl?: string; // ← adicionar esta linha
  extras?: SkinExtras;
}

/** Semantic tokens the user can customize. Must match variables in index.css. */
export const SKIN_TOKEN_GROUPS: { label: string; tokens: { key: string; label: string }[] }[] = [
  {
    label: "Superfícies",
    tokens: [
      { key: "background", label: "Fundo" },
      { key: "foreground", label: "Texto" },
      { key: "card", label: "Card" },
      { key: "card-foreground", label: "Texto do card" },
      { key: "popover", label: "Popover" },
      { key: "popover-foreground", label: "Texto do popover" },
      { key: "muted", label: "Muted" },
      { key: "muted-foreground", label: "Texto muted" },
      { key: "border", label: "Borda" },
      { key: "input", label: "Input" },
    ],
  },
  {
    label: "Ações",
    tokens: [
      { key: "primary", label: "Primário" },
      { key: "primary-foreground", label: "Texto primário" },
      { key: "secondary", label: "Secundário" },
      { key: "secondary-foreground", label: "Texto secundário" },
      { key: "accent", label: "Acento" },
      { key: "accent-foreground", label: "Texto acento" },
      { key: "ring", label: "Anel de foco" },
    ],
  },
  {
    label: "Status",
    tokens: [
      { key: "destructive", label: "Destrutivo" },
      { key: "destructive-foreground", label: "Texto destrutivo" },
      { key: "success", label: "Sucesso" },
      { key: "warning", label: "Aviso" },
      { key: "info", label: "Info" },
      { key: "highlight", label: "Destaque" },
    ],
  },
  {
    label: "Sidebar",
    tokens: [
      { key: "sidebar-background", label: "Fundo sidebar" },
      { key: "sidebar-foreground", label: "Texto sidebar" },
      { key: "sidebar-primary", label: "Primário sidebar" },
      { key: "sidebar-accent", label: "Acento sidebar" },
      { key: "sidebar-border", label: "Borda sidebar" },
    ],
  },
];

export const ALL_TOKEN_KEYS: string[] = SKIN_TOKEN_GROUPS.flatMap((g) => g.tokens.map((t) => t.key));

const BUILTIN_SKINS: Skin[] = [
  {
    id: "default-dark",
    label: "Padrão Escuro",
    description: "Tema noturno padrão do app",
    builtin: true,
    base: "dark",
    tokens: {},
  },
  {
    id: "default-light",
    label: "Padrão Claro",
    description: "Tema claro padrão do app",
    builtin: true,
    base: "light",
    tokens: {},
  },
  {
    id: "midnight",
    label: "Meia-noite",
    description: "Azul profundo com primário índigo",
    builtin: true,
    base: "dark",
    tokens: {
      background: "230 40% 6%",
      card: "230 35% 10%",
      popover: "230 35% 10%",
      primary: "245 80% 65%",
      "primary-foreground": "230 40% 6%",
      accent: "265 75% 65%",
      "accent-foreground": "230 40% 6%",
      border: "230 25% 16%",
      ring: "245 80% 65%",
    },
  },
  {
    id: "cyberpunk",
    label: "Cyberpunk",
    description: "Alto contraste com neons magenta e ciano",
    builtin: true,
    base: "dark",
    tokens: {
      background: "270 60% 5%",
      foreground: "180 100% 95%",
      card: "270 50% 9%",
      popover: "270 50% 9%",
      muted: "270 35% 14%",
      "muted-foreground": "275 60% 75%",
      primary: "315 100% 60%",
      "primary-foreground": "270 60% 5%",
      accent: "175 100% 50%",
      "accent-foreground": "270 60% 5%",
      border: "275 70% 25%",
      ring: "315 100% 60%",
      "sidebar-background": "270 55% 7%",
      "sidebar-foreground": "180 100% 95%",
      "sidebar-primary": "315 100% 60%",
      "sidebar-accent": "270 50% 12%",
      "sidebar-border": "275 60% 20%",
    },
  },
  {
    id: "emerald",
    label: "Esmeralda",
    description: "Verde profundo com dourado",
    builtin: true,
    base: "dark",
    tokens: {
      background: "165 45% 6%",
      card: "165 40% 10%",
      popover: "165 40% 10%",
      primary: "158 75% 45%",
      "primary-foreground": "165 45% 6%",
      accent: "42 90% 55%",
      "accent-foreground": "165 45% 6%",
      border: "165 30% 16%",
      ring: "158 75% 45%",
    },
  },
  {
    id: "solar",
    label: "Solar",
    description: "Claro e quente, com primário laranja",
    builtin: true,
    base: "light",
    tokens: {
      background: "40 50% 97%",
      card: "0 0% 100%",
      primary: "20 90% 55%",
      "primary-foreground": "0 0% 100%",
      accent: "45 95% 55%",
      "accent-foreground": "20 40% 15%",
      border: "30 30% 88%",
      ring: "20 90% 55%",
    },
  },
];

const STORAGE_KEY_ACTIVE = "tm2-skin-active";
const STORAGE_KEY_CUSTOM = "tm2-skin-custom";
const EXTRAS_STYLE_ID = "tm2-skin-extras-style";
const FONT_LINK_ID = "tm2-skin-font-link";

interface SkinContextValue {
  skins: Skin[];
  activeSkin: Skin;
  setActiveSkin: (id: string) => void;
  createCustomSkin: (input: { label: string; base?: "light" | "dark"; from?: Skin }) => Skin;
  updateCustomSkin: (
    id: string,
    patch: Partial<Pick<Skin, "label" | "description" | "base" | "tokens" | "extras">>,
  ) => void;
  setCustomToken: (id: string, tokenKey: string, value: string | null) => void;
  updateExtras: (id: string, patch: Partial<SkinExtras>) => void;
  setGradient: (id: string, target: GradientTarget, value: SkinGradient | null) => void;
  resetCustomSkin: (id: string) => void;
  deleteCustomSkin: (id: string) => void;
  duplicateSkin: (id: string, label?: string) => Skin | null;
  importSkins: (skins: Skin[]) => void;
  setCustomLogo: (id: string, logoUrl: string | null) => void;
}

const SkinContext = createContext<SkinContextValue | null>(null);

function loadCustomSkins(): Skin[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CUSTOM);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((s) => s && typeof s.id === "string" && typeof s.label === "string");
  } catch {
    return [];
  }
}

/** Returns true when localStorage has a non-empty value for STORAGE_KEY_CUSTOM
 * but loadCustomSkins() couldn't successfully parse it. We use this signal
 * to AVOID overwriting potentially recoverable data with an empty array on
 * the very first persistence effect run. */
function detectCorruptedStorage(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CUSTOM);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return !Array.isArray(parsed);
  } catch {
    return true;
  }
}

/** IndexedDB backup helpers — provide a redundant copy of the skins JSON so
 * a localStorage wipe (private mode eviction, browser cleanup, quota purge,
 * accidental clear) doesn't destroy the user's custom skins. */
const BACKUP_SKIN_ID = "__skin-backup__";
const BACKUP_KEY = "skins-json";

async function backupSkinsToIdb(skins: Skin[]): Promise<void> {
  try {
    await saveImage(BACKUP_SKIN_ID, BACKUP_KEY, JSON.stringify(skins));
  } catch {
    /* ignore — backup is best-effort */
  }
}

async function restoreSkinsFromIdb(): Promise<Skin[] | null> {
  try {
    const raw = await loadImage(BACKUP_SKIN_ID, BACKUP_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed.filter((s: any) => s && typeof s.id === "string" && typeof s.label === "string");
  } catch {
    return null;
  }
}

function applySkinToDocument(skin: Skin) {
  const root = document.documentElement;
  root.classList.toggle("light", skin.base === "light");
  root.classList.toggle("dark", skin.base === "dark");
  root.setAttribute("data-skin", skin.id);

  ALL_TOKEN_KEYS.forEach((key) => {
    root.style.removeProperty(`--${key}`);
  });

  ["radius", "font-sans", "font-heading", "font-scale", "letter-spacing", "shadow-strength"].forEach((k) =>
    root.style.removeProperty(`--${k}`),
  );

  Object.entries(skin.tokens).forEach(([key, value]) => {
    if (typeof value === "string" && value.trim()) {
      root.style.setProperty(`--${key}`, value);
    }
  });

  applySkinExtrasToDocument(skin);
}

function buildGradientCss(g: SkinGradient): string {
  return `linear-gradient(${g.angle}deg, ${g.from}, ${g.to})`;
}

function applySkinExtrasToDocument(skin: Skin) {
  const root = document.documentElement;
  const extras = skin.extras || {};

  // Radius
  if (typeof extras.radius === "number") {
    root.style.setProperty("--radius", `${extras.radius}rem`);
  }

  // Font URL (Google Fonts etc.)
  let link = document.getElementById(FONT_LINK_ID) as HTMLLinkElement | null;
  if (extras.fontUrl && extras.fontUrl.trim()) {
    if (!link) {
      link = document.createElement("link");
      link.id = FONT_LINK_ID;
      link.rel = "stylesheet";
      document.head.appendChild(link);
    }
    if (link.href !== extras.fontUrl) link.href = extras.fontUrl;
  } else if (link) {
    link.remove();
  }

  if (extras.fontSans && extras.fontSans.trim()) {
    root.style.setProperty("--font-sans", `${extras.fontSans}, ui-sans-serif, system-ui, sans-serif`);
  }
  if (typeof extras.fontScale === "number") {
    root.style.fontSize = `${Math.round(extras.fontScale * 100)}%`;
  } else {
    root.style.fontSize = "";
  }

  // Build dynamic stylesheet
  let style = document.getElementById(EXTRAS_STYLE_ID) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement("style");
    style.id = EXTRAS_STYLE_ID;
    document.head.appendChild(style);
  }

  const rules: string[] = [];

  // Headings font
  if (extras.fontHeading && extras.fontHeading.trim()) {
    rules.push(
      `h1,h2,h3,h4,h5,h6,.font-display{font-family:${extras.fontHeading},'Space Grotesk',sans-serif !important;}`,
    );
  }

  // Font sans no body
  if (extras.fontSans && extras.fontSans.trim()) {
    rules.push(`body, * { font-family: ${extras.fontSans}, ui-sans-serif, system-ui, sans-serif !important; }`);
  }

  // Letter spacing
  if (typeof extras.letterSpacing === "number") {
    rules.push(`body{letter-spacing:${extras.letterSpacing}em;}`);
  }

  // Shadow intensity
  if (typeof extras.shadowIntensity === "number") {
    const k = Math.max(0, extras.shadowIntensity);
    rules.push(
      `:root{--shadow-card:0 ${4 * k}px ${24 * k}px hsl(0 0% 0% / ${0.3 * k});` +
        `--shadow-glow:0 0 ${30 * k}px hsl(var(--primary) / ${0.12 * k});}`,
    );
  }

  // Background image / gradient on body
  const gradients = extras.gradients || {};
  const bgGrad = gradients.background;
  const bgImage = extras.backgroundImage;
  const bgLayers: string[] = [];
  if (bgImage) {
    const overlay = extras.backgroundOpacity ?? 0;
    if (overlay > 0) {
      bgLayers.push(`linear-gradient(hsl(var(--background) / ${overlay}), hsl(var(--background) / ${overlay}))`);
    }
    bgLayers.push(`url("${bgImage}")`);
  } else if (bgGrad?.enabled) {
    bgLayers.push(buildGradientCss(bgGrad));
  }
  if (bgLayers.length) {
    const size = bgImage ? extras.backgroundSize || "cover" : "auto";
    const pos = bgImage ? extras.backgroundPosition || "center" : "0 0";
    const blur = extras.backgroundBlur || 0;
    rules.push(
      `body{background-image:${bgLayers.join(",")} !important;` +
        `background-color: transparent !important;` +
        `background-size:${size};background-position:${pos};background-attachment:fixed;background-repeat:no-repeat;}` +
        `body > #root > .bg-background{background-color: transparent !important;}`,
    );
    if (blur > 0) {
      rules.push(
        `body::before{content:'';position:fixed;inset:0;backdrop-filter:blur(${blur}px);pointer-events:none;z-index:-1;}`,
      );
    }
  }

  // Card gradient
  if (gradients.card?.enabled) {
    const css = buildGradientCss(gradients.card);
    rules.push(`:root{--gradient-card:${css};}`);
    rules.push(`.bg-card{background-image:${css} !important;}`);
  }

  // Primary gradient
  if (gradients.primary?.enabled) {
    const css = buildGradientCss(gradients.primary);
    rules.push(`.bg-primary{background-image:${css} !important;}`);
  }

  // Accent gradient
  if (gradients.accent?.enabled) {
    const css = buildGradientCss(gradients.accent);
    rules.push(`.bg-accent{background-image:${css} !important;}`);
  }

  // Sidebar gradient
  if (gradients.sidebar?.enabled) {
    const css = buildGradientCss(gradients.sidebar);
    rules.push(`[data-sidebar="sidebar"],aside.app-sidebar{background-image:${css} !important;}`);
  }

  // Button gradient
  if (gradients.button?.enabled) {
    const css = buildGradientCss(gradients.button);
    rules.push(`button.bg-primary,.btn-primary,[data-variant="default"]{background-image:${css} !important;}`);
  }

  // Uploaded fonts (@font-face)
  if (extras.uploadedFonts?.length) {
    const faces = extras.uploadedFonts.map(
      (f) => `@font-face { font-family: '${f.name}'; src: url('${f.url}') format('${f.format}'); font-display: swap; }`,
    );
    rules.push(faces.join("\n"));
  }

  style.textContent = rules.join("\n");
}

export function SkinProvider({ children }: { children: ReactNode }) {
  const [customSkins, setCustomSkins] = useState<Skin[]>(() => loadCustomSkins());
  const [activeId, setActiveId] = useState<string>(() => {
    if (typeof window === "undefined") return "default-dark";
    return localStorage.getItem(STORAGE_KEY_ACTIVE) || "default-dark";
  });
  const importSkins: SkinContextValue["importSkins"] = useCallback((incoming) => {
    // Migra backgroundImages para IndexedDB antes de adicionar ao estado
    const processed = incoming.map((s) => {
      const bgImage = s.extras?.backgroundImage;
      if (bgImage && bgImage.startsWith("data:")) {
        saveImage(s.id, "backgroundImage", bgImage).catch(console.error);
        return {
          ...s,
          extras: { ...(s.extras || {}), backgroundImage: `idb:${s.id}:backgroundImage` },
        };
      }
      return s;
    });

    setCustomSkins((prev) => {
      const existingIds = new Set(prev.map((s) => s.id));
      const toAdd = processed.map((s) =>
        existingIds.has(s.id)
          ? { ...s, id: `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}` }
          : s,
      );
      return [...prev, ...toAdd];
    });
  }, []);

  const skins = useMemo<Skin[]>(() => [...BUILTIN_SKINS, ...customSkins], [customSkins]);

  const activeSkin = useMemo<Skin>(() => skins.find((s) => s.id === activeId) || BUILTIN_SKINS[0], [skins, activeId]);

  // Persist custom skins
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_CUSTOM, JSON.stringify(customSkins));
    } catch (error) {
      console.error("Erro ao guardar skins", error);
      // Tenta salvar sem as imagens de fundo para não travar o app
      try {
        const skinsWithoutImages = customSkins.map((s) => ({
          ...s,
          extras: s.extras ? { ...s.extras, backgroundImage: null, uploadedFonts: [] } : s.extras,
          logoUrl: undefined,
        }));
        localStorage.setItem(STORAGE_KEY_CUSTOM, JSON.stringify(skinsWithoutImages));
        console.warn("Skins salvas sem imagens (quota excedida)");
      } catch {
        console.error("Não foi possível salvar skins nem sem imagens");
      }
    }
  }, [customSkins]);

  // Apply active skin — resolve imagens do IndexedDB antes de aplicar
  useEffect(() => {
    async function apply() {
      let skin = activeSkin;
      if (skin.extras?.backgroundImage?.startsWith("idb:")) {
        const [, skinId, key] = skin.extras.backgroundImage.split(":");
        const dataUrl = await loadImage(skinId, key);
        skin = { ...skin, extras: { ...skin.extras, backgroundImage: dataUrl } };
      }
      applySkinToDocument(skin);
    }
    apply();
    try {
      localStorage.setItem(STORAGE_KEY_ACTIVE, activeSkin.id);
    } catch {
      /* ignore */
    }
  }, [activeSkin]);

  const setActiveSkin = useCallback((id: string) => setActiveId(id), []);

  const createCustomSkin = useCallback(
    ({ label, base, from }: { label: string; base?: "light" | "dark"; from?: Skin }): Skin => {
      const id = `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      const skin: Skin = {
        id,
        label: label.trim() || "Skin personalizada",
        base: base ?? from?.base ?? "dark",
        tokens: from ? { ...from.tokens } : {},
      };
      setCustomSkins((prev) => [...prev, skin]);
      setActiveId(id);
      return skin;
    },
    [],
  );

  const updateCustomSkin: SkinContextValue["updateCustomSkin"] = useCallback((id, patch) => {
    setCustomSkins((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch, tokens: patch.tokens ?? s.tokens } : s)));
  }, []);

  const setCustomToken: SkinContextValue["setCustomToken"] = useCallback((id, tokenKey, value) => {
    setCustomSkins((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const next = { ...s.tokens };
        if (value === null || value === "") delete next[tokenKey];
        else next[tokenKey] = value;
        return { ...s, tokens: next };
      }),
    );
  }, []);

  const resetCustomSkin: SkinContextValue["resetCustomSkin"] = useCallback((id) => {
    setCustomSkins((prev) => prev.map((s) => (s.id === id ? { ...s, tokens: {} } : s)));
  }, []);

  const deleteCustomSkin: SkinContextValue["deleteCustomSkin"] = useCallback((id) => {
    setCustomSkins((prev) => prev.filter((s) => s.id !== id));
    setActiveId((current) => (current === id ? "default-dark" : current));
    deleteImages(id).catch(console.error);
  }, []);

  const duplicateSkin: SkinContextValue["duplicateSkin"] = useCallback(
    (id, label) => {
      const source = [...BUILTIN_SKINS, ...customSkins].find((s) => s.id === id);
      if (!source) return null;
      return createCustomSkin({
        label: label || `${source.label} (cópia)`,
        base: source.base,
        from: source,
      });
    },
    [customSkins, createCustomSkin],
  );

  const setCustomLogo: SkinContextValue["setCustomLogo"] = useCallback((id, logoUrl) => {
    setCustomSkins((prev) => prev.map((s) => (s.id === id ? { ...s, logoUrl: logoUrl ?? undefined } : s)));
  }, []);

  const updateExtras: SkinContextValue["updateExtras"] = useCallback((id, patch) => {
    if (patch.backgroundImage && patch.backgroundImage.startsWith("data:")) {
      saveImage(id, "backgroundImage", patch.backgroundImage).catch(console.error);
      patch = { ...patch, backgroundImage: `idb:${id}:backgroundImage` };
    }
    setCustomSkins((prev) => prev.map((s) => (s.id === id ? { ...s, extras: { ...(s.extras || {}), ...patch } } : s)));
  }, []);

  const setGradient: SkinContextValue["setGradient"] = useCallback((id, target, value) => {
    setCustomSkins((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const gradients = { ...(s.extras?.gradients || {}) };
        if (value === null) delete gradients[target];
        else gradients[target] = value;
        return { ...s, extras: { ...(s.extras || {}), gradients } };
      }),
    );
  }, []);

  const value: SkinContextValue = {
    skins,
    activeSkin,
    setActiveSkin,
    createCustomSkin,
    updateCustomSkin,
    setCustomToken,
    updateExtras,
    setGradient,
    resetCustomSkin,
    deleteCustomSkin,
    duplicateSkin,
    importSkins,
    setCustomLogo,
  };

  return <SkinContext.Provider value={value}>{children}</SkinContext.Provider>;
}

export function useSkin(): SkinContextValue {
  const ctx = useContext(SkinContext);
  if (!ctx) throw new Error("useSkin must be used inside <SkinProvider>");
  return ctx;
}

/* ----------------------- HSL <-> HEX helpers ----------------------- */

/** Parse a token value like "222 47% 8%" to {h,s,l} numbers. */
export function parseHslToken(value: string | undefined): { h: number; s: number; l: number } | null {
  if (!value) return null;
  const m = value.trim().match(/^(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)%\s+(-?\d+(?:\.\d+)?)%$/);
  if (!m) return null;
  return { h: parseFloat(m[1]), s: parseFloat(m[2]), l: parseFloat(m[3]) };
}

export function hslTokenToHex(value: string | undefined): string | null {
  const hsl = parseHslToken(value);
  if (!hsl) return null;
  return hslToHex(hsl.h, hsl.s, hsl.l);
}

export function hexToHslToken(hex: string): string | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  const { h, s, l } = rgbToHsl(rgb.r, rgb.g, rgb.b);
  return `${Math.round(h)} ${Math.round(s)}% ${Math.round(l)}%`;
}

/** Resolve the effective HSL token value for a key on a given skin, falling back to defaults. */
export function resolveTokenValue(skin: Skin, key: string): string | undefined {
  if (skin.tokens[key]) return skin.tokens[key]!;
  // Read from a temporary element configured with the skin's base mode
  if (typeof window === "undefined") return undefined;
  const probe = document.createElement("div");
  probe.className = skin.base === "light" ? "light" : "dark";
  probe.style.position = "absolute";
  probe.style.visibility = "hidden";
  document.body.appendChild(probe);
  const computed = getComputedStyle(probe).getPropertyValue(`--${key}`).trim();
  document.body.removeChild(probe);
  return computed || undefined;
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const color = l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const h = hex.replace("#", "").trim();
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h *= 60;
  }
  return { h, s: s * 100, l: l * 100 };
}

/** Exporta skins customizadas como JSON string */
export function exportSkinsJson(skins: Skin[]): string {
  return JSON.stringify(skins, null, 2);
}

/** Valida e parseia um JSON de skins importado */
/** Valida e parseia um JSON de skins importado */
export function parseImportedSkins(raw: string): Skin[] {
  const parsed = JSON.parse(raw);
  const arr = Array.isArray(parsed) ? parsed : [parsed];
  return arr
    .filter((s) => s && typeof s.id === "string" && typeof s.label === "string" && typeof s.tokens === "object")
    .map((s) => ({
      ...s,
      builtin: false, // só isso — preserva o ID original
    }));
}
