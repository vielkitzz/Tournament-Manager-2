import { Camera } from "lucide-react";
import { RefObject, useCallback } from "react";
import { captureScreenshot } from "@/lib/screenshotUtils";
import { cn } from "@/lib/utils";

interface ScreenshotButtonProps {
  targetRef: RefObject<HTMLElement>;
  filename?: string;
  className?: string;
  discrete?: boolean;
}

export default function ScreenshotButton({ targetRef, filename = "screenshot.png", className, discrete }: ScreenshotButtonProps) {
  const handleCapture = useCallback(() => {
    if (targetRef.current) {
      captureScreenshot(targetRef.current, filename);
    }
  }, [targetRef, filename]);

  return (
    <button
      onClick={handleCapture}
      title="Capturar imagem"
      className={className || cn(
        "rounded-lg transition-colors",
        discrete
          ? "p-1 text-muted-foreground/40 hover:text-muted-foreground hover:bg-secondary/50"
          : "p-1.5 hover:bg-secondary text-muted-foreground hover:text-foreground"
      )}
    >
      <Camera className={discrete ? "w-3.5 h-3.5" : "w-4 h-4"} />
    </button>
  );
}
