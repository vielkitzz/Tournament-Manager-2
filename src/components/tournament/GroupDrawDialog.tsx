import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Team } from "@/types/tournament";
import { Shield, Shuffle, Check } from "lucide-react";

interface GroupDrawDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teams: Team[];
  teamIds: string[];
  groupCount: number;
  onConfirm: (assignments: Record<string, string[]>) => void;
}

export default function GroupDrawDialog({
  open,
  onOpenChange,
  teams,
  teamIds,
  groupCount,
  onConfirm,
}: GroupDrawDialogProps) {
  const [drawn, setDrawn] = useState<Record<string, string[]> | null>(null);

  const tournamentTeams = useMemo(
    () => teamIds.map((id) => teams.find((t) => t.id === id)).filter(Boolean) as Team[],
    [teamIds, teams]
  );

  const pots = useMemo(() => {
    const sorted = [...tournamentTeams].sort((a, b) => (b.rate || 0) - (a.rate || 0));
    const numPots = Math.min(groupCount, Math.max(1, Math.ceil(sorted.length / groupCount)));
    const potSize = Math.ceil(sorted.length / numPots);
    const result: Team[][] = [];
    for (let i = 0; i < numPots; i++) {
      result.push(sorted.slice(i * potSize, (i + 1) * potSize));
    }
    return result;
  }, [tournamentTeams, groupCount]);

  const handleDraw = () => {
    const assignments: Record<string, string[]> = {};
    for (let g = 1; g <= groupCount; g++) {
      assignments[String(g)] = [];
    }
    pots.forEach((pot) => {
      const shuffled = [...pot].sort(() => Math.random() - 0.5);
      shuffled.forEach((team, idx) => {
        const groupIdx = idx % groupCount;
        assignments[String(groupIdx + 1)].push(team.id);
      });
    });
    setDrawn(assignments);
  };

  const handleConfirm = () => {
    if (drawn) {
      onConfirm(drawn);
      setDrawn(null);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setDrawn(null); }}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shuffle className="w-5 h-5 text-primary" />
            Sorteio dos Grupos
          </DialogTitle>
        </DialogHeader>

        {!drawn ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Os times serão distribuídos em {pots.length} {pots.length === 1 ? "pote" : "potes"} baseados no rating e sorteados nos {groupCount} grupos.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {pots.map((pot, potIdx) => (
                <div key={potIdx} className="rounded-lg border border-border bg-secondary/30 overflow-hidden">
                  <div className="px-3 py-1.5 bg-secondary/50 border-b border-border">
                    <span className="text-xs font-bold text-foreground">Pote {potIdx + 1}</span>
                  </div>
                  <div className="p-2 space-y-1">
                    {pot.map((team) => (
                      <div key={team.id} className="flex items-center gap-2 px-2 py-1">
                        <div className="w-5 h-5 flex items-center justify-center shrink-0">
                          {team.logo ? (
                            <img src={team.logo} alt="" className="w-5 h-5 object-contain" />
                          ) : (
                            <Shield className="w-3.5 h-3.5 text-muted-foreground" />
                          )}
                        </div>
                        <span className="text-xs text-foreground truncate">{team.name}</span>
                        <span className="text-[10px] text-muted-foreground ml-auto">★{team.rate}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-center">
              <Button onClick={handleDraw} className="gap-2">
                <Shuffle className="w-4 h-4" />
                Sortear
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Resultado do sorteio:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Array.from({ length: groupCount }, (_, i) => i + 1).map((g) => {
                const groupTeams = (drawn[String(g)] || [])
                  .map((id) => teams.find((t) => t.id === id))
                  .filter(Boolean) as Team[];
                return (
                  <div key={g} className="rounded-lg border border-primary/30 bg-primary/5 overflow-hidden">
                    <div className="px-3 py-1.5 bg-primary/10 border-b border-primary/20">
                      <span className="text-xs font-bold text-foreground">
                        Grupo {String.fromCharCode(64 + g)}
                      </span>
                    </div>
                    <div className="p-2 space-y-1">
                      {groupTeams.map((team) => (
                        <div key={team.id} className="flex items-center gap-2 px-2 py-1">
                          <div className="w-5 h-5 flex items-center justify-center shrink-0">
                            {team.logo ? (
                              <img src={team.logo} alt="" className="w-5 h-5 object-contain" />
                            ) : (
                              <Shield className="w-3.5 h-3.5 text-muted-foreground" />
                            )}
                          </div>
                          <span className="text-xs text-foreground truncate">{team.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-center gap-2">
              <Button variant="outline" onClick={() => setDrawn(null)}>
                Refazer
              </Button>
              <Button onClick={handleConfirm} className="gap-2">
                <Check className="w-4 h-4" />
                Confirmar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
