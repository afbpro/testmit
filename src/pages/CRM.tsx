import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Building2,
  Check,
  ChevronsUpDown,
  CircleDollarSign,
  Loader2,
  Mail,
  MapPin,
  MessageCircle,
  Pencil,
  Plus,
  Search,
  UserPlus,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
  appendActivityLog,
  clientStages,
  createActivityEntry,
  defaultClientStage,
  getDaysSinceLastContact,
  getLeadTemperature,
  getStageBadgeClass,
  type ClientRecord,
  type ClientStage,
} from "@/lib/crm";
import { supabase } from "@/lib/supabaseClient";
import AppNavigation from "@/components/AppNavigation";

const propertyTypeOptions = [
  "Apartamento",
  "Casa",
  "Local comercial",
  "Terreno",
  "Campo",
  "Otro",
] as const;

const operationTypeOptions = [
  "Compra",
  "Venta",
  "Alquiler temporal",
  "Alquiler anual",
  "Alquiler invernal",
] as const;

type OperationType = (typeof operationTypeOptions)[number];
type BudgetOperationType = Exclude<OperationType, "Alquiler temporal">;

const departmentOptions = ["Maldonado", "Rocha", "Piriápolis (Maldonado)"] as const;

type DepartmentOption = (typeof departmentOptions)[number];

const purchaseBudgetOptions = [
  "Hasta 100K",
  "100K - 150K",
  "150K - 200K",
  "200K - 250K",
  "250K - 300K",
  "300K - 400K",
  "400K - 500K",
  "500K - 750K",
  "750K - 1M",
  "1M - 2M",
  "2M - 5M",
  "+5M",
] as const;

const annualBudgetOptions = [
  "Hasta 500",
  "500-1K",
  "1K-1.5K",
  "1.5K-2K",
  "2K-2.5K",
  "2.5K-3K",
  "3K-3.5K",
  "3.5K-4K",
  "4K-4.5K",
  "4.5K-5K",
  "5K-6K",
  "6K-7K",
  "+7K",
] as const;

const winterBudgetOptions = [
  "Hasta 500",
  "500-1K",
  "1K-1.5K",
  "1.5K-2K",
  "2K-2.5K",
  "2.5K-3K",
  "3K-3.5K",
  "3.5K-4K",
  "4K-5K",
  "+5K",
] as const;

const temporaryPeriodOptions = [
  "Reveión",
  "Enero",
  "1a. Quincena Enero",
  "2a. Quincena Enero",
  "Febrero",
  "1a. Quincena Febrero",
  "2a. Quincena Febrero",
  "Carnaval",
  "Semana Santa",
  "Marzo",
  "1a. Quincena Marzo",
  "2a. Quincena Marzo",
  "Diciembre",
  "1a. Quincena Diciembre",
  "2a. Quincena Diciembre",
] as const;

const budgetOptionsByOperation: Record<BudgetOperationType, readonly string[]> = {
  Compra: purchaseBudgetOptions,
  Venta: purchaseBudgetOptions,
  "Alquiler anual": annualBudgetOptions,
  "Alquiler invernal": winterBudgetOptions,
};

const zoneOptionsByDepartment: Record<DepartmentOption, readonly string[]> = {
  Maldonado: [
    "Punta del Este",
    "Maldonado ciudad",
    "San Carlos",
    "Piriápolis",
    "Pan de Azúcar",
    "Solís",
    "Gregorio Aznárez",
    "Balneario Buenos Aires",
    "El Tesoro",
    "El Chorro",
    "La Barra",
    "Manantiales",
    "José Ignacio",
    "Laguna del Sauce",
    "Punta Ballena",
    "Portezuelo",
    "Cantegril",
    "Pinares",
    "Beverly Hills",
    "Roosevelt",
    "Rincón del Indio",
    "Lugano",
    "El Paraíso",
    "Chihuahua",
    "Sauce de Portezuelo",
    "Cerro Pelado",
    "Aiguá",
  ],
  "Piriápolis (Maldonado)": [
    "Piriápolis centro",
    "Punta Colorada",
    "Punta Negra",
    "Solís",
    "Punta Fría",
    "La Paloma (Maldonado)",
    "San Francisco",
    "Kiyú",
    "Bella Vista",
  ],
  Rocha: [
    "La Paloma",
    "La Pedrera",
    "Punta del Diablo",
    "Aguas Dulces",
    "Cabo Polonio",
    "Valizas",
    "Rocha ciudad",
    "Lascano",
    "Chuy",
    "La Coronilla",
    "Castillos",
    "18 de Julio",
    "Velázquez",
  ],
};

const fieldClassName = "h-11 border-white/10 bg-black/30 text-white placeholder:text-zinc-500";
const inputWithIconClassName = `${fieldClassName} pl-10`;
const selectTriggerClassName = "h-11 border-white/10 bg-black/30 text-white";
const selectWithIconClassName = `${selectTriggerClassName} pl-10`;
const selectContentClassName = "border-white/10 bg-zinc-950 text-white";
const helperTextClassName = "text-[11px] text-zinc-500";

function isBudgetOperation(operationType: string): operationType is BudgetOperationType {
  return ["Compra", "Venta", "Alquiler anual", "Alquiler invernal"].includes(operationType);
}

function getBudgetFieldLabel(operationType: OperationType | "") {
  return operationType === "Venta" ? "Precio de venta (USD)" : "Presupuesto (USD)";
}

function getBudgetFieldPlaceholder(operationType: OperationType | "") {
  return operationType === "Venta" ? "Seleccioná o escribí el precio" : "Seleccioná o escribí un monto";
}

function inferDepartmentFromZone(zone: string | null | undefined): DepartmentOption | "" {
  if (!zone) {
    return "";
  }

  const match = departmentOptions.find((department) => zoneOptionsByDepartment[department].includes(zone));
  return match ?? "";
}

function BudgetCombobox({
  id,
  value,
  onChange,
  options,
  placeholder,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);

  const normalizedQuery = query.trim().toLowerCase();
  const filteredOptions = normalizedQuery
    ? options.filter((option) => option.toLowerCase().includes(normalizedQuery))
    : options;
  const showCustomValue = query.trim() && !options.some((option) => option.toLowerCase() === normalizedQuery);

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) {
          setQuery(value);
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          id={id}
          className={`${selectWithIconClassName} w-full justify-between font-normal hover:bg-black/40`}
        >
          <span className={`truncate ${value ? "text-white" : "text-zinc-500"}`}>{value || placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-zinc-400" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] border-white/10 bg-zinc-950 p-0 text-white">
        <div className="border-b border-white/10 p-2">
          <Input
            value={query}
            onChange={(event) => {
              const nextValue = event.target.value;
              setQuery(nextValue);
              onChange(nextValue);
            }}
            placeholder={placeholder}
            className={fieldClassName}
          />
        </div>

        <div className="max-h-60 overflow-y-auto p-1">
          {showCustomValue && (
            <button
              type="button"
              className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-zinc-200 transition hover:bg-white/5"
              onClick={() => {
                const customValue = query.trim();
                onChange(customValue);
                setQuery(customValue);
                setOpen(false);
              }}
            >
              <span>Usar “{query.trim()}”</span>
              <Pencil className="h-4 w-4 text-zinc-500" />
            </button>
          )}

          {filteredOptions.length === 0 && !showCustomValue ? (
            <p className="px-3 py-2 text-sm text-zinc-400">No hay opciones disponibles.</p>
          ) : (
            filteredOptions.map((option) => (
              <button
                key={option}
                type="button"
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-zinc-200 transition hover:bg-white/5"
                onClick={() => {
                  onChange(option);
                  setQuery(option);
                  setOpen(false);
                }}
              >
                <span>{option}</span>
                <Check className={`h-4 w-4 ${value === option ? "text-emerald-400" : "text-transparent"}`} />
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

const initialClientForm = {
  name: "",
  whatsapp: "",
  email: "",
  operation_type: "" as OperationType | "",
  property_type: "",
  department: "" as DepartmentOption | "",
  zone: "",
  zone_specific: "",
  budget: "",
  period: "",
  budget_notes: "",
  notes: "",
  stage: defaultClientStage as ClientStage,
};

const buildClientPayload = (values: typeof initialClientForm) => {
  const contactNumber = values.whatsapp.trim();

  return {
    name: values.name.trim(),
    phone: contactNumber || null,
    whatsapp: contactNumber || null,
    email: values.email.trim() || null,
    operation_type: values.operation_type || null,
    property_type: values.property_type.trim() || null,
    department: values.department || null,
    zone: values.zone.trim() || null,
    zone_specific: values.zone_specific.trim() || null,
    budget: isBudgetOperation(values.operation_type) ? values.budget.trim() || null : null,
    period: values.operation_type === "Alquiler temporal" ? values.period.trim() || null : null,
    budget_notes: values.budget_notes.trim() || null,
    notes: values.notes.trim() || null,
    stage: values.stage,
  };
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
  const [isAddClientOpen, setIsAddClientOpen] = useState(false);
  const [showMobileStats, setShowMobileStats] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientRecord | null>(null);
  const [editForm, setEditForm] = useState(initialClientForm);
  const [savingEdit, setSavingEdit] = useState(false);

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
        [
          client.name,
          client.email,
          client.whatsapp,
          client.phone,
          client.department,
          client.zone,
          client.zone_specific,
          client.property_type,
          client.operation_type,
          client.period,
        ]
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

  const handleSelectFieldChange = (field: "property_type" | "budget" | "zone") => (value: string) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleDepartmentChange = (value: string) => {
    setForm((current) => ({
      ...current,
      department: value as DepartmentOption,
      zone: "",
    }));
  };

  const handleOperationChange = (value: string) => {
    setForm((current) => ({
      ...current,
      operation_type: value as OperationType,
      budget: value === "Alquiler temporal" ? "" : current.budget,
      period: value === "Alquiler temporal" ? current.period : "",
    }));
  };

  const handlePeriodChange = (value: string) => {
    setForm((current) => ({
      ...current,
      period: value,
    }));
  };

  const resetEditState = () => {
    setEditingClient(null);
    setEditForm(initialClientForm);
  };

  const openEditDialog = (client: ClientRecord) => {
    setEditingClient(client);
    setEditForm({
      name: client.name || "",
      whatsapp: client.whatsapp || client.phone || "",
      email: client.email || "",
      operation_type: operationTypeOptions.includes(client.operation_type as OperationType)
        ? (client.operation_type as OperationType)
        : "",
      property_type: client.property_type || "",
      department: departmentOptions.includes(client.department as DepartmentOption)
        ? (client.department as DepartmentOption)
        : inferDepartmentFromZone(client.zone),
      zone: client.zone || "",
      zone_specific: client.zone_specific || "",
      budget: client.budget || "",
      period: client.period || "",
      budget_notes: client.budget_notes || "",
      notes: client.notes || "",
      stage: clientStages.includes(client.stage as ClientStage)
        ? (client.stage as ClientStage)
        : defaultClientStage,
    });
  };

  const handleEditChange = (field: keyof typeof initialClientForm) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setEditForm((current) => ({
      ...current,
      [field]: event.target.value,
    }));
  };

  const handleEditStageChange = (value: string) => {
    setEditForm((current) => ({
      ...current,
      stage: value as ClientStage,
    }));
  };

  const handleEditSelectFieldChange = (field: "property_type" | "budget" | "zone") => (value: string) => {
    setEditForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleEditDepartmentChange = (value: string) => {
    setEditForm((current) => ({
      ...current,
      department: value as DepartmentOption,
      zone: "",
    }));
  };

  const handleEditOperationChange = (value: string) => {
    setEditForm((current) => ({
      ...current,
      operation_type: value as OperationType,
      budget: value === "Alquiler temporal" ? "" : current.budget,
      period: value === "Alquiler temporal" ? current.period : "",
    }));
  };

  const handleEditPeriodChange = (value: string) => {
    setEditForm((current) => ({
      ...current,
      period: value,
    }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.name.trim()) {
      toast.error("El nombre del cliente es obligatorio");
      return;
    }

    if (!form.operation_type) {
      toast.error("Seleccioná el tipo de operación");
      return;
    }

    if (isBudgetOperation(form.operation_type) && !form.budget.trim()) {
      toast.error("Completá el presupuesto en USD");
      return;
    }

    if (form.operation_type === "Alquiler temporal" && !form.period.trim()) {
      toast.error("Seleccioná el período");
      return;
    }

    if (!supabase) {
      toast.error("Configurá Supabase para guardar clientes");
      return;
    }

    setSaving(true);
    const payload = {
      ...buildClientPayload(form),
      activity_log: appendActivityLog([], createActivityEntry("Cliente creado", "client")),
    };

    const { data, error } = await supabase.from("clients").insert(payload).select().single();
    setSaving(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Cliente agregado");
    setForm(initialClientForm);
    setIsAddClientOpen(false);
    await loadClients();

    if (data?.id) {
      navigate(`/crm/client/${data.id}`);
    }
  };

  const handleSaveEdit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!editingClient) {
      return;
    }

    if (!editForm.name.trim()) {
      toast.error("El nombre del cliente es obligatorio");
      return;
    }

    if (!editForm.operation_type) {
      toast.error("Seleccioná el tipo de operación");
      return;
    }

    if (isBudgetOperation(editForm.operation_type) && !editForm.budget.trim()) {
      toast.error("Completá el presupuesto en USD");
      return;
    }

    if (editForm.operation_type === "Alquiler temporal" && !editForm.period.trim()) {
      toast.error("Seleccioná el período");
      return;
    }

    if (!supabase) {
      toast.error("Configurá Supabase para guardar cambios");
      return;
    }

    setSavingEdit(true);
    const nextActivityLog =
      editForm.stage !== editingClient.stage
        ? appendActivityLog(
            editingClient.activity_log,
            createActivityEntry(`Etapa cambiada a ${editForm.stage}`, "stage"),
          )
        : editingClient.activity_log;

    const payload = {
      ...buildClientPayload(editForm),
      activity_log: nextActivityLog,
    };
    const { data, error } = await supabase
      .from("clients")
      .update(payload)
      .eq("id", editingClient.id)
      .select()
      .single();
    setSavingEdit(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    setClients((current) => current.map((client) => (client.id === editingClient.id ? ((data as ClientRecord) ?? client) : client)));
    toast.success("Cliente actualizado");
    resetEditState();
  };

  const updateClientStage = async (clientId: string, stage: string) => {
    const currentClient = clients.find((client) => client.id === clientId);

    if (!currentClient || currentClient.stage === stage) {
      return;
    }

    const nextActivityLog = appendActivityLog(
      currentClient.activity_log,
      createActivityEntry(`Etapa cambiada a ${stage}`, "stage"),
    );

    setClients((current) =>
      current.map((client) =>
        client.id === clientId ? { ...client, stage, activity_log: nextActivityLog } : client,
      ),
    );

    if (!supabase) {
      toast.error("Configurá Supabase para actualizar etapas");
      return;
    }

    const { error } = await supabase
      .from("clients")
      .update({ stage, activity_log: nextActivityLog })
      .eq("id", clientId);

    if (error) {
      toast.error(error.message);
      await loadClients();
      return;
    }

    toast.success("Etapa actualizada");
  };

  const markClientContacted = async (clientId: string) => {
    const currentClient = clients.find((client) => client.id === clientId);

    if (!currentClient) {
      return;
    }

    const now = new Date().toISOString();
    const nextActivityLog = appendActivityLog(
      currentClient.activity_log,
      createActivityEntry("Contactado hoy", "contact"),
    );

    setClients((current) =>
      current.map((client) =>
        client.id === clientId
          ? { ...client, last_contact: now, activity_log: nextActivityLog }
          : client,
      ),
    );

    if (!supabase) {
      toast.error("Configurá Supabase para registrar el contacto");
      return;
    }

    const { error } = await supabase
      .from("clients")
      .update({
        last_contact: now,
        activity_log: nextActivityLog,
      })
      .eq("id", clientId);

    if (error) {
      toast.error(error.message);
      await loadClients();
      return;
    }

    toast.success("Contacto actualizado");
  };

  const budgetLabel = getBudgetFieldLabel(form.operation_type);
  const budgetPlaceholder = getBudgetFieldPlaceholder(form.operation_type);
  const availableZones = form.department ? zoneOptionsByDepartment[form.department] : [];
  const editBudgetLabel = getBudgetFieldLabel(editForm.operation_type);
  const editBudgetPlaceholder = getBudgetFieldPlaceholder(editForm.operation_type);
  const editAvailableZones = editForm.department ? zoneOptionsByDepartment[editForm.department] : [];

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
    <div className="min-h-screen w-full overflow-x-hidden bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.08),_transparent_0),#09090b] text-white">
      <AppNavigation email={session?.email} onLogout={handleLogout} />

      <main className="mx-auto max-w-7xl space-y-5 overflow-x-hidden px-3 py-6 pb-24 sm:px-4 md:py-7 md:pb-7">
        <Card className="premium-fade-up overflow-hidden border border-white/10 bg-white/[0.04] text-white shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl">
          <CardContent className="p-6 md:p-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex min-w-0 items-start gap-3">
                <div className="min-w-0 space-y-2">
                  <Badge variant="outline" className="border-white/20 bg-white/10 text-white">
                    Cupertino CRM
                  </Badge>
                  <div>
                    <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">CRM de clientes</h1>
                    <p className="mt-1 text-sm text-zinc-300">
                      Gestioná leads, seguimiento comercial y oportunidades desde un solo lugar.
                    </p>
                  </div>
                  <p className="break-all text-xs text-zinc-400">Sesión activa: {session?.email ?? "usuario"}</p>

                  <div className="flex flex-wrap gap-2 pt-1 md:hidden">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-9 flex-1 border-white/10 bg-transparent text-white hover:bg-white/5"
                      onClick={() => navigate("/")}
                    >
                      Link colega
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-9 flex-1 border-white/10 bg-transparent text-white hover:bg-white/5"
                      onClick={() => navigate("/jira")}
                    >
                      Jira
                    </Button>
                  </div>
                </div>
              </div>

              <div className="hidden xl:flex xl:flex-wrap xl:justify-end">
                <Button
                  className="gap-2 bg-white text-black hover:bg-zinc-200"
                  onClick={() => document.getElementById("client-name")?.focus()}
                >
                  <UserPlus className="h-4 w-4" />
                  Agregar cliente
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

        <div className="xl:hidden">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-9 rounded-full border-white/10 bg-white/[0.04] px-3 text-white hover:bg-white/10"
            onClick={() => setShowMobileStats((current) => !current)}
          >
            📊 {showMobileStats ? "Ocultar estadísticas" : "Ver estadísticas"}
          </Button>
        </div>

        {showMobileStats && (
          <div className="grid grid-cols-2 gap-3 xl:hidden">
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
        )}

        <div className="hidden premium-fade-up-delay-1 gap-3 xl:grid xl:grid-cols-4">
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
          <Card className="hidden border border-white/10 bg-white/[0.04] text-white shadow-sm backdrop-blur-xl xl:sticky xl:top-6 xl:block">
            <CardContent className="p-6 space-y-5">
              <div className="space-y-3">
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.18em] text-emerald-300">Paso 1 · Alta rápida</p>
                  <h2 className="text-lg font-semibold text-white">Agregar cliente</h2>
                  <p className="text-sm text-zinc-300">
                    Completá los datos básicos de la persona y guardala para empezar el seguimiento.
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3">
                  <p className="text-sm font-medium text-white">Carga simple, seguimiento claro</p>
                  <p className="mt-1 text-xs text-zinc-400">
                    Elegí tipo, precio y agregá comentarios para que el equipo vea el contexto enseguida.
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="client-name">Nombre</Label>
                  <div className="relative">
                    <UserPlus className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                    <Input
                      id="client-name"
                      placeholder="Ej: María Pérez"
                      value={form.name}
                      onChange={handleChange("name")}
                      className={inputWithIconClassName}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="client-whatsapp">WhatsApp</Label>
                  <div className="relative">
                    <MessageCircle className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                    <Input
                      id="client-whatsapp"
                      placeholder="099 123 456"
                      value={form.whatsapp}
                      onChange={handleChange("whatsapp")}
                      className={inputWithIconClassName}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="client-email">Email</Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                    <Input
                      id="client-email"
                      type="email"
                      placeholder="cliente@correo.com"
                      value={form.email}
                      onChange={handleChange("email")}
                      className={inputWithIconClassName}
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="client-operation-type">Tipo de Operación</Label>
                    <Select value={form.operation_type} onValueChange={handleOperationChange}>
                      <SelectTrigger id="client-operation-type" className={selectTriggerClassName}>
                        <SelectValue placeholder="Seleccioná una operación" />
                      </SelectTrigger>
                      <SelectContent className={selectContentClassName}>
                        {operationTypeOptions.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="client-property-type">Tipo de propiedad</Label>
                    <div className="relative">
                      <Building2 className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                      <Select value={form.property_type} onValueChange={handleSelectFieldChange("property_type")}>
                        <SelectTrigger id="client-property-type" className={selectWithIconClassName}>
                          <SelectValue placeholder="Seleccioná un tipo" />
                        </SelectTrigger>
                        <SelectContent className={selectContentClassName}>
                          {propertyTypeOptions.map((option) => (
                            <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {form.operation_type ? (
                  <div className="space-y-4 rounded-2xl border border-white/10 bg-black/20 p-4">
                    {isBudgetOperation(form.operation_type) ? (
                      <div className="space-y-2">
                        <Label htmlFor="client-budget">{budgetLabel}</Label>
                        <div className="relative">
                          <CircleDollarSign className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                          <BudgetCombobox
                            id="client-budget"
                            value={form.budget}
                            onChange={handleSelectFieldChange("budget")}
                            options={budgetOptionsByOperation[form.operation_type]}
                            placeholder={budgetPlaceholder}
                          />
                        </div>
                        <p className={helperTextClassName}>Todos los valores se manejan en USD.</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label htmlFor="client-period">Período</Label>
                        <Select value={form.period} onValueChange={handlePeriodChange}>
                          <SelectTrigger id="client-period" className={selectTriggerClassName}>
                            <SelectValue placeholder="Seleccioná un período" />
                          </SelectTrigger>
                          <SelectContent className={selectContentClassName}>
                            {temporaryPeriodOptions.map((option) => (
                              <SelectItem key={option} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="client-budget-notes">Observaciones de presupuesto</Label>
                      <Input
                        id="client-budget-notes"
                        placeholder="Ej: préstamo bancario, paga adelantado..."
                        value={form.budget_notes}
                        onChange={handleChange("budget_notes")}
                        className={`${fieldClassName} text-sm`}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-white/10 bg-black/20 px-4 py-3 text-sm text-zinc-300">
                    Seleccioná el tipo de operación para mostrar precio, presupuesto o período.
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="client-department">Departamento</Label>
                    <Select value={form.department} onValueChange={handleDepartmentChange}>
                      <SelectTrigger id="client-department" className={selectTriggerClassName}>
                        <SelectValue placeholder="Seleccioná un departamento" />
                      </SelectTrigger>
                      <SelectContent className={selectContentClassName}>
                        {departmentOptions.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="client-zone">Zona / Ciudad</Label>
                    <div className="relative">
                      <MapPin className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                      <Select value={form.zone} onValueChange={handleSelectFieldChange("zone")} disabled={!form.department}>
                        <SelectTrigger id="client-zone" className={selectWithIconClassName}>
                          <SelectValue placeholder={form.department ? "Seleccioná una zona o ciudad" : "Primero elegí un departamento"} />
                        </SelectTrigger>
                        <SelectContent className={selectContentClassName}>
                          {availableZones.map((option) => (
                            <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="client-zone-specific">Zona específica</Label>
                  <div className="relative">
                    <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                    <Input
                      id="client-zone-specific"
                      placeholder="Ej: Barrio privado, padrón específico..."
                      value={form.zone_specific}
                      onChange={handleChange("zone_specific")}
                      className={inputWithIconClassName}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Estado actual</Label>
                  <Select value={form.stage} onValueChange={handleStageChange}>
                    <SelectTrigger className={selectTriggerClassName}>
                      <SelectValue placeholder="Seleccioná una etapa" />
                    </SelectTrigger>
                    <SelectContent className={selectContentClassName}>
                      {clientStages.map((stage) => (
                        <SelectItem key={stage} value={stage}>
                          {stage}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor="client-notes">Comentarios</Label>
                    <span className="text-[11px] text-zinc-500">Contexto para el seguimiento</span>
                  </div>
                  <Textarea
                    id="client-notes"
                    placeholder="Ej: busca 2 dormitorios, quiere visitar el fin de semana, prefiere Pocitos"
                    value={form.notes}
                    onChange={handleChange("notes")}
                    className="min-h-28 border-white/10 bg-black/30 text-white placeholder:text-zinc-500"
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
                      Buscá una persona, filtrá por operación y actualizá sus datos sin salir del CRM.
                    </p>
                  </div>
                </div>
                <Badge variant="secondary" className="self-start sm:self-auto">{filteredClients.length} visibles</Badge>
              </div>

              <div className="sticky top-[4.75rem] z-20 space-y-3 rounded-2xl bg-[#09090b]/95 py-2 backdrop-blur md:static md:bg-transparent md:py-0">
                <div className="grid gap-3 md:grid-cols-[1fr_220px]">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                    <Input
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder="Buscar por nombre, operación, zona, email o WhatsApp"
                      className="h-11 border-white/10 bg-black/30 pl-10 text-white placeholder:text-zinc-500"
                    />
                  </div>

                  <div className="hidden md:block">
                    <Select value={stageFilter} onValueChange={setStageFilter}>
                      <SelectTrigger className={selectTriggerClassName}>
                        <SelectValue placeholder="Todas las etapas" />
                      </SelectTrigger>
                      <SelectContent className={selectContentClassName}>
                        <SelectItem value="all">Todas las etapas</SelectItem>
                        {clientStages.map((stage) => (
                          <SelectItem key={stage} value={stage}>
                            {stage}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 md:hidden">
                  <Button
                    type="button"
                    size="sm"
                    variant={stageFilter === "all" ? "secondary" : "outline"}
                    className="h-auto min-h-9 whitespace-normal rounded-2xl border-white/10 bg-black/30 text-white"
                    onClick={() => setStageFilter("all")}
                  >
                    Todas
                  </Button>
                  {clientStages.map((stage) => (
                    <Button
                      key={stage}
                      type="button"
                      size="sm"
                      variant={stageFilter === stage ? "secondary" : "outline"}
                      className="h-auto min-h-9 whitespace-normal rounded-2xl border-white/10 bg-black/30 text-white"
                      onClick={() => setStageFilter(stage)}
                    >
                      {stage}
                    </Button>
                  ))}
                </div>
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
                  {filteredClients.map((client) => {
                    const leadTemperature = getLeadTemperature(client.last_contact);
                    const daysSinceContact = getDaysSinceLastContact(client.last_contact);
                    const lastContactLabel =
                      daysSinceContact === null
                        ? "Sin último contacto"
                        : daysSinceContact === 0
                          ? "Contactado hoy"
                          : `Hace ${daysSinceContact} día${daysSinceContact === 1 ? "" : "s"}`;
                    const primaryContact = client.whatsapp || client.phone;

                    return (
                      <div
                        key={client.id}
                        className="w-full overflow-hidden rounded-2xl border border-white/10 bg-black/30 p-4 shadow-sm transition-colors hover:border-white/20 hover:bg-white/[0.03]"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0 space-y-2">
                            <div className="min-w-0 space-y-1">
                              <p className="text-lg font-semibold leading-tight text-white">{client.name}</p>
                              {primaryContact ? (
                                <a
                                  href={`https://wa.me/${primaryContact.replace(/\D/g, "")}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex max-w-full items-center gap-1 text-sm text-zinc-200 underline-offset-4 hover:text-white hover:underline"
                                >
                                  <MessageCircle className="h-3.5 w-3.5" />
                                  <span className="truncate">{primaryContact}</span>
                                </a>
                              ) : (
                                <p className="text-sm text-zinc-300">{client.email || "Sin WhatsApp principal"}</p>
                              )}
                              {client.email && primaryContact && (
                                <p className="break-all text-xs text-zinc-400">{client.email}</p>
                              )}
                              <p className="mt-1 text-xs text-zinc-400">{lastContactLabel}</p>
                            </div>

                            <div className="flex max-w-full flex-wrap gap-2 overflow-hidden text-xs text-zinc-300">
                              {client.operation_type && (
                                <span className="max-w-full break-words rounded-full bg-emerald-500/10 px-2.5 py-1 text-emerald-200">{client.operation_type}</span>
                              )}
                              {client.department && <span className="max-w-full break-words rounded-full bg-white/5 px-2.5 py-1">{client.department}</span>}
                              {client.zone && <span className="max-w-full break-words rounded-full bg-white/5 px-2.5 py-1">{client.zone}</span>}
                              {client.zone_specific && <span className="max-w-full break-words rounded-full bg-white/5 px-2.5 py-1">{client.zone_specific}</span>}
                              {client.property_type && (
                                <span className="max-w-full break-words rounded-full bg-white/5 px-2.5 py-1">{client.property_type}</span>
                              )}
                              {client.period && <span className="max-w-full break-words rounded-full bg-white/5 px-2.5 py-1">{client.period}</span>}
                              {client.budget && <span className="max-w-full break-words rounded-full bg-white/5 px-2.5 py-1">{client.budget}</span>}
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="outline" className={`border ${leadTemperature.className}`}>
                                {leadTemperature.emoji} {leadTemperature.label}
                              </Badge>
                              <Badge variant="outline" className={`border ${getStageBadgeClass(client.stage)}`}>
                                {client.stage}
                              </Badge>
                            </div>
                          </div>

                          <div className="mt-3 w-full rounded-xl border border-white/10 bg-black/20 p-3 sm:mt-0 sm:w-auto sm:min-w-[260px]">
                            <p className="mb-2 text-[11px] uppercase tracking-[0.18em] text-zinc-400">Estado del cliente</p>

                            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                              <div className="min-w-0">
                                <Select value={client.stage} onValueChange={(value) => void updateClientStage(client.id, value)}>
                                  <SelectTrigger className={`${selectTriggerClassName} w-full min-w-0 max-w-full text-left`}>
                                    <SelectValue placeholder="Estado actual" />
                                  </SelectTrigger>
                                  <SelectContent className={`${selectContentClassName} max-w-[calc(100vw-2rem)]`}>
                                    {clientStages.map((stage) => (
                                      <SelectItem key={stage} value={stage}>
                                        {stage}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="grid gap-2 sm:flex sm:flex-wrap">
                                <Button variant="secondary" className="w-full sm:w-auto" onClick={() => void markClientContacted(client.id)}>
                                  Contactado hoy
                                </Button>
                                <Button variant="outline" className="w-full sm:w-auto" onClick={() => openEditDialog(client)}>
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Editar
                                </Button>
                                <Button variant="outline" className="w-full sm:w-auto" onClick={() => navigate(`/crm/client/${client.id}`)}>
                                  Abrir ficha
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <Button
        type="button"
        size="icon"
        aria-label="Agregar cliente"
        className="fixed bottom-5 right-5 z-50 h-14 w-14 rounded-full bg-white text-black shadow-[0_20px_50px_rgba(0,0,0,0.45)] hover:bg-zinc-200 xl:hidden"
        onClick={() => setIsAddClientOpen(true)}
      >
        <Plus className="h-6 w-6" />
      </Button>

      <Dialog open={isAddClientOpen} onOpenChange={setIsAddClientOpen}>
        <DialogContent className="max-h-[90vh] w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] overflow-y-auto border border-white/10 bg-zinc-950 text-white sm:max-w-lg xl:hidden">
          <DialogHeader>
            <DialogTitle>Agregar cliente</DialogTitle>
            <DialogDescription className="text-zinc-300">
              Completá la ficha y guardá el lead sin salir de la vista principal.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="mobile-client-name">Nombre</Label>
              <div className="relative">
                <UserPlus className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <Input
                  id="mobile-client-name"
                  placeholder="Ej: María Pérez"
                  value={form.name}
                  onChange={handleChange("name")}
                  className={inputWithIconClassName}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mobile-client-whatsapp">WhatsApp</Label>
              <div className="relative">
                <MessageCircle className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <Input
                  id="mobile-client-whatsapp"
                  placeholder="099 123 456"
                  value={form.whatsapp}
                  onChange={handleChange("whatsapp")}
                  className={inputWithIconClassName}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mobile-client-email">Email</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <Input
                  id="mobile-client-email"
                  type="email"
                  placeholder="cliente@correo.com"
                  value={form.email}
                  onChange={handleChange("email")}
                  className={inputWithIconClassName}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="mobile-client-operation-type">Tipo de Operación</Label>
                <Select value={form.operation_type} onValueChange={handleOperationChange}>
                  <SelectTrigger id="mobile-client-operation-type" className={selectTriggerClassName}>
                    <SelectValue placeholder="Seleccioná una operación" />
                  </SelectTrigger>
                  <SelectContent className={selectContentClassName}>
                    {operationTypeOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="mobile-client-property-type">Tipo de propiedad</Label>
                <div className="relative">
                  <Building2 className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                  <Select value={form.property_type} onValueChange={handleSelectFieldChange("property_type")}>
                    <SelectTrigger id="mobile-client-property-type" className={selectWithIconClassName}>
                      <SelectValue placeholder="Seleccioná un tipo" />
                    </SelectTrigger>
                    <SelectContent className={selectContentClassName}>
                      {propertyTypeOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {form.operation_type ? (
              <div className="space-y-4 rounded-2xl border border-white/10 bg-black/20 p-4">
                {isBudgetOperation(form.operation_type) ? (
                  <div className="space-y-2">
                    <Label htmlFor="mobile-client-budget">{budgetLabel}</Label>
                    <div className="relative">
                      <CircleDollarSign className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                      <BudgetCombobox
                        id="mobile-client-budget"
                        value={form.budget}
                        onChange={handleSelectFieldChange("budget")}
                        options={budgetOptionsByOperation[form.operation_type]}
                        placeholder={budgetPlaceholder}
                      />
                    </div>
                    <p className={helperTextClassName}>Todos los valores se manejan en USD.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="mobile-client-period">Período</Label>
                    <Select value={form.period} onValueChange={handlePeriodChange}>
                      <SelectTrigger id="mobile-client-period" className={selectTriggerClassName}>
                        <SelectValue placeholder="Seleccioná un período" />
                      </SelectTrigger>
                      <SelectContent className={selectContentClassName}>
                        {temporaryPeriodOptions.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="mobile-client-budget-notes">Observaciones de presupuesto</Label>
                  <Input
                    id="mobile-client-budget-notes"
                    placeholder="Ej: préstamo bancario, paga adelantado..."
                    value={form.budget_notes}
                    onChange={handleChange("budget_notes")}
                    className={`${fieldClassName} text-sm`}
                  />
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-white/10 bg-black/20 px-4 py-3 text-sm text-zinc-300">
                Seleccioná el tipo de operación para mostrar precio, presupuesto o período.
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="mobile-client-department">Departamento</Label>
                <Select value={form.department} onValueChange={handleDepartmentChange}>
                  <SelectTrigger id="mobile-client-department" className={selectTriggerClassName}>
                    <SelectValue placeholder="Seleccioná un departamento" />
                  </SelectTrigger>
                  <SelectContent className={selectContentClassName}>
                    {departmentOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="mobile-client-zone">Zona / Ciudad</Label>
                <div className="relative">
                  <MapPin className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                  <Select value={form.zone} onValueChange={handleSelectFieldChange("zone")} disabled={!form.department}>
                    <SelectTrigger id="mobile-client-zone" className={selectWithIconClassName}>
                      <SelectValue placeholder={form.department ? "Seleccioná una zona o ciudad" : "Primero elegí un departamento"} />
                    </SelectTrigger>
                    <SelectContent className={selectContentClassName}>
                      {availableZones.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mobile-client-zone-specific">Zona específica</Label>
              <div className="relative">
                <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <Input
                  id="mobile-client-zone-specific"
                  placeholder="Ej: Barrio privado, padrón específico..."
                  value={form.zone_specific}
                  onChange={handleChange("zone_specific")}
                  className={inputWithIconClassName}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Estado actual</Label>
              <Select value={form.stage} onValueChange={handleStageChange}>
                <SelectTrigger className={selectTriggerClassName}>
                  <SelectValue placeholder="Seleccioná una etapa" />
                </SelectTrigger>
                <SelectContent className={selectContentClassName}>
                  {clientStages.map((stage) => (
                    <SelectItem key={stage} value={stage}>
                      {stage}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="mobile-client-notes">Comentarios</Label>
                <span className="text-[11px] text-zinc-500">Contexto para el seguimiento</span>
              </div>
              <Textarea
                id="mobile-client-notes"
                placeholder="Ej: busca 2 dormitorios, quiere visitar el fin de semana, prefiere Pocitos"
                value={form.notes}
                onChange={handleChange("notes")}
                className="min-h-28 border-white/10 bg-black/30 text-white placeholder:text-zinc-500"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => setIsAddClientOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-white text-black hover:bg-zinc-200" disabled={saving || !supabaseReady}>
                {saving ? "Guardando..." : "Guardar cliente"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editingClient)} onOpenChange={(open) => !open && resetEditState()}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border border-white/10 bg-zinc-950 text-white sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar cliente</DialogTitle>
            <DialogDescription className="text-zinc-300">
              Actualizá los datos de {editingClient?.name ?? "este cliente"} sin salir del CRM.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveEdit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="edit-client-name">Nombre</Label>
                <div className="relative">
                  <UserPlus className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                  <Input
                    id="edit-client-name"
                    value={editForm.name}
                    onChange={handleEditChange("name")}
                    placeholder="Ej: María Pérez"
                    className={inputWithIconClassName}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-client-whatsapp">WhatsApp</Label>
                <div className="relative">
                  <MessageCircle className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                  <Input
                    id="edit-client-whatsapp"
                    value={editForm.whatsapp}
                    onChange={handleEditChange("whatsapp")}
                    placeholder="099 123 456"
                    className={inputWithIconClassName}
                  />
                </div>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="edit-client-email">Email</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                  <Input
                    id="edit-client-email"
                    type="email"
                    value={editForm.email}
                    onChange={handleEditChange("email")}
                    placeholder="cliente@correo.com"
                    className={inputWithIconClassName}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-client-operation-type">Tipo de Operación</Label>
                <Select value={editForm.operation_type} onValueChange={handleEditOperationChange}>
                  <SelectTrigger id="edit-client-operation-type" className={selectTriggerClassName}>
                    <SelectValue placeholder="Seleccioná una operación" />
                  </SelectTrigger>
                  <SelectContent className={selectContentClassName}>
                    {operationTypeOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-client-property-type">Tipo de propiedad</Label>
                <div className="relative">
                  <Building2 className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                  <Select value={editForm.property_type} onValueChange={handleEditSelectFieldChange("property_type")}>
                    <SelectTrigger id="edit-client-property-type" className={selectWithIconClassName}>
                      <SelectValue placeholder="Seleccioná un tipo" />
                    </SelectTrigger>
                    <SelectContent className={selectContentClassName}>
                      {propertyTypeOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {editForm.operation_type ? (
                <div className="space-y-4 rounded-2xl border border-white/10 bg-black/20 p-4 sm:col-span-2">
                  {isBudgetOperation(editForm.operation_type) ? (
                    <div className="space-y-2">
                      <Label htmlFor="edit-client-budget">{editBudgetLabel}</Label>
                      <div className="relative">
                        <CircleDollarSign className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                        <BudgetCombobox
                          id="edit-client-budget"
                          value={editForm.budget}
                          onChange={handleEditSelectFieldChange("budget")}
                          options={budgetOptionsByOperation[editForm.operation_type]}
                          placeholder={editBudgetPlaceholder}
                        />
                      </div>
                      <p className={helperTextClassName}>Todos los valores se manejan en USD.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label htmlFor="edit-client-period">Período</Label>
                      <Select value={editForm.period} onValueChange={handleEditPeriodChange}>
                        <SelectTrigger id="edit-client-period" className={selectTriggerClassName}>
                          <SelectValue placeholder="Seleccioná un período" />
                        </SelectTrigger>
                        <SelectContent className={selectContentClassName}>
                          {temporaryPeriodOptions.map((option) => (
                            <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="edit-client-budget-notes">Observaciones de presupuesto</Label>
                    <Input
                      id="edit-client-budget-notes"
                      value={editForm.budget_notes}
                      onChange={handleEditChange("budget_notes")}
                      placeholder="Ej: préstamo bancario, paga adelantado..."
                      className={`${fieldClassName} text-sm`}
                    />
                  </div>
                </div>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="edit-client-department">Departamento</Label>
                <Select value={editForm.department} onValueChange={handleEditDepartmentChange}>
                  <SelectTrigger id="edit-client-department" className={selectTriggerClassName}>
                    <SelectValue placeholder="Seleccioná un departamento" />
                  </SelectTrigger>
                  <SelectContent className={selectContentClassName}>
                    {departmentOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-client-zone">Zona / Ciudad</Label>
                <div className="relative">
                  <MapPin className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                  <Select value={editForm.zone} onValueChange={handleEditSelectFieldChange("zone")} disabled={!editForm.department}>
                    <SelectTrigger id="edit-client-zone" className={selectWithIconClassName}>
                      <SelectValue placeholder={editForm.department ? "Seleccioná una zona o ciudad" : "Primero elegí un departamento"} />
                    </SelectTrigger>
                    <SelectContent className={selectContentClassName}>
                      {editAvailableZones.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="edit-client-zone-specific">Zona específica</Label>
                <div className="relative">
                  <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                  <Input
                    id="edit-client-zone-specific"
                    value={editForm.zone_specific}
                    onChange={handleEditChange("zone_specific")}
                    placeholder="Ej: Barrio privado, padrón específico..."
                    className={inputWithIconClassName}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Estado</Label>
                <Select value={editForm.stage} onValueChange={handleEditStageChange}>
                  <SelectTrigger className={selectTriggerClassName}>
                    <SelectValue placeholder="Seleccioná una etapa" />
                  </SelectTrigger>
                  <SelectContent className={selectContentClassName}>
                    {clientStages.map((stage) => (
                      <SelectItem key={stage} value={stage}>
                        {stage}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="edit-client-notes">Comentarios</Label>
                  <span className="text-[11px] text-zinc-500">Se guardan en la ficha</span>
                </div>
                <Textarea
                  id="edit-client-notes"
                  value={editForm.notes}
                  onChange={handleEditChange("notes")}
                  placeholder="Agregá contexto útil para el seguimiento"
                  className="min-h-28 border-white/10 bg-black/30 text-white placeholder:text-zinc-500"
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="secondary" onClick={resetEditState}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-white text-black hover:bg-zinc-200" disabled={savingEdit || !supabaseReady}>
                {savingEdit ? "Guardando..." : "Guardar cambios"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
