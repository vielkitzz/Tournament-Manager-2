/**
 * Realistic match simulation engine based on team rates.
 *
 * Uses a Poisson model where each team's expected goals per half
 * is derived from their rate relative to the opponent's rate.
 *
 * PUBLIC API (unchanged — BracketView and other callers require this):
 *   simulateHalf(homeRate, awayRate, isExtraTime?)  → [number, number]
 *   simulateFullMatch(homeRate, awayRate)            → { h1, h2, total }
 *   generateMatchStats(...)
 *
 * INTERNAL systems (transparent to callers):
 *   - Sequential period simulation: red cards drawn in H1 propagate as
 *     nerfs to H2, and likewise through extra time periods.
 *   - Aggregate deficit buff: when simulateFullMatch is called via the
 *     internal path that knows the first-leg result, the trailing team
 *     receives a motivation boost and the leading team a complacency nerf.
 *     This is used by simulateLeg2() which BracketView calls directly.
 */

import { TeamMatchStats } from "@/types/tournament";

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
// RED CARD SYSTEM
// ─────────────────────────────────────────────────────────────

/**
 * Simulates red cards drawn during a half.
 * ~5% chance per team in regular time, ~3% in extra time.
 */
function simulateRedCards(isExtraTime = false): [number, number] {
  const prob = isExtraTime ? 0.03 : 0.05;
  return [Math.random() < prob ? 1 : 0, Math.random() < prob ? 1 : 0];
}

/**
 * Returns a rate multiplier for a team with accumulated red cards.
 *
 * Penalty per red card by origin:
 *   H1 red → ×0.82 (affects H2 and ET)
 *   H2 red → ×0.87 (affects ET only)
 *   ET1 red → ×0.90 (affects ET2 only)
 *
 * Floor: never drops below ×0.65 regardless of card count.
 */
function getRedCardFactor(redsFromH1: number, redsFromH2: number, redsFromET1: number): number {
  const factor = Math.pow(0.82, redsFromH1) * Math.pow(0.87, redsFromH2) * Math.pow(0.9, redsFromET1);
  return Math.max(factor, 0.65);
}

// ─────────────────────────────────────────────────────────────
// AGGREGATE BUFF
// ─────────────────────────────────────────────────────────────

/**
 * Returns [homeFactor, awayFactor] based on the first-leg result.
 *
 * Convention (from the perspective of the second leg):
 *   firstLegGoals[0] = goals scored BY the home team of leg 2 in leg 1
 *                      (they were the away team then) = leg1.awayScore
 *   firstLegGoals[1] = goals scored BY the away team of leg 2 in leg 1
 *                      (they were the home team then) = leg1.homeScore
 *
 * The team losing on aggregate receives a motivation buff;
 * the team ahead receives a slight complacency nerf.
 *
 * Buff scale (losing side):   deficit 1 → ×1.06 | 2 → ×1.10 | 3+ → ×1.13
 * Nerf scale (leading side):  ahead by 1 → ×0.97 | 2 → ×0.95 | 3+ → ×0.94
 */
function getAggregateFactors(firstLegGoals: [number, number]): { homeFactor: number; awayFactor: number } {
  const [leg2HomeInLeg1, leg2AwayInLeg1] = firstLegGoals;
  // deficit > 0 → home team (leg 2) is losing on aggregate
  const deficit = leg2AwayInLeg1 - leg2HomeInLeg1;

  if (deficit === 0) return { homeFactor: 1.0, awayFactor: 1.0 };

  const abs = Math.abs(deficit);
  const buffForLoser = abs === 1 ? 1.06 : abs === 2 ? 1.1 : 1.13;
  const nerfForLeader = abs === 1 ? 0.97 : abs === 2 ? 0.95 : 0.94;

  return deficit > 0
    ? { homeFactor: buffForLoser, awayFactor: nerfForLeader }
    : { homeFactor: nerfForLeader, awayFactor: buffForLoser };
}

// ─────────────────────────────────────────────────────────────
// EXPECTED GOALS (internal)
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

  // Shared form factor: same tempo for both teams in a given period
  const formFactor = 0.9 + Math.random() * 0.2;

  return {
    goals: [
      poissonRandom(
        getExpectedGoals(homeRate, awayRate, formFactor, {
          aggregateFactor: homeAggregateFactor,
          redCardFactor: homeRedCardFactor,
          isExtraTime,
        }),
      ),
      poissonRandom(
        getExpectedGoals(awayRate, homeRate, formFactor, {
          aggregateFactor: awayAggregateFactor,
          redCardFactor: awayRedCardFactor,
          isExtraTime,
        }),
      ),
    ],
    redCards: simulateRedCards(isExtraTime),
  };
}

// ─────────────────────────────────────────────────────────────
// INTERNAL FULL MATCH (with all systems active)
// ─────────────────────────────────────────────────────────────

interface InternalMatchResult {
  h1: [number, number];
  h2: [number, number];
  total: [number, number];
  redCards: [number, number];
  extraTime?: boolean;
  et1?: [number, number];
  et2?: [number, number];
}

function simulateFullMatchInternal(
  homeRate: number,
  awayRate: number,
  firstLegGoals?: [number, number],
  allowExtraTime = false,
): InternalMatchResult {
  const { homeFactor: homeAgg, awayFactor: awayAgg } = firstLegGoals
    ? getAggregateFactors(firstLegGoals)
    : { homeFactor: 1.0, awayFactor: 1.0 };

  // ── H1 ──────────────────────────────────────────────────────
  const h1 = simulateHalfInternal(homeRate, awayRate, {
    homeAggregateFactor: homeAgg,
    awayAggregateFactor: awayAgg,
  });

  // Red cards from H1 penalise H2
  const h2 = simulateHalfInternal(homeRate, awayRate, {
    homeAggregateFactor: homeAgg,
    awayAggregateFactor: awayAgg,
    homeRedCardFactor: getRedCardFactor(h1.redCards[0], 0, 0),
    awayRedCardFactor: getRedCardFactor(h1.redCards[1], 0, 0),
  });

  const totalRegular: [number, number] = [h1.goals[0] + h2.goals[0], h1.goals[1] + h2.goals[1]];
  const redsRegular: [number, number] = [h1.redCards[0] + h2.redCards[0], h1.redCards[1] + h2.redCards[1]];

  if (!allowExtraTime || totalRegular[0] !== totalRegular[1]) {
    return { h1: h1.goals, h2: h2.goals, total: totalRegular, redCards: redsRegular };
  }

  // ── ET1 ─────────────────────────────────────────────────────
  const et1 = simulateHalfInternal(homeRate, awayRate, {
    homeAggregateFactor: homeAgg,
    awayAggregateFactor: awayAgg,
    homeRedCardFactor: getRedCardFactor(h1.redCards[0], h2.redCards[0], 0),
    awayRedCardFactor: getRedCardFactor(h1.redCards[1], h2.redCards[1], 0),
    isExtraTime: true,
  });

  // ── ET2 ─────────────────────────────────────────────────────
  const et2 = simulateHalfInternal(homeRate, awayRate, {
    homeAggregateFactor: homeAgg,
    awayAggregateFactor: awayAgg,
    homeRedCardFactor: getRedCardFactor(h1.redCards[0], h2.redCards[0], et1.redCards[0]),
    awayRedCardFactor: getRedCardFactor(h1.redCards[1], h2.redCards[1], et1.redCards[1]),
    isExtraTime: true,
  });

  const totalWithET: [number, number] = [
    totalRegular[0] + et1.goals[0] + et2.goals[0],
    totalRegular[1] + et1.goals[1] + et2.goals[1],
  ];
  const redsTotal: [number, number] = [
    redsRegular[0] + et1.redCards[0] + et2.redCards[0],
    redsRegular[1] + et1.redCards[1] + et2.redCards[1],
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
// PUBLIC API — unchanged signatures
// ─────────────────────────────────────────────────────────────

/**
 * Simulates a single half. Kept for backwards compatibility.
 * Does not apply red card or aggregate systems (stateless call).
 */
export function simulateHalf(homeRate: number, awayRate: number, isExtraTime = false): [number, number] {
  const formFactor = 0.9 + Math.random() * 0.2;
  return [
    poissonRandom(getExpectedGoals(homeRate, awayRate, formFactor, { isExtraTime })),
    poissonRandom(getExpectedGoals(awayRate, homeRate, formFactor, { isExtraTime })),
  ];
}

/**
 * Simulates a full 90-minute match.
 *
 * Signature is UNCHANGED — BracketView and all other callers continue
 * working without modification.
 *
 * Internally uses the sequential period engine:
 *   H1 → red cards → H2 (with red card nerfs applied)
 * No extra time is triggered here; ET is handled by BracketView/simulateLeg2
 * via the separate simulateLeg2() export when needed.
 */
export function simulateFullMatch(
  homeRate: number,
  awayRate: number,
): {
  h1: [number, number];
  h2: [number, number];
  total: [number, number];
} {
  const result = simulateFullMatchInternal(homeRate, awayRate);
  return { h1: result.h1, h2: result.h2, total: result.total };
}

/**
 * Simulates the second leg of a two-legged knockout tie.
 *
 * Applies the aggregate motivation buff/nerf based on the first-leg
 * result, and runs the full sequential period engine (H1 → red cards → H2,
 * and optionally ET1 → ET2) internally.
 *
 * Call this instead of simulateFullMatch when simulating leg 2.
 *
 * @param homeRate     Rate of the home team in leg 2
 * @param awayRate     Rate of the away team in leg 2
 * @param leg1HomeScore  Goals scored by the home team in leg 1
 *                       (= awayScore of the leg1 Match object, since
 *                        the home team in leg 2 was the away team in leg 1)
 * @param leg1AwayScore  Goals scored by the away team in leg 1
 *                       (= homeScore of the leg1 Match object)
 * @param allowExtraTime  Whether extra time is enabled for this competition
 */
export function simulateLeg2(
  homeRate: number,
  awayRate: number,
  leg1HomeScore: number,
  leg1AwayScore: number,
  allowExtraTime = false,
): {
  h1: [number, number];
  h2: [number, number];
  total: [number, number];
  extraTime?: boolean;
  et1?: [number, number];
  et2?: [number, number];
} {
  // Convention: firstLegGoals[0] = goals by leg2-home-team in leg1 = leg1HomeScore
  //             firstLegGoals[1] = goals by leg2-away-team in leg1 = leg1AwayScore
  const firstLegGoals: [number, number] = [leg1HomeScore, leg1AwayScore];
  const result = simulateFullMatchInternal(homeRate, awayRate, firstLegGoals, allowExtraTime);
  return {
    h1: result.h1,
    h2: result.h2,
    total: result.total,
    ...(result.extraTime && {
      extraTime: true,
      et1: result.et1,
      et2: result.et2,
    }),
  };
}

// ─────────────────────────────────────────────────────────────
// MATCH STATS GENERATION — unchanged
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
    return { xG_value: roundTo2(0.01 + Math.random() * 0.11), onTarget: false };
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
    const onTarget = shots.filter((s) => s.onTarget);
    for (let i = 0; i < Math.min(goalsScored, onTarget.length); i++) {
      onTarget[i].xG_value = roundTo2(0.2 + Math.random() * 0.55);
    }
  }
  return shots;
}

export function generateMatchStats(
  homeRate: number,
  awayRate: number,
  homeGoals: number,
  awayGoals: number,
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
  const homeRed = Math.random() < 0.08 ? 1 : 0;
  const awayRed = Math.random() < 0.08 ? 1 : 0;

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
