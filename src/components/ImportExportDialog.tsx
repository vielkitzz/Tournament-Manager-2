import { useState, useRef } from "react";
import { Download, Upload, Shield, Trophy } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useTournamentStore } from "@/store/tournamentStore";
import { toast } from "sonner";
import { Team, Tournament } from "@/types/tournament";

interface Props {
  trigger: React.ReactNode;
}

export default function ImportExportDialog({ trigger }: Props) {
  const { teams, tournaments, addTeam, addTournament } = useTournamentStore();
  const [open, setOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = (type: "teams" | "tournaments" | "all") => {
    let data: any = {};
    if (type === "teams" || type === "all") {
      data.teams = teams.map(({ id, ...t }) => t);
    }
    if (type === "tournaments" || type === "all") {
      data.tournaments = tournaments.map(({ id, ...t }) => t);
    }
    data._exportedAt = new Date().toISOString();
    data._version = 1;

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const suffix = type === "all" ? "dados" : type === "teams" ? "times" : "competicoes";
    a.download = `tm2-${suffix}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exportação concluída!");
  };

  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const processImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      let teamsImported = 0;
      let tournamentsImported = 0;

      if (data.teams && Array.isArray(data.teams)) {
        for (const team of data.teams) {
          const newTeam: Team = {
            id: crypto.randomUUID(),
            name: team.name || "Time importado",
            shortName: team.shortName || team.name?.substring(0, 10) || "",
            abbreviation: team.abbreviation || team.name?.substring(0, 4)?.toUpperCase() || "IMP",
            logo: team.logo,
            foundingYear: team.foundingYear,
            colors: team.colors || ["#1e40af", "#ffffff"],
            rate: team.rate || 3,
          };
          await addTeam(newTeam);
          teamsImported++;
        }
      }

      if (data.tournaments && Array.isArray(data.tournaments)) {
        for (const t of data.tournaments) {
          const newTournament: Tournament = {
            id: crypto.randomUUID(),
            name: t.name || "Competição importada",
            sport: t.sport || "Futebol",
            year: t.year || new Date().getFullYear(),
            format: t.format || "liga",
            numberOfTeams: t.numberOfTeams || 0,
            logo: t.logo,
            teamIds: [], // teams need to be re-linked
            settings: t.settings || {
              pointsWin: 3,
              pointsDraw: 1,
              pointsLoss: 0,
              tiebreakers: [],
              awayGoalsRule: false,
              extraTime: true,
              goldenGoal: false,
              rateInfluence: true,
              promotions: [],
            },
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

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Importar / Exportar</DialogTitle>
          <DialogDescription>Gerencie seus dados de times e competições</DialogDescription>
        </DialogHeader>

        <input ref={fileInputRef} type="file" accept=".json" onChange={processImport} className="hidden" />

        <div className="space-y-4 pt-2">
          {/* Export section */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Exportar</p>
            <div className="grid grid-cols-1 gap-2">
              <Button
                variant="outline"
                className="justify-start gap-3 h-11"
                onClick={() => handleExport("teams")}
                disabled={teams.length === 0}
              >
                <Shield className="w-4 h-4 text-primary" />
                <span>Times ({teams.length})</span>
                <Download className="w-3.5 h-3.5 ml-auto text-muted-foreground" />
              </Button>
              <Button
                variant="outline"
                className="justify-start gap-3 h-11"
                onClick={() => handleExport("tournaments")}
                disabled={tournaments.length === 0}
              >
                <Trophy className="w-4 h-4 text-primary" />
                <span>Competições ({tournaments.length})</span>
                <Download className="w-3.5 h-3.5 ml-auto text-muted-foreground" />
              </Button>
              <Button
                variant="outline"
                className="justify-start gap-3 h-11"
                onClick={() => handleExport("all")}
                disabled={teams.length === 0 && tournaments.length === 0}
              >
                <Download className="w-4 h-4 text-primary" />
                <span>Tudo</span>
                <Download className="w-3.5 h-3.5 ml-auto text-muted-foreground" />
              </Button>
            </div>
          </div>

          {/* Import section */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Importar</p>
            <Button variant="outline" className="w-full justify-start gap-3 h-11" onClick={handleImport}>
              <Upload className="w-4 h-4 text-primary" />
              <span>Importar arquivo JSON</span>
            </Button>
            <p className="text-[11px] text-muted-foreground">Aceita arquivos exportados pelo TM2 (.json)</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
