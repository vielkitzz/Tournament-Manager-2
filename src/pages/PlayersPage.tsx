import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTournamentStore } from "@/store/tournamentStore";
import { Users, Search, ArrowDownAZ, Star } from "lucide-react";
import TeamLogo from "@/components/TeamLogo";
import PageTransition from "@/components/PageTransition";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type SortMode = "name" | "rate";

export default function PlayersPage() {
  const { teams, players, loading } = useTournamentStore();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("name");

  const activeTeams = useMemo(() => teams.filter((t) => !t.isArchived), [teams]);

  const filteredTeams = useMemo(() => {
    let list = activeTeams;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.shortName?.toLowerCase().includes(q) ||
          t.abbreviation?.toLowerCase().includes(q)
      );
    }
    if (sortMode === "name") {
      list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    } else {
      list = [...list].sort((a, b) => (b.rate ?? 0) - (a.rate ?? 0));
    }
    return list;
  }, [activeTeams, search, sortMode]);

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
      <div className="p-6 lg:p-10 max-w-7xl mx-auto">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground tracking-tight flex items-center gap-2">
              Elencos
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Selecione um clube para gerir o seu elenco ({activeTeams.length} clubes)
            </p>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="mb-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar clube..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-secondary border-border"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={sortMode === "name" ? "default" : "outline"}
              size="sm"
              onClick={() => setSortMode("name")}
              className="gap-1.5"
            >
              <ArrowDownAZ className="w-4 h-4" />
              A-Z
            </Button>
            <Button
              variant={sortMode === "rate" ? "default" : "outline"}
              size="sm"
              onClick={() => setSortMode("rate")}
              className="gap-1.5"
            >
              <Star className="w-4 h-4" />
              Rate
            </Button>
          </div>
        </div>

        {loading ? (
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
        ) : filteredTeams.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
            {activeTeams.length === 0 ? (
              <>
                <p className="text-sm">Nenhum clube cadastrado</p>
                <p className="text-sm mt-1">
                  Crie um time primeiro em{" "}
                  <Link to="/teams/create" className="text-primary underline">
                    Novo Time
                  </Link>
                  .
                </p>
              </>
            ) : (
              <p className="text-sm">Nenhum clube encontrado para "{search}"</p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {filteredTeams.map((team) => {
              const count = playerCountByTeam[team.id] || 0;
              return (
                <div
                  key={team.id}
                  onClick={() => navigate(`/squads/team/${team.id}`)}
                  className="min-h-[76px] p-3 rounded-xl card-gradient border border-border hover:border-primary/40 transition-all relative overflow-hidden group cursor-pointer active:scale-[0.98]"
                >
                  <div className="absolute left-0 top-0 bottom-0 w-1.5 rounded-l-xl overflow-hidden flex flex-col">
                    {(team.colors && team.colors.length > 0
                      ? team.colors
                      : ["hsl(var(--primary))", "hsl(var(--secondary))"]
                    ).map((c, i) => (
                      <div key={i} className="flex-1" style={{ backgroundColor: c }} />
                    ))}
                  </div>

                  <div className="flex items-center gap-3 pl-3">
                    <div className="w-10 h-10 flex items-center justify-center shrink-0">
                      <TeamLogo src={team.logo} alt={team.name} size={40} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-display font-bold text-foreground text-sm truncate group-hover:text-primary transition-colors">
                        {team.name}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {count} jogador{count !== 1 ? "es" : ""}{" "}
                        {sortMode === "rate" && (
                          <span className="text-primary font-mono">({team.rate?.toFixed(2)})</span>
                        )}
                      </p>
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
