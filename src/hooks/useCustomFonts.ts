import { useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";

export interface UploadedFont {
  name: string;   // nome que o usuário escolheu
  url: string;    // URL pública no Supabase Storage
  format: string; // woff2 | woff | truetype
}

export function useCustomFonts(skinId: string) {
  const [uploading, setUploading] = useState(false);

  const uploadFont = useCallback(async (file: File, fontName: string): Promise<UploadedFont | null> => {
    const ext = file.name.split(".").pop()?.toLowerCase() || "woff2";
    const format = ext === "ttf" ? "truetype" : ext;
    const path = `${skinId}/${Date.now()}-${fontName.replace(/\s+/g, "_")}.${ext}`;

    setUploading(true);
    try {
      const { error } = await supabase.storage
        .from("fonts")
        .upload(path, file, { upsert: true });

      if (error) throw error;

      const { data } = supabase.storage.from("fonts").getPublicUrl(path);
      return { name: fontName, url: data.publicUrl, format };
    } finally {
      setUploading(false);
    }
  }, [skinId]);

  const deleteFont = useCallback(async (url: string) => {
    // extrai o path a partir da URL pública
    const path = url.split("/fonts/")[1];
    if (!path) return;
    await supabase.storage.from("fonts").remove([path]);
  }, []);

  return { uploadFont, deleteFont, uploading };
}