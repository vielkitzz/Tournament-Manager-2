import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Trophy } from "lucide-react";
import { useTournamentStore } from "@/store/tournamentStore";
import GalleryView from "@/components/tournament/GalleryView";
import { SeasonRecord } from "@/types/tournament";

export default function TournamentGalleryPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { tournaments, teams, updateTournament } = useTournamentStore();
  const tournament = tournaments.find((t) => t.id === id);

  if (!tournament) {
    return (
      <div className="p-6 lg:p-8 text-center py-20">
        <Trophy className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-muted-foreground">Competição não encontrada</p>
        <button onClick={() => navigate("/")} className="text-primary text-sm mt-3 hover:underline">
          Voltar ao início
        </button>
      </div>
    );
  }

  const handleUpdateSeasons = (seasons: SeasonRecord[]) => {
    updateTournament(tournament.id, { seasons });
  };

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate(`/tournament/${id}`)} className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="text-xl font-display font-bold text-foreground">Galeria de Campeões — {tournament.name}</h1>
      </div>

      <GalleryView
        seasons={tournament.seasons || []}
        teams={teams}
        onUpdateSeasons={handleUpdateSeasons}
      />
    </div>
  );
}
