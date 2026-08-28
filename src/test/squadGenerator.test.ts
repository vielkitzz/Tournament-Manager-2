import { describe, expect, it } from "vitest";
import {
  DEFAULT_CONFIG,
  MAX_SQUAD_SIZE,
  generateSquad,
  normalizeComposition,
  playersFromJson,
  skillAnchorForRate,
  validateConfig,
} from "@/lib/squadGenerator";

const base = { ...DEFAULT_CONFIG, teamId: "t1" };

function seeded(seed = 1) {
  let s = seed;
  return () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296);
}

describe("normalizeComposition", () => {
  it("soma exatamente o tamanho pedido", () => {
    const c = normalizeComposition(DEFAULT_CONFIG.composition, 18);
    expect(Object.values(c).reduce((a, b) => a + b, 0)).toBe(18);
    expect(c.GOL).toBeGreaterThanOrEqual(1);
  });
});

describe("generateSquad", () => {
  it("gera a quantidade pedida com camisas únicas", () => {
    const squad = generateSquad({ ...base, size: 23 }, seeded());
    expect(squad).toHaveLength(23);
    const shirts = squad.map((p) => p.shirtNumber);
    expect(new Set(shirts).size).toBe(23);
    expect(squad.filter((p) => p.position === "GOL").length).toBeGreaterThanOrEqual(1);
  });

  it("respeita camisas já usadas", () => {
    const squad = generateSquad({ ...base, size: 5, usedShirtNumbers: [1, 2, 3] }, seeded(7));
    expect(squad.every((p) => (p.shirtNumber ?? 0) > 3)).toBe(true);
  });

  it("ancora a habilidade no rate quando vinculado", () => {
    const squad = generateSquad({ ...base, size: 22, linkToRate: true, teamRate: 8, skillSpread: 6 }, seeded(3));
    const avg = squad.reduce((s, p) => s + p.skill, 0) / squad.length;
    expect(Math.abs(avg - skillAnchorForRate(8))).toBeLessThan(5);
  });

  it("respeita faixa manual quando desvinculado", () => {
    const squad = generateSquad({ ...base, size: 20, linkToRate: false, minSkill: 60, maxSkill: 70 }, seeded(5));
    expect(squad.every((p) => p.skill >= 60 && p.skill <= 70)).toBe(true);
  });
});

describe("validateConfig", () => {
  it("bloqueia estourar o limite do elenco", () => {
    const issues = validateConfig({ ...base, size: 20 }, MAX_SQUAD_SIZE - 5);
    expect(issues.some((i) => i.level === "error")).toBe(true);
  });
});

describe("playersFromJson", () => {
  it("preserva campos suportados e ignora inválidos", () => {
    const out = playersFromJson(
      { players: [{ name: "A", age: 22, shirtNumber: 10, nationality: "Brasil", skill: 80 }, { name: "" }] },
      { teamId: "t1", seasonYear: 2026 },
    );
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ name: "A", age: 22, shirtNumber: 10, nationality: "Brasil", seasonYear: 2026 });
  });
});
