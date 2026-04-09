import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Copy, ExternalLink, HelpCircle, LogOut, MessageCircle, Search, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { agencies } from "@/data/agencies";
import logo from "@/assets/logo.png";
import { clearLegacyLinkHistory, getStoredSession, signOut } from "@/lib/auth";
import { defaultClientStage, type ClientRecord } from "@/lib/crm";
import { supabase } from "@/lib/supabaseClient";

const propertyTypes = ["Apartamentos", "Casas", "Terrenos", "Chacras", "Campos", "Locales"] as const;
type PropertyType = (typeof propertyTypes)[number];
type DashboardView = "colega" | "jira";
const newClientPropertyTypes = ["Casa", "Apartamento"] as const;
type NewClientPropertyType = (typeof newClientPropertyTypes)[number];

const initialLeadForm = {
  fullName: "",
  phone: "",
  email: "",
  zone: "",
  details: "",
};

const initialNewClientForm = {
  name: "",
  phone: "",
  propertyType: "Casa" as NewClientPropertyType,
};

export default function Index() {
  const navigate = useNavigate();
  const session = getStoredSession();
  const supabaseReady = Boolean(supabase);
  const [selectedAgencyId, setSelectedAgencyId] = useState<number | null>(null);
  const [propertyType, setPropertyType] = useState<PropertyType>("Apartamentos");
  const [propertyId, setPropertyId] = useState("");
  const [generatedUrl, setGeneratedUrl] = useState("");
  const [open, setOpen] = useState(false);
  const [clientPickerOpen, setClientPickerOpen] = useState(false);
  const [activeView, setActiveView] = useState<DashboardView>("colega");
  const [leadForm, setLeadForm] = useState(initialLeadForm);
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [savingLink, setSavingLink] = useState(false);
  const [newClientOpen, setNewClientOpen] = useState(false);
  const [newClientForm, setNewClientForm] = useState(initialNewClientForm);

  useEffect(() => {
    clearLegacyLinkHistory();
  }, []);

  useEffect(() => {
    if (!generatedUrl || !supabase) {
      return;
    }

    let active = true;

    const loadClients = async () => {
      setLoadingClients(true);
      const { data, error } = await supabase.from("clients").select("*").order("created_at", { ascending: false });

      if (!active) {
        return;
      }

      if (error) {
        toast.error("No se pudieron cargar los clientes");
        setLoadingClients(false);
        return;
      }

      setClients((data ?? []) as ClientRecord[]);
      setLoadingClients(false);
    };

    void loadClients();

    return () => {
      active = false;
    };
  }, [generatedUrl]);

  const selectedAgency = useMemo(
    () => agencies.find((agency) => agency.id === selectedAgencyId),
    [selectedAgencyId]
  );

  const whatsappShareUrl = useMemo(() => {
    if (!generatedUrl) {
      return "";
    }

    const message = encodeURIComponent(`Hola! Te comparto esta propiedad que puede interesarte: ${generatedUrl}`);
    return `https://wa.me/?text=${message}`;
  }, [generatedUrl]);

  const handleGenerate = () => {
    if (!selectedAgencyId || !propertyId) {
      toast.error("Completá todos los campos");
      return;
    }

    const pid = parseInt(propertyId, 10);
    if (isNaN(pid)) {
      toast.error("El ID de propiedad debe ser numérico");
      return;
    }

    const calculatedId = pid * selectedAgencyId + 9876;
    const url = `https://www.inmobiliaria.link/c/inmobiliaria_${selectedAgencyId}/${propertyType}/${calculatedId}`;
    setGeneratedUrl(url);
    setClientPickerOpen(false);
    setNewClientOpen(false);
    setNewClientForm(initialNewClientForm);
  };

  const handleCopy = async (url: string) => {
    await navigator.clipboard.writeText(url);
    toast.success("¡Link copiado!");
  };

  const saveLinkForClient = async ({
    clientId,
    clientName,
    propertyLabel,
  }: {
    clientId: string;
    clientName: string;
    propertyLabel?: string | null;
  }) => {
    if (!generatedUrl) {
      toast.error("Primero generá un link");
      return;
    }

    if (!supabase) {
      toast.error("Configurá Supabase para guardar el link en el CRM");
      return;
    }

    setSavingLink(true);
    const { error } = await supabase.from("property_links").insert({
      client_id: clientId,
      generated_url: generatedUrl,
      property_type: propertyLabel || propertyType,
      colleague_agency: selectedAgency?.name ?? null,
    });
    setSavingLink(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    setClientPickerOpen(false);
    toast.success(`✅ Link guardado para ${clientName}`);
  };

  const handleLogout = async () => {
    const result = await signOut();
    setSelectedAgencyId(null);
    setPropertyType("Apartamentos");
    setPropertyId("");
    setGeneratedUrl("");
    setOpen(false);
    setClientPickerOpen(false);
    setNewClientOpen(false);
    setNewClientForm(initialNewClientForm);

    if (!result.ok) {
      toast.error(result.message);
    } else {
      toast("Sesión cerrada");
    }

    navigate("/login", { replace: true });
  };

  const handleLeadChange = (field: keyof typeof initialLeadForm) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setLeadForm((current) => ({
      ...current,
      [field]: event.target.value,
    }));
  };

  const handleNewClientFieldChange = (field: "name" | "phone") => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setNewClientForm((current) => ({
      ...current,
      [field]: event.target.value,
    }));
  };

  const handleCreateClient = async () => {
    if (!newClientForm.name.trim() || !newClientForm.phone.trim()) {
      toast.error("Completá nombre y teléfono");
      return;
    }

    if (!supabase) {
      toast.error("Configurá Supabase para crear clientes");
      return;
    }

    setSavingLink(true);
    const { data, error } = await supabase
      .from("clients")
      .insert({
        name: newClientForm.name.trim(),
        phone: newClientForm.phone.trim(),
        whatsapp: newClientForm.phone.trim(),
        property_type: newClientForm.propertyType,
        stage: defaultClientStage,
      })
      .select()
      .single();

    if (error || !data?.id) {
      setSavingLink(false);
      toast.error(error?.message || "No se pudo crear el cliente");
      return;
    }

    const createdClient = data as ClientRecord;
    setClients((current) => [createdClient, ...current]);
    setNewClientOpen(false);
    setNewClientForm(initialNewClientForm);

    await saveLinkForClient({
      clientId: createdClient.id,
      clientName: createdClient.name,
      propertyLabel: newClientForm.propertyType,
    });
  };

  const handleLeadSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!leadForm.fullName || !leadForm.phone || !leadForm.details) {
      toast.error("Completá nombre, teléfono y detalle del lead");
      return;
    }

    if (leadForm.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(leadForm.email.trim())) {
      toast.error("Ingresá un email válido para el lead");
      return;
    }

    const jiraLead = [
      `Lead: ${leadForm.fullName}`,
      `Teléfono: ${leadForm.phone}`,
      `Email: ${leadForm.email || "No informado"}`,
      `Zona / propiedad: ${leadForm.zone || "No informada"}`,
      `Detalle: ${leadForm.details}`,
      `Cargado por: ${session?.email ?? "usuario"}`,
    ].join("\n");

    await navigator.clipboard.writeText(jiraLead);
    toast.success("Lead preparado y copiado para Jira");
    setLeadForm(initialLeadForm);
  };

  const openExternalJira = () => {
    window.open("https://cupertino.uy/jira", "_blank", "noopener,noreferrer");
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.08),_transparent_0),#09090b] text-white">
      <header className="border-b border-white/10 bg-black/75 py-5 md:py-6 shadow-[0_12px_40px_rgba(0,0,0,0.35)] backdrop-blur-2xl">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-2 px-4 text-center">
          <img
            src={logo}
            alt="Cupertino Negocios Inmobiliarios"
            className="h-20 md:h-24 w-auto max-w-full object-contain drop-shadow-[0_10px_30px_rgba(255,255,255,0.05)]"
          />
          <p className="text-[10px] uppercase tracking-[0.34em] text-zinc-500">Negocios Inmobiliarios</p>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 md:py-7 space-y-5">
        <Card className="premium-fade-up overflow-hidden border border-white/10 bg-white/[0.04] text-white shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl">
          <CardContent className="p-6 md:p-7">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div className="space-y-3">
                <div className="inline-flex w-fit rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-zinc-200">
                  Cupertino Tools
                </div>
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
                    Panel Jira y Link de Colega
                  </h1>
                  <p className="mt-1 text-sm text-zinc-300">
                    Un espacio simple para generar links, cargar leads y seguir el trabajo comercial.
                  </p>
                </div>
                <p className="text-xs text-zinc-400">Sesión activa: {session?.email ?? "usuario"}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" size="sm" onClick={handleLogout} className="gap-2">
                  <LogOut className="h-4 w-4" />
                  Cerrar sesión
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="premium-fade-up-delay-1 grid gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-2 shadow-sm backdrop-blur-xl sm:grid-cols-2 lg:grid-cols-4">
          <Button
            className={activeView === "colega" ? "bg-white text-black hover:bg-zinc-200" : "border-white/10 bg-transparent text-white hover:bg-white/5"}
            variant={activeView === "colega" ? "default" : "outline"}
            onClick={() => setActiveView("colega")}
          >
            Link de colega
          </Button>
          <Button
            className={activeView === "jira" ? "bg-white text-black hover:bg-zinc-200" : "border-white/10 bg-transparent text-white hover:bg-white/5"}
            variant={activeView === "jira" ? "default" : "outline"}
            onClick={() => setActiveView("jira")}
          >
            Formulario Jira
          </Button>
          <Button variant="outline" className="border-white/10 bg-transparent text-white hover:bg-white/5" onClick={openExternalJira}>
            Abrir Jira real
          </Button>
          <Button variant="outline" className="border-white/10 bg-transparent text-white hover:bg-white/5" onClick={() => navigate("/crm")}>
            CRM
          </Button>
        </div>

        {activeView === "colega" ? (
          <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
            <Card className="border border-white/10 bg-white/[0.04] text-white shadow-sm backdrop-blur-xl">
              <CardContent className="p-6 space-y-5">
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">Paso 1</p>
                  <h2 className="text-lg font-semibold text-white">Generador de Link Colega</h2>
                  <p className="text-sm text-zinc-300">
                    Elegí la inmobiliaria, el tipo de propiedad y el ID para obtener el link al instante.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-zinc-400">Inmobiliaria colega</Label>
                  <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start border-white/10 bg-black/30 font-normal text-white hover:bg-white/5">
                        {selectedAgency
                          ? `${selectedAgency.id} — ${selectedAgency.name}`
                          : "Seleccionar inmobiliaria..."}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[var(--radix-popover-trigger-width)] border-white/10 bg-zinc-950 p-0 text-white" align="start">
                      <Command className="bg-transparent text-white">
                        <CommandInput placeholder="Buscar por nombre o ID..." />
                        <CommandList>
                          <CommandEmpty>No se encontró.</CommandEmpty>
                          <CommandGroup>
                            {agencies.map((agency) => (
                              <CommandItem
                                key={agency.id}
                                value={`${agency.id} ${agency.name}`}
                                onSelect={() => {
                                  setSelectedAgencyId(agency.id);
                                  setOpen(false);
                                }}
                              >
                                <span className="mr-2 font-mono text-xs text-zinc-400">{agency.id}</span>
                                {agency.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-zinc-400">Tipo de propiedad</Label>
                  <RadioGroup
                    value={propertyType}
                    onValueChange={(value) => setPropertyType(value as PropertyType)}
                    className="grid grid-cols-2 gap-3"
                  >
                    {propertyTypes.map((type) => {
                      const id = type.toLowerCase();

                      return (
                        <div key={type} className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/25 px-3 py-2.5">
                          <RadioGroupItem value={type} id={id} />
                          <Label htmlFor={id} className="cursor-pointer text-zinc-100">{type}</Label>
                        </div>
                      );
                    })}
                  </RadioGroup>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-zinc-400">ID de la propiedad</Label>
                  <Input
                    type="number"
                    placeholder="Ej: 25656"
                    className="border-white/10 bg-black/30 text-white placeholder:text-zinc-500"
                    value={propertyId}
                    onChange={(event) => setPropertyId(event.target.value)}
                  />
                </div>

                <Button className="w-full bg-white text-black hover:bg-zinc-200" onClick={handleGenerate}>
                  Generar link
                </Button>
              </CardContent>
            </Card>

            <div className="space-y-5">
              <Card className="border border-white/10 bg-white/[0.04] text-white shadow-sm backdrop-blur-xl">
                <CardContent className="p-6 space-y-4">
                  <div className="space-y-1">
                    <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">Resultado</p>
                    <h2 className="text-lg font-semibold text-white">Link listo para compartir</h2>
                  </div>

                  {generatedUrl ? (
                    <>
                      <div className="rounded-xl border border-white/10 bg-black/30 p-4 break-all font-mono text-sm text-zinc-100">
                        {generatedUrl}
                      </div>

                      <div className="flex gap-3">
                        <Button onClick={() => handleCopy(generatedUrl)} className="flex-1 gap-2 bg-white text-black hover:bg-zinc-200">
                          <Copy className="h-4 w-4" />
                          Copiar link
                        </Button>
                        <Button variant="outline" className="border-white/10 bg-transparent text-white hover:bg-white/5" asChild>
                          <a href={generatedUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      </div>

                      <Button
                        className="h-12 w-full gap-2 bg-emerald-500 text-base font-semibold text-white hover:bg-emerald-600"
                        onClick={() => window.open(whatsappShareUrl, "_blank", "noopener,noreferrer")}
                      >
                        <MessageCircle className="h-5 w-5" />
                        Compartir por WhatsApp
                      </Button>

                      <div className="space-y-3 rounded-xl border border-white/10 bg-black/20 p-4">
                        <div>
                          <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">Guardar en CRM</p>
                          <p className="mt-1 text-sm text-zinc-300">
                            Asociá este link a un cliente existente o creá uno nuevo en segundos.
                          </p>
                        </div>

                        <div className="grid gap-2 sm:grid-cols-2">
                          <Popover open={clientPickerOpen} onOpenChange={setClientPickerOpen}>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className="h-11 justify-start border-white/10 bg-transparent text-white hover:bg-white/5"
                                disabled={!supabaseReady || savingLink}
                              >
                                <Search className="mr-2 h-4 w-4" />
                                Buscar cliente existente
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[min(92vw,360px)] border-white/10 bg-zinc-950 p-0 text-white" align="start">
                              <Command className="bg-transparent text-white">
                                <CommandInput placeholder="Buscar por nombre o teléfono..." />
                                <CommandList>
                                  {loadingClients ? (
                                    <div className="px-3 py-6 text-sm text-zinc-300">Cargando clientes...</div>
                                  ) : (
                                    <>
                                      <CommandEmpty>No encontramos clientes.</CommandEmpty>
                                      <CommandGroup>
                                        {clients.map((client) => (
                                          <CommandItem
                                            key={client.id}
                                            value={`${client.name} ${client.phone ?? ""}`}
                                            onSelect={() =>
                                              void saveLinkForClient({
                                                clientId: client.id,
                                                clientName: client.name,
                                                propertyLabel: client.property_type,
                                              })
                                            }
                                          >
                                            <div className="flex flex-col">
                                              <span>{client.name}</span>
                                              <span className="text-xs text-zinc-400">{client.phone || "Sin teléfono"}</span>
                                            </div>
                                          </CommandItem>
                                        ))}
                                      </CommandGroup>
                                    </>
                                  )}
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>

                          <Dialog open={newClientOpen} onOpenChange={setNewClientOpen}>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                className="h-11 border-white/10 bg-transparent text-white hover:bg-white/5"
                                disabled={savingLink}
                              >
                                <UserPlus className="mr-2 h-4 w-4" />
                                Nuevo cliente
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="border border-white/10 bg-zinc-950 text-white sm:max-w-md">
                              <DialogHeader>
                                <DialogTitle>Nuevo cliente</DialogTitle>
                                <DialogDescription className="text-zinc-300">
                                  Guardá lo esencial y asociamos este link automáticamente.
                                </DialogDescription>
                              </DialogHeader>

                              <div className="space-y-4">
                                <div className="space-y-2">
                                  <Label htmlFor="new-client-name">Nombre *</Label>
                                  <Input
                                    id="new-client-name"
                                    value={newClientForm.name}
                                    onChange={handleNewClientFieldChange("name")}
                                    placeholder="Ej: María Pérez"
                                    className="border-white/10 bg-black/30 text-white placeholder:text-zinc-500"
                                  />
                                </div>

                                <div className="space-y-2">
                                  <Label htmlFor="new-client-phone">Teléfono *</Label>
                                  <Input
                                    id="new-client-phone"
                                    value={newClientForm.phone}
                                    onChange={handleNewClientFieldChange("phone")}
                                    placeholder="099 123 456"
                                    className="border-white/10 bg-black/30 text-white placeholder:text-zinc-500"
                                  />
                                </div>

                                <div className="space-y-2">
                                  <Label>Qué busca</Label>
                                  <RadioGroup
                                    value={newClientForm.propertyType}
                                    onValueChange={(value) =>
                                      setNewClientForm((current) => ({
                                        ...current,
                                        propertyType: value as typeof current.propertyType,
                                      }))
                                    }
                                    className="grid grid-cols-2 gap-3"
                                  >
                                    {newClientPropertyTypes.map((type) => (
                                      <div key={type} className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/25 px-3 py-2.5">
                                        <RadioGroupItem value={type} id={`new-client-${type}`} />
                                        <Label htmlFor={`new-client-${type}`} className="cursor-pointer text-zinc-100">
                                          {type === "Casa" ? "🏠 Casa" : "🏢 Apartamento"}
                                        </Label>
                                      </div>
                                    ))}
                                  </RadioGroup>
                                </div>

                                <Button
                                  onClick={() => void handleCreateClient()}
                                  className="w-full bg-white text-black hover:bg-zinc-200"
                                  disabled={savingLink || !supabaseReady}
                                >
                                  {savingLink ? "Guardando..." : "Guardar"}
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>

                        {!supabaseReady && (
                          <p className="text-xs text-amber-300">
                            Configurá Supabase para guardar este link dentro del CRM.
                          </p>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="rounded-xl border border-dashed border-white/10 bg-black/25 px-5 py-8 text-center">
                      <p className="font-medium text-white">Todavía no generaste un link.</p>
                      <p className="mt-1 text-sm text-zinc-300">
                        Completá los datos de la izquierda y el resultado aparecerá acá.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border border-white/10 bg-white/[0.04] text-white shadow-sm backdrop-blur-xl">
                <CardContent className="p-5 flex gap-3 items-start">
                  <HelpCircle className="mt-0.5 h-5 w-5 shrink-0 text-zinc-400" />
                  <div>
                    <p className="text-sm font-medium text-white">¿Cómo obtener el ID de la propiedad?</p>
                    <p className="mt-1 text-sm text-zinc-300">
                      Buscá la propiedad en la web de la inmobiliaria colega y copiá el número que aparece al final de la URL.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
            <Card className="border border-white/10 bg-white/[0.04] text-white shadow-sm backdrop-blur-xl">
              <CardContent className="p-6 space-y-5">
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">Paso 2</p>
                  <h2 className="text-lg font-semibold text-white">Formulario para Jira</h2>
                  <p className="text-sm text-zinc-300">
                    Cargá el lead y lo dejamos listo para copiar o derivar sin fricción.
                  </p>
                </div>

                <form onSubmit={handleLeadSubmit} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="lead-name" className="text-xs uppercase tracking-wider text-zinc-400">
                        Nombre y apellido
                      </Label>
                      <Input
                        id="lead-name"
                        placeholder="Ej: María Pérez"
                        className="border-white/10 bg-black/30 text-white placeholder:text-zinc-500"
                        value={leadForm.fullName}
                        onChange={handleLeadChange("fullName")}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="lead-phone" className="text-xs uppercase tracking-wider text-zinc-400">
                        Teléfono
                      </Label>
                      <Input
                        id="lead-phone"
                        placeholder="Ej: 099 123 456"
                        className="border-white/10 bg-black/30 text-white placeholder:text-zinc-500"
                        value={leadForm.phone}
                        onChange={handleLeadChange("phone")}
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="lead-email" className="text-xs uppercase tracking-wider text-zinc-400">
                        Email
                      </Label>
                      <Input
                        id="lead-email"
                        type="email"
                        placeholder="nombre@correo.com"
                        className="border-white/10 bg-black/30 text-white placeholder:text-zinc-500"
                        value={leadForm.email}
                        onChange={handleLeadChange("email")}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="lead-zone" className="text-xs uppercase tracking-wider text-zinc-400">
                        Zona / propiedad
                      </Label>
                      <Input
                        id="lead-zone"
                        placeholder="Ej: Punta del Este, apto 2 dorm."
                        className="border-white/10 bg-black/30 text-white placeholder:text-zinc-500"
                        value={leadForm.zone}
                        onChange={handleLeadChange("zone")}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lead-details" className="text-xs uppercase tracking-wider text-zinc-400">
                      Detalle del lead
                    </Label>
                    <Textarea
                      id="lead-details"
                      placeholder="Describí la consulta, necesidad y cualquier dato útil para cargar en Jira."
                      value={leadForm.details}
                      onChange={handleLeadChange("details")}
                      className="min-h-28 border-white/10 bg-black/30 text-white placeholder:text-zinc-500"
                    />
                  </div>

                  <Button type="submit" className="w-full bg-white text-black hover:bg-zinc-200">
                    Ingresar lead
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="border border-white/10 bg-white/[0.04] text-white shadow-sm backdrop-blur-xl">
              <CardContent className="p-6 space-y-4">
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">Ayuda rápida</p>
                  <h2 className="text-lg font-semibold text-white">Qué pasa al guardar</h2>
                  <p className="text-sm text-zinc-300">
                    El lead se copia al portapapeles con el formato listo para pegar en Jira o compartir con el equipo.
                  </p>
                </div>

                <div className="rounded-xl border border-white/10 bg-black/25 p-4 text-sm text-zinc-300">
                  Incluye nombre, teléfono, email, zona, detalle y el usuario que lo cargó.
                </div>

                <Button variant="outline" className="w-full border-white/10 bg-transparent text-white hover:bg-white/5" onClick={openExternalJira}>
                  Abrir Jira en una nueva pestaña
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
