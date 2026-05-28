import { useCallback } from "react";
import { useSkin } from "@/hooks/useSkin";

export function useCustomLogo() {
  const { activeSkin, setCustomLogo } = useSkin();
  const logoUrl = activeSkin.logoUrl ?? null;

  const saveLogo = useCallback(
    async (file: File): Promise<void> => {
      const webpUrl = await convertToWebp(file);
      setCustomLogo(activeSkin.id, webpUrl);
    },
    [activeSkin.id, setCustomLogo],
  );

  const removeLogo = useCallback(() => {
    setCustomLogo(activeSkin.id, null);
  }, [activeSkin.id, setCustomLogo]);

  return { logoUrl, saveLogo, removeLogo };
}

async function convertToWebp(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext("2d")!.drawImage(img, 0, 0);
      URL.revokeObjectURL(objectUrl);
      resolve(canvas.toDataURL("image/webp", 0.9));
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Falha ao carregar imagem"));
    };
    img.src = objectUrl;
  });
}
