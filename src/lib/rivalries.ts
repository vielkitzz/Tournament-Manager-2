export interface Rivalry {
  id: string;
  teamAId: string;
  teamBId: string;
  /** 1 a 5 — quanto maior, mais faltas e cartões. */
  level: number;
  name?: string;
}

export function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

/** Nível do clássico entre dois times (0 quando não há rivalidade). */
export function getRivalryLevel(rivalries: Rivalry[], teamA?: string | null, teamB?: string | null): number {
  if (!teamA || !teamB) return 0;
  const key = pairKey(teamA, teamB);
  const found = rivalries.find((r) => pairKey(r.teamAId, r.teamBId) === key);
  return found ? found.level : 0;
}

export function findRivalry(rivalries: Rivalry[], teamA?: string | null, teamB?: string | null): Rivalry | undefined {
  if (!teamA || !teamB) return undefined;
  const key = pairKey(teamA, teamB);
  return rivalries.find((r) => pairKey(r.teamAId, r.teamBId) === key);
}

export const RIVALRY_LEVEL_LABELS: Record<number, string> = {
  1: "Rivalidade leve",
  2: "Rivalidade moderada",
  3: "Clássico",
  4: "Clássico quente",
  5: "Clássico explosivo",
};
