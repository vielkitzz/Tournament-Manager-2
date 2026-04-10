import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useTournamentStore } from "@/store/tournamentStore";
import { Card, CardContent } from "@/components/ui/card";
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
        <div className="p-6 lg:p-8 space-y-4">
          <div className="h-8 w-48 bg-muted animate-pulse rounded" />
          <div className="h-4 w-32 bg-muted animate-pulse rounded" />
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="p-6 lg:p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Users className="w-6 h-6" />
            Elencos
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Selecione um clube para gerir o seu elenco ({activeTeams.length} clubes)
          </p>
        </div>

        {activeTeams.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="font-medium">Nenhum clube cadastrado</p>
            <p className="text-sm mt-1">
              Crie um time primeiro em{" "}
              <Link to="/teams/create" className="text-primary underline">
                Novo Time
              </Link>
              .
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {activeTeams.map((team) => {
              const count = playerCountByTeam[team.id] || 0;
              return (
                <Link key={team.id} to={`/players/team/${team.id}`}>
                  <Card className="hover:border-primary/40 hover:shadow-md transition-all cursor-pointer group">
                    <CardContent className="p-5 flex items-center gap-4">
                      <div className="w-14 h-14 flex items-center justify-center shrink-0">
                        <TeamLogo src={team.logo} alt={team.name} size={48} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                          {team.name}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {count} jogador{count !== 1 ? "es" : ""}
                        </p>
                        <div className="mt-1.5 h-1.5 rounded-full bg-muted overflow-hidden">
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
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </PageTransition>
  );
}
