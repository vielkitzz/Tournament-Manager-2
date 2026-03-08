import { useState } from "react";
import { Tournament, PromotionRule } from "@/types/tournament";
import { Shield } from "lucide-react";
import { StandingRow } from "@/lib/standings";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface PromotionEditorProps {
  tournament: Tournament;
  standings: StandingRow[];
  allTournaments: Tournament[];
  onUpdate: (promotions: PromotionRule[]) => void;
  /** For grupos format: per-group standings */
  standingsByGroup?: Record<number, StandingRow[]>;
}

const ZONE_COLORS = [
  { value: "#22c55e", label: "Verde" },
  { value: "#3b82f6", label: "Azul" },
  { value: "#f59e0b", label: "Amarelo" },
  { value: "#f97316", label: "Laranja" },
  { value: "#ef4444", label: "Vermelho" },
  { value: "#8b5cf6", label: "Roxo" },
];

export default function PromotionEditor({
  tournament,
  standings,
  allTournaments,
  onUpdate,
  standingsByGroup,
}: PromotionEditorProps) {
  const promotions = tournament.settings.promotions || [];
  const otherTournaments = allTournaments.filter((t) => t.id !== tournament.id);
  const isGrupos = tournament.format === "grupos";
  const teamsPerGroup = isGrupos ? Math.floor(tournament.numberOfTeams / (tournament.gruposQuantidade || 1)) : 0;

  const getPromotion = (pos: number) => promotions.find((p) => p.position === pos);

  const [editingPos, setEditingPos] = useState<number | null>(null);
  const [editType, setEditType] = useState<"promotion" | "relegation" | "playoff">("promotion");
  const [editColor, setEditColor] = useState(ZONE_COLORS[0].value);
  const [editTarget, setEditTarget] = useState("");
  const [customHex, setCustomHex] = useState("");

  const handleSave = (pos: number) => {
    const filtered = promotions.filter((p) => p.position !== pos);
    filtered.push({ position: pos, type: editType, color: editColor, targetCompetition: editTarget });
    filtered.sort((a, b) => a.position - b.position);
    onUpdate(filtered);
    setEditingPos(null);
  };

  const handleRemove = (pos: number) => {
    onUpdate(promotions.filter((p) => p.position !== pos));
  };

  const openEdit = (pos: number) => {
    const existing = getPromotion(pos);
    if (existing) {
      setEditType(existing.type);
      setEditColor(existing.color);
      setEditTarget(existing.targetCompetition);
      setCustomHex(existing.color);
    } else {
      setEditType("promotion");
      setEditColor(ZONE_COLORS[0].value);
      setEditTarget("");
      setCustomHex(ZONE_COLORS[0].value);
    }
    setEditingPos(pos);
  };

  const handleHexChange = (hex: string) => {
    setCustomHex(hex);
    if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
      setEditColor(hex);
    }
  };

  const renderPositionTable = (rows: StandingRow[], label?: string) => (
    <div className="rounded-lg border border-border overflow-hidden">
      {label && (
        <div className="px-3 py-1.5 bg-secondary/40 border-b border-border">
          <span className="text-xs font-bold text-foreground">{label}</span>
        </div>
      )}
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-secondary/50 text-muted-foreground">
            <th className="py-1.5 px-2 text-left w-8">#</th>
            <th className="py-1.5 px-2 text-left">Time</th>
            <th className="py-1.5 px-2 text-left">Zona</th>
            <th className="py-1.5 px-2 text-right w-16">Ação</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const pos = i + 1;
            const promo = getPromotion(pos);
            return (
              <tr
                key={row.teamId}
                className="border-t border-border/50"
                style={promo ? { borderLeft: `3px solid ${promo.color}` } : undefined}
              >
                <td className="py-2 px-2 text-muted-foreground font-mono">{pos}</td>
                <td className="py-2 px-2">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 flex items-center justify-center shrink-0">
                      {row.team?.logo ? (
                        <img src={row.team.logo} alt="" className="w-4 h-4 object-contain" />
                      ) : (
                        <Shield className="w-3 h-3 text-muted-foreground" />
                      )}
                    </div>
                    <span className="text-foreground truncate">{row.team?.shortName || row.team?.name || "—"}</span>
                  </div>
                </td>
                <td className="py-2 px-2">
                  {promo && (
                    <span
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium"
                      style={{ backgroundColor: promo.color + "20", color: promo.color }}
                    >
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: promo.color }} />
                      {promo.type === "promotion" ? "Promoção" : promo.type === "relegation" ? "Rebaixamento" : "Playoff"}
                      {promo.targetCompetition && ` → ${promo.targetCompetition}`}
                    </span>
                  )}
                </td>
                <td className="py-2 px-2 text-right">
                  {promo ? (
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(pos)} className="text-primary text-[10px] hover:underline">Editar</button>
                      <button onClick={() => handleRemove(pos)} className="text-destructive text-[10px] hover:underline">×</button>
                    </div>
                  ) : (
                    <button onClick={() => openEdit(pos)} className="text-primary text-[10px] hover:underline">Definir</button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  const groupCount = tournament.gruposQuantidade || 1;
  const gridCols = groupCount <= 2 ? "grid-cols-1 sm:grid-cols-2" : groupCount <= 4 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3";

  return (
    <div className="space-y-3">
      {isGrupos ? (
        <>
          <p className="text-[11px] text-muted-foreground">
            Defina as zonas por posição dentro de cada grupo. A mesma regra de posição se aplica a todos os grupos.
          </p>
          <div className={cn("grid gap-3", gridCols)}>
            {Array.from({ length: groupCount }, (_, i) => i + 1).map((g) => {
              let groupStandings = standingsByGroup?.[g] || [];
              // Generate placeholder rows if no real standings
              if (groupStandings.length === 0 && teamsPerGroup > 0) {
                groupStandings = Array.from({ length: teamsPerGroup }, (_, j) => ({
                  teamId: `placeholder-${g}-${j}`,
                  played: 0, wins: 0, draws: 0, losses: 0,
                  goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0,
                }));
              }
              return (
                <div key={g}>
                  {renderPositionTable(groupStandings, `Grupo ${String.fromCharCode(64 + g)}`)}
                </div>
              );
            })}
          </div>
        </>
      ) : (
        renderPositionTable(standings)
      )}

      {/* Inline editor */}
      {editingPos !== null && (
        <div className="p-3 rounded-lg bg-secondary/50 border border-border space-y-3">
          <p className="text-xs font-medium text-foreground">
            Posição {editingPos} {isGrupos ? "(todos os grupos)" : ""}
          </p>
          <div className="flex gap-2 flex-wrap">
            {(["promotion", "relegation", "playoff"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setEditType(t)}
                className={`px-2 py-1 rounded text-[11px] font-medium border transition-colors ${
                  editType === t ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {t === "promotion" ? "Promoção" : t === "relegation" ? "Rebaixamento" : "Playoff"}
              </button>
            ))}
          </div>
          <div className="space-y-2">
            <div className="flex gap-1.5 items-center">
              <span className="text-[11px] text-muted-foreground">Cor:</span>
              {ZONE_COLORS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => { setEditColor(c.value); setCustomHex(c.value); }}
                  className={`w-5 h-5 rounded-full border-2 transition-all ${
                    editColor === c.value ? "border-foreground scale-110" : "border-transparent"
                  }`}
                  style={{ backgroundColor: c.value }}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-muted-foreground">Hex:</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="color"
                  value={editColor}
                  onChange={(e) => { setEditColor(e.target.value); setCustomHex(e.target.value); }}
                  className="w-6 h-6 rounded border-0 cursor-pointer bg-transparent"
                />
                <Input
                  value={customHex}
                  onChange={(e) => handleHexChange(e.target.value)}
                  placeholder="#000000"
                  className="w-24 h-7 text-xs bg-secondary border-border"
                />
              </div>
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-[11px] text-muted-foreground">Competição destino:</span>
            <select
              value={editTarget}
              onChange={(e) => setEditTarget(e.target.value)}
              className="w-full text-xs bg-secondary border border-border rounded px-2 py-1.5 text-foreground"
            >
              <option value="">Nenhuma</option>
              {otherTournaments.map((t) => (
                <option key={t.id} value={t.name}>{t.name}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={() => handleSave(editingPos)} className="px-3 py-1 text-xs bg-primary text-primary-foreground rounded font-medium">Salvar</button>
            <button onClick={() => setEditingPos(null)} className="px-3 py-1 text-xs text-muted-foreground hover:text-foreground">Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}
