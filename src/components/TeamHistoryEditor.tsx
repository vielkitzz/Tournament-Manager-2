import { useState, useRef } from "react";
import { Plus, Trash2, Upload, Loader2, Pencil, X, Check, Image, Type, Hash, Palette, Star, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { HistoryFieldType, TeamHistory, FIELD_TYPE_LABELS, findOverlappingHistory } from "@/lib/teamHistoryUtils";
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

const FIELD_ICONS: Record<Exclude<HistoryFieldType, 'legacy'>, React.ReactNode> = {
  logo: <Image className="w-3.5 h-3.5" />,
  name: <FileText className="w-3.5 h-3.5" />,
  short_name: <Type className="w-3.5 h-3.5" />,
  abbreviation: <Hash className="w-3.5 h-3.5" />,
  colors: <Palette className="w-3.5 h-3.5" />,
  rating: <Star className="w-3.5 h-3.5" />,
};

const FIELD_TYPES: Exclude<HistoryFieldType, 'legacy'>[] = ['logo', 'name', 'short_name', 'abbreviation', 'colors', 'rating'];

interface AddingState {
  fieldType: Exclude<HistoryFieldType, 'legacy'>;
  singleYear: boolean;
  startYear: string;
  endYear: string;
  // field values
  value: string;
  colors: string[];
  logoPreview?: string;
  pendingBlob: { blob: Blob; filename: string } | null;
}

const emptyAdding = (ft: Exclude<HistoryFieldType, 'legacy'>): AddingState => ({
  fieldType: ft,
  singleYear: false,
  startYear: "",
  endYear: "",
  value: "",
  colors: [],
  logoPreview: undefined,
  pendingBlob: null,
});

export default function TeamHistoryEditor({ teamId }: TeamHistoryEditorProps) {
  const { teamHistories, addTeamHistory, updateTeamHistory, removeTeamHistory } = useTournamentStore();
  const histories = teamHistories.filter((h) => h.teamId === teamId);

  const [adding, setAdding] = useState<AddingState | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editState, setEditState] = useState<AddingState | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  const getEntriesForType = (ft: Exclude<HistoryFieldType, 'legacy'>) =>
    histories
      .filter((h) => h.fieldType === ft || (h.fieldType === 'legacy' && hasFieldValue(h, ft)))
      .sort((a, b) => a.startYear - b.startYear);

  const hasFieldValue = (h: TeamHistory, ft: Exclude<HistoryFieldType, 'legacy'>): boolean => {
    switch (ft) {
      case 'logo': return !!h.logo;
      case 'name': return !!h.name;
      case 'short_name': return !!h.shortName;
      case 'abbreviation': return !!h.abbreviation;
      case 'colors': return !!(h.colors && h.colors.length > 0);
      case 'rating': return h.rating !== undefined && h.rating !== null;
    }
  };

  const getDisplayValue = (h: TeamHistory, ft: Exclude<HistoryFieldType, 'legacy'>): string => {
    switch (ft) {
      case 'logo': return h.logo ? '🛡️ Escudo definido' : '—';
      case 'name': return h.name || '—';
      case 'short_name': return h.shortName || '—';
      case 'abbreviation': return h.abbreviation || '—';
      case 'colors': return h.colors?.length ? `${h.colors.length} cor(es)` : '—';
      case 'rating': return h.rating != null ? Number(h.rating).toFixed(2) : '—';
    }
  };

  const formatPeriod = (h: TeamHistory) =>
    h.startYear === h.endYear ? `${h.startYear}` : `${h.startYear} – ${h.endYear}`;

  const historyToEditState = (h: TeamHistory, ft: Exclude<HistoryFieldType, 'legacy'>): AddingState => ({
    fieldType: ft,
    singleYear: h.startYear === h.endYear,
    startYear: h.startYear.toString(),
    endYear: h.endYear.toString(),
    value: ft === 'name' ? (h.name || '') :
           ft === 'short_name' ? (h.shortName || '') :
           ft === 'abbreviation' ? (h.abbreviation || '') :
           ft === 'rating' ? (h.rating != null ? Number(h.rating).toFixed(2) : '') : '',
    colors: h.colors ? [...h.colors] : [],
    logoPreview: h.logo,
    pendingBlob: null,
  });

  const handleLogoSelect = async (e: React.ChangeEvent<HTMLInputElement>, isEdit: boolean) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const state = isEdit ? editState : adding;
    if (state?.logoPreview?.startsWith("blob:")) revokeImagePreview(state.logoPreview);
    try {
      const processed = await processImage(file);
      const patch = { logoPreview: processed.previewUrl, pendingBlob: { blob: processed.blob, filename: processed.filename } };
      if (isEdit) setEditState((p) => p ? { ...p, ...patch } : p);
      else setAdding((p) => p ? { ...p, ...patch } : p);
    } catch {
      toast.error("Erro ao processar imagem");
    }
  };

  const validatePeriod = (state: AddingState): { startYear: number; endYear: number } | null => {
    const startYear = parseInt(state.startYear);
    const endYear = state.singleYear ? startYear : parseInt(state.endYear);
    if (!startYear || (!state.singleYear && (!endYear || endYear < startYear))) {
      toast.error("Informe um período válido");
      return null;
    }
    return { startYear, endYear };
  };

  const validateValue = (state: AddingState): boolean => {
    switch (state.fieldType) {
      case 'logo': return !!(state.pendingBlob || state.logoPreview);
      case 'colors': return state.colors.length > 0;
      case 'rating': return state.value.trim() !== '';
      default: return state.value.trim() !== '';
    }
  };

  const checkOverlap = (state: AddingState, startYear: number, endYear: number, excludeId?: string): boolean => {
    const overlap = findOverlappingHistory(histories, teamId, state.fieldType, startYear, endYear, excludeId);
    if (overlap) {
      const label = FIELD_TYPE_LABELS[state.fieldType];
      toast.error(`Já existe uma versão de "${label}" no período ${formatPeriod(overlap)}`);
      return true;
    }
    return false;
  };

  const uploadLogoIfNeeded = async (state: AddingState): Promise<string | undefined> => {
    if (state.pendingBlob) {
      const path = `teams/${teamId}_hist_${Date.now()}.webp`;
      return await uploadLogo(state.pendingBlob.blob, path);
    }
    return state.logoPreview;
  };

  const buildHistoryData = (state: AddingState, startYear: number, endYear: number, logoUrl?: string): Omit<TeamHistory, 'id'> => {
    const base = { teamId, startYear, endYear, fieldType: state.fieldType as HistoryFieldType };
    switch (state.fieldType) {
      case 'logo': return { ...base, logo: logoUrl };
      case 'name': return { ...base, name: state.value.trim() };
      case 'short_name': return { ...base, shortName: state.value.trim() };
      case 'abbreviation': return { ...base, abbreviation: state.value.trim().toUpperCase() };
      case 'colors': return { ...base, colors: state.colors };
      case 'rating': return { ...base, rating: Math.min(9.99, Math.max(0.01, parseFloat(state.value) || 0)) };
    }
  };

  const handleAdd = async () => {
    if (!adding) return;
    const period = validatePeriod(adding);
    if (!period) return;
    if (!validateValue(adding)) { toast.error("Preencha o valor"); return; }
    if (checkOverlap(adding, period.startYear, period.endYear)) return;

    setUploading(true);
    try {
      const logoUrl = adding.fieldType === 'logo' ? await uploadLogoIfNeeded(adding) : undefined;
      const data = buildHistoryData(adding, period.startYear, period.endYear, logoUrl);
      await addTeamHistory({ id: crypto.randomUUID(), ...data });
      if (adding.logoPreview?.startsWith("blob:")) revokeImagePreview(adding.logoPreview);
      setAdding(null);
      toast.success(`${FIELD_TYPE_LABELS[adding.fieldType]} histórico adicionado!`);
    } catch {
      toast.error("Erro ao salvar");
    } finally {
      setUploading(false);
    }
  };

  const handleStartEdit = (h: TeamHistory, ft: Exclude<HistoryFieldType, 'legacy'>) => {
    setEditingId(h.id);
    setEditState(historyToEditState(h, ft));
    setAdding(null);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editState) return;
    const period = validatePeriod(editState);
    if (!period) return;
    if (!validateValue(editState)) { toast.error("Preencha o valor"); return; }
    if (checkOverlap(editState, period.startYear, period.endYear, editingId)) return;

    setUploading(true);
    try {
      const logoUrl = editState.fieldType === 'logo' ? await uploadLogoIfNeeded(editState) : undefined;
      const data = buildHistoryData(editState, period.startYear, period.endYear, logoUrl);
      await updateTeamHistory(editingId, { ...data, fieldType: editState.fieldType });
      if (editState.logoPreview?.startsWith("blob:")) revokeImagePreview(editState.logoPreview);
      setEditingId(null);
      setEditState(null);
      toast.success(`${FIELD_TYPE_LABELS[editState.fieldType]} atualizado!`);
    } catch {
      toast.error("Erro ao atualizar");
    } finally {
      setUploading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteId) return;
    await removeTeamHistory(deleteId);
    if (editingId === deleteId) { setEditingId(null); setEditState(null); }
    setDeleteId(null);
    toast.success("Versão histórica removida");
  };

  const cancelEdit = () => {
    if (editState?.logoPreview?.startsWith("blob:")) revokeImagePreview(editState.logoPreview);
    setEditingId(null);
    setEditState(null);
  };

  const cancelAdd = () => {
    if (adding?.logoPreview?.startsWith("blob:")) revokeImagePreview(adding.logoPreview);
    setAdding(null);
  };

  const renderPeriodFields = (state: AddingState, setState: (patch: Partial<AddingState>) => void) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-bold text-foreground">Período</Label>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground">Ano único</span>
          <Switch checked={state.singleYear} onCheckedChange={(v) => { setState({ singleYear: v }); if (v) setState({ endYear: "" }); }} />
        </div>
      </div>
      <div className={state.singleYear ? "" : "grid grid-cols-2 gap-3"}>
        <div className="space-y-1">
          <Label className="text-[10px] text-muted-foreground">{state.singleYear ? "Ano" : "Início"}</Label>
          <Input type="number" value={state.startYear} onChange={(e) => setState({ startYear: e.target.value })} placeholder={state.singleYear ? "1970" : "1968"} className="bg-secondary border-border h-8 text-sm" min={1800} max={2100} />
        </div>
        {!state.singleYear && (
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Fim</Label>
            <Input type="number" value={state.endYear} onChange={(e) => setState({ endYear: e.target.value })} placeholder="1974" className="bg-secondary border-border h-8 text-sm" min={1800} max={2100} />
          </div>
        )}
      </div>
    </div>
  );

  const renderValueField = (state: AddingState, setState: (patch: Partial<AddingState>) => void, isEdit: boolean) => {
    switch (state.fieldType) {
      case 'logo':
        return (
          <div className="space-y-1">
            <Label className="text-xs text-foreground">Escudo da Época</Label>
            <div className="flex items-center gap-3">
              <div
                onClick={() => (isEdit ? editFileInputRef : fileInputRef).current?.click()}
                className="w-12 h-12 rounded-lg bg-secondary border border-border flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors overflow-hidden"
              >
                {state.logoPreview ? (
                  <img src={state.logoPreview} alt="" className="w-full h-full object-contain" />
                ) : (
                  <Upload className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
              <input ref={isEdit ? editFileInputRef : fileInputRef} type="file" accept="image/*" onChange={(e) => handleLogoSelect(e, isEdit)} className="hidden" />
              {state.logoPreview && (
                <button type="button" onClick={() => setState({ logoPreview: undefined, pendingBlob: null })} className="text-[10px] text-destructive hover:underline">
                  Remover
                </button>
              )}
            </div>
          </div>
        );
      case 'name':
        return (
          <div className="space-y-1">
            <Label className="text-xs text-foreground">Nome Completo</Label>
            <Input value={state.value} onChange={(e) => setState({ value: e.target.value })} placeholder="Ex: Futbol Club Barcelona" className="bg-secondary border-border h-8 text-sm" />
          </div>
        );
      case 'short_name':
        return (
          <div className="space-y-1">
            <Label className="text-xs text-foreground">Nome Curto</Label>
            <Input value={state.value} onChange={(e) => setState({ value: e.target.value })} placeholder="Ex: Barcelona" className="bg-secondary border-border h-8 text-sm" />
          </div>
        );
      case 'abbreviation':
        return (
          <div className="space-y-1">
            <Label className="text-xs text-foreground">Abreviação (3 letras)</Label>
            <Input value={state.value} onChange={(e) => setState({ value: e.target.value.toUpperCase().slice(0, 3) })} placeholder="BAR" maxLength={3} className="bg-secondary border-border h-8 text-sm uppercase" />
          </div>
        );
      case 'colors':
        return (
          <div className="space-y-1">
            <Label className="text-xs text-foreground">
              Cores <span className="text-muted-foreground font-normal">({state.colors.length}/5)</span>
            </Label>
            <div className="flex flex-wrap items-center gap-2">
              {state.colors.map((color, i) => (
                <div key={i} className="flex items-center gap-1">
                  <input type="color" value={color} onChange={(e) => { const next = [...state.colors]; next[i] = e.target.value; setState({ colors: next }); }} className="w-8 h-8 rounded cursor-pointer border border-border bg-transparent" />
                  <button type="button" onClick={() => setState({ colors: state.colors.filter((_, j) => j !== i) })} className="p-0.5 text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {state.colors.length < 5 && (
                <button type="button" onClick={() => setState({ colors: [...state.colors, "#888888"] })} className="w-8 h-8 rounded border-2 border-dashed border-border flex items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                  <Plus className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        );
      case 'rating':
        return (
          <div className="space-y-1">
            <Label className="text-xs text-foreground">Rate (0.01 – 9.99)</Label>
            <Input type="number" value={state.value} onChange={(e) => setState({ value: e.target.value })} step="0.01" min="0.01" max="9.99" placeholder="Ex: 5.50" className="bg-secondary border-border h-8 text-sm font-mono" />
          </div>
        );
    }
  };

  const renderSection = (ft: Exclude<HistoryFieldType, 'legacy'>) => {
    const entries = getEntriesForType(ft);
    const isAddingThis = adding?.fieldType === ft;

    return (
      <div key={ft} className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-foreground">
            {FIELD_ICONS[ft]}
            <span className="text-xs font-bold">{FIELD_TYPE_LABELS[ft]}</span>
          </div>
          {!isAddingThis && editingId === null && (
            <button
              type="button"
              onClick={() => { setAdding(emptyAdding(ft)); }}
              className="flex items-center gap-1 text-[10px] text-primary hover:underline"
            >
              <Plus className="w-3 h-3" /> Adicionar
            </button>
          )}
        </div>

        {/* Existing entries */}
        {entries.map((h) => {
          const isEditing = editingId === h.id && editState?.fieldType === ft;
          return (
            <div key={h.id} className="rounded-md bg-secondary/30 border border-border overflow-hidden">
              {isEditing && editState ? (
                <div className="p-3 space-y-3">
                  {renderPeriodFields(editState, (patch) => setEditState((p) => p ? { ...p, ...patch } : p))}
                  {renderValueField(editState, (patch) => setEditState((p) => p ? { ...p, ...patch } : p), true)}
                  <div className="flex gap-2 pt-1">
                    <Button type="button" size="sm" onClick={handleSaveEdit} disabled={uploading} className="gap-1.5 bg-primary text-primary-foreground h-7 text-xs">
                      {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Salvar
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={cancelEdit} className="h-7 text-xs gap-1">
                      <X className="w-3 h-3" /> Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between p-2.5 px-3">
                  <div className="flex items-center gap-2 min-w-0">
                    {ft === 'logo' && h.logo && (
                      <img src={h.logo} alt="" className="w-7 h-7 rounded object-contain border border-border shrink-0" />
                    )}
                    {ft === 'colors' && h.colors && h.colors.length > 0 && (
                      <div className="flex gap-1 shrink-0">
                        {h.colors.map((c, i) => (
                          <div key={i} className="w-4 h-4 rounded border border-border" style={{ backgroundColor: c }} />
                        ))}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium text-foreground truncate">
                        {ft !== 'logo' && ft !== 'colors' ? getDisplayValue(h, ft) : null}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{formatPeriod(h)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <button onClick={() => handleStartEdit(h, ft)} className="p-1 text-muted-foreground hover:text-primary transition-colors">
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button onClick={() => setDeleteId(h.id)} className="p-1 text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Add form */}
        {isAddingThis && adding && (
          <div className="p-3 rounded-md border border-primary/30 bg-primary/5 space-y-3">
            {renderPeriodFields(adding, (patch) => setAdding((p) => p ? { ...p, ...patch } : p))}
            {renderValueField(adding, (patch) => setAdding((p) => p ? { ...p, ...patch } : p), false)}
            <div className="flex gap-2 pt-1">
              <Button type="button" size="sm" onClick={handleAdd} disabled={uploading} className="gap-1.5 bg-primary text-primary-foreground h-7 text-xs">
                {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />} Salvar
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={cancelAdd} className="h-7 text-xs">
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {entries.length === 0 && !isAddingThis && (
          <p className="text-[10px] text-muted-foreground italic pl-5">Nenhuma versão cadastrada</p>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-sm font-bold text-foreground">Versões Históricas</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Defina escudos, nomes, cores e rates por período. Cada atributo é independente e possui seu próprio intervalo de anos.
        </p>
      </div>

      <div className="space-y-4">
        {FIELD_TYPES.map(renderSection)}
      </div>

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
