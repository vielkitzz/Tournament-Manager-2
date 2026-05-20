import { Match, Player, Team } from "@/types/tournament";
import { calculatePlayerRatings } from "@/lib/simulation";

export interface PlayerStatsRow {
  playerId: string;
  playerName: string;
  position: string | null;
  shirtNumber: number | null;
  teamId: string;
  teamName: string;
  matches: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  averageRating: number | null;
}

/**
 * Calcula a nota média de cada jogador de um time ao longo das partidas fornecidas.
 * Retorna `null` quando o jogador não tem nenhuma nota registrada.
 */
export function computeAverageRatings(
  team: Team,
  teamPlayers: Player[],
  matches: Match[],
): Record<string, number | null> {
  const sums: Record<string, { total: number; count: number }> = {};
  for (const p of teamPlayers) sums[p.id] = { total: 0, count: 0 };

  for (const m of matches) {
    if (!m.played) continue;
    const isHome = m.homeTeamId === team.id;
    if (!isHome && m.awayTeamId !== team.id) continue;

    const lineup = isHome ? m.homeLineup : m.awayLineup;
    const participantIds = new Set<string>(lineup || []);
    if (m.events) {
      for (const e of m.events) {
        if (e.type === "substitution" && e.teamId === team.id && e.playerId) {
          participantIds.add(e.playerId);
        }
      }
    }
    const participants = teamPlayers.filter((p) => participantIds.has(p.id));
    if (participants.length === 0) continue;

    const homeGoals = m.homeScore ?? 0;
    const awayGoals = m.awayScore ?? 0;
    const goalsConceded = isHome
      ? { home: awayGoals, away: 0 }
      : { home: 0, away: homeGoals };

    const ratings = calculatePlayerRatings(
      isHome ? participants : [],
      isHome ? [] : participants,
      m.homeTeamId,
      m.awayTeamId,
      m.events || [],
      goalsConceded,
    );

    for (const p of participants) {
      const r = ratings[p.id];
      if (typeof r === "number") {
        sums[p.id].total += r;
        sums[p.id].count += 1;
      }
    }
  }

  const result: Record<string, number | null> = {};
  for (const p of teamPlayers) {
    const s = sums[p.id];
    result[p.id] = s.count > 0 ? Math.round((s.total / s.count) * 10) / 10 : null;
  }
  return result;
}

export function formatAverageRating(value: number | null): string {
  return value == null ? "N/A" : value.toFixed(1);
}

function aggregateTeamStats(
  team: Team,
  allPlayers: Player[],
  matches: Match[],
): PlayerStatsRow[] {
  const teamPlayers = allPlayers.filter((p) => p.teamId === team.id);
  const teamMatches = matches.filter(
    (m) => m.played && (m.homeTeamId === team.id || m.awayTeamId === team.id),
  );
  const averages = computeAverageRatings(team, teamPlayers, teamMatches);

  const map = new Map<
    string,
    { matches: Set<string>; goals: number; assists: number; yellows: number; reds: number }
  >();
  const ensure = (id: string) => {
    let s = map.get(id);
    if (!s) {
      s = { matches: new Set(), goals: 0, assists: 0, yellows: 0, reds: 0 };
      map.set(id, s);
    }
    return s;
  };

  for (const m of teamMatches) {
    const lineup = m.homeTeamId === team.id ? m.homeLineup : m.awayLineup;
    if (lineup && lineup.length > 0) {
      for (const pid of lineup) ensure(pid).matches.add(m.id);
    }
    if (m.events) {
      const yellowsInMatch = new Map<string, number>();
      for (const evt of m.events) {
        if (evt.type === "substitution" && evt.teamId === team.id && evt.playerId) {
          ensure(evt.playerId).matches.add(m.id);
        }
        if (evt.teamId !== team.id) continue;
        if (evt.playerId) {
          const s = ensure(evt.playerId);
          if (evt.type === "goal") s.goals++;
          if (evt.type === "yellow_card") {
            s.yellows++;
            yellowsInMatch.set(evt.playerId, (yellowsInMatch.get(evt.playerId) || 0) + 1);
          }
          if (evt.type === "red_card") s.reds++;
        }
        if (evt.assistId && evt.type === "goal") ensure(evt.assistId).assists++;
      }
      for (const [pid, count] of yellowsInMatch) {
        if (count >= 2) ensure(pid).reds++;
      }
    }
  }

  return teamPlayers.map<PlayerStatsRow>((p) => {
    const s = map.get(p.id);
    return {
      playerId: p.id,
      playerName: p.name,
      position: p.position ?? null,
      shirtNumber: p.shirtNumber ?? null,
      teamId: team.id,
      teamName: team.name,
      matches: s?.matches.size ?? 0,
      goals: s?.goals ?? 0,
      assists: s?.assists ?? 0,
      yellowCards: s?.yellows ?? 0,
      redCards: s?.reds ?? 0,
      averageRating: averages[p.id] ?? null,
    };
  });
}

export interface ExportPayload {
  season: number;
  scope: "all" | "team";
  generatedAt: string;
  teams: {
    teamId: string;
    teamName: string;
    players: PlayerStatsRow[];
  }[];
}

export function buildExportPayload(
  selectedTeams: Team[],
  allPlayers: Player[],
  matches: Match[],
  season: number,
  scope: "all" | "team",
): ExportPayload {
  return {
    season,
    scope,
    generatedAt: new Date().toISOString(),
    teams: selectedTeams.map((t) => ({
      teamId: t.id,
      teamName: t.name,
      players: aggregateTeamStats(t, allPlayers, matches),
    })),
  };
}

function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "clube";
}

export function downloadStatsJson(
  payload: ExportPayload,
  season: number,
  teamName: string | null,
) {
  const slug = teamName ? slugify(teamName) : "todos";
  const filename = `estatisticas_temporada_${season}_${slug}.json`;
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}