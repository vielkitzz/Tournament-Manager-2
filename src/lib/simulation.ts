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

function getExpectedGoals(teamRate: number, opponentRate: number): number {
  const BASE_GOALS_PER_HALF = 0.75;
  const strengthRatio = Math.sqrt(teamRate / opponentRate);
  const formFactor = 0.85 + Math.random() * 0.30;
  return BASE_GOALS_PER_HALF * strengthRatio * formFactor;
}

export function simulateHalf(homeRate: number, awayRate: number): [number, number] {
  const homeExpected = getExpectedGoals(homeRate, awayRate);
  const awayExpected = getExpectedGoals(awayRate, homeRate);
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
 * Generate realistic match statistics based on team rates and final scores.
 * Can be used both during simulation and to retroactively generate stats for legacy matches.
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

  // xG: proportional to shots on target, min 0.10 per shot on target
  // With variation around actual goals
  const homeXgBase = homeShotsOnTarget * (0.10 + Math.random() * 0.15);
  const homeXg = roundTo2(Math.max(homeXgBase, homeShotsOnTarget * 0.10));

  const awayXgBase = awayShotsOnTarget * (0.10 + Math.random() * 0.15);
  const awayXg = roundTo2(Math.max(awayXgBase, awayShotsOnTarget * 0.10));

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
