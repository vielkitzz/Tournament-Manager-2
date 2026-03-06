import { motion } from "framer-motion";
import { Trophy, Shield, Swords, Calendar, TrendingUp, Star, ArrowRight, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTournamentStore } from "@/store/tournamentStore";
import { useAuth } from "@/hooks/useAuth";

const formatLabels: Record<string, string> = {
  liga: "Liga",
  grupos: "Grupos + Mata-Mata",
  "mata-mata": "Mata-Mata",
  suico: "Sistema Suíço",
};

export default function DashboardPage() {
  const { tournaments, teams, loading } = useTournamentStore();
  const { user } = useAuth();
  const navigate = useNavigate();

  const totalMatches = tournaments.reduce((sum, t) => sum + t.matches.filter((m) => m.played).length, 0);
  const totalSeasons = tournaments.reduce((sum, t) => sum + (t.seasons?.length || 0), 0);
  const activeTournaments = tournaments.filter((t) => !t.finalized);
  const recentTournaments = [...tournaments].slice(0, 5);

  // Find most successful team (most championship wins)
  const champCounts: Record<string, { name: string; logo?: string; count: number }> = {};
  tournaments.forEach((t) =>
    t.seasons?.forEach((s) => {
      if (!champCounts[s.championId]) champCounts[s.championId] = { name: s.championName, logo: s.championLogo, count: 0 };
      champCounts[s.championId].count++;
    })
  );
  const topChamp = Object.values(champCounts).sort((a, b) => b.count - a.count)[0];

  const stats = [
    { label: "Competições", value: tournaments.length, icon: Trophy, color: "text-primary" },
    { label: "Times", value: teams.length, icon: Shield, color: "text-emerald-500" },
    { label: "Jogos Realizados", value: totalMatches, icon: Swords, color: "text-amber-500" },
    { label: "Temporadas", value: totalSeasons, icon: Calendar, color: "text-violet-500" },
  ];

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Bom dia";
    if (h < 18) return "Boa tarde";
    return "Boa noite";
  };

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-8">
      {/* Greeting */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-display font-bold text-foreground tracking-tight">
          {greeting()} 👋
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Aqui está um resumo do seu universo esportivo
        </p>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="p-4 rounded-xl card-gradient border border-border"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-secondary/60 flex items-center justify-center shrink-0">
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-2xl font-display font-bold text-foreground leading-none">
                  {loading ? "–" : stat.value}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{stat.label}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Tournaments */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="lg:col-span-2 rounded-xl card-gradient border border-border p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-display font-bold text-foreground">Competições Recentes</h2>
            <button
              onClick={() => navigate("/competitions")}
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              Ver todas <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {recentTournaments.length === 0 ? (
            <div className="text-center py-10">
              <Trophy className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Nenhuma competição criada</p>
              <button
                onClick={() => navigate("/tournament/create")}
                className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Criar Competição
              </button>
            </div>
          ) : (
            <div className="space-y-1.5">
              {recentTournaments.map((t) => (
                <button
                  key={t.id}
                  onClick={() => navigate(`/tournament/${t.id}`)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-secondary/50 transition-colors text-left group"
                >
                  <div className="w-9 h-9 rounded-lg bg-secondary/60 flex items-center justify-center shrink-0">
                    {t.logo ? (
                      <img src={t.logo} alt="" className="w-7 h-7 object-contain rounded" />
                    ) : (
                      <Trophy className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{t.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {formatLabels[t.format]} · {t.numberOfTeams} times · {t.year}
                    </p>
                  </div>
                  {t.finalized ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent text-accent-foreground font-medium shrink-0">
                      Finalizado
                    </span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium shrink-0">
                      Em andamento
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </motion.div>

        {/* Side Panel */}
        <div className="space-y-4">
          {/* Top Champion */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="rounded-xl card-gradient border border-border p-5"
          >
            <h2 className="text-sm font-display font-bold text-foreground mb-3 flex items-center gap-2">
              <Star className="w-4 h-4 text-yellow-500" /> Maior Campeão
            </h2>
            {topChamp ? (
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-secondary/60 flex items-center justify-center">
                  {topChamp.logo ? (
                    <img src={topChamp.logo} alt="" className="w-10 h-10 object-contain" />
                  ) : (
                    <Shield className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">{topChamp.name}</p>
                  <p className="text-xs text-primary">{topChamp.count} título{topChamp.count > 1 ? "s" : ""}</p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Nenhum campeão registrado</p>
            )}
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="rounded-xl card-gradient border border-border p-5"
          >
            <h2 className="text-sm font-display font-bold text-foreground mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" /> Ações Rápidas
            </h2>
            <div className="space-y-1.5">
              {[
                { label: "Nova Competição", to: "/tournament/create", icon: Trophy },
                { label: "Novo Time", to: "/teams/create", icon: Shield },
                { label: "Amistoso", to: "/friendly", icon: Swords },
              ].map((action) => (
                <button
                  key={action.to}
                  onClick={() => navigate(action.to)}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
                >
                  <action.icon className="w-3.5 h-3.5" />
                  {action.label}
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
