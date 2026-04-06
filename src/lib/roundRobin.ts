import { Match } from "@/types/tournament";

/**
 * Generate round-robin fixtures for a list of team IDs.
 * Supports 1 or 2 turns (home/away reversal).
 */
export function generateRoundRobin(
  tournamentId: string,
  teamIds: string[],
  turnos: 1 | 2 | 3 | 4 = 1
): Match[] {
  const ids = [...teamIds];

  // Shuffle to ensure different round orders each time (e.g. across seasons)
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }

  // If odd number of teams, add a "bye" placeholder
  const hasBye = ids.length % 2 !== 0;
  if (hasBye) ids.push("__BYE__");

  const n = ids.length;
  const totalRounds = n - 1;
  const matchesPerRound = n / 2;
  const firstLegMatches: Match[] = [];

  // Circle method: fix first team, rotate the rest
  const fixed = ids[0];
  const rotating = ids.slice(1);

  for (let r = 0; r < totalRounds; r++) {
    const round = r + 1;
    const current = [fixed, ...rotating];

    for (let m = 0; m < matchesPerRound; m++) {
      const home = current[m];
      const away = current[n - 1 - m];

      if (home === "__BYE__" || away === "__BYE__") continue;

      firstLegMatches.push({
        id: crypto.randomUUID(),
        tournamentId,
        round,
        homeTeamId: home,
        awayTeamId: away,
        homeScore: 0,
        awayScore: 0,
        played: false,
      });
    }

    // Rotate: move last element of rotating to the front
    rotating.unshift(rotating.pop()!);
  }

  if (turnos === 1) return firstLegMatches;

  // Build all additional turnos
  const allMatches = [...firstLegMatches];
  for (let t = 2; t <= turnos; t++) {
    const swap = t % 2 === 0; // even turnos swap home/away
    const extraLeg = firstLegMatches.map((m) => ({
      ...m,
      id: crypto.randomUUID(),
      round: m.round + totalRounds * (t - 1),
      homeTeamId: swap ? m.awayTeamId : m.homeTeamId,
      awayTeamId: swap ? m.homeTeamId : m.awayTeamId,
    }));
    allMatches.push(...extraLeg);
  }

  return allMatches;
}
