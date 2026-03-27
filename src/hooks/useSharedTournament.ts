import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tournament, Team, TournamentSettings, Match, SeasonRecord, PreliminaryPhase } from "@/types/tournament";
import { TeamHistory } from "@/lib/teamHistoryUtils";
import { useAuth } from "@/hooks/useAuth";

export type SharedRole = "owner" | "admin" | "viewer" | null;

function parseJsonField<T>(raw: any, fallback: T): T {
  if (raw === null || raw === undefined) return fallback;
  if (typeof raw === "object") return raw as T;
  if (typeof raw === "string") {
    try { return JSON.parse(raw) as T; } catch { return fallback; }
  }
  return fallback;
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
    preliminaryPhases: parseJsonField<PreliminaryPhase[]>(row.preliminary_phases, []),
  };
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

function dbToHistory(h: any): TeamHistory {
  return {
    id: h.id,
    teamId: h.team_id,
    startYear: h.start_year,
    endYear: h.end_year,
    fieldType: h.field_type || "legacy",
    logo: h.logo || undefined,
    rating: h.rating != null ? Number(h.rating) : undefined,
    name: h.name || undefined,
    shortName: h.short_name || undefined,
    abbreviation: h.abbreviation || undefined,
    colors: h.colors ? parseColors(h.colors) : undefined,
  };
}

interface SharedTournamentData {
  tournament: Tournament | null;
  teams: Team[];
  teamHistories: TeamHistory[];
  role: SharedRole;
  visibility: string;
  loading: boolean;
  error: boolean;
  updateTournament: (updates: Partial<Tournament>) => Promise<void>;
  refetch: () => Promise<void>;
}

export function useSharedTournament(token: string | undefined): SharedTournamentData {
  const { user } = useAuth();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamHistories, setTeamHistories] = useState<TeamHistory[]>([]);
  const [role, setRole] = useState<SharedRole>(null);
  const [visibility, setVisibility] = useState("public");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchData = useCallback(async () => {
    if (!token) { setError(true); setLoading(false); return; }

    try {
      const { data, error: rpcErr } = await (supabase as any).rpc("get_shared_tournament_full", { p_token: token });

      if (rpcErr || !data) {
        setError(true);
        setLoading(false);
        return;
      }

      const result = typeof data === "string" ? JSON.parse(data) : data;
      if (!result || !result.tournament) {
        setError(true);
        setLoading(false);
        return;
      }

      setTournament(dbToTournament(result.tournament));
      setTeams((result.teams || []).map(dbToTeam));
      setTeamHistories((result.team_histories || []).map(dbToHistory));
      setVisibility(result.visibility || "public");

      // Determine role
      const ownerId = result.owner_id;
      if (user && user.id === ownerId) {
        setRole("owner");
      } else if (user?.email) {
        // Check collaborator role
        const { data: roleData } = await (supabase as any).rpc("get_collaborator_role", {
          p_token: token,
          p_user_email: user.email,
        });
        if (roleData === "admin") setRole("admin");
        else if (roleData === "viewer") setRole("viewer");
        else if (result.visibility === "public") setRole("viewer");
        else { setError(true); setRole(null); }
      } else {
        // Not logged in
        if (result.visibility === "public") {
          setRole("viewer");
        } else {
          setError(true);
          setRole(null);
        }
      }

      setLoading(false);
    } catch {
      setError(true);
      setLoading(false);
    }
  }, [token, user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const updateTournament = useCallback(async (updates: Partial<Tournament>) => {
    if (!token || !user?.email || (role !== "admin" && role !== "owner")) return;

    // Optimistic update
    setTournament((prev) => prev ? { ...prev, ...updates } : prev);

    if (role === "owner") {
      // Owner updates directly via their own RLS
      const dbUpdates: any = {};
      if (updates.matches !== undefined) dbUpdates.matches = updates.matches;
      if (updates.settings !== undefined) dbUpdates.settings = updates.settings;
      if (updates.finalized !== undefined) dbUpdates.finalized = updates.finalized;
      if (updates.groupsFinalized !== undefined) dbUpdates.groups_finalized = updates.groupsFinalized;
      if (updates.seasons !== undefined) dbUpdates.seasons = updates.seasons;
      if (updates.teamIds !== undefined) dbUpdates.team_ids = updates.teamIds;
      await (supabase as any).from("tournaments").update(dbUpdates).eq("id", tournament?.id);
    } else {
      // Admin uses the RPC
      const dbUpdates: any = {};
      if (updates.matches !== undefined) dbUpdates.matches = JSON.stringify(updates.matches);
      if (updates.settings !== undefined) dbUpdates.settings = JSON.stringify(updates.settings);
      if (updates.finalized !== undefined) dbUpdates.finalized = String(updates.finalized);
      if (updates.groupsFinalized !== undefined) dbUpdates.groups_finalized = String(updates.groupsFinalized);
      if (updates.seasons !== undefined) dbUpdates.seasons = JSON.stringify(updates.seasons);
      if (updates.teamIds !== undefined) dbUpdates.team_ids = JSON.stringify(updates.teamIds);

      await (supabase as any).rpc("update_shared_tournament", {
        p_token: token,
        p_user_email: user.email,
        p_updates: dbUpdates,
      });
    }
  }, [token, user, role, tournament?.id]);

  return {
    tournament,
    teams,
    teamHistories,
    role,
    visibility,
    loading,
    error,
    updateTournament,
    refetch: fetchData,
  };
}
