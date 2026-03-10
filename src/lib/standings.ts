import { Match, Team, TournamentSettings } from "@/types/tournament";

export interface StandingRow {
  teamId: string;
  team?: Team;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

export function calculateStandings(
  teamIds: string[],
  matches: Match[],
  settings: TournamentSettings,
  teams: Team[]
): StandingRow[] {
  const map = new Map<string, StandingRow>();

  // TRAVAS DE SEGURANÇA: Garante que o cálculo não quebre se 'settings' estiver vazio
  const ptsWin = settings?.pointsWin ?? 3;
  const ptsDraw = settings?.pointsDraw ?? 1;
  const ptsLoss = settings?.pointsLoss ?? 0;
  
  const safeTiebreakers = Array.isArray(settings?.tiebreakers) 
    ? settings.tiebreakers 
    : ["Pontos", "Vitórias", "Saldo de Gols", "Gols Marcados", "Empates", "Gols Sofridos", "Confronto Direto"];

  for (const tid of teamIds) {
    map.set(tid, {
      teamId: tid,
      team: teams.find((t) => t.id === tid),
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
    });
  }

  for (const m of matches) {
    if (!m.played) continue;
    const home = map.get(m.homeTeamId);
    const away = map.get(m.awayTeamId);
    if (!home || !away) continue;

    home.played++;
    away.played++;
    home.goalsFor += m.homeScore;
    home.goalsAgainst += m.awayScore;
    away.goalsFor += m.awayScore;
    away.goalsAgainst += m.homeScore;

    if (m.homeScore > m.awayScore) {
      home.wins++;
      away.losses++;
      home.points += ptsWin;
      away.points += ptsLoss;
    } else if (m.homeScore < m.awayScore) {
      away.wins++;
      home.losses++;
      away.points += ptsWin;
      home.points += ptsLoss;
    } else {
      home.draws++;
      away.draws++;
      home.points += ptsDraw;
      away.points += ptsDraw;
    }
  }

  for (const row of map.values()) {
    row.goalDifference = row.goalsFor - row.goalsAgainst;
  }

  const rows = Array.from(map.values());

  rows.sort((a, b) => {
    // Usando a lista segura de desempate
    for (const tb of safeTiebreakers) {
      let diff = 0;
      switch (tb) {
        case "Pontos":
          diff = b.points - a.points;
          break;
        case "Vitórias":
          diff = b.wins - a.wins;
          break;
        case "Saldo de Gols":
          diff = b.goalDifference - a.goalDifference;
          break;
        case "Gols Marcados":
          diff = b.goalsFor - a.goalsFor;
          break;
        case "Empates":
          diff = b.draws - a.draws;
          break;
        case "Gols Sofridos":
          diff = a.goalsAgainst - b.goalsAgainst;
          break;
        case "Confronto Direto": {
          const h2h = matches.filter(
            (m) =>
              m.played &&
              ((m.homeTeamId === a.teamId && m.awayTeamId === b.teamId) ||
                (m.homeTeamId === b.teamId && m.awayTeamId === a.teamId))
          );
          let ptsA = 0, ptsB = 0;
          for (const m of h2h) {
            const isAHome = m.homeTeamId === a.teamId;
            const aGoals = isAHome ? m.homeScore : m.awayScore;
            const bGoals = isAHome ? m.awayScore : m.homeScore;
            if (aGoals > bGoals) ptsA++;
            else if (aGoals < bGoals) ptsB++;
          }
          diff = ptsB - ptsA;
          break;
        }
      }
      if (diff !== 0) return diff;
    }
    return 0;
  });

  return rows;
}