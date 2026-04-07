import { ChevronRight, Home } from "lucide-react";

interface BreadcrumbFolder {
  id: string;
  name: string;
  parentId?: string | null;
}

interface FolderBreadcrumbProps {
  currentFolderId: string | null;
  folders: BreadcrumbFolder[];
  rootLabel: string;
  onNavigate: (folderId: string | null) => void;
}

export default function FolderBreadcrumb({ currentFolderId, folders, rootLabel, onNavigate }: FolderBreadcrumbProps) {
  if (!currentFolderId) return null;

  // Build breadcrumb path from current folder to root
  const path: BreadcrumbFolder[] = [];
  let id: string | null = currentFolderId;
  while (id) {
    const folder = folders.find((f) => f.id === id);
    if (!folder) break;
    path.unshift(folder);
    id = folder.parentId;
  }

  return (
    <nav className="flex items-center gap-1 text-sm mb-4 flex-wrap">
      <button
        onClick={() => onNavigate(null)}
        className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors px-1.5 py-0.5 rounded hover:bg-secondary/60"
      >
        <Home className="w-3.5 h-3.5" />
        <span className="text-xs font-medium">{rootLabel}</span>
      </button>
      {path.map((folder) => (
        <span key={folder.id} className="flex items-center gap-1">
          <ChevronRight className="w-3 h-3 text-muted-foreground/50" />
          <button
            onClick={() => onNavigate(folder.id)}
            className={`text-xs font-medium px-1.5 py-0.5 rounded transition-colors ${
              folder.id === currentFolderId
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
            }`}
          >
            {folder.name}
          </button>
        </span>
      ))}
    </nav>
  );
}
