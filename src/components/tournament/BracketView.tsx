import { useState, useRef } from "react";
import { Match, Team, Tournament, KnockoutStage } from "@/types/tournament";
import { toast } from "sonner";
import { Shield, Zap, Trophy, Plus, Trash2, Shuffle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { simulateFullMatch, simulateHalf } from "@/lib/simulation";
import MatchPopup from "./MatchPopup";
import BracketTeamEditor from "./BracketTeamEditor";
import ScreenshotButton from "@/components/ScreenshotButton";

// ... (getStagesFromStart, getAggregate, getTieWinner permanecem iguais)

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
  const matches = tournament.matches || [];
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [editingTeam, setEditingTeam] = useState<{ match: Match; side: "home" | "away" } | null>(null);
  const bracketRef = useRef<HTMLDivElement>(null);

  const getTeam = (id: string) => teams.find((t) => t.id === id);
  const legMode = tournament.settings.knockoutLegMode || "single";
  const finalSingleLeg = tournament.settings.finalSingleLeg ?? false;
  const thirdPlaceMatch = tournament.settings.thirdPlaceMatch ?? false;
  const awayGoalsRule = tournament.settings.awayGoalsRule ?? false;

  // --- Lógica de Simulação Corrigida ---
  const simulateMatch = (match: Match, canEndInDraw: boolean = false): Match => {
    const home = getTeam(match.homeTeamId);
    const away = getTeam(match.awayTeamId);
    const homeRate = tournament.settings.rateInfluence ? (home?.rate ?? 5) : 5;
    const awayRate = tournament.settings.rateInfluence ? (away?.rate ?? 5) : 5;

    const result = simulateFullMatch(homeRate, awayRate);
    let homeScore = result.total[0];
    let awayScore = result.total[1];
    let homePenalties: number | undefined;
    let awayPenalties: number | undefined;

    // Só gera pênaltis se NÃO puder empatar (ex: Jogo único ou Final)
    if (homeScore === awayScore && !canEndInDraw) {
      homePenalties = Math.floor(Math.random() * 3) + 3;
      awayPenalties = homePenalties + (Math.random() > 0.5 ? 1 : -1);
      if (awayPenalties < 0) awayPenalties = homePenalties + 1;
    }

    return {
      ...match,
      homeScore,
      awayScore,
      played: true,
      ...(homePenalties !== undefined && { homePenalties, awayPenalties }),
    };
  };

  // --- Renderização de Linha de Time ---
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

  // ... (Lógica de handleAdvanceStage e handleSimulateStage mantidas com correções de simulateMatch)

  const renderChampionCard = () => {
    const finalStage = stages[stages.length - 1];
    const finalMatches = regularMatches.filter((m) => m.round === stages.length);
    const finalPairs = getPairs(finalMatches);

    const championId = finalPairs.length > 0 ? getTieResult(finalPairs[0]) : null;
    const championTeam = championId ? getTeam(championId) : null;
    if (!championTeam) return null;

    const winnerId = getTieResult(finalPairs[0]);
    const runnerUpId =
      winnerId === finalPairs[0].leg1.homeTeamId ? finalPairs[0].leg1.awayTeamId : finalPairs[0].leg1.homeTeamId;
    const runnerUpTeam = getTeam(runnerUpId!);

    return (
      <div className="flex flex-col items-center w-[220px] mt-8">
        <div className="mb-3 text-center">
          <span className="text-[11px] font-bold text-primary uppercase tracking-wider">Campeão</span>
        </div>
        <div className="w-full p-4 rounded-xl bg-gradient-to-b from-primary/15 to-primary/5 border-2 border-primary/40 shadow-lg text-center">
          <Trophy className="w-8 h-8 text-primary mx-auto mb-2" />
          <p className="text-sm font-bold">{championTeam.name}</p>
        </div>
        {/* Renderizar 2º e 3º aqui se desejar */}
      </div>
    );
  };

  return (
    <div className="space-y-8 p-4">
      <div className="flex justify-end gap-2">
        <ScreenshotButton targetRef={bracketRef} fileName="chaveamento" />
      </div>

      <div ref={bracketRef} className="flex gap-8 pb-8 overflow-x-auto min-h-[600px] items-start">
        {stages.map((stage, idx) =>
          renderStageColumn(stage, idx, getPairs(matchesByStage[stage] || []), `col-${stage}`),
        )}
        {renderChampionCard()}
      </div>

      {selectedMatch && (
        <MatchPopup
          match={selectedMatch}
          isOpen={!!selectedMatch}
          onClose={() => setSelectedMatch(null)}
          onUpdate={onUpdateMatch}
          teams={teams}
        />
      )}

      {editingTeam && (
        <BracketTeamEditor
          isOpen={!!editingTeam}
          onClose={() => setEditingTeam(null)}
          match={editingTeam.match}
          side={editingTeam.side}
          teams={teams}
          onUpdate={onUpdateMatch}
        />
      )}
    </div>
  );
}
