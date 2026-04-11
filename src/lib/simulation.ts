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
  // Form factor now depends on team quality and match momentum
  // Strong teams are more consistent (closer to 1.0)
  const consistency = Math.min(0.95, Math.max(0.85, teamRate / 10));

  // Random factor with less variance for stronger teams
  const randomVariance = (1 - consistency) * 0.25;
  const randomFactor = 0.95 + Math.random() * randomVariance * 2;

  // Momentum effect (teams playing well maintain form)
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
  // Lower base goals for more realistic scores
  const BASE_GOALS_PER_HALF = 0.55;

  // More realistic strength ratio (not sqrt, which compresses differences)
  // Use power of 0.7 to keep differences significant but not extreme
  const strengthRatio = Math.pow(teamRate / opponentRate, 0.7);

  // Home advantage only applied to home team (caller handles this)
  const homeBonus = isHome ? HOME_ADVANTAGE : 1.0;

  // Form factor with less variance
  const formFactor = getTeamFormFactor(teamRate, opponentRate, matchMomentum);

  // Fatigue factor for extra time
  const fatigueFactor = isExtraTime ? 0.35 : 1.0;

  // Cap the maximum expected goals per half to avoid unrealistic blowouts
  let expected = BASE_GOALS_PER_HALF * strengthRatio * formFactor * fatigueFactor * homeBonus;

  // Hard cap: no team expects more than 2.0 goals per half (4 per game)
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
  // Momentum carries over from first half to second
  const firstHalf = simulateHalf(homeRate, awayRate, false, 0.5);

  // Determine momentum based on first half result
  const goalDiff = firstHalf[0] - firstHalf[1];
  let momentum = 0.5;
  if (goalDiff > 1)
    momentum = 0.7; // Winning team has momentum
  else if (goalDiff < -1)
    momentum = 0.3; // Losing team loses momentum
  else if (goalDiff > 0) momentum = 0.6;
  else if (goalDiff < 0) momentum = 0.4;

  // Second half with momentum effect
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

/**
 * Generate a single shot with realistic xG value.
 */
function generateShot(isOnTarget: boolean): { xG_value: number; onTarget: boolean } {
  if (isOnTarget) {
    const rand = Math.random();
    const xG_value =
      rand < 0.6
        ? 0.05 + Math.random() * 0.12 // 60%: 0.05-0.17 (routine save)
        : rand < 0.85
          ? 0.17 + Math.random() * 0.23 // 25%: 0.17-0.40 (decent chance)
          : 0.4 + Math.random() * 0.35; // 15%: 0.40-0.75 (big chance)
    return { xG_value: roundTo2(xG_value), onTarget: true };
  } else {
    const xG_value = 0.01 + Math.random() * 0.1;
    return { xG_value: roundTo2(xG_value), onTarget: false };
  }
}

/**
 * Generate shot array consistent with goals scored.
 */
function generateShotsArray(
  totalShots: number,
  shotsOnTarget: number,
  goalsScored: number,
): { xG_value: number; onTarget: boolean }[] {
  const shots: { xG_value: number; onTarget: boolean }[] = [];

  for (let i = 0; i < shotsOnTarget; i++) {
    shots.push(generateShot(true));
  }

  for (let i = 0; i < totalShots - shotsOnTarget; i++) {
    shots.push(generateShot(false));
  }

  // Ensure goals correspond to realistic xG distribution
  if (goalsScored > 0) {
    const onTargetShots = shots.filter((s) => s.onTarget);
    // Sort by xG to assign goals to highest quality chances
    onTargetShots.sort((a, b) => b.xG_value - a.xG_value);

    for (let i = 0; i < Math.min(goalsScored, onTargetShots.length); i++) {
      // Goals from good chances (0.25-0.75)
      onTargetShots[i].xG_value = roundTo2(0.25 + Math.random() * 0.5);
    }

    // Shuffle back to random order
    for (let i = shots.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shots[i], shots[j]] = [shots[j], shots[i]];
    }
  }

  return shots;
}

/**
 * Calculate upset probability based on rate difference
 * Stronger team wins ~70-80% of the time depending on difference
 */
function isUpsetLikely(homeRate: number, awayRate: number, homeGoals: number, awayGoals: number): boolean {
  const rateDiff = Math.abs(homeRate - awayRate);
  const strongerWon = (homeRate > awayRate && homeGoals > awayGoals) || (awayRate > homeRate && awayGoals > homeGoals);

  if (strongerWon) return false;

  // Upset probability decreases as rate difference increases
  if (rateDiff > 3.0) return Math.random() > 0.85; // Only 15% chance of big upset
  if (rateDiff > 2.0) return Math.random() > 0.75; // 25% chance
  if (rateDiff > 1.0) return Math.random() > 0.6; // 40% chance
  return Math.random() > 0.45; // 55% chance for near-equal teams
}

export function generateMatchStats(
  homeRate: number,
  awayRate: number,
  homeGoals: number,
  awayGoals: number,
): { homeStats: TeamMatchStats; awayStats: TeamMatchStats } {
  // Check if result is an upset and adjust if too frequent
  const isUpset = (homeRate > awayRate && homeGoals < awayGoals) || (awayRate > homeRate && awayGoals < homeGoals);

  // If upset is statistically unlikely, reduce the chances by adjusting possession
  let upsetAdjustment = 1.0;
  if (isUpset && !isUpsetLikely(homeRate, awayRate, homeGoals, awayGoals)) {
    upsetAdjustment = 0.7; // Reduce the underdog's statistical performance
  }

  // Possession based on rates with less randomness
  const homeStrength = homeRate + (Math.random() - 0.5) * 0.8;
  const awayStrength = awayRate + (Math.random() - 0.5) * 0.8;
  const totalStrength = Math.max(homeStrength, 0.5) + Math.max(awayStrength, 0.5);
  let rawHomePoss = (Math.max(homeStrength, 0.5) / totalStrength) * 100;

  // Apply upset adjustment
  if (upsetAdjustment < 1.0 && homeRate > awayRate && homeGoals < awayGoals) {
    rawHomePoss *= upsetAdjustment; // Home team (stronger) loses possession
  } else if (upsetAdjustment < 1.0 && awayRate > homeRate && awayGoals < homeGoals) {
    rawHomePoss = 100 - (100 - rawHomePoss) * upsetAdjustment; // Away team (stronger) loses possession
  }

  const homePossession = Math.round(Math.max(30, Math.min(70, rawHomePoss)));
  const awayPossession = 100 - homePossession;

  // Shots: more realistic range (3-18)
  const homeShotsBase = 4 + (homePossession / 100) * 8 + (homeRate / 10) * 3;
  const awayShotsBase = 4 + (awayPossession / 100) * 8 + (awayRate / 10) * 3;

  let homeShots = Math.max(homeGoals, randInt(Math.floor(homeShotsBase - 1), Math.ceil(homeShotsBase + 2)));
  let awayShots = Math.max(awayGoals, randInt(Math.floor(awayShotsBase - 1), Math.ceil(awayShotsBase + 2)));

  // Cap shots to avoid unrealistic numbers
  homeShots = Math.min(homeShots, 22);
  awayShots = Math.min(awayShots, 22);

  // Shots on target: 20%-45% of shots (more realistic)
  const homeSotMin = Math.max(homeGoals, Math.ceil(homeShots * 0.2));
  const homeSotMax = Math.max(homeSotMin, Math.floor(homeShots * 0.45));
  const homeShotsOnTarget = randInt(homeSotMin, homeSotMax);

  const awaySotMin = Math.max(awayGoals, Math.ceil(awayShots * 0.2));
  const awaySotMax = Math.max(awaySotMin, Math.floor(awayShots * 0.45));
  const awayShotsOnTarget = randInt(awaySotMin, awaySotMax);

  // Generate shot arrays and xG
  const homeShotsArray = generateShotsArray(homeShots, homeShotsOnTarget, homeGoals);
  const awayShotsArray = generateShotsArray(awayShots, awayShotsOnTarget, awayGoals);

  const homeXg = roundTo2(homeShotsArray.reduce((sum, s) => sum + s.xG_value, 0));
  const awayXg = roundTo2(awayShotsArray.reduce((sum, s) => sum + s.xG_value, 0));

  // Fouls (6-18)
  let homeFouls = randInt(6, 14) + Math.round((awayPossession - 50) / 12);
  let awayFouls = randInt(6, 14) + Math.round((homePossession - 50) / 12);
  homeFouls = Math.max(4, Math.min(20, homeFouls));
  awayFouls = Math.max(4, Math.min(20, awayFouls));

  // Corners (1-10)
  const homeCorners = randInt(1, Math.max(2, Math.min(10, Math.round(homeShots * 0.4))));
  const awayCorners = randInt(1, Math.max(2, Math.min(10, Math.round(awayShots * 0.4))));

  // Cards: more realistic distribution (1 card per 4-6 fouls)
  const homeYellow = Math.min(4, randInt(0, Math.max(1, Math.floor(homeFouls / 5))));
  const awayYellow = Math.min(4, randInt(0, Math.max(1, Math.floor(awayFouls / 5))));
  const homeRed = (homeYellow >= 2 && Math.random() < 0.1) || homeYellow >= 3 ? 1 : 0;
  const awayRed = (awayYellow >= 2 && Math.random() < 0.1) || awayYellow >= 3 ? 1 : 0;

  // Offsides (0-4)
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

/**
 * Check if a player is suspended for a given match round.
 */
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

  // Look at all played matches before this round
  const pastMatches = tournamentMatches.filter(
    (m) => m.played && m.round < currentRound && m.events && (m.homeTeamId === teamId || m.awayTeamId === teamId)
  );

  // Track yellow card accumulation per player
  const yellowCounts: Record<string, { count: number; lastRound: number }> = {};
  // Track red cards per player
  const redCards: { playerId: string; round: number }[] = [];

  for (const m of pastMatches) {
    if (!m.events) continue;
    for (const evt of m.events) {
      if (evt.teamId !== teamId || !evt.playerId) continue;
      if (evt.type === "yellow_card") {
        if (!yellowCounts[evt.playerId]) yellowCounts[evt.playerId] = { count: 0, lastRound: 0 };
        yellowCounts[evt.playerId].count++;
        yellowCounts[evt.playerId].lastRound = m.round;
        // Check if accumulated enough for suspension
        if (yellowCounts[evt.playerId].count >= yellowLimit) {
          const suspendedUntil = m.round + yellowDuration;
          if (currentRound <= suspendedUntil) {
            suspended.add(evt.playerId);
          }
          yellowCounts[evt.playerId].count = 0; // Reset after suspension
        }
      } else if (evt.type === "red_card") {
        redCards.push({ playerId: evt.playerId, round: m.round });
      }
    }
  }

  // Check red card suspensions
  for (const rc of redCards) {
    const suspendedUntil = rc.round + redDuration;
    if (currentRound <= suspendedUntil) {
      suspended.add(rc.playerId);
    }
  }

  return suspended;
}

/**
 * Generate minute-by-minute events for a match.
 * Distributes goals, cards, and highlights to real players.
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

  // Position weights for goal scoring
  const positionGoalWeight: Record<string, number> = {
    "Atacante": 5, "Ponta": 4, "Meia": 3, "Meia-Atacante": 3.5,
    "Volante": 1.5, "Lateral": 1, "Zagueiro": 0.5, "Goleiro": 0.1,
  };
  const positionAssistWeight: Record<string, number> = {
    "Meia": 5, "Meia-Atacante": 4, "Ponta": 4, "Atacante": 2,
    "Lateral": 3, "Volante": 2, "Zagueiro": 0.5, "Goleiro": 0.2,
  };

  function weightedPick(players: Player[], weights: Record<string, number>, exclude?: string): Player | undefined {
    const available = exclude ? players.filter(p => p.id !== exclude) : players;
    if (available.length === 0) return undefined;
    const w = available.map(p => weights[p.position || ""] || 1);
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

  // Generate goal events
  const generateGoals = (team: Team, players: Player[], count: number) => {
    for (let i = 0; i < count; i++) {
      const scorer = weightedPick(players, positionGoalWeight);
      if (!scorer) continue;
      const assister = Math.random() < 0.65 ? weightedPick(players, positionAssistWeight, scorer.id) : undefined;
      events.push({
        id: genId(),
        minute: randomMinute(),
        type: "goal",
        teamId: team.id,
        playerId: scorer.id,
        assistId: assister?.id,
        text: assister
          ? `⚽ Gol de ${scorer.name} (assist. ${assister.name})`
          : `⚽ Gol de ${scorer.name}`,
      });
    }
  };

  generateGoals(homeTeam, homePlayers, homeGoals);
  generateGoals(awayTeam, awayPlayers, awayGoals);

  // Generate yellow card events
  const generateCards = (team: Team, players: Player[], yellows: number, reds: number) => {
    const cardedIds = new Set<string>();
    for (let i = 0; i < yellows; i++) {
      const p = weightedPick(players.filter(p => !cardedIds.has(p.id)), { "Volante": 4, "Zagueiro": 3, "Lateral": 2, "Meia": 1.5, "Atacante": 1, "Ponta": 1 });
      if (!p) continue;
      cardedIds.add(p.id);
      events.push({
        id: genId(),
        minute: randomMinute(),
        type: "yellow_card",
        teamId: team.id,
        playerId: p.id,
        text: `🟨 Cartão amarelo para ${p.name}`,
      });
    }
    for (let i = 0; i < reds; i++) {
      const p = weightedPick(players.filter(p => !cardedIds.has(p.id)), { "Volante": 4, "Zagueiro": 3, "Lateral": 2, "Meia": 1, "Atacante": 1 });
      if (!p) continue;
      cardedIds.add(p.id);
      events.push({
        id: genId(),
        minute: randomMinute(),
        type: "red_card",
        teamId: team.id,
        playerId: p.id,
        text: `🟥 Cartão vermelho para ${p.name}`,
      });
    }
  };

  generateCards(homeTeam, homePlayers, matchStats.homeStats.yellowCards, matchStats.homeStats.redCards);
  generateCards(awayTeam, awayPlayers, matchStats.awayStats.yellowCards, matchStats.awayStats.redCards);

  // Add a few highlight events
  const highlightCount = randInt(2, 5);
  for (let i = 0; i < highlightCount; i++) {
    const isHome = Math.random() < 0.5;
    const team = isHome ? homeTeam : awayTeam;
    const players = isHome ? homePlayers : awayPlayers;
    const p = players[randInt(0, players.length - 1)];
    if (!p) continue;
    const highlights = [
      `💨 ${p.name} arranca em velocidade pela ${Math.random() < 0.5 ? "esquerda" : "direita"}`,
      `🦶 Grande defesa do goleiro após chute de ${p.name}`,
      `📐 ${p.name} cobra falta perigosa`,
      `🎯 ${p.name} finaliza de fora da área`,
      `🏃 Contra-ataque rápido puxado por ${p.name}`,
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

  // Sort by minute
  events.sort((a, b) => a.minute - b.minute);
  return events;
}
