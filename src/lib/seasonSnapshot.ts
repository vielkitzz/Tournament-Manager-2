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
