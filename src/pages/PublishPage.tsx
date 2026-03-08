import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Share2, Trophy, Copy, Trash2, Plus, Users, Eye, Shield as ShieldIcon, Link } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTournamentStore } from "@/store/tournamentStore";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface PublishedTournament {
  id: string;
  tournament_id: string;
  share_token: string;
  created_at: string;
}

interface Collaborator {
  id: string;
  published_tournament_id: string;
  email: string;
  role: string;
  created_at: string;
}

export default function PublishPage() {
  const { tournaments } = useTournamentStore();
  const { user } = useAuth();
  const [published, setPublished] = useState<PublishedTournament[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState("viewer");
  const [selectedPub, setSelectedPub] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("published_tournaments").select("*").eq("user_id", user.id).then(({ data }) => {
      if (data) setPublished(data as any);
    });
  }, [user]);

  useEffect(() => {
    if (!selectedPub) return;
    supabase.from("tournament_collaborators").select("*").eq("published_tournament_id", selectedPub).then(({ data }) => {
      if (data) setCollaborators(data as any);
    });
  }, [selectedPub]);

  const handlePublish = async (tournamentId: string) => {
    if (!user) return;
    const existing = published.find((p) => p.tournament_id === tournamentId);
    if (existing) {
      toast.info("Esta competição já está publicada");
      return;
    }
    const { data, error } = await supabase.from("published_tournaments").insert({
      tournament_id: tournamentId,
      user_id: user.id,
    } as any).select().single();
    if (error) {
      toast.error("Erro ao publicar competição");
      console.error(error);
      return;
    }
    if (data) {
      setPublished((prev) => [...prev, data as any]);
      toast.success("Competição publicada!");
    }
  };

  const handleUnpublish = async (pubId: string) => {
    await supabase.from("published_tournaments").delete().eq("id", pubId).eq("user_id", user?.id);
    setPublished((prev) => prev.filter((p) => p.id !== pubId));
    if (selectedPub === pubId) setSelectedPub(null);
    toast.success("Publicação removida");
  };

  const handleAddCollaborator = async () => {
    if (!selectedPub || !newEmail.trim()) return;
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    if (!emailRegex.test(newEmail.trim())) {
      toast.error("Email inválido");
      return;
    }
    const { data, error } = await supabase.from("tournament_collaborators").insert({
      published_tournament_id: selectedPub,
      email: newEmail.trim(),
      role: newRole,
    } as any).select().single();
    if (error) {
      toast.error("Erro ao adicionar colaborador");
      return;
    }
    if (data) setCollaborators((prev) => [...prev, data as any]);
    setNewEmail("");
    toast.success("Colaborador adicionado!");
  };

  const handleRemoveCollaborator = async (colId: string) => {
    await supabase.from("tournament_collaborators").delete().eq("id", colId).eq("published_tournament_id", selectedPub);
    setCollaborators((prev) => prev.filter((c) => c.id !== colId));
    toast.success("Colaborador removido");
  };

  const getShareUrl = (token: string) => `${window.location.origin}/shared/${token}`;

  const copyLink = (token: string) => {
    navigator.clipboard.writeText(getShareUrl(token));
    toast.success("Link copiado!");
  };

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-display font-bold text-foreground uppercase tracking-wide">
          Publicar Competições
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Compartilhe suas competições com outros usuários
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Tournament list */}
        <div className="space-y-4">
          <h2 className="text-sm font-display font-bold text-foreground uppercase tracking-wider">Suas Competições</h2>
          {tournaments.map((t) => {
            const pub = published.find((p) => p.tournament_id === t.id);
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-xl card-gradient border border-border"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 flex items-center justify-center shrink-0">
                    {t.logo ? (
                      <img src={t.logo} alt="" className="w-10 h-10 object-contain" />
                    ) : (
                      <Trophy className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display font-bold text-foreground text-sm truncate">{t.name}</h3>
                    <p className="text-xs text-muted-foreground">{t.sport} · {t.year}</p>
                  </div>
                  {pub ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => copyLink(pub.share_token)}
                        className="p-1.5 rounded-md hover:bg-secondary text-primary"
                        title="Copiar link"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setSelectedPub(pub.id)}
                        className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground"
                        title="Gerenciar colaboradores"
                      >
                        <Users className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleUnpublish(pub.id)}
                        className="p-1.5 rounded-md hover:bg-destructive/20 text-muted-foreground hover:text-destructive"
                        title="Despublicar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handlePublish(t.id)}
                      className="gap-1.5 bg-primary text-primary-foreground"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      Publicar
                    </Button>
                  )}
                </div>
                {pub && (
                  <div className="mt-2 flex items-center gap-2 p-2 rounded-lg bg-secondary/50">
                    <Link className="w-3 h-3 text-primary shrink-0" />
                    <span className="text-[11px] text-muted-foreground truncate flex-1">{getShareUrl(pub.share_token)}</span>
                  </div>
                )}
              </motion.div>
            );
          })}
          {tournaments.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhuma competição criada</p>
          )}
        </div>

        {/* Right: Collaborators panel */}
        <div>
          {selectedPub ? (
            <div className="space-y-4">
              <h2 className="text-sm font-display font-bold text-foreground uppercase tracking-wider">
                Colaboradores
              </h2>
              <div className="p-4 rounded-xl card-gradient border border-border space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Email do colaborador"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="bg-secondary border-border flex-1"
                  />
                  <Select value={newRole} onValueChange={setNewRole}>
                    <SelectTrigger className="bg-secondary border-border w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="viewer">
                        <span className="flex items-center gap-1.5"><Eye className="w-3 h-3" /> Visualizador</span>
                      </SelectItem>
                      <SelectItem value="admin">
                        <span className="flex items-center gap-1.5"><ShieldIcon className="w-3 h-3" /> Administrador</span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={handleAddCollaborator} size="sm" className="gap-1 bg-primary text-primary-foreground">
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                </div>

                {collaborators.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    Nenhum colaborador adicionado
                  </p>
                ) : (
                  <div className="space-y-2">
                    {collaborators.map((c) => (
                      <div key={c.id} className="flex items-center gap-3 p-2 rounded-lg bg-secondary/50">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground truncate">{c.email}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {c.role === "admin" ? "Administrador" : "Visualizador"}
                          </p>
                        </div>
                        <button
                          onClick={() => handleRemoveCollaborator(c.id)}
                          className="p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-muted-foreground">
                Selecione uma competição publicada para gerenciar colaboradores
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
