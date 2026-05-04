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

// ---------------------------------------------------------------------------
// Exports que existiam no playerSkill.ts original
// ---------------------------------------------------------------------------

export const SKILL_MIN = 45;
export const SKILL_MAX = 99;
export const SKILL_DEFAULT = 70;

/** Garante que o skill fica dentro do intervalo válido. */
export function clampSkill(skill: number): number {
  return Math.max(SKILL_MIN, Math.min(SKILL_MAX, Math.round(skill)));
}

/** Gera um skill aleatório dentro do intervalo válido. */
export function randomSkill(min = SKILL_MIN, max = SKILL_MAX): number {
  return clampSkill(Math.floor(Math.random() * (max - min + 1)) + min);
}

/**
 * Converte skill numérico (45–99) em estrelas (1.0–5.0, com meias estrelas)
 * relativo à exigência do clube.
 *
 * A exigência do clube é (rate × 7) + 42 — o mesmo valor de `clubRequirement`
 * usado em `effectiveMatchRateDetailed`. Um jogador com skill exatamente igual
 * à exigência recebe 3.0★. Acima ganha estrelas proporcionalmente, abaixo perde.
 *
 * @param skill     Habilidade bruta do jogador (45–99).
 * @param teamRate  Rate oficial do clube. Se ausente, usa referência neutra (rate 5).
 */
export function playerStars(skill: number, teamRate: number | undefined | null): number {
  const clamped = clampSkill(skill);
  const rate = teamRate ?? 5;
  const requirement = rate * 7 + 42; // exigência do clube

  // Saldo normalizado: 0 quando skill == exigência
  // Range esperado: ±27 (skill 45 a 99 vs exigência típica ~77)
  const balance = clamped - requirement;

  // Mapeia o saldo para 1.0–5.0 estrelas com 3.0 como ponto neutro
  // Cada 13.5 pontos de saldo equivalem a 1 estrela
  const stars = 3.0 + balance / 13.5;

  // Arredonda para múltiplos de 0.5 (meias estrelas)
  const rounded = Math.round(stars * 2) / 2;

  return Math.max(1.0, Math.min(5.0, rounded));
}
