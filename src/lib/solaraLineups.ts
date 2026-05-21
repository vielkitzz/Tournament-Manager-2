import { supabase } from "@/integrations/supabase/client";
import type { Player } from "@/types/tournament";

export interface SolaraLineup {
  pitchIds: Record<string, string>;
  benchIds?: string[];
}

const lineupCache = new Map<string, SolaraLineup | null>();

export function clearLineupCache(teamId?: string) {
  if (teamId) lineupCache.delete(teamId);
  else lineupCache.clear();
}

export async function fetchTeamLineups(teamIds: string[]): Promise<Map<string, SolaraLineup | null>> {
  const result = new Map<string, SolaraLineup | null>();
  const toFetch: string[] = [];

  for (const id of teamIds) {
    if (!id) continue;
    if (lineupCache.has(id)) {
      result.set(id, lineupCache.get(id) ?? null);
    } else {
      toFetch.push(id);
    }
  }
  if (toFetch.length === 0) return result;

  const { data: links } = await (supabase as any)
    .from("club_sync_links")
    .select("tm2_team_id, solarahub_club_id")
    .in("tm2_team_id", toFetch);

  const tm2ToSolara = new Map<string, string>();
  (links || []).forEach((l: any) => tm2ToSolara.set(l.tm2_team_id, l.solarahub_club_id));

  await Promise.all(
    toFetch.map(async (teamId) => {
      const solaraId = tm2ToSolara.get(teamId);
      if (!solaraId) {
        lineupCache.set(teamId, null);
        result.set(teamId, null);
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke("get-solarahub-lineup", {
          body: { solarahub_club_id: solaraId },
        });

        if (error) {
          console.error(`Erro na Edge Function para o time ${teamId}:`, error);
          lineupCache.set(teamId, null);
          result.set(teamId, null);
          return;
        }

        const raw = data?.lineup;
        if (!raw) {
          lineupCache.set(teamId, null);
          result.set(teamId, null);
          return;
        }

        const lineup: SolaraLineup = {
          pitchIds: (raw.pitchIds ?? raw) as Record<string, string>,
          benchIds: raw.benchIds,
        };

        lineupCache.set(teamId, lineup);
        result.set(teamId, lineup);
      } catch (err) {
        console.error(`Falha ao processar escalação do time ${teamId}:`, err);
        lineupCache.set(teamId, null);
        result.set(teamId, null);
      }
    }),
  );

  return result;
}

export function pickStartingXIWithSubs(
  squad: Player[],
  suspendedIds: Set<string>,
  lineup: SolaraLineup | null,
): Player[] {
  const available = squad.filter((p) => !suspendedIds.has(p.id));
  const fallbackPool = available.length >= 11 ? available : squad;

  if (!lineup?.pitchIds || Object.keys(lineup.pitchIds).length === 0) {
    return fallbackPool.slice(0, 11);
  }

  const byMaster = new Map<string, Player>();
  squad.forEach((p) => {
    const mid = p.masterPlayerId ?? (p as any).master_player_id;
    if (mid) byMaster.set(mid, p);
  });

  const usedIds = new Set<string>();
  const starters: Player[] = [];

  for (const masterId of Object.values(lineup.pitchIds)) {
    const intended = byMaster.get(masterId);
    if (intended && !suspendedIds.has(intended.id) && !usedIds.has(intended.id)) {
      starters.push(intended);
      usedIds.add(intended.id);
      continue;
    }
    const position = intended?.position;
    let replacement: Player | undefined;
    if (position) {
      replacement = available.find((p) => p.position === position && !usedIds.has(p.id));
    }
    if (!replacement) {
      replacement = available.find((p) => !usedIds.has(p.id));
    }
    if (replacement) {
      starters.push(replacement);
      usedIds.add(replacement.id);
    }
  }

  if (starters.length < 11) {
    for (const p of fallbackPool) {
      if (starters.length >= 11) break;
      if (!usedIds.has(p.id)) {
        starters.push(p);
        usedIds.add(p.id);
      }
    }
  }

  return starters.slice(0, 11);
}
