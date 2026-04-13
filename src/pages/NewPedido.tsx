import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft,
  BedDouble,
  Bot,
  Building2,
  Camera,
  Check,
  CircleDollarSign,
  ClipboardPenLine,
  Loader2,
  MapPin,
  MessageCircle,
  Upload,
  UserPlus,
} from "lucide-react";

import AppNavigation from "@/components/AppNavigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  createActivityEntry,
  defaultClientStage,
} from "@/lib/crm";
import { supabase } from "@/lib/supabaseClient";
import { formatSmartText } from "@/lib/utils";

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

const budgetOptionsByOperation: Record<BudgetOperationType, readonly string[]> = {
  Compra: purchaseBudgetOptions,
  Venta: purchaseBudgetOptions,
  "Alquiler anual": annualBudgetOptions,
  "Alquiler invernal": winterBudgetOptions,
};

const dormitoriosOptions = ["", "Monoambiente", "1", "2", "3", "4", "5+"] as const;

const fieldClassName = "h-11 border-white/10 bg-black/30 text-white placeholder:text-zinc-500";
const inputWithIconClassName = `${fieldClassName} pl-10`;
const selectTriggerClassName = "h-11 border-white/10 bg-black/30 text-white";
const selectWithIconClassName = `${selectTriggerClassName} pl-10`;
const selectContentClassName = "border-white/10 bg-zinc-950 text-white";
const helperTextClassName = "text-[11px] text-zinc-500";

type EntryMode = "choose" | "ai" | "manual";

type PedidoForm = {
  name: string;
  whatsapp: string;
  operation_type: OperationType | "";
  property_type: string;
  budget: string;
  zone: string;
  department: DepartmentOption | "";
  bedrooms: string;
  period: string;
  notes: string;
  budget_notes: string;
  zone_specific: string;
};

type ExtractedLeadPayload = {
  nombre: string;
  whatsapp: string;
  operacion: string;
  tipo_propiedad: string;
  presupuesto: string;
  zona: string;
  departamento: string;
  dormitorios: string;
  notas: string;
};

const initialForm: PedidoForm = {
  name: "",
  whatsapp: "",
  operation_type: "",
  property_type: "",
  budget: "",
  zone: "",
  department: "",
  bedrooms: "",
  period: "",
  notes: "",
  budget_notes: "",
  zone_specific: "",
};

const fieldFormatters: Partial<Record<keyof PedidoForm, "none" | "name" | "sentence">> = {
  name: "name",
  property_type: "sentence",
  zone_specific: "sentence",
  budget_notes: "sentence",
  notes: "sentence",
};

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

function normalizeOperationType(value: string): OperationType | "" {
  return operationTypeOptions.includes(value as OperationType) ? (value as OperationType) : "";
}

function normalizeDepartment(value: string): DepartmentOption | "" {
  return departmentOptions.includes(value as DepartmentOption) ? (value as DepartmentOption) : "";
}

function normalizePropertyType(value: string) {
  const normalized = value.trim().toLowerCase();

  if (!normalized) {
    return "";
  }

  if (normalized.includes("apart")) return "Apartamento";
  if (normalized.includes("casa")) return "Casa";
  if (normalized.includes("local")) return "Local comercial";
  if (normalized.includes("terreno")) return "Terreno";
  if (normalized.includes("campo")) return "Campo";
  return formatSmartText(value, "sentence");
}

function normalizeBedrooms(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  if (/mono/i.test(trimmed)) {
    return "Monoambiente";
  }

  const match = trimmed.match(/\d+/);
  if (!match) {
    return trimmed;
  }

  const parsed = Number.parseInt(match[0], 10);
  if (!Number.isInteger(parsed)) {
    return trimmed;
  }

  return parsed >= 5 ? "5+" : String(parsed);
}

function buildClientPayload(form: PedidoForm) {
  const operationType = form.operation_type || null;
  const budget = isBudgetOperation(form.operation_type) ? form.budget.trim() || null : null;
  const period = form.operation_type === "Alquiler temporal" ? form.period.trim() || null : null;

  return {
    name: form.name.trim(),
    phone: form.whatsapp.trim() || null,
    whatsapp: form.whatsapp.trim() || null,
    operation_type: operationType,
    property_type: form.property_type.trim() || null,
    budget,
    zone: form.zone.trim() || null,
    department: form.department || null,
    dormitorios: form.bedrooms.trim() || null,
    period,
    notes: form.notes.trim() || null,
    budget_notes: form.budget_notes.trim() || null,
    zone_specific: form.zone_specific.trim() || null,
    stage: defaultClientStage,
  };
}

async function fileToBase64(file: File) {
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      if (!base64) {
        reject(new Error("No se pudo leer la imagen"));
        return;
      }
      resolve(base64);
    };
    reader.onerror = () => reject(new Error("No se pudo leer la imagen"));
    reader.readAsDataURL(file);
  });
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

  useEffect(() => {
    setQuery(value);
  }, [value]);

  const filteredOptions = options.filter((option) =>
    option.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const showCustomValue = query.trim() && !options.some((option) => option.toLowerCase() === query.trim().toLowerCase());

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          className={`${fieldClassName} flex w-full items-center rounded-md px-3 text-left`}
        >
          <span className={value ? "text-white" : "text-zinc-500"}>{value || placeholder}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(92vw,340px)] border-white/10 bg-zinc-950 p-0 text-white" align="start">
        <div className="space-y-2 p-3">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={placeholder}
            className={fieldClassName}
          />

          <div className="max-h-56 space-y-1 overflow-y-auto pr-1">
            {showCustomValue && (
              <button
                type="button"
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-zinc-200 transition hover:bg-white/5"
                onClick={() => {
                  onChange(query.trim());
                  setOpen(false);
                }}
              >
                <span>Usar “{query.trim()}”</span>
                <Check className="h-4 w-4 text-zinc-500" />
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
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default function NewPedido() {
  const navigate = useNavigate();
  const session = getStoredSession();
  const supabaseReady = Boolean(supabase);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [entryMode, setEntryMode] = useState<EntryMode>("choose");
  const [form, setForm] = useState<PedidoForm>(initialForm);
  const [saving, setSaving] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [captureFile, setCaptureFile] = useState<File | null>(null);
  const [capturePreviewUrl, setCapturePreviewUrl] = useState("");

  useEffect(() => {
    if (!captureFile) {
      setCapturePreviewUrl("");
      return;
    }

    const objectUrl = URL.createObjectURL(captureFile);
    setCapturePreviewUrl(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [captureFile]);

  useEffect(() => {
    if (entryMode !== "ai") {
      return;
    }

    const handlePaste = (event: ClipboardEvent) => {
      const items = Array.from(event.clipboardData?.items ?? []);
      const imageItem = items.find((item) => item.type.startsWith("image/"));
      const file = imageItem?.getAsFile() ?? null;

      if (!file) {
        return;
      }

      event.preventDefault();
      setCaptureFile(file);
      toast.success("Captura pegada correctamente");
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [entryMode]);

  const availableZones = useMemo(
    () => (form.department ? zoneOptionsByDepartment[form.department] : []),
    [form.department],
  );
  const budgetLabel = getBudgetFieldLabel(form.operation_type);
  const budgetPlaceholder = getBudgetFieldPlaceholder(form.operation_type);

  const handleLogout = async () => {
    const result = await signOut();

    if (!result.ok) {
      toast.error(result.message);
    } else {
      toast("Sesión cerrada");
    }

    navigate("/login", { replace: true });
  };

  const handleFieldChange = (field: keyof PedidoForm) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setForm((current) => ({
      ...current,
      [field]: formatSmartText(event.target.value, fieldFormatters[field] ?? "none"),
    }));
  };

  const handleSelectFieldChange = (field: "property_type" | "budget" | "zone" | "bedrooms") => (value: string) => {
    setForm((current) => ({
      ...current,
      [field]: value,
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

  const handleDepartmentChange = (value: string) => {
    setForm((current) => ({
      ...current,
      department: value as DepartmentOption,
      zone: "",
    }));
  };

  const applyExtractedData = (payload: ExtractedLeadPayload) => {
    const inferredDepartment = normalizeDepartment(payload.departamento) || inferDepartmentFromZone(payload.zona);

    setForm((current) => ({
      ...current,
      name: formatSmartText(payload.nombre ?? "", "name"),
      whatsapp: payload.whatsapp?.trim() ?? "",
      operation_type: normalizeOperationType(payload.operacion ?? ""),
      property_type: normalizePropertyType(payload.tipo_propiedad ?? ""),
      budget: payload.presupuesto?.trim() ?? "",
      zone: payload.zona?.trim() ?? "",
      department: inferredDepartment,
      bedrooms: normalizeBedrooms(payload.dormitorios ?? ""),
      notes: formatSmartText(payload.notas ?? "", "sentence"),
    }));
  };

  const handleCaptureFile = (file: File | null) => {
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Subí una imagen válida");
      return;
    }

    setCaptureFile(file);
  };

  const handleExtractWithAI = async () => {
    if (!captureFile) {
      toast.error("Primero subí o pegá una captura");
      return;
    }

    if (!supabase) {
      toast.error("Configurá Supabase para usar la extracción con IA");
      return;
    }

    setExtracting(true);

    try {
      const imageBase64 = await fileToBase64(captureFile);
      const { data, error } = await supabase.functions.invoke("extract-lead-from-image", {
        body: {
          imageBase64,
          mediaType: captureFile.type || "image/jpeg",
          fileName: captureFile.name,
        },
      });

      if (error) {
        throw new Error(error.message || "No se pudo procesar la captura");
      }

      applyExtractedData((data?.lead ?? {}) as ExtractedLeadPayload);
      setEntryMode("manual");
      toast.success("Datos extraídos. Revisalos antes de guardar.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo extraer la información";
      toast.error(message);
    } finally {
      setExtracting(false);
    }
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
      activity_log: appendActivityLog([], createActivityEntry("Pedido creado", "client")),
    };

    const { data, error } = await supabase.from("clients").insert(payload).select().single();
    setSaving(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Pedido guardado en CRM");
    setForm(initialForm);
    setCaptureFile(null);
    setEntryMode("choose");

    if (data?.id) {
      navigate(`/crm/client/${data.id}`);
    } else {
      navigate("/crm");
    }
  };

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.08),_transparent_0),#09090b] text-white">
      <AppNavigation
        email={session?.email}
        isAdmin={(session?.role || "").trim().toLowerCase() === "administrador"}
        onLogout={handleLogout}
      />

      <main className="mx-auto max-w-4xl space-y-5 px-3 py-6 pb-28 sm:px-4 md:py-7">
        <Card className="overflow-hidden border border-white/10 bg-white/[0.04] text-white shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl">
          <CardContent className="space-y-4 p-6 md:p-7">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <Badge variant="outline" className="border-white/20 bg-white/10 text-white">
                  📥 Nuevo pedido
                </Badge>
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Agregar pedido al CRM</h1>
                  <p className="mt-1 text-sm text-zinc-300">
                    Cargá un lead desde una captura de WhatsApp o completalo manualmente.
                  </p>
                </div>
                <p className="break-all text-xs text-zinc-400">Sesión activa: {session?.email ?? "usuario"}</p>
              </div>

              <Button
                type="button"
                variant="outline"
                className="shrink-0 border-white/10 bg-black/20 text-white hover:bg-white/5"
                onClick={() => navigate("/crm")}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver
              </Button>
            </div>
          </CardContent>
        </Card>

        {entryMode === "choose" && (
          <div className="grid gap-4">
            <button
              type="button"
              onClick={() => setEntryMode("ai")}
              className="group rounded-[28px] border border-white/10 bg-[linear-gradient(135deg,rgba(16,185,129,0.16),rgba(255,255,255,0.04))] p-6 text-left shadow-[0_18px_40px_rgba(0,0,0,0.28)] transition hover:border-emerald-400/30 hover:bg-[linear-gradient(135deg,rgba(16,185,129,0.22),rgba(255,255,255,0.06))]"
            >
              <div className="flex items-center gap-4">
                <div className="rounded-2xl bg-emerald-500/15 p-4 text-emerald-300">
                  <Bot className="h-8 w-8" />
                </div>
                <div>
                  <p className="text-2xl font-semibold text-white">📸 Desde WhatsApp / Redes</p>
                  <p className="mt-1 text-sm text-zinc-300">
                    Subí una captura, extraemos los datos con IA y luego confirmás antes de guardar.
                  </p>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setEntryMode("manual")}
              className="group rounded-[28px] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(59,130,246,0.08))] p-6 text-left shadow-[0_18px_40px_rgba(0,0,0,0.28)] transition hover:border-white/20 hover:bg-[linear-gradient(135deg,rgba(255,255,255,0.08),rgba(59,130,246,0.12))]"
            >
              <div className="flex items-center gap-4">
                <div className="rounded-2xl bg-sky-500/15 p-4 text-sky-300">
                  <ClipboardPenLine className="h-8 w-8" />
                </div>
                <div>
                  <p className="text-2xl font-semibold text-white">✏️ Cargar manualmente</p>
                  <p className="mt-1 text-sm text-zinc-300">
                    Abrí el formulario completo y cargá el pedido a mano.
                  </p>
                </div>
              </div>
            </button>
          </div>
        )}

        {entryMode === "ai" && (
          <Card className="border border-white/10 bg-white/[0.04] text-white shadow-sm backdrop-blur-xl">
            <CardContent className="space-y-5 p-6">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-[0.18em] text-emerald-300">Paso 1 · Captura</p>
                <h2 className="text-lg font-semibold text-white">📸 Subir captura</h2>
                <p className="text-sm text-zinc-300">
                  Podés subir archivo, sacar foto desde el celular o pegar una imagen desde el portapapeles.
                </p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(event) => handleCaptureFile(event.target.files?.[0] ?? null)}
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex min-h-[280px] w-full flex-col items-center justify-center gap-4 rounded-[28px] border border-dashed border-white/15 bg-black/25 px-6 py-8 text-center transition hover:border-white/25 hover:bg-black/35"
              >
                {capturePreviewUrl ? (
                  <>
                    <img
                      src={capturePreviewUrl}
                      alt="Vista previa de la captura"
                      className="max-h-64 rounded-2xl border border-white/10 object-contain shadow-lg"
                    />
                    <div>
                      <p className="font-medium text-white">{captureFile?.name || "Captura lista"}</p>
                      <p className="mt-1 text-sm text-zinc-300">Tocá para reemplazarla o pegá otra imagen.</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="rounded-2xl bg-white/5 p-5 text-zinc-200">
                      <Upload className="h-10 w-10" />
                    </div>
                    <div className="space-y-2">
                      <p className="text-xl font-semibold text-white">📸 Subir captura</p>
                      <p className="text-sm text-zinc-300">
                        Tocá para elegir imagen o foto. También podés pegar una captura con `Ctrl/Cmd + V`.
                      </p>
                    </div>
                  </>
                )}
              </button>

              <div className="grid gap-3 sm:grid-cols-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-12 border-white/10 bg-transparent text-white hover:bg-white/5"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Camera className="mr-2 h-4 w-4" />
                  Elegir imagen / cámara
                </Button>
                <Button
                  type="button"
                  className="h-12 bg-white text-black hover:bg-zinc-200"
                  onClick={() => void handleExtractWithAI()}
                  disabled={extracting || !supabaseReady}
                >
                  {extracting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bot className="mr-2 h-4 w-4" />}
                  🤖 Extraer datos con IA
                </Button>
              </div>

              {!supabaseReady && (
                <p className="text-sm text-amber-300">
                  Configurá Supabase para usar la extracción con IA y guardar el pedido.
                </p>
              )}

              <div className="flex gap-2">
                <Button type="button" variant="ghost" className="text-zinc-300 hover:text-white" onClick={() => setEntryMode("choose")}>
                  Volver a opciones
                </Button>
                <Button type="button" variant="ghost" className="text-zinc-300 hover:text-white" onClick={() => setEntryMode("manual")}>
                  Saltar a carga manual
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {entryMode === "manual" && (
          <Card className="border border-white/10 bg-white/[0.04] text-white shadow-sm backdrop-blur-xl">
            <CardContent className="space-y-5 p-6">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-[0.18em] text-emerald-300">
                  {captureFile ? "Paso 2 · Confirmar" : "Carga manual"}
                </p>
                <h2 className="text-lg font-semibold text-white">
                  {captureFile ? "Confirmar datos extraídos" : "Completar pedido"}
                </h2>
                <p className="text-sm text-zinc-300">
                  Revisá los datos y guardalos directamente en el CRM.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="pedido-name">Nombre</Label>
                  <div className="relative">
                    <UserPlus className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                    <Input
                      id="pedido-name"
                      placeholder="Ej: María Pérez"
                      value={form.name}
                      onChange={handleFieldChange("name")}
                      className={inputWithIconClassName}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pedido-whatsapp">WhatsApp</Label>
                  <div className="relative">
                    <MessageCircle className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                    <Input
                      id="pedido-whatsapp"
                      placeholder="099 123 456"
                      value={form.whatsapp}
                      onChange={handleFieldChange("whatsapp")}
                      className={inputWithIconClassName}
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="pedido-operation">Tipo de operación</Label>
                    <Select value={form.operation_type} onValueChange={handleOperationChange}>
                      <SelectTrigger id="pedido-operation" className={selectTriggerClassName}>
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
                    <Label htmlFor="pedido-property-type">Tipo de propiedad</Label>
                    <div className="relative">
                      <Building2 className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                      <Select value={form.property_type} onValueChange={handleSelectFieldChange("property_type")}>
                        <SelectTrigger id="pedido-property-type" className={selectWithIconClassName}>
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
                        <Label htmlFor="pedido-budget">{budgetLabel}</Label>
                        <div className="relative">
                          <CircleDollarSign className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                          <BudgetCombobox
                            id="pedido-budget"
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
                        <Label htmlFor="pedido-period">Período</Label>
                        <Select value={form.period} onValueChange={(value) => setForm((current) => ({ ...current, period: value }))}>
                          <SelectTrigger id="pedido-period" className={selectTriggerClassName}>
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
                      <Label htmlFor="pedido-budget-notes">Observaciones de presupuesto</Label>
                      <Input
                        id="pedido-budget-notes"
                        placeholder="Ej: contado, banco, rango flexible..."
                        value={form.budget_notes}
                        onChange={handleFieldChange("budget_notes")}
                        className={fieldClassName}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-white/10 bg-black/20 px-4 py-3 text-sm text-zinc-300">
                    Seleccioná el tipo de operación para mostrar presupuesto o período.
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="pedido-department">Departamento</Label>
                    <Select value={form.department} onValueChange={handleDepartmentChange}>
                      <SelectTrigger id="pedido-department" className={selectTriggerClassName}>
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
                    <Label htmlFor="pedido-zone">Zona / Ciudad</Label>
                    <div className="relative">
                      <MapPin className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                      <Select value={form.zone} onValueChange={handleSelectFieldChange("zone")} disabled={!form.department}>
                        <SelectTrigger id="pedido-zone" className={selectWithIconClassName}>
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
                  <Label htmlFor="pedido-zone-specific">Zona específica</Label>
                  <Input
                    id="pedido-zone-specific"
                    placeholder="Ej: barrio privado, rambla, parada 10..."
                    value={form.zone_specific}
                    onChange={handleFieldChange("zone_specific")}
                    className={fieldClassName}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pedido-bedrooms">Dormitorios</Label>
                  <div className="relative">
                    <BedDouble className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                    <Select value={form.bedrooms} onValueChange={handleSelectFieldChange("bedrooms")}>
                      <SelectTrigger id="pedido-bedrooms" className={selectWithIconClassName}>
                        <SelectValue placeholder="Seleccioná" />
                      </SelectTrigger>
                      <SelectContent className={selectContentClassName}>
                        {dormitoriosOptions.map((option) => (
                          <SelectItem key={option || "empty"} value={option}>
                            {option || "Sin especificar"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pedido-notes">Notas</Label>
                  <Textarea
                    id="pedido-notes"
                    placeholder="Ej: busca frente al mar, acepta opciones para visitar, viene de Instagram..."
                    value={form.notes}
                    onChange={handleFieldChange("notes")}
                    className="min-h-32 border-white/10 bg-black/30 text-white placeholder:text-zinc-500"
                  />
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-12 border-white/10 bg-transparent text-white hover:bg-white/5 sm:flex-1"
                    onClick={() => setEntryMode(captureFile ? "ai" : "choose")}
                  >
                    {captureFile ? "Volver a captura" : "Volver"}
                  </Button>
                  <Button
                    type="submit"
                    className="h-12 bg-white text-black hover:bg-zinc-200 sm:flex-1"
                    disabled={saving || !supabaseReady}
                  >
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                    ✅ Guardar en CRM
                  </Button>
                </div>

                {!supabaseReady && (
                  <p className="text-sm text-amber-300">
                    Configurá Supabase para guardar el pedido.
                  </p>
                )}
              </form>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
