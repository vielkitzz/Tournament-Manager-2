import { StandingRow } from "@/lib/standings";
import { Shield } from "lucide-react";
import { cn } from "@/lib/utils";

interface GroupStandingsViewProps {
  groupCount: number;
  standingsByGroup: Record<number, StandingRow[]>;
}

export default function GroupStandingsView({
  groupCount,
  standingsByGroup,
}: GroupStandingsViewProps) {
  if (groupCount === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-muted-foreground">Adicione times para ver os grupos</p>
      </div>
    );
  }

  const gridCols =
    groupCount <= 2
      ? "grid-cols-1 sm:grid-cols-2"
      : groupCount <= 4
      ? "grid-cols-1 sm:grid-cols-2"
      : groupCount <= 6
      ? "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3"
      : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";

  return (
    <div className={cn("grid gap-4", gridCols)}>
      {Array.from({ length: groupCount }, (_, i) => i + 1).map((groupNum) => {
        const standings = standingsByGroup[groupNum] || [];
        return (
          <div key={groupNum} className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="px-3 py-2 border-b border-border bg-secondary/40">
              <h3 className="font-display font-bold text-sm text-foreground">
                Grupo {String.fromCharCode(64 + groupNum)}
              </h3>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/40 bg-secondary/20 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <th className="text-left py-1.5 pl-3 pr-1 w-5">#</th>
                  <th className="text-left py-1.5 px-1">Time</th>
                  <th className="text-center py-1.5 px-0.5 w-7">P</th>
                  <th className="text-center py-1.5 px-0.5 w-7">J</th>
                  <th className="text-center py-1.5 px-0.5 w-7">V</th>
                  <th className="text-center py-1.5 px-0.5 w-7">E</th>
                  <th className="text-center py-1.5 px-0.5 w-7">D</th>
                  <th className="text-center py-1.5 px-0.5 w-7">SG</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((row, i) => (
                  <tr key={row.teamId} className="border-b border-border/30 hover:bg-secondary/30 transition-colors">
                    <td className="py-2 pl-3 pr-1 text-muted-foreground font-mono text-[10px]">{i + 1}</td>
                    <td className="py-2 px-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div className="w-4 h-4 flex items-center justify-center shrink-0">
                          {row.team?.logo ? (
                            <img src={row.team.logo} alt="" className="w-4 h-4 object-contain" />
                          ) : (
                            <Shield className="w-3 h-3 text-muted-foreground" />
                          )}
                        </div>
                        <span className="font-medium truncate text-[11px] text-foreground">
                          {row.team?.abbreviation || row.team?.shortName || row.team?.name || "—"}
                        </span>
                      </div>
                    </td>
                    <td className="text-center py-2 px-0.5 font-bold tabular-nums text-foreground">{row.points}</td>
                    <td className="text-center py-2 px-0.5 tabular-nums text-muted-foreground">{row.played}</td>
                    <td className="text-center py-2 px-0.5 tabular-nums text-muted-foreground">{row.wins}</td>
                    <td className="text-center py-2 px-0.5 tabular-nums text-muted-foreground">{row.draws}</td>
                    <td className="text-center py-2 px-0.5 tabular-nums text-muted-foreground">{row.losses}</td>
                    <td className={cn(
                      "text-center py-2 px-0.5 font-semibold tabular-nums",
                      row.goalDifference > 0 ? "text-emerald-400" : row.goalDifference < 0 ? "text-red-400" : "text-muted-foreground"
                    )}>
                      {row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {standings.length === 0 && (
              <div className="px-3 py-4 text-center text-xs text-muted-foreground">Nenhum time</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
