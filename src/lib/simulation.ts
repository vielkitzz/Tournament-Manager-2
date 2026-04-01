/**
 * Realistic match simulation engine based on team rates.
 *
 * Uses a Poisson model where each team's expected goals per half
 * is derived from their rate relative to the opponent's rate.
 *
 * Rate acts as "strength": higher rate = more likely to score and less likely to concede.
 * But football is unpredictable — upsets happen naturally through the Poisson variance.
 */

import { MatchStats } from "@/types/tournament";

function poissonRandom(lambda: number): number {
  // Knuth algorithm for Poisson-distributed random variable
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= Math.random();
  } while (p > L);
  return k - 1;
}

/**
 * Calculates expected goals for a half based on team strengths.
 *
 * Base expected goals per half ≈ 0.75 (realistic ~1.5 goals/game per team on average in football).
 * The ratio of rates determines how goals are distributed.
 *
 * Examples with base 0.75:
 *   - Equal rates (5 vs 5): both expect ~0.75 goals/half
 *   - Dominant vs weak (8 vs 2): dominant expects ~1.2, weak expects ~0.3
 *   - Slight edge (6 vs 4): stronger expects ~0.9, weaker expects ~0.6
 */
function getExpectedGoals(teamRate: number, opponentRate: number): number {
  const BASE_GOALS_PER_HALF = 0.75;

  // Strength ratio: how much stronger this team is relative to opponent
  // Using sqrt to dampen extreme differences (a 9.0 vs 1.0 shouldn't be 9x more likely)
  const strengthRatio = Math.sqrt(teamRate / opponentRate);

  // Apply ratio to base, with a small random "form" factor (±15%)
  const formFactor = 0.85 + Math.random() * 0.30;

  return BASE_GOALS_PER_HALF * strengthRatio * formFactor;
}

/**
 * Simulates a single half of a match.
 * Returns [homeGoals, awayGoals].
 */
export function simulateHalf(homeRate: number, awayRate: number): [number, number] {
  const homeExpected = getExpectedGoals(homeRate, awayRate);
  const awayExpected = getExpectedGoals(awayRate, homeRate);

  return [poissonRandom(homeExpected), poissonRandom(awayExpected)];
}

/**
 * Simulates a full match (two halves).
 * Returns { h1: [home, away], h2: [home, away], total: [home, away] }.
 */
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

/**
 * Generates realistic match statistics based on team rates and final score.
 * All stats are coherent: xG ≤ shots on target, shots on target ≤ total shots, etc.
 */
export function generateMatchStats(
  homeRate: number,
  awayRate: number,
  homeGoals: number,
  awayGoals: number
): MatchStats {
  const homeStrength = Math.sqrt(homeRate / awayRate);
  const awayStrength = Math.sqrt(awayRate / homeRate);
  const totalStrength = homeStrength + awayStrength;

  // Possession: based on strength ratio, with small random variance
  const basePossHome = (homeStrength / totalStrength) * 100;
  const possHome = Math.round(Math.min(72, Math.max(28, basePossHome + (Math.random() - 0.5) * 10)));
  const possAway = 100 - possHome;

  // Total shots: 10-20 range scaled by strength, minimum = goals + 1
  const homeShotsBase = Math.round(6 + homeStrength * 5 + Math.random() * 4);
  const awayShotsBase = Math.round(6 + awayStrength * 5 + Math.random() * 4);
  const homeShotsTotal = Math.max(homeShotsBase, homeGoals + 1 + Math.round(Math.random() * 2));
  const awayShotsTotal = Math.max(awayShotsBase, awayGoals + 1 + Math.round(Math.random() * 2));

  // Shots on target: at least goals, at most total shots, typically 30-50% of total
  const homeOnTargetBase = Math.round(homeShotsTotal * (0.3 + Math.random() * 0.2));
  const awayOnTargetBase = Math.round(awayShotsTotal * (0.3 + Math.random() * 0.2));
  const homeOnTarget = Math.max(homeGoals, Math.min(homeShotsTotal, homeOnTargetBase));
  const awayOnTarget = Math.max(awayGoals, Math.min(awayShotsTotal, awayOnTargetBase));

  // xG: must be proportional to shots on target
  // Each shot on target has an average xG of 0.10-0.25 depending on quality
  // Ensure xG ≥ 0.50 when shots on target ≥ 5
  const homeXgPerShot = 0.10 + (homeStrength / totalStrength) * 0.15 + Math.random() * 0.05;
  const awayXgPerShot = 0.10 + (awayStrength / totalStrength) * 0.15 + Math.random() * 0.05;
  const homeXgRaw = homeOnTarget * homeXgPerShot + (homeShotsTotal - homeOnTarget) * 0.03;
  const awayXgRaw = awayOnTarget * awayXgPerShot + (awayShotsTotal - awayOnTarget) * 0.03;
  // Ensure xG is at least 0.10 per shot on target (minimum coherence)
  const homeXg = Math.round(Math.max(homeXgRaw, homeOnTarget * 0.10) * 100) / 100;
  const awayXg = Math.round(Math.max(awayXgRaw, awayOnTarget * 0.10) * 100) / 100;

  // Fouls: 8-18 range
  const homeFouls = Math.round(8 + Math.random() * 10);
  const awayFouls = Math.round(8 + Math.random() * 10);

  // Corners: 2-10 range, correlated with possession/shots
  const homeCorners = Math.round(2 + (possHome / 100) * 6 + Math.random() * 3);
  const awayCorners = Math.round(2 + (possAway / 100) * 6 + Math.random() * 3);

  // Offsides: 0-5
  const homeOffsides = Math.round(Math.random() * 4);
  const awayOffsides = Math.round(Math.random() * 4);

  // Yellow cards: 0-5, slightly correlated with fouls
  const homeYellow = Math.min(5, Math.round(homeFouls * 0.15 + Math.random() * 1.5));
  const awayYellow = Math.min(5, Math.round(awayFouls * 0.15 + Math.random() * 1.5));

  // Red cards: rare (~5% chance per team)
  const homeRed = Math.random() < 0.05 ? 1 : 0;
  const awayRed = Math.random() < 0.05 ? 1 : 0;

  return {
    possession: [possHome, possAway],
    shotsTotal: [homeShotsTotal, awayShotsTotal],
    shotsOnTarget: [homeOnTarget, awayOnTarget],
    xG: [homeXg, awayXg],
    fouls: [homeFouls, awayFouls],
    corners: [homeCorners, awayCorners],
    offsides: [homeOffsides, awayOffsides],
    yellowCards: [homeYellow, awayYellow],
    redCards: [homeRed, awayRed],
  };
}
