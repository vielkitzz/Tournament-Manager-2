import { NavLink, useNavigate } from "react-router-dom";
import { Trophy, PlusCircle, Shield, LogOut, Download, Upload, Share2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import appLogo from "@/assets/logo.svg";
import ExportDialog from "@/components/ExportDialog";
import ImportDialog from "@/components/ImportDialog";

const navSections = [
  {
    label: "NAVEGAR",
    items: [
      { to: "/", icon: Trophy, label: "Competições", end: true },
      { to: "/teams", icon: Shield, label: "Times", end: false },
      { to: "/publish", icon: Share2, label: "Publicar Competições", end: false },
    ],
  },
  {
    label: "CRIAR",
    items: [
      { to: "/tournament/create", icon: PlusCircle, label: "Nova Competição", end: false },
      { to: "/teams/create", icon: PlusCircle, label: "Novo Time", end: false },
    ],
  },
];

interface AppSidebarProps {
  onNavigate?: () => void;
}

export default function AppSidebar({ onNavigate }: AppSidebarProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
    toast.success("Você saiu da conta");
  };

  return (
    <aside className="w-64 min-h-screen bg-sidebar border-r border-sidebar-border flex flex-col">
      {/* Logo */}
      <div className="p-6 pb-8">
        <img src={appLogo} alt="TM2" className="h-10 object-contain" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-6">
        {navSections.map((section) => (
          <div key={section.label}>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-2 px-3">
              {section.label}
            </p>
            <div className="space-y-1">
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? "bg-secondary text-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                    }`
                  }
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        ))}

        {/* Dados */}
        <div>
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-2 px-3">
            DADOS
          </p>
          <div className="space-y-1">
            <ExportDialog
              trigger={
                <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all">
                  <Download className="w-5 h-5" />
                  <span>Exportar</span>
                </button>
              }
            />
            <ImportDialog
              trigger={
                <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all">
                  <Upload className="w-5 h-5" />
                  <span>Importar</span>
                </button>
              }
            />
          </div>
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-sidebar-border space-y-2">
        {user && (
          <p className="text-xs text-muted-foreground text-center truncate px-2">
            {user.email || "Conta anônima"}
          </p>
        )}
        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sair
        </button>
      </div>
    </aside>
  );
}
