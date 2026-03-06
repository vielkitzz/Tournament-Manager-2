import { Team } from "@/types/tournament";

export type HistoryFieldType = 'logo' | 'name' | 'short_name' | 'abbreviation' | 'colors' | 'rating' | 'legacy';

export interface TeamHistory {
  id: string;
  teamId: string;
  startYear: number;
  endYear: number;
  fieldType: HistoryFieldType;
  logo?: string;
  rating?: number;
  name?: string;
  shortName?: string;
  abbreviation?: string;
  colors?: string[];
}

export const FIELD_TYPE_LABELS: Record<Exclude<HistoryFieldType, 'legacy'>, string> = {
  logo: 'Escudo',
  name: 'Nome Completo',
  short_name: 'Nome Curto',
  abbreviation: 'Abreviação',
  colors: 'Cores',
  rating: 'Rate',
};

/**
 * Check if two periods overlap
 */
export function periodsOverlap(
  a: { startYear: number; endYear: number },
  b: { startYear: number; endYear: number }
): boolean {
  return a.startYear <= b.endYear && b.startYear <= a.endYear;
}

/**
 * Check if adding a new entry would conflict with existing ones of the same field type
 */
export function findOverlappingHistory(
  histories: TeamHistory[],
  teamId: string,
  fieldType: HistoryFieldType,
  startYear: number,
  endYear: number,
  excludeId?: string
): TeamHistory | undefined {
  return histories.find(
    (h) =>
      h.teamId === teamId &&
      (h.fieldType === fieldType || (h.fieldType === 'legacy' && fieldType !== 'legacy')) &&
      h.id !== excludeId &&
      periodsOverlap({ startYear, endYear }, { startYear: h.startYear, endYear: h.endYear })
  );
}

/**
 * Find matching history for a specific field type and year
 */
function findMatch(
  histories: TeamHistory[],
  teamId: string,
  year: number,
  fieldType: HistoryFieldType
): TeamHistory | undefined {
  // First look for specific field_type match
  const specific = histories.find(
    (h) => h.teamId === teamId && h.fieldType === fieldType && year >= h.startYear && year <= h.endYear
  );
  if (specific) return specific;
  // Fallback to legacy entries (which contain all fields)
  return histories.find(
    (h) => h.teamId === teamId && h.fieldType === 'legacy' && year >= h.startYear && year <= h.endYear
  );
}

/**
 * Resolves the correct logo, rate, name, shortName, abbreviation and colors
 * for a team based on the tournament year, looking up each field independently.
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

  const logoMatch = findMatch(histories, team.id, year, 'logo');
  const nameMatch = findMatch(histories, team.id, year, 'name');
  const shortNameMatch = findMatch(histories, team.id, year, 'short_name');
  const abbrMatch = findMatch(histories, team.id, year, 'abbreviation');
  const colorsMatch = findMatch(histories, team.id, year, 'colors');
  const ratingMatch = findMatch(histories, team.id, year, 'rating');

  return {
    logo: logoMatch?.logo || defaults.logo,
    rate: ratingMatch?.rating ?? defaults.rate,
    name: nameMatch?.name || defaults.name,
    shortName: shortNameMatch?.shortName || defaults.shortName,
    abbreviation: abbrMatch?.abbreviation || defaults.abbreviation,
    colors: colorsMatch?.colors?.length ? colorsMatch.colors : defaults.colors,
  };
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
