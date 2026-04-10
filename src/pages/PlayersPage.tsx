import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useTournamentStore } from "@/store/tournamentStore";
import { Users } from "lucide-react";
import TeamLogo from "@/components/TeamLogo";
import PageTransition from "@/components/PageTransition";

export default function PlayersPage() {
  const { teams, players, loading } = useTournamentStore();

  const activeTeams = useMemo(() => teams.filter((t) => !t.isArchived), [teams]);

  const playerCountByTeam = useMemo(() => {
    const map: Record<string, number> = {};
    for (const p of players) {
      if (p.teamId) {
        map[p.teamId] = (map[p.teamId] || 0) + 1;
      }
    }
    return map;
  }, [players]);

  if (loading) {
    return (
      <PageTransition>
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
          <div className="h-8 w-48 bg-muted animate-pulse rounded" />
          <div className="h-4 w-32 bg-muted animate-pulse rounded" />
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      {/* Container padronizado com o TeamsPage (max-w-7xl) */}
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        {/* Cabeçalho */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2 text-foreground">
              <Users className="w-6 h-6 text-primary" />
              Elencos
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Selecione um clube para gerir o seu elenco ({activeTeams.length} clubes)
            </p>
          </div>
        </div>

        {/* Estado Vazio (Igual ao do TeamsPage) */}
        {activeTeams.length === 0 ? (
          <div className="text-center py-16">
            <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">Nenhum clube cadastrado</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Crie um time primeiro em{" "}
              <Link to="/teams/create" className="text-primary hover:underline">
                Novo Time
              </Link>
            </p>
          </div>
        ) : (
          /* Grid padronizado com o TeamsPage */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {activeTeams.map((team) => {
              const count = playerCountByTeam[team.id] || 0;
              const maxPlayers = 30; // Altere se o limite for outro
              const percentage = Math.min((count / maxPlayers) * 100, 100);

              const barColorClass =
                count >= 11 && count <= maxPlayers
                  ? "bg-primary"
                  : count > maxPlayers
                    ? "bg-destructive"
                    : "bg-amber-500";

              return (
                <Link
                  key={team.id}
                  to={`/players/team/${team.id}`}
                  // Classes exatas do TeamCard (com altura levemente maior para caber a barra de progresso)
                  className="group relative bg-card rounded-xl border border-border/50 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex items-center h-[84px]"
                >
                  {/* Listra lateral de cor (Igual ao TeamsPage) */}
                  <div
                    className="w-1.5 h-full shrink-0"
                    style={{ backgroundColor: team.colors?.[0] || "hsl(var(--primary))" }}
                  />

                  {/* Conteúdo do Card */}
                  <div className="flex-1 flex items-center p-3 gap-3 min-w-0">
                    {/* Fundo do Logo (Igual ao TeamsPage) */}
                    <div className="w-10 h-10 shrink-0 flex items-center justify-center bg-secondary/20 rounded-md p-1">
                      <TeamLogo src={team.logo} alt={team.name} size={32} />
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-sm truncate text-foreground group-hover:text-primary transition-colors">
                          {team.name}
                        </p>
                        {/* Indicador de capacidade no lugar do rating do TeamsPage */}
                        <span className="text-[11px] text-muted-foreground font-mono shrink-0">
                          {count}/{maxPlayers}
                        </span>
                      </div>

                      {/* Barra de Progresso adaptada para o layout compacto */}
                      <div className="mt-1.5 w-full">
                        <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ease-out ${barColorClass}`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1 truncate">
                          {count < 11
                            ? `Faltam ${11 - count} (mín. 11)`
                            : count < maxPlayers
                              ? `${maxPlayers - count} vagas livres`
                              : "Elenco Lotado"}
                        </p>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </PageTransition>
  );
}
