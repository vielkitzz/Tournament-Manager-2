import { useState } from "react";
import { Match, Team, Tournament } from "@/types/tournament";
import { Shield, ChevronLeft, ChevronRight, Play, Trophy, CheckCircle, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { simulateFullMatch } from "@/lib/simulation";
import MatchPopup from "./MatchPopup";

interface RoundsViewProps {
  tournament: Tournament;
  teams: Team[];
  onUpdateMatch: (match: Match) => void;
  onBatchUpdateMatches?: (matches: Match[]) => void;
  onGenerateRounds?: () => void;
  onFinalize?: () => void;
}

export default function RoundsView({ tournament, teams, onUpdateMatch, onBatchUpdateMatches, onGenerateRounds, onFinalize }: RoundsViewProps) {
  const matches = tournament.matches;
  const totalRounds = matches.length > 0 ? Math.max(...matches.map((m) => m.round)) : 0;
  // Default to the last round that has at least one played match
  const lastPlayedRound = matches.length > 0
    ? Math.max(...matches.filter((m) => m.played).map((m) => m.round), 1)
    : 1;
  const [currentRound, setCurrentRound] = useState(lastPlayedRound);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);

  if (matches.length === 0) {
    const hasEnoughTeams = tournament.teamIds.length >= 2;
    return (
      <div className="text-center py-12">
        <p className="text-sm text-muted-foreground mb-3">
          {onGenerateRounds
            ? (hasEnoughTeams ? "Gere as rodadas para começar" : `Adicione pelo menos 2 times (${tournament.teamIds.length} adicionados)`)
            : "Os jogos serão gerados automaticamente ao definir os grupos."}
        </p>
        {onGenerateRounds && hasEnoughTeams && (
          <Button onClick={onGenerateRounds} className="gap-2 bg-primary text-primary-foreground">
            <Play className="w-4 h-4" />
            Gerar Rodadas
          </Button>
        )}
      </div>
    );
  }

  const allPlayed = matches.length > 0 && matches.every((m) => m.played);
  const roundMatches = matches.filter((m) => m.round === currentRound);
  const unplayedInRound = roundMatches.filter((m) => !m.played);

  const getTeam = (id: string) => teams.find((t) => t.id === id);

  const handleSimulateRound = () => {
    if (unplayedInRound.length === 0) return;
    const updated = unplayedInRound.map((match) => {
      const home = getTeam(match.homeTeamId);
      const away = getTeam(match.awayTeamId);
      const homeRate = tournament.settings.rateInfluence ? (home?.rate ?? 5) : 5;
      const awayRate = tournament.settings.rateInfluence ? (away?.rate ?? 5) : 5;
      const result = simulateFullMatch(homeRate, awayRate);
      return {
        ...match,
        homeScore: result.total[0],
        awayScore: result.total[1],
        played: true,
      };
    });
    if (onBatchUpdateMatches) {
      onBatchUpdateMatches(updated);
    } else {
      updated.forEach((m) => onUpdateMatch(m));
    }
  };

  return (
    <div className="space-y-4">
      {/* Round navigation */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={() => setCurrentRound((r) => Math.max(1, r - 1))}
          disabled={currentRound <= 1}
          className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="font-display font-bold text-foreground text-sm min-w-[100px] text-center">
          Rodada {currentRound} / {totalRounds}
        </span>
        <button
          onClick={() => setCurrentRound((r) => Math.min(totalRounds, r + 1))}
          disabled={currentRound >= totalRounds}
          className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
        {unplayedInRound.length > 0 && (
          <button
            onClick={handleSimulateRound}
            title={`Simular ${unplayedInRound.length} ${unplayedInRound.length === 1 ? "jogo" : "jogos"}`}
            className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
          >
            <Zap className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Simulate round button */}
      {/* Simulate round icon in header area */}

      {/* Matches */}
      {(() => {
        const isGroupFormat = tournament.format === "grupos";
        const hasGroups = isGroupFormat && roundMatches.some((m) => m.group != null);

        const renderMatch = (match: Match) => {
          const home = getTeam(match.homeTeamId);
          const away = getTeam(match.awayTeamId);
          return (
            <button
              key={match.id}
              onClick={() => setSelectedMatch(match)}
              className="w-full p-3 rounded-xl bg-secondary/30 border border-border hover:border-primary/40 transition-all text-left"
            >
              <div className="flex items-center gap-3">
                <div className="flex-1 flex items-center gap-2 justify-end">
                  <span className="text-xs font-medium text-foreground truncate">
                    {home?.shortName || home?.abbreviation || "Time Excluído"}
                  </span>
                  <div className="w-6 h-6 flex items-center justify-center shrink-0">
                    {home?.logo ? (
                      <img src={home.logo} alt="" className="w-6 h-6 object-contain" />
                    ) : (
                      <Shield className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 min-w-[60px] justify-center">
                  {match.played ? (
                    <>
                      <span className="text-sm font-bold text-foreground w-5 text-center">{match.homeScore}</span>
                      <span className="text-xs text-muted-foreground">×</span>
                      <span className="text-sm font-bold text-foreground w-5 text-center">{match.awayScore}</span>
                    </>
                  ) : (
                    <span className="text-xs text-muted-foreground">vs</span>
                  )}
                </div>
                <div className="flex-1 flex items-center gap-2">
                  <div className="w-6 h-6 flex items-center justify-center shrink-0">
                    {away?.logo ? (
                      <img src={away.logo} alt="" className="w-6 h-6 object-contain" />
                    ) : (
                      <Shield className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                  <span className="text-xs font-medium text-foreground truncate">
                    {away?.shortName || away?.abbreviation || "Time Excluído"}
                  </span>
                </div>
              </div>
            </button>
          );
        };

        if (hasGroups) {
          const groups = [...new Set(roundMatches.map((m) => m.group!))].sort((a, b) => a - b);
          return (
            <div className="space-y-4">
              {groups.map((group) => (
                <div key={group} className="space-y-2">
                  <div className="flex items-center gap-2 px-1">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Grupo {String.fromCharCode(64 + group)}
                    </span>
                    <div className="flex-1 h-px bg-border" />
                  </div>
                  {roundMatches.filter((m) => m.group === group).map(renderMatch)}
                </div>
              ))}
            </div>
          );
        }

        return (
          <div className="space-y-2">
            {roundMatches.map(renderMatch)}
          </div>
        );
      })()}

      {/* Finalize banner */}
      {allPlayed && !tournament.finalized && onFinalize && (
        <div className="flex items-center justify-center gap-3 p-4 rounded-xl bg-primary/5 border border-primary/20">
          <CheckCircle className="w-5 h-5 text-primary" />
          <span className="text-sm font-medium text-foreground">Todas as rodadas foram jogadas!</span>
          <Button onClick={onFinalize} size="sm" className="gap-1.5 bg-primary text-primary-foreground">
            <Trophy className="w-4 h-4" />
            Finalizar Temporada
          </Button>
        </div>
      )}

      {tournament.finalized && (
        <div className="flex items-center justify-center gap-2 p-3 rounded-xl bg-primary/5 border border-primary/20">
          <Trophy className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-foreground">Temporada {tournament.year} finalizada</span>
        </div>
      )}

      {/* Match Popup */}
      {selectedMatch && (
        <MatchPopup
          match={selectedMatch}
          homeTeam={getTeam(selectedMatch.homeTeamId)}
          awayTeam={getTeam(selectedMatch.awayTeamId)}
          rateInfluence={tournament.settings.rateInfluence}
          tournament={tournament}
          allTeams={teams}
          onSave={(updated) => {
            onUpdateMatch(updated);
            setSelectedMatch(null);
          }}
          onCancel={() => setSelectedMatch(null)}
        />
      )}
    </div>
  );
}
