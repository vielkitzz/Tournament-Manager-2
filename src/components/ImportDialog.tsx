import { useState, useRef } from "react";
import { Upload, Shield, Trophy, Users, FileJson } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useTournamentStore } from "@/store/tournamentStore";
import { toast } from "sonner";
import { Team, Tournament } from "@/types/tournament";
import { TeamHistory } from "@/lib/teamHistoryUtils";
import { planSquadImport, buildNameIndex, normalizeName } from "@/lib/squadBackup";

interface Props {
  trigger: React.ReactNode;
}

type DupStrategy = "replace" | "both" | "skip";

export default function ImportDialog({ trigger }: Props) {
  const {
    addTeam,
    updateTeam,
    addTournament,
    updateTournament,
    addTeamHistory,
    addFolder,
    addTournamentFolder,
    addPlayers,
  } = useTournamentStore();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<any>(null);
  const [fileName, setFileName] = useState("");
  const [pick, setPick] = useState({ teams: true, tournaments: true, squads: true });
  const [strategy, setStrategy] = useState<DupStrategy>("replace");
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const available = {
    teams: Array.isArray(data?.teams) && data.teams.length > 0,
    tournaments: Array.isArray(data?.tournaments) && data.tournaments.length > 0,
    squads: Array.isArray(data?.squads) && data.squads.length > 0,
  };

  const reset = () => {
    setData(null);
    setFileName("");
    setPick({ teams: true, tournaments: true, squads: true });
    setBusy(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      const hasSomething =
        Array.isArray(parsed?.teams) || Array.isArray(parsed?.tournaments) || Array.isArray(parsed?.squads);
      if (!hasSomething) {
        toast.error("Nenhum dado reconhecido no arquivo");
        return;
      }
      setData(parsed);
      setFileName(file.name);
    } catch {
      toast.error("Arquivo inválido. Verifique o formato JSON.");
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Conflitos por nome com o que já existe no app
  const state = useTournamentStore.getState();
  const teamIndex = buildNameIndex(state.teams);
  const tournamentIndex = buildNameIndex(state.tournaments);
  const conflictingTeams = available.teams && pick.teams
    ? (data.teams as any[]).filter((t) => teamIndex.has(normalizeName(t?.name || ""))).length
    : 0;
  const conflictingTournaments = available.tournaments && pick.tournaments
    ? (data.tournaments as any[]).filter((t) => tournamentIndex.has(normalizeName(t?.name || ""))).length
    : 0;
  const totalConflicts = conflictingTeams + conflictingTournaments;

  const runImport = async () => {
    if (!data) return;
    setBusy(true);
    try {
      const current = useTournamentStore.getState();
      const existingTeams = buildNameIndex(current.teams);
      const existingTournaments = buildNameIndex(current.tournaments);

      let teamsImported = 0;
      let teamsReplaced = 0;
      let teamsSkipped = 0;
      let tournamentsImported = 0;
      let tournamentsReplaced = 0;
      let tournamentsSkipped = 0;
      let historiesImported = 0;
      let foldersImported = 0;

      const teamIdMap = new Map<string, string>();
      const folderIdMap = new Map<string, string>();
      const tFolderIdMap = new Map<string, string>();

      const doTeams = pick.teams && available.teams;
      const doTournaments = pick.tournaments && available.tournaments;
      const doSquads = pick.squads && available.squads;

      if (doTeams && Array.isArray(data.folders)) {
        for (const folder of data.folders) {
          const oldId = folder._originalId || folder.id;
          const existing = current.folders.find((f) => normalizeName(f.name) === normalizeName(folder.name || ""));
          const newId = existing ? existing.id : await addFolder(folder.name || "Pasta importada");
          if (oldId && newId) {
            folderIdMap.set(oldId, newId);
            if (!existing) foldersImported++;
          }
        }
      }

      if (doTournaments && Array.isArray(data.tournamentFolders)) {
        for (const folder of data.tournamentFolders) {
          const oldId = folder._originalId || folder.id;
          const existing = current.tournamentFolders.find(
            (f) => normalizeName(f.name) === normalizeName(folder.name || ""),
          );
          const newId = existing ? existing.id : await addTournamentFolder(folder.name || "Pasta importada");
          if (oldId && newId) {
            tFolderIdMap.set(oldId, newId);
            if (!existing) foldersImported++;
          }
        }
      }

      if (doTeams) {
        for (const team of data.teams) {
          const oldId = team._originalId || team.id;
          const existing = existingTeams.get(normalizeName(team?.name || ""));
          const fields = {
            name: team.name || "Time importado",
            shortName: team.shortName || team.name?.substring(0, 10) || "",
            abbreviation: team.abbreviation || team.name?.substring(0, 4)?.toUpperCase() || "IMP",
            logo: team.logo,
            monoLogo: team.monoLogo,
            foundingYear: team.foundingYear,
            colors: team.colors || ["#1e40af", "#ffffff"],
            rate: team.rate || 3,
            folderId: team.folderId ? folderIdMap.get(team.folderId) ?? null : null,
          };

          if (existing && strategy === "skip") {
            if (oldId) teamIdMap.set(oldId, existing.id);
            teamsSkipped++;
            continue;
          }
          if (existing && strategy === "replace") {
            if (oldId) teamIdMap.set(oldId, existing.id);
            await updateTeam(existing.id, fields as Partial<Team>);
            teamsReplaced++;
            continue;
          }

          const newId = crypto.randomUUID();
          if (oldId) teamIdMap.set(oldId, newId);
          await addTeam({ id: newId, ...fields } as Team);
          teamsImported++;
        }

        if (Array.isArray(data.teamHistories)) {
          for (const h of data.teamHistories) {
            const newTeamId = teamIdMap.get(h.teamId);
            if (!newTeamId) continue;
            const history: TeamHistory = {
              id: crypto.randomUUID(),
              teamId: newTeamId,
              startYear: h.startYear,
              endYear: h.endYear,
              fieldType: h.fieldType || "legacy",
              logo: h.logo || undefined,
              rating: h.rating != null ? Number(h.rating) : undefined,
              name: h.name || undefined,
              shortName: h.shortName || undefined,
              abbreviation: h.abbreviation || undefined,
              colors: h.colors || undefined,
            };
            await addTeamHistory(history);
            historiesImported++;
          }
        }
      }

      if (doTournaments) {
        const remapId = (id: string) => teamIdMap.get(id) || id;
        const remapIds = (ids: string[]) => ids.map(remapId);

        const remapMatch = (m: any) => ({
          ...m,
          id: crypto.randomUUID(),
          homeTeamId: remapId(m.homeTeamId),
          awayTeamId: remapId(m.awayTeamId),
        });

        const remapSettings = (s: any) => {
          if (!s) return s;
          const clone = { ...s };
          if (clone.groupAssignments) {
            const newGA: Record<string, string[]> = {};
            for (const [g, ids] of Object.entries(clone.groupAssignments)) {
              newGA[g] = (ids as string[]).map(remapId);
            }
            clone.groupAssignments = newGA;
          }
          if (clone.qualifiedTeamIds) {
            clone.qualifiedTeamIds = (clone.qualifiedTeamIds as string[]).map(remapId);
          }
          return clone;
        };

        const remapSeason = (season: any) => ({
          ...season,
          teamIds: season.teamIds ? remapIds(season.teamIds) : undefined,
          championId: season.championId ? remapId(season.championId) : undefined,
          matches: season.matches ? season.matches.map(remapMatch) : undefined,
          standings: season.standings
            ? season.standings.map((st: any) => ({ ...st, teamId: remapId(st.teamId) }))
            : undefined,
        });

        for (const t of data.tournaments) {
          const existing = existingTournaments.get(normalizeName(t?.name || ""));
          if (existing && strategy === "skip") {
            tournamentsSkipped++;
            continue;
          }

          const fields = {
            name: t.name || "Competição importada",
            sport: t.sport || "Futebol",
            year: t.year || new Date().getFullYear(),
            format: t.format || "liga",
            numberOfTeams: t.numberOfTeams || 0,
            logo: t.logo,
            teamIds: t.teamIds ? remapIds(t.teamIds) : [],
            settings: remapSettings(t.settings) || {
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
            matches: t.matches ? t.matches.map(remapMatch) : [],
            finalized: false,
            seasons: t.seasons ? t.seasons.map(remapSeason) : [],
            ligaTurnos: t.ligaTurnos,
            gruposQuantidade: t.gruposQuantidade,
            gruposTurnos: t.gruposTurnos,
            gruposMataMataInicio: t.gruposMataMataInicio,
            mataMataInicio: t.mataMataInicio,
            folderId: t.folderId ? tFolderIdMap.get(t.folderId) ?? null : null,
          };

          if (existing && strategy === "replace") {
            await updateTournament(existing.id, fields as Partial<Tournament>);
            tournamentsReplaced++;
            continue;
          }

          await addTournament({ id: crypto.randomUUID(), ...fields } as Tournament);
          tournamentsImported++;
        }
      }

      let playersImported = 0;
      const unmatched: string[] = [];
      if (doSquads) {
        const latest = useTournamentStore.getState();
        const plan = planSquadImport(data, latest.teams, latest.players);
        unmatched.push(...plan.unmatchedTeams);
        for (const group of plan.matched) {
          try {
            playersImported += await addPlayers(group.players);
          } catch {
            unmatched.push(group.team.name);
          }
        }
      }

      const parts: string[] = [];
      if (teamsImported > 0) parts.push(`${teamsImported} time(s)`);
      if (teamsReplaced > 0) parts.push(`${teamsReplaced} time(s) atualizado(s)`);
      if (foldersImported > 0) parts.push(`${foldersImported} pasta(s)`);
      if (historiesImported > 0) parts.push(`${historiesImported} versão(ões) histórica(s)`);
      if (tournamentsImported > 0) parts.push(`${tournamentsImported} competição(ões)`);
      if (tournamentsReplaced > 0) parts.push(`${tournamentsReplaced} competição(ões) atualizada(s)`);
      if (playersImported > 0) parts.push(`${playersImported} jogador(es)`);

      if (parts.length > 0) toast.success(`Importado: ${parts.join(", ")}`);
      else toast.info("Nada foi importado com as opções escolhidas");

      const skipped = teamsSkipped + tournamentsSkipped;
      if (skipped > 0) toast.info(`${skipped} item(ns) já existente(s) foram mantidos como estavam`);
      if (unmatched.length > 0)
        toast.warning(`Sem time correspondente: ${[...new Set(unmatched)].slice(0, 5).join(", ")}`);

      reset();
      setOpen(false);
    } catch (err) {
      console.error("[ImportDialog] import error:", err);
      toast.error("Erro ao importar. Veja o console para detalhes.");
      setBusy(false);
    }
  };

  const nothingPicked = !(
    (pick.teams && available.teams) ||
    (pick.tournaments && available.tournaments) ||
    (pick.squads && available.squads)
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Importar</DialogTitle>
          <DialogDescription>
            {data ? "Escolha o que aplicar deste arquivo" : "Selecione um arquivo exportado pelo TM2 (.json)"}
          </DialogDescription>
        </DialogHeader>

        <input ref={fileInputRef} type="file" accept=".json" onChange={onFile} className="hidden" />

        {!data ? (
          <div className="space-y-2 pt-2">
            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-11"
              onClick={() => fileInputRef.current?.click()}
            >
              <FileJson className="w-4 h-4 text-primary" />
              <span>Escolher arquivo</span>
              <Upload className="w-3.5 h-3.5 ml-auto text-muted-foreground" />
            </Button>
            <p className="text-[11px] text-muted-foreground pt-1">
              Depois de escolher, você seleciona quais dados aplicar. Elencos são vinculados pelo nome do clube.
            </p>
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            <p className="text-xs text-muted-foreground truncate">{fileName}</p>

            <div className="space-y-1">
              {available.teams && (
                <label className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-secondary/50 cursor-pointer">
                  <Checkbox checked={pick.teams} onCheckedChange={(v) => setPick((p) => ({ ...p, teams: !!v }))} />
                  <Shield className="w-4 h-4 text-primary" />
                  <span className="text-sm">Times ({data.teams.length})</span>
                </label>
              )}
              {available.tournaments && (
                <label className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-secondary/50 cursor-pointer">
                  <Checkbox
                    checked={pick.tournaments}
                    onCheckedChange={(v) => setPick((p) => ({ ...p, tournaments: !!v }))}
                  />
                  <Trophy className="w-4 h-4 text-primary" />
                  <span className="text-sm">Competições ({data.tournaments.length})</span>
                </label>
              )}
              {available.squads && (
                <label className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-secondary/50 cursor-pointer">
                  <Checkbox checked={pick.squads} onCheckedChange={(v) => setPick((p) => ({ ...p, squads: !!v }))} />
                  <Users className="w-4 h-4 text-primary" />
                  <span className="text-sm">Elencos ({data.squads.length} clube(s))</span>
                </label>
              )}
            </div>

            {totalConflicts > 0 && (
              <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-2">
                <p className="text-xs text-foreground">
                  {totalConflicts} item(ns) do arquivo já existem com o mesmo nome. O que fazer?
                </p>
                <div className="grid gap-1">
                  {(
                    [
                      ["replace", "Substituir", "Atualiza os dados do item existente, sem perder vínculos"],
                      ["both", "Manter os dois", "Cria um novo registro além do atual"],
                      ["skip", "Pular", "Não importa esses itens e mantém o que já existe"],
                    ] as [DupStrategy, string, string][]
                  ).map(([value, label, desc]) => (
                    <label
                      key={value}
                      className="flex items-start gap-2 px-2 py-1.5 rounded-lg hover:bg-secondary/50 cursor-pointer"
                    >
                      <input
                        type="radio"
                        name="dup-strategy"
                        className="mt-1 accent-[hsl(var(--primary))]"
                        checked={strategy === value}
                        onChange={() => setStrategy(value)}
                      />
                      <span>
                        <span className="text-xs font-medium text-foreground block">{label}</span>
                        <span className="text-[11px] text-muted-foreground">{desc}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={reset} disabled={busy}>
                Trocar arquivo
              </Button>
              <Button className="flex-1 gap-2" onClick={runImport} disabled={busy || nothingPicked}>
                <Upload className="w-4 h-4" />
                {busy ? "Importando..." : "Importar"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
