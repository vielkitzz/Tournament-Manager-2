/**
 * Realistic match simulation engine based on team rates.
 *
 * Each team's rate (0.01–9.99) is multiplied by a goal factor to produce
 * an expected-goals value (lambda). A Poisson random variable then generates
 * the actual number of goals — naturally producing upsets without extra tweaks.
 *
 * Goal factor 0.15 keeps scores realistic:
 *   rate 5.0 → λ ≈ 0.75 → ~1.5 goals/match (football average)
 *   rate 9.0 → λ ≈ 1.35 → ~2.7 goals/match (dominant team)
 *   rate 1.0 → λ ≈ 0.15 → ~0.3 goals/match (very weak team)
 */

const GOAL_FACTOR = 0.15;

/** Knuth algorithm for Poisson-distributed random variable. */
function poissonRandom(lambda: number): number {
  if (lambda <= 0) return 0;
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
 * Calculates expected goals for one half.
 * Lambda = rate × GOAL_FACTOR × small form variance (±10%).
 */
function getExpectedGoals(teamRate: number): number {
  const formFactor = 0.90 + Math.random() * 0.20; // 0.90–1.10
  return teamRate * GOAL_FACTOR * formFactor;
}

/**
 * Simulates a single half of a match.
 * Returns [homeGoals, awayGoals].
 */
export function simulateHalf(homeRate: number, awayRate: number): [number, number] {
  return [poissonRandom(getExpectedGoals(homeRate)), poissonRandom(getExpectedGoals(awayRate))];
}

/**
 * Simulates a full match (two halves).
 * Returns { h1, h2, total } with [home, away] tuples.
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
