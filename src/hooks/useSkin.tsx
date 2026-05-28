import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";

/**
 * Skin system
 * — A skin is a set of overrides applied on top of the base theme (light/dark).
 * — Tokens use HSL triplet strings (ex.: "222 47% 8%") matching index.css.
 * — Built-in presets are immutable; user-defined skins are fully editable.
 * — Applied directly to <html> via inline custom properties so every component
 *   that reads the existing semantic tokens reacts instantly.
 */

export type SkinTokens = Partial<Record<string, string>>;

export interface Skin {
  id: string;
  label: string;
  description?: string;
  builtin?: boolean;
  base: "light" | "dark";
  tokens: SkinTokens;
  logoUrl?: string; // ← adicionar esta linha
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
    tokens: {
      success: "142 71% 45%",
      warning: "38 92% 50%",
      info: "199 89% 48%",
      highlight: "48 96% 53%",
    },
  },
  {
    id: "default-light",
    label: "Padrão Claro",
    description: "Tema claro padrão do app",
    builtin: true,
    base: "light",
    tokens: {
      success: "142 71% 35%",
      warning: "32 95% 44%",
      info: "199 89% 38%",
      highlight: "45 93% 47%",
    },
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

interface SkinContextValue {
  skins: Skin[];
  activeSkin: Skin;
  setActiveSkin: (id: string) => void;
  createCustomSkin: (input: { label: string; base?: "light" | "dark"; from?: Skin }) => Skin;
  updateCustomSkin: (id: string, patch: Partial<Pick<Skin, "label" | "description" | "base" | "tokens">>) => void;
  setCustomToken: (id: string, tokenKey: string, value: string | null) => void;
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

function applySkinToDocument(skin: Skin) {
  const root = document.documentElement;
  // Base mode (controls index.css :root vs .light)
  root.classList.toggle("light", skin.base === "light");
  root.classList.toggle("dark", skin.base === "dark");
  root.setAttribute("data-skin", skin.id);

  // Clear previously injected token overrides
  ALL_TOKEN_KEYS.forEach((key) => {
    root.style.removeProperty(`--${key}`);
  });
  // Apply new overrides
  Object.entries(skin.tokens).forEach(([key, value]) => {
    if (typeof value === "string" && value.trim()) {
      root.style.setProperty(`--${key}`, value);
    }
  });
}

export function SkinProvider({ children }: { children: ReactNode }) {
  const [customSkins, setCustomSkins] = useState<Skin[]>(() => loadCustomSkins());
  const [activeId, setActiveId] = useState<string>(() => {
    if (typeof window === "undefined") return "default-dark";
    return localStorage.getItem(STORAGE_KEY_ACTIVE) || "default-dark";
  });
  const importSkins: SkinContextValue["importSkins"] = useCallback((incoming) => {
    setCustomSkins((prev) => [...prev, ...incoming]);
  }, []);

  const skins = useMemo<Skin[]>(() => [...BUILTIN_SKINS, ...customSkins], [customSkins]);

  const activeSkin = useMemo<Skin>(() => skins.find((s) => s.id === activeId) || BUILTIN_SKINS[0], [skins, activeId]);

  // Persist custom skins
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_CUSTOM, JSON.stringify(customSkins));
    } catch {
      /* ignore quota errors */
    }
  }, [customSkins]);

  // Apply active skin
  useEffect(() => {
    applySkinToDocument(activeSkin);
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

  const value: SkinContextValue = {
    skins,
    activeSkin,
    setActiveSkin,
    createCustomSkin,
    updateCustomSkin,
    setCustomToken,
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
export function parseImportedSkins(raw: string): Skin[] {
  const parsed = JSON.parse(raw);
  const arr = Array.isArray(parsed) ? parsed : [parsed];
  return arr
    .filter((s) => s && typeof s.id === "string" && typeof s.label === "string" && typeof s.tokens === "object")
    .map((s, i) => ({
      ...s,
      id: `custom-${(Date.now() + i).toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      builtin: false,
    }));
}
