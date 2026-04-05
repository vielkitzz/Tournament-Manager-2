import { useState, useMemo } from "react";
import { Shield, TrendingUp, TrendingDown, Minus, Swords, Users, BarChart3, Target, Award, Percent } from "lucide-react";
import { Team, Match } from "@/types/tournament";
import { StandingRow } from "@/lib/standings";
import { Dialog, DialogContent } from "@/components/ui/dialog";

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
  const [activeTab, setActiveTab] = useState<"overview" | "h2h" | "compare">("overview");
  const [h2hTeamId, setH2hTeamId] = useState<string | null>(null);
  const [compareTeamIds, setCompareTeamIds] = useState<string[]>([]);

  const teamId = team?.id;

  const teamMatches = useMemo(() => {
    if (!teamId) return [];
    return matches.filter((m) => m.played && (m.homeTeamId === teamId || m.awayTeamId === teamId));
  }, [matches, teamId]);

  const wins = useMemo(() => {
    if (!teamId) return [];
    return teamMatches.filter((m) => {
      const isHome = m.homeTeamId === teamId;
      return isHome ? m.homeScore > m.awayScore : m.awayScore > m.homeScore;
    });
  }, [teamMatches, teamId]);

  const draws = useMemo(() => teamMatches.filter((m) => m.homeScore === m.awayScore), [teamMatches]);

  const losses = useMemo(() => {
    if (!teamId) return [];
    return teamMatches.filter((m) => {
      const isHome = m.homeTeamId === teamId;
      return isHome ? m.homeScore < m.awayScore : m.awayScore < m.homeScore;
    });
  }, [teamMatches, teamId]);

  const opponents = useMemo(() => {
    if (!teamId) return [];
    const oppIds = new Set<string>();
    teamMatches.forEach((m) => {
      oppIds.add(m.homeTeamId === teamId ? m.awayTeamId : m.homeTeamId);
    });
    return Array.from(oppIds).map((id) => allTeams.find((t) => t.id === id)).filter(Boolean) as Team[];
  }, [teamMatches, teamId, allTeams]);

  const h2hData = useMemo(() => {
    if (!h2hTeamId || !teamId) return null;
    const h2hMatches = teamMatches.filter(
      (m) => m.homeTeamId === h2hTeamId || m.awayTeamId === h2hTeamId
    );
    let w = 0, d = 0, l = 0, gf = 0, ga = 0;
    h2hMatches.forEach((m) => {
      const isHome = m.homeTeamId === teamId;
      const tg = isHome ? m.homeScore : m.awayScore;
      const og = isHome ? m.awayScore : m.homeScore;
      gf += tg; ga += og;
      if (tg > og) w++; else if (tg === og) d++; else l++;
    });
    return { matches: h2hMatches, wins: w, draws: d, losses: l, goalsFor: gf, goalsAgainst: ga };
  }, [h2hTeamId, teamMatches, teamId]);

  const compareData = useMemo(() => {
    if (compareTeamIds.length === 0) return [];
    const emptyStanding: StandingRow = { teamId: "", played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0 };
    return compareTeamIds.map((cid) => ({
      team: allTeams.find((t) => t.id === cid),
      standing: allStandings.find((s) => s.teamId === cid) || { ...emptyStanding, teamId: cid },
    })).filter((c) => c.team) as { team: Team; standing: StandingRow }[];
  }, [compareTeamIds, allStandings, allTeams]);

  if (!team || !standing) return null;

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
    const tg = isHome ? m.homeScore : m.awayScore;
    const og = isHome ? m.awayScore : m.homeScore;
    if (tg > og) return "W";
    if (tg < og) return "L";
    return "D";
  };

  const winRate = standing.played > 0 ? (standing.wins / standing.played) * 100 : 0;
  const maxPoints = standing.played * 3;
  const pointsRate = maxPoints > 0 ? (standing.points / maxPoints) * 100 : 0;
  const recentForm = teamMatches.slice(-5).map(getResult);
  const h2hTeam = h2hTeamId ? allTeams.find((t) => t.id === h2hTeamId) : null;
  const position = allStandings.findIndex((s) => s.teamId === team.id) + 1;

  const toggleCompareTeam = (tid: string) => {
    setCompareTeamIds((prev) =>
      prev.includes(tid) ? prev.filter((id) => id !== tid) : [...prev, tid]
    );
  };

  const teamColors = team.colors || [];
  const primaryColor = teamColors[0] || "hsl(var(--primary))";

  const tabs = [
    { id: "overview" as const, label: "Visão Geral", icon: BarChart3 },
    { id: "h2h" as const, label: "H2H", icon: Swords },
    { id: "compare" as const, label: "Comparar", icon: Users },
  ];

  const StatBar = ({ value, max, color = "bg-primary" }: { value: number; max: number; color?: string }) => {
    const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
    return (
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
      </div>
    );
  };

  const renderMatchResult = (m: Match) => {
    const opp = getOpponent(m);
    const result = getResult(m);
    const resultColor = result === "W" ? "bg-emerald-500" : result === "D" ? "bg-amber-500" : "bg-destructive";
    const resultLabel = result === "W" ? "V" : result === "D" ? "E" : "D";
    return (
      <div key={m.id} className="flex items-center gap-2 py-1.5 px-2 rounded-lg bg-muted/30">
        <div className={`w-5 h-5 rounded ${resultColor} text-white text-[10px] font-bold flex items-center justify-center shrink-0`}>
          {resultLabel}
        </div>
        <div className="w-5 h-5 shrink-0 flex items-center justify-center">
          {opp?.logo ? <img src={opp.logo} alt="" className="w-5 h-5 object-contain" /> : <Shield className="w-3.5 h-3.5 text-muted-foreground" />}
        </div>
        <span className="text-xs text-foreground truncate flex-1">{opp?.shortName || opp?.name || "—"}</span>
        <span className="text-xs font-mono font-bold text-foreground">{getScore(m)}</span>
        <span className="text-[9px] text-muted-foreground">
          {m.homeTeamId === team.id ? "C" : "F"}
        </span>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md p-0 gap-0 overflow-hidden rounded-2xl border-0 shadow-2xl">
        {/* Hero Header */}
        <div
          className="relative px-5 pt-5 pb-4"
          style={{
            background: `linear-gradient(135deg, ${primaryColor}22 0%, transparent 60%)`,
          }}
        >
          <div className="flex items-start gap-3">
            <div className="w-14 h-14 rounded-2xl bg-background/80 backdrop-blur border border-border/50 flex items-center justify-center shrink-0 shadow-sm">
              {team.logo ? (
                <img src={team.logo} alt="" className="w-11 h-11 object-contain" />
              ) : (
                <Shield className="w-7 h-7 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              <h2 className="text-lg font-bold text-foreground truncate leading-tight">{team.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                {position > 0 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-primary/10 text-primary">
                    {position}º
                  </span>
                )}
                <span className="text-xs text-muted-foreground">
                  {standing.points} pts • {standing.played} jogos
                </span>
              </div>
            </div>
          </div>

          {/* Recent form */}
          {recentForm.length > 0 && (
            <div className="flex items-center gap-1 mt-3">
              <span className="text-[10px] text-muted-foreground mr-1">Forma:</span>
              {recentForm.map((r, i) => (
                <div
                  key={i}
                  className={`w-5 h-5 rounded-md text-[10px] font-bold flex items-center justify-center text-white ${
                    r === "W" ? "bg-emerald-500" : r === "D" ? "bg-amber-500" : "bg-destructive"
                  }`}
                >
                  {r === "W" ? "V" : r === "D" ? "E" : "D"}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors relative ${
                activeTab === tab.id
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-primary rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-4 max-h-[55vh] overflow-y-auto">
          {/* Overview Tab */}
          {activeTab === "overview" && (
            <div className="space-y-4">
              {/* Key stats grid */}
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { label: "V", value: standing.wins, color: "text-emerald-500" },
                  { label: "E", value: standing.draws, color: "text-amber-500" },
                  { label: "D", value: standing.losses, color: "text-destructive" },
                  { label: "SG", value: standing.goalDifference, color: standing.goalDifference > 0 ? "text-emerald-500" : standing.goalDifference < 0 ? "text-destructive" : "text-muted-foreground", prefix: standing.goalDifference > 0 ? "+" : "" },
                ].map((s) => (
                  <div key={s.label} className="text-center py-2.5 rounded-xl bg-muted/30">
                    <p className={`text-lg font-bold ${s.color}`}>{(s as any).prefix || ""}{s.value}</p>
                    <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-medium">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Performance bars */}
              <div className="space-y-3 px-1">
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Percent className="w-3 h-3" /> Aproveitamento
                    </span>
                    <span className="font-bold text-primary">{pointsRate.toFixed(0)}%</span>
                  </div>
                  <StatBar value={pointsRate} max={100} />
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Award className="w-3 h-3" /> Vitórias
                    </span>
                    <span className="font-bold text-emerald-500">{winRate.toFixed(0)}%</span>
                  </div>
                  <StatBar value={winRate} max={100} color="bg-emerald-500" />
                </div>
              </div>

              {/* Goals */}
              <div className="flex gap-1.5">
                <div className="flex-1 text-center py-2 rounded-xl bg-muted/30">
                  <div className="flex items-center justify-center gap-1">
                    <Target className="w-3 h-3 text-emerald-500" />
                    <span className="text-sm font-bold text-foreground">{standing.goalsFor}</span>
                  </div>
                  <p className="text-[9px] text-muted-foreground uppercase mt-0.5">Gols Pró</p>
                </div>
                <div className="flex-1 text-center py-2 rounded-xl bg-muted/30">
                  <div className="flex items-center justify-center gap-1">
                    <Target className="w-3 h-3 text-destructive" />
                    <span className="text-sm font-bold text-foreground">{standing.goalsAgainst}</span>
                  </div>
                  <p className="text-[9px] text-muted-foreground uppercase mt-0.5">Gols Contra</p>
                </div>
                <div className="flex-1 text-center py-2 rounded-xl bg-muted/30">
                  <span className="text-sm font-bold text-foreground">
                    {standing.played > 0 ? (standing.goalsFor / standing.played).toFixed(1) : "0.0"}
                  </span>
                  <p className="text-[9px] text-muted-foreground uppercase mt-0.5">Média/Jogo</p>
                </div>
              </div>

              {/* Match history by category */}
              <div className="space-y-1.5">
                {[
                  { label: "Vitórias", list: wins, icon: TrendingUp, color: "text-emerald-500" },
                  { label: "Empates", list: draws, icon: Minus, color: "text-amber-500" },
                  { label: "Derrotas", list: losses, icon: TrendingDown, color: "text-destructive" },
                ].map(({ label, list, icon: Icon, color }) => (
                  <details key={label} className="group">
                    <summary className={`flex items-center gap-2 cursor-pointer text-xs font-semibold ${color} py-1.5 px-1`}>
                      <Icon className="w-3.5 h-3.5" />
                      <span>{label} ({list.length})</span>
                    </summary>
                    <div className="mt-1 space-y-0.5 max-h-32 overflow-y-auto">
                      {list.length === 0
                        ? <p className="text-xs text-muted-foreground italic px-2 py-2">Nenhuma</p>
                        : list.map(renderMatchResult)}
                    </div>
                  </details>
                ))}
              </div>
            </div>
          )}

          {/* H2H Tab */}
          {activeTab === "h2h" && (
            <div className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground mb-2">Selecione um adversário:</p>
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                  {opponents.map((opp) => (
                    <button
                      key={opp.id}
                      onClick={() => setH2hTeamId(opp.id)}
                      className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs border transition-all ${
                        h2hTeamId === opp.id
                          ? "border-primary bg-primary/10 text-primary shadow-sm"
                          : "border-border bg-muted/20 text-foreground hover:border-primary/40"
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
                  {/* VS header */}
                  <div className="flex items-center justify-center gap-5 py-3">
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-10 h-10 rounded-xl bg-muted/30 flex items-center justify-center">
                        {team.logo ? <img src={team.logo} alt="" className="w-8 h-8 object-contain" /> : <Shield className="w-5 h-5 text-muted-foreground" />}
                      </div>
                      <span className="text-[10px] font-bold text-foreground">{team.shortName || team.abbreviation}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold text-emerald-500">{h2hData.wins}</span>
                      <span className="text-lg text-muted-foreground">-</span>
                      <span className="text-sm font-bold text-amber-500">{h2hData.draws}</span>
                      <span className="text-lg text-muted-foreground">-</span>
                      <span className="text-2xl font-bold text-destructive">{h2hData.losses}</span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-10 h-10 rounded-xl bg-muted/30 flex items-center justify-center">
                        {h2hTeam.logo ? <img src={h2hTeam.logo} alt="" className="w-8 h-8 object-contain" /> : <Shield className="w-5 h-5 text-muted-foreground" />}
                      </div>
                      <span className="text-[10px] font-bold text-foreground">{h2hTeam.shortName || h2hTeam.abbreviation}</span>
                    </div>
                  </div>

                  {/* H2H Stats */}
                  <div className="flex gap-1.5">
                    <div className="flex-1 text-center py-2 rounded-xl bg-muted/30">
                      <p className="text-sm font-bold text-foreground">{h2hData.goalsFor}</p>
                      <p className="text-[9px] text-muted-foreground uppercase">Gols</p>
                    </div>
                    <div className="flex-1 text-center py-2 rounded-xl bg-muted/30">
                      <p className="text-sm font-bold text-foreground">{h2hData.goalsAgainst}</p>
                      <p className="text-[9px] text-muted-foreground uppercase">Sofridos</p>
                    </div>
                    <div className="flex-1 text-center py-2 rounded-xl bg-muted/30">
                      <p className="text-sm font-bold text-foreground">{h2hData.matches.length}</p>
                      <p className="text-[9px] text-muted-foreground uppercase">Jogos</p>
                    </div>
                  </div>

                  {/* Match list */}
                  <div className="space-y-0.5 max-h-36 overflow-y-auto">
                    {h2hData.matches.map(renderMatchResult)}
                  </div>
                </div>
              )}

              {!h2hTeamId && opponents.length === 0 && (
                <p className="text-xs text-muted-foreground italic text-center py-6">Nenhum jogo disputado ainda</p>
              )}
            </div>
          )}

          {/* Compare Tab */}
          {activeTab === "compare" && (
            <div className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground mb-2">Selecione times para comparar:</p>
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                  {allTeams.filter((t) => t.id !== team.id).map((t) => {
                    const isSelected = compareTeamIds.includes(t.id);
                    return (
                      <button
                        key={t.id}
                        onClick={() => toggleCompareTeam(t.id)}
                        className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs border transition-all ${
                          isSelected
                            ? "border-primary bg-primary/10 text-primary shadow-sm"
                            : "border-border bg-muted/20 text-foreground hover:border-primary/40"
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
                <div className="overflow-x-auto rounded-xl border border-border">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-muted/30 text-muted-foreground">
                        <th className="text-left py-2 px-2.5 font-medium">Time</th>
                        <th className="text-center py-2 px-1 font-medium">P</th>
                        <th className="text-center py-2 px-1 font-medium">J</th>
                        <th className="text-center py-2 px-1 font-medium">V</th>
                        <th className="text-center py-2 px-1 font-medium">E</th>
                        <th className="text-center py-2 px-1 font-medium">D</th>
                        <th className="text-center py-2 px-1 font-medium">GP</th>
                        <th className="text-center py-2 px-1 font-medium">GC</th>
                        <th className="text-center py-2 px-1 font-medium">SG</th>
                        <th className="text-center py-2 px-1 font-medium">%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[{ team, standing }, ...compareData].map(({ team: ct, standing: cs }) => {
                        if (!ct || !cs) return null;
                        const isMain = ct.id === team.id;
                        const rate = cs.played > 0 ? ((cs.points / (cs.played * 3)) * 100).toFixed(0) : "0";
                        return (
                          <tr key={ct.id} className={`border-t border-border/50 ${isMain ? "bg-primary/5" : ""}`}>
                            <td className="py-2 px-2.5">
                              <div className="flex items-center gap-1.5">
                                <div className="w-4 h-4 shrink-0 flex items-center justify-center">
                                  {ct.logo ? <img src={ct.logo} alt="" className="w-4 h-4 object-contain" /> : <Shield className="w-3 h-3 text-muted-foreground" />}
                                </div>
                                <span className={`truncate text-foreground ${isMain ? "font-bold" : ""}`}>{ct.shortName || ct.name}</span>
                              </div>
                            </td>
                            <td className="text-center py-2 px-1 font-bold text-foreground">{cs.points}</td>
                            <td className="text-center py-2 px-1 text-muted-foreground">{cs.played}</td>
                            <td className="text-center py-2 px-1 text-emerald-500 font-medium">{cs.wins}</td>
                            <td className="text-center py-2 px-1 text-amber-500 font-medium">{cs.draws}</td>
                            <td className="text-center py-2 px-1 text-destructive font-medium">{cs.losses}</td>
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
                <p className="text-xs text-muted-foreground italic text-center py-4">Selecione times acima para comparar</p>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
