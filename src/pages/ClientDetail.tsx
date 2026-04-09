import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, ExternalLink, Loader2, LogOut } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import logo from "@/assets/logo.png";
import { getSession, signOut } from "@/lib/auth";
import {
  clientStages,
  defaultClientStage,
  type ClientRecord,
  type PropertyLinkRecord,
} from "@/lib/crm";
import { supabase } from "@/lib/supabaseClient";

export default function ClientDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const session = getSession();
  const [client, setClient] = useState<ClientRecord | null>(null);
  const [propertyLinks, setPropertyLinks] = useState<PropertyLinkRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [notes, setNotes] = useState("");
  const [stage, setStage] = useState(defaultClientStage);

  const loadClient = useCallback(async () => {
    if (!id) {
      setErrorMessage("Cliente no encontrado.");
      setLoading(false);
      return;
    }

    if (!supabase) {
      setErrorMessage("Configurá Supabase para consultar el detalle del cliente.");
      setLoading(false);
      return;
    }

    setLoading(true);
    const [{ data: clientData, error: clientError }, { data: linksData, error: linksError }] = await Promise.all([
      supabase.from("clients").select("*").eq("id", id).maybeSingle(),
      supabase.from("property_links").select("*").eq("client_id", id).order("created_at", { ascending: false }),
    ]);

    if (clientError || !clientData) {
      setErrorMessage(clientError?.message || "Cliente no encontrado.");
      setLoading(false);
      return;
    }

    if (linksError) {
      toast.error("No se pudieron cargar los links del cliente");
    }

    setClient(clientData as ClientRecord);
    setStage((clientData.stage || defaultClientStage) as typeof defaultClientStage);
    setNotes(clientData.notes || "");
    setPropertyLinks((linksData ?? []) as PropertyLinkRecord[]);
    setErrorMessage("");
    setLoading(false);
  }, [id]);

  useEffect(() => {
    void loadClient();
  }, [loadClient]);

  const handleLogout = () => {
    signOut();
    toast("Sesión cerrada");
    navigate("/login", { replace: true });
  };

  const handleSave = async () => {
    if (!id || !supabase) {
      toast.error("Configurá Supabase para guardar cambios");
      return;
    }

    setSaving(true);
    const { error } = await supabase.from("clients").update({ stage, notes: notes.trim() || null }).eq("id", id);
    setSaving(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    setClient((current) => (current ? { ...current, stage, notes } : current));
    toast.success("Cliente actualizado");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-zinc-800 bg-black py-4 md:py-5 shadow-sm">
        <div className="mx-auto flex max-w-2xl justify-center px-4">
          <img
            src={logo}
            alt="Cupertino Negocios Inmobiliarios"
            className="h-20 md:h-24 w-auto max-w-full object-contain"
          />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 md:py-7 space-y-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground tracking-tight">Detalle de cliente</h1>
            <p className="text-sm text-muted-foreground">Sesión activa: {session?.email ?? "usuario"}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link to="/crm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Volver al CRM
              </Link>
            </Button>
            <Button variant="outline" onClick={() => navigate("/jira")}>Ir a Jira</Button>
            <Button variant="outline" onClick={handleLogout} className="gap-2">
              <LogOut className="h-4 w-4" />
              Cerrar sesión
            </Button>
          </div>
        </div>

        {loading ? (
          <Card>
            <CardContent className="p-6 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando detalle del cliente...
            </CardContent>
          </Card>
        ) : errorMessage ? (
          <Card className="border-amber-500/40 bg-amber-50">
            <CardContent className="p-4 text-sm text-amber-900">{errorMessage}</CardContent>
          </Card>
        ) : client ? (
          <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
            <Card>
              <CardContent className="p-6 space-y-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold text-foreground">{client.name}</h2>
                    <p className="text-sm text-muted-foreground">
                      Creado: {new Date(client.created_at).toLocaleString("es-UY")}
                    </p>
                  </div>
                  <Badge variant="secondary">{client.stage}</Badge>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">Teléfono</p>
                    <p className="text-sm text-foreground">{client.phone || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">WhatsApp</p>
                    <p className="text-sm text-foreground">{client.whatsapp || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">Email</p>
                    <p className="text-sm text-foreground">{client.email || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">Tipo de propiedad</p>
                    <p className="text-sm text-foreground">{client.property_type || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">Presupuesto</p>
                    <p className="text-sm text-foreground">{client.budget || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">Zona</p>
                    <p className="text-sm text-foreground">{client.zone || "-"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold text-foreground">Seguimiento comercial</h2>
                  <p className="text-sm text-muted-foreground">
                    Actualizá la etapa y notas del cliente.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Etapa</Label>
                  <Select value={stage} onValueChange={(value) => setStage(value as typeof defaultClientStage)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccioná una etapa" />
                    </SelectTrigger>
                    <SelectContent>
                      {clientStages.map((item) => (
                        <SelectItem key={item} value={item}>
                          {item}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="client-notes">Notas</Label>
                  <Textarea
                    id="client-notes"
                    className="min-h-32"
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                  />
                </div>

                <Button onClick={handleSave} className="w-full" disabled={saving}>
                  {saving ? "Guardando..." : "Guardar cambios"}
                </Button>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardContent className="p-6 space-y-4">
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold text-foreground">Links asociados</h2>
                  <p className="text-sm text-muted-foreground">
                    Historial de links guardados en la tabla `property_links`.
                  </p>
                </div>

                {propertyLinks.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Este cliente todavía no tiene links asociados.</p>
                ) : (
                  <div className="space-y-3">
                    {propertyLinks.map((link) => (
                      <div key={link.id} className="rounded-lg border border-border p-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground">
                            {link.property_type || "Propiedad"} · {link.colleague_agency || "Agencia colega"}
                          </p>
                          <p className="text-xs text-muted-foreground break-all">{link.generated_url}</p>
                        </div>
                        {link.generated_url && (
                          <Button variant="outline" asChild>
                            <a href={link.generated_url} target="_blank" rel="noopener noreferrer" className="gap-2">
                              <ExternalLink className="h-4 w-4" />
                              Abrir
                            </a>
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : null}
      </main>
    </div>
  );
}
