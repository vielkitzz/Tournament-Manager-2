import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Trophy,
  Pencil,
  Settings2,
  Scale,
  Swords,
  ShieldCheck,
  ArrowUpDown,
  ListOrdered,
} from "lucide-react";
import { useTournamentStore } from "@/store/tournamentStore";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { calculateStandings } from "@/lib/standings";
import PromotionEditor from "@/components/tournament/PromotionEditor";
import { STAGE_TEAM_COUNTS, KnockoutStage } from "@/types/tournament";

function SectionCard({
  icon: Icon,
  title,
  children,
  className = "",
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border border-border bg-card p-5 space-y-4 ${className}`}>
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function SettingToggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/40 hover:bg-secondary/60 transition-colors">
      <div className="space-y-0.5">
        <Label className="text-sm text-foreground cursor-pointer">{label}</Label>
        {description && <p className="text-[11px] text-muted-foreground">{description}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

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

  const defaultSettings = {
    pointsWin: 3,
    pointsDraw: 1,
    pointsLoss: 0,
    tiebreakers: [
      "Pontos",
      "Vitórias",
      "Saldo de Gols",
      "Gols Marcados",
      "Empates",
      "Gols Sofridos",
      "Confronto Direto",
    ],
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

  const settings = { ...defaultSettings, ...(tournament.settings || {}) };
  const safeTiebreakers = Array.isArray(settings.tiebreakers) ? settings.tiebreakers : defaultSettings.tiebreakers;
  const standings = calculateStandings(tournament.teamIds, tournament.matches || [], settings, teams);

  const isGrupos = tournament.format === "grupos";
  const groupCount = tournament.gruposQuantidade || 1;
  const startStage = (tournament.gruposMataMataInicio || "1/8") as KnockoutStage;
  const totalKnockoutTeams = STAGE_TEAM_COUNTS[startStage] || 16;
  const qualifiersNeeded = totalKnockoutTeams;
  const qualifiersPerGroup = Math.floor(qualifiersNeeded / groupCount);
  const remainderSlots = qualifiersNeeded - qualifiersPerGroup * groupCount;

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

  const currentBestOfQualifiers = settings.bestOfQualifiers ?? 0;
  const currentBestOfPosition = settings.bestOfPosition ?? 3;
  const isMataMata = tournament.format === "mata-mata" || tournament.format === "grupos";
  const hasLeaguePhase =
    tournament.format === "liga" || tournament.format === "grupos" || tournament.format === "suico";

  const formatLabel =
    {
      liga: "Liga",
      grupos: "Grupos + Mata-Mata",
      "mata-mata": "Mata-Mata",
      suico: "Suíço",
    }[tournament.format] || tournament.format;

  const update = (partial: Partial<typeof settings>) =>
    updateTournament(tournament.id, { settings: { ...settings, ...partial } });

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate(`/tournament/${id}`)}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-display font-bold text-foreground truncate">Editar Sistemas</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-muted-foreground">{tournament.name}</span>
            <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">{formatLabel}</span>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate(`/tournament/${id}/edit`)} className="gap-1.5">
          <Pencil className="w-3.5 h-3.5" />
          Editar Competição
        </Button>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Points — only for formats with league phase */}
        {hasLeaguePhase && (
          <SectionCard icon={Trophy} title="Pontuações">
            <div className="grid grid-cols-3 gap-3">
              {(
                [
                  { key: "pointsWin", label: "Vitória" },
                  { key: "pointsDraw", label: "Empate" },
                  { key: "pointsLoss", label: "Derrota" },
                ] as const
              ).map(({ key, label }) => (
                <div key={key} className="space-y-1.5">
                  <span className="text-xs text-muted-foreground">{label}</span>
                  <Input
                    type="number"
                    value={settings[key]}
                    onChange={(e) => update({ [key]: parseInt(e.target.value) || 0 })}
                    className="bg-secondary border-border"
                  />
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        {/* Tiebreakers — only for formats with league phase */}
        {hasLeaguePhase && (
          <SectionCard icon={ListOrdered} title="Critérios de Desempate">
            <div className="space-y-1 max-h-[280px] overflow-y-auto pr-1">
              {safeTiebreakers.map((tb, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 p-2.5 rounded-lg bg-secondary/40 text-sm text-foreground group"
                >
                  <span className="text-[11px] text-muted-foreground w-5 font-mono">{i + 1}.</span>
                  <span className="flex-1">{tb}</span>
                  <div className="flex gap-0.5 opacity-50 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => {
                        if (i === 0) return;
                        const arr = [...safeTiebreakers];
                        [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]];
                        update({ tiebreakers: arr });
                      }}
                      className="text-xs text-muted-foreground hover:text-foreground px-1"
                    >
                      ▲
                    </button>
                    <button
                      onClick={() => {
                        if (i === safeTiebreakers.length - 1) return;
                        const arr = [...safeTiebreakers];
                        [arr[i], arr[i + 1]] = [arr[i + 1], arr[i]];
                        update({ tiebreakers: arr });
                      }}
                      className="text-xs text-muted-foreground hover:text-foreground px-1"
                    >
                      ▼
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        {/* Knockout settings */}
        {isMataMata && (
          <SectionCard icon={Swords} title="Configurações do Mata-Mata">
            <div className="space-y-2">
              <SettingToggle
                label="Jogos de Ida e Volta"
                description="Disputar duas partidas por confronto"
                checked={settings.knockoutLegMode === "home-away"}
                onChange={(v) => update({ knockoutLegMode: v ? "home-away" : "single" })}
              />
              {settings.knockoutLegMode === "home-away" && (
                <div className="ml-4">
                  <SettingToggle
                    label="Final em Jogo Único"
                    description="Mesmo com ida/volta nas demais fases"
                    checked={settings.finalSingleLeg ?? false}
                    onChange={(v) => update({ finalSingleLeg: v })}
                  />
                </div>
              )}
              <SettingToggle
                label="Disputa de 3º Lugar"
                description="Jogo entre os perdedores das semis"
                checked={settings.thirdPlaceMatch ?? false}
                onChange={(v) => update({ thirdPlaceMatch: v })}
              />
            </div>
          </SectionCard>
        )}

        {/* General rules */}
        <SectionCard icon={Settings2} title="Regras Gerais">
          <div className="space-y-2">
            <SettingToggle
              label="Regra dos gols fora"
              checked={settings.awayGoalsRule}
              onChange={(v) => update({ awayGoalsRule: v })}
            />
            <SettingToggle
              label="Prorrogação"
              checked={settings.extraTime}
              onChange={(v) => update({ extraTime: v })}
            />
            {settings.extraTime && (
              <div className="ml-4">
                <SettingToggle
                  label="Gol de ouro na prorrogação"
                  checked={settings.goldenGoal}
                  onChange={(v) => update({ goldenGoal: v })}
                />
              </div>
            )}
            <SettingToggle
              label="Influência dos rates dos clubes"
              description="Usar rating do time nas simulações"
              checked={settings.rateInfluence}
              onChange={(v) => update({ rateInfluence: v })}
            />
          </div>
        </SectionCard>

        {/* Groups → Knockout qualification */}
        {isGrupos && (
          <SectionCard icon={ShieldCheck} title="Classificação Grupos → Mata-Mata" className="lg:col-span-2">
            <div className="text-xs text-muted-foreground space-y-1.5 p-3 rounded-lg bg-secondary/30">
              <p>
                Com <strong className="text-foreground">{groupCount} grupos</strong> e {totalKnockoutTeams} vagas no
                mata-mata (
                {startStage
                  .replace("1/64", "32-avos de final")
                  .replace("1/32", "16-avos de final")
                  .replace("1/16", "oitavas de final")
                  .replace("1/8", "quartas de final")
                  .replace("1/4", "semifinal")
                  .replace("1/2", "final")}
                ):
              </p>
              <p>
                → <strong className="text-foreground">{qualifiersPerGroup} classificados diretos</strong> por grupo (
                {qualifiersPerGroup * groupCount} times)
              </p>
              {remainderSlots > 0 && (
                <p className="text-warning">
                  → Ainda faltam <strong>{remainderSlots} vaga(s)</strong> — configure abaixo os melhores classificados
                  por posição
                </p>
              )}
              {remainderSlots === 0 && <p className="text-primary">→ Vagas exatas: {qualifiersPerGroup} por grupo</p>}
            </div>

            {remainderSlots > 0 && (
              <div className="space-y-3 p-3 rounded-lg border border-border bg-secondary/20">
                <p className="text-xs text-foreground font-medium">Melhores classificados por posição</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <span className="text-xs text-muted-foreground">Posição (ex: 3 = 3ºs lugares)</span>
                    <Input
                      type="number"
                      value={currentBestOfPosition}
                      min={1}
                      max={10}
                      onChange={(e) => update({ bestOfPosition: parseInt(e.target.value) || 3 })}
                      className="bg-secondary border-border h-9 text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-xs text-muted-foreground">Quantos melhor (ex: {remainderSlots})</span>
                    <Input
                      type="number"
                      value={currentBestOfQualifiers}
                      min={0}
                      max={groupCount}
                      onChange={(e) => update({ bestOfQualifiers: parseInt(e.target.value) || 0 })}
                      className="bg-secondary border-border h-9 text-xs"
                    />
                  </div>
                </div>
                {currentBestOfQualifiers > 0 && (
                  <p className="text-[11px] text-primary">
                    Os {currentBestOfQualifiers} melhores {currentBestOfPosition}ºs lugares de todos os grupos se
                    classificam
                  </p>
                )}
              </div>
            )}
          </SectionCard>
        )}

        {/* Promotions / Relegations */}
        {(tournament.format === "liga" || tournament.format === "grupos") && (
          <SectionCard icon={ArrowUpDown} title="Promoções / Rebaixamentos" className="lg:col-span-2">
            <PromotionEditor
              tournament={tournament}
              standings={standings}
              allTournaments={tournaments}
              onUpdate={(promotions) => update({ promotions })}
              standingsByGroup={isGrupos ? standingsByGroup : undefined}
            />
          </SectionCard>
        )}
      </div>
    </div>
  );
}
