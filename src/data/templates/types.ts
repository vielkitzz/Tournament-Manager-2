import type { TournamentFormat, KnockoutStage, KnockoutLegMode, TournamentSettings } from "@/types/tournament";

export interface TournamentTemplate {
  id: string;
  /** Display name (e.g. "Copa do Mundo 2026") */
  name: string;
  /** Official competition name (e.g. "FIFA World Cup") */
  originalName: string;
  /** Region for grouping: 'Mundo', 'Europa', 'América do Sul' */
  region: TemplateRegion;
  /** Era string (e.g. '2024-Presente', '1998-2022') */
  era: string;
  sport: string;
  format: TournamentFormat;
  numberOfTeams: number;
  logo?: string;
  settings: Partial<TournamentSettings>;
  // Format-specific fields
  ligaTurnos?: 1 | 2;
  gruposQuantidade?: number;
  gruposTurnos?: 1 | 2 | 3 | 4;
  gruposMataMataInicio?: KnockoutStage;
  mataMataInicio?: KnockoutStage;
  knockoutLegMode?: KnockoutLegMode;
  suicoJogosLiga?: number;
  suicoMataMataInicio?: KnockoutStage;
  suicoPlayoffVagas?: number;
}

export type TemplateRegion = "Mundo" | "Europa" | "América do Sul";

export interface CompetitionGroup {
  originalName: string;
  region: TemplateRegion;
  templates: TournamentTemplate[];
}
