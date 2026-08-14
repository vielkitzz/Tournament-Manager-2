import { toPng } from "html-to-image";
import { toast } from "sonner";
import {
  DEFAULT_PHOTO_MODE,
  PhotoModeSettings,
  paletteCss,
  contrastCss,
  photoBackground,
} from "@/lib/photoMode";

function escapeHtml(v: string) {
  return v.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));
}

function collectHeadStyles(): string {
  const parts: string[] = [];
  document.querySelectorAll('link[rel="stylesheet"]').forEach((l) => {
    const href = (l as HTMLLinkElement).href;
    if (href) parts.push(`<link rel="stylesheet" href="${href}">`);
  });
  document.querySelectorAll("style").forEach((s) => {
    parts.push(`<style>${s.textContent || ""}</style>`);
  });
  return parts.join("\n");
}

/**
 * Design tokens read explicitly: Safari/iOS (and older Chrome) do NOT enumerate
 * custom properties in getComputedStyle, so relying only on the index-based loop
 * silently dropped the theme and the capture fell back to the light defaults
 * (white cards + light text = unreadable screenshots).
 */
const TOKENS = [
  "background", "foreground", "card", "card-foreground", "popover", "popover-foreground",
  "primary", "primary-foreground", "secondary", "secondary-foreground", "muted", "muted-foreground",
  "accent", "accent-foreground", "destructive", "destructive-foreground", "border", "input", "ring",
  "radius", "warning", "warning-foreground", "success", "info", "highlight",
  "sidebar-background", "sidebar-foreground", "sidebar-primary", "sidebar-primary-foreground",
  "sidebar-accent", "sidebar-accent-foreground", "sidebar-border", "sidebar-ring",
  "gradient-card", "shadow-glow", "shadow-card", "font-sans",
];

function inlineVars(source: HTMLElement): string {
  const grab = (el: Element) => {
    const cs = getComputedStyle(el);
    const seen = new Set<string>();
    const out: string[] = [];
    for (let i = 0; i < cs.length; i++) {
      const p = cs[i];
      if (p.startsWith("--")) {
        seen.add(p);
        out.push(`${p}: ${cs.getPropertyValue(p)};`);
      }
    }
    TOKENS.forEach((t) => {
      const name = `--${t}`;
      if (seen.has(name)) return;
      const v = cs.getPropertyValue(name);
      if (v && v.trim()) out.push(`${name}: ${v.trim()};`);
    });
    return out.join("");
  };
  return `:root{${grab(document.documentElement)}}body{${grab(document.body)}}` + `#capture-root{${grab(source)}}`;
}

async function waitForAssets(doc: Document, timeout = 4000) {
  const imgs = Array.from(doc.images);
  const pending = imgs
    .filter((img) => !img.complete || img.naturalWidth === 0)
    .map(
      (img) =>
        new Promise<void>((res) => {
          img.addEventListener("load", () => res(), { once: true });
          img.addEventListener("error", () => res(), { once: true });
        })
    );
  const fonts = (doc as any).fonts?.ready ? [(doc as any).fonts.ready] : [];
  await Promise.race([
    Promise.all([...pending, ...fonts]),
    new Promise((res) => setTimeout(res, timeout)),
  ]);
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(null))));
}

async function waitForImage(img: HTMLImageElement, timeout = 5000) {
  if (img.complete && img.naturalWidth > 0) {
    try {
      await img.decode();
    } catch {
      // The browser may reject decode() for an already decoded cached image.
    }
    return;
  }
  await Promise.race([
    new Promise<void>((resolve) => {
      img.addEventListener("load", () => resolve(), { once: true });
      img.addEventListener("error", () => resolve(), { once: true });
    }),
    new Promise<void>((resolve) => setTimeout(resolve, timeout)),
  ]);
}

/**
 * Converts every remote <img> inside the capture clone into a data URL.
 * Without this, cross-origin logos (Supabase Storage) are dropped by
 * html-to-image on mobile Safari/Chrome and shields render empty.
 */
const inlineCache = new Map<string, string>();

async function toDataUrl(url: string): Promise<string | null> {
  if (inlineCache.has(url)) return inlineCache.get(url)!;
  const absoluteUrl = new URL(url, window.location.href).href;
  const candidates = [absoluteUrl];
  const parsed = new URL(absoluteUrl);
  if (parsed.searchParams.has("t")) {
    parsed.searchParams.delete("t");
    candidates.push(parsed.href);
  }

  for (const candidate of candidates) {
    try {
      // no-store avoids occasional empty/stale Storage responses on mobile WebKit.
      const res = await fetch(candidate, { mode: "cors", cache: "no-store" });
      if (!res.ok) continue;
      const blob = await res.blob();
      if (!blob.size || !blob.type.startsWith("image/")) continue;
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = () => resolve(String(fr.result));
        fr.onerror = () => reject(fr.error);
        fr.readAsDataURL(blob);
      });
      inlineCache.set(url, dataUrl);
      return dataUrl;
    } catch {
      // Try the URL without the cache-busting query parameter when available.
    }
  }
  return null;
}

async function inlineImages(root: HTMLElement) {
  const imgs = Array.from(root.querySelectorAll("img"));
  await Promise.all(
    imgs.map(async (img) => {
      const src = img.getAttribute("src") || "";
      if (!src) return;
      if (src.startsWith("data:")) {
        await waitForImage(img);
        return;
      }
      const dataUrl = await toDataUrl(src);
      if (dataUrl) {
        img.removeAttribute("crossorigin");
        img.removeAttribute("srcset");
        img.setAttribute("src", dataUrl);
        await waitForImage(img);
      }
    })
  );
}

/**
 * Renders a clone of the element inside an off-screen iframe with a desktop-sized
 * viewport, so responsive (mobile) layouts don't clip or hide content in the export.
 */
async function renderInDesktopFrame(
  element: HTMLElement,
  padding: number,
  bgColor: string,
  bodyStyle: CSSStyleDeclaration,
  photo: PhotoModeSettings
) {
  const scale = Math.min(2, Math.max(0.8, photo.scale || 1));
  // Content is laid out in rem, so scaling the root font-size enlarges everything.
  // Wide layouts (brackets) must keep their natural width, otherwise columns get
  // squeezed and team names break vertically.
  // The frame width is not multiplied by scale: font scaling already enlarges the
  // layout. Multiplying both produced very wide canvases with distant information.
  const width = Math.min(6000, Math.max(720, Math.round(photo.width)));

  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText = `position:fixed;left:-10000px;top:0;border:0;width:${width}px;height:${Math.max(
    600,
    element.scrollHeight + 200
  )}px;`;
  document.body.appendChild(iframe);

  try {
    const doc = iframe.contentDocument;
    if (!doc) throw new Error("Não foi possível preparar o modo foto");
    const themeClass = document.documentElement.className;
    const themeAttr = document.documentElement.getAttribute("data-theme") || "";
    const hasBgImage =
      photo.palette !== "custom" && bodyStyle.backgroundImage && bodyStyle.backgroundImage !== "none";

    doc.open();
    doc.write(`<!DOCTYPE html><html class="${themeClass}" data-theme="${themeAttr}"><head><meta charset="utf-8">${collectHeadStyles()}
<style>${inlineVars(element)}
${paletteCss(photo)}
${contrastCss(photo)}
html{font-size:${(16 * scale).toFixed(2)}px;}
 html,body{margin:0;padding:0;background:${bgColor} !important;min-width:${width}px;}
 #capture-root{display:inline-block;min-width:${width}px;width:max-content;box-sizing:border-box;padding:${padding}px;background:${bgColor} !important;color:hsl(var(--foreground));${
      hasBgImage
        ? `background-image:${bodyStyle.backgroundImage};background-size:${bodyStyle.backgroundSize};background-position:${bodyStyle.backgroundPosition};background-repeat:${bodyStyle.backgroundRepeat};`
        : ""
    }}
#capture-root *{overflow:visible !important;max-height:none !important;}
 #capture-root [data-screenshot-ignore="true"]{display:none !important;}
 #capture-root [data-photo-control="true"]{display:none !important;}
#photo-header{display:flex;align-items:center;gap:0.9rem;margin-bottom:1.4rem;padding-bottom:1rem;border-bottom:2px solid hsl(var(--primary));}
#photo-header .bar{width:0.35rem;align-self:stretch;min-height:2.6rem;border-radius:999px;background:hsl(var(--primary));}
#photo-header h1{margin:0;font-size:1.65rem;line-height:1.15;font-weight:800;letter-spacing:-0.02em;color:hsl(var(--foreground));}
#photo-header p{margin:0.25rem 0 0;font-size:0.95rem;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:hsl(var(--primary));}
</style></head><body><div id="capture-root"></div></body></html>`);
    doc.close();

    const root = doc.getElementById("capture-root");
    if (!root) throw new Error("Área de captura não encontrada");
    if (photo.showHeader && (photo.title || photo.subtitle)) {
      const header = doc.createElement("div");
      header.id = "photo-header";
      header.innerHTML = `<span class="bar"></span><div><h1>${escapeHtml(photo.title || "")}</h1>${
        photo.subtitle ? `<p>${escapeHtml(photo.subtitle)}</p>` : ""
      }</div>`;
      root.appendChild(header);
    }
    const clone = element.cloneNode(true) as HTMLElement;
    clone.style.overflow = "visible";
    clone.style.maxHeight = "none";
    clone.style.maxWidth = "none";
    // max-content keeps brackets aligned; min-width fills the frame for tables/rounds.
    clone.style.width = "max-content";
    clone.style.minWidth = "0";
    root.appendChild(clone);

    // Embed remote logos before rasterizing (fixes missing shields on mobile)
    await inlineImages(clone);

    // Mirror scroll positions away and let layout settle
    await waitForAssets(doc);

    // Bump any text that is still too small to read on a phone screen.
    const minFont = 12 * scale;
    root.querySelectorAll<HTMLElement>("*").forEach((el) => {
      const fs = parseFloat(doc.defaultView?.getComputedStyle(el).fontSize || "0");
      if (fs > 0 && fs < minFont) el.style.fontSize = `${minFont.toFixed(1)}px`;
    });
    await new Promise((r) => requestAnimationFrame(r));

    const w = Math.ceil(root.scrollWidth);
    const h = Math.ceil(root.scrollHeight);
    iframe.style.height = `${h + 40}px`;
    iframe.style.width = `${w + 40}px`;
    await new Promise((r) => requestAnimationFrame(r));

    // Keep Discord uploads comfortable: cap total pixels while staying sharp
    const budget = photo.maxPixels || DEFAULT_PHOTO_MODE.maxPixels;
    const ratio = Math.min(2, Math.max(0.75, Math.sqrt(budget / Math.max(1, w * h))));

    return await toPng(root as HTMLElement, {
      backgroundColor: hasBgImage ? undefined : bgColor,
      cacheBust: false,
      pixelRatio: ratio,
      width: w,
      height: h,
      skipFonts: true,
    });
  } finally {
    iframe.remove();
  }
}

/** Renders the element and returns the resulting PNG data URL. */
export async function captureScreenshotDataUrl(
  element: HTMLElement,
  photoSettings?: Partial<PhotoModeSettings>
): Promise<string> {
  const photo: PhotoModeSettings = { ...DEFAULT_PHOTO_MODE, ...(photoSettings || {}) };
  const rootStyle = getComputedStyle(document.documentElement);
  const rawBg = rootStyle.getPropertyValue("--background").trim();
  const bodyStyle = getComputedStyle(document.body);
  const bodyBg = bodyStyle.backgroundColor;
  const themeBg = bodyBg && bodyBg !== "rgba(0, 0, 0, 0)" && bodyBg !== "transparent"
    ? bodyBg
    : rawBg
      ? `hsl(${rawBg})`
      : "#0a0a0a";
  const bgColor = photoBackground(photo, themeBg);
  const padding = Math.round((photo.padding ?? 32) * Math.min(2, Math.max(0.8, photo.scale || 1)));

  try {
    return await renderInDesktopFrame(element, padding, bgColor, bodyStyle, photo);
  } catch (frameErr) {
    console.warn("Desktop frame capture failed, falling back to inline capture:", frameErr);
    return await captureInline(element, padding, bgColor, bodyStyle);
  }
}

/** Copies a PNG data URL to the clipboard, falling back to a download. */
export async function copyOrDownload(dataUrl: string, filename: string) {
  try {
    const blobPromise = fetch(dataUrl).then((r) => r.blob());
    if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blobPromise })]);
      toast.success("Imagem copiada para a área de transferência!");
      return;
    }
    throw new Error("Clipboard API indisponível");
  } catch (err) {
    console.warn("Clipboard copy failed, falling back to download:", err);
    downloadDataUrl(dataUrl, filename);
  }
}

export function downloadDataUrl(dataUrl: string, filename: string) {
  const link = document.createElement("a");
  link.download = filename;
  link.href = dataUrl;
  link.click();
  toast.success("Imagem salva com sucesso!");
}

export async function captureScreenshot(element: HTMLElement, filename: string = "screenshot.png") {
  try {
    toast.info("Capturando imagem...");
    const dataUrl = await captureScreenshotDataUrl(element);
    await copyOrDownload(dataUrl, filename);
  } catch (err) {
    console.error("Screenshot error:", err);
    const message = err instanceof Error ? err.message : String(err);
    toast.error(`Erro ao capturar imagem: ${message.slice(0, 120)}`);
  }
}

/** Legacy in-place capture, used only if the isolated frame fails. */
async function captureInline(element: HTMLElement, padding: number, bgColor: string, bodyStyle: CSSStyleDeclaration) {
  const original = {
    overflow: element.style.overflow,
    maxHeight: element.style.maxHeight,
    maxWidth: element.style.maxWidth,
    width: element.style.width,
  };

  const scrollableChildren: { el: HTMLElement; overflow: string; maxHeight: string }[] = [];
  element.querySelectorAll("*").forEach((child) => {
    const el = child as HTMLElement;
    const style = getComputedStyle(el);
    if (/(auto|scroll)/.test(`${style.overflow}${style.overflowX}${style.overflowY}`)) {
      scrollableChildren.push({ el, overflow: el.style.overflow, maxHeight: el.style.maxHeight });
      el.style.overflow = "visible";
      el.style.maxHeight = "none";
    }
  });

  element.style.overflow = "visible";
  element.style.maxHeight = "none";
  element.style.maxWidth = "none";
  await new Promise((r) => requestAnimationFrame(r));

  const captureWidth = element.scrollWidth;
  const captureHeight = element.scrollHeight;
  const hasBgImage = bodyStyle.backgroundImage && bodyStyle.backgroundImage !== "none";

  try {
    return await toPng(element, {
      backgroundColor: hasBgImage ? undefined : bgColor,
      cacheBust: true,
      pixelRatio: 2,
      width: captureWidth + padding * 2,
      height: captureHeight + padding * 2,
      skipFonts: true,
      filter: (node) => !(node instanceof HTMLElement) || node.dataset?.screenshotIgnore !== "true",
      style: {
        overflow: "visible",
        maxHeight: "none",
        maxWidth: "none",
        padding: `${padding}px`,
        ...(hasBgImage && {
          backgroundImage: bodyStyle.backgroundImage,
          backgroundSize: bodyStyle.backgroundSize,
          backgroundPosition: bodyStyle.backgroundPosition,
          backgroundRepeat: bodyStyle.backgroundRepeat,
          backgroundColor: bgColor,
        }),
      },
    });
  } finally {
    element.style.overflow = original.overflow;
    element.style.maxHeight = original.maxHeight;
    element.style.maxWidth = original.maxWidth;
    element.style.width = original.width;
    scrollableChildren.forEach(({ el, overflow, maxHeight }) => {
      el.style.overflow = overflow;
      el.style.maxHeight = maxHeight;
    });
  }
}
