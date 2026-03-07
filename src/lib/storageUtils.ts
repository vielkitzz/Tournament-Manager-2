/**
 * Supabase Storage helpers for logo uploads.
 * Uploads a Blob to the 'logos' bucket and returns the public URL.
 */
import { supabase } from "@/integrations/supabase/client";

const BUCKET = "logos";

/**
 * Uploads a WebP Blob to Storage.
 * @param blob  - The processed WebP Blob
 * @param path  - Storage path, e.g. "teams/uuid.webp" or "tournaments/uuid.webp"
 * @returns     - Public URL string
 */
export async function uploadLogo(blob: Blob, path: string): Promise<string> {
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, {
      contentType: "image/webp",
      upsert: true,
    });

  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  // Append cache-buster to force browser to fetch new version after upsert
  return `${data.publicUrl}?t=${Date.now()}`;
}

/**
 * Deletes a logo from Storage given its public URL.
 * Safe to call with undefined/non-storage URLs (no-op).
 */
export async function deleteLogo(publicUrl: string | undefined) {
  if (!publicUrl) return;
  try {
    const url = new URL(publicUrl);
    // Extract path after /object/public/logos/
    const match = url.pathname.match(/\/object\/public\/logos\/(.+)/);
    if (!match) return;
    await supabase.storage.from(BUCKET).remove([match[1]]);
  } catch {
    // Ignore errors on delete (e.g., old base64 URLs)
  }
}
