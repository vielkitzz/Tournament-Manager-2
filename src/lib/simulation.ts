/**
 * Realistic match simulation engine based on team rates.
 *
 * Uses a Poisson model where each team's expected goals per half
 * is derived from their rate relative to the opponent's rate.
 *
 * Additional systems:
 * - Aggregate deficit buff: team losing on aggregate gets a motivation boost
 * - Red card nerf: team with red card(s) suffers a scaling penalty in subsequent periods
 */

import { TeamMatchStats } from "@/types/tournament";

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

export interface MatchContext {
  /**
   * Goals scored in the first leg [homeInLeg2Goals, awayInLeg2Goals].
   *
   * Convention: index 0 = goals scored BY the home team of leg 2 (away team in leg 1)
   *             index 1 = goals scored BY the away team of leg 2 (home team in leg 1)
   *
   * Example: Leg 1 ended 3-0 (home won). In leg 2 the loser is now at home.
   *   firstLegGoals: [0, 3]  → home team (leg2) is down 3 on aggregate → gets buff
   */
  firstLegGoals?: [number, number];
}

export interface FullMatchResult {
  h1: [number, number];
  h2: [number, number];
  total: [number, number];
  /** Accumulated red cards across all periods [home, away] */
  redCards: [number, number];
  /** True if the match went to extra time */
  extraTime?: boolean;
  et1?: [number, number];
  et2?: [number, number];
}

// ─────────────────────────────────────────────────────────────
// CORE POISSON HELPER
// ─────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────
// AGGREGATE BUFF
// ─────────────────────────────────────────────────────────────

/**
 * Returns [homeFactor, awayFactor] based on first-leg result.
 *
 * The team losing on aggregate receives a motivation boost; the team
 * ahead receives a slight complacency nerf.
 *
 * Buff scale (for the losing side):
 *   deficit 1 → ×1.06
 *   deficit 2 → ×1.10
 *   deficit 3+ → ×1.13  (cap)
 *
 * Nerf scale (for the leading side, smaller):
 *   ahead by 1 → ×0.97
 *   ahead by 2 → ×0.95
 *   ahead by 3+ → ×0.94  (cap)
 */
function getAggregateFactors(firstLegGoals: [number, number]): { homeFactor: number; awayFactor: number } {
  const [leg2HomeInLeg1, leg2AwayInLeg1] = firstLegGoals;
  // deficit > 0 means home team (leg2) is losing on aggregate
  const deficit = leg2AwayInLeg1 - leg2HomeInLeg1;

  if (deficit === 0) return { homeFactor: 1.0, awayFactor: 1.0 };

  const absDeficit = Math.abs(deficit);

  const buffForLoser = absDeficit === 1 ? 1.06 : absDeficit === 2 ? 1.1 : 1.13; // cap at 3+

  const nerfForLeader = absDeficit === 1 ? 0.97 : absDeficit === 2 ? 0.95 : 0.94; // cap at 3+

  if (deficit > 0) {
    // Home team (leg2) is losing → buff home, nerf away
    return { homeFactor: buffForLoser, awayFactor: nerfForLeader };
  } else {
    // Away team (leg2) is losing → buff away, nerf home
    return { homeFactor: nerfForLeader, awayFactor: buffForLoser };
  }
}

// ─────────────────────────────────────────────────────────────
// RED CARD SYSTEM
// ─────────────────────────────────────────────────────────────

/**
 * Simulates red cards drawn during a half.
 * Base probability per team per period: ~5% regular time, ~3% extra time.
 */
function simulateRedCards(isExtraTime = false): [number, number] {
  const prob = isExtraTime ? 0.03 : 0.05;
  return [Math.random() < prob ? 1 : 0, Math.random() < prob ? 1 : 0];
}

/**
 * Returns a rate multiplier for a team with accumulated red cards.
 *
 * Penalty per red card varies by when the card was received:
 *   H1 red (applied in H2+)   → ×0.82 per card  (full game impact)
 *   H2 red (applied in ET)    → ×0.87 per card  (partial impact)
 *   ET1 red (applied in ET2)  → ×0.90 per card  (minimal time left)
 *
 * Hard floor: combined factor never drops below ×0.65.
 */
function getRedCardFactor(redsFromH1: number, redsFromH2: number, redsFromET1: number): number {
  const factor = Math.pow(0.82, redsFromH1) * Math.pow(0.87, redsFromH2) * Math.pow(0.9, redsFromET1);
  return Math.max(factor, 0.65);
}

// ─────────────────────────────────────────────────────────────
// EXPECTED GOALS
// ─────────────────────────────────────────────────────────────

function getExpectedGoals(
  teamRate: number,
  opponentRate: number,
  formFactor: number,
  modifiers: {
    aggregateFactor?: number;
    redCardFactor?: number;
    isExtraTime?: boolean;
  } = {},
): number {
  const { aggregateFactor = 1.0, redCardFactor = 1.0, isExtraTime = false } = modifiers;

  const BASE_GOALS_PER_HALF = 0.55;
  const strengthRatio = Math.pow(teamRate / opponentRate, 0.4);
  const fatigueFactor = isExtraTime ? 0.4 : 1.0;

  const raw = BASE_GOALS_PER_HALF * strengthRatio * formFactor * fatigueFactor * aggregateFactor * redCardFactor;

  return Math.min(raw, 2.5);
}

// ─────────────────────────────────────────────────────────────
// INTERNAL HALF SIMULATION
// ─────────────────────────────────────────────────────────────

function simulateHalfInternal(
  homeRate: number,
  awayRate: number,
  modifiers: {
    homeAggregateFactor?: number;
    awayAggregateFactor?: number;
    homeRedCardFactor?: number;
    awayRedCardFactor?: number;
    isExtraTime?: boolean;
  } = {},
): { goals: [number, number]; redCards: [number, number] } {
  const {
    homeAggregateFactor = 1.0,
    awayAggregateFactor = 1.0,
    homeRedCardFactor = 1.0,
    awayRedCardFactor = 1.0,
    isExtraTime = false,
  } = modifiers;

  // Shared form factor: represents the general rhythm/tempo of this period
  const formFactor = 0.9 + Math.random() * 0.2;

  const homeExpected = getExpectedGoals(homeRate, awayRate, formFactor, {
    aggregateFactor: homeAggregateFactor,
    redCardFactor: homeRedCardFactor,
    isExtraTime,
  });
  const awayExpected = getExpectedGoals(awayRate, homeRate, formFactor, {
    aggregateFactor: awayAggregateFactor,
    redCardFactor: awayRedCardFactor,
    isExtraTime,
  });

  return {
    goals: [poissonRandom(homeExpected), poissonRandom(awayExpected)],
    redCards: simulateRedCards(isExtraTime),
  };
}

// ─────────────────────────────────────────────────────────────
// PUBLIC API: simulateHalf (kept for backwards compatibility)
// ─────────────────────────────────────────────────────────────

export function simulateHalf(homeRate: number, awayRate: number, isExtraTime = false): [number, number] {
  const formFactor = 0.9 + Math.random() * 0.2;
  const homeExpected = getExpectedGoals(homeRate, awayRate, formFactor, { isExtraTime });
  const awayExpected = getExpectedGoals(awayRate, homeRate, formFactor, { isExtraTime });
  return [poissonRandom(homeExpected), poissonRandom(awayExpected)];
}

// ─────────────────────────────────────────────────────────────
// PUBLIC API: simulateFullMatch
// ─────────────────────────────────────────────────────────────

/**
 * Simulates a full match with sequential period simulation.
 * Red cards from each period propagate as nerfs to subsequent periods.
 *
 * @param homeRate           Home team strength rate (0.01–9.99)
 * @param awayRate           Away team strength rate (0.01–9.99)
 * @param context            Optional: firstLegGoals for 2-legged ties
 * @param simulateExtraTime  If true and tied after 90min, simulate ET
 *
 * Usage for a regular match:
 *   simulateFullMatch(homeRate, awayRate)
 *
 * Usage for a second leg (home team lost 0-3 in leg 1):
 *   simulateFullMatch(homeRate, awayRate, { firstLegGoals: [0, 3] })
 *
 * Usage for a knockout match that may go to ET:
 *   simulateFullMatch(homeRate, awayRate, {}, true)
 */
export function simulateFullMatch(
  homeRate: number,
  awayRate: number,
  context: MatchContext = {},
  simulateExtraTime = false,
): FullMatchResult {
  // ── Aggregate motivation factors ──────────────────────────
  const { homeFactor: homeAgg, awayFactor: awayAgg } = context.firstLegGoals
    ? getAggregateFactors(context.firstLegGoals)
    : { homeFactor: 1.0, awayFactor: 1.0 };

  // ── FIRST HALF ────────────────────────────────────────────
  const h1 = simulateHalfInternal(homeRate, awayRate, {
    homeAggregateFactor: homeAgg,
    awayAggregateFactor: awayAgg,
  });

  // Red cards from H1 affect H2
  const homeRedFactorH2 = getRedCardFactor(h1.redCards[0], 0, 0);
  const awayRedFactorH2 = getRedCardFactor(h1.redCards[1], 0, 0);

  // ── SECOND HALF ───────────────────────────────────────────
  const h2 = simulateHalfInternal(homeRate, awayRate, {
    homeAggregateFactor: homeAgg,
    awayAggregateFactor: awayAgg,
    homeRedCardFactor: homeRedFactorH2,
    awayRedCardFactor: awayRedFactorH2,
  });

  const totalRegular: [number, number] = [h1.goals[0] + h2.goals[0], h1.goals[1] + h2.goals[1]];

  const redsAfterRegular: [number, number] = [h1.redCards[0] + h2.redCards[0], h1.redCards[1] + h2.redCards[1]];

  // Return early if no extra time needed/requested
  if (!simulateExtraTime || totalRegular[0] !== totalRegular[1]) {
    return {
      h1: h1.goals,
      h2: h2.goals,
      total: totalRegular,
      redCards: redsAfterRegular,
    };
  }

  // ── EXTRA TIME 1st HALF ───────────────────────────────────
  // H1 reds have full weight; H2 reds have partial weight in ET
  const homeRedFactorET1 = getRedCardFactor(h1.redCards[0], h2.redCards[0], 0);
  const awayRedFactorET1 = getRedCardFactor(h1.redCards[1], h2.redCards[1], 0);

  const et1 = simulateHalfInternal(homeRate, awayRate, {
    homeAggregateFactor: homeAgg,
    awayAggregateFactor: awayAgg,
    homeRedCardFactor: homeRedFactorET1,
    awayRedCardFactor: awayRedFactorET1,
    isExtraTime: true,
  });

  // ── EXTRA TIME 2nd HALF ───────────────────────────────────
  const homeRedFactorET2 = getRedCardFactor(h1.redCards[0], h2.redCards[0], et1.redCards[0]);
  const awayRedFactorET2 = getRedCardFactor(h1.redCards[1], h2.redCards[1], et1.redCards[1]);

  const et2 = simulateHalfInternal(homeRate, awayRate, {
    homeAggregateFactor: homeAgg,
    awayAggregateFactor: awayAgg,
    homeRedCardFactor: homeRedFactorET2,
    awayRedCardFactor: awayRedFactorET2,
    isExtraTime: true,
  });

  const redsTotal: [number, number] = [
    redsAfterRegular[0] + et1.redCards[0] + et2.redCards[0],
    redsAfterRegular[1] + et1.redCards[1] + et2.redCards[1],
  ];

  const totalWithET: [number, number] = [
    totalRegular[0] + et1.goals[0] + et2.goals[0],
    totalRegular[1] + et1.goals[1] + et2.goals[1],
  ];

  return {
    h1: h1.goals,
    h2: h2.goals,
    total: totalWithET,
    redCards: redsTotal,
    extraTime: true,
    et1: et1.goals,
    et2: et2.goals,
  };
}

// ─────────────────────────────────────────────────────────────
// MATCH STATS GENERATION
// ─────────────────────────────────────────────────────────────

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
      rand < 0.5 ? 0.05 + Math.random() * 0.1 : rand < 0.8 ? 0.15 + Math.random() * 0.25 : 0.4 + Math.random() * 0.35;
    return { xG_value: roundTo2(xG_value), onTarget: true };
  } else {
    const xG_value = 0.01 + Math.random() * 0.11;
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
    for (let i = 0; i < Math.min(goalsScored, onTargetShots.length); i++) {
      onTargetShots[i].xG_value = roundTo2(0.2 + Math.random() * 0.55);
    }
  }

  return shots;
}

/**
 * Generates realistic match statistics.
 *
 * @param totalRedCards - Pass result.redCards from simulateFullMatch to keep
 *                        red card stats consistent with simulation outcome.
 */
export function generateMatchStats(
  homeRate: number,
  awayRate: number,
  homeGoals: number,
  awayGoals: number,
  totalRedCards: [number, number] = [0, 0],
): { homeStats: TeamMatchStats; awayStats: TeamMatchStats } {
  const homeStrength = homeRate + (Math.random() - 0.5) * 1.5;
  const awayStrength = awayRate + (Math.random() - 0.5) * 1.5;
  const totalStrength = Math.max(homeStrength, 0.5) + Math.max(awayStrength, 0.5);
  const rawHomePoss = (Math.max(homeStrength, 0.5) / totalStrength) * 100;
  const homePossession = Math.round(Math.max(25, Math.min(75, rawHomePoss)));
  const awayPossession = 100 - homePossession;

  const homeShotsBase = 5 + (homePossession / 100) * 10 + (homeRate / 10) * 5;
  const awayShotsBase = 5 + (awayPossession / 100) * 10 + (awayRate / 10) * 5;
  const homeShots = Math.max(homeGoals + 1, randInt(Math.floor(homeShotsBase - 2), Math.ceil(homeShotsBase + 3)));
  const awayShots = Math.max(awayGoals + 1, randInt(Math.floor(awayShotsBase - 2), Math.ceil(awayShotsBase + 3)));

  const homeSotMin = Math.max(homeGoals, Math.ceil(homeShots * 0.1));
  const homeSotMax = Math.max(homeSotMin, Math.floor(homeShots * 0.5));
  const homeShotsOnTarget = randInt(homeSotMin, homeSotMax);

  const awaySotMin = Math.max(awayGoals, Math.ceil(awayShots * 0.1));
  const awaySotMax = Math.max(awaySotMin, Math.floor(awayShots * 0.5));
  const awayShotsOnTarget = randInt(awaySotMin, awaySotMax);

  const homeShotsArray = generateShotsArray(homeShots, homeShotsOnTarget, homeGoals);
  const awayShotsArray = generateShotsArray(awayShots, awayShotsOnTarget, awayGoals);

  const homeXg = roundTo2(homeShotsArray.reduce((sum, s) => sum + s.xG_value, 0));
  const awayXg = roundTo2(awayShotsArray.reduce((sum, s) => sum + s.xG_value, 0));

  const homeFouls = randInt(8, 18) + Math.round((awayPossession - 50) / 10);
  const awayFouls = randInt(8, 18) + Math.round((homePossession - 50) / 10);

  const homeCorners = randInt(2, Math.max(3, Math.round(homeShots * 0.5)));
  const awayCorners = randInt(2, Math.max(3, Math.round(awayShots * 0.5)));

  const homeYellow = Math.min(homeFouls, randInt(0, Math.max(0, Math.floor(homeFouls / 5))));
  const awayYellow = Math.min(awayFouls, randInt(0, Math.max(0, Math.floor(awayFouls / 5))));

  // Use red cards from simulation result to keep stats consistent with what actually happened
  const homeRed = Math.min(totalRedCards[0], 2);
  const awayRed = Math.min(totalRedCards[1], 2);

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
