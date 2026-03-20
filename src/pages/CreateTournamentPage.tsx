import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import TournamentForm from "@/components/TournamentForm";
import { useTournamentStore } from "@/store/tournamentStore";

export default function CreateTournamentPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { tournaments } = useTournamentStore();
  const editTournament = id ? tournaments.find((t) => t.id === id) : undefined;
  const isEdit = !!editTournament;

  return (
    <div className="p-6 lg:p-10 max-w-lg">
      <button
        onClick={() => navigate(isEdit ? `/tournament/${id}` : "/")}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm">Voltar</span>
      </button>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-2xl font-display font-bold text-foreground">
          {isEdit ? "Editar Competição" : "Criar Competição"}
        </h2>
        <p className="text-sm text-muted-foreground mt-1 mb-6">
          {isEdit ? "Altere os detalhes da competição" : "Configure os detalhes da competição"}
        </p>

        <TournamentForm
          editTournament={editTournament}
          onSuccess={() => navigate(isEdit ? `/tournament/${id}` : "/")}
        />
      </motion.div>
    </div>
  );
}
