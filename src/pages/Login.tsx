import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import logo from "@/assets/logo.png";
import { getSession, getStoredSession, signIn } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabaseClient";

interface LocationState {
  from?: string;
}

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [session, setSession] = useState(getStoredSession());
  const [checkingSession, setCheckingSession] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    let active = true;

    const loadSession = async () => {
      const currentSession = await getSession();

      if (active) {
        setSession(currentSession);
        setCheckingSession(false);
      }
    };

    void loadSession();

    return () => {
      active = false;
    };
  }, []);

  if (session) {
    return <Navigate to="/crm" replace />;
  }

  const requestedPath = (location.state as LocationState | null)?.from;
  const redirectTo = requestedPath && requestedPath !== "/" ? requestedPath : "/crm";

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      toast.error("Ingresá un email válido");
      return;
    }

    if (password.trim().length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    setSubmitting(true);
    const result = await signIn(normalizedEmail, password);
    setSubmitting(false);

    if (!result.ok) {
      toast.error(result.message);
      return;
    }

    setSession(result.session);
    setPassword("");
    toast.success("Sesión iniciada");
    navigate(redirectTo, { replace: true });
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.08),_transparent_0),#09090b] text-white flex flex-col">
      <header className="border-b border-white/10 bg-black/75 py-5 md:py-6 shadow-[0_12px_40px_rgba(0,0,0,0.35)] backdrop-blur-2xl">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-2 px-4 text-center">
          <img
            src={logo}
            alt="Cupertino Negocios Inmobiliarios"
            className="h-24 md:h-24 w-auto max-w-full object-contain drop-shadow-[0_10px_30px_rgba(255,255,255,0.05)]"
          />
          <p className="text-[10px] uppercase tracking-[0.34em] text-zinc-500">Negocios Inmobiliarios</p>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-6 md:py-8">
        <div className="premium-fade-up w-full max-w-md space-y-5">
          {checkingSession && (
            <p className="text-center text-sm text-zinc-400">Verificando sesión activa...</p>
          )}
          <div className="space-y-2 text-center">
            <h1 className="text-3xl font-semibold tracking-tight text-white">Iniciar sesión</h1>
            <p className="text-sm text-zinc-300">
              Entrá con tu correo y contraseña para ver clientes y hacer seguimiento.
            </p>
          </div>

          <Card className="border border-white/10 bg-white/[0.04] text-white shadow-[0_20px_50px_rgba(0,0,0,0.45)] backdrop-blur-xl">
            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-muted-foreground text-xs uppercase tracking-wider">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="nombre@empresa.com"
                    className="border-white/10 bg-black/30 text-white placeholder:text-zinc-500"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-muted-foreground text-xs uppercase tracking-wider">
                    Contraseña
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="Ingresá tu contraseña"
                    className="border-white/10 bg-black/30 text-white placeholder:text-zinc-500"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-white text-black hover:bg-zinc-200"
                  disabled={submitting || !isSupabaseConfigured}
                >
                  {submitting ? "Ingresando..." : "Ingresar"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="border border-white/10 bg-white/[0.03] backdrop-blur-xl">
            <CardContent className="p-4">
              <p className="text-xs text-zinc-300">
                Usá un usuario creado en <span className="font-mono">Supabase Auth</span>. Si no podés entrar,
                revisá las variables <span className="font-mono">VITE_SUPABASE_URL</span> y{" "}
                <span className="font-mono">VITE_SUPABASE_ANON_KEY</span>.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
