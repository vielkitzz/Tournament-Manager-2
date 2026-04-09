import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTournamentStore } from "@/store/tournamentStore";
import { Player } from "@/types/tournament";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Save, Shuffle } from "lucide-react";
import PageTransition from "@/components/PageTransition";
import { toast } from "sonner";
import { COUNTRIES } from "@/data/countries";

const POSITIONS = ["Goleiro", "Zagueiro", "Lateral Direito", "Lateral Esquerdo", "Volante", "Meia", "Meia Atacante", "Ponta Direita", "Ponta Esquerda", "Centroavante", "Segundo Atacante"];

const FIRST_NAMES = ["Lucas","Pedro","Gabriel","Rafael","Bruno","Carlos","Diego","Felipe","André","Marco","João","Matheus","Thiago","Daniel","Eduardo","Gustavo","Leonardo","Victor","Alex","Fernando"];
const LAST_NAMES = ["Silva","Santos","Oliveira","Souza","Pereira","Costa","Rodrigues","Almeida","Nascimento","Lima","Araújo","Fernandes","Barbosa","Ribeiro","Martins","Carvalho","Gomes","Rocha","Correia","Mendes"];

function randomName() {
  return `${FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)]} ${LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)]}`;
}
function randomNationality() {
  return COUNTRIES[Math.floor(Math.random() * COUNTRIES.length)];
}
function randomPosition() {
  return POSITIONS[Math.floor(Math.random() * POSITIONS.length)];
}
function randomAge() {
  return Math.floor(Math.random() * (38 - 17 + 1)) + 17;
}
function randomShirt(usedNumbers: number[]) {
  const available = Array.from({ length: 99 }, (_, i) => i + 1).filter((n) => !usedNumbers.includes(n));
  return available.length > 0 ? available[Math.floor(Math.random() * available.length)] : 1;
}
function randomRating() {
  return parseFloat((Math.random() * 9.98 + 0.01).toFixed(2));
}

export default function CreatePlayerPage() {
  const { id, teamId: routeTeamId } = useParams<{ id?: string; teamId?: string }>();
  const navigate = useNavigate();
  const { players, teams, addPlayer, updatePlayer } = useTournamentStore();

  const existing = id ? players.find((p) => p.id === id) : undefined;
  const isEdit = !!existing;
  const effectiveTeamId = existing?.teamId || routeTeamId || null;

  const [name, setName] = useState(existing?.name || "");
  const [nationality, setNationality] = useState(existing?.nationality || "");
  const [position, setPosition] = useState(existing?.position || "");
  const [age, setAge] = useState<string>(existing?.age?.toString() || "");
  const [shirtNumber, setShirtNumber] = useState<string>(existing?.shirtNumber?.toString() || "");
  const [rating, setRating] = useState<string>(existing?.rating?.toString() || "");
  const [saving, setSaving] = useState(false);

  const usedShirtNumbers = useMemo(
    () => players.filter((p) => p.teamId === effectiveTeamId && p.id !== existing?.id).map((p) => p.shirtNumber).filter((n): n is number => n != null),
    [players, effectiveTeamId, existing?.id]
  );

  const teamPlayerCount = useMemo(
    () => players.filter((p) => p.teamId === effectiveTeamId && p.id !== existing?.id).length,
    [players, effectiveTeamId, existing?.id]
  );

  useEffect(() => {
    if (existing) {
      setName(existing.name);
      setNationality(existing.nationality || "");
      setPosition(existing.position || "");
      setAge(existing.age?.toString() || "");
      setShirtNumber(existing.shirtNumber?.toString() || "");
      setRating(existing.rating?.toString() || "");
    }
  }, [existing]);

  const team = teams.find((t) => t.id === effectiveTeamId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error("O nome do jogador é obrigatório"); return; }
    const ratingVal = rating ? parseFloat(rating) : undefined;
    if (ratingVal !== undefined && (ratingVal < 0.01 || ratingVal > 9.99)) { toast.error("Rating deve estar entre 0,01 e 9,99"); return; }
    if (!isEdit && teamPlayerCount >= 24) { toast.error("Este clube já atingiu o máximo de 24 jogadores"); return; }

    setSaving(true);
    try {
      if (isEdit && existing) {
        await updatePlayer(existing.id, {
          name: name.trim(),
          nationality: nationality || undefined,
          position: position || undefined,
          age: age ? parseInt(age) : undefined,
          shirtNumber: shirtNumber ? parseInt(shirtNumber) : undefined,
          rating: ratingVal,
        });
        toast.success("Jogador atualizado com sucesso");
      } else {
        const newPlayer: Player = {
          id: crypto.randomUUID(),
          name: name.trim(),
          nationality: nationality || undefined,
          position: position || undefined,
          age: age ? parseInt(age) : undefined,
          shirtNumber: shirtNumber ? parseInt(shirtNumber) : undefined,
          rating: ratingVal ?? 0,
          teamId: effectiveTeamId,
        };
        await addPlayer(newPlayer);
        toast.success("Jogador criado com sucesso");
      }
      if (effectiveTeamId) navigate(`/players/team/${effectiveTeamId}`);
      else navigate("/players");
    } catch {
      toast.error("Erro ao salvar jogador");
    } finally {
      setSaving(false);
    }
  };

  const backPath = effectiveTeamId ? `/players/team/${effectiveTeamId}` : "/players";

  return (
    <PageTransition>
      <div className="p-6 lg:p-8 max-w-2xl mx-auto space-y-6">
        <Button variant="ghost" onClick={() => navigate(backPath)} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Button>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              {team && <TeamLogoSmall src={team.logo} name={team.name} />}
              <CardTitle>{isEdit ? "Editar Jogador" : "Novo Jogador"}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Nome */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="name">Nome *</Label>
                  <Button type="button" variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => setName(randomName())}>
                    <Shuffle className="w-3 h-3" /> Aleatório
                  </Button>
                </div>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do jogador" />
              </div>

              {/* Nacionalidade */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="nationality">Nacionalidade</Label>
                  <Button type="button" variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => setNationality(randomNationality())}>
                    <Shuffle className="w-3 h-3" /> Aleatório
                  </Button>
                </div>
                <Select value={nationality} onValueChange={setNationality}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o país" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {COUNTRIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Posição */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="position">Posição</Label>
                    <Button type="button" variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => setPosition(randomPosition())}>
                      <Shuffle className="w-3 h-3" /> Aleatório
                    </Button>
                  </div>
                  <Select value={position} onValueChange={setPosition}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a posição" />
                    </SelectTrigger>
                    <SelectContent>
                      {POSITIONS.map((p) => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Idade */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="age">Idade</Label>
                    <Button type="button" variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => setAge(String(randomAge()))}>
                      <Shuffle className="w-3 h-3" /> Aleatório
                    </Button>
                  </div>
                  <Input id="age" type="number" min={15} max={50} value={age} onChange={(e) => setAge(e.target.value)} placeholder="Ex: 25" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Camisa */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="shirt">Nº da Camisa</Label>
                    <Button type="button" variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => setShirtNumber(String(randomShirt(usedShirtNumbers)))}>
                      <Shuffle className="w-3 h-3" /> Aleatório
                    </Button>
                  </div>
                  <Input id="shirt" type="number" min={1} max={99} value={shirtNumber} onChange={(e) => setShirtNumber(e.target.value)} placeholder="Ex: 10" />
                </div>

                {/* Rating */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="rating">Rating (0,01 – 9,99)</Label>
                    <Button type="button" variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => setRating(String(randomRating()))}>
                      <Shuffle className="w-3 h-3" /> Aleatório
                    </Button>
                  </div>
                  <Input id="rating" type="number" min={0.01} max={9.99} step={0.01} value={rating} onChange={(e) => setRating(e.target.value)} placeholder="Ex: 7.50" />
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

function TeamLogoSmall({ src, name }: { src?: string; name: string }) {
  if (!src) return null;
  return <img src={src} alt={name} className="w-8 h-8 object-contain" />;
}
