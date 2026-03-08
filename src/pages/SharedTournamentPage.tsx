import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Trophy } from "lucide-react";
import { Tournament, Match, SeasonRecord, TournamentSettings } from "@/types/tournament";

export default function SharedTournamentPage() {
  const { token } = useParams<{ token: string }>();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!token) { setError(true); setLoading(false); return; }

    const load = async () => {
      const { data: pub } = await supabase
        .from("published_tournaments")
        .select("*")
        .eq("share_token", token)
        .maybeSingle();

      if (!pub || !pub.tournament_id) { setError(true); setLoading(false); return; }

      const { data: t } = await supabase
        .from("tournaments")
        .select("*")
        .eq("id", pub.tournament_id)
        .maybeSingle();

      if (!t) { setError(true); setLoading(false); return; }

      setTournament({
        id: t.id,
        name: t.name,
        sport: t.sport,
        year: t.year,
        format: t.format as Tournament["format"],
        numberOfTeams: t.number_of_teams,
        logo: t.logo || undefined,
        teamIds: t.team_ids || [],
        settings: t.settings as unknown as TournamentSettings,
        matches: (t.matches || []) as unknown as Match[],
        finalized: t.finalized,
        groupsFinalized: t.groups_finalized || false,
        seasons: (t.seasons || []) as unknown as SeasonRecord[],
        ligaTurnos: t.liga_turnos as Tournament["ligaTurnos"],
        gruposQuantidade: t.grupos_quantidade || undefined,
        gruposTurnos: t.grupos_turnos as Tournament["gruposTurnos"],
        gruposMataMataInicio: t.grupos_mata_mata_inicio as Tournament["gruposMataMataInicio"],
        mataMataInicio: t.mata_mata_inicio as Tournament["mataMataInicio"],
        suicoJogosLiga: t.suico_jogos_liga || undefined,
        suicoMataMataInicio: t.suico_mata_mata_inicio as Tournament["suicoMataMataInicio"],
        suicoPlayoffVagas: t.suico_playoff_vagas || undefined,
      });
      setLoading(false);
    };

    load();
  }, [token]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <p className="text-muted-foreground">Carregando...</p>
    </div>
  );

  if (error || !tournament) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background gap-4">
      <Trophy className="w-12 h-12 text-muted-foreground" />
      <h1 className="text-xl font-bold text-foreground">Link inválido</h1>
      <p className="text-sm text-muted-foreground">Esta competição não foi encontrada ou não está mais disponível.</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-background p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        {tournament.logo ? (
          <img src={tournament.logo} alt="" className="w-14 h-14 object-contain" />
        ) : (
          <Trophy className="w-8 h-8 text-muted-foreground" />
        )}
        <div>
          <h1 className="text-2xl font-bold text-foreground">{tournament.name}</h1>
          <p className="text-sm text-muted-foreground">{tournament.sport} · {tournament.year} · {tournament.format}</p>
        </div>
      </div>

      {tournament.seasons && tournament.seasons.length > 0 ? (
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Temporadas</h2>
          {tournament.seasons.map((s, i) => (
            <div key={i} className="p-4 rounded-xl border border-border bg-card">
              <p className="font-semibold text-foreground">{s.year}</p>
              {s.championId && <p className="text-sm text-muted-foreground">Campeão: {s.championId}</p>}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-8">Nenhuma temporada simulada ainda.</p>
      )}
    </div>
  );
}
