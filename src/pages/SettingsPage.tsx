import { motion } from "framer-motion";
import { Settings as SettingsIcon, Moon, Sun, LogOut, User, Database, Palette } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import ExportDialog from "@/components/ExportDialog";
import ImportDialog from "@/components/ImportDialog";
import { Button } from "@/components/ui/button";

export default function SettingsPage() {
  const { theme, toggleTheme } = useTheme();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
    toast.success("Você saiu da conta");
  };

  return (
    <div className="p-6 lg:p-10 max-w-3xl">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <SettingsIcon className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold tracking-tight text-foreground">Configurações</h1>
            <p className="text-sm text-muted-foreground">Personalize sua experiência no app</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Conta */}
          <section className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <User className="w-4 h-4 text-muted-foreground" />
              <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Conta</h2>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-foreground">{user?.email || "Conta anônima"}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {user?.email ? "Usuário autenticado" : "Sessão sem e-mail vinculado"}
                </p>
              </div>
              <Button onClick={handleSignOut} variant="outline" size="sm" className="gap-2">
                <LogOut className="w-3.5 h-3.5" />
                Sair
              </Button>
            </div>
          </section>

          {/* Aparência */}
          <section className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Palette className="w-4 h-4 text-muted-foreground" />
              <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Aparência</h2>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-foreground">Tema</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Atualmente em modo {theme === "dark" ? "escuro" : "claro"}
                </p>
              </div>
              <Button onClick={toggleTheme} variant="outline" size="sm" className="gap-2">
                {theme === "dark" ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                {theme === "dark" ? "Modo Claro" : "Modo Escuro"}
              </Button>
            </div>
          </section>

          {/* Dados */}
          <section className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Database className="w-4 h-4 text-muted-foreground" />
              <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Dados</h2>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-foreground">Exportar dados</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Faça backup de competições, times e elencos em JSON
                  </p>
                </div>
                <ExportDialog
                  trigger={
                    <Button variant="outline" size="sm">Exportar</Button>
                  }
                />
              </div>
              <div className="h-px bg-border" />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-foreground">Importar dados</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Restaure um backup anterior do app
                  </p>
                </div>
                <ImportDialog
                  trigger={
                    <Button variant="outline" size="sm">Importar</Button>
                  }
                />
              </div>
            </div>
          </section>
        </div>
      </motion.div>
    </div>
  );
}
