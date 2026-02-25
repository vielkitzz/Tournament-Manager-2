import { useState, useRef } from "react";
import { Upload, Shield, Trophy, FileJson } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useTournamentStore } from "@/store/tournamentStore";
import { toast } from "sonner";
import { Team, Tournament } from "@/types/tournament";

interface Props {
  trigger: React.ReactNode;
}

type ImportMode = "teams" | "tournaments" | "all";

export default function ImportDialog({ trigger }: Props) {
  const { addTeam, addTournament } = useTournamentStore();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<ImportMode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSelect = (m: ImportMode) => {
    setMode(m);
    fileInputRef.current?.click();
  };

  const processImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !mode) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      let teamsImported = 0;
      let tournamentsImported = 0;

      if ((mode === "teams" || mode === "all") && data.teams && Array.isArray(data.teams)) {
        for (const team of data.teams) {
          const newTeam: Team = {
            id: crypto.randomUUID(),
            name: team.name || "Time importado",
            shortName: team.shortName || team.name?.substring(0, 10) || "",
            abbreviation: team.abbreviation || team.name?.substring(0, 3)?.toUpperCase() || "IMP",
            logo: team.logo,
            foundingYear: team.foundingYear,
            colors: team.colors || ["#1e40af", "#ffffff"],
            rate: team.rate || 3,
          };
          await addTeam(newTeam);
          teamsImported++;
        }
      }

      if ((mode === "tournaments" || mode === "all") && data.tournaments && Array.isArray(data.tournaments)) {
        for (const t of data.tournaments) {
          const newTournament: Tournament = {
            id: crypto.randomUUID(),
            name: t.name || "Competição importada",
            sport: t.sport || "Futebol",
            year: t.year || new Date().getFullYear(),
            format: t.format || "liga",
            numberOfTeams: t.numberOfTeams || 0,
            logo: t.logo,
            teamIds: [],
            settings: t.settings || { pointsWin: 3, pointsDraw: 1, pointsLoss: 0, tiebreakers: [], awayGoalsRule: false, extraTime: true, goldenGoal: false, rateInfluence: true, promotions: [] },
            matches: [],
            finalized: false,
            seasons: t.seasons || [],
            ligaTurnos: t.ligaTurnos,
            gruposQuantidade: t.gruposQuantidade,
            gruposTurnos: t.gruposTurnos,
            gruposMataMataInicio: t.gruposMataMataInicio,
            mataMataInicio: t.mataMataInicio,
          };
          await addTournament(newTournament);
          tournamentsImported++;
        }
      }

      const parts: string[] = [];
      if (teamsImported > 0) parts.push(`${teamsImported} time(s)`);
      if (tournamentsImported > 0) parts.push(`${tournamentsImported} competição(ões)`);

      if (parts.length > 0) {
        toast.success(`Importado: ${parts.join(" e ")}`);
      } else {
        toast.error("Nenhum dado reconhecido no arquivo");
      }
    } catch {
      toast.error("Erro ao ler o arquivo. Verifique o formato JSON.");
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
    setMode(null);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Importar</DialogTitle>
          <DialogDescription>Selecione o que deseja importar do arquivo</DialogDescription>
        </DialogHeader>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={processImport}
          className="hidden"
        />

        <div className="space-y-2 pt-2">
          <Button
            variant="outline"
            className="w-full justify-start gap-3 h-11"
            onClick={() => handleSelect("teams")}
          >
            <Shield className="w-4 h-4 text-primary" />
            <span>Apenas Times</span>
            <Upload className="w-3.5 h-3.5 ml-auto text-muted-foreground" />
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start gap-3 h-11"
            onClick={() => handleSelect("tournaments")}
          >
            <Trophy className="w-4 h-4 text-primary" />
            <span>Apenas Competições</span>
            <Upload className="w-3.5 h-3.5 ml-auto text-muted-foreground" />
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start gap-3 h-11"
            onClick={() => handleSelect("all")}
          >
            <FileJson className="w-4 h-4 text-primary" />
            <span>Tudo</span>
            <Upload className="w-3.5 h-3.5 ml-auto text-muted-foreground" />
          </Button>
          <p className="text-[11px] text-muted-foreground pt-1">
            Aceita arquivos exportados pelo TM2 (.json)
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
