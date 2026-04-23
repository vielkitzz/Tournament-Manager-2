/**
 * Player skill (45-99) and Football Manager-style star rating utilities.
 *
 * Stars are computed RELATIVE to the club's "Exigência" (demand level)
 * derived from the team rate (0-10). A player average for one club may
 * be a star for another.
 */
import type { Player } from "@/types/tournament";

export const SKILL_MIN = 45;
export const SKILL_MAX = 99;
export const SKILL_DEFAULT = 70;

export function clampSkill(n: number): number {
  if (!Number.isFinite(n)) return SKILL_DEFAULT;
  return Math.max(SKILL_MIN, Math.min(SKILL_MAX, Math.round(n)));
}

export function randomSkill(): number {
  return Math.floor(Math.random() * (SKILL_MAX - SKILL_MIN + 1)) + SKILL_MIN;
}

/** Exigência do clube = (rate * 7) + 42. Rate 5.00 → 72. */
export function clubExigencia(teamRate: number | undefined | null): number {
  const r = typeof teamRate === "number" && Number.isFinite(teamRate) ? teamRate : 5;
  return Math.round(r * 7 + 42);
}

/**
 * Maps a player's skill to a 1.0–5.0 star rating (with halves) relative
 * to the club's exigência:
 *
 *   skill >= exig + 15  → 5.0 stars
 *   skill >= exig + 8   → 4.0 / 4.5 stars
 *   |skill - exig| <= 7 → 3.0 / 3.5 stars (average for the club)
 *   skill <= exig - 8   → 2.0 / 2.5 stars
 *   skill <= exig - 15  → 1.0 / 1.5 stars
 */
export function playerStars(skill: number, teamRate: number | undefined | null): number {
  const exig = clubExigencia(teamRate);
  const diff = skill - exig;

  if (diff >= 15) return 5;
  if (diff >= 8) {
    // 4.0 .. 4.5 across diff 8..14
    return diff >= 11 ? 4.5 : 4;
  }
  if (diff >= -7) {
    // 3.0 .. 3.5 across diff -7..7
    return diff >= 1 ? 3.5 : 3;
  }
  if (diff >= -14) {
    // 2.0 .. 2.5 across diff -8..-14
    return diff >= -10 ? 2.5 : 2;
  }
  // diff <= -15
  return diff >= -18 ? 1.5 : 1;
}

const POSITION_GROUP: Record<string, "GK" | "DEF" | "MID" | "ATT"> = {
  Goleiro: "GK",
  Zagueiro: "DEF",
  "Lateral Direito": "DEF",
  "Lateral Esquerdo": "DEF",
  Volante: "MID",
  Meia: "MID",
  "Meia Atacante": "MID",
  "Ponta Direita": "ATT",
  "Ponta Esquerda": "ATT",
  Centroavante: "ATT",
  Atacante: "ATT",
};

function groupOf(p: Player): "GK" | "DEF" | "MID" | "ATT" {
  return POSITION_GROUP[p.position || ""] || "MID";
}

/**
 * Picks the starting XI by skill, respecting positional balance:
 * 1 GK + 4 DEF + 3 MID + 3 ATT, falling back to best-available when a
 * group is short. Returns up to 11 players, sorted by skill desc.
 */
export function selectStarters(squad: Player[]): Player[] {
  if (!squad || squad.length === 0) return [];
  const sorted = [...squad].sort((a, b) => (b.skill ?? 0) - (a.skill ?? 0));
  const wanted = { GK: 1, DEF: 4, MID: 3, ATT: 3 } as const;
  const buckets: Record<"GK" | "DEF" | "MID" | "ATT", Player[]> = {
    GK: [],
    DEF: [],
    MID: [],
    ATT: [],
  };
  for (const p of sorted) buckets[groupOf(p)].push(p);
  const picked: Player[] = [];
  const usedIds = new Set<string>();
  (Object.keys(wanted) as Array<"GK" | "DEF" | "MID" | "ATT">).forEach((g) => {
    for (const p of buckets[g]) {
      if (picked.length >= 11) break;
      if (buckets[g].indexOf(p) >= wanted[g]) break;
      picked.push(p);
      usedIds.add(p.id);
    }
  });
  if (picked.length < 11) {
    for (const p of sorted) {
      if (picked.length >= 11) break;
      if (!usedIds.has(p.id)) {
        picked.push(p);
        usedIds.add(p.id);
      }
    }
  }
  return picked.slice(0, 11);
}

/**
 * Computes the effective match rate for a club based on its starters'
 * average skill compared to the club's exigência. The result is the
 * base rate plus a small modifier (+/- a few tenths) that does NOT
 * persist anywhere — it is recomputed fresh per match.
 *
 *   modifier = ((avgSkill - exigência) / 3) * 0.10
 *   effectiveRate = baseRate + modifier
 *
 * If there are not enough players to form an XI, the base rate is
 * returned unchanged.
 */
export function effectiveMatchRate(baseRate: number, squad: Player[] | undefined | null): number {
  if (!squad || squad.length === 0) return baseRate;
  const starters = selectStarters(squad);
  if (starters.length === 0) return baseRate;
  const avg = starters.reduce((s, p) => s + (p.skill ?? SKILL_DEFAULT), 0) / starters.length;
  const exig = clubExigencia(baseRate);
  const balance = avg - exig;
  const modifier = (balance / 3) * 0.1;
  const eff = baseRate + modifier;
  // keep within plausible bounds
  return Math.max(0.5, Math.min(10, eff));
}
