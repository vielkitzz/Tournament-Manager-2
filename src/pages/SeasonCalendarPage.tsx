import { useMemo, useState } from "react";
import { CalendarDays, Check, Flame, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useTournamentStore } from "@/store/tournamentStore";
import { buildCalendarPreview, nextSeasonTournament, resolveBatchTeamIds } from "@/lib/seasonAdvance";
import { useRivalries, type Rivalry } from "@/hooks/useRivalries";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function SeasonCalendarPage() {
  const { tournaments, teams, players, updateTournament, updatePlayer } = useTournamentStore();
  const { rivalries, loading, save, remove } = useRivalries();
  const [tournamentIds, setTournamentIds] = useState<string[]>([]);
  const [teamIds, setTeamIds] = useState<string[]>([]);
  const [targetYear, setTargetYear] = useState(Math.max(new Date().getFullYear(), ...tournaments.map((t) => t.year)) + 1);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [rivalryOpen, setRivalryOpen] = useState(false);
  const [editing, setEditing] = useState<Rivalry | null>(null);
  const [teamAId, setTeamAId] = useState("");
  const [teamBId, setTeamBId] = useState("");
  const [level, setLevel] = useState(3);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const preview = useMemo(
    () => buildCalendarPreview(tournaments, players, tournamentIds, teamIds, targetYear),
    [players, teamIds, targetYear, tournamentIds, tournaments],
  );
  const invalid = preview.tournaments.filter((item) => !item.ready);
  const toggle = (id: string, values: string[], setter: (next: string[]) => void) =>
    setter(values.includes(id) ? values.filter((value) => value !== id) : [...values, id]);

  const executeCalendar = async () => {
    if (invalid.length > 0) return;
    setSaving(true);
    try {
      const nextTeamIds = resolveBatchTeamIds(tournaments, tournamentIds);
      await Promise.all([
        ...preview.tournaments.map((item) => {
          const tournament = tournaments.find((candidate) => candidate.id === item.id);
          const teamIdsForSeason = nextTeamIds.get(item.id) || tournament?.teamIds || [];
          return tournament ? updateTournament(item.id, {
            ...nextSeasonTournament(tournament, targetYear),
            teamIds: teamIdsForSeason,
            numberOfTeams: teamIdsForSeason.length,
          }) : Promise.resolve();
        }),
        ...preview.players.map((player) => updatePlayer(player.id, { age: player.age, skill: player.skill, seasonYear: targetYear })),
      ]);
      toast.success(`${preview.tournaments.length} competição(ões) e ${preview.players.length} jogador(es) avançados para ${targetYear}`);
      setConfirmOpen(false);
      setTournamentIds([]);
      setTeamIds([]);
    } catch {
      toast.error("Não foi possível avançar todo o calendário");
    } finally {
      setSaving(false);
    }
  };

  const openRivalry = (rivalry?: Rivalry) => {
    setEditing(rivalry || null);
    setTeamAId(rivalry?.teamAId || "");
    setTeamBId(rivalry?.teamBId || "");
    setLevel(rivalry?.level || 3);
    setName(rivalry?.name || "");
    setRivalryOpen(true);
  };

  const saveRivalry = async () => {
    if (!teamAId || !teamBId || teamAId === teamBId) {
      toast.error("Escolha dois times diferentes");
      return;
    }
    setSaving(true);
    try {
      await save({ id: editing?.id, teamAId, teamBId, level, name });
      toast.success(editing ? "Clássico atualizado" : "Clássico criado");
      setRivalryOpen(false);
    } catch (error: any) {
      toast.error(error?.code === "23505" ? "Este clássico já existe" : "Não foi possível salvar o clássico");
    } finally {
      setSaving(false);
    }
  };

  const teamName = (id: string) => teams.find((team) => team.id === id)?.name || "Time excluído";

  return (
    <main className="p-6 lg:p-10 max-w-6xl mx-auto space-y-10">
      <header>
        <h1 className="text-2xl font-display font-bold tracking-tight text-foreground">Calendário e clássicos</h1>
        <p className="text-sm text-muted-foreground mt-1">Avance temporadas em conjunto e gerencie rivalidades.</p>
      </header>

      <section className="space-y-5">
        <div className="flex items-center gap-2"><CalendarDays className="w-5 h-5 text-primary" /><h2 className="font-display font-bold text-foreground">Avançar calendário</h2></div>
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Competições finalizadas</h3>
            {tournaments.map((tournament) => (
              <label key={tournament.id} className="flex items-center gap-3 py-2 border-b border-border/60 text-sm">
                <Checkbox checked={tournamentIds.includes(tournament.id)} onCheckedChange={() => toggle(tournament.id, tournamentIds, setTournamentIds)} />
                <span className="flex-1 text-foreground">{tournament.name}</span>
                <span className={tournament.finalized ? "text-muted-foreground" : "text-destructive"}>{tournament.year}{!tournament.finalized && " · em andamento"}</span>
              </label>
            ))}
          </div>
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Clubes que envelhecem o elenco</h3>
            <div className="max-h-72 overflow-y-auto">
              {teams.filter((team) => !team.isArchived).map((team) => (
                <label key={team.id} className="flex items-center gap-3 py-2 border-b border-border/60 text-sm">
                  <Checkbox checked={teamIds.includes(team.id)} onCheckedChange={() => toggle(team.id, teamIds, setTeamIds)} />
                  <span className="text-foreground">{team.name}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-3 pt-2">
          <label className="space-y-1"><span className="text-xs text-muted-foreground">Ano de destino</span><Input type="number" className="w-32" value={targetYear} onChange={(e) => setTargetYear(Number(e.target.value))} /></label>
          <Button onClick={() => setConfirmOpen(true)} disabled={tournamentIds.length === 0 && teamIds.length === 0}>Ver prévia</Button>
        </div>
      </section>

      <section className="space-y-5 border-t border-border pt-8">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2"><Flame className="w-5 h-5 text-destructive" /><h2 className="font-display font-bold text-foreground">Rivalidades e clássicos</h2></div>
          <Button onClick={() => openRivalry()} size="sm" className="gap-2"><Plus className="w-4 h-4" />Criar clássico</Button>
        </div>
        {loading ? <p className="text-sm text-muted-foreground">Carregando...</p> : rivalries.length === 0 ? <p className="text-sm text-muted-foreground py-6">Nenhum clássico cadastrado.</p> : (
          <div className="divide-y divide-border border-y border-border">
            {rivalries.map((rivalry) => (
              <div key={rivalry.id} className="flex items-center gap-3 py-4">
                <Flame className="w-4 h-4 text-destructive shrink-0" />
                <div className="flex-1 min-w-0"><p className="text-sm font-semibold text-foreground truncate">{rivalry.name || `${teamName(rivalry.teamAId)} × ${teamName(rivalry.teamBId)}`}</p><p className="text-xs text-muted-foreground">{teamName(rivalry.teamAId)} × {teamName(rivalry.teamBId)} · nível {rivalry.level}/5</p></div>
                <Button variant="ghost" size="icon" title="Editar clássico" onClick={() => openRivalry(rivalry)}><Pencil className="w-4 h-4" /></Button>
                <Button variant="ghost" size="icon" title="Excluir clássico" onClick={async () => { if (!confirm("Excluir este clássico?")) return; await remove(rivalry.id); toast.success("Clássico excluído"); }}><Trash2 className="w-4 h-4 text-destructive" /></Button>
              </div>
            ))}
          </div>
        )}
      </section>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent><DialogHeader><DialogTitle>Prévia do avanço</DialogTitle><DialogDescription>Todos os itens escolhidos serão levados para {targetYear} em uma operação.</DialogDescription></DialogHeader>
          <div className="space-y-3 text-sm"><p><strong>{preview.tournaments.length}</strong> competição(ões)</p><p><strong>{preview.players.length}</strong> jogador(es) envelhecem e evoluem/regredem</p>{invalid.length > 0 && <p className="text-destructive">Finalize estas competições primeiro: {invalid.map((item) => item.name).join(", ")}</p>}</div>
          <DialogFooter><Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancelar</Button><Button onClick={executeCalendar} disabled={saving || invalid.length > 0}>{saving ? "Avançando..." : <><Check className="w-4 h-4 mr-2" />Confirmar</>}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rivalryOpen} onOpenChange={setRivalryOpen}>
        <DialogContent><DialogHeader><DialogTitle>{editing ? "Editar clássico" : "Criar clássico"}</DialogTitle><DialogDescription>O nível aumenta faltas e cartões, sem alterar força ou gols.</DialogDescription></DialogHeader>
          <div className="space-y-4"><Input placeholder="Nome do clássico (opcional)" value={name} onChange={(e) => setName(e.target.value)} />
            <div className="grid grid-cols-2 gap-3"><Select value={teamAId} onValueChange={setTeamAId}><SelectTrigger><SelectValue placeholder="Time A" /></SelectTrigger><SelectContent>{teams.filter((t) => t.id !== teamBId).map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent></Select><Select value={teamBId} onValueChange={setTeamBId}><SelectTrigger><SelectValue placeholder="Time B" /></SelectTrigger><SelectContent>{teams.filter((t) => t.id !== teamAId).map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-3"><div className="flex justify-between text-sm"><span>Intensidade disciplinar</span><strong>{level}/5</strong></div><Slider min={1} max={5} step={1} value={[level]} onValueChange={([value]) => setLevel(value)} /></div>
          </div><DialogFooter><Button variant="outline" onClick={() => setRivalryOpen(false)}>Cancelar</Button><Button onClick={saveRivalry} disabled={saving}>Salvar clássico</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}