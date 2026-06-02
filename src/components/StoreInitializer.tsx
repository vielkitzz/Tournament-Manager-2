import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTournamentStore } from "@/store/tournamentStore";
import { supabase } from "@/integrations/supabase/client";
import { clearLineupCache } from "@/lib/solaraLineups";

/**
 * Syncs the auth user with the Zustand store and mantém uma subscription
 * global em tempo real para alterações em `players` — assim a sincronização
 * com o SolaraHub permanece ativa em qualquer página do app.
 */
export default function StoreInitializer() {
  const { user } = useAuth();
  const initialize = useTournamentStore((s) => s.initialize);
  const upsertPlayerLocal = useTournamentStore((s) => s.upsertPlayerLocal);
  const removePlayerLocal = useTournamentStore((s) => s.removePlayerLocal);

  useEffect(() => {
    // Só (re)inicializa quando há um usuário real. Se o user ficar
    // transientemente null (ex: token refresh falhando), preservamos o
    // store em memória ao invés de apagar tudo, evitando que a UI suma
    // no meio de uma simulação.
    if (user?.id) {
      initialize(user.id);
    }
  }, [user?.id, initialize]);

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`global-players-sync-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "players", filter: `user_id=eq.${user.id}` },
        (payload) => upsertPlayerLocal(payload.new),
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "players", filter: `user_id=eq.${user.id}` },
        (payload) => upsertPlayerLocal(payload.new),
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "players", filter: `user_id=eq.${user.id}` },
        (payload) => removePlayerLocal((payload.old as any).id),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "club_sync_links" },
        () => clearLineupCache(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, upsertPlayerLocal, removePlayerLocal]);

  return null;
}
