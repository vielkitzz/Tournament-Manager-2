/**
 * squadTextParser.ts
 *
 * Interpreta texto livre (regras em português ou lista de jogadores)
 * e devolve um patch de configuração do gerador e/ou jogadores parciais.
 * Módulo puro: sem React, sem Supabase.
 */

import { COUNTRIES_DATA } from "@/data/countries";
import { randomNameForCountry } from "@/data/playerNames";
import { Player } from "@/types/tournament";
import { SKILL_MAX, SKILL_MIN, clampSkill } from "@/lib/playerSkill";
import {
  POSITION_CODES,
  PositionCode,
  PositionCounts,
  SquadGeneratorConfig,
  normalizeComposition,
  skillAnchorForRate,
} from "@/lib/squadGenerator";

export interface PartialPlayerSpec {
  name?: string;
  position?: PositionCode;
  nationality?: string;
  age?: number;
  skill?: number;
  shirtNumber?: number;
}

export interface ParseSquadTextResult {
  mode: "rules" | "roster" | "empty";
  configPatch: Partial<SquadGeneratorConfig>;
  players: PartialPlayerSpec[];
  warnings: string[];
  summary: string[];
}

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

/** Aliases de posição (PT/EN/códigos). */
const POSITION_ALIASES: Record<string, PositionCode> = {
  gol: "GOL", goleiro: "GOL", goleiros: "GOL", gk: "GOL", g: "GOL",
  zag: "ZAG", zagueiro: "ZAG", zagueiros: "ZAG", cb: "ZAG", dc: "ZAG", defensor: "ZAG",
  ld: "LD", "lateral direito": "LD", "laterais direitos": "LD", rb: "LD",
  le: "LE", "lateral esquerdo": "LE", "laterais esquerdos": "LE", lb: "LE",
  vol: "VOL", volante: "VOL", volantes: "VOL", cdm: "VOL", dm: "VOL",
  mc: "MC", "meio campo": "MC", "meio-campo": "MC", cm: "MC", meiocampista: "MC",
  mei: "MEI", meia: "MEI", meias: "MEI", cam: "MEI", am: "MEI", armador: "MEI",
  pd: "PD", "ponta direita": "PD", rw: "PD",
  pe: "PE", "ponta esquerda": "PE", lw: "PE",
  sa: "SA", "segundo atacante": "SA", ss: "SA",
  ata: "ATA", atacante: "ATA", atacantes: "ATA", st: "ATA", cf: "ATA", centroavante: "ATA",
};

/** Gentílicos comuns → país. */
const DEMONYMS: Record<string, string> = {
  brasileir: "Brasil", argentin: "Argentina", uruguai: "Uruguai", paraguai: "Paraguai",
  chilen: "Chile", colombian: "Colômbia", peruan: "Peru", boliv: "Bolívia",
  equatorian: "Equador", venezuelan: "Venezuela", mexican: "México",
  portugues: "Portugal", espanho: "Espanha", frances: "França", italian: "Itália",
  alema: "Alemanha", ingles: "Inglaterra", britanic: "Inglaterra", holandes: "Países Baixos",
  neerlandes: "Países Baixos", belga: "Bélgica", croata: "Croácia", servi: "Sérvia",
  suic: "Suíça", suec: "Suécia", noruegues: "Noruega", dinamarques: "Dinamarca",
  polones: "Polônia", russ: "Rússia", ucranian: "Ucrânia", turc: "Turquia",
  grego: "Grécia", austriac: "Áustria", escoces: "Escócia", irlandes: "Irlanda",
  japones: "Japão", coreano: "Coreia do Sul", chines: "China", australian: "Austrália",
  nigerian: "Nigéria", ganes: "Gana", senegales: "Senegal", marroquin: "Marrocos",
  egipci: "Egito", argelin: "Argélia", camarones: "Camarões", americano: "Estados Unidos",
  estadunidense: "Estados Unidos", canadense: "Canadá", "costa-riquenh": "Costa Rica",
};

const COUNTRY_INDEX = COUNTRIES_DATA.map((c) => ({ name: c.name, norm: norm(c.name) }))
  .sort((a, b) => b.norm.length - a.norm.length);

/** Encontra um país por nome exato/parcial ou gentílico dentro de um trecho. */
export function matchCountry(fragment: string): string | undefined {
  const n = norm(fragment);
  if (!n) return undefined;
  const exact = COUNTRY_INDEX.find((c) => c.norm === n);
  if (exact) return exact.name;
  for (const key of Object.keys(DEMONYMS)) {
    if (n.includes(key)) return DEMONYMS[key];
  }
  const partial = COUNTRY_INDEX.find((c) => c.norm.length >= 4 && n.includes(c.norm));
  return partial?.name;
}

/** Todos os países citados num trecho (nomes ou gentílicos). */
function matchCountries(fragment: string): string[] {
  const n = ` ${norm(fragment)} `;
  const found: string[] = [];
  for (const c of COUNTRY_INDEX) {
    if (c.norm.length >= 4 && n.includes(c.norm) && !found.includes(c.name)) found.push(c.name);
  }
  for (const key of Object.keys(DEMONYMS)) {
    if (n.includes(key) && !found.includes(DEMONYMS[key])) found.push(DEMONYMS[key]);
  }
  return found;
}

export function matchPosition(fragment: string): PositionCode | undefined {
  const n = norm(fragment);
  if (!n) return undefined;
  const upper = n.toUpperCase();
  if ((POSITION_CODES as readonly string[]).includes(upper)) return upper as PositionCode;
  return POSITION_ALIASES[n];
}

const emptyComposition = (): PositionCounts =>
  POSITION_CODES.reduce((acc, c) => ({ ...acc, [c]: 0 }), {} as PositionCounts);

/** Converte uma formação (ex.: "4-3-3", "4-2-3-1") numa composição de posições. */
export function compositionFromFormation(formation: string): PositionCounts | undefined {
  const parts = formation.split("-").map((p) => parseInt(p, 10));
  if (parts.length < 3 || parts.some((p) => !Number.isFinite(p) || p < 0)) return undefined;
  const total = parts.reduce((s, p) => s + p, 0);
  if (total !== 10) return undefined;

  const comp = emptyComposition();
  comp.GOL = 1;

  const def = parts[0];
  if (def >= 4) {
    comp.LD = 1;
    comp.LE = 1;
    comp.ZAG = def - 2;
  } else {
    comp.ZAG = def;
  }

  const attack = parts[parts.length - 1];
  const mids = parts.slice(1, parts.length - 1).reduce((s, p) => s + p, 0);

  const midOrder: PositionCode[] = ["VOL", "MC", "MEI"];
  for (let i = 0; i < mids; i++) comp[midOrder[i % midOrder.length]] += 1;

  if (attack >= 3) {
    comp.PD += 1;
    comp.PE += 1;
    comp.ATA += attack - 2;
  } else {
    comp.ATA += attack;
  }
  return comp;
}

const RULE_HINT = /(jogador|elenco|idade|anos|habilidade|skill|forma[cç][aã]o|%|estrangeir|rate|nacionalidade|goleiro|zagueiro|volante|atacante|meia)/i;
const FORMATION_RE = /\b(\d(?:-\d){2,3})\b/;

function parseRulesLine(line: string, patch: Partial<SquadGeneratorConfig>, comp: { value?: PositionCounts }) {
  const n = norm(line);

  const size = n.match(/(\d{1,2})\s*(jogador|atleta|nomes?)/);
  if (size) patch.size = Math.max(1, parseInt(size[1], 10));

  const formation = line.match(FORMATION_RE);
  if (formation) {
    const c = compositionFromFormation(formation[1]);
    if (c) comp.value = c;
  }

  // Contagens explícitas por posição: "3 GOL, 4 zagueiros"
  const counts = [...n.matchAll(/(\d{1,2})\s*([a-zç\- ]{2,20})/g)];
  for (const m of counts) {
    const pos = matchPosition(m[2].trim());
    if (pos) {
      if (!comp.value) comp.value = emptyComposition();
      comp.value[pos] = parseInt(m[1], 10);
    }
  }

  const age = n.match(/(?:\bidade|\banos)[^0-9]{0,12}(\d{2})\D{1,6}(\d{2})/) || n.match(/(\d{2})\s*(?:a|e|-|ate|até)\s*(\d{2})\s*anos/);
  if (age) {
    patch.minAge = parseInt(age[1], 10);
    patch.maxAge = parseInt(age[2], 10);
  }

  const skill = n.match(/(?:habilidade|skill|overall|forca)[^0-9]{0,12}(\d{2})\D{1,6}(\d{2})/);
  if (skill) {
    patch.minSkill = clampSkill(parseInt(skill[1], 10));
    patch.maxSkill = clampSkill(parseInt(skill[2], 10));
    patch.linkToRate = false;
  }

  if (/\brate\b|rating do clube|nivel do clube|for[cç]a do clube/.test(n)) patch.linkToRate = true;

  const percent = n.match(/(\d{1,3})\s*%/);
  const countries = matchCountries(line);
  if (percent) {
    patch.foreignPercent = Math.min(100, parseInt(percent[1], 10));
    if (countries.length > 0) patch.foreignPool = [...new Set([...(patch.foreignPool || []), ...countries])];
  } else if (/estrangeir/.test(n)) {
    if (countries.length > 0) patch.foreignPool = [...new Set([...(patch.foreignPool || []), ...countries])];
  } else if (countries.length > 0 && !patch.baseNationality) {
    patch.baseNationality = countries[0];
    if (countries.length > 1) patch.foreignPool = [...new Set([...(patch.foreignPool || []), ...countries.slice(1)])];
  }
}

function parseRosterLine(line: string): PartialPlayerSpec | undefined {
  const tokens = line
    .split(/[,;|\t]+/)
    .map((t) => t.trim())
    .filter(Boolean);
  if (tokens.length === 0) return undefined;

  const spec: PartialPlayerSpec = {};
  const nameCandidates: string[] = [];

  tokens.forEach((token, index) => {
    if (/^#?\d{1,2}$/.test(token)) {
      const value = parseInt(token.replace("#", ""), 10);
      if (index === 0 && spec.shirtNumber == null && value >= 1 && value <= 99) {
        spec.shirtNumber = value;
        return;
      }
      if (value >= 15 && value <= 44 && spec.age == null) {
        spec.age = value;
        return;
      }
      if (value >= SKILL_MIN && value <= SKILL_MAX && spec.skill == null) {
        spec.skill = clampSkill(value);
        return;
      }
      if (spec.shirtNumber == null && value >= 1 && value <= 99) {
        spec.shirtNumber = value;
        return;
      }
      return;
    }
    const pos = matchPosition(token);
    if (pos && !spec.position) {
      spec.position = pos;
      return;
    }
    const country = matchCountry(token);
    if (country && !spec.nationality) {
      spec.nationality = country;
      return;
    }
    nameCandidates.push(token);
  });

  if (nameCandidates.length > 0) spec.name = nameCandidates[0];
  if (!spec.name && !spec.position && spec.shirtNumber == null) return undefined;
  return spec;
}

/** Contagens explícitas por posição, ex.: "3 goleiros, 4 zagueiros". */
function hasPositionCounts(line: string): boolean {
  const matches = [...norm(line).matchAll(/(\d{1,2})\s*([a-zç\- ]{2,20})/g)];
  return matches.some((m) => matchPosition(m[2].trim()) != null);
}

/** Uma linha parece uma entrada de jogador (e não uma regra)? */
function looksLikeRoster(line: string): boolean {
  if (hasPositionCounts(line)) return false;
  if (RULE_HINT.test(line) && !line.includes(",")) return false;
  if (FORMATION_RE.test(line)) return false;
  if (line.includes(",")) return true;
  // Nome solto: apenas palavras, sem números nem palavras-chave
  return /^[\p{L}'.\- ]{3,40}$/u.test(line) && !RULE_HINT.test(line);
}

export function parseSquadText(text: string): ParseSquadTextResult {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const configPatch: Partial<SquadGeneratorConfig> = {};
  const comp: { value?: PositionCounts } = {};
  const players: PartialPlayerSpec[] = [];
  const warnings: string[] = [];

  if (lines.length === 0) {
    return { mode: "empty", configPatch, players, warnings, summary: [] };
  }

  for (const line of lines) {
    if (looksLikeRoster(line)) {
      const spec = parseRosterLine(line);
      if (spec) players.push(spec);
      else warnings.push(`Linha não reconhecida: "${line}"`);
    } else {
      const before = JSON.stringify(configPatch) + JSON.stringify(comp);
      parseRulesLine(line, configPatch, comp);
      if (before === JSON.stringify(configPatch) + JSON.stringify(comp)) {
        warnings.push(`Linha não reconhecida: "${line}"`);
      }
    }
  }

  if (comp.value) configPatch.composition = comp.value;
  if (players.length > 0) configPatch.size = players.length;

  if (configPatch.minAge != null && configPatch.maxAge != null && configPatch.minAge > configPatch.maxAge) {
    const min = configPatch.maxAge;
    configPatch.maxAge = configPatch.minAge;
    configPatch.minAge = min;
  }

  const summary: string[] = [];
  if (players.length > 0) summary.push(`${players.length} jogadores da lista`);
  else if (configPatch.size) summary.push(`${configPatch.size} jogadores`);
  if (configPatch.baseNationality) summary.push(configPatch.baseNationality);
  if (configPatch.foreignPercent) summary.push(`${configPatch.foreignPercent}% estrangeiros`);
  if (configPatch.foreignPool?.length) summary.push(configPatch.foreignPool.join(", "));
  if (configPatch.minAge != null && configPatch.maxAge != null)
    summary.push(`${configPatch.minAge}–${configPatch.maxAge} anos`);
  if (configPatch.linkToRate === true) summary.push("habilidade pelo rate do clube");
  if (configPatch.minSkill != null && configPatch.maxSkill != null)
    summary.push(`habilidade ${configPatch.minSkill}–${configPatch.maxSkill}`);
  if (comp.value)
    summary.push(
      POSITION_CODES.filter((c) => comp.value![c] > 0)
        .map((c) => `${comp.value![c]} ${c}`)
        .join(" · "),
    );

  return {
    mode: players.length > 0 ? "roster" : "rules",
    configPatch,
    players,
    warnings,
    summary,
  };
}

/** Completa specs parciais com valores gerados, respeitando a configuração ativa. */
export function playersFromSpecs(
  specs: PartialPlayerSpec[],
  config: SquadGeneratorConfig,
  rng: () => number = Math.random,
): Player[] {
  const used = new Set<number>(config.usedShirtNumbers || []);
  specs.forEach((s) => s.shirtNumber != null && used.add(s.shirtNumber));
  const anchor = config.linkToRate ? skillAnchorForRate(config.teamRate ?? 5) : 0;
  const spread = Math.max(0, config.skillSpread);
  const minAge = Math.min(config.minAge, config.maxAge);
  const maxAge = Math.max(config.minAge, config.maxAge);

  // Fila de posições para completar quem não trouxe posição no texto
  const target = normalizeComposition(config.composition, specs.length);
  specs.forEach((s) => {
    if (s.position && target[s.position] > 0) target[s.position] -= 1;
  });
  const queue: PositionCode[] = [];
  POSITION_CODES.forEach((code) => {
    for (let i = 0; i < target[code]; i++) queue.push(code);
  });

  return specs.map((spec) => {
    const nationality = spec.nationality || config.baseNationality;
    const age = spec.age ?? Math.floor(rng() * (maxAge - minAge + 1)) + minAge;

    let skill: number;
    if (spec.skill != null) skill = clampSkill(spec.skill);
    else if (config.linkToRate) skill = clampSkill(anchor + (rng() + rng() - 1) * spread);
    else
      skill = clampSkill(
        Math.floor(rng() * (Math.max(config.minSkill, config.maxSkill) - Math.min(config.minSkill, config.maxSkill) + 1)) +
          Math.min(config.minSkill, config.maxSkill),
      );

    let shirtNumber = spec.shirtNumber;
    if (shirtNumber == null) {
      for (let n = 1; n <= 99; n++) {
        if (!used.has(n)) {
          shirtNumber = n;
          used.add(n);
          break;
        }
      }
    }

    return {
      id: crypto.randomUUID(),
      teamId: config.teamId,
      name: spec.name || randomNameForCountry(nationality),
      nationality,
      position: spec.position || queue.shift() || "MC",
      age,
      shirtNumber,
      skill,
      seasonYear: config.seasonYear,
    } satisfies Player;
  });
}
