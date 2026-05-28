import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useTournamentStore } from "@/store/tournamentStore";
import { Users, Search, Shield, RefreshCw } from "lucide-react";
import TeamLogo from "@/components/TeamLogo";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { clearLineupCache } from "@/lib/solaraLineups";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

type SortMode = "name" | "rate";

export default function PlayersPage() {
  const { teams, players, loading, initialize } = useTournamentStore();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("name");
  const [syncing, setSyncing] = useState(false);

  async function handleSyncAll() {
    if (syncing) return;
    setSyncing(true);
    try {
      const { data: links, error } = await (supabase as any)
        .from("club_sync_links")
        .select("tm2_team_id, solarahub_club_id, sync_enabled");
      if (error) throw error;
      const enabled = (links || []).filter((l: any) => l.sync_enabled !== false);
      if (enabled.length === 0) {
        toast.info("Nenhum elenco vinculado ao SolaraHub.");
        return;
      }
      toast.info(`Sincronizando ${enabled.length} elenco(s)...`);
      let ok = 0;
      let fail = 0;
      await Promise.all(
        enabled.map(async (l: any) => {
          const { data, error: err } = await (supabase as any).functions.invoke("import-solarahub-squad", {
            body: { teamId: l.tm2_team_id, solarahub_club_id: l.solarahub_club_id },
          });
          if (err || (data && data.error)) {
            fail++;
          } else {
            ok++;
            await (supabase as any)
              .from("club_sync_links")
              .update({ last_synced_at: new Date().toISOString() })
              .eq("tm2_team_id", l.tm2_team_id);
            clearLineupCache(l.tm2_team_id);
          }
        }),
      );
      await initialize(user?.id ?? null);
      if (fail === 0) toast.success(`${ok} elenco(s) sincronizado(s).`);
      else toast.warning(`${ok} sincronizado(s), ${fail} falharam.`);
    } catch (e: any) {
      toast.error("Erro ao sincronizar: " + (e?.message || "desconhecido"));
    } finally {
      setSyncing(false);
    }
  }

  const activeTeams = useMemo(() => teams.filter((t) => !t.isArchived), [teams]);

  const filteredTeams = useMemo(() => {
    const q = search.toLowerCase();
    const filtered = activeTeams.filter(
      (t) =>
        (t.name || "").toLowerCase().includes(q) ||
        (t.shortName || "").toLowerCase().includes(q) ||
        (t.abbreviation || "").toLowerCase().includes(q),
    );
    if (sortMode === "rate") {
      filtered.sort((a, b) => (b.rate ?? 0) - (a.rate ?? 0));
    } else {
      filtered.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    }
    return filtered;
  }, [activeTeams, search, sortMode]);

  const playerCountByTeam = useMemo(() => {
    const map: Record<string, number> = {};
    for (const p of players) {
      if (p.teamId) {
        map[p.teamId] = (map[p.teamId] || 0) + 1;
      }
    }
    return map;
  }, [players]);

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground tracking-tight">Elencos</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Selecione um clube para gerir o seu elenco ({activeTeams.length} clubes)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSyncAll}
            disabled={syncing}
            className="gap-2 h-9"
            title="Atualizar sincronização com SolaraHub"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Sincronizando..." : "Sincronizar"}
          </Button>
          {activeTeams.length > 0 && (
            <div className="relative w-full sm:w-56">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar clube..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          )}
          {activeTeams.length > 0 && (
            <div className="flex items-center rounded-lg border border-border overflow-hidden shrink-0">
              <button
                onClick={() => setSortMode("name")}
                className={`px-3 py-2 text-xs font-medium transition-colors ${sortMode === "name" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`}
              >
                A-Z
              </button>
              <button
                onClick={() => setSortMode("rate")}
                className={`px-3 py-2 text-xs font-medium transition-colors ${sortMode === "rate" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`}
              >
                Rate
              </button>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-4 rounded-xl border border-border">
              <div className="flex items-center gap-3">
                <Skeleton className="w-12 h-12 rounded-md" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : activeTeams.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center py-16"
        >
          <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">Nenhum clube cadastrado</p>
          <p className="text-sm text-muted-foreground mt-1">
            Crie um time primeiro em{" "}
            <Link to="/teams/create" className="text-primary underline">
              Novo Time
            </Link>
            .
          </p>
        </motion.div>
      ) : filteredTeams.length === 0 && search ? (
        <div className="text-center py-12">
          <Search className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">Nenhum clube encontrado para "{search}"</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filteredTeams.map((team, index) => {
            const count = playerCountByTeam[team.id] || 0;
            return (
              <motion.div
                key={team.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
              >
                <div
                  onClick={() => navigate(`/squads/team/${team.id}`)}
                  className="p-3 rounded-xl bg-card text-card-foreground border border-border hover:border-primary/40 transition-all relative overflow-hidden group cursor-pointer active:scale-[0.98]"
                >
                  <div className="absolute left-0 top-0 bottom-0 w-1.5 rounded-l-xl overflow-hidden flex flex-col">
                    {(team.colors && team.colors.length > 0
                      ? team.colors
                      : ["hsl(var(--primary))", "hsl(var(--secondary))"]
                    ).map((c, i) => (
                      <div key={i} className="flex-1" style={{ backgroundColor: c }} />
                    ))}
                  </div>

                  <div className="flex items-center gap-2 pl-2">
                    <div className="w-10 h-10 flex items-center justify-center shrink-0">
                      {team.logo ? (
                        <img
                          src={team.logo}
                          alt=""
                          className="w-10 h-10 object-contain"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                            e.currentTarget.nextElementSibling?.classList.remove("hidden");
                          }}
                        />
                      ) : null}
                      <Shield className={`w-5 h-5 text-muted-foreground ${team.logo ? "hidden" : ""}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-display font-bold text-foreground text-sm truncate group-hover:text-primary transition-colors">
                        {team.name}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {count} jogador{count !== 1 ? "es" : ""}
                        {sortMode === "rate" && (
                          <span className="text-primary font-mono ml-1">({team.rate?.toFixed(2)})</span>
                        )}
                      </p>
                      <div className="mt-1.5 h-1 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            count >= 11 && count <= 30 ? "bg-primary" : count > 30 ? "bg-destructive" : "bg-amber-500"
                          }`}
                          style={{ width: `${Math.min((count / 30) * 100, 100)}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {count < 11
                          ? `Faltam ${11 - count} (mín. 11)`
                          : count <= 30
                            ? `${30 - count} vagas restantes`
                            : "Elenco cheio"}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
