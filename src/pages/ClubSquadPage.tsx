import { useMemo, useRef, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useTournamentStore } from "@/store/tournamentStore";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, PlusCircle, Pencil, Trash2, Download, Upload, Calendar, Plus, X } from "lucide-react";
import TeamLogo from "@/components/TeamLogo";
import CountryFlag from "@/components/CountryFlag";
import PageTransition from "@/components/PageTransition";
import { toast } from "sonner";
import { Player } from "@/types/tournament";

const MAX_PLAYERS = 30;

const POSITION_WEIGHTS: Record<string, number> = {
  Goleiro: 1,
  Zagueiro: 2,
  "Lateral Direito": 3,
  "Lateral Esquerdo": 4,
  Volante: 5,
  Meia: 6,
  "Meia Atacante": 7,
  "Ponta Direita": 8,
  "Ponta Esquerda": 9,
  Centroavante: 10,
  Atacante: 11,
};

const ALL_YEARS_VALUE = "__all__";
const NO_YEAR_VALUE = "__none__";

export default function ClubSquadPage() {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const { teams, players, removePlayer, addPlayer, updatePlayer } = useTournamentStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const team = useMemo(() => teams.find((t) => t.id === teamId), [teams, teamId]);

  // Collect distinct years from this team's players
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    players
      .filter((p) => p.teamId === teamId)
      .forEach((p) => {
        if (p.seasonYear != null) years.add(p.seasonYear);
      });
    return Array.from(years).sort((a, b) => b - a);
  }, [players, teamId]);

  const hasPlayersWithoutYear = useMemo(() => {
    return players.some((p) => p.teamId === teamId && p.seasonYear == null);
  }, [players, teamId]);

  const [selectedYear, setSelectedYear] = useState<string>(ALL_YEARS_VALUE);
  const [showCreateYearDialog, setShowCreateYearDialog] = useState(false);
  const [newYearValue, setNewYearValue] = useState<string>(String(new Date().getFullYear()));
  const [showDeleteYearConfirm, setShowDeleteYearConfirm] = useState(false);
  const [showRenameYearDialog, setShowRenameYearDialog] = useState(false);
  const [renameYearValue, setRenameYearValue] = useState<string>("");

  const squad = useMemo(() => {
    return players
      .filter((p) => {
        if (p.teamId !== teamId) return false;
        if (selectedYear === ALL_YEARS_VALUE) return true;
        if (selectedYear === NO_YEAR_VALUE) return p.seasonYear == null;
        const yr = parseInt(selectedYear);
        return p.seasonYear === yr;
      })
      .sort((a, b) => {
        const posA = a.position || "";
        const posB = b.position || "";
        const weightA = POSITION_WEIGHTS[posA] || 99;
        const weightB = POSITION_WEIGHTS[posB] || 99;
        if (weightA !== weightB) return weightA - weightB;
        return (a.shirtNumber ?? 99) - (b.shirtNumber ?? 99);
      });
  }, [players, teamId, selectedYear]);

  const handleDelete = async (id: string, name: string) => {
    await removePlayer(id);
    toast.success(`${name} removido do elenco`);
  };

  const activeSeasonYear = selectedYear !== ALL_YEARS_VALUE && selectedYear !== NO_YEAR_VALUE
    ? parseInt(selectedYear)
    : undefined;

  const handleExportSquad = () => {
    if (squad.length === 0) {
      toast.error("Elenco vazio, nada para exportar");
      return;
    }
    const exportData = {
      _type: "squad",
      _version: 2,
      _exportedAt: new Date().toISOString(),
      teamName: team?.name || "Unknown",
      seasonYear: activeSeasonYear ?? null,
      players: squad.map(({ id, ...p }) => ({
        name: p.name,
        nationality: p.nationality,
        position: p.position,
        age: p.age,
        shirtNumber: p.shirtNumber,
        rating: p.rating,
        photoUrl: p.photoUrl,
        seasonYear: p.seasonYear ?? null,
      })),
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const yearSuffix = activeSeasonYear ? `-${activeSeasonYear}` : "";
    a.download = `elenco-${(team?.abbreviation || team?.name || "squad").toLowerCase().replace(/\s+/g, "-")}${yearSuffix}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Elenco exportado com sucesso!");
  };

  const handleImportSquad = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !teamId) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (!data.players || !Array.isArray(data.players)) {
          toast.error("Arquivo inválido: não contém jogadores");
          return;
        }
        const yearPlayers = players.filter((p) => {
          if (p.teamId !== teamId) return false;
          if (activeSeasonYear != null) return p.seasonYear === activeSeasonYear;
          return p.seasonYear == null;
        });
        const available = MAX_PLAYERS - yearPlayers.length;
        if (available <= 0) {
          toast.error("Elenco já está cheio para este ano");
          return;
        }
        const toImport = data.players.slice(0, available);
        let imported = 0;
        for (const p of toImport) {
          const newPlayer: Player = {
            id: crypto.randomUUID(),
            name: p.name || "Jogador",
            teamId,
            nationality: p.nationality || undefined,
            position: p.position || undefined,
            age: p.age ?? undefined,
            shirtNumber: p.shirtNumber ?? undefined,
            rating: p.rating ?? 5,
            photoUrl: p.photoUrl || undefined,
            seasonYear: activeSeasonYear ?? p.seasonYear ?? undefined,
          };
          await addPlayer(newPlayer);
          imported++;
        }
        toast.success(`${imported} jogador${imported !== 1 ? "es" : ""} importado${imported !== 1 ? "s" : ""}`);
        if (data.players.length > available) {
          toast.info(`${data.players.length - available} jogador(es) ignorados (limite de ${MAX_PLAYERS})`);
        }
      } catch {
        toast.error("Erro ao ler o arquivo de importação");
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Create a new year roster
  const handleCreateYear = () => {
    const yr = parseInt(newYearValue);
    if (isNaN(yr) || yr < 1800 || yr > 2200) {
      toast.error("Ano inválido");
      return;
    }
    if (availableYears.includes(yr)) {
      toast.error(`O elenco de ${yr} já existe`);
      return;
    }
    setShowCreateYearDialog(false);
    setSelectedYear(String(yr));
    toast.success(`Elenco de ${yr} criado. Adicione jogadores!`);
  };

  // Delete all players for the selected year
  const handleDeleteYear = async () => {
    if (!activeSeasonYear) return;
    const yearPlayers = players.filter((p) => p.teamId === teamId && p.seasonYear === activeSeasonYear);
    for (const p of yearPlayers) {
      await removePlayer(p.id);
    }
    setShowDeleteYearConfirm(false);
    setSelectedYear(ALL_YEARS_VALUE);
    toast.success(`Elenco de ${activeSeasonYear} excluído (${yearPlayers.length} jogadores removidos)`);
  };

  // Rename year (move all players from old year to new year)
  const handleRenameYear = async () => {
    const newYr = parseInt(renameYearValue);
    if (isNaN(newYr) || newYr < 1800 || newYr > 2200) {
      toast.error("Ano inválido");
      return;
    }
    if (!activeSeasonYear) return;
    if (newYr === activeSeasonYear) {
      setShowRenameYearDialog(false);
      return;
    }
    if (availableYears.includes(newYr)) {
      toast.error(`O elenco de ${newYr} já existe`);
      return;
    }
    const yearPlayers = players.filter((p) => p.teamId === teamId && p.seasonYear === activeSeasonYear);
    for (const p of yearPlayers) {
      await updatePlayer(p.id, { seasonYear: newYr });
    }
    setShowRenameYearDialog(false);
    setSelectedYear(String(newYr));
    toast.success(`Elenco renomeado de ${activeSeasonYear} para ${newYr}`);
  };

  if (!team) {
    return (
      <PageTransition>
        <div className="p-6 lg:p-8">
          <p className="text-muted-foreground">Clube não encontrado.</p>
          <Button variant="ghost" onClick={() => navigate("/squads")} className="mt-4 gap-2">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Button>
        </div>
      </PageTransition>
    );
  }

  const isSpecificYear = selectedYear !== ALL_YEARS_VALUE && selectedYear !== NO_YEAR_VALUE;

  return (
    <PageTransition>
      <div className="p-6 lg:p-8 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/squads")}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <TeamLogo src={team.logo} alt={team.name} size={40} />
            <div>
              <h1 className="text-xl font-bold text-foreground">{team.name}</h1>
              <p className="text-sm text-muted-foreground">
                {squad.length}{isSpecificYear ? ` / ${MAX_PLAYERS}` : ""} jogadores
                {isSpecificYear ? " (mín. 11)" : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Year selector */}
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-[140px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_YEARS_VALUE}>Todos os anos</SelectItem>
                  {hasPlayersWithoutYear && (
                    <SelectItem value={NO_YEAR_VALUE}>Sem ano</SelectItem>
                  )}
                  {availableYears.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9"
                title="Criar elenco de um novo ano"
                onClick={() => {
                  setNewYearValue(String(new Date().getFullYear()));
                  setShowCreateYearDialog(true);
                }}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {/* Year management buttons */}
            {isSpecificYear && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 h-9"
                  onClick={() => {
                    setRenameYearValue(selectedYear);
                    setShowRenameYearDialog(true);
                  }}
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Editar Ano
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 h-9 text-destructive hover:text-destructive"
                  onClick={() => setShowDeleteYearConfirm(true)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Excluir Ano
                </Button>
              </>
            )}

            <Button variant="outline" size="sm" className="gap-2" onClick={handleExportSquad}>
              <Download className="w-4 h-4" />
              Exportar
            </Button>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => fileInputRef.current?.click()}>
              <Upload className="w-4 h-4" />
              Importar
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleImportSquad}
            />
            {isSpecificYear && squad.length < MAX_PLAYERS && (
              <Link to={`/squads/team/${teamId}/create?year=${activeSeasonYear}`}>
                <Button className="gap-2">
                  <PlusCircle className="w-4 h-4" />
                  Adicionar Jogador
                </Button>
              </Link>
            )}
          </div>
        </div>

        {squad.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="font-medium">Elenco vazio</p>
            <p className="text-sm mt-1">
              {isSpecificYear
                ? `Nenhum jogador registrado para ${selectedYear}. Adicione ou importe jogadores.`
                : "Adicione jogadores a este clube."}
            </p>
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
                  {selectedYear === ALL_YEARS_VALUE && <TableHead>Ano</TableHead>}
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
                          <CountryFlag country={player.nationality} size={24} />
                          {player.nationality}
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{player.position || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{player.age ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{player.rating?.toFixed(2) ?? "—"}</TableCell>
                    {selectedYear === ALL_YEARS_VALUE && (
                      <TableCell className="text-muted-foreground">{player.seasonYear ?? "—"}</TableCell>
                    )}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link to={`/squads/${player.id}/edit`}>
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

      {/* Create year dialog */}
      <Dialog open={showCreateYearDialog} onOpenChange={setShowCreateYearDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Criar elenco para um novo ano</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Input
              type="number"
              min={1800}
              max={2200}
              value={newYearValue}
              onChange={(e) => setNewYearValue(e.target.value)}
              placeholder="Ex: 2025"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateYearDialog(false)}>Cancelar</Button>
            <Button onClick={handleCreateYear}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename year dialog */}
      <Dialog open={showRenameYearDialog} onOpenChange={setShowRenameYearDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Alterar ano do elenco</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              Todos os jogadores do elenco de {activeSeasonYear} serão movidos para o novo ano.
            </p>
            <Input
              type="number"
              min={1800}
              max={2200}
              value={renameYearValue}
              onChange={(e) => setRenameYearValue(e.target.value)}
              placeholder="Novo ano"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRenameYearDialog(false)}>Cancelar</Button>
            <Button onClick={handleRenameYear}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete year confirmation */}
      <Dialog open={showDeleteYearConfirm} onOpenChange={setShowDeleteYearConfirm}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir elenco de {activeSeasonYear}?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Todos os {squad.length} jogadores deste elenco serão removidos permanentemente. Esta ação não pode ser desfeita.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteYearConfirm(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDeleteYear}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageTransition>
  );
}
