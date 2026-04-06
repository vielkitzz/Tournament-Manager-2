import { useRef, useState, useCallback, type DragEvent, type ClipboardEvent } from "react";
import { Upload, X } from "lucide-react";
import { processImage, revokeImagePreview } from "@/lib/imageUtils";
import { toast } from "sonner";

interface ImageUploadProps {
  previewUrl?: string;
  onImageSelected: (result: { previewUrl: string; blob: Blob; filename: string }) => void;
  onRemove: () => void;
  /** Fallback icon when no image is set */
  placeholder?: React.ReactNode;
  className?: string;
  size?: "sm" | "md";
}

export default function ImageUpload({
  previewUrl,
  onImageSelected,
  onRemove,
  placeholder,
  className = "",
  size = "md",
}: ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) {
        toast.error("Arquivo não é uma imagem");
        return;
      }
      try {
        const result = await processImage(file);
        onImageSelected(result);
      } catch {
        toast.error("Erro ao processar imagem");
      }
    },
    [onImageSelected]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => setDragging(false);

  const handlePaste = useCallback(
    (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) handleFile(file);
          return;
        }
      }
    },
    [handleFile]
  );

  const sizeClasses = size === "sm" ? "w-16 h-16" : "w-24 h-24";

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div
        tabIndex={0}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onPaste={handlePaste}
        onClick={() => fileInputRef.current?.click()}
        className={`${sizeClasses} rounded-xl border-2 border-dashed transition-colors cursor-pointer flex items-center justify-center overflow-hidden focus:outline-none focus:ring-2 focus:ring-primary/40 ${
          dragging
            ? "border-primary bg-primary/10"
            : previewUrl
            ? "border-border"
            : "border-border hover:border-primary/40"
        }`}
      >
        {previewUrl ? (
          <img src={previewUrl} alt="" className="w-full h-full object-contain" />
        ) : placeholder ? (
          placeholder
        ) : (
          <Upload className="w-5 h-5 text-muted-foreground" />
        )}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleInputChange}
        className="hidden"
      />
      <div className="flex flex-col gap-1">
        {previewUrl && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="text-[10px] text-destructive hover:underline flex items-center gap-0.5"
          >
            <X className="w-3 h-3" /> Remover
          </button>
        )}
        <p className="text-[10px] text-muted-foreground">
          Clique, arraste ou cole (Ctrl+V)
        </p>
      </div>
    </div>
  );
}