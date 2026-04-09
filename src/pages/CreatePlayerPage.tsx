import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTournamentStore } from "@/store/tournamentStore";
import { Player } from "@/types/tournament";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Save } from "lucide-react";
import PageTransition from "@/components/PageTransition";
import { toast } from "sonner";

export default function CreatePlayerPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { players, teams, addPlayer, updatePlayer } = useTournamentStore();

  const existing = id ? players.find((p) => p.id === id) : undefined;
  const isEdit = !!existing;

  const [name, setName] = useState(existing?.name || "");
  const [position, setPosition] = useState(existing?.position || "");
  const [shirtNumber, setShirtNumber] = useState<string>(existing?.shirtNumber?.toString() || "");
  const [rating, setRating] = useState<string>(existing?.rating?.toString() || "0");
  const [teamId, setTeamId] = useState<string>(existing?.teamId || "__free__");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (existing) {
      setName(existing.name);
      setPosition(existing.position || "");
      setShirtNumber(existing.shirtNumber?.toString() || "");
      setRating(existing.rating?.toString() || "0");
      setTeamId(existing.teamId || "__free__");
    }
  }, [existing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("O nome do jogador é obrigatório");
      return;
    }
    setSaving(true);
    const resolvedTeamId = teamId === "__free__" ? null : teamId;
    try {
      if (isEdit && existing) {
        await updatePlayer(existing.id, {
          name: name.trim(),
          position: position.trim() || undefined,
          shirtNumber: shirtNumber ? parseInt(shirtNumber) : undefined,
          rating: rating ? parseInt(rating) : undefined,
          teamId: resolvedTeamId,
        });
        toast.success("Jogador atualizado com sucesso");
      } else {
        const newPlayer: Player = {
          id: crypto.randomUUID(),
          name: name.trim(),
          position: position.trim() || undefined,
          shirtNumber: shirtNumber ? parseInt(shirtNumber) : undefined,
          rating: rating ? parseInt(rating) : 0,
          teamId: resolvedTeamId,
        };
        await addPlayer(newPlayer);
        toast.success("Jogador criado com sucesso");
      }
      navigate("/players");
    } catch {
      toast.error("Erro ao salvar jogador");
    } finally {
      setSaving(false);
    }
  };

  const positions = ["Goleiro", "Zagueiro", "Lateral", "Volante", "Meia", "Atacante"];

  return (
    <PageTransition>
      <div className="p-6 lg:p-8 max-w-2xl mx-auto space-y-6">
        <Button variant="ghost" onClick={() => navigate("/players")} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>{isEdit ? "Editar Jogador" : "Novo Jogador"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="name">Nome *</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do jogador" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="position">Posição</Label>
                  <Select value={position} onValueChange={setPosition}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a posição" />
                    </SelectTrigger>
                    <SelectContent>
                      {positions.map((p) => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="shirt">Número da Camisa</Label>
                  <Input id="shirt" type="number" min={0} max={99} value={shirtNumber} onChange={(e) => setShirtNumber(e.target.value)} placeholder="Ex: 10" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rating">Rating (0-100)</Label>
                  <Input id="rating" type="number" min={0} max={100} value={rating} onChange={(e) => setRating(e.target.value)} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="team">Time</Label>
                  <Select value={teamId} onValueChange={setTeamId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o time" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__free__">Agente Livre / Sem time</SelectItem>
                      {teams.filter((t) => !t.isArchived).map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button type="submit" disabled={saving} className="gap-2">
                  <Save className="w-4 h-4" />
                  {saving ? "Salvando..." : isEdit ? "Salvar Alterações" : "Criar Jogador"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
}
