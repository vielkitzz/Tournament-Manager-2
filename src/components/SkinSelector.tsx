import { useEffect, useRef, useState } from "react";
import { Check, Copy, ImageIcon, Pencil, Plus, RotateCcw, Trash2, Upload, X } from "lucide-react";
import {
  SKIN_TOKEN_GROUPS,
  hexToHslToken,
  hslTokenToHex,
  resolveTokenValue,
  useSkin,
  type Skin,
  type GradientTarget,
  type SkinGradient,
} from "@/hooks/useSkin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useCustomFonts } from "@/hooks/useCustomFonts";
import { loadImage } from "@/hooks/useSkinImageStore";

function PreviewSwatches({ skin }: { skin: Skin }) {
  const keys = ["background", "card", "primary", "accent", "border"] as const;
  return (
    <div className="flex items-center gap-1.5">
      {keys.map((k) => {
        const value = skin.tokens[k] || resolveTokenValue(skin, k);
        return (
          <span
            key={k}
            className="h-5 w-5 rounded-md border border-border"
            style={{ background: value ? `hsl(${value})` : undefined }}
            title={k}
          />
        );
      })}
    </div>
  );
}

function TokenRow({
  tokenKey,
  label,
  value,
  isOverridden,
  onChange,
  onReset,
}: {
  tokenKey: string;
  label: string;
  value: string | undefined;
  isOverridden: boolean;
  onChange: (hex: string) => void;
  onReset: () => void;
}) {
  const hex = hslTokenToHex(value) || "#000000";
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-foreground truncate">{label}</p>
        <p className="text-[10px] text-muted-foreground font-mono truncate">--{tokenKey}</p>
      </div>
      <div className="flex items-center gap-2">
        <span
          className="h-6 w-6 rounded border border-border"
          style={{ background: value ? `hsl(${value})` : "transparent" }}
        />
        <input
          type="color"
          value={hex}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 w-9 rounded border border-border bg-transparent cursor-pointer"
          aria-label={`Cor para ${label}`}
        />
        <button
          type="button"
          onClick={onReset}
          disabled={!isOverridden}
          className={cn(
            "p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors",
            !isOverridden && "opacity-30 cursor-not-allowed",
          )}
          title="Restaurar padrão"
          aria-label={`Restaurar ${label}`}
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

function SkinEditor({
  skin,
  open,
  onOpenChange,
}: {
  skin: Skin;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { updateCustomSkin, setCustomToken, resetCustomSkin, updateExtras, setGradient } = useSkin();
  const [label, setLabel] = useState(skin.label);
  const bgInputRef = useRef<HTMLInputElement>(null);
  const { uploadFont, deleteFont, uploading } = useCustomFonts(skin.id);
  const fontInputRef = useRef<HTMLInputElement>(null);
  const [newFontName, setNewFontName] = useState("");

  useEffect(() => setLabel(skin.label), [skin.id, skin.label]);

  const extras = skin.extras || {};
  const radius = extras.radius ?? 0.75;
  const fontScale = extras.fontScale ?? 1;
  const letterSpacing = extras.letterSpacing ?? 0;
  const shadowIntensity = extras.shadowIntensity ?? 1;

  // Resolve a referência `idb:<id>:<key>` para um data URL exibível, já que
  // o estado guarda apenas o ponteiro do IndexedDB para evitar estourar a
  // quota do localStorage. Sem isso, o <img> do preview ficava quebrado.
  const [bgPreview, setBgPreview] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    const value = extras.backgroundImage;
    if (!value) {
      setBgPreview(null);
      return;
    }
    if (value.startsWith("idb:")) {
      const [, skinId, key] = value.split(":");
      loadImage(skinId, key)
        .then((url) => {
          if (!cancelled) setBgPreview(url);
        })
        .catch(() => {
          if (!cancelled) setBgPreview(null);
        });
    } else {
      setBgPreview(value);
    }
    return () => {
      cancelled = true;
    };
  }, [extras.backgroundImage]);

  const handleBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione uma imagem");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem deve ter menos de 5MB");
      return;
    }
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = () => reject(r.error);
      r.readAsDataURL(file);
    });
    updateExtras(skin.id, { backgroundImage: dataUrl });
    toast.success("Fundo aplicado");
    e.target.value = "";
  };

  const gradientTargets: { key: GradientTarget; label: string }[] = [
    { key: "background", label: "Fundo geral" },
    { key: "card", label: "Cards" },
    { key: "primary", label: "Botões primários" },
    { key: "accent", label: "Acentos" },
    { key: "sidebar", label: "Sidebar" },
    { key: "button", label: "Botões" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Editar skin</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto pr-2">
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-end">
            <div>
              <label className="text-xs text-muted-foreground">Nome</label>
              <Input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                onBlur={() => updateCustomSkin(skin.id, { label: label.trim() || skin.label })}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Modo base</label>
              <div className="inline-flex rounded-md border border-border overflow-hidden">
                {(["light", "dark"] as const).map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => updateCustomSkin(skin.id, { base: b })}
                    className={cn(
                      "px-3 py-1.5 text-xs transition-colors",
                      skin.base === b
                        ? "bg-primary text-primary-foreground"
                        : "bg-card text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {b === "light" ? "Claro" : "Escuro"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {SKIN_TOKEN_GROUPS.map((group) => (
            <section key={group.label} className="rounded-lg border border-border bg-card/50">
              <header className="px-3 py-2 border-b border-border">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{group.label}</h4>
              </header>
              <div className="px-3 divide-y divide-border/50">
                {group.tokens.map((t) => {
                  const overridden = !!skin.tokens[t.key];
                  const value = overridden ? skin.tokens[t.key] : resolveTokenValue(skin, t.key);
                  return (
                    <TokenRow
                      key={t.key}
                      tokenKey={t.key}
                      label={t.label}
                      value={value}
                      isOverridden={overridden}
                      onChange={(hex) => {
                        const token = hexToHslToken(hex);
                        if (token) setCustomToken(skin.id, t.key, token);
                      }}
                      onReset={() => setCustomToken(skin.id, t.key, null)}
                    />
                  );
                })}
              </div>
            </section>
          ))}

          {/* Bordas */}
          <section className="rounded-lg border border-border bg-card/50 p-3 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Bordas</h4>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-foreground">Curvatura (border-radius)</span>
                <span className="text-xs font-mono text-muted-foreground">{radius.toFixed(2)}rem</span>
              </div>
              <Slider
                value={[radius]}
                min={0}
                max={2}
                step={0.05}
                onValueChange={([v]) => updateExtras(skin.id, { radius: v })}
              />
            </div>
          </section>

          {/* Tipografia */}
          <section className="rounded-lg border border-border bg-card/50 p-3 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Tipografia</h4>
            <div>
              <label className="text-xs text-muted-foreground">URL de importação (Google Fonts ou @font-face)</label>
              <Input
                placeholder="https://fonts.googleapis.com/css2?family=Inter&display=swap"
                defaultValue={extras.fontUrl || ""}
                onBlur={(e) => updateExtras(skin.id, { fontUrl: e.target.value.trim() || undefined })}
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Cole a URL de qualquer fonte (Google Fonts, Bunny Fonts, etc.).
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-muted-foreground">Família corpo</label>
                <Input
                  placeholder="Inter"
                  defaultValue={extras.fontSans || ""}
                  onBlur={(e) => updateExtras(skin.id, { fontSans: e.target.value.trim() || undefined })}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Família títulos</label>
                <Input
                  placeholder="Space Grotesk"
                  defaultValue={extras.fontHeading || ""}
                  onBlur={(e) => updateExtras(skin.id, { fontHeading: e.target.value.trim() || undefined })}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-foreground">Escala da fonte</span>
                <span className="text-xs font-mono text-muted-foreground">{Math.round(fontScale * 100)}%</span>
              </div>
              <Slider
                value={[fontScale]}
                min={0.8}
                max={1.3}
                step={0.02}
                onValueChange={([v]) => updateExtras(skin.id, { fontScale: v })}
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-foreground">Espaçamento entre letras</span>
                <span className="text-xs font-mono text-muted-foreground">{letterSpacing.toFixed(3)}em</span>
              </div>
              <Slider
                value={[letterSpacing]}
                min={-0.05}
                max={0.15}
                step={0.005}
                onValueChange={([v]) => updateExtras(skin.id, { letterSpacing: v })}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Fontes locais (upload)</label>
              <div className="flex gap-2 mt-1">
                <Input
                  placeholder="Nome da fonte (ex: MinhaFonte)"
                  value={newFontName}
                  onChange={(e) => setNewFontName(e.target.value)}
                />
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!newFontName.trim() || uploading}
                  onClick={() => fontInputRef.current?.click()}
                >
                  {uploading ? (
                    "Enviando…"
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5 mr-1" />
                      Enviar
                    </>
                  )}
                </Button>
              </div>
              <input
                ref={fontInputRef}
                type="file"
                accept=".ttf,.woff,.woff2"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file || !newFontName.trim()) return;
                  const uploaded = await uploadFont(file, newFontName.trim());
                  if (uploaded) {
                    updateExtras(skin.id, {
                      uploadedFonts: [...(extras.uploadedFonts || []), uploaded],
                    });
                    toast.success(`Fonte "${uploaded.name}" enviada — use o nome no campo acima`);
                    setNewFontName("");
                  }
                  e.target.value = "";
                }}
              />
              {(extras.uploadedFonts || []).length > 0 && (
                <div className="mt-2 space-y-1">
                  {extras.uploadedFonts!.map((f, i) => (
                    <div key={i} className="flex items-center justify-between text-xs bg-muted rounded px-2 py-1">
                      <span className="font-mono">
                        {f.name} <span className="text-muted-foreground">({f.format})</span>
                      </span>
                      <button
                        type="button"
                        onClick={async () => {
                          await deleteFont(f.url);
                          updateExtras(skin.id, {
                            uploadedFonts: extras.uploadedFonts!.filter((_, j) => j !== i),
                          });
                          toast.success("Fonte removida");
                        }}
                        className="text-destructive hover:text-destructive/80"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-[10px] text-muted-foreground mt-1">
                Suporta .ttf, .woff, .woff2 · Após enviar, use o nome nos campos "Família corpo" ou "Família títulos"
              </p>
            </div>
          </section>

          {/* Plano de fundo */}
          <section className="rounded-lg border border-border bg-card/50 p-3 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Plano de fundo</h4>
            <div className="flex items-center gap-3">
              {bgPreview ? (
                <img
                  src={bgPreview}
                  alt="Fundo"
                  className="h-14 w-20 object-cover rounded border border-border"
                />
              ) : (
                <div className="h-14 w-20 rounded border border-dashed border-border bg-muted flex items-center justify-center text-muted-foreground">
                  <ImageIcon className="w-5 h-5" />
                </div>
              )}
              <input ref={bgInputRef} type="file" accept="image/*" className="hidden" onChange={handleBgUpload} />
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => bgInputRef.current?.click()}>
                <Upload className="w-3.5 h-3.5" />
                {extras.backgroundImage ? "Trocar imagem" : "Enviar imagem"}
              </Button>
              {extras.backgroundImage && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-destructive"
                  onClick={() => updateExtras(skin.id, { backgroundImage: null })}
                >
                  <X className="w-3.5 h-3.5" />
                  Remover
                </Button>
              )}
            </div>
            {extras.backgroundImage && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Ajuste</label>
                    <div className="inline-flex rounded-md border border-border overflow-hidden">
                      {(["cover", "contain", "auto"] as const).map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => updateExtras(skin.id, { backgroundSize: s })}
                          className={cn(
                            "px-2.5 py-1 text-[11px] transition-colors",
                            (extras.backgroundSize || "cover") === s
                              ? "bg-primary text-primary-foreground"
                              : "bg-card text-muted-foreground hover:text-foreground",
                          )}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Posição</label>
                    <Input
                      placeholder="center"
                      defaultValue={extras.backgroundPosition || "center"}
                      onBlur={(e) => updateExtras(skin.id, { backgroundPosition: e.target.value.trim() || "center" })}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-foreground">Desfoque do fundo</span>
                    <span className="text-xs font-mono text-muted-foreground">{extras.backgroundBlur || 0}px</span>
                  </div>
                  <Slider
                    value={[extras.backgroundBlur || 0]}
                    min={0}
                    max={40}
                    step={1}
                    onValueChange={([v]) => updateExtras(skin.id, { backgroundBlur: v })}
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-foreground">Camada de cor (legibilidade)</span>
                    <span className="text-xs font-mono text-muted-foreground">
                      {Math.round((extras.backgroundOpacity || 0) * 100)}%
                    </span>
                  </div>
                  <Slider
                    value={[extras.backgroundOpacity || 0]}
                    min={0}
                    max={1}
                    step={0.05}
                    onValueChange={([v]) => updateExtras(skin.id, { backgroundOpacity: v })}
                  />
                </div>
              </>
            )}
          </section>

          {/* Gradientes */}
          <section className="rounded-lg border border-border bg-card/50 p-3 space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Gradientes</h4>
            <p className="text-[11px] text-muted-foreground">
              Aplique gradientes coloridos a elementos específicos da interface.
            </p>
            {gradientTargets.map((g) => {
              const current: SkinGradient = extras.gradients?.[g.key] || {
                enabled: false,
                from: hslTokenToHex(resolveTokenValue(skin, "primary")) || "#3b82f6",
                to: hslTokenToHex(resolveTokenValue(skin, "accent")) || "#9333ea",
                angle: 135,
              };
              const enabled = !!extras.gradients?.[g.key]?.enabled;
              return (
                <div key={g.key} className="rounded-md border border-border bg-background/40 p-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-6 w-12 rounded border border-border"
                        style={{ background: `linear-gradient(${current.angle}deg, ${current.from}, ${current.to})` }}
                      />
                      <span className="text-xs font-medium">{g.label}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setGradient(skin.id, g.key, enabled ? null : { ...current, enabled: true })}
                      className={cn(
                        "text-[11px] px-2 py-0.5 rounded border transition-colors",
                        enabled
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-card text-muted-foreground border-border hover:text-foreground",
                      )}
                    >
                      {enabled ? "Ativo" : "Desligado"}
                    </button>
                  </div>
                  {enabled && (
                    <div className="mt-2 grid grid-cols-[auto_auto_1fr] gap-2 items-center">
                      <input
                        type="color"
                        value={current.from}
                        onChange={(e) =>
                          setGradient(skin.id, g.key, { ...current, from: e.target.value, enabled: true })
                        }
                        className="h-7 w-9 rounded border border-border bg-transparent cursor-pointer"
                      />
                      <input
                        type="color"
                        value={current.to}
                        onChange={(e) => setGradient(skin.id, g.key, { ...current, to: e.target.value, enabled: true })}
                        className="h-7 w-9 rounded border border-border bg-transparent cursor-pointer"
                      />
                      <div className="flex items-center gap-2">
                        <Slider
                          value={[current.angle]}
                          min={0}
                          max={360}
                          step={5}
                          onValueChange={([v]) => setGradient(skin.id, g.key, { ...current, angle: v, enabled: true })}
                        />
                        <span className="text-[10px] font-mono text-muted-foreground w-10 text-right">
                          {current.angle}°
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </section>

          {/* Sombras */}
          <section className="rounded-lg border border-border bg-card/50 p-3 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Sombras</h4>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-foreground">Intensidade</span>
                <span className="text-xs font-mono text-muted-foreground">{Math.round(shadowIntensity * 100)}%</span>
              </div>
              <Slider
                value={[shadowIntensity]}
                min={0}
                max={2}
                step={0.05}
                onValueChange={([v]) => updateExtras(skin.id, { shadowIntensity: v })}
              />
            </div>
          </section>
        </div>

        <DialogFooter className="flex flex-row justify-between items-center gap-2 sm:justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              resetCustomSkin(skin.id);
              toast.success("Skin restaurada ao padrão");
            }}
            className="gap-1.5 text-muted-foreground"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Limpar todas
          </Button>
          <Button size="sm" onClick={() => onOpenChange(false)}>
            Concluir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function SkinSelector() {
  const { skins, activeSkin, setActiveSkin, createCustomSkin, duplicateSkin, deleteCustomSkin } = useSkin();
  const [editingId, setEditingId] = useState<string | null>(null);

  const editing = editingId ? (skins.find((s) => s.id === editingId) ?? null) : null;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {skins.map((skin) => {
          const isActive = skin.id === activeSkin.id;
          return (
            <div
              key={skin.id}
              className={cn(
                "group relative rounded-xl border bg-card text-card-foreground p-3 transition-colors duration-300",
                isActive ? "border-primary ring-2 ring-primary/40" : "border-border hover:border-primary/50",
              )}
            >
              <button
                type="button"
                onClick={() => setActiveSkin(skin.id)}
                className="w-full text-left"
                aria-pressed={isActive}
              >
                <PreviewSwatches skin={skin} />
                <div className="mt-3 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{skin.label}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                      {skin.builtin ? "Padrão" : "Personalizada"} · {skin.base === "light" ? "Claro" : "Escuro"}
                    </p>
                  </div>
                  {isActive && (
                    <span className="shrink-0 h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                      <Check className="w-3 h-3" />
                    </span>
                  )}
                </div>
              </button>

              <div className="mt-3 pt-3 border-t border-border flex items-center gap-1">
                {!skin.builtin && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 gap-1 text-xs"
                    onClick={() => setEditingId(skin.id)}
                  >
                    <Pencil className="w-3 h-3" />
                    Editar
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 gap-1 text-xs"
                  onClick={() => {
                    const created = duplicateSkin(skin.id);
                    if (created) {
                      setEditingId(created.id);
                      toast.success(`Skin "${created.label}" criada`);
                    }
                  }}
                  title="Duplicar e editar"
                >
                  <Copy className="w-3 h-3" />
                  Duplicar
                </Button>
                {!skin.builtin && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 gap-1 text-xs text-destructive hover:text-destructive ml-auto"
                    onClick={() => {
                      if (confirm(`Excluir a skin "${skin.label}"?`)) {
                        deleteCustomSkin(skin.id);
                        toast.success("Skin excluída");
                      }
                    }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                )}
              </div>
            </div>
          );
        })}

        <button
          type="button"
          onClick={() => {
            const created = createCustomSkin({
              label: "Minha skin",
              base: activeSkin.base,
              from: activeSkin,
            });
            setEditingId(created.id);
          }}
          className="rounded-xl border-2 border-dashed border-border hover:border-primary/60 hover:text-primary text-muted-foreground p-4 flex flex-col items-center justify-center gap-1.5 transition-colors min-h-[120px]"
        >
          <Plus className="w-5 h-5" />
          <span className="text-xs font-medium">Criar skin</span>
          <span className="text-[10px] text-muted-foreground">a partir da ativa</span>
        </button>
      </div>

      {editing && <SkinEditor skin={editing} open={!!editingId} onOpenChange={(o) => !o && setEditingId(null)} />}

      <p className="text-[11px] text-muted-foreground">
        Dica: duplique uma skin padrão para começar e ajuste cada token via seletor de cor. Suas skins ficam salvas
        neste navegador.
      </p>
    </div>
  );
}
