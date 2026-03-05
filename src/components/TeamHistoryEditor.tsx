import { useState, useRef } from "react";
import { Plus, Trash2, Upload, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { TeamHistory } from "@/lib/teamHistoryUtils";
import { useTournamentStore } from "@/store/tournamentStore";
import { processImage, revokeImagePreview } from "@/lib/imageUtils";
import { uploadLogo } from "@/lib/storageUtils";
import { toast } from "sonner";

interface TeamHistoryEditorProps {
  teamId: string;
}

export default function TeamHistoryEditor({ teamId }: TeamHistoryEditorProps) {
  const { teamHistories, addTeamHistory, updateTeamHistory, removeTeamHistory } = useTournamentStore();
  const histories = teamHistories.filter((h) => h.teamId === teamId).sort((a, b) => a.startYear - b.startYear);

  const [adding, setAdding] = useState(false);
  const [singleYear, setSingleYear] = useState(false);
  const [newStartYear, setNewStartYear] = useState("");
  const [newEndYear, setNewEndYear] = useState("");
  const [newName, setNewName] = useState("");
  const [newShortName, setNewShortName] = useState("");
  const [newAbbreviation, setNewAbbreviation] = useState("");
  const [newColors, setNewColors] = useState<string[]>([]);
  const [newRating, setNewRating] = useState("");
  const [newLogoPreview, setNewLogoPreview] = useState<string | undefined>();
  const [newPendingBlob, setNewPendingBlob] = useState<{ blob: Blob; filename: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (newLogoPreview?.startsWith("blob:")) revokeImagePreview(newLogoPreview);
    try {
      const processed = await processImage(file);
      setNewLogoPreview(processed.previewUrl);
      setNewPendingBlob({ blob: processed.blob, filename: processed.filename });
    } catch {
      toast.error("Erro ao processar imagem");
    }
  };

  const resetForm = () => {
    setNewStartYear("");
    setNewEndYear("");
    setNewName("");
    setNewShortName("");
    setNewAbbreviation("");
    setNewColors([]);
    setNewRating("");
    if (newLogoPreview?.startsWith("blob:")) revokeImagePreview(newLogoPreview);
    setNewLogoPreview(undefined);
    setNewPendingBlob(null);
    setSingleYear(false);
    setAdding(false);
  };

  const handleAdd = async () => {
    const startYear = parseInt(newStartYear);
    const endYear = singleYear ? startYear : parseInt(newEndYear);
    if (!startYear || (!singleYear && (!endYear || endYear < startYear))) {
      toast.error("Informe um período válido");
      return;
    }

    // Must have at least one field filled (besides the year)
    const hasVisual = newName || newShortName || newAbbreviation || newColors.length > 0 || newPendingBlob;
    const hasRating = newRating.trim() !== "";
    if (!hasVisual && !hasRating) {
      toast.error("Preencha ao menos um campo além do período");
      return;
    }

    setUploading(true);
    let logoUrl: string | undefined;

    try {
      if (newPendingBlob) {
        const path = `teams/${teamId}_hist_${Date.now()}.webp`;
        logoUrl = await uploadLogo(newPendingBlob.blob, path);
      }

      await addTeamHistory({
        id: crypto.randomUUID(),
        teamId,
        startYear,
        endYear,
        logo: logoUrl,
        rating: hasRating ? Math.min(9.99, Math.max(0.01, parseFloat(newRating) || 0)) : undefined,
        name: newName.trim() || undefined,
        shortName: newShortName.trim() || undefined,
        abbreviation: newAbbreviation.trim() || undefined,
        colors: newColors.length > 0 ? newColors : undefined,
      });

      resetForm();
      toast.success("Versão histórica adicionada!");
    } catch {
      toast.error("Erro ao salvar versão histórica");
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async (id: string) => {
    await removeTeamHistory(id);
    toast.success("Versão histórica removida");
  };

  const formatPeriod = (h: TeamHistory) => {
    return h.startYear === h.endYear ? `${h.startYear}` : `${h.startYear} – ${h.endYear}`;
  };

  const getHistoryDetails = (h: TeamHistory) => {
    const parts: string[] = [];
    if (h.name) parts.push(h.name);
    if (h.rating !== undefined && h.rating !== null) parts.push(`Rate: ${Number(h.rating).toFixed(2)}`);
    if (h.colors?.length) parts.push(`${h.colors.length} cor(es)`);
    if (h.logo) parts.push("Escudo");
    return parts.join(" · ") || "Sem alterações visuais";
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-bold text-foreground">Versões Históricas</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Defina escudos, nomes, cores e rates por período. Serão usados automaticamente conforme o ano da competição.
        </p>
      </div>

      {histories.length > 0 && (
        <div className="space-y-2">
          {histories.map((h) => (
            <div key={h.id} className="rounded-lg bg-secondary/30 border border-border overflow-hidden">
              <div
                className="flex items-center gap-3 p-3 cursor-pointer hover:bg-secondary/50 transition-colors"
                onClick={() => setExpandedId(expandedId === h.id ? null : h.id)}
              >
                <div className="w-10 h-10 rounded-lg bg-secondary border border-border flex items-center justify-center overflow-hidden shrink-0">
                  {h.logo ? (
                    <img src={h.logo} alt="" className="w-full h-full object-contain" />
                  ) : (
                    <span className="text-[10px] text-muted-foreground">—</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-foreground">{formatPeriod(h)}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{getHistoryDetails(h)}</p>
                </div>
                {expandedId === h.id ? (
                  <ChevronUp className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                )}
              </div>

              {expandedId === h.id && (
                <div className="px-3 pb-3 pt-1 border-t border-border space-y-1.5">
                  {h.name && <p className="text-[11px] text-foreground"><span className="text-muted-foreground">Nome:</span> {h.name}</p>}
                  {h.shortName && <p className="text-[11px] text-foreground"><span className="text-muted-foreground">Nome Curto:</span> {h.shortName}</p>}
                  {h.abbreviation && <p className="text-[11px] text-foreground"><span className="text-muted-foreground">Abreviação:</span> {h.abbreviation}</p>}
                  {h.rating !== undefined && h.rating !== null && (
                    <p className="text-[11px] text-foreground"><span className="text-muted-foreground">Rate:</span> {Number(h.rating).toFixed(2)}</p>
                  )}
                  {h.colors && h.colors.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-muted-foreground">Cores:</span>
                      {h.colors.map((c, i) => (
                        <div key={i} className="w-4 h-4 rounded border border-border" style={{ backgroundColor: c }} />
                      ))}
                    </div>
                  )}
                  <div className="pt-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleRemove(h.id); }}
                      className="flex items-center gap-1 text-[11px] text-destructive hover:underline"
                    >
                      <Trash2 className="w-3 h-3" /> Remover
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!adding ? (
        <Button type="button" variant="outline" size="sm" onClick={() => setAdding(true)} className="gap-1.5 w-full">
          <Plus className="w-3.5 h-3.5" />
          Adicionar Versão Histórica
        </Button>
      ) : (
        <div className="p-4 rounded-lg border border-primary/30 bg-primary/5 space-y-4">
          {/* Period */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-foreground">Período</Label>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground">Ano único</span>
                <Switch checked={singleYear} onCheckedChange={(v) => { setSingleYear(v); if (v) setNewEndYear(""); }} />
              </div>
            </div>
            <div className={singleYear ? "" : "grid grid-cols-2 gap-3"}>
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">{singleYear ? "Ano" : "Início"}</Label>
                <Input
                  type="number"
                  value={newStartYear}
                  onChange={(e) => setNewStartYear(e.target.value)}
                  placeholder={singleYear ? "1970" : "1968"}
                  className="bg-secondary border-border h-8 text-sm"
                  min={1800} max={2100}
                />
              </div>
              {!singleYear && (
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Fim</Label>
                  <Input
                    type="number"
                    value={newEndYear}
                    onChange={(e) => setNewEndYear(e.target.value)}
                    placeholder="1974"
                    className="bg-secondary border-border h-8 text-sm"
                    min={1800} max={2100}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Visual section */}
          <div className="space-y-3 pt-2 border-t border-border">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Identidade Visual</p>

            {/* Logo */}
            <div className="space-y-1">
              <Label className="text-xs text-foreground">Escudo da Época</Label>
              <div className="flex items-center gap-3">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-12 h-12 rounded-lg bg-secondary border border-border flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors overflow-hidden"
                >
                  {newLogoPreview ? (
                    <img src={newLogoPreview} alt="" className="w-full h-full object-contain" />
                  ) : (
                    <Upload className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoSelect} className="hidden" />
                <span className="text-[10px] text-muted-foreground">Opcional. Se vazio, usa o escudo atual.</span>
              </div>
            </div>

            {/* Name fields */}
            <div className="space-y-1">
              <Label className="text-xs text-foreground">Nome Completo</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ex: Futbol Club Barcelona"
                className="bg-secondary border-border h-8 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-foreground">Nome Curto</Label>
                <Input
                  value={newShortName}
                  onChange={(e) => setNewShortName(e.target.value)}
                  placeholder="Ex: Barcelona"
                  className="bg-secondary border-border h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-foreground">Abreviação</Label>
                <Input
                  value={newAbbreviation}
                  onChange={(e) => setNewAbbreviation(e.target.value.toUpperCase().slice(0, 3))}
                  placeholder="BAR"
                  maxLength={3}
                  className="bg-secondary border-border h-8 text-sm uppercase"
                />
              </div>
            </div>

            {/* Colors */}
            <div className="space-y-1">
              <Label className="text-xs text-foreground">
                Cores <span className="text-muted-foreground font-normal">({newColors.length}/5)</span>
              </Label>
              <div className="flex flex-wrap items-center gap-2">
                {newColors.map((color, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => {
                        const next = [...newColors];
                        next[i] = e.target.value;
                        setNewColors(next);
                      }}
                      className="w-8 h-8 rounded cursor-pointer border border-border bg-transparent"
                    />
                    <button
                      type="button"
                      onClick={() => setNewColors(newColors.filter((_, j) => j !== i))}
                      className="p-0.5 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {newColors.length < 5 && (
                  <button
                    type="button"
                    onClick={() => setNewColors([...newColors, "#888888"])}
                    className="w-8 h-8 rounded border-2 border-dashed border-border flex items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                )}
              </div>
              <span className="text-[10px] text-muted-foreground">Opcional. Se vazio, usa as cores atuais.</span>
            </div>
          </div>

          {/* Rate section - separate */}
          <div className="space-y-2 pt-2 border-t border-border">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Força / Pontuação</p>
            <div className="space-y-1">
              <Label className="text-xs text-foreground">Rate (0.01 – 9.99)</Label>
              <Input
                type="number"
                value={newRating}
                onChange={(e) => setNewRating(e.target.value)}
                step="0.01"
                min="0.01"
                max="9.99"
                placeholder="Deixe vazio para manter o rate padrão"
                className="bg-secondary border-border h-8 text-sm w-full font-mono"
              />
              <span className="text-[10px] text-muted-foreground">Opcional. Se vazio, mantém o rate padrão do time.</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <Button type="button" size="sm" onClick={handleAdd} disabled={uploading} className="gap-1.5 bg-primary text-primary-foreground">
              {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              Salvar
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={resetForm}>
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
