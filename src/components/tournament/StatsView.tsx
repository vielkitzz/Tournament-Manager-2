import { useState } from "react";
import { Match, Team, Tournament } from "@/types/tournament";
import { Shield, Swords, ShieldCheck, TrendingUp, ChevronDown, ChevronUp } from "lucide-react";

interface StatsViewProps {
  tournament: Tournament;
  teams: Team[];
}

interface TeamStats {
  teamId: string;
  team?: Team;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  avgFor: number;
  avgAgainst: number;
  winRate: number;
}

function computeStats(tournament: Tournament, teams: Team[]): TeamStats[] {
  const map = new Map<string, TeamStats>();

  for (const tid of tournament.teamIds) {
    map.set(tid, {
      teamId: tid,
      team: teams.find((t) => t.id === tid),
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      avgFor: 0,
      avgAgainst: 0,
      winRate: 0,
    });
  }

  for (const m of tournament.matches) {
    if (!m.played) continue;
    const home = map.get(m.homeTeamId);
    const away = map.get(m.awayTeamId);
    if (!home || !away) continue;

    home.played++;
    away.played++;
    home.goalsFor += m.homeScore;
    home.goalsAgainst += m.awayScore;
    away.goalsFor += m.awayScore;
    away.goalsAgainst += m.homeScore;

    if (m.homeScore > m.awayScore) {
      home.wins++;
      away.losses++;
    } else if (m.awayScore > m.homeScore) {
      away.wins++;
      home.losses++;
    } else {
      home.draws++;
      away.draws++;
    }
  }

  for (const s of map.values()) {
    s.avgFor = s.played > 0 ? s.goalsFor / s.played : 0;
    s.avgAgainst = s.played > 0 ? s.goalsAgainst / s.played : 0;
    s.winRate = s.played > 0 ? (s.wins / s.played) * 100 : 0;
  }

  return Array.from(map.values());
}

const INITIAL_COUNT = 5;

function CompactRow({ stat, value, rank }: { stat: TeamStats; value: string; rank: number }) {
  return (
    <div className="flex items-center gap-2 py-1.5 px-2">
      <span className="text-[10px] font-bold text-muted-foreground w-4 text-center">{rank}</span>
      <div className="w-5 h-5 flex items-center justify-center shrink-0">
        {stat.team?.logo ? (
          <img src={stat.team.logo} alt="" className="w-5 h-5 object-contain" />
        ) : (
          <Shield className="w-3.5 h-3.5 text-muted-foreground" />
        )}
      </div>
      <span className="text-xs text-foreground truncate flex-1">
        {stat.team?.shortName || stat.team?.name || "—"}
      </span>
      <span className="text-xs font-bold text-foreground tabular-nums">{value}</span>
    </div>
  );
}

interface StatCardProps {
  icon: React.ElementType;
  title: string;
  items: TeamStats[];
  valueAccessor: (s: TeamStats) => string;
}

function StatCard({ icon: Icon, title, items, valueAccessor }: StatCardProps) {
  const [expanded, setExpanded] = useState(false);
  const displayItems = expanded ? items : items.slice(0, INITIAL_COUNT);
  const canExpand = items.length > INITIAL_COUNT;

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 bg-secondary/30 border-b border-border">
        <Icon className="w-3.5 h-3.5 text-primary" />
        <h3 className="text-xs font-bold text-foreground">{title}</h3>
      </div>
      <div className="divide-y divide-border/30">
        {displayItems.map((s, i) => (
          <CompactRow key={s.teamId} stat={s} rank={i + 1} value={valueAccessor(s)} />
        ))}
      </div>
      {canExpand && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-center gap-1 py-1.5 text-[11px] font-medium text-primary hover:bg-secondary/40 transition-colors border-t border-border/30"
        >
          {expanded ? (
            <>Ver menos <ChevronUp className="w-3 h-3" /></>
          ) : (
            <>Ver mais <ChevronDown className="w-3 h-3" /></>
          )}
        </button>
      )}
    </div>
  );
}

export default function StatsView({ tournament, teams }: StatsViewProps) {
  const stats = computeStats(tournament, teams);
  const hasMatches = tournament.matches.some((m) => m.played);

  if (!hasMatches) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-muted-foreground">Nenhuma partida disputada ainda</p>
      </div>
    );
  }

  const bestAttack = [...stats].sort((a, b) => b.goalsFor - a.goalsFor || a.played - b.played);
  const bestDefense = [...stats].sort((a, b) => a.goalsAgainst - b.goalsAgainst || a.played - b.played);
  const topAvgGoals = [...stats].sort((a, b) => b.avgFor - a.avgFor);
  const topWinRate = [...stats].filter((s) => s.played > 0).sort((a, b) => b.winRate - a.winRate || b.wins - a.wins);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
      <StatCard
        icon={Swords}
        title="Melhor Ataque"
        items={bestAttack}
        valueAccessor={(s) => `${s.goalsFor}`}
      />
      <StatCard
        icon={ShieldCheck}
        title="Melhor Defesa"
        items={bestDefense}
        valueAccessor={(s) => `${s.goalsAgainst}`}
      />
      <StatCard
        icon={Swords}
        title="Média de Gols/Jogo"
        items={topAvgGoals}
        valueAccessor={(s) => s.avgFor.toFixed(1)}
      />
      <StatCard
        icon={TrendingUp}
        title="Aproveitamento"
        items={topWinRate}
        valueAccessor={(s) => `${s.winRate.toFixed(0)}%`}
      />
    </div>
  );
}
