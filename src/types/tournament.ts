export interface Player {
  id: string;
  teamId: string | null;
  name: string;
  nationality?: string;
  position?: string;
  age?: number;
  shirtNumber?: number;
  rating?: number;
  photoUrl?: string;
}

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
  finalSingleLeg?: boolean;
  thirdPlaceMatch?: boolean;
  // Best-of qualifiers for grupos
  bestOfQualifiers?: number;
  bestOfPosition?: number;
  // Manual qualification (grupos format)
  qualifiedTeamIds?: string[];
  groupAssignments?: Record<string, string[]>;
  // Suspension rules
  yellowCardsToSuspend?: number;
  yellowSuspensionDuration?: number;
  redSuspensionDuration?: number;
}

export type EventType = 'goal' | 'yellow_card' | 'red_card' | 'injury' | 'highlight';

export interface MatchEvent {
  id: string;
  minute: number;
  type: EventType;
  teamId: string;
  playerId?: string;
  assistId?: string;
  text: string;
}

export interface PromotionRule {
  position: number;
  type: "promotion" | "relegation" | "playoff";
  color: string;
  targetCompetition: string;
  targetCompetitionId?: string;
}

export interface TeamMatchStats {
  possession: number;
  expectedGoals: number;
  shots: number;
  shotsOnTarget: number;
  fouls: number;
  corners: number;
  yellowCards: number;
  redCards: number;
  offsides: number;
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
  // Per-half scores (regular time)
  homeScoreH1?: number;
  awayScoreH1?: number;
  homeScoreH2?: number;
  awayScoreH2?: number;
  // Extra time scores (only for knockout)
  homeExtraTime?: number;
  awayExtraTime?: number;
  // Per-half extra time scores
  homeScoreET1?: number;
  awayScoreET1?: number;
  homeScoreET2?: number;
  awayScoreET2?: number;
  // Penalties
  homePenalties?: number;
  awayPenalties?: number;
  // Third-place flag
  isThirdPlace?: boolean;
  // Match statistics
  homeStats?: TeamMatchStats;
  awayStats?: TeamMatchStats;
  // Minute-by-minute events
  events?: MatchEvent[];
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
  teamIds?: string[];
  settings?: TournamentSettings;
  manual?: boolean; // Manually added champion entry
}

export type PreliminaryPhaseFormat = "mata-mata" | "grupos";

export interface PreliminaryPhase {
  id: string;
  name: string;
  order: number;
  format: PreliminaryPhaseFormat;
  numberOfTeams: number;
  qualifiedCount: number;
  legMode: KnockoutLegMode;
  // For grupos format
  groupCount?: number;
  groupTurnos?: 1 | 2;
  // State
  teamIds: string[];
  matches: Match[];
  finalized: boolean;
  qualifiedTeamIds: string[];
  // Groups format state
  groupAssignments?: Record<string, string[]>;
  groupsFinalized?: boolean;
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
  folderId?: string | null;
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
  // Preliminary phases
  preliminaryPhases?: PreliminaryPhase[];
}

export interface TournamentFolder {
  id: string;
  name: string;
  parentId?: string | null;
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
  isArchived?: boolean;
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
  tiebreakers: ["Pontos", "Vitórias", "Saldo de Gols", "Gols Marcados", "Empates", "Gols Sofridos", "Confronto Direto", "Cartões Amarelos", "Cartões Vermelhos"],
  awayGoalsRule: false,
  extraTime: false,
  goldenGoal: false,
  rateInfluence: true,
  promotions: [],
  knockoutLegMode: "single",
  finalSingleLeg: false,
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
