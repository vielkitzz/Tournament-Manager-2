import { toPng } from "html-to-image";
import { toast } from "sonner";

export async function captureScreenshot(element: HTMLElement, filename: string = "screenshot.png") {
  try {
    toast.info("Capturando imagem...");

    // Salva e altera os estilos originais para evitar barras de rolagem
    const originalOverflow = element.style.overflow;
    const originalMaxHeight = element.style.maxHeight;
    const originalMaxWidth = element.style.maxWidth;
    const originalWidth = element.style.width;
    const originalHeight = element.style.height;

    const scrollableChildren: { el: HTMLElement; overflow: string; maxHeight: string }[] = [];
    element.querySelectorAll("*").forEach((child) => {
      const el = child as HTMLElement;
      const style = getComputedStyle(el);
      if (
        style.overflow === "auto" ||
        style.overflow === "scroll" ||
        style.overflowX === "auto" ||
        style.overflowX === "scroll" ||
        style.overflowY === "auto" ||
        style.overflowY === "scroll"
      ) {
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

    const rawBg = getComputedStyle(document.documentElement).getPropertyValue("--background").trim();
    const bgColor = rawBg ? `hsl(${rawBg.replace(/\s+/g, ", ")})` : "#0a0a0a";
    const padding = 32;

    // 🔥 A MÁGICA ESTÁ AQUI: Capturamos os estilos de background que estão no Body
    const bodyStyle = getComputedStyle(document.body);
    const hasBgImage = bodyStyle.backgroundImage && bodyStyle.backgroundImage !== "none";

    const dataUrl = await toPng(element, {
      backgroundColor: hasBgImage ? "transparent" : bgColor, // Transparente se houver imagem
      cacheBust: true,
      pixelRatio: 2,
      width: captureWidth + padding * 2,
      height: captureHeight + padding * 2,
      skipFonts: true,
      filter: (node) => {
        if (!(node instanceof HTMLElement)) return true;
        if (node.dataset?.screenshotIgnore === "true") return false;
        return true;
      },
      style: {
        overflow: "visible",
        maxHeight: "none",
        maxWidth: "none",
        padding: `${padding}px`,
        // 🔥 APLICA O BACKGROUND GLOBAL NESTE ELEMENTO APENAS PARA O PRINT
        ...(hasBgImage && {
          backgroundImage: bodyStyle.backgroundImage,
          backgroundSize: bodyStyle.backgroundSize,
          backgroundPosition: bodyStyle.backgroundPosition,
          backgroundRepeat: bodyStyle.backgroundRepeat,
          backgroundColor: bgColor, // Cor de fundo sólida atrás da imagem
        }),
      },
    });

    // Restaura os estilos
    element.style.overflow = originalOverflow;
    element.style.maxHeight = originalMaxHeight;
    element.style.maxWidth = originalMaxWidth;
    element.style.width = originalWidth;
    element.style.height = originalHeight;
    scrollableChildren.forEach(({ el, overflow, maxHeight }) => {
      el.style.overflow = overflow;
      el.style.maxHeight = maxHeight;
    });

    // Copia para a área de transferência / Download
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
