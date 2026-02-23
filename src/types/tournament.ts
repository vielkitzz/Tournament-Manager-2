export type TournamentFormat = "liga" | "grupos" | "mata-mata" | "suico";

export type KnockoutStage = "1/64" | "1/32" | "1/16" | "1/8" | "1/4" | "1/2";

export type KnockoutLegMode = "single" | "home-away";

export interface TournamentSettings {
  pointsWin: number;
  pointsDraw: number;
  pointsLoss: number;
  tiebreakers: string[];
  awayGoalsRule: boolean;
  extraTime: boolean;
  goldenGoal: boolean;
  rateInfluence: boolean;
  promotions: PromotionRule[];
  knockoutLegMode?: KnockoutLegMode;
  // Knockout special settings
  finalSingleLeg?: boolean;       // Final em jogo único (mesmo com ida e volta nas demais fases)
  thirdPlaceMatch?: boolean;      // Disputa de 3º lugar
  // Best-of qualifiers for grupos
  bestOfQualifiers?: number;      // e.g. 2 means best 2 thirds qualify
  bestOfPosition?: number;        // Which position gets "best of" treatment (e.g. 3 = thirds)
  // Manual qualification (grupos format)
  qualifiedTeamIds?: string[];    // Teams manually confirmed as qualified for knockout
  groupAssignments?: Record<string, string[]>; // Group number (as string) -> team IDs
}

export interface PromotionRule {
  position: number;
  type: "promotion" | "relegation" | "playoff";
  color: string;
  targetCompetition: string;
}

export interface Match {
  id: string;
  tournamentId: string;
  round: number;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
  played: boolean;
  // Group stage
  group?: number;
  stage?: "group" | "knockout";
  // Knockout leg (1 = first leg, 2 = return leg)
  leg?: 1 | 2;
  // Pair ID to link two-legged ties
  pairId?: string;
  // Extra time scores (only for knockout)
  homeExtraTime?: number;
  awayExtraTime?: number;
  // Penalties
  homePenalties?: number;
  awayPenalties?: number;
  // Third-place flag
  isThirdPlace?: boolean;
}

export interface SeasonRecord {
  year: number;
  championId: string;
  championName: string;
  championLogo?: string;
  format?: TournamentFormat;
  standings: { teamId: string; teamName: string; teamLogo?: string; points: number; wins: number; draws: number; losses: number; goalsFor: number; goalsAgainst: number; group?: number }[];
  matches?: Match[];
  groupCount?: number;
}

export interface Tournament {
  id: string;
  name: string;
  sport: string;
  year: number;
  format: TournamentFormat;
  numberOfTeams: number;
  logo?: string;
  teamIds: string[];
  settings: TournamentSettings;
  matches: Match[];
  finalized?: boolean;
  groupsFinalized?: boolean;
  seasons?: SeasonRecord[];
  // Liga options
  ligaTurnos?: 1 | 2;
  // Grupos options
  gruposQuantidade?: number;
  gruposTurnos?: 1 | 2 | 3 | 4;
  gruposMataMataInicio?: KnockoutStage;
  // Mata-mata options
  mataMataInicio?: KnockoutStage;
  // Suíço options
  suicoJogosLiga?: number;
  suicoMataMataInicio?: KnockoutStage;
  suicoPlayoffVagas?: number;
}

export interface Team {
  id: string;
  name: string;
  shortName: string;
  abbreviation: string;
  logo?: string;
  foundingYear?: number;
  colors: string[];
  rate: number;
  folderId?: string | null;
}

export interface TeamFolder {
  id: string;
  name: string;
  parentId?: string | null;
}

export const DEFAULT_SETTINGS: TournamentSettings = {
  pointsWin: 3,
  pointsDraw: 1,
  pointsLoss: 0,
  tiebreakers: ["Pontos", "Vitórias", "Saldo de Gols", "Gols Marcados", "Confronto Direto"],
  awayGoalsRule: false,
  extraTime: false,
  goldenGoal: false,
  rateInfluence: true,
  promotions: [],
  knockoutLegMode: "single",
  finalSingleLeg: true,
  thirdPlaceMatch: false,
  bestOfQualifiers: 0,
  bestOfPosition: 3,
};

export const KNOCKOUT_STAGES: { value: KnockoutStage; label: string }[] = [
  { value: "1/64", label: "32-avos de Final (1/64)" },
  { value: "1/32", label: "16-avos de Final (1/32)" },
  { value: "1/16", label: "Oitavas de Final (1/16)" },
  { value: "1/8", label: "Quartas de Final (1/8)" },
  { value: "1/4", label: "Semifinal (1/4)" },
  { value: "1/2", label: "Final (1/2)" },
];

export const STAGE_TEAM_COUNTS: Record<string, number> = {
  "1/64": 64,
  "1/32": 32, // Pré-oitavas (32 times)
  "1/16": 16, // Oitavas (16 times)
  "1/8": 8,   // Quartas (8 times)
  "1/4": 4,   // Semis (4 times)
  "1/2": 2,   // Final (2 times)
  "final": 2
};

export const SPORTS = [
  "Futebol",
  "Futsal",
  "Futebol de Salão",
  "Society",
  "Beach Soccer",
];
