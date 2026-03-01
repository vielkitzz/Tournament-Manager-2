import { motion } from "framer-motion";
import { Trophy, Plus, Pencil, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { useTournamentStore } from "@/store/tournamentStore";
import { toast } from "sonner";
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

export default function HomePage() {
  const { tournaments, removeTournament, loading } = useTournamentStore();
  const navigate = useNavigate();

  const handleDelete = (id: string, name: string) => {
    removeTournament(id);
    toast.success(`"${name}" excluído`);
  };

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground tracking-tight">
            Minhas Competições
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie suas competições
          </p>
        </div>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {tournaments.map((t, index) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                onClick={() => navigate(`/tournament/${t.id}`)}
                className="group cursor-pointer"
              >
                <motion.div
                  whileHover={{ y: -2, boxShadow: "0 8px 30px hsl(217 91% 60% / 0.12)" }}
                  className="h-[120px] p-5 rounded-xl card-gradient border border-border hover:border-primary/30 transition-all relative"
                >
                  <div className="flex items-start gap-4 h-full">
                    <div className="w-11 h-11 rounded-lg bg-secondary/60 flex items-center justify-center shrink-0">
                      {t.logo ? (
                        <img src={t.logo} alt="" className="w-9 h-9 object-contain rounded" />
                      ) : (
                        <Trophy className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1 flex flex-col justify-center">
                      <h3 className="font-display font-bold text-foreground text-sm truncate leading-tight">
                        {t.name}
                      </h3>
                      <p className="text-xs text-primary mt-1">
                        {t.sport} <span className="text-muted-foreground mx-0.5">·</span> {t.year}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {formatLabels[t.format]} · {t.numberOfTeams} times
                      </p>
                    </div>
                    <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/tournament/${t.id}`);
                        }}
                        className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
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
                            <AlertDialogTitle>Excluir "{t.name}"?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta ação não pode ser desfeita. Todos os dados da competição serão perdidos.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(t.id, t.name)}
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
              </motion.div>
            ))}

            {/* Add new card - same height */}
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
        </>
      )}
    </div>
  );
}
