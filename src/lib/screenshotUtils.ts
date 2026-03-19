import { toPng } from "html-to-image";
import { toast } from "sonner";

export async function captureScreenshot(element: HTMLElement, filename: string = "screenshot.png") {
  try {
    toast.info("Capturando imagem...");

    // Save and override styles to prevent scrollbars and clipping
    const originalOverflow = element.style.overflow;
    const originalMaxHeight = element.style.maxHeight;
    const originalMaxWidth = element.style.maxWidth;
    const originalWidth = element.style.width;
    const originalHeight = element.style.height;

    // Also fix all scrollable children
    const scrollableChildren: { el: HTMLElement; overflow: string; maxHeight: string }[] = [];
    element.querySelectorAll("*").forEach((child) => {
      const el = child as HTMLElement;
      const style = getComputedStyle(el);
      if (style.overflow === "auto" || style.overflow === "scroll" ||
          style.overflowX === "auto" || style.overflowX === "scroll" ||
          style.overflowY === "auto" || style.overflowY === "scroll") {
        scrollableChildren.push({
          el,
          overflow: el.style.overflow,
          maxHeight: el.style.maxHeight,
        });
        el.style.overflow = "visible";
        el.style.maxHeight = "none";
      }
    });

    element.style.overflow = "visible";
    element.style.maxHeight = "none";
    element.style.maxWidth = "none";

    // Wait a frame for layout recalc
    await new Promise((r) => requestAnimationFrame(r));

    const captureWidth = element.scrollWidth;
    const captureHeight = element.scrollHeight;

    const dataUrl = await toPng(element, {
      backgroundColor: getComputedStyle(document.documentElement).getPropertyValue("--background")
        ? `hsl(${getComputedStyle(document.documentElement).getPropertyValue("--background").trim()})`
        : "#0a0a0a",
      cacheBust: true,
      pixelRatio: 2,
      width: captureWidth,
      height: captureHeight,
      style: {
        overflow: "visible",
        maxHeight: "none",
        maxWidth: "none",
      },
    });

    // Restore original styles
    element.style.overflow = originalOverflow;
    element.style.maxHeight = originalMaxHeight;
    element.style.maxWidth = originalMaxWidth;
    element.style.width = originalWidth;
    element.style.height = originalHeight;
    scrollableChildren.forEach(({ el, overflow, maxHeight }) => {
      el.style.overflow = overflow;
      el.style.maxHeight = maxHeight;
    });

    // Copy to clipboard
    try {
      const blob = await (await fetch(dataUrl)).blob();
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);
      toast.success("Imagem copiada para a área de transferência!");
    } catch {
      try {
        const blob = await (await fetch(dataUrl)).blob();
        const file = new File([blob], filename, { type: "image/png" });
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: filename.replace(".png", "") });
          return;
        }
      } catch {
        // Fall through to download
      }
      const link = document.createElement("a");
      link.download = filename;
      link.href = dataUrl;
      link.click();
      toast.success("Imagem salva!");
    }
  } catch (err) {
    console.error("Screenshot error:", err);
    toast.error("Erro ao capturar imagem");
  }
}
