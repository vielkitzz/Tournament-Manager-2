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