/**
 * Realistic match simulation engine based on team rates.
 *
 * Uses a Poisson model where each team's expected goals per half
 * is derived from their rate relative to the opponent's rate.
 */

import { TeamMatchStats } from "@/types/tournament";

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

function getExpectedGoals(teamRate: number, opponentRate: number, isExtraTime = false): number {
  const BASE_GOALS_PER_HALF = 0.75;
  const strengthRatio = Math.sqrt(teamRate / opponentRate);
  const formFactor = 0.85 + Math.random() * 0.30;
  const fatigueFactor = isExtraTime ? 0.40 : 1.0; // ~60% reduction in extra time
  return BASE_GOALS_PER_HALF * strengthRatio * formFactor * fatigueFactor;
}

export function simulateHalf(homeRate: number, awayRate: number, isExtraTime = false): [number, number] {
  const homeExpected = getExpectedGoals(homeRate, awayRate, isExtraTime);
  const awayExpected = getExpectedGoals(awayRate, homeRate, isExtraTime);
  return [poissonRandom(homeExpected), poissonRandom(awayExpected)];
}

export function simulateFullMatch(
  homeRate: number,
  awayRate: number
): {
  h1: [number, number];
  h2: [number, number];
  total: [number, number];
} {
  const h1 = simulateHalf(homeRate, awayRate);
  const h2 = simulateHalf(homeRate, awayRate);
  return {
    h1,
    h2,
    total: [h1[0] + h2[0], h1[1] + h2[1]],
  };
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function roundTo2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Generate a single shot with a realistic xG value.
 * On-target shots have higher xG; off-target shots have lower xG.
 */
function generateShot(isOnTarget: boolean): { xG_value: number; onTarget: boolean } {
  if (isOnTarget) {
    // On-target: xG between 0.05 and 0.75 (big chances up to 0.75)
    const rand = Math.random();
    // Most shots are low xG, fewer are big chances
    const xG_value = rand < 0.5
      ? 0.05 + Math.random() * 0.10  // 50% chance: 0.05-0.15 (routine save)
      : rand < 0.8
        ? 0.15 + Math.random() * 0.25 // 30% chance: 0.15-0.40 (decent chance)
        : 0.40 + Math.random() * 0.35; // 20% chance: 0.40-0.75 (big chance)
    return { xG_value: roundTo2(xG_value), onTarget: true };
  } else {
    // Off-target: xG between 0.01 and 0.12
    const xG_value = 0.01 + Math.random() * 0.11;
    return { xG_value: roundTo2(xG_value), onTarget: false };
  }
}

/**
 * Generate an array of shots for a team, ensuring consistency between
 * total shots, shots on target, goals scored, and xG.
 */
function generateShotsArray(
  totalShots: number,
  shotsOnTarget: number,
  goalsScored: number
): { xG_value: number; onTarget: boolean }[] {
  const shots: { xG_value: number; onTarget: boolean }[] = [];

  // Generate on-target shots first
  for (let i = 0; i < shotsOnTarget; i++) {
    shots.push(generateShot(true));
  }

  // Generate off-target shots
  for (let i = 0; i < totalShots - shotsOnTarget; i++) {
    shots.push(generateShot(false));
  }

  // If goals > 0, ensure at least 'goalsScored' shots have high xG
  // to make the xG total somewhat realistic relative to actual goals
  if (goalsScored > 0) {
    const onTargetShots = shots.filter(s => s.onTarget);
    // Boost the top shots to represent the actual goals scored
    for (let i = 0; i < Math.min(goalsScored, onTargetShots.length); i++) {
      // Goals typically come from higher xG chances
      onTargetShots[i].xG_value = roundTo2(0.20 + Math.random() * 0.55);
    }
  }

  return shots;
}

/**
 * Generate realistic match statistics based on team rates and final scores.
 * xG is calculated as the sum of individual shot xG values.
 */
export function generateMatchStats(
  homeRate: number,
  awayRate: number,
  homeGoals: number,
  awayGoals: number
): { homeStats: TeamMatchStats; awayStats: TeamMatchStats } {
  // Possession based on rates with some randomness
  const homeStrength = homeRate + (Math.random() - 0.5) * 1.5;
  const awayStrength = awayRate + (Math.random() - 0.5) * 1.5;
  const totalStrength = Math.max(homeStrength, 0.5) + Math.max(awayStrength, 0.5);
  const rawHomePoss = (Math.max(homeStrength, 0.5) / totalStrength) * 100;
  const homePossession = Math.round(Math.max(25, Math.min(75, rawHomePoss)));
  const awayPossession = 100 - homePossession;

  // Shots: proportional to possession and rate (5-20 range)
  const homeShotsBase = 5 + (homePossession / 100) * 10 + (homeRate / 10) * 5;
  const awayShotsBase = 5 + (awayPossession / 100) * 10 + (awayRate / 10) * 5;
  const homeShots = Math.max(homeGoals + 1, randInt(Math.floor(homeShotsBase - 2), Math.ceil(homeShotsBase + 3)));
  const awayShots = Math.max(awayGoals + 1, randInt(Math.floor(awayShotsBase - 2), Math.ceil(awayShotsBase + 3)));

  // Shots on target: 10%-50% of shots, but never less than goals scored
  const homeSotMin = Math.max(homeGoals, Math.ceil(homeShots * 0.1));
  const homeSotMax = Math.max(homeSotMin, Math.floor(homeShots * 0.5));
  const homeShotsOnTarget = randInt(homeSotMin, homeSotMax);

  const awaySotMin = Math.max(awayGoals, Math.ceil(awayShots * 0.1));
  const awaySotMax = Math.max(awaySotMin, Math.floor(awayShots * 0.5));
  const awayShotsOnTarget = randInt(awaySotMin, awaySotMax);

  // Generate shot arrays and calculate xG as sum of individual shot xG values
  const homeShotsArray = generateShotsArray(homeShots, homeShotsOnTarget, homeGoals);
  const awayShotsArray = generateShotsArray(awayShots, awayShotsOnTarget, awayGoals);

  const homeXg = roundTo2(homeShotsArray.reduce((sum, s) => sum + s.xG_value, 0));
  const awayXg = roundTo2(awayShotsArray.reduce((sum, s) => sum + s.xG_value, 0));

  // Fouls (8-22), inversely related to possession (less possession = more fouls)
  const homeFouls = randInt(8, 18) + Math.round((awayPossession - 50) / 10);
  const awayFouls = randInt(8, 18) + Math.round((homePossession - 50) / 10);

  // Corners (2-12), proportional to shots/possession
  const homeCorners = randInt(2, Math.max(3, Math.round(homeShots * 0.5)));
  const awayCorners = randInt(2, Math.max(3, Math.round(awayShots * 0.5)));

  // Cards: based on fouls
  const homeYellow = Math.min(homeFouls, randInt(0, Math.max(0, Math.floor(homeFouls / 5))));
  const awayYellow = Math.min(awayFouls, randInt(0, Math.max(0, Math.floor(awayFouls / 5))));
  const homeRed = Math.random() < 0.08 ? 1 : 0;
  const awayRed = Math.random() < 0.08 ? 1 : 0;

  // Offsides (0-6)
  const homeOffsides = randInt(0, 5);
  const awayOffsides = randInt(0, 5);

  return {
    homeStats: {
      possession: homePossession,
      expectedGoals: homeXg,
      shots: homeShots,
      shotsOnTarget: homeShotsOnTarget,
      fouls: Math.max(0, homeFouls),
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
      fouls: Math.max(0, awayFouls),
      corners: awayCorners,
      yellowCards: awayYellow,
      redCards: awayRed,
      offsides: awayOffsides,
    },
  };
}
