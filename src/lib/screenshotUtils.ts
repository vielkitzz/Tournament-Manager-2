import { toPng } from "html-to-image";
import { toast } from "sonner";

const CAPTURE_MIN_WIDTH = 1280;

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

function inlineVars(source: HTMLElement): string {
  // Copy every CSS custom property currently resolved on <html> and <body>
  const grab = (el: Element) => {
    const cs = getComputedStyle(el);
    const out: string[] = [];
    for (let i = 0; i < cs.length; i++) {
      const p = cs[i];
      if (p.startsWith("--")) out.push(`${p}: ${cs.getPropertyValue(p)};`);
    }
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

/**
 * Renders a clone of the element inside an off-screen iframe with a desktop-sized
 * viewport, so responsive (mobile) layouts don't clip or hide content in the export.
 */
async function renderInDesktopFrame(element: HTMLElement, padding: number, bgColor: string, bodyStyle: CSSStyleDeclaration) {
  const width = Math.max(CAPTURE_MIN_WIDTH, Math.ceil(element.scrollWidth));

  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText = `position:fixed;left:-10000px;top:0;border:0;width:${width}px;height:${Math.max(
    600,
    element.scrollHeight + 200
  )}px;`;
  document.body.appendChild(iframe);

  try {
    const doc = iframe.contentDocument!;
    const themeClass = document.documentElement.className;
    const themeAttr = document.documentElement.getAttribute("data-theme") || "";
    const hasBgImage = bodyStyle.backgroundImage && bodyStyle.backgroundImage !== "none";

    doc.open();
    doc.write(`<!DOCTYPE html><html class="${themeClass}" data-theme="${themeAttr}"><head><meta charset="utf-8">${collectHeadStyles()}
<style>${inlineVars(element)}
html,body{margin:0;padding:0;background:transparent;width:${width}px;}
#capture-root{display:inline-block;width:${width}px;box-sizing:border-box;padding:${padding}px;background-color:${bgColor};${
      hasBgImage
        ? `background-image:${bodyStyle.backgroundImage};background-size:${bodyStyle.backgroundSize};background-position:${bodyStyle.backgroundPosition};background-repeat:${bodyStyle.backgroundRepeat};`
        : ""
    }}
#capture-root *{overflow:visible !important;max-height:none !important;}
#capture-root [data-screenshot-ignore="true"]{display:none !important;}
</style></head><body><div id="capture-root"></div></body></html>`);
    doc.close();

    const root = doc.getElementById("capture-root")!;
    const clone = element.cloneNode(true) as HTMLElement;
    clone.style.overflow = "visible";
    clone.style.maxHeight = "none";
    clone.style.maxWidth = "none";
    clone.style.width = "100%";
    root.appendChild(clone);

    // Mirror scroll positions away and let layout settle
    await waitForAssets(doc);

    const w = Math.ceil(root.scrollWidth);
    const h = Math.ceil(root.scrollHeight);
    iframe.style.height = `${h + 40}px`;
    await new Promise((r) => requestAnimationFrame(r));

    return await toPng(root as HTMLElement, {
      backgroundColor: hasBgImage ? undefined : bgColor,
      cacheBust: true,
      pixelRatio: 2,
      width: w,
      height: h,
      skipFonts: true,
    });
  } finally {
    iframe.remove();
  }
}

export async function captureScreenshot(element: HTMLElement, filename: string = "screenshot.png") {
  try {
    toast.info("Capturando imagem...");

    const rawBg = getComputedStyle(document.documentElement).getPropertyValue("--background").trim();
    const bgColor = rawBg ? `hsl(${rawBg.replace(/\s+/g, ", ")})` : "#0a0a0a";
    const padding = 32;
    const bodyStyle = getComputedStyle(document.body);

    let dataUrl: string;
    try {
      dataUrl = await renderInDesktopFrame(element, padding, bgColor, bodyStyle);
    } catch (frameErr) {
      console.warn("Desktop frame capture failed, falling back to inline capture:", frameErr);
      dataUrl = await captureInline(element, padding, bgColor, bodyStyle);
    }

    try {
      const blobPromise = fetch(dataUrl).then((r) => r.blob());
      if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blobPromise })]);
        toast.success("Imagem copiada para a área de transferência!");
      } else {
        throw new Error("Clipboard API indisponível");
      }
    } catch (err) {
      console.warn("Clipboard copy failed, falling back to download:", err);
      const link = document.createElement("a");
      link.download = filename;
      link.href = dataUrl;
      link.click();
      toast.success("Imagem salva com sucesso!");
    }
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
