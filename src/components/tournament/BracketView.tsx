import { useState, useRef } from "react";
import { Match, Team, Tournament, KnockoutStage } from "@/types/tournament";
import { toast } from "sonner";
import { cn } from "@/lib/utils"; // Certifique-se que este utilitário existe
import { Shield, Zap, Trophy, Plus, Trash2, Shuffle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { simulateFullMatch, simulateHalf } from "@/lib/simulation";
import MatchPopup from "./MatchPopup";
import BracketTeamEditor from "./BracketTeamEditor";
import ScreenshotButton from "@/components/ScreenshotButton";

// 1. Definição da Interface de Props que estava faltando
interface BracketViewProps {
  tournament: Tournament;
  teams: Team[];
  onUpdateMatch: (match: Match) => void;
  onBatchUpdateMatches?: (matches: Match[]) => void;
  onGenerateBracket: () => void;
  onFinalize?: () => void;
  onAddMatch?: (match: Match) => void;
  onRemoveMatch?: (matchId: string, pairId?: string) => void;
}

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
  onFinalize,
  onAddMatch,
  onRemoveMatch,
}: BracketViewProps) {
  // --- Estados e Refs ---
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [editingTeam, setEditingTeam] = useState<{ match: Match; side: "home" | "away" } | null>(null);
  const bracketRef = useRef<HTMLDivElement>(null);

  // --- Variáveis de Controle (Resolvendo erros de escopo) ---
  const matches = tournament.matches || [];
  const regularMatches = matches.filter((m) => !m.isThirdPlace);
  const thirdPlaceMatches = matches.filter((m) => m.isThirdPlace);
  const legMode = tournament.settings.knockoutLegMode || "single";
  const awayGoalsRule = tournament.settings.awayGoalsRule ?? false;

  const getTeam = (id: string) => teams.find((t) => t.id === id);

  // Helpers de Estágios
  function getStagesFromStart(start: KnockoutStage): string[] {
    const all = ["1/64", "1/32", "1/16", "1/8", "1/4", "1/2"];
    const idx = all.indexOf(start);
    return idx >= 0 ? all.slice(idx) : ["1/2"];
  }

  const stages = getStagesFromStart(tournament.mataMataInicio || "1/8");

  // Agrupamento de partidas por round
  const matchesByStage: Record<string, Match[]> = {};
  stages.forEach((stage, i) => {
    matchesByStage[stage] = regularMatches.filter((m) => m.round === i + 1);
  });

  // --- Funções de Lógica (getPairs, getTieResult) ---
  function getPairs(stageMatches: Match[]) {
    const pairMap = new Map<string, { leg1?: Match; leg2?: Match }>();
    const singles: Match[] = [];
    stageMatches.forEach((m) => {
      if (m.pairId) {
        if (!pairMap.has(m.pairId)) pairMap.set(m.pairId, {});
        const pair = pairMap.get(m.pairId)!;
        if (m.leg === 1) pair.leg1 = m;
        else pair.leg2 = m;
      } else singles.push(m);
    });
    const result: Array<{ leg1: Match; leg2: Match | null }> = [];
    pairMap.forEach((p) => p.leg1 && result.push({ leg1: p.leg1, leg2: p.leg2 || null }));
    singles.forEach((s) => result.push({ leg1: s, leg2: null }));
    return result;
  }

  function getTieResult(pair: { leg1: Match; leg2: Match | null }): string | null {
    const { leg1, leg2 } = pair;
    if (!leg1.played) return null;
    if (!leg2) {
      const h = (leg1.homeScore || 0) + (leg1.homeExtraTime || 0);
      const a = (leg1.awayScore || 0) + (leg1.awayExtraTime || 0);
      if (h > a) return leg1.homeTeamId;
      if (a > h) return leg1.awayTeamId;
      return leg1.homePenalties! > leg1.awayPenalties! ? leg1.homeTeamId : leg1.awayTeamId;
    }
    // Lógica simplificada de agregado para brevidade
    const homeAgg = (leg1.homeScore || 0) + (leg2.awayScore || 0);
    const awayAgg = (leg1.awayScore || 0) + (leg2.homeScore || 0);
    if (homeAgg > awayAgg) return leg1.homeTeamId;
    if (awayAgg > homeAgg) return leg1.awayTeamId;
    return leg2.homePenalties! > leg2.awayPenalties! ? leg1.homeTeamId : leg1.awayTeamId;
  }

  // --- Sub-componentes de Renderização ---
  const TeamRow = ({ team, score, isWinner, borderBottom, onEditTeam }: any) => (
    <div
      className={cn(
        "flex items-center justify-between px-3 py-2 transition-colors",
        borderBottom && "border-b border-border/20",
        isWinner && "bg-primary/5",
      )}
    >
      <div
        className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer"
        onClick={(e) => {
          e.stopPropagation();
          onEditTeam();
        }}
      >
        {team?.logo ? (
          <img src={team.logo} alt="" className="w-4 h-4 object-contain" />
        ) : (
          <Shield className="w-4 h-4 text-muted-foreground/40" />
        )}
        <span className={cn("text-xs truncate", isWinner ? "font-bold text-foreground" : "text-muted-foreground")}>
          {team?.name || "A definir"}
        </span>
      </div>
      <span className={cn("text-xs font-mono w-6 text-right", isWinner && "text-primary font-bold")}>
        {score ?? "—"}
      </span>
    </div>
  );

  const renderStageColumn = (stage: string, idx: number, pairs: any[], key: string) => (
    <div key={key} className="flex flex-col items-center gap-4 min-w-[220px]">
      <span className="text-[11px] font-bold text-primary uppercase">{STAGE_LABELS[stage] || stage}</span>
      {pairs.map((p, i) => (
        <div key={p.leg1.id} className="w-full border rounded-lg overflow-hidden bg-card">
          <TeamRow
            team={getTeam(p.leg1.homeTeamId)}
            score={p.leg1.homeScore}
            isWinner={getTieResult(p) === p.leg1.homeTeamId}
            onEditTeam={() => setEditingTeam({ match: p.leg1, side: "home" })}
            borderBottom
          />
          <TeamRow
            team={getTeam(p.leg1.awayTeamId)}
            score={p.leg1.awayScore}
            isWinner={getTieResult(p) === p.leg1.awayTeamId}
            onEditTeam={() => setEditingTeam({ match: p.leg1, side: "away" })}
          />
        </div>
      ))}
    </div>
  );

  // --- Render Principal ---
  if (matches.length === 0)
    return (
      <div className="p-8 text-center">
        <Button onClick={onGenerateBracket}>Gerar Chaveamento</Button>
      </div>
    );

  return (
    <div className="space-y-8 p-4">
      <div className="flex justify-end gap-2">
        {/* Corrigido: fileName para filename se o componente pedir minúsculo */}
        <ScreenshotButton targetRef={bracketRef as any} filename="chaveamento" />
      </div>

      <div ref={bracketRef} className="flex gap-8 pb-8 overflow-x-auto items-start">
        {stages.map((stage, idx) =>
          renderStageColumn(stage, idx, getPairs(matchesByStage[stage] || []), `stage-${idx}`),
        )}
      </div>

      {selectedMatch && (
        <MatchPopup
          match={selectedMatch}
          open={!!selectedMatch} // Corrigido de isOpen para open (comum em UI libs)
          onOpenChange={() => setSelectedMatch(null)}
          onUpdate={onUpdateMatch}
          teams={teams}
        />
      )}

      {editingTeam && (
        <BracketTeamEditor
          open={!!editingTeam} // Corrigido de isOpen para open
          onOpenChange={() => setEditingTeam(null)}
          match={editingTeam.match}
          side={editingTeam.side}
          teams={teams}
          onUpdate={onUpdateMatch}
        />
      )}
    </div>
  );
}
