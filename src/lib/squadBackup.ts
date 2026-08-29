/**
 * squadBackup.ts
 *
 * Serialização/desserialização de todos os elencos salvos (import/export geral).
 * Módulo puro: recebe times e jogadores, devolve estruturas prontas.
 */

import { Player, Team } from "@/types/tournament";
import { MAX_SQUAD_SIZE, playersFromJson } from "@/lib/squadGenerator";

export interface SquadBackupEntry {
  teamName: string;
  teamAbbreviation?: string;
  players: Omit<Player, "id" | "teamId">[];
}

export interface SquadBackupFile {
  _type: "squads";
  _version: 1;
  squads: SquadBackupEntry[];
}

/** Monta o arquivo com todos os elencos, agrupados por time. */
export function buildSquadsBackup(teams: Team[], players: Player[]): SquadBackupFile {
  const byTeam = new Map<string, Player[]>();
  players.forEach((p) => {
    if (!p.teamId) return;
    const list = byTeam.get(p.teamId) || [];
    list.push(p);
    byTeam.set(p.teamId, list);
  });

  const squads: SquadBackupEntry[] = [];
  teams.forEach((team) => {
    const list = byTeam.get(team.id);
    if (!list || list.length === 0) return;
    squads.push({
      teamName: team.name,
      teamAbbreviation: team.abbreviation,
      players: list.map(({ id, teamId, ...rest }) => rest),
    });
  });

  return { _type: "squads", _version: 1, squads };
}

export function countBackupPlayers(file: SquadBackupFile): number {
  return file.squads.reduce((s, e) => s + e.players.length, 0);
}

export interface SquadImportPlan {
  matched: { team: Team; players: Player[] }[];
  unmatchedTeams: string[];
  skipped: number;
}

const normalize = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

/**
 * Casa cada bloco do arquivo com um time existente (pelo nome, ignorando acentos/caixa)
 * e prepara os jogadores respeitando o limite por elenco e camisas já usadas.
 */
export function planSquadImport(raw: unknown, teams: Team[], existingPlayers: Player[]): SquadImportPlan {
  const squads: SquadBackupEntry[] = Array.isArray((raw as any)?.squads) ? (raw as any).squads : [];
  const index = new Map(teams.map((t) => [normalize(t.name), t]));
  const matched: SquadImportPlan["matched"] = [];
  const unmatchedTeams: string[] = [];
  let skipped = 0;

  for (const entry of squads) {
    if (!entry?.teamName) continue;
    const team = index.get(normalize(entry.teamName));
    if (!team) {
      unmatchedTeams.push(entry.teamName);
      skipped += Array.isArray(entry.players) ? entry.players.length : 0;
      continue;
    }
    const current = existingPlayers.filter((p) => p.teamId === team.id);
    const limit = Math.max(0, MAX_SQUAD_SIZE - current.length);
    if (limit === 0) {
      skipped += entry.players?.length || 0;
      continue;
    }
    const players = playersFromJson(entry.players, {
      teamId: team.id,
      usedShirtNumbers: current.map((p) => p.shirtNumber).filter((n): n is number => n != null),
      limit,
    });
    skipped += Math.max(0, (entry.players?.length || 0) - players.length);
    if (players.length > 0) matched.push({ team, players });
  }

  return { matched, unmatchedTeams, skipped };
}
