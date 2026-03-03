import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Trophy, Pencil } from "lucide-react";
import { useTournamentStore } from "@/store/tournamentStore";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { calculateStandings } from "@/lib/standings";
import PromotionEditor from "@/components/tournament/PromotionEditor";
import { STAGE_TEAM_COUNTS, KnockoutStage } from "@/types/tournament";

export default function TournamentSettingsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { tournaments, teams, updateTournament } = useTournamentStore();
  const tournament = tournaments.find((t) => t.id === id);

  if (!tournament) {
    return (
      <div className="p-6 lg:p-8 text-center py-20">
        <Trophy className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-muted-foreground">Competição não encontrada</p>
        <button onClick={() => navigate("/")} className="text-primary text-sm mt-3 hover:underline">
          Voltar ao início
        </button>
      </div>
    );
  }

  // REFORÇO ESTRUTURAL 1: Fundação Padrão Segura
  // Se o settings vier nulo do banco, usamos estes valores de segurança
  const defaultSettings = {
    pointsWin: 3,
    pointsDraw: 1,
    pointsLoss: 0,
    tiebreakers: ["Pontos", "Vitórias", "Saldo de Gols", "Gols Pró"],
    promotions: [],
    bestOfPosition: 3,
    bestOfQualifiers: 0,
    knockoutLegMode: "home-away" as const,
    finalSingleLeg: false,
    thirdPlaceMatch: false,
    awayGoalsRule: false,
    extraTime: false,
    goldenGoal: false,
    rateInfluence: false,
  };

  // Mescla o que veio do banco com o padrão seguro
  const settings = { ...defaultSettings, ...(tournament.settings || {}) };
  
  // REFORÇO ESTRUTURAL 2: Garante que tiebreakers seja sempre uma lista (Array)
  const safeTiebreakers = Array.isArray(settings.tiebreakers) 
    ? settings.tiebreakers 
    : defaultSettings.tiebreakers;

  const standings = calculateStandings(tournament.teamIds, tournament.matches || [], settings, teams);

  // Groups + knockout specific
  const isGrupos = tournament.format === "grupos";
  const groupCount = tournament.gruposQuantidade || 1;
  const startStage = (tournament.gruposMataMataInicio || "1/8") as KnockoutStage;
  const totalKnockoutTeams = STAGE_TEAM_COUNTS[startStage] || 16;
  const qualifiersNeeded = totalKnockoutTeams;
  const qualifiersPerGroup = Math.floor(qualifiersNeeded / groupCount);
  const remainderSlots = qualifiersNeeded - qualifiersPerGroup * groupCount;

  // Compute per-group standings for grupos format
  const standingsByGroup: Record<number, import("@/lib/standings").StandingRow[]> = {};
  if (isGrupos) {
    const groupMatches = (tournament.matches || []).filter((m) => m.stage === "group" || !m.stage);
    for (let g = 1; g <= groupCount; g++) {
      const gMatches = groupMatches.filter((m) => m.group === g);
      const gTeamIds = [...new Set(gMatches.flatMap((m) => [m.homeTeamId, m.awayTeamId]))];
      if (gTeamIds.length > 0) {
        standingsByGroup[g] = calculateStandings(gTeamIds, gMatches, settings, teams);
      }
    }
  }

  // How many "best of position X" slots are needed
  const currentBestOfQualifiers = settings.bestOfQualifiers ?? 0;
  const currentBestOfPosition = settings.bestOfPosition ?? 3;

  const isMataMata = tournament.format === "mata-mata" || tournament.format === "grupos";

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate(`/tournament/${id}`)} className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="text-xl font-display font-bold text-foreground flex-1">Editar Sistemas — {tournament.name}</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(`/tournament/${id}/edit`)}
          className="gap-1.5"
        >
          <Pencil className="w-3.5 h-3.5" />
          Editar Competição
        </Button>
      </div>

      <div className="space-y-5 max-w-2xl">
        {/* Points */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground">Pontuações</Label>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">Vitória</span>
              <Input
                type="number"
                value={settings.pointsWin}
                onChange={(e) => updateTournament(tournament.id, { settings: { ...settings, pointsWin: parseInt(e.target.value) || 0 } })}
                className="bg-secondary border-border"
              />
            </div>
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">Empate</span>
              <Input
                type="number"
                value={settings.pointsDraw}
                onChange={(e) => updateTournament(tournament.id, { settings: { ...settings, pointsDraw: parseInt(e.target.value) || 0 } })}
                className="bg-secondary border-border"
              />
            </div>
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">Derrota</span>
              <Input
                type="number"
                value={settings.pointsLoss}
                onChange={(e) => updateTournament(tournament.id, { settings: { ...settings, pointsLoss: parseInt(e.target.value) || 0 } })}
                className="bg-secondary border-border"
              />
            </div>
          </div>
        </div>

        {/* Tiebreakers */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground">Critérios de Desempate</Label>
          <div className="space-y-1">
            {safeTiebreakers.map((tb, i) => (
              <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-secondary/50 text-sm text-foreground">
                <span className="text-xs text-muted-foreground w-5">{i + 1}.</span>
                <span className="flex-1">{tb}</span>
                <button
                  onClick={() => {
                    if (i === 0) return;
                    const arr = [...safeTiebreakers];
                    [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]];
                    updateTournament(tournament.id, { settings: { ...settings, tiebreakers: arr } });
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  ▲
                </button>
                <button
                  onClick={() => {
                    if (i === safeTiebreakers.length - 1) return;
                    const arr = [...safeTiebreakers];
                    [arr[i], arr[i + 1]] = [arr[i + 1], arr[i]];
                    updateTournament(tournament.id, { settings: { ...settings, tiebreakers: arr } });
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  ▼
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Promotions */}
        {(tournament.format === "liga" || tournament.format === "grupos") && (
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">Promoções / Rebaixamentos</Label>
            <PromotionEditor
              tournament={tournament}
              standings={standings}
              allTournaments={tournaments}
              onUpdate={(promotions) => updateTournament(tournament.id, { settings: { ...settings, promotions } })}
              standingsByGroup={isGrupos ? standingsByGroup : undefined}
            />
          </div>
        )}

        {/* Groups → Knockout qualifiers info */}
        {isGrupos && (
          <div className="space-y-3 p-3 rounded-xl bg-secondary/50 border border-border">
            <Label className="text-sm font-medium text-foreground">Classificação Grupos → Mata-Mata</Label>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>
                Com <strong className="text-foreground">{groupCount} grupos</strong> e {totalKnockoutTeams} vagas no mata-mata ({
                  startStage
                    .replace("1/64", "32-avos de final")
                    .replace("1/32", "16-avos de final")
                    .replace("1/16", "oitavas de final")
                    .replace("1/8", "quartas de final")
                    .replace("1/4", "semifinal")
                    .replace("1/2", "final")
                }):
              </p>
              <p>→ <strong className="text-foreground">{qualifiersPerGroup} classificados diretos</strong> por grupo ({qualifiersPerGroup * groupCount} times)</p>
              {remainderSlots > 0 && (
                <p className="text-yellow-600 dark:text-yellow-400">→ Ainda faltam <strong>{remainderSlots} vaga(s)</strong> — configure abaixo os melhores classificados por posição</p>
              )}
              {remainderSlots === 0 && (
                <p className="text-primary">→ Vagas exatas: {qualifiersPerGroup} por grupo ✓</p>
              )}
            </div>

            {/* Best-of qualifiers */}
            {remainderSlots > 0 && (
              <div className="space-y-2 pt-2 border-t border-border">
                <p className="text-xs text-foreground font-medium">Melhores classificados por posição</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">Posição (ex: 3 = 3ºs lugares)</span>
                    <Input
                      type="number"
                      value={currentBestOfPosition}
                      min={1}
                      max={10}
                      onChange={(e) => updateTournament(tournament.id, { settings: { ...settings, bestOfPosition: parseInt(e.target.value) || 3 } })}
                      className="bg-secondary border-border h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">Quantos melhor (ex: {remainderSlots})</span>
                    <Input
                      type="number"
                      value={currentBestOfQualifiers}
                      min={0}
                      max={groupCount}
                      onChange={(e) => updateTournament(tournament.id, { settings: { ...settings, bestOfQualifiers: parseInt(e.target.value) || 0 } })}
                      className="bg-secondary border-border h-8 text-xs"
                    />
                  </div>
                </div>
                {currentBestOfQualifiers > 0 && (
                  <p className="text-[11px] text-primary">
                    Os {currentBestOfQualifiers} melhores {currentBestOfPosition}ºs lugares de todos os grupos se classificam
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Mata-mata options */}
        {isMataMata && (
          <div className="space-y-3">
            <Label className="text-sm font-medium text-foreground">Configurações do Mata-Mata</Label>
            <div className="space-y-1">
              <div className="flex items-center justify-between p-2 rounded-lg bg-secondary/50">
                <div>
                  <Label className="text-sm text-foreground">Jogos de Ida e Volta</Label>
                  <p className="text-xs text-muted-foreground">Disputar duas partidas por confronto</p>
                </div>
                <Switch
                  checked={settings.knockoutLegMode === "home-away"}
                  onCheckedChange={(v) => updateTournament(tournament.id, { settings: { ...settings, knockoutLegMode: v ? "home-away" : "single" } })}
                />
              </div>
              {settings.knockoutLegMode === "home-away" && (
                <div className="flex items-center justify-between p-2 rounded-lg bg-secondary/50 ml-3">
                  <div>
                    <Label className="text-sm text-foreground">Final em Jogo Único</Label>
                    <p className="text-xs text-muted-foreground">Mesmo com ida/volta nas demais fases</p>
                  </div>
                  <Switch
                    checked={settings.finalSingleLeg ?? false}
                    onCheckedChange={(v) => updateTournament(tournament.id, { settings: { ...settings, finalSingleLeg: v } })}
                  />
                </div>
              )}
              <div className="flex items-center justify-between p-2 rounded-lg bg-secondary/50">
                <div>
                  <Label className="text-sm text-foreground">Disputa de 3º Lugar</Label>
                  <p className="text-xs text-muted-foreground">Jogo entre os perdedores das semis</p>
                </div>
                <Switch
                  checked={settings.thirdPlaceMatch ?? false}
                  onCheckedChange={(v) => updateTournament(tournament.id, { settings: { ...settings, thirdPlaceMatch: v } })}
                />
              </div>
            </div>
          </div>
        )}

        {/* General Toggles */}
        <div className="space-y-3">
          <Label className="text-sm font-medium text-foreground">Regras Gerais</Label>
          <div className="space-y-1">
            <div className="flex items-center justify-between p-2 rounded-lg bg-secondary/50">
              <Label className="text-sm text-foreground">Regra dos gols fora</Label>
              <Switch
                checked={settings.awayGoalsRule}
                onCheckedChange={(v) => updateTournament(tournament.id, { settings: { ...settings, awayGoalsRule: v } })}
              />
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-secondary/50">
              <Label className="text-sm text-foreground">Prorrogação</Label>
              <Switch
                checked={settings.extraTime}
                onCheckedChange={(v) => updateTournament(tournament.id, { settings: { ...settings, extraTime: v } })}
              />
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-secondary/50">
              <Label className="text-sm text-foreground">Gol de ouro na prorrogação</Label>
              <Switch
                checked={settings.goldenGoal}
                onCheckedChange={(v) => updateTournament(tournament.id, { settings: { ...settings, goldenGoal: v } })}
              />
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-secondary/50">
              <Label className="text-sm text-foreground">Influência dos rates dos clubes</Label>
              <Switch
                checked={settings.rateInfluence}
                onCheckedChange={(v) => updateTournament(tournament.id, { settings: { ...settings, rateInfluence: v } })}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
