import { useState, useEffect, useCallback } from "react";
import { Match, Team, Tournament } from "@/types/tournament";
import { Shield, ChevronUp, ChevronDown, Play } from "lucide-react";
import { calculateStandings, StandingRow } from "@/lib/standings";
import { simulateHalf, generateMatchStats, MatchStats } from "@/lib/simulation";

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
  // ~75% chance to score
  return Math.random() < 0.75;
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
  // Leg1 of a home-away pair should NOT trigger extra time/penalties - only leg2 or single matches
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

    return {
      aggregateHome,
      aggregateAway,
      isAggregateTied: aggregateHome === aggregateAway,
      awayGoalsBreakTie,
    };
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
  const [matchStats, setMatchStats] = useState<MatchStats | null>(null);
  const [activeTab, setActiveTab] = useState<"score" | "stats">("score");

  // Bug fix #10: Pre-load existing scores when opening a played match for editing
  useEffect(() => {
    if (match.played) {
      // Distribute existing score into h1/h2 halves (best approximation)
      // We store the full score in h1 and leave h2 as 0, so the total is correct
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
      // Mark halves as simulated so the UI shows the loaded scores
      setSimulatedHalves(new Set(["h1", "h2"]));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match.id]); // Re-run only when a different match is opened

  // After h2 is simulated in knockout: auto trigger extra time or penalties
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

  // After et2 is simulated in knockout: auto trigger penalties if still drawn
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
      if (activeHalf === "et1" || activeHalf === "et2") {
        setActiveHalf("h2");
      }
    }

    if (showPenalties) {
      setShowPenalties(false);
      setPenalties({ home: [], away: [] });
      setPenaltyIndex(0);
      setPenaltyFinished(false);
    }
  }, [isKnockout, requiresDeciderAfterRegular, showExtraTime, showPenalties, activeHalf]);

  // Accumulated scores up to and including the active half (visual only)
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
    const newSimulated = new Set(simulatedHalves).add(activeHalf);
    setSimulatedHalves(newSimulated);

    if (activeHalf === "h1") setActiveHalf("h2");
    else if (activeHalf === "et1") setActiveHalf("et2");

    // Generate stats when both regular halves are simulated
    const willHaveH1 = newSimulated.has("h1") || activeHalf === "h1";
    const willHaveH2 = newSimulated.has("h2") || activeHalf === "h2";
    if (willHaveH1 && willHaveH2) {
      // Calculate total goals including the just-simulated half
      const updatedScores = { ...scores, [activeHalf]: [h, a] as [number, number] };
      const tHome = updatedScores.h1[0] + updatedScores.h2[0] + (showExtraTime ? updatedScores.et1[0] + updatedScores.et2[0] : 0);
      const tAway = updatedScores.h1[1] + updatedScores.h2[1] + (showExtraTime ? updatedScores.et1[1] + updatedScores.et2[1] : 0);
      setMatchStats(generateMatchStats(homeRate, awayRate, tHome, tAway));
    }
  };

  const allRequiredSimulated = showExtraTime
    ? simulatedHalves.has("h1") && simulatedHalves.has("h2") && simulatedHalves.has("et1") && simulatedHalves.has("et2")
    : simulatedHalves.has("h1") && simulatedHalves.has("h2");
  const canSimulate = !showPenalties && !simulatedHalves.has(activeHalf) && !allRequiredSimulated;

  // Penalty shootout: one-by-one
  const penaltyScore = (side: "home" | "away") => penalties[side].filter((p) => p === true).length;

  const handleShootPenalty = useCallback(() => {
    if (penaltyFinished) return;

    const isHomeKick = penaltyIndex % 2 === 0;
    const side = isHomeKick ? "home" : "away";
    const result = simulatePenaltyKick();

    setPenalties((prev) => ({
      ...prev,
      [side]: [...prev[side], result],
    }));
    setPenaltyIndex((i) => i + 1);
  }, [penaltyIndex, penaltyFinished]);

  // Check if penalties are decided
  useEffect(() => {
    if (!showPenalties || penaltyFinished) return;

    const homeKicks = penalties.home.length;
    const awayKicks = penalties.away.length;
    const homeScore = penaltyScore("home");
    const awayScore = penaltyScore("away");
    const maxRound = Math.max(homeKicks, awayKicks);

    // Both have equal kicks and we're past 5 rounds each
    if (homeKicks === awayKicks && homeKicks >= 5) {
      if (homeScore !== awayScore) {
        setPenaltyFinished(true);
        return;
      }
    }

    // During first 5: check if it's mathematically decided
    if (homeKicks === awayKicks && homeKicks <= 5 && homeKicks >= 1) {
      const remainingHome = Math.max(5 - homeKicks, 0);
      const remainingAway = Math.max(5 - awayKicks, 0);
      // Can't catch up
      if (homeScore + remainingHome < awayScore) { setPenaltyFinished(true); return; }
      if (awayScore + remainingAway < homeScore) { setPenaltyFinished(true); return; }
    }
  }, [penalties, showPenalties, penaltyFinished]);

  const togglePenalty = (side: "home" | "away", index: number) => {
    setPenalties((prev) => {
      const arr = [...prev[side]];
      if (arr[index] === true) arr[index] = false;
      else arr[index] = true;
      return { ...prev, [side]: arr };
    });
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

    if (showPenalties && penaltyScore("home") === penaltyScore("away")) {
      return;
    }

    onSave({
      ...match,
      homeScore: regularHome,
      awayScore: regularAway,
      homeExtraTime: showExtraTime ? etHome : undefined,
      awayExtraTime: showExtraTime ? etAway : undefined,
      homePenalties: showPenalties ? penaltyScore("home") : undefined,
      awayPenalties: showPenalties ? penaltyScore("away") : undefined,
      played: true,
    });
  };

  // Build a live version of matches that includes the current popup score
  const liveMatches = (() => {
    if (!tournament) return [];
    const regularHome = scores.h1[0] + scores.h2[0];
    const regularAway = scores.h1[1] + scores.h2[1];
    const liveMatch: Match = {
      ...match,
      homeScore: regularHome,
      awayScore: regularAway,
      played: true,
    };
    return tournament.matches.map((m) => (m.id === match.id ? liveMatch : m));
  })();

  // Bottom standings logic
  const bottomStandings: (StandingRow & { position: number })[] = (() => {
    if (!tournament || !allTeams) return [];
    // Mata-mata puro: nada
    if (tournament.format === "mata-mata") return [];
    // Knockout stage of grupos: nada
    if (match.stage === "knockout") return [];

    if (tournament.format === "grupos" && match.group) {
      // Show only teams from this group
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

    // Liga or Suíço: full standings, filter to match teams only
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
                {matchStats && (matchStats.yellowCards[0] > 0 || matchStats.redCards[0] > 0) && (
                  <div className="flex items-center gap-1 mt-1">
                    {Array.from({ length: matchStats.yellowCards[0] }).map((_, i) => (
                      <div key={`hy${i}`} className="w-3 h-4 rounded-[1px] bg-yellow-400" />
                    ))}
                    {Array.from({ length: matchStats.redCards[0] }).map((_, i) => (
                      <div key={`hr${i}`} className="w-3 h-4 rounded-[1px] bg-red-500" />
                    ))}
                  </div>
                )}
              </div>
            </div>
            <span className="text-muted-foreground font-bold text-sm px-4 shrink-0">VS</span>
            <div className="flex items-center gap-3 flex-1 justify-end text-right">
              <div>
                <p className="font-display font-bold text-foreground text-sm">{awayTeam?.name || "Time Excluído"}</p>
                <p className="text-xs text-primary font-mono">{awayTeam?.rate?.toFixed(2) ?? "—"}</p>
                {matchStats && (matchStats.yellowCards[1] > 0 || matchStats.redCards[1] > 0) && (
                  <div className="flex items-center gap-1 mt-1 justify-end">
                    {Array.from({ length: matchStats.yellowCards[1] }).map((_, i) => (
                      <div key={`ay${i}`} className="w-3 h-4 rounded-[1px] bg-yellow-400" />
                    ))}
                    {Array.from({ length: matchStats.redCards[1] }).map((_, i) => (
                      <div key={`ar${i}`} className="w-3 h-4 rounded-[1px] bg-red-500" />
                    ))}
                  </div>
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
        {activeTab === "score" && (
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
        )}

        {/* Score Controls (hidden during penalties) */}
        {activeTab === "score" && !showPenalties && (
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

        {/* Penalties - One by One */}
        {activeTab === "score" && showPenalties && (
          <div className="px-6 py-6 space-y-4">
            <p className="text-sm font-display font-bold text-foreground text-center">Disputa de Pênaltis</p>

            <div className="space-y-3">
              {/* Home kicks */}
              <div className="flex items-center gap-2 justify-center">
                <span className="text-xs text-muted-foreground w-16 text-right truncate">{homeTeam?.abbreviation || homeTeam?.shortName}</span>
                <div className="flex gap-1.5 min-w-[140px]">
                  {penalties.home.map((p, i) => (
                    <button
                      key={i}
                      onClick={() => togglePenalty("home", i)}
                      className={`w-7 h-7 rounded-full border-2 transition-all ${
                        p === true
                          ? "bg-primary border-primary"
                          : "bg-destructive border-destructive"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-lg font-bold text-foreground w-8 text-center">{penaltyScore("home")}</span>
              </div>

              {/* Away kicks */}
              <div className="flex items-center gap-2 justify-center">
                <span className="text-xs text-muted-foreground w-16 text-right truncate">{awayTeam?.abbreviation || awayTeam?.shortName}</span>
                <div className="flex gap-1.5 min-w-[140px]">
                  {penalties.away.map((p, i) => (
                    <button
                      key={i}
                      onClick={() => togglePenalty("away", i)}
                      className={`w-7 h-7 rounded-full border-2 transition-all ${
                        p === true
                          ? "bg-primary border-primary"
                          : "bg-destructive border-destructive"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-lg font-bold text-foreground w-8 text-center">{penaltyScore("away")}</span>
              </div>
            </div>

            {/* Shoot button */}
            {!penaltyFinished && (
              <div className="flex justify-center">
                <button
                  onClick={handleShootPenalty}
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

        {/* Standings Section */}
        {activeTab === "score" && bottomStandings.length > 0 && (
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
                        <td
                          className="py-1.5 px-2 text-muted-foreground"
                          style={promo ? { borderLeft: `3px solid ${promo.color}` } : undefined}
                        >
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

        {/* Stats Panel */}
        {activeTab === "stats" && matchStats && (
          <div className="px-6 py-4 space-y-3">
            <p className="text-xs font-display font-bold text-muted-foreground text-center mb-3">Estatísticas da Partida</p>
            {[
              { label: "Posse de Bola", home: `${matchStats.possession[0]}%`, away: `${matchStats.possession[1]}%`, homeVal: matchStats.possession[0], awayVal: matchStats.possession[1] },
              { label: "Gols Esperados (xG)", home: matchStats.xG[0].toFixed(2), away: matchStats.xG[1].toFixed(2), homeVal: matchStats.xG[0], awayVal: matchStats.xG[1] },
              { label: "Finalizações", home: matchStats.shots[0], away: matchStats.shots[1], homeVal: matchStats.shots[0], awayVal: matchStats.shots[1] },
              { label: "Finalizações ao Gol", home: matchStats.shotsOnTarget[0], away: matchStats.shotsOnTarget[1], homeVal: matchStats.shotsOnTarget[0], awayVal: matchStats.shotsOnTarget[1] },
              { label: "Faltas", home: matchStats.fouls[0], away: matchStats.fouls[1], homeVal: matchStats.fouls[0], awayVal: matchStats.fouls[1] },
              { label: "Escanteios", home: matchStats.corners[0], away: matchStats.corners[1], homeVal: matchStats.corners[0], awayVal: matchStats.corners[1] },
              { label: "Cartões Amarelos", home: matchStats.yellowCards[0], away: matchStats.yellowCards[1], homeVal: matchStats.yellowCards[0], awayVal: matchStats.yellowCards[1] },
              { label: "Cartões Vermelhos", home: matchStats.redCards[0], away: matchStats.redCards[1], homeVal: matchStats.redCards[0], awayVal: matchStats.redCards[1] },
              { label: "Impedimentos", home: matchStats.offsides[0], away: matchStats.offsides[1], homeVal: matchStats.offsides[0], awayVal: matchStats.offsides[1] },
            ].map((stat) => {
              const total = stat.homeVal + stat.awayVal || 1;
              const homePercent = (stat.homeVal / total) * 100;
              const awayPercent = (stat.awayVal / total) * 100;
              return (
                <div key={stat.label} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-foreground w-10 text-left">{stat.home}</span>
                    <span className="text-muted-foreground text-center flex-1">{stat.label}</span>
                    <span className="font-bold text-foreground w-10 text-right">{stat.away}</span>
                  </div>
                  <div className="flex h-1.5 gap-1">
                    <div className="flex-1 bg-secondary rounded-full overflow-hidden flex justify-end">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${homePercent}%` }}
                      />
                    </div>
                    <div className="flex-1 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary/60 transition-all"
                        style={{ width: `${awayPercent}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === "stats" && !matchStats && (
          <div className="px-6 py-8 text-center">
            <p className="text-sm text-muted-foreground">Simule a partida para gerar as estatísticas</p>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-border px-6 py-4">
          <button onClick={onCancel} className="text-destructive font-display font-bold text-sm hover:text-destructive/80 transition-colors">
            Cancelar
          </button>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveTab("score")}
              className={`font-display font-bold text-sm transition-colors ${activeTab === "score" ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
            >
              Placar
            </button>
            <button
              onClick={() => setActiveTab("stats")}
              className={`font-display font-bold text-sm transition-colors ${activeTab === "stats" ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
            >
              Estatísticas
            </button>
          </div>
          <button onClick={handleFinish} className="text-primary font-display font-bold text-sm hover:text-primary/80 transition-colors">
            Finalizar
          </button>
        </div>
      </div>
    </div>
  );
}
