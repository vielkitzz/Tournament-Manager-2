import { motion } from "framer-motion";
import { Settings as SettingsIcon, Moon, Sun, LogOut, User, Database, Palette } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import ExportDialog from "@/components/ExportDialog";
import ImportDialog from "@/components/ImportDialog";
import SkinSelector from "@/components/SkinSelector";
import { Button } from "@/components/ui/button";
import { useRef } from "react";
import { Upload, X, Download, ImageIcon } from "lucide-react";
import { useSkin, exportSkinsJson, parseImportedSkins } from "@/hooks/useSkin";
import { useCustomLogo } from "@/hooks/useCustomLogo";

export default function SettingsPage() {
  const { theme, toggleTheme } = useTheme();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { skins, activeSkin, importSkins } = useSkin();
  const { logoUrl, saveLogo, removeLogo } = useCustomLogo();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const skinImportRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione um arquivo de imagem");
      return;
    }
    try {
      await saveLogo(file);
      toast.success("Logo atualizado");
    } catch {
      toast.error("Erro ao processar imagem");
    }
    e.target.value = "";
  };

  const handleExportSkins = () => {
    const custom = skins.filter((s) => !s.builtin);
    if (custom.length === 0) {
      toast.error("Nenhuma skin personalizada para exportar");
      return;
    }
    const blob = new Blob([exportSkinsJson(custom)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tm2-skins.json";
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${custom.length} skin(s) exportada(s)`);
  };

  const handleImportSkins = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const imported = parseImportedSkins(text);
      if (imported.length === 0) {
        toast.error("Nenhuma skin válida encontrada no arquivo");
        return;
      }
      importSkins(imported);
      toast.success(`${imported.length} skin(s) importada(s)`);
    } catch {
      toast.error("Arquivo inválido");
    }
    e.target.value = "";
  };

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

            {/* Tema claro/escuro */}
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

            {/* Logo personalizado */}
            <div className="mt-5 pt-5 border-t border-border">
              <p className="text-sm text-foreground mb-1">Logo do TM2</p>
              <p className="text-xs text-muted-foreground mb-3">
                Substitua o logo padrão por uma imagem personalizada (salvo como WebP)
              </p>
              <div className="flex items-center gap-3">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt="Logo personalizado"
                    className="h-10 w-10 rounded-lg object-contain border border-border bg-muted"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-lg border border-dashed border-border bg-muted flex items-center justify-center text-muted-foreground">
                    <ImageIcon className="w-4 h-4" />
                  </div>
                )}
                <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                <Button variant="outline" size="sm" className="gap-2" onClick={() => logoInputRef.current?.click()}>
                  <Upload className="w-3.5 h-3.5" />
                  {logoUrl ? "Trocar logo" : "Enviar logo"}
                </Button>
                {logoUrl && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2 text-destructive hover:text-destructive"
                    onClick={() => {
                      removeLogo();
                      toast.success("Logo removido");
                    }}
                  >
                    <X className="w-3.5 h-3.5" />
                    Remover
                  </Button>
                )}
              </div>
            </div>

            {/* Skin */}
            <div className="mt-5 pt-5 border-t border-border">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm text-foreground">Skin</p>
                <div className="flex items-center gap-2">
                  <input
                    ref={skinImportRef}
                    type="file"
                    accept=".json,application/json"
                    className="hidden"
                    onChange={handleImportSkins}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 text-xs h-7 px-2"
                    onClick={() => skinImportRef.current?.click()}
                  >
                    <Upload className="w-3 h-3" />
                    Importar
                  </Button>
                  <Button variant="ghost" size="sm" className="gap-1.5 text-xs h-7 px-2" onClick={handleExportSkins}>
                    <Download className="w-3 h-3" />
                    Exportar
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mb-3">Escolha uma paleta visual completa para a interface</p>
              <SkinSelector />
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
                    <Button variant="outline" size="sm">
                      Exportar
                    </Button>
                  }
                />
              </div>
              <div className="h-px bg-border" />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-foreground">Importar dados</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Restaure um backup anterior do app</p>
                </div>
                <ImportDialog
                  trigger={
                    <Button variant="outline" size="sm">
                      Importar
                    </Button>
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
