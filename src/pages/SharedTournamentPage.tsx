import React, { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Trophy,
  Calendar,
  ChevronDown,
  Shield,
  Play,
  Shuffle,
  Loader2,
  Lock,
  LogIn,
  Menu,
  X,
} from "lucide-react";
import AppSidebar from "@/components/AppSidebar";
import { useSharedTournament, SharedRole } from "@/hooks/useSharedTournament";
import { useAuth } from "@/hooks/useAuth";
import { resolveTeam } from "@/lib/teamHistoryUtils";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import StandingsTable from "@/components/tournament/StandingsTable";
import RoundsView from "@/components/tournament/RoundsView";
import BracketView from "@/components/tournament/BracketView";
import GroupDrawDialog from "@/components/tournament/GroupDrawDialog";
import StatsView from "@/components/tournament/StatsView";
import { calculateStandings } from "@/lib/standings";
import { generateRoundRobin } from "@/lib/roundRobin";
import { Match, SeasonRecord, STAGE_TEAM_COUNTS, KnockoutStage } from "@/types/tournament";
import ScreenshotButton from "@/components/ScreenshotButton";
import { generateSwissLeagueMatches } from "@/lib/swissRounds";

const formatLabels: Record<string, string> = {
  liga: "Pontos Corridos",
  mataMata: "Mata-Mata",
  "mata-mata": "Mata-Mata",
  grupos: "Grupos + Mata-Mata",
  suico: "Sistema Suíço",
};

export default function SharedTournamentPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    tournament,
    teams,
    teamHistories,
    role,
    visibility,
    loading,
    error,
    updateTournament,
  } = useSharedTournament(token);

  const [activeTab, setActiveTab] = useState<string>("standings");
  const [viewingYear, setViewingYear] = useState<number | null>(null);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [showDrawDialog, setShowDrawDialog] = useState(false);
  const [groupTeamSearch, setGroupTeamSearch] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Wrapper that adds sidebar layout to any content
  const withSidebar = (content: React.ReactNode) => (
    <div className="flex min-h-screen w-full bg-background">
      {/* Mobile header */}
      <div className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 h-14 bg-background/90 backdrop-blur-xl border-b border-border lg:hidden">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 -ml-1 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        <span className="text-sm font-display font-bold text-foreground tracking-wide">TM2</span>
        <div className="w-9" />
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="relative">
          <AppSidebar onNavigate={() => setSidebarOpen(false)} />
          <button
            onClick={() => setSidebarOpen(false)}
            className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors lg:hidden"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-auto pt-16 lg:pt-0 min-w-0 relative">
        {content}
      </main>
    </div>
  );

  const isReadOnly = role === "viewer" || role === null;
  const canEdit = role === "admin" || role === "owner";

  // Set default tab based on format once tournament loads
  useEffect(() => {
    if (tournament) {
      setActiveTab(tournament.format === "mata-mata" ? "bracket" : "standings");
    }
  }, [tournament?.id]);

  if (loading) {
    return withSidebar(
      <div className="flex items-center justify-center min-h-[80vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error && visibility === "restricted" && !user) {
    return withSidebar(
      <div className="flex flex-col items-center justify-center min-h-[80vh] gap-4">
        <Lock className="w-12 h-12 text-muted-foreground" />
        <h1 className="text-xl font-bold text-foreground">Acesso Restrito</h1>
        <p className="text-sm text-muted-foreground text-center max-w-sm">
          Esta competição é privada. Faça login para verificar se você tem acesso.
        </p>
        <Button onClick={() => navigate("/auth")} className="gap-2">
          <LogIn className="w-4 h-4" />
          Fazer Login
        </Button>
      </div>
    );
  }

  if (error || !tournament) {
    return withSidebar(
      <div className="flex flex-col items-center justify-center min-h-[80vh] gap-4">
        <Trophy className="w-12 h-12 text-muted-foreground" />
        <h1 className="text-xl font-bold text-foreground">Link inválido</h1>
        <p className="text-sm text-muted-foreground">
          Esta competição não foi encontrada ou não está mais disponível.
        </p>
      </div>
    );
  }

  // ─── Derived state (same logic as TournamentDetailPage) ───
  const activeYear = viewingYear || tournament.year;
  const isViewingPastSeason = viewingYear !== null && viewingYear !== tournament.year;
  const seasonData = isViewingPastSeason
    ? tournament.seasons?.find((s) => s.year === viewingYear)
    : null;

  const resolvedTeams = teams.map((t) => resolveTeam(t, activeYear, teamHistories));

  const seasonTeamIds = (() => {
    if (!isViewingPastSeason) return tournament.teamIds;
    if (seasonData?.teamIds) return seasonData.teamIds;
    if (seasonData) {
      const fromStandings = seasonData.standings?.map((s) => s.teamId).filter(Boolean) || [];
      if (fromStandings.length > 0) return fromStandings;
      const fromMatches = seasonData.matches
        ? [...new Set(seasonData.matches.flatMap((m) => [m.homeTeamId, m.awayTeamId]).filter(Boolean))]
        : [];
      return fromMatches;
    }
    return [];
  })();

  const seasonRecordForYear = (tournament.seasons || []).find((s) => s.year === activeYear);
  const championRecord = isViewingPastSeason ? seasonData : tournament.finalized ? seasonRecordForYear : null;
  const championTeam = championRecord?.championId ? resolvedTeams.find((t) => t.id === championRecord.championId) : null;
  const championDisplayName = championRecord?.championName || championTeam?.name;
  const championDisplayLogo = championRecord?.championLogo || championTeam?.logo;

  const isLiga = tournament.format === "liga";
  const isMataMata = tournament.format === "mata-mata";
  const isGrupos = tournament.format === "grupos";
  const isSuico = tournament.format === "suico";
  const hasKnockout = isMataMata || isGrupos || isSuico;

  const settings = tournament.settings;

  // Season standings
  const seasonStandings: import("@/lib/standings").StandingRow[] = (seasonData?.standings || []).map((s) => {
    const resolved = resolvedTeams.find((t) => t.id === s.teamId);
    const fallbackTeam = {
      id: s.teamId, name: (s as any).teamName || "—", shortName: (s as any).teamName || "—",
      abbreviation: (s as any).teamName || "—", logo: (s as any).teamLogo, colors: [], rate: 0, isArchived: false,
    };
    return { ...s, played: s.wins + s.draws + s.losses, goalDifference: s.goalsFor - s.goalsAgainst, team: resolved || fallbackTeam };
  });

  const groupMatches = (isGrupos || isSuico)
    ? (tournament.matches || []).filter((m) => m.stage === "group" || (!m.stage && !m.isThirdPlace))
    : tournament.matches || [];
  const knockoutMatches = (isGrupos || isSuico)
    ? (tournament.matches || []).filter((m) => m.stage === "knockout")
    : [];

  const groupCount = tournament.gruposQuantidade || 1;

  const currentAssignments: Record<string, string[]> = (() => {
    if (settings.groupAssignments && Object.keys(settings.groupAssignments).length > 0) {
      return settings.groupAssignments;
    }
    if (!isGrupos) return {};
    const derived: Record<string, string[]> = {};
    for (let g = 1; g <= groupCount; g++) {
      const gMatches = groupMatches.filter((m) => m.group === g);
      const ids = [...new Set(gMatches.flatMap((m) => [m.homeTeamId, m.awayTeamId]))].filter(Boolean);
      if (ids.length > 0) derived[String(g)] = ids;
    }
    return derived;
  })();

  const standingsByGroup: Record<number, import("@/lib/standings").StandingRow[]> = {};
  if (isGrupos) {
    for (let g = 1; g <= groupCount; g++) {
      const assignedTeams = currentAssignments[String(g)] || [];
      const gMatches = groupMatches.filter((m) => m.group === g);
      const gTeamIds = assignedTeams.length > 0
        ? assignedTeams
        : [...new Set(gMatches.flatMap((m) => [m.homeTeamId, m.awayTeamId]))];
      standingsByGroup[g] = calculateStandings(gTeamIds, gMatches, settings, resolvedTeams);
    }
  }

  const seasonStandingsByGroup: Record<number, import("@/lib/standings").StandingRow[]> = {};
  if (isViewingPastSeason && seasonData && isGrupos) {
    const pastGroupCount = seasonData.groupCount || tournament.gruposQuantidade || 1;
    const hasGroupInfo = seasonData.standings.some((s) => s.group != null);
    if (hasGroupInfo) {
      for (let g = 1; g <= pastGroupCount; g++) {
        seasonStandingsByGroup[g] = seasonStandings.filter((s) => (s as any).group === g);
      }
    } else {
      const pastMatches = seasonData.matches || [];
      const pastSettings = seasonData.settings || tournament.settings;
      for (let g = 1; g <= pastGroupCount; g++) {
        const gMatches = pastMatches.filter((m) => m.group === g && (m.stage === "group" || !m.stage));
        const gTeamIds = [...new Set(gMatches.flatMap((m) => [m.homeTeamId, m.awayTeamId]))].filter(Boolean);
        if (gTeamIds.length > 0) {
          seasonStandingsByGroup[g] = calculateStandings(gTeamIds, gMatches, pastSettings, resolvedTeams);
        }
      }
    }
  }

  const suicoLeagueMatches = isSuico ? groupMatches : [];

  const standings = isGrupos
    ? Object.values(standingsByGroup).flat()
    : isSuico
    ? calculateStandings(tournament.teamIds, suicoLeagueMatches, settings, resolvedTeams)
    : calculateStandings(tournament.teamIds, tournament.matches || [], settings, resolvedTeams);

  const allGroupMatchesPlayed = isGrupos && groupMatches.length > 0 && groupMatches.every((m) => m.played);
  const allSuicoLeagueMatchesPlayed = isSuico && suicoLeagueMatches.length > 0 && suicoLeagueMatches.every((m) => m.played);

  const groupTournament = isGrupos
    ? { ...tournament, matches: groupMatches }
    : isSuico
    ? { ...tournament, matches: suicoLeagueMatches }
    : tournament;

  const knockoutTournament = (isGrupos || isSuico)
    ? { ...tournament, matches: knockoutMatches, mataMataInicio: isSuico ? (tournament.suicoMataMataInicio || "1/8") : (tournament.gruposMataMataInicio || "1/8") }
    : tournament;

  const qualifiersPerGroup = (() => {
    const startStage = isSuico
      ? (tournament.suicoMataMataInicio || "1/8")
      : (tournament.gruposMataMataInicio || "1/8");
    const stageTotal = STAGE_TEAM_COUNTS[startStage] || 8;
    return Math.max(2, Math.min(stageTotal, tournament.teamIds.length));
  })();

  // ─── Mutation handlers (only work for admin/owner) ───
  const handleUpdateMatch = (updated: Match) => {
    if (isReadOnly) return;
    const newMatches = (tournament.matches || []).map((m) => (m.id === updated.id ? updated : m));
    updateTournament({ matches: newMatches });
  };

  const handleBatchUpdateMatches = (updatedMatches: Match[]) => {
    if (isReadOnly) return;
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
    updateTournament({ matches: newMatches });
  };

  const handleBatchUpdateBracket = (updatedMatches: Match[]) => {
    if (isReadOnly) return;
    const tagged = updatedMatches.map((m) => ({ ...m, stage: ((isGrupos || isSuico) ? "knockout" : m.stage) as any }));
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
    updateTournament({ matches: newMatches });
    toast.success("Chaveamento atualizado!");
  };

  const handleFinalizeSeason = () => {
    if (isReadOnly || standings.length === 0) return;
    const allMatches = tournament.matches || [];
    if (allMatches.some((m) => !m.played)) {
      toast.error("Todos os jogos precisam ser simulados antes de finalizar a temporada.");
      return;
    }

    let championTeamId = standings[0].teamId;
    let cName = standings[0].team?.name || "Desconhecido";
    let cLogo = standings[0].team?.logo;

    if (isMataMata || isGrupos || isSuico) {
      const stages = ["1/64", "1/32", "1/16", "1/8", "1/4", "1/2"];
      const startStage = isSuico ? (tournament.suicoMataMataInicio || "1/8") : (isGrupos ? tournament.gruposMataMataInicio : tournament.mataMataInicio) || "1/8";
      const idx = stages.indexOf(startStage);
      const activeStages = idx >= 0 ? stages.slice(idx) : ["1/2"];
      const finalRound = activeStages.length;
      const finalMatches = allMatches.filter((m) => !m.isThirdPlace && m.round === finalRound && ((isGrupos || isSuico) ? m.stage === "knockout" : true));

      if (finalMatches.length > 0) {
        const pairMap = new Map<string, { leg1?: Match; leg2?: Match }>();
        const singles: Match[] = [];
        for (const m of finalMatches) {
          if (m.pairId) {
            if (!pairMap.has(m.pairId)) pairMap.set(m.pairId, {});
            const pair = pairMap.get(m.pairId)!;
            if (m.leg === 1) pair.leg1 = m; else pair.leg2 = m;
          } else singles.push(m);
        }
        const finalPairs = [];
        for (const pair of pairMap.values()) if (pair.leg1) finalPairs.push({ leg1: pair.leg1, leg2: pair.leg2 || null });
        for (const s of singles) finalPairs.push({ leg1: s, leg2: null });

        if (finalPairs.length > 0) {
          const pair = finalPairs[0];
          let winnerId: string | null = null;
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
            const w = resolvedTeams.find((t) => t.id === winnerId);
            if (w) { championTeamId = w.id; cName = w.name; cLogo = w.logo; }
          }
        }
      }
    }

    const seasonRecord: SeasonRecord = {
      year: tournament.year,
      championId: championTeamId,
      championName: cName,
      championLogo: cLogo,
      format: tournament.format,
      groupCount: isGrupos ? groupCount : undefined,
      teamIds: [...tournament.teamIds],
      settings: { ...tournament.settings },
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
        group: isGrupos ? (() => {
          for (const [g, ids] of Object.entries(currentAssignments)) {
            if (ids.includes(s.teamId)) return parseInt(g);
          }
          return undefined;
        })() : undefined,
      })),
      matches: [...(tournament.matches || [])],
    };
    const existingSeasons = (tournament.seasons || []).filter((s) => s.year !== tournament.year);
    updateTournament({ finalized: true, seasons: [...existingSeasons, seasonRecord] });
    toast.success(`Temporada ${tournament.year} finalizada! ${cName} é o campeão!`);
  };

  const handleConfirmQualifiers = (selectedTeamIds: string[]) => {
    if (isReadOnly) return;
    const startStage = tournament.gruposMataMataInicio || "1/8";
    const totalKnockoutTeams = qualifiersPerGroup;
    const bestOfQualifiers = settings.bestOfQualifiers ?? 0;
    const bestOfPosition = settings.bestOfPosition ?? 3;

    if (selectedTeamIds.length === 0) {
      const directPerGroup = bestOfQualifiers > 0 ? bestOfPosition - 1 : Math.floor(totalKnockoutTeams / groupCount);
      const autoSelected: string[] = [];
      const bestOfCandidates: { teamId: string; points: number; gd: number; gf: number }[] = [];
      for (let g = 1; g <= groupCount; g++) {
        const rows = standingsByGroup[g] || [];
        rows.slice(0, directPerGroup).forEach((r) => autoSelected.push(r.teamId));
        if (bestOfQualifiers > 0 && rows.length >= bestOfPosition) {
          const row = rows[bestOfPosition - 1];
          bestOfCandidates.push({ teamId: row.teamId, points: row.points, gd: row.goalsFor - row.goalsAgainst, gf: row.goalsFor });
        }
      }
      if (bestOfQualifiers > 0) {
        bestOfCandidates.sort((a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf);
        bestOfCandidates.slice(0, bestOfQualifiers).forEach((c) => autoSelected.push(c.teamId));
      }
      selectedTeamIds = autoSelected;
    }
    if (selectedTeamIds.length < 2) { toast.error("Selecione pelo menos 2 times."); return; }

    const teamGroupPos: Record<string, { group: number; pos: number }> = {};
    for (let g = 1; g <= groupCount; g++) {
      (standingsByGroup[g] || []).forEach((row, idx) => { teamGroupPos[row.teamId] = { group: g, pos: idx }; });
    }
    const seeded = [...selectedTeamIds].sort((a, b) => {
      const posA = teamGroupPos[a]?.pos ?? 99;
      const posB = teamGroupPos[b]?.pos ?? 99;
      if (posA !== posB) return posA - posB;
      return (teamGroupPos[a]?.group ?? 0) - (teamGroupPos[b]?.group ?? 0);
    });

    const legMode = settings.knockoutLegMode || "single";
    const newMatches: Match[] = [];
    for (let i = 0; i < Math.floor(seeded.length / 2); i++) {
      const home = seeded[i];
      const away = seeded[seeded.length - 1 - i];
      if (legMode === "home-away") {
        const pairId = crypto.randomUUID();
        newMatches.push({ id: crypto.randomUUID(), tournamentId: tournament.id, round: 1, homeTeamId: home, awayTeamId: away, homeScore: 0, awayScore: 0, played: false, stage: "knockout", leg: 1, pairId });
        newMatches.push({ id: crypto.randomUUID(), tournamentId: tournament.id, round: 1, homeTeamId: away, awayTeamId: home, homeScore: 0, awayScore: 0, played: false, stage: "knockout", leg: 2, pairId });
      } else {
        newMatches.push({ id: crypto.randomUUID(), tournamentId: tournament.id, round: 1, homeTeamId: home, awayTeamId: away, homeScore: 0, awayScore: 0, played: false, stage: "knockout" });
      }
    }

    const allMatches = [...(tournament.matches || []), ...newMatches];
    updateTournament({ matches: allMatches, groupsFinalized: true, settings: { ...settings, qualifiedTeamIds: selectedTeamIds } });
    toast.success(`${selectedTeamIds.length} times classificados!`);
  };

  const handleConfirmSwissQualifiers = () => {
    if (isReadOnly) return;
    const playoffSlots = tournament.suicoPlayoffVagas || 8;
    const topTeams = standings.slice(0, playoffSlots).map((s) => s.teamId);
    if (topTeams.length < 2) { toast.error("Selecione pelo menos 2 times."); return; }

    const legMode = settings.knockoutLegMode || "single";
    const newMatches: Match[] = [];
    for (let i = 0; i < Math.floor(topTeams.length / 2); i++) {
      const home = topTeams[i];
      const away = topTeams[topTeams.length - 1 - i];
      if (legMode === "home-away") {
        const pairId = crypto.randomUUID();
        newMatches.push({ id: crypto.randomUUID(), tournamentId: tournament.id, round: 1, homeTeamId: home, awayTeamId: away, homeScore: 0, awayScore: 0, played: false, stage: "knockout", leg: 1, pairId });
        newMatches.push({ id: crypto.randomUUID(), tournamentId: tournament.id, round: 1, homeTeamId: away, awayTeamId: home, homeScore: 0, awayScore: 0, played: false, stage: "knockout", leg: 2, pairId });
      } else {
        newMatches.push({ id: crypto.randomUUID(), tournamentId: tournament.id, round: 1, homeTeamId: home, awayTeamId: away, homeScore: 0, awayScore: 0, played: false, stage: "knockout" });
      }
    }
    const allMatches = [...(tournament.matches || []), ...newMatches];
    updateTournament({ matches: allMatches, groupsFinalized: true, settings: { ...settings, qualifiedTeamIds: topTeams } });
    toast.success(`${topTeams.length} times classificados!`);
  };

  const handleResetQualification = () => {
    if (isReadOnly) return;
    updateTournament({
      groupsFinalized: false,
      settings: { ...settings, qualifiedTeamIds: undefined },
      matches: (tournament.matches || []).filter((m) => m.stage !== "knockout" && !m.isThirdPlace),
    });
    toast.success("Classificação resetada.");
  };

  const handleDrawConfirm = (assignments: Record<string, string[]>) => {
    if (isReadOnly) return;
    const turnos = tournament.gruposTurnos || 1;
    const allGroupMatchesList: Match[] = [];
    for (let g = 1; g <= groupCount; g++) {
      const groupTeamsList = assignments[String(g)] || [];
      if (groupTeamsList.length < 2) continue;
      const gMatches = generateRoundRobin(tournament.id, groupTeamsList, turnos as 1 | 2 | 3 | 4);
      const tagged = gMatches.map((m) => ({ ...m, group: g, stage: "group" as const }));
      allGroupMatchesList.push(...tagged);
    }
    const knockoutOnly = (tournament.matches || []).filter((m) => m.stage === "knockout");
    updateTournament({
      matches: [...allGroupMatchesList, ...knockoutOnly],
      settings: { ...settings, groupAssignments: assignments },
    });
    toast.success("Sorteio realizado!");
  };

  const autoGenerate = () => {
    if (isReadOnly) return;
    const hasRealMatches = tournament.matches.some((m) => m.played || (m.homeTeamId && m.awayTeamId));
    if (hasRealMatches || tournament.teamIds.length < 2) return;

    if (tournament.format === "mata-mata") {
      const teamIds = [...tournament.teamIds];
      const startStage = tournament.mataMataInicio || "1/8";
      const expectedTeams = STAGE_TEAM_COUNTS[startStage] || 16;
      if (teamIds.length > expectedTeams) { toast.error(`Máximo ${expectedTeams} times.`); return; }

      for (let i = teamIds.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [teamIds[i], teamIds[j]] = [teamIds[j], teamIds[i]];
      }
      let bracketSize = 2;
      while (bracketSize < teamIds.length) bracketSize *= 2;
      if (bracketSize > expectedTeams) bracketSize = expectedTeams;
      const paddedIds: (string | null)[] = [...teamIds];
      while (paddedIds.length < bracketSize) paddedIds.push(null);

      const legMode = settings.knockoutLegMode || "single";
      const newMatches: Match[] = [];
      for (let i = 0; i < paddedIds.length; i += 2) {
        const homeId = paddedIds[i]; const awayId = paddedIds[i + 1];
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
      updateTournament({ matches: newMatches });
      toast.success(`${newMatches.length} jogos gerados!`);
    }
  };

  const assignedTeamIds = new Set(Object.values(currentAssignments).flat());
  const unassignedTeamIds = isGrupos ? tournament.teamIds.filter((id) => !assignedTeamIds.has(id)) : [];

  // ─── Role badge ───
  const roleBadge = role === "owner" ? "Dono" : role === "admin" ? "Administrador" : "Visualizador";
  const roleBadgeColor = role === "owner" || role === "admin" ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground";

  return (
    <div className="min-h-screen bg-background">
      <div className="p-4 lg:p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-6 gap-2 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 lg:w-12 lg:h-12 flex items-center justify-center shrink-0">
              {tournament.logo ? (
                <img src={tournament.logo} alt="" className="w-10 h-10 lg:w-12 lg:h-12 object-contain" />
              ) : (
                <Trophy className="w-5 h-5 lg:w-6 lg:h-6 text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base lg:text-xl font-display font-bold text-foreground truncate max-w-[200px] sm:max-w-none">
                  {tournament.name}
                </h1>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${roleBadgeColor}`}>
                  {roleBadge}
                </span>
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {tournament.sport} · {formatLabels[tournament.format] || tournament.format} · {tournament.numberOfTeams} times
              </p>
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
                <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-xl z-20 p-2 min-w-[180px]">
                  {(() => {
                    const seasonYears = (tournament.seasons || []).map((s) => s.year);
                    const allYears = Array.from(new Set([...seasonYears, tournament.year])).sort((a, b) => b - a);
                    return allYears.map((year) => (
                      <button
                        key={year}
                        onClick={() => {
                          setViewingYear(year === tournament.year ? null : year);
                          setShowYearPicker(false);
                        }}
                        className={`w-full text-left px-3 py-1.5 rounded text-sm transition-colors ${
                          year === activeYear ? "bg-primary/10 text-primary font-bold" : "text-foreground hover:bg-secondary"
                        }`}
                      >
                        {year}
                        {seasonYears.includes(year) && year !== tournament.year && (
                          <span className="text-xs text-muted-foreground ml-1">✓</span>
                        )}
                      </button>
                    ));
                  })()}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Champion banner */}
        {championDisplayName && (
          <div className="mb-6 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                <Trophy className="w-4 h-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Temporada {activeYear}</p>
                <p className="text-sm font-display font-bold text-primary truncate">Campeão: {championDisplayName}</p>
              </div>
            </div>
            <div className="w-9 h-9 flex items-center justify-center shrink-0">
              {championDisplayLogo ? (
                <img src={championDisplayLogo} alt="" className="w-9 h-9 object-contain" />
              ) : (
                <Shield className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
          </div>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <TabsList className="bg-secondary/50 border border-border p-1">
              {!isMataMata && (
                <TabsTrigger value="standings" className="data-[state=active]:bg-card data-[state=active]:shadow-sm text-xs lg:text-sm">Classificação</TabsTrigger>
              )}
              {!isMataMata && (
                <TabsTrigger value="rounds" className="data-[state=active]:bg-card data-[state=active]:shadow-sm text-xs lg:text-sm">Jogos</TabsTrigger>
              )}
              {hasKnockout && (
                <TabsTrigger value="bracket" className="data-[state=active]:bg-card data-[state=active]:shadow-sm text-xs lg:text-sm">Chaveamento</TabsTrigger>
              )}
              <TabsTrigger value="stats" className="data-[state=active]:bg-card data-[state=active]:shadow-sm text-xs lg:text-sm">Estatísticas</TabsTrigger>
            </TabsList>
            <div className="flex items-center gap-2">
              {canEdit && !isViewingPastSeason && !tournament.finalized && isLiga && standings.length > 0 && standings.every((s) => s.played > 0) && (
                <Button onClick={handleFinalizeSeason} size="sm" className="gap-1.5 bg-primary text-primary-foreground">
                  <Trophy className="w-4 h-4" />
                  Finalizar Temporada
                </Button>
              )}
            </div>
          </div>

          {/* Standings tab */}
          <TabsContent value="standings" className="mt-0 outline-none">
            {isGrupos ? (
              <div className="space-y-8">
                {canEdit && !isViewingPastSeason && !tournament.finalized && (
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <span className="text-sm text-muted-foreground">
                      {unassignedTeamIds.length > 0
                        ? `${unassignedTeamIds.length} time(s) sem grupo`
                        : "Todos os times distribuídos"}
                    </span>
                    <Button onClick={() => setShowDrawDialog(true)} size="sm" variant="outline" className="gap-1.5">
                      <Shuffle className="w-3.5 h-3.5" />
                      Sortear Grupos
                    </Button>
                  </div>
                )}
                {(() => {
                  const groupsRef = React.createRef<HTMLDivElement>();
                  return (
                    <>
                      <div className="flex justify-end">
                        <ScreenshotButton targetRef={groupsRef as any} filename="fase-de-grupos.png" discrete />
                      </div>
                      <div ref={groupsRef} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {Array.from(
                          { length: isViewingPastSeason && seasonData?.groupCount ? seasonData.groupCount : groupCount },
                          (_, i) => i + 1
                        ).map((groupNum) => (
                          <div key={groupNum} className="space-y-3">
                            <div className="flex items-center justify-between px-1">
                              <h3 className="font-display font-bold text-lg text-foreground">
                                Grupo {String.fromCharCode(64 + groupNum)}
                              </h3>
                            </div>
                            <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
                              <StandingsTable
                                standings={isViewingPastSeason ? (seasonStandingsByGroup[groupNum] || seasonStandings) : (standingsByGroup[groupNum] || [])}
                                promotions={tournament.settings.promotions}
                                qualifyUntil={qualifiersPerGroup}
                                onRemoveTeam={undefined}
                                matches={isViewingPastSeason ? (seasonData?.matches || []).filter((m) => m.group === groupNum) : tournament.matches.filter((m) => m.group === groupNum)}
                                allTeams={resolvedTeams}
                                hideScreenshot
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  );
                })()}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
                  <StandingsTable
                    standings={isViewingPastSeason ? seasonStandings : standings}
                    promotions={tournament.settings.promotions}
                    matches={isViewingPastSeason ? (seasonData?.matches || []) : (isSuico ? suicoLeagueMatches : tournament.matches)}
                    allTeams={resolvedTeams}
                  />
                </div>
              </div>
            )}
          </TabsContent>

          {/* Rounds tab */}
          <TabsContent value="rounds" className="mt-0 outline-none">
            <RoundsView
              tournament={
                isViewingPastSeason
                  ? { ...tournament, matches: (seasonData?.matches || []).filter((m) => isGrupos ? (m.stage === "group" || (!m.stage && !m.isThirdPlace)) : true) }
                  : groupTournament
              }
              teams={resolvedTeams}
              onUpdateMatch={isReadOnly ? () => {} : handleUpdateMatch}
              onBatchUpdateMatches={isReadOnly ? undefined : handleBatchUpdateMatches}
              onGenerateRounds={undefined}
            />
          </TabsContent>

          {/* Bracket tab */}
          {hasKnockout && (
            <TabsContent value="bracket" className="mt-0 outline-none">
              <div className="space-y-6">
                {canEdit && isGrupos && !tournament.groupsFinalized && allGroupMatchesPlayed && (
                  <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-card">
                    <span className="text-sm text-muted-foreground">Fase de grupos concluída. Confirme os classificados.</span>
                    <Button onClick={() => handleConfirmQualifiers([])} size="sm" className="gap-1.5">
                      <Trophy className="w-3.5 h-3.5" />
                      Confirmar Classificados
                    </Button>
                  </div>
                )}
                {canEdit && isSuico && !tournament.groupsFinalized && allSuicoLeagueMatchesPlayed && (
                  <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-card">
                    <span className="text-sm text-muted-foreground">Fase de liga concluída. Confirme os classificados.</span>
                    <Button onClick={() => handleConfirmSwissQualifiers()} size="sm" className="gap-1.5">
                      <Trophy className="w-3.5 h-3.5" />
                      Confirmar Classificados
                    </Button>
                  </div>
                )}
                {canEdit && (isGrupos || isSuico) && tournament.groupsFinalized && (
                  <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-card">
                    <span className="text-sm text-muted-foreground">Classificados confirmados</span>
                    <Button onClick={handleResetQualification} size="sm" variant="outline">Resetar</Button>
                  </div>
                )}
                {canEdit && isMataMata && !tournament.finalized && tournament.teamIds.length >= 2 && (tournament.matches || []).length === 0 && (
                  <div className="flex justify-end">
                    <Button onClick={autoGenerate} size="sm" variant="outline" className="gap-1.5">
                      <Shuffle className="w-3.5 h-3.5" />
                      Sortear Times
                    </Button>
                  </div>
                )}
                <BracketView
                  tournament={
                    isViewingPastSeason
                      ? {
                          ...tournament,
                          matches: (seasonData?.matches || []).filter((m) => m.stage === "knockout" || m.isThirdPlace),
                          mataMataInicio: isSuico ? (tournament.suicoMataMataInicio || "1/8") : isGrupos ? (tournament.gruposMataMataInicio || "1/8") : tournament.mataMataInicio,
                        }
                      : knockoutTournament
                  }
                  teams={resolvedTeams}
                  onUpdateMatch={isReadOnly ? () => {} : handleUpdateMatch}
                  onBatchUpdateMatches={isReadOnly ? undefined : handleBatchUpdateBracket}
                  onGenerateBracket={isReadOnly ? () => {} : autoGenerate}
                  onFinalize={isReadOnly ? undefined : handleFinalizeSeason}
                  onAddMatch={
                    isReadOnly
                      ? undefined
                      : (match) => {
                          const tagged = { ...match, stage: ((isGrupos || isSuico) ? "knockout" : match.stage) as any };
                          updateTournament({ matches: [...(tournament.matches || []), tagged] });
                        }
                  }
                  onRemoveMatch={
                    isReadOnly
                      ? undefined
                      : (matchId, pairId) => {
                          const newMatches = (tournament.matches || []).filter((m) => {
                            if (pairId) return m.pairId !== pairId;
                            return m.id !== matchId;
                          });
                          updateTournament({ matches: newMatches });
                        }
                  }
                />
              </div>
            </TabsContent>
          )}

          {/* Stats tab */}
          <TabsContent value="stats" className="mt-0 outline-none">
            <StatsView
              tournament={isViewingPastSeason ? { ...tournament, matches: seasonData?.matches || [], teamIds: seasonTeamIds } : tournament}
              teams={resolvedTeams}
            />
          </TabsContent>
        </Tabs>

        {isGrupos && canEdit && (
          <GroupDrawDialog
            open={showDrawDialog}
            onOpenChange={setShowDrawDialog}
            teams={resolvedTeams}
            teamIds={tournament.teamIds}
            groupCount={groupCount}
            onConfirm={handleDrawConfirm}
          />
        )}
      </div>
    </div>
  );
}
