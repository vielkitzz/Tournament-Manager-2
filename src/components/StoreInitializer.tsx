import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTournamentStore } from "@/store/tournamentStore";

/**
 * Syncs the auth user with the Zustand store.
 * Place inside AuthProvider, renders nothing.
 */
export default function StoreInitializer() {
  const { user } = useAuth();
  const initialize = useTournamentStore((s) => s.initialize);

  useEffect(() => {
    initialize(user?.id ?? null);
  }, [user?.id, initialize]);

  return null;
}
