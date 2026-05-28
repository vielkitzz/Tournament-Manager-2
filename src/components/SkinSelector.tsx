import { useEffect, useState } from "react";
import { Check, Copy, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import {
  SKIN_TOKEN_GROUPS,
  hexToHslToken,
  hslTokenToHex,
  resolveTokenValue,
  useSkin,
  type Skin,
} from "@/hooks/useSkin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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
  const { updateCustomSkin, setCustomToken, resetCustomSkin } = useSkin();
  const [label, setLabel] = useState(skin.label);

  useEffect(() => setLabel(skin.label), [skin.id, skin.label]);

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
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {group.label}
                </h4>
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
  const {
    skins,
    activeSkin,
    setActiveSkin,
    createCustomSkin,
    duplicateSkin,
    deleteCustomSkin,
  } = useSkin();
  const [editingId, setEditingId] = useState<string | null>(null);

  const editing = editingId ? skins.find((s) => s.id === editingId) ?? null : null;

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
                      {skin.builtin ? "Padrão" : "Personalizada"} ·{" "}
                      {skin.base === "light" ? "Claro" : "Escuro"}
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

      {editing && (
        <SkinEditor
          skin={editing}
          open={!!editingId}
          onOpenChange={(o) => !o && setEditingId(null)}
        />
      )}

      <p className="text-[11px] text-muted-foreground">
        Dica: duplique uma skin padrão para começar e ajuste cada token via seletor de cor. Suas
        skins ficam salvas neste navegador.
      </p>
    </div>
  );
}