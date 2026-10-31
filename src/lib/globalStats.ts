import type { Match, Player, Team, Tournament } from "@/types/tournament";
import { calculatePlayerRatings } from "@/lib/simulation";

export interface StatMatch {
  match: Match;
  tournamentId: string;
  tournamentName: string;
  year: number;
}

export interface TeamAgg {
  teamId: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  titles: number;
}

export interface PlayerAgg {
  playerId: string;
  name: string;
  teamId: string;
  position?: string;
  matches: number;
  goals: number;
  assists: number;
  yellow: number;
  red: number;
  ratingSum: number;
  ratingCount: number;
}

export const avgRating = (p: PlayerAgg) => (p.ratingCount > 0 ? p.ratingSum / p.ratingCount : null);

/** Coleta todas as partidas jogadas (temporada atual + temporadas arquivadas), sem duplicar. */
export function collectMatches(tournaments: Tournament[], tournamentId?: string): StatMatch[] {
  const out: StatMatch[] = [];
  for (const t of tournaments) {
    if (tournamentId && t.id !== tournamentId) continue;
    const seen = new Set<string>();
    const currentYear = Number(t.year) || 0;
    const push = (m: Match, year: number) => {
      if (!m?.played) return;
      const key = `${year}:${m.id}`;
      if (seen.has(key)) return;
      seen.add(key);
      out.push({ match: m, tournamentId: t.id, tournamentName: t.name, year });
    };
    for (const m of t.matches || []) push(m, currentYear);
    for (const s of t.seasons || []) for (const m of s.matches || []) push(m, Number(s.year) || 0);
  }
  return out;
}

export function countTitles(tournaments: Tournament[], tournamentId?: string): Map<string, number> {
  const titles = new Map<string, number>();
  for (const t of tournaments) {
    if (tournamentId && t.id !== tournamentId) continue;
    for (const s of t.seasons || []) {
      const ids = new Set([s.championId, ...(s.coChampions || []).map((c) => c.id)].filter(Boolean));
      ids.forEach((id) => titles.set(id, (titles.get(id) || 0) + 1));
    }
  }
  return titles;
}

export function aggregateTeams(matches: StatMatch[], titles: Map<string, number>): Map<string, TeamAgg> {
  const map = new Map<string, TeamAgg>();
  const get = (id: string) => {
    let a = map.get(id);
    if (!a) {
      a = { teamId: id, played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, titles: titles.get(id) || 0 };
      map.set(id, a);
    }
    return a;
  };
  for (const { match: m } of matches) {
    const hs = (m.homeScore ?? 0) + (m.homeExtraTime ?? 0);
    const as = (m.awayScore ?? 0) + (m.awayExtraTime ?? 0);
    const h = get(m.homeTeamId);
    const a = get(m.awayTeamId);
    h.played++; a.played++;
    h.goalsFor += hs; h.goalsAgainst += as;
    a.goalsFor += as; a.goalsAgainst += hs;
    if (hs > as) { h.wins++; a.losses++; } else if (hs < as) { a.wins++; h.losses++; } else { h.draws++; a.draws++; }
  }
  titles.forEach((n, id) => { get(id).titles = n; });
  return map;
}

export function aggregatePlayers(matches: StatMatch[], players: Player[], teamFilter?: string): Map<string, PlayerAgg> {
  const byId = new Map(players.map((p) => [p.id, p]));
  const map = new Map<string, PlayerAgg>();
  const get = (id: string, teamId: string, name?: string) => {
    let a = map.get(id);
    if (!a) {
      const p = byId.get(id);
      a = { playerId: id, name: p?.name || name || "Jogador removido", teamId: p?.teamId || teamId, position: p?.position, matches: 0, goals: 0, assists: 0, yellow: 0, red: 0, ratingSum: 0, ratingCount: 0 };
      map.set(id, a);
    } else if (a.name === "Jogador removido" && name) a.name = name;
    return a;
  };
  const ok = (teamId: string) => !teamFilter || teamId === teamFilter;

  for (const { match: m } of matches) {
    const participants = (teamId: string, lineup?: string[]) => {
      const ids = new Set(lineup || []);
      for (const e of m.events || []) if (e.type === "substitution" && e.teamId === teamId && e.playerId) ids.add(e.playerId);
      return ids;
    };
    const homeIds = participants(m.homeTeamId, m.homeLineup);
    const awayIds = participants(m.awayTeamId, m.awayLineup);
    if (ok(m.homeTeamId)) homeIds.forEach((id) => get(id, m.homeTeamId).matches++);
    if (ok(m.awayTeamId)) awayIds.forEach((id) => get(id, m.awayTeamId).matches++);

    for (const e of m.events || []) {
      if (!ok(e.teamId)) continue;
      if (e.type === "goal" && e.playerId && !/contra/i.test(e.text || "")) {
        get(e.playerId, e.teamId, e.playerName).goals++;
        if (e.assistId) get(e.assistId, e.teamId, e.assistName).assists++;
      } else if (e.type === "yellow_card" && e.playerId) get(e.playerId, e.teamId, e.playerName).yellow++;
      else if (e.type === "red_card" && e.playerId) get(e.playerId, e.teamId, e.playerName).red++;
    }

    const hp = [...homeIds].map((id) => byId.get(id)).filter(Boolean) as Player[];
    const ap = [...awayIds].map((id) => byId.get(id)).filter(Boolean) as Player[];
    if (hp.length || ap.length) {
      const r = calculatePlayerRatings(hp, ap, m.homeTeamId, m.awayTeamId, m.events || [], { home: m.awayScore ?? 0, away: m.homeScore ?? 0 });
      for (const [pid, v] of Object.entries(r)) {
        const tid = homeIds.has(pid) ? m.homeTeamId : m.awayTeamId;
        if (typeof v !== "number" || !ok(tid)) continue;
        const a = get(pid, tid);
        a.ratingSum += v;
        a.ratingCount++;
      }
    }
  }
  return map;
}

/** Inclui todos os jogadores cadastrados do time, mesmo sem jogos. */
export function teamRoster(team: Team | undefined, players: Player[], agg: Map<string, PlayerAgg>): PlayerAgg[] {
  if (!team) return [];
  const rows = new Map<string, PlayerAgg>();
  for (const p of players) {
    if (p.teamId !== team.id) continue;
    rows.set(p.id, agg.get(p.id) || { playerId: p.id, name: p.name, teamId: team.id, position: p.position, matches: 0, goals: 0, assists: 0, yellow: 0, red: 0, ratingSum: 0, ratingCount: 0 });
  }
  agg.forEach((a) => { if (a.teamId === team.id && !rows.has(a.playerId)) rows.set(a.playerId, a); });
  return [...rows.values()];
}
