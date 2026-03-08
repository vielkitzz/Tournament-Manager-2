const STORAGE_KEY = "recent_tournaments";
const MAX_RECENT = 20;

interface RecentEntry {
  id: string;
  openedAt: number;
}

function getEntries(): RecentEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function trackTournamentOpen(id: string) {
  const entries = getEntries().filter((e) => e.id !== id);
  entries.unshift({ id, openedAt: Date.now() });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_RECENT)));
}

export function getRecentTournamentIds(): string[] {
  return getEntries().map((e) => e.id);
}
