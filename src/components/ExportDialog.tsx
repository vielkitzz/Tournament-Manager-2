import { useState } from "react";
import { Download, Shield, Trophy, Folder, ChevronDown, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useTournamentStore } from "@/store/tournamentStore";
import { toast } from "sonner";

interface Props {
  trigger: React.ReactNode;
}

export default function ExportDialog({ trigger }: Props) {
  const { teams, tournaments, folders } = useTournamentStore();
  const [open, setOpen] = useState(false);

  // Selection state
  const [selectedTeamIds, setSelectedTeamIds] = useState<Set<string>>(new Set());
  const [selectedFolderIds, setSelectedFolderIds] = useState<Set<string>>(new Set());
  const [selectedTournamentIds, setSelectedTournamentIds] = useState<Set<string>>(new Set());
  const [exportWithFolders, setExportWithFolders] = useState(true);

  // Expand/collapse sections
  const [teamsExpanded, setTeamsExpanded] = useState(false);
  const [tournamentsExpanded, setTournamentsExpanded] = useState(false);

  const toggleTeam = (id: string) => {
    setSelectedTeamIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleFolder = (folderId: string) => {
    const folderTeams = teams.filter((t) => t.folderId === folderId);
    setSelectedFolderIds((prev) => {
      const next = new Set(prev);
      next.has(folderId) ? next.delete(folderId) : next.add(folderId);
      return next;
    });
    // Select/deselect all teams in folder
    setSelectedTeamIds((prev) => {
      const next = new Set(prev);
      const allSelected = folderTeams.every((t) => prev.has(t.id));
      folderTeams.forEach((t) => {
        allSelected ? next.delete(t.id) : next.add(t.id);
      });
      return next;
    });
  };

  const selectAllTeams = () => {
    if (selectedTeamIds.size === teams.length) {
      setSelectedTeamIds(new Set());
      setSelectedFolderIds(new Set());
    } else {
      setSelectedTeamIds(new Set(teams.map((t) => t.id)));
      setSelectedFolderIds(new Set(folders.map((f) => f.id)));
    }
  };

  const toggleTournament = (id: string) => {
    setSelectedTournamentIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAllTournaments = () => {
    if (selectedTournamentIds.size === tournaments.length) {
      setSelectedTournamentIds(new Set());
    } else {
      setSelectedTournamentIds(new Set(tournaments.map((t) => t.id)));
    }
  };

  const handleExportSelected = () => {
    const data: any = {};
    const selTeams = teams.filter((t) => selectedTeamIds.has(t.id));
    const selTournaments = tournaments.filter((t) => selectedTournamentIds.has(t.id));

    if (selTeams.length > 0) {
      data.teams = selTeams.map(({ id, ...t }) => t);
      if (exportWithFolders) {
        const usedFolderIds = new Set(selTeams.map((t) => t.folderId).filter(Boolean));
        const relevantFolders = folders.filter((f) => usedFolderIds.has(f.id));
        if (relevantFolders.length > 0) {
          data.folders = relevantFolders.map(({ id, ...f }) => ({ ...f, _originalId: id }));
          data.teams = selTeams.map(({ id, ...t }) => t);
        }
      }
    }
    if (selTournaments.length > 0) {
      data.tournaments = selTournaments.map(({ id, ...t }) => t);
    }

    if (!selTeams.length && !selTournaments.length) {
      toast.error("Selecione pelo menos um item para exportar");
      return;
    }

    data._exportedAt = new Date().toISOString();
    data._version = 1;

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tm2-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exportação concluída!");
    setOpen(false);
  };

  const handleExportAll = () => {
    const data: any = {};
    data.teams = teams.map(({ id, ...t }) => t);
    data.tournaments = tournaments.map(({ id, ...t }) => t);
    if (folders.length > 0) {
      data.folders = folders.map(({ id, ...f }) => ({ ...f, _originalId: id }));
    }
    data._exportedAt = new Date().toISOString();
    data._version = 1;

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tm2-todos-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Tudo exportado!");
    setOpen(false);
  };

  // Group teams by folder for display
  const teamsByFolder = new Map<string, typeof teams>();
  const unfolderedTeams: typeof teams = [];
  teams.forEach((t) => {
    if (t.folderId) {
      const list = teamsByFolder.get(t.folderId) || [];
      list.push(t);
      teamsByFolder.set(t.folderId, list);
    } else {
      unfolderedTeams.push(t);
    }
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Exportar</DialogTitle>
          <DialogDescription>Selecione o que deseja exportar</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Teams Section */}
          <div className="space-y-2">
            <button
              onClick={() => setTeamsExpanded(!teamsExpanded)}
              className="flex items-center gap-2 w-full text-left"
            >
              {teamsExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
              <Shield className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold">Times ({teams.length})</span>
              <button
                onClick={(e) => { e.stopPropagation(); selectAllTeams(); }}
                className="ml-auto text-[11px] text-primary hover:underline"
              >
                {selectedTeamIds.size === teams.length ? "Desmarcar todos" : "Selecionar todos"}
              </button>
            </button>

            {teamsExpanded && (
              <div className="ml-6 space-y-1 max-h-48 overflow-y-auto pr-1">
                {/* Folders with their teams */}
                {folders.map((folder) => {
                  const folderTeams = teamsByFolder.get(folder.id) || [];
                  if (folderTeams.length === 0) return null;
                  const allInFolderSelected = folderTeams.every((t) => selectedTeamIds.has(t.id));
                  return (
                    <div key={folder.id} className="space-y-0.5">
                      <label className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-secondary/50 cursor-pointer">
                        <Checkbox
                          checked={allInFolderSelected}
                          onCheckedChange={() => toggleFolder(folder.id)}
                        />
                        <Folder className="w-3.5 h-3.5 text-primary" />
                        <span className="text-xs font-medium">{folder.name} ({folderTeams.length})</span>
                      </label>
                      <div className="ml-6 space-y-0.5">
                        {folderTeams.map((team) => (
                          <label key={team.id} className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-secondary/50 cursor-pointer">
                            <Checkbox
                              checked={selectedTeamIds.has(team.id)}
                              onCheckedChange={() => toggleTeam(team.id)}
                            />
                            <span className="text-xs truncate">{team.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
                {/* Unfoldered teams */}
                {unfolderedTeams.map((team) => (
                  <label key={team.id} className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-secondary/50 cursor-pointer">
                    <Checkbox
                      checked={selectedTeamIds.has(team.id)}
                      onCheckedChange={() => toggleTeam(team.id)}
                    />
                    <span className="text-xs truncate">{team.name}</span>
                  </label>
                ))}
              </div>
            )}

            {selectedTeamIds.size > 0 && (
              <label className="flex items-center gap-2 ml-6 px-2 py-1 cursor-pointer">
                <Checkbox
                  checked={exportWithFolders}
                  onCheckedChange={(v) => setExportWithFolders(!!v)}
                />
                <span className="text-xs text-muted-foreground">Exportar com pastas</span>
              </label>
            )}
          </div>

          {/* Tournaments Section */}
          <div className="space-y-2">
            <button
              onClick={() => setTournamentsExpanded(!tournamentsExpanded)}
              className="flex items-center gap-2 w-full text-left"
            >
              {tournamentsExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
              <Trophy className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold">Competições ({tournaments.length})</span>
              <button
                onClick={(e) => { e.stopPropagation(); selectAllTournaments(); }}
                className="ml-auto text-[11px] text-primary hover:underline"
              >
                {selectedTournamentIds.size === tournaments.length ? "Desmarcar todas" : "Selecionar todas"}
              </button>
            </button>

            {tournamentsExpanded && (
              <div className="ml-6 space-y-0.5 max-h-48 overflow-y-auto pr-1">
                {tournaments.map((t) => (
                  <label key={t.id} className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-secondary/50 cursor-pointer">
                    <Checkbox
                      checked={selectedTournamentIds.has(t.id)}
                      onCheckedChange={() => toggleTournament(t.id)}
                    />
                    <span className="text-xs truncate">{t.name} ({t.year})</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-2 pt-2 border-t border-border">
            <Button
              onClick={handleExportSelected}
              disabled={selectedTeamIds.size === 0 && selectedTournamentIds.size === 0}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Exportar selecionados ({selectedTeamIds.size + selectedTournamentIds.size})
            </Button>
            <Button
              variant="outline"
              onClick={handleExportAll}
              disabled={teams.length === 0 && tournaments.length === 0}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Exportar tudo
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
