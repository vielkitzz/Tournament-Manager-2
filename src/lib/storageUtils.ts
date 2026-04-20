/**
 * Supabase Storage helpers for logo uploads.
 * Uploads a Blob to the 'logos' bucket and returns the public URL.
 */
import { supabase } from "@/integrations/supabase/client";

const BUCKET = "logos";

type UploadLogoOptions = {
  upsert?: boolean;
  retries?: number;
};

/**
 * Uploads a WebP Blob to Storage.
 * @param blob  - The processed WebP Blob
 * @param path  - Storage path, e.g. "teams/uuid.webp" or "tournaments/uuid.webp"
 * @returns     - Public URL string
 */
export async function uploadLogo(blob: Blob, path: string, options: UploadLogoOptions = {}): Promise<string> {
  const { upsert = true, retries = 2 } = options;

  // Always ensure we have a fresh session before attempting the upload
  // to avoid RLS errors caused by stale auth context.
  await supabase.auth.getSession();

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, blob, {
        contentType: "image/webp",
        upsert,
      });

    if (!error) {
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      // Append cache-buster to force browser to fetch new version after upsert
      return `${data.publicUrl}?t=${Date.now()}`;
    }

    const isRetryableRlsError = /row-level security policy/i.test(error.message);
    if (!isRetryableRlsError || attempt === retries) {
      throw error;
    }

    await supabase.auth.getSession();
    await new Promise((resolve) => setTimeout(resolve, 350 * (attempt + 1)));
  }

  throw new Error("Erro ao enviar imagem");
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
