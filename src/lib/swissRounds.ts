import { Match } from "@/types/tournament";

/**
 * Generate Swiss-system league phase matches.
 * In a Swiss system, teams play a limited number of rounds (not full round-robin).
 * Each round pairs teams with similar records. For initial generation, we use 
 * a seeded approach (top vs bottom half).
 */
export function generateSwissLeagueMatches(
  tournamentId: string,
  teamIds: string[],
  totalRounds: number
): Match[] {
  if (teamIds.length < 2) return [];
  
  const matches: Match[] = [];
  const ids = [...teamIds];
  
  // For initial generation, create rounds using a rotation system
  // similar to round-robin but capped at totalRounds
  const hasBye = ids.length % 2 !== 0;
  if (hasBye) ids.push("__BYE__");
  
  const n = ids.length;
  const maxRounds = Math.min(totalRounds, n - 1);
  const matchesPerRound = n / 2;
  
  const fixed = ids[0];
  const rotating = ids.slice(1);
  
  for (let r = 0; r < maxRounds; r++) {
    const round = r + 1;
    const current = [fixed, ...rotating];
    
    for (let m = 0; m < matchesPerRound; m++) {
      const home = current[m];
      const away = current[n - 1 - m];
      
      if (home === "__BYE__" || away === "__BYE__") continue;
      
      matches.push({
        id: crypto.randomUUID(),
        tournamentId,
        round,
        homeTeamId: home,
        awayTeamId: away,
        homeScore: 0,
        awayScore: 0,
        played: false,
        stage: "group" as const, // Use "group" stage so standings work
      });
    }
    
    rotating.unshift(rotating.pop()!);
  }
  
  return matches;
}
