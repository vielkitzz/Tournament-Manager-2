import { Shield, X } from "lucide-react";
import { StandingRow } from "@/lib/standings";
import { PromotionRule } from "@/types/tournament";
import { cn } from "@/lib/utils";

interface StandingsTableProps {
  standings: StandingRow[];
  promotions?: PromotionRule[];
  qualifyUntil?: number;
  onRemoveTeam?: (teamId: string) => void;
}

export default function StandingsTable({ standings, promotions = [], qualifyUntil, onRemoveTeam }: StandingsTableProps) {
  if (standings.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-muted-foreground">Adicione times para ver a tabela</p>
      </div>
    );
  }

  const getPromotion = (pos: number) => promotions.find((p) => p.position === pos);

  return (
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
            const isEliminated = qualifyUntil !== undefined && pos > qualifyUntil;
            const showDivider = qualifyUntil !== undefined && pos === qualifyUntil + 1;
            
            return (
              <tr
                key={row.teamId}
                className={cn(
                  "border-b border-border/50 transition-colors relative",
                  isEliminated ? "opacity-50 bg-destructive/5" : "hover:bg-secondary/30",
                  showDivider && "border-t-2 border-t-destructive/40"
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
                <td className="text-center py-2.5 px-1 text-muted-foreground">{row.wins}</td>
                <td className="text-center py-2.5 px-1 text-muted-foreground">{row.draws}</td>
                <td className="text-center py-2.5 px-1 text-muted-foreground">{row.losses}</td>
                <td className="text-center py-2.5 px-1 text-muted-foreground">{row.goalsFor}</td>
                <td className="text-center py-2.5 px-1 text-muted-foreground">{row.goalsAgainst}</td>
                <td className="text-center py-2.5 px-1 text-muted-foreground">
                  {row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}
                </td>
                {onRemoveTeam && (
                  <td className="text-center py-2.5 px-1">
                    <button
                      onClick={() => onRemoveTeam(row.teamId)}
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
    </div>
  );
}
