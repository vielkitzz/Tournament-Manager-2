import { useState, useMemo } from "react";
import { Shield, Trophy, TrendingUp, TrendingDown, Minus, Swords, Users, BarChart3 } from "lucide-react";
import { Team, Match } from "@/types/tournament";
import { StandingRow } from "@/lib/standings";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface TeamStatsPopupProps {
  open: boolean;
  onClose: () => void;
  team: Team | undefined;
  standing: StandingRow | undefined;
  matches: Match[];
  allTeams: Team[];
  allStandings?: StandingRow[];
}

export default function TeamStatsPopup({ open, onClose, team, standing, matches, allTeams, allStandings = [] }: TeamStatsPopupProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [h2hTeamId, setH2hTeamId] = useState<string | null>(null);
  const [compareTeamIds, setCompareTeamIds] = useState<string[]>([]);

  if (!team || !standing) return null;

  const teamMatches = matches.filter(
    (m) => m.played && (m.homeTeamId === team.id || m.awayTeamId === team.id)
  );

  const wins = teamMatches.filter((m) => {
    const isHome = m.homeTeamId === team.id;
    return isHome ? m.homeScore > m.awayScore : m.awayScore > m.homeScore;
  });

  const draws = teamMatches.filter((m) => m.homeScore === m.awayScore);

  const losses = teamMatches.filter((m) => {
    const isHome = m.homeTeamId === team.id;
    return isHome ? m.homeScore < m.awayScore : m.awayScore < m.homeScore;
  });

  const getOpponent = (m: Match) => {
    const oppId = m.homeTeamId === team.id ? m.awayTeamId : m.homeTeamId;
    return allTeams.find((t) => t.id === oppId);
  };

  const getScore = (m: Match) => {
    const isHome = m.homeTeamId === team.id;
    return isHome ? `${m.homeScore}–${m.awayScore}` : `${m.awayScore}–${m.homeScore}`;
  };

  const getResult = (m: Match) => {
    const isHome = m.homeTeamId === team.id;
    const teamGoals = isHome ? m.homeScore : m.awayScore;
    const oppGoals = isHome ? m.awayScore : m.homeScore;
    if (teamGoals > oppGoals) return "W";
    if (teamGoals < oppGoals) return "L";
    return "D";
  };

  const winRate = standing.played > 0 ? ((standing.wins / standing.played) * 100) : 0;
  const maxPoints = standing.played * 3;
  const pointsRate = maxPoints > 0 ? ((standing.points / maxPoints) * 100) : 0;

  // Form: last 5 matches
  const recentForm = teamMatches.slice(-5).map(getResult);

  // Opponents played against (for H2H selection)
  const opponents = useMemo(() => {
    const oppIds = new Set<string>();
    teamMatches.forEach((m) => {
      oppIds.add(m.homeTeamId === team.id ? m.awayTeamId : m.homeTeamId);
    });
    return Array.from(oppIds).map((id) => allTeams.find((t) => t.id === id)).filter(Boolean) as Team[];
  }, [teamMatches, team.id, allTeams]);

  // H2H data
  const h2hData = useMemo(() => {
    if (!h2hTeamId) return null;
    const h2hMatches = teamMatches.filter(
      (m) => m.homeTeamId === h2hTeamId || m.awayTeamId === h2hTeamId
    );
    let w = 0, d = 0, l = 0, gf = 0, ga = 0;
    h2hMatches.forEach((m) => {
      const isHome = m.homeTeamId === team.id;
      const tg = isHome ? m.homeScore : m.awayScore;
      const og = isHome ? m.awayScore : m.homeScore;
      gf += tg;
      ga += og;
      if (tg > og) w++;
      else if (tg === og) d++;
      else l++;
    });
    return { matches: h2hMatches, wins: w, draws: d, losses: l, goalsFor: gf, goalsAgainst: ga };
  }, [h2hTeamId, teamMatches, team.id]);

  const h2hTeam = h2hTeamId ? allTeams.find((t) => t.id === h2hTeamId) : null;

  // Compare data
  const compareData = useMemo(() => {
    if (compareTeamIds.length === 0) return [];
    return compareTeamIds.map((cid) => {
      const cStanding = allStandings.find((s) => s.teamId === cid);
      const cTeam = allTeams.find((t) => t.id === cid);
      return { team: cTeam, standing: cStanding };
    }).filter((c) => c.team && c.standing);
  }, [compareTeamIds, allStandings, allTeams]);

  const toggleCompareTeam = (tid: string) => {
    setCompareTeamIds((prev) =>
      prev.includes(tid) ? prev.filter((id) => id !== tid) : prev.length < 3 ? [...prev, tid] : prev
    );
  };

  const renderMatchList = (list: Match[], emptyMsg: string) => {
    if (list.length === 0) return <p className="text-xs text-muted-foreground italic">{emptyMsg}</p>;
    return (
      <div className="space-y-1 max-h-32 overflow-y-auto">
        {list.map((m) => {
          const opp = getOpponent(m);
          return (
            <div key={m.id} className="flex items-center gap-2 text-xs py-1.5 px-2.5 rounded-lg bg-secondary/30 border border-border/50">
              <div className="w-4 h-4 shrink-0 flex items-center justify-center">
                {opp?.logo ? <img src={opp.logo} alt="" className="w-4 h-4 object-contain" /> : <Shield className="w-3 h-3 text-muted-foreground" />}
              </div>
              <span className="text-foreground truncate flex-1">{opp?.shortName || opp?.name || "—"}</span>
              <span className="font-mono font-bold text-foreground shrink-0">{getScore(m)}</span>
              <span className="text-[10px] text-muted-foreground shrink-0">
                {m.homeTeamId === team.id ? "(C)" : "(F)"}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  const position = allStandings.findIndex((s) => s.teamId === team.id) + 1;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden">
        {/* Header */}
        <div className="bg-secondary/40 border-b border-border px-5 py-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-background/80 border border-border flex items-center justify-center shrink-0">
                {team.logo ? (
                  <img src={team.logo} alt="" className="w-10 h-10 object-contain" />
                ) : (
                  <Shield className="w-6 h-6 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-base font-bold text-foreground truncate">{team.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {team.shortName && <span className="text-xs text-muted-foreground">{team.shortName}</span>}
                  {position > 0 && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      {position}º lugar
                    </Badge>
                  )}
                </div>
              </div>
              {/* Form */}
              <div className="flex gap-0.5 shrink-0">
                {recentForm.map((r, i) => (
                  <div
                    key={i}
                    className={`w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center ${
                      r === "W" ? "bg-emerald-500/20 text-emerald-500" :
                      r === "D" ? "bg-amber-500/20 text-amber-500" :
                      "bg-destructive/20 text-destructive"
                    }`}
                  >
                    {r === "W" ? "V" : r === "D" ? "E" : "D"}
                  </div>
                ))}
              </div>
            </DialogTitle>
          </DialogHeader>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <div className="border-b border-border px-4">
            <TabsList className="bg-transparent h-9 p-0 gap-0">
              <TabsTrigger value="overview" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none text-xs px-3 h-9">
                <BarChart3 className="w-3.5 h-3.5 mr-1" /> Visão Geral
              </TabsTrigger>
              <TabsTrigger value="h2h" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none text-xs px-3 h-9">
                <Swords className="w-3.5 h-3.5 mr-1" /> H2H
              </TabsTrigger>
              <TabsTrigger value="compare" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none text-xs px-3 h-9">
                <Users className="w-3.5 h-3.5 mr-1" /> Comparar
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="p-4 max-h-[60vh] overflow-y-auto">
            {/* Overview Tab */}
            <TabsContent value="overview" className="mt-0 space-y-4">
              {/* Stats grid */}
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: "Pts", value: standing.points, color: "text-primary" },
                  { label: "V", value: standing.wins, color: "text-emerald-500" },
                  { label: "E", value: standing.draws, color: "text-amber-500" },
                  { label: "D", value: standing.losses, color: "text-destructive" },
                ].map((s) => (
                  <div key={s.label} className="text-center p-2.5 rounded-xl bg-secondary/40 border border-border">
                    <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Progress bars */}
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Aproveitamento</span>
                    <span className="font-bold text-primary">{pointsRate.toFixed(0)}%</span>
                  </div>
                  <Progress value={pointsRate} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Taxa de Vitórias</span>
                    <span className="font-bold text-emerald-500">{winRate.toFixed(0)}%</span>
                  </div>
                  <Progress value={winRate} className="h-2" />
                </div>
              </div>

              {/* Extra stats */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Jogos", value: standing.played },
                  { label: "GP", value: standing.goalsFor },
                  { label: "GC", value: standing.goalsAgainst },
                ].map((s) => (
                  <div key={s.label} className="text-center p-2 rounded-xl bg-secondary/40 border border-border">
                    <p className="text-sm font-bold text-foreground">{s.value}</p>
                    <p className="text-[10px] text-muted-foreground uppercase">{s.label}</p>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between px-1 py-1">
                <span className="text-xs text-muted-foreground">Saldo de gols</span>
                <span className={`text-sm font-bold ${standing.goalDifference > 0 ? "text-emerald-500" : standing.goalDifference < 0 ? "text-destructive" : "text-muted-foreground"}`}>
                  {standing.goalDifference > 0 ? `+${standing.goalDifference}` : standing.goalDifference}
                </span>
              </div>

              {/* Match breakdown */}
              <div className="space-y-2">
                <details className="group">
                  <summary className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-emerald-500 hover:text-emerald-400 py-1">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>Vitórias ({wins.length})</span>
                  </summary>
                  <div className="mt-1.5">{renderMatchList(wins, "Nenhuma vitória")}</div>
                </details>
                <details className="group">
                  <summary className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-amber-500 hover:text-amber-400 py-1">
                    <Minus className="w-3.5 h-3.5" />
                    <span>Empates ({draws.length})</span>
                  </summary>
                  <div className="mt-1.5">{renderMatchList(draws, "Nenhum empate")}</div>
                </details>
                <details className="group">
                  <summary className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-destructive hover:text-destructive/80 py-1">
                    <TrendingDown className="w-3.5 h-3.5" />
                    <span>Derrotas ({losses.length})</span>
                  </summary>
                  <div className="mt-1.5">{renderMatchList(losses, "Nenhuma derrota")}</div>
                </details>
              </div>
            </TabsContent>

            {/* H2H Tab */}
            <TabsContent value="h2h" className="mt-0 space-y-4">
              <div>
                <p className="text-xs text-muted-foreground mb-2">Selecione um adversário:</p>
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                  {opponents.map((opp) => (
                    <button
                      key={opp.id}
                      onClick={() => setH2hTeamId(opp.id)}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border transition-colors ${
                        h2hTeamId === opp.id
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-secondary/30 text-foreground hover:border-primary/40"
                      }`}
                    >
                      <div className="w-4 h-4 shrink-0 flex items-center justify-center">
                        {opp.logo ? <img src={opp.logo} alt="" className="w-4 h-4 object-contain" /> : <Shield className="w-3 h-3 text-muted-foreground" />}
                      </div>
                      {opp.shortName || opp.name}
                    </button>
                  ))}
                </div>
              </div>

              {h2hData && h2hTeam && (
                <div className="space-y-3">
                  {/* H2H header */}
                  <div className="flex items-center justify-center gap-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 flex items-center justify-center">
                        {team.logo ? <img src={team.logo} alt="" className="w-8 h-8 object-contain" /> : <Shield className="w-5 h-5 text-muted-foreground" />}
                      </div>
                      <span className="text-xs font-bold text-foreground">{team.shortName || team.name}</span>
                    </div>
                    <Swords className="w-4 h-4 text-muted-foreground" />
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-foreground">{h2hTeam.shortName || h2hTeam.name}</span>
                      <div className="w-8 h-8 flex items-center justify-center">
                        {h2hTeam.logo ? <img src={h2hTeam.logo} alt="" className="w-8 h-8 object-contain" /> : <Shield className="w-5 h-5 text-muted-foreground" />}
                      </div>
                    </div>
                  </div>

                  {/* H2H stats */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="text-center p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                      <p className="text-xl font-bold text-emerald-500">{h2hData.wins}</p>
                      <p className="text-[10px] text-muted-foreground uppercase">Vitórias</p>
                    </div>
                    <div className="text-center p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                      <p className="text-xl font-bold text-amber-500">{h2hData.draws}</p>
                      <p className="text-[10px] text-muted-foreground uppercase">Empates</p>
                    </div>
                    <div className="text-center p-2.5 rounded-xl bg-destructive/10 border border-destructive/20">
                      <p className="text-xl font-bold text-destructive">{h2hData.losses}</p>
                      <p className="text-[10px] text-muted-foreground uppercase">Derrotas</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between px-2 text-xs">
                    <span className="text-muted-foreground">Gols</span>
                    <span className="font-bold text-foreground">{h2hData.goalsFor} – {h2hData.goalsAgainst}</span>
                  </div>

                  {/* H2H matches */}
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground mb-1">Confrontos</p>
                    {renderMatchList(h2hData.matches, "Nenhum confronto")}
                  </div>
                </div>
              )}

              {!h2hTeamId && opponents.length === 0 && (
                <p className="text-xs text-muted-foreground italic text-center py-6">Nenhum jogo disputado ainda</p>
              )}
            </TabsContent>

            {/* Compare Tab */}
            <TabsContent value="compare" className="mt-0 space-y-4">
              <div>
                <p className="text-xs text-muted-foreground mb-2">Selecione até 3 times para comparar:</p>
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                  {allStandings.filter((s) => s.teamId !== team.id).map((s) => {
                    const t = s.team;
                    if (!t) return null;
                    const isSelected = compareTeamIds.includes(s.teamId);
                    return (
                      <button
                        key={s.teamId}
                        onClick={() => toggleCompareTeam(s.teamId)}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border transition-colors ${
                          isSelected
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-secondary/30 text-foreground hover:border-primary/40"
                        }`}
                      >
                        <div className="w-4 h-4 shrink-0 flex items-center justify-center">
                          {t.logo ? <img src={t.logo} alt="" className="w-4 h-4 object-contain" /> : <Shield className="w-3 h-3 text-muted-foreground" />}
                        </div>
                        {t.shortName || t.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {compareData.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground">
                        <th className="text-left py-2 px-2">Time</th>
                        <th className="text-center py-2 px-1">P</th>
                        <th className="text-center py-2 px-1">J</th>
                        <th className="text-center py-2 px-1">V</th>
                        <th className="text-center py-2 px-1">E</th>
                        <th className="text-center py-2 px-1">D</th>
                        <th className="text-center py-2 px-1">GP</th>
                        <th className="text-center py-2 px-1">GC</th>
                        <th className="text-center py-2 px-1">SG</th>
                        <th className="text-center py-2 px-1">%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[{ team, standing }, ...compareData].map(({ team: ct, standing: cs }) => {
                        if (!ct || !cs) return null;
                        const isMain = ct.id === team.id;
                        const rate = cs.played > 0 ? ((cs.points / (cs.played * 3)) * 100).toFixed(0) : "0";
                        return (
                          <tr key={ct.id} className={`border-b border-border/50 ${isMain ? "bg-primary/5 font-semibold" : ""}`}>
                            <td className="py-2 px-2">
                              <div className="flex items-center gap-1.5">
                                <div className="w-4 h-4 shrink-0 flex items-center justify-center">
                                  {ct.logo ? <img src={ct.logo} alt="" className="w-4 h-4 object-contain" /> : <Shield className="w-3 h-3 text-muted-foreground" />}
                                </div>
                                <span className="truncate text-foreground">{ct.shortName || ct.name}</span>
                              </div>
                            </td>
                            <td className="text-center py-2 px-1 font-bold text-foreground">{cs.points}</td>
                            <td className="text-center py-2 px-1 text-muted-foreground">{cs.played}</td>
                            <td className="text-center py-2 px-1 text-muted-foreground">{cs.wins}</td>
                            <td className="text-center py-2 px-1 text-muted-foreground">{cs.draws}</td>
                            <td className="text-center py-2 px-1 text-muted-foreground">{cs.losses}</td>
                            <td className="text-center py-2 px-1 text-muted-foreground">{cs.goalsFor}</td>
                            <td className="text-center py-2 px-1 text-muted-foreground">{cs.goalsAgainst}</td>
                            <td className="text-center py-2 px-1 text-muted-foreground">
                              {cs.goalDifference > 0 ? `+${cs.goalDifference}` : cs.goalDifference}
                            </td>
                            <td className="text-center py-2 px-1 text-primary font-bold">{rate}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {compareTeamIds.length === 0 && (
                <p className="text-xs text-muted-foreground italic text-center py-4">Selecione times acima para comparar estatísticas</p>
              )}
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
