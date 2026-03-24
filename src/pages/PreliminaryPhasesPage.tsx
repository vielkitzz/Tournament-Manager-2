import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  Trophy,
  Shield,
  Trash2,
  ChevronDown,
  ChevronUp,
  Check,
  Shuffle,
  Zap,
} from "lucide-react";
import { useTournamentStore } from "@/store/tournamentStore";
import { resolveTeam } from "@/lib/teamHistoryUtils";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  PreliminaryPhase,
  PreliminaryPhaseFormat,
  KnockoutLegMode,
  Match,
} from "@/types/tournament";
import { generateRoundRobin } from "@/lib/roundRobin";
import { calculateStandings } from "@/lib/standings";
import StandingsTable from "@/components/tournament/StandingsTable";
import RoundsView from "@/components/tournament/RoundsView";
import BracketView from "@/components/tournament/BracketView";

export default function PreliminaryPhasesPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { tournaments, teams, updateTournament, teamHistories } = useTournamentStore();
  const tournament = tournaments.find((t) => t.id === id);

  const [expandedPhase, setExpandedPhase] = useState<string | null>(null);
  const [activePhaseTab, setActivePhaseTab] = useState<Record<string, string>>({});
  const [teamSearch, setTeamSearch] = useState("");

  if (!tournament) {
    return (
      <div className="p-6 lg:p-8 text-center py-20">
        <Trophy className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-muted-foreground">Competição não encontrada</p>
      </div>
    );
  }

  const resolvedTeams = teams.map((t) => resolveTeam(t, tournament.year, teamHistories));
  const phases = tournament.preliminaryPhases || [];

  const updatePhases = (newPhases: PreliminaryPhase[]) => {
    updateTournament(tournament.id, { preliminaryPhases: newPhases });
  };

  const addPhase = () => {
    const newPhase: PreliminaryPhase = {
      id: crypto.randomUUID(),
      name: `${phases.length + 1}ª Fase Preliminar`,
      order: phases.length + 1,
      format: "mata-mata",
      numberOfTeams: 8,
      qualifiedCount: 4,
      legMode: "single",
      teamIds: [],
      matches: [],
      finalized: false,
      qualifiedTeamIds: [],
    };
    updatePhases([...phases, newPhase]);
    setExpandedPhase(newPhase.id);
    toast.success("Fase preliminar adicionada!");
  };

  const removePhase = (phaseId: string) => {
    const updated = phases
      .filter((p) => p.id !== phaseId)
      .map((p, i) => ({ ...p, order: i + 1 }));
    updatePhases(updated);
    toast.success("Fase removida!");
  };

  const updatePhase = (phaseId: string, updates: Partial<PreliminaryPhase>) => {
    const updated = phases.map((p) => (p.id === phaseId ? { ...p, ...updates } : p));
    updatePhases(updated);
  };

  const addTeamToPhase = (phaseId: string, teamId: string) => {
    const phase = phases.find((p) => p.id === phaseId);
    if (!phase || phase.teamIds.includes(teamId)) return;
    updatePhase(phaseId, { teamIds: [...phase.teamIds, teamId] });
    toast.success("Time adicionado!");
  };

  const removeTeamFromPhase = (phaseId: string, teamId: string) => {
    const phase = phases.find((p) => p.id === phaseId);
    if (!phase) return;
    updatePhase(phaseId, {
      teamIds: phase.teamIds.filter((id) => id !== teamId),
      matches: [],
      finalized: false,
      qualifiedTeamIds: [],
    });
    toast.success("Time removido!");
  };

  const generatePhaseMatches = (phaseId: string) => {
    const phase = phases.find((p) => p.id === phaseId);
    if (!phase || phase.teamIds.length < 2) {
      toast.error("Adicione pelo menos 2 times.");
      return;
    }

    if (phase.format === "mata-mata") {
      const teamIds = [...phase.teamIds];
      // Shuffle
      for (let i = teamIds.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [teamIds[i], teamIds[j]] = [teamIds[j], teamIds[i]];
      }

      const newMatches: Match[] = [];
      for (let i = 0; i < Math.floor(teamIds.length / 2); i++) {
        const home = teamIds[i * 2];
        const away = teamIds[i * 2 + 1];
        if (!home || !away) continue;

        if (phase.legMode === "home-away") {
          const pairId = crypto.randomUUID();
          newMatches.push({
            id: crypto.randomUUID(), tournamentId: tournament.id, round: 1,
            homeTeamId: home, awayTeamId: away, homeScore: 0, awayScore: 0,
            played: false, stage: "knockout", leg: 1, pairId,
          });
          newMatches.push({
            id: crypto.randomUUID(), tournamentId: tournament.id, round: 1,
            homeTeamId: away, awayTeamId: home, homeScore: 0, awayScore: 0,
            played: false, stage: "knockout", leg: 2, pairId,
          });
        } else {
          newMatches.push({
            id: crypto.randomUUID(), tournamentId: tournament.id, round: 1,
            homeTeamId: home, awayTeamId: away, homeScore: 0, awayScore: 0,
            played: false, stage: "knockout",
          });
        }
      }
      updatePhase(phaseId, { matches: newMatches });
      toast.success(`${newMatches.length} jogos gerados!`);
    } else {
      // Grupos
      const groupCount = phase.groupCount || 2;
      const turnos = phase.groupTurnos || 1;
      const teamIds = [...phase.teamIds];
      const groups: string[][] = Array.from({ length: groupCount }, () => []);
      for (let i = 0; i < teamIds.length; i++) {
        groups[i % groupCount].push(teamIds[i]);
      }

      const allMatches: Match[] = [];
      const assignments: Record<string, string[]> = {};
      for (let g = 0; g < groupCount; g++) {
        assignments[String(g + 1)] = groups[g];
        if (groups[g].length < 2) continue;
        const gMatches = generateRoundRobin(tournament.id, groups[g], turnos);
        const tagged = gMatches.map((m) => ({ ...m, group: g + 1, stage: "group" as const }));
        allMatches.push(...tagged);
      }

      updatePhase(phaseId, { matches: allMatches, groupAssignments: assignments });
      toast.success(`${allMatches.length} jogos de grupos gerados!`);
    }
  };

  const getPhaseWinners = (phase: PreliminaryPhase): string[] => {
    if (phase.format === "mata-mata") {
      const winners: string[] = [];
      const pairMap = new Map<string, { leg1?: Match; leg2?: Match }>();
      const singles: Match[] = [];

      for (const m of phase.matches) {
        if (m.pairId) {
          if (!pairMap.has(m.pairId)) pairMap.set(m.pairId, {});
          const pair = pairMap.get(m.pairId)!;
          if (m.leg === 1) pair.leg1 = m;
          else pair.leg2 = m;
        } else {
          singles.push(m);
        }
      }

      for (const pair of pairMap.values()) {
        if (!pair.leg1?.played) continue;
        if (pair.leg2 && !pair.leg2.played) continue;
        let winnerId: string | null = null;
        if (!pair.leg2) {
          const m = pair.leg1;
          const h = (m.homeScore || 0) + (m.homeExtraTime || 0);
          const a = (m.awayScore || 0) + (m.awayExtraTime || 0);
          if (h > a) winnerId = m.homeTeamId;
          else if (a > h) winnerId = m.awayTeamId;
          else if (m.homePenalties != null) winnerId = (m.homePenalties || 0) > (m.awayPenalties || 0) ? m.homeTeamId : m.awayTeamId;
        } else {
          const h = (pair.leg1.homeScore || 0) + (pair.leg1.homeExtraTime || 0) + (pair.leg2.awayScore || 0) + (pair.leg2.awayExtraTime || 0);
          const a = (pair.leg1.awayScore || 0) + (pair.leg1.awayExtraTime || 0) + (pair.leg2.homeScore || 0) + (pair.leg2.homeExtraTime || 0);
          if (h > a) winnerId = pair.leg1.homeTeamId;
          else if (a > h) winnerId = pair.leg1.awayTeamId;
          else if (pair.leg2.homePenalties != null) winnerId = (pair.leg2.awayPenalties || 0) > (pair.leg2.homePenalties || 0) ? pair.leg1.homeTeamId : pair.leg1.awayTeamId;
        }
        if (winnerId) winners.push(winnerId);
      }

      for (const m of singles) {
        if (!m.played) continue;
        const h = (m.homeScore || 0) + (m.homeExtraTime || 0);
        const a = (m.awayScore || 0) + (m.awayExtraTime || 0);
        let winnerId: string | null = null;
        if (h > a) winnerId = m.homeTeamId;
        else if (a > h) winnerId = m.awayTeamId;
        else if (m.homePenalties != null) winnerId = (m.homePenalties || 0) > (m.awayPenalties || 0) ? m.homeTeamId : m.awayTeamId;
        if (winnerId) winners.push(winnerId);
      }

      return winners;
    } else {
      // Grupos: top N from each group
      const qualPerGroup = Math.max(1, Math.floor(phase.qualifiedCount / (phase.groupCount || 2)));
      const qualified: string[] = [];
      const assignments = phase.groupAssignments || {};
      
      for (const [, groupTeamIds] of Object.entries(assignments)) {
        const gMatches = phase.matches.filter((m) => {
          const gTeams = new Set(groupTeamIds);
          return gTeams.has(m.homeTeamId) && gTeams.has(m.awayTeamId) && m.stage === "group";
        });
        const standings = calculateStandings(groupTeamIds, gMatches, tournament.settings, resolvedTeams);
        standings.slice(0, qualPerGroup).forEach((s) => qualified.push(s.teamId));
      }

      return qualified;
    }
  };

  const finalizePhase = (phaseId: string) => {
    const phase = phases.find((p) => p.id === phaseId);
    if (!phase) return;

    const unplayed = phase.matches.filter((m) => !m.played);
    if (unplayed.length > 0) {
      toast.error("Todos os jogos devem ser simulados antes de finalizar.");
      return;
    }

    const winners = getPhaseWinners(phase);
    if (winners.length === 0) {
      toast.error("Não foi possível determinar classificados.");
      return;
    }

    const qualifiedCount = Math.min(phase.qualifiedCount, winners.length);
    const qualifiedTeamIds = winners.slice(0, qualifiedCount);

    updatePhase(phaseId, { finalized: true, qualifiedTeamIds });

    // Check if this is the last phase — if so, add qualified teams to main tournament
    const phaseIndex = phases.findIndex((p) => p.id === phaseId);
    const isLastPhase = phaseIndex === phases.length - 1;

    if (isLastPhase) {
      // Add qualified teams to the main tournament if not already there
      const currentTeamIds = new Set(tournament.teamIds);
      const newTeamIds = qualifiedTeamIds.filter((id) => !currentTeamIds.has(id));
      if (newTeamIds.length > 0) {
        updateTournament(tournament.id, {
          teamIds: [...tournament.teamIds, ...newTeamIds],
          numberOfTeams: tournament.teamIds.length + newTeamIds.length,
        });
        toast.success(`${newTeamIds.length} time(s) classificado(s) inserido(s) na fase principal!`);
      } else {
        toast.success("Fase finalizada! Times já estavam na fase principal.");
      }
    } else {
      // Feed qualified teams into the next phase
      const nextPhase = phases[phaseIndex + 1];
      if (nextPhase) {
        const existingIds = new Set(nextPhase.teamIds);
        const newIds = qualifiedTeamIds.filter((id) => !existingIds.has(id));
        if (newIds.length > 0) {
          updatePhase(nextPhase.id, {
            teamIds: [...nextPhase.teamIds, ...newIds],
          });
        }
        toast.success(`${qualifiedTeamIds.length} time(s) avançou(aram) para ${nextPhase.name}!`);
      }
    }
  };

  const getPhaseTab = (phaseId: string) => activePhaseTab[phaseId] || (phases.find(p => p.id === phaseId)?.format === "grupos" ? "standings" : "bracket");

  // Get teams already used in any phase or main tournament
  const usedTeamIds = new Set([
    ...phases.flatMap((p) => p.teamIds),
  ]);

  const availableTeams = resolvedTeams.filter(
    (t) => !t.isArchived && !usedTeamIds.has(t.id)
  );

  return (
    <div className="p-4 lg:p-8 max-w-5xl">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(`/tournament/${id}`)} className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-xl font-display font-bold text-foreground">Fases Preliminares</h1>
          <p className="text-xs text-muted-foreground">{tournament.name} · {tournament.year}</p>
        </div>
      </div>

      {phases.length === 0 ? (
        <div className="text-center py-16 space-y-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <Zap className="w-7 h-7 text-primary" />
          </div>
          <div>
            <p className="text-foreground font-medium">Nenhuma fase preliminar configurada</p>
            <p className="text-sm text-muted-foreground mt-1">
              Adicione fases eliminatórias para classificar times à fase principal.
            </p>
          </div>
          <Button onClick={addPhase} className="gap-2">
            <Plus className="w-4 h-4" />
            Adicionar Fase Preliminar
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Flow diagram */}
          <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/50 border border-border overflow-x-auto">
            {phases.map((phase, i) => (
              <React.Fragment key={phase.id}>
                <div className={`shrink-0 px-3 py-1.5 rounded-md text-xs font-medium ${
                  phase.finalized
                    ? "bg-primary/15 text-primary border border-primary/30"
                    : "bg-secondary border border-border text-foreground"
                }`}>
                  {phase.name}
                  {phase.finalized && <Check className="w-3 h-3 inline ml-1" />}
                </div>
                {i < phases.length - 1 && (
                  <span className="text-muted-foreground text-xs shrink-0">→</span>
                )}
              </React.Fragment>
            ))}
            <span className="text-muted-foreground text-xs shrink-0">→</span>
            <div className="shrink-0 px-3 py-1.5 rounded-md text-xs font-medium bg-primary/10 text-primary border border-primary/20">
              Fase Principal
            </div>
          </div>

          {/* Phase cards */}
          {phases.map((phase) => {
            const isExpanded = expandedPhase === phase.id;
            const allPlayed = phase.matches.length > 0 && phase.matches.every((m) => m.played);
            const tab = getPhaseTab(phase.id);

            return (
              <div key={phase.id} className="rounded-xl border border-border bg-card overflow-hidden">
                {/* Header */}
                <div
                  className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-secondary/30 transition-colors"
                  onClick={() => setExpandedPhase(isExpanded ? null : phase.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      phase.finalized ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground"
                    }`}>
                      {phase.finalized ? <Check className="w-4 h-4" /> : <Trophy className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">{phase.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {phase.format === "mata-mata" ? "Mata-Mata" : `${phase.groupCount || 2} Grupos`}
                        {" · "}
                        {phase.teamIds.length} times · {phase.qualifiedCount} classificados
                        {phase.legMode === "home-away" ? " · Ida e Volta" : " · Jogo Único"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {phase.finalized && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                        Finalizada
                      </span>
                    )}
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </div>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="border-t border-border p-4 space-y-4">
                    {/* Configuration */}
                    {!phase.finalized && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Nome</Label>
                          <Input
                            value={phase.name}
                            onChange={(e) => updatePhase(phase.id, { name: e.target.value })}
                            className="h-8 text-xs bg-secondary border-border"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Formato</Label>
                          <Select
                            value={phase.format}
                            onValueChange={(v) => updatePhase(phase.id, {
                              format: v as PreliminaryPhaseFormat,
                              matches: [],
                              groupAssignments: undefined,
                              groupsFinalized: false,
                            })}
                          >
                            <SelectTrigger className="h-8 text-xs bg-secondary border-border"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="mata-mata">Mata-Mata</SelectItem>
                              <SelectItem value="grupos">Grupos</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Classificados</Label>
                          <Input
                            type="number"
                            value={phase.qualifiedCount}
                            onChange={(e) => updatePhase(phase.id, { qualifiedCount: parseInt(e.target.value) || 1 })}
                            className="h-8 text-xs bg-secondary border-border"
                            min={1}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Jogos</Label>
                          <Select
                            value={phase.legMode}
                            onValueChange={(v) => updatePhase(phase.id, { legMode: v as KnockoutLegMode, matches: [] })}
                          >
                            <SelectTrigger className="h-8 text-xs bg-secondary border-border"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="single">Jogo Único</SelectItem>
                              <SelectItem value="home-away">Ida e Volta</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {phase.format === "grupos" && (
                          <>
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">Nº de Grupos</Label>
                              <Input
                                type="number"
                                value={phase.groupCount || 2}
                                onChange={(e) => updatePhase(phase.id, { groupCount: parseInt(e.target.value) || 2, matches: [], groupAssignments: undefined })}
                                className="h-8 text-xs bg-secondary border-border"
                                min={2} max={8}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">Turnos</Label>
                              <Select
                                value={String(phase.groupTurnos || 1)}
                                onValueChange={(v) => updatePhase(phase.id, { groupTurnos: parseInt(v) as 1 | 2, matches: [] })}
                              >
                                <SelectTrigger className="h-8 text-xs bg-secondary border-border"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="1">1 Turno</SelectItem>
                                  <SelectItem value="2">2 Turnos</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {/* Teams management */}
                    {!phase.finalized && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-medium text-foreground">
                            Times ({phase.teamIds.length})
                          </Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button size="sm" variant="outline" className="gap-1 text-xs h-7">
                                <Plus className="w-3 h-3" />
                                Adicionar
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-64 p-2" align="end">
                              <div className="space-y-2">
                                <Input
                                  placeholder="Buscar time..."
                                  value={teamSearch}
                                  onChange={(e) => setTeamSearch(e.target.value)}
                                  className="h-8 text-xs"
                                />
                                <div className="max-h-[200px] overflow-y-auto space-y-0.5">
                                  {availableTeams
                                    .filter((t) => !phase.teamIds.includes(t.id))
                                    .filter((t) => !teamSearch || t.name.toLowerCase().includes(teamSearch.toLowerCase()))
                                    .map((team) => (
                                      <button
                                        key={team.id}
                                        onClick={() => { addTeamToPhase(phase.id, team.id); setTeamSearch(""); }}
                                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-secondary/60 transition-colors text-left"
                                      >
                                        <div className="w-5 h-5 flex items-center justify-center shrink-0">
                                          {team.logo ? (
                                            <img src={team.logo} alt="" className="w-5 h-5 object-contain" />
                                          ) : (
                                            <Shield className="w-3.5 h-3.5 text-muted-foreground" />
                                          )}
                                        </div>
                                        <span className="text-xs text-foreground truncate">{team.name}</span>
                                      </button>
                                    ))}
                                  {availableTeams.filter((t) => !phase.teamIds.includes(t.id)).length === 0 && (
                                    <p className="text-xs text-muted-foreground text-center py-2">Nenhum time disponível</p>
                                  )}
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {phase.teamIds.map((tid) => {
                            const team = resolvedTeams.find((t) => t.id === tid);
                            return (
                              <div key={tid} className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-secondary border border-border text-xs">
                                <div className="w-4 h-4 flex items-center justify-center shrink-0">
                                  {team?.logo ? (
                                    <img src={team.logo} alt="" className="w-4 h-4 object-contain" />
                                  ) : (
                                    <Shield className="w-3 h-3 text-muted-foreground" />
                                  )}
                                </div>
                                <span className="text-foreground">{team?.abbreviation || team?.name || "?"}</span>
                                <button
                                  onClick={() => removeTeamFromPhase(phase.id, tid)}
                                  className="text-muted-foreground hover:text-destructive transition-colors"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Qualified teams display */}
                    {phase.finalized && phase.qualifiedTeamIds.length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-xs font-medium text-primary">
                          Classificados ({phase.qualifiedTeamIds.length})
                        </Label>
                        <div className="flex flex-wrap gap-1.5">
                          {phase.qualifiedTeamIds.map((tid) => {
                            const team = resolvedTeams.find((t) => t.id === tid);
                            return (
                              <div key={tid} className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-primary/10 border border-primary/20 text-xs">
                                <div className="w-4 h-4 flex items-center justify-center shrink-0">
                                  {team?.logo ? (
                                    <img src={team.logo} alt="" className="w-4 h-4 object-contain" />
                                  ) : (
                                    <Shield className="w-3 h-3 text-primary" />
                                  )}
                                </div>
                                <span className="text-primary font-medium">{team?.name || "?"}</span>
                                <Check className="w-3 h-3 text-primary" />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {!phase.finalized && phase.teamIds.length >= 2 && phase.matches.length === 0 && (
                        <Button onClick={() => generatePhaseMatches(phase.id)} size="sm" className="gap-1.5">
                          <Shuffle className="w-3.5 h-3.5" />
                          Gerar Jogos
                        </Button>
                      )}
                      {!phase.finalized && allPlayed && phase.matches.length > 0 && (
                        <Button onClick={() => finalizePhase(phase.id)} size="sm" className="gap-1.5 bg-primary text-primary-foreground">
                          <Trophy className="w-3.5 h-3.5" />
                          Finalizar Fase
                        </Button>
                      )}
                      {!phase.finalized && phase.matches.length > 0 && (
                        <Button
                          onClick={() => updatePhase(phase.id, { matches: [], groupAssignments: undefined, groupsFinalized: false })}
                          size="sm" variant="outline"
                        >
                          Resetar Jogos
                        </Button>
                      )}
                      {phase.finalized && (
                        <Button
                          onClick={() => updatePhase(phase.id, { finalized: false, qualifiedTeamIds: [] })}
                          size="sm" variant="outline"
                        >
                          Reabrir Fase
                        </Button>
                      )}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive gap-1">
                            <Trash2 className="w-3.5 h-3.5" />
                            Remover
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remover {phase.name}?</AlertDialogTitle>
                            <AlertDialogDescription>Todos os dados desta fase serão perdidos.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => removePhase(phase.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                              Remover
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>

                    {/* Matches view */}
                    {phase.matches.length > 0 && (
                      <div className="mt-4">
                        <Tabs
                          value={tab}
                          onValueChange={(v) => setActivePhaseTab((prev) => ({ ...prev, [phase.id]: v }))}
                        >
                          <TabsList className="bg-secondary/50 border border-border p-1 mb-4">
                            {phase.format === "grupos" && (
                              <TabsTrigger value="standings" className="data-[state=active]:bg-card data-[state=active]:shadow-sm text-xs">
                                Classificação
                              </TabsTrigger>
                            )}
                            <TabsTrigger value="rounds" className="data-[state=active]:bg-card data-[state=active]:shadow-sm text-xs">
                              Jogos
                            </TabsTrigger>
                            {phase.format === "mata-mata" && (
                              <TabsTrigger value="bracket" className="data-[state=active]:bg-card data-[state=active]:shadow-sm text-xs">
                                Chaveamento
                              </TabsTrigger>
                            )}
                          </TabsList>

                          {phase.format === "grupos" && (
                            <TabsContent value="standings" className="mt-0">
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {Array.from({ length: phase.groupCount || 2 }, (_, i) => i + 1).map((gNum) => {
                                  const gTeamIds = phase.groupAssignments?.[String(gNum)] || [];
                                  const gMatches = phase.matches.filter((m) => m.group === gNum && m.stage === "group");
                                  const gStandings = calculateStandings(gTeamIds, gMatches, tournament.settings, resolvedTeams);
                                  return (
                                    <div key={gNum} className="space-y-2">
                                      <h4 className="font-display font-bold text-sm text-foreground px-1">
                                        Grupo {String.fromCharCode(64 + gNum)}
                                      </h4>
                                      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
                                        <StandingsTable
                                          standings={gStandings}
                                          promotions={[]}
                                          matches={gMatches}
                                          allTeams={resolvedTeams}
                                          hideScreenshot
                                        />
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </TabsContent>
                          )}

                          <TabsContent value="rounds" className="mt-0">
                            <RoundsView
                              tournament={{
                                ...tournament,
                                matches: phase.matches,
                                teamIds: phase.teamIds,
                              }}
                              teams={resolvedTeams}
                              onUpdateMatch={(updated) => {
                                const newMatches = phase.matches.map((m) => (m.id === updated.id ? updated : m));
                                updatePhase(phase.id, { matches: newMatches });
                              }}
                              onBatchUpdateMatches={(updatedMatches) => {
                                const existingIds = new Set(phase.matches.map((m) => m.id));
                                const updates = updatedMatches.filter((m) => existingIds.has(m.id));
                                const additions = updatedMatches.filter((m) => !existingIds.has(m.id));
                                const newMatches = [
                                  ...phase.matches.map((m) => {
                                    const upd = updates.find((u) => u.id === m.id);
                                    return upd || m;
                                  }),
                                  ...additions,
                                ];
                                updatePhase(phase.id, { matches: newMatches });
                              }}
                              onGenerateRounds={undefined}
                            />
                          </TabsContent>

                          {phase.format === "mata-mata" && (
                            <TabsContent value="bracket" className="mt-0">
                              <BracketView
                                tournament={{
                                  ...tournament,
                                  matches: phase.matches,
                                  teamIds: phase.teamIds,
                                  mataMataInicio: (() => {
                                    const count = Math.floor(phase.teamIds.length / 2) * 2;
                                    if (count >= 64) return "1/64";
                                    if (count >= 32) return "1/32";
                                    if (count >= 16) return "1/16";
                                    if (count >= 8) return "1/8";
                                    if (count >= 4) return "1/4";
                                    return "1/2";
                                  })(),
                                }}
                                teams={resolvedTeams}
                                onUpdateMatch={(updated) => {
                                  const newMatches = phase.matches.map((m) => (m.id === updated.id ? updated : m));
                                  updatePhase(phase.id, { matches: newMatches });
                                }}
                                onBatchUpdateMatches={(updatedMatches) => {
                                  const tagged = updatedMatches.map((m) => ({ ...m, stage: "knockout" as const }));
                                  const existingIds = new Set(phase.matches.map((m) => m.id));
                                  const updates = tagged.filter((m) => existingIds.has(m.id));
                                  const additions = tagged.filter((m) => !existingIds.has(m.id));
                                  const newMatches = [
                                    ...phase.matches.map((m) => {
                                      const upd = updates.find((u) => u.id === m.id);
                                      return upd || m;
                                    }),
                                    ...additions,
                                  ];
                                  updatePhase(phase.id, { matches: newMatches });
                                }}
                                onGenerateBracket={() => generatePhaseMatches(phase.id)}
                                onFinalize={() => finalizePhase(phase.id)}
                                onAddMatch={(match) => {
                                  updatePhase(phase.id, { matches: [...phase.matches, { ...match, stage: "knockout" }] });
                                }}
                                onRemoveMatch={(matchId, pairId) => {
                                  const newMatches = phase.matches.filter((m) => {
                                    if (pairId) return m.pairId !== pairId;
                                    return m.id !== matchId;
                                  });
                                  updatePhase(phase.id, { matches: newMatches });
                                }}
                              />
                            </TabsContent>
                          )}
                        </Tabs>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          <Button onClick={addPhase} variant="outline" className="w-full gap-2">
            <Plus className="w-4 h-4" />
            Adicionar Fase Preliminar
          </Button>
        </div>
      )}
    </div>
  );
}
