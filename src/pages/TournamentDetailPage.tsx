import React, { useState, useRef, useEffect } from "react";
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
  Download,
  LayoutGrid,
  Play,
  Shield,
  Pencil,
  Shuffle,
  Check,
} from "lucide-react";
import PreliminaryPhasesIcon from "@/components/icons/PreliminaryPhasesIcon";
import { useTournamentStore } from "@/store/tournamentStore";
import { resolveTeam } from "@/lib/teamHistoryUtils";
import { buildSeasonViewTournament, getSeasonTeamIds, inferKnockoutStartStage } from "@/lib/seasonSnapshot";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import StandingsTable from "@/components/tournament/StandingsTable";
import RoundsView from "@/components/tournament/RoundsView";
import BracketView from "@/components/tournament/BracketView";
import GroupQualificationView from "@/components/tournament/GroupQualificationView";
import GroupDrawDialog from "@/components/tournament/GroupDrawDialog";
import StatsView from "@/components/tournament/StatsView";
import { calculateStandings } from "@/lib/standings";
import { generateRoundRobin } from "@/lib/roundRobin";
import { Match, SeasonRecord, STAGE_TEAM_COUNTS, KnockoutStage, PromotionRule } from "@/types/tournament";
import { trackTournamentOpen } from "@/lib/recentTournaments";
import ScreenshotButton from "@/components/ScreenshotButton";
import { generateSwissLeagueMatches } from "@/lib/swissRounds";

const formatLabels: Record<string, string> = {
  liga: "Pontos Corridos",
  mataMata: "Mata-Mata",
  grupos: "Grupos + Mata-Mata",
  suico: "Sistema Suíço",
};

export default function TournamentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { tournaments, teams, updateTournament, removeTournament, teamHistories } = useTournamentStore();
  const tournament = tournaments.find((t) => t.id === id);

  // Track recently opened
  useEffect(() => {
    if (id) trackTournamentOpen(id);
  }, [id]);

  // Auto-generate rounds for liga/suico format when teams exist but no matches
  useEffect(() => {
    if (!tournament) return;
    if (tournament.format !== "liga" && tournament.format !== "suico") return;
    if (tournament.finalized) return;
    if (tournament.teamIds.length < 2) return;
    if ((tournament.matches || []).length > 0) return;
    if (tournament.format === "suico") {
      const rounds = tournament.suicoJogosLiga || 8;
      const newMatches = generateSwissLeagueMatches(tournament.id, tournament.teamIds, rounds);
      updateTournament(tournament.id, { matches: newMatches });
    } else {
      const turnos = tournament.ligaTurnos || 1;
      const newMatches = generateRoundRobin(tournament.id, tournament.teamIds, turnos);
      updateTournament(tournament.id, { matches: newMatches });
    }
  }, [
    tournament?.id,
    tournament?.teamIds?.length,
    tournament?.matches?.length,
    tournament?.format,
    tournament?.finalized,
  ]);

  // Resolve teams with historical logo/rate - deferred until activeYear is known

  const [activeTab, setActiveTab] = useState(tournament?.format === "mata-mata" ? "bracket" : "standings");
  const [viewingYear, setViewingYear] = useState<number | null>(null);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [newSeasonYear, setNewSeasonYear] = useState("");
  const [showDrawDialog, setShowDrawDialog] = useState(false);
  const [groupTeamSearch, setGroupTeamSearch] = useState("");
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
  const seasonData = isViewingPastSeason ? tournament.seasons?.find((s) => s.year === viewingYear) : null;

  const isLiga = tournament.format === "liga";
  const isMataMata = tournament.format === "mata-mata";
  const isGrupos = tournament.format === "grupos";
  const isSuico = tournament.format === "suico";
  const hasKnockout = isMataMata || isGrupos || isSuico;

  const seasonTeamIds = getSeasonTeamIds(tournament, seasonData, isViewingPastSeason);
  const activeSettings = isViewingPastSeason ? seasonData?.settings || tournament.settings : tournament.settings;
  const activeMatches = isViewingPastSeason ? seasonData?.matches || [] : tournament.matches || [];
  const activeGroupCount = isViewingPastSeason
    ? seasonData?.groupCount || tournament.gruposQuantidade || 1
    : tournament.gruposQuantidade || 1;
  const defaultKnockoutStart = isSuico
    ? tournament.suicoMataMataInicio || "1/8"
    : isGrupos
      ? tournament.gruposMataMataInicio || "1/8"
      : tournament.mataMataInicio;
  const activeKnockoutStart = inferKnockoutStartStage(
    activeMatches.filter((match) => !match.isThirdPlace && (!(isGrupos || isSuico) || match.stage === "knockout")),
    defaultKnockoutStart,
  );
  const activeTournament = buildSeasonViewTournament({
    tournament,
    activeYear,
    isViewingPastSeason,
    teamIds: seasonTeamIds,
    matches: activeMatches,
    settings: activeSettings,
    groupCount: activeGroupCount,
    knockoutStart: activeKnockoutStart,
  });

  // Resolve teams based on the active year (current or past season)
  const resolvedTeams = teams.map((t) => resolveTeam(t, activeYear, teamHistories));

  const seasonRecordForYear = (tournament.seasons || []).find((s) => s.year === activeYear);
  const championRecord = isViewingPastSeason ? seasonData : tournament.finalized ? seasonRecordForYear : null;
  const championTeam = championRecord?.championId
    ? resolvedTeams.find((t) => t.id === championRecord.championId)
    : null;
  const championDisplayName = championRecord?.championName || championTeam?.name;
  const championDisplayLogo = championRecord?.championLogo || championTeam?.logo;

  // Map season standings to StandingRow[] (adding missing fields)
  const seasonStandings: import("@/lib/standings").StandingRow[] = (seasonData?.standings || []).map((s) => {
    const resolved = resolvedTeams.find((t) => t.id === s.teamId);
    const fallbackTeam: import("@/types/tournament").Team = {
      id: s.teamId,
      name: (s as any).teamName || "—",
      shortName: (s as any).teamName || "—",
      abbreviation: (s as any).teamName || "—",
      logo: (s as any).teamLogo,
      colors: [],
      rate: 0,
      isArchived: false,
    };
    return {
      ...s,
      played: s.wins + s.draws + s.losses,
      goalDifference: s.goalsFor - s.goalsAgainst,
      team: resolved || fallbackTeam,
    };
  });

  // For past seasons with groups, build per-group standings
  const seasonStandingsByGroup: Record<number, import("@/lib/standings").StandingRow[]> = {};
  if (isViewingPastSeason && seasonData && isGrupos) {
    const pastGroupCount = seasonData.groupCount || activeGroupCount || 1;
    // If standings have group info, use it directly
    const hasGroupInfo = seasonData.standings.some((s) => s.group != null);
    if (hasGroupInfo) {
      for (let g = 1; g <= pastGroupCount; g++) {
        seasonStandingsByGroup[g] = seasonStandings.filter((s) => (s as any).group === g);
      }
    } else {
      // Derive from season matches
      const pastMatches = seasonData.matches || [];
      const pastSettings = seasonData.settings || activeSettings;
      for (let g = 1; g <= pastGroupCount; g++) {
        const gMatches = pastMatches.filter((m) => m.group === g && (m.stage === "group" || !m.stage));
        const gTeamIds = [...new Set(gMatches.flatMap((m) => [m.homeTeamId, m.awayTeamId]))].filter(Boolean);
        if (gTeamIds.length > 0) {
          seasonStandingsByGroup[g] = calculateStandings(gTeamIds, gMatches, pastSettings, resolvedTeams);
        }
      }
    }
  }

  const settings = activeSettings;

  // For grupos/suico format, separate group and knockout matches
  const groupMatches =
    isGrupos || isSuico
      ? activeMatches.filter((m) => m.stage === "group" || (!m.stage && !m.isThirdPlace))
      : activeMatches;
  const knockoutMatches =
    isGrupos || isSuico ? activeMatches.filter((m) => m.stage === "knockout" || m.isThirdPlace) : [];

  // Group count and assignments
  const groupCount = activeGroupCount;

  // Derive current group assignments from settings or existing matches
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

  const assignedTeamIds = new Set(Object.values(currentAssignments).flat());
  const unassignedTeamIds = isGrupos ? activeTournament.teamIds.filter((id) => !assignedTeamIds.has(id)) : [];

  // Compute standings per group using assignments
  const standingsByGroup: Record<number, import("@/lib/standings").StandingRow[]> = {};
  if (isGrupos) {
    for (let g = 1; g <= groupCount; g++) {
      const assignedTeams = currentAssignments[String(g)] || [];
      const gMatches = groupMatches.filter((m) => m.group === g);
      const gTeamIds =
        assignedTeams.length > 0 ? assignedTeams : [...new Set(gMatches.flatMap((m) => [m.homeTeamId, m.awayTeamId]))];
      standingsByGroup[g] = calculateStandings(gTeamIds, gMatches, settings, resolvedTeams);
    }
  }

  // Swiss standings: all teams in a single league
  const suicoLeagueMatches = isSuico ? groupMatches : [];

  const standings = isGrupos
    ? Object.values(standingsByGroup).flat()
    : isSuico
      ? calculateStandings(activeTournament.teamIds, suicoLeagueMatches, settings, resolvedTeams)
      : calculateStandings(activeTournament.teamIds, activeMatches, settings, resolvedTeams);

  const allGroupMatchesPlayed = isGrupos && groupMatches.length > 0 && groupMatches.every((m) => m.played);
  const allSuicoLeagueMatchesPlayed =
    isSuico && suicoLeagueMatches.length > 0 && suicoLeagueMatches.every((m) => m.played);

  const groupTournament = isGrupos
    ? { ...activeTournament, matches: groupMatches }
    : isSuico
      ? { ...activeTournament, matches: suicoLeagueMatches }
      : activeTournament;

  const knockoutTournament =
    isGrupos || isSuico
      ? { ...activeTournament, matches: knockoutMatches, mataMataInicio: activeKnockoutStart || defaultKnockoutStart }
      : { ...activeTournament, mataMataInicio: activeKnockoutStart || defaultKnockoutStart };

  // ─── Group management functions ───
  const regenerateGroupMatches = (assignments: Record<string, string[]>) => {
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
    updateTournament(tournament.id, {
      matches: [...allGroupMatchesList, ...knockoutOnly],
      settings: { ...settings, groupAssignments: assignments },
    });
  };

  const addTeamToGroup = (teamId: string, groupNum: number) => {
    const assignments: Record<string, string[]> = {};
    for (let g = 1; g <= groupCount; g++) {
      assignments[String(g)] = [...(currentAssignments[String(g)] || [])];
    }
    assignments[String(groupNum)].push(teamId);
    regenerateGroupMatches(assignments);
    toast.success("Time adicionado ao grupo!");
  };

  const removeTeamFromGroup = (teamId: string, groupNum: number) => {
    const assignments: Record<string, string[]> = {};
    for (let g = 1; g <= groupCount; g++) {
      assignments[String(g)] = [...(currentAssignments[String(g)] || [])];
    }
    assignments[String(groupNum)] = assignments[String(groupNum)].filter((id) => id !== teamId);
    regenerateGroupMatches(assignments);
    toast.success("Time removido do grupo!");
  };

  const handleDrawConfirm = (assignments: Record<string, string[]>) => {
    regenerateGroupMatches(assignments);
    toast.success("Sorteio realizado! Jogos gerados automaticamente.");
  };

  // ─── Confirm manual qualifiers & generate knockout ───────────────────────
  const qualifiersPerGroup = (() => {
    const startStage = isSuico
      ? activeKnockoutStart || tournament.suicoMataMataInicio || "1/8"
      : activeKnockoutStart || tournament.gruposMataMataInicio || "1/8";
    const stageTotal = STAGE_TEAM_COUNTS[startStage] || 8;
    return Math.max(2, Math.min(stageTotal, activeTournament.teamIds.length));
  })();

  const handleResetQualification = () => {
    updateTournament(tournament.id, {
      groupsFinalized: false,
      settings: { ...settings, qualifiedTeamIds: undefined },
      matches: (tournament.matches || []).filter((m) => m.stage !== "knockout" && !m.isThirdPlace),
    });
    toast.success("Classificação resetada. Selecione os classificados novamente.");
  };

  const handleConfirmQualifiers = (selectedTeamIds: string[]) => {
    const startStage = tournament.gruposMataMataInicio || "1/8";
    const totalKnockoutTeams = qualifiersPerGroup;
    const bestOfQualifiers = tournament.settings.bestOfQualifiers ?? 0;
    const bestOfPosition = tournament.settings.bestOfPosition ?? 3;

    // Auto-select if empty
    if (selectedTeamIds.length === 0) {
      const directPerGroup = bestOfQualifiers > 0 ? bestOfPosition - 1 : Math.floor(totalKnockoutTeams / groupCount);
      const autoSelected: string[] = [];
      const bestOfCandidates: { teamId: string; points: number; gd: number; gf: number }[] = [];

      for (let g = 1; g <= groupCount; g++) {
        const rows = standingsByGroup[g] || [];
        rows.slice(0, directPerGroup).forEach((r) => autoSelected.push(r.teamId));
        if (bestOfQualifiers > 0 && rows.length >= bestOfPosition) {
          const row = rows[bestOfPosition - 1];
          bestOfCandidates.push({
            teamId: row.teamId,
            points: row.points,
            gd: row.goalsFor - row.goalsAgainst,
            gf: row.goalsFor,
          });
        }
      }

      if (bestOfQualifiers > 0) {
        bestOfCandidates.sort((a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf);
        bestOfCandidates.slice(0, bestOfQualifiers).forEach((c) => autoSelected.push(c.teamId));
      }

      selectedTeamIds = autoSelected;
    }

    if (selectedTeamIds.length < 2) {
      toast.error(`Selecione pelo menos 2 times para o mata-mata.`);
      return;
    }
    if (selectedTeamIds.length !== totalKnockoutTeams) {
      if (selectedTeamIds.length % 2 !== 0) {
        toast.error(`Selecione um número par de times (atual: ${selectedTeamIds.length}).`);
        return;
      }
      toast.warning(
        `${selectedTeamIds.length} times selecionados (esperado: ${totalKnockoutTeams}). Gerando mata-mata assim mesmo.`,
      );
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
        newMatches.push({
          id: crypto.randomUUID(),
          tournamentId: tournament.id,
          round: 1,
          homeTeamId: home,
          awayTeamId: away,
          homeScore: 0,
          awayScore: 0,
          played: false,
          stage: "knockout",
          leg: 1,
          pairId,
        });
        newMatches.push({
          id: crypto.randomUUID(),
          tournamentId: tournament.id,
          round: 1,
          homeTeamId: away,
          awayTeamId: home,
          homeScore: 0,
          awayScore: 0,
          played: false,
          stage: "knockout",
          leg: 2,
          pairId,
        });
      } else {
        newMatches.push({
          id: crypto.randomUUID(),
          tournamentId: tournament.id,
          round: 1,
          homeTeamId: home,
          awayTeamId: away,
          homeScore: 0,
          awayScore: 0,
          played: false,
          stage: "knockout",
        });
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

  const handleConfirmSwissQualifiers = () => {
    const playoffSlots = tournament.suicoPlayoffVagas || 8;
    const startStage = tournament.suicoMataMataInicio || "1/8";
    const topTeams = standings.slice(0, playoffSlots).map((s) => s.teamId);

    if (topTeams.length < 2) {
      toast.error("Selecione pelo menos 2 times para os play-offs.");
      return;
    }

    const legMode = settings.knockoutLegMode || "single";
    const newMatches: Match[] = [];

    // Seed: 1st vs last, 2nd vs second-last, etc.
    for (let i = 0; i < Math.floor(topTeams.length / 2); i++) {
      const home = topTeams[i];
      const away = topTeams[topTeams.length - 1 - i];
      if (legMode === "home-away") {
        const pairId = crypto.randomUUID();
        newMatches.push({
          id: crypto.randomUUID(),
          tournamentId: tournament.id,
          round: 1,
          homeTeamId: home,
          awayTeamId: away,
          homeScore: 0,
          awayScore: 0,
          played: false,
          stage: "knockout",
          leg: 1,
          pairId,
        });
        newMatches.push({
          id: crypto.randomUUID(),
          tournamentId: tournament.id,
          round: 1,
          homeTeamId: away,
          awayTeamId: home,
          homeScore: 0,
          awayScore: 0,
          played: false,
          stage: "knockout",
          leg: 2,
          pairId,
        });
      } else {
        newMatches.push({
          id: crypto.randomUUID(),
          tournamentId: tournament.id,
          round: 1,
          homeTeamId: home,
          awayTeamId: away,
          homeScore: 0,
          awayScore: 0,
          played: false,
          stage: "knockout",
        });
      }
    }

    const allMatches = [...(tournament.matches || []), ...newMatches];
    const updatedSettings = { ...settings, qualifiedTeamIds: topTeams };
    updateTournament(tournament.id, {
      matches: allMatches,
      groupsFinalized: true,
      settings: updatedSettings,
    });
    toast.success(`${topTeams.length} times classificados para os play-offs! ${newMatches.length} jogos gerados.`);
  };

  const handleFinalizeSeason = () => {
    if (standings.length === 0) return;

    // Check if all matches are played
    const allMatches = tournament.matches || [];
    const hasUnplayedMatches = allMatches.some((m) => !m.played);
    if (hasUnplayedMatches) {
      toast.error("Todos os jogos precisam ser simulados antes de finalizar a temporada.");
      return;
    }
    // Determine champion from knockout bracket if it exists and is finished
    let championTeamId = standings[0].teamId;
    let championName = standings[0].team?.name || "Desconhecido";
    let championLogo = standings[0].team?.logo;

    if (isMataMata || isGrupos || isSuico) {
      const stages = ["1/64", "1/32", "1/16", "1/8", "1/4", "1/2"];
      const startStage = isSuico
        ? tournament.suicoMataMataInicio || "1/8"
        : (isGrupos ? tournament.gruposMataMataInicio : tournament.mataMataInicio) || "1/8";
      const idx = stages.indexOf(startStage);
      const activeStages = idx >= 0 ? stages.slice(idx) : ["1/2"];
      const finalRound = activeStages.length;

      const finalMatches = (tournament.matches || []).filter(
        (m) => !m.isThirdPlace && m.round === finalRound && (isGrupos || isSuico ? m.stage === "knockout" : true),
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
        for (const pair of pairMap.values())
          if (pair.leg1) finalPairs.push({ leg1: pair.leg1, leg2: pair.leg2 || null });
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
            const h =
              (pair.leg1.homeScore || 0) +
              (pair.leg1.homeExtraTime || 0) +
              (pair.leg2.awayScore || 0) +
              (pair.leg2.awayExtraTime || 0);
            const a =
              (pair.leg1.awayScore || 0) +
              (pair.leg1.awayExtraTime || 0) +
              (pair.leg2.homeScore || 0) +
              (pair.leg2.homeExtraTime || 0);
            if (h > a) winnerId = pair.leg1.homeTeamId;
            else if (a > h) winnerId = pair.leg1.awayTeamId;
            else if (pair.leg2.homePenalties !== undefined && pair.leg2.awayPenalties !== undefined) {
              winnerId =
                pair.leg2.awayPenalties > pair.leg2.homePenalties ? pair.leg1.homeTeamId : pair.leg1.awayTeamId;
            }
          }

          if (winnerId) {
            const winnerTeam = resolvedTeams.find((t) => t.id === winnerId);
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
        group: isGrupos
          ? (() => {
              for (const [g, ids] of Object.entries(currentAssignments)) {
                if (ids.includes(s.teamId)) return parseInt(g);
              }
              return undefined;
            })()
          : undefined,
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

  /** Execute promotion/relegation: move teams between competitions */
  const executePromotionRelegation = (
    finalStandings: import("@/lib/standings").StandingRow[],
    groupStandings?: Record<number, import("@/lib/standings").StandingRow[]>,
  ) => {
    const promotions = tournament.settings.promotions || [];
    if (promotions.length === 0) return;

    // Collect teams to move: { teamId, targetTournamentId, type }
    const transfers: { teamId: string; targetId: string; type: string }[] = [];

    for (const promo of promotions) {
      if (!promo.targetCompetitionId) continue;
      const targetTournament = tournaments.find((t) => t.id === promo.targetCompetitionId);
      if (!targetTournament) continue;

      if (isGrupos && groupStandings) {
        // Apply per-group: position within each group
        for (const gStandings of Object.values(groupStandings)) {
          const teamAtPos = gStandings[promo.position - 1];
          if (teamAtPos) {
            transfers.push({ teamId: teamAtPos.teamId, targetId: targetTournament.id, type: promo.type });
          }
        }
      } else {
        const teamAtPos = finalStandings[promo.position - 1];
        if (teamAtPos) {
          transfers.push({ teamId: teamAtPos.teamId, targetId: targetTournament.id, type: promo.type });
        }
      }
    }

    if (transfers.length === 0) return;

    // Group transfers by target tournament
    const byTarget = new Map<string, string[]>();
    const teamsLeavingThis = new Set<string>();

    for (const tr of transfers) {
      if (!byTarget.has(tr.targetId)) byTarget.set(tr.targetId, []);
      byTarget.get(tr.targetId)!.push(tr.teamId);
      // Relegation/promotion means the team leaves this competition
      teamsLeavingThis.add(tr.teamId);
    }

    return { teamsLeaving: teamsLeavingThis, transfersByTarget: byTarget };
  };

  const handleNewSeason = () => {
    const resetSettings = {
      ...tournament.settings,
      groupAssignments: undefined,
      qualifiedTeamIds: undefined,
    };

    // Start with current roster
    let nextTeamIds = [...tournament.teamIds];

    // Execute promotion/relegation for the NEW season
    const result = executePromotionRelegation(standings, standingsByGroup);
    if (result) {
      const { teamsLeaving, transfersByTarget } = result;

      // Remove relegated/promoted-out teams from this tournament's next season
      nextTeamIds = nextTeamIds.filter((id) => !teamsLeaving.has(id));

      // Check: does any OTHER tournament have rules pointing TO this tournament?
      // We look at the most recent finalized season snapshot (in case the other tournament already advanced its year)
      const teamsComingIn: string[] = [];
      for (const otherT of tournaments) {
        if (otherT.id === tournament.id) continue;

        // Find promotion rules pointing to this tournament — check current settings AND last season's settings
        const otherSeasons = otherT.seasons || [];
        const lastSeason = otherSeasons.length > 0 ? otherSeasons[otherSeasons.length - 1] : null;

        // Try current tournament state first (if it's finalized and hasn't reset yet)
        // Then fall back to the last season snapshot
        let sourcePromos: PromotionRule[] = [];
        let sourceStandings: import("@/lib/standings").StandingRow[] = [];

        if (otherT.finalized && (otherT.matches || []).length > 0) {
          // Tournament is still finalized with its matches intact
          sourcePromos = otherT.settings.promotions || [];
          sourceStandings = calculateStandings(otherT.teamIds, otherT.matches || [], otherT.settings, resolvedTeams);
        } else if (lastSeason) {
          // Tournament already advanced — use the last season snapshot
          const seasonSettings = lastSeason.settings || otherT.settings;
          sourcePromos = seasonSettings.promotions || [];
          const seasonTeamIds = lastSeason.teamIds || lastSeason.standings.map((s) => s.teamId);
          const seasonMatches = lastSeason.matches || [];
          sourceStandings = calculateStandings(seasonTeamIds, seasonMatches, seasonSettings, resolvedTeams);
        }

        for (const op of sourcePromos) {
          if (op.targetCompetitionId !== tournament.id) continue;
          const teamAtPos = sourceStandings[op.position - 1];
          if (teamAtPos && !nextTeamIds.includes(teamAtPos.teamId)) {
            teamsComingIn.push(teamAtPos.teamId);
          }
        }
      }

      nextTeamIds = [...nextTeamIds, ...teamsComingIn];

      // NOTE: We do NOT update target tournaments here.
      // Each tournament pulls incoming teams when IT creates its own new season (lines above).

      const totalMoved = teamsLeaving.size + teamsComingIn.length;
      if (totalMoved > 0) {
        toast.info(`${teamsLeaving.size} time(s) transferido(s) entre competições por promoção/rebaixamento.`);
      }
    }

    updateTournament(tournament.id, {
      year: tournament.year + 1,
      teamIds: nextTeamIds,
      numberOfTeams: nextTeamIds.length,
      matches: [],
      finalized: false,
      groupsFinalized: false,
      settings: resetSettings,
    });
    navigate(`/tournament/${tournament.id}/settings`);
    toast.success(`Nova temporada ${tournament.year + 1} criada! Edite as configurações.`);
  };

  const handleDeleteSeason = (year: number) => {
    const updatedSeasons = (tournament.seasons || []).filter((s) => s.year !== year);
    if (year === tournament.year) {
      // Revert to the most recent saved season, or just reset if none exist
      const previousSeason = [...updatedSeasons].sort((a, b) => b.year - a.year)[0];
      if (previousSeason) {
        updateTournament(tournament.id, {
          year: previousSeason.year,
          teamIds: previousSeason.teamIds || tournament.teamIds,
          matches: previousSeason.matches || [],
          settings: previousSeason.settings || tournament.settings,
          numberOfTeams: previousSeason.teamIds?.length || tournament.numberOfTeams,
          finalized: true,
          groupsFinalized: false,
          seasons: updatedSeasons,
        });
        setViewingYear(null);
      } else {
        updateTournament(tournament.id, {
          matches: [],
          finalized: false,
          groupsFinalized: false,
          seasons: updatedSeasons,
        });
      }
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

    // If the current season has matches played, snapshot it as a season record before switching
    const existingSeasons = [...(tournament.seasons || [])];
    const currentHasData = (tournament.matches || []).some((m) => m.played);
    if (currentHasData && !tournament.finalized) {
      // Auto-save current season as an unfinalized snapshot so teamIds/matches aren't lost
      const alreadySaved = existingSeasons.some((s) => s.year === tournament.year);
      if (!alreadySaved) {
        const currentStandings = calculateStandings(
          tournament.teamIds,
          tournament.matches || [],
          tournament.settings,
          resolvedTeams,
        );
        const snapshotRecord: SeasonRecord = {
          year: tournament.year,
          championId: currentStandings[0]?.teamId || "",
          championName: currentStandings[0]?.team?.name || "",
          championLogo: currentStandings[0]?.team?.logo,
          format: tournament.format,
          groupCount: isGrupos ? groupCount : undefined,
          teamIds: [...tournament.teamIds],
          settings: { ...tournament.settings },
          standings: currentStandings.map((s) => ({
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
        existingSeasons.push(snapshotRecord);
      }
    }

    const resetSettings = {
      ...tournament.settings,
      groupAssignments: undefined,
      qualifiedTeamIds: undefined,
    };
    updateTournament(tournament.id, {
      year: targetYear,
      teamIds: [...tournament.teamIds],
      matches: [],
      finalized: false,
      groupsFinalized: false,
      settings: resetSettings,
      seasons: existingSeasons,
    });
    setViewingYear(null);
    setNewSeasonYear("");
    setShowYearPicker(false);
    navigate(`/tournament/${tournament.id}/settings`);
    toast.success(`Temporada ${targetYear} criada! Edite as configurações.`);
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
    // Allow regeneration if all existing matches are empty placeholders (no teams assigned or played)
    const hasRealMatches = tournament.matches.some((m) => m.played || (m.homeTeamId && m.awayTeamId));
    if (hasRealMatches || tournament.teamIds.length < 2) return;

    if (tournament.format === "liga") {
      const turnos = tournament.ligaTurnos || 1;
      const matches = generateRoundRobin(tournament.id, tournament.teamIds, turnos);
      updateTournament(tournament.id, { matches });
      toast.success(`${matches.length} jogos gerados automaticamente!`);
    } else if (tournament.format === "grupos") {
      const turnos = tournament.gruposTurnos || 1;
      const teamIds = [...tournament.teamIds];
      const sortedTeamIds = [...teamIds].sort((a, b) => {
        const teamA = resolvedTeams.find((t) => t.id === a);
        const teamB = resolvedTeams.find((t) => t.id === b);
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
          newMatches.push({
            id: crypto.randomUUID(),
            tournamentId: tournament.id,
            round: 1,
            homeTeamId: homeId,
            awayTeamId: awayId,
            homeScore: 0,
            awayScore: 0,
            played: false,
            leg: 1,
            pairId,
            stage: "knockout",
          });
          newMatches.push({
            id: crypto.randomUUID(),
            tournamentId: tournament.id,
            round: 1,
            homeTeamId: awayId,
            awayTeamId: homeId,
            homeScore: 0,
            awayScore: 0,
            played: false,
            leg: 2,
            pairId,
            stage: "knockout",
          });
        } else {
          const matchHomeId = homeId || awayId!;
          const matchAwayId = homeId && awayId ? awayId : "";
          const isBye = !homeId || !awayId;
          newMatches.push({
            id: crypto.randomUUID(),
            tournamentId: tournament.id,
            round: 1,
            homeTeamId: matchHomeId,
            awayTeamId: matchAwayId,
            homeScore: isBye ? 1 : 0,
            awayScore: 0,
            played: isBye,
            stage: "knockout",
          });
        }
      }
      updateTournament(tournament.id, { matches: newMatches });
      const byeCount = newMatches.filter((m) => m.awayTeamId === "").length;
      toast.success(`${newMatches.length} jogos gerados!${byeCount > 0 ? ` (${byeCount} BYE automático)` : ""}`);
    } else if (tournament.format === "suico") {
      const rounds = tournament.suicoJogosLiga || 8;
      const matches = generateSwissLeagueMatches(tournament.id, tournament.teamIds, rounds);
      updateTournament(tournament.id, { matches });
      toast.success(`${matches.length} jogos da fase de liga gerados!`);
    }
  };

  const optionIcons = [
    { icon: Pencil, label: "Editar Competição", action: () => navigate(`/tournament/${id}/edit`) },
    { icon: Settings, label: "Editar Sistemas", action: () => navigate(`/tournament/${id}/settings`) },
    {
      icon: Shield,
      label: "Times",
      action: () => navigate(`/tournament/${id}/teams${viewingYear ? `?season=${activeYear}` : ""}`),
    },
    {
      icon: PreliminaryPhasesIcon,
      label: "Fases Preliminares",
      action: () => navigate(`/tournament/${id}/preliminary`),
    },
    { icon: Trophy, label: "Galeria", action: () => navigate(`/tournament/${id}/gallery`) },
  ];

  return (
    <div className="p-4 lg:p-8">
      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />

      <div className="flex items-start justify-between mb-6 gap-2 flex-wrap">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
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
                <h1 className="text-base lg:text-xl font-display font-bold text-foreground truncate max-w-[160px] sm:max-w-none">
                  {tournament.name}
                </h1>
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
                            // Adicionado "flex items-center" e removido o "text-left"
                            className={`flex-1 flex items-center px-3 py-1.5 rounded text-sm transition-colors ${
                              year === activeYear
                                ? "bg-primary/10 text-primary font-bold"
                                : "text-foreground hover:bg-secondary"
                            }`}
                          >
                            {year}
                            {seasonYears.includes(year) && year !== tournament.year && (
                              <Check className="w-3 h-3 text-muted-foreground ml-1.5 shrink-0" strokeWidth={3} />
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
                                  onClick={() => {
                                    handleDeleteSeason(year);
                                    setShowYearPicker(false);
                                  }}
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
              <img
                src={championDisplayLogo}
                alt={`Escudo do campeão ${championDisplayName}`}
                className="w-9 h-9 object-contain"
              />
            ) : (
              <Shield className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <TabsList className="bg-secondary/50 border border-border p-1">
            {!isMataMata && (
              <TabsTrigger
                value="standings"
                className="data-[state=active]:bg-card data-[state=active]:shadow-sm text-xs lg:text-sm"
              >
                Classificação
              </TabsTrigger>
            )}
            {!isMataMata && (
              <TabsTrigger
                value="rounds"
                className="data-[state=active]:bg-card data-[state=active]:shadow-sm text-xs lg:text-sm"
              >
                Jogos
              </TabsTrigger>
            )}
            {hasKnockout && (
              <TabsTrigger
                value="bracket"
                className="data-[state=active]:bg-card data-[state=active]:shadow-sm text-xs lg:text-sm"
              >
                Chaveamento
              </TabsTrigger>
            )}
            <TabsTrigger
              value="stats"
              className="data-[state=active]:bg-card data-[state=active]:shadow-sm text-xs lg:text-sm"
            >
              Estatísticas
            </TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            {!isViewingPastSeason &&
              !tournament.finalized &&
              isLiga &&
              standings.length > 0 &&
              standings.every((s) => s.played > 0) && (
                <Button onClick={handleFinalizeSeason} size="sm" className="gap-1.5 bg-primary text-primary-foreground">
                  <Trophy className="w-4 h-4" />
                  Finalizar Temporada
                </Button>
              )}
          </div>
        </div>

        <TabsContent value="standings" className="mt-0 outline-none">
          {isGrupos ? (
            <div className="space-y-8">
              {!isViewingPastSeason && !tournament.finalized && (
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <span className="text-sm text-muted-foreground">
                    {unassignedTeamIds.length > 0
                      ? `${unassignedTeamIds.length} ${unassignedTeamIds.length === 1 ? "time" : "times"} sem grupo`
                      : "Todos os times distribuídos"}
                  </span>
                  <Button onClick={() => setShowDrawDialog(true)} size="sm" variant="outline" className="gap-1.5">
                    <Shuffle className="w-3.5 h-3.5" />
                    Sortear Grupos
                  </Button>
                </div>
              )}
              {!tournament.groupsFinalized && groupMatches.length > 0 && (
                <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Play className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">Fase de Grupos em andamento</p>
                      <p className="text-xs text-muted-foreground">
                        {allGroupMatchesPlayed
                          ? "Todos os jogos concluídos! Confirme os classificados."
                          : "Acompanhe a classificação em tempo real."}
                      </p>
                    </div>
                  </div>
                  {allGroupMatchesPlayed && (
                    <Button
                      onClick={() => setActiveTab("bracket")}
                      size="sm"
                      className="gap-1.5 bg-primary text-primary-foreground w-full sm:w-auto"
                    >
                      Confirmar Classificados
                    </Button>
                  )}
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
                      {Array.from({ length: groupCount }, (_, i) => i + 1).map((groupNum) => (
                        <div key={groupNum} className="space-y-3">
                          <div className="flex items-center justify-between px-1">
                            <h3 className="font-display font-bold text-lg text-foreground">
                              Grupo {String.fromCharCode(64 + groupNum)}
                            </h3>
                            {!isViewingPastSeason && !tournament.finalized && (
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button size="sm" variant="ghost" className="gap-1 text-xs h-7">
                                    <Plus className="w-3 h-3" />
                                    Adicionar
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-64 p-2" align="end">
                                  <div className="space-y-2">
                                    <Input
                                      placeholder="Buscar time..."
                                      value={groupTeamSearch}
                                      onChange={(e) => setGroupTeamSearch(e.target.value)}
                                      className="h-8 text-xs"
                                    />
                                    <div className="max-h-[200px] overflow-y-auto space-y-0.5">
                                      {unassignedTeamIds
                                        .map((tid) => resolvedTeams.find((t) => t.id === tid))
                                        .filter((t): t is NonNullable<typeof t> => !!t)
                                        .filter(
                                          (t) =>
                                            !groupTeamSearch ||
                                            t.name.toLowerCase().includes(groupTeamSearch.toLowerCase()) ||
                                            t.abbreviation?.toLowerCase().includes(groupTeamSearch.toLowerCase()),
                                        )
                                        .map((team) => (
                                          <button
                                            key={team.id}
                                            onClick={() => {
                                              addTeamToGroup(team.id, groupNum);
                                              setGroupTeamSearch("");
                                            }}
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
                                      {unassignedTeamIds.length === 0 && (
                                        <p className="text-xs text-muted-foreground text-center py-2">
                                          Todos os times já estão em grupos
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </PopoverContent>
                              </Popover>
                            )}
                          </div>
                          <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
                            <StandingsTable
                              standings={
                                isViewingPastSeason
                                  ? seasonStandingsByGroup[groupNum] || seasonStandings
                                  : standingsByGroup[groupNum] || []
                              }
                              promotions={settings.promotions}
                              qualifyUntil={qualifiersPerGroup}
                              onRemoveTeam={
                                !isViewingPastSeason && !tournament.finalized
                                  ? (teamId) => removeTeamFromGroup(teamId, groupNum)
                                  : undefined
                              }
                              matches={groupMatches.filter((m) => m.group === groupNum)}
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
              {isSuico && !tournament.groupsFinalized && suicoLeagueMatches.length > 0 && (
                <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Play className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">Fase de Liga em andamento</p>
                      <p className="text-xs text-muted-foreground">
                        {allSuicoLeagueMatchesPlayed
                          ? "Todos os jogos concluídos! Confirme os classificados para os play-offs."
                          : "Acompanhe a classificação em tempo real."}
                      </p>
                    </div>
                  </div>
                  {allSuicoLeagueMatchesPlayed && (
                    <Button
                      onClick={() => setActiveTab("bracket")}
                      size="sm"
                      className="gap-1.5 bg-primary text-primary-foreground w-full sm:w-auto"
                    >
                      Confirmar Classificados
                    </Button>
                  )}
                </div>
              )}
              <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
                <StandingsTable
                  standings={isViewingPastSeason ? seasonStandings : standings}
                  promotions={settings.promotions}
                  matches={isSuico ? suicoLeagueMatches : activeMatches}
                  allTeams={resolvedTeams}
                />
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="rounds" className="mt-0 outline-none">
          <div className="space-y-4">
            <RoundsView
              tournament={groupTournament}
              teams={resolvedTeams}
              onUpdateMatch={(updated) => {
                if (isViewingPastSeason) return;
                const newMatches = (tournament.matches || []).map((m) => (m.id === updated.id ? updated : m));
                updateTournament(tournament.id, { matches: newMatches });
              }}
              onBatchUpdateMatches={(updatedMatches) => {
                if (isViewingPastSeason) return;
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
              onGenerateRounds={undefined}
            />
          </div>
        </TabsContent>

        {hasKnockout && (
          <TabsContent value="bracket" className="mt-0 outline-none">
            <div className="space-y-6">
              {hasKnockout && (
                <div className="space-y-4">
                  {isGrupos && !tournament.groupsFinalized && allGroupMatchesPlayed && (
                    <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-card">
                      <span className="text-sm text-muted-foreground">
                        Fase de grupos concluída. Confirme os classificados para gerar o chaveamento.
                      </span>
                      <Button onClick={() => handleConfirmQualifiers([])} size="sm" className="gap-1.5">
                        <Trophy className="w-3.5 h-3.5" />
                        Confirmar Classificados
                      </Button>
                    </div>
                  )}
                  {isSuico && !tournament.groupsFinalized && allSuicoLeagueMatchesPlayed && (
                    <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-card">
                      <span className="text-sm text-muted-foreground">
                        Fase de liga concluída. Confirme os classificados para os play-offs.
                      </span>
                      <Button onClick={() => handleConfirmSwissQualifiers()} size="sm" className="gap-1.5">
                        <Trophy className="w-3.5 h-3.5" />
                        Confirmar Classificados
                      </Button>
                    </div>
                  )}
                  {(isGrupos || isSuico) && tournament.groupsFinalized && (
                    <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-card">
                      <span className="text-sm text-muted-foreground">Classificados confirmados</span>
                      <Button onClick={handleResetQualification} size="sm" variant="outline">
                        Resetar
                      </Button>
                    </div>
                  )}
                  {isMataMata &&
                    !tournament.finalized &&
                    tournament.teamIds.length >= 2 &&
                    (tournament.matches || []).length === 0 && (
                      <div className="flex justify-end">
                        <Button onClick={() => autoGenerate()} size="sm" variant="outline" className="gap-1.5">
                          <Shuffle className="w-3.5 h-3.5" />
                          Sortear Times
                        </Button>
                      </div>
                    )}
                  <BracketView
                    tournament={knockoutTournament}
                    teams={resolvedTeams}
                    onUpdateMatch={(updated) => {
                      if (isViewingPastSeason) return;
                      const newMatches = (tournament.matches || []).map((m) => (m.id === updated.id ? updated : m));
                      updateTournament(tournament.id, { matches: newMatches });
                    }}
                    onBatchUpdateMatches={(updatedMatches) => {
                      if (isViewingPastSeason) return;
                      const tagged = updatedMatches.map((m) => ({
                        ...m,
                        stage: (isGrupos || isSuico ? "knockout" : m.stage) as any,
                      }));
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
                    onGenerateBracket={() => {
                      if (!isViewingPastSeason) autoGenerate();
                    }}
                    onFinalize={isViewingPastSeason ? undefined : handleFinalizeSeason}
                    onAddMatch={(match) => {
                      if (isViewingPastSeason) return;
                      const tagged = { ...match, stage: (isGrupos || isSuico ? "knockout" : match.stage) as any };
                      updateTournament(tournament.id, { matches: [...(tournament.matches || []), tagged] });
                    }}
                    onRemoveMatch={(matchId, pairId) => {
                      if (isViewingPastSeason) return;
                      const newMatches = (tournament.matches || []).filter((m) => {
                        if (pairId) return m.pairId !== pairId;
                        return m.id !== matchId;
                      });
                      updateTournament(tournament.id, { matches: newMatches });
                    }}
                  />
                </div>
              )}
            </div>
          </TabsContent>
        )}

        <TabsContent value="stats" className="mt-0 outline-none">
          <StatsView tournament={activeTournament} teams={resolvedTeams} />
        </TabsContent>
      </Tabs>

      {isGrupos && (
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
  );
}
