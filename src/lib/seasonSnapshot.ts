import { Match, KnockoutStage, SeasonRecord, Tournament, TournamentSettings } from "@/types/tournament";

const KNOCKOUT_STAGES: KnockoutStage[] = ["1/64", "1/32", "1/16", "1/8", "1/4", "1/2"];

export function getSeasonTeamIds(
  tournament: Tournament,
  seasonData: SeasonRecord | null,
  isViewingPastSeason: boolean,
): string[] {
  if (!isViewingPastSeason) return tournament.teamIds;
  if (seasonData?.teamIds?.length) return seasonData.teamIds;

  const fromStandings = seasonData?.standings?.map((standing) => standing.teamId).filter(Boolean) || [];
  if (fromStandings.length > 0) return fromStandings;

  return seasonData?.matches
    ? [...new Set(seasonData.matches.flatMap((match) => [match.homeTeamId, match.awayTeamId]).filter(Boolean))]
    : [];
}

export function inferKnockoutStartStage(matches: Match[], fallback?: KnockoutStage): KnockoutStage | undefined {
  const knockoutMatches = matches.filter((match) => !match.isThirdPlace);
  if (knockoutMatches.length === 0) return fallback;

  // Conta pares únicos no round 1 para saber quantos times entraram
  const round1Matches = knockoutMatches.filter((m) => m.round === 1);
  const pairIds = new Set(round1Matches.filter((m) => m.pairId).map((m) => m.pairId));
  const singles = round1Matches.filter((m) => !m.pairId).length;
  const confrontos = pairIds.size + singles;

  // confrontos = times / 2, então times = confrontos * 2
  const teamCount = confrontos * 2;

  // Encontra o stage correspondente ao número de times
  const stageMap: Record<number, KnockoutStage> = {
    64: "1/64",
    32: "1/32",
    16: "1/16",
    8: "1/8",
    4: "1/4",
    2: "1/2",
  };

  return stageMap[teamCount] || fallback;
}

interface BuildSeasonViewTournamentParams {
  tournament: Tournament;
  activeYear: number;
  isViewingPastSeason: boolean;
  teamIds: string[];
  matches: Match[];
  settings: TournamentSettings;
  groupCount?: number;
  knockoutStart?: KnockoutStage;
}

export function buildSeasonViewTournament({
  tournament,
  activeYear,
  isViewingPastSeason,
  teamIds,
  matches,
  settings,
  groupCount,
  knockoutStart,
}: BuildSeasonViewTournamentParams): Tournament {
  return {
    ...tournament,
    year: activeYear,
    teamIds,
    numberOfTeams: teamIds.length || tournament.numberOfTeams,
    matches,
    settings,
    gruposQuantidade: groupCount ?? tournament.gruposQuantidade,
    mataMataInicio: knockoutStart ?? tournament.mataMataInicio,
    finalized: isViewingPastSeason ? true : tournament.finalized,
    groupsFinalized: isViewingPastSeason ? true : tournament.groupsFinalized,
  };
}

/* ------------------------------------------------------------------ */
/* Season summary helpers (runner-up, final score, champion points)    */
/* ------------------------------------------------------------------ */

export interface SeasonTeamRef {
  id: string;
  name: string;
  logo?: string;
}

function scoreOf(match: Match, side: "home" | "away"): number {
  const base = side === "home" ? match.homeScore : match.awayScore;
  const et = side === "home" ? match.homeExtraTime : match.awayExtraTime;
  return (base || 0) + (et || 0);
}

/** The decisive match of a knockout season (highest round, not third place). */
export function getSeasonFinalMatches(season: SeasonRecord): Match[] {
  const knockout = (season.matches || []).filter(
    (m) => m.played && !m.isThirdPlace && (m.stage === "knockout" || season.format === "mata-mata"),
  );
  if (knockout.length === 0) return [];
  const lastRound = Math.max(...knockout.map((m) => m.round || 1));
  return knockout.filter((m) => (m.round || 1) === lastRound);
}

/** Readable final score, including aggregate over two legs and penalties. */
export function getSeasonFinalScore(season: SeasonRecord): string | null {
  if (season.finalScore) return season.finalScore;
  const legs = getSeasonFinalMatches(season);
  if (legs.length === 0) return null;

  const first = legs[0];
  // Aggregate is computed from the first leg's perspective (home team of leg 1).
  let a = 0;
  let b = 0;
  let pens: string | null = null;
  for (const leg of legs) {
    const sameOrder = leg.homeTeamId === first.homeTeamId;
    a += scoreOf(leg, sameOrder ? "home" : "away");
    b += scoreOf(leg, sameOrder ? "away" : "home");
    if (leg.homePenalties != null && leg.awayPenalties != null) {
      const ph = sameOrder ? leg.homePenalties : leg.awayPenalties;
      const pa = sameOrder ? leg.awayPenalties : leg.homePenalties;
      pens = `${ph}-${pa} pên.`;
    }
  }
  return `${a} x ${b}${pens ? ` (${pens})` : ""}`;
}

/** Champion total points for points-based seasons. */
export function getSeasonChampionPoints(season: SeasonRecord): number | null {
  if (typeof season.championPoints === "number") return season.championPoints;
  if (season.format === "mata-mata") return null;
  const row = (season.standings || []).find((s) => s.teamId === season.championId);
  return typeof row?.points === "number" ? row.points : null;
}

/** Runner-up (and co-runners-up) of the season. */
export function getSeasonRunnersUp(season: SeasonRecord): SeasonTeamRef[] {
  const manual = [season.runnerUp, ...(season.coRunnerUps || [])].filter(
    (r): r is SeasonTeamRef => !!r && !!r.name,
  );
  if (manual.length > 0) return manual;

  const championIds = new Set([season.championId, ...(season.coChampions || []).map((c) => c.id)]);

  // Knockout: loser(s) of the final
  const legs = getSeasonFinalMatches(season);
  if (legs.length > 0) {
    const ids = [...new Set(legs.flatMap((m) => [m.homeTeamId, m.awayTeamId]))].filter(
      (id) => id && !championIds.has(id),
    );
    const refs = ids
      .map((id) => season.standings?.find((s) => s.teamId === id))
      .filter((s): s is NonNullable<typeof s> => !!s)
      .map((s) => ({ id: s.teamId, name: s.teamName, logo: s.teamLogo }));
    if (refs.length > 0) return refs;
  }

  // Points-based: next team in the standings
  const row = (season.standings || []).find((s) => !championIds.has(s.teamId));
  return row ? [{ id: row.teamId, name: row.teamName, logo: row.teamLogo }] : [];
}
