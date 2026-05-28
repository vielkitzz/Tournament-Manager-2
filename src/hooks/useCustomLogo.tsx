import { useState, useEffect } from "react";

const STORAGE_KEY = "tm2-custom-logo";

export function useCustomLogo() {
  const [logoUrl, setLogoUrl] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(STORAGE_KEY);
  });

  const saveLogo = async (file: File): Promise<void> => {
    const webpUrl = await convertToWebp(file);
    localStorage.setItem(STORAGE_KEY, webpUrl);
    setLogoUrl(webpUrl);
  };

  const removeLogo = () => {
    localStorage.removeItem(STORAGE_KEY);
    setLogoUrl(null);
  };

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
      const webpDataUrl = canvas.toDataURL("image/webp", 0.9);
      resolve(webpDataUrl);
    };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error("Falha ao carregar imagem")); };
    img.src = objectUrl;
  });
}