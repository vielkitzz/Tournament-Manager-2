import { Camera } from "lucide-react";
import { RefObject, useCallback } from "react";
import { captureScreenshot } from "@/lib/screenshotUtils";

interface ScreenshotButtonProps {
  targetRef: RefObject<HTMLElement>;
  filename?: string;
  className?: string;
}

export default function ScreenshotButton({ targetRef, filename = "screenshot.png", className }: ScreenshotButtonProps) {
  const handleCapture = useCallback(() => {
    if (targetRef.current) {
      captureScreenshot(targetRef.current, filename);
    }
  }, [targetRef, filename]);

  return (
    <button
      onClick={handleCapture}
      title="Capturar imagem"
      className={className || "p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"}
    >
      <Camera className="w-4 h-4" />
    </button>
  );
}
