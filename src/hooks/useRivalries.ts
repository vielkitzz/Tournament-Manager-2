import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTournamentStore } from "@/store/tournamentStore";

export interface Rivalry {
  id: string;
  userId: string;
  teamAId: string;
  teamBId: string;
  level: number;
  name?: string;
}

const db = supabase as any;

export function rivalryKey(teamAId: string, teamBId: string): string {
  return [teamAId, teamBId].sort().join(":");
}

export function useRivalries() {
  const userId = useTournamentStore((state) => state._userId);
  const [rivalries, setRivalries] = useState<Rivalry[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!userId) {
      setRivalries([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await db.from("rivalries").select("*").eq("user_id", userId).order("created_at");
    if (!error && data) {
      setRivalries(data.map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        teamAId: row.team_a_id,
        teamBId: row.team_b_id,
        level: Number(row.level),
        name: row.name || undefined,
      })));
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const levels = useMemo(
    () => new Map(rivalries.map((rivalry) => [rivalryKey(rivalry.teamAId, rivalry.teamBId), rivalry.level])),
    [rivalries],
  );

  const getLevel = useCallback(
    (teamAId: string, teamBId: string) => levels.get(rivalryKey(teamAId, teamBId)) || 0,
    [levels],
  );

  const save = useCallback(async (input: Omit<Rivalry, "id" | "userId"> & { id?: string }) => {
    if (!userId) throw new Error("Usuário não autenticado");
    const payload = {
      user_id: userId,
      team_a_id: input.teamAId,
      team_b_id: input.teamBId,
      level: input.level,
      name: input.name?.trim() || null,
    };
    const query = input.id
      ? db.from("rivalries").update(payload).eq("id", input.id).eq("user_id", userId)
      : db.from("rivalries").insert(payload);
    const { error } = await query;
    if (error) throw error;
    await reload();
  }, [reload, userId]);

  const remove = useCallback(async (id: string) => {
    if (!userId) return;
    const { error } = await db.from("rivalries").delete().eq("id", id).eq("user_id", userId);
    if (error) throw error;
    setRivalries((current) => current.filter((rivalry) => rivalry.id !== id));
  }, [userId]);

  return { rivalries, loading, getLevel, save, remove, reload };
}