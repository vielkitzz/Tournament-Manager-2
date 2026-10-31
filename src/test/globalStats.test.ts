import { describe, it, expect } from "vitest";
import { aggregatePlayers, aggregateTeams, collectMatches, countTitles, teamRoster } from "@/lib/globalStats";

const m = (id: string, h: string, a: string, hs: number, as: number, events: any[] = []) =>
  ({ id, tournamentId: "t", round: 1, homeTeamId: h, awayTeamId: a, homeScore: hs, awayScore: as, played: true, events } as any);

const tournaments: any[] = [
  { id: "t1", name: "Liga", year: "2026", matches: [m("1", "A", "B", 2, 0, [{ id: "e", minute: 1, type: "goal", teamId: "A", playerId: "p1", assistId: "p2", text: "Gol" }])],
    seasons: [{ year: 2025, championId: "A", standings: [], matches: [m("1", "A", "B", 1, 1)] }] },
  { id: "t2", name: "Copa", year: "2026", matches: [m("9", "B", "A", 0, 3, [{ id: "f", minute: 5, type: "goal", teamId: "A", playerId: "p1", text: "Gol" }]), { ...m("x", "A", "B", 9, 0), played: false }], seasons: [] },
];

describe("globalStats", () => {
  it("soma gols do jogador entre competições e temporadas", () => {
    const players = aggregatePlayers(collectMatches(tournaments), []);
    expect(players.get("p1")!.goals).toBe(2);
    expect(players.get("p2")!.assists).toBe(1);
  });
  it("conta V/E/D e ignora jogos não jogados", () => {
    const teams = aggregateTeams(collectMatches(tournaments), countTitles(tournaments));
    const a = teams.get("A")!;
    expect([a.played, a.wins, a.draws, a.losses, a.goalsFor]).toEqual([3, 2, 1, 0, 6]);
    expect(a.titles).toBe(1);
  });
  it("lista todos os jogadores cadastrados do time, mesmo sem jogos", () => {
    const roster = teamRoster({ id: "A" } as any, [{ id: "p9", teamId: "A", name: "Reserva", skill: 60 }], new Map());
    expect(roster.map((r) => r.name)).toEqual(["Reserva"]);
    expect(roster[0].matches).toBe(0);
  });
});
