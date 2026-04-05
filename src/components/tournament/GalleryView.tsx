import { useState } from "react";
import { SeasonRecord, Team } from "@/types/tournament";
import { Trophy, Shield, Plus, Pencil, Trash2, Check, X, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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
  const [formLogo, setFormLogo] = useState<string | undefined>();
  const [teamPickerOpen, setTeamPickerOpen] = useState(false);
  const [teamSearch, setTeamSearch] = useState("");

  const editable = !!onUpdateSeasons;
  const sorted = [...seasons].sort((a, b) => b.year - a.year);

  const getTeamById = (id: string) => teams?.find((t) => t.id === id);

  const filteredTeams = (teams || [])
    .filter((t) => !t.isArchived)
    .filter((t) =>
      t.name.toLowerCase().includes(teamSearch.toLowerCase()) ||
      t.shortName?.toLowerCase().includes(teamSearch.toLowerCase())
    )
    .sort((a, b) => a.name.localeCompare(b.name));

  const handleSelectTeam = (team: Team) => {
    setFormTeamId(team.id);
    setFormName(team.name);
    setFormLogo(team.logo);
    setTeamPickerOpen(false);
    setTeamSearch("");
  };

  const handleAdd = () => {
    if (!onUpdateSeasons || !formYear || !formName) return;
    const year = parseInt(formYear);
    if (isNaN(year)) return;
    if (seasons.some((s) => s.year === year)) return;
    const newSeason: SeasonRecord = {
      year,
      championId: formTeamId || `manual-${year}`,
      championName: formName,
      championLogo: formLogo,
      standings: [],
      manual: true,
    };
    onUpdateSeasons([...seasons, newSeason]);
    resetForm();
  };

  const handleEdit = (oldYear: number) => {
    if (!onUpdateSeasons || !formName) return;
    const year = parseInt(formYear);
    if (isNaN(year)) return;
    const updated = seasons.map((s) => {
      if (s.year !== oldYear) return s;
      return {
        ...s,
        year,
        championId: formTeamId || s.championId,
        championName: formName,
        championLogo: formLogo ?? s.championLogo,
      };
    });
    onUpdateSeasons(updated);
    resetForm();
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
    setFormLogo(season.championLogo);
    setAdding(false);
  };

  const startAdd = () => {
    setAdding(true);
    setEditingYear(null);
    resetFormFields();
  };

  const resetFormFields = () => {
    setFormYear("");
    setFormName("");
    setFormTeamId("");
    setFormLogo(undefined);
  };

  const resetForm = () => {
    setAdding(false);
    setEditingYear(null);
    resetFormFields();
  };

  if (seasons.length === 0 && !editable) {
    return (
      <div className="text-center py-12">
        <Trophy className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">Nenhuma temporada finalizada ainda</p>
        <p className="text-xs text-muted-foreground mt-1">Finalize uma temporada para registrar o campeão</p>
      </div>
    );
  }

  const renderTeamPicker = () => (
    <Dialog open={teamPickerOpen} onOpenChange={setTeamPickerOpen}>
      <DialogContent className="max-w-sm p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="text-sm font-bold">Selecionar Time</DialogTitle>
        </DialogHeader>
        <div className="px-4 pb-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar time..."
              value={teamSearch}
              onChange={(e) => setTeamSearch(e.target.value)}
              className="h-8 text-xs pl-8"
              autoFocus
            />
          </div>
        </div>
        <div className="max-h-60 overflow-y-auto px-2 pb-3">
          {filteredTeams.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">Nenhum time encontrado</p>
          ) : (
            <div className="space-y-0.5">
              {filteredTeams.map((t) => (
                <button
                  key={t.id}
                  onClick={() => handleSelectTeam(t)}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-secondary/50 transition-colors text-left"
                >
                  <div className="w-6 h-6 flex items-center justify-center shrink-0">
                    {t.logo ? (
                      <img src={t.logo} alt="" className="w-6 h-6 object-contain" />
                    ) : (
                      <Shield className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{t.name}</p>
                    {t.shortName && <p className="text-[10px] text-muted-foreground truncate">{t.shortName}</p>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );

  const renderForm = (onSubmit: () => void) => (
    <div className="flex flex-col gap-2 p-3 rounded-xl bg-secondary/30 border border-primary/30">
      <div className="flex items-center gap-2">
        <Input
          type="number"
          placeholder="Ano"
          value={formYear}
          onChange={(e) => setFormYear(e.target.value)}
          className="w-20 h-8 text-xs"
        />
        <button
          type="button"
          onClick={() => setTeamPickerOpen(true)}
          className="flex items-center gap-2 flex-1 h-8 px-2.5 rounded-md border border-border bg-background text-xs hover:border-primary/40 transition-colors min-w-0"
        >
          {formLogo ? (
            <img src={formLogo} alt="" className="w-4 h-4 object-contain shrink-0" />
          ) : formTeamId ? (
            <Shield className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          ) : null}
          <span className={`truncate ${formName ? "text-foreground" : "text-muted-foreground"}`}>
            {formName || "Selecionar time..."}
          </span>
        </button>
        <button onClick={onSubmit} className="p-1.5 text-primary hover:text-primary/80">
          <Check className="w-4 h-4" />
        </button>
        <button onClick={resetForm} className="p-1.5 text-destructive hover:text-destructive/80">
          <X className="w-4 h-4" />
        </button>
      </div>
      {formTeamId && (
        <Input
          placeholder="Nome personalizado"
          value={formName}
          onChange={(e) => setFormName(e.target.value)}
          className="h-8 text-xs"
        />
      )}
    </div>
  );

  return (
    <div className="space-y-2">
      {renderTeamPicker()}

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

      {sorted.map((season) =>
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
      )}

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
