import { Camera } from "lucide-react";
import { RefObject, useCallback, useState } from "react";
import { captureScreenshotDataUrl } from "@/lib/screenshotUtils";
import ScreenshotPreviewDialog from "@/components/ScreenshotPreviewDialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { loadPhotoMode, resolvePhotoMode, PhotoLayoutKind } from "@/lib/photoMode";
import { useParams } from "react-router-dom";
import { useTournamentStore } from "@/store/tournamentStore";

interface ScreenshotButtonProps {
  targetRef: RefObject<HTMLElement>;
  filename?: string;
  className?: string;
  discrete?: boolean;
  skinImage?: string | null;
  /** Used to load the tournament-specific photo mode settings. */
  tournamentId?: string;
  /** Content kind, used to pick the ideal width/zoom preset. */
  mode?: PhotoLayoutKind;
  /** Title/subtitle rendered in the photo header band. */
  title?: string;
  subtitle?: string;
}

export default function ScreenshotButton({
  targetRef,
  filename = "screenshot.png",
  className,
  discrete,
  skinImage: _skinImage,
  tournamentId,
  mode,
  title,
  subtitle,
}: ScreenshotButtonProps) {
  const [open, setOpen] = useState(false);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const params = useParams<{ id?: string }>();
  const activeId = tournamentId || params.id;
  const tournament = useTournamentStore((s) => s.tournaments.find((t) => t.id === activeId));
  const tournamentName = tournament?.name;
  const tournamentLogo = tournament?.logo;

  const handleCapture = useCallback(async () => {
    if (!targetRef.current) return;
    setDataUrl(null);
    setLoading(true);
    setOpen(true);
    try {
      const photo = resolvePhotoMode(loadPhotoMode(activeId), mode);
      const url = await captureScreenshotDataUrl(targetRef.current, {
        ...photo,
        layout: mode,
        logo: tournamentLogo,
        title: title || photo.title || tournamentName || "",
        subtitle: subtitle || photo.subtitle,
      });
      setDataUrl(url);

    } catch (err) {
      console.error("Screenshot error:", err);
      const message = err instanceof Error ? err.message : String(err);
      toast.error(`Erro ao capturar imagem: ${message.slice(0, 120)}`);
      setOpen(false);
    } finally {
      setLoading(false);
    }
  }, [targetRef, activeId, tournamentName, title, subtitle, mode]);



  return (
    <>
      <button
        onClick={handleCapture}
        title="Capturar imagem"
        data-screenshot-ignore="true"
        className={className || cn(
          "rounded-lg transition-colors",
          discrete
            ? "p-1 text-muted-foreground/40 hover:text-muted-foreground hover:bg-secondary/50"
            : "p-1.5 hover:bg-secondary text-muted-foreground hover:text-foreground"
        )}
      >
        <Camera className={discrete ? "w-3.5 h-3.5" : "w-4 h-4"} />
      </button>
      <ScreenshotPreviewDialog
        open={open}
        onOpenChange={setOpen}
        dataUrl={dataUrl}
        filename={filename}
        loading={loading}
      />
    </>
  );
}
