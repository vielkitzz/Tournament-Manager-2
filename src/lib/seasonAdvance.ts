import { Player, Tournament } from "@/types/tournament";
import { advanceSquadSeason } from "@/lib/squadEvolution";

export interface CalendarPreview {
  targetYear: number;
  tournaments: { id: string; name: string; fromYear: number; toYear: number; ready: boolean }[];
  players: { id: string; name: string; teamId: string | null; age?: number; skill: number }[];
}

export function buildCalendarPreview(
  tournaments: Tournament[],
  players: Player[],
  tournamentIds: string[],
  teamIds: string[],
  targetYear: number,
): CalendarPreview {
  const selectedTournaments = tournaments.filter((item) => tournamentIds.includes(item.id));
  const selectedPlayers = players.filter((player) => !!player.teamId && teamIds.includes(player.teamId));
  return {
    targetYear,
    tournaments: selectedTournaments.map((item) => ({
      id: item.id,
      name: item.name,
      fromYear: item.year,
      toYear: targetYear,
      ready: item.finalized === true && targetYear > item.year,
    })),
    players: advanceSquadSeason(selectedPlayers).map((change) => ({
      id: change.player.id,
      name: change.player.name,
      teamId: change.player.teamId,
      age: change.newAge,
      skill: change.newSkill,
    })),
  };
}

export function nextSeasonTournament(tournament: Tournament, targetYear: number): Partial<Tournament> {
  return {
    year: targetYear,
    matches: [],
    finalized: false,
    groupsFinalized: false,
    settings: { ...tournament.settings, groupAssignments: undefined, qualifiedTeamIds: undefined },
    preliminaryPhases: [],
  };
}

/** Resolve todas as promoções/rebaixamentos antes de alterar qualquer competição. */
export function resolveBatchTeamIds(tournaments: Tournament[], selectedIds: string[]): Map<string, string[]> {
  const selected = new Set(selectedIds);
  const result = new Map(tournaments.filter((t) => selected.has(t.id)).map((t) => [t.id, [...t.teamIds]]));

  tournaments.filter((t) => selected.has(t.id)).forEach((source) => {
    const season = [...(source.seasons || [])].sort((a, b) => b.year - a.year).find((item) => item.year === source.year)
      || [...(source.seasons || [])].sort((a, b) => b.year - a.year)[0];
    if (!season) return;
    const rules = season.settings?.promotions || source.settings.promotions || [];
    rules.forEach((rule) => {
      if (!rule.targetCompetitionId || !selected.has(rule.targetCompetitionId)) return;
      const grouped = new Map<number, typeof season.standings>();
      season.standings.forEach((row) => {
        const group = row.group || 0;
        grouped.set(group, [...(grouped.get(group) || []), row]);
      });
      const rows = grouped.size > 1
        ? [...grouped.values()].map((standings) => standings[rule.position - 1]).filter(Boolean)
        : [season.standings[rule.position - 1]].filter(Boolean);
      rows.forEach((row) => {
        const sourceIds = result.get(source.id) || [];
        const targetIds = result.get(rule.targetCompetitionId as string) || [];
        result.set(source.id, sourceIds.filter((id) => id !== row.teamId));
        if (!targetIds.includes(row.teamId)) result.set(rule.targetCompetitionId as string, [...targetIds, row.teamId]);
      });
    });
  });
  return result;
}