import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Team } from "@/types/tournament";
import { Shield, Shuffle, Check, Pencil } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  const [mode, setMode] = useState<"auto" | "manual">("auto");
  // Manual pots: array of arrays of team IDs
  const [manualPots, setManualPots] = useState<string[][]>([]);
  const [unassignedPool, setUnassignedPool] = useState<string[]>([]);

  const tournamentTeams = useMemo(
    () => teamIds.map((id) => teams.find((t) => t.id === id)).filter(Boolean) as Team[],
    [teamIds, teams]
  );

  const autoPots = useMemo(() => {
    const sorted = [...tournamentTeams].sort((a, b) => (b.rate || 0) - (a.rate || 0));
    const numPots = Math.min(groupCount, Math.max(1, Math.ceil(sorted.length / groupCount)));
    const potSize = Math.ceil(sorted.length / numPots);
    const result: Team[][] = [];
    for (let i = 0; i < numPots; i++) {
      result.push(sorted.slice(i * potSize, (i + 1) * potSize));
    }
    return result;
  }, [tournamentTeams, groupCount]);

  // Initialize manual pots
  const initManualPots = () => {
    const numPots = Math.min(groupCount, Math.max(1, Math.ceil(tournamentTeams.length / groupCount)));
    setManualPots(Array.from({ length: numPots }, () => []));
    setUnassignedPool(tournamentTeams.map((t) => t.id));
  };

  const handleAddToPot = (teamId: string, potIdx: number) => {
    const potSize = Math.ceil(tournamentTeams.length / manualPots.length);
    if (manualPots[potIdx].length >= potSize) return;
    setManualPots((prev) => prev.map((pot, i) => i === potIdx ? [...pot, teamId] : pot));
    setUnassignedPool((prev) => prev.filter((id) => id !== teamId));
  };

  const handleRemoveFromPot = (teamId: string, potIdx: number) => {
    setManualPots((prev) => prev.map((pot, i) => i === potIdx ? pot.filter((id) => id !== teamId) : pot));
    setUnassignedPool((prev) => [...prev, teamId]);
  };

  const handleDraw = (potsData: Team[][]) => {
    const assignments: Record<string, string[]> = {};
    for (let g = 1; g <= groupCount; g++) {
      assignments[String(g)] = [];
    }
    potsData.forEach((pot) => {
      const shuffled = [...pot].sort(() => Math.random() - 0.5);
      shuffled.forEach((team, idx) => {
        const groupIdx = idx % groupCount;
        assignments[String(groupIdx + 1)].push(team.id);
      });
    });
    setDrawn(assignments);
  };

  const handleDrawAuto = () => handleDraw(autoPots);

  const handleDrawManual = () => {
    if (unassignedPool.length > 0) return;
    const potsAsTeams = manualPots.map((pot) =>
      pot.map((id) => teams.find((t) => t.id === id)).filter(Boolean) as Team[]
    );
    handleDraw(potsAsTeams);
  };

  const handleConfirm = () => {
    if (drawn) {
      onConfirm(drawn);
      setDrawn(null);
      onOpenChange(false);
    }
  };

  const getTeam = (id: string) => teams.find((t) => t.id === id);

  const TeamRow = ({ team, action }: { team: Team | undefined; action?: React.ReactNode }) => {
    if (!team) return null;
    return (
      <div className="flex items-center gap-2 px-2 py-1">
        <div className="w-5 h-5 flex items-center justify-center shrink-0">
          {team.logo ? (
            <img src={team.logo} alt="" className="w-5 h-5 object-contain" />
          ) : (
            <Shield className="w-3.5 h-3.5 text-muted-foreground" />
          )}
        </div>
        <span className="text-xs text-foreground truncate flex-1">{team.name}</span>
        <span className="text-[10px] text-muted-foreground">★{team.rate}</span>
        {action}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) { setDrawn(null); setMode("auto"); } }}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shuffle className="w-5 h-5 text-primary" />
            Sorteio dos Grupos
          </DialogTitle>
        </DialogHeader>

        {!drawn ? (
          <div className="space-y-4">
            <Tabs value={mode} onValueChange={(v) => { setMode(v as "auto" | "manual"); if (v === "manual" && manualPots.length === 0) initManualPots(); }}>
              <TabsList className="w-full">
                <TabsTrigger value="auto" className="flex-1 gap-1.5">
                  <Shuffle className="w-3.5 h-3.5" />
                  Potes Automáticos
                </TabsTrigger>
                <TabsTrigger value="manual" className="flex-1 gap-1.5">
                  <Pencil className="w-3.5 h-3.5" />
                  Potes Manuais
                </TabsTrigger>
              </TabsList>

              <TabsContent value="auto" className="space-y-4 mt-3">
                <p className="text-sm text-muted-foreground">
                  Os times serão distribuídos em {autoPots.length} {autoPots.length === 1 ? "pote" : "potes"} baseados no rating e sorteados nos {groupCount} grupos.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {autoPots.map((pot, potIdx) => (
                    <div key={potIdx} className="rounded-lg border border-border bg-secondary/30 overflow-hidden">
                      <div className="px-3 py-1.5 bg-secondary/50 border-b border-border">
                        <span className="text-xs font-bold text-foreground">Pote {potIdx + 1}</span>
                      </div>
                      <div className="p-2 space-y-1">
                        {pot.map((team) => (
                          <TeamRow key={team.id} team={team} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-center">
                  <Button onClick={handleDrawAuto} className="gap-2">
                    <Shuffle className="w-4 h-4" />
                    Sortear
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="manual" className="space-y-4 mt-3">
                <p className="text-sm text-muted-foreground">
                  Arraste os times para os potes manualmente. Cada pote deve ter {Math.ceil(tournamentTeams.length / Math.max(1, manualPots.length))} times.
                </p>

                {/* Unassigned pool */}
                {unassignedPool.length > 0 && (
                  <div className="rounded-lg border border-dashed border-primary/40 bg-primary/5 overflow-hidden">
                    <div className="px-3 py-1.5 bg-primary/10 border-b border-primary/20">
                      <span className="text-xs font-bold text-foreground">Sem Pote ({unassignedPool.length})</span>
                    </div>
                    <div className="p-2 space-y-1">
                      {unassignedPool.map((id) => {
                        const team = getTeam(id);
                        return (
                          <div key={id} className="flex items-center gap-2 px-2 py-1">
                            <div className="w-5 h-5 flex items-center justify-center shrink-0">
                              {team?.logo ? (
                                <img src={team.logo} alt="" className="w-5 h-5 object-contain" />
                              ) : (
                                <Shield className="w-3.5 h-3.5 text-muted-foreground" />
                              )}
                            </div>
                            <span className="text-xs text-foreground truncate flex-1">{team?.name}</span>
                            <span className="text-[10px] text-muted-foreground">★{team?.rate}</span>
                            <div className="flex gap-1 ml-1">
                              {manualPots.map((pot, pIdx) => {
                                const potSize = Math.ceil(tournamentTeams.length / manualPots.length);
                                const isFull = pot.length >= potSize;
                                return (
                                  <button
                                    key={pIdx}
                                    onClick={() => handleAddToPot(id, pIdx)}
                                    disabled={isFull}
                                    className="text-[9px] px-1.5 py-0.5 rounded bg-secondary hover:bg-primary/20 text-foreground disabled:opacity-30 disabled:cursor-not-allowed border border-border"
                                  >
                                    P{pIdx + 1}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Manual pots */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {manualPots.map((pot, potIdx) => {
                    const potSize = Math.ceil(tournamentTeams.length / manualPots.length);
                    return (
                      <div key={potIdx} className="rounded-lg border border-border bg-secondary/30 overflow-hidden">
                        <div className="px-3 py-1.5 bg-secondary/50 border-b border-border">
                          <span className="text-xs font-bold text-foreground">Pote {potIdx + 1} ({pot.length}/{potSize})</span>
                        </div>
                        <div className="p-2 space-y-1 min-h-[40px]">
                          {pot.length === 0 && (
                            <p className="text-[10px] text-muted-foreground text-center py-2">Vazio</p>
                          )}
                          {pot.map((id) => {
                            const team = getTeam(id);
                            return (
                              <TeamRow
                                key={id}
                                team={team}
                                action={
                                  <button
                                    onClick={() => handleRemoveFromPot(id, potIdx)}
                                    className="text-[9px] px-1.5 py-0.5 rounded bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/20"
                                  >
                                    ✕
                                  </button>
                                }
                              />
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-center">
                  <Button onClick={handleDrawManual} className="gap-2" disabled={unassignedPool.length > 0}>
                    <Shuffle className="w-4 h-4" />
                    Sortear
                  </Button>
                </div>
                {unassignedPool.length > 0 && (
                  <p className="text-[11px] text-center text-muted-foreground">
                    Distribua todos os times nos potes para sortear
                  </p>
                )}
              </TabsContent>
            </Tabs>
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
                        <TeamRow key={team.id} team={team} />
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
