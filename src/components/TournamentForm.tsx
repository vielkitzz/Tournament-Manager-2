import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Loader2 } from "lucide-react";
import type { TournamentTemplate } from "@/data/templates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tournament,
  TournamentFormat,
  KnockoutStage,
  KnockoutLegMode,
  KNOCKOUT_STAGES,
  SPORTS,
  DEFAULT_SETTINGS,
} from "@/types/tournament";
import { useTournamentStore } from "@/store/tournamentStore";
import { toast } from "sonner";
import { revokeImagePreview } from "@/lib/imageUtils";
import { uploadLogo } from "@/lib/storageUtils";
import ImageUpload from "@/components/ImageUpload";

interface TournamentFormProps {
  onSuccess?: () => void;
  editTournament?: Tournament;
  initialTemplate?: TournamentTemplate;
}

export default function TournamentForm({ onSuccess, editTournament, initialTemplate }: TournamentFormProps) {
  const { addTournament, updateTournament } = useTournamentStore();
  const isEdit = !!editTournament;
  // Use template values as defaults when provided
  const tpl = initialTemplate;

  const [name, setName] = useState(editTournament?.name || tpl?.name || "");
  const [sport, setSport] = useState(editTournament?.sport || tpl?.sport || "Futebol");
  const [year, setYear] = useState((editTournament?.year || new Date().getFullYear()).toString());
  const [format, setFormat] = useState<TournamentFormat | "">(editTournament?.format || tpl?.format || "");
  const [numberOfTeams, setNumberOfTeams] = useState((editTournament?.numberOfTeams || tpl?.numberOfTeams || 16).toString());

  // Logo state — no base64, use Storage URLs + temporary Object URLs
  const [logoUrl, setLogoUrl] = useState<string | undefined>(editTournament?.logo);
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(editTournament?.logo);
  const [pendingBlob, setPendingBlob] = useState<{ blob: Blob; filename: string } | null>(null);
  const [uploading, setUploading] = useState(false);

  // Liga
  const [ligaTurnos, setLigaTurnos] = useState<"1" | "2">((editTournament?.ligaTurnos?.toString() || tpl?.ligaTurnos?.toString() || "2") as "1" | "2");
  // Grupos
  const [gruposQtd, setGruposQtd] = useState((editTournament?.gruposQuantidade || tpl?.gruposQuantidade || 4).toString());
  const [gruposTurnos, setGruposTurnos] = useState<"1" | "2" | "3" | "4">((editTournament?.gruposTurnos?.toString() || tpl?.gruposTurnos?.toString() || "2") as any);
  const [gruposMataMata, setGruposMataMata] = useState<KnockoutStage>(editTournament?.gruposMataMataInicio || tpl?.gruposMataMataInicio || "1/8");
  // Mata-mata
  const [mataMataInicio, setMataMataInicio] = useState<KnockoutStage>(editTournament?.mataMataInicio || tpl?.mataMataInicio || "1/16");
  // Knockout leg mode
  const [knockoutLegMode, setKnockoutLegMode] = useState<KnockoutLegMode>(editTournament?.settings?.knockoutLegMode || tpl?.knockoutLegMode || "single");
  // Suíço
  const [suicoJogosLiga, setSuicoJogosLiga] = useState((editTournament?.suicoJogosLiga || tpl?.suicoJogosLiga || 8).toString());
  const [suicoMataMataInicio, setSuicoMataMataInicio] = useState<KnockoutStage>(editTournament?.suicoMataMataInicio || tpl?.suicoMataMataInicio || "1/8");
  const [suicoPlayoffVagas, setSuicoPlayoffVagas] = useState((editTournament?.suicoPlayoffVagas || tpl?.suicoPlayoffVagas || 8).toString());

  // Bug fix #2: Sync form fields when editTournament loads from Supabase
  // (useState initializes only once; if data arrives late, fields stay empty)
  useEffect(() => {
    if (editTournament) {
      setName(editTournament.name || "");
      setSport(editTournament.sport || "Futebol");
      setYear((editTournament.year || new Date().getFullYear()).toString());
      setFormat(editTournament.format || "");
      setNumberOfTeams((editTournament.numberOfTeams || 16).toString());
      setLogoUrl(editTournament.logo);
      setPreviewUrl(editTournament.logo);
      setLigaTurnos((editTournament.ligaTurnos?.toString() || "2") as "1" | "2");
      setGruposQtd((editTournament.gruposQuantidade || 4).toString());
      setGruposTurnos((editTournament.gruposTurnos?.toString() || "2") as any);
      setGruposMataMata(editTournament.gruposMataMataInicio || "1/8");
      setMataMataInicio(editTournament.mataMataInicio || "1/16");
      setKnockoutLegMode(editTournament.settings?.knockoutLegMode || "single");
      setSuicoJogosLiga((editTournament.suicoJogosLiga || 8).toString());
      setSuicoMataMataInicio(editTournament.suicoMataMataInicio || "1/8");
      setSuicoPlayoffVagas((editTournament.suicoPlayoffVagas || 8).toString());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editTournament?.id]); // Only re-sync when the tournament ID changes

  // Revoke Object URLs on unmount
  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith("blob:")) revokeImagePreview(previewUrl);
    };
  }, [previewUrl]);

  const handleRemoveLogo = () => {
    if (previewUrl?.startsWith("blob:")) revokeImagePreview(previewUrl);
    setPreviewUrl(undefined);
    setLogoUrl(undefined);
    setPendingBlob(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !format) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    setUploading(true);
    let finalLogoUrl = logoUrl;

    try {
      if (pendingBlob) {
        const tournamentId = isEdit ? editTournament!.id : crypto.randomUUID();
        const path = `tournaments/${tournamentId}.webp`;
        finalLogoUrl = await uploadLogo(pendingBlob.blob, path);
        if (previewUrl?.startsWith("blob:")) revokeImagePreview(previewUrl);
        setPreviewUrl(finalLogoUrl);
        setPendingBlob(null);
      } else if (!previewUrl) {
        finalLogoUrl = undefined;
      }

      const settings = isEdit
        ? { ...editTournament!.settings, knockoutLegMode }
        : { ...DEFAULT_SETTINGS, ...(tpl?.settings || {}), knockoutLegMode };

      if (isEdit) {
        const updates: Partial<Tournament> = {
          name: name.trim(),
          sport,
          year: parseInt(year),
          format: format as TournamentFormat,
          numberOfTeams: parseInt(numberOfTeams),
          logo: finalLogoUrl,
          settings,
          ...(format === "liga" && { ligaTurnos: parseInt(ligaTurnos) as 1 | 2 }),
          ...(format === "grupos" && {
            gruposQuantidade: parseInt(gruposQtd),
            gruposTurnos: parseInt(gruposTurnos) as 1 | 2 | 3 | 4,
            gruposMataMataInicio: gruposMataMata,
          }),
          ...(format === "mata-mata" && { mataMataInicio }),
          ...(format === "suico" && {
            suicoJogosLiga: parseInt(suicoJogosLiga),
            suicoMataMataInicio,
            suicoPlayoffVagas: parseInt(suicoPlayoffVagas),
          }),
        };
        await updateTournament(editTournament!.id, updates);
        toast.success(`"${name.trim()}" atualizado!`);
        onSuccess?.();
        return;
      }

      const tournamentId = crypto.randomUUID();
      const tournament: Tournament = {
        id: tournamentId,
        name: name.trim(),
        sport,
        year: parseInt(year),
        format: format as TournamentFormat,
        numberOfTeams: parseInt(numberOfTeams),
        logo: finalLogoUrl,
        teamIds: [],
        matches: [],
        settings,
        ...(format === "liga" && { ligaTurnos: parseInt(ligaTurnos) as 1 | 2 }),
        ...(format === "grupos" && {
          gruposQuantidade: parseInt(gruposQtd),
          gruposTurnos: parseInt(gruposTurnos) as 1 | 2 | 3 | 4,
          gruposMataMataInicio: gruposMataMata,
        }),
        ...(format === "mata-mata" && { mataMataInicio }),
        ...(format === "suico" && {
          suicoJogosLiga: parseInt(suicoJogosLiga),
          suicoMataMataInicio,
          suicoPlayoffVagas: parseInt(suicoPlayoffVagas),
        }),
      };

      await addTournament(tournament);
      toast.success(`"${tournament.name}" criado com sucesso!`);
      onSuccess?.();
    } catch (err) {
      toast.error("Erro ao salvar. Tente novamente.");
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const inputVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  };

  return (
    <motion.form onSubmit={handleSubmit} className="space-y-5" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {/* Logo Upload */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-foreground">Logo da Competição</Label>
        <ImageUpload
          previewUrl={previewUrl}
          onImageSelected={(result) => {
            if (previewUrl?.startsWith("blob:")) revokeImagePreview(previewUrl);
            setPreviewUrl(result.previewUrl);
            setPendingBlob({ blob: result.blob, filename: result.filename });
          }}
          onRemove={handleRemoveLogo}
          placeholder={<Trophy className="w-5 h-5 text-muted-foreground" />}
        />
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium text-foreground">Nome da Competição</Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: Copa do Bairro 2026"
          className="bg-secondary border-border"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground">Esporte</Label>
          <Select value={sport} onValueChange={setSport}>
            <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
            <SelectContent>
              {SPORTS.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground">Ano (Temporada)</Label>
          <Input type="number" value={year} onChange={(e) => setYear(e.target.value)} className="bg-secondary border-border" min={1900} max={2200} />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium text-foreground">Formato</Label>
        <Select value={format} onValueChange={(v) => setFormat(v as TournamentFormat)}>
          <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Selecione o formato" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="liga">Liga (Pontos Corridos)</SelectItem>
            <SelectItem value="grupos">Fase de Grupos + Mata-Mata</SelectItem>
            <SelectItem value="mata-mata">Mata-Mata</SelectItem>
            <SelectItem value="suico">Sistema Suíço</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium text-foreground">Número de Times</Label>
        <Input type="number" value={numberOfTeams} onChange={(e) => setNumberOfTeams(e.target.value)} className="bg-secondary border-border" min={2} max={128} />
      </div>

      <AnimatePresence mode="wait">
        {format === "liga" && (
          <motion.div key="liga" variants={inputVariants} initial="hidden" animate="visible" exit="hidden" className="p-4 rounded-lg bg-secondary/50 border border-border space-y-3">
            <h3 className="text-sm font-display font-semibold text-primary flex items-center gap-2"><Trophy className="w-4 h-4" />Opções da Liga</h3>
            <Select value={ligaTurnos} onValueChange={(v) => setLigaTurnos(v as "1" | "2")}>
              <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 Turno</SelectItem>
                <SelectItem value="2">2 Turnos</SelectItem>
              </SelectContent>
            </Select>
          </motion.div>
        )}
        {format === "grupos" && (
          <motion.div key="grupos" variants={inputVariants} initial="hidden" animate="visible" exit="hidden" className="p-4 rounded-lg bg-secondary/50 border border-border space-y-3">
            <h3 className="text-sm font-display font-semibold text-primary flex items-center gap-2"><Trophy className="w-4 h-4" />Opções dos Grupos</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Quantidade de Grupos</Label>
                <Input type="number" value={gruposQtd} onChange={(e) => setGruposQtd(e.target.value)} className="bg-secondary border-border" min={2} max={16} />
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Turnos</Label>
                <Select value={gruposTurnos} onValueChange={(v) => setGruposTurnos(v as "1" | "2" | "3" | "4")}>
                  <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 Turno</SelectItem>
                    <SelectItem value="2">2 Turnos</SelectItem>
                    <SelectItem value="3">3 Turnos</SelectItem>
                    <SelectItem value="4">4 Turnos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Início do Mata-Mata</Label>
              <Select value={gruposMataMata} onValueChange={(v) => setGruposMataMata(v as KnockoutStage)}>
                <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {KNOCKOUT_STAGES.map((s) => (<SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Jogos no Mata-Mata</Label>
              <Select value={knockoutLegMode} onValueChange={(v) => setKnockoutLegMode(v as KnockoutLegMode)}>
                <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Jogo Único</SelectItem>
                  <SelectItem value="home-away">Ida e Volta</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </motion.div>
        )}
        {format === "mata-mata" && (
          <motion.div key="mata-mata" variants={inputVariants} initial="hidden" animate="visible" exit="hidden" className="p-4 rounded-lg bg-secondary/50 border border-border space-y-3">
            <h3 className="text-sm font-display font-semibold text-primary flex items-center gap-2"><Trophy className="w-4 h-4" />Opções do Mata-Mata</h3>
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Fase Inicial</Label>
              <Select value={mataMataInicio} onValueChange={(v) => setMataMataInicio(v as KnockoutStage)}>
                <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {KNOCKOUT_STAGES.map((s) => (<SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Jogos</Label>
              <Select value={knockoutLegMode} onValueChange={(v) => setKnockoutLegMode(v as KnockoutLegMode)}>
                <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Jogo Único</SelectItem>
                  <SelectItem value="home-away">Ida e Volta</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </motion.div>
        )}
        {format === "suico" && (
          <motion.div key="suico" variants={inputVariants} initial="hidden" animate="visible" exit="hidden" className="p-4 rounded-lg bg-secondary/50 border border-border space-y-3">
            <h3 className="text-sm font-display font-semibold text-primary flex items-center gap-2"><Trophy className="w-4 h-4" />Opções do Sistema Suíço</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Jogos na Fase de Liga</Label>
                <Input type="number" value={suicoJogosLiga} onChange={(e) => setSuicoJogosLiga(e.target.value)} className="bg-secondary border-border" min={2} max={38} />
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Vagas nos Play-offs</Label>
                <Input type="number" value={suicoPlayoffVagas} onChange={(e) => setSuicoPlayoffVagas(e.target.value)} className="bg-secondary border-border" min={0} max={32} />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Início do Mata-Mata</Label>
              <Select value={suicoMataMataInicio} onValueChange={(v) => setSuicoMataMataInicio(v as KnockoutStage)}>
                <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {KNOCKOUT_STAGES.map((s) => (<SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Jogos no Mata-Mata</Label>
              <Select value={knockoutLegMode} onValueChange={(v) => setKnockoutLegMode(v as KnockoutLegMode)}>
                <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Jogo Único</SelectItem>
                  <SelectItem value="home-away">Ida e Volta</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
        ) : isEdit ? "Salvar Alterações" : "Criar Competição"}
      </Button>
    </motion.form>
  );
}
