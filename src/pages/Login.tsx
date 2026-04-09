import { useState } from "react";
import type { FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import logo from "@/assets/logo.png";
import { getSession, signIn } from "@/lib/auth";

interface LocationState {
  from?: string;
}

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const session = getSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  if (session) {
    return <Navigate to="/" replace />;
  }

  const redirectTo = (location.state as LocationState | null)?.from || "/";

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
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

    const result = signIn(normalizedEmail, password);

    if (!result.ok) {
      toast.error(result.message);
      return;
    }

    setPassword("");
    toast.success("Sesión iniciada");
    navigate(redirectTo, { replace: true });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card py-4 md:py-5">
        <div className="mx-auto flex max-w-lg justify-center px-4">
          <img
            src={logo}
            alt="Cupertino Negocios Inmobiliarios"
            className="h-20 md:h-24 object-contain"
          />
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-6 md:py-7 space-y-5">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">Iniciar sesión</h1>
          <p className="text-sm text-muted-foreground">
            Accedé con tu mail y contraseña para usar el generador de links.
          </p>
        </div>

        <Card>
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
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>

              <Button type="submit" className="w-full">
                Ingresar
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">
              Demo local: <span className="font-mono">demo@cupertino.com / colega123</span>. Si querés,
              podés cambiar estas credenciales con <span className="font-mono">VITE_LOGIN_EMAIL</span> y{" "}
              <span className="font-mono">VITE_LOGIN_PASSWORD</span>.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
