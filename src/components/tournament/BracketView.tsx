import { useState, useRef } from "react";
import { Match, Team, Tournament, KnockoutStage, STAGE_TEAM_COUNTS } from "@/types/tournament";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Shield, Zap, Trophy, Medal, UserPlus, Shuffle, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { simulateFullMatch, simulateHalf } from "@/lib/simulation";
import MatchPopup from "./MatchPopup";
import BracketTeamEditor from "./BracketTeamEditor";
import ScreenshotButton from "@/components/ScreenshotButton";

interface BracketViewProps {
  tournament: Tournament;
  teams: Team[];
  onUpdateMatch: (match: Match) => void;
  onBatchUpdateMatches?: (matches: Match[]) => void;
  onGenerateBracket: () => void;
  onFinalize?: () => void;
  onAddMatch?: (match: Match) => void;
  onRemoveMatch?: (matchId: string, pairId?: string) => void;
}

const STAGE_LABELS: Record<string, string> = {
  "1/64": "32-avos de Final",
  "1/32": "16-avos de Final",
  "1/16": "Oitavas de Final",
  "1/8": "Quartas de Final",
  "1/4": "Semifinal",
  "1/2": "Final",
};

function getStagesFromStart(start: KnockoutStage): string[] {
  const all = ["1/64", "1/32", "1/16", "1/8", "1/4", "1/2"];
  const idx = all.indexOf(start);
  return idx >= 0 ? all.slice(idx) : ["1/2"];
}

/** Returns aggregate score for a home-away pair */
function getAggregate(leg1: Match, leg2: Match): { home: number; away: number } {
  const home = (leg1.homeScore || 0) + (leg1.homeExtraTime || 0) + (leg2.awayScore || 0) + (leg2.awayExtraTime || 0);
  const away = (leg1.awayScore || 0) + (leg1.awayExtraTime || 0) + (leg2.homeScore || 0) + (leg2.homeExtraTime || 0);
  return { home, away };
}

function getTieWinner(leg1: Match, leg2: Match, awayGoalsRule: boolean): string | null {
  if (!leg1.played || !leg2.played) return null;
  const agg = getAggregate(leg1, leg2);
  if (agg.home > agg.away) return leg1.homeTeamId;
  if (agg.away > agg.home) return leg1.awayTeamId;

  if (awayGoalsRule) {
    const awayGoalsHome = (leg2.awayScore || 0) + (leg2.awayExtraTime || 0);
    const awayGoalsAway = (leg1.awayScore || 0) + (leg1.awayExtraTime || 0);
    if (awayGoalsHome > awayGoalsAway) return leg1.homeTeamId;
    if (awayGoalsAway > awayGoalsHome) return leg1.awayTeamId;
  }

  if (leg2.homePenalties !== undefined && leg2.awayPenalties !== undefined) {
    if (leg2.awayPenalties > leg2.homePenalties) return leg1.homeTeamId;
    if (leg2.homePenalties > leg2.awayPenalties) return leg1.awayTeamId;
  }
  return null;
}

export default function BracketView({
  tournament,
  teams,
  onUpdateMatch,
  onBatchUpdateMatches,
  onGenerateBracket,
  onFinalize,
  onAddMatch,
  onRemoveMatch,
}: BracketViewProps) {
  const matches = tournament.matches || [];
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [editingTeam, setEditingTeam] = useState<{ match: Match; side: "home" | "away" } | null>(null);
  const bracketRef = useRef<HTMLDivElement>(null);

  const getTeam = (id: string) => teams.find((t) => t.id === id);

  const legMode = tournament.settings.knockoutLegMode || "single";
  const finalSingleLeg = tournament.settings.finalSingleLeg ?? false;
  const thirdPlaceMatch = tournament.settings.thirdPlaceMatch ?? false;
  const awayGoalsRule = tournament.settings.awayGoalsRule ?? false;

  if (matches.length === 0) {
    const hasEnoughTeams = tournament.teamIds.length >= 2;
    return (
      <div className="text-center py-12 space-y-4">
        <p className="text-sm text-muted-foreground">
          {hasEnoughTeams
            ? 'Use o botão "Sortear Times" para gerar o chaveamento'
            : `Adicione pelo menos 2 times (${tournament.teamIds.length} adicionados)`}
        </p>
        {hasEnoughTeams && (
          <Button onClick={onGenerateBracket} className="gap-2 bg-primary text-primary-foreground">
            <Shuffle className="w-4 h-4" />
            Sortear Times
          </Button>
        )}
      </div>
    );
  }

  const startStage = tournament.mataMataInicio || "1/8";
  const stages = getStagesFromStart(startStage);

  const regularMatches = matches.filter((m) => !m.isThirdPlace);
  const thirdPlaceMatches = matches.filter((m) => m.isThirdPlace);

  const matchesByStage: Record<string, Match[]> = {};
  stages.forEach((stage, i) => {
    matchesByStage[stage] = regularMatches.filter((m) => m.round === i + 1);
  });

  function getPairs(stageMatches: Match[]): Array<{ leg1: Match; leg2: Match | null }> {
    const pairMap = new Map<string, { leg1?: Match; leg2?: Match }>();
    const singles: Match[] = [];
    for (const m of stageMatches) {
      if (m.pairId) {
        if (!pairMap.has(m.pairId)) pairMap.set(m.pairId, {});
        const pair = pairMap.get(m.pairId)!;
        if (m.leg === 1) pair.leg1 = m;
        else pair.leg2 = m;
      } else {
        singles.push(m);
      }
    }
    const result: Array<{ leg1: Match; leg2: Match | null }> = [];
    for (const pair of pairMap.values()) {
      if (pair.leg1) result.push({ leg1: pair.leg1, leg2: pair.leg2 || null });
    }
    for (const s of singles) result.push({ leg1: s, leg2: null });
    return result;
  }

  const getSingleMatchWinner = (match: Match): string | null => {
    if (!match.played) return null;
    if (!match.awayTeamId) return match.homeTeamId;
    if (!match.homeTeamId) return match.awayTeamId;
    const homeTotal = (match.homeScore || 0) + (match.homeExtraTime || 0);
    const awayTotal = (match.awayScore || 0) + (match.awayExtraTime || 0);
    if (homeTotal > awayTotal) return match.homeTeamId;
    if (awayTotal > homeTotal) return match.awayTeamId;
    if (match.homePenalties !== undefined && match.awayPenalties !== undefined) {
      return match.homePenalties > match.awayPenalties ? match.homeTeamId : match.awayTeamId;
    }
    return null;
  };

  const getTieResult = (pair: { leg1: Match; leg2: Match | null }): string | null => {
    if (!pair.leg2) return getSingleMatchWinner(pair.leg1);
    return getTieWinner(pair.leg1, pair.leg2, awayGoalsRule);
  };

  const getSemiLoser = (pair: { leg1: Match; leg2: Match | null }): string | null => {
    const winner = getTieResult(pair);
    if (!winner) return null;
    return winner === pair.leg1.homeTeamId ? pair.leg1.awayTeamId : pair.leg1.homeTeamId;
  };

  const finalStage = stages[stages.length - 1];
  const finalMatchesList = matchesByStage[finalStage] || [];
  const finalPairs = getPairs(finalMatchesList);
  const allFinalResolved = finalPairs.length > 0 && finalPairs.every((p) => getTieResult(p) !== null);

  const simulateMatch = (match: Match, isLeg1OfPair = false): Match => {
    const home = getTeam(match.homeTeamId);
    const away = getTeam(match.awayTeamId);
    const homeRate = tournament.settings.rateInfluence ? (home?.rate ?? 5) : 5;
    const awayRate = tournament.settings.rateInfluence ? (away?.rate ?? 5) : 5;
    const result = simulateFullMatch(homeRate, awayRate);
    let homeScore = result.total[0];
    let awayScore = result.total[1];
    let homePenalties: number | undefined;
    let awayPenalties: number | undefined;
    if (homeScore === awayScore && !isLeg1OfPair) {
      homePenalties = Math.floor(Math.random() * 3) + 3;
      awayPenalties = homePenalties + (Math.random() > 0.5 ? 1 : -1);
      if (awayPenalties < 0) awayPenalties = homePenalties + 1;
    }
    return {
      ...match,
      homeScore,
      awayScore,
      played: true,
      ...(homePenalties !== undefined && { homePenalties, awayPenalties }),
    };
  };

  const simulateLeg2 = (leg2: Match, leg1: Match): Match => {
    const home = getTeam(leg2.homeTeamId);
    const away = getTeam(leg2.awayTeamId);
    const homeRate = tournament.settings.rateInfluence ? (home?.rate ?? 5) : 5;
    const awayRate = tournament.settings.rateInfluence ? (away?.rate ?? 5) : 5;
    const result = simulateFullMatch(homeRate, awayRate);
    let homeScore = result.total[0];
    let awayScore = result.total[1];
    let homeExtraTime: number | undefined;
    let awayExtraTime: number | undefined;
    let homePenalties: number | undefined;
    let awayPenalties: number | undefined;

    const generatePenalties = () => {
      const homePens = Math.floor(Math.random() * 3) + 3;
      let awayPens = homePens + (Math.random() > 0.5 ? 1 : -1);
      if (awayPens < 0) awayPens = homePens + 1;
      return { homePenalties: homePens, awayPenalties: awayPens };
    };

    const regularAggregate = getAggregate(leg1, { ...leg2, homeScore, awayScore });
    const regularTied = regularAggregate.home === regularAggregate.away;

    if (regularTied) {
      const homeTeamAwayGoalsRegular = awayScore;
      const awayTeamAwayGoals = (leg1.awayScore || 0) + (leg1.awayExtraTime || 0);
      const awayGoalsDecidesRegular = awayGoalsRule && homeTeamAwayGoalsRegular !== awayTeamAwayGoals;

      if (!awayGoalsDecidesRegular) {
        if (tournament.settings.extraTime) {
          const et1 = simulateHalf(homeRate, awayRate);
          const et2 = simulateHalf(homeRate, awayRate);
          homeExtraTime = et1[0] + et2[0];
          awayExtraTime = et1[1] + et2[1];

          const extraAggregate = getAggregate(leg1, {
            ...leg2,
            homeScore,
            awayScore,
            homeExtraTime,
            awayExtraTime,
          });

          const extraTied = extraAggregate.home === extraAggregate.away;
          const homeTeamAwayGoalsAfterExtra = awayScore + (awayExtraTime || 0);
          const awayGoalsDecidesAfterExtra = awayGoalsRule && homeTeamAwayGoalsAfterExtra !== awayTeamAwayGoals;

          if (extraTied && !awayGoalsDecidesAfterExtra) {
            const pens = generatePenalties();
            homePenalties = pens.homePenalties;
            awayPenalties = pens.awayPenalties;
          }
        } else {
          const pens = generatePenalties();
          homePenalties = pens.homePenalties;
          awayPenalties = pens.awayPenalties;
        }
      }
    }

    return {
      ...leg2,
      homeScore,
      awayScore,
      played: true,
      ...(homeExtraTime !== undefined && { homeExtraTime, awayExtraTime }),
      ...(homePenalties !== undefined && { homePenalties, awayPenalties }),
    };
  };

  const handleSimulateStage = (stage: string) => {
    const stageMatches = matchesByStage[stage]?.filter((m) => !m.played && m.homeTeamId && m.awayTeamId) || [];
    if (stageMatches.length === 0) return;
    const firstPass = stageMatches.map((match) => {
      if (match.pairId && match.leg === 2) return match;
      return simulateMatch(match, !!(match.pairId && match.leg === 1));
    });
    const updated = firstPass.map((match) => {
      if (match.pairId && match.leg === 2 && !match.played) {
        const leg1 =
          firstPass.find((m) => m.pairId === match.pairId && m.leg === 1 && m.played) ||
          matchesByStage[stage].find((m) => m.pairId === match.pairId && m.leg === 1 && m.played);
        if (leg1) return simulateLeg2(match, leg1);
        return simulateMatch(match, false);
      }
      return match;
    });
    if (onBatchUpdateMatches) {
      onBatchUpdateMatches(updated);
    } else {
      updated.forEach((m) => onUpdateMatch(m));
    }
  };

  const handleSimulateThirdPlace = () => {
    const unplayed = thirdPlaceMatches.filter((m) => !m.played && m.homeTeamId && m.awayTeamId);
    if (unplayed.length === 0) return;
    const updated = unplayed.map((m) => simulateMatch(m));
    if (onBatchUpdateMatches) onBatchUpdateMatches(updated);
    else updated.forEach((m) => onUpdateMatch(m));
  };

  const handleAddMatch = (stageIdx: number) => {
    if (!onAddMatch) return;
    const stageType = tournament.format === "grupos" ? "knockout" : undefined;
    if (legMode === "home-away") {
      const pairId = crypto.randomUUID();
      const leg1: Match = {
        id: crypto.randomUUID(),
        tournamentId: tournament.id,
        round: stageIdx + 1,
        homeTeamId: "",
        awayTeamId: "",
        homeScore: 0,
        awayScore: 0,
        played: false,
        leg: 1,
        pairId,
        stage: stageType as any,
      };
      const leg2: Match = {
        id: crypto.randomUUID(),
        tournamentId: tournament.id,
        round: stageIdx + 1,
        homeTeamId: "",
        awayTeamId: "",
        homeScore: 0,
        awayScore: 0,
        played: false,
        leg: 2,
        pairId,
        stage: stageType as any,
      };
      if (onBatchUpdateMatches) {
        onBatchUpdateMatches([...matches, leg1, leg2]);
      } else {
        onAddMatch(leg1);
        onAddMatch(leg2);
      }
    } else {
      onAddMatch({
        id: crypto.randomUUID(),
        tournamentId: tournament.id,
        round: stageIdx + 1,
        homeTeamId: "",
        awayTeamId: "",
        homeScore: 0,
        awayScore: 0,
        played: false,
        stage: stageType as any,
      });
    }
    toast.success("Confronto adicionado!");
  };

  const handleRemoveMatch = (match: Match) => {
    if (!onRemoveMatch) return;
    onRemoveMatch(match.id, match.pairId);
    toast.success("Confronto removido!");
  };

  const handleAdvanceStage = (stageIndex: number) => {
    const stage = stages[stageIndex];
    const nextStage = stages[stageIndex + 1];
    if (!nextStage) return;

    const stageMatchesList = matchesByStage[stage] || [];
    const nextStageMatches = matchesByStage[nextStage] || [];

    const pairs = getPairs(stageMatchesList);
    const allResolved = pairs.every((p) => getTieResult(p) !== null);
    if (!allResolved) return;

    if (nextStageMatches.length > 0) return;

    const winners = pairs.map(getTieResult).filter(Boolean) as string[];
    const isFinalStage = stageIndex + 1 === stages.length - 1;
    const useSingleLeg = legMode === "single" || (isFinalStage && finalSingleLeg);

    const newMatches: Match[] = [];
    const stageType = tournament.format === "grupos" ? "knockout" : undefined;

    if (useSingleLeg) {
      for (let i = 0; i < winners.length; i += 2) {
        if (i + 1 < winners.length) {
          newMatches.push({
            id: crypto.randomUUID(),
            tournamentId: tournament.id,
            round: stageIndex + 2,
            homeTeamId: winners[i],
            awayTeamId: winners[i + 1],
            homeScore: 0,
            awayScore: 0,
            played: false,
            stage: stageType as any,
          });
        }
      }
    } else {
      for (let i = 0; i < winners.length; i += 2) {
        if (i + 1 < winners.length) {
          const pairId = crypto.randomUUID();
          newMatches.push({
            id: crypto.randomUUID(),
            tournamentId: tournament.id,
            round: stageIndex + 2,
            homeTeamId: winners[i],
            awayTeamId: winners[i + 1],
            homeScore: 0,
            awayScore: 0,
            played: false,
            leg: 1,
            pairId,
            stage: stageType as any,
          });
          newMatches.push({
            id: crypto.randomUUID(),
            tournamentId: tournament.id,
            round: stageIndex + 2,
            homeTeamId: winners[i + 1],
            awayTeamId: winners[i],
            homeScore: 0,
            awayScore: 0,
            played: false,
            leg: 2,
            pairId,
            stage: stageType as any,
          });
        }
      }
    }

    const semiStageIdx = stages.length - 2;
    if (thirdPlaceMatch && stageIndex === semiStageIdx && !matches.some((m) => m.isThirdPlace)) {
      const losers = pairs.map(getSemiLoser).filter(Boolean) as string[];
      if (losers.length === 2) {
        newMatches.push({
          id: crypto.randomUUID(),
          tournamentId: tournament.id,
          round: stageIndex + 2,
          homeTeamId: losers[0],
          awayTeamId: losers[1],
          homeScore: 0,
          awayScore: 0,
          played: false,
          isThirdPlace: true,
          stage: stageType as any,
        });
      }
    }

    if (newMatches.length > 0 && onBatchUpdateMatches) {
      onBatchUpdateMatches([...matches, ...newMatches]);
    }
  };

  // ─── Render helpers ───

  const renderPair = (pair: { leg1: Match; leg2: Match | null }, pairIdx: number) => {
    const homeTeam = getTeam(pair.leg1.homeTeamId);
    const awayTeam = getTeam(pair.leg1.awayTeamId);
    const winner = getTieResult(pair);

    const getMatchTotalScore = (match: Match, side: "home" | "away") => {
      const base = side === "home" ? match.homeScore || 0 : match.awayScore || 0;
      const et = side === "home" ? match.homeExtraTime || 0 : match.awayExtraTime || 0;
      return base + et;
    };

    const hasExtraTime = (match: Match) =>
      match.played && ((match.homeExtraTime || 0) > 0 || (match.awayExtraTime || 0) > 0);
    const hasPenalties = (match: Match) => match.played && match.homePenalties !== undefined;

    const renderMatchFooter = (match: Match) => {
      const parts: string[] = [];
      if (hasExtraTime(match)) parts.push("AET");
      if (hasPenalties(match)) parts.push(`Pên: ${match.homePenalties}×${match.awayPenalties}`);
      if (parts.length === 0) return null;
      return (
        <div className="text-center py-0.5 bg-secondary/50 border-t border-border/10">
          <span className="text-[9px] text-muted-foreground">{parts.join(" • ")}</span>
        </div>
      );
    };

    return (
      <div
        key={pair.leg1.id}
        className="relative group/pair w-[220px] rounded-lg bg-secondary/30 border border-border overflow-visible"
      >
        {onRemoveMatch && !tournament.finalized && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleRemoveMatch(pair.leg1);
            }}
            className="absolute -top-2 -right-2 z-10 p-1 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover/pair:opacity-100 transition-opacity shadow-md"
            title="Remover confronto"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
        <button
          className="w-full text-left hover:bg-secondary/30 transition-all duration-150"
          onClick={() => setSelectedMatch(pair.leg1)}
        >
          {pair.leg2 && (
            <div className="flex items-center gap-1 px-2 py-1 border-b border-border/20">
              <span className="text-[8px] text-muted-foreground">Ida</span>
            </div>
          )}
          <TeamRow
            team={homeTeam}
            score={pair.leg1.played ? getMatchTotalScore(pair.leg1, "home") : undefined}
            isWinner={winner === pair.leg1.homeTeamId}
            borderBottom
            hideEdit={!!tournament.finalized}
            onEditTeam={() => setEditingTeam({ match: pair.leg1, side: "home" })}
          />
          <TeamRow
            team={awayTeam}
            score={pair.leg1.played ? getMatchTotalScore(pair.leg1, "away") : undefined}
            isWinner={winner === pair.leg1.awayTeamId}
            hideEdit={!!tournament.finalized}
            onEditTeam={() => setEditingTeam({ match: pair.leg1, side: "away" })}
          />
          {!pair.leg2 && renderMatchFooter(pair.leg1)}
        </button>
        {pair.leg2 && (
          <button
            className="w-full text-left hover:bg-secondary/30 transition-all duration-150"
            onClick={() => setSelectedMatch(pair.leg2)}
          >
            <div className="flex items-center gap-1 px-2 py-1 border-b border-border/20">
              <span className="text-[8px] text-muted-foreground">Volta</span>
            </div>
            <TeamRow
              team={awayTeam}
              score={pair.leg2.played ? getMatchTotalScore(pair.leg2, "home") : undefined}
              isWinner={winner === pair.leg1.awayTeamId}
              borderBottom
              hideEdit={!!tournament.finalized}
            onEditTeam={() => setEditingTeam({ match: pair.leg2!, side: "home" })}
            />
            <TeamRow
              team={homeTeam}
              score={pair.leg2.played ? getMatchTotalScore(pair.leg2, "away") : undefined}
              isWinner={winner === pair.leg1.homeTeamId}
              hideEdit={!!tournament.finalized}
            onEditTeam={() => setEditingTeam({ match: pair.leg2!, side: "away" })}
            />
            {renderMatchFooter(pair.leg2)}
          </button>
        )}
      </div>
    );
  };

  const renderThirdPlaceMatch = (match: Match) => {
    const winner = getSingleMatchWinner(match);
    const home = getTeam(match.homeTeamId);
    const away = getTeam(match.awayTeamId);
    const homeTotal = match.played ? (match.homeScore || 0) + (match.homeExtraTime || 0) : undefined;
    const awayTotal = match.played ? (match.awayScore || 0) + (match.awayExtraTime || 0) : undefined;

    const hasET = match.played && ((match.homeExtraTime || 0) > 0 || (match.awayExtraTime || 0) > 0);
    const hasPens = match.played && match.homePenalties !== undefined;

    return (
      <button
        key={match.id}
        onClick={() => setSelectedMatch(match)}
        className="w-[220px] rounded-lg bg-secondary/30 border border-warning/30 hover:border-warning/60 transition-all text-left overflow-hidden"
      >
        <TeamRow
          team={home}
          score={homeTotal}
          isWinner={winner === match.homeTeamId}
          borderBottom
          hideEdit={!!tournament.finalized}
            onEditTeam={() => setEditingTeam({ match, side: "home" })}
        />
        <TeamRow
          team={away}
          score={awayTotal}
          isWinner={winner === match.awayTeamId}
          hideEdit={!!tournament.finalized}
            onEditTeam={() => setEditingTeam({ match, side: "away" })}
        />
        {(hasET || hasPens) && (
          <div className="text-center py-0.5 bg-secondary/50 border-t border-border/10">
            <span className="text-[9px] text-muted-foreground">
              {[hasET && "AET", hasPens && `Pên: ${match.homePenalties}×${match.awayPenalties}`]
                .filter(Boolean)
                .join(" • ")}
            </span>
          </div>
        )}
      </button>
    );
  };

  const renderStageColumn = (
    stage: string,
    stageIdx: number,
    pairsSubset: Array<{ leg1: Match; leg2: Match | null }>,
    columnKey: string,
    options: { showActions?: boolean; side?: "left" | "right" | "center" } = {},
  ) => {
    const { showActions = true, side = "center" } = options;
    const isFinal = stageIdx === stages.length - 1;
    const allStageMatches = matchesByStage[stage] || [];
    const unplayed = allStageMatches.filter((m) => !m.played && m.homeTeamId && m.awayTeamId);
    const allPairs = getPairs(allStageMatches);
    const allStagePairsResolved = allPairs.length > 0 && allPairs.every((p) => getTieResult(p) !== null);
    const nextStage = stages[stageIdx + 1];
    const nextHasMatches = nextStage && (matchesByStage[nextStage]?.length || 0) > 0;

    return (
      <div key={columnKey} className="flex flex-col items-center relative" style={{ minWidth: 228 }}>
        <div className="mb-2 flex items-center gap-1.5">
          <span className="text-[11px] font-bold text-primary tracking-tight">
            {STAGE_LABELS[stage] || stage}
          </span>
          {legMode === "home-away" && !isFinal && <span className="text-[9px] text-muted-foreground">(I/V)</span>}
        </div>

        {showActions && unplayed.length > 0 && (
          <button
            onClick={() => handleSimulateStage(stage)}
            className="flex items-center gap-1 px-2 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20 text-[10px] font-bold mb-2 transition-colors"
          >
            <Zap className="w-3 h-3" />
            Simular ({unplayed.length})
          </button>
        )}

        {showActions && allStagePairsResolved && nextStage && !nextHasMatches && (
          <button
            onClick={() => handleAdvanceStage(stageIdx)}
            className="flex items-center gap-1 px-2 py-1 rounded-md bg-secondary text-foreground hover:bg-secondary/80 text-[10px] mb-2 transition-colors border border-border"
          >
            Avançar →
          </button>
        )}

        <div className="flex flex-col justify-around flex-1 gap-4">
          {(() => {
            const expectedSlots = (() => {
              if (pairsSubset.length > 0) return pairsSubset.length;
              if (stageIdx === 0) return 0;
              const prevStage = stages[stageIdx - 1];
              const prevPairs = getPairs(matchesByStage[prevStage] || []);
              if (side === "left") return Math.ceil(Math.ceil(prevPairs.length / 2) / 2);
              if (side === "right") return Math.ceil(Math.floor(prevPairs.length / 2) / 2);
              return Math.ceil(prevPairs.length / 2);
            })();

            const renderEmptySlot = (key: string) => (
              <div
                key={key}
                className="w-[220px] rounded-lg bg-secondary/20 border border-dashed border-border overflow-hidden"
              >
                <div className="flex items-center justify-between px-3 py-2 border-b border-border/20">
                  <div className="flex items-center gap-2 min-w-0">
                    <Shield className="w-3.5 h-3.5 text-muted-foreground/30" />
                    <span className="text-xs text-muted-foreground/40">A definir</span>
                  </div>
                  <span className="text-xs font-mono w-4 text-center text-muted-foreground/20">—</span>
                </div>
                <div className="flex items-center justify-between px-3 py-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Shield className="w-3.5 h-3.5 text-muted-foreground/30" />
                    <span className="text-xs text-muted-foreground/40">A definir</span>
                  </div>
                  <span className="text-xs font-mono w-4 text-center text-muted-foreground/20">—</span>
                </div>
              </div>
            );

            const items =
              pairsSubset.length > 0
                ? pairsSubset.map((pair, i) => <div key={pair.leg1.id}>{renderPair(pair, i)}</div>)
                : Array.from({ length: Math.max(expectedSlots, 1) }).map((_, i) =>
                    renderEmptySlot(`empty-${columnKey}-${i}`),
                  );
            return items;
          })()}
        </div>

        {showActions && onAddMatch && !tournament.finalized && (
          <button
            onClick={() => handleAddMatch(stageIdx)}
            className="w-[220px] mt-2 p-2 rounded-lg border border-dashed border-border/60 hover:border-primary/40 bg-secondary/10 hover:bg-secondary/30 transition-colors flex items-center justify-start gap-1.5"
          >
            <Plus className="w-3 h-3 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground">Adicionar Confronto</span>
          </button>
        )}
      </div>
    );
  };

  const renderChampionCard = () => {
    const champion = finalPairs.length > 0 ? getTieResult(finalPairs[0]) : null;
    const championTeam = champion ? getTeam(champion) : null;
    if (!championTeam) return null;

    const runnerUp = finalPairs[0]
      ? champion === finalPairs[0].leg1.homeTeamId
        ? finalPairs[0].leg1.awayTeamId
        : finalPairs[0].leg1.homeTeamId
      : null;
    const runnerUpTeam = runnerUp ? getTeam(runnerUp) : null;

    // Determine 3rd place: from match if exists, otherwise by best campaign (tiebreakers)
    let thirdTeam: Team | undefined = undefined;
    const thirdMatch = thirdPlaceMatches[0];
    const thirdWinnerId = thirdMatch ? getSingleMatchWinner(thirdMatch) : null;
    if (thirdWinnerId) {
      thirdTeam = getTeam(thirdWinnerId);
    } else if (!thirdPlaceMatch) {
      // No 3rd place match setting: determine by best campaign among semi-final losers
      const semiStageIdx = stages.length - 2;
      if (semiStageIdx >= 0) {
        const semiStage = stages[semiStageIdx];
        const semiPairs = getPairs(matchesByStage[semiStage] || []);
        const losers = semiPairs.map(getSemiLoser).filter(Boolean) as string[];
        if (losers.length === 2) {
          // Use all tournament matches to evaluate campaign
          const allPlayedMatches = matches.filter(m => m.played);
          const tiebreakers = tournament.settings.tiebreakers || ["Pontos", "Vitórias", "Saldo de Gols", "Gols Marcados"];
          const ptsWin = tournament.settings.pointsWin ?? 3;
          const ptsDraw = tournament.settings.pointsDraw ?? 1;
          const ptsLoss = tournament.settings.pointsLoss ?? 0;
          
          const buildStats = (teamId: string) => {
            let wins = 0, draws = 0, losses = 0, gf = 0, ga = 0, points = 0;
            for (const m of allPlayedMatches) {
              const isHome = m.homeTeamId === teamId;
              const isAway = m.awayTeamId === teamId;
              if (!isHome && !isAway) continue;
              const tgf = isHome ? (m.homeScore || 0) + (m.homeExtraTime || 0) : (m.awayScore || 0) + (m.awayExtraTime || 0);
              const tga = isHome ? (m.awayScore || 0) + (m.awayExtraTime || 0) : (m.homeScore || 0) + (m.homeExtraTime || 0);
              gf += tgf; ga += tga;
              if (tgf > tga) { wins++; points += ptsWin; }
              else if (tgf < tga) { losses++; points += ptsLoss; }
              else { draws++; points += ptsDraw; }
            }
            return { points, wins, draws, losses, gf, ga, gd: gf - ga };
          };
          
          const statsA = buildStats(losers[0]);
          const statsB = buildStats(losers[1]);
          
          let bestLoser = losers[0];
          for (const tb of tiebreakers) {
            let diff = 0;
            switch (tb) {
              case "Pontos": diff = statsA.points - statsB.points; break;
              case "Vitórias": diff = statsA.wins - statsB.wins; break;
              case "Saldo de Gols": diff = statsA.gd - statsB.gd; break;
              case "Gols Marcados": diff = statsA.gf - statsB.gf; break;
              case "Empates": diff = statsA.draws - statsB.draws; break;
              case "Gols Sofridos": diff = statsB.ga - statsA.ga; break;
            }
            if (diff > 0) { bestLoser = losers[0]; break; }
            if (diff < 0) { bestLoser = losers[1]; break; }
          }
          thirdTeam = getTeam(bestLoser);
        }
      }
    }

    return (
      <div className="flex flex-col items-stretch justify-start w-[220px] flex-shrink-0">
        <div className="mb-3 text-center">
          <span className="text-xs font-bold text-primary tracking-tight">Campeão</span>
        </div>
        <div className="rounded-xl border-2 border-primary/50 bg-gradient-to-b from-primary/15 via-primary/5 to-secondary/40 overflow-hidden shadow-xl shadow-primary/20">
          {/* Champion row — highlighted */}
          <div className="flex items-center gap-3 px-4 py-3.5 bg-gradient-to-r from-primary/10 to-transparent">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <Trophy className="w-4.5 h-4.5 text-primary" />
            </div>
            <div className="w-8 h-8 flex items-center justify-center shrink-0">
              {championTeam.logo ? (
                <img src={championTeam.logo} alt="" className="w-8 h-8 object-contain" />
              ) : (
                <Shield className="w-5 h-5 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-sm font-bold text-foreground truncate block">
                {championTeam.name || championTeam.shortName}
              </span>
              <span className="text-[10px] text-primary font-semibold">Campeão {tournament.year}</span>
            </div>
          </div>
          {/* Runner-up row */}
          {runnerUpTeam && (
            <div className="flex items-center gap-2.5 px-4 py-2.5 border-t border-border/30 bg-secondary/20">
              <span className="text-[10px] font-bold text-muted-foreground w-5 text-center">2º</span>
              <div className="w-5 h-5 flex items-center justify-center shrink-0">
                {runnerUpTeam.logo ? (
                  <img src={runnerUpTeam.logo} alt="" className="w-5 h-5 object-contain" />
                ) : (
                  <Shield className="w-3.5 h-3.5 text-muted-foreground/50" />
                )}
              </div>
              <span className="text-xs text-muted-foreground truncate">
                {runnerUpTeam.abbreviation || runnerUpTeam.shortName}
              </span>
            </div>
          )}
          {/* Third place row */}
          {thirdTeam && (
            <div className="flex items-center gap-2.5 px-4 py-2.5 border-t border-border/30 bg-secondary/20">
              <span className="text-[10px] font-bold text-highlight w-5 text-center">3º</span>
              <div className="w-5 h-5 flex items-center justify-center shrink-0">
                {thirdTeam.logo ? (
                  <img src={thirdTeam.logo} alt="" className="w-5 h-5 object-contain" />
                ) : (
                  <Shield className="w-3.5 h-3.5 text-muted-foreground/50" />
                )}
              </div>
              <span className="text-xs text-muted-foreground truncate">
                {thirdTeam.abbreviation || thirdTeam.shortName}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ─── Connector component ───
  const BracketConnector = ({ pairCount, side }: { pairCount: number; side: "left" | "right" }) => {
    if (pairCount <= 0) return <div className="w-8" />;

    // Each pair of matches feeds into one match in the next round
    const groups = [];
    for (let i = 0; i < pairCount; i += 2) {
      groups.push(i + 1 < pairCount ? 2 : 1);
    }

    return (
      <div className="flex flex-col justify-around w-10 relative" style={{ minHeight: pairCount * 80 }}>
        {groups.map((count, gi) => (
          <div key={gi} className="flex-1 flex items-center relative">
            {count === 2 ? (
              // Two matches merging into one: draw bracket shape
              <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 40 100">
                {side === "left" ? (
                  <>
                    {/* Top horizontal line */}
                    <line x1="0" y1="25" x2="20" y2="25" stroke="hsl(var(--border))" strokeWidth="2" />
                    {/* Bottom horizontal line */}
                    <line x1="0" y1="75" x2="20" y2="75" stroke="hsl(var(--border))" strokeWidth="2" />
                    {/* Vertical connecting line */}
                    <line x1="20" y1="25" x2="20" y2="75" stroke="hsl(var(--border))" strokeWidth="2" />
                    {/* Middle horizontal line going right */}
                    <line x1="20" y1="50" x2="40" y2="50" stroke="hsl(var(--border))" strokeWidth="2" />
                  </>
                ) : (
                  <>
                    {/* Top horizontal line */}
                    <line x1="40" y1="25" x2="20" y2="25" stroke="hsl(var(--border))" strokeWidth="2" />
                    {/* Bottom horizontal line */}
                    <line x1="40" y1="75" x2="20" y2="75" stroke="hsl(var(--border))" strokeWidth="2" />
                    {/* Vertical connecting line */}
                    <line x1="20" y1="25" x2="20" y2="75" stroke="hsl(var(--border))" strokeWidth="2" />
                    {/* Middle horizontal line going left */}
                    <line x1="20" y1="50" x2="0" y2="50" stroke="hsl(var(--border))" strokeWidth="2" />
                  </>
                )}
              </svg>
            ) : (
              // Single match: just a straight horizontal line
              <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 40 100">
                <line x1="0" y1="50" x2="40" y2="50" stroke="hsl(var(--border))" strokeWidth="2" />
              </svg>
            )}
          </div>
        ))}
      </div>
    );
  };

  // ─── Main render ───

  return (
    <div className="space-y-4">
      {/* Finalize banner - top */}
      {(() => {
        const allMatchesPlayed = matches.length > 0 && matches.filter((m) => !m.isThirdPlace).every((m) => m.played);
        const canFinalize = allFinalResolved && allMatchesPlayed;
        if (!canFinalize || tournament.finalized || !onFinalize) return null;
        return (
          <div className="flex items-center justify-start gap-3 p-3 rounded-xl bg-primary/5 border border-primary/20">
            <Trophy className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-foreground">Chaveamento concluído!</span>
            <Button onClick={onFinalize} size="sm" className="gap-1.5 bg-primary text-primary-foreground">
              <Trophy className="w-3.5 h-3.5" />
              Finalizar
            </Button>
          </div>
        );
      })()}
      <div className="flex justify-end mb-1">
        <ScreenshotButton targetRef={bracketRef as any} filename="chaveamento.png" discrete />
      </div>
      <div className="overflow-x-auto overflow-y-hidden pb-2" ref={bracketRef}>
        {(() => {
          const preFinalStages = stages.slice(0, -1);
          const finalStageKey = stages[stages.length - 1];
          const finalStageIdx = stages.length - 1;

          const firstStagePairs = preFinalStages.length > 0 ? getPairs(matchesByStage[preFinalStages[0]] || []) : [];
          const useBracketLayout = preFinalStages.length > 0 && firstStagePairs.length >= 2;

          if (!useBracketLayout) {
            // Linear layout
            return (
              <div className="flex items-center justify-start gap-0">
                {stages.map((stage, stageIdx) => {
                  const pairs = getPairs(matchesByStage[stage] || []);
                  return (
                    <div key={stage} className="flex items-center">
                      {renderStageColumn(stage, stageIdx, pairs, stage, { side: "left" })}
                      {stageIdx < stages.length - 1 && (
                        <BracketConnector pairCount={Math.max(pairs.length, 1)} side="left" />
                      )}
                    </div>
                  );
                })}
                {renderChampionCard()}
              </div>
            );
          }

          // Two-sided bracket: left half → final ← right half
          const leftColumns = preFinalStages.map((stage, i) => {
            const allPairs = getPairs(matchesByStage[stage] || []);
            return { stage, stageIdx: i, pairs: allPairs.slice(0, Math.ceil(allPairs.length / 2)) };
          });

          const rightColumns = preFinalStages.map((stage, i) => {
            const allPairs = getPairs(matchesByStage[stage] || []);
            return { stage, stageIdx: i, pairs: allPairs.slice(Math.ceil(allPairs.length / 2)) };
          });

          return (
            <div className="flex min-w-max items-center justify-start lg:justify-center mx-auto">
              {/* Left bracket half */}
              {leftColumns.map(({ stage, stageIdx, pairs }) => (
                <div key={`left-${stage}`} className="flex items-center">
                  {renderStageColumn(stage, stageIdx, pairs, `left-${stage}`, { showActions: true, side: "left" })}
                  <BracketConnector pairCount={pairs.length} side="left" />
                </div>
              ))}

              {/* Center: Final + Third Place + Champion */}
              <div className="flex flex-col items-center justify-start" style={{ minWidth: 240 }}>
                {renderStageColumn(
                  finalStageKey,
                  finalStageIdx,
                  getPairs(matchesByStage[finalStageKey] || []),
                  `final-${finalStageKey}`,
                  { side: "center" },
                )}

                {thirdPlaceMatches.length > 0 && (
                  <div className="pt-3 mt-3 border-t border-border/40 w-[220px]">
                    {/* Container com justify-center para o texto ficar no meio */}
                    <div className="flex items-center justify-center gap-1.5 mb-1.5 relative w-full">
                      <Medal className="w-3.5 h-3.5 text-highlight" />
                      <span className="text-[10px] font-bold text-primary">
                        3º Lugar
                      </span>

                      {thirdPlaceMatches.some((m) => !m.played) && (
                        <button
                          onClick={handleSimulateThirdPlace}
                          // O absolute right-0 tira o botão do fluxo, então ele não empurra o texto
                          className="absolute right-0 flex items-center gap-1 px-1.5 py-0.5 rounded bg-primary/10 text-primary hover:bg-primary/20 text-[9px] font-bold transition-colors"
                        >
                          <Zap className="w-2 h-2" />
                          Simular
                        </button>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">{thirdPlaceMatches.map(renderThirdPlaceMatch)}</div>
                  </div>
                )}

                <div className="mt-4">{renderChampionCard()}</div>
              </div>

              {/* Right bracket half (reversed stage order) */}
              {[...rightColumns].reverse().map(({ stage, stageIdx, pairs }) => (
                <div key={`right-${stage}`} className="flex items-center">
                  <BracketConnector pairCount={pairs.length} side="right" />
                  {renderStageColumn(stage, stageIdx, pairs, `right-${stage}`, { showActions: true, side: "right" })}
                </div>
              ))}
            </div>
          );
        })()}
      </div>

      {selectedMatch && (
        <MatchPopup
          match={selectedMatch}
          homeTeam={getTeam(selectedMatch.homeTeamId)}
          awayTeam={getTeam(selectedMatch.awayTeamId)}
          rateInfluence={tournament.settings.rateInfluence}
          tournament={tournament}
          allTeams={teams}
          onSave={(updated) => {
            onUpdateMatch(updated);
            setSelectedMatch(null);
          }}
          onCancel={() => setSelectedMatch(null)}
        />
      )}

      {editingTeam && (
        <BracketTeamEditor
          match={editingTeam.match}
          allTeams={teams.filter((t) => tournament.teamIds.includes(t.id))}
          side={editingTeam.side}
          onUpdate={(updated) => {
            if (updated.pairId) {
              const paired = matches.find((m) => m.pairId === updated.pairId && m.id !== updated.id);
              if (paired && onBatchUpdateMatches) {
                const pairedUpdated = {
                  ...paired,
                  homeTeamId: updated.awayTeamId,
                  awayTeamId: updated.homeTeamId,
                  homeScore: 0,
                  awayScore: 0,
                  played: false,
                  homePenalties: undefined,
                  awayPenalties: undefined,
                  homeExtraTime: undefined,
                  awayExtraTime: undefined,
                };
                const newMatches = matches.map((m) => {
                  if (m.id === updated.id) return updated;
                  if (m.id === pairedUpdated.id) return pairedUpdated;
                  return m;
                });
                onBatchUpdateMatches(newMatches);
                return;
              }
            }
            onUpdateMatch(updated);
          }}
          onClose={() => setEditingTeam(null)}
        />
      )}
    </div>
  );
}

function TeamRow({
  team,
  score,
  isWinner,
  borderBottom,
  onEditTeam,
  hideEdit,
}: {
  team?: Team;
  score?: number;
  isWinner: boolean;
  borderBottom?: boolean;
  onEditTeam: () => void;
  hideEdit?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between px-3 py-2 transition-colors",
        borderBottom && "border-b border-border/20",
        isWinner && "bg-primary/5",
      )}
    >
      <div className="flex items-center gap-2 min-w-0">
        <div className="w-5 h-5 flex items-center justify-start shrink-0">
          {team?.logo ? (
            <img src={team.logo} alt="" className="w-5 h-5 object-contain" />
          ) : (
            <Shield className="w-3.5 h-3.5 text-muted-foreground/50" />
          )}
        </div>
        <span className={cn("text-xs truncate", isWinner ? "font-bold text-foreground" : "text-muted-foreground")}>
          {team?.abbreviation || team?.shortName || "A definir"}
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <span
          className={cn(
            "text-xs font-mono w-4 text-center",
            score !== undefined
              ? isWinner
                ? "font-bold text-primary"
                : "text-foreground"
              : "text-muted-foreground/30",
          )}
        >
          {score !== undefined ? score : "—"}
        </span>
        {!hideEdit && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEditTeam();
            }}
            className="p-1 rounded hover:bg-secondary text-muted-foreground/30 hover:text-primary transition-colors"
          >
            <UserPlus className="w-2.5 h-2.5" />
          </button>
        )}
      </div>
    </div>
  );
}
