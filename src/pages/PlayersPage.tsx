import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useTournamentStore } from "@/store/tournamentStore";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, Search, Pencil, Trash2, Users } from "lucide-react";
import TeamLogo from "@/components/TeamLogo";
import PageTransition from "@/components/PageTransition";
import { toast } from "sonner";

export default function PlayersPage() {
  const { players, teams, removePlayer, loading } = useTournamentStore();
  const [search, setSearch] = useState("");
  const [teamFilter, setTeamFilter] = useState("all");

  const filtered = useMemo(() => {
    return players.filter((p) => {
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
      const matchesTeam = teamFilter === "all" ? true : teamFilter === "free" ? !p.teamId : p.teamId === teamFilter;
      return matchesSearch && matchesTeam;
    });
  }, [players, search, teamFilter]);

  const getTeamName = (teamId: string | null) => {
    if (!teamId) return "Agente Livre";
    return teams.find((t) => t.id === teamId)?.name || "—";
  };

  const getTeamForLogo = (teamId: string | null) => {
    if (!teamId) return undefined;
    return teams.find((t) => t.id === teamId);
  };

  const handleDelete = async (id: string, name: string) => {
    await removePlayer(id);
    toast.success(`${name} removido com sucesso`);
  };

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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Users className="w-6 h-6" />
              Jogadores
            </h1>
            <p className="text-sm text-muted-foreground mt-1">{players.length} jogador(es) cadastrado(s)</p>
          </div>
          <Link to="/players/create">
            <Button>
              <PlusCircle className="w-4 h-4 mr-2" />
              Novo Jogador
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar jogador..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={teamFilter} onValueChange={setTeamFilter}>
            <SelectTrigger className="w-full sm:w-56">
              <SelectValue placeholder="Filtrar por time" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os times</SelectItem>
              <SelectItem value="free">Agentes Livres</SelectItem>
              {teams.filter((t) => !t.isArchived).map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="font-medium">Nenhum jogador encontrado</p>
            <p className="text-sm mt-1">Crie um novo jogador para começar.</p>
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Posição</TableHead>
                  <TableHead>Camisa</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead className="w-24 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((player, idx) => {
                  const team = getTeamForLogo(player.teamId);
                  return (
                    <TableRow key={player.id}>
                      <TableCell className="text-muted-foreground text-xs">{String(idx + 1)}</TableCell>
                      <TableCell className="font-medium">{player.name}</TableCell>
                      <TableCell className="text-muted-foreground">{player.position || "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{player.shirtNumber ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{player.rating ?? "—"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {team && <TeamLogo team={team} size={16} />}
                          <span className="text-sm">{getTeamName(player.teamId)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link to={`/players/${player.id}/edit`}>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                          </Link>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(player.id, player.name)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
