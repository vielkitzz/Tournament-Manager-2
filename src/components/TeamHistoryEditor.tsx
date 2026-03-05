import { useState, useRef } from "react";
import { Plus, Trash2, Upload, Loader2, ChevronDown, ChevronUp, Pencil, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { TeamHistory } from "@/lib/teamHistoryUtils";
import { useTournamentStore } from "@/store/tournamentStore";
import { processImage, revokeImagePreview } from "@/lib/imageUtils";
import { uploadLogo } from "@/lib/storageUtils";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface TeamHistoryEditorProps {
  teamId: string;
}

interface HistoryFormState {
  singleYear: boolean;
  startYear: string;
  endYear: string;
  name: string;
  shortName: string;
  abbreviation: string;
  colors: string[];
  rating: string;
  logoPreview?: string;
  pendingBlob: { blob: Blob; filename: string } | null;
}

const emptyForm = (): HistoryFormState => ({
  singleYear: false,
  startYear: "",
  endYear: "",
  name: "",
  shortName: "",
  abbreviation: "",
  colors: [],
  rating: "",
  logoPreview: undefined,
  pendingBlob: null,
});

const historyToForm = (h: TeamHistory): HistoryFormState => ({
  singleYear: h.startYear === h.endYear,
  startYear: h.startYear.toString(),
  endYear: h.endYear.toString(),
  name: h.name || "",
  shortName: h.shortName || "",
  abbreviation: h.abbreviation || "",
  colors: h.colors ? [...h.colors] : [],
  rating: h.rating !== undefined && h.rating !== null ? Number(h.rating).toFixed(2) : "",
  logoPreview: h.logo,
  pendingBlob: null,
});

export default function TeamHistoryEditor({ teamId }: TeamHistoryEditorProps) {
  const { teamHistories, addTeamHistory, updateTeamHistory, removeTeamHistory } = useTournamentStore();
  const histories = teamHistories.filter((h) => h.teamId === teamId).sort((a, b) => a.startYear - b.startYear);

  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<HistoryFormState>(emptyForm());
  const [uploading, setUploading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  const updateForm = (patch: Partial<HistoryFormState>) => setForm((prev) => ({ ...prev, ...patch }));

  const handleLogoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (form.logoPreview?.startsWith("blob:")) revokeImagePreview(form.logoPreview);
    try {
      const processed = await processImage(file);
      updateForm({ logoPreview: processed.previewUrl, pendingBlob: { blob: processed.blob, filename: processed.filename } });
    } catch {
      toast.error("Erro ao processar imagem");
    }
  };

  const resetForm = () => {
    if (form.logoPreview?.startsWith("blob:")) revokeImagePreview(form.logoPreview);
    setForm(emptyForm());
    setAdding(false);
    setEditingId(null);
  };

  const validateForm = (): { startYear: number; endYear: number } | null => {
    const startYear = parseInt(form.startYear);
    const endYear = form.singleYear ? startYear : parseInt(form.endYear);
    if (!startYear || (!form.singleYear && (!endYear || endYear < startYear))) {
      toast.error("Informe um período válido");
      return null;
    }
    const hasVisual = form.name || form.shortName || form.abbreviation || form.colors.length > 0 || form.pendingBlob || form.logoPreview;
    const hasRating = form.rating.trim() !== "";
    if (!hasVisual && !hasRating) {
      toast.error("Preencha ao menos um campo além do período");
      return null;
    }
    return { startYear, endYear };
  };

  const uploadLogoIfNeeded = async (): Promise<string | undefined> => {
    if (form.pendingBlob) {
      const path = `teams/${teamId}_hist_${Date.now()}.webp`;
      return await uploadLogo(form.pendingBlob.blob, path);
    }
    return form.logoPreview; // keep existing or undefined
  };

  const buildData = (startYear: number, endYear: number, logoUrl?: string) => ({
    teamId,
    startYear,
    endYear,
    logo: logoUrl,
    rating: form.rating.trim() ? Math.min(9.99, Math.max(0.01, parseFloat(form.rating) || 0)) : undefined,
    name: form.name.trim() || undefined,
    shortName: form.shortName.trim() || undefined,
    abbreviation: form.abbreviation.trim() || undefined,
    colors: form.colors.length > 0 ? form.colors : undefined,
  });

  const handleAdd = async () => {
    const period = validateForm();
    if (!period) return;
    setUploading(true);
    try {
      const logoUrl = await uploadLogoIfNeeded();
      await addTeamHistory({ id: crypto.randomUUID(), ...buildData(period.startYear, period.endYear, logoUrl) });
      resetForm();
      toast.success("Versão histórica adicionada!");
    } catch {
      toast.error("Erro ao salvar versão histórica");
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = (h: TeamHistory) => {
    resetForm();
    setEditingId(h.id);
    setForm(historyToForm(h));
    setExpandedId(h.id);
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    const period = validateForm();
    if (!period) return;
    setUploading(true);
    try {
      const logoUrl = await uploadLogoIfNeeded();
      await updateTeamHistory(editingId, buildData(period.startYear, period.endYear, logoUrl));
      resetForm();
      toast.success("Versão histórica atualizada!");
    } catch {
      toast.error("Erro ao atualizar versão histórica");
    } finally {
      setUploading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteId) return;
    await removeTeamHistory(deleteId);
    if (editingId === deleteId) resetForm();
    setDeleteId(null);
    toast.success("Versão histórica removida");
  };

  const formatPeriod = (h: TeamHistory) => (h.startYear === h.endYear ? `${h.startYear}` : `${h.startYear} – ${h.endYear}`);

  const getHistoryDetails = (h: TeamHistory) => {
    const parts: string[] = [];
    if (h.name) parts.push(h.name);
    if (h.rating !== undefined && h.rating !== null) parts.push(`Rate: ${Number(h.rating).toFixed(2)}`);
    if (h.colors?.length) parts.push(`${h.colors.length} cor(es)`);
    if (h.logo) parts.push("Escudo");
    return parts.join(" · ") || "Sem alterações visuais";
  };

  const renderFormFields = (isEdit: boolean) => (
    <div className="space-y-4">
      {/* Period */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-bold text-foreground">Período</Label>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground">Ano único</span>
            <Switch checked={form.singleYear} onCheckedChange={(v) => { updateForm({ singleYear: v }); if (v) updateForm({ endYear: "" }); }} />
          </div>
        </div>
        <div className={form.singleYear ? "" : "grid grid-cols-2 gap-3"}>
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">{form.singleYear ? "Ano" : "Início"}</Label>
            <Input type="number" value={form.startYear} onChange={(e) => updateForm({ startYear: e.target.value })} placeholder={form.singleYear ? "1970" : "1968"} className="bg-secondary border-border h-8 text-sm" min={1800} max={2100} />
          </div>
          {!form.singleYear && (
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Fim</Label>
              <Input type="number" value={form.endYear} onChange={(e) => updateForm({ endYear: e.target.value })} placeholder="1974" className="bg-secondary border-border h-8 text-sm" min={1800} max={2100} />
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
              onClick={() => (isEdit ? editFileInputRef : fileInputRef).current?.click()}
              className="w-12 h-12 rounded-lg bg-secondary border border-border flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors overflow-hidden"
            >
              {form.logoPreview ? (
                <img src={form.logoPreview} alt="" className="w-full h-full object-contain" />
              ) : (
                <Upload className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
            <input ref={isEdit ? editFileInputRef : fileInputRef} type="file" accept="image/*" onChange={handleLogoSelect} className="hidden" />
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] text-muted-foreground">Opcional. Se vazio, usa o escudo atual.</span>
              {form.logoPreview && (
                <button type="button" onClick={() => updateForm({ logoPreview: undefined, pendingBlob: null })} className="text-[10px] text-destructive hover:underline text-left">
                  Remover escudo
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Name fields */}
        <div className="space-y-1">
          <Label className="text-xs text-foreground">Nome Completo</Label>
          <Input value={form.name} onChange={(e) => updateForm({ name: e.target.value })} placeholder="Ex: Futbol Club Barcelona" className="bg-secondary border-border h-8 text-sm" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-foreground">Nome Curto</Label>
            <Input value={form.shortName} onChange={(e) => updateForm({ shortName: e.target.value })} placeholder="Ex: Barcelona" className="bg-secondary border-border h-8 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-foreground">Abreviação</Label>
            <Input value={form.abbreviation} onChange={(e) => updateForm({ abbreviation: e.target.value.toUpperCase().slice(0, 3) })} placeholder="BAR" maxLength={3} className="bg-secondary border-border h-8 text-sm uppercase" />
          </div>
        </div>

        {/* Colors */}
        <div className="space-y-1">
          <Label className="text-xs text-foreground">
            Cores <span className="text-muted-foreground font-normal">({form.colors.length}/5)</span>
          </Label>
          <div className="flex flex-wrap items-center gap-2">
            {form.colors.map((color, i) => (
              <div key={i} className="flex items-center gap-1">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => {
                    const next = [...form.colors];
                    next[i] = e.target.value;
                    updateForm({ colors: next });
                  }}
                  className="w-8 h-8 rounded cursor-pointer border border-border bg-transparent"
                />
                <button type="button" onClick={() => updateForm({ colors: form.colors.filter((_, j) => j !== i) })} className="p-0.5 text-muted-foreground hover:text-destructive transition-colors">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
            {form.colors.length < 5 && (
              <button type="button" onClick={() => updateForm({ colors: [...form.colors, "#888888"] })} className="w-8 h-8 rounded border-2 border-dashed border-border flex items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                <Plus className="w-3 h-3" />
              </button>
            )}
          </div>
          <span className="text-[10px] text-muted-foreground">Opcional. Se vazio, usa as cores atuais.</span>
        </div>
      </div>

      {/* Rate section */}
      <div className="space-y-2 pt-2 border-t border-border">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Força / Pontuação</p>
        <div className="space-y-1">
          <Label className="text-xs text-foreground">Rate (0.01 – 9.99)</Label>
          <Input type="number" value={form.rating} onChange={(e) => updateForm({ rating: e.target.value })} step="0.01" min="0.01" max="9.99" placeholder="Deixe vazio para manter o rate padrão" className="bg-secondary border-border h-8 text-sm w-full font-mono" />
          <span className="text-[10px] text-muted-foreground">Opcional. Se vazio, mantém o rate padrão do time.</span>
        </div>
      </div>
    </div>
  );

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
                onClick={() => { if (editingId !== h.id) setExpandedId(expandedId === h.id ? null : h.id); }}
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
                {editingId !== h.id && (
                  expandedId === h.id ? (
                    <ChevronUp className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  )
                )}
              </div>

              {expandedId === h.id && editingId === h.id && (
                <div className="px-3 pb-3 pt-1 border-t border-border">
                  {renderFormFields(true)}
                  <div className="flex gap-2 pt-3">
                    <Button type="button" size="sm" onClick={handleSaveEdit} disabled={uploading} className="gap-1.5 bg-primary text-primary-foreground">
                      {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      Salvar
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={resetForm} className="gap-1">
                      <X className="w-3.5 h-3.5" /> Cancelar
                    </Button>
                  </div>
                </div>
              )}

              {expandedId === h.id && editingId !== h.id && (
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
                  <div className="pt-2 flex items-center gap-3">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleEdit(h); }}
                      className="flex items-center gap-1 text-[11px] text-primary hover:underline"
                    >
                      <Pencil className="w-3 h-3" /> Editar
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteId(h.id); }}
                      className="flex items-center gap-1 text-[11px] text-destructive hover:underline"
                    >
                      <Trash2 className="w-3 h-3" /> Excluir
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!adding && !editingId ? (
        <Button type="button" variant="outline" size="sm" onClick={() => { resetForm(); setAdding(true); }} className="gap-1.5 w-full">
          <Plus className="w-3.5 h-3.5" />
          Adicionar Versão Histórica
        </Button>
      ) : adding ? (
        <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
          {renderFormFields(false)}
          <div className="flex gap-2 pt-3">
            <Button type="button" size="sm" onClick={handleAdd} disabled={uploading} className="gap-1.5 bg-primary text-primary-foreground">
              {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              Salvar
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={resetForm}>
              Cancelar
            </Button>
          </div>
        </div>
      ) : null}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir versão histórica?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
