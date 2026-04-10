import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Building2,
  CircleDollarSign,
  Loader2,
  LogOut,
  RefreshCw,
  Search,
  UserPlus,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import { getStoredSession, signOut } from "@/lib/auth";
import {
  clientStages,
  defaultClientStage,
  getStageBadgeClass,
  type ClientRecord,
  type ClientStage,
} from "@/lib/crm";
import { supabase } from "@/lib/supabaseClient";

const initialClientForm = {
  name: "",
  phone: "",
  whatsapp: "",
  email: "",
  property_type: "",
  budget: "",
  zone: "",
  notes: "",
  stage: defaultClientStage as ClientStage,
};

export default function CRM() {
  const navigate = useNavigate();
  const session = getStoredSession();
  const supabaseReady = Boolean(supabase);
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [form, setForm] = useState(initialClientForm);

  const loadClients = useCallback(async () => {
    if (!supabase) {
      setClients([]);
      setErrorMessage(
        "Configurá VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY para cargar los clientes desde Supabase."
      );
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setClients([]);
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    setClients((data ?? []) as ClientRecord[]);
    setErrorMessage("");
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadClients();
  }, [loadClients]);

  const stageCounts = useMemo(() => {
    return clientStages.reduce<Record<string, number>>((counts, stage) => {
      counts[stage] = clients.filter((client) => client.stage === stage).length;
      return counts;
    }, {});
  }, [clients]);

  const pipelineCount = useMemo(() => {
    return clients.filter((client) =>
      ["Interesado", "Visita agendada", "Negociando"].includes(client.stage)
    ).length;
  }, [clients]);

  const filteredClients = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return clients.filter((client) => {
      const matchesStage = stageFilter === "all" || client.stage === stageFilter;
      const matchesQuery =
        !normalizedQuery ||
        [client.name, client.email, client.phone, client.zone, client.property_type]
          .filter(Boolean)
          .some((value) => value?.toLowerCase().includes(normalizedQuery));

      return matchesStage && matchesQuery;
    });
  }, [clients, searchQuery, stageFilter]);

  const handleLogout = async () => {
    const result = await signOut();

    if (!result.ok) {
      toast.error(result.message);
    } else {
      toast("Sesión cerrada");
    }

    navigate("/login", { replace: true });
  };

  const handleChange = (field: keyof typeof initialClientForm) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm((current) => ({
      ...current,
      [field]: event.target.value,
    }));
  };

  const handleStageChange = (value: string) => {
    setForm((current) => ({
      ...current,
      stage: value as ClientStage,
    }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.name.trim()) {
      toast.error("El nombre del cliente es obligatorio");
      return;
    }

    if (!supabase) {
      toast.error("Configurá Supabase para guardar clientes");
      return;
    }

    setSaving(true);
    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      whatsapp: form.whatsapp.trim() || null,
      email: form.email.trim() || null,
      property_type: form.property_type.trim() || null,
      budget: form.budget.trim() || null,
      zone: form.zone.trim() || null,
      notes: form.notes.trim() || null,
      stage: form.stage,
    };

    const { data, error } = await supabase.from("clients").insert(payload).select().single();
    setSaving(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Cliente agregado");
    setForm(initialClientForm);
    await loadClients();

    if (data?.id) {
      navigate(`/crm/client/${data.id}`);
    }
  };

  const updateClientStage = async (clientId: string, stage: string) => {
    setClients((current) => current.map((client) => (client.id === clientId ? { ...client, stage } : client)));

    if (!supabase) {
      toast.error("Configurá Supabase para actualizar etapas");
      return;
    }

    const { error } = await supabase.from("clients").update({ stage }).eq("id", clientId);

    if (error) {
      toast.error(error.message);
      await loadClients();
      return;
    }

    toast.success("Etapa actualizada");
  };

  const metricCards = [
    {
      title: "Total clientes",
      value: clients.length,
      helper: `${stageCounts["Interesado"] ?? 0} interesados hoy`,
      icon: Users,
    },
    {
      title: "En seguimiento",
      value: pipelineCount,
      helper: "Clientes que siguen activos",
      icon: UserPlus,
    },
    {
      title: "Cerrados",
      value: stageCounts.Cerrado ?? 0,
      helper: "Operaciones finalizadas",
      icon: CircleDollarSign,
    },
    {
      title: "Descartados",
      value: stageCounts.Descartado ?? 0,
      helper: "Sin continuidad",
      icon: Building2,
    },
  ];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.08),_transparent_0),#09090b] text-white">

      <main className="mx-auto max-w-7xl px-4 py-6 md:py-7 space-y-5">
        <Card className="premium-fade-up overflow-hidden border border-white/10 bg-white/[0.04] text-white shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl">
          <CardContent className="p-6 md:p-7">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div className="space-y-3">
                <Badge variant="outline" className="border-white/20 bg-white/10 text-white">
                  Cupertino CRM
                </Badge>
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">CRM de clientes</h1>
                  <p className="mt-1 text-sm text-zinc-300">
                    Gestioná leads, seguimiento comercial y oportunidades desde un solo lugar.
                  </p>
                </div>
                <p className="text-xs text-zinc-400">Sesión activa: {session?.email ?? "usuario"}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button className="gap-2 bg-white text-black hover:bg-zinc-200" onClick={() => document.getElementById('client-name')?.focus()}>
                  <UserPlus className="h-4 w-4" />
                  Agregar cliente
                </Button>
                <Button variant="secondary" onClick={() => navigate("/jira")}>Ir a Jira</Button>
                <Button variant="secondary" onClick={() => void loadClients()} className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Recargar
                </Button>
                <Button variant="secondary" onClick={handleLogout} className="gap-2">
                  <LogOut className="h-4 w-4" />
                  Cerrar sesión
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {errorMessage && (
          <Card className="border-amber-500/40 bg-amber-50 shadow-sm">
            <CardContent className="p-4 text-sm text-amber-900">{errorMessage}</CardContent>
          </Card>
        )}

        <div className="premium-fade-up-delay-1 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {metricCards.map(({ title, value, helper, icon: Icon }) => (
            <Card key={title} className="border border-white/10 bg-white/[0.04] text-white shadow-sm backdrop-blur-xl">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">{title}</p>
                    <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
                    <p className="mt-1 text-sm text-zinc-300">{helper}</p>
                  </div>
                  <div className="rounded-full bg-white/5 p-2.5 text-zinc-300">
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="premium-fade-up-delay-2 grid gap-5 xl:grid-cols-[390px_1fr]">
          <Card className="border border-white/10 bg-white/[0.04] text-white shadow-sm backdrop-blur-xl xl:sticky xl:top-6">
            <CardContent className="p-6 space-y-5">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">Paso 1</p>
                <h2 className="text-lg font-semibold text-white">Agregar cliente</h2>
                <p className="text-sm text-zinc-300">
                  Completá los datos básicos de la persona y guardala para empezar el seguimiento.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="client-name">Nombre</Label>
                  <Input
                    id="client-name"
                    placeholder="Ej: María Pérez"
                    value={form.name}
                    onChange={handleChange("name")}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="client-phone">Teléfono</Label>
                    <Input
                      id="client-phone"
                      placeholder="099 123 456"
                      value={form.phone}
                      onChange={handleChange("phone")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="client-whatsapp">WhatsApp</Label>
                    <Input
                      id="client-whatsapp"
                      placeholder="099 123 456"
                      value={form.whatsapp}
                      onChange={handleChange("whatsapp")}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="client-email">Email</Label>
                  <Input
                    id="client-email"
                    type="email"
                    placeholder="cliente@correo.com"
                    value={form.email}
                    onChange={handleChange("email")}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="client-property-type">Qué busca</Label>
                    <Input
                      id="client-property-type"
                      placeholder="Apartamento, casa, terreno..."
                      value={form.property_type}
                      onChange={handleChange("property_type")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="client-budget">Presupuesto aproximado</Label>
                    <Input
                      id="client-budget"
                      placeholder="USD 200.000"
                      value={form.budget}
                      onChange={handleChange("budget")}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="client-zone">Zona de interés</Label>
                  <Input
                    id="client-zone"
                    placeholder="Punta del Este, Maldonado..."
                    value={form.zone}
                    onChange={handleChange("zone")}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Estado actual</Label>
                  <Select value={form.stage} onValueChange={handleStageChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccioná una etapa" />
                    </SelectTrigger>
                    <SelectContent>
                      {clientStages.map((stage) => (
                        <SelectItem key={stage} value={stage}>
                          {stage}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="client-notes">Notas útiles</Label>
                  <Textarea
                    id="client-notes"
                    placeholder="Ej: busca 2 dormitorios, quiere visitar el fin de semana, prefiere Pocitos"
                    value={form.notes}
                    onChange={handleChange("notes")}
                    className="min-h-24"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-white text-black hover:bg-zinc-200"
                  disabled={saving || !supabaseReady}
                >
                  {saving ? "Guardando..." : "Guardar cliente"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="border border-white/10 bg-white/[0.04] text-white shadow-sm backdrop-blur-xl">
            <CardContent className="p-6 space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-zinc-400" />
                  <div>
                    <h2 className="text-lg font-semibold text-white">Clientes</h2>
                    <p className="text-sm text-zinc-300">
                      Buscá una persona, cambiá su estado o abrí su ficha completa.
                    </p>
                  </div>
                </div>
                <Badge variant="secondary">{filteredClients.length} visibles</Badge>
              </div>

              <div className="grid gap-3 md:grid-cols-[1fr_220px]">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                  <Input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Buscar por nombre, zona, email o teléfono"
                    className="border-white/10 bg-black/30 pl-9 text-white placeholder:text-zinc-500"
                  />
                </div>

                <Select value={stageFilter} onValueChange={setStageFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas las etapas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las etapas</SelectItem>
                    {clientStages.map((stage) => (
                      <SelectItem key={stage} value={stage}>
                        {stage}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {loading ? (
                <div className="flex items-center gap-2 rounded-lg border border-dashed border-white/10 bg-black/20 px-4 py-8 text-sm text-zinc-300">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Cargando clientes...
                </div>
              ) : clients.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/10 bg-black/25 px-6 py-10 text-center">
                  <Users className="mx-auto mb-3 h-8 w-8 text-zinc-400" />
                  <p className="font-medium text-white">No hay clientes cargados todavía.</p>
                  <p className="mt-1 text-sm text-zinc-300">
                    Completá el formulario de la izquierda y hacé clic en <strong>Guardar cliente</strong>.
                  </p>
                </div>
              ) : filteredClients.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/10 bg-black/25 px-6 py-10 text-center">
                  <Search className="mx-auto mb-3 h-8 w-8 text-zinc-400" />
                  <p className="font-medium text-white">No encontramos coincidencias.</p>
                  <p className="mt-1 text-sm text-zinc-300">
                    Probá con otro nombre, otra zona o cambiá el filtro de estado.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredClients.map((client) => (
                    <div
                      key={client.id}
                      className="rounded-2xl border border-white/10 bg-black/30 p-4 shadow-sm transition-colors hover:border-white/20 hover:bg-white/[0.03]"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-2 min-w-0">
                          <div>
                            <p className="font-semibold text-white">{client.name}</p>
                            <p className="text-sm text-zinc-300">
                              {client.email || client.phone || "Sin contacto principal"}
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-2 text-xs text-zinc-300">
                            {client.zone && <span className="rounded-full bg-white/5 px-2.5 py-1">{client.zone}</span>}
                            {client.property_type && (
                              <span className="rounded-full bg-white/5 px-2.5 py-1">{client.property_type}</span>
                            )}
                            {client.budget && <span className="rounded-full bg-white/5 px-2.5 py-1">{client.budget}</span>}
                          </div>
                        </div>

                        <Badge variant="outline" className={`border ${getStageBadgeClass(client.stage)}`}>
                          {client.stage}
                        </Badge>
                      </div>

                      <div className="grid gap-3 pt-3 md:grid-cols-[1fr_auto] md:items-center">
                        <Select value={client.stage} onValueChange={(value) => void updateClientStage(client.id, value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Estado actual" />
                          </SelectTrigger>
                          <SelectContent>
                            {clientStages.map((stage) => (
                              <SelectItem key={stage} value={stage}>
                                {stage}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Button variant="outline" onClick={() => navigate(`/crm/client/${client.id}`)}>
                          Abrir ficha
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
