import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface UploadedFont {
  name: string; // nome que o usuário escolheu
  url: string; // URL pública no Supabase Storage
  format: string; // woff2 | woff | truetype
}

export function useCustomFonts(skinId: string) {
  const [uploading, setUploading] = useState(false);

  const uploadFont = useCallback(
    async (file: File, fontName: string): Promise<UploadedFont | null> => {
      const ext = file.name.split(".").pop()?.toLowerCase() || "woff2";
      const format = ext === "ttf" ? "truetype" : ext;

      setUploading(true);
      try {
        // A política de storage exige que a primeira pasta seja o id do usuário.
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("Faça login para enviar fontes");

        const path = `${user.id}/${skinId}/${Date.now()}-${fontName.replace(/[^\w-]+/g, "_")}.${ext}`;
        const { error } = await supabase.storage.from("fonts").upload(path, file, { upsert: false });

        if (error) throw error;

        const { data } = supabase.storage.from("fonts").getPublicUrl(path);
        return { name: fontName, url: data.publicUrl, format };
      } finally {
        setUploading(false);
      }
    },
    [skinId],
  );

  const deleteFont = useCallback(async (url: string) => {
    // extrai o path a partir da URL pública
    const path = url.split("/fonts/")[1];
    if (!path) return;
    await supabase.storage.from("fonts").remove([path]);
  }, []);

  return { uploadFont, deleteFont, uploading };
}
