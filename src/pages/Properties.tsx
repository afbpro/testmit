import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Building2, ChevronRight, LayoutGrid } from "lucide-react";

import AppNavigation from "@/components/AppNavigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getStoredSession, signOut } from "@/lib/auth";

export default function Properties() {
  const navigate = useNavigate();
  const session = getStoredSession();

  const handleLogout = async () => {
    const result = await signOut();

    if (!result.ok) {
      toast.error(result.message);
    } else {
      toast("Sesión cerrada");
    }

    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.08),_transparent_0),#09090b] text-white">
      <AppNavigation email={session?.email} onLogout={handleLogout} />

      <main className="mx-auto max-w-6xl space-y-5 px-3 py-6 pb-24 sm:px-4 md:py-7 md:pb-7">
        <Card className="premium-fade-up overflow-hidden border border-white/10 bg-white/[0.04] text-white shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl">
          <CardContent className="p-6 md:p-7">
            <div className="space-y-3">
              <Badge variant="outline" className="border-white/20 bg-white/10 text-white">
                Cupertino
              </Badge>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Propiedades</h1>
                <p className="mt-1 text-sm text-zinc-300">
                  Esta sección queda preparada para centralizar el catálogo, publicaciones y seguimiento de propiedades.
                </p>
              </div>
              <p className="break-all text-xs text-zinc-400">Sesión activa: {session?.email ?? "usuario"}</p>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
          <Card className="border border-white/10 bg-white/[0.04] text-white shadow-sm backdrop-blur-xl">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-zinc-200">
                  <LayoutGrid className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Próximo paso</h2>
                  <p className="mt-1 text-sm text-zinc-300">
                    Acá vamos a mostrar el listado de propiedades, estado comercial y vínculos con clientes del CRM.
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 px-4 py-4 text-sm text-zinc-300">
                Por ahora podés seguir usando el <strong>Generador de Link Colega</strong> y el <strong>CRM</strong> mientras terminamos esta vista.
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <Button className="w-full bg-white text-black hover:bg-zinc-200" onClick={() => navigate("/")}>
                  Ir a Links
                </Button>
                <Button variant="outline" className="w-full border-white/10 bg-transparent text-white hover:bg-white/5" onClick={() => navigate("/crm")}>
                  Ir al CRM
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-white/10 bg-white/[0.04] text-white shadow-sm backdrop-blur-xl">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-zinc-200">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Qué incluir</h2>
                  <p className="mt-1 text-sm text-zinc-300">La base ya está lista para sumar el módulo sin romper la navegación.</p>
                </div>
              </div>

              <ul className="space-y-2 text-sm text-zinc-300">
                <li className="flex items-start gap-2"><ChevronRight className="mt-0.5 h-4 w-4 text-zinc-500" />Listado y búsqueda de propiedades</li>
                <li className="flex items-start gap-2"><ChevronRight className="mt-0.5 h-4 w-4 text-zinc-500" />Alta y edición rápida</li>
                <li className="flex items-start gap-2"><ChevronRight className="mt-0.5 h-4 w-4 text-zinc-500" />Compatibilidad con clientes del CRM</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
