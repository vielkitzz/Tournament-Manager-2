import { useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useTournamentStore } from "@/store/tournamentStore";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, PlusCircle, Pencil, Trash2 } from "lucide-react";
import TeamLogo from "@/components/TeamLogo";
import CountryFlag from "@/components/CountryFlag";
import PageTransition from "@/components/PageTransition";
import { toast } from "sonner";

const MAX_PLAYERS = 24;

export default function ClubSquadPage() {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const { teams, players, removePlayer } = useTournamentStore();

  const team = useMemo(() => teams.find((t) => t.id === teamId), [teams, teamId]);
  const squad = useMemo(() => {
    return players
      .filter((p) => p.teamId === teamId)
      .sort((a, b) => {
        // Pega a posição exata (ou string vazia se não tiver)
        const posA = a.position || "";
        const posB = b.position || "";

        // Busca o peso correspondente no objeto
        const weightA = POSITION_WEIGHTS[posA] || 99;
        const weightB = POSITION_WEIGHTS[posB] || 99;

        // Ordena pelo setor do campo (Goleiro -> Defesa -> Meio -> Ataque)
        if (weightA !== weightB) {
          return weightA - weightB;
        }

        // Se forem da mesma posição (ex: dois zagueiros), ordena pelo número da camisa
        return (a.shirtNumber ?? 99) - (b.shirtNumber ?? 99);
      });
  }, [players, teamId]);

  const handleDelete = async (id: string, name: string) => {
    await removePlayer(id);
    toast.success(`${name} removido do elenco`);
  };

  if (!team) {
    return (
      <PageTransition>
        <div className="p-6 lg:p-8">
          <p className="text-muted-foreground">Clube não encontrado.</p>
          <Button variant="ghost" onClick={() => navigate("/players")} className="mt-4 gap-2">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Button>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="p-6 lg:p-8 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/players")}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <TeamLogo src={team.logo} alt={team.name} size={40} />
            <div>
              <h1 className="text-xl font-bold text-foreground">{team.name}</h1>
              <p className="text-sm text-muted-foreground">
                {squad.length} / {MAX_PLAYERS} jogadores (mín. 11)
              </p>
            </div>
          </div>
          {squad.length < MAX_PLAYERS && (
            <Link to={`/players/team/${teamId}/create`}>
              <Button className="gap-2">
                <PlusCircle className="w-4 h-4" />
                Adicionar Jogador
              </Button>
            </Link>
          )}
        </div>

        {squad.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="font-medium">Elenco vazio</p>
            <p className="text-sm mt-1">Adicione jogadores a este clube.</p>
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Nacionalidade</TableHead>
                  <TableHead>Posição</TableHead>
                  <TableHead>Idade</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead className="w-20 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {squad.map((player) => (
                  <TableRow key={player.id}>
                    <TableCell className="font-medium">{player.shirtNumber ?? "—"}</TableCell>
                    <TableCell className="font-medium">{player.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {player.nationality ? (
                        <span className="flex items-center gap-1.5">
                          <CountryFlag country={player.nationality} size={18} />
                          {player.nationality}
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{player.position || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{player.age ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{player.rating?.toFixed(2) ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link to={`/players/${player.id}/edit`}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(player.id, player.name)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
