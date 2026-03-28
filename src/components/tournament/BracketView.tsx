import { useState, useRef, useEffect } from "react";
import { Match, Team, Tournament, KnockoutStage } from "@/types/tournament";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Shield, Play, Trash2, Trophy, Plus, Shuffle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { simulateFullMatch } from "@/lib/simulation";
import MatchPopup from "./MatchPopup";
import BracketTeamEditor from "./BracketTeamEditor";

// --- 🔧 1. Hook de Posições (Ajustado para Scroll e Container) ---
export function useBracketPositions(
  refsMatrix: React.MutableRefObject<(HTMLDivElement | null)[][]>,
  containerRef: React.RefObject<HTMLDivElement>,
  dependencies: any[],
) {
  const [positions, setPositions] = useState<{ rightX: number; leftX: number; y: number }[][]>([]);

  useEffect(() => {
    const update = () => {
      if (!containerRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();

      const newPositions = refsMatrix.current.map((stageRefs) => {
        return stageRefs.map((el) => {
          if (!el) return null;
          const rect = el.getBoundingClientRect();
          // Calcula a posição relativa ao container, considerando o scroll interno
          return {
            rightX: rect.right - containerRect.left + containerRef.current!.scrollLeft,
            leftX: rect.left - containerRect.left + containerRef.current!.scrollLeft,
            y: rect.top - containerRect.top + containerRef.current!.scrollTop + rect.height / 2,
          };
        });
      });
      setPositions(newPositions as any);
    };

    // Pequeno delay para garantir que a DOM desenhou os cards com seus tamanhos reais
    const timer = setTimeout(update, 50);
    window.addEventListener("resize", update);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", update);
    };
  }, dependencies);

  return positions;
}

// --- 🔧 2. Componente SVG Dinâmico ---
const BracketSVG = ({ positions }: { positions: { rightX: number; leftX: number; y: number }[][] }) => {
  if (!positions || positions.length < 2) return null;

  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
      {positions.map((stagePos, sIdx) => {
        const nextStagePos = positions[sIdx + 1];
        if (!nextStagePos) return null;

        return stagePos.map((pos, pIdx) => {
          const target = nextStagePos[Math.floor(pIdx / 2)];
          if (!pos || !target) return null;

          const midX = (pos.rightX + target.leftX) / 2;

          return (
            <path
              key={`line-${sIdx}-${pIdx}`}
              d={`
                M ${pos.rightX} ${pos.y}
                H ${midX}
                V ${target.y}
                H ${target.leftX}
              `}
              fill="none"
              stroke="currentColor"
              className="text-border shadow-sm"
              strokeWidth="2"
            />
          );
        });
      })}
    </svg>
  );
};

// --- Tipagens e Helpers ---
const STAGE_LABELS: Record<string, string> = {
  "1/64": "32-avos",
  "1/32": "16-avos",
  "1/16": "Oitavas",
  "1/8": "Quartas",
  "1/4": "Semifinal",
  "1/2": "Final",
};

export default function BracketView({
  tournament,
  teams,
  onUpdateMatch,
  onBatchUpdateMatches,
  onGenerateBracket,
  onRemoveMatch,
  onAddMatch,
}: any) {
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [editingTeam, setEditingTeam] = useState<any>(null);

  // 🔧 3. Refs para o container e matriz de cards
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRefs = useRef<(HTMLDivElement | null)[][]>([]);

  const matches = tournament.matches || [];
  const startStage = tournament.mataMataInicio || "1/8";

  const getTeam = (id: string) => teams.find((t: any) => t.id === id);
  const stages = ["1/64", "1/32", "1/16", "1/8", "1/4", "1/2"].slice(
    ["1/64", "1/32", "1/16", "1/8", "1/4", "1/2"].indexOf(startStage),
  );

  // Helper para agrupar partidas de Ida e Volta (ou Simples)
  const getPairs = (stageIdx: number) => {
    const stageMatches = matches.filter((m: any) => m.round === stageIdx + 1 && !m.isThirdPlace);
    const pairs: any[] = [];
    const processedIds = new Set();

    stageMatches.forEach((m: any) => {
      if (processedIds.has(m.id)) return;
      if (m.pairId) {
        const leg1 = stageMatches.find((x: any) => x.pairId === m.pairId && x.leg === 1) || m;
        const leg2 = stageMatches.find((x: any) => x.pairId === m.pairId && x.leg === 2) || null;
        pairs.push({ leg1, leg2 });
        processedIds.add(leg1.id);
        if (leg2) processedIds.add(leg2.id);
      } else {
        pairs.push({ leg1: m, leg2: null });
        processedIds.add(m.id);
      }
    });
    return pairs;
  };

  // Garante que a matriz de refs tenha o tamanho correto
  if (stageRefs.current.length !== stages.length + 1) {
    // +1 para a coluna do campeão
    stageRefs.current = Array.from({ length: stages.length + 1 }, () => []);
  }

  // 🔧 5. Capturando as posições usando nosso Hook turbinado
  // Usamos `matches` e o tamanho da tela como dependência para redesenhar se o jogo atualizar
  const positions = useBracketPositions(stageRefs, containerRef, [matches]);

  const TeamRow = ({ team, score, isWinner, borderBottom, onEdit }: any) => (
    <div
      className={cn(
        "flex items-center justify-between px-3 py-2 transition-colors",
        borderBottom && "border-b border-border/10",
        isWinner && "bg-primary/5",
      )}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer" onClick={onEdit}>
        {team?.logo ? (
          <img src={team.logo} className="w-4 h-4 object-contain" alt="" />
        ) : (
          <Shield className="w-4 h-4 text-muted-foreground/40" />
        )}
        <span className={cn("text-xs truncate", isWinner ? "font-bold text-foreground" : "text-muted-foreground")}>
          {team?.shortName || team?.name || "A definir"}
        </span>
      </div>
      <span className={cn("text-xs font-mono w-6 text-right", isWinner && "text-primary font-bold")}>
        {score ?? "—"}
      </span>
    </div>
  );

  return (
    <div
      className="w-full overflow-x-auto pb-8 bg-background/50 rounded-xl border border-border/50 relative"
      ref={containerRef}
    >
      {/* 🔧 SVG Fica Absoluto Atrás dos Cards */}
      <BracketSVG positions={positions} />

      <div className="flex flex-row p-8 min-w-max gap-16 relative z-10">
        {stages.map((stage, sIdx) => {
          const pairs = getPairs(sIdx);
          const expectedSlots = Math.pow(2, stages.length - sIdx - 1);

          return (
            <div key={stage} className="flex flex-col h-full w-[220px]">
              <div className="text-center mb-8">
                <h3 className="text-xs font-bold text-primary uppercase tracking-widest">{STAGE_LABELS[stage]}</h3>
                <div className="h-1 w-8 bg-primary/20 mx-auto mt-2 rounded-full" />
              </div>

              <div className="flex-1 flex flex-col justify-around gap-6 py-4">
                {pairs.length > 0
                  ? pairs.map((p, pIdx) => {
                      const homeTeam = getTeam(p.leg1.homeTeamId);
                      const awayTeam = getTeam(p.leg1.awayTeamId);

                      return (
                        // 🔧 4. Ref no contêiner do confronto
                        <div
                          key={p.leg1.id}
                          ref={(el) => {
                            stageRefs.current[sIdx][pIdx] = el;
                          }}
                          className="w-full bg-secondary/40 border border-border rounded-lg shadow-sm hover:border-primary/40 transition-all"
                        >
                          <div onClick={() => setSelectedMatch(p.leg1)} className="cursor-pointer">
                            <TeamRow
                              team={homeTeam}
                              score={p.leg1.played ? p.leg1.homeScore : undefined}
                              borderBottom
                              onEdit={() => setEditingTeam({ match: p.leg1, side: "home" })}
                            />
                            <TeamRow
                              team={awayTeam}
                              score={p.leg1.played ? p.leg1.awayScore : undefined}
                              onEdit={() => setEditingTeam({ match: p.leg1, side: "away" })}
                            />
                          </div>

                          {p.leg2 && (
                            <div className="border-t border-border/20 bg-black/10">
                              <div className="text-[8px] px-2 py-0.5 text-muted-foreground uppercase">Volta</div>
                              <div onClick={() => setSelectedMatch(p.leg2)} className="cursor-pointer">
                                <TeamRow
                                  team={awayTeam}
                                  score={p.leg2.played ? p.leg2.homeScore : undefined}
                                  borderBottom
                                />
                                <TeamRow team={homeTeam} score={p.leg2.played ? p.leg2.awayScore : undefined} />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  : Array.from({ length: expectedSlots }).map((_, i) => (
                      <div
                        key={`empty-${sIdx}-${i}`}
                        ref={(el) => {
                          stageRefs.current[sIdx][i] = el;
                        }}
                        className="w-full h-16 border border-dashed border-border/40 rounded-lg bg-muted/5 flex items-center justify-center text-xs text-muted-foreground/30"
                      >
                        A definir
                      </div>
                    ))}
              </div>
            </div>
          );
        })}

        {/* Coluna do Campeão */}
        <div className="flex flex-col justify-center items-center w-[200px]">
          <div
            className="text-center space-y-4"
            ref={(el) => {
              stageRefs.current[stages.length][0] = el;
            }}
          >
            <div className="relative">
              <Trophy className="w-12 h-12 text-yellow-500 mx-auto drop-shadow-[0_0_15px_rgba(234,179,8,0.4)]" />
            </div>
            <div className="p-4 bg-gradient-to-b from-yellow-500/10 to-transparent border border-yellow-500/20 rounded-xl">
              <p className="text-[10px] font-bold text-yellow-500 uppercase">Campeão</p>
              <p className="text-sm font-bold text-foreground">A definir</p>
            </div>
          </div>
        </div>
      </div>

      {/* Modais */}
      {selectedMatch && (
        <MatchPopup match={selectedMatch} onClose={() => setSelectedMatch(null)} onUpdate={onUpdateMatch} />
      )}

      {editingTeam && (
        <BracketTeamEditor
          match={editingTeam.match}
          side={editingTeam.side}
          onClose={() => setEditingTeam(null)}
          onUpdate={onUpdateMatch}
        />
      )}
    </div>
  );
}
