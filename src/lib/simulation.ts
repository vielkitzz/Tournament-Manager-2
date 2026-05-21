/**
 * Realistic match simulation engine based on team rates.
 *
 * Changelog vs versão anterior:
 * - Expoente de força proporcional ajustado de 0.7 → 1.0 (zebras menos frequentes)
 * - Cap de gols esperados por tempo aumentado de 2.0 → 3.0
 * - Suporte a moral (parâmetro externo opcional) como modificador do rate
 * - Modificador de urgência no mata-mata proporcional ao deficit agregado
 * - Faltas removidas do feed narrativo exceto as que geram cartão
 * - Distribuição de faltas concentrada em fases do jogo (não mais flat)
 * - skillAmplifier com curva menos agressiva (potência 2 em vez de 4)
 * - Pênaltis: confronto overall batedor vs goleiro quando elencos disponíveis
 *
 * NOTA — Moral: para funcionar plenamente, o histórico de partidas deve ser
 * calculado FORA deste arquivo (no MatchPopup ou num hook dedicado) e passado
 * como parâmetro `homeMoral` / `awayMoral` (valor entre -0.15 e +0.15).
 * Enquanto esse cálculo externo não existir, passe 0 para os dois e o
 * comportamento será idêntico ao anterior.
 */

import { TeamMatchStats, MatchEvent, Match, Player, Team, TournamentSettings } from "@/types/tournament";

// ---------------------------------------------------------------------------
// Utilitários
// ---------------------------------------------------------------------------

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

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function roundTo2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

const HOME_ADVANTAGE = 1.12;

// Expoente de força proporcional — era 0.7, agora 1.0 para reduzir zebras
const STRENGTH_EXPONENT = 1.0;

// Cap de gols esperados por tempo — era 2.0, aumentado para refletir jogos
// onde o favoritismo é muito grande
const MAX_EXPECTED_GOALS = 3.0;

// ---------------------------------------------------------------------------
// Moral
// ---------------------------------------------------------------------------

/**
 * Aplica o modificador de moral ao rate efetivo.
 * `moral` deve ser um valor entre -0.15 (má fase) e +0.15 (boa fase).
 * Quando 0, não altera nada — compatível com o comportamento anterior.
 *
 * NOTA: Este valor deve ser calculado externamente com base no histórico
 * de resultados do clube (últimas 5 partidas, por exemplo) e passado como
 * parâmetro. Enquanto não implementado, passe 0.
 */
export function applyMoral(rate: number, moral: number): number {
  const clamped = Math.max(-0.15, Math.min(0.15, moral));
  return rate * (1 + clamped);
}

// ---------------------------------------------------------------------------
// Urgência no mata-mata
// ---------------------------------------------------------------------------

/**
 * Calcula o modificador de urgência para o time que precisa buscar o resultado.
 * Proporcional ao deficit no agregado — quanto maior o deficit, maior o ímpeto
 * ofensivo, mas também maior a exposição defensiva.
 *
 * Retorna { attackMod, defenseMod } para o time que está atrás no agregado.
 * O time que está na frente recebe o inverso (mais defensivo).
 */
export function getSecondLegModifiers(
  aggregateDeficit: number, // positivo = este time está perdendo no agregado
): { attackMod: number; defenseMod: number } {
  if (aggregateDeficit <= 0) return { attackMod: 1.0, defenseMod: 1.0 };

  // Cada gol de deficit adiciona ~8% de ímpeto ofensivo, com teto em 30%
  const urgency = Math.min(aggregateDeficit * 0.08, 0.3);

  return {
    attackMod: 1 + urgency,
    defenseMod: 1 - urgency * 0.6, // Defesa sofre menos que o ataque ganha
  };
}

// ---------------------------------------------------------------------------
// Núcleo de gols esperados
// ---------------------------------------------------------------------------

function getTeamFormFactor(teamRate: number, matchMomentum: number): number {
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
  attackMod = 1.0,
  opponentDefenseMod = 1.0, // exposição defensiva do adversário
): number {
  const BASE_GOALS_PER_HALF = 0.55;

  // Expoente 1.0 em vez de 0.7 — diferença de rate se traduz mais fielmente
  const strengthRatio = Math.pow(teamRate / opponentRate, STRENGTH_EXPONENT);
  const homeBonus = isHome ? HOME_ADVANTAGE : 1.0;
  const formFactor = getTeamFormFactor(teamRate, matchMomentum);
  const fatigueFactor = isExtraTime ? 0.35 : 1.0;

  let expected =
    BASE_GOALS_PER_HALF * strengthRatio * formFactor * fatigueFactor * homeBonus * attackMod * opponentDefenseMod;

  expected = Math.min(MAX_EXPECTED_GOALS, expected);
  return expected;
}

// ---------------------------------------------------------------------------
// Simulação de tempos
// ---------------------------------------------------------------------------

export function simulateHalf(
  homeRate: number,
  awayRate: number,
  isExtraTime = false,
  matchMomentum = 0.5,
  homeAttackMod = 1.0,
  awayAttackMod = 1.0,
  homeDefenseMod = 1.0,
  awayDefenseMod = 1.0,
): [number, number] {
  const homeExpected = getExpectedGoals(
    homeRate,
    awayRate,
    isExtraTime,
    matchMomentum,
    true,
    homeAttackMod,
    awayDefenseMod,
  );
  const awayExpected = getExpectedGoals(
    awayRate,
    homeRate,
    isExtraTime,
    matchMomentum,
    false,
    awayAttackMod,
    homeDefenseMod,
  );
  return [poissonRandom(homeExpected), poissonRandom(awayExpected)];
}

export function simulateFullMatch(
  homeRate: number,
  awayRate: number,
  isExtraTime = false,
  homeMoral = 0,
  awayMoral = 0,
  homeAttackMod = 1.0,
  awayAttackMod = 1.0,
  homeDefenseMod = 1.0,
  awayDefenseMod = 1.0,
): {
  h1: [number, number];
  h2: [number, number];
  total: [number, number];
  xg: [number, number];
} {
  const hRate = applyMoral(homeRate, homeMoral);
  const aRate = applyMoral(awayRate, awayMoral);

  const homeXg1 = getExpectedGoals(hRate, aRate, isExtraTime, 0.5, true, homeAttackMod, awayDefenseMod);
  const awayXg1 = getExpectedGoals(aRate, hRate, isExtraTime, 0.5, false, awayAttackMod, homeDefenseMod);
  const firstHalf: [number, number] = [poissonRandom(homeXg1), poissonRandom(awayXg1)];

  const goalDiff = firstHalf[0] - firstHalf[1];
  let momentum = 0.5;
  if (goalDiff > 1) momentum = 0.7;
  else if (goalDiff < -1) momentum = 0.3;
  else if (goalDiff > 0) momentum = 0.6;
  else if (goalDiff < 0) momentum = 0.4;

  const homeXg2 = getExpectedGoals(hRate, aRate, isExtraTime, momentum, true, homeAttackMod, awayDefenseMod);
  const awayXg2 = getExpectedGoals(aRate, hRate, isExtraTime, momentum, false, awayAttackMod, homeDefenseMod);
  const secondHalf: [number, number] = [poissonRandom(homeXg2), poissonRandom(awayXg2)];

  return {
    h1: firstHalf,
    h2: secondHalf,
    total: [firstHalf[0] + secondHalf[0], firstHalf[1] + secondHalf[1]],
    xg: [roundTo2(homeXg1 + homeXg2), roundTo2(awayXg1 + awayXg2)],
  };
}

// ---------------------------------------------------------------------------
// Geração de estatísticas
// ---------------------------------------------------------------------------

function isUpsetLikely(homeRate: number, awayRate: number, homeGoals: number, awayGoals: number): boolean {
  const rateDiff = Math.abs(homeRate - awayRate);
  const strongerWon = (homeRate > awayRate && homeGoals > awayGoals) || (awayRate > homeRate && awayGoals > homeGoals);
  if (strongerWon) return false;
  if (rateDiff > 3.0) return Math.random() > 0.92; // Zebra ainda mais rara
  if (rateDiff > 2.0) return Math.random() > 0.85;
  if (rateDiff > 1.0) return Math.random() > 0.7;
  return Math.random() > 0.5;
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

  function generateShotsArray(
    totalShots: number,
    shotsOnTarget: number,
    goalsScored: number,
    targetXg?: number,
  ): { xG_value: number; onTarget: boolean }[] {
    const shots: { xG_value: number; onTarget: boolean }[] = [];
    const generateShot = (isOnTarget: boolean) => {
      if (isOnTarget) {
        const rand = Math.random();
        const xG_value =
          rand < 0.6
            ? 0.05 + Math.random() * 0.12
            : rand < 0.85
              ? 0.17 + Math.random() * 0.23
              : 0.4 + Math.random() * 0.35;
        return { xG_value: roundTo2(xG_value), onTarget: true };
      }
      return { xG_value: roundTo2(0.01 + Math.random() * 0.1), onTarget: false };
    };

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

  // Faltas — geradas nos números mas distribuição concentrada em fases
  let homeFouls = randInt(6, 14) + Math.round((awayPossession - 50) / 12);
  let awayFouls = randInt(6, 14) + Math.round((homePossession - 50) / 12);
  homeFouls = Math.max(4, Math.min(20, homeFouls));
  awayFouls = Math.max(4, Math.min(20, awayFouls));

  const homeCorners = randInt(1, Math.max(2, Math.min(10, Math.round(homeShots * 0.4))));
  const awayCorners = randInt(1, Math.max(2, Math.min(10, Math.round(awayShots * 0.4))));

  const homeYellow = Math.min(3, randInt(0, Math.max(1, Math.floor(homeFouls / 6))));
  const awayYellow = Math.min(3, randInt(0, Math.max(1, Math.floor(awayFouls / 6))));

  const homeRed = Math.random() < 0.1 ? 1 : 0;
  const awayRed = Math.random() < 0.1 ? 1 : 0;

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

// ---------------------------------------------------------------------------
// Suspensões
// ---------------------------------------------------------------------------

export function getSuspendedPlayerIds(
  tournamentMatches: Match[],
  currentRound: number,
  teamId: string,
  settings: TournamentSettings & { resetYellowsAfterRound?: number },
): Set<string> {
  const suspended = new Set<string>();
  const yellowLimit = settings.yellowCardsToSuspend ?? 3;
  const yellowDuration = settings.yellowSuspensionDuration ?? 1;
  const redDuration = settings.redSuspensionDuration ?? 1;
  const resetRound = settings.resetYellowsAfterRound ?? 0;

  const pastMatches = tournamentMatches.filter(
    (m) =>
      m.played &&
      m.round < currentRound &&
      m.round >= resetRound &&
      m.events &&
      (m.homeTeamId === teamId || m.awayTeamId === teamId),
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

// ---------------------------------------------------------------------------
// Pesos posicionais — skillAmplifier menos agressivo (potência 2 em vez de 4)
// ---------------------------------------------------------------------------

const POSITION_GOAL_WEIGHT: Record<string, number> = {
  Goleiro: 0,
  GOL: 0,
  Zagueiro: 0.04,
  ZAG: 0.04,
  "Lateral Direito": 0.08,
  LD: 0.08,
  "Lateral Esquerdo": 0.08,
  LE: 0.08,
  Volante: 0.2,
  VOL: 0.2,
  Meia: 1.5,
  MC: 1.5,
  "Meia Atacante": 3.0,
  MEI: 3.0,
  "Ponta Direita": 4.0,
  PD: 4.0,
  "Ponta Esquerda": 4.0,
  PE: 4.0,
  Centroavante: 6.0,
  ATA: 6.0,
  Atacante: 6.0,
  SA: 6.0,
};

const POSITION_ASSIST_WEIGHT: Record<string, number> = {
  Goleiro: 0,
  GOL: 0,
  Zagueiro: 0.08,
  ZAG: 0.08,
  "Lateral Direito": 1.0,
  LD: 1.0,
  "Lateral Esquerdo": 1.0,
  LE: 1.0,
  Volante: 0.6,
  VOL: 0.6,
  Meia: 5.0,
  MC: 5.0,
  "Meia Atacante": 4.0,
  MEI: 4.0,
  "Ponta Direita": 3.5,
  PD: 3.5,
  "Ponta Esquerda": 3.5,
  PE: 3.5,
  Centroavante: 1.5,
  ATA: 1.5,
  Atacante: 2.0,
  SA: 2.0,
};

const POSITION_FOUL_WEIGHT: Record<string, number> = {
  Goleiro: 0,
  GOL: 0,
  Zagueiro: 3.0,
  ZAG: 3.0,
  "Lateral Direito": 2.0,
  LD: 2.0,
  "Lateral Esquerdo": 2.0,
  LE: 2.0,
  Volante: 4.0,
  VOL: 4.0,
  Meia: 1.5,
  MC: 1.5,
  "Meia Atacante": 1.0,
  MEI: 1.0,
  "Ponta Direita": 1.0,
  PD: 1.0,
  "Ponta Esquerda": 1.0,
  PE: 1.0,
  Centroavante: 1.0,
  ATA: 1.0,
  Atacante: 1.0,
  SA: 1.0,
};

/**
 * Curva de amplificação por skill — potência 2 em vez de 4.
 * Mantém diferenciação entre bons e mediocres sem dominar os pesos posicionais.
 */
function skillAmplifier(skill: number | undefined): number {
  const s = Math.max(45, Math.min(99, skill ?? 70));
  const normalized = (s - 45) / 54;
  return Math.pow(normalized, 2) * 9 + 1; // range ~1–10 em vez de 1–50
}

function weightedPickSkill(
  players: Player[],
  posWeights: Record<string, number>,
  exclude?: string,
): Player | undefined {
  const available = exclude ? players.filter((p) => p.id !== exclude) : players;
  if (available.length === 0) return undefined;

  const filtered = available.filter((p) => (posWeights[p.position || ""] ?? 1) > 0);
  const pool = filtered.length > 0 ? filtered : available;

  const w = pool.map((p) => {
    const posW = posWeights[p.position || ""] ?? 1;
    return posW * skillAmplifier(p.skill);
  });

  const total = w.reduce((s, v) => s + v, 0);
  if (total <= 0) return undefined;
  let r = Math.random() * total;
  for (let i = 0; i < pool.length; i++) {
    r -= w[i];
    if (r <= 0) return pool[i];
  }
  return pool[pool.length - 1];
}

function buildScorerPool(players: Player[], posWeights: Record<string, number>): Player[] {
  // Exclui jogadores com peso 0 (goleiros não entram em pool de gols/assists)
  const eligible = players.filter((p) => (posWeights[p.position || ""] ?? 1) > 0);
  if (eligible.length === 0) return [];

  const weights = eligible.map((p) => {
    const posW = posWeights[p.position || ""] ?? 1;
    return posW * skillAmplifier(p.skill);
  });
  const total = weights.reduce((s, v) => s + v, 0);

  const POOL_SIZE = 30;
  const pool: Player[] = [];

  eligible.forEach((p, i) => {
    const slots = Math.max(1, Math.round((weights[i] / total) * POOL_SIZE));
    for (let s = 0; s < slots; s++) pool.push(p);
  });

  const topIdx = weights.reduce((best, w, i) => (w > weights[best] ? i : best), 0);
  const topPlayer = eligible[topIdx];

  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  while (pool.length > POOL_SIZE) pool.pop();
  while (pool.length < POOL_SIZE) pool.push(topPlayer);

  return pool;
}

function pickFromPool(
  pool: Player[],
  minute: number,
  isOnPitch: (id: string, minute: number) => boolean,
  matchGoalCounts: Map<string, number>,
  exclude?: string,
): Player | undefined {
  // Filtra goleiros explicitamente além do isOnPitch
  const eligible = pool.filter(
    (p) => p.id !== exclude && isOnPitch(p.id, minute) && (POSITION_GOAL_WEIGHT[p.position || ""] ?? 0) > 0,
  );
  if (eligible.length === 0) return undefined;

  const weights = eligible.map((p) => {
    const goalsThisMatch = matchGoalCounts.get(p.id) ?? 0;
    return Math.pow(1.6, goalsThisMatch);
  });

  const total = weights.reduce((s, v) => s + v, 0);
  let r = Math.random() * total;

  for (let i = 0; i < eligible.length; i++) {
    r -= weights[i];
    if (r <= 0) {
      matchGoalCounts.set(eligible[i].id, (matchGoalCounts.get(eligible[i].id) ?? 0) + 1);
      return eligible[i];
    }
  }

  const last = eligible[eligible.length - 1];
  matchGoalCounts.set(last.id, (matchGoalCounts.get(last.id) ?? 0) + 1);
  return last;
}

// ---------------------------------------------------------------------------
// Pênaltis — confronto batedor vs goleiro quando elencos disponíveis
// ---------------------------------------------------------------------------

/**
 * Simula uma cobrança de pênalti.
 *
 * Quando `kicker` e `goalkeeper` são fornecidos, a chance é calculada pelo
 * confronto de skills individuais. Caso contrário mantém o flat 75% anterior.
 */
export function simulatePenaltyKick(kicker?: Player, goalkeeper?: Player): boolean {
  if (!kicker || !goalkeeper) {
    // Comportamento original — sem elenco disponível
    return Math.random() < 0.75;
  }

  const kickerSkill = kicker.skill ?? 70;
  const gkSkill = goalkeeper.skill ?? 70;

  // Base de conversão: 75% para skills iguais (70 vs 70)
  // Cada ponto de diferença vale ~0.4% na margem
  const delta = kickerSkill - gkSkill;
  const conversionRate = Math.max(0.45, Math.min(0.92, 0.75 + delta * 0.004));

  return Math.random() < conversionRate;
}

/**
 * Seleciona o goleiro titular de um elenco.
 * Retorna o jogador com position === "Goleiro" de maior skill.
 */
export function getStartingGoalkeeper(players: Player[]): Player | undefined {
  const gks = players.filter((p) => (p.position || "").toLowerCase() === "goleiro");
  if (gks.length === 0) return undefined;
  return gks.reduce((best, p) => ((p.skill ?? 0) > (best.skill ?? 0) ? p : best));
}

export function getBestPenaltyKicker(players: Player[]): Player | undefined {
  const outfield = players.filter((p) => (p.position || "").toLowerCase() !== "goleiro");
  if (outfield.length === 0) return undefined;
  return outfield.reduce((best, p) => ((p.skill ?? 0) > (best.skill ?? 0) ? p : best));
}

// ---------------------------------------------------------------------------
// Geração de eventos minuto a minuto
// ---------------------------------------------------------------------------

/**
 * Retorna um minuto concentrado nas fases quentes do jogo.
 * 40% das faltas ocorrem nos primeiros 20 min ou nos últimos 15 min.
 */
function foulMinute(): number {
  const r = Math.random();
  if (r < 0.2) return randInt(1, 20); // Início — times se conhecendo
  if (r < 0.35) return randInt(75, 90); // Final — pressão por resultado
  return randInt(21, 74); // Restante distribuído
}

export function generateMinuteByMinuteEvents(
  homeTeam: Team,
  awayTeam: Team,
  homeStarters: Player[],
  awayStarters: Player[],
  matchStats: { homeStats: TeamMatchStats; awayStats: TeamMatchStats },
  homeGoals: number,
  awayGoals: number,
  halfGoals?: { h1: [number, number]; h2: [number, number] },
  homeBenchPlayers?: Player[],
  awayBenchPlayers?: Player[],
): MatchEvent[] {
  const events: MatchEvent[] = [];
  const matchGoalCounts = new Map<string, number>();
  let eventId = 0;
  const genId = () => `evt-${++eventId}`;

  const produced = {
    home: { goals: 0, fouls: 0, yellow: 0, red: 0, offsides: 0, shots: 0, shotsOnTarget: 0 },
    away: { goals: 0, fouls: 0, yellow: 0, red: 0, offsides: 0, shots: 0, shotsOnTarget: 0 },
  };

  // Cria o conjunto de IDs para busca rápida
  const starterIds = new Set([...homeStarters.map((p) => p.id), ...awayStarters.map((p) => p.id)]);

  // O BANCO: Todo mundo que não está no conjunto de IDs dos titulares
  const homeBench = homeBenchPlayers || [];
  const awayBench = awayBenchPlayers || [];

  console.log(`[SIMULADOR] ${homeTeam.name} - Recebeu ${homeStarters.length} titulares e ${homeBench.length} reservas`);

  const subOutAt = new Map<string, number>();
  const subInAt = new Map<string, number>();
  const redCardAt = new Map<string, number>();

  const isOnPitch = (playerId: string, minute: number): boolean => {
    const rc = redCardAt.get(playerId);
    if (rc !== undefined && minute >= rc) return false;
    const outAt = subOutAt.get(playerId);
    if (outAt !== undefined && minute >= outAt) return false;
    if (starterIds.has(playerId)) return true;
    const inAt = subInAt.get(playerId);
    return inAt !== undefined && minute >= inAt;
  };

  function pickAtMinuteSkill(
    players: Player[],
    posWeights: Record<string, number>,
    minute: number,
    exclude?: string,
  ): Player | undefined {
    const eligible = players.filter((p) => p.id !== exclude && isOnPitch(p.id, minute));
    return weightedPickSkill(eligible, posWeights, undefined);
  }

  // 1. Substituições
  const generateSubstitutions = (team: Team, starters: Player[], bench: Player[]) => {
    console.log(`[${team.name}] Titulares: ${starters.length}, Banco: ${bench.length}`);
    console.log("Simulador - Jogadores totais:", starters.length + bench.length);
    console.log("Simulador - Tamanho do banco:", bench.length);
    const subCount = Math.min(3, Math.max(0, Math.floor((starters.length + bench.length) / 2) - 1));
    if (subCount === 0 || bench.length === 0) return;
    const usedOut = new Set<string>();
    const usedIn = new Set<string>();
    const outCandidates = starters.filter((p) => p.position !== "Goleiro");
    const inCandidates = bench.filter((p) => p.position !== "Goleiro");

    // Agrupa posições "compatíveis" para que uma substituição respeite a
    // função em campo (defensor sai → defensor entra, e assim por diante).
    const POSITION_GROUP: Record<string, string> = {
      Zagueiro: "ZAG",
      "Lateral Direito": "LD",
      "Lateral Esquerdo": "LE",
      Volante: "VOL",
      Meia: "MC",
      "Meia Atacante": "MEI",
      "Ponta Direita": "PD",
      "Ponta Esquerda": "PE",
      Atacante: "ATA",
      "Segundo Atacante": "SA",
    };
    const groupOf = (p: Player) => POSITION_GROUP[p.position || ""] || "MID";

    for (let i = 0; i < subCount; i++) {
      const minute = randInt(55, 85);
      const availableOut = outCandidates.filter((p) => !usedOut.has(p.id));
      const availableIn = inCandidates.filter((p) => !usedIn.has(p.id));
      if (availableOut.length === 0 || availableIn.length === 0) break;
      const outPlayer = availableOut[randInt(0, availableOut.length - 1)];

      // Tenta primeiro alguém da mesma posição exata, depois do mesmo grupo
      // tático e, em último caso, qualquer jogador disponível.
      const samePosition = availableIn.filter((p) => p.position === outPlayer.position);
      const sameGroup = availableIn.filter((p) => groupOf(p) === groupOf(outPlayer));
      const inPool = samePosition.length > 0 ? samePosition : sameGroup.length > 0 ? sameGroup : availableIn;
      const inPlayer = inPool[randInt(0, inPool.length - 1)];
      usedOut.add(outPlayer.id);
      usedIn.add(inPlayer.id);
      subOutAt.set(outPlayer.id, minute);
      subInAt.set(inPlayer.id, minute);
      events.push({
        id: genId(),
        minute: minute + 0.1,
        type: "substitution",
        teamId: team.id,
        playerId: inPlayer.id,
        assistId: outPlayer.id,
        text: `Substituição no **${team.shortName || team.name}**. Sai **${outPlayer.name}** para a entrada de **${inPlayer.name}**`,
      });
    }
  };
  generateSubstitutions(homeTeam, homeStarters, homeBench);
  generateSubstitutions(awayTeam, awayStarters, awayBench);

  // 2. Cartões e faltas
  // Faltas NÃO geram evento narrativo próprio — só cartões aparecem no feed
  const matchYellows = new Map<string, number>();

  const generateCardsAndFouls = (
    team: Team,
    players: Player[],
    targetFouls: number,
    targetYellows: number,
    targetReds: number,
  ) => {
    const isHome = team.id === homeTeam.id;
    const bucket = isHome ? produced.home : produced.away;

    // Cartões vermelhos diretos
    for (let i = 0; i < targetReds; i++) {
      const minute = foulMinute();
      const p = pickAtMinuteSkill(
        players.filter((pl) => {
          const scheduledOut = subOutAt.get(pl.id);
          return !(scheduledOut && scheduledOut > minute) && !redCardAt.has(pl.id);
        }),
        POSITION_FOUL_WEIGHT,
        minute,
      );
      if (!p) continue;
      redCardAt.set(p.id, minute);
      bucket.red++;
      // Apenas o cartão aparece no feed — sem evento de falta separado
      events.push({
        id: genId(),
        minute: minute + 0.45,
        type: "red_card",
        teamId: team.id,
        playerId: p.id,
        text: `Cartão vermelho direto para **${p.name}** após entrada violenta!`,
      });
      bucket.fouls++;
    }

    // Cartões amarelos
    for (let i = 0; i < targetYellows; i++) {
      const minute = foulMinute();
      const p = pickAtMinuteSkill(
        players.filter((pl) => {
          const currentY = matchYellows.get(pl.id) || 0;
          if (currentY === 1) {
            const scheduledOut = subOutAt.get(pl.id);
            return !(scheduledOut && scheduledOut > minute) && !redCardAt.has(pl.id);
          }
          return !redCardAt.has(pl.id);
        }),
        POSITION_FOUL_WEIGHT,
        minute,
      );
      if (!p) continue;

      const currentY = matchYellows.get(p.id) || 0;
      if (currentY === 1) {
        // Segundo amarelo → expulsão
        matchYellows.set(p.id, 2);
        redCardAt.set(p.id, minute);
        bucket.yellow++;
        bucket.red++;
        events.push({
          id: genId(),
          minute: minute + 0.45,
          type: "yellow_card",
          teamId: team.id,
          playerId: p.id,
          text: `SEGUNDO AMARELO! **${p.name}** recebe mais um cartão e é expulso de campo!`,
        });
      } else {
        matchYellows.set(p.id, 1);
        bucket.yellow++;
        events.push({
          id: genId(),
          minute: minute + 0.45,
          type: "yellow_card",
          teamId: team.id,
          playerId: p.id,
          text: `Cartão amarelo para **${p.name}** por falta dura`,
        });
      }
      bucket.fouls++;
    }

    // Faltas restantes — existem nos números mas NÃO geram evento narrativo
    const remainingFouls = Math.max(0, targetFouls - targetYellows - targetReds);
    bucket.fouls += remainingFouls;
  };

  generateCardsAndFouls(
    homeTeam,
    homePlayers,
    matchStats.homeStats.fouls,
    matchStats.homeStats.yellowCards,
    matchStats.homeStats.redCards,
  );
  generateCardsAndFouls(
    awayTeam,
    awayPlayers,
    matchStats.awayStats.fouls,
    matchStats.awayStats.yellowCards,
    matchStats.awayStats.redCards,
  );

  // 3. Gols
  const homeScorerPool = buildScorerPool(homePlayers, POSITION_GOAL_WEIGHT);
  const awayScorerPool = buildScorerPool(awayPlayers, POSITION_GOAL_WEIGHT);
  const homeAssistPool = buildScorerPool(homePlayers, POSITION_ASSIST_WEIGHT);
  const awayAssistPool = buildScorerPool(awayPlayers, POSITION_ASSIST_WEIGHT);

  const generateGoals = (
    team: Team,
    scorerPool: Player[],
    assistPool: Player[],
    count: number,
    minuteRange: [number, number],
  ) => {
    const isHome = team.id === homeTeam.id;
    const bucket = isHome ? produced.home : produced.away;
    for (let i = 0; i < count; i++) {
      const minute = randInt(minuteRange[0], minuteRange[1]);
      const scorer = pickFromPool(scorerPool, minute, isOnPitch, matchGoalCounts);
      if (!scorer) continue;
      const assister =
        Math.random() < 0.65 ? pickFromPool(assistPool, minute, isOnPitch, matchGoalCounts, scorer?.id) : undefined;
      const descs = [
        `Gol de **${scorer.name}**${assister ? ` com assistência de **${assister.name}**` : ""}`,
        `Finalização certeira de **${scorer.name}**${assister ? ` após passe de **${assister.name}**` : ""}`,
        `**${scorer.name}** aproveita e marca${assister ? ` com cruzamento de **${assister.name}**` : ""}`,
        `Golaço de **${scorer.name}**!${assister ? ` Jogada de **${assister.name}**` : ""}`,
      ];
      events.push({
        id: genId(),
        minute: minute + 0.8,
        type: "goal",
        teamId: team.id,
        playerId: scorer.id,
        assistId: assister?.id,
        text: descs[randInt(0, descs.length - 1)],
      });
      bucket.goals++;
    }
  };

  if (halfGoals) {
    generateGoals(homeTeam, homeScorerPool, homeAssistPool, halfGoals.h1[0], [1, 45]);
    generateGoals(awayTeam, awayScorerPool, awayAssistPool, halfGoals.h1[1], [1, 45]);
    generateGoals(homeTeam, homeScorerPool, homeAssistPool, halfGoals.h2[0], [46, 90]);
    generateGoals(awayTeam, awayScorerPool, awayAssistPool, halfGoals.h2[1], [46, 90]);
  } else {
    generateGoals(homeTeam, homeScorerPool, homeAssistPool, homeGoals, [1, 90]);
    generateGoals(awayTeam, awayScorerPool, awayAssistPool, awayGoals, [1, 90]);
  }

  // 4. Impedimentos
  const generateOffsides = (team: Team, players: Player[], count: number) => {
    const isHome = team.id === homeTeam.id;
    const bucket = isHome ? produced.home : produced.away;
    // Apenas jogadores de linha podem ser pegos em impedimento
    const outfield = players.filter((p) => (POSITION_GOAL_WEIGHT[p.position || ""] ?? 0) > 0);
    for (let i = 0; i < count; i++) {
      const minute = randInt(5, 88);
      const p = pickAtMinuteSkill(outfield, POSITION_GOAL_WEIGHT, minute);
      if (!p) continue;
      events.push({
        id: genId(),
        minute: minute + 0.2,
        type: "offside",
        teamId: team.id,
        playerId: p.id,
        text: `O bandeirinha assinala impedimento de **${p.name}**`,
      });
      bucket.offsides++;
    }
  };
  generateOffsides(homeTeam, homePlayers, matchStats.homeStats.offsides);
  generateOffsides(awayTeam, awayPlayers, matchStats.awayStats.offsides);

  // 5. Chutes e defesas
  const generateShots = (
    team: Team,
    players: Player[],
    opponentPlayers: Player[],
    totalShots: number,
    shotsOnTarget: number,
    goals: number,
  ) => {
    const isHome = team.id === homeTeam.id;
    const bucket = isHome ? produced.home : produced.away;
    bucket.shots += bucket.goals;
    bucket.shotsOnTarget += bucket.goals;
    const missedShots = Math.max(0, totalShots - shotsOnTarget);
    const saves = Math.max(0, shotsOnTarget - goals);
    const gk = opponentPlayers.find((p) => p.position === "Goleiro") || opponentPlayers[0];

    for (let i = 0; i < missedShots; i++) {
      const minute = randInt(3, 89);
      const p = pickAtMinuteSkill(players, POSITION_GOAL_WEIGHT, minute);
      if (!p) continue;
      const textHighXg = [
        `**${p.name}** solta a bomba e a bola passa tirando tinta da trave!`,
        `Quase o gol de **${p.name}**, a bola passou muito perto!`,
      ];
      const textLowXg = [
        `**${p.name}** arrisca de longe, mas a bola sobe demais.`,
        `Chute de muito longe de **${p.name}** indo direto para a linha de fundo.`,
      ];
      const text = Math.random() > 0.8 ? textHighXg[randInt(0, 1)] : textLowXg[randInt(0, 1)];
      events.push({
        id: genId(),
        minute: minute + 0.6,
        type: "shot",
        teamId: team.id,
        playerId: p.id,
        text,
      });
      bucket.shots++;
    }

    for (let i = 0; i < saves; i++) {
      const minute = randInt(3, 89);
      const shooter = pickAtMinuteSkill(players, POSITION_GOAL_WEIGHT, minute);
      if (!shooter || !gk) continue;
      const textHighXg = [
        `Defesa espetacular de **${gk.name}** num chute à queima-roupa de **${shooter.name}**!`,
        `Milagre de **${gk.name}**! **${shooter.name}** ia marcando um golaço!`,
      ];
      const textLowXg = [
        `**${shooter.name}** chuta mascado no meio do gol, defesa tranquila de **${gk.name}**.`,
        `Chute rasteiro de **${shooter.name}**, **${gk.name}** cai e segura firme.`,
      ];
      const text = Math.random() > 0.7 ? textHighXg[randInt(0, 1)] : textLowXg[randInt(0, 1)];
      events.push({
        id: genId(),
        minute: minute + 0.6,
        type: "shot",
        teamId: team.id,
        playerId: shooter.id,
        targetId: gk.id,
        text,
      });
      bucket.shots++;
      bucket.shotsOnTarget++;
    }
  };

  generateShots(
    homeTeam,
    homePlayers,
    awayPlayers,
    matchStats.homeStats.shots,
    matchStats.homeStats.shotsOnTarget,
    homeGoals,
  );
  generateShots(
    awayTeam,
    awayPlayers,
    homePlayers,
    matchStats.awayStats.shots,
    matchStats.awayStats.shotsOnTarget,
    awayGoals,
  );

  // 6. Destaques gerais
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
      `**${p.name}** faz uma bela jogada individual`,
      `Contra-ataque rápido puxado por **${p.name}**`,
      `Desarme providencial de **${p.name}**`,
    ];
    events.push({
      id: genId(),
      minute: minute + 0.5,
      type: "highlight",
      teamId: team.id,
      playerId: p.id,
      text: highlights[randInt(0, highlights.length - 1)],
    });
  }

  // 7. Acréscimos
  const acrescimosT1 = randInt(1, 5);
  const acrescimosT2 = randInt(3, 8);

  events.push({
    id: genId(),
    minute: 45.0,
    type: "highlight",
    teamId: "",
    text: `O quarto árbitro levanta a placa: +${acrescimosT1} minutos de compensação no primeiro tempo.`,
  });
  events.push({
    id: genId(),
    minute: 90.0,
    type: "highlight",
    teamId: "",
    text: `O quarto árbitro indica +${acrescimosT2} minutos de compensação no segundo tempo.`,
  });

  events.sort((a, b) => a.minute - b.minute);
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

  // Reconcilia estatísticas
  matchStats.homeStats.fouls = produced.home.fouls;
  matchStats.homeStats.yellowCards = produced.home.yellow;
  matchStats.homeStats.redCards = produced.home.red;
  matchStats.homeStats.offsides = produced.home.offsides;
  matchStats.homeStats.shots = produced.home.shots;
  matchStats.homeStats.shotsOnTarget = produced.home.shotsOnTarget;
  matchStats.awayStats.fouls = produced.away.fouls;
  matchStats.awayStats.yellowCards = produced.away.yellow;
  matchStats.awayStats.redCards = produced.away.red;
  matchStats.awayStats.offsides = produced.away.offsides;
  matchStats.awayStats.shots = produced.away.shots;
  matchStats.awayStats.shotsOnTarget = produced.away.shotsOnTarget;

  return events;
}

// ---------------------------------------------------------------------------
// Notas individuais dos jogadores (estilo Sofascore)
// ---------------------------------------------------------------------------

const RATING_BASE = 6.5;
const RATING_MIN = 3.0;
const RATING_MAX = 10.0;

type PositionGroup = "GK" | "DEF" | "MID" | "ATK";

function getPositionGroup(pos?: string): PositionGroup {
  const p = (pos || "").toLowerCase();
  if (p === "goleiro" || p === "gol") return "GK";
  if (
    p === "zagueiro" ||
    p === "zag" ||
    p === "lateral direito" ||
    p === "lateral esquerdo" ||
    p === "ld" ||
    p === "le"
  )
    return "DEF";
  if (p === "volante" || p === "vol" || p === "meia" || p === "mc" || p === "meia atacante" || p === "mei")
    return "MID";
  return "ATK";
}

function getGoalBonus(group: PositionGroup): number {
  if (group === "DEF" || group === "GK") return 2.0;
  if (group === "MID") return 1.3;
  return 1.0;
}

/**
 * Calcula a nota final (3.0 — 10.0) de cada jogador da partida.
 *
 * @param homePlayers Jogadores da equipe da casa que participaram da partida
 * @param awayPlayers Jogadores da equipe visitante que participaram da partida
 * @param events Lista cronológica de eventos da partida
 * @param goalsConceded Gols sofridos por cada lado (chave: teamId → gols sofridos)
 */
export function calculatePlayerRatings(
  homePlayers: Player[],
  awayPlayers: Player[],
  homeTeamId: string,
  awayTeamId: string,
  events: MatchEvent[],
  goalsConceded: { home: number; away: number },
): Record<string, number> {
  const ratings: Record<string, number> = {};
  const playerTeam: Record<string, string> = {};
  const playerGroup: Record<string, PositionGroup> = {};

  const init = (players: Player[], teamId: string) => {
    for (const p of players) {
      ratings[p.id] = RATING_BASE;
      playerTeam[p.id] = teamId;
      playerGroup[p.id] = getPositionGroup(p.position);
    }
  };
  init(homePlayers, homeTeamId);
  init(awayPlayers, awayTeamId);

  const bump = (id: string | undefined, delta: number) => {
    if (!id || ratings[id] === undefined) return;
    ratings[id] += delta;
  };

  for (const evt of events) {
    switch (evt.type) {
      case "goal": {
        if (evt.playerId) {
          const group = playerGroup[evt.playerId] ?? "ATK";
          bump(evt.playerId, getGoalBonus(group));
        }
        if (evt.assistId) bump(evt.assistId, 0.8);
        break;
      }
      case "yellow_card":
        bump(evt.playerId, -0.4);
        break;
      case "red_card":
        bump(evt.playerId, -1.5);
        break;
      case "offside":
        bump(evt.playerId, -0.1);
        break;
      case "shot": {
        const text = evt.text || "";
        const isSave = /defesa|milagre/i.test(text);
        if (isSave) {
          bump(evt.targetId, 0.3);
          bump(evt.playerId, -0.05);
        } else {
          // chute para fora
          bump(evt.playerId, -0.1);
        }
        break;
      }
      case "highlight": {
        const text = evt.text || "";
        if (/desarme|jogada individual|contra-?ataque/i.test(text)) {
          bump(evt.playerId, 0.2);
        }
        break;
      }
      default:
        break;
    }
  }

  // Modificadores de fim de partida (defesa)
  const applyDefenseEnd = (players: Player[], teamId: string) => {
    const conceded = teamId === homeTeamId ? goalsConceded.home : goalsConceded.away;
    for (const p of players) {
      const group = playerGroup[p.id];
      if (group !== "GK" && group !== "DEF") continue;
      if (conceded === 0) {
        bump(p.id, 0.6); // clean sheet
      } else {
        bump(p.id, -0.2 * conceded);
      }
    }
  };
  applyDefenseEnd(homePlayers, homeTeamId);
  applyDefenseEnd(awayPlayers, awayTeamId);

  // Clamp e arredondamento final
  for (const id of Object.keys(ratings)) {
    const r = Math.max(RATING_MIN, Math.min(RATING_MAX, ratings[id]));
    ratings[id] = Math.round(r * 10) / 10;
  }

  return ratings;
}
