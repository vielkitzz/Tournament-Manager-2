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

export function getExpectedGoals(
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
  xg: [number, number];
} {
  const homeXg1 = getExpectedGoals(homeRate, awayRate, false, 0.5, true);
  const awayXg1 = getExpectedGoals(awayRate, homeRate, false, 0.5, false);
  const firstHalf: [number, number] = [poissonRandom(homeXg1), poissonRandom(awayXg1)];
  const goalDiff = firstHalf[0] - firstHalf[1];
  let momentum = 0.5;
  if (goalDiff > 1) momentum = 0.7;
  else if (goalDiff < -1) momentum = 0.3;
  else if (goalDiff > 0) momentum = 0.6;
  else if (goalDiff < 0) momentum = 0.4;

  const homeXg2 = getExpectedGoals(homeRate, awayRate, false, momentum, true);
  const awayXg2 = getExpectedGoals(awayRate, homeRate, false, momentum, false);
  const secondHalf: [number, number] = [poissonRandom(homeXg2), poissonRandom(awayXg2)];

  return {
    h1: firstHalf,
    h2: secondHalf,
    total: [firstHalf[0] + secondHalf[0], firstHalf[1] + secondHalf[1]],
    xg: [roundTo2(homeXg1 + homeXg2), roundTo2(awayXg1 + awayXg2)],
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
  targetXg?: number,
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

  // Rescale shot xG values so the total matches the requested team xG
  // (computed externally by getExpectedGoals). We preserve the relative
  // weight of each shot — high-quality chances stay high-quality.
  if (targetXg !== undefined && shots.length > 0) {
    const currentTotal = shots.reduce((s, x) => s + x.xG_value, 0);
    if (currentTotal > 0) {
      const factor = targetXg / currentTotal;
      for (const s of shots) {
        s.xG_value = roundTo2(Math.max(0.01, Math.min(0.99, s.xG_value * factor)));
      }
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
  xgInputs?: { home: number; away: number },
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

  // If the caller passed xG values from getExpectedGoals (the same source
  // used to draw goals), rescale the per-shot xG so the totals match.
  // Otherwise, fall back to the legacy summation behaviour.
  const homeShotsArray = generateShotsArray(homeShots, homeShotsOnTarget, homeGoals, xgInputs?.home);
  const awayShotsArray = generateShotsArray(awayShots, awayShotsOnTarget, awayGoals, xgInputs?.away);

  const homeXg =
    xgInputs?.home !== undefined
      ? roundTo2(xgInputs.home)
      : roundTo2(homeShotsArray.reduce((sum, s) => sum + s.xG_value, 0));
  const awayXg =
    xgInputs?.away !== undefined
      ? roundTo2(xgInputs.away)
      : roundTo2(awayShotsArray.reduce((sum, s) => sum + s.xG_value, 0));

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
 * Improved minute-by-minute events generator with stats-consistent events.
 */
export function generateMinuteByMinuteEvents(
  homeTeam: Team,
  awayTeam: Team,
  homePlayers: Player[],
  awayPlayers: Player[],
  matchStats: { homeStats: TeamMatchStats; awayStats: TeamMatchStats },
  homeGoals: number,
  awayGoals: number,
  halfGoals?: { h1: [number, number]; h2: [number, number] },
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
  const positionFoulWeight: Record<string, number> = {
    Volante: 4,
    Zagueiro: 3,
    Lateral: 2,
    Meia: 1.5,
    Atacante: 1,
    Ponta: 1,
    "Meia-Atacante": 1,
    Goleiro: 0.3,
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

  // ---------------------------------------------------------------
  // Pre-generate substitutions so every later event can respect the
  // "ghosting" rule: a substituted player cannot author events after
  // the minute they left the pitch.
  // ---------------------------------------------------------------
  const subOutAt: Map<string, number> = new Map(); // playerId -> minute they left
  const subInAt: Map<string, number> = new Map(); // playerId -> minute they entered

  const generateSubstitutions = (team: Team, players: Player[]) => {
    const subCount = Math.min(3, Math.max(0, Math.floor(players.length / 2) - 1));
    if (subCount === 0) return;
    const usedIds = new Set<string>();
    const nonGk = players.filter((p) => p.position !== "Goleiro");
    for (let i = 0; i < subCount; i++) {
      const minute = randInt(55, 85);
      const candidates = nonGk.filter((p) => !usedIds.has(p.id));
      if (candidates.length < 2) break;
      const outPlayer = candidates[randInt(0, candidates.length - 1)];
      usedIds.add(outPlayer.id);
      const inCandidates = candidates.filter((p) => p.id !== outPlayer.id && !usedIds.has(p.id));
      if (inCandidates.length === 0) break;
      const inPlayer = inCandidates[randInt(0, inCandidates.length - 1)];
      usedIds.add(inPlayer.id);
      subOutAt.set(outPlayer.id, minute);
      subInAt.set(inPlayer.id, minute);
      events.push({
        id: genId(),
        minute,
        type: "substitution",
        teamId: team.id,
        playerId: inPlayer.id,
        assistId: outPlayer.id,
        text: `Substituição no **${team.shortName || team.name}**. Sai **${outPlayer.name}** para a entrada de **${inPlayer.name}**`,
      });
    }
  };
  generateSubstitutions(homeTeam, homePlayers);
  generateSubstitutions(awayTeam, awayPlayers);

  /** True if the player is on the pitch at the given minute. */
  const isOnPitch = (playerId: string, minute: number): boolean => {
    const out = subOutAt.get(playerId);
    if (out !== undefined && minute >= out) return false;
    const inAt = subInAt.get(playerId);
    if (inAt !== undefined && minute < inAt) return false;
    return true;
  };

  /** Same as weightedPick but filters out players not on the pitch at minute. */
  function pickAtMinute(players: Player[], weights: Record<string, number>, minute: number, exclude?: string): Player | undefined {
    const eligible = players.filter((p) => p.id !== exclude && isOnPitch(p.id, minute));
    return weightedPick(eligible, weights);
  }

  // 1. Goals — sorteamos os minutos respeitando o tempo (1º x 2º half)
  //    quando halfGoals é fornecido pelo simulador.
  const generateGoals = (team: Team, players: Player[], count: number, minuteRange: [number, number]) => {
    for (let i = 0; i < count; i++) {
      const minute = randInt(minuteRange[0], minuteRange[1]);
      const scorer = pickAtMinute(players, positionGoalWeight, minute);
      if (!scorer) continue;
      const assister = Math.random() < 0.65 ? pickAtMinute(players, positionAssistWeight, minute, scorer.id) : undefined;
      const descs = [
        `Gol de **${scorer.name}**${assister ? ` com assistência de **${assister.name}**` : ""}`,
        `Finalização certeira de **${scorer.name}**${assister ? ` após passe de **${assister.name}**` : ""}`,
        `**${scorer.name}** aproveita e marca${assister ? ` com cruzamento de **${assister.name}**` : ""}`,
        `Golaço de **${scorer.name}**!${assister ? ` Jogada de **${assister.name}**` : ""}`,
      ];
      events.push({
        id: genId(),
        minute,
        type: "goal",
        teamId: team.id,
        playerId: scorer.id,
        assistId: assister?.id,
        text: descs[randInt(0, descs.length - 1)],
      });
    }
  };
  if (halfGoals) {
    generateGoals(homeTeam, homePlayers, halfGoals.h1[0], [1, 45]);
    generateGoals(awayTeam, awayPlayers, halfGoals.h1[1], [1, 45]);
    generateGoals(homeTeam, homePlayers, halfGoals.h2[0], [46, 90]);
    generateGoals(awayTeam, awayPlayers, halfGoals.h2[1], [46, 90]);
  } else {
    generateGoals(homeTeam, homePlayers, homeGoals, [1, 90]);
    generateGoals(awayTeam, awayPlayers, awayGoals, [1, 90]);
  }

  // 2. Fouls & Cards (cards always follow a foul)
  const generateFoulsAndCards = (
    team: Team,
    opponent: Team,
    players: Player[],
    foulsCount: number,
    yellows: number,
    reds: number,
  ) => {
    const cardedIds = new Set<string>();
    const foulEvents: { minute: number; playerId: string }[] = [];

    for (let i = 0; i < foulsCount; i++) {
      const minute = randInt(2, 89);
      const p = pickAtMinute(players, positionFoulWeight, minute);
      if (!p) continue;
      foulEvents.push({ minute, playerId: p.id });
      const texts = [
        `Falta de **${p.name}** no meio de campo`,
        `**${p.name}** comete falta no campo de defesa`,
        `Falta dura de **${p.name}** interrompendo jogada do **${opponent.shortName || opponent.name}**`,
        `**${p.name}** faz falta tática para parar o contra-ataque`,
      ];
      events.push({
        id: genId(),
        minute,
        type: "foul",
        teamId: team.id,
        playerId: p.id,
        text: texts[randInt(0, texts.length - 1)],
      });
    }

    // Yellow cards (attach to existing foul minutes)
    const sortedFouls = [...foulEvents].sort((a, b) => a.minute - b.minute);
    for (let i = 0; i < yellows; i++) {
      const foulRef = sortedFouls[Math.min(i + Math.floor(sortedFouls.length * 0.3), sortedFouls.length - 1)];
      const minute = foulRef ? foulRef.minute : randInt(15, 85);
      const p = pickAtMinute(
        players.filter((pl) => !cardedIds.has(pl.id)),
        positionFoulWeight,
        minute,
      );
      if (!p) continue;
      cardedIds.add(p.id);
      const texts = [
        `Cartão amarelo para **${p.name}** por falta dura`,
        `**${p.name}** recebe o amarelo após falta`,
        `Cartão amarelo aplicado a **${p.name}**`,
        `**${p.name}** é advertido com cartão amarelo`,
      ];
      events.push({
        id: genId(),
        minute: minute + 0.1,
        type: "yellow_card",
        teamId: team.id,
        playerId: p.id,
        text: texts[randInt(0, texts.length - 1)],
      });
    }

    // Red cards — ancorados a faltas EXISTENTES (não criamos faltas extras),
    // garantindo que a contagem textual de faltas == matchStats.fouls.
    for (let i = 0; i < reds; i++) {
      // Pick an existing foul (preferably late-game) to upgrade to a red card.
      const candidateFouls = sortedFouls
        .filter((f) => f.minute >= 25)
        .filter((f) => !cardedIds.has(f.playerId));
      const foulRef =
        candidateFouls[candidateFouls.length - 1 - i] ??
        sortedFouls[sortedFouls.length - 1] ??
        null;
      if (!foulRef) continue;
      const minute = foulRef.minute;
      const p = players.find((pl) => pl.id === foulRef.playerId);
      if (!p || !isOnPitch(p.id, minute)) continue;
      cardedIds.add(p.id);
      const texts = [
        `Cartão vermelho direto para **${p.name}** após entrada violenta`,
        `**${p.name}** é expulso de campo! Cartão vermelho!`,
        `Expulsão! **${p.name}** recebe o cartão vermelho`,
      ];
      events.push({
        id: genId(),
        minute: minute + 0.1,
        type: "red_card",
        teamId: team.id,
        playerId: p.id,
        text: texts[randInt(0, texts.length - 1)],
      });
      // From this minute on, the red-carded player is off the pitch.
      const existingOut = subOutAt.get(p.id);
      if (existingOut === undefined || existingOut > minute) {
        subOutAt.set(p.id, minute);
      }
    }
  };
  generateFoulsAndCards(
    homeTeam,
    awayTeam,
    homePlayers,
    matchStats.homeStats.fouls,
    matchStats.homeStats.yellowCards,
    matchStats.homeStats.redCards,
  );
  generateFoulsAndCards(
    awayTeam,
    homeTeam,
    awayPlayers,
    matchStats.awayStats.fouls,
    matchStats.awayStats.yellowCards,
    matchStats.awayStats.redCards,
  );

  // 3. Offsides (matching stats)
  const generateOffsides = (team: Team, players: Player[], count: number) => {
    for (let i = 0; i < count; i++) {
      const minute = randInt(5, 88);
      const p = pickAtMinute(players, positionGoalWeight, minute);
      if (!p) continue;
      const texts = [
        `Impedimento marcado no **${p.name}**`,
        `O bandeirinha assinala impedimento de **${p.name}**`,
        `**${p.name}** é flagrado em posição irregular`,
      ];
      events.push({
        id: genId(),
        minute,
        type: "offside",
        teamId: team.id,
        playerId: p.id,
        text: texts[randInt(0, texts.length - 1)],
      });
    }
  };
  generateOffsides(homeTeam, homePlayers, matchStats.homeStats.offsides);
  generateOffsides(awayTeam, awayPlayers, matchStats.awayStats.offsides);

  // 4. Shots (non-goal: missed + saved)
  const generateShots = (
    team: Team,
    _opponent: Team,
    players: Player[],
    opponentPlayers: Player[],
    totalShots: number,
    shotsOnTarget: number,
    goals: number,
  ) => {
    const missedShots = Math.max(0, totalShots - shotsOnTarget);
    const saves = Math.max(0, shotsOnTarget - goals);
    const gk = opponentPlayers.find((p) => p.position === "Goleiro") || opponentPlayers[0];

    for (let i = 0; i < missedShots; i++) {
      const minute = randInt(3, 89);
      const p = pickAtMinute(players, positionGoalWeight, minute);
      if (!p) continue;
      const texts = [
        `**${p.name}** bateu para fora`,
        `Chute de longe do **${p.name}**, mas a bola subiu demais`,
        `**${p.name}** arrisca de longe, mas a bola passa pela linha de fundo`,
        `**${p.name}** cobra falta e a bola passa raspando a trave`,
      ];
      events.push({
        id: genId(),
        minute,
        type: "shot",
        teamId: team.id,
        playerId: p.id,
        text: texts[randInt(0, texts.length - 1)],
      });
    }

    for (let i = 0; i < saves; i++) {
      const minute = randInt(3, 89);
      const shooter = pickAtMinute(players, positionGoalWeight, minute);
      if (!shooter || !gk) continue;
      const texts = [
        `Grande defesa de **${gk.name}** após chute de **${shooter.name}**`,
        `**${shooter.name}** bateu pro gol, **${gk.name}** cai pra fazer a defesa`,
        `Defesaça de **${gk.name}**! **${shooter.name}** faz um bela finalização`,
      ];
      events.push({
        id: genId(),
        minute,
        type: "shot",
        teamId: team.id,
        playerId: shooter.id,
        text: texts[randInt(0, texts.length - 1)],
      });
    }
  };
  generateShots(
    homeTeam,
    awayTeam,
    homePlayers,
    awayPlayers,
    matchStats.homeStats.shots,
    matchStats.homeStats.shotsOnTarget,
    homeGoals,
  );
  generateShots(
    awayTeam,
    homeTeam,
    awayPlayers,
    homePlayers,
    matchStats.awayStats.shots,
    matchStats.awayStats.shotsOnTarget,
    awayGoals,
  );

  // 5. A few general highlights (substitutions já foram pré-geradas no início)
  const highlightCount = randInt(3, 6);
  for (let i = 0; i < highlightCount; i++) {
    const isHome = Math.random() < 0.5;
    const team = isHome ? homeTeam : awayTeam;
    const players = isHome ? homePlayers : awayPlayers;
    const minute = randInt(1, 90);
    const eligible = players.filter((pl) => isOnPitch(pl.id, minute));
    if (eligible.length === 0) continue;
    const p = eligible[randInt(0, eligible.length - 1)];
    const highlights = [
      `Pressão do **${team.shortName || team.name}** no campo de ataque`,
      `**${p.name}** faz uma bela jogada individual, driblando dois marcadores`,
      `Contra-ataque rápido puxado por **${p.name}**`,
      `Desarme providencial de **${p.name}** impedindo o avanço do adversário`,
      `Jogo fica truncado no meio de campo com muitas disputas de bola`,
    ];
    events.push({
      id: genId(),
      minute,
      type: "highlight",
      teamId: team.id,
      playerId: p.id,
      text: highlights[randInt(0, highlights.length - 1)],
    });
  }

  // Sort by minute, keeping fractional order for card-after-foul
  events.sort((a, b) => a.minute - b.minute);
  // Round fractional minutes for display
  events.forEach((e) => {
    e.minute = Math.floor(e.minute);
  });

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
