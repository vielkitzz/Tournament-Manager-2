/**
 * Realistic match simulation engine based on team rates.
 *
 * Uses a modified Poisson model with home advantage, form persistence,
 * and more realistic goal expectations.
 */

import { TeamMatchStats, MatchEvent, Match, Player, Team, TournamentSettings } from "@/types/tournament";

function poissonRandom(lambda: number): number {
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= Math.random();
  } while (p > L);
  return k - 1;
}

// Home advantage factor (teams perform slightly better at home)
const HOME_ADVANTAGE = 1.12;

// Variance reduction: teams don't randomly fluctuate every half
function getTeamFormFactor(teamRate: number, opponentRate: number, matchMomentum: number): number {
  const consistency = Math.min(0.95, Math.max(0.85, teamRate / 10));
  const randomVariance = (1 - consistency) * 0.25;
  const randomFactor = 0.95 + Math.random() * randomVariance * 2;
  const momentumFactor = 0.95 + matchMomentum * 0.1;
  return randomFactor * momentumFactor;
}

function getExpectedGoals(
  teamRate: number,
  opponentRate: number,
  isExtraTime = false,
  matchMomentum = 0.5,
  isHome = false,
): number {
  const BASE_GOALS_PER_HALF = 0.55;
  const strengthRatio = Math.pow(teamRate / opponentRate, 0.7);
  const homeBonus = isHome ? HOME_ADVANTAGE : 1.0;
  const formFactor = getTeamFormFactor(teamRate, opponentRate, matchMomentum);
  const fatigueFactor = isExtraTime ? 0.35 : 1.0;
  let expected = BASE_GOALS_PER_HALF * strengthRatio * formFactor * fatigueFactor * homeBonus;
  expected = Math.min(2.0, expected);
  return expected;
}

export function simulateHalf(
  homeRate: number,
  awayRate: number,
  isExtraTime = false,
  matchMomentum = 0.5,
): [number, number] {
  const homeExpected = getExpectedGoals(homeRate, awayRate, isExtraTime, matchMomentum, true);
  const awayExpected = getExpectedGoals(awayRate, homeRate, isExtraTime, matchMomentum, false);
  return [poissonRandom(homeExpected), poissonRandom(awayExpected)];
}

export function simulateFullMatch(
  homeRate: number,
  awayRate: number,
): {
  h1: [number, number];
  h2: [number, number];
  total: [number, number];
} {
  const firstHalf = simulateHalf(homeRate, awayRate, false, 0.5);
  const goalDiff = firstHalf[0] - firstHalf[1];
  let momentum = 0.5;
  if (goalDiff > 1) momentum = 0.7;
  else if (goalDiff < -1) momentum = 0.3;
  else if (goalDiff > 0) momentum = 0.6;
  else if (goalDiff < 0) momentum = 0.4;

  const secondHalf = simulateHalf(homeRate, awayRate, false, momentum);

  return {
    h1: firstHalf,
    h2: secondHalf,
    total: [firstHalf[0] + secondHalf[0], firstHalf[1] + secondHalf[1]],
  };
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function roundTo2(n: number): number {
  return Math.round(n * 100) / 100;
}

function generateShot(isOnTarget: boolean): { xG_value: number; onTarget: boolean } {
  if (isOnTarget) {
    const rand = Math.random();
    const xG_value =
      rand < 0.6 ? 0.05 + Math.random() * 0.12 : rand < 0.85 ? 0.17 + Math.random() * 0.23 : 0.4 + Math.random() * 0.35;
    return { xG_value: roundTo2(xG_value), onTarget: true };
  } else {
    const xG_value = 0.01 + Math.random() * 0.1;
    return { xG_value: roundTo2(xG_value), onTarget: false };
  }
}

function generateShotsArray(
  totalShots: number,
  shotsOnTarget: number,
  goalsScored: number,
): { xG_value: number; onTarget: boolean }[] {
  const shots: { xG_value: number; onTarget: boolean }[] = [];
  for (let i = 0; i < shotsOnTarget; i++) shots.push(generateShot(true));
  for (let i = 0; i < totalShots - shotsOnTarget; i++) shots.push(generateShot(false));

  if (goalsScored > 0) {
    const onTargetShots = shots.filter((s) => s.onTarget);
    onTargetShots.sort((a, b) => b.xG_value - a.xG_value);
    for (let i = 0; i < Math.min(goalsScored, onTargetShots.length); i++) {
      onTargetShots[i].xG_value = roundTo2(0.25 + Math.random() * 0.5);
    }
    for (let i = shots.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shots[i], shots[j]] = [shots[j], shots[i]];
    }
  }
  return shots;
}

function isUpsetLikely(homeRate: number, awayRate: number, homeGoals: number, awayGoals: number): boolean {
  const rateDiff = Math.abs(homeRate - awayRate);
  const strongerWon = (homeRate > awayRate && homeGoals > awayGoals) || (awayRate > homeRate && awayGoals > homeGoals);
  if (strongerWon) return false;
  if (rateDiff > 3.0) return Math.random() > 0.85;
  if (rateDiff > 2.0) return Math.random() > 0.75;
  if (rateDiff > 1.0) return Math.random() > 0.6;
  return Math.random() > 0.45;
}

export function generateMatchStats(
  homeRate: number,
  awayRate: number,
  homeGoals: number,
  awayGoals: number,
): { homeStats: TeamMatchStats; awayStats: TeamMatchStats } {
  const isUpset = (homeRate > awayRate && homeGoals < awayGoals) || (awayRate > homeRate && awayGoals < homeGoals);
  let upsetAdjustment = 1.0;
  if (isUpset && !isUpsetLikely(homeRate, awayRate, homeGoals, awayGoals)) {
    upsetAdjustment = 0.7;
  }

  const homeStrength = homeRate + (Math.random() - 0.5) * 0.8;
  const awayStrength = awayRate + (Math.random() - 0.5) * 0.8;
  const totalStrength = Math.max(homeStrength, 0.5) + Math.max(awayStrength, 0.5);
  let rawHomePoss = (Math.max(homeStrength, 0.5) / totalStrength) * 100;

  if (upsetAdjustment < 1.0 && homeRate > awayRate && homeGoals < awayGoals) {
    rawHomePoss *= upsetAdjustment;
  } else if (upsetAdjustment < 1.0 && awayRate > homeRate && awayGoals < homeGoals) {
    rawHomePoss = 100 - (100 - rawHomePoss) * upsetAdjustment;
  }

  const homePossession = Math.round(Math.max(30, Math.min(70, rawHomePoss)));
  const awayPossession = 100 - homePossession;

  const homeShotsBase = 4 + (homePossession / 100) * 8 + (homeRate / 10) * 3;
  const awayShotsBase = 4 + (awayPossession / 100) * 8 + (awayRate / 10) * 3;

  let homeShots = Math.max(homeGoals, randInt(Math.floor(homeShotsBase - 1), Math.ceil(homeShotsBase + 2)));
  let awayShots = Math.max(awayGoals, randInt(Math.floor(awayShotsBase - 1), Math.ceil(awayShotsBase + 2)));
  homeShots = Math.min(homeShots, 22);
  awayShots = Math.min(awayShots, 22);

  const homeSotMin = Math.max(homeGoals, Math.ceil(homeShots * 0.2));
  const homeSotMax = Math.max(homeSotMin, Math.floor(homeShots * 0.45));
  const homeShotsOnTarget = randInt(homeSotMin, homeSotMax);

  const awaySotMin = Math.max(awayGoals, Math.ceil(awayShots * 0.2));
  const awaySotMax = Math.max(awaySotMin, Math.floor(awayShots * 0.45));
  const awayShotsOnTarget = randInt(awaySotMin, awaySotMax);

  const homeShotsArray = generateShotsArray(homeShots, homeShotsOnTarget, homeGoals);
  const awayShotsArray = generateShotsArray(awayShots, awayShotsOnTarget, awayGoals);

  const homeXg = roundTo2(homeShotsArray.reduce((sum, s) => sum + s.xG_value, 0));
  const awayXg = roundTo2(awayShotsArray.reduce((sum, s) => sum + s.xG_value, 0));

  let homeFouls = randInt(6, 14) + Math.round((awayPossession - 50) / 12);
  let awayFouls = randInt(6, 14) + Math.round((homePossession - 50) / 12);
  homeFouls = Math.max(4, Math.min(20, homeFouls));
  awayFouls = Math.max(4, Math.min(20, awayFouls));

  const homeCorners = randInt(1, Math.max(2, Math.min(10, Math.round(homeShots * 0.4))));
  const awayCorners = randInt(1, Math.max(2, Math.min(10, Math.round(awayShots * 0.4))));

  const homeYellow = Math.min(4, randInt(0, Math.max(1, Math.floor(homeFouls / 5))));
  const awayYellow = Math.min(4, randInt(0, Math.max(1, Math.floor(awayFouls / 5))));
  const homeRed = (homeYellow >= 2 && Math.random() < 0.1) || homeYellow >= 3 ? 1 : 0;
  const awayRed = (awayYellow >= 2 && Math.random() < 0.1) || awayYellow >= 3 ? 1 : 0;

  const homeOffsides = randInt(0, 4);
  const awayOffsides = randInt(0, 4);

  return {
    homeStats: {
      possession: homePossession,
      expectedGoals: homeXg,
      shots: homeShots,
      shotsOnTarget: homeShotsOnTarget,
      fouls: homeFouls,
      corners: homeCorners,
      yellowCards: homeYellow,
      redCards: homeRed,
      offsides: homeOffsides,
    },
    awayStats: {
      possession: awayPossession,
      expectedGoals: awayXg,
      shots: awayShots,
      shotsOnTarget: awayShotsOnTarget,
      fouls: awayFouls,
      corners: awayCorners,
      yellowCards: awayYellow,
      redCards: awayRed,
      offsides: awayOffsides,
    },
  };
}

export function getSuspendedPlayerIds(
  tournamentMatches: Match[],
  currentRound: number,
  teamId: string,
  settings: TournamentSettings,
): Set<string> {
  const suspended = new Set<string>();
  const yellowLimit = settings.yellowCardsToSuspend ?? 3;
  const yellowDuration = settings.yellowSuspensionDuration ?? 1;
  const redDuration = settings.redSuspensionDuration ?? 1;

  const pastMatches = tournamentMatches.filter(
    (m) => m.played && m.round < currentRound && m.events && (m.homeTeamId === teamId || m.awayTeamId === teamId),
  );

  const yellowCounts: Record<string, { count: number; lastRound: number }> = {};
  const redCards: { playerId: string; round: number }[] = [];

  for (const m of pastMatches) {
    if (!m.events) continue;
    for (const evt of m.events) {
      if (evt.teamId !== teamId || !evt.playerId) continue;
      if (evt.type === "yellow_card") {
        if (!yellowCounts[evt.playerId]) yellowCounts[evt.playerId] = { count: 0, lastRound: 0 };
        yellowCounts[evt.playerId].count++;
        yellowCounts[evt.playerId].lastRound = m.round;
        if (yellowCounts[evt.playerId].count >= yellowLimit) {
          const suspendedUntil = m.round + yellowDuration;
          if (currentRound <= suspendedUntil) suspended.add(evt.playerId);
          yellowCounts[evt.playerId].count = 0;
        }
      } else if (evt.type === "red_card") {
        redCards.push({ playerId: evt.playerId, round: m.round });
      }
    }
  }

  for (const rc of redCards) {
    const suspendedUntil = rc.round + redDuration;
    if (currentRound <= suspendedUntil) suspended.add(rc.playerId);
  }

  return suspended;
}

/**
 * Improved minute-by-minute events generator (no emojis, more variety).
 */
export function generateMinuteByMinuteEvents(
  homeTeam: Team,
  awayTeam: Team,
  homePlayers: Player[],
  awayPlayers: Player[],
  matchStats: { homeStats: TeamMatchStats; awayStats: TeamMatchStats },
  homeGoals: number,
  awayGoals: number,
): MatchEvent[] {
  const events: MatchEvent[] = [];
  let eventId = 0;
  const genId = () => `evt-${++eventId}`;

  const positionGoalWeight: Record<string, number> = {
    Atacante: 5,
    Ponta: 4,
    Meia: 3,
    "Meia-Atacante": 3.5,
    Volante: 1.5,
    Lateral: 1,
    Zagueiro: 0.5,
    Goleiro: 0.1,
  };
  const positionAssistWeight: Record<string, number> = {
    Meia: 5,
    "Meia-Atacante": 4,
    Ponta: 4,
    Atacante: 2,
    Lateral: 3,
    Volante: 2,
    Zagueiro: 0.5,
    Goleiro: 0.2,
  };

  function weightedPick(players: Player[], weights: Record<string, number>, exclude?: string): Player | undefined {
    const available = exclude ? players.filter((p) => p.id !== exclude) : players;
    if (available.length === 0) return undefined;
    const w = available.map((p) => weights[p.position || ""] || 1);
    const total = w.reduce((s, v) => s + v, 0);
    let r = Math.random() * total;
    for (let i = 0; i < available.length; i++) {
      r -= w[i];
      if (r <= 0) return available[i];
    }
    return available[available.length - 1];
  }

  function randomMinute(): number {
    return randInt(1, 90);
  }

  const generateGoals = (team: Team, players: Player[], count: number) => {
    for (let i = 0; i < count; i++) {
      const scorer = weightedPick(players, positionGoalWeight);
      if (!scorer) continue;
      const assister = Math.random() < 0.65 ? weightedPick(players, positionAssistWeight, scorer.id) : undefined;

      const goalDescriptions = [
        `Gol de ${scorer.name}${assister ? ` com assistência de ${assister.name}` : ""}`,
        `Finalização certeira de ${scorer.name} para balançar as redes${assister ? ` após passe de ${assister.name}` : ""}`,
        `${scorer.name} aproveita a oportunidade e marca o gol${assister ? ` vindo de um cruzamento de ${assister.name}` : ""}`,
        `Golaço de ${scorer.name}! A bola vai no ângulo${assister ? ` após jogada individual de ${assister.name}` : ""}`,
      ];

      events.push({
        id: genId(),
        minute: randomMinute(),
        type: "goal",
        teamId: team.id,
        playerId: scorer.id,
        assistId: assister?.id,
        text: goalDescriptions[randInt(0, goalDescriptions.length - 1)],
      });
    }
  };

  generateGoals(homeTeam, homePlayers, homeGoals);
  generateGoals(awayTeam, awayPlayers, awayGoals);

  const generateCards = (team: Team, players: Player[], yellows: number, reds: number) => {
    const cardedIds = new Set<string>();
    for (let i = 0; i < yellows; i++) {
      const p = weightedPick(
        players.filter((p) => !cardedIds.has(p.id)),
        { Volante: 4, Zagueiro: 3, Lateral: 2, Meia: 1.5, Atacante: 1, Ponta: 1 },
      );
      if (!p) continue;
      cardedIds.add(p.id);

      const yellowDescriptions = [
        `Cartão amarelo para ${p.name} por falta dura`,
        `${p.name} recebe o amarelo após reclamação com a arbitragem`,
        `Cartão amarelo aplicado a ${p.name} para interromper o contra-ataque`,
        `${p.name} é advertido com cartão amarelo por entrada atrasada`,
      ];

      events.push({
        id: genId(),
        minute: randomMinute(),
        type: "yellow_card",
        teamId: team.id,
        playerId: p.id,
        text: yellowDescriptions[randInt(0, yellowDescriptions.length - 1)],
      });
    }
    for (let i = 0; i < reds; i++) {
      const p = weightedPick(
        players.filter((p) => !cardedIds.has(p.id)),
        { Volante: 4, Zagueiro: 3, Lateral: 2, Meia: 1, Atacante: 1 },
      );
      if (!p) continue;
      cardedIds.add(p.id);

      const redDescriptions = [
        `Cartão vermelho direto para ${p.name} após entrada violenta`,
        `${p.name} é expulso de campo! Cartão vermelho para o jogador`,
        `Expulsão! ${p.name} recebe o cartão vermelho e deixa sua equipe com um a menos`,
      ];

      events.push({
        id: genId(),
        minute: randomMinute(),
        type: "red_card",
        teamId: team.id,
        playerId: p.id,
        text: redDescriptions[randInt(0, redDescriptions.length - 1)],
      });
    }
  };

  generateCards(homeTeam, homePlayers, matchStats.homeStats.yellowCards, matchStats.homeStats.redCards);
  generateCards(awayTeam, awayPlayers, matchStats.awayStats.yellowCards, matchStats.awayStats.redCards);

  const highlightCount = randInt(8, 15);
  for (let i = 0; i < highlightCount; i++) {
    const isHome = Math.random() < 0.5;
    const team = isHome ? homeTeam : awayTeam;
    const opponent = isHome ? awayTeam : homeTeam;
    const players = isHome ? homePlayers : awayPlayers;
    const p = players[randInt(0, players.length - 1)];
    if (!p) continue;

    const highlights = [
      `${p.name} arranca em velocidade pela ${Math.random() < 0.5 ? "esquerda" : "direita"} e tenta o cruzamento`,
      `Grande defesa do goleiro após chute potente de ${p.name}`,
      `${p.name} cobra falta perigosa, a bola passa raspando a trave`,
      `${p.name} finaliza de fora da área, mas a bola sobe demais`,
      `Contra-ataque rápido puxado por ${p.name} que assusta a defesa do ${opponent.shortName}`,
      `${p.name} faz uma bela jogada individual, driblando dois marcadores`,
      `Substituição no ${team.shortName}: o treinador mexe na equipe para buscar o resultado`,
      `O árbitro interrompe o jogo para atendimento médico a ${p.name}`,
      `${p.name} ganha de cabeça na área, mas a bola vai para fora`,
      `Pressão do ${team.shortName}! A equipe troca passes no campo de ataque buscando espaços`,
      `Desarme preciso de ${p.name} impedindo o avanço do adversário`,
      `Cruzamento na área do ${opponent.shortName}, mas a defesa afasta o perigo`,
      `${p.name} tenta o passe em profundidade, mas a bola corre demais e sai pela linha de fundo`,
      `Jogo fica truncado no meio de campo com muitas disputas de bola`,
      `O bandeirinha assinala impedimento de ${p.name} em ataque promissor`,
    ];

    events.push({
      id: genId(),
      minute: randomMinute(),
      type: "highlight",
      teamId: team.id,
      playerId: p.id,
      text: highlights[randInt(0, highlights.length - 1)],
    });
  }

  events.sort((a, b) => a.minute - b.minute);

  events.unshift({
    id: genId(),
    minute: 0,
    type: "highlight",
    teamId: "",
    text: "Início de partida! O árbitro autoriza o começo do jogo",
  });

  events.push({
    id: genId(),
    minute: 90,
    type: "highlight",
    teamId: "",
    text: "Fim de jogo! O árbitro apita o encerramento da partida",
  });

  return events;
}
