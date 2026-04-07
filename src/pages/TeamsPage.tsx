import { useState, useCallback, DragEvent, useMemo, memo, useEffect } from "react";
import { motion } from "framer-motion";
import FolderBreadcrumb from "@/components/FolderBreadcrumb";
import {
  Shield,
  Plus,
  Pencil,
  Trash2,
  Copy,
  Search,
  FolderPlus,
  Folder,
  FolderOpen,
  ChevronRight,
  GripVertical,
  FolderInput,
  ArrowUp,
  ArrowDown,
  ChevronsDownUp,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { useTournamentStore } from "@/store/tournamentStore";
import { toast } from "sonner";
import { Team, TeamFolder } from "@/types/tournament";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

// 1. Otimização com memo() no TeamCard
const TeamCard = memo(function TeamCard({
  team,
  onEdit,
  onDuplicate,
  onDelete,
  folders,
  onMoveToFolder,
}: {
  team: Team;
  onEdit: () => void;
  onDuplicate: (e: React.MouseEvent) => void;
  onDelete: () => void;
  folders: TeamFolder[];
  onMoveToFolder: (teamId: string, folderId: string | null) => void;
}) {
  const handleDragStart = (e: DragEvent) => {
    e.dataTransfer.setData("team-id", team.id);
    e.dataTransfer.effectAllowed = "move";
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          draggable
          onDragStart={handleDragStart}
          onClick={onEdit}
          className="p-3 rounded-xl card-gradient border border-border hover:border-primary/40 transition-all relative overflow-hidden group cursor-pointer active:scale-[0.98]"
        >
          <div className="absolute left-0 top-0 bottom-0 w-1.5 rounded-l-xl overflow-hidden flex flex-col">
            {(team.colors.length > 0 ? team.colors : ["hsl(var(--primary))", "hsl(var(--secondary))"]).map((c, i) => (
              <div key={i} className="flex-1" style={{ backgroundColor: c }} />
            ))}
          </div>
          <div className="flex items-center gap-2 pl-2">
            <GripVertical className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
            <div className="w-10 h-10 flex items-center justify-center shrink-0">
              {team.logo ? (
                <img
                  src={team.logo}
                  alt=""
                  className="w-10 h-10 object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                    e.currentTarget.nextElementSibling?.classList.remove("hidden");
                  }}
                />
              ) : null}
              <Shield className={`w-5 h-5 text-muted-foreground ${team.logo ? "hidden" : ""}`} />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-display font-bold text-foreground text-sm truncate">{team.name}</h3>
              <p className="text-xs text-primary font-mono">{(team.rate ?? 0).toFixed(2)}</p>
            </div>
            <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={onEdit}
                className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={onDuplicate}
                className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button className="p-1.5 rounded-md hover:bg-destructive/20 text-muted-foreground hover:text-destructive">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir "{team.name}"?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação não pode ser desfeita. Se este time estiver em competições ativas, você será avisado
                      após a exclusão.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={onDelete}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Excluir mesmo assim
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={onEdit}>
          <Pencil className="w-3.5 h-3.5 mr-2" /> Editar
        </ContextMenuItem>
        <ContextMenuItem onClick={(e) => onDuplicate(e as any)}>
          <Copy className="w-3.5 h-3.5 mr-2" /> Duplicar
        </ContextMenuItem>
        {folders.length > 0 && (
          <ContextMenuSub>
            <ContextMenuSubTrigger>
              <FolderInput className="w-3.5 h-3.5 mr-2" /> Mover para pasta
            </ContextMenuSubTrigger>
            <ContextMenuSubContent className="max-h-60 overflow-y-auto">
              {team.folderId && (
                <ContextMenuItem onClick={() => onMoveToFolder(team.id, null)}>
                  <FolderOpen className="w-3.5 h-3.5 mr-2 text-muted-foreground" /> Remover da pasta
                </ContextMenuItem>
              )}
              {folders
                .filter((f) => f.id !== team.folderId)
                .map((f) => (
                  <ContextMenuItem key={f.id} onClick={() => onMoveToFolder(team.id, f.id)}>
                    <Folder className="w-3.5 h-3.5 mr-2 text-primary" /> {f.name}
                  </ContextMenuItem>
                ))}
            </ContextMenuSubContent>
          </ContextMenuSub>
        )}
        <ContextMenuSeparator />
        <ContextMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
          <Trash2 className="w-3.5 h-3.5 mr-2" /> Excluir
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
});

interface FolderNodeProps {
  folder: TeamFolder;
  foldersByParent: Map<string, TeamFolder[]>;
  teamsByFolder: Map<string, Team[]>;
  openFolders: Set<string>;
  dragOverFolder: string | null;
  editingFolderId: string | null;
  editingFolderName: string;
  onToggle: (id: string) => void;
  onNavigateInto: (id: string) => void;
  onEdit: (id: string, name: string) => void;
  onRename: (id: string) => void;
  onCancelEdit: () => void;
  onEditNameChange: (name: string) => void;
  onDeleteFolder: (id: string, name: string) => void;
  onDragOver: (e: DragEvent, folderId: string) => void;
  onDragLeave: () => void;
  onDrop: (e: DragEvent, folderId: string) => void;
  onFolderDragStart: (e: DragEvent, folderId: string) => void;
  navigate: (path: string) => void;
  onDuplicate: (e: React.MouseEvent, team: Team) => void;
  onDeleteTeam: (id: string, name: string) => void;
  allFolders: TeamFolder[];
  onMoveToFolder: (teamId: string, folderId: string | null) => void;
  onMoveFolder: (folderId: string, direction: "up" | "down") => void;
  siblingCount: number;
  siblingIndex: number;
  depth?: number;
}

// 2. Otimização com memo() no FolderNode para evitar re-renderizações em cascata
const FolderNode = memo(function FolderNode({
  folder,
  foldersByParent,
  teamsByFolder,
  openFolders,
  dragOverFolder,
  editingFolderId,
  editingFolderName,
  onToggle,
  onNavigateInto,
  onEdit,
  onRename,
  onCancelEdit,
  onEditNameChange,
  onDeleteFolder,
  onDragOver,
  onDragLeave,
  onDrop,
  onFolderDragStart,
  navigate,
  onDuplicate,
  onDeleteTeam,
  allFolders,
  onMoveToFolder,
  onMoveFolder,
  siblingCount,
  siblingIndex,
  depth = 0,
}: FolderNodeProps) {
  const isOpen = openFolders.has(folder.id);
  // 3. Pegando de um dicionário O(1) invés de rodar .filter() na array inteira O(N)
  const folderTeams = teamsByFolder.get(folder.id) || [];
  const childFolders = foldersByParent.get(folder.id) || [];
  const isDragOver = dragOverFolder === folder.id;

  return (
    <div
      className={`rounded-xl border overflow-hidden transition-colors ${
        isDragOver ? "border-primary bg-primary/5" : "border-border"
      }`}
      style={{ marginLeft: depth > 0 ? 0 : undefined }}
      onDragOver={(e) => onDragOver(e, folder.id)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, folder.id)}
    >
      <div
        className="flex items-center gap-2 px-3 py-2.5 bg-secondary/30 cursor-pointer hover:bg-secondary/50 transition-colors"
        onClick={() => onToggle(folder.id)}
        draggable
        onDragStart={(e) => onFolderDragStart(e, folder.id)}
      >
        <GripVertical className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0 cursor-grab" />
        <ChevronRight
          className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${isOpen ? "rotate-90" : ""}`}
        />
        {isOpen ? <FolderOpen className="w-4 h-4 text-primary" /> : <Folder className="w-4 h-4 text-primary" />}

        {editingFolderId === folder.id ? (
          <Input
            autoFocus
            value={editingFolderName}
            onChange={(e) => onEditNameChange(e.target.value)}
            onBlur={() => onRename(folder.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onRename(folder.id);
              if (e.key === "Escape") onCancelEdit();
            }}
            onClick={(e) => e.stopPropagation()}
            className="h-6 w-36 text-xs"
          />
        ) : (
          <span
            className="font-display font-bold text-foreground text-xs flex-1 truncate cursor-pointer hover:text-primary transition-colors"
            onDoubleClick={(e) => { e.stopPropagation(); onNavigateInto(folder.id); }}
          >{folder.name}</span>
        )}

        <span className="text-[10px] text-muted-foreground">{folderTeams.length}</span>

        <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
          {siblingIndex > 0 && (
            <button
              onClick={() => onMoveFolder(folder.id, "up")}
              className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground"
              title="Mover para cima"
            >
              <ArrowUp className="w-3 h-3" />
            </button>
          )}
          {siblingIndex < siblingCount - 1 && (
            <button
              onClick={() => onMoveFolder(folder.id, "down")}
              className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground"
              title="Mover para baixo"
            >
              <ArrowDown className="w-3 h-3" />
            </button>
          )}
          <button
            onClick={() => onEdit(folder.id, folder.name)}
            className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground"
          >
            <Pencil className="w-3 h-3" />
          </button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button className="p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive">
                <Trash2 className="w-3 h-3" />
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir pasta "{folder.name}"?</AlertDialogTitle>
                <AlertDialogDescription>
                  Os times não serão excluídos, apenas removidos da pasta.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => onDeleteFolder(folder.id, folder.name)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {isOpen && (
        <div className="p-3 space-y-3">
          {/* Child folders */}
          {childFolders.map((child, i) => (
            <FolderNode
              key={child.id}
              folder={child}
              foldersByParent={foldersByParent}
              teamsByFolder={teamsByFolder}
              openFolders={openFolders}
              dragOverFolder={dragOverFolder}
              editingFolderId={editingFolderId}
              editingFolderName={editingFolderName}
              onToggle={onToggle}
              onNavigateInto={onNavigateInto}
              onEdit={onEdit}
              onRename={onRename}
              onCancelEdit={onCancelEdit}
              onEditNameChange={onEditNameChange}
              onDeleteFolder={onDeleteFolder}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onFolderDragStart={onFolderDragStart}
              navigate={navigate}
              onDuplicate={onDuplicate}
              onDeleteTeam={onDeleteTeam}
              allFolders={allFolders}
              onMoveToFolder={onMoveToFolder}
              onMoveFolder={onMoveFolder}
              siblingCount={childFolders.length}
              siblingIndex={i}
              depth={depth + 1}
            />
          ))}
          {/* Teams in folder */}
          {folderTeams.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
              {folderTeams.map((team) => (
                <TeamCard
                  key={team.id}
                  team={team}
                  onEdit={() => navigate(`/teams/create?edit=${team.id}`)}
                  onDuplicate={(e) => onDuplicate(e, team)}
                  onDelete={() => onDeleteTeam(team.id, team.name)}
                  folders={allFolders}
                  onMoveToFolder={onMoveToFolder}
                />
              ))}
            </div>
          ) : childFolders.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-3">Pasta vazia — arraste times aqui</p>
          ) : null}
        </div>
      )}
    </div>
  );
});

export default function TeamsPage() {
  const {
    teams: allTeams,
    tournaments,
    removeTeam,
    archiveTeam,
    addTeam,
    loading,
    folders,
    addFolder,
    renameFolder,
    removeFolder,
    moveTeamToFolder,
    moveFolderToFolder,
  } = useTournamentStore();

  // Filter out archived teams from the main list
  const teams = useMemo(() => allTeams.filter((t) => !t.isArchived), [allTeams]);

  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "rate">("name");
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [openFolders, setOpenFolders] = useState<Set<string>>(() => new Set(folders.map((f) => f.id)));
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState("");
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);

  const filteredTeams = useMemo(() => {
    const q = search.toLowerCase();
    const filtered = teams.filter(
      (t) =>
        (t.name || "").toLowerCase().includes(q) ||
        (t.shortName || "").toLowerCase().includes(q) ||
        (t.abbreviation || "").toLowerCase().includes(q),
    );
    if (sortBy === "rate") {
      filtered.sort((a, b) => (b.rate ?? 0) - (a.rate ?? 0));
    } else {
      filtered.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    }
    return filtered;
  }, [teams, search, sortBy]);

  // Auto-open folders containing search results
  useEffect(() => {
    if (search.trim()) {
      const foldersWithMatches = new Set<string>();
      filteredTeams.forEach((t) => {
        if (t.folderId) {
          foldersWithMatches.add(t.folderId);
          // Also open parent folders
          let parentId = folders.find((f) => f.id === t.folderId)?.parentId;
          while (parentId) {
            foldersWithMatches.add(parentId);
            parentId = folders.find((f) => f.id === parentId)?.parentId;
          }
        }
      });
      if (foldersWithMatches.size > 0) {
        setOpenFolders((prev) => {
          const next = new Set(prev);
          foldersWithMatches.forEach((id) => next.add(id));
          return next;
        });
      }
    }
  }, [search, filteredTeams, folders]);

  // 4. Agrupamento para uso otimizado de pastar e times
  const teamsByFolder = useMemo(() => {
    const map = new Map<string, Team[]>();
    filteredTeams.forEach((t) => {
      const key = t.folderId || "root";
      const list = map.get(key) || [];
      list.push(t);
      map.set(key, list);
    });
    return map;
  }, [filteredTeams]);

  const foldersByParent = useMemo(() => {
    const map = new Map<string, TeamFolder[]>();
    folders.forEach((f) => {
      const key = f.parentId || "root";
      const list = map.get(key) || [];
      list.push(f);
      map.set(key, list);
    });
    return map;
  }, [folders]);

  const currentParentKey = currentFolderId || "root";
  const unfolderedTeams = teamsByFolder.get(currentParentKey) || [];
  const rootFolders = foldersByParent.get(currentParentKey) || [];

  const toggleFolder = useCallback((id: string) => {
    setOpenFolders((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  // Soft delete: archive teams that are in tournaments, hard delete otherwise
  const handleDelete = useCallback(
    (id: string, name: string) => {
      const activeTournaments = (tournaments || []).filter((t) => t.teamIds && t.teamIds.includes(id));
      const hasHistory = (tournaments || []).some((t) =>
        (t.seasons || []).some((s) => s.teamIds?.includes(id) || s.standings.some((st) => st.teamId === id)),
      );
      if (activeTournaments.length > 0 || hasHistory) {
        // Soft delete: archive instead of removing
        archiveTeam(id);
        toast.warning(
          `"${name}" foi arquivado (mantido no histórico). Ainda está em ${activeTournaments.length} competição(es).`,
          { duration: 6000 },
        );
      } else {
        removeTeam(id);
        toast.success(`"${name}" excluído`);
      }
    },
    [archiveTeam, removeTeam, tournaments],
  );

  const handleDuplicate = useCallback(
    (e: React.MouseEvent, team: Team) => {
      e.stopPropagation();
      addTeam({ ...team, id: crypto.randomUUID(), name: `${team.name} (cópia)` });
      toast.success(`"${team.name}" duplicado!`);
    },
    [addTeam],
  );

  const handleAddFolder = async () => {
    const id = await addFolder("Nova Pasta");
    if (id) {
      setOpenFolders((prev) => new Set(prev).add(id));
      setEditingFolderId(id);
      setEditingFolderName("Nova Pasta");
      toast.success("Pasta criada!");
    }
  };

  const handleRenameFolder = useCallback(
    (id: string) => {
      if (editingFolderId !== id) return;
      const trimmed = editingFolderName.trim();
      if (trimmed) {
        renameFolder(id, trimmed);
        toast.success("Pasta renomeada!");
      }
      setEditingFolderId(null);
    },
    [editingFolderId, editingFolderName, renameFolder],
  );

  const handleDeleteFolder = useCallback(
    (id: string, name: string) => {
      removeFolder(id);
      toast.success(`Pasta "${name}" excluída`);
    },
    [removeFolder],
  );

  const handleDragOver = useCallback((e: DragEvent, folderId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFolder(folderId);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverFolder(null);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent, folderId: string) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOverFolder(null);

      const teamId = e.dataTransfer.getData("team-id");
      const sourceFolderId = e.dataTransfer.getData("folder-id");

      if (teamId) {
        moveTeamToFolder(teamId, folderId);
        toast.success("Time movido!");
      } else if (sourceFolderId && sourceFolderId !== folderId) {
        // 5. Prevenção principal do LOOP INFINITO
        let isDescendant = false;
        let currentId: string | null = folderId;

        while (currentId) {
          if (currentId === sourceFolderId) {
            isDescendant = true;
            break;
          }
          const currentFolder = folders.find((f) => f.id === currentId);
          currentId = currentFolder?.parentId || null;
        }

        if (isDescendant) {
          toast.error("Você não pode mover uma pasta para dentro de si mesma ou de suas subpastas.");
          return;
        }

        moveFolderToFolder(sourceFolderId, folderId);
        toast.success("Pasta movida!");
        setOpenFolders((prev) => new Set(prev).add(folderId));
      }
    },
    [moveTeamToFolder, moveFolderToFolder, folders],
  );

  const handleFolderDragStart = useCallback((e: DragEvent, folderId: string) => {
    e.stopPropagation();
    e.dataTransfer.setData("folder-id", folderId);
    e.dataTransfer.effectAllowed = "move";
  }, []);

  const handleMoveToFolder = useCallback(
    (teamId: string, folderId: string | null) => {
      moveTeamToFolder(teamId, folderId);
      toast.success(folderId ? "Time movido para a pasta!" : "Time removido da pasta!");
    },
    [moveTeamToFolder],
  );

  const handleMoveFolder = useCallback((folderId: string, direction: "up" | "down") => {
    const { folders: currentFolders } = useTournamentStore.getState();
    const folder = currentFolders.find((f) => f.id === folderId);
    if (!folder) return;
    const siblings = currentFolders.filter((f) => (f.parentId || null) === (folder.parentId || null));
    const idx = siblings.findIndex((f) => f.id === folderId);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= siblings.length) return;
    const swapFolder = siblings[swapIdx];
    // Swap positions in the full folders array
    const fullIdx1 = currentFolders.findIndex((f) => f.id === folderId);
    const fullIdx2 = currentFolders.findIndex((f) => f.id === swapFolder.id);
    const newFolders = [...currentFolders];
    [newFolders[fullIdx1], newFolders[fullIdx2]] = [newFolders[fullIdx2], newFolders[fullIdx1]];
    useTournamentStore.setState({ folders: newFolders });
  }, []);

  const handleRootDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      setDragOverFolder(null);
      const teamId = e.dataTransfer.getData("team-id");
      const folderId = e.dataTransfer.getData("folder-id");
      if (teamId) {
        moveTeamToFolder(teamId, null);
        toast.success("Time removido da pasta!");
      } else if (folderId) {
        moveFolderToFolder(folderId, null);
        toast.success("Pasta movida para raiz!");
      }
    },
    [moveTeamToFolder, moveFolderToFolder],
  );

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground tracking-tight">Meus Times</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie e organize seus times</p>
        </div>
        <div className="flex items-center gap-2">
          {teams.length > 0 && (
            <div className="relative w-full sm:w-56">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar time..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          )}
          {teams.length > 0 && (
            <div className="flex items-center rounded-lg border border-border overflow-hidden shrink-0">
              <button
                onClick={() => setSortBy("name")}
                className={`px-3 py-2 text-xs font-medium transition-colors ${sortBy === "name" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`}
              >
                A-Z
              </button>
              <button
                onClick={() => setSortBy("rate")}
                className={`px-3 py-2 text-xs font-medium transition-colors ${sortBy === "rate" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`}
              >
                Rate
              </button>
            </div>
          )}
          {folders.length > 0 && (
            <button
              onClick={() => {
                const allOpen = folders.every(f => openFolders.has(f.id));
                setOpenFolders(allOpen ? new Set() : new Set(folders.map(f => f.id)));
              }}
              title={folders.every(f => openFolders.has(f.id)) ? "Fechar todas as pastas" : "Abrir todas as pastas"}
              className="p-2 rounded-lg border border-border hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              <ChevronsDownUp className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={handleAddFolder}
            title="Nova pasta"
            className="p-2 rounded-lg border border-border hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            <FolderPlus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Breadcrumb */}
      <FolderBreadcrumb
        currentFolderId={currentFolderId}
        folders={folders}
        rootLabel="Times"
        onNavigate={setCurrentFolderId}
      />

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-4 rounded-xl border border-border">
              <div className="flex items-center gap-3">
                <Skeleton className="w-12 h-12 rounded-md" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div
          className="space-y-4"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => handleRootDrop(e as unknown as DragEvent)}
        >
          {/* When searching, show all results flat (outside folders) */}
          {search.trim() ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredTeams.map((team, index) => (
                <motion.div
                  key={team.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <TeamCard
                    team={team}
                    onEdit={() => navigate(`/teams/create?edit=${team.id}`)}
                    onDuplicate={(e) => handleDuplicate(e, team)}
                    onDelete={() => handleDelete(team.id, team.name)}
                    folders={folders}
                    onMoveToFolder={handleMoveToFolder}
                  />
                </motion.div>
              ))}
            </div>
          ) : (
            <>
              {/* Folders */}
              {rootFolders.map((folder, i) => (
                <FolderNode
                  key={folder.id}
                  folder={folder}
                  foldersByParent={foldersByParent}
                  teamsByFolder={teamsByFolder}
                  openFolders={openFolders}
                  dragOverFolder={dragOverFolder}
                  editingFolderId={editingFolderId}
                  editingFolderName={editingFolderName}
                  onToggle={toggleFolder}
                  onNavigateInto={setCurrentFolderId}
                  onEdit={(id, name) => {
                    setEditingFolderId(id);
                    setEditingFolderName(name);
                  }}
                  onRename={handleRenameFolder}
                  onCancelEdit={() => setEditingFolderId(null)}
                  onEditNameChange={setEditingFolderName}
                  onDeleteFolder={handleDeleteFolder}
                  onDragOver={handleDragOver as any}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop as any}
                  onFolderDragStart={handleFolderDragStart as any}
                  navigate={navigate}
                  onDuplicate={handleDuplicate}
                  onDeleteTeam={handleDelete}
                  allFolders={folders}
                  onMoveToFolder={handleMoveToFolder}
                  onMoveFolder={handleMoveFolder}
                  siblingCount={rootFolders.length}
                  siblingIndex={i}
                />
              ))}
              {/* Unfoldered teams */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {unfolderedTeams.map((team, index) => (
                  <motion.div
                    key={team.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                  >
                    <TeamCard
                      team={team}
                      onEdit={() => navigate(`/teams/create?edit=${team.id}`)}
                      onDuplicate={(e) => handleDuplicate(e, team)}
                      onDelete={() => handleDelete(team.id, team.name)}
                      folders={folders}
                      onMoveToFolder={handleMoveToFolder}
                    />
                  </motion.div>
                ))}

                <motion.button
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  onClick={() => navigate("/teams/create")}
                  className="h-[76px] rounded-xl border-2 border-dashed border-border hover:border-primary/50 flex items-center justify-center transition-all hover:bg-primary/5"
                >
                  <Plus className="w-8 h-8 text-muted-foreground" />
                </motion.button>
              </div>

              {teams.length === 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-center py-16"
                >
                  <Shield className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm">Nenhum time criado ainda</p>
                </motion.div>
              )}

              {teams.length > 0 && filteredTeams.length === 0 && search && (
                <div className="text-center py-12">
                  <Search className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm">Nenhum time encontrado para "{search}"</p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
