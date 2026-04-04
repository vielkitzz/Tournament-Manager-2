import { useState } from "react";
import { SeasonRecord, Team } from "@/types/tournament";
import { Trophy, Shield, Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { Input } from "@/components/ui/input";

interface GalleryViewProps {
  seasons: SeasonRecord[];
  teams?: Team[];
  onUpdateSeasons?: (seasons: SeasonRecord[]) => void;
}

export default function GalleryView({ seasons, teams, onUpdateSeasons }: GalleryViewProps) {
  const [adding, setAdding] = useState(false);
  const [editingYear, setEditingYear] = useState<number | null>(null);
  const [formYear, setFormYear] = useState("");
  const [formName, setFormName] = useState("");
  const [formTeamId, setFormTeamId] = useState("");

  const editable = !!onUpdateSeasons;
  const sorted = [...seasons].sort((a, b) => b.year - a.year);

  const getTeamById = (id: string) => teams?.find((t) => t.id === id);

  const handleSelectTeam = (teamId: string) => {
    const team = getTeamById(teamId);
    if (team) {
      setFormTeamId(teamId);
      setFormName(team.name);
    }
  };

  const handleAdd = () => {
    if (!onUpdateSeasons || !formYear || !formName) return;
    const year = parseInt(formYear);
    if (isNaN(year)) return;
    // Don't allow duplicate years
    if (seasons.some((s) => s.year === year)) return;
    const team = formTeamId ? getTeamById(formTeamId) : undefined;
    const newSeason: SeasonRecord = {
      year,
      championId: formTeamId || `manual-${year}`,
      championName: formName,
      championLogo: team?.logo,
      standings: [],
      manual: true,
    };
    onUpdateSeasons([...seasons, newSeason]);
    setAdding(false);
    setFormYear("");
    setFormName("");
    setFormTeamId("");
  };

  const handleEdit = (oldYear: number) => {
    if (!onUpdateSeasons || !formName) return;
    const year = parseInt(formYear);
    if (isNaN(year)) return;
    const team = formTeamId ? getTeamById(formTeamId) : undefined;
    const updated = seasons.map((s) => {
      if (s.year !== oldYear) return s;
      return {
        ...s,
        year,
        championId: formTeamId || s.championId,
        championName: formName,
        championLogo: team?.logo ?? s.championLogo,
      };
    });
    onUpdateSeasons(updated);
    setEditingYear(null);
    setFormYear("");
    setFormName("");
    setFormTeamId("");
  };

  const handleDelete = (year: number) => {
    if (!onUpdateSeasons) return;
    onUpdateSeasons(seasons.filter((s) => s.year !== year));
  };

  const startEdit = (season: SeasonRecord) => {
    setEditingYear(season.year);
    setFormYear(String(season.year));
    setFormName(season.championName);
    setFormTeamId(season.championId);
    setAdding(false);
  };

  const startAdd = () => {
    setAdding(true);
    setEditingYear(null);
    setFormYear("");
    setFormName("");
    setFormTeamId("");
  };

  const cancelForm = () => {
    setAdding(false);
    setEditingYear(null);
    setFormYear("");
    setFormName("");
    setFormTeamId("");
  };

  if (seasons.length === 0 && !editable) {
    return (
      <div className="text-center py-12">
        <Trophy className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">
          Nenhuma temporada finalizada ainda
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Finalize uma temporada para registrar o campeão
        </p>
      </div>
    );
  }

  const renderForm = (onSubmit: () => void) => (
    <div className="flex items-center gap-2 p-3 rounded-xl bg-secondary/30 border border-primary/30">
      <Input
        type="number"
        placeholder="Ano"
        value={formYear}
        onChange={(e) => setFormYear(e.target.value)}
        className="w-20 h-8 text-xs"
      />
      {teams && teams.length > 0 ? (
        <select
          value={formTeamId}
          onChange={(e) => handleSelectTeam(e.target.value)}
          className="h-8 text-xs rounded-md border border-border bg-background px-2 flex-1 min-w-0"
        >
          <option value="">Selecione um time...</option>
          {teams
            .filter((t) => !t.isArchived)
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
        </select>
      ) : (
        <Input
          placeholder="Nome do campeão"
          value={formName}
          onChange={(e) => setFormName(e.target.value)}
          className="h-8 text-xs flex-1"
        />
      )}
      {formTeamId && (
        <Input
          placeholder="Nome personalizado"
          value={formName}
          onChange={(e) => setFormName(e.target.value)}
          className="h-8 text-xs w-32"
        />
      )}
      <button onClick={onSubmit} className="p-1.5 text-primary hover:text-primary/80">
        <Check className="w-4 h-4" />
      </button>
      <button onClick={cancelForm} className="p-1.5 text-destructive hover:text-destructive/80">
        <X className="w-4 h-4" />
      </button>
    </div>
  );

  return (
    <div className="space-y-2">
      {editable && !adding && (
        <button
          onClick={startAdd}
          className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl border border-dashed border-border hover:border-primary/30 text-muted-foreground hover:text-primary transition-colors text-xs font-medium"
        >
          <Plus className="w-3.5 h-3.5" />
          Adicionar Campeão
        </button>
      )}

      {adding && renderForm(handleAdd)}

      {sorted.map((season) => (
        editingYear === season.year ? (
          <div key={season.year}>
            {renderForm(() => handleEdit(season.year))}
          </div>
        ) : (
          <div
            key={season.year}
            className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30 border border-border hover:border-primary/30 transition-colors group"
          >
            <Trophy className="w-4 h-4 text-yellow-500 shrink-0" />
            <span className="text-xs font-bold text-muted-foreground min-w-[40px]">
              {season.year}
            </span>
            <div className="w-7 h-7 flex items-center justify-center shrink-0">
              {season.championLogo ? (
                <img src={season.championLogo} alt="" className="w-7 h-7 object-contain" />
              ) : (
                <Shield className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
            <span className="text-sm font-bold text-foreground truncate flex-1">
              {season.championName}
            </span>
            {editable && (
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => startEdit(season)} className="p-1 text-muted-foreground hover:text-foreground">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => handleDelete(season.year)} className="p-1 text-muted-foreground hover:text-destructive">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )
      ))}

      {seasons.length === 0 && editable && !adding && (
        <div className="text-center py-8">
          <Trophy className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Nenhum campeão registrado</p>
          <p className="text-xs text-muted-foreground mt-1">Clique em "Adicionar Campeão" para registrar manualmente</p>
        </div>
      )}
    </div>
  );
}
