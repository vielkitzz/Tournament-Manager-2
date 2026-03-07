import { useState, useEffect } from "react";
import { Shield, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StandingRow } from "@/lib/standings";
import { cn } from "@/lib/utils";

interface GroupQualificationViewProps {
  groupCount: number;
  standingsByGroup: Record<number, StandingRow[]>;
  totalKnockoutTeams: number;
  allGroupMatchesPlayed: boolean;
  /** IDs já confirmados (quando groupsFinalized = true) */
  confirmedTeamIds?: string[];
  onConfirm: (qualifiedTeamIds: string[]) => void;
}

export default function GroupQualificationView({
  groupCount,
  standingsByGroup,
  totalKnockoutTeams,
  allGroupMatchesPlayed,
  confirmedTeamIds,
  onConfirm,
}: GroupQualificationViewProps) {
  const isReadonly = !!confirmedTeamIds && confirmedTeamIds.length > 0;

  // Calcula quantos classificados por grupo com base no total de vagas e número de grupos
  const qualifiersPerGroup = groupCount > 0 ? Math.max(1, Math.round(totalKnockoutTeams / groupCount)) : 1;

  // Pré-seleciona automaticamente os classificados de cada grupo quando todos os jogos estiverem concluídos
  const getAutoSelected = (): Set<string> => {
    if (confirmedTeamIds && confirmedTeamIds.length > 0) {
      return new Set(confirmedTeamIds);
    }
    if (!allGroupMatchesPlayed) return new Set();
    const autoIds: string[] = [];
    for (let g = 1; g <= groupCount; g++) {
      const rows = standingsByGroup[g] || [];
      rows.slice(0, qualifiersPerGroup).forEach((row) => autoIds.push(row.teamId));
    }
    return new Set(autoIds);
  };

  const [selected, setSelected] = useState<Set<string>>(getAutoSelected);

  // Atualiza a seleção automaticamente quando os jogos forem concluídos
  useEffect(() => {
    if (isReadonly) return;
    if (allGroupMatchesPlayed && selected.size === 0) {
      setSelected(getAutoSelected());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allGroupMatchesPlayed, isReadonly]);

  const toggle = (teamId: string) => {
    if (isReadonly || !allGroupMatchesPlayed) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(teamId)) next.delete(teamId);
      else next.add(teamId);
      return next;
    });
  };

  const count = selected.size;
  // Permite confirmação quando há pelo menos 2 times selecionados e o número é par
  const isReady = count >= 2 && count % 2 === 0;

  const gridCols =
    groupCount === 1
      ? "grid-cols-1"
      : groupCount === 2
      ? "grid-cols-1 sm:grid-cols-2"
      : groupCount <= 4
      ? "grid-cols-1 sm:grid-cols-2"
      : groupCount <= 6
      ? "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3"
      : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <span className="text-xs text-muted-foreground">
          {count}/{totalKnockoutTeams} classificados
        </span>
        <Button
          onClick={() => onConfirm(Array.from(selected))}
          disabled={!isReady || !allGroupMatchesPlayed || isReadonly}
          size="sm"
          className={cn(
            "gap-2 shrink-0",
            isReadonly
              ? "bg-primary/20 text-primary cursor-default"
              : "bg-primary text-primary-foreground"
          )}
        >
          <Trophy className="w-4 h-4" />
          {isReadonly ? "Classificados Confirmados" : "Confirmar e Gerar Mata-Mata"}
        </Button>
      </div>

      {/* ── Group Cards Grid ── */}
      <div className={cn("grid gap-4", gridCols)}>
        {Array.from({ length: groupCount }, (_, i) => i + 1).map((groupNum) => {
          const groupStandings = standingsByGroup[groupNum] || [];

          return (
            <div
              key={groupNum}
              className="rounded-xl border border-border bg-card shadow-sm overflow-hidden"
            >
              {/* Card header */}
              <div className="px-3 py-2 border-b border-border bg-secondary/40">
                <h3 className="font-display font-bold text-sm text-foreground">
                  Grupo {String.fromCharCode(64 + groupNum)}
                </h3>
              </div>

              {/* Compact table */}
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
                  {groupStandings.map((row, idx) => {
                    const isSelected = selected.has(row.teamId);

                    return (
                      <tr
                        key={row.teamId}
                        onClick={() => toggle(row.teamId)}
                        className={cn(
                          "border-b border-border/30 transition-colors cursor-pointer",
                          isSelected
                            ? "bg-primary/8 hover:bg-primary/12"
                            : "hover:bg-secondary/40",
                          (isReadonly || !allGroupMatchesPlayed) && "cursor-default"
                        )}
                      >
                        <td className="py-2 pl-3 pr-1 text-muted-foreground font-mono text-[10px]">
                          {idx + 1}
                        </td>
                        <td className="py-2 px-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <div className="w-4 h-4 flex items-center justify-center shrink-0">
                              {row.team?.logo ? (
                                <img src={row.team.logo} alt="" className="w-4 h-4 object-contain" />
                              ) : (
                                <Shield className="w-3 h-3 text-muted-foreground" />
                              )}
                            </div>
                            <span className={cn(
                              "font-medium truncate text-[11px]",
                              isSelected ? "text-foreground" : "text-muted-foreground"
                            )}>
                              {row.team?.abbreviation || row.team?.shortName || row.team?.name || "—"}
                            </span>
                          </div>
                        </td>
                        <td className="text-center py-2 px-0.5 font-bold tabular-nums text-foreground">{row.points}</td>
                        <td className="text-center py-2 px-0.5 tabular-nums text-muted-foreground">{row.played}</td>
                        <td className="text-center py-2 px-0.5 tabular-nums text-muted-foreground">{row.wins}</td>
                        <td className="text-center py-2 px-0.5 tabular-nums text-muted-foreground">{row.draws}</td>
                        <td className="text-center py-2 px-0.5 tabular-nums text-muted-foreground">{row.losses}</td>
                        <td className="text-center py-2 px-0.5 font-semibold tabular-nums text-muted-foreground">
                          {row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {groupStandings.length === 0 && (
                <div className="px-3 py-4 text-center text-xs text-muted-foreground">
                  Nenhum time
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
