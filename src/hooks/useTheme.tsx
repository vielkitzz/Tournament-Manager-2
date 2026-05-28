import { useSkin } from "@/hooks/useSkin";

export function useTheme() {
  const { activeSkin, setActiveSkin } = useSkin();
  return {
    theme: activeSkin.base,
    toggleTheme: () => setActiveSkin(activeSkin.base === "dark" ? "default-light" : "default-dark"),
  };
}
