import { Check } from "lucide-react";
import { AVAILABLE_SKINS, useSkin, type Skin } from "@/hooks/useSkin";
import { cn } from "@/lib/utils";

const SKIN_PREVIEWS: Record<Skin, { bg: string; surface: string; primary: string; accent: string; border: string }> = {
  light: { bg: "rgb(245 247 250)", surface: "rgb(255 255 255)", primary: "rgb(37 99 235)", accent: "rgb(14 165 233)", border: "rgb(226 232 240)" },
  dark: { bg: "rgb(11 15 25)", surface: "rgb(17 24 39)", primary: "rgb(59 130 246)", accent: "rgb(14 165 233)", border: "rgb(39 48 68)" },
  cyberpunk: { bg: "rgb(10 4 24)", surface: "rgb(20 8 42)", primary: "rgb(255 46 213)", accent: "rgb(0 255 240)", border: "rgb(124 58 237)" },
};

export default function SkinSelector() {
  const { skin, setSkin } = useSkin();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 transition-colors duration-300">
      {AVAILABLE_SKINS.map((option) => {
        const isActive = option.id === skin;
        const preview = SKIN_PREVIEWS[option.id];
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => setSkin(option.id)}
            className={cn(
              "group relative text-left rounded-xl border bg-skin-surface text-skin-text",
              "p-4 transition-colors duration-300",
              "hover:border-skin-primary/60",
              isActive ? "border-skin-primary ring-2 ring-skin-primary/40" : "border-skin-border",
            )}
            aria-pressed={isActive}
          >
            <div
              className="h-16 w-full rounded-lg mb-3 overflow-hidden border"
              style={{ background: preview.bg, borderColor: preview.border }}
            >
              <div className="h-full w-full flex items-center gap-1.5 px-2" style={{ background: preview.surface }}>
                <span className="h-3 w-3 rounded-full" style={{ background: preview.primary }} />
                <span className="h-3 w-3 rounded-full" style={{ background: preview.accent }} />
                <span className="flex-1 h-2 rounded-full" style={{ background: preview.border }} />
              </div>
            </div>
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-skin-text">{option.label}</p>
                <p className="text-xs text-skin-text-muted mt-0.5">{option.description}</p>
              </div>
              {isActive && (
                <span className="shrink-0 h-6 w-6 rounded-full bg-skin-primary text-skin-primary-foreground flex items-center justify-center">
                  <Check className="w-3.5 h-3.5" />
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}