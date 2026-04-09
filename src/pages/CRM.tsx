import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, LogOut, RefreshCw, Users } from "lucide-react";
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
import logo from "@/assets/logo.png";
import { getSession, signOut } from "@/lib/auth";
import { clientStages, defaultClientStage, type ClientRecord, type ClientStage } from "@/lib/crm";
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
  const session = getSession();
  const supabaseReady = Boolean(supabase);
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
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

  const handleLogout = () => {
    signOut();
    toast("Sesión cerrada");
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

      <main className="mx-auto max-w-6xl px-4 py-6 md:py-7 space-y-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground tracking-tight">CRM de clientes</h1>
            <p className="text-sm text-muted-foreground">
              Sesión activa: {session?.email ?? "usuario"}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => navigate("/jira")}>
              Ir a Jira
            </Button>
            <Button variant="outline" onClick={() => void loadClients()} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Recargar
            </Button>
            <Button variant="outline" onClick={handleLogout} className="gap-2">
              <LogOut className="h-4 w-4" />
              Cerrar sesión
            </Button>
          </div>
        </div>

        {errorMessage && (
          <Card className="border-amber-500/40 bg-amber-50">
            <CardContent className="p-4 text-sm text-amber-900">
              {errorMessage}
            </CardContent>
          </Card>
        )}

        <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
          <Card>
            <CardContent className="p-6 space-y-5">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold text-foreground">Agregar cliente</h2>
                <p className="text-sm text-muted-foreground">
                  Cargá un lead nuevo y definí su etapa comercial.
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
                    <Label htmlFor="client-property-type">Tipo de propiedad</Label>
                    <Input
                      id="client-property-type"
                      placeholder="Apartamento, casa..."
                      value={form.property_type}
                      onChange={handleChange("property_type")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="client-budget">Presupuesto</Label>
                    <Input
                      id="client-budget"
                      placeholder="USD 200.000"
                      value={form.budget}
                      onChange={handleChange("budget")}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="client-zone">Zona</Label>
                  <Input
                    id="client-zone"
                    placeholder="Punta del Este, Maldonado..."
                    value={form.zone}
                    onChange={handleChange("zone")}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Etapa</Label>
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
                  <Label htmlFor="client-notes">Notas</Label>
                  <Textarea
                    id="client-notes"
                    placeholder="Necesidades, comentarios y seguimiento comercial"
                    value={form.notes}
                    onChange={handleChange("notes")}
                    className="min-h-24"
                  />
                </div>

                <Button type="submit" className="w-full" disabled={saving || !supabaseReady}>
                  {saving ? "Guardando..." : "Guardar cliente"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-lg font-semibold text-foreground">Clientes</h2>
              </div>

              {loading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Cargando clientes...
                </div>
              ) : clients.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay clientes cargados todavía.</p>
              ) : (
                <div className="space-y-3">
                  {clients.map((client) => (
                    <div key={client.id} className="rounded-lg border border-border p-4 space-y-3">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="font-medium text-foreground">{client.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {client.email || client.phone || "Sin contacto principal"}
                          </p>
                        </div>
                        <Badge variant="secondary">{client.stage}</Badge>
                      </div>

                      <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
                        <Select value={client.stage} onValueChange={(value) => void updateClientStage(client.id, value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Etapa" />
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
                          Ver detalle
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
