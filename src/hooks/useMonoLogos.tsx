import { useCallback, useEffect, useState } from "react";
import { MONO_LOGOS_EVENT, MONO_LOGOS_KEY, getMonoLogosEnabled } from "@/lib/monoLogos";
import { useTournamentStore } from "@/store/tournamentStore";
import { applyMonoToTeam } from "@/lib/monoLogos";

export { getMonoLogosEnabled };

export function useMonoLogos() {
  const [enabled, setEnabled] = useState<boolean>(getMonoLogosEnabled);

  useEffect(() => {
    const sync = () => setEnabled(getMonoLogosEnabled());
    window.addEventListener(MONO_LOGOS_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(MONO_LOGOS_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const toggle = useCallback((value?: boolean) => {
    const next = value ?? !getMonoLogosEnabled();
    try {
      localStorage.setItem(MONO_LOGOS_KEY, String(next));
    } catch {
      /* ignore */
    }
    // Re-map every team logo in the store so the change is instant everywhere
    useTournamentStore.setState((s) => ({
      teams: s.teams.map((t) => applyMonoToTeam(t, next)),
    }));
    window.dispatchEvent(new Event(MONO_LOGOS_EVENT));
    setEnabled(next);
  }, []);

  return { monoEnabled: enabled, setMonoEnabled: toggle };
}
