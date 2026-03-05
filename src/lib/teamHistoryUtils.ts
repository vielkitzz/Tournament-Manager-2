import { Team } from "@/types/tournament";

export interface TeamHistory {
  id: string;
  teamId: string;
  startYear: number;
  endYear: number;
  logo?: string;
  rating?: number;
  name?: string;
  shortName?: string;
  abbreviation?: string;
  colors?: string[];
}

/**
 * Resolves the correct logo, rate, name, shortName, abbreviation and colors
 * for a team based on the tournament year.
 */
export function resolveTeamForYear(
  team: Team,
  year: number | undefined,
  histories: TeamHistory[]
): { logo?: string; rate: number; name: string; shortName: string; abbreviation: string; colors: string[] } {
  const defaults = {
    logo: team.logo,
    rate: team.rate,
    name: team.name,
    shortName: team.shortName,
    abbreviation: team.abbreviation,
    colors: team.colors || [],
  };

  if (!year || histories.length === 0) return defaults;

  const match = histories.find(
    (h) => h.teamId === team.id && year >= h.startYear && year <= h.endYear
  );

  if (match) {
    return {
      logo: match.logo || team.logo,
      rate: match.rating ?? team.rate,
      name: match.name || team.name,
      shortName: match.shortName || team.shortName,
      abbreviation: match.abbreviation || team.abbreviation,
      colors: match.colors?.length ? match.colors : (team.colors || []),
    };
  }

  return defaults;
}

/**
 * Creates a "resolved" copy of a Team with historical data applied.
 */
export function resolveTeam(
  team: Team,
  year: number | undefined,
  histories: TeamHistory[]
): Team {
  const resolved = resolveTeamForYear(team, year, histories);
  return {
    ...team,
    logo: resolved.logo,
    rate: resolved.rate,
    name: resolved.name,
    shortName: resolved.shortName,
    abbreviation: resolved.abbreviation,
    colors: resolved.colors,
  };
}
