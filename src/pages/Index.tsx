import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Copy, ExternalLink, HelpCircle, MessageCircle, Search, UserPlus } from "lucide-react";
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
import { formatSmartText } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";


import AppNavigation from "@/components/AppNavigation";
import { agencies as fallbackAgencies } from "@/data/agencies";
import { clearLegacyLinkHistory, getStoredSession, signOut, authApiRequest } from "@/lib/auth";
import {
  appendActivityLog,
  createActivityEntry,
  defaultClientStage,
  type ClientRecord,
} from "@/lib/crm";
import { supabase } from "@/lib/supabaseClient";

const propertyTypes = ["Apartamentos", "Casas", "Terrenos", "Chacras", "Campos", "Locales"] as const;
type PropertyType = (typeof propertyTypes)[number];
type DashboardView = "colega" | "jira";
type AgencyRecord = {
  id: number;
  name: string;
  web?: string | null;
};
type ColegaPrefillState = {
  prefillPropertyId?: string;
  prefillPropertyType?: PropertyType;
  fromPropertyTitle?: string;
};
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
  whatsapp: "",
  propertyType: "Casa" as NewClientPropertyType,
};

const propertyTypeAliases: Record<string, PropertyType> = {
  apartamento: "Apartamentos",
  apartamentos: "Apartamentos",
  casa: "Casas",
  casas: "Casas",
  terreno: "Terrenos",
  terrenos: "Terrenos",
  chacra: "Chacras",
  chacras: "Chacras",
  campo: "Campos",
  campos: "Campos",
  local: "Locales",
  locales: "Locales",
};

const agencyPropertyTypePath: Record<PropertyType, string> = {
  Apartamentos: "Apartamento",
  Casas: "Casa",
  Terrenos: "Terreno",
  Chacras: "Chacra",
  Campos: "Campo",
  Locales: "Local",
};

function normalizeText(value: string) {
  return value
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function normalizeHostname(hostname: string) {
  return hostname.replace(/^www\./i, "").trim().toLowerCase();
}

function normalizeAgencyId(value: number | string | null | undefined) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function normalizeAgencyRecord(agency: AgencyRecord | (Omit<AgencyRecord, "id"> & { id: number | string })) {
  return {
    ...agency,
    id: normalizeAgencyId(agency.id) ?? 0,
  };
}

function parsePropertyType(value: string | undefined) {
  if (!value) {
    return null;
  }

  return propertyTypeAliases[normalizeText(value)] ?? null;
}

function buildColegaUrl(agencyId: number, currentPropertyType: PropertyType, currentPropertyId: string) {
  const pid = Number.parseInt(currentPropertyId, 10);

  if (!Number.isInteger(pid) || pid <= 0) {
    return "";
  }

  const calculatedId = pid * agencyId + 9876;
  return `https://www.inmobiliaria.link/c/inmobiliaria_${agencyId}/${currentPropertyType}/${calculatedId}`;
}

function buildAgencyPropertyUrl(agencyWeb: string | null | undefined, currentPropertyType: PropertyType, currentPropertyId: string) {
  if (!agencyWeb?.trim() || !currentPropertyId.trim()) {
    return "";
  }

  try {
    const normalizedAgencyUrl = new URL(
      agencyWeb.startsWith("http://") || agencyWeb.startsWith("https://") ? agencyWeb : `https://${agencyWeb}`,
    );
    const base = `${normalizedAgencyUrl.protocol}//${normalizedAgencyUrl.host}`.replace(/\/+$/, "");
    return `${base}/${agencyPropertyTypePath[currentPropertyType]}/${currentPropertyId.trim()}`;
  } catch {
    return "";
  }
}

function buildColegaDecodedPathUrl(agencyId: number, currentPropertyType: PropertyType, currentPropertyId: string) {
  return `https://www.inmobiliaria.link/c/inmobiliaria_${agencyId}/${currentPropertyType}/${currentPropertyId}`;
}

function parseLinkInput(link: string, agencies: AgencyRecord[]) {
  const trimmedLink = link.trim();
  if (!trimmedLink) {
    return null;
  }

  let url: URL;
  try {
    url = new URL(trimmedLink);
  } catch {
    return null;
  }

  const hostname = normalizeHostname(url.hostname);
  const pathParts = url.pathname.split("/").filter(Boolean);

  if (hostname === "inmobiliaria.link" || hostname === "inmobiliario.link") {
    const agencySegmentIndex = pathParts.findIndex((segment) => /^inmobiliari[ao][_-](\d+)$/i.test(segment));
    const agencyMatch = agencySegmentIndex >= 0
      ? /^inmobiliari[ao][_-](\d+)$/i.exec(pathParts[agencySegmentIndex] ?? "")
      : null;
    const fallbackAgencyIdFromPath =
      pathParts[0] === "c" && /^\d+$/.test(pathParts[1] ?? "") ? Number.parseInt(pathParts[1] ?? "", 10) : NaN;
    const parsedAgencyId = agencyMatch ? Number.parseInt(agencyMatch[1], 10) : fallbackAgencyIdFromPath;
    const typeSegment = agencySegmentIndex >= 0 ? pathParts[agencySegmentIndex + 1] : undefined;
    const parsedPropertyType = parsePropertyType(typeSegment) ?? "Apartamentos";
    const encodedSegment = [...pathParts].reverse().find((segment) => /^\d+$/.test(segment));
    const encodedId = Number.parseInt(encodedSegment ?? "", 10);

    if (!Number.isInteger(parsedAgencyId) || !Number.isInteger(encodedId)) {
      return null;
    }

    const rawPropertyId = encodedId - 9876;
    const maybeDecodedId = parsedAgencyId > 0 ? rawPropertyId / parsedAgencyId : NaN;
    const decodedPropertyId = Number.isInteger(maybeDecodedId) && maybeDecodedId > 0
      ? String(maybeDecodedId)
      : "";
    const agencyFromId = agencies.find((agency) => normalizeAgencyId(agency.id) === parsedAgencyId);
    const reverseAgencyUrl = buildAgencyPropertyUrl(agencyFromId?.web, parsedPropertyType, decodedPropertyId);
    const decodedColegaUrl = decodedPropertyId
      ? buildColegaDecodedPathUrl(parsedAgencyId, parsedPropertyType, decodedPropertyId)
      : "";

    return {
      agencyId: parsedAgencyId,
      propertyType: parsedPropertyType,
      propertyId: decodedPropertyId,
      generatedUrl: reverseAgencyUrl || decodedColegaUrl,
      isColegaDomain: true,
    };
  }

  const foundAgency = agencies.find((agency) => {
    if (!agency.web) {
      return false;
    }

    try {
      const agencyUrl = new URL(agency.web.startsWith("http") ? agency.web : `https://${agency.web}`);
      return normalizeHostname(agencyUrl.hostname) === hostname;
    } catch {
      return false;
    }
  });

  const parsedPropertyType = pathParts
    .map((segment) => parsePropertyType(segment))
    .find((value): value is PropertyType => Boolean(value));
  const parsedPropertyId = [...pathParts]
    .reverse()
    .find((segment) => /^\d+$/.test(segment));

  return {
    agencyId: foundAgency?.id ?? null,
    propertyType: parsedPropertyType ?? null,
    propertyId: parsedPropertyId ?? "",
    generatedUrl: "",
    isColegaDomain: false,
  };
}

export default function Index() {
  const navigate = useNavigate();
  const location = useLocation();
  const session = getStoredSession();
  const supabaseReady = Boolean(supabase);
  const [selectedAgencyId, setSelectedAgencyId] = useState<number | null>(null);
  const [agencies, setAgencies] = useState<AgencyRecord[]>([]);
  const [loadingAgencies, setLoadingAgencies] = useState(false);
  const [agenciesError, setAgenciesError] = useState<string | null>(null);
  const [originAgencyLabel, setOriginAgencyLabel] = useState("");
  const [originPropertyIdLabel, setOriginPropertyIdLabel] = useState("");
    // Cargar agencias desde el backend
    useEffect(() => {
      setLoadingAgencies(true);
      setAgenciesError(null);
      authApiRequest<{ ok: boolean; companies: AgencyRecord[]; message?: string }>(
        "companies/list",
        {}
      )
        .then((data) => {
          if (!data.ok) throw new Error(data.message || "Error al cargar inmobiliarias");
          setAgencies(
            data.companies?.length
              ? data.companies.map((agency) => normalizeAgencyRecord(agency))
              : fallbackAgencies.map((agency) => normalizeAgencyRecord({ ...agency, web: null })),
          );
        })
        .catch((err) => {
          setAgencies(fallbackAgencies.map((agency) => normalizeAgencyRecord({ ...agency, web: null })));
          setAgenciesError(err instanceof Error ? `${err.message}. Usando listado local.` : "Usando listado local.");
        })
        .finally(() => setLoadingAgencies(false));
    }, []);
  const [propertyType, setPropertyType] = useState<PropertyType>("Apartamentos");
  const [originalLink, setOriginalLink] = useState("");
    // Cuando cambia el link original, buscar y seleccionar la compañía correspondiente
    useEffect(() => {
      if (!originalLink.trim()) {
        setOriginAgencyLabel("");
        setOriginPropertyIdLabel("");
      }

      const parsedLink = parseLinkInput(originalLink, agencies);
      if (!parsedLink) {
        setOriginAgencyLabel("");
        setOriginPropertyIdLabel("");
        return;
      }

      if (!parsedLink.isColegaDomain) {
        setOriginAgencyLabel("");
        setOriginPropertyIdLabel("");
      }

      if (parsedLink.agencyId !== null) {
        setSelectedAgencyId(parsedLink.agencyId);
        const originAgency = agencies.find((agency) => normalizeAgencyId(agency.id) === parsedLink.agencyId);
        if (originAgency && parsedLink.isColegaDomain) {
          setOriginAgencyLabel(`${originAgency.name} (ID ${originAgency.id})`);
        }
      }

      if (parsedLink.propertyType) {
        setPropertyType(parsedLink.propertyType);
      }

      if (parsedLink.propertyId) {
        setPropertyId(parsedLink.propertyId);
        if (parsedLink.isColegaDomain) {
          setOriginPropertyIdLabel(parsedLink.propertyId);
        }
      }

      if (parsedLink.generatedUrl) {
        setGeneratedUrl(parsedLink.generatedUrl);
      } else if (parsedLink.isColegaDomain) {
        setGeneratedUrl("");
      }
    }, [originalLink, agencies]);
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
    setActiveView(location.pathname === "/jira" ? "jira" : "colega");
  }, [location.pathname]);

  useEffect(() => {
    const state = location.state as ColegaPrefillState | null;

    if (!state?.prefillPropertyId) {
      return;
    }

    setPropertyId(state.prefillPropertyId);
    setGeneratedUrl("");

    if (state.prefillPropertyType && propertyTypes.includes(state.prefillPropertyType)) {
      setPropertyType(state.prefillPropertyType);
    }

    toast.success(
      state.fromPropertyTitle
        ? `Propiedad cargada para Link Colega: ${state.fromPropertyTitle}`
        : "Propiedad cargada para Link Colega",
    );

    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, navigate]);

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
    () => agencies.find((agency) => normalizeAgencyId(agency.id) === selectedAgencyId),
    [selectedAgencyId, agencies]
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

    const url = buildColegaUrl(selectedAgencyId, propertyType, propertyId);
    if (!url) {
      toast.error("El ID de propiedad debe ser numérico");
      return;
    }

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

    const selectedClient = clients.find((client) => client.id === clientId);
    const now = new Date().toISOString();
    const nextActivityLog = appendActivityLog(
      selectedClient?.activity_log,
      createActivityEntry(`Link guardado: ${propertyLabel || propertyType}`, "link"),
    );

    const { error: activityError } = await supabase
      .from("clients")
      .update({
        last_contact: now,
        activity_log: nextActivityLog,
      })
      .eq("id", clientId);

    if (activityError) {
      toast.error("El link se guardó, pero no se pudo actualizar el historial del cliente.");
    } else {
      setClients((current) =>
        current.map((client) =>
          client.id === clientId
            ? { ...client, last_contact: now, activity_log: nextActivityLog }
            : client,
        ),
      );
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
    const mode =
      field === "fullName"
        ? "name"
        : field === "email"
          ? "email"
          : field === "details" || field === "zone"
            ? "sentence"
            : "none";

    setLeadForm((current) => ({
      ...current,
      [field]: formatSmartText(event.target.value, mode),
    }));
  };

  const handleNewClientFieldChange = (field: "name" | "whatsapp") => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setNewClientForm((current) => ({
      ...current,
      [field]: field === "name" ? formatSmartText(event.target.value, "name") : event.target.value,
    }));
  };

  const handleCreateClient = async () => {
    if (!newClientForm.name.trim() || !newClientForm.whatsapp.trim()) {
      toast.error("Completá nombre y WhatsApp");
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
        phone: newClientForm.whatsapp.trim(),
        whatsapp: newClientForm.whatsapp.trim(),
        property_type: newClientForm.propertyType,
        stage: defaultClientStage,
        activity_log: appendActivityLog([], createActivityEntry("Cliente creado desde Link Colega", "client")),
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
      toast.error("Completá nombre, WhatsApp y detalle del lead");
      return;
    }

    if (leadForm.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(leadForm.email.trim())) {
      toast.error("Ingresá un email válido para el lead");
      return;
    }

    const jiraLead = [
      `Lead: ${leadForm.fullName}`,
      `WhatsApp: ${leadForm.phone}`,
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
    <div className="min-h-screen w-full overflow-x-hidden bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.08),_transparent_0),#09090b] text-white">
      <AppNavigation
        email={session?.email}
        isAdmin={(session?.role || "").trim().toLowerCase() === "administrador"}
        onLogout={handleLogout}
      />

      <main className="mx-auto max-w-5xl space-y-5 px-3 py-6 pb-24 sm:px-4 md:py-7 md:pb-7">
        <Card className="premium-fade-up overflow-hidden border border-white/10 bg-white/[0.04] text-white shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl">
          <CardContent className="p-6 md:p-7">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div className="space-y-3">
                <div className="inline-flex w-fit rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-zinc-200">
                  CUPERTINO
                </div>
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
                    Generador de Link Colega
                  </h1>
                  <p className="mt-1 text-sm text-zinc-300">
                    Generá links de propiedades para compartir con tus clientes al instante.
                  </p>
                </div>
                <p className="break-all text-xs text-zinc-400">Sesión activa: {session?.email ?? "usuario"}</p>
              </div>

              <div />
            </div>
          </CardContent>
        </Card>

        {activeView === "colega" ? (
          <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
            <Card className="border border-white/10 bg-white/[0.04] text-white shadow-sm backdrop-blur-xl">
              <CardContent className="p-6 space-y-5">
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">Paso 1</p>
                  <h2 className="text-lg font-semibold text-white">Generador de Link Colega</h2>
                  <p className="text-sm text-zinc-300">
                    Pegá un link colega o el enlace original del portal, y completamos la inmobiliaria, el tipo y el ID para generar el link.
                  </p>
                </div>

                <div className="space-y-2">
                                  <div className="space-y-2">
                                    <Label className="text-xs uppercase tracking-wider text-zinc-400">Link original o link colega</Label>
                                    <Input
                                      type="url"
                                      placeholder="https://www.inmobiliaria.link/... o https://portal.com/propiedad/123"
                                      className="h-11 border-white/10 bg-black/30 text-white placeholder:text-zinc-500"
                                      value={originalLink}
                                      onChange={e => setOriginalLink(e.target.value)}
                                    />
                                    {originAgencyLabel && (
                                      <p className="text-xs text-emerald-300">
                                        Inmobiliaria de origen detectada: {originAgencyLabel}
                                      </p>
                                    )}
                                    {originPropertyIdLabel && (
                                      <p className="text-xs text-emerald-300">
                                        ID de propiedad detectado: {originPropertyIdLabel}
                                      </p>
                                    )}
                                  </div>
                  <Label className="text-xs uppercase tracking-wider text-zinc-400">Inmobiliaria colega</Label>
                  <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="min-h-11 w-full justify-start whitespace-normal border-white/10 bg-black/30 text-left font-normal text-white hover:bg-white/5">
                        {selectedAgency
                          ? `${selectedAgency.id} — ${selectedAgency.name}`
                          : "Seleccionar inmobiliaria..."}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[min(92vw,420px)] border-white/10 bg-zinc-950 p-0 text-white sm:w-[var(--radix-popover-trigger-width)]" align="start">
                      <Command className="bg-transparent text-white">
                        <CommandInput placeholder="Buscar por nombre o ID..." />
                        <CommandList>
                          <CommandEmpty>No se encontró.</CommandEmpty>
                          <CommandGroup>
                            {loadingAgencies ? (
                              <div className="px-3 py-6 text-sm text-zinc-300">Cargando inmobiliarias...</div>
                            ) : agenciesError ? (
                              <div className="px-3 py-6 text-sm text-red-400">{agenciesError}</div>
                            ) : (
                              agencies.map((agency) => (
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
                              ))
                            )}
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
                    className="grid grid-cols-1 gap-3 sm:grid-cols-2"
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
                    inputMode="numeric"
                    placeholder="Ej: 25656"
                    className="h-11 border-white/10 bg-black/30 text-white placeholder:text-zinc-500"
                    value={propertyId}
                    onChange={(event) => setPropertyId(event.target.value)}
                  />
                </div>

                <Button className="h-12 w-full bg-white text-black hover:bg-zinc-200" onClick={handleGenerate}>
                  Generar link
                </Button>
              </CardContent>
            </Card>

            <div className="space-y-5">
              <Card className="border border-white/10 bg-white/[0.04] text-white shadow-sm backdrop-blur-xl">
                <CardContent className="space-y-4 p-4 sm:p-6">
                  <div className="space-y-1">
                    <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">Resultado</p>
                    <h2 className="text-lg font-semibold text-white">Link listo para compartir</h2>
                  </div>

                  {generatedUrl ? (
                    <>
                      <div className="rounded-xl border border-white/10 bg-black/30 p-4 break-all font-mono text-sm text-zinc-100">
                        {generatedUrl}
                      </div>

                      <div className="flex flex-col gap-3 sm:flex-row">
                        <Button onClick={() => handleCopy(generatedUrl)} className="flex-1 gap-2 bg-white text-black hover:bg-zinc-200">
                          <Copy className="h-4 w-4" />
                          Copiar link
                        </Button>
                        <Button variant="outline" className="w-full gap-2 border-white/10 bg-transparent text-white hover:bg-white/5 sm:w-auto" asChild>
                          <a href={generatedUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                            Abrir link
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
                                <CommandInput placeholder="Buscar por nombre o WhatsApp..." />
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
                                            value={`${client.name} ${client.whatsapp ?? client.phone ?? ""}`}
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
                                              <span className="text-xs text-zinc-400">{client.whatsapp || client.phone || "Sin WhatsApp"}</span>
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
                            <DialogContent className="fixed inset-0 h-full max-h-full w-full max-w-full translate-x-0 translate-y-0 overflow-y-auto overscroll-y-contain rounded-none border-0 bg-zinc-950 text-white sm:inset-auto sm:left-1/2 sm:top-1/2 sm:h-auto sm:max-h-[90vh] sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl sm:border sm:border-white/10">
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
                                  <Label htmlFor="new-client-whatsapp">WhatsApp *</Label>
                                  <Input
                                    id="new-client-whatsapp"
                                    value={newClientForm.whatsapp}
                                    onChange={handleNewClientFieldChange("whatsapp")}
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
                                    className="grid grid-cols-1 gap-3 sm:grid-cols-2"
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
                        WhatsApp
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
                  Incluye nombre, WhatsApp, email, zona, detalle y el usuario que lo cargó.
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
