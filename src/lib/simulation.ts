/**
 * Realistic match simulation engine based on team rates.
 *
 * Uses a Poisson model where each team's expected goals per half
 * is derived from their rate relative to the opponent's rate.
 *
 * Rate acts as "strength": higher rate = more likely to score and less likely to concede.
 * But football is unpredictable — upsets happen naturally through the Poisson variance.
 */

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

export interface MatchStats {
  possession: [number, number]; // home%, away%
  xG: [number, number];
  shots: [number, number];
  shotsOnTarget: [number, number];
  fouls: [number, number];
  corners: [number, number];
  yellowCards: [number, number];
  redCards: [number, number];
  offsides: [number, number];
}

/**
 * Generates realistic match statistics based on final scores and team rates.
 * Stats correlate with goals scored and team strength.
 */
export function generateMatchStats(
  homeRate: number,
  awayRate: number,
  homeGoals: number,
  awayGoals: number
): MatchStats {
  const totalStrength = homeRate + awayRate;
  const homeStrength = homeRate / totalStrength;
  const awayStrength = awayRate / totalStrength;

  // Possession: based on strength with some randomness
  const basePossession = homeStrength * 100;
  const possessionVariance = (Math.random() - 0.5) * 16;
  const homePossession = Math.round(Math.min(72, Math.max(28, basePossession + possessionVariance)));
  const awayPossession = 100 - homePossession;

  // xG: correlated with actual goals but with variance
  const homeXg = Math.max(0.1, homeGoals + (Math.random() - 0.5) * 1.8);
  const awayXg = Math.max(0.1, awayGoals + (Math.random() - 0.5) * 1.8);

  // Shots: more shots for stronger teams and teams that scored more
  const homeShots = Math.max(homeGoals + 1, Math.round(4 + homeGoals * 2.5 + homeStrength * 6 + Math.random() * 5));
  const awayShots = Math.max(awayGoals + 1, Math.round(4 + awayGoals * 2.5 + awayStrength * 6 + Math.random() * 5));

  // Shots on target: at least the number of goals, fraction of total shots
  const homeSoT = Math.max(homeGoals, Math.round(homeShots * (0.3 + Math.random() * 0.25)));
  const awaySoT = Math.max(awayGoals, Math.round(awayShots * (0.3 + Math.random() * 0.25)));

  // Fouls: inversely correlated with possession (weaker team fouls more)
  const homeFouls = Math.round(6 + awayStrength * 10 + Math.random() * 6);
  const awayFouls = Math.round(6 + homeStrength * 10 + Math.random() * 6);

  // Corners: correlated with possession/shots
  const homeCorners = Math.round(1 + homeStrength * 6 + homeGoals * 0.8 + Math.random() * 3);
  const awayCorners = Math.round(1 + awayStrength * 6 + awayGoals * 0.8 + Math.random() * 3);

  // Yellow cards: ~10-20% chance per foul
  const homeYellows = Math.min(homeFouls, poissonRandom(homeFouls * 0.15));
  const awayYellows = Math.min(awayFouls, poissonRandom(awayFouls * 0.15));

  // Red cards: rare (~3% chance per match per team)
  const homeReds = Math.random() < 0.03 ? 1 : 0;
  const awayReds = Math.random() < 0.03 ? 1 : 0;

  // Offsides
  const homeOffsides = poissonRandom(1.2 + homeGoals * 0.5);
  const awayOffsides = poissonRandom(1.2 + awayGoals * 0.5);

  return {
    possession: [homePossession, awayPossession],
    xG: [parseFloat(homeXg.toFixed(2)), parseFloat(awayXg.toFixed(2))],
    shots: [homeShots, awayShots],
    shotsOnTarget: [homeSoT, awaySoT],
    fouls: [homeFouls, awayFouls],
    corners: [homeCorners, awayCorners],
    yellowCards: [homeYellows, awayYellows],
    redCards: [homeReds, awayReds],
    offsides: [homeOffsides, awayOffsides],
  };
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
