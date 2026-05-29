/**
 * Image processing utilities using the Canvas API.
 * - Resizes images to max 1200px width (preserving aspect ratio)
 * - Converts to WebP with quality 0.8
 * - Returns an Object URL for preview (no base64 stored)
 * - Returns a Blob for direct upload to Storage
 */

const MAX_WIDTH = 1200;
const WEBP_QUALITY = 0.8;

export interface ProcessedImage {
  /** Temporary Object URL for img src preview — call revokeImagePreview() when done */
  previewUrl: string;
  /** WebP Blob ready to upload to Supabase Storage */
  blob: Blob;
  /** Suggested filename with .webp extension */
  filename: string;
}

/**
 * Processes a File/Blob from an <input type="file">:
 * 1. Draws it onto a canvas, resizing to max MAX_WIDTH
 * 2. Exports as WebP (quality WEBP_QUALITY)
 * 3. Returns a temporary Object URL + the Blob
 */
export async function processImage(file: File): Promise<ProcessedImage> {
  const bitmap = await createImageBitmap(file);

  const { width: srcW, height: srcH } = bitmap;
  const scale = srcW > MAX_WIDTH ? MAX_WIDTH / srcW : 1;
  const destW = Math.round(srcW * scale);
  const destH = Math.round(srcH * scale);

  const canvas = document.createElement("canvas");
  canvas.width = destW;
  canvas.height = destH;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");

  ctx.drawImage(bitmap, 0, 0, destW, destH);
  bitmap.close();

  const blob = await canvasToWebP(canvas, WEBP_QUALITY);

  const baseName = file.name.replace(/\.[^.]+$/, "");
  const filename = `${baseName}.webp`;

  const previewUrl = URL.createObjectURL(blob);

  return { previewUrl, blob, filename };
}

/** Revoke an Object URL created by processImage() to free memory */
export function revokeImagePreview(url: string) {
  if (url.startsWith("blob:")) {
    URL.revokeObjectURL(url);
  }
}

/** Convert canvas to WebP Blob. Falls back to PNG if WebP isn't supported. */
function canvasToWebP(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Canvas toBlob returned null"));
        }
      },
      "image/webp",
      quality
    );
  });
}
