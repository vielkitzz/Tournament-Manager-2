/**
 * squadGenerator.ts
 *
 * Motor puro (sem React, sem Supabase) de geração de elencos.
 * Recebe uma configuração e devolve uma lista de jogadores previstos,
 * pronta para prévia e gravação em lote.
 */

import { Player } from "@/types/tournament";
import { SKILL_MAX, SKILL_MIN, clampSkill } from "@/lib/playerSkill";
import { randomNameForCountry } from "@/data/playerNames";

export const MAX_SQUAD_SIZE = 30;

/** Códigos de posição usados no projeto (padrão SolaraHub). */
export const POSITION_CODES = ["GOL", "ZAG", "LD", "LE", "VOL", "MC", "MEI", "PD", "PE", "SA", "ATA"] as const;
export type PositionCode = (typeof POSITION_CODES)[number];

export type PositionCounts = Record<PositionCode, number>;

/** Composição padrão para um elenco de 23 jogadores. */
export const DEFAULT_COMPOSITION: PositionCounts = {
  GOL: 3,
  ZAG: 4,
  LD: 2,
  LE: 2,
  VOL: 3,
  MC: 3,
  MEI: 2,
  PD: 1,
  PE: 1,
  SA: 0,
  ATA: 2,
};

export interface SquadGeneratorConfig {
  /** Total desejado; a composição é reescalada proporcionalmente para atingi-lo. */
  size: number;
  composition: PositionCounts;
  /** Nacionalidade base do elenco. */
  baseNationality: string;
  /** Percentual (0–100) de jogadores estrangeiros. */
  foreignPercent: number;
  /** Nacionalidades sorteadas para os estrangeiros. */
  foreignPool: string[];
  minAge: number;
  maxAge: number;
  /** Quando ligado, a habilidade é ancorada na exigência do clube (rate × 7 + 42). */
  linkToRate: boolean;
  /** Rate do clube, usado quando `linkToRate` está ligado. */
  teamRate?: number;
  /** Amplitude de habilidade em torno da âncora (linkToRate) — ex.: 8. */
  skillSpread: number;
  /** Faixa manual de habilidade, usada quando `linkToRate` está desligado. */
  minSkill: number;
  maxSkill: number;
  /** Números de camisa já utilizados no elenco (para evitar duplicidade). */
  usedShirtNumbers?: number[];
  seasonYear?: number;
  teamId: string | null;
}

export const DEFAULT_CONFIG: Omit<SquadGeneratorConfig, "teamId"> = {
  size: 23,
  composition: { ...DEFAULT_COMPOSITION },
  baseNationality: "Brasil",
  foreignPercent: 20,
  foreignPool: [],
  minAge: 18,
  maxAge: 34,
  linkToRate: true,
  teamRate: 5,
  skillSpread: 8,
  minSkill: 60,
  maxSkill: 85,
  usedShirtNumbers: [],
};

export type Rng = () => number;

function randInt(rng: Rng, min: number, max: number) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function pick<T>(rng: Rng, arr: T[]): T | undefined {
  if (arr.length === 0) return undefined;
  return arr[Math.floor(rng() * arr.length)];
}

/** Reescala a composição para somar exatamente `size`, garantindo pelo menos 1 goleiro. */
export function normalizeComposition(composition: PositionCounts, size: number): PositionCounts {
  const total = POSITION_CODES.reduce((s, c) => s + Math.max(0, composition[c] || 0), 0);
  const result = {} as PositionCounts;
  if (total === 0) {
    POSITION_CODES.forEach((c) => (result[c] = 0));
    result.GOL = Math.min(size, 1);
    result.MC = Math.max(0, size - result.GOL);
    return result;
  }
  const ratio = size / total;
  let assigned = 0;
  const remainders: { code: PositionCode; frac: number }[] = [];
  POSITION_CODES.forEach((code) => {
    const exact = Math.max(0, composition[code] || 0) * ratio;
    const base = Math.floor(exact);
    result[code] = base;
    assigned += base;
    remainders.push({ code, frac: exact - base });
  });
  remainders.sort((a, b) => b.frac - a.frac);
  let i = 0;
  while (assigned < size && remainders.length > 0) {
    result[remainders[i % remainders.length].code] += 1;
    assigned += 1;
    i += 1;
  }
  if (result.GOL === 0) {
    const donor = POSITION_CODES.filter((c) => c !== "GOL").sort((a, b) => result[b] - result[a])[0];
    if (donor && result[donor] > 0) {
      result[donor] -= 1;
      result.GOL = 1;
    }
  }
  return result;
}

export interface ValidationIssue {
  level: "error" | "warning";
  message: string;
}

export function validateConfig(config: SquadGeneratorConfig, existingCount = 0): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (config.size < 1) issues.push({ level: "error", message: "O elenco precisa de ao menos 1 jogador." });
  if (existingCount + config.size > MAX_SQUAD_SIZE) {
    issues.push({
      level: "error",
      message: `Limite de ${MAX_SQUAD_SIZE} jogadores por elenco: há ${existingCount} e você pediu ${config.size}.`,
    });
  }
  if (config.minAge > config.maxAge) issues.push({ level: "error", message: "Idade mínima maior que a máxima." });
  if (config.minAge < 15 || config.maxAge > 45)
    issues.push({ level: "warning", message: "Idades fora da faixa usual (15–45)." });
  if (!config.linkToRate) {
    if (config.minSkill > config.maxSkill)
      issues.push({ level: "error", message: "Habilidade mínima maior que a máxima." });
    if (config.minSkill < SKILL_MIN || config.maxSkill > SKILL_MAX)
      issues.push({ level: "error", message: `Habilidade deve ficar entre ${SKILL_MIN} e ${SKILL_MAX}.` });
  }
  if (!config.baseNationality) issues.push({ level: "warning", message: "Nenhuma nacionalidade base definida." });
  if (config.foreignPercent > 0 && config.foreignPool.length === 0)
    issues.push({ level: "warning", message: "Sem países estrangeiros selecionados; todos usarão a base." });
  const normalized = normalizeComposition(config.composition, config.size);
  if (normalized.GOL < 1) issues.push({ level: "error", message: "O elenco precisa de ao menos um goleiro." });
  return issues;
}

/** Âncora de habilidade derivada do rate do clube. */
export function skillAnchorForRate(rate: number): number {
  return clampSkill(rate * 7 + 42);
}

/**
 * Gera os jogadores do elenco. Função pura: todo o acaso vem de `rng`.
 */
export function generateSquad(config: SquadGeneratorConfig, rng: Rng = Math.random): Player[] {
  const composition = normalizeComposition(config.composition, config.size);
  const used = new Set<number>(config.usedShirtNumbers || []);
  const anchor = config.linkToRate ? skillAnchorForRate(config.teamRate ?? 5) : 0;
  const spread = Math.max(0, config.skillSpread);

  const slots: PositionCode[] = [];
  POSITION_CODES.forEach((code) => {
    for (let i = 0; i < composition[code]; i++) slots.push(code);
  });

  const foreignTarget = Math.round((Math.min(100, Math.max(0, config.foreignPercent)) / 100) * slots.length);
  const foreignIndexes = new Set<number>();
  if (config.foreignPool.length > 0) {
    while (foreignIndexes.size < Math.min(foreignTarget, slots.length)) {
      foreignIndexes.add(randInt(rng, 0, slots.length - 1));
    }
  }

  return slots.map((position, index) => {
    const nationality = foreignIndexes.has(index)
      ? pick(rng, config.foreignPool) || config.baseNationality
      : config.baseNationality;

    const age = randInt(rng, Math.min(config.minAge, config.maxAge), Math.max(config.minAge, config.maxAge));

    let skill: number;
    if (config.linkToRate) {
      // Distribuição triangular em torno da âncora, com leve bônus para os primeiros slots
      const noise = (rng() + rng() - 1) * spread;
      const hierarchy = spread * 0.35 * (1 - (index / Math.max(1, slots.length - 1)) * 2);
      skill = clampSkill(anchor + noise + hierarchy);
    } else {
      skill = clampSkill(randInt(rng, config.minSkill, config.maxSkill));
    }

    let shirtNumber: number | undefined;
    for (let n = 1; n <= 99; n++) {
      if (!used.has(n)) {
        shirtNumber = n;
        used.add(n);
        break;
      }
    }

    return {
      id: crypto.randomUUID(),
      teamId: config.teamId,
      name: randomNameForCountry(nationality),
      nationality,
      position,
      age,
      shirtNumber,
      skill,
      seasonYear: config.seasonYear,
    } satisfies Player;
  });
}

/** Normaliza jogadores vindos de um JSON exportado, preservando todos os campos suportados. */
export function playersFromJson(
  raw: unknown,
  opts: { teamId: string | null; seasonYear?: number; usedShirtNumbers?: number[]; limit?: number },
): Player[] {
  const list = Array.isArray(raw) ? raw : Array.isArray((raw as any)?.players) ? (raw as any).players : [];
  const used = new Set<number>(opts.usedShirtNumbers || []);
  const limit = opts.limit ?? MAX_SQUAD_SIZE;
  const out: Player[] = [];
  for (const item of list) {
    if (out.length >= limit) break;
    if (!item || typeof item.name !== "string" || !item.name.trim()) continue;
    const rawShirt = Number(item.shirtNumber ?? item.shirt_number);
    let shirtNumber: number | undefined =
      Number.isFinite(rawShirt) && rawShirt >= 1 && rawShirt <= 99 ? Math.round(rawShirt) : undefined;
    if (shirtNumber != null && used.has(shirtNumber)) shirtNumber = undefined;
    if (shirtNumber != null) used.add(shirtNumber);
    const age = Number(item.age);
    out.push({
      id: crypto.randomUUID(),
      teamId: opts.teamId,
      name: String(item.name).trim(),
      nationality: item.nationality || undefined,
      position: item.position || undefined,
      age: Number.isFinite(age) && age > 0 ? Math.round(age) : undefined,
      shirtNumber,
      skill: clampSkill(Number(item.skill) || 70),
      photoUrl: item.photoUrl || item.photo_url || undefined,
      seasonYear: opts.seasonYear ?? (Number.isFinite(Number(item.seasonYear)) ? Number(item.seasonYear) : undefined),
      masterPlayerId: item.masterPlayerId || item.master_player_id || undefined,
    });
  }
  return out;
}
