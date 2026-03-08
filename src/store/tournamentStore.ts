import { create } from "zustand";
import { Tournament, Team, TeamFolder, TournamentFolder, TournamentSettings, Match, SeasonRecord } from "@/types/tournament";
import { supabase } from "@/integrations/supabase/client";
import { Json } from "@/integrations/supabase/types";
import { TeamHistory } from "@/lib/teamHistoryUtils";

// Use any-typed client to avoid strict type errors from generated types
const db = supabase as any;

function parseJsonField<T>(raw: any, fallback: T): T {
  if (raw === null || raw === undefined) return fallback;
  if (typeof raw === "object") return raw as T;
  if (typeof raw === "string") {
    try { return JSON.parse(raw) as T; } catch { return fallback; }
  }
  return fallback;
}

function dbToTournament(row: any): Tournament {
  return {
    id: row.id,
    name: row.name,
    sport: row.sport,
    year: parseInt(String(row.year)) || new Date().getFullYear(),
    format: row.format as Tournament["format"],
    numberOfTeams: parseInt(String(row.number_of_teams)) || 0,
    logo: row.logo || row.logo_url || undefined,
    teamIds: parseJsonField<string[]>(row.team_ids, []),
    settings: parseJsonField<TournamentSettings>(row.settings, {} as TournamentSettings),
    matches: parseJsonField<Match[]>(row.matches, []),
    finalized: row.finalized === true || row.finalized === "true",
    groupsFinalized: row.groups_finalized === true || row.groups_finalized === "true",
    seasons: parseJsonField<SeasonRecord[]>(row.seasons, []),
    folderId: row.folder_id || null,
    ligaTurnos: row.liga_turnos as Tournament["ligaTurnos"],
    gruposQuantidade: row.grupos_quantidade ? parseInt(String(row.grupos_quantidade)) : undefined,
    gruposTurnos: (row.grupos_turnos ? parseInt(String(row.grupos_turnos)) : undefined) as Tournament["gruposTurnos"],
    gruposMataMataInicio: row.grupos_mata_mata_inicio as Tournament["gruposMataMataInicio"],
    mataMataInicio: row.mata_mata_inicio as Tournament["mataMataInicio"],
    suicoJogosLiga: row.suico_jogos_liga || undefined,
    suicoMataMataInicio: row.suico_mata_mata_inicio as Tournament["suicoMataMataInicio"],
    suicoPlayoffVagas: row.suico_playoff_vagas || undefined,
  };
}

function parseColors(raw: any): string[] {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    } catch { /* ignore */ }
  }
  return ["#333333", "#cccccc"];
}

function dbToTeam(row: any): Team {
  return {
    id: row.id ?? "",
    name: row.name ?? "",
    shortName: row.short_name ?? "",
    abbreviation: row.abbreviation ?? "",
    logo: row.logo || row.logo_url || undefined,
    foundingYear: row.founding_year || undefined,
    colors: parseColors(row.colors),
    rate: row.rate ?? 0,
    folderId: row.folder_id || null,
    isArchived: row.is_archived === true,
  };
}

function tournamentToDb(tournament: Tournament, userId: string) {
  return {
    id: tournament.id,
    user_id: userId,
    name: tournament.name,
    sport: tournament.sport,
    year: tournament.year,
    format: tournament.format,
    number_of_teams: tournament.numberOfTeams,
    logo: tournament.logo || null,
    folder_id: tournament.folderId || null,
    team_ids: tournament.teamIds,
    settings: tournament.settings as unknown as Json,
    matches: tournament.matches as unknown as Json,
    finalized: tournament.finalized || false,
    groups_finalized: tournament.groupsFinalized || false,
    seasons: (tournament.seasons || []) as unknown as Json,
    liga_turnos: tournament.ligaTurnos || null,
    grupos_quantidade: tournament.gruposQuantidade || null,
    grupos_turnos: tournament.gruposTurnos || null,
    grupos_mata_mata_inicio: tournament.gruposMataMataInicio || null,
    mata_mata_inicio: tournament.mataMataInicio || null,
    suico_jogos_liga: (tournament as any).suicoJogosLiga || null,
    suico_mata_mata_inicio: (tournament as any).suicoMataMataInicio || null,
    suico_playoff_vagas: (tournament as any).suicoPlayoffVagas || null,
  };
}

function updatesToDb(updates: Partial<Tournament>): Record<string, any> {
  const dbUpdates: any = {};
  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.sport !== undefined) dbUpdates.sport = updates.sport;
  if (updates.year !== undefined) dbUpdates.year = updates.year;
  if (updates.format !== undefined) dbUpdates.format = updates.format;
  if (updates.numberOfTeams !== undefined) dbUpdates.number_of_teams = updates.numberOfTeams;
  if (updates.logo !== undefined) dbUpdates.logo = updates.logo;
  if (updates.folderId !== undefined) dbUpdates.folder_id = updates.folderId;
  if (updates.teamIds !== undefined) dbUpdates.team_ids = updates.teamIds;
  if (updates.settings !== undefined) dbUpdates.settings = updates.settings as unknown as Json;
  if (updates.matches !== undefined) dbUpdates.matches = updates.matches as unknown as Json;
  if (updates.finalized !== undefined) dbUpdates.finalized = updates.finalized;
  if (updates.groupsFinalized !== undefined) dbUpdates.groups_finalized = updates.groupsFinalized;
  if (updates.seasons !== undefined) dbUpdates.seasons = updates.seasons as unknown as Json;
  if (updates.ligaTurnos !== undefined) dbUpdates.liga_turnos = updates.ligaTurnos;
  if (updates.gruposQuantidade !== undefined) dbUpdates.grupos_quantidade = updates.gruposQuantidade;
  if (updates.gruposTurnos !== undefined) dbUpdates.grupos_turnos = updates.gruposTurnos;
  if (updates.gruposMataMataInicio !== undefined) dbUpdates.grupos_mata_mata_inicio = updates.gruposMataMataInicio;
  if (updates.mataMataInicio !== undefined) dbUpdates.mata_mata_inicio = updates.mataMataInicio;
  if ((updates as any).suicoJogosLiga !== undefined) dbUpdates.suico_jogos_liga = (updates as any).suicoJogosLiga;
  if ((updates as any).suicoMataMataInicio !== undefined) dbUpdates.suico_mata_mata_inicio = (updates as any).suicoMataMataInicio;
  if ((updates as any).suicoPlayoffVagas !== undefined) dbUpdates.suico_playoff_vagas = (updates as any).suicoPlayoffVagas;
  return dbUpdates;
}

interface TournamentState {
  // State
  tournaments: Tournament[];
  teams: Team[];
  folders: TeamFolder[];
  tournamentFolders: TournamentFolder[];
  teamHistories: TeamHistory[];
  loading: boolean;
  _userId: string | null;

  // Actions
  initialize: (userId: string | null) => Promise<void>;
  addTournament: (tournament: Tournament) => Promise<void>;
  updateTournament: (id: string, updates: Partial<Tournament>) => Promise<void>;
  duplicateTournament: (id: string) => Promise<string | undefined>;
  removeTournament: (id: string) => Promise<void>;
  addTeam: (team: Team) => Promise<void>;
  updateTeam: (id: string, updates: Partial<Team>) => Promise<void>;
  removeTeam: (id: string) => Promise<void>;
  archiveTeam: (id: string) => Promise<void>;
  addFolder: (name: string) => Promise<string | undefined>;
  renameFolder: (id: string, name: string) => Promise<void>;
  removeFolder: (id: string) => Promise<void>;
  moveTeamToFolder: (teamId: string, folderId: string | null) => Promise<void>;
  moveFolderToFolder: (folderId: string, parentId: string | null) => Promise<void>;
  // Tournament folders
  addTournamentFolder: (name: string) => Promise<string | undefined>;
  renameTournamentFolder: (id: string, name: string) => Promise<void>;
  removeTournamentFolder: (id: string) => Promise<void>;
  moveTournamentToFolder: (tournamentId: string, folderId: string | null) => Promise<void>;
  moveTournamentFolderToFolder: (folderId: string, parentId: string | null) => Promise<void>;
  // Team histories
  addTeamHistory: (history: TeamHistory) => Promise<void>;
  updateTeamHistory: (id: string, updates: Partial<TeamHistory>) => Promise<void>;
  removeTeamHistory: (id: string) => Promise<void>;
  getTeamHistories: (teamId: string) => TeamHistory[];
}

export const useTournamentStore = create<TournamentState>((set, get) => ({
  tournaments: [],
  teams: [],
  folders: [],
  tournamentFolders: [],
  teamHistories: [],
  loading: true,
  _userId: null,

  initialize: async (userId) => {
    if (!userId) {
      set({ tournaments: [], teams: [], folders: [], tournamentFolders: [], teamHistories: [], loading: false, _userId: null });
      return;
    }
    if (userId === get()._userId && !get().loading) return;
    set({ loading: true, _userId: userId });
    const [tRes, teRes, fRes, tfRes, hRes] = await Promise.all([
      db.from("tournaments").select("*").eq("user_id", userId),
      db.from("teams").select("*").eq("user_id", userId),
      db.from("team_folders").select("*").eq("user_id", userId),
      db.from("tournament_folders").select("*").eq("user_id", userId),
      db.from("team_histories").select("*").eq("user_id", userId),
    ]) as any[];
    set({
      tournaments: tRes.data ? tRes.data.map(dbToTournament) : [],
      teams: teRes.data ? teRes.data.map(dbToTeam) : [],
      folders: fRes.data ? fRes.data.map((f: any) => ({ id: f.id, name: f.name, parentId: f.parent_id || null })) : [],
      tournamentFolders: tfRes.data ? tfRes.data.map((f: any) => ({ id: f.id, name: f.name, parentId: f.parent_id || null })) : [],
      teamHistories: hRes.data ? hRes.data.map((h: any) => ({
        id: h.id,
        teamId: h.team_id,
        startYear: h.start_year,
        endYear: h.end_year,
        fieldType: h.field_type || 'legacy',
        logo: h.logo || undefined,
        rating: h.rating != null ? Number(h.rating) : undefined,
        name: h.name || undefined,
        shortName: h.short_name || undefined,
        abbreviation: h.abbreviation || undefined,
        colors: h.colors ? parseColors(h.colors) : undefined,
      })) : [],
      loading: false,
    });
  },

  addTournament: async (tournament) => {
    const userId = get()._userId;
    if (!userId) return;
    const { data } = await db.from("tournaments").insert(tournamentToDb(tournament, userId)).select().single();
    if (data) set((s) => ({ tournaments: [...s.tournaments, dbToTournament(data)] }));
  },

  duplicateTournament: async (id) => {
    const userId = get()._userId;
    if (!userId) return undefined;
    const source = get().tournaments.find((t) => t.id === id);
    if (!source) return undefined;
    const newId = crypto.randomUUID();
    const clone: Tournament = {
      ...source,
      id: newId,
      name: `${source.name} (Cópia)`,
      folderId: source.folderId || null,
    };
    const { data } = await db.from("tournaments").insert(tournamentToDb(clone, userId)).select().single();
    if (data) {
      const t = dbToTournament(data);
      set((s) => ({ tournaments: [...s.tournaments, t] }));
      return t.id;
    }
    return undefined;
  },

  updateTournament: async (id, updates) => {
    const userId = get()._userId;
    if (!userId) return;
    // Optimistic update
    set((s) => ({ tournaments: s.tournaments.map((t) => (t.id === id ? { ...t, ...updates } : t)) }));
    await db.from("tournaments").update(updatesToDb(updates)).eq("id", id).eq("user_id", userId);
  },

  removeTournament: async (id) => {
    const userId = get()._userId;
    if (!userId) return;
    set((s) => ({ tournaments: s.tournaments.filter((t) => t.id !== id) }));
    await db.from("tournaments").delete().eq("id", id).eq("user_id", userId);
  },

  addTeam: async (team) => {
    const userId = get()._userId;
    if (!userId) return;
    const { data } = await db.from("teams").insert({
      id: team.id,
      user_id: userId,
      name: team.name,
      short_name: team.shortName,
      abbreviation: team.abbreviation,
      logo: team.logo || null,
      founding_year: team.foundingYear || null,
      colors: team.colors,
      rate: team.rate,
      folder_id: team.folderId || null,
    }).select().single();
    if (data) set((s) => ({ teams: [...s.teams, dbToTeam(data)] }));
  },

  updateTeam: async (id, updates) => {
    const userId = get()._userId;
    if (!userId) return;
    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.shortName !== undefined) dbUpdates.short_name = updates.shortName;
    if (updates.abbreviation !== undefined) dbUpdates.abbreviation = updates.abbreviation;
    if (updates.logo !== undefined) dbUpdates.logo = updates.logo;
    if (updates.foundingYear !== undefined) dbUpdates.founding_year = updates.foundingYear;
    if (updates.colors !== undefined) dbUpdates.colors = updates.colors;
    if (updates.rate !== undefined) dbUpdates.rate = updates.rate;
    if (updates.folderId !== undefined) dbUpdates.folder_id = updates.folderId;
    set((s) => ({ teams: s.teams.map((t) => (t.id === id ? { ...t, ...updates } : t)) }));
    await db.from("teams").update(dbUpdates).eq("id", id).eq("user_id", userId);
  },

  removeTeam: async (id) => {
    const userId = get()._userId;
    if (!userId) return;
    set((s) => ({ teams: s.teams.filter((t) => t.id !== id) }));
    await db.from("teams").delete().eq("id", id).eq("user_id", userId);
  },

  archiveTeam: async (id) => {
    const userId = get()._userId;
    if (!userId) return;
    set((s) => ({ teams: s.teams.map((t) => (t.id === id ? { ...t, isArchived: true } : t)) }));
    await db.from("teams").update({ is_archived: true }).eq("id", id).eq("user_id", userId);
  },

  addFolder: async (name) => {
    const userId = get()._userId;
    if (!userId) return;
    const { data } = await db.from("team_folders").insert({ user_id: userId, name }).select().single();
    if (data) {
      set((s) => ({ folders: [...s.folders, { id: data.id, name: data.name, parentId: data.parent_id || null }] }));
      return data.id;
    }
  },

  renameFolder: async (id, name) => {
    const userId = get()._userId;
    if (!userId) return;
    set((s) => ({ folders: s.folders.map((f) => (f.id === id ? { ...f, name } : f)) }));
    await db.from("team_folders").update({ name }).eq("id", id).eq("user_id", userId);
  },

  removeFolder: async (id) => {
    const userId = get()._userId;
    if (!userId) return;
    set((s) => ({
      teams: s.teams.map((t) => (t.folderId === id ? { ...t, folderId: null } : t)),
      folders: s.folders.filter((f) => f.id !== id),
    }));
    await db.from("teams").update({ folder_id: null }).eq("folder_id", id).eq("user_id", userId);
    await db.from("team_folders").delete().eq("id", id).eq("user_id", userId);
  },

  moveTeamToFolder: async (teamId, folderId) => {
    const userId = get()._userId;
    if (!userId) return;
    set((s) => ({ teams: s.teams.map((t) => (t.id === teamId ? { ...t, folderId } : t)) }));
    await db.from("teams").update({ folder_id: folderId }).eq("id", teamId).eq("user_id", userId);
  },

  moveFolderToFolder: async (folderId, parentId) => {
    const userId = get()._userId;
    if (!userId) return;
    if (parentId === folderId) return;
    const { folders } = get();
    let current = parentId;
    while (current) {
      if (current === folderId) return;
      const parent = folders.find((f) => f.id === current);
      current = parent?.parentId || null;
    }
    set((s) => ({ folders: s.folders.map((f) => (f.id === folderId ? { ...f, parentId } : f)) }));
    await db.from("team_folders").update({ parent_id: parentId }).eq("id", folderId).eq("user_id", userId);
  },

  // Tournament Folders
  addTournamentFolder: async (name) => {
    const userId = get()._userId;
    if (!userId) return;
    const { data } = await db.from("tournament_folders").insert({ user_id: userId, name }).select().single();
    if (data) {
      set((s) => ({ tournamentFolders: [...s.tournamentFolders, { id: data.id, name: data.name, parentId: data.parent_id || null }] }));
      return data.id;
    }
  },

  renameTournamentFolder: async (id, name) => {
    const userId = get()._userId;
    if (!userId) return;
    set((s) => ({ tournamentFolders: s.tournamentFolders.map((f) => (f.id === id ? { ...f, name } : f)) }));
    await db.from("tournament_folders").update({ name }).eq("id", id).eq("user_id", userId);
  },

  removeTournamentFolder: async (id) => {
    const userId = get()._userId;
    if (!userId) return;
    set((s) => ({
      tournaments: s.tournaments.map((t) => (t.folderId === id ? { ...t, folderId: null } : t)),
      tournamentFolders: s.tournamentFolders.filter((f) => f.id !== id),
    }));
    await db.from("tournaments").update({ folder_id: null }).eq("folder_id", id).eq("user_id", userId);
    await db.from("tournament_folders").delete().eq("id", id).eq("user_id", userId);
  },

  moveTournamentToFolder: async (tournamentId, folderId) => {
    const userId = get()._userId;
    if (!userId) return;
    set((s) => ({ tournaments: s.tournaments.map((t) => (t.id === tournamentId ? { ...t, folderId } : t)) }));
    await db.from("tournaments").update({ folder_id: folderId }).eq("id", tournamentId).eq("user_id", userId);
  },

  moveTournamentFolderToFolder: async (folderId, parentId) => {
    const userId = get()._userId;
    if (!userId) return;
    if (parentId === folderId) return;
    const { tournamentFolders } = get();
    let current = parentId;
    while (current) {
      if (current === folderId) return;
      const parent = tournamentFolders.find((f) => f.id === current);
      current = parent?.parentId || null;
    }
    set((s) => ({ tournamentFolders: s.tournamentFolders.map((f) => (f.id === folderId ? { ...f, parentId } : f)) }));
    await db.from("tournament_folders").update({ parent_id: parentId }).eq("id", folderId).eq("user_id", userId);
  },

  // Team Histories
  addTeamHistory: async (history) => {
    const userId = get()._userId;
    if (!userId) return;
    const { data } = await db.from("team_histories").insert({
      id: history.id,
      team_id: history.teamId,
      user_id: userId,
      start_year: history.startYear,
      end_year: history.endYear,
      field_type: history.fieldType || 'legacy',
      logo: history.logo || null,
      rating: history.rating != null ? history.rating : null,
      name: history.name || null,
      short_name: history.shortName || null,
      abbreviation: history.abbreviation || null,
      colors: history.colors?.length ? JSON.stringify(history.colors) : null,
    }).select().single();
    if (data) {
      set((s) => ({ teamHistories: [...s.teamHistories, {
        id: data.id,
        teamId: data.team_id,
        startYear: data.start_year,
        endYear: data.end_year,
        fieldType: data.field_type || 'legacy',
        logo: data.logo || undefined,
        rating: data.rating != null ? Number(data.rating) : undefined,
        name: data.name || undefined,
        shortName: data.short_name || undefined,
        abbreviation: data.abbreviation || undefined,
        colors: parseColors(data.colors),
      } as TeamHistory] }));
    }
  },

  updateTeamHistory: async (id, updates) => {
    const userId = get()._userId;
    if (!userId) return;
    const dbUpdates: any = {};
    if (updates.startYear !== undefined) dbUpdates.start_year = updates.startYear;
    if (updates.endYear !== undefined) dbUpdates.end_year = updates.endYear;
    if (updates.fieldType !== undefined) dbUpdates.field_type = updates.fieldType;
    if (updates.logo !== undefined) dbUpdates.logo = updates.logo || null;
    if (updates.rating !== undefined) dbUpdates.rating = updates.rating;
    if (updates.name !== undefined) dbUpdates.name = updates.name || null;
    if (updates.shortName !== undefined) dbUpdates.short_name = updates.shortName || null;
    if (updates.abbreviation !== undefined) dbUpdates.abbreviation = updates.abbreviation || null;
    if (updates.colors !== undefined) dbUpdates.colors = updates.colors?.length ? JSON.stringify(updates.colors) : null;
    set((s) => ({ teamHistories: s.teamHistories.map((h) => (h.id === id ? { ...h, ...updates } : h)) }));
    await db.from("team_histories").update(dbUpdates).eq("id", id).eq("user_id", userId);
  },

  removeTeamHistory: async (id) => {
    const userId = get()._userId;
    if (!userId) return;
    set((s) => ({ teamHistories: s.teamHistories.filter((h) => h.id !== id) }));
    await db.from("team_histories").delete().eq("id", id).eq("user_id", userId);
  },

  getTeamHistories: (teamId) => {
    return get().teamHistories.filter((h) => h.teamId === teamId);
  },
}));