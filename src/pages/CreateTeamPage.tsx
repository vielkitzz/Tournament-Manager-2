import { useState, useRef, useEffect } from "react";
import { motion, Reorder } from "framer-motion";
import { ArrowLeft, Upload, Loader2, Trash2, Plus, GripVertical } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTournamentStore } from "@/store/tournamentStore";
import { toast } from "sonner";
import { processImage, revokeImagePreview } from "@/lib/imageUtils";
import { uploadLogo } from "@/lib/storageUtils";
import { supabase } from "@/integrations/supabase/client";
import TeamHistoryEditor from "@/components/TeamHistoryEditor";

// Função auxiliar para extrair o caminho correto do arquivo na nuvem a partir da URL pública
const extractFilePathFromUrl = (url: string, bucketName: string) => {
  if (!url) return null;
  const urlParts = url.split(`/public/${bucketName}/`);
  return urlParts.length === 2 ? urlParts[1] : null;
};

export default function CreateTeamPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("edit");
  const { teams, loading, addTeam, updateTeam } = useTournamentStore();
  const existingTeam = editId ? teams.find((t) => t.id === editId) : null;

  const [name, setName] = useState("");
  const [shortName, setShortName] = useState("");
  const [abbreviation, setAbbreviation] = useState("");
  const [foundingYear, setFoundingYear] = useState("");
  const [colorItems, setColorItems] = useState<{ id: string; value: string }[]>([
    { id: crypto.randomUUID(), value: "#1e40af" },
    { id: crypto.randomUUID(), value: "#ffffff" },
  ]);
  const [rate, setRate] = useState("3.00");

  // logoUrl = persisted Storage URL (saved to DB)
  const [logoUrl, setLogoUrl] = useState<string | undefined>(undefined);
  // previewUrl = temporary Object URL for display only
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(undefined);
  // pendingBlob = WebP blob waiting to be uploaded on submit
  const [pendingBlob, setPendingBlob] = useState<{ blob: Blob; filename: string } | null>(null);

  const [uploading, setUploading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Revoke Object URLs on unmount to free memory
  useEffect(() => {
    return () => {
      if (previewUrl) revokeImagePreview(previewUrl);
    };
  }, [previewUrl]);

  // Populate form when team data loads
  useEffect(() => {
    if (existingTeam && !initialized) {
      setName(existingTeam.name);
      setShortName(existingTeam.shortName || "");
      setAbbreviation(existingTeam.abbreviation || "");
      setFoundingYear(existingTeam.foundingYear?.toString() || "");
      setColorItems((existingTeam.colors?.length ? [...existingTeam.colors] : ["#333333", "#cccccc"]).map(c => ({ id: crypto.randomUUID(), value: c })));
      setRate(existingTeam.rate?.toString() || "3.00");
      setLogoUrl(existingTeam.logo);
      setPreviewUrl(existingTeam.logo); // show existing logo (Storage URL)
      setInitialized(true);
    }
  }, [existingTeam, initialized]);

  const handleLogoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Revoke old preview
    if (previewUrl && previewUrl.startsWith("blob:")) revokeImagePreview(previewUrl);

    try {
      const processed = await processImage(file);
      setPreviewUrl(processed.previewUrl);
      setPendingBlob({ blob: processed.blob, filename: processed.filename });
    } catch (err) {
      toast.error("Erro ao processar imagem");
      console.error(err);
    }
  };

  const handleRemoveLogo = () => {
    if (previewUrl?.startsWith("blob:")) revokeImagePreview(previewUrl);
    setPreviewUrl(undefined);
    // NÃO limpe logoUrl aqui, precisamos dele no submit para saber o que deletar do Supabase
    setPendingBlob(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Digite o nome do time");
      return;
    }

    setUploading(true);
    let finalLogoUrl = logoUrl; // default: keep existing URL

    try {
      // Cenário 1: Usuário escolheu uma imagem nova
      if (pendingBlob) {
        const teamId = editId || crypto.randomUUID();
        const path = `teams/${teamId}_${Date.now()}.webp`; // Adicionei Date.now() para evitar problemas de cache do navegador

        // Se tinha imagem antiga, deleta da nuvem antes de subir a nova
        if (logoUrl) {
          const oldPath = extractFilePathFromUrl(logoUrl, "logos"); // Confirme se o bucket chama "logos" ou mude aqui
          if (oldPath) {
            await supabase.storage.from("logos").remove([oldPath]);
          }
        }

        finalLogoUrl = await uploadLogo(pendingBlob.blob, path);

        if (previewUrl?.startsWith("blob:")) revokeImagePreview(previewUrl);
        setPreviewUrl(finalLogoUrl);
        setPendingBlob(null);
      }
      // Cenário 2: Usuário removeu a imagem e não escolheu nenhuma nova
      else if (!previewUrl && logoUrl) {
        const oldPath = extractFilePathFromUrl(logoUrl, "logos"); // Confirme se o bucket chama "logos" ou mude aqui
        if (oldPath) {
          await supabase.storage.from("logos").remove([oldPath]);
        }
        finalLogoUrl = undefined;
      }

      const teamData = {
        name: name.trim(),
        shortName: shortName.trim() || name.trim().substring(0, 10),
        abbreviation: abbreviation.trim() || name.trim().substring(0, 3).toUpperCase(),
        foundingYear: foundingYear ? parseInt(foundingYear) : undefined,
        colors: colors,
        rate: Math.min(9.99, Math.max(0.01, parseFloat(rate) || 3)),
        logo: finalLogoUrl,
      };

      if (editId && existingTeam) {
        await updateTeam(editId, teamData);
        toast.success(`"${teamData.name}" atualizado!`);
      } else {
        await addTeam({ id: crypto.randomUUID(), ...teamData });
        toast.success(`"${teamData.name}" criado!`);
      }
      navigate("/teams");
    } catch (err) {
      toast.error("Erro ao salvar o time. Tente novamente.");
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  if (editId && loading) {
    return (
      <div className="p-6 lg:p-8 max-w-lg space-y-6">
        <div className="h-4 w-20 bg-muted animate-pulse rounded" />
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-10 bg-muted animate-pulse rounded" />
          ))}
        </div>
      </div>
    );
  }

  const displayLogo = previewUrl;

  return (
    <div className="p-6 lg:p-10 max-w-lg">
      <button
        onClick={() => navigate("/teams")}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm">Voltar</span>
      </button>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-2xl font-display font-bold text-foreground">{editId ? "Editar Time" : "Criar Time"}</h2>
        <p className="text-sm text-muted-foreground mt-1 mb-6">
          {editId ? "Atualize as informações do time" : "Preencha as informações do time"}
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Logo Upload */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">Escudo</Label>
            <div className="flex items-center gap-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-20 h-20 rounded-xl bg-secondary border border-border flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors overflow-hidden"
              >
                {displayLogo ? (
                  <img src={displayLogo} alt="Escudo" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-1">
                    <Upload className="w-5 h-5 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">Upload</span>
                  </div>
                )}
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoSelect} className="hidden" />
              <div className="flex flex-col gap-1">
                {displayLogo && (
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    className="text-xs text-destructive hover:underline text-left"
                  >
                    Remover
                  </button>
                )}
                {pendingBlob && <span className="text-[10px] text-muted-foreground">WebP • pronto para envio</span>}
              </div>
            </div>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">Nome Completo</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Futbol Club Barcelona"
              className="bg-secondary border-border"
              required
            />
          </div>

          {/* Short Name */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Nome Curto</Label>
              <Input
                value={shortName}
                onChange={(e) => setShortName(e.target.value)}
                placeholder="Ex: Barcelona"
                className="bg-secondary border-border"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Abreviação (3 letras)</Label>
              <Input
                value={abbreviation}
                onChange={(e) => setAbbreviation(e.target.value.toUpperCase().slice(0, 3))}
                placeholder="BAR"
                maxLength={3}
                className="bg-secondary border-border uppercase"
              />
            </div>
          </div>

          {/* Founding Year */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">Ano de Fundação</Label>
            <Input
              type="number"
              value={foundingYear}
              onChange={(e) => setFoundingYear(e.target.value)}
              placeholder="Ex: 1899"
              className="bg-secondary border-border"
              min={1800}
              max={2100}
            />
          </div>

          {/* Colors */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">
              Cores <span className="text-muted-foreground font-normal">({colors.length}/5)</span>
            </Label>
            <Reorder.Group
              axis="x"
              values={colors}
              onReorder={setColors}
              className="flex flex-wrap items-center gap-3"
              as="div"
            >
              {colors.map((color, i) => (
                <Reorder.Item
                  key={color + i}
                  value={color}
                  as="div"
                  className="flex items-center gap-1.5 cursor-grab active:cursor-grabbing"
                  whileDrag={{ scale: 1.05, zIndex: 10 }}
                >
                  <GripVertical className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => {
                      const next = [...colors];
                      next[i] = e.target.value;
                      setColors(next);
                    }}
                    className="w-10 h-10 rounded-lg cursor-pointer border border-border bg-transparent"
                  />
                  <Input
                    value={color}
                    onChange={(e) => {
                      const next = [...colors];
                      next[i] = e.target.value;
                      setColors(next);
                    }}
                    placeholder="#000000"
                    className="bg-secondary border-border w-24 text-xs font-mono"
                  />
                  {colors.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setColors(colors.filter((_, j) => j !== i))}
                      className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </Reorder.Item>
              ))}
              {colors.length < 5 && (
                <button
                  type="button"
                  onClick={() => setColors([...colors, "#888888"])}
                  className="w-10 h-10 rounded-lg border-2 border-dashed border-border flex items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              )}
            </Reorder.Group>
          </div>

          {/* Rate */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">
              Rate <span className="text-muted-foreground font-normal">(0.01 – 9.99)</span>
            </Label>
            <Input
              type="number"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              step="0.01"
              min="0.01"
              max="9.99"
              className="bg-secondary border-border w-32 font-mono"
            />
          </div>

          <Button
            type="submit"
            disabled={uploading}
            className="w-full font-display font-semibold text-base h-12 bg-primary text-primary-foreground hover:bg-primary/90 shadow-glow transition-all"
          >
            {uploading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Enviando...
              </span>
            ) : editId ? (
              "Salvar Alterações"
            ) : (
              "Criar Time"
            )}
          </Button>
        </form>

        {/* Historical Versions - Only show when editing */}
        {editId && existingTeam && (
          <div className="mt-8 pt-6 border-t border-border">
            <TeamHistoryEditor teamId={editId} />
          </div>
        )}
      </motion.div>
    </div>
  );
}
