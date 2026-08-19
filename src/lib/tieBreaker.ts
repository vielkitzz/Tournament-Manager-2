import { Match, TournamentSettings } from "@/types/tournament";

export interface TiePair {
  leg1: Match;
  leg2: Match | null;
  /** Jogos extras (replays) do confronto, em ordem. */
  replays?: Match[];
}

export type TieReason =
  | "aggregate"
  | "single"
  | "away-goals"
  | "penalties"
  | "replay"
  | "coin-toss"
  | null;

export interface TieResolution {
  winnerId: string | null;
  reason: TieReason;
  /** Placar agregado do confronto (perspectiva do mandante da ida). */
  aggregate: { home: number; away: number } | null;
  /** Texto pronto para exibição, ex: "Agregado 2 x 2 — vence nos pênaltis (4-3)". */
  label: string | null;
  /** Confronto jogado e ainda empatado (precisa de jogo extra ou sorteio). */
  needsTiebreak: boolean;
}

const total = (m: Match, side: "home" | "away") =>
  side === "home"
    ? (m.homeScore || 0) + (m.homeExtraTime || 0)
    : (m.awayScore || 0) + (m.awayExtraTime || 0);

export function pairAggregate(leg1: Match, leg2: Match | null) {
  if (!leg2) return { home: total(leg1, "home"), away: total(leg1, "away") };
  return {
    home: total(leg1, "home") + total(leg2, "away"),
    away: total(leg1, "away") + total(leg2, "home"),
  };
}

/** Vencedor de uma partida isolada (inclui prorrogação e pênaltis). */
export function singleMatchWinner(match: Match): string | null {
  if (!match.played) return null;
  if (!match.awayTeamId) return match.homeTeamId || null;
  if (!match.homeTeamId) return match.awayTeamId || null;
  const h = total(match, "home");
  const a = total(match, "away");
  if (h > a) return match.homeTeamId;
  if (a > h) return match.awayTeamId;
  if (match.homePenalties !== undefined && match.awayPenalties !== undefined) {
    if (match.homePenalties === match.awayPenalties) return null;
    return match.homePenalties > match.awayPenalties ? match.homeTeamId : match.awayTeamId;
  }
  return null;
}

export function playedReplays(pair: TiePair): Match[] {
  return (pair.replays || [])
    .slice()
    .sort((a, b) => (a.replayIndex || 0) - (b.replayIndex || 0));
}

/**
 * Fonte única de verdade para o resultado de um confronto eliminatório:
 * agregado → gols fora → pênaltis → jogos extras → sorteio.
 */
export function resolveTie(pair: TiePair, settings: TournamentSettings): TieResolution {
  const { leg1, leg2 } = pair;
  const awayGoalsRule = settings.awayGoalsRule ?? false;
  const replays = playedReplays(pair);
  const coinToss = leg1.coinTossWinnerId || replays.find((r) => r.coinTossWinnerId)?.coinTossWinnerId;

  const legsPlayed = leg1.played && (!leg2 || leg2.played);
  const aggregate = legsPlayed ? pairAggregate(leg1, leg2) : null;
  const aggLabel = aggregate && leg2 ? `Agregado ${aggregate.home} x ${aggregate.away}` : null;

  const finish = (winnerId: string | null, reason: TieReason, extra?: string): TieResolution => ({
    winnerId,
    reason,
    aggregate,
    label: [aggLabel, extra].filter(Boolean).join(" — ") || null,
    needsTiebreak: legsPlayed && !winnerId,
  });

  if (!legsPlayed) return finish(null, null);

  // Sorteio (cara ou coroa) tem precedência: é sempre a decisão final registrada.
  if (coinToss) return finish(coinToss, "coin-toss", "decidido no sorteio");

  // Jogos extras: o último replay com vencedor define o confronto.
  for (let i = replays.length - 1; i >= 0; i--) {
    const w = singleMatchWinner(replays[i]);
    if (w) {
      const pens =
        replays[i].homePenalties !== undefined && replays[i].awayPenalties !== undefined
          ? ` (pên. ${replays[i].homePenalties}-${replays[i].awayPenalties})`
          : "";
      return finish(
        w,
        "replay",
        `decidido no jogo extra ${replays[i].replayIndex || i + 1}${pens}`
      );
    }
  }

  if (!leg2) {
    const w = singleMatchWinner(leg1);
    if (w) {
      const pens =
        leg1.homePenalties !== undefined && leg1.awayPenalties !== undefined
          ? `vence nos pênaltis (${leg1.homePenalties}-${leg1.awayPenalties})`
          : undefined;
      return finish(w, pens ? "penalties" : "single", pens);
    }
    return finish(null, null);
  }

  const agg = aggregate!;
  if (agg.home > agg.away) return finish(leg1.homeTeamId, "aggregate");
  if (agg.away > agg.home) return finish(leg1.awayTeamId, "aggregate");

  if (awayGoalsRule) {
    const homeAway = total(leg2, "away");
    const awayAway = total(leg1, "away");
    if (homeAway > awayAway) return finish(leg1.homeTeamId, "away-goals", "gols fora de casa");
    if (awayAway > homeAway) return finish(leg1.awayTeamId, "away-goals", "gols fora de casa");
  }

  if (leg2.homePenalties !== undefined && leg2.awayPenalties !== undefined) {
    if (leg2.homePenalties !== leg2.awayPenalties) {
      const homeWins = leg2.awayPenalties! < leg2.homePenalties!;
      // leg2 é mandado pelo visitante da ida
      const winnerId = homeWins ? leg1.awayTeamId : leg1.homeTeamId;
      const a = Math.max(leg2.homePenalties!, leg2.awayPenalties!);
      const b = Math.min(leg2.homePenalties!, leg2.awayPenalties!);
      return finish(winnerId, "penalties", `vence nos pênaltis (${a}-${b})`);
    }
  }

  return finish(null, null);
}

/** Sorteia o vencedor entre os dois times do confronto. */
export function coinTossWinner(leg1: Match): string {
  return Math.random() < 0.5 ? leg1.homeTeamId : leg1.awayTeamId;
}

export function maxReplaysOf(settings: TournamentSettings) {
  const v = settings.maxReplays;
  return typeof v === "number" && v >= 0 ? v : 2;
}

export function tiebreakMode(settings: TournamentSettings) {
  return settings.knockoutTiebreakMode || "penalties";
}

export function isAutoTiebreak(settings: TournamentSettings) {
  return settings.autoTiebreak !== false;
}

/**
 * Resolve automaticamente um confronto empatado: cria e simula jogos extras
 * até o limite configurado e, se o empate persistir, decide no sorteio.
 * Retorna as partidas criadas/atualizadas para gravar em lote.
 */
export function autoResolveTie(
  pair: TiePair,
  settings: TournamentSettings,
  simulate: (match: Match) => Match,
): Match[] {
  const out: Match[] = [];
  const working: TiePair = { ...pair, replays: [...(pair.replays || [])] };
  if (!resolveTie(working, settings).needsTiebreak) return out;

  const limit = maxReplaysOf(settings);
  const mode = tiebreakMode(settings);

  if (mode === "replay") {
    let guard = 0;
    while (
      resolveTie(working, settings).needsTiebreak &&
      (limit === 0 || (working.replays as Match[]).length < limit) &&
      guard++ < 20
    ) {
      const index = (working.replays as Match[]).length + 1;
      const base: Match = {
        ...working.leg1,
        id: crypto.randomUUID(),
        homeScore: 0,
        awayScore: 0,
        homeExtraTime: undefined,
        awayExtraTime: undefined,
        homePenalties: undefined,
        awayPenalties: undefined,
        coinTossWinnerId: undefined,
        events: undefined,
        played: false,
        isReplay: true,
        replayIndex: index,
      };
      const simulated = simulate(base);
      (working.replays as Match[]).push(simulated);
      out.push(simulated);
    }
  }

  if (resolveTie(working, settings).needsTiebreak && (settings.allowCoinToss ?? true)) {
    const winnerId = coinTossWinner(working.leg1);
    const leg1 = { ...working.leg1, coinTossWinnerId: winnerId };
    working.leg1 = leg1;
    out.push(leg1);
  }

  return out;
}