import { describe, expect, it } from "vitest";
import { DEFAULT_CONFIG, POSITION_CODES } from "@/lib/squadGenerator";
import {
  compositionFromFormation,
  matchCountry,
  matchPosition,
  parseSquadText,
  playersFromSpecs,
} from "@/lib/squadTextParser";

const config = { ...DEFAULT_CONFIG, teamId: "t1" };

function seeded(seed = 1) {
  let s = seed;
  return () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296);
}

describe("helpers", () => {
  it("reconhece posições em PT/EN/códigos", () => {
    expect(matchPosition("goleiro")).toBe("GOL");
    expect(matchPosition("GK")).toBe("GOL");
    expect(matchPosition("zagueiros")).toBe("ZAG");
    expect(matchPosition("lateral esquerdo")).toBe("LE");
    expect(matchPosition("MEI")).toBe("MEI");
    expect(matchPosition("xyz")).toBeUndefined();
  });

  it("reconhece países por nome e gentílico", () => {
    expect(matchCountry("Brasil")).toBe("Brasil");
    expect(matchCountry("argentinos")).toBe("Argentina");
    expect(matchCountry("portugueses")).toBe("Portugal");
  });

  it("converte formações válidas e rejeita inválidas", () => {
    const c = compositionFromFormation("4-3-3");
    expect(c).toBeTruthy();
    expect(POSITION_CODES.reduce((s, p) => s + c![p], 0)).toBe(11);
    expect(c!.GOL).toBe(1);
    expect(c!.ZAG).toBe(2);
    expect(c!.LD).toBe(1);
    expect(compositionFromFormation("4-4-4")).toBeUndefined();
    const c2 = compositionFromFormation("4-2-3-1");
    expect(POSITION_CODES.reduce((s, p) => s + c2![p], 0)).toBe(11);
  });
});

describe("parseSquadText — regras", () => {
  it("interpreta um bloco completo de regras", () => {
    const r = parseSquadText(
      [
        "23 jogadores brasileiros",
        "20% argentinos e uruguaios",
        "idade entre 18 e 32",
        "formação 4-3-3",
        "habilidade 70-85",
      ].join("\n"),
    );
    expect(r.mode).toBe("rules");
    expect(r.configPatch.size).toBe(23);
    expect(r.configPatch.baseNationality).toBe("Brasil");
    expect(r.configPatch.foreignPercent).toBe(20);
    expect(r.configPatch.foreignPool).toEqual(expect.arrayContaining(["Argentina", "Uruguai"]));
    expect(r.configPatch.minAge).toBe(18);
    expect(r.configPatch.maxAge).toBe(32);
    expect(r.configPatch.minSkill).toBe(70);
    expect(r.configPatch.maxSkill).toBe(85);
    expect(r.configPatch.composition?.GOL).toBe(1);
    expect(r.warnings).toHaveLength(0);
  });

  it("liga a habilidade ao rate quando pedido", () => {
    const r = parseSquadText("seguir o rate do clube");
    expect(r.configPatch.linkToRate).toBe(true);
  });

  it("aceita contagens explícitas por posição", () => {
    const r = parseSquadText("3 goleiros, 4 zagueiros, 2 atacantes");
    expect(r.configPatch.composition?.GOL).toBe(3);
    expect(r.configPatch.composition?.ZAG).toBe(4);
    expect(r.configPatch.composition?.ATA).toBe(2);
  });

  it("inverte faixa etária invertida", () => {
    const r = parseSquadText("idade entre 32 e 18");
    expect(r.configPatch.minAge).toBe(18);
    expect(r.configPatch.maxAge).toBe(32);
  });

  it("retorna modo vazio para texto em branco", () => {
    expect(parseSquadText("   \n  ").mode).toBe("empty");
  });
});

describe("parseSquadText — lista de jogadores", () => {
  const text = ["10, Rivaldo, MEI, 28, Brasil, 88", "Ederson, GOL, 30, Brasil", "Julián Álvarez"].join("\n");

  it("interpreta linhas com campos em ordem livre", () => {
    const r = parseSquadText(text);
    expect(r.mode).toBe("roster");
    expect(r.players).toHaveLength(3);
    expect(r.players[0]).toMatchObject({
      shirtNumber: 10,
      name: "Rivaldo",
      position: "MEI",
      age: 28,
      nationality: "Brasil",
      skill: 88,
    });
    expect(r.players[1]).toMatchObject({ name: "Ederson", position: "GOL", age: 30, nationality: "Brasil" });
    expect(r.players[2]).toMatchObject({ name: "Julián Álvarez" });
    expect(r.configPatch.size).toBe(3);
  });

  it("completa campos ausentes ao gerar jogadores", () => {
    const r = parseSquadText(text);
    const players = playersFromSpecs(r.players, { ...config, size: 3 }, seeded(3));
    expect(players).toHaveLength(3);
    expect(players[0].skill).toBe(88);
    expect(players[2].name).toBe("Julián Álvarez");
    players.forEach((p) => {
      expect(p.position).toBeTruthy();
      expect(p.nationality).toBeTruthy();
      expect(p.age).toBeGreaterThanOrEqual(18);
      expect(p.age).toBeLessThanOrEqual(34);
      expect(p.skill).toBeGreaterThan(0);
    });
    const shirts = players.map((p) => p.shirtNumber);
    expect(new Set(shirts).size).toBe(3);
  });

  it("não reaproveita camisas já usadas", () => {
    const r = parseSquadText("Alisson\nMarquinhos\nCasemiro");
    const players = playersFromSpecs(r.players, { ...config, size: 3, usedShirtNumbers: [1, 2] }, seeded(9));
    expect(players.every((p) => (p.shirtNumber ?? 0) > 2)).toBe(true);
  });
});
