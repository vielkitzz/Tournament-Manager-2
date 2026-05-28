import { useSkin } from "@/hooks/useSkin";

export default function ThemeToggle() {
  const { activeSkin, setActiveSkin } = useSkin();
  const isDark = activeSkin.base === "dark";

  return (
    <button
      onClick={() => setActiveSkin(isDark ? "default-light" : "default-dark")}
      className="p-2 rounded-lg bg-secondary/60 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
      aria-label={isDark ? "Ativar modo claro" : "Ativar modo escuro"}
    >
      {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  );
}
