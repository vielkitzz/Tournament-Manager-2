import { toPng } from "html-to-image";
import { toast } from "sonner";

export async function captureScreenshot(element: HTMLElement, filename: string = "screenshot.png") {
  try {
    toast.info("Capturando imagem...");
    const dataUrl = await toPng(element, {
      backgroundColor: getComputedStyle(document.documentElement).getPropertyValue("--background")
        ? `hsl(${getComputedStyle(document.documentElement).getPropertyValue("--background").trim()})`
        : "#0a0a0a",
      cacheBust: true,
      pixelRatio: 2,
    });

    // Try to share if available, otherwise download
    if (navigator.share && navigator.canShare) {
      try {
        const blob = await (await fetch(dataUrl)).blob();
        const file = new File([blob], filename, { type: "image/png" });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: filename.replace(".png", "") });
          return;
        }
      } catch {
        // Fall through to download
      }
    }

    // Download fallback
    const link = document.createElement("a");
    link.download = filename;
    link.href = dataUrl;
    link.click();
    toast.success("Imagem salva!");
  } catch (err) {
    console.error("Screenshot error:", err);
    toast.error("Erro ao capturar imagem");
  }
}
