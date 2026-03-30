import { useState, DragEvent, useMemo, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Shield, Plus, X, Trophy, Folder, FolderOpen, ChevronRight, GripVertical, Search } from "lucide-react";
import { useTournamentStore } from "@/store/tournamentStore";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Team } from "@/types/tournament";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

export default function TournamentTeamsPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const seasonYear = searchParams.get("season") ? parseInt(searchParams.get("season")!) : null;
  const navigate = useNavigate();
  const { tournaments, teams, folders, updateTournament } = useTournamentStore();
  const tournament = tournaments.find((t) => t.id === id);
  const [search, setSearch] = useState("");
  const [openFolders, setOpenFolders] = useState<Set<string>>(() => new Set(folders.map(f => f.id)));
  const [dragOverZone, setDragOverZone] = useState<string | null>(null);
  const [selectedTeams, setSelectedTeams] = useState<Set<string>>(new Set());

  const isEditingPastSeason = seasonYear !== null && tournament && seasonYear !== tournament.year;
  const seasonData = isEditingPastSeason
    ? tournament?.seasons?.find((s) => s.year === seasonYear)
    : null;

  const currentTeamIds = useMemo(() => {
    if (!isEditingPastSeason) return tournament?.teamIds || [];
    if (seasonData?.teamIds) return seasonData.teamIds;
    if (seasonData) {
      const fromStandings = seasonData.standings?.map(s => s.teamId).filter(Boolean) || [];
      if (fromStandings.length > 0) return fromStandings;
      const fromMatches = seasonData.matches
        ? [...new Set(seasonData.matches.flatMap(m => [m.homeTeamId, m.awayTeamId]).filter(Boolean))]
        : [];
      return fromMatches;
    }
    return [];
  }, [isEditingPastSeason, seasonData, tournament?.teamIds]);

  const available = useMemo(() => {
    if (!tournament) return [];
    return teams.filter(
      (t) => !t.isArchived && !currentTeamIds.includes(t.id) &&
        (t.name.toLowerCase().includes(search.toLowerCase()) ||
         t.shortName.toLowerCase().includes(search.toLowerCase()))
    );
  }, [tournament, teams, search, currentTeamIds]);

  // Clear invalid selections when available teams change
  useEffect(() => {
    setSelectedTeams(prev => {
      const validIds = new Set(available.map(t => t.id));
      const next = new Set<string>();
      prev.forEach(id => { if (validIds.has(id)) next.add(id); });
      return next.size === prev.size ? prev : next;
    });
  }, [available]);

  useEffect(() => {
    if (search.trim()) {
      const toOpen = new Set<string>();
      available.forEach((t) => {
        if (t.folderId) {
          toOpen.add(t.folderId);
          let parentId = folders.find(f => f.id === t.folderId)?.parentId;
          while (parentId) {
            toOpen.add(parentId);
            parentId = folders.find(f => f.id === parentId)?.parentId;
          }
        }
      });
      if (toOpen.size > 0) {
        setOpenFolders(prev => {
          const next = new Set(prev);
          toOpen.forEach(id => next.add(id));
          return next;
        });
      }
    }
  }, [search, available, folders]);

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

  const displayYear = seasonYear || tournament.year;

  const updateSeasonTeamIds = (newTeamIds: string[]) => {
    if (isEditingPastSeason) {
      const updatedSeasons = (tournament.seasons || []).map((s) =>
        s.year === seasonYear ? { ...s, teamIds: newTeamIds } : s
      );
      if (!seasonData) {
        updatedSeasons.push({
          year: seasonYear!,
          championId: "",
          championName: "",
          standings: [],
          teamIds: newTeamIds,
        });
      }
      updateTournament(tournament.id, { seasons: updatedSeasons });
    } else {
      updateTournament(tournament.id, { teamIds: newTeamIds });
    }
  };

  const toggleFolder = (fid: string) => {
    setOpenFolders((prev) => {
      const next = new Set(prev);
      next.has(fid) ? next.delete(fid) : next.add(fid);
      return next;
    });
  };

  const addTeamToTournament = (teamId: string, teamName: string) => {
    updateSeasonTeamIds([...currentTeamIds, teamId]);
    toast.success(`"${teamName}" adicionado`);
  };

  const removeTeamFromTournament = (teamId: string, teamName: string) => {
    updateSeasonTeamIds(currentTeamIds.filter((i) => i !== teamId));
    toast.success(`"${teamName}" removido`);
  };

  const toggleSelectTeam = (teamId: string) => {
    setSelectedTeams(prev => {
      const next = new Set(prev);
      next.has(teamId) ? next.delete(teamId) : next.add(teamId);
      return next;
    });
  };

  const getTeamsInFolder = (folderId: string): Team[] => {
    const direct = available.filter(t => t.folderId === folderId);
    const childFolders = folders.filter(f => f.parentId === folderId);
    const nested = childFolders.flatMap(f => getTeamsInFolder(f.id));
    return [...direct, ...nested];
  };

  const toggleSelectFolder = (folderId: string) => {
    const folderTeams = getTeamsInFolder(folderId);
    const allSelected = folderTeams.every(t => selectedTeams.has(t.id));
    setSelectedTeams(prev => {
      const next = new Set(prev);
      folderTeams.forEach(t => allSelected ? next.delete(t.id) : next.add(t.id));
      return next;
    });
  };

  const toggleSelectAll = () => {
    const allSelected = available.length > 0 && available.every(t => selectedTeams.has(t.id));
    setSelectedTeams(allSelected ? new Set() : new Set(available.map(t => t.id)));
  };

  const addSelectedTeams = () => {
    if (selectedTeams.size === 0) return;
    const newIds = [...currentTeamIds, ...selectedTeams];
    updateSeasonTeamIds(newIds);
    toast.success(`${selectedTeams.size} time(s) adicionado(s)`);
    setSelectedTeams(new Set());
  };

  const handleDragStart = (e: DragEvent, teamId: string) => {
    e.dataTransfer.setData("add-team-id", teamId);
    e.dataTransfer.effectAllowed = "copy";
  };

  const handleDropOnTournament = (e: DragEvent) => {
    e.preventDefault();
    setDragOverZone(null);
    const teamId = e.dataTransfer.getData("add-team-id");
    if (teamId && !currentTeamIds.includes(teamId)) {
      const team = teams.find((t) => t.id === teamId);
      if (team) addTeamToTournament(teamId, team.name);
    }
  };

  const rootFolders = folders.filter((f) => !f.parentId);
  const allSelected = available.length > 0 && available.every(t => selectedTeams.has(t.id));
  const someSelected = available.some(t => selectedTeams.has(t.id));

  const renderAvailableTeam = (team: Team) => (
    <div
      key={team.id}
      draggable
      onDragStart={(e) => handleDragStart(e, team.id)}
      className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-secondary/30 border border-dashed border-border hover:border-primary/40 text-sm transition-all hover:bg-primary/5 cursor-grab active:cursor-grabbing"
    >
      <Checkbox
        checked={selectedTeams.has(team.id)}
        onCheckedChange={() => toggleSelectTeam(team.id)}
        onClick={(e) => e.stopPropagation()}
        className="shrink-0"
      />
      <div className="w-5 h-5 flex items-center justify-center shrink-0">
        {team.logo ? (
          <img src={team.logo} alt="" className="w-5 h-5 object-contain" />
        ) : (
          <Shield className="w-3.5 h-3.5 text-muted-foreground" />
        )}
      </div>
      <span className="text-foreground text-xs truncate flex-1">{team.name}</span>
      <button
        onClick={() => addTeamToTournament(team.id, team.name)}
        className="p-0.5 text-primary hover:text-primary/80"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  );

  const renderFolderTeams = (folderId: string) => {
    const folderTeams = available.filter((t) => t.folderId === folderId);
    const childFolders = folders.filter((f) => f.parentId === folderId);
    
    return (
      <>
        {childFolders.map((child) => {
          const isOpen = openFolders.has(child.id);
          const childAvailable = getTeamsInFolder(child.id);
          const childAllSelected = childAvailable.length > 0 && childAvailable.every(t => selectedTeams.has(t.id));
          const childSomeSelected = childAvailable.some(t => selectedTeams.has(t.id));
          return (
            <div key={child.id} className="ml-2">
              <div
                className="flex items-center gap-1.5 py-1 text-xs text-muted-foreground hover:text-foreground w-full cursor-pointer"
                onClick={() => toggleFolder(child.id)}
              >
                <Checkbox
                  checked={childAllSelected}
                  onCheckedChange={() => toggleSelectFolder(child.id)}
                  onClick={(e) => e.stopPropagation()}
                  className="shrink-0"
                  data-indeterminate={childSomeSelected && !childAllSelected ? "true" : undefined}
                />
                <ChevronRight className={`w-3 h-3 transition-transform ${isOpen ? "rotate-90" : ""}`} />
                <Folder className="w-3 h-3 text-primary" />
                <span className="truncate">{child.name}</span>
                <span className="text-[10px]">({childAvailable.length})</span>
              </div>
              {isOpen && (
                <div className="ml-3 space-y-1 mt-1">
                  {renderFolderTeams(child.id)}
                </div>
              )}
            </div>
          );
        })}
        {folderTeams.map(renderAvailableTeam)}
      </>
    );
  };

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate(`/tournament/${id}`)} className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-xl font-display font-bold text-foreground">Editar Times — {tournament.name}</h1>
          {isEditingPastSeason && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Editando temporada {seasonYear} (histórico isolado)
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-4xl">
        {/* Left: Tournament teams (drop zone) */}
        <div className="space-y-3">
          <Label className="text-sm font-medium text-foreground">
            Times participantes — {displayYear} ({currentTeamIds.length}/{tournament.numberOfTeams})
          </Label>
          <div
            className={`min-h-[200px] rounded-xl border-2 border-dashed p-3 transition-colors ${
              dragOverZone === "tournament" ? "border-primary bg-primary/5" : "border-border"
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragOverZone("tournament"); }}
            onDragLeave={() => setDragOverZone(null)}
            onDrop={handleDropOnTournament}
          >
            {currentTeamIds.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">Arraste times aqui ou clique no +</p>
            ) : (
              <div className="space-y-1">
                {currentTeamIds.map((tid) => {
                  const team = teams.find((t) => t.id === tid);
                  if (!team) return null;
                  return (
                    <ContextMenu key={tid}>
                      <ContextMenuTrigger asChild>
                        <div
                          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/40 border border-border hover:border-primary/30 transition-all cursor-pointer group"
                          onClick={() => navigate(`/teams/create?edit=${tid}`)}
                        >
                          <div className="w-6 h-6 flex items-center justify-center shrink-0">
                            {team.logo ? (
                              <img src={team.logo} alt="" className="w-6 h-6 object-contain" />
                            ) : (
                              <Shield className="w-4 h-4 text-muted-foreground" />
                            )}
                          </div>
                          <span className="text-foreground text-sm font-medium flex-1 truncate">{team.name}</span>
                          <span className="text-[10px] text-muted-foreground font-mono">{(team.rate ?? 0).toFixed(1)}</span>
                          <button
                            onClick={(e) => { e.stopPropagation(); removeTeamFromTournament(tid, team.name); }}
                            className="p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </ContextMenuTrigger>
                      <ContextMenuContent>
                        <ContextMenuItem onClick={() => navigate(`/teams/create?edit=${tid}`)}>
                          <Shield className="w-3.5 h-3.5 mr-2" /> Editar Time
                        </ContextMenuItem>
                        <ContextMenuSeparator />
                        <ContextMenuItem onClick={() => removeTeamFromTournament(tid, team.name)} className="text-destructive focus:text-destructive">
                          <X className="w-3.5 h-3.5 mr-2" /> Remover da Competição
                        </ContextMenuItem>
                      </ContextMenuContent>
                    </ContextMenu>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: Available teams by folder */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Label className="text-sm font-medium text-foreground flex-1">Adicionar times</Label>
            <div className="relative w-40">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
              <Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-7 h-7 text-xs" />
            </div>
          </div>

          {/* Selection controls */}
          {available.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={toggleSelectAll}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={toggleSelectAll}
                  data-indeterminate={someSelected && !allSelected ? "true" : undefined}
                />
                <span>{allSelected ? "Desmarcar todos" : "Selecionar todos"}</span>
              </button>
              {selectedTeams.size > 0 && (
                <button
                  onClick={addSelectedTeams}
                  className="ml-auto flex items-center gap-1 px-2.5 py-1 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  Adicionar {selectedTeams.size}
                </button>
              )}
            </div>
          )}

          <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
            {search.trim() ? (
              <>
                {available.map(renderAvailableTeam)}
                {available.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    Nenhum time encontrado para "{search}"
                  </p>
                )}
              </>
            ) : (
              <>
                {rootFolders.map((folder) => {
                  const isOpen = openFolders.has(folder.id);
                  const folderAvailable = getTeamsInFolder(folder.id);
                  if (folderAvailable.length === 0 && folders.filter((f) => f.parentId === folder.id).length === 0) return null;
                  const folderAllSelected = folderAvailable.length > 0 && folderAvailable.every(t => selectedTeams.has(t.id));
                  const folderSomeSelected = folderAvailable.some(t => selectedTeams.has(t.id));
                  return (
                    <div key={folder.id} className="rounded-lg border border-border overflow-hidden">
                      <div
                        className="flex items-center gap-2 px-3 py-2 bg-secondary/20 w-full cursor-pointer hover:bg-secondary/40 transition-colors"
                        onClick={() => toggleFolder(folder.id)}
                      >
                        <Checkbox
                          checked={folderAllSelected}
                          onCheckedChange={() => toggleSelectFolder(folder.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="shrink-0"
                          data-indeterminate={folderSomeSelected && !folderAllSelected ? "true" : undefined}
                        />
                        <ChevronRight className={`w-3 h-3 text-muted-foreground transition-transform ${isOpen ? "rotate-90" : ""}`} />
                        {isOpen ? <FolderOpen className="w-3.5 h-3.5 text-primary" /> : <Folder className="w-3.5 h-3.5 text-primary" />}
                        <span className="text-xs font-bold text-foreground flex-1 truncate">{folder.name}</span>
                        <span className="text-[10px] text-muted-foreground">{folderAvailable.length}</span>
                      </div>
                      {isOpen && (
                        <div className="p-2 space-y-1">
                          {renderFolderTeams(folder.id)}
                        </div>
                      )}
                    </div>
                  );
                })}

                {available.filter((t) => !t.folderId).map(renderAvailableTeam)}

                {available.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    {teams.length === 0 ? "Nenhum time criado." : "Todos os times já foram adicionados."}
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
