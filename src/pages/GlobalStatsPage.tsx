import { useMemo, useRef, useState } from "react";
import { BarChart3 } from "lucide-react";
import { useTournamentStore } from "@/store/tournamentStore";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import TeamLogo from "@/components/TeamLogo";
import ScreenshotButton from "@/components/ScreenshotButton";
import { aggregatePlayers, aggregateTeams, avgRating, collectMatches, countTitles, teamRoster, type PlayerAgg, type TeamAgg } from "@/lib/globalStats";

const ALL = "__all";
const fmt = (n: number | null) => (n == null ? "—" : n.toFixed(2));

function Ranking({ title, rows, value, teamsById }: { title: string; rows: PlayerAgg[]; value: (p: PlayerAgg) => string; teamsById: Map<string, { name: string; logo?: string }> }) {
  const [more, setMore] = useState(false);
  const list = rows.slice(0, more ? 30 : 10);
  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <h3 className="mb-3 text-sm font-semibold tracking-tight text-foreground">{title}</h3>
      {list.length === 0 ? <p className="text-xs text-muted-foreground">Sem dados ainda.</p> : (
        <ol className="space-y-1.5">
          {list.map((p, i) => (
            <li key={p.playerId} className="flex items-center gap-2 text-sm">
              <span className="w-5 text-xs text-muted-foreground">{i + 1}</span>
              <TeamLogo src={teamsById.get(p.teamId)?.logo} alt="" size={16} />
              <span className="flex-1 truncate text-foreground">{p.name}</span>
              <span className="font-semibold tabular-nums text-foreground">{value(p)}</span>
            </li>
          ))}
        </ol>
      )}
      {rows.length > 10 && (
        <button onClick={() => setMore(!more)} className="mt-3 text-xs text-primary hover:underline">{more ? "ver menos" : "ver mais"}</button>
      )}
    </section>
  );
}

type SortKey = "name" | "matches" | "goals" | "assists" | "yellow" | "red" | "rating";

export default function GlobalStatsPage() {
  const tournaments = useTournamentStore((s) => s.tournaments);
  const teams = useTournamentStore((s) => s.teams);
  const players = useTournamentStore((s) => s.players);
  const [tid, setTid] = useState(ALL);
  const [teamId, setTeamId] = useState(ALL);
  const [tab, setTab] = useState("geral");
  const [search, setSearch] = useState("");
  const [teamSort, setTeamSort] = useState<keyof TeamAgg | "pct" | "sg">("titles");
  const [pSort, setPSort] = useState<SortKey>("goals");
  const ref = useRef<HTMLDivElement>(null);

  const teamsById = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);
  const tFilter = tid === ALL ? undefined : tid;
  const tmFilter = teamId === ALL ? undefined : teamId;

  const matches = useMemo(() => collectMatches(tournaments, tFilter), [tournaments, tFilter]);
  const titles = useMemo(() => countTitles(tournaments, tFilter), [tournaments, tFilter]);
  const teamAgg = useMemo(() => aggregateTeams(matches, titles), [matches, titles]);
  const scoped = useMemo(() => (tmFilter ? matches.filter((m) => m.match.homeTeamId === tmFilter || m.match.awayTeamId === tmFilter) : matches), [matches, tmFilter]);
  const playerAgg = useMemo(() => aggregatePlayers(scoped, players, tmFilter), [scoped, players, tmFilter]);
  const pList = useMemo(() => [...playerAgg.values()], [playerAgg]);

  const summary = useMemo(() => {
    let goals = 0; let big: (typeof scoped)[number] | null = null; let bigDiff = -1;
    for (const s of scoped) {
      const m = s.match; goals += m.homeScore + m.awayScore;
      const d = Math.abs(m.homeScore - m.awayScore);
      if (d > bigDiff) { bigDiff = d; big = s; }
    }
    return { games: scoped.length, goals, avg: scoped.length ? goals / scoped.length : 0, big };
  }, [scoped]);

  const by = (f: (p: PlayerAgg) => number) => [...pList].filter((p) => f(p) > 0).sort((a, b) => f(b) - f(a));
  const ratingRank = [...pList].filter((p) => p.ratingCount >= 3).sort((a, b) => (avgRating(b) ?? 0) - (avgRating(a) ?? 0));

  const teamRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const v = (a: TeamAgg) => teamSort === "pct" ? (a.played ? (a.wins * 3 + a.draws) / (a.played * 3) : 0) : teamSort === "sg" ? a.goalsFor - a.goalsAgainst : (a[teamSort] as number);
    return [...teamAgg.values()]
      .filter((a) => teamsById.has(a.teamId) && (!q || teamsById.get(a.teamId)!.name.toLowerCase().includes(q)))
      .sort((a, b) => v(b) - v(a) || b.played - a.played);
  }, [teamAgg, teamsById, search, teamSort]);

  const selectedTeam = tmFilter ? teamsById.get(tmFilter) : undefined;
  const roster = useMemo(() => {
    const rows = teamRoster(selectedTeam, players, playerAgg);
    const v = (p: PlayerAgg): number | string => pSort === "name" ? p.name : pSort === "rating" ? avgRating(p) ?? -1 : p[pSort];
    return rows.sort((a, b) => { const x = v(a), y = v(b); return typeof x === "string" ? x.localeCompare(y as string) : (y as number) - x; });
  }, [selectedTeam, players, playerAgg, pSort]);

  const campaigns = useMemo(() => {
    if (!tmFilter) return [];
    const map = new Map<string, { name: string; year: number; j: number; v: number; e: number; d: number; gp: number; gc: number }>();
    for (const s of scoped) {
      const k = `${s.tournamentId}:${s.year}`;
      const r = map.get(k) || { name: s.tournamentName, year: s.year, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0 };
      const home = s.match.homeTeamId === tmFilter;
      const f = home ? s.match.homeScore : s.match.awayScore; const c = home ? s.match.awayScore : s.match.homeScore;
      r.j++; r.gp += f; r.gc += c; if (f > c) r.v++; else if (f < c) r.d++; else r.e++;
      map.set(k, r);
    }
    return [...map.values()].sort((a, b) => b.year - a.year);
  }, [scoped, tmFilter]);

  const th = "px-2 py-2 text-right font-medium cursor-pointer select-none hover:text-foreground";
  const sortedTournaments = [...tournaments].sort((a, b) => a.name.localeCompare(b.name));
  const sortedTeams = [...teams].filter((t) => !t.isArchived).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6 lg:p-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-primary"><BarChart3 className="h-5 w-5" /><span className="text-xs font-bold uppercase tracking-widest">Histórico</span></div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">Estatísticas</h1>
          <p className="mt-1 text-sm text-muted-foreground">Números de todos os tempos, por competição e por time.</p>
        </div>
        <ScreenshotButton targetRef={ref} filename="estatisticas" />
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        <Select value={tid} onValueChange={setTid}>
          <SelectTrigger><SelectValue placeholder="Competição" /></SelectTrigger>
          <SelectContent><SelectItem value={ALL}>Todas as competições</SelectItem>{sortedTournaments.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={teamId} onValueChange={(v) => { setTeamId(v); if (v !== ALL) setTab("time"); }}>
          <SelectTrigger><SelectValue placeholder="Time" /></SelectTrigger>
          <SelectContent><SelectItem value={ALL}>Todos os times</SelectItem>{sortedTeams.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <div ref={ref} className="space-y-6">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[["Jogos", summary.games], ["Gols", summary.goals], ["Média de gols", summary.avg.toFixed(2)], ["Maior goleada", summary.big ? `${teamsById.get(summary.big.match.homeTeamId)?.abbreviation || "?"} ${summary.big.match.homeScore}×${summary.big.match.awayScore} ${teamsById.get(summary.big.match.awayTeamId)?.abbreviation || "?"}` : "—"]].map(([l, v]) => (
            <div key={l as string} className="rounded-xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">{l}</p><p className="mt-1 truncate text-xl font-bold tracking-tight text-foreground">{v}</p></div>
          ))}
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="geral">Geral</TabsTrigger>
            <TabsTrigger value="times">Por time</TabsTrigger>
            <TabsTrigger value="time" disabled={!tmFilter}>{selectedTeam?.name || "Time selecionado"}</TabsTrigger>
          </TabsList>

          <TabsContent value="geral" className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Ranking title="Artilheiros" rows={by((p) => p.goals)} value={(p) => String(p.goals)} teamsById={teamsById} />
            <Ranking title="Assistências" rows={by((p) => p.assists)} value={(p) => String(p.assists)} teamsById={teamsById} />
            <Ranking title="Nota média (mín. 3 jogos)" rows={ratingRank} value={(p) => fmt(avgRating(p))} teamsById={teamsById} />
            <Ranking title="Cartões" rows={by((p) => p.yellow + p.red * 2)} value={(p) => `${p.yellow}A ${p.red}V`} teamsById={teamsById} />
            <section className="rounded-xl border border-border bg-card p-4">
              <h3 className="mb-3 text-sm font-semibold tracking-tight text-foreground">Maiores campeões</h3>
              <ol className="space-y-1.5">
                {[...teamAgg.values()].filter((a) => a.titles > 0 && teamsById.has(a.teamId)).sort((a, b) => b.titles - a.titles).slice(0, 10).map((a, i) => (
                  <li key={a.teamId} className="flex items-center gap-2 text-sm"><span className="w-5 text-xs text-muted-foreground">{i + 1}</span><TeamLogo src={teamsById.get(a.teamId)?.logo} alt="" size={16} /><span className="flex-1 truncate">{teamsById.get(a.teamId)?.name}</span><span className="font-semibold tabular-nums">{a.titles}</span></li>
                ))}
              </ol>
            </section>
          </TabsContent>

          <TabsContent value="times" className="mt-4 space-y-3">
            <Input placeholder="Buscar time..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs text-muted-foreground"><tr>
                  <th className="px-3 py-2 text-left font-medium">Time</th>
                  {([["played", "J"], ["wins", "V"], ["draws", "E"], ["losses", "D"], ["goalsFor", "GP"], ["goalsAgainst", "GC"], ["sg", "SG"], ["pct", "%"], ["titles", "Títulos"]] as const).map(([k, l]) => (
                    <th key={k} className={`${th} ${teamSort === k ? "text-foreground" : ""}`} onClick={() => setTeamSort(k)}>{l}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {teamRows.map((a) => { const t = teamsById.get(a.teamId)!; return (
                    <tr key={a.teamId} className="cursor-pointer border-t border-border hover:bg-muted/30" onClick={() => { setTeamId(a.teamId); setTab("time"); }}>
                      <td className="px-3 py-2"><div className="flex items-center gap-2"><TeamLogo src={t.logo} alt="" size={16} /><span className="truncate">{t.name}</span></div></td>
                      {[a.played, a.wins, a.draws, a.losses, a.goalsFor, a.goalsAgainst, a.goalsFor - a.goalsAgainst, a.played ? Math.round(((a.wins * 3 + a.draws) / (a.played * 3)) * 100) : 0, a.titles].map((v, i) => <td key={i} className="px-2 py-2 text-right tabular-nums">{v}</td>)}
                    </tr>); })}
                </tbody>
              </table>
              {teamRows.length === 0 && <p className="p-4 text-sm text-muted-foreground">Nenhum jogo encontrado.</p>}
            </div>
          </TabsContent>

          <TabsContent value="time" className="mt-4 space-y-6">
            {selectedTeam && (<>
              <section>
                <h3 className="mb-2 text-sm font-semibold tracking-tight">Jogadores {tFilter ? "neste campeonato" : "em todos os campeonatos"}</h3>
                <div className="overflow-x-auto rounded-xl border border-border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40 text-xs text-muted-foreground"><tr>
                      <th className={`px-3 py-2 text-left font-medium cursor-pointer ${pSort === "name" ? "text-foreground" : ""}`} onClick={() => setPSort("name")}>Jogador</th>
                      {([["matches", "J"], ["goals", "Gols"], ["assists", "Assist."], ["yellow", "CA"], ["red", "CV"], ["rating", "Nota"]] as const).map(([k, l]) => <th key={k} className={`${th} ${pSort === k ? "text-foreground" : ""}`} onClick={() => setPSort(k)}>{l}</th>)}
                    </tr></thead>
                    <tbody>
                      {roster.map((p) => (
                        <tr key={p.playerId} className="border-t border-border">
                          <td className="px-3 py-2"><span className="mr-2 text-xs text-muted-foreground">{p.position || ""}</span>{p.name}</td>
                          {[p.matches, p.goals, p.assists, p.yellow, p.red].map((v, i) => <td key={i} className="px-2 py-2 text-right tabular-nums">{v}</td>)}
                          <td className="px-2 py-2 text-right tabular-nums">{fmt(avgRating(p))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {roster.length === 0 && <p className="p-4 text-sm text-muted-foreground">Nenhum jogador cadastrado.</p>}
                </div>
              </section>
              <section>
                <h3 className="mb-2 text-sm font-semibold tracking-tight">Campanhas</h3>
                <div className="overflow-x-auto rounded-xl border border-border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40 text-xs text-muted-foreground"><tr><th className="px-3 py-2 text-left font-medium">Competição</th>{["Ano", "J", "V", "E", "D", "GP", "GC"].map((l) => <th key={l} className="px-2 py-2 text-right font-medium">{l}</th>)}</tr></thead>
                    <tbody>{campaigns.map((c, i) => <tr key={i} className="border-t border-border"><td className="px-3 py-2">{c.name}</td>{[c.year || "—", c.j, c.v, c.e, c.d, c.gp, c.gc].map((v, j) => <td key={j} className="px-2 py-2 text-right tabular-nums">{v}</td>)}</tr>)}</tbody>
                  </table>
                  {campaigns.length === 0 && <p className="p-4 text-sm text-muted-foreground">Sem jogos registrados.</p>}
                </div>
              </section>
            </>)}
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
