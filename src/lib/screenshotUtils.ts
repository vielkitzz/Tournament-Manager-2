import { toPng } from "html-to-image";
import { toast } from "sonner";

export async function captureScreenshot(element: HTMLElement, filename: string = "screenshot.png") {
  try {
    toast.info("Capturando imagem...");

    // Force the element to render at full size for capture (no clipping)
    const originalOverflow = element.style.overflow;
    const originalMaxHeight = element.style.maxHeight;
    element.style.overflow = "visible";
    element.style.maxHeight = "none";

    const dataUrl = await toPng(element, {
      backgroundColor: getComputedStyle(document.documentElement).getPropertyValue("--background")
        ? `hsl(${getComputedStyle(document.documentElement).getPropertyValue("--background").trim()})`
        : "#0a0a0a",
      cacheBust: true,
      pixelRatio: 2,
      width: element.scrollWidth,
      height: element.scrollHeight,
      style: {
        overflow: "visible",
        maxHeight: "none",
      },
    });

    // Restore original styles
    element.style.overflow = originalOverflow;
    element.style.maxHeight = originalMaxHeight;

    // Copy to clipboard
    try {
      const blob = await (await fetch(dataUrl)).blob();
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);
      toast.success("Imagem copiada para a área de transferência!");
    } catch {
      // Fallback: try share, then download
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

      // Download fallback
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
