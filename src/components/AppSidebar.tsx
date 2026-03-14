import { NavLink, useNavigate, Link } from "react-router-dom";
import { Trophy, PlusCircle, Shield, LogOut, Download, Upload, Share2, Swords, LayoutDashboard } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useTheme } from "@/hooks/useTheme";
import appLogoDark from "@/assets/logo.svg";
import appLogoLight from "@/assets/logo-light.png";
import ExportDialog from "@/components/ExportDialog";
import ImportDialog from "@/components/ImportDialog";

const dashboardItem = { to: "/", icon: LayoutDashboard, label: "Dashboard", end: true };

const navSections = [
  {
    label: "NAVEGAR",
    items: [
      { to: "/competitions", icon: Trophy, label: "Competições", end: false },
      { to: "/teams", icon: Shield, label: "Times", end: false },
      { to: "/publish", icon: Share2, label: "Publicar", end: false },
      { to: "/friendly", icon: Swords, label: "Amistoso", end: false },
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
  const { theme } = useTheme();
  const navigate = useNavigate();
  const appLogo = theme === "light" ? appLogoLight : appLogoDark;

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
    toast.success("Você saiu da conta");
  };

  const linkClasses = (isActive: boolean) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-150 ${
      isActive
        ? "bg-primary/10 text-primary border border-primary/20"
        : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
    }`;

  const actionBtnClasses =
    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all duration-150";

  return (
    <aside className="w-60 min-h-screen bg-sidebar border-r border-sidebar-border flex flex-col">
      {/* Logo */}
      <div className="px-5 pt-6 pb-6 flex items-center gap-2.5">
        <Link to="/" onClick={onNavigate}>
          <img src={appLogo} alt="TM2" className="h-8 object-contain cursor-pointer hover:opacity-80 transition-opacity" />
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-5 overflow-y-auto">
        {/* Dashboard standalone */}
        <div>
          <NavLink
            to={dashboardItem.to}
            end={dashboardItem.end}
            onClick={onNavigate}
            className={({ isActive }) => linkClasses(isActive)}
          >
            <dashboardItem.icon className="w-4 h-4 shrink-0" />
            <span>{dashboardItem.label}</span>
          </NavLink>
        </div>

        {navSections.map((section) => (
          <div key={section.label}>
            <p className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-[0.15em] mb-1.5 px-3">
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={onNavigate}
                  className={({ isActive }) => linkClasses(isActive)}
                >
                  <item.icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        ))}

        {/* Dados */}
        <div>
          <p className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-[0.15em] mb-1.5 px-3">
            DADOS
          </p>
          <div className="space-y-0.5">
            <ExportDialog
              trigger={
                <button className={actionBtnClasses}>
                  <Download className="w-4 h-4 shrink-0" />
                  <span>Exportar</span>
                </button>
              }
            />
            <ImportDialog
              trigger={
                <button className={actionBtnClasses}>
                  <Upload className="w-4 h-4 shrink-0" />
                  <span>Importar</span>
                </button>
              }
            />
          </div>
        </div>
      </nav>

      {/* Footer */}
      <div className="p-3 mx-3 mb-3 rounded-lg bg-secondary/40 space-y-2">
        {user && (
          <p className="text-[11px] text-muted-foreground text-center truncate px-1">
            {user.email || "Conta anônima"}
          </p>
        )}
        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md text-[11px] font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sair
        </button>
      </div>
    </aside>
  );
}
