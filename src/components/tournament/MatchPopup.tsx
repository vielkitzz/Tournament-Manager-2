import { useState, useEffect, useCallback, useRef } from "react";
import { Match, Team, Tournament, TeamMatchStats, Player, MatchEvent } from "@/types/tournament";
import { Shield, ChevronUp, ChevronDown, Play, Clock, Zap, Pause, FastForward, ArrowLeftRight, Flag, AlertTriangle, Target } from "lucide-react";
import { calculateStandings, StandingRow } from "@/lib/standings";
import {
  simulateHalf,
  generateMatchStats,
  generateMinuteByMinuteEvents,
  getSuspendedPlayerIds,
} from "@/lib/simulation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import SoccerBallIcon from "@/components/icons/SoccerBallIcon";
import YellowCardIcon from "@/components/icons/YellowCardIcon";
import RedCardIcon from "@/components/icons/RedCardIcon";
import InjuryIcon from "@/components/icons/InjuryIcon";
import HighlightIcon from "@/components/icons/HighlightIcon";

interface MatchPopupProps {
  match: Match;
  homeTeam?: Team;
  awayTeam?: Team;
  rateInfluence: boolean;
  tournament?: Tournament;
  allTeams?: Team[];
  allPlayers?: Player[];
  onSave: (updated: Match) => void;
  onPersist?: (updated: Match) => void;
  onCancel: () => void;
}

type HalfKey = "h1" | "h2" | "et1" | "et2";

function simulatePenaltyKick(): boolean {
  return Math.random() < 0.75;
}

function StatRow({
  label,
  homeValue,
  awayValue,
  format,
}: {
  label: string;
  homeValue: number;
  awayValue: number;
  format?: "decimal" | "percent" | "integer";
}) {
  const total = homeValue + awayValue;
  const homePercent = total > 0 ? (homeValue / total) * 100 : 0;
  const awayPercent = total > 0 ? (awayValue / total) * 100 : 0;

  const formatValue = (v: number) => {
    if (format === "decimal") return v.toFixed(2);
    if (format === "percent") return `${v}%`;
    return String(v);
  };

  const homeBetter = homeValue > awayValue;
  const awayBetter = awayValue > homeValue;
  const homeBarClass = homeBetter ? "bg-primary" : awayBetter ? "bg-primary/35" : "bg-primary/60";
  const awayBarClass = awayBetter ? "bg-primary" : homeBetter ? "bg-primary/35" : "bg-primary/60";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className={`text-xs font-bold ${homeBetter ? "text-foreground" : "text-muted-foreground"}`}>
          {formatValue(homeValue)}
        </span>
        <span className={`text-xs font-bold ${awayBetter ? "text-foreground" : "text-muted-foreground"}`}>
          {formatValue(awayValue)}
        </span>
      </div>
      <p className="text-[11px] font-medium text-muted-foreground text-center">{label}</p>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1.5">
        <div className="h-2 rounded-full bg-muted overflow-hidden flex justify-end">
          <div
            className={`h-full rounded-full transition-[width] duration-500 ${homeBarClass}`}
            style={{ width: `${homePercent}%` }}
          />
        </div>
        <div className="h-3 w-px bg-border" />
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-[width] duration-500 ${awayBarClass}`}
            style={{ width: `${awayPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
}

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

function EventRow({
  event,
  homeTeamId,
  players,
}: {
  key?: string | number;
  event: MatchEvent;
  homeTeamId: string;
  players: Player[];
}) {
  const isHome = event.teamId === homeTeamId;

  const IconComponent = {
    goal: SoccerBallIcon,
    yellow_card: YellowCardIcon,
    red_card: RedCardIcon,
    injury: InjuryIcon,
    highlight: HighlightIcon,
    substitution: ArrowLeftRight,
    offside: Flag,
    foul: AlertTriangle,
    shot: Target,
  }[event.type];

  const formatEventText = (text: string) => {
    return text.split(/\*\*(.*?)\*\*/g).map((part, index) => {
      if (index % 2 === 1) {
        return (
          <span key={index} className="text-primary font-bold">
            {part}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <div className={`flex items-start gap-2 py-1.5 ${isHome ? "" : "flex-row-reverse text-right"}`}>
      <span className="text-[10px] font-mono text-muted-foreground w-8 shrink-0 text-center pt-0.5">
        {event.minute}'
      </span>
      <span className="shrink-0 flex items-center justify-center w-4 h-4 pt-0.5">
        {IconComponent ? <IconComponent size={14} /> : "•"}
      </span>
      <span className="text-xs text-foreground leading-tight">{formatEventText(event.text)}</span>
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
  allPlayers,
  onSave,
  onPersist,
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
  const [bottomTab, setBottomTab] = useState<"stats" | "events">("stats");
  const [showBottomPanel, setShowBottomPanel] = useState(false);

  // Live simulation state
  const [isLiveSimulating, setIsLiveSimulating] = useState(false);
  const [liveMinute, setLiveMinute] = useState(0);
  const [liveEvents, setLiveEvents] = useState<MatchEvent[]>([]);
  const [liveFinished, setLiveFinished] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [simSpeed, setSimSpeed] = useState(1); // 1x, 2x, 4x
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const eventsRef = useRef<HTMLDivElement>(null);

  // Players for each team
  const homePlayers = (allPlayers || []).filter((p) => p.teamId === match.homeTeamId);
  const awayPlayers = (allPlayers || []).filter((p) => p.teamId === match.awayTeamId);
  const canLiveSimulate = homePlayers.length >= 11 && awayPlayers.length >= 11;

  const setHalfScore = (half: HalfKey, side: 0 | 1, value: number) => {
    setScores((prev) => ({ ...prev, [half]: side === 0 ? [value, prev[half][1]] : [prev[half][0], value] }));
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

  // Compute progressive live score from visible events
  const liveGoalsHome = isLiveSimulating
    ? liveEvents.filter((e) => e.type === "goal" && e.teamId === match.homeTeamId && e.minute <= liveMinute).length
    : 0;
  const liveGoalsAway = isLiveSimulating
    ? liveEvents.filter((e) => e.type === "goal" && e.teamId === match.awayTeamId && e.minute <= liveMinute).length
    : 0;

  // Progressive card counts during live sim
  const liveYellowHome = isLiveSimulating
    ? liveEvents.filter((e) => e.type === "yellow_card" && e.teamId === match.homeTeamId && e.minute <= liveMinute)
        .length
    : 0;
  const liveYellowAway = isLiveSimulating
    ? liveEvents.filter((e) => e.type === "yellow_card" && e.teamId === match.awayTeamId && e.minute <= liveMinute)
        .length
    : 0;
  const liveRedHome = isLiveSimulating
    ? liveEvents.filter((e) => e.type === "red_card" && e.teamId === match.homeTeamId && e.minute <= liveMinute).length
    : 0;
  const liveRedAway = isLiveSimulating
    ? liveEvents.filter((e) => e.type === "red_card" && e.teamId === match.awayTeamId && e.minute <= liveMinute).length
    : 0;

  // Current half label during live sim
  const [addedTime1, setAddedTime1] = useState(0);
  const [addedTime2, setAddedTime2] = useState(0);

  const liveHalfLabel = liveMinute <= 45 + addedTime1 ? "1º Tempo" : "2º Tempo";

  useEffect(() => {
    if (match.played) {
      const h1Home = match.homeScoreH1 ?? match.homeScore;
      const h1Away = match.awayScoreH1 ?? match.awayScore;
      const h2Home = match.homeScoreH2 ?? 0;
      const h2Away = match.awayScoreH2 ?? 0;
      const et1Home = match.homeScoreET1 ?? match.homeExtraTime ?? 0;
      const et1Away = match.awayScoreET1 ?? match.awayExtraTime ?? 0;
      const et2Home = match.homeScoreET2 ?? 0;
      const et2Away = match.awayScoreET2 ?? 0;
      setScores({ h1: [h1Home, h1Away], h2: [h2Home, h2Away], et1: [et1Home, et1Away], et2: [et2Home, et2Away] });
      if (isKnockout && (match.homeExtraTime !== undefined || match.awayExtraTime !== undefined)) {
        setShowExtraTime(true);
        setActiveHalf("et1");
      }
      if (isKnockout && match.homePenalties !== undefined && match.awayPenalties !== undefined) {
        setShowPenalties(true);
        const homeKicks = Array.from(
          { length: match.homePenalties + (match.awayPenalties - match.homePenalties > 0 ? 1 : 0) },
          (_, i) => i < match.homePenalties,
        );
        const awayKicks = Array.from(
          { length: match.awayPenalties + (match.homePenalties - match.awayPenalties > 0 ? 1 : 0) },
          (_, i) => i < match.awayPenalties,
        );
        setPenalties({ home: homeKicks, away: awayKicks });
        setPenaltyFinished(true);
      }
      setSimulatedHalves(new Set(["h1", "h2"]));

      if (match.homeStats && match.awayStats) {
        setMatchStats({ homeStats: match.homeStats, awayStats: match.awayStats });
      } else {
        const homeRate = rateInfluence && homeTeam ? homeTeam.rate : 3;
        const awayRate = rateInfluence && awayTeam ? awayTeam.rate : 3;
        const totalGoalsHome = match.homeScore + (match.homeExtraTime || 0);
        const totalGoalsAway = match.awayScore + (match.awayExtraTime || 0);
        const stats = generateMatchStats(homeRate, awayRate, totalGoalsHome, totalGoalsAway);
        setMatchStats(stats);
        onPersist?.({ ...match, homeStats: stats.homeStats, awayStats: stats.awayStats });
      }

      if (match.events && match.events.length > 0) {
        setLiveEvents(match.events);
        setLiveFinished(true);
        setShowBottomPanel(true);
      } else if (match.homeStats) {
        setShowBottomPanel(true);
      }
    } else {
      setMatchStats(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match.id]);

  // Live simulation clock with speed support
  useEffect(() => {
    if (!isLiveSimulating || isPaused) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }
    if (intervalRef.current) clearInterval(intervalRef.current);
    const baseInterval = 200; // ~18 seconds at 1x (reduced by 50%)
    const interval = baseInterval / simSpeed;
    intervalRef.current = setInterval(() => {
      setLiveMinute((prev) => {
        const totalMatchTime = 90 + addedTime2;
        if (prev >= totalMatchTime) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          setLiveFinished(true);
          setIsLiveSimulating(false);
          return totalMatchTime;
        }
        return prev + 1;
      });
    }, interval);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isLiveSimulating, isPaused, simSpeed]);

  // Auto-scroll events
  useEffect(() => {
    if (eventsRef.current) {
      eventsRef.current.scrollTop = eventsRef.current.scrollHeight;
    }
  }, [liveMinute]);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const hasScoreChanges =
    regularHome !== match.homeScore ||
    regularAway !== match.awayScore ||
    (showExtraTime ? etHome : undefined) !== match.homeExtraTime ||
    (showExtraTime ? etAway : undefined) !== match.awayExtraTime;

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
    if (!showPenalties) setShowPenalties(true);
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
    const isET = activeHalf === "et1" || activeHalf === "et2";
    const [h, a] = simulateHalf(homeRate, awayRate, isET);
    setHalfScore(activeHalf, 0, h);
    setHalfScore(activeHalf, 1, a);
    setSimulatedHalves((prev) => new Set(prev).add(activeHalf));
    if (activeHalf === "h1") setActiveHalf("h2");
    else if (activeHalf === "et1") setActiveHalf("et2");
  };

  const allRequiredSimulated = showExtraTime
    ? simulatedHalves.has("h1") && simulatedHalves.has("h2") && simulatedHalves.has("et1") && simulatedHalves.has("et2")
    : simulatedHalves.has("h1") && simulatedHalves.has("h2");
  const canSimulate = !showPenalties && !simulatedHalves.has(activeHalf) && !allRequiredSimulated && !isLiveSimulating;

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
      if (homeScore !== awayScore) {
        setPenaltyFinished(true);
        return;
      }
    }
    if (homeKicks === awayKicks && homeKicks <= 5 && homeKicks >= 1) {
      const remainingHome = Math.max(5 - homeKicks, 0);
      const remainingAway = Math.max(5 - awayKicks, 0);
      if (homeScore + remainingHome < awayScore) {
        setPenaltyFinished(true);
        return;
      }
      if (awayScore + remainingAway < homeScore) {
        setPenaltyFinished(true);
        return;
      }
    }
  }, [penalties, showPenalties, penaltyFinished]);

  const togglePenalty = (side: "home" | "away", index: number) => {
    setPenalties((prev) => {
      const arr = [...prev[side]];
      arr[index] = !arr[index];
      return { ...prev, [side]: arr };
    });
  };

  const ensureStats = (): { homeStats: TeamMatchStats; awayStats: TeamMatchStats } => {
    if (matchStats && !hasScoreChanges) return matchStats;
    const homeRate = rateInfluence && homeTeam ? homeTeam.rate : 3;
    const awayRate = rateInfluence && awayTeam ? awayTeam.rate : 3;
    const stats = generateMatchStats(homeRate, awayRate, totalHome, totalAway);
    setMatchStats(stats);
    return stats;
  };

  // Generate available players (filtering suspended)
  const getAvailablePlayers = () => {
    let availableHome = homePlayers;
    let availableAway = awayPlayers;
    if (tournament) {
      const suspendedHome = getSuspendedPlayerIds(tournament.matches, match.round, homeTeam!.id, tournament.settings);
      const suspendedAway = getSuspendedPlayerIds(tournament.matches, match.round, awayTeam!.id, tournament.settings);
      availableHome = homePlayers.filter((p) => !suspendedHome.has(p.id));
      availableAway = awayPlayers.filter((p) => !suspendedAway.has(p.id));
      if (availableHome.length < 11) availableHome = homePlayers.slice(0, 11);
      if (availableAway.length < 11) availableAway = awayPlayers.slice(0, 11);
    }
    return { availableHome, availableAway };
  };

  // Handle minute-by-minute live simulation
  const handleLiveSimulate = () => {
    if (!homeTeam || !awayTeam || !canLiveSimulate) return;

    const homeRate = rateInfluence ? homeTeam.rate : 3;
    const awayRate = rateInfluence ? awayTeam.rate : 3;
    const [h1h, h1a] = simulateHalf(homeRate, awayRate, false, 0.5);
    const goalDiff = h1h - h1a;
    let momentum = 0.5;
    if (goalDiff > 1) momentum = 0.7;
    else if (goalDiff < -1) momentum = 0.3;
    else if (goalDiff > 0) momentum = 0.6;
    else if (goalDiff < 0) momentum = 0.4;
    const [h2h, h2a] = simulateHalf(homeRate, awayRate, false, momentum);
    setScores({ h1: [h1h, h1a], h2: [h2h, h2a], et1: [0, 0], et2: [0, 0] });
    setSimulatedHalves(new Set(["h1", "h2"]));
    setActiveHalf("h2");

    const totalH = h1h + h2h;
    const totalA = h1a + h2a;

    const stats = generateMatchStats(homeRate, awayRate, totalH, totalA);
    setMatchStats(stats);

    const { availableHome, availableAway } = getAvailablePlayers();

    const events = generateMinuteByMinuteEvents(
      homeTeam,
      awayTeam,
      availableHome,
      availableAway,
      stats,
      totalH,
      totalA,
    );
    // Generate added time for each half
    const at1 = Math.floor(Math.random() * 4) + 1; // 1-4 mins
    const at2 = Math.floor(Math.random() * 6) + 2; // 2-7 mins
    setAddedTime1(at1);
    setAddedTime2(at2);

    // Adjust event minutes for added time
    const adjustedEvents = events.map((evt) => {
      if (evt.minute > 45 && evt.minute <= 90) {
        // Events in 2nd half shift by addedTime1
        return { ...evt, minute: evt.minute + at1 };
      }
      return evt;
    });

    // Add period end/start events
    const periodEvents: MatchEvent[] = [
      { id: "p1-end", minute: 45 + at1, type: "highlight", teamId: "", text: "Fim do primeiro tempo!" },
      { id: "p2-start", minute: 45 + at1 + 1, type: "highlight", teamId: "", text: "Início do segundo tempo!" },
    ];

    const finalEvents = [...adjustedEvents, ...periodEvents].sort((a, b) => a.minute - b.minute);
    // Update the final whistle minute
    const finalWhistle = finalEvents.find((e) => e.text.includes("Fim de jogo"));
    if (finalWhistle) finalWhistle.minute = 90 + at1 + at2;

    setLiveEvents(finalEvents);
    setIsLiveSimulating(true);
    setLiveMinute(0);
    setLiveFinished(false);
    setIsPaused(false);
    setSimSpeed(1);
    setShowBottomPanel(true);
    setBottomTab("events");
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

    // Generate events if none exist and teams have enough players
    let finalEvents = liveEvents.length > 0 ? liveEvents : undefined;
    if (!finalEvents && canLiveSimulate && homeTeam && awayTeam) {
      const { availableHome, availableAway } = getAvailablePlayers();
      finalEvents = generateMinuteByMinuteEvents(
        homeTeam, awayTeam, availableHome, availableAway,
        stats, totalHome, totalAway,
      );
    }

    onSave({
      ...match,
      homeScore: regularHome,
      awayScore: regularAway,
      homeScoreH1: scores.h1[0],
      awayScoreH1: scores.h1[1],
      homeScoreH2: scores.h2[0],
      awayScoreH2: scores.h2[1],
      homeExtraTime: showExtraTime ? etHome : undefined,
      awayExtraTime: showExtraTime ? etAway : undefined,
      homeScoreET1: showExtraTime ? scores.et1[0] : undefined,
      awayScoreET1: showExtraTime ? scores.et1[1] : undefined,
      homeScoreET2: showExtraTime ? scores.et2[0] : undefined,
      awayScoreET2: showExtraTime ? scores.et2[1] : undefined,
      homePenalties: showPenalties ? penaltyScore("home") : undefined,
      awayPenalties: showPenalties ? penaltyScore("away") : undefined,
      homeStats: stats.homeStats,
      awayStats: stats.awayStats,
      events: finalEvents,
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
          (m) => m.stage === "group" && m.group === match.group && (m.homeTeamId === tid || m.awayTeamId === tid),
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

  const standingsTitle =
    tournament?.format === "grupos" && match.group ? `Grupo ${String.fromCharCode(64 + match.group)}` : "Classificação";

  const halfTabs: { key: HalfKey; label: string }[] = [
    { key: "h1", label: "1ºT" },
    { key: "h2", label: "2ºT" },
    ...(showExtraTime
      ? [
          { key: "et1" as HalfKey, label: "Prorr 1" },
          { key: "et2" as HalfKey, label: "Prorr 2" },
        ]
      : []),
  ];

  const displayStats = matchStats;
  const visibleEvents = isLiveSimulating ? liveEvents.filter((e) => e.minute <= liveMinute) : liveEvents;

  const hasEvents = liveEvents.length > 0 || (match.events && match.events.length > 0);

  // Display scores: during live sim show progressive, otherwise accumulated
  const displayHome = isLiveSimulating ? liveGoalsHome : accumulatedHome;
  const displayAway = isLiveSimulating ? liveGoalsAway : accumulatedAway;

  // Display cards: during live sim show progressive
  const displayYellowHome = isLiveSimulating ? liveYellowHome : (displayStats?.homeStats.yellowCards ?? 0);
  const displayYellowAway = isLiveSimulating ? liveYellowAway : (displayStats?.awayStats.yellowCards ?? 0);
  const displayRedHome = isLiveSimulating ? liveRedHome : (displayStats?.homeStats.redCards ?? 0);
  const displayRedAway = isLiveSimulating ? liveRedAway : (displayStats?.awayStats.redCards ?? 0);

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
                <CardIndicators yellowCards={displayYellowHome} redCards={displayRedHome} />
              </div>
            </div>

            {/* Live clock */}
            {isLiveSimulating && (
              <div className="flex flex-col items-center px-4">
                <div className="flex items-center gap-1.5 text-primary">
                  <Clock className="w-4 h-4 animate-pulse" />
                  <span className="text-lg font-mono font-bold">{liveMinute}'</span>
                </div>
                <span className="text-[10px] text-muted-foreground">{liveHalfLabel}</span>
              </div>
            )}

            <span
              className={`text-muted-foreground font-bold text-sm px-4 shrink-0 ${isLiveSimulating ? "hidden" : ""}`}
            >
              VS
            </span>

            <div className="flex items-center gap-3 flex-1 justify-end text-right">
              <div>
                <p className="font-display font-bold text-foreground text-sm">{awayTeam?.name || "Time Excluído"}</p>
                <p className="text-xs text-primary font-mono">{awayTeam?.rate?.toFixed(2) ?? "—"}</p>
                <CardIndicators yellowCards={displayYellowAway} redCards={displayRedAway} />
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
              onClick={() => !showPenalties && !isLiveSimulating && setActiveHalf(tab.key)}
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
        {!showPenalties && !isLiveSimulating && !liveFinished && (
          <>
            <div className="flex items-center justify-center gap-4 py-6 px-6">
              <div className="flex flex-col items-center gap-1">
                <button
                  onClick={() => increment(0)}
                  className="p-1 text-primary hover:text-primary/80 transition-colors"
                >
                  <ChevronUp className="w-8 h-8" strokeWidth={3} />
                </button>
                <button
                  onClick={() => decrement(0)}
                  className="p-1 text-destructive hover:text-destructive/80 transition-colors"
                >
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
                <button
                  onClick={() => increment(1)}
                  className="p-1 text-primary hover:text-primary/80 transition-colors"
                >
                  <ChevronUp className="w-8 h-8" strokeWidth={3} />
                </button>
                <button
                  onClick={() => decrement(1)}
                  className="p-1 text-destructive hover:text-destructive/80 transition-colors"
                >
                  <ChevronDown className="w-8 h-8" strokeWidth={3} />
                </button>
              </div>
            </div>

            {/* Simulation buttons */}
            <div className="px-6 pb-4 flex flex-col gap-2 items-center">
              {canSimulate && (
                <button
                  onClick={handleSimulate}
                  className="w-full max-w-xs py-3 rounded-xl bg-primary/20 text-primary font-display font-bold text-lg hover:bg-primary/30 transition-colors"
                >
                  Simular {halfTabs.find((t) => t.key === activeHalf)?.label}
                </button>
              )}

              {/* Minute-by-minute button - only show when both teams have enough players */}
              {!match.played && !liveFinished && !simulatedHalves.has("h1") && canLiveSimulate && (
                <button
                  onClick={handleLiveSimulate}
                  className="w-full max-w-xs py-3 rounded-xl bg-accent text-accent-foreground font-display font-bold text-sm hover:bg-accent/80 transition-colors flex items-center justify-center gap-2"
                >
                  <Zap className="w-4 h-4" />
                  Simular Minuto a Minuto
                </button>
              )}
            </div>
          </>
        )}

        {/* Live simulation score display */}
        {isLiveSimulating && (
          <div className="py-6 px-6 space-y-4">
            <div className="flex items-center justify-center gap-4">
              <div className="w-28 h-28 rounded-xl bg-secondary border border-border flex items-center justify-center">
                <span className="text-6xl font-bold text-foreground font-display">{displayHome}</span>
              </div>
              <div className="w-28 h-28 rounded-xl bg-secondary border border-border flex items-center justify-center">
                <span className="text-6xl font-bold text-foreground font-display">{displayAway}</span>
              </div>
            </div>
            {/* Speed & Pause controls */}
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setIsPaused(!isPaused)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
                  isPaused ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground hover:bg-secondary/80"
                }`}
              >
                {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                {isPaused ? "Retomar" : "Pausar"}
              </button>
              {[1, 2, 4].map((speed) => (
                <button
                  key={speed}
                  onClick={() => setSimSpeed(speed)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 ${
                    simSpeed === speed
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-foreground hover:bg-secondary/80"
                  }`}
                >
                  <FastForward className="w-3.5 h-3.5" />
                  {speed}x
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Live finished score display */}
        {liveFinished && !match.played && !isLiveSimulating && (
          <div className="flex items-center justify-center gap-4 py-6 px-6">
            <div className="w-28 h-28 rounded-xl bg-secondary border border-border flex items-center justify-center">
              <span className="text-6xl font-bold text-foreground font-display">{accumulatedHome}</span>
            </div>
            <div className="w-28 h-28 rounded-xl bg-secondary border border-border flex items-center justify-center">
              <span className="text-6xl font-bold text-foreground font-display">{accumulatedAway}</span>
            </div>
          </div>
        )}

        {/* Penalties */}
        {showPenalties && (
          <div className="px-6 py-6 space-y-4">
            <p className="text-sm font-display font-bold text-foreground text-center">Disputa de Pênaltis</p>
            <div className="space-y-3">
              <div className="flex items-center gap-2 justify-center">
                <span className="text-xs text-muted-foreground w-16 text-right truncate">
                  {homeTeam?.abbreviation || homeTeam?.shortName}
                </span>
                <div className="flex gap-1.5 min-w-[140px]">
                  {penalties.home.map((p, i) => (
                    <button
                      key={i}
                      onClick={() => togglePenalty("home", i)}
                      className={`w-7 h-7 rounded-full border-2 transition-all ${p === true ? "bg-primary border-primary" : "bg-destructive border-destructive"}`}
                    />
                  ))}
                </div>
                <span className="text-lg font-bold text-foreground w-8 text-center">{penaltyScore("home")}</span>
              </div>
              <div className="flex items-center gap-2 justify-center">
                <span className="text-xs text-muted-foreground w-16 text-right truncate">
                  {awayTeam?.abbreviation || awayTeam?.shortName}
                </span>
                <div className="flex gap-1.5 min-w-[140px]">
                  {penalties.away.map((p, i) => (
                    <button
                      key={i}
                      onClick={() => togglePenalty("away", i)}
                      className={`w-7 h-7 rounded-full border-2 transition-all ${p === true ? "bg-primary border-primary" : "bg-destructive border-destructive"}`}
                    />
                  ))}
                </div>
                <span className="text-lg font-bold text-foreground w-8 text-center">{penaltyScore("away")}</span>
              </div>
            </div>
            {!penaltyFinished && (
              <div className="flex justify-center">
                <button
                  onClick={handleShootPenalty}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-display font-bold text-sm hover:bg-primary/90 transition-colors"
                >
                  <Play className="w-4 h-4" />
                  Cobrar ({penaltyIndex % 2 === 0 ? homeTeam?.abbreviation || "Casa" : awayTeam?.abbreviation || "Fora"}
                  )
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

        {/* Bottom Tabs: Estatísticas + Eventos */}
        {showBottomPanel && (displayStats || hasEvents) && (
          <div className="border-t border-border">
            <Tabs value={bottomTab} onValueChange={(v) => setBottomTab(v as "stats" | "events")}>
              <TabsList className="w-full justify-center rounded-none border-b border-border bg-transparent h-auto p-0">
                <TabsTrigger
                  value="stats"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-2.5 text-xs font-display font-bold"
                >
                  Estatísticas
                </TabsTrigger>
                <TabsTrigger
                  value="events"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-2.5 text-xs font-display font-bold"
                >
                  Eventos
                </TabsTrigger>
              </TabsList>

              <TabsContent value="stats" className="mt-0">
                {displayStats && (
                  <div className="px-6 py-4 space-y-2.5">
                    <StatRow
                      label="Posse de Bola"
                      homeValue={displayStats.homeStats.possession}
                      awayValue={displayStats.awayStats.possession}
                      format="percent"
                    />
                    <StatRow
                      label="Gols Esperados (xG)"
                      homeValue={displayStats.homeStats.expectedGoals}
                      awayValue={displayStats.awayStats.expectedGoals}
                      format="decimal"
                    />
                    <StatRow
                      label="Finalizações"
                      homeValue={displayStats.homeStats.shots}
                      awayValue={displayStats.awayStats.shots}
                    />
                    <StatRow
                      label="Finalizações ao Gol"
                      homeValue={displayStats.homeStats.shotsOnTarget}
                      awayValue={displayStats.awayStats.shotsOnTarget}
                    />
                    <StatRow
                      label="Escanteios"
                      homeValue={displayStats.homeStats.corners}
                      awayValue={displayStats.awayStats.corners}
                    />
                    <StatRow
                      label="Faltas"
                      homeValue={displayStats.homeStats.fouls}
                      awayValue={displayStats.awayStats.fouls}
                    />
                    <StatRow
                      label="Cartões Amarelos"
                      homeValue={displayStats.homeStats.yellowCards}
                      awayValue={displayStats.awayStats.yellowCards}
                    />
                    <StatRow
                      label="Cartões Vermelhos"
                      homeValue={displayStats.homeStats.redCards}
                      awayValue={displayStats.awayStats.redCards}
                    />
                    <StatRow
                      label="Impedimentos"
                      homeValue={displayStats.homeStats.offsides}
                      awayValue={displayStats.awayStats.offsides}
                    />
                  </div>
                )}
              </TabsContent>

              <TabsContent value="events" className="mt-0">
                <div ref={eventsRef} className="px-6 py-4 max-h-64 overflow-y-auto">
                  {visibleEvents.length > 0 ? (
                    <div className="space-y-4">
                      {/* Period: 1st Half */}
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider border-b border-border/50 pb-1 mb-2 text-center">
                          1º Tempo
                        </p>
                        <div className="space-y-0.5 divide-y divide-border/30">
                          {visibleEvents
                            .filter((e) => e.minute <= 45 + addedTime1)
                            .map((evt) => (
                              <EventRow
                                key={evt.id}
                                event={evt}
                                homeTeamId={match.homeTeamId}
                                players={allPlayers || []}
                              />
                            ))}
                        </div>
                      </div>

                      {/* Period: 2nd Half */}
                      {visibleEvents.some((e) => e.minute > 45 + addedTime1) && (
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider border-b border-border/50 pb-1 mb-2 text-center">
                            2º Tempo
                          </p>
                          <div className="space-y-0.5 divide-y divide-border/30">
                            {visibleEvents
                              .filter((e) => e.minute > 45 + addedTime1)
                              .map((evt) => (
                                <EventRow
                                  key={evt.id}
                                  event={evt}
                                  homeTeamId={match.homeTeamId}
                                  players={allPlayers || []}
                                />
                              ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground text-center py-6">
                      {isLiveSimulating ? "Aguardando eventos..." : "Nenhum evento registrado"}
                    </p>
                  )}
                </div>
              </TabsContent>
            </Tabs>
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
                      <tr
                        key={row.teamId}
                        className={`border-t border-border/50 ${isMatchTeam ? "bg-primary/5 font-semibold" : ""}`}
                      >
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
                            <span className="text-foreground truncate">
                              {team?.abbreviation || team?.shortName || team?.name}
                            </span>
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
          <button
            onClick={onCancel}
            className="text-destructive font-display font-bold text-sm hover:text-destructive/80 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => setShowBottomPanel((prev) => !prev)}
            className={`font-display font-bold text-sm transition-colors ${showBottomPanel ? "text-primary" : "text-foreground hover:text-foreground/80"}`}
          >
            {showBottomPanel ? "Ocultar" : "Detalhes"}
          </button>
          {liveFinished && !match.played ? (
            <button
              onClick={handleFinish}
              className="text-primary font-display font-bold text-sm hover:text-primary/80 transition-colors flex items-center gap-1.5"
            >
              Salvar
            </button>
          ) : (
            <button
              onClick={handleFinish}
              className="text-primary font-display font-bold text-sm hover:text-primary/80 transition-colors"
            >
              Finalizar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
