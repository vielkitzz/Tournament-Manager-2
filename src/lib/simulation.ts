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
