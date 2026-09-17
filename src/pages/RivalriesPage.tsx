import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Flame, Pencil, Plus, Shield, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useTournamentStore } from "@/store/tournamentStore";
import { useRivalries, type Rivalry } from "@/hooks/useRivalries";
import { championBoxStyle, splitChampionStyle } from "@/lib/teamColors";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import TeamLogo from "@/components/TeamLogo";

type TeamPickerProps = {
  value: string;
  disabledId: string;
  placeholder: string;
  onChange: (id: string) => void;
};

function TeamPicker({ value, disabledId, placeholder, onChange }: TeamPickerProps) {
  const teams = useTournamentStore((state) => state.teams);
  const [open, setOpen] = useState(false);
  const selected = teams.find((team) => team.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between gap-2 font-normal">
          <span className="flex min-w-0 items-center gap-2">
            <TeamLogo src={selected?.logo} alt={selected?.name} size={20} />
            <span className="truncate">{selected?.name || placeholder}</span>
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar por nome ou sigla..." />
          <CommandList>
            <CommandEmpty>Nenhum time encontrado.</CommandEmpty>
            <CommandGroup>
              {teams
                .filter((team) => !team.isArchived && team.id !== disabledId)
                .map((team) => (
                  <CommandItem
                    key={team.id}
                    value={`${team.name} ${team.shortName || ""} ${team.abbreviation || ""}`}
                    onSelect={() => {
                      onChange(team.id);
                      setOpen(false);
                    }}
                    className="gap-2"
                  >
                    <TeamLogo src={team.logo} alt={team.name} size={20} />
                    <span className="min-w-0 flex-1 truncate">{team.name}</span>
                    {team.abbreviation && <span className="text-xs text-muted-foreground">{team.abbreviation}</span>}
                    <Check className={cn("h-4 w-4", value === team.id ? "opacity-100" : "opacity-0")} />
                  </CommandItem>
                ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default function RivalriesPage() {
  const teams = useTournamentStore((state) => state.teams);
  const { rivalries, loading, save, remove } = useRivalries();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Rivalry | null>(null);
  const [teamAId, setTeamAId] = useState("");
  const [teamBId, setTeamBId] = useState("");
  const [level, setLevel] = useState(3);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const teamById = useMemo(() => new Map(teams.map((team) => [team.id, team])), [teams]);

  const openRivalry = (rivalry?: Rivalry) => {
    setEditing(rivalry || null);
    setTeamAId(rivalry?.teamAId || "");
    setTeamBId(rivalry?.teamBId || "");
    setLevel(rivalry?.level || 3);
    setName(rivalry?.name || "");
    setDialogOpen(true);
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
      setDialogOpen(false);
    } catch (error: any) {
      toast.error(error?.code === "23505" ? "Este clássico já existe" : "Não foi possível salvar o clássico");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="mx-auto max-w-6xl space-y-8 p-6 lg:p-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-destructive">
            <Flame className="h-5 w-5" />
            <span className="text-xs font-bold uppercase tracking-widest">Rivalidades</span>
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">Clássicos</h1>
          <p className="mt-1 text-sm text-muted-foreground">Gerencie confrontos que aumentam a intensidade disciplinar das partidas.</p>
        </div>
        <Button onClick={() => openRivalry()} className="gap-2 sm:self-auto">
          <Plus className="h-4 w-4" /> Criar clássico
        </Button>
      </header>

      {loading ? (
        <p className="py-12 text-center text-sm text-muted-foreground">Carregando clássicos...</p>
      ) : rivalries.length === 0 ? (
        <div className="border-y border-border py-14 text-center">
          <Flame className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
          <p className="font-semibold text-foreground">Nenhum clássico cadastrado</p>
          <p className="mt-1 text-sm text-muted-foreground">Crie o primeiro confronto entre dois clubes.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rivalries.map((rivalry) => {
            const teamA = teamById.get(rivalry.teamAId);
            const teamB = teamById.get(rivalry.teamBId);
            const style = splitChampionStyle([teamA?.colors, teamB?.colors]);
            const accentA = championBoxStyle(teamA?.colors)?.accent;
            const accentB = championBoxStyle(teamB?.colors)?.accent;
            return (
              <article
                key={rivalry.id}
                style={style?.container}
                className="relative overflow-hidden rounded-lg border border-border bg-card shadow-sm"
              >
                <div className="flex items-start justify-between gap-3 border-b border-border/60 px-4 py-3">
                  <div className="min-w-0">
                    <h2 className="truncate text-sm font-bold text-foreground">
                      {rivalry.name || `${teamA?.name || "Time excluído"} × ${teamB?.name || "Time excluído"}`}
                    </h2>
                    <p className="mt-0.5 text-xs text-muted-foreground">Intensidade {rivalry.level}/5</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button variant="ghost" size="icon" title="Editar clássico" onClick={() => openRivalry(rivalry)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Excluir clássico"
                      onClick={async () => {
                        if (!confirm("Excluir este clássico?")) return;
                        await remove(rivalry.id);
                        toast.success("Clássico excluído");
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 py-5">
                  {[teamA, teamB].map((team, index) => (
                    <div key={team?.id || index} className="min-w-0 text-center">
                      <div style={index === 0 ? accentA : accentB} className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-secondary/70">
                        {team ? <TeamLogo src={team.logo} alt={team.name} className="h-10 w-10 flex shrink-0 items-center justify-center" iconClassName="h-6 w-6 text-muted-foreground" /> : <Shield className="h-6 w-6 text-muted-foreground" />}
                      </div>
                      <p className="truncate text-xs font-semibold text-foreground">{team?.shortName || team?.name || "Time excluído"}</p>
                    </div>
                  ))}
                  <div className="flex flex-col items-center gap-1 text-destructive">
                    <Flame className="h-6 w-6" />
                    <span className="text-xs font-black">{rivalry.level}/5</span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar clássico" : "Criar clássico"}</DialogTitle>
            <DialogDescription>O nível aumenta faltas e cartões, sem alterar força ou gols.</DialogDescription>
          </DialogHeader>
          <div className="space-y-5">
            <Input placeholder="Nome do clássico (opcional)" value={name} onChange={(event) => setName(event.target.value)} />
            <div className="grid gap-3 sm:grid-cols-2">
              <TeamPicker value={teamAId} disabledId={teamBId} placeholder="Time A" onChange={setTeamAId} />
              <TeamPicker value={teamBId} disabledId={teamAId} placeholder="Time B" onChange={setTeamBId} />
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-sm"><span>Intensidade disciplinar</span><strong>{level}/5</strong></div>
              <Slider min={1} max={5} step={1} value={[level]} onValueChange={([value]) => setLevel(value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={saveRivalry} disabled={saving}>{saving ? "Salvando..." : "Salvar clássico"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}