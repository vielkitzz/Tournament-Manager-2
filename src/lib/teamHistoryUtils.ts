import { Team } from "@/types/tournament";

export interface TeamHistory {
  id: string;
  teamId: string;
  startYear: number;
  endYear: number;
  logo?: string;
  rating: number;
}

/**
 * Resolves the correct logo and rate for a team based on the tournament year.
 * If the year matches a historical profile, returns the historical values.
 * Otherwise, returns the team's default logo and rate.
 */
export function resolveTeamForYear(
  team: Team,
  year: number | undefined,
  histories: TeamHistory[]
): { logo?: string; rate: number } {
  if (!year || histories.length === 0) {
    return { logo: team.logo, rate: team.rate };
  }

  const match = histories.find(
    (h) => h.teamId === team.id && year >= h.startYear && year <= h.endYear
  );

  if (match) {
    return {
      logo: match.logo || team.logo,
      rate: match.rating ?? team.rate,
    };
  }

  return { logo: team.logo, rate: team.rate };
}

/**
 * Creates a "resolved" copy of a Team with historical logo/rate applied.
 */
export function resolveTeam(
  team: Team,
  year: number | undefined,
  histories: TeamHistory[]
): Team {
  const resolved = resolveTeamForYear(team, year, histories);
  return { ...team, logo: resolved.logo, rate: resolved.rate };
}
