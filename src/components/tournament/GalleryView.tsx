import { useMemo, useRef, useState } from "react";
import { SeasonRecord, Team } from "@/types/tournament";
import type { TeamHistory } from "@/lib/teamHistoryUtils";
import { resolveTeamForYear } from "@/lib/teamHistoryUtils";
import { Trophy, Shield, Plus, Pencil, Trash2, Check, X, Search, Crown, History, Medal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import ScreenshotButton from "@/components/ScreenshotButton";
import { championBoxStyle, splitChampionStyle } from "@/lib/teamColors";
import { getSeasonRunnersUp, getSeasonFinalScore, getSeasonChampionPoints } from "@/lib/seasonSnapshot";

interface ChampionEntry {
  id: string;
  name: string;
  logo?: string;
  colors?: string[];
}

interface GalleryViewProps {
  seasons: SeasonRecord[];
  teams?: Team[];
  teamHistories?: TeamHistory[];
  tournamentName?: string;
  onUpdateSeasons?: (seasons: SeasonRecord[]) => void;
}

export default function GalleryView({
  seasons,
  teams,
  teamHistories = [],
  tournamentName,
  onUpdateSeasons,
}: GalleryViewProps) {
  const [adding, setAdding] = useState(false);
  const [editingYear, setEditingYear] = useState<number | null>(null);
  const [formYear, setFormYear] = useState("");
  const [formName, setFormName] = useState("");
  const [formTeamId, setFormTeamId] = useState("");
  const [formLogo, setFormLogo] = useState<string | undefined>();
  const [formCoChampions, setFormCoChampions] = useState<{ id: string; name: string; logo?: string }[]>([]);
  const [formRunnerUp, setFormRunnerUp] = useState<{ id: string; name: string; logo?: string } | undefined>();
  const [formCoRunnerUps, setFormCoRunnerUps] = useState<{ id: string; name: string; logo?: string }[]>([]);
  const [formFinalScore, setFormFinalScore] = useState("");
  const [formPoints, setFormPoints] = useState("");
  const [teamPickerOpen, setTeamPickerOpen] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<"main" | "co" | "vice" | "covice">("main");
  const [teamSearch, setTeamSearch] = useState("");
  const [useHistorical, setUseHistorical] = useState(true);

  const titlesRef = useRef<HTMLDivElement>(null);
  const rankingRef = useRef<HTMLDivElement>(null);

  const editable = !!onUpdateSeasons;
  const sorted = [...seasons].sort((a, b) => b.year - a.year);

  const getTeamById = (id: string) => teams?.find((t) => t.id === id);

  /** Resolves a champion entry using the club identity of that specific year. */
  const resolveChampion = (
    year: number,
    id: string,
    storedName: string,
    storedLogo?: string
  ): ChampionEntry => {
    const team = getTeamById(id);
    if (!team) return { id, name: storedName, logo: storedLogo };
    const hist = useHistorical ? resolveTeamForYear(team, year, teamHistories) : null;
    return {
      id,
      // A manually typed name always wins over the resolved one
      name: storedName && storedName !== team.name ? storedName : hist?.name || team.name,
      logo: storedLogo && storedLogo !== team.logo ? storedLogo : hist?.logo || team.logo,
      colors: hist?.colors || team.colors,
    };
  };

  const championsOf = (season: SeasonRecord): ChampionEntry[] => [
    resolveChampion(season.year, season.championId, season.championName, season.championLogo),
    ...((season.coChampions || []).map((c) => resolveChampion(season.year, c.id, c.name, c.logo))),
  ];

  const topChampions = useMemo(() => {
    const counts: Record<string, { name: string; logo?: string; titles: number; years: number[] }> = {};
    for (const s of seasons) {
      for (const ch of championsOf(s)) {
        const key = ch.id || ch.name;
        if (!counts[key]) counts[key] = { name: ch.name, logo: ch.logo, titles: 0, years: [] };
        counts[key].titles++;
        counts[key].years.push(s.year);
        if (ch.logo) counts[key].logo = ch.logo;
        counts[key].name = ch.name;
      }
    }
    return Object.values(counts).sort((a, b) => b.titles - a.titles || a.name.localeCompare(b.name));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seasons, teams, teamHistories, useHistorical]);

  const filteredTeams = (teams || [])
    .filter((t) => !t.isArchived)
    .filter(
      (t) =>
        t.name.toLowerCase().includes(teamSearch.toLowerCase()) ||
        t.shortName?.toLowerCase().includes(teamSearch.toLowerCase())
    )
    .sort((a, b) => a.name.localeCompare(b.name));

  const handleSelectTeam = (team: Team) => {
    const ref = { id: team.id, name: team.name, logo: team.logo };
    if (pickerTarget === "co") {
      setFormCoChampions((prev) =>
        prev.some((c) => c.id === team.id) ? prev : [...prev, ref]
      );
    } else if (pickerTarget === "vice") {
      setFormRunnerUp(ref);
    } else if (pickerTarget === "covice") {
      setFormCoRunnerUps((prev) => (prev.some((c) => c.id === team.id) ? prev : [...prev, ref]));
    } else {
      setFormTeamId(team.id);
      setFormName(team.name);
      setFormLogo(team.logo);
    }
    setTeamPickerOpen(false);
    setTeamSearch("");
  };

  const openPicker = (target: "main" | "co" | "vice" | "covice") => {
    setPickerTarget(target);
    setTeamPickerOpen(true);
  };

  const handleAdd = () => {
    if (!onUpdateSeasons || !formYear || !formName) return;
    const year = parseInt(formYear);
    if (isNaN(year)) return;
    if (seasons.some((s) => s.year === year)) return;
    const newSeason: SeasonRecord = {
      year,
      championId: formTeamId || `manual-${year}`,
      championName: formName,
      championLogo: formLogo,
      coChampions: formCoChampions.length ? formCoChampions : undefined,
      runnerUp: formRunnerUp,
      coRunnerUps: formCoRunnerUps.length ? formCoRunnerUps : undefined,
      finalScore: formFinalScore.trim() || undefined,
      championPoints: formPoints.trim() ? parseInt(formPoints) : undefined,
      standings: [],
      manual: true,
    };
    onUpdateSeasons([...seasons, newSeason]);
    resetForm();
  };

  const handleEdit = (oldYear: number) => {
    if (!onUpdateSeasons || !formName) return;
    const year = parseInt(formYear);
    if (isNaN(year)) return;
    const updated = seasons.map((s) => {
      if (s.year !== oldYear) return s;
      return {
        ...s,
        year,
        championId: formTeamId || s.championId,
        championName: formName,
        championLogo: formLogo ?? s.championLogo,
        coChampions: formCoChampions.length ? formCoChampions : undefined,
        runnerUp: formRunnerUp,
        coRunnerUps: formCoRunnerUps.length ? formCoRunnerUps : undefined,
        finalScore: formFinalScore.trim() || undefined,
        championPoints: formPoints.trim() ? parseInt(formPoints) : undefined,
      };
    });
    onUpdateSeasons(updated);
    resetForm();
  };

  const handleDelete = (year: number) => {
    if (!onUpdateSeasons) return;
    onUpdateSeasons(seasons.filter((s) => s.year !== year));
  };

  const startEdit = (season: SeasonRecord) => {
    setEditingYear(season.year);
    setFormYear(String(season.year));
    setFormName(season.championName);
    setFormTeamId(season.championId);
    setFormLogo(season.championLogo);
    setFormCoChampions(season.coChampions || []);
    setFormRunnerUp(season.runnerUp);
    setFormCoRunnerUps(season.coRunnerUps || []);
    setFormFinalScore(season.finalScore || "");
    setFormPoints(season.championPoints != null ? String(season.championPoints) : "");
    setAdding(false);
  };

  const startAdd = () => {
    setAdding(true);
    setEditingYear(null);
    resetFormFields();
  };

  const resetFormFields = () => {
    setFormYear("");
    setFormName("");
    setFormTeamId("");
    setFormLogo(undefined);
    setFormCoChampions([]);
    setFormRunnerUp(undefined);
    setFormCoRunnerUps([]);
    setFormFinalScore("");
    setFormPoints("");
  };

  const resetForm = () => {
    setAdding(false);
    setEditingYear(null);
    resetFormFields();
  };

  if (seasons.length === 0 && !editable) {
    return (
      <div className="text-center py-12">
        <Trophy className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">Nenhuma temporada finalizada ainda</p>
        <p className="text-xs text-muted-foreground mt-1">Finalize uma temporada para registrar o campeão</p>
      </div>
    );
  }

  const renderTeamPicker = () => (
    <Dialog open={teamPickerOpen} onOpenChange={setTeamPickerOpen}>
      <DialogContent className="max-w-sm p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="text-sm font-bold">
            {pickerTarget === "co"
              ? "Adicionar co-campeão"
              : pickerTarget === "vice"
                ? "Selecionar vice-campeão"
                : pickerTarget === "covice"
                  ? "Adicionar co-vice"
                  : "Selecionar Time"}
          </DialogTitle>
        </DialogHeader>
        <div className="px-4 pb-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar time..."
              value={teamSearch}
              onChange={(e) => setTeamSearch(e.target.value)}
              className="h-8 text-xs pl-8"
              autoFocus
            />
          </div>
        </div>
        <div className="max-h-60 overflow-y-auto px-2 pb-3">
          {filteredTeams.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">Nenhum time encontrado</p>
          ) : (
            <div className="space-y-0.5">
              {filteredTeams.map((t) => (
                <button
                  key={t.id}
                  onClick={() => handleSelectTeam(t)}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-secondary/50 transition-colors text-left"
                >
                  <div className="w-6 h-6 flex items-center justify-center shrink-0">
                    {t.logo ? (
                      <img src={t.logo} alt="" className="w-6 h-6 object-contain" />
                    ) : (
                      <Shield className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{t.name}</p>
                    {t.shortName && <p className="text-[10px] text-muted-foreground truncate">{t.shortName}</p>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );

  const renderForm = (onSubmit: () => void) => (
    <div className="flex flex-col gap-2 p-3 rounded-xl bg-secondary/30 border border-primary/30">
      <div className="flex items-center gap-2">
        <Input
          type="number"
          placeholder="Ano"
          value={formYear}
          onChange={(e) => setFormYear(e.target.value)}
          className="w-20 h-8 text-xs"
        />
        <button
          type="button"
          onClick={() => openPicker("main")}
          className="flex items-center gap-2 flex-1 h-8 px-2.5 rounded-md border border-border bg-background text-xs hover:border-primary/40 transition-colors min-w-0"
        >
          {formLogo ? (
            <img src={formLogo} alt="" className="w-4 h-4 object-contain shrink-0" />
          ) : formTeamId ? (
            <Shield className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          ) : null}
          <span className={`truncate ${formName ? "text-foreground" : "text-muted-foreground"}`}>
            {formName || "Selecionar time..."}
          </span>
        </button>
        <button onClick={onSubmit} className="p-1.5 text-primary hover:text-primary/80">
          <Check className="w-4 h-4" />
        </button>
        <button onClick={resetForm} className="p-1.5 text-destructive hover:text-destructive/80">
          <X className="w-4 h-4" />
        </button>
      </div>
      {formTeamId && (
        <Input
          placeholder="Nome personalizado"
          value={formName}
          onChange={(e) => setFormName(e.target.value)}
          className="h-8 text-xs"
        />
      )}

      {/* Shared titles */}
      <div className="flex flex-wrap items-center gap-1.5">
        {formCoChampions.map((c) => (
          <span
            key={c.id}
            className="flex items-center gap-1.5 pl-1.5 pr-1 py-1 rounded-md bg-background border border-border text-[11px]"
          >
            {c.logo ? <img src={c.logo} alt="" className="w-3.5 h-3.5 object-contain" /> : <Shield className="w-3 h-3" />}
            <span className="truncate max-w-[110px]">{c.name}</span>
            <button
              onClick={() => setFormCoChampions((prev) => prev.filter((x) => x.id !== c.id))}
              className="text-muted-foreground hover:text-destructive"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        <button
          type="button"
          onClick={() => openPicker("co")}
          className="flex items-center gap-1 px-2 py-1 rounded-md border border-dashed border-border text-[11px] text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors"
        >
          <Plus className="w-3 h-3" />
          Adicionar co-campeão
        </button>
      </div>

      {/* Runner-up */}
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => openPicker("vice")}
          className="flex items-center gap-1.5 px-2 py-1 rounded-md border border-dashed border-border text-[11px] text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors"
        >
          <Medal className="w-3 h-3" />
          {formRunnerUp ? formRunnerUp.name : "Definir vice-campeão"}
        </button>
        {formRunnerUp && (
          <button
            onClick={() => setFormRunnerUp(undefined)}
            className="text-muted-foreground hover:text-destructive"
            type="button"
          >
            <X className="w-3 h-3" />
          </button>
        )}
        {formCoRunnerUps.map((c) => (
          <span
            key={c.id}
            className="flex items-center gap-1.5 pl-1.5 pr-1 py-1 rounded-md bg-background border border-border text-[11px]"
          >
            {c.logo ? <img src={c.logo} alt="" className="w-3.5 h-3.5 object-contain" /> : <Shield className="w-3 h-3" />}
            <span className="truncate max-w-[110px]">{c.name}</span>
            <button
              onClick={() => setFormCoRunnerUps((prev) => prev.filter((x) => x.id !== c.id))}
              className="text-muted-foreground hover:text-destructive"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        {formRunnerUp && (
          <button
            type="button"
            onClick={() => openPicker("covice")}
            className="flex items-center gap-1 px-2 py-1 rounded-md border border-dashed border-border text-[11px] text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors"
          >
            <Plus className="w-3 h-3" />
            Co-vice
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Input
          placeholder="Placar da final (ex: 2 x 1)"
          value={formFinalScore}
          onChange={(e) => setFormFinalScore(e.target.value)}
          className="h-8 text-xs flex-1"
        />
        <Input
          type="number"
          placeholder="Pontos"
          value={formPoints}
          onChange={(e) => setFormPoints(e.target.value)}
          className="h-8 text-xs w-24"
        />
      </div>
    </div>
  );

  const renderSeasonRow = (season: SeasonRecord) => {
    const champs = championsOf(season);
    const style =
      champs.length > 1
        ? splitChampionStyle(champs.map((c) => c.colors))
        : championBoxStyle(champs[0]?.colors);

    return (
      <div
        key={season.year}
        style={style?.container}
        className="flex flex-wrap items-center gap-x-3 gap-y-2 p-3 rounded-xl bg-secondary/30 border border-border hover:border-primary/30 transition-colors group"
      >
        <Trophy className="w-4 h-4 text-primary shrink-0" style={style?.text} />
        <span className="text-xs font-bold text-muted-foreground min-w-[40px]" style={style?.subtleText}>
          {season.year}
        </span>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 flex-1 min-w-0">
          {champs.map((ch, idx) => (
            <div key={`${ch.id}-${idx}`} className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 flex items-center justify-center shrink-0">
                {ch.logo ? (
                  <img src={ch.logo} alt="" className="w-7 h-7 object-contain" />
                ) : (
                  <Shield className="w-4 h-4 text-muted-foreground" style={style?.subtleText} />
                )}
              </div>
              <span className="text-sm font-bold text-foreground truncate" style={style?.text}>
                {ch.name}
              </span>
            </div>
          ))}
          {champs.length > 1 && (
            <span
              className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded"
              style={style?.accent}
            >
              Título compartilhado
            </span>
          )}
        </div>
        {editable && (
          <div
            data-photo-control="true"
            className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <button onClick={() => startEdit(season)} className="p-1 text-muted-foreground hover:text-foreground">
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => handleDelete(season.year)} className="p-1 text-muted-foreground hover:text-destructive">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-2">
      {renderTeamPicker()}

      <div className="flex items-center justify-end gap-2 px-1" data-photo-control="true">
        <History className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Usar versões históricas dos clubes</span>
        <Switch checked={useHistorical} onCheckedChange={setUseHistorical} />
      </div>

      <Tabs defaultValue="titles" className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="titles" className="flex-1 gap-1.5 text-xs">
            <Trophy className="w-3.5 h-3.5" />
            Títulos por Ano
          </TabsTrigger>
          <TabsTrigger value="ranking" className="flex-1 gap-1.5 text-xs">
            <Crown className="w-3.5 h-3.5" />
            Maiores Campeões
          </TabsTrigger>
        </TabsList>

        <TabsContent value="titles" className="space-y-2">
          <div className="flex justify-end" data-photo-control="true">
            <ScreenshotButton
              targetRef={titlesRef as any}
              filename="sala-de-trofeus.png"
              title={tournamentName}
              subtitle="Campeões por ano"
              discrete
            />
          </div>

          {editable && !adding && (
            <button
              onClick={startAdd}
              data-photo-control="true"
              className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl border border-dashed border-border hover:border-primary/30 text-muted-foreground hover:text-primary transition-colors text-xs font-medium"
            >
              <Plus className="w-3.5 h-3.5" />
              Adicionar Campeão
            </button>
          )}

          {adding && renderForm(handleAdd)}

          <div ref={titlesRef} data-photo-layout="gallery" className="space-y-2">
            {sorted.map((season) =>
              editingYear === season.year ? (
                <div key={season.year}>{renderForm(() => handleEdit(season.year))}</div>
              ) : (
                renderSeasonRow(season)
              )
            )}
          </div>

          {seasons.length === 0 && editable && !adding && (
            <div className="text-center py-8">
              <Trophy className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Nenhum campeão registrado</p>
              <p className="text-xs text-muted-foreground mt-1">Clique em "Adicionar Campeão" para registrar manualmente</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="ranking" className="space-y-2">
          {topChampions.length > 0 ? (
            <>
              <div className="flex justify-end" data-photo-control="true">
                <ScreenshotButton
                  targetRef={rankingRef as any}
                  filename="maiores-campeoes.png"
                  title={tournamentName}
                  subtitle="Maiores campeões"
                  discrete
                />
              </div>
              <div
                ref={rankingRef}
                data-photo-layout="gallery"
                className="p-4 rounded-xl bg-secondary/20 border border-border"
              >
                <div className="space-y-1.5">
                  {topChampions.map((ch, i) => (
                    <div
                      key={ch.name}
                      className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-secondary/40 transition-colors"
                    >
                      <span className={`text-xs font-bold min-w-[20px] text-center ${i === 0 ? "text-primary" : "text-muted-foreground"}`}>
                        {i + 1}º
                      </span>
                      <div className="w-6 h-6 flex items-center justify-center shrink-0">
                        {ch.logo ? (
                          <img src={ch.logo} alt="" className="w-6 h-6 object-contain" />
                        ) : (
                          <Shield className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                      <span className={`text-xs font-bold truncate flex-1 ${i === 0 ? "text-foreground" : "text-foreground/80"}`}>
                        {ch.name}
                      </span>
                      <span className="text-xs font-bold text-primary">{ch.titles}×</span>
                      <span className="text-[10px] text-muted-foreground hidden sm:inline truncate max-w-[120px]">
                        {ch.years.sort((a, b) => a - b).join(", ")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <Crown className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Nenhum campeão registrado</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
