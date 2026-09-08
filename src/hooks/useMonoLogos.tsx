import { useCallback, useEffect, useState } from "react";

const KEY = "tm2-mono-logos";
const EVENT = "tm2-mono-logos-change";

export function getMonoLogosEnabled(): boolean {
  try {
    return localStorage.getItem(KEY) === "true";
  } catch {
    return false;
  }
}

export function useMonoLogos() {
  const [enabled, setEnabled] = useState<boolean>(getMonoLogosEnabled);

  useEffect(() => {
    const sync = () => setEnabled(getMonoLogosEnabled());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const toggle = useCallback((value?: boolean) => {
    const next = value ?? !getMonoLogosEnabled();
    try {
      localStorage.setItem(KEY, String(next));
    } catch {
      /* ignore */
    }
    window.dispatchEvent(new Event(EVENT));
    setEnabled(next);
  }, []);

  return { monoEnabled: enabled, setMonoEnabled: toggle };
}
