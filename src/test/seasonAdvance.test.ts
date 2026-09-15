import { describe, expect, it } from "vitest";
import { resolveBatchTeamIds } from "@/lib/seasonAdvance";
import { DEFAULT_SETTINGS, type Tournament } from "@/types/tournament";

const tournament = (id: string, teams: string[], target?: string): Tournament => ({
  id,
  name: id,
  sport: "Futebol",
  year: 2026,
  format: "liga",
  numberOfTeams: teams.length,
  teamIds: teams,
  matches: [],
  finalized: true,
  settings: { ...DEFAULT_SETTINGS, promotions: target ? [{ position: 1, type: "promotion", color: "", targetCompetition: target, targetCompetitionId: target }] : [] },
  seasons: [{ year: 2026, championId: teams[0], championName: teams[0], teamIds: teams, settings: { ...DEFAULT_SETTINGS, promotions: target ? [{ position: 1, type: "promotion", color: "", targetCompetition: target, targetCompetitionId: target }] : [] }, standings: teams.map((teamId, index) => ({ teamId, teamName: teamId, points: 10 - index, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0 })) }],
});

describe("global season calendar", () => {
  it("moves qualified teams between selected competitions atomically", () => {
    const result = resolveBatchTeamIds([tournament("a", ["a1", "a2"], "b"), tournament("b", ["b1", "b2"])], ["a", "b"]);
    expect(result.get("a")).toEqual(["a2"]);
    expect(result.get("b")).toEqual(["b1", "b2", "a1"]);
  });
});