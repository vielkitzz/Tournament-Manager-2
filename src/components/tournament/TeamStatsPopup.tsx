import { Shield, X, Trophy, Swords } from "lucide-react";
import { Team, Match } from "@/types/tournament";
import { StandingRow } from "@/lib/standings";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface TeamStatsPopupProps {
  open: boolean;
  onClose: () => void;
  team: Team | undefined;
  standing: StandingRow | undefined;
  matches: Match[];
  allTeams: Team[];
}

export default function TeamStatsPopup({ open, onClose, team, standing, matches, allTeams }: TeamStatsPopupProps) {
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

  const renderMatchList = (list: Match[], emptyMsg: string) => {
    if (list.length === 0) return <p className="text-xs text-muted-foreground italic">{emptyMsg}</p>;
    return (
      <div className="space-y-1 max-h-32 overflow-y-auto">
        {list.map((m) => {
          const opp = getOpponent(m);
          return (
            <div key={m.id} className="flex items-center gap-2 text-xs py-1 px-2 rounded-md bg-secondary/30">
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

  const winRate = standing.played > 0 ? ((standing.wins / standing.played) * 100).toFixed(0) : "0";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-secondary/60 flex items-center justify-center shrink-0">
              {team.logo ? (
                <img src={team.logo} alt="" className="w-8 h-8 object-contain" />
              ) : (
                <Shield className="w-5 h-5 text-muted-foreground" />
              )}
            </div>
            <div>
              <p className="text-base font-bold text-foreground">{team.name}</p>
              {team.shortName && <p className="text-xs text-muted-foreground font-normal">{team.shortName}</p>}
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Stats grid */}
        <div className="grid grid-cols-4 gap-2 mt-2">
          {[
            { label: "Pts", value: standing.points, color: "text-primary" },
            { label: "V", value: standing.wins, color: "text-emerald-400" },
            { label: "E", value: standing.draws, color: "text-amber-400" },
            { label: "D", value: standing.losses, color: "text-destructive" },
          ].map((s) => (
            <div key={s.label} className="text-center p-2 rounded-lg bg-secondary/40 border border-border">
              <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-muted-foreground uppercase">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Jogos", value: standing.played },
            { label: "GP", value: standing.goalsFor },
            { label: "GC", value: standing.goalsAgainst },
          ].map((s) => (
            <div key={s.label} className="text-center p-2 rounded-lg bg-secondary/40 border border-border">
              <p className="text-sm font-bold text-foreground">{s.value}</p>
              <p className="text-[10px] text-muted-foreground uppercase">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between px-1 py-1">
          <span className="text-xs text-muted-foreground">Saldo de gols</span>
          <span className={`text-sm font-bold ${standing.goalDifference > 0 ? "text-emerald-400" : standing.goalDifference < 0 ? "text-destructive" : "text-muted-foreground"}`}>
            {standing.goalDifference > 0 ? `+${standing.goalDifference}` : standing.goalDifference}
          </span>
        </div>
        <div className="flex items-center justify-between px-1 py-1">
          <span className="text-xs text-muted-foreground">Aproveitamento</span>
          <span className="text-sm font-bold text-primary">{winRate}%</span>
        </div>

        {/* Match breakdown */}
        <div className="space-y-3 mt-1">
          <details className="group">
            <summary className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-emerald-400 hover:text-emerald-300">
              <span>Vitórias ({wins.length})</span>
            </summary>
            <div className="mt-1.5">{renderMatchList(wins, "Nenhuma vitória")}</div>
          </details>
          <details className="group">
            <summary className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-amber-400 hover:text-amber-300">
              <span>Empates ({draws.length})</span>
            </summary>
            <div className="mt-1.5">{renderMatchList(draws, "Nenhum empate")}</div>
          </details>
          <details className="group">
            <summary className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-destructive hover:text-destructive/80">
              <span>Derrotas ({losses.length})</span>
            </summary>
            <div className="mt-1.5">{renderMatchList(losses, "Nenhuma derrota")}</div>
          </details>
        </div>
      </DialogContent>
    </Dialog>
  );
}
