import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft,
  CircleDollarSign,
  ExternalLink,
  Loader2,
  Mail,
  MapPin,
  MessageCircle,
} from "lucide-react";
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

import AppNavigation from "@/components/AppNavigation";
import { getStoredSession, signOut } from "@/lib/auth";
import {
  appendActivityLog,
  clientStages,
  createActivityEntry,
  defaultClientStage,
  getDaysSinceLastContact,
  getLeadTemperature,
  getStageBadgeClass,
  normalizeActivityLog,
  type ClientRecord,
  type PropertyLinkRecord,
} from "@/lib/crm";
import { supabase } from "@/lib/supabaseClient";

export default function ClientDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const session = getStoredSession();
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

  const handleLogout = async () => {
    const result = await signOut();

    if (!result.ok) {
      toast.error(result.message);
    } else {
      toast("Sesión cerrada");
    }

    navigate("/login", { replace: true });
  };

  const handleSave = async () => {
    if (!id || !supabase || !client) {
      toast.error("Configurá Supabase para guardar cambios");
      return;
    }

    let nextActivityLog = normalizeActivityLog(client.activity_log);

    if (stage !== client.stage) {
      nextActivityLog = appendActivityLog(
        nextActivityLog,
        createActivityEntry(`Etapa cambiada a ${stage}`, "stage"),
      );
    }

    if (notes.trim() !== (client.notes || "").trim()) {
      nextActivityLog = appendActivityLog(
        nextActivityLog,
        createActivityEntry("Notas actualizadas", "note"),
      );
    }

    setSaving(true);
    const { error } = await supabase
      .from("clients")
      .update({
        stage,
        notes: notes.trim() || null,
        activity_log: nextActivityLog,
      })
      .eq("id", id);
    setSaving(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    setClient((current) =>
      current ? { ...current, stage, notes, activity_log: nextActivityLog } : current,
    );
    toast.success("Cliente actualizado");
  };

  const handleMarkContactedToday = async () => {
    if (!id || !supabase || !client) {
      toast.error("Configurá Supabase para guardar cambios");
      return;
    }

    const now = new Date().toISOString();
    const nextActivityLog = appendActivityLog(
      client.activity_log,
      createActivityEntry("Contactado hoy", "contact"),
    );

    const { error } = await supabase
      .from("clients")
      .update({
        last_contact: now,
        activity_log: nextActivityLog,
      })
      .eq("id", id);

    if (error) {
      toast.error(error.message);
      return;
    }

    setClient((current) =>
      current ? { ...current, last_contact: now, activity_log: nextActivityLog } : current,
    );
    toast.success("Contacto actualizado");
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.08),_transparent_0),#09090b] text-white">
      <AppNavigation email={session?.email} onLogout={handleLogout} />

      <main className="mx-auto max-w-6xl space-y-5 px-4 py-6 pb-24 md:py-7 md:pb-7">
        {loading ? (
          <Card className="border border-white/10 bg-white/[0.04] text-white shadow-sm backdrop-blur-xl">
            <CardContent className="p-6 flex items-center gap-2 text-sm text-zinc-300">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando detalle del cliente...
            </CardContent>
          </Card>
        ) : errorMessage ? (
          <Card className="border-amber-500/40 bg-amber-50 shadow-sm">
            <CardContent className="p-4 text-sm text-amber-900">{errorMessage}</CardContent>
          </Card>
        ) : client ? (
          (() => {
            const leadTemperature = getLeadTemperature(client.last_contact);
            const daysSinceContact = getDaysSinceLastContact(client.last_contact);
            const activityHistory = normalizeActivityLog(client.activity_log);
            const lastContactLabel =
              daysSinceContact === null
                ? "Sin registro todavía"
                : daysSinceContact === 0
                  ? "Hoy"
                  : `Hace ${daysSinceContact} día${daysSinceContact === 1 ? "" : "s"}`;
            const primaryContact = client.whatsapp || client.phone;

            return <>
            <Card className="premium-fade-up overflow-hidden border border-white/10 bg-white/[0.04] text-white shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl">
              <CardContent className="p-6 md:p-7 space-y-5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="space-y-3">
                    <Badge variant="outline" className="border-white/20 bg-white/10 text-white">
                      Cliente CRM
                    </Badge>
                    <div>
                      <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{client.name}</h1>
                      <p className="mt-1 text-sm text-zinc-300">
                        Acá podés ver sus datos, registrar avances y abrir sus links guardados.
                      </p>
                    </div>
                    <p className="text-xs text-zinc-400">
                      Sesión activa: {session?.email ?? "usuario"} · Creado: {new Date(client.created_at).toLocaleString("es-UY")}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" asChild>
                      <Link to="/crm" className="gap-2">
                        <ArrowLeft className="h-4 w-4" />
                        Volver al CRM
                      </Link>
                    </Button>
                    <Button variant="secondary" onClick={() => navigate("/jira")}>Ir a Jira</Button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" onClick={() => void handleMarkContactedToday()}>
                    Contactado hoy
                  </Button>
                  {primaryContact && (
                    <Button variant="secondary" asChild>
                      <a
                        href={`https://wa.me/${primaryContact.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="gap-2"
                      >
                        <MessageCircle className="h-4 w-4" />
                        WhatsApp
                      </a>
                    </Button>
                  )}
                  {client.email && (
                    <Button variant="secondary" asChild>
                      <a href={`mailto:${client.email}`} className="gap-2">
                        <Mail className="h-4 w-4" />
                        Email
                      </a>
                    </Button>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-zinc-300">Etapa</p>
                    <Badge variant="outline" className={`mt-2 ${getStageBadgeClass(client.stage)}`}>
                      {client.stage}
                    </Badge>
                    <Badge variant="outline" className={`mt-2 ${leadTemperature.className}`}>
                      {leadTemperature.emoji} {leadTemperature.label}
                    </Badge>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-zinc-300">Operación</p>
                    <p className="mt-2 text-sm font-medium text-white">{client.operation_type || "No definida"}</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-zinc-300">Tipo</p>
                    <p className="mt-2 text-sm font-medium text-white">{client.property_type || "No definido"}</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-zinc-300">Departamento</p>
                    <p className="mt-2 text-sm font-medium text-white">{client.department || "No definido"}</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-zinc-300">Zona / Ciudad</p>
                    <p className="mt-2 text-sm font-medium text-white">{client.zone || "No definida"}</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-zinc-300">Presupuesto</p>
                    <p className="mt-2 text-sm font-medium text-white">{client.budget || client.period || "Sin dato"}</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-zinc-300">Último contacto</p>
                    <p className="mt-2 text-sm font-medium text-white">{lastContactLabel}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="premium-fade-up-delay-1 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
              <Card className="border border-white/10 bg-white/[0.04] text-white shadow-sm backdrop-blur-xl">
                <CardContent className="p-6 space-y-4">
                  <div className="space-y-1">
                    <h2 className="text-lg font-semibold text-white">Información del cliente</h2>
                    <p className="text-sm text-zinc-300">
                      Datos de contacto y preferencias cargadas en el CRM.
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-white/10 bg-black/25 p-4">
                      <div className="mb-2 flex items-center gap-2 text-zinc-400">
                        <MessageCircle className="h-4 w-4" />
                        <p className="text-xs uppercase tracking-[0.18em]">WhatsApp</p>
                      </div>
                      <p className="text-sm font-medium text-white">{primaryContact || "-"}</p>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-black/25 p-4">
                      <div className="mb-2 flex items-center gap-2 text-zinc-400">
                        <Mail className="h-4 w-4" />
                        <p className="text-xs uppercase tracking-[0.18em]">Email</p>
                      </div>
                      <p className="text-sm font-medium text-white break-all">{client.email || "-"}</p>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-black/25 p-4">
                      <div className="mb-2 flex items-center gap-2 text-zinc-400">
                        <MapPin className="h-4 w-4" />
                        <p className="text-xs uppercase tracking-[0.18em]">Ubicación</p>
                      </div>
                      <p className="text-sm font-medium text-white">{[client.department, client.zone].filter(Boolean).join(" · ") || "-"}</p>
                      <p className="mt-1 text-xs text-zinc-400">{client.zone_specific || "Sin detalle extra"}</p>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-black/25 p-4">
                      <div className="mb-2 flex items-center gap-2 text-zinc-400">
                        <CircleDollarSign className="h-4 w-4" />
                        <p className="text-xs uppercase tracking-[0.18em]">Período</p>
                      </div>
                      <p className="text-sm font-medium text-white">{client.period || "-"}</p>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-black/25 p-4">
                      <div className="mb-2 flex items-center gap-2 text-zinc-400">
                        <CircleDollarSign className="h-4 w-4" />
                        <p className="text-xs uppercase tracking-[0.18em]">Obs. presupuesto</p>
                      </div>
                      <p className="text-sm font-medium text-white">{client.budget_notes || "-"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-white/10 bg-white/[0.04] text-white shadow-sm backdrop-blur-xl">
                <CardContent className="p-6 space-y-4">
                  <div className="space-y-1">
                    <h2 className="text-lg font-semibold text-white">Seguimiento</h2>
                    <p className="text-sm text-zinc-300">
                      Elegí el estado actual y anotá cualquier comentario importante.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Estado actual</Label>
                    <Select value={stage} onValueChange={(value) => setStage(value as typeof defaultClientStage)}>
                      <SelectTrigger className="border-white/10 bg-black/30 text-white">
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
                      className="min-h-32 border-white/10 bg-black/30 text-white placeholder:text-zinc-500"
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                    />
                  </div>

                  <Button onClick={handleSave} className="w-full bg-white text-black hover:bg-zinc-200" disabled={saving}>
                    {saving ? "Guardando..." : "Guardar cambios"}
                  </Button>
                </CardContent>
              </Card>
            </div>

            <Card className="premium-fade-up-delay-2 border border-white/10 bg-white/[0.04] text-white shadow-sm backdrop-blur-xl">
              <CardContent className="p-6 space-y-4">
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold text-white">Historial de actividad</h2>
                  <p className="text-sm text-zinc-300">
                    Eventos relevantes del seguimiento comercial de este cliente.
                  </p>
                </div>

                {activityHistory.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-white/10 bg-black/25 px-6 py-8 text-center text-sm text-zinc-300">
                    Todavía no hay eventos registrados.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activityHistory.map((item) => (
                      <div key={item.id} className="rounded-xl border border-white/10 bg-black/25 px-4 py-3">
                        <p className="text-sm font-medium text-white">{item.label}</p>
                        <p className="mt-1 text-xs text-zinc-400">
                          {new Date(item.created_at).toLocaleString("es-UY")}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="premium-fade-up-delay-2 border border-white/10 bg-white/[0.04] text-white shadow-sm backdrop-blur-xl">
              <CardContent className="p-6 space-y-4">
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold text-white">Links guardados</h2>
                  <p className="text-sm text-zinc-300">
                    Acá aparecen los links relacionados con este cliente para abrirlos rápido.
                  </p>
                </div>

                {propertyLinks.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-white/10 bg-black/25 px-6 py-10 text-center">
                    <CircleDollarSign className="mx-auto mb-3 h-8 w-8 text-zinc-400" />
                    <p className="font-medium text-white">Este cliente todavía no tiene links asociados.</p>
                    <p className="mt-1 text-sm text-zinc-300">
                      Cuando generes y guardes links para este cliente aparecerán listados acá.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {propertyLinks.map((link) => (
                      <div
                        key={link.id}
                        className="rounded-xl border border-white/10 bg-black/25 p-4 shadow-sm flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white">
                            {link.property_type || "Propiedad"} · {link.colleague_agency || "Agencia colega"}
                          </p>
                          <p className="mt-1 text-xs text-zinc-300 break-all">{link.generated_url}</p>
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
          </>;
          })()
        ) : null}
      </main>
    </div>
  );
}
