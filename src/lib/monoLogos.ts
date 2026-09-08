export const MONO_LOGOS_KEY = "tm2-mono-logos";
export const MONO_LOGOS_EVENT = "tm2-mono-logos-change";

export function getMonoLogosEnabled(): boolean {
  try {
    return localStorage.getItem(MONO_LOGOS_KEY) === "true";
  } catch {
    return false;
  }
}

/** Applies (or reverts) the monochrome shield on a team object. */
export function applyMonoToTeam<T extends { logo?: string; monoLogo?: string; baseLogo?: string }>(
  team: T,
  enabled = getMonoLogosEnabled(),
): T {
  const base = team.baseLogo ?? team.logo;
  return { ...team, baseLogo: base, logo: enabled && team.monoLogo ? team.monoLogo : base };
}
