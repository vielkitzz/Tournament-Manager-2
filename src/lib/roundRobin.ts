import { Match } from "@/types/tournament";

/**
 * Generate round-robin fixtures for a list of team IDs.
 * Supports 1 to 4 turns (home/away reversal).
 */
export function generateRoundRobin(tournamentId: string, teamIds: string[], turnos: 1 | 2 | 3 | 4 = 1): Match[] {
  // Cópia para não alterar o array original
  const ids = [...teamIds];

  // Embaralha para garantir ordens de rodada diferentes a cada temporada
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }

  // Se número ímpar de times, adiciona um "bye" para manter a estrutura
  const hasBye = ids.length % 2 !== 0;
  if (hasBye) ids.push("__BYE__");

  const n = ids.length;
  const totalRounds = n - 1;
  const matchesPerRound = n / 2;
  const firstLegMatches: Match[] = [];

  // Método do Círculo (Circle Method): fixa o primeiro time e rotaciona o resto
  const fixed = ids[0];
  const rotating = ids.slice(1);

  for (let r = 0; r < totalRounds; r++) {
    const round = r + 1;
    const current = [fixed, ...rotating];

    for (let m = 0; m < matchesPerRound; m++) {
      const home = current[m];
      const away = current[n - 1 - m];

      // Ignora jogos contra o placeholder de folga
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

    // Rotaciona: move o último elemento de 'rotating' para o início
    rotating.unshift(rotating.pop()!);
  }

  if (turnos === 1) return firstLegMatches;

  // Constrói todos os turnos adicionais
  const allMatches = [...firstLegMatches];
  for (let t = 2; t <= turnos; t++) {
    // Se o turno for par (2º ou 4º), inverte o mando de campo
    const swap = t % 2 === 0;

    const extraLeg = firstLegMatches.map((m) => ({
      ...m,
      id: crypto.randomUUID(),
      round: m.round + totalRounds * (t - 1),
      homeTeamId: swap ? m.awayTeamId : m.homeTeamId,
      awayTeamId: swap ? m.homeTeamId : m.awayTeamId,
      homeScore: 0,
      awayScore: 0,
      played: false,
    }));
    allMatches.push(...extraLeg);
  }

  return allMatches;
}
