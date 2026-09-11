import { useMemo, useState } from "react";
import { Flame, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useTournamentStore } from "@/store/tournamentStore";
import { pairKey, RIVALRY_LEVEL_LABELS, type Rivalry } from "@/lib/rivalries";
import TeamLogo from "@/components/TeamLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function RivalriesPage() {
  const teams = useTournamentStore((s) => s.teams);
  const rivalries = useTournamentStore((s) => s.rivalries);
  const addRivalry = useTournamentStore((s) => s.addRivalry);
  const updateRivalry = useTournamentStore((s) => s.updateRivalry);
  const removeRivalry = useTournamentStore((s) => s.removeRivalry);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Rivalry | null>(null);
  const [teamA, setTeamA] = useState("");
  const [teamB, setTeamB] = useState("");
  const [level, setLevel] = useState(3);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const activeTeams = useMemo(
    () => teams.filter((t) => !t.isArchived).sort((a, b) => a.name.localeCompare(b.name)),
    [teams],
  );
  const getTeam = (id: string) => teams.find((t) => t.id === id);

  const openCreate = () => {
    setEditing(null);
    setTeamA("");
    setTeamB("");
    setLevel(3);
    setName("");
    setOpen(true);
  };

  const openEdit = (r: Rivalry) => {
    setEditing(r);
    setTeamA(r.teamAId);
    setTeamB(r.teamBId);
    setLevel(r.level);
    setName(r.name || "");
    setOpen(true);
  };

  const handleSave = async () => {
    if (!teamA || !teamB) {
      toast.error("Escolha os dois clubes");
      return;
    }
    if (teamA === teamB) {
      toast.error("Escolha dois clubes diferentes");
      return;
    }
    const duplicated = rivalries.some(
      (r) => pairKey(r.teamAId, r.teamBId) === pairKey(teamA, teamB) && r.id !== editing?.id,
    );
    if (duplicated) {
      toast.error("Esses clubes já têm um clássico cadastrado");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await updateRivalry(editing.id, { teamAId: teamA, teamBId: teamB, level, name: name.trim() });
        toast.success("Clássico atualizado");
      } else {
        await addRivalry({ teamAId: teamA, teamBId: teamB, level, name: name.trim() });
        toast.success("Clássico criado");
      }
      setOpen(false);
    } catch {
      toast.error("Não foi possível salvar o clássico");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (r: Rivalry) => {
    try {
      await removeRivalry(r.id);
      toast.success("Clássico excluído");
    } catch {
      toast.error("Não foi possível excluir");
    }
  };

  return (
    <div className="p-6 lg:p-10 max-w-5xl mx-auto space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight lowercase">rivalidades</h1>
          <p className="text-sm text-muted-foreground">
            Clássicos deixam a partida mais quente: mais faltas e cartões, sem mexer na força dos times.
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" /> Criar clássico
        </Button>
      </header>

      {rivalries.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          Nenhum clássico cadastrado ainda.
        </div>
      ) : (
        <ul className="space-y-3">
          {rivalries.map((r) => {
            const a = getTeam(r.teamAId);
            const b = getTeam(r.teamBId);
            return (
              <li
                key={r.id}
                className="flex flex-wrap items-center gap-4 rounded-xl border bg-card p-4 hover:bg-accent/40 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <TeamLogo team={a} size={32} />
                  <span className="text-sm font-medium truncate">{a?.name || "Time removido"}</span>
                  <span className="text-xs text-muted-foreground">x</span>
                  <TeamLogo team={b} size={32} />
                  <span className="text-sm font-medium truncate">{b?.name || "Time removido"}</span>
                </div>
                <div className="flex items-center gap-2">
                  {r.name && <span className="text-xs text-muted-foreground italic">{r.name}</span>}
                  <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/10 px-2 py-1 text-xs font-semibold text-orange-500">
                    <Flame className="h-3.5 w-3.5" />
                    {r.level}/5
                  </span>
                  <Button variant="ghost" size="icon" onClick={() => openEdit(r)} aria-label="Editar clássico">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(r)} aria-label="Excluir clássico">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar clássico" : "Criar clássico"}</DialogTitle>
            <DialogDescription>Quanto maior o nível, mais faltas e cartões na partida.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Time A</Label>
              <Select value={teamA} onValueChange={setTeamA}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolha um clube" />
                </SelectTrigger>
                <SelectContent>
                  {activeTeams.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Time B</Label>
              <Select value={teamB} onValueChange={setTeamB}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolha um clube" />
                </SelectTrigger>
                <SelectContent>
                  {activeTeams.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Nome do clássico (opcional)</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Clássico dos Milhões" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Nível</Label>
                <span className="text-xs font-semibold text-orange-500">
                  {level}/5 — {RIVALRY_LEVEL_LABELS[level]}
                </span>
              </div>
              <Slider min={1} max={5} step={1} value={[level]} onValueChange={(v) => setLevel(v[0])} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
