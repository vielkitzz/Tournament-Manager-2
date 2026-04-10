import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTournamentStore } from "@/store/tournamentStore";
import { Users } from "lucide-react";
import TeamLogo from "@/components/TeamLogo";
import PageTransition from "@/components/PageTransition";
import { Skeleton } from "@/components/ui/skeleton";

export default function PlayersPage() {
  const { teams, players, loading } = useTournamentStore();
  const navigate = useNavigate();

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

  return (
    <PageTransition>
      {/* ✅ Mesmo padding e max-width do TeamsPage */}
      <div className="p-6 lg:p-10 max-w-7xl mx-auto">
        {/* ✅ Header com mesmo layout responsivo do TeamsPage */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            {/* ✅ Mesmo font-display e tracking-tight do TeamsPage */}
            <h1 className="text-2xl font-display font-bold text-foreground tracking-tight flex items-center gap-2">
              <Users className="w-6 h-6" />
              Elencos
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Selecione um clube para gerir o seu elenco ({activeTeams.length} clubes)
            </p>
          </div>
        </div>

        {loading ? (
          // ✅ Mesmo skeleton pattern do TeamsPage
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-4 rounded-xl border border-border">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-10 h-10 rounded-md" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : activeTeams.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nenhum clube cadastrado</p>
            <p className="text-sm mt-1">
              Crie um time primeiro em{" "}
              <Link to="/teams/create" className="text-primary underline">
                Novo Time
              </Link>
              .
            </p>
          </div>
        ) : (
          // ✅ gap-3 igual ao TeamsPage (era gap-4)
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {activeTeams.map((team) => {
              const count = playerCountByTeam[team.id] || 0;
              return (
                // ✅ Mesmo estilo de card do TeamsPage: div com p-3 rounded-xl card-gradient border
                <div
                  key={team.id}
                  onClick={() => navigate(`/players/team/${team.id}`)}
                  className="p-3 rounded-xl card-gradient border border-border hover:border-primary/40 transition-all relative overflow-hidden group cursor-pointer active:scale-[0.98]"
                >
                  {/* ✅ Mesma barra lateral colorida do TeamsPage */}
                  <div className="absolute left-0 top-0 bottom-0 w-1.5 rounded-l-xl overflow-hidden flex flex-col">
                    {(team.colors && team.colors.length > 0
                      ? team.colors
                      : ["hsl(var(--primary))", "hsl(var(--secondary))"]
                    ).map((c, i) => (
                      <div key={i} className="flex-1" style={{ backgroundColor: c }} />
                    ))}
                  </div>

                  {/* ✅ Mesmo layout interno do TeamCard */}
                  <div className="flex items-center gap-2 pl-2">
                    <div className="w-10 h-10 flex items-center justify-center shrink-0">
                      <TeamLogo src={team.logo} alt={team.name} size={40} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-display font-bold text-foreground text-sm truncate group-hover:text-primary transition-colors">
                        {team.name}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {count} jogador{count !== 1 ? "es" : ""}
                      </p>
                      {/* Barra de progresso mantida pois é específica desta página */}
                      <div className="mt-1.5 h-1 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            count >= 11 && count <= 30 ? "bg-primary" : count > 30 ? "bg-destructive" : "bg-amber-500"
                          }`}
                          style={{ width: `${Math.min((count / 30) * 100, 100)}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {count < 11
                          ? `Faltam ${11 - count} (mín. 11)`
                          : count <= 30
                            ? `${30 - count} vagas restantes`
                            : "Elenco cheio"}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PageTransition>
  );
}
