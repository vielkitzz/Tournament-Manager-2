import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Trophy,
  Users,
  Settings,
  Calendar,
  ChevronDown,
  ArrowLeft,
  Plus,
  Trash2,
  Share2,
  Download,
  LayoutGrid,
  Zap,
  Shield,
  Pencil,
} from "lucide-react";
import { useTournamentStore } from "@/store/tournamentStore";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import StandingsTable from "@/components/tournament/StandingsTable";
import RoundsView from "@/components/tournament/RoundsView";
import BracketView from "@/components/tournament/BracketView";
import GroupQualificationView from "@/components/tournament/GroupQualificationView";
import StatsView from "@/components/tournament/StatsView";
import { calculateStandings } from "@/lib/standings";
import { generateRoundRobin } from "@/lib/roundRobin";
import { Match, SeasonRecord, STAGE_TEAM_COUNTS, KnockoutStage } from "@/types/tournament";

const formatLabels: Record<string, string> = {
  liga: "Pontos Corridos",
  mataMata: "Mata-Mata",
  grupos: "Grupos + Mata-Mata",
};

export default function TournamentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { tournaments, teams, updateTournament, removeTournament } = useTournamentStore();
  const tournament = tournaments.find((t) => t.id === id);

  const [activeTab, setActiveTab] = useState("standings");
  const [viewingYear, setViewingYear] = useState<number | null>(null);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [newSeasonYear, setNewSeasonYear] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!tournament) {
    return (
      <div className="p-6 lg:p-8 text-center py-20">
        <Trophy className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-muted-foreground">Competição não encontrada</p>
        <button onClick={() => navigate("/")} className="text-primary text-sm mt-3 hover:underline">
          Voltar ao início
        </button>
      </div>
    );
  }

  const activeYear = viewingYear || tournament.year;
  const isViewingPastSeason = viewingYear !== null && viewingYear !== tournament.year;
  const seasonData = isViewingPastSeason
    ? tournament.seasons?.find((s) => s.year === viewingYear)
    : null;

  // Map season standings to StandingRow[] (adding missing fields)
  const seasonStandings: import("@/lib/standings").StandingRow[] = (seasonData?.standings || []).map((s) => ({
    ...s,
    played: s.wins + s.draws + s.losses,
    goalDifference: s.goalsFor - s.goalsAgainst,
  }));

  const isLiga = tournament.format === "liga";
  const isMataMata = tournament.format === "mata-mata";
  const isGrupos = tournament.format === "grupos";

  const settings = tournament.settings;

  // For grupos format, separate group and knockout matches
  const groupMatches = isGrupos
    ? (tournament.matches || []).filter((m) => m.stage === "group" || (!m.stage && !m.isThirdPlace))
    : tournament.matches || [];
  const knockoutMatches = isGrupos
    ? (tournament.matches || []).filter((m) => m.stage === "knockout")
    : [];

  // For grupos: compute standings per group
  const groupCount = tournament.gruposQuantidade || 1;
  const standingsByGroup: Record<number, import("@/lib/standings").StandingRow[]> = {};
  if (isGrupos) {
    for (let g = 1; g <= groupCount; g++) {
      const gMatches = groupMatches.filter((m) => m.group === g);
      const gTeamIds = [...new Set(gMatches.flatMap((m) => [m.homeTeamId, m.awayTeamId]))];
      standingsByGroup[g] = calculateStandings(gTeamIds, gMatches, settings, teams);
    }
  }

  // Overall standings (for liga format or general use)
  const standings = isGrupos
    ? Object.values(standingsByGroup).flat()
    : calculateStandings(tournament.teamIds, tournament.matches || [], settings, teams);

  // Check if all group matches have been played
  const allGroupMatchesPlayed = isGrupos && groupMatches.length > 0 && groupMatches.every((m) => m.played);

  // Create a "group-only" tournament view for RoundsView
  const groupTournament = isGrupos
    ? { ...tournament, matches: groupMatches }
    : tournament;

  // Create a "knockout-only" tournament view for BracketView
  const knockoutTournament = isGrupos
    ? { ...tournament, matches: knockoutMatches, mataMataInicio: tournament.gruposMataMataInicio || "1/8" }
    : tournament;

  // ─── Confirm manual qualifiers & generate knockout ───────────────────────
  const qualifiersPerGroup = (() => {
    const startStage = tournament.gruposMataMataInicio || "1/8";
    const stageTotal = STAGE_TEAM_COUNTS[startStage] || 8;
    const totalTeams = tournament.teamIds.length;
    const maxSensible = Math.max(2, Math.floor(totalTeams / 2));
    return Math.min(stageTotal, maxSensible);
  })();

  const handleConfirmQualifiers = (selectedTeamIds: string[]) => {
    const startStage = tournament.gruposMataMataInicio || "1/8";
    const totalKnockoutTeams = qualifiersPerGroup;

    if (selectedTeamIds.length < 2) {
      toast.error(`Selecione pelo menos 2 times para o mata-mata.`);
      return;
    }
    if (selectedTeamIds.length !== totalKnockoutTeams) {
      if (selectedTeamIds.length % 2 !== 0) {
        toast.error(`Selecione um número par de times (atual: ${selectedTeamIds.length}).`);
        return;
      }
      toast.warning(`${selectedTeamIds.length} times selecionados (esperado: ${totalKnockoutTeams}). Gerando mata-mata assim mesmo.`);
    }

    const teamGroupPos: Record<string, { group: number; pos: number }> = {};
    for (let g = 1; g <= groupCount; g++) {
      (standingsByGroup[g] || []).forEach((row, idx) => {
        teamGroupPos[row.teamId] = { group: g, pos: idx };
      });
    }
    const seededFinal = [...selectedTeamIds].sort((a, b) => {
      const posA = teamGroupPos[a]?.pos ?? 99;
      const posB = teamGroupPos[b]?.pos ?? 99;
      if (posA !== posB) return posA - posB;
      return (teamGroupPos[a]?.group ?? 0) - (teamGroupPos[b]?.group ?? 0);
    });

    const legMode = settings.knockoutLegMode || "single";
    const newMatches: Match[] = [];

    for (let i = 0; i < Math.floor(seededFinal.length / 2); i++) {
      const home = seededFinal[i];
      const away = seededFinal[seededFinal.length - 1 - i];
      if (legMode === "home-away") {
        const pairId = crypto.randomUUID();
        newMatches.push({ id: crypto.randomUUID(), tournamentId: tournament.id, round: 1, homeTeamId: home, awayTeamId: away, homeScore: 0, awayScore: 0, played: false, stage: "knockout", leg: 1, pairId });
        newMatches.push({ id: crypto.randomUUID(), tournamentId: tournament.id, round: 1, homeTeamId: away, awayTeamId: home, homeScore: 0, awayScore: 0, played: false, stage: "knockout", leg: 2, pairId });
      } else {
        newMatches.push({ id: crypto.randomUUID(), tournamentId: tournament.id, round: 1, homeTeamId: home, awayTeamId: away, homeScore: 0, awayScore: 0, played: false, stage: "knockout" });
      }
    }

    const allMatches = [...(tournament.matches || []), ...newMatches];
    const updatedSettings = { ...settings, qualifiedTeamIds: selectedTeamIds };
    updateTournament(tournament.id, {
      matches: allMatches,
      groupsFinalized: true,
      settings: updatedSettings,
    });
    toast.success(`${selectedTeamIds.length} times classificados! ${newMatches.length} jogos de mata-mata gerados.`);
  };

  const handleFinalizeSeason = () => {
    if (standings.length === 0) return;
    
    // Determine champion from knockout bracket if it exists and is finished
    let championTeamId = standings[0].teamId;
    let championName = standings[0].team?.name || "Desconhecido";
    let championLogo = standings[0].team?.logo;

    if (isMataMata || isGrupos) {
      const stages = ["1/64", "1/32", "1/16", "1/8", "1/4", "1/2"];
      const startStage = (isGrupos ? tournament.gruposMataMataInicio : tournament.mataMataInicio) || "1/8";
      const idx = stages.indexOf(startStage);
      const activeStages = idx >= 0 ? stages.slice(idx) : ["1/2"];
      const finalRound = activeStages.length;
      
      const finalMatches = (tournament.matches || []).filter(
        (m) => !m.isThirdPlace && m.round === finalRound && (isGrupos ? m.stage === "knockout" : true)
      );
      
      if (finalMatches.length > 0) {
        const pairMap = new Map<string, { leg1?: Match; leg2?: Match }>();
        const singles: Match[] = [];
        for (const m of finalMatches) {
          if (m.pairId) {
            if (!pairMap.has(m.pairId)) pairMap.set(m.pairId, {});
            const pair = pairMap.get(m.pairId)!;
            if (m.leg === 1) pair.leg1 = m;
            else pair.leg2 = m;
          } else {
            singles.push(m);
          }
        }
        
        const finalPairs = [];
        for (const pair of pairMap.values()) if (pair.leg1) finalPairs.push({ leg1: pair.leg1, leg2: pair.leg2 || null });
        for (const s of singles) finalPairs.push({ leg1: s, leg2: null });
        
        if (finalPairs.length > 0) {
          const pair = finalPairs[0];
          let winnerId = null;
          if (!pair.leg2) {
            const m = pair.leg1;
            if (m.played) {
              const h = (m.homeScore || 0) + (m.homeExtraTime || 0);
              const a = (m.awayScore || 0) + (m.awayExtraTime || 0);
              if (h > a) winnerId = m.homeTeamId;
              else if (a > h) winnerId = m.awayTeamId;
              else if (m.homePenalties !== undefined && m.awayPenalties !== undefined) {
                winnerId = m.homePenalties > m.awayPenalties ? m.homeTeamId : m.awayTeamId;
              }
            }
          } else if (pair.leg1.played && pair.leg2.played) {
            const h = (pair.leg1.homeScore || 0) + (pair.leg1.homeExtraTime || 0) + (pair.leg2.awayScore || 0) + (pair.leg2.awayExtraTime || 0);
            const a = (pair.leg1.awayScore || 0) + (pair.leg1.awayExtraTime || 0) + (pair.leg2.homeScore || 0) + (pair.leg2.homeExtraTime || 0);
            if (h > a) winnerId = pair.leg1.homeTeamId;
            else if (a > h) winnerId = pair.leg1.awayTeamId;
            else if (pair.leg2.homePenalties !== undefined && pair.leg2.awayPenalties !== undefined) {
              winnerId = pair.leg2.awayPenalties > pair.leg2.homePenalties ? pair.leg1.homeTeamId : pair.leg1.awayTeamId;
            }
          }
          
          if (winnerId) {
            const winnerTeam = teams.find(t => t.id === winnerId);
            if (winnerTeam) {
              championTeamId = winnerTeam.id;
              championName = winnerTeam.name;
              championLogo = winnerTeam.logo;
            }
          }
        }
      }
    }

    const seasonRecord: SeasonRecord = {
      year: tournament.year,
      championId: championTeamId,
      championName: championName,
      championLogo: championLogo,
      format: tournament.format,
      groupCount: isGrupos ? groupCount : undefined,
      standings: standings.map((s) => ({
        teamId: s.teamId,
        teamName: s.team?.name || "",
        teamLogo: s.team?.logo,
        points: s.points,
        wins: s.wins,
        draws: s.draws,
        losses: s.losses,
        goalsFor: s.goalsFor,
        goalsAgainst: s.goalsAgainst,
      })),
      matches: [...(tournament.matches || [])],
    };
    const existingSeasons = (tournament.seasons || []).filter((s) => s.year !== tournament.year);
    updateTournament(tournament.id, {
      finalized: true,
      seasons: [...existingSeasons, seasonRecord],
    });
    toast.success(`Temporada ${tournament.year} finalizada! ${championName} é o campeão!`);
  };

  const handleNewSeason = () => {
    updateTournament(tournament.id, {
      year: tournament.year + 1,
      matches: [],
      finalized: false,
      groupsFinalized: false,
    });
    navigate(`/tournament/${tournament.id}/settings`);
    toast.success(`Nova temporada ${tournament.year + 1} criada! Edite as configurações.`);
  };

  const handleDeleteSeason = (year: number) => {
    const updatedSeasons = (tournament.seasons || []).filter((s) => s.year !== year);
    if (year === tournament.year) {
      updateTournament(tournament.id, {
        matches: [],
        finalized: false,
        groupsFinalized: false,
        seasons: updatedSeasons,
      });
    } else {
      updateTournament(tournament.id, { seasons: updatedSeasons });
    }
    if (viewingYear === year) setViewingYear(null);
    toast.success(`Temporada ${year} excluída`);
  };

  const handleCreateSeason = (yearValue?: number) => {
    const targetYear = yearValue || (newSeasonYear ? parseInt(newSeasonYear) : null);
    if (!targetYear || isNaN(targetYear)) {
      toast.error("Informe um ano válido");
      return;
    }
    if ((tournament.seasons || []).some((s) => s.year === targetYear)) {
      toast.error("Este ano já existe");
      return;
    }
    const newSeason: SeasonRecord = {
      year: targetYear,
      championId: "",
      championName: "A definir",
      format: tournament.format,
      standings: [],
      matches: [],
    };
    updateTournament(tournament.id, {
      seasons: [...(tournament.seasons || []), newSeason].sort((a, b) => b.year - a.year),
    });
    setNewSeasonYear("");
    toast.success(`Temporada ${targetYear} criada`);
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateTournament(tournament.id, { logo: reader.result as string });
        toast.success("Logo atualizada!");
      };
      reader.readAsDataURL(file);
    }
  };

  const autoGenerate = () => {
    if (tournament.matches.length > 0 || tournament.teamIds.length < 2) return;
    
    if (tournament.format === "liga") {
      const turnos = tournament.ligaTurnos || 1;
      const matches = generateRoundRobin(tournament.id, tournament.teamIds, turnos);
      updateTournament(tournament.id, { matches });
      toast.success(`${matches.length} jogos gerados automaticamente!`);
    } else if (tournament.format === "grupos") {
      const turnos = tournament.gruposTurnos || 1;
      const teamIds = [...tournament.teamIds];
      const sortedTeamIds = [...teamIds].sort((a, b) => {
        const teamA = teams.find((t) => t.id === a);
        const teamB = teams.find((t) => t.id === b);
        return (teamB?.rate || 5) - (teamA?.rate || 5);
      });
      const groups: string[][] = Array.from({ length: groupCount }, () => []);
      for (let i = 0; i < sortedTeamIds.length; i++) {
        const pot = Math.floor(i / groupCount);
        let groupIdx: number;
        if (pot % 2 === 0) groupIdx = i % groupCount;
        else groupIdx = groupCount - 1 - (i % groupCount);
        groups[groupIdx].push(sortedTeamIds[i]);
      }
      
      const allMatches: Match[] = [];
      for (let g = 0; g < groupCount; g++) {
        if (groups[g].length < 2) continue;
        const groupMatches = generateRoundRobin(tournament.id, groups[g], turnos as 1 | 2 | 3 | 4);
        const tagged = groupMatches.map((m) => ({ ...m, group: g + 1, stage: "group" as const }));
        allMatches.push(...tagged);
      }
      updateTournament(tournament.id, { matches: allMatches });
      toast.success(`${allMatches.length} jogos de fase de grupos gerados!`);
    } else if (tournament.format === "mata-mata") {
      const teamIds = [...tournament.teamIds];
      const startStage = tournament.mataMataInicio || "1/8";
      const expectedTeams = STAGE_TEAM_COUNTS[startStage] || 16;

      if (teamIds.length < 2) {
        toast.error(`Adicione pelo menos 2 times para gerar o chaveamento.`);
        return;
      }
      if (teamIds.length > expectedTeams) {
        toast.error(`A fase ${startStage} suporta no máximo ${expectedTeams} times. Você tem ${teamIds.length}.`);
        return;
      }

      for (let i = teamIds.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [teamIds[i], teamIds[j]] = [teamIds[j], teamIds[i]];
      }

      let bracketSize = 2;
      while (bracketSize < teamIds.length) bracketSize *= 2;
      if (bracketSize > expectedTeams) bracketSize = expectedTeams;
      const paddedIds: (string | null)[] = [...teamIds];
      while (paddedIds.length < bracketSize) paddedIds.push(null);

      const legMode = tournament.settings.knockoutLegMode || "single";
      const newMatches: Match[] = [];
      for (let i = 0; i < paddedIds.length; i += 2) {
        const homeId = paddedIds[i];
        const awayId = paddedIds[i + 1];
        if (!homeId && !awayId) continue;
        if (legMode === "home-away" && homeId && awayId) {
          const pairId = crypto.randomUUID();
          newMatches.push({ id: crypto.randomUUID(), tournamentId: tournament.id, round: 1, homeTeamId: homeId, awayTeamId: awayId, homeScore: 0, awayScore: 0, played: false, leg: 1, pairId, stage: "knockout" });
          newMatches.push({ id: crypto.randomUUID(), tournamentId: tournament.id, round: 1, homeTeamId: awayId, awayTeamId: homeId, homeScore: 0, awayScore: 0, played: false, leg: 2, pairId, stage: "knockout" });
        } else {
          const matchHomeId = homeId || awayId!;
          const matchAwayId = homeId && awayId ? awayId : "";
          const isBye = !homeId || !awayId;
          newMatches.push({ id: crypto.randomUUID(), tournamentId: tournament.id, round: 1, homeTeamId: matchHomeId, awayTeamId: matchAwayId, homeScore: isBye ? 1 : 0, awayScore: 0, played: isBye, stage: "knockout" });
        }
      }
      updateTournament(tournament.id, { matches: newMatches });
      const byeCount = newMatches.filter((m) => m.awayTeamId === "").length;
      toast.success(`${newMatches.length} jogos gerados!${byeCount > 0 ? ` (${byeCount} BYE automático)` : ""}`);
    }
  };

  const optionIcons = [
    { icon: Pencil, label: "Editar Competição", action: () => navigate(`/tournament/${id}/edit`) },
    { icon: Settings, label: "Editar Sistemas", action: () => navigate(`/tournament/${id}/settings`) },
    { icon: Users, label: "Times", action: () => navigate(`/tournament/${id}/teams`) },
    { icon: LayoutGrid, label: "Galeria", action: () => navigate(`/tournament/${id}/gallery`) },
    { icon: Share2, label: "Compartilhar", action: () => navigate(`/tournament/${id}/publish`) },
  ];

  return (
    <div className="p-4 lg:p-8">
      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />

      <div className="flex items-start justify-between mb-6 gap-2 flex-wrap">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/")} className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="w-10 h-10 lg:w-12 lg:h-12 flex items-center justify-center cursor-pointer transition-colors overflow-hidden shrink-0"
            >
              {tournament.logo ? (
                <img src={tournament.logo} alt="" className="w-10 h-10 lg:w-12 lg:h-12 object-contain" />
              ) : (
                <Trophy className="w-5 h-5 lg:w-6 lg:h-6 text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h1 className="text-base lg:text-xl font-display font-bold text-foreground truncate max-w-[160px] sm:max-w-none">{tournament.name}</h1>
                <div className="flex items-center gap-1">
                  {optionIcons.map((item) => (
                    <button
                      key={item.label}
                      onClick={item.action}
                      title={item.label}
                      className="p-1.5 rounded-md transition-colors text-muted-foreground hover:text-primary hover:bg-primary/10"
                    >
                      <item.icon className="w-4 h-4" />
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {tournament.sport} · {formatLabels[tournament.format]} · {tournament.numberOfTeams} times
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative">
            <button
              onClick={() => setShowYearPicker(!showYearPicker)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-secondary border border-border text-sm font-display font-bold text-foreground hover:border-primary/40 transition-colors"
            >
              <Calendar className="w-3.5 h-3.5 text-primary" />
              {activeYear}
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
            {showYearPicker && (
              <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-xl z-20 p-2 min-w-[220px]">
                {(() => {
                  const seasonYears = (tournament.seasons || []).map((s) => s.year);
                  const allYears = Array.from(new Set([...seasonYears, tournament.year])).sort((a, b) => b - a);
                  return (
                    <>
                      {allYears.map((year) => (
                        <div key={year} className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setViewingYear(year === tournament.year ? null : year);
                              setShowYearPicker(false);
                            }}
                            className={`flex-1 text-left px-3 py-1.5 rounded text-sm transition-colors ${
                              year === activeYear
                                ? "bg-primary/10 text-primary font-bold"
                                : "text-foreground hover:bg-secondary"
                            }`}
                          >
                            {year}
                            {seasonYears.includes(year) && year !== tournament.year && (
                              <span className="text-xs text-muted-foreground ml-1">✓</span>
                            )}
                          </button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <button
                                className="p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
                                title="Excluir temporada"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir temporada {year}?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Todos os dados desta temporada serão perdidos.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => { handleDeleteSeason(year); setShowYearPicker(false); }}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      ))}
                      <div className="mt-2 pt-2 border-t border-border">
                        <div className="flex gap-1">
                          <Input
                            placeholder="Novo ano"
                            value={newSeasonYear}
                            onChange={(e) => setNewSeasonYear(e.target.value)}
                            className="h-8 text-xs bg-secondary border-border"
                          />
                          <Button onClick={() => handleCreateSeason()} size="sm" className="h-8 px-2">
                            <Plus className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
          </div>
          {!isViewingPastSeason && tournament.finalized && (
            <Button onClick={handleNewSeason} size="sm" className="gap-1.5 bg-primary text-primary-foreground">
              <Plus className="w-3.5 h-3.5" />
              Nova Temporada
            </Button>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <TabsList className="bg-secondary/50 border border-border p-1">
            <TabsTrigger value="standings" className="data-[state=active]:bg-card data-[state=active]:shadow-sm text-xs lg:text-sm">Classificação</TabsTrigger>
            <TabsTrigger value="rounds" className="data-[state=active]:bg-card data-[state=active]:shadow-sm text-xs lg:text-sm">Jogos</TabsTrigger>
            {(isMataMata || isGrupos) && (
              <TabsTrigger value="bracket" className="data-[state=active]:bg-card data-[state=active]:shadow-sm text-xs lg:text-sm">Chaveamento</TabsTrigger>
            )}
            <TabsTrigger value="stats" className="data-[state=active]:bg-card data-[state=active]:shadow-sm text-xs lg:text-sm">Estatísticas</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <Download className="w-3.5 h-3.5" />
              Exportar
            </Button>
          </div>
        </div>

        <TabsContent value="standings" className="mt-0 outline-none">
          {isGrupos ? (
            <div className="space-y-8">
              {!tournament.groupsFinalized && (
                <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Zap className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">Fase de Grupos em andamento</p>
                      <p className="text-xs text-muted-foreground">
                        {allGroupMatchesPlayed ? "Todos os jogos concluídos! Confirme os classificados." : "Acompanhe a classificação em tempo real."}
                      </p>
                    </div>
                  </div>
                  {allGroupMatchesPlayed && (
                    <Button onClick={() => setActiveTab("bracket")} size="sm" className="gap-1.5 bg-primary text-primary-foreground w-full sm:w-auto">
                      Confirmar Classificados
                    </Button>
                  )}
                </div>
              )}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {Array.from({ length: groupCount }, (_, i) => i + 1).map((groupNum) => (
                  <div key={groupNum} className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                      <h3 className="font-display font-bold text-lg text-foreground">Grupo {String.fromCharCode(64 + groupNum)}</h3>
                    </div>
                    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
                      <StandingsTable
                        standings={isViewingPastSeason ? seasonStandings : (standingsByGroup[groupNum] || [])}
                        promotions={tournament.settings.promotions}
                        qualifyUntil={qualifiersPerGroup}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
                <StandingsTable
                  standings={isViewingPastSeason ? seasonStandings : standings}
                  promotions={tournament.settings.promotions}
                />
              </div>
              {!isViewingPastSeason && !tournament.finalized && isLiga && standings.length > 0 && standings.every(s => s.played > 0) && (
                <div className="flex justify-center pt-4">
                  <Button onClick={handleFinalizeSeason} className="gap-2 bg-primary text-primary-foreground">
                    <Trophy className="w-4 h-4" />
                    Finalizar Temporada
                  </Button>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="rounds" className="mt-0 outline-none">
          <div className="space-y-4">
            <RoundsView
              tournament={isViewingPastSeason ? { ...tournament, matches: seasonData?.matches || [] } : groupTournament}
              teams={teams}
              onUpdateMatch={(updated) => {
                const newMatches = (tournament.matches || []).map((m) => (m.id === updated.id ? updated : m));
                updateTournament(tournament.id, { matches: newMatches });
              }}
              onBatchUpdateMatches={(updatedMatches) => {
                const existingIds = new Set((tournament.matches || []).map((m) => m.id));
                const updates = updatedMatches.filter((m) => existingIds.has(m.id));
                const additions = updatedMatches.filter((m) => !existingIds.has(m.id));
                const newMatches = [
                  ...(tournament.matches || []).map((m) => {
                    const upd = updates.find((u) => u.id === m.id);
                    return upd || m;
                  }),
                  ...additions,
                ];
                updateTournament(tournament.id, { matches: newMatches });
              }}
              onGenerateRounds={() => autoGenerate()}
            />
          </div>
        </TabsContent>

        {(isMataMata || isGrupos) && (
          <TabsContent value="bracket" className="mt-0 outline-none">
            <div className="space-y-6">
              {isGrupos && !tournament.groupsFinalized && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 px-1">
                    <Trophy className="w-5 h-5 text-primary" />
                    <h2 className="text-lg font-display font-bold text-foreground">Definir Classificados</h2>
                  </div>
                  <GroupQualificationView
                    groupCount={groupCount}
                    standingsByGroup={standingsByGroup}
                    totalKnockoutTeams={qualifiersPerGroup}
                    allGroupMatchesPlayed={allGroupMatchesPlayed}
                    confirmedTeamIds={tournament.settings.qualifiedTeamIds}
                    onConfirm={handleConfirmQualifiers}
                  />
                </div>
              )}
              
              {(isMataMata || (isGrupos && tournament.groupsFinalized)) && (
                <div className="space-y-4">
                  <BracketView
                    tournament={isViewingPastSeason ? { ...tournament, matches: seasonData?.matches || [] } : knockoutTournament}
                    teams={teams}
                    onUpdateMatch={(updated) => {
                      const newMatches = (tournament.matches || []).map((m) => (m.id === updated.id ? updated : m));
                      updateTournament(tournament.id, { matches: newMatches });
                    }}
                    onBatchUpdateMatches={(updatedMatches) => {
                      const tagged = updatedMatches.map((m) => ({ ...m, stage: (isGrupos ? "knockout" : m.stage) as any }));
                      const existingIds = new Set((tournament.matches || []).map((m) => m.id));
                      const updates = tagged.filter((m) => existingIds.has(m.id));
                      const additions = tagged.filter((m) => !existingIds.has(m.id));
                      const newMatches = [
                        ...(tournament.matches || []).map((m) => {
                          const upd = updates.find((u) => u.id === m.id);
                          return upd || m;
                        }),
                        ...additions,
                      ];
                      updateTournament(tournament.id, { matches: newMatches });
                      toast.success("Chaveamento atualizado!");
                    }}
                    onGenerateBracket={() => autoGenerate()}
                    onFinalize={handleFinalizeSeason}
                  />
                </div>
              )}
            </div>
          </TabsContent>
        )}

        <TabsContent value="stats" className="mt-0 outline-none">
          <StatsView
            tournament={isViewingPastSeason ? { ...tournament, matches: seasonData?.matches || [] } : tournament}
            teams={teams}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
