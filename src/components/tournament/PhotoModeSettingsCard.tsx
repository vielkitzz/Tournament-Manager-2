import { useMemo, useState } from "react";
import { Camera, RotateCcw, Smartphone, Monitor } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  DEFAULT_PHOTO_MODE,
  PHOTO_PRESETS,
  PhotoLayoutKind,
  PhotoModeSettings,
  QUALITY_PRESETS,
  loadPhotoMode,
  paletteVars,
  photoPreviewFontSize,
  resetPhotoMode,
  resolvePhotoMode,
  savePhotoMode,
} from "@/lib/photoMode";
import { championBoxStyle, podiumRowStyle } from "@/lib/teamColors";

const SAMPLE_COLORS = [
  ["#1b3a8a", "#f2c200"],
  ["#0f7a3d", "#ffffff"],
  ["#a11226", "#111111"],
];

const WIDTH_PRESETS = [
  { label: "Compacto", value: 900, hint: "leitura próxima" },
  { label: "Padrão", value: 1100, hint: "equilibrado" },
  { label: "Amplo", value: 1400, hint: "muitas colunas" },
];

const COLOR_FIELDS: { key: keyof PhotoModeSettings; label: string }[] = [
  { key: "bg", label: "Fundo" },
  { key: "surface", label: "Cartões" },
  { key: "accent", label: "Destaque" },
  { key: "text", label: "Texto" },
];

type PreviewMode = "tabela" | "rodadas" | "chaveamento";

const MODE_KIND: Record<PreviewMode, PhotoLayoutKind> = {
  tabela: "table",
  rodadas: "rounds",
  chaveamento: "bracket",
};

/** Width of the simulated screen in the preview column, in CSS px. */
const PREVIEW_WIDTH = { mobile: 268, desktop: 420 };

export default function PhotoModeSettingsCard({
  tournamentId,
  tournamentName,
}: {
  tournamentId: string;
  tournamentName: string;
}) {
  const [settings, setSettings] = useState<PhotoModeSettings>(() => loadPhotoMode(tournamentId));
  const [mode, setMode] = useState<PreviewMode>("tabela");
  const [device, setDevice] = useState<"mobile" | "desktop">("mobile");

  const update = (partial: Partial<PhotoModeSettings>) => {
    const next = { ...settings, ...partial };
    setSettings(next);
    savePhotoMode(next, tournamentId);
  };

  const vars = useMemo(() => paletteVars(settings), [settings]);
  const title = settings.title || tournamentName;
  const auto = settings.autoPreset !== false;
  // Exactly the capture math, applied to the preview width.
  const effective = useMemo(() => resolvePhotoMode(settings, MODE_KIND[mode]), [settings, mode]);
  const previewFont = photoPreviewFontSize(effective, PREVIEW_WIDTH[device], device === "mobile" ? 11 : 12);


  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-5 lg:col-span-2">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Camera className="w-4 h-4 text-primary" />
        </div>
        <h2 className="text-sm font-semibold text-foreground">Modo Foto</h2>
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto gap-1.5 text-xs"
          onClick={() => {
            resetPhotoMode(tournamentId);
            setSettings(loadPhotoMode(tournamentId));
            toast.success("Modo foto restaurado ao padrão");
          }}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Restaurar
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Controls */}
        <div className="space-y-5">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Formato da imagem</Label>
            <div className="grid grid-cols-3 gap-2">
              {WIDTH_PRESETS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => update({ width: p.value })}
                  className={cn(
                    "rounded-lg border px-2 py-2 text-left transition-colors",
                    settings.width === p.value
                      ? "border-primary bg-primary/10"
                      : "border-border bg-secondary/40 hover:bg-secondary/60"
                  )}
                >
                  <span className="block text-xs font-medium text-foreground">{p.label}</span>
                  <span className="block text-[10px] text-muted-foreground">{p.hint}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Tamanho das informações</Label>
              <span className="text-xs font-mono text-foreground">{Math.round((settings.scale || 1) * 100)}%</span>
            </div>
            <Slider
              value={[settings.scale ?? 1]}
              min={1}
              max={1.8}
              step={0.05}
              onValueChange={([v]) => update({ scale: v })}
            />
            <p className="text-[11px] text-muted-foreground">
              Aumenta escudos, siglas e placares para leitura sem zoom no celular ou no Discord.
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Paleta</Label>
            <div className="grid grid-cols-2 gap-2">
              {(["app", "custom"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => update({ palette: p })}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-xs transition-colors",
                    settings.palette === p
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-secondary/40 text-muted-foreground hover:bg-secondary/60"
                  )}
                >
                  {p === "app" ? "Tema do app" : "Cores do campeonato"}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Qualidade / peso do PNG</Label>
            <div className="grid grid-cols-3 gap-2">
              {QUALITY_PRESETS.map((q) => (
                <button
                  key={q.value}
                  onClick={() => update({ maxPixels: q.value })}
                  className={cn(
                    "rounded-lg border px-2 py-2 text-left transition-colors",
                    (settings.maxPixels ?? DEFAULT_PHOTO_MODE.maxPixels) === q.value
                      ? "border-primary bg-primary/10"
                      : "border-border bg-secondary/40 hover:bg-secondary/60"
                  )}
                >
                  <span className="block text-xs font-medium text-foreground">{q.label}</span>
                  <span className="block text-[10px] text-muted-foreground">{q.hint}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/40">
            <div className="space-y-0.5">
              <Label className="text-sm text-foreground">Alto contraste</Label>
              <p className="text-[11px] text-muted-foreground">
                Reforça textos apagados, bordas e ícones na imagem final
              </p>
            </div>
            <Switch
              checked={settings.highContrast ?? true}
              onCheckedChange={(v) => update({ highContrast: v })}
            />
          </div>

          {settings.palette === "custom" && (
            <div className="grid grid-cols-2 gap-3">
              {COLOR_FIELDS.map(({ key, label }) => (
                <div key={key} className="flex items-center gap-2">
                  <input
                    type="color"
                    value={String(settings[key])}
                    onChange={(e) => update({ [key]: e.target.value } as Partial<PhotoModeSettings>)}
                    className="w-9 h-9 rounded-md border border-border bg-transparent cursor-pointer"
                  />
                  <div className="min-w-0">
                    <span className="block text-xs text-foreground">{label}</span>
                    <span className="block text-[10px] font-mono text-muted-foreground">{String(settings[key])}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/40">
            <div className="space-y-0.5">
              <Label className="text-sm text-foreground">Cabeçalho na imagem</Label>
              <p className="text-[11px] text-muted-foreground">Nome da competição e etapa no topo</p>
            </div>
            <Switch checked={settings.showHeader} onCheckedChange={(v) => update({ showHeader: v })} />
          </div>

          {settings.showHeader && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <span className="text-xs text-muted-foreground">Título</span>
                <Input
                  value={settings.title}
                  placeholder={tournamentName}
                  onChange={(e) => update({ title: e.target.value })}
                  className="bg-secondary border-border"
                />
              </div>
              <div className="space-y-1.5">
                <span className="text-xs text-muted-foreground">Subtítulo</span>
                <Input
                  value={settings.subtitle}
                  placeholder="ex: Quartas de final"
                  onChange={(e) => update({ subtitle: e.target.value })}
                  className="bg-secondary border-border"
                />
              </div>
            </div>
          )}
        </div>

        {/* Preview */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            {(["tabela", "rodadas", "chaveamento"] as PreviewMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={cn(
                  "px-2.5 py-1 rounded-md text-[11px] capitalize transition-colors",
                  mode === m
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary/50 text-muted-foreground hover:text-foreground"
                )}
              >
                {m}
              </button>
            ))}
            <div className="ml-auto flex items-center gap-1">
              <button
                onClick={() => setDevice("mobile")}
                title="Simular celular"
                className={cn(
                  "p-1.5 rounded-md transition-colors",
                  device === "mobile" ? "bg-primary text-primary-foreground" : "bg-secondary/50 text-muted-foreground"
                )}
              >
                <Smartphone className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setDevice("desktop")}
                title="Simular desktop"
                className={cn(
                  "p-1.5 rounded-md transition-colors",
                  device === "desktop" ? "bg-primary text-primary-foreground" : "bg-secondary/50 text-muted-foreground"
                )}
              >
                <Monitor className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div
            className={cn(
              "border border-border overflow-hidden mx-auto",
              device === "mobile" ? "rounded-[1.6rem] max-w-[300px] p-2 bg-secondary/40" : "rounded-lg"
            )}
          >
            <div
              style={{ ...vars, fontSize: `${(device === "mobile" ? 10.5 : 12) * previewScale}px` } as React.CSSProperties}
              className={cn("bg-background text-foreground p-3", device === "mobile" && "rounded-[1.1rem]")}
            >
              {settings.showHeader && (
                <div
                  className="flex items-center gap-2 pb-2 mb-2"
                  style={{ borderBottom: "2px solid hsl(var(--primary))" }}
                >
                  <span className="w-1 self-stretch min-h-[1.6em] rounded-full bg-primary" />
                  <div className="min-w-0">
                    <div className="font-bold leading-tight truncate" style={{ fontSize: "1.3em" }}>
                      {title}
                    </div>
                    {settings.subtitle && (
                      <div className="text-primary font-semibold uppercase tracking-widest" style={{ fontSize: "0.7em" }}>
                        {settings.subtitle}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {mode === "tabela" && (
                <div className="space-y-1">
                  {[
                    ["1", "Clube Romen", "9"],
                    ["2", "Harley", "7"],
                    ["3", "Auricorona", "6"],
                  ].map(([pos, name, pts], i) => (
                    <div
                      key={pos}
                      style={podiumRowStyle(SAMPLE_COLORS[i], i + 1)}
                      className="flex items-center gap-2 rounded-md bg-card px-2 py-1.5 overflow-hidden"
                    >
                      <span className="text-muted-foreground w-4">{pos}</span>
                      <span className="w-[1.6em] h-[1.6em] rounded-full bg-primary/25 border border-border" />
                      <span className="flex-1 truncate font-medium">{name}</span>
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded font-bold",
                          i === 0 ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
                        )}
                      >
                        {pts}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {mode === "rodadas" && (
                <div className="space-y-1.5">
                  {[
                    ["Harley", "2 - 1", "Molde"],
                    ["Portuguesa", "0 - 0", "AIK"],
                  ].map(([h, s, a]) => (
                    <div key={h} className="flex items-center gap-2 rounded-md bg-card px-2 py-2">
                      <span className="flex-1 text-right truncate font-medium">{h}</span>
                      <span className="w-[1.4em] h-[1.4em] rounded-full bg-primary/25 border border-border" />
                      <span className="px-2 py-0.5 rounded bg-primary text-primary-foreground font-bold">{s}</span>
                      <span className="w-[1.4em] h-[1.4em] rounded-full bg-primary/25 border border-border" />
                      <span className="flex-1 truncate font-medium">{a}</span>
                    </div>
                  ))}
                </div>
              )}

              {mode === "chaveamento" && (
                <div className="flex items-center gap-3">
                  <div className="space-y-2 flex-1">
                    {["PSG / CHE", "GAL / LIV"].map((p) => (
                      <div key={p} className="rounded-md bg-card border border-border px-2 py-1.5 truncate">
                        {p}
                      </div>
                    ))}
                  </div>
                  <div className="w-6 border-t-2 border-primary" />
                  <div
                    style={championBoxStyle(SAMPLE_COLORS[0])?.container}
                    className="flex-1 rounded-md bg-card border px-2 py-3 text-center font-semibold overflow-hidden"
                  >
                    Campeão
                  </div>
                </div>
              )}
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Pré-visualização aproximada. As configurações valem para todos os botões de câmera desta competição.
          </p>
        </div>
      </div>
    </div>
  );
}
