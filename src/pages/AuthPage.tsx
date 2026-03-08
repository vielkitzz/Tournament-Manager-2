import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, Lock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";
import appLogo from "@/assets/logo.svg";

export default function AuthPage() {
  const { signIn, signUp, signInAnonymously, signInWithGoogle, user } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [anonLoading, setAnonLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const translateError = (msg: string) => {
    const lower = msg.toLowerCase();
    if (lower.includes("invalid login credentials")) return "Email ou senha incorretos";
    if (lower.includes("email not confirmed")) return "Email não confirmado. Verifique sua caixa de entrada.";
    if (lower.includes("user not found")) return "Usuário não encontrado";
    if (lower.includes("user already registered")) return "Este email já está cadastrado. Tente fazer login.";
    if (lower.includes("signup is disabled")) return "Cadastro desativado temporariamente";
    if (lower.includes("email rate limit")) return "Muitas tentativas. Aguarde alguns minutos.";
    if (lower.includes("password") && lower.includes("least")) return "A senha deve ter pelo menos 6 caracteres";
    return msg;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error("Preencha todos os campos");
      return;
    }
    if (password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await signIn(email.trim(), password);
        if (error) {
          toast.error(translateError(error.message));
        }
      } else {
        const { error, session } = await signUp(email.trim(), password);
        if (error) {
          toast.error(translateError(error.message));
        } else if (!session) {
          toast.success("Conta criada! Verifique seu email para confirmar.", { duration: 6000 });
        } else {
          toast.success("Conta criada com sucesso!");
        }
      }
    } catch (err: any) {
      toast.error(translateError(err?.message || "Erro inesperado"));
    }
    setLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    const { error } = await signInWithGoogle();
    setGoogleLoading(false);
    if (error) toast.error((error as Error).message);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-8">
          <img src={appLogo} alt="TM2" className="h-12 object-contain mx-auto" />
          <p className="text-sm text-muted-foreground mt-2">Tournament Manager</p>
        </div>

        <div className="rounded-xl card-gradient border border-border shadow-card p-6">
          <h2 className="text-lg font-display font-bold text-foreground mb-1">
            {isLogin ? "Entrar" : "Criar Conta"}
          </h2>
          <p className="text-xs text-muted-foreground mb-5">
            {isLogin ? "Acesse suas competições" : "Comece a gerenciar seus torneios"}
          </p>

          {/* Google Sign In */}
          <Button
            type="button"
            variant="outline"
            disabled={googleLoading}
            onClick={handleGoogleSignIn}
            className="w-full mb-4 gap-2 text-sm"
          >
            {googleLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            )}
            Entrar com Google
          </Button>

          <div className="relative mb-4">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
            <div className="relative flex justify-center text-xs"><span className="bg-card px-2 text-muted-foreground">ou</span></div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="bg-secondary border-border pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="bg-secondary border-border pl-10"
                  minLength={6}
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full font-display font-semibold h-11 bg-primary text-primary-foreground hover:bg-primary/90 shadow-glow"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isLogin ? (
                "Entrar"
              ) : (
                "Criar Conta"
              )}
            </Button>
          </form>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
            <div className="relative flex justify-center text-xs"><span className="bg-card px-2 text-muted-foreground">ou</span></div>
          </div>

          <Button
            type="button"
            variant="outline"
            disabled={anonLoading}
            onClick={async () => {
              setAnonLoading(true);
              const { error } = await signInAnonymously();
              setAnonLoading(false);
              if (error) toast.error(error.message);
            }}
            className="w-full text-sm"
          >
            {anonLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Entrar sem conta"}
          </Button>

          <div className="mt-4 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-xs text-primary hover:underline"
            >
              {isLogin ? "Não tem conta? Criar uma" : "Já tem conta? Entrar"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
