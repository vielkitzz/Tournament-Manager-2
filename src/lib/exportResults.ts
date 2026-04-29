import { Match, Tournament, Team, KnockoutStage } from "@/types/tournament";
import { StandingRow } from "@/lib/standings";

const STAGE_LABELS: Record<KnockoutStage, string> = {
  "1/64": "64-avos de final",
  "1/32": "32-avos de final",
  "1/16": "oitavas de final",
  "1/8": "quartas de final",
  "1/4": "semifinal",
  "1/2": "final",
};

export interface ResultEntry {
  clube: string;
  posicao: number;
  fase?: string;
}

export interface ExportResultsPayload {
  torneio: string;
  temporada: number;
  exportado_em: string;
  resultados: ResultEntry[];
}

function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    || "torneio";
}

function pairWinnerLoser(legs: Match[]): { winnerId?: string; loserId?: string } {
  if (legs.length === 0) return {};
  if (legs.length === 1) {
    const m = legs[0];
    if (!m.played) return {};
    const h = (m.homeScore || 0) + (m.homeExtraTime || 0);
    const a = (m.awayScore || 0) + (m.awayExtraTime || 0);
    if (h > a) return { winnerId: m.homeTeamId, loserId: m.awayTeamId };
    if (a > h) return { winnerId: m.awayTeamId, loserId: m.homeTeamId };
    if (m.homePenalties != null && m.awayPenalties != null) {
      return m.homePenalties > m.awayPenalties
        ? { winnerId: m.homeTeamId, loserId: m.awayTeamId }
        : { winnerId: m.awayTeamId, loserId: m.homeTeamId };
    }
    return {};
  }
  const [leg1, leg2] = legs;
  if (!leg1.played || !leg2.played) return {};
  const h =
    (leg1.homeScore || 0) + (leg1.homeExtraTime || 0) +
    (leg2.awayScore || 0) + (leg2.awayExtraTime || 0);
  const a =
    (leg1.awayScore || 0) + (leg1.awayExtraTime || 0) +
    (leg2.homeScore || 0) + (leg2.homeExtraTime || 0);
  if (h > a) return { winnerId: leg1.homeTeamId, loserId: leg1.awayTeamId };
  if (a > h) return { winnerId: leg1.awayTeamId, loserId: leg1.homeTeamId };
  if (leg2.homePenalties != null && leg2.awayPenalties != null) {
    return leg2.awayPenalties > leg2.homePenalties
      ? { winnerId: leg1.homeTeamId, loserId: leg1.awayTeamId }
      : { winnerId: leg1.awayTeamId, loserId: leg1.homeTeamId };
  }
  return {};
}

/** Build results: champion, runner-up, knockout-eliminated, then group/league finishers. */
export function buildTournamentResults(params: {
  tournament: Tournament;
  teams: Team[];
  standings: StandingRow[];
  standingsByGroup?: Record<number, StandingRow[]>;
  knockoutMatches: Match[];
  knockoutStartStage?: string;
}): ResultEntry[] {
  const { tournament, teams, standings, standingsByGroup, knockoutMatches, knockoutStartStage } = params;
  const isMataMata = tournament.format === "mata-mata";
  const isGrupos = tournament.format === "grupos";
  const isSuico = tournament.format === "suico";
  const isLiga = tournament.format === "liga";
  const hasKnockout = isMataMata || isGrupos || isSuico;

  const teamName = (id: string) => teams.find((t) => t.id === id)?.name || "Desconhecido";

  // Pure liga: just standings → posicao = index+1, no fase
  if (isLiga || !hasKnockout) {
    return standings.map((s, i) => ({
      clube: s.team?.name || teamName(s.teamId),
      posicao: i + 1,
    }));
  }

  // Knockout: figure out active stages from start stage
  const stages: KnockoutStage[] = ["1/64", "1/32", "1/16", "1/8", "1/4", "1/2"];
  const startIdx = knockoutStartStage ? stages.indexOf(knockoutStartStage as KnockoutStage) : -1;
  const activeStages = startIdx >= 0 ? stages.slice(startIdx) : ["1/2" as KnockoutStage];
  const finalRoundNum = activeStages.length;

  // Group knockout matches by round and pair
  const knMatches = knockoutMatches.filter((m) => !m.isThirdPlace);
  const thirdPlace = knockoutMatches.find((m) => m.isThirdPlace);

  // For each round, collect pairs and determine winners/losers
  const eliminatedByRound = new Map<number, string[]>();
  let championId: string | undefined;
  let runnerUpId: string | undefined;

  for (let round = 1; round <= finalRoundNum; round++) {
    const matches = knMatches.filter((m) => m.round === round);
    const pairMap = new Map<string, Match[]>();
    const singles: Match[] = [];
    for (const m of matches) {
      if (m.pairId) {
        if (!pairMap.has(m.pairId)) pairMap.set(m.pairId, []);
        pairMap.get(m.pairId)!.push(m);
      } else {
        singles.push(m);
      }
    }
    const losers: string[] = [];
    for (const pair of pairMap.values()) {
      const sorted = [...pair].sort((a, b) => (a.leg || 1) - (b.leg || 1));
      const { winnerId, loserId } = pairWinnerLoser(sorted);
      if (round === finalRoundNum) {
        if (winnerId) championId = winnerId;
        if (loserId) runnerUpId = loserId;
      } else if (loserId) {
        losers.push(loserId);
      }
    }
    for (const m of singles) {
      const { winnerId, loserId } = pairWinnerLoser([m]);
      if (round === finalRoundNum) {
        if (winnerId) championId = winnerId;
        if (loserId) runnerUpId = loserId;
      } else if (loserId) {
        losers.push(loserId);
      }
    }
    if (round < finalRoundNum && losers.length > 0) {
      eliminatedByRound.set(round, losers);
    }
  }

  // Determine 3rd/4th from third-place match if present, else from semifinal losers
  let thirdPlaceId: string | undefined;
  let fourthPlaceId: string | undefined;
  const semifinalRound = finalRoundNum - 1;
  const semifinalLosers = eliminatedByRound.get(semifinalRound) || [];
  if (thirdPlace && thirdPlace.played) {
    const { winnerId, loserId } = pairWinnerLoser([thirdPlace]);
    thirdPlaceId = winnerId;
    fourthPlaceId = loserId;
    // Remove these from eliminated semifinal list to avoid duplicates
    eliminatedByRound.set(
      semifinalRound,
      semifinalLosers.filter((id) => id !== thirdPlaceId && id !== fourthPlaceId),
    );
  }

  const results: ResultEntry[] = [];
  let pos = 1;
  const seen = new Set<string>();
  const addEntry = (id: string, fase: string) => {
    if (seen.has(id)) return;
    seen.add(id);
    results.push({ clube: teamName(id), posicao: pos++, fase });
  };

  if (championId) addEntry(championId, "campeão");
  if (runnerUpId) addEntry(runnerUpId, "vice");
  if (thirdPlaceId) addEntry(thirdPlaceId, "semifinal");
  if (fourthPlaceId) addEntry(fourthPlaceId, "semifinal");

  // Walk eliminated rounds from latest (closest to final) backward
  for (let round = finalRoundNum - 1; round >= 1; round--) {
    const losers = eliminatedByRound.get(round) || [];
    const stage = activeStages[round - 1];
    const fase = STAGE_LABELS[stage];
    for (const id of losers) addEntry(id, fase);
  }

  // Remaining: teams that didn't reach knockout (group stage / swiss league phase)
  const groupFase = isSuico ? "fase de liga" : "fase de grupos";
  if (isGrupos && standingsByGroup && Object.keys(standingsByGroup).length > 0) {
    // Order non-qualified teams by group position (1st of each, then 2nd, etc.)
    const groups = Object.entries(standingsByGroup)
      .map(([g, s]) => ({ g: parseInt(g), s }))
      .sort((a, b) => a.g - b.g);
    const maxLen = Math.max(...groups.map((x) => x.s.length), 0);
    for (let i = 0; i < maxLen; i++) {
      for (const { s } of groups) {
        const row = s[i];
        if (row && !seen.has(row.teamId)) {
          addEntry(row.teamId, groupFase);
        }
      }
    }
  } else {
    for (const s of standings) {
      if (!seen.has(s.teamId)) {
        addEntry(s.teamId, groupFase);
      }
    }
  }

  // Catch any tournament team still missing (e.g. preliminary phases)
  for (const teamId of tournament.teamIds) {
    if (!seen.has(teamId)) {
      addEntry(teamId, isMataMata ? STAGE_LABELS[activeStages[0]] : groupFase);
    }
  }

  return results;
}

export function downloadTournamentResults(params: {
  tournament: Tournament;
  teams: Team[];
  standings: StandingRow[];
  standingsByGroup?: Record<number, StandingRow[]>;
  knockoutMatches: Match[];
  knockoutStartStage?: string;
  season: number;
}): void {
  const resultados = buildTournamentResults(params);
  const payload: ExportResultsPayload = {
    torneio: params.tournament.name,
    temporada: params.season,
    exportado_em: new Date().toISOString(),
    resultados,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `resultados_${slugify(params.tournament.name)}_${params.season}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}