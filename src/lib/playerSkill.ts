/**
 * playerSkill.ts
 *
 * Calcula o Rate Efetivo de Partida de um clube com base na habilidade
 * dos seus 11 titulares. O Rate original nunca é alterado — o modificador
 * existe apenas durante o cálculo de uma partida específica.
 *
 * Fórmula:
 *   mediaHabilidade   = média do campo `skill` dos 11 titulares
 *   exigenciaClube    = (rate × 7) + 42
 *   saldoHabilidade   = mediaHabilidade − exigenciaClube
 *   modificador       = (saldoHabilidade / 3) × 0.10
 *   rateEfetivo       = rate + modificador
 */

import { Player } from "@/types/tournament";

// ---------------------------------------------------------------------------
// Tipos auxiliares
// ---------------------------------------------------------------------------

export interface EffectiveRateBreakdown {
  /** Rate base original do clube (imutável). */
  baseRate: number;
  /** Média de habilidade dos titulares fornecidos. */
  avgSkill: number;
  /** Exigência mínima de habilidade para o rate do clube: (rate × 7) + 42. */
  clubRequirement: number;
  /** Diferença entre a média real e a exigência: pode ser positivo ou negativo. */
  skillBalance: number;
  /** Bônus/penalidade aplicada ao rate: (saldo / 3) × 0.10. */
  modifier: number;
  /** Rate usado exclusivamente no cálculo desta partida. */
  effectiveRate: number;
}

// ---------------------------------------------------------------------------
// Constantes da fórmula
// ---------------------------------------------------------------------------

/** Multiplica o rate para definir a exigência base de habilidade. */
const REQUIREMENT_RATE_FACTOR = 7;

/** Constante aditiva da exigência base. */
const REQUIREMENT_BASE = 42;

/** Divisor do saldo de habilidade antes de converter em modificador de rate. */
const BALANCE_DIVISOR = 3;

/** Escala do modificador: cada "ponto de saldo / divisor" vale este tanto no rate. */
const MODIFIER_SCALE = 0.1;

/**
 * Limite máximo (absoluto) que o modificador pode adicionar ou subtrair do rate.
 * Evita que elencos muito fracos ou muito fortes distorçam demais a simulação.
 * Valor calibrado para que um elenco perfeitamente adequado ao rate dê modificador 0
 * e elencos extremos fiquem dentro de ±1.5 de rate.
 */
const MODIFIER_CAP = 1.5;

/** Rate efetivo nunca cai abaixo deste valor, independente do modificador. */
const EFFECTIVE_RATE_FLOOR = 0.5;

// ---------------------------------------------------------------------------
// Função principal
// ---------------------------------------------------------------------------

/**
 * Calcula o **Rate Efetivo de Partida** do clube.
 *
 * @param baseRate  Rate oficial do clube (ex.: 7.50). Não é modificado.
 * @param players   Lista dos jogadores disponíveis do clube. A função usa os
 *                  primeiros 11 (ou todos, se houver menos de 11) como titulares.
 *                  Jogadores sem `skill` definido assumem habilidade 50.
 * @returns         O rate efetivo a ser usado na simulação desta partida.
 *
 * @example
 * // Clube com rate 7.0 e elenco habilidoso (média 95)
 * // exigência = (7 × 7) + 42 = 91
 * // saldo     = 95 − 91 = +4
 * // modificador = (4 / 3) × 0.10 ≈ +0.133
 * // rateEfetivo = 7.0 + 0.133 = 7.133
 * effectiveMatchRate(7.0, players); // ≈ 7.13
 */
export function effectiveMatchRate(baseRate: number, players: Player[]): number {
  return effectiveMatchRateDetailed(baseRate, players).effectiveRate;
}

/**
 * Versão detalhada que retorna o breakdown completo do cálculo.
 * Útil para debug, tooltips ou logs de simulação.
 */
export function effectiveMatchRateDetailed(baseRate: number, players: Player[]): EffectiveRateBreakdown {
  // --- 1. Média de habilidade dos titulares ---
  const starters = players.slice(0, 11);
  const avgSkill = starters.length > 0 ? starters.reduce((sum, p) => sum + (p.skill ?? 50), 0) / starters.length : 50; // fallback neutro quando não há jogadores

  // --- 2. Exigência do clube ---
  const clubRequirement = baseRate * REQUIREMENT_RATE_FACTOR + REQUIREMENT_BASE;

  // --- 3. Saldo de habilidade ---
  const skillBalance = avgSkill - clubRequirement;

  // --- 4. Modificador (com cap para evitar distorções extremas) ---
  const rawModifier = (skillBalance / BALANCE_DIVISOR) * MODIFIER_SCALE;
  const modifier = Math.max(-MODIFIER_CAP, Math.min(MODIFIER_CAP, rawModifier));

  // --- 5. Rate efetivo (imutável para o rate base) ---
  const effectiveRate = Math.max(EFFECTIVE_RATE_FLOOR, baseRate + modifier);

  return {
    baseRate,
    avgSkill: Math.round(avgSkill * 10) / 10,
    clubRequirement: Math.round(clubRequirement * 10) / 10,
    skillBalance: Math.round(skillBalance * 10) / 10,
    modifier: Math.round(modifier * 1000) / 1000,
    effectiveRate: Math.round(effectiveRate * 1000) / 1000,
  };
}

// ---------------------------------------------------------------------------
// Exemplos de calibração (remova em produção)
// ---------------------------------------------------------------------------
//
// Rate 5.0 → exigência = (5×7)+42 = 77
//   Elenco médio (skill 77): saldo 0   → modificador 0.000 → rate 5.000 (neutro ✓)
//   Elenco forte (skill 91): saldo +14 → modificador +0.467 → rate 5.467
//   Elenco fraco (skill 63): saldo -14 → modificador -0.467 → rate 4.533
//
// Rate 9.0 → exigência = (9×7)+42 = 105  (acima do máximo de skill = 99)
//   Qualquer elenco terá saldo negativo → penalidade leve sempre presente
//   Elenco elite (skill 99): saldo -6  → modificador -0.200 → rate 8.800
//   Isso é intencional: nenhum elenco consegue suprir a exigência de um clube top.
//
// ---------------------------------------------------------------------------
