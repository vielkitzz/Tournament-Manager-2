import { FIFA_TEMPLATES } from "./templates-fifa";
import { CONMEBOL_TEMPLATES } from "./templates-conmebol";
import { UEFA_TEMPLATES } from "./templates-uefa";
import { AFC_TEMPLATES } from "./templates-afc";
import { CONCACAF_TEMPLATES } from "./templates-concacaf";
import { CAF_TEMPLATES } from "./templates-caf";
import { OFC_TEMPLATES } from "./templates-ofc";
import type { TournamentTemplate, TemplateRegion, CompetitionGroup } from "./types";

export type { TournamentTemplate, TemplateRegion, CompetitionGroup } from "./types";

export const ALL_TEMPLATES: TournamentTemplate[] = [
  ...FIFA_TEMPLATES,
  ...CONMEBOL_TEMPLATES,
  ...UEFA_TEMPLATES,
  ...AFC_TEMPLATES,
  ...CONCACAF_TEMPLATES,
  ...CAF_TEMPLATES,
  ...OFC_TEMPLATES,
];

export function getRegions(): TemplateRegion[] {
  return ["Mundo", "Europa", "América do Sul", "Ásia", "América do Norte", "África", "Oceania"];
}

export function getCompetitionsByRegion(region: TemplateRegion): CompetitionGroup[] {
  const filtered = ALL_TEMPLATES.filter((t) => t.region === region);
  const map = new Map<string, TournamentTemplate[]>();
  for (const t of filtered) {
    const arr = map.get(t.originalName) || [];
    arr.push(t);
    map.set(t.originalName, arr);
  }
  return Array.from(map.entries()).map(([originalName, templates]) => ({
    originalName,
    region,
    templates: templates.sort((a, b) => {
      // Sort eras chronologically (earliest first)
      const yearA = parseInt(a.era) || 0;
      const yearB = parseInt(b.era) || 0;
      return yearA - yearB;
    }),
  }));
}

export function getErasByCompetition(originalName: string): TournamentTemplate[] {
  return ALL_TEMPLATES
    .filter((t) => t.originalName === originalName)
    .sort((a, b) => {
      const yearA = parseInt(a.era) || 0;
      const yearB = parseInt(b.era) || 0;
      return yearA - yearB;
    });
}

/** Format description for display */
export function getFormatLabel(t: TournamentTemplate): string {
  const parts: string[] = [`${t.numberOfTeams} times`];
  switch (t.format) {
    case "liga":
      parts.push(`Liga ${t.ligaTurnos === 1 ? "(1 turno)" : "(2 turnos)"}`);
      break;
    case "grupos":
      parts.push(`${t.gruposQuantidade} grupos + Mata-Mata`);
      break;
    case "mata-mata":
      parts.push("Mata-Mata puro");
      break;
    case "suico":
      parts.push(`Suíço (${t.suicoJogosLiga} jogos) + Playoffs`);
      break;
  }
  return parts.join(" · ");
}
