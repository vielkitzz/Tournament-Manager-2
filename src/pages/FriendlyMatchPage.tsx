import { useState, useMemo } from "react";
import { Shield, Swords, RotateCcw, Search, FolderOpen, ChevronRight, ChevronUp, ChevronDown, Play } from "lucide-react";
import { useTournamentStore } from "@/store/tournamentStore";
import { Team } from "@/types/tournament";
import { simulateHalf } from "@/lib/simulation";

type HalfKey = "h1" | "h2";

function simulatePenaltyKick(): boolean {
  return Math.random() < 0.75;
}

export default function FriendlyMatchPage() {
  const { teams, folders } = useTournamentStore();
  const [searchHome, setSearchHome] = useState("");
  const [searchAway, setSearchAway] = useState("");
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(() => new Set(folders.map(f => f.id)));
  const [homeTeam, setHomeTeam] = useState<Team | null>(null);
  const [awayTeam, setAwayTeam] = useState<Team | null>(null);
  const [started, setStarted] = useState(false);
  const [scores, setScores] = useState<Record<HalfKey, [number, number]>>({ h1: [0, 0], h2: [0, 0] });
  const [activeHalf, setActiveHalf] = useState<HalfKey>("h1");
  const [simulatedHalves, setSimulatedHalves] = useState<Set<HalfKey>>(new Set());
  const [finished, setFinished] = useState(false);

  // Penalties
  const [showPenalties, setShowPenalties] = useState(false);
  const [penalties, setPenalties] = useState<{ home: boolean[]; away: boolean[] }>({ home: [], away: [] });
  const [penaltyIndex, setPenaltyIndex] = useState(0);
  const [penaltyFinished, setPenaltyFinished] = useState(false);
  const [usePenalties, setUsePenalties] = useState(false);

  const totalHome = scores.h1[0] + scores.h2[0];
  const totalAway = scores.h1[1] + scores.h2[1];

  const halvesOrder: HalfKey[] = ["h1", "h2"];
  const activeIndex = halvesOrder.indexOf(activeHalf);
  const accumulatedHome = halvesOrder.slice(0, activeIndex + 1).reduce((sum, k) => sum + scores[k][0], 0);
  const accumulatedAway = halvesOrder.slice(0, activeIndex + 1).reduce((sum, k) => sum + scores[k][1], 0);

  const penaltyScore = (side: "home" | "away") => penalties[side].filter(Boolean).length;

  const setHalfScore = (half: HalfKey, side: 0 | 1, value: number) => {
    setScores((prev) => ({
      ...prev,
      [half]: side === 0 ? [value, prev[half][1]] : [prev[half][0], value],
    }));
  };

  const increment = (side: 0 | 1) => setHalfScore(activeHalf, side, scores[activeHalf][side] + 1);
  const decrement = (side: 0 | 1) => setHalfScore(activeHalf, side, Math.max(0, scores[activeHalf][side] - 1));

  const handleSimulate = () => {
    const homeRate = homeTeam?.rate || 3;
    const awayRate = awayTeam?.rate || 3;
    const [h, a] = simulateHalf(homeRate, awayRate);
    setHalfScore(activeHalf, 0, h);
    setHalfScore(activeHalf, 1, a);
    setSimulatedHalves((prev) => new Set(prev).add(activeHalf));
    if (activeHalf === "h1") setActiveHalf("h2");
  };

  const canSimulate = !showPenalties && !simulatedHalves.has(activeHalf) && !finished;

  const handleFinish = () => {
    if (usePenalties && totalHome === totalAway && !showPenalties) {
      setShowPenalties(true);
      return;
    }
    setFinished(true);
  };

  const handleShootPenalty = () => {
    if (penaltyFinished) return;
    const isHome = penaltyIndex % 2 === 0;
    const side = isHome ? "home" : "away";
    const result = simulatePenaltyKick();
    setPenalties((prev) => ({ ...prev, [side]: [...prev[side], result] }));
    setPenaltyIndex((i) => i + 1);
  };

  // Check penalty resolution
  const homeP = penaltyScore("home");
  const awayP = penaltyScore("away");
  const hKicks = penalties.home.length;
  const aKicks = penalties.away.length;
  if (showPenalties && !penaltyFinished && hKicks === aKicks && hKicks >= 5 && homeP !== awayP) {
    setPenaltyFinished(true);
  }
  if (showPenalties && !penaltyFinished && hKicks === aKicks && hKicks >= 1 && hKicks <= 5) {
    const remH = Math.max(5 - hKicks, 0);
    const remA = Math.max(5 - aKicks, 0);
    if (homeP + remH < awayP || awayP + remA < homeP) {
      setPenaltyFinished(true);
    }
  }

  const handleReset = () => {
    setHomeTeam(null);
    setAwayTeam(null);
    setStarted(false);
    setScores({ h1: [0, 0], h2: [0, 0] });
    setActiveHalf("h1");
    setSimulatedHalves(new Set());
    setFinished(false);
    setShowPenalties(false);
    setPenalties({ home: [], away: [] });
    setPenaltyIndex(0);
    setPenaltyFinished(false);
    setUsePenalties(false);
  };

  const allSimulated = simulatedHalves.has("h1") && simulatedHalves.has("h2");

  const toggleFolder = (id: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const renderTeamButton = (t: Team, selected: Team | null, onSelect: (t: Team) => void) => (
    <button
      key={t.id}
      onClick={() => onSelect(t)}
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
        selected?.id === t.id
          ? "bg-primary/20 text-primary border border-primary/30"
          : "text-foreground hover:bg-secondary border border-transparent"
      }`}
    >
      <div className="w-6 h-6 flex items-center justify-center shrink-0">
        {t.logo ? (
          <img src={t.logo} alt="" className="w-6 h-6 object-contain" />
        ) : (
          <Shield className="w-4 h-4 text-muted-foreground" />
        )}
      </div>
      <span className="font-medium truncate text-xs">{t.name}</span>
      <span className="ml-auto text-[10px] text-muted-foreground font-mono">{t.rate.toFixed(1)}</span>
    </button>
  );

  const renderTeamList = (
    excludeId: string | undefined,
    search: string,
    selected: Team | null,
    onSelect: (t: Team) => void
  ) => {
    const filtered = teams
      .filter((t) => t.id !== excludeId)
      .filter((t) => t.name.toLowerCase().includes(search.toLowerCase()));

    if (filtered.length === 0) {
      return <p className="text-sm text-muted-foreground text-center py-8">Nenhum time encontrado</p>;
    }

    // When searching, show flat list without folders
    if (search.trim()) {
      return (
        <>
          {filtered.map((t) => renderTeamButton(t, selected, onSelect))}
        </>
      );
    }

    const rootFolders = folders.filter((f) => !f.parentId);
    const looseteams = filtered.filter((t) => !t.folderId);
    const folderTeams = (fId: string) => filtered.filter((t) => t.folderId === fId);
    const allFolderTeams = (fId: string): boolean => {
      if (folderTeams(fId).length > 0) return true;
      return folders.filter(f => f.parentId === fId).some(child => allFolderTeams(child.id));
    };

    const renderFolder = (folder: typeof folders[0], depth: number = 0) => {
      const childFolders = folders.filter(f => f.parentId === folder.id);
      const hasContent = allFolderTeams(folder.id);
      if (!hasContent) return null;

      return (
        <div key={folder.id}>
          <button
            onClick={() => toggleFolder(folder.id)}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
            style={{ paddingLeft: `${12 + depth * 16}px` }}
          >
            <ChevronRight className={`w-3 h-3 transition-transform ${expandedFolders.has(folder.id) ? "rotate-90" : ""}`} />
            <FolderOpen className="w-3 h-3" />
            <span>{folder.name}</span>
            <span className="ml-auto text-[10px] font-mono">{folderTeams(folder.id).length}</span>
          </button>
          {expandedFolders.has(folder.id) && (
            <div className="space-y-0.5" style={{ marginLeft: `${12 + depth * 8}px` }}>
              {folderTeams(folder.id).map((t) => renderTeamButton(t, selected, onSelect))}
              {childFolders.map((cf) => renderFolder(cf, depth + 1))}
            </div>
          )}
        </div>
      );
    };

    return (
      <>
        {rootFolders.filter(f => allFolderTeams(f.id)).map((folder) => renderFolder(folder))}
        {looseteams.length > 0 && rootFolders.length > 0 && (
          <p className="px-3 pt-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Sem pasta</p>
        )}
        {looseteams.map((t) => renderTeamButton(t, selected, onSelect))}
      </>
    );
  };

  // Team selector
  if (!started) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 px-4">
        <div className="text-center space-y-1">
          <Swords className="w-8 h-8 text-primary mx-auto" />
          <h1 className="text-xl font-display font-bold text-foreground">Amistoso</h1>
          <p className="text-xs text-muted-foreground">Selecione dois times para simular uma partida</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Home */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <p className="text-xs font-semibold text-foreground uppercase tracking-wider">Mandante</p>
            </div>
            {homeTeam && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/10 border border-primary/20">
                <div className="w-8 h-8 flex items-center justify-center shrink-0">
                  {homeTeam.logo ? <img src={homeTeam.logo} alt="" className="w-8 h-8 object-contain" /> : <Shield className="w-5 h-5 text-muted-foreground" />}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-foreground truncate">{homeTeam.name}</p>
                  <p className="text-[10px] text-primary font-mono">{homeTeam.rate.toFixed(2)}</p>
                </div>
                <button onClick={() => setHomeTeam(null)} className="ml-auto text-xs text-muted-foreground hover:text-foreground">✕</button>
              </div>
            )}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                type="text"
                value={searchHome}
                onChange={(e) => setSearchHome(e.target.value)}
                placeholder="Buscar time..."
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-secondary border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="space-y-0.5 max-h-[40vh] overflow-y-auto">
              {renderTeamList(awayTeam?.id, searchHome, homeTeam, setHomeTeam)}
            </div>
          </div>

          {/* Away */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-accent" />
              <p className="text-xs font-semibold text-foreground uppercase tracking-wider">Visitante</p>
            </div>
            {awayTeam && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/10 border border-accent/20">
                <div className="w-8 h-8 flex items-center justify-center shrink-0">
                  {awayTeam.logo ? <img src={awayTeam.logo} alt="" className="w-8 h-8 object-contain" /> : <Shield className="w-5 h-5 text-muted-foreground" />}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-foreground truncate">{awayTeam.name}</p>
                  <p className="text-[10px] text-accent font-mono">{awayTeam.rate.toFixed(2)}</p>
                </div>
                <button onClick={() => setAwayTeam(null)} className="ml-auto text-xs text-muted-foreground hover:text-foreground">✕</button>
              </div>
            )}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                type="text"
                value={searchAway}
                onChange={(e) => setSearchAway(e.target.value)}
                placeholder="Buscar time..."
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-secondary border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="space-y-0.5 max-h-[40vh] overflow-y-auto">
              {renderTeamList(homeTeam?.id, searchAway, awayTeam, setAwayTeam)}
            </div>
          </div>
        </div>

        {/* Penalty toggle + Start */}
        <div className="flex flex-col items-center gap-3">
          {homeTeam && awayTeam && (
            <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={usePenalties}
                onChange={(e) => setUsePenalties(e.target.checked)}
                className="accent-primary w-3.5 h-3.5"
              />
              Pênaltis em caso de empate
            </label>
          )}
          <button
            onClick={() => homeTeam && awayTeam && setStarted(true)}
            disabled={!homeTeam || !awayTeam}
            className="px-8 py-2.5 rounded-xl bg-primary text-primary-foreground font-display font-bold text-sm hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Iniciar Partida
          </button>
        </div>
      </div>
    );
  }

  // Match simulation view
  return (
    <div className="max-w-lg mx-auto space-y-4 px-4">
      {/* Header */}
      <div className="rounded-xl bg-card border border-border shadow-lg overflow-hidden">
        {/* Teams header */}
        <div className="bg-secondary/50 border-b border-border px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              <div className="w-10 h-10 flex items-center justify-center shrink-0">
                {homeTeam?.logo ? (
                  <img src={homeTeam.logo} alt="" className="w-10 h-10 object-contain" />
                ) : (
                  <Shield className="w-6 h-6 text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0">
                <p className="font-display font-bold text-foreground text-xs truncate">{homeTeam?.name}</p>
                <p className="text-[10px] text-primary font-mono">{homeTeam?.rate.toFixed(2)}</p>
              </div>
            </div>
            <span className="text-muted-foreground font-bold text-xs px-3 shrink-0">VS</span>
            <div className="flex items-center gap-2.5 flex-1 justify-end text-right min-w-0">
              <div className="min-w-0">
                <p className="font-display font-bold text-foreground text-xs truncate">{awayTeam?.name}</p>
                <p className="text-[10px] text-primary font-mono">{awayTeam?.rate.toFixed(2)}</p>
              </div>
              <div className="w-10 h-10 flex items-center justify-center shrink-0">
                {awayTeam?.logo ? (
                  <img src={awayTeam.logo} alt="" className="w-10 h-10 object-contain" />
                ) : (
                  <Shield className="w-6 h-6 text-muted-foreground" />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Half tabs */}
        <div className="flex items-center justify-center gap-1.5 py-2 border-b border-border bg-card">
          {(["h1", "h2"] as HalfKey[]).map((k, i) => (
            <button
              key={k}
              onClick={() => !showPenalties && !finished && setActiveHalf(k)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-bold transition-colors ${
                activeHalf === k && !showPenalties
                  ? "border border-primary text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {i === 0 ? "1ºT" : "2ºT"} {scores[k][0]}:{scores[k][1]}
            </button>
          ))}
          {showPenalties && (
            <span className="px-2.5 py-1 rounded-md text-[11px] font-mono font-bold border border-primary text-primary bg-primary/10">
              PEN {penaltyScore("home")}:{penaltyScore("away")}
            </span>
          )}
        </div>

        {/* Score controls */}
        {!showPenalties && !finished && (
          <>
            <div className="flex items-center justify-center gap-3 py-5 px-4">
              <div className="flex flex-col items-center gap-0.5">
                <button onClick={() => increment(0)} className="p-0.5 text-primary hover:text-primary/80 transition-colors">
                  <ChevronUp className="w-6 h-6" strokeWidth={3} />
                </button>
                <button onClick={() => decrement(0)} className="p-0.5 text-destructive hover:text-destructive/80 transition-colors">
                  <ChevronDown className="w-6 h-6" strokeWidth={3} />
                </button>
              </div>
              <div className="w-20 h-20 rounded-xl bg-secondary border border-border flex items-center justify-center">
                <span className="text-4xl font-bold text-foreground font-display">{accumulatedHome}</span>
              </div>
              <span className="text-muted-foreground font-bold text-lg">×</span>
              <div className="w-20 h-20 rounded-xl bg-secondary border border-border flex items-center justify-center">
                <span className="text-4xl font-bold text-foreground font-display">{accumulatedAway}</span>
              </div>
              <div className="flex flex-col items-center gap-0.5">
                <button onClick={() => increment(1)} className="p-0.5 text-primary hover:text-primary/80 transition-colors">
                  <ChevronUp className="w-6 h-6" strokeWidth={3} />
                </button>
                <button onClick={() => decrement(1)} className="p-0.5 text-destructive hover:text-destructive/80 transition-colors">
                  <ChevronDown className="w-6 h-6" strokeWidth={3} />
                </button>
              </div>
            </div>

            {canSimulate && (
              <div className="px-4 pb-3">
                <button
                  onClick={handleSimulate}
                  className="w-full py-2.5 rounded-lg bg-primary/15 text-primary font-display font-bold text-sm hover:bg-primary/25 transition-colors border border-primary/20"
                >
                  Simular {activeHalf === "h1" ? "1ºT" : "2ºT"}
                </button>
              </div>
            )}
          </>
        )}

        {/* Penalties */}
        {showPenalties && !finished && (
          <div className="px-4 py-4 space-y-3">
            <p className="text-xs font-display font-bold text-foreground text-center">Disputa de Pênaltis</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2 justify-center">
                <span className="text-[10px] text-muted-foreground w-14 text-right truncate">{homeTeam?.abbreviation || homeTeam?.shortName}</span>
                <div className="flex gap-1 min-w-[120px]">
                  {penalties.home.map((p, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setPenalties((prev) => {
                          const arr = [...prev.home];
                          arr[i] = !arr[i];
                          return { ...prev, home: arr };
                        });
                      }}
                      className={`w-6 h-6 rounded-full border-2 transition-all text-[10px] font-bold ${
                        p ? "bg-primary border-primary text-primary-foreground" : "bg-destructive border-destructive text-destructive-foreground"
                      }`}
                    >
                      {p ? "✓" : "✗"}
                    </button>
                  ))}
                </div>
                <span className="text-sm font-bold text-foreground w-6 text-center">{penaltyScore("home")}</span>
              </div>
              <div className="flex items-center gap-2 justify-center">
                <span className="text-[10px] text-muted-foreground w-14 text-right truncate">{awayTeam?.abbreviation || awayTeam?.shortName}</span>
                <div className="flex gap-1 min-w-[120px]">
                  {penalties.away.map((p, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setPenalties((prev) => {
                          const arr = [...prev.away];
                          arr[i] = !arr[i];
                          return { ...prev, away: arr };
                        });
                      }}
                      className={`w-6 h-6 rounded-full border-2 transition-all text-[10px] font-bold ${
                        p ? "bg-primary border-primary text-primary-foreground" : "bg-destructive border-destructive text-destructive-foreground"
                      }`}
                    >
                      {p ? "✓" : "✗"}
                    </button>
                  ))}
                </div>
                <span className="text-sm font-bold text-foreground w-6 text-center">{penaltyScore("away")}</span>
              </div>
            </div>
            {!penaltyFinished && (
              <div className="flex justify-center">
                <button
                  onClick={handleShootPenalty}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-display font-bold text-xs hover:bg-primary/90 transition-colors"
                >
                  <Play className="w-3.5 h-3.5" />
                  Cobrar ({penaltyIndex % 2 === 0 ? homeTeam?.abbreviation || "Casa" : awayTeam?.abbreviation || "Fora"})
                </button>
              </div>
            )}
            {penaltyFinished && (
              <p className="text-xs text-center text-primary font-bold">
                {homeP > awayP ? `${homeTeam?.name} vence nos pênaltis!` : `${awayTeam?.name} vence nos pênaltis!`}
              </p>
            )}
          </div>
        )}

        {/* Result */}
        {finished && (
          <div className="px-4 py-6 text-center space-y-1.5">
            <p className="text-3xl font-display font-bold text-foreground">
              {totalHome} × {totalAway}
            </p>
            {showPenalties && penaltyFinished && (
              <p className="text-xs text-primary font-bold">
                ({penaltyScore("home")} × {penaltyScore("away")} nos pênaltis)
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              {totalHome > totalAway
                ? `${homeTeam?.name} venceu!`
                : totalAway > totalHome
                ? `${awayTeam?.name} venceu!`
                : showPenalties && penaltyFinished
                ? homeP > awayP
                  ? `${homeTeam?.name} venceu nos pênaltis!`
                  : `${awayTeam?.name} venceu nos pênaltis!`
                : "Empate!"}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="px-4 pb-4 flex gap-2 justify-center">
          {!finished && allSimulated && !showPenalties && (
            <button
              onClick={handleFinish}
              className="px-5 py-2 rounded-lg bg-primary text-primary-foreground font-display font-bold text-sm hover:bg-primary/90 transition-colors"
            >
              Finalizar
            </button>
          )}
          {!finished && showPenalties && penaltyFinished && (
            <button
              onClick={() => setFinished(true)}
              className="px-5 py-2 rounded-lg bg-primary text-primary-foreground font-display font-bold text-sm hover:bg-primary/90 transition-colors"
            >
              Finalizar
            </button>
          )}
          {finished && (
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-secondary text-foreground font-display font-bold text-sm hover:bg-secondary/80 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Novo Amistoso
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
