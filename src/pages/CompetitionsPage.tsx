// Extracted from the old HomePage – lists all competitions
import { useState, useCallback, DragEvent, useMemo, memo, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Trophy,
  Plus,
  Pencil,
  Trash2,
  Search,
  FolderPlus,
  Folder,
  FolderOpen,
  ChevronRight,
  GripVertical,
  Copy,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { useTournamentStore } from "@/store/tournamentStore";
import { toast } from "sonner";
import { Tournament, TournamentFolder } from "@/types/tournament";
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

const formatLabels: Record<string, string> = {
  liga: "Liga",
  grupos: "Grupos + Mata-Mata",
  "mata-mata": "Mata-Mata",
  suico: "Sistema Suíço",
};

const CompetitionCard = memo(function CompetitionCard({
  tournament,
  onNavigate,
  onDelete,
  onDuplicate,
}: {
  tournament: Tournament;
  onNavigate: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}) {
  const handleDragStart = (e: DragEvent) => {
    e.dataTransfer.setData("tournament-id", tournament.id);
    e.dataTransfer.effectAllowed = "move";
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onClick={onNavigate}
      className="group cursor-pointer"
    >
      <motion.div
        whileHover={{ y: -2, boxShadow: "0 8px 30px hsl(var(--primary) / 0.12)" }}
        className="h-[120px] p-5 rounded-xl card-gradient border border-border hover:border-primary/30 transition-all relative cursor-grab active:cursor-grabbing"
      >
        <div className="flex items-start gap-4 h-full">
          <GripVertical className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0 mt-3" />
          <div className="w-11 h-11 rounded-lg bg-secondary/60 flex items-center justify-center shrink-0">
            {tournament.logo ? (
              <img src={tournament.logo} alt="" className="w-9 h-9 object-contain rounded" />
            ) : (
              <Trophy className="w-5 h-5 text-muted-foreground" />
            )}
          </div>
          <div className="min-w-0 flex-1 flex flex-col justify-center">
            <h3 className="font-display font-bold text-foreground text-sm truncate leading-tight">
              {tournament.name}
            </h3>
            <p className="text-xs text-primary mt-1">
              {tournament.sport} <span className="text-muted-foreground mx-0.5">·</span> {tournament.year}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {formatLabels[tournament.format]} · {tournament.numberOfTeams} times
            </p>
          </div>
          <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <button
              onClick={(e) => { e.stopPropagation(); onNavigate(); }}
              className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
              title="Editar"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
              className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
              title="Duplicar"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button
                  onClick={(e) => e.stopPropagation()}
                  className="p-1.5 rounded-md hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir "{tournament.name}"?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação não pode ser desfeita. Todos os dados da competição serão perdidos.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={onDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Excluir
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </motion.div>
    </div>
  );
});

interface FolderNodeProps {
  folder: TournamentFolder;
  foldersByParent: Map<string, TournamentFolder[]>;
  tournamentsByFolder: Map<string, Tournament[]>;
  openFolders: Set<string>;
  dragOverFolder: string | null;
  editingFolderId: string | null;
  editingFolderName: string;
  onToggle: (id: string) => void;
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
  onDeleteTournament: (id: string, name: string) => void;
  onDuplicateTournament: (id: string) => void;
  depth?: number;
}

const CompetitionFolderNode = memo(function CompetitionFolderNode({
  folder,
  foldersByParent,
  tournamentsByFolder,
  openFolders,
  dragOverFolder,
  editingFolderId,
  editingFolderName,
  onToggle,
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
  onDeleteTournament,
  onDuplicateTournament,
  depth = 0,
}: FolderNodeProps) {
  const isOpen = openFolders.has(folder.id);
  const folderTournaments = tournamentsByFolder.get(folder.id) || [];
  const childFolders = foldersByParent.get(folder.id) || [];
  const isDragOver = dragOverFolder === folder.id;

  return (
    <div
      className={`rounded-xl border overflow-hidden transition-colors ${
        isDragOver ? "border-primary bg-primary/5" : "border-border"
      }`}
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
          <span className="font-display font-bold text-foreground text-xs flex-1 truncate">{folder.name}</span>
        )}

        <span className="text-[10px] text-muted-foreground">{folderTournaments.length}</span>

        <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
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
                  As competições não serão excluídas, apenas removidas da pasta.
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
          {childFolders.map((child) => (
            <CompetitionFolderNode
              key={child.id}
              folder={child}
              foldersByParent={foldersByParent}
              tournamentsByFolder={tournamentsByFolder}
              openFolders={openFolders}
              dragOverFolder={dragOverFolder}
              editingFolderId={editingFolderId}
              editingFolderName={editingFolderName}
              onToggle={onToggle}
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
              onDeleteTournament={onDeleteTournament}
              onDuplicateTournament={onDuplicateTournament}
              depth={depth + 1}
            />
          ))}
          {folderTournaments.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {folderTournaments.map((t) => (
                <CompetitionCard
                  key={t.id}
                  tournament={t}
                  onNavigate={() => navigate(`/tournament/${t.id}`)}
                  onDelete={() => onDeleteTournament(t.id, t.name)}
                  onDuplicate={() => onDuplicateTournament(t.id)}
                />
              ))}
            </div>
          ) : childFolders.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-3">Pasta vazia — arraste competições aqui</p>
          ) : null}
        </div>
      )}
    </div>
  );
});

export default function CompetitionsPage() {
  const {
    tournaments,
    removeTournament,
    duplicateTournament,
    loading,
    tournamentFolders,
    addTournamentFolder,
    renameTournamentFolder,
    removeTournamentFolder,
    moveTournamentToFolder,
    moveTournamentFolderToFolder,
  } = useTournamentStore();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [openFolders, setOpenFolders] = useState<Set<string>>(() => new Set(tournamentFolders.map((f) => f.id)));
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState("");
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);

  // Keep new folders auto-open
  useEffect(() => {
    setOpenFolders((prev) => {
      const next = new Set(prev);
      tournamentFolders.forEach((f) => next.add(f.id));
      return next;
    });
  }, [tournamentFolders]);

  const filteredTournaments = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return tournaments;
    return tournaments.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.sport.toLowerCase().includes(q) ||
        String(t.year).includes(q)
    );
  }, [tournaments, search]);

  // Auto-open folders containing search results
  useEffect(() => {
    if (search.trim()) {
      const foldersWithMatches = new Set<string>();
      filteredTournaments.forEach((t) => {
        if (t.folderId) {
          foldersWithMatches.add(t.folderId);
          let parentId = tournamentFolders.find((f) => f.id === t.folderId)?.parentId;
          while (parentId) {
            foldersWithMatches.add(parentId);
            parentId = tournamentFolders.find((f) => f.id === parentId)?.parentId;
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
  }, [search, filteredTournaments, tournamentFolders]);

  const tournamentsByFolder = useMemo(() => {
    const map = new Map<string, Tournament[]>();
    filteredTournaments.forEach((t) => {
      const key = t.folderId || "root";
      const list = map.get(key) || [];
      list.push(t);
      map.set(key, list);
    });
    return map;
  }, [filteredTournaments]);

  const foldersByParent = useMemo(() => {
    const map = new Map<string, TournamentFolder[]>();
    tournamentFolders.forEach((f) => {
      const key = f.parentId || "root";
      const list = map.get(key) || [];
      list.push(f);
      map.set(key, list);
    });
    return map;
  }, [tournamentFolders]);

  const unfolderedTournaments = tournamentsByFolder.get("root") || [];
  const rootFolders = foldersByParent.get("root") || [];

  const toggleFolder = useCallback((id: string) => {
    setOpenFolders((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const handleDelete = useCallback(
    (id: string, name: string) => {
      removeTournament(id);
      toast.success(`"${name}" excluído`);
    },
    [removeTournament]
  );

  const handleDuplicate = useCallback(
    async (id: string) => {
      const newId = await duplicateTournament(id);
      if (newId) toast.success("Competição duplicada!");
    },
    [duplicateTournament]
  );

  const handleAddFolder = async () => {
    const id = await addTournamentFolder("Nova Pasta");
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
        renameTournamentFolder(id, trimmed);
        toast.success("Pasta renomeada!");
      }
      setEditingFolderId(null);
    },
    [editingFolderId, editingFolderName, renameTournamentFolder]
  );

  const handleDeleteFolder = useCallback(
    (id: string, name: string) => {
      removeTournamentFolder(id);
      toast.success(`Pasta "${name}" excluída`);
    },
    [removeTournamentFolder]
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

      const tournamentId = e.dataTransfer.getData("tournament-id");
      const sourceFolderId = e.dataTransfer.getData("folder-id");

      if (tournamentId) {
        moveTournamentToFolder(tournamentId, folderId);
        toast.success("Competição movida!");
      } else if (sourceFolderId && sourceFolderId !== folderId) {
        let isDescendant = false;
        let currentId: string | null = folderId;
        while (currentId) {
          if (currentId === sourceFolderId) {
            isDescendant = true;
            break;
          }
          const currentFolder = tournamentFolders.find((f) => f.id === currentId);
          currentId = currentFolder?.parentId || null;
        }
        if (isDescendant) {
          toast.error("Não é possível mover para uma subpasta própria");
          return;
        }
        moveTournamentFolderToFolder(sourceFolderId, folderId);
        toast.success("Pasta movida!");
      }
    },
    [moveTournamentToFolder, moveTournamentFolderToFolder, tournamentFolders]
  );

  const handleFolderDragStart = useCallback((e: DragEvent, folderId: string) => {
    e.dataTransfer.setData("folder-id", folderId);
    e.dataTransfer.effectAllowed = "move";
  }, []);

  const handleRootDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      const tournamentId = e.dataTransfer.getData("tournament-id");
      const sourceFolderId = e.dataTransfer.getData("folder-id");
      if (tournamentId) {
        moveTournamentToFolder(tournamentId, null);
        toast.success("Competição removida da pasta!");
      } else if (sourceFolderId) {
        moveTournamentFolderToFolder(sourceFolderId, null);
        toast.success("Pasta movida para raiz!");
      }
    },
    [moveTournamentToFolder, moveTournamentFolderToFolder]
  );

  return (
    <div
      className="p-6 lg:p-10 max-w-7xl mx-auto"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleRootDrop}
    >
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground tracking-tight">
            Minhas Competições
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie suas competições</p>
        </div>
        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleAddFolder}
            className="hidden sm:inline-flex items-center gap-2 px-3 py-2.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-secondary/50 font-medium text-sm transition-colors"
          >
            <FolderPlus className="w-4 h-4" />
            Pasta
          </motion.button>
          {tournaments.length > 0 && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate("/tournament/create")}
              className="hidden sm:inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors shadow-glow"
            >
              <Plus className="w-4 h-4" />
              Nova Competição
            </motion.button>
          )}
        </div>
      </div>

      {/* Search */}
      {tournaments.length > 0 && (
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Pesquisar competições..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10"
          />
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-[120px] p-5 rounded-xl border border-border card-gradient">
              <div className="flex items-start gap-4">
                <Skeleton className="w-11 h-11 rounded-lg shrink-0" />
                <div className="flex-1 space-y-2.5 pt-0.5">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Folders */}
          {rootFolders.length > 0 && (
            <div className="space-y-3 mb-6">
              {rootFolders.map((folder) => (
                <CompetitionFolderNode
                  key={folder.id}
                  folder={folder}
                  foldersByParent={foldersByParent}
                  tournamentsByFolder={tournamentsByFolder}
                  openFolders={openFolders}
                  dragOverFolder={dragOverFolder}
                  editingFolderId={editingFolderId}
                  editingFolderName={editingFolderName}
                  onToggle={toggleFolder}
                  onEdit={(id, name) => {
                    setEditingFolderId(id);
                    setEditingFolderName(name);
                  }}
                  onRename={handleRenameFolder}
                  onCancelEdit={() => setEditingFolderId(null)}
                  onEditNameChange={setEditingFolderName}
                  onDeleteFolder={handleDeleteFolder}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onFolderDragStart={handleFolderDragStart}
                  navigate={navigate}
                  onDeleteTournament={handleDelete}
                />
              ))}
            </div>
          )}

          {/* Unfoldered tournaments */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {unfolderedTournaments.map((t, index) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
              >
                <CompetitionCard
                  tournament={t}
                  onNavigate={() => navigate(`/tournament/${t.id}`)}
                  onDelete={() => handleDelete(t.id, t.name)}
                  onDuplicate={() => handleDuplicate(t.id)}
                />
              </motion.div>
            ))}

            <motion.button
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={() => navigate("/tournament/create")}
              className="h-[120px] rounded-xl border-2 border-dashed border-border hover:border-primary/40 flex items-center justify-center gap-2 transition-all hover:bg-primary/5 text-muted-foreground hover:text-primary"
            >
              <Plus className="w-5 h-5" />
              <span className="text-sm font-medium">Adicionar</span>
            </motion.button>
          </div>

          {tournaments.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, type: "spring", stiffness: 100 }}
              className="text-center py-24 px-6"
            >
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5, type: "spring" }}
                className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5"
              >
                <Trophy className="w-8 h-8 text-primary/60" />
              </motion.div>
              <h3 className="text-lg font-display font-bold text-foreground mb-2">
                Nenhuma competição ainda
              </h3>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto mb-6">
                Crie sua primeira competição para começar a organizar torneios, ligas e campeonatos.
              </p>
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => navigate("/tournament/create")}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-display font-semibold text-sm shadow-glow hover:bg-primary/90 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Criar Competição
              </motion.button>
            </motion.div>
          )}

          {search && filteredTournaments.length === 0 && tournaments.length > 0 && (
            <div className="text-center py-12">
              <Search className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Nenhuma competição encontrada para "{search}"</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
