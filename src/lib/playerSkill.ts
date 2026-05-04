/**
 * playerSkill.ts
 *
 * Calcula o Rate Efetivo de Partida de um clube com base na habilidade
 * dos seus 11 titulares. O Rate original NUNCA é alterado.
 *
 * Fórmula:
 *   mediaHabilidade  = média do campo `skill` dos 11 titulares
 *   exigenciaClube   = (rate × 7) + 42
 *   saldoHabilidade  = mediaHabilidade − exigenciaClube
 *   modificador      = (saldoHabilidade / 3) × 0.10
 *   rateEfetivo      = rate + modificador
 *
 * Calibração:
 *   Rate 5.0 → exigência = 77
 *     skill 77  → saldo   0  → mod  0.000 → rate 5.000  (neutro)
 *     skill 91  → saldo +14  → mod +0.467 → rate 5.467
 *     skill 63  → saldo -14  → mod -0.467 → rate 4.533
 *   Rate 8.0 → exigência = 98
 *     skill 98  → saldo   0  → mod  0.000 → rate 8.000  (neutro)
 *     skill 85  → saldo -13  → mod -0.433 → rate 7.567
 */

import { Player } from "@/types/tournament";

export interface EffectiveRateBreakdown {
  baseRate: number;
  avgSkill: number;
  clubRequirement: number;
  skillBalance: number;
  modifier: number;
  effectiveRate: number;
}

/**
 * Retorna o Rate Efetivo de Partida.
 * Usa os primeiros 11 jogadores como titulares.
 * Jogadores sem `skill` assumem 50.
 */
export function effectiveMatchRate(baseRate: number, players: Player[]): number {
  return effectiveMatchRateDetailed(baseRate, players).effectiveRate;
}

export function effectiveMatchRateDetailed(baseRate: number, players: Player[]): EffectiveRateBreakdown {
  const starters = players.slice(0, 11);

  // Fallback neutro quando não há jogadores: saldo = 0, mod = 0
  const avgSkill =
    starters.length > 0 ? starters.reduce((sum, p) => sum + (p.skill ?? 50), 0) / starters.length : baseRate * 7 + 42;

  const clubRequirement = baseRate * 7 + 42;
  const skillBalance = avgSkill - clubRequirement;
  const modifier = (skillBalance / 3) * 0.1;
  const effectiveRate = Math.max(0.5, baseRate + modifier);

  return {
    baseRate,
    avgSkill: Math.round(avgSkill * 10) / 10,
    clubRequirement: Math.round(clubRequirement * 10) / 10,
    skillBalance: Math.round(skillBalance * 10) / 10,
    modifier: Math.round(modifier * 1000) / 1000,
    effectiveRate: Math.round(effectiveRate * 1000) / 1000,
  };
}
