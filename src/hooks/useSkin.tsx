import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type Skin = "light" | "dark" | "cyberpunk";

export const AVAILABLE_SKINS: { id: Skin; label: string; description: string }[] = [
  { id: "light", label: "Claro", description: "Tema padrão, claro e limpo" },
  { id: "dark", label: "Escuro", description: "Modo noturno clássico" },
  { id: "cyberpunk", label: "Cyberpunk", description: "Alto contraste, cores neon" },
];

const STORAGE_KEY = "tm2-skin";

interface SkinContextType {
  skin: Skin;
  setSkin: (skin: Skin) => void;
}

const SkinContext = createContext<SkinContextType>({
  skin: "dark",
  setSkin: () => {},
});

function isSkin(value: unknown): value is Skin {
  return value === "light" || value === "dark" || value === "cyberpunk";
}

export function SkinProvider({ children }: { children: ReactNode }) {
  const [skin, setSkinState] = useState<Skin>(() => {
    if (typeof window === "undefined") return "dark";
    const stored = localStorage.getItem(STORAGE_KEY);
    return isSkin(stored) ? stored : "dark";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", skin);
    localStorage.setItem(STORAGE_KEY, skin);
  }, [skin]);

  const setSkin = (next: Skin) => setSkinState(next);

  return (
    <SkinContext.Provider value={{ skin, setSkin }}>
      {children}
    </SkinContext.Provider>
  );
}

export const useSkin = () => useContext(SkinContext);