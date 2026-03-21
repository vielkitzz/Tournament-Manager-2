import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, FileText, History } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import TournamentForm from "@/components/TournamentForm";
import TemplateSelector from "@/components/TemplateSelector";
import { useTournamentStore } from "@/store/tournamentStore";
import type { TournamentTemplate } from "@/data/templates";

type Mode = "choose" | "scratch" | "template-select" | "template-form";

export default function CreateTournamentPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { tournaments } = useTournamentStore();
  const editTournament = id ? tournaments.find((t) => t.id === id) : undefined;
  const isEdit = !!editTournament;

  const [mode, setMode] = useState<Mode>(isEdit ? "scratch" : "choose");
  const [selectedTemplate, setSelectedTemplate] = useState<TournamentTemplate | null>(null);

  const handleTemplateSelect = (template: TournamentTemplate) => {
    setSelectedTemplate(template);
    setMode("template-form");
  };

  return (
    <div className="p-6 lg:p-10 max-w-lg">
      <button
        onClick={() => {
          if (mode === "template-select") {
            setMode("choose");
          } else if (mode === "template-form") {
            setMode("template-select");
            setSelectedTemplate(null);
          } else {
            navigate(isEdit ? `/tournament/${id}` : "/");
          }
        }}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm">Voltar</span>
      </button>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        {/* Mode: Choose */}
        {mode === "choose" && (
          <>
            <h2 className="text-2xl font-display font-bold text-foreground">Criar Competição</h2>
            <p className="text-sm text-muted-foreground mt-1 mb-6">
              Como deseja começar?
            </p>
            <div className="grid gap-3">
              <button
                onClick={() => setMode("scratch")}
                className="flex items-center gap-4 p-5 rounded-xl bg-secondary/50 border border-border hover:border-primary/50 hover:bg-secondary transition-all text-left group"
              >
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary/20 transition-colors">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Começar do Zero</p>
                  <p className="text-xs text-muted-foreground">Configure todos os detalhes manualmente</p>
                </div>
              </button>
              <button
                onClick={() => setMode("template-select")}
                className="flex items-center gap-4 p-5 rounded-xl bg-secondary/50 border border-border hover:border-primary/50 hover:bg-secondary transition-all text-left group"
              >
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary/20 transition-colors">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Usar Template Histórico</p>
                  <p className="text-xs text-muted-foreground">Baseado em competições reais do mundo</p>
                </div>
              </button>
            </div>
          </>
        )}

        {/* Mode: Template selector */}
        {mode === "template-select" && (
          <>
            <h2 className="text-2xl font-display font-bold text-foreground">Template Histórico</h2>
            <p className="text-sm text-muted-foreground mt-1 mb-6">
              Selecione a competição e o formato
            </p>
            <TemplateSelector
              onSelect={handleTemplateSelect}
              onCancel={() => setMode("choose")}
            />
          </>
        )}

        {/* Mode: Scratch or Template form */}
        {(mode === "scratch" || mode === "template-form") && (
          <>
            <h2 className="text-2xl font-display font-bold text-foreground">
              {isEdit ? "Editar Competição" : mode === "template-form" ? selectedTemplate?.originalName || "Criar Competição" : "Criar Competição"}
            </h2>
            <p className="text-sm text-muted-foreground mt-1 mb-6">
              {isEdit
                ? "Altere os detalhes da competição"
                : mode === "template-form"
                  ? `${selectedTemplate?.era} · ${selectedTemplate?.numberOfTeams} times`
                  : "Configure os detalhes da competição"}
            </p>

            <TournamentForm
              editTournament={editTournament}
              initialTemplate={mode === "template-form" ? selectedTemplate ?? undefined : undefined}
              onSuccess={() => navigate(isEdit ? `/tournament/${id}` : "/")}
            />
          </>
        )}
      </motion.div>
    </div>
  );
}
