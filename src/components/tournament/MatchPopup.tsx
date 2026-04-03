import { useState, useEffect, useCallback, useMemo } from "react";
import { Match, Team, Tournament, TeamMatchStats } from "@/types/tournament";
import { Shield, ChevronUp, ChevronDown, Play } from "lucide-react";
import { calculateStandings, StandingRow } from "@/lib/standings";
import { simulateHalf, generateMatchStats } from "@/lib/simulation";

interface MatchPopupProps {
  match: Match;
  homeTeam?: Team;
  awayTeam?: Team;
  rateInfluence: boolean;
  tournament?: Tournament;
  allTeams?: Team[];
  onSave: (updated: Match) => void;
  onCancel: () => void;
}

type HalfKey = "h1" | "h2" | "et1" | "et2";

function simulatePenaltyKick(): boolean {
  return Math.random() < 0.75;
}

// Stats comparison bar row — Sofascore-style: bars grow from center outward
function StatRow({ label, homeValue, awayValue, format }: { label: string; homeValue: number; awayValue: number; format?: "decimal" | "percent" | "integer" }) {
  const total = homeValue + awayValue;
  const homePercent = total > 0 ? (homeValue / total) * 100 : 50;
  const awayPercent = total > 0 ? (awayValue / total) * 100 : 50;

  const formatValue = (v: number) => {
    if (format === "decimal") return v.toFixed(2);
    if (format === "percent") return `${v}%`;
    return String(v);
  };

  const homeBetter = homeValue > awayValue;
  const awayBetter = awayValue > homeValue;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className={`text-xs font-bold ${homeBetter ? "text-foreground" : "text-muted-foreground"}`}>
          {formatValue(homeValue)}
        </span>
        <span className="text-xs text-muted-foreground font-medium">{label}</span>
        <span className={`text-xs font-bold ${awayBetter ? "text-foreground" : "text-muted-foreground"}`}>
          {formatValue(awayValue)}
        </span>
      </div>
      <div className="flex items-center gap-0.5 h-[6px]">
        {/* Home bar — grows from right to left */}
        <div className="flex-1 flex justify-end">
          <div
            className="h-full rounded-l-sm transition-all duration-500"
            style={{
              width: `${homePercent}%`,
              backgroundColor: homeBetter ? "hsl(var(--primary))" : "hsl(var(--muted-foreground) / 0.3)",
            }}
          />
        </div>
        {/* Away bar — grows from left to right */}
        <div className="flex-1 flex justify-start">
          <div
            className="h-full rounded-r-sm transition-all duration-500"
            style={{
              width: `${awayPercent}%`,
              backgroundColor: awayBetter ? "hsl(var(--primary))" : "hsl(var(--muted-foreground) / 0.3)",
            }}
          />
        </div>
      </div>
    </div>
  );
}

// Card indicators component
function CardIndicators({ yellowCards, redCards }: { yellowCards: number; redCards: number }) {
  if (yellowCards === 0 && redCards === 0) return null;
  return (
    <div className="flex gap-1 justify-center mt-1">
      {Array.from({ length: yellowCards }, (_, i) => (
        <div key={`y${i}`} className="w-2.5 h-3.5 rounded-[1px] bg-yellow-400" />
      ))}
      {Array.from({ length: redCards }, (_, i) => (
        <div key={`r${i}`} className="w-2.5 h-3.5 rounded-[1px] bg-red-500" />
      ))}
    </div>
  );
}

export default function MatchPopup({
  match,
  homeTeam,
  awayTeam,
  rateInfluence,
  tournament,
  allTeams,
  onSave,
  onCancel,
}: MatchPopupProps) {
  const isKnockoutFormat = match.stage === "knockout" || tournament?.format === "mata-mata";
  const isLeg1OfPair = !!(match.pairId && match.leg === 1);
  const pairLeg1 = match.pairId
    ? tournament?.matches.find((m) => m.pairId === match.pairId && m.leg === 1 && m.id !== match.id)
    : undefined;
  const isLeg2OfPair = !!(match.pairId && match.leg === 2 && pairLeg1);
  const isKnockout = isKnockoutFormat && !isLeg1OfPair;
  const extraTimeEnabled = tournament?.settings.extraTime ?? false;
  const awayGoalsRule = tournament?.settings.awayGoalsRule ?? false;

  const [scores, setScores] = useState<Record<HalfKey, [number, number]>>({
    h1: [0, 0],
    h2: [0, 0],
    et1: [0, 0],
    et2: [0, 0],
  });

  const [activeHalf, setActiveHalf] = useState<HalfKey>("h1");
  const [showExtraTime, setShowExtraTime] = useState(false);
  const [showPenalties, setShowPenalties] = useState(false);
  const [penalties, setPenalties] = useState<{ home: (boolean | null)[]; away: (boolean | null)[] }>({
    home: [],
    away: [],
  });
  const [penaltyIndex, setPenaltyIndex] = useState(0);
  const [penaltyFinished, setPenaltyFinished] = useState(false);
  const [matchStats, setMatchStats] = useState<{ homeStats: TeamMatchStats; awayStats: TeamMatchStats } | null>(null);
  const [showStats, setShowStats] = useState(false);
  const [pendingLegacyStats, setPendingLegacyStats] = useState<{ homeStats: TeamMatchStats; awayStats: TeamMatchStats } | null>(null);

  const setHalfScore = (half: HalfKey, side: 0 | 1, value: number) => {
    setScores((prev) => ({
      ...prev,
      [half]: side === 0 ? [value, prev[half][1]] : [prev[half][0], value],
    }));
  };

  const regularHome = scores.h1[0] + scores.h2[0];
  const regularAway = scores.h1[1] + scores.h2[1];
  const etHome = scores.et1[0] + scores.et2[0];
  const etAway = scores.et1[1] + scores.et2[1];
  const totalHome = regularHome + (showExtraTime ? etHome : 0);
  const totalAway = regularAway + (showExtraTime ? etAway : 0);

  const getTwoLegTieContext = (includeExtraTime: boolean) => {
    if (!pairLeg1) return null;
    const leg1HomeTotal = (pairLeg1.homeScore || 0) + (pairLeg1.homeExtraTime || 0);
    const leg1AwayTotal = (pairLeg1.awayScore || 0) + (pairLeg1.awayExtraTime || 0);
    const leg2HomeTotal = regularHome + (includeExtraTime ? etHome : 0);
    const leg2AwayTotal = regularAway + (includeExtraTime ? etAway : 0);
    const aggregateHome = leg1HomeTotal + leg2AwayTotal;
    const aggregateAway = leg1AwayTotal + leg2HomeTotal;
    const awayGoalsHome = leg2AwayTotal;
    const awayGoalsAway = leg1AwayTotal;
    const awayGoalsBreakTie = awayGoalsRule && awayGoalsHome !== awayGoalsAway;
    return { aggregateHome, aggregateAway, isAggregateTied: aggregateHome === aggregateAway, awayGoalsBreakTie };
  };

  const regularTieContext = isLeg2OfPair ? getTwoLegTieContext(false) : null;
  const extraTimeTieContext = isLeg2OfPair ? getTwoLegTieContext(true) : null;

  const requiresDeciderAfterRegular = isKnockout
    ? isLeg2OfPair
      ? !!regularTieContext && regularTieContext.isAggregateTied && !regularTieContext.awayGoalsBreakTie
      : regularHome === regularAway
    : false;

  const requiresPenaltiesAfterExtraTime = isKnockout
    ? isLeg2OfPair
      ? !!extraTimeTieContext && extraTimeTieContext.isAggregateTied && !extraTimeTieContext.awayGoalsBreakTie
      : totalHome === totalAway
    : false;

  const [simulatedHalves, setSimulatedHalves] = useState<Set<HalfKey>>(new Set());

  // Auto-generate stats for legacy matches that don't have them
  useEffect(() => {
    if (match.played) {
      setScores({
        h1: [match.homeScore, match.awayScore],
        h2: [0, 0],
        et1: [match.homeExtraTime ? match.homeExtraTime : 0, match.awayExtraTime ? match.awayExtraTime : 0],
        et2: [0, 0],
      });
      if (isKnockout && (match.homeExtraTime !== undefined || match.awayExtraTime !== undefined)) {
        setShowExtraTime(true);
        setActiveHalf("et1");
      }
      if (isKnockout && match.homePenalties !== undefined && match.awayPenalties !== undefined) {
        setShowPenalties(true);
        const homeKicks = Array.from({ length: match.homePenalties + (match.awayPenalties - match.homePenalties > 0 ? 1 : 0) }, (_, i) => i < match.homePenalties);
        const awayKicks = Array.from({ length: match.awayPenalties + (match.homePenalties - match.awayPenalties > 0 ? 1 : 0) }, (_, i) => i < match.awayPenalties);
        setPenalties({ home: homeKicks, away: awayKicks });
        setPenaltyFinished(true);
      }
      setSimulatedHalves(new Set(["h1", "h2"]));

      // Load existing stats or auto-generate for legacy matches
      if (match.homeStats && match.awayStats) {
        setMatchStats({ homeStats: match.homeStats, awayStats: match.awayStats });
      } else {
        // Auto-generate for legacy matches (save pending, will persist on next Finalizar)
        const homeRate = rateInfluence && homeTeam ? homeTeam.rate : 3;
        const awayRate = rateInfluence && awayTeam ? awayTeam.rate : 3;
        const totalGoalsHome = match.homeScore + (match.homeExtraTime || 0);
        const totalGoalsAway = match.awayScore + (match.awayExtraTime || 0);
        const stats = generateMatchStats(homeRate, awayRate, totalGoalsHome, totalGoalsAway);
        setMatchStats(stats);
        setPendingLegacyStats(stats);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match.id]);

  useEffect(() => {
    if (!isKnockout) return;
    if (!simulatedHalves.has("h2")) return;
    if (!requiresDeciderAfterRegular) return;
    if (extraTimeEnabled && !showExtraTime) {
      setShowExtraTime(true);
      setActiveHalf("et1");
    } else if (!extraTimeEnabled && !showPenalties) {
      setShowPenalties(true);
    }
  }, [simulatedHalves, isKnockout, requiresDeciderAfterRegular, extraTimeEnabled, showExtraTime, showPenalties]);

  useEffect(() => {
    if (!isKnockout || !showExtraTime) return;
    if (!simulatedHalves.has("et2")) return;
    if (!requiresPenaltiesAfterExtraTime) return;
    if (!showPenalties) {
      setShowPenalties(true);
    }
  }, [simulatedHalves, isKnockout, showExtraTime, requiresPenaltiesAfterExtraTime, showPenalties]);

  useEffect(() => {
    if (!isKnockout) return;
    if (requiresDeciderAfterRegular) return;
    if (showExtraTime) {
      setShowExtraTime(false);
      if (activeHalf === "et1" || activeHalf === "et2") setActiveHalf("h2");
    }
    if (showPenalties) {
      setShowPenalties(false);
      setPenalties({ home: [], away: [] });
      setPenaltyIndex(0);
      setPenaltyFinished(false);
    }
  }, [isKnockout, requiresDeciderAfterRegular, showExtraTime, showPenalties, activeHalf]);

  const halvesOrder: HalfKey[] = ["h1", "h2", "et1", "et2"];
  const activeIndex = halvesOrder.indexOf(activeHalf);
  const accumulatedHome = halvesOrder.slice(0, activeIndex + 1).reduce((sum, k) => sum + scores[k][0], 0);
  const accumulatedAway = halvesOrder.slice(0, activeIndex + 1).reduce((sum, k) => sum + scores[k][1], 0);

  const increment = (side: 0 | 1) => setHalfScore(activeHalf, side, scores[activeHalf][side] + 1);
  const decrement = (side: 0 | 1) => setHalfScore(activeHalf, side, Math.max(0, scores[activeHalf][side] - 1));

  const handleSimulate = () => {
    const homeRate = rateInfluence && homeTeam ? homeTeam.rate : 3;
    const awayRate = rateInfluence && awayTeam ? awayTeam.rate : 3;
    const [h, a] = simulateHalf(homeRate, awayRate);
    setHalfScore(activeHalf, 0, h);
    setHalfScore(activeHalf, 1, a);
    setSimulatedHalves((prev) => new Set(prev).add(activeHalf));

    if (activeHalf === "h1") setActiveHalf("h2");
    else if (activeHalf === "et1") setActiveHalf("et2");
  };

  const allRequiredSimulated = showExtraTime
    ? simulatedHalves.has("h1") && simulatedHalves.has("h2") && simulatedHalves.has("et1") && simulatedHalves.has("et2")
    : simulatedHalves.has("h1") && simulatedHalves.has("h2");
  const canSimulate = !showPenalties && !simulatedHalves.has(activeHalf) && !allRequiredSimulated;

  const penaltyScore = (side: "home" | "away") => penalties[side].filter((p) => p === true).length;

  const handleShootPenalty = useCallback(() => {
    if (penaltyFinished) return;
    const isHomeKick = penaltyIndex % 2 === 0;
    const side = isHomeKick ? "home" : "away";
    const result = simulatePenaltyKick();
    setPenalties((prev) => ({ ...prev, [side]: [...prev[side], result] }));
    setPenaltyIndex((i) => i + 1);
  }, [penaltyIndex, penaltyFinished]);

  useEffect(() => {
    if (!showPenalties || penaltyFinished) return;
    const homeKicks = penalties.home.length;
    const awayKicks = penalties.away.length;
    const homeScore = penaltyScore("home");
    const awayScore = penaltyScore("away");
    if (homeKicks === awayKicks && homeKicks >= 5) {
      if (homeScore !== awayScore) { setPenaltyFinished(true); return; }
    }
    if (homeKicks === awayKicks && homeKicks <= 5 && homeKicks >= 1) {
      const remainingHome = Math.max(5 - homeKicks, 0);
      const remainingAway = Math.max(5 - awayKicks, 0);
      if (homeScore + remainingHome < awayScore) { setPenaltyFinished(true); return; }
      if (awayScore + remainingAway < homeScore) { setPenaltyFinished(true); return; }
    }
  }, [penalties, showPenalties, penaltyFinished]);

  const togglePenalty = (side: "home" | "away", index: number) => {
    setPenalties((prev) => {
      const arr = [...prev[side]];
      arr[index] = !arr[index];
      return { ...prev, [side]: arr };
    });
  };

  // Generate stats when finishing if not yet generated
  const ensureStats = (): { homeStats: TeamMatchStats; awayStats: TeamMatchStats } => {
    if (matchStats) return matchStats;
    const homeRate = rateInfluence && homeTeam ? homeTeam.rate : 3;
    const awayRate = rateInfluence && awayTeam ? awayTeam.rate : 3;
    const finalHome = totalHome;
    const finalAway = totalAway;
    const stats = generateMatchStats(homeRate, awayRate, finalHome, finalAway);
    setMatchStats(stats);
    return stats;
  };

  const handleFinish = () => {
    if (isKnockout && requiresDeciderAfterRegular) {
      if (extraTimeEnabled && !showExtraTime) {
        setShowExtraTime(true);
        setActiveHalf("et1");
        return;
      }
      const penaltiesNeeded = showExtraTime ? requiresPenaltiesAfterExtraTime : !extraTimeEnabled;
      if (penaltiesNeeded && !showPenalties) {
        setShowPenalties(true);
        return;
      }
    }
    if (showPenalties && penaltyScore("home") === penaltyScore("away")) return;

    const stats = ensureStats();

    onSave({
      ...match,
      homeScore: regularHome,
      awayScore: regularAway,
      homeExtraTime: showExtraTime ? etHome : undefined,
      awayExtraTime: showExtraTime ? etAway : undefined,
      homePenalties: showPenalties ? penaltyScore("home") : undefined,
      awayPenalties: showPenalties ? penaltyScore("away") : undefined,
      homeStats: stats.homeStats,
      awayStats: stats.awayStats,
      played: true,
    });
  };

  const liveMatches = (() => {
    if (!tournament) return [];
    const liveMatch: Match = { ...match, homeScore: regularHome, awayScore: regularAway, played: true };
    return tournament.matches.map((m) => (m.id === match.id ? liveMatch : m));
  })();

  const bottomStandings: (StandingRow & { position: number })[] = (() => {
    if (!tournament || !allTeams) return [];
    if (tournament.format === "mata-mata") return [];
    if (match.stage === "knockout") return [];
    if (tournament.format === "grupos" && match.group) {
      const groupTeamIds = tournament.teamIds.filter((tid) => {
        const groupMatch = liveMatches.find(
          (m) => m.stage === "group" && m.group === match.group && (m.homeTeamId === tid || m.awayTeamId === tid)
        );
        return !!groupMatch;
      });
      const groupMatches = liveMatches.filter((m) => m.stage === "group" && m.group === match.group);
      const all = calculateStandings(groupTeamIds, groupMatches, tournament.settings, allTeams);
      const withPos = all.map((s, i) => ({ ...s, position: i + 1 }));
      return withPos.filter((s) => s.teamId === match.homeTeamId || s.teamId === match.awayTeamId);
    }
    const all = calculateStandings(tournament.teamIds, liveMatches, tournament.settings, allTeams);
    const withPos = all.map((s, i) => ({ ...s, position: i + 1 }));
    return withPos.filter((s) => s.teamId === match.homeTeamId || s.teamId === match.awayTeamId);
  })();

  const standingsTitle = tournament?.format === "grupos" && match.group
    ? `Grupo ${String.fromCharCode(64 + match.group)}`
    : "Classificação";

  const halfTabs: { key: HalfKey; label: string }[] = [
    { key: "h1", label: "1ºT" },
    { key: "h2", label: "2ºT" },
    ...(showExtraTime ? [
      { key: "et1" as HalfKey, label: "Prorr 1" },
      { key: "et2" as HalfKey, label: "Prorr 2" },
    ] : []),
  ];

  // Display stats (from state)
  const displayStats = matchStats;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onCancel}>
      <div
        className="w-full max-w-2xl rounded-xl bg-card border border-border shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Teams */}
        <div className="bg-secondary/50 border-b border-border px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              <div className="w-12 h-12 flex items-center justify-center shrink-0">
                {homeTeam?.logo ? (
                  <img src={homeTeam.logo} alt="" className="w-12 h-12 object-contain" />
                ) : (
                  <Shield className="w-8 h-8 text-muted-foreground" />
                )}
              </div>
              <div>
                <p className="font-display font-bold text-foreground text-sm">{homeTeam?.name || "Time Excluído"}</p>
                <p className="text-xs text-primary font-mono">{homeTeam?.rate?.toFixed(2) ?? "—"}</p>
                {displayStats && (
                  <CardIndicators yellowCards={displayStats.homeStats.yellowCards} redCards={displayStats.homeStats.redCards} />
                )}
              </div>
            </div>
            <span className="text-muted-foreground font-bold text-sm px-4 shrink-0">VS</span>
            <div className="flex items-center gap-3 flex-1 justify-end text-right">
              <div>
                <p className="font-display font-bold text-foreground text-sm">{awayTeam?.name || "Time Excluído"}</p>
                <p className="text-xs text-primary font-mono">{awayTeam?.rate?.toFixed(2) ?? "—"}</p>
                {displayStats && (
                  <CardIndicators yellowCards={displayStats.awayStats.yellowCards} redCards={displayStats.awayStats.redCards} />
                )}
              </div>
              <div className="w-12 h-12 flex items-center justify-center shrink-0">
                {awayTeam?.logo ? (
                  <img src={awayTeam.logo} alt="" className="w-12 h-12 object-contain" />
                ) : (
                  <Shield className="w-8 h-8 text-muted-foreground" />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Half Tabs */}
        <div className="flex items-center justify-center gap-2 py-3 border-b border-border flex-wrap">
          {halfTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => !showPenalties && setActiveHalf(tab.key)}
              className={`px-3 py-1 rounded-md text-xs font-mono font-bold transition-colors ${
                activeHalf === tab.key
                  ? "border border-primary text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label} {scores[tab.key][0]}:{scores[tab.key][1]}
            </button>
          ))}
          {showPenalties && (
            <span className="px-3 py-1 rounded-md text-xs font-mono font-bold border border-primary text-primary">
              PEN {penaltyScore("home")}:{penaltyScore("away")}
            </span>
          )}
        </div>

        {/* Score Controls */}
        {!showPenalties && (
          <>
            <div className="flex items-center justify-center gap-4 py-6 px-6">
              <div className="flex flex-col items-center gap-1">
                <button onClick={() => increment(0)} className="p-1 text-primary hover:text-primary/80 transition-colors">
                  <ChevronUp className="w-8 h-8" strokeWidth={3} />
                </button>
                <button onClick={() => decrement(0)} className="p-1 text-destructive hover:text-destructive/80 transition-colors">
                  <ChevronDown className="w-8 h-8" strokeWidth={3} />
                </button>
              </div>
              <div className="w-28 h-28 rounded-xl bg-secondary border border-border flex items-center justify-center">
                <span className="text-6xl font-bold text-foreground font-display">{accumulatedHome}</span>
              </div>
              <div className="w-28 h-28 rounded-xl bg-secondary border border-border flex items-center justify-center">
                <span className="text-6xl font-bold text-foreground font-display">{accumulatedAway}</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <button onClick={() => increment(1)} className="p-1 text-primary hover:text-primary/80 transition-colors">
                  <ChevronUp className="w-8 h-8" strokeWidth={3} />
                </button>
                <button onClick={() => decrement(1)} className="p-1 text-destructive hover:text-destructive/80 transition-colors">
                  <ChevronDown className="w-8 h-8" strokeWidth={3} />
                </button>
              </div>
            </div>

            {canSimulate && (
              <div className="px-6 pb-4">
                <button
                  onClick={handleSimulate}
                  className="w-full max-w-xs mx-auto block py-3 rounded-xl bg-primary/20 text-primary font-display font-bold text-lg hover:bg-primary/30 transition-colors"
                >
                  Simular {halfTabs.find((t) => t.key === activeHalf)?.label}
                </button>
              </div>
            )}
          </>
        )}

        {/* Penalties */}
        {showPenalties && (
          <div className="px-6 py-6 space-y-4">
            <p className="text-sm font-display font-bold text-foreground text-center">Disputa de Pênaltis</p>
            <div className="space-y-3">
              <div className="flex items-center gap-2 justify-center">
                <span className="text-xs text-muted-foreground w-16 text-right truncate">{homeTeam?.abbreviation || homeTeam?.shortName}</span>
                <div className="flex gap-1.5 min-w-[140px]">
                  {penalties.home.map((p, i) => (
                    <button key={i} onClick={() => togglePenalty("home", i)}
                      className={`w-7 h-7 rounded-full border-2 transition-all ${p === true ? "bg-primary border-primary" : "bg-destructive border-destructive"}`}
                    />
                  ))}
                </div>
                <span className="text-lg font-bold text-foreground w-8 text-center">{penaltyScore("home")}</span>
              </div>
              <div className="flex items-center gap-2 justify-center">
                <span className="text-xs text-muted-foreground w-16 text-right truncate">{awayTeam?.abbreviation || awayTeam?.shortName}</span>
                <div className="flex gap-1.5 min-w-[140px]">
                  {penalties.away.map((p, i) => (
                    <button key={i} onClick={() => togglePenalty("away", i)}
                      className={`w-7 h-7 rounded-full border-2 transition-all ${p === true ? "bg-primary border-primary" : "bg-destructive border-destructive"}`}
                    />
                  ))}
                </div>
                <span className="text-lg font-bold text-foreground w-8 text-center">{penaltyScore("away")}</span>
              </div>
            </div>
            {!penaltyFinished && (
              <div className="flex justify-center">
                <button onClick={handleShootPenalty}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-display font-bold text-sm hover:bg-primary/90 transition-colors"
                >
                  <Play className="w-4 h-4" />
                  Cobrar ({penaltyIndex % 2 === 0 ? homeTeam?.abbreviation || "Casa" : awayTeam?.abbreviation || "Fora"})
                </button>
              </div>
            )}
            {penaltyFinished && (
              <p className="text-xs text-center text-primary font-bold">
                {penaltyScore("home") > penaltyScore("away")
                  ? `${homeTeam?.name || "Casa"} vence nos pênaltis!`
                  : `${awayTeam?.name || "Fora"} vence nos pênaltis!`}
              </p>
            )}
          </div>
        )}

        {/* Match Statistics - toggled by button */}
        {showStats && displayStats && (
          <div className="px-6 py-4 border-t border-border space-y-3">
            <p className="text-sm font-display font-bold text-foreground text-center">Estatísticas da Partida</p>
            <div className="space-y-2.5">
              <StatRow label="Posse de Bola" homeValue={displayStats.homeStats.possession} awayValue={displayStats.awayStats.possession} format="percent" />
              <StatRow label="Gols Esperados (xG)" homeValue={displayStats.homeStats.expectedGoals} awayValue={displayStats.awayStats.expectedGoals} format="decimal" />
              <StatRow label="Finalizações" homeValue={displayStats.homeStats.shots} awayValue={displayStats.awayStats.shots} />
              <StatRow label="Finalizações ao Gol" homeValue={displayStats.homeStats.shotsOnTarget} awayValue={displayStats.awayStats.shotsOnTarget} />
              <StatRow label="Escanteios" homeValue={displayStats.homeStats.corners} awayValue={displayStats.awayStats.corners} />
              <StatRow label="Faltas" homeValue={displayStats.homeStats.fouls} awayValue={displayStats.awayStats.fouls} />
              <StatRow label="Cartões Amarelos" homeValue={displayStats.homeStats.yellowCards} awayValue={displayStats.awayStats.yellowCards} />
              <StatRow label="Cartões Vermelhos" homeValue={displayStats.homeStats.redCards} awayValue={displayStats.awayStats.redCards} />
              <StatRow label="Impedimentos" homeValue={displayStats.homeStats.offsides} awayValue={displayStats.awayStats.offsides} />
            </div>
          </div>
        )}

        {/* Standings */}
        {bottomStandings.length > 0 && (
          <div className="px-6 pb-4">
            <p className="text-xs font-display font-bold text-muted-foreground mb-2">{standingsTitle}</p>
            <div className="rounded-lg border border-border overflow-hidden max-h-48 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0">
                  <tr className="bg-secondary/50 text-muted-foreground">
                    <th className="py-1.5 px-2 text-left w-8">#</th>
                    <th className="py-1.5 px-2 text-left">Time</th>
                    <th className="py-1.5 px-2 text-center w-8">P</th>
                    <th className="py-1.5 px-2 text-center w-8">J</th>
                    <th className="py-1.5 px-2 text-center w-8">V</th>
                    <th className="py-1.5 px-2 text-center w-8">E</th>
                    <th className="py-1.5 px-2 text-center w-8">D</th>
                    <th className="py-1.5 px-2 text-center w-8">GP</th>
                    <th className="py-1.5 px-2 text-center w-8">GC</th>
                    <th className="py-1.5 px-2 text-center w-8">SG</th>
                  </tr>
                </thead>
                <tbody>
                  {bottomStandings.map((row) => {
                    const team = allTeams?.find((t) => t.id === row.teamId);
                    const isMatchTeam = row.teamId === match.homeTeamId || row.teamId === match.awayTeamId;
                    const promo = tournament?.settings?.promotions?.find((p) => p.position === row.position);
                    return (
                      <tr key={row.teamId} className={`border-t border-border/50 ${isMatchTeam ? "bg-primary/5 font-semibold" : ""}`}>
                        <td className="py-1.5 px-2 text-muted-foreground" style={promo ? { borderLeft: `3px solid ${promo.color}` } : undefined}>
                          {row.position}
                        </td>
                        <td className="py-1.5 px-2">
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 flex items-center justify-center shrink-0">
                              {team?.logo ? (
                                <img src={team.logo} alt="" className="w-5 h-5 object-contain" />
                              ) : (
                                <Shield className="w-3.5 h-3.5 text-muted-foreground" />
                              )}
                            </div>
                            <span className="text-foreground truncate">{team?.abbreviation || team?.shortName || team?.name}</span>
                          </div>
                        </td>
                        <td className="py-1.5 px-2 text-center font-bold text-foreground">{row.points}</td>
                        <td className="py-1.5 px-2 text-center text-muted-foreground">{row.played}</td>
                        <td className="py-1.5 px-2 text-center text-muted-foreground">{row.wins}</td>
                        <td className="py-1.5 px-2 text-center text-muted-foreground">{row.draws}</td>
                        <td className="py-1.5 px-2 text-center text-muted-foreground">{row.losses}</td>
                        <td className="py-1.5 px-2 text-center text-muted-foreground">{row.goalsFor}</td>
                        <td className="py-1.5 px-2 text-center text-muted-foreground">{row.goalsAgainst}</td>
                        <td className="py-1.5 px-2 text-center text-muted-foreground">{row.goalDifference}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-border px-6 py-4">
          <button onClick={onCancel} className="text-destructive font-display font-bold text-sm hover:text-destructive/80 transition-colors">
            Cancelar
          </button>
          <button
            onClick={() => setShowStats((prev) => !prev)}
            className={`font-display font-bold text-sm transition-colors ${showStats ? "text-primary" : "text-foreground hover:text-foreground/80"}`}
          >
            Estatísticas
          </button>
          <button onClick={handleFinish} className="text-primary font-display font-bold text-sm hover:text-primary/80 transition-colors">
            Finalizar
          </button>
        </div>
      </div>
    </div>
  );
}
