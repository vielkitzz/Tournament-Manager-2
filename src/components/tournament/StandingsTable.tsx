import { useState, useRef } from "react";
import { Shield, X } from "lucide-react";
import { StandingRow } from "@/lib/standings";
import { PromotionRule, Match, Team } from "@/types/tournament";
import { cn } from "@/lib/utils";
import TeamStatsPopup from "./TeamStatsPopup";
import ScreenshotButton from "@/components/ScreenshotButton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface StandingsTableProps {
  standings: StandingRow[];
  promotions?: PromotionRule[];
  qualifyUntil?: number;
  onRemoveTeam?: (teamId: string) => void;
  matches?: Match[];
  allTeams?: Team[];
  hideScreenshot?: boolean;
}

export default function StandingsTable({ standings, promotions = [], qualifyUntil, onRemoveTeam, matches = [], allTeams = [], hideScreenshot }: StandingsTableProps) {
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  if (standings.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-muted-foreground">Adicione times para ver a tabela</p>
      </div>
    );
  }

  const getPromotion = (pos: number) => promotions.find((p) => p.position === pos);

  const selectedStanding = selectedTeamId ? standings.find((s) => s.teamId === selectedTeamId) : undefined;
  const selectedTeam = selectedStanding?.team;

  // Build match lists for tooltip previews
  const getMatchesForTeam = (teamId: string, type: "win" | "draw" | "loss") => {
    return matches.filter((m) => {
      if (!m.played) return false;
      if (m.homeTeamId !== teamId && m.awayTeamId !== teamId) return false;
      const isHome = m.homeTeamId === teamId;
      if (type === "win") return isHome ? m.homeScore > m.awayScore : m.awayScore > m.homeScore;
      if (type === "draw") return m.homeScore === m.awayScore;
      return isHome ? m.homeScore < m.awayScore : m.awayScore < m.homeScore;
    });
  };

  const renderTooltipMatches = (teamId: string, type: "win" | "draw" | "loss") => {
    const list = getMatchesForTeam(teamId, type);
    if (list.length === 0) return <span className="text-muted-foreground text-[10px]">Nenhum</span>;
    return (
      <div className="space-y-0.5 max-h-28 overflow-y-auto">
        {list.slice(0, 5).map((m) => {
          const isHome = m.homeTeamId === teamId;
          const opp = allTeams.find((t) => t.id === (isHome ? m.awayTeamId : m.homeTeamId));
          const score = isHome ? `${m.homeScore}–${m.awayScore}` : `${m.awayScore}–${m.homeScore}`;
          return (
            <div key={m.id} className="flex items-center gap-1.5 text-[10px]">
              <span className="font-mono font-bold text-foreground">{score}</span>
              <span className="text-muted-foreground truncate">{opp?.shortName || opp?.name || "?"}</span>
            </div>
          );
        })}
        {list.length > 5 && <span className="text-[10px] text-muted-foreground">+{list.length - 5} mais</span>}
      </div>
    );
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div ref={tableRef}>
        {!hideScreenshot && (
          <div className="flex justify-end px-2 py-1">
            <ScreenshotButton targetRef={tableRef as any} filename="classificacao.png" discrete />
          </div>
        )}
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-muted-foreground text-xs">
              <th className="text-left py-2 px-2 w-8">#</th>
              <th className="text-left py-2 px-2">Time</th>
              <th className="text-center py-2 px-1 w-8">P</th>
              <th className="text-center py-2 px-1 w-8">J</th>
              <th className="text-center py-2 px-1 w-8">V</th>
              <th className="text-center py-2 px-1 w-8">E</th>
              <th className="text-center py-2 px-1 w-8">D</th>
              <th className="text-center py-2 px-1 w-8">GP</th>
              <th className="text-center py-2 px-1 w-8">GC</th>
              <th className="text-center py-2 px-1 w-8">SG</th>
              {onRemoveTeam && <th className="w-6"></th>}
            </tr>
          </thead>
          <tbody>
            {standings.map((row, i) => {
              const pos = i + 1;
              const promo = getPromotion(pos);
              const isEliminated = false;
              const showDivider = false;
              const hasMatches = matches.length > 0;

              return (
                <tr
                  key={row.teamId}
                  onClick={() => hasMatches && setSelectedTeamId(row.teamId)}
                  className={cn(
                    "border-b border-border/50 transition-colors relative",
                    isEliminated ? "opacity-50 bg-destructive/5" : "hover:bg-secondary/30",
                    showDivider && "border-t-2 border-t-destructive/40",
                    hasMatches && "cursor-pointer"
                  )}
                >
                  <td
                    className="py-2.5 px-2 text-muted-foreground font-mono text-xs"
                    style={promo ? { borderLeft: `4px solid ${promo.color}` } : undefined}
                  >
                    {pos}
                  </td>
                  <td className="py-2.5 px-2">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 flex items-center justify-center shrink-0">
                        {row.team?.logo ? (
                          <img src={row.team.logo} alt="" className="w-5 h-5 object-contain" />
                        ) : (
                          <Shield className="w-3.5 h-3.5 text-muted-foreground" />
                        )}
                      </div>
                      <span className={cn(
                        "font-medium truncate",
                        isEliminated ? "text-muted-foreground line-through" : "text-foreground"
                      )}>
                        {row.team?.shortName || row.team?.name || "—"}
                      </span>
                      {isEliminated && (
                        <span className="text-[10px] text-destructive/70 font-medium shrink-0">Eliminado</span>
                      )}
                    </div>
                  </td>
                  <td className="text-center py-2.5 px-1 font-bold text-foreground">{row.points}</td>
                  <td className="text-center py-2.5 px-1 text-muted-foreground">{row.played}</td>
                  <td className="text-center py-2.5 px-1 text-muted-foreground">
                    {hasMatches && row.wins > 0 ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-help">{row.wins}</span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-48">
                          <p className="text-[10px] font-semibold mb-1">Vitórias</p>
                          {renderTooltipMatches(row.teamId, "win")}
                        </TooltipContent>
                      </Tooltip>
                    ) : row.wins}
                  </td>
                  <td className="text-center py-2.5 px-1 text-muted-foreground">
                    {hasMatches && row.draws > 0 ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-help">{row.draws}</span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-48">
                          <p className="text-[10px] font-semibold mb-1">Empates</p>
                          {renderTooltipMatches(row.teamId, "draw")}
                        </TooltipContent>
                      </Tooltip>
                    ) : row.draws}
                  </td>
                  <td className="text-center py-2.5 px-1 text-muted-foreground">
                    {hasMatches && row.losses > 0 ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-help">{row.losses}</span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-48">
                          <p className="text-[10px] font-semibold mb-1">Derrotas</p>
                          {renderTooltipMatches(row.teamId, "loss")}
                        </TooltipContent>
                      </Tooltip>
                    ) : row.losses}
                  </td>
                  <td className="text-center py-2.5 px-1 text-muted-foreground">{row.goalsFor}</td>
                  <td className="text-center py-2.5 px-1 text-muted-foreground">{row.goalsAgainst}</td>
                  <td className="text-center py-2.5 px-1 text-muted-foreground">
                    {row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}
                  </td>
                  {onRemoveTeam && (
                    <td className="text-center py-2.5 px-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); onRemoveTeam(row.teamId); }}
                        className="p-0.5 rounded hover:bg-destructive/10 text-muted-foreground/40 hover:text-destructive transition-colors"
                        title="Remover do grupo"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>

        <TeamStatsPopup
          open={!!selectedTeamId}
          onClose={() => setSelectedTeamId(null)}
          team={selectedTeam}
          standing={selectedStanding}
          matches={matches}
          allTeams={allTeams}
        />
        </div>
      </div>
    </TooltipProvider>
  );
}
