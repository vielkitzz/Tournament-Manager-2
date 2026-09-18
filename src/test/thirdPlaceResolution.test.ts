import { describe, expect, it } from "vitest";
import { buildThirdPlacePair, resolveTie } from "@/lib/tieBreaker";
import { buildTournamentResults } from "@/lib/exportResults";
import { DEFAULT_SETTINGS, type Match, type Team, type Tournament } from "@/types/tournament";

const match = (overrides: Partial<Match>): Match => ({
  id: crypto.randomUUID(),
  tournamentId: "cup",
  round: 2,
  homeTeamId: "a",
  awayTeamId: "b",
  homeScore: 0,
  awayScore: 0,
  played: true,
  ...overrides,
});

const tournament: Tournament = {
  id: "cup",
  name: "Copa",
  sport: "Futebol",
  year: 2026,
  format: "mata-mata",
  numberOfTeams: 4,
  teamIds: ["champion", "runner", "a", "b"],
  matches: [],
  settings: { ...DEFAULT_SETTINGS, thirdPlaceMatch: true },
};

const teams = tournament.teamIds.map((id) => ({ id, name: id, colors: [] })) as Team[];

describe("third-place resolution", () => {
  it("uses an extra match to resolve third place", () => {
    const main = match({ id: "third-main", isThirdPlace: true, pairId: "third-pair" });
    const replay = match({ id: "third-replay", isThirdPlace: true, isReplay: true, pairId: "third-pair", replayIndex: 1, homeScore: 2, awayScore: 1 });
    const pair = buildThirdPlacePair([main, replay]);
    expect(pair && resolveTie(pair, tournament.settings).winnerId).toBe("a");
  });

  it("recognizes a legacy replay without third-place markers", () => {
    const main = match({ id: "third-main", isThirdPlace: true });
    const replay = match({ id: "legacy-replay", isReplay: true, replayIndex: 1, homeScore: 0, awayScore: 1 });
    const pair = buildThirdPlacePair([main, replay]);
    expect(pair?.replays?.map((item) => item.id)).toEqual(["legacy-replay"]);
    expect(pair && resolveTie(pair, tournament.settings).winnerId).toBe("b");
  });

  it("uses a coin toss after drawn extra matches", () => {
    const main = match({ id: "third-main", isThirdPlace: true, pairId: "third-pair", coinTossWinnerId: "b" });
    const replay = match({ id: "third-replay", isThirdPlace: true, isReplay: true, pairId: "third-pair", replayIndex: 1 });
    const pair = buildThirdPlacePair([main, replay]);
    expect(pair && resolveTie(pair, tournament.settings).winnerId).toBe("b");
  });

  it("exports third and fourth place after an extra match", () => {
    const semifinalA = match({ id: "semi-a", round: 1, homeTeamId: "champion", awayTeamId: "a", homeScore: 1, awayScore: 0 });
    const semifinalB = match({ id: "semi-b", round: 1, homeTeamId: "runner", awayTeamId: "b", homeScore: 1, awayScore: 0 });
    const final = match({ id: "final", homeTeamId: "champion", awayTeamId: "runner", homeScore: 2, awayScore: 0 });
    const third = match({ id: "third", isThirdPlace: true, pairId: "third-pair" });
    const replay = match({ id: "third-replay", isThirdPlace: true, isReplay: true, pairId: "third-pair", replayIndex: 1, homeScore: 3, awayScore: 1 });
    const results = buildTournamentResults({ tournament, teams, standings: [], knockoutMatches: [semifinalA, semifinalB, final, third, replay], knockoutStartStage: "1/4" });
    expect(results.slice(0, 4).map((result) => result.clube)).toEqual(["champion", "runner", "a", "b"]);
  });
});