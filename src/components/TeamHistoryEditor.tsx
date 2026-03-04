import { useState, useRef } from "react";
import { Plus, Trash2, Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const [newStartYear, setNewStartYear] = useState("");
  const [newEndYear, setNewEndYear] = useState("");
  const [newRating, setNewRating] = useState("3.00");
  const [newLogoPreview, setNewLogoPreview] = useState<string | undefined>();
  const [newPendingBlob, setNewPendingBlob] = useState<{ blob: Blob; filename: string } | null>(null);
  const [uploading, setUploading] = useState(false);
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

  const handleAdd = async () => {
    const startYear = parseInt(newStartYear);
    const endYear = parseInt(newEndYear);
    if (!startYear || !endYear || endYear < startYear) {
      toast.error("Informe um intervalo de anos válido");
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
        rating: Math.min(9.99, Math.max(0.01, parseFloat(newRating) || 3)),
      });

      // Reset form
      setNewStartYear("");
      setNewEndYear("");
      setNewRating("3.00");
      if (newLogoPreview?.startsWith("blob:")) revokeImagePreview(newLogoPreview);
      setNewLogoPreview(undefined);
      setNewPendingBlob(null);
      setAdding(false);
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-foreground">Versões Históricas</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Defina escudos e rates por período. Serão usados automaticamente conforme o ano da competição.
          </p>
        </div>
      </div>

      {histories.length > 0 && (
        <div className="space-y-2">
          {histories.map((h) => (
            <div key={h.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 border border-border">
              <div className="w-10 h-10 rounded-lg bg-secondary border border-border flex items-center justify-center overflow-hidden shrink-0">
                {h.logo ? (
                  <img src={h.logo} alt="" className="w-full h-full object-contain" />
                ) : (
                  <span className="text-[10px] text-muted-foreground">—</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-foreground">
                  {h.startYear} – {h.endYear}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Rate: {h.rating.toFixed(2)}
                </p>
              </div>
              <button
                onClick={() => handleRemove(h.id)}
                className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {!adding ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setAdding(true)}
          className="gap-1.5 w-full"
        >
          <Plus className="w-3.5 h-3.5" />
          Adicionar Versão Histórica
        </Button>
      ) : (
        <div className="p-4 rounded-lg border border-primary/30 bg-primary/5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-foreground">Ano Início</Label>
              <Input
                type="number"
                value={newStartYear}
                onChange={(e) => setNewStartYear(e.target.value)}
                placeholder="1968"
                className="bg-secondary border-border h-8 text-sm"
                min={1800}
                max={2100}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-foreground">Ano Fim</Label>
              <Input
                type="number"
                value={newEndYear}
                onChange={(e) => setNewEndYear(e.target.value)}
                placeholder="1974"
                className="bg-secondary border-border h-8 text-sm"
                min={1800}
                max={2100}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-foreground">Rate (0.01 – 9.99)</Label>
            <Input
              type="number"
              value={newRating}
              onChange={(e) => setNewRating(e.target.value)}
              step="0.01"
              min="0.01"
              max="9.99"
              className="bg-secondary border-border h-8 text-sm w-28 font-mono"
            />
          </div>

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

          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              onClick={handleAdd}
              disabled={uploading}
              className="gap-1.5 bg-primary text-primary-foreground"
            >
              {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              Salvar
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setAdding(false);
                if (newLogoPreview?.startsWith("blob:")) revokeImagePreview(newLogoPreview);
                setNewLogoPreview(undefined);
                setNewPendingBlob(null);
              }}
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
