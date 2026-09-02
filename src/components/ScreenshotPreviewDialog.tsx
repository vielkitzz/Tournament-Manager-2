import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Copy, Download, Loader2, Share2 } from "lucide-react";
import { copyOrDownload, downloadDataUrl } from "@/lib/screenshotUtils";
import { toast } from "sonner";

interface ScreenshotPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dataUrl: string | null;
  filename: string;
  loading?: boolean;
}

/** Mobile browsers block clipboard images: sharing the PNG file is the reliable path. */
async function shareImage(dataUrl: string, filename: string) {
  try {
    const blob = await (await fetch(dataUrl)).blob();
    const file = new File([blob], filename, { type: "image/png" });
    const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
    if (nav.canShare?.({ files: [file] }) && nav.share) {
      await nav.share({ files: [file] });
      return;
    }
    downloadDataUrl(dataUrl, filename);
  } catch (err) {
    if ((err as Error)?.name === "AbortError") return;
    toast.error("Não foi possível compartilhar. Baixe a imagem.");
  }
}

export default function ScreenshotPreviewDialog({
  open,
  onOpenChange,
  dataUrl,
  filename,
  loading,
}: ScreenshotPreviewDialogProps) {
  const canShare =
    typeof navigator !== "undefined" && typeof (navigator as Navigator).share === "function";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[min(96vw,1100px)] max-h-[92vh] overflow-hidden flex flex-col gap-3">
        <DialogHeader>
          <DialogTitle className="text-base tracking-tight lowercase">pré-visualização da imagem</DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-[200px] overflow-auto rounded-lg border border-border bg-muted/30 flex items-center justify-center p-2">
          {loading || !dataUrl ? (
            <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground text-xs">
              <Loader2 className="w-5 h-5 animate-spin" />
              Gerando imagem...
            </div>
          ) : (
            <img src={dataUrl} alt="Pré-visualização da captura" className="max-w-full h-auto rounded-md" />
          )}
        </div>

        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 sm:justify-end">
          <button
            type="button"
            disabled={!dataUrl}
            onClick={() => dataUrl && downloadDataUrl(dataUrl, filename)}
            className="px-3 py-2.5 rounded-lg text-xs bg-secondary text-secondary-foreground hover:bg-secondary/80 disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" /> Baixar
          </button>
          {canShare && (
            <button
              type="button"
              disabled={!dataUrl}
              onClick={() => dataUrl && shareImage(dataUrl, filename)}
              className="px-3 py-2.5 rounded-lg text-xs bg-secondary text-secondary-foreground hover:bg-secondary/80 disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              <Share2 className="w-3.5 h-3.5" /> Compartilhar
            </button>
          )}
          <button
            type="button"
            disabled={!dataUrl}
            onClick={() => dataUrl && copyOrDownload(dataUrl, filename)}
            className="col-span-2 sm:col-auto px-3 py-2.5 rounded-lg text-xs bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            <Copy className="w-3.5 h-3.5" /> Copiar
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
