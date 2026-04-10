import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Building2,
  Check,
  ChevronsUpDown,
  CircleDollarSign,
  Copy,
  Link2,
  Loader2,
  MapPin,
  MessageCircle,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";

import AppNavigation from "@/components/AppNavigation";
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
import { type PropertyRecord } from "@/lib/crm";
import { supabase } from "@/lib/supabaseClient";

const propertyTypeOptions = ["Apartamento", "Casa", "Local", "Terreno", "Campo"] as const;
const operationOptions = ["Venta", "Alquiler temporal", "Alquiler anual", "Alquiler invernal"] as const;
const departmentOptions = ["Maldonado", "Rocha"] as const;
const PROPERTY_DRAFT_STORAGE_KEY = "colega-linker-property-draft";
const COLEGA_AGENCY_ID = 584;

type PropertyTypeOption = (typeof propertyTypeOptions)[number];
type OperationOption = (typeof operationOptions)[number];
type DepartmentOption = (typeof departmentOptions)[number];

const salePriceOptions = [
  "Hasta 100K",
  "100K - 150K",
  "150K - 200K",
  "200K - 300K",
  "300K - 500K",
  "500K - 750K",
  "750K - 1M",
  "+1M",
] as const;

const rentPriceOptions = [
  "Hasta 500",
  "500 - 1K",
  "1K - 1.5K",
  "1.5K - 2K",
  "2K - 3K",
  "3K - 5K",
  "+5K",
] as const;

const zoneOptionsByDepartment: Record<DepartmentOption, readonly string[]> = {
  Maldonado: [
    "Punta del Este",
    "Maldonado",
    "San Carlos",
    "Piriápolis",
    "La Barra",
    "Manantiales",
    "José Ignacio",
    "Punta Ballena",
    "Pinares",
  ],
  Rocha: [
    "La Paloma",
    "La Pedrera",
    "Punta del Diablo",
    "Aguas Dulces",
    "Cabo Polonio",
    "Valizas",
    "Rocha",
    "Chuy",
  ],
};

const fieldClassName = "h-11 border-white/10 bg-black/30 text-white placeholder:text-zinc-500";
const inputWithIconClassName = `${fieldClassName} pl-10`;
const selectTriggerClassName = "h-11 border-white/10 bg-black/30 text-white";
const selectWithIconClassName = `${selectTriggerClassName} pl-10`;
const selectContentClassName = "border-white/10 bg-zinc-950 text-white";

const initialPropertyForm = {
  title: "",
  type: "" as PropertyTypeOption | "",
  operation: "" as OperationOption | "",
  price: "",
  department: "" as DepartmentOption | "",
  zone: "",
  url: "",
  photos_link: "",
  notes: "",
};

function PriceCombobox({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
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
          className={`${selectWithIconClassName} w-full justify-between font-normal hover:bg-black/40`}
        >
          <span className={`truncate ${value ? "text-white" : "text-zinc-500"}`}>
            {value || "Seleccioná o escribí un precio"}
          </span>
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
            placeholder="Seleccioná o escribí un precio"
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
              <Check className="h-4 w-4 text-zinc-500" />
            </button>
          )}

          {filteredOptions.map((option) => (
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
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function normalizePortalUrl(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

function normalizeImageUrls(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as string[];
  }

  return value.filter((item): item is string => typeof item === "string" && item.length > 0);
}

function extractPhotosLink(property: Pick<PropertyRecord, "image_urls" | "notes">) {
  const storedImageUrl = normalizeImageUrls(property.image_urls)[0];

  if (storedImageUrl) {
    return storedImageUrl;
  }

  const match = property.notes?.match(/(?:^|\n)\s*Link de fotos:\s*(\S+)/i);
  return match?.[1] ? normalizePortalUrl(match[1]) : "";
}

function buildPropertyNotes(notes: string, photosLink: string) {
  const cleanNotes = notes.trim();
  const cleanPhotosLink = photosLink.trim() ? `Link de fotos: ${normalizePortalUrl(photosLink)}` : "";

  return [cleanNotes || null, cleanPhotosLink || null].filter(Boolean).join("\n\n") || null;
}

function stripPhotosLinkFromNotes(notes: string | null | undefined) {
  return (notes ?? "")
    .replace(/(?:^|\n)\s*Link de fotos:\s*\S+/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function mapPropertyTypeToColega(type: string | null | undefined) {
  switch (type) {
    case "Apartamento":
      return "Apartamentos" as const;
    case "Casa":
      return "Casas" as const;
    default:
      return "Casas" as const;
  }
}

function buildPropertyColegaLink(property: Pick<PropertyRecord, "auto_id" | "type">) {
  if (!property.auto_id) {
    return "";
  }

  const result = property.auto_id * COLEGA_AGENCY_ID + 9876;
  const propertyType = mapPropertyTypeToColega(property.type);

  return `https://www.inmobiliaria.link/c/inmobiliaria_${COLEGA_AGENCY_ID}/${propertyType}/${result}`;
}

export default function Properties() {
  const navigate = useNavigate();
  const session = getStoredSession();
  const supabaseReady = Boolean(supabase);
  const [properties, setProperties] = useState<PropertyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [form, setForm] = useState(initialPropertyForm);
  const [errorMessage, setErrorMessage] = useState("");
  const [hasRestoredDraft, setHasRestoredDraft] = useState(false);
  const [savedColegaLink, setSavedColegaLink] = useState<{ title: string; url: string } | null>(null);
  const [editingProperty, setEditingProperty] = useState<PropertyRecord | null>(null);

  const priceOptions = useMemo(() => {
    if (form.operation === "Venta") {
      return salePriceOptions;
    }

    return rentPriceOptions;
  }, [form.operation]);

  const availableZones = form.department ? zoneOptionsByDepartment[form.department] : [];
  const propertyCountLabel = loading
    ? "Cargando propiedades..."
    : `${properties.length} ${properties.length === 1 ? "propiedad cargada" : "propiedades cargadas"}`;
  const saleCount = properties.filter((property) => property.operation === "Venta").length;
  const rentalCount = properties.filter((property) => property.operation?.toLowerCase().includes("alquiler")).length;
  const withPhotosCount = properties.filter((property) => Boolean(extractPhotosLink(property))).length;

  const resetForm = () => {
    setForm(initialPropertyForm);
    setEditingProperty(null);

    if (typeof window !== "undefined") {
      window.localStorage.removeItem(PROPERTY_DRAFT_STORAGE_KEY);
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") {
      setHasRestoredDraft(true);
      return;
    }

    try {
      const storedDraft = window.localStorage.getItem(PROPERTY_DRAFT_STORAGE_KEY);

      if (storedDraft) {
        const parsedDraft = JSON.parse(storedDraft) as {
          form?: Partial<typeof initialPropertyForm>;
        };

        if (parsedDraft.form && typeof parsedDraft.form === "object") {
          setForm((current) => ({
            ...current,
            ...Object.fromEntries(
              Object.entries(parsedDraft.form).filter(([, value]) => typeof value === "string"),
            ),
          }));
        }
      }
    } catch {
      window.localStorage.removeItem(PROPERTY_DRAFT_STORAGE_KEY);
    } finally {
      setHasRestoredDraft(true);
    }
  }, []);

  useEffect(() => {
    if (!hasRestoredDraft || typeof window === "undefined") {
      return;
    }

    const hasDraftContent = Object.values(form).some((value) => value.trim() !== "");

    if (!hasDraftContent) {
      window.localStorage.removeItem(PROPERTY_DRAFT_STORAGE_KEY);
      return;
    }

    window.localStorage.setItem(
      PROPERTY_DRAFT_STORAGE_KEY,
      JSON.stringify({
        form,
      }),
    );
  }, [form, hasRestoredDraft]);

  const loadProperties = useCallback(async () => {
    if (!supabase) {
      setProperties([]);
      setErrorMessage("Configurá Supabase para cargar las propiedades.");
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from("properties")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setProperties([]);
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    setProperties((data ?? []) as PropertyRecord[]);
    setErrorMessage("");
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadProperties();
  }, [loadProperties]);

  const handleLogout = async () => {
    const result = await signOut();

    if (!result.ok) {
      toast.error(result.message);
    } else {
      toast("Sesión cerrada");
    }

    navigate("/login", { replace: true });
  };

  const handleChange = (field: keyof typeof initialPropertyForm) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm((current) => ({
      ...current,
      [field]: event.target.value,
    }));
  };

  const handleSelectChange = (field: "type" | "operation" | "zone") => (value: string) => {
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

  const openEditDialog = (property: PropertyRecord) => {
    setEditingProperty(property);
    setSavedColegaLink(null);
    setForm({
      title: property.title || "",
      type: (property.type as PropertyTypeOption) || "",
      operation: (property.operation as OperationOption) || "",
      price: property.price || "",
      department: (property.department as DepartmentOption) || "",
      zone: property.zone || "",
      url: property.url || "",
      photos_link: extractPhotosLink(property),
      notes: stripPhotosLinkFromNotes(property.notes),
    });
    setIsAddOpen(true);
  };

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.title.trim()) {
      toast.error("El título es obligatorio");
      return;
    }

    if (!supabase) {
      toast.error("Configurá Supabase para guardar propiedades");
      return;
    }

    setSaving(true);
    const payload = {
      title: form.title.trim(),
      type: form.type || null,
      operation: form.operation || null,
      price: form.price.trim() || null,
      department: form.department || null,
      zone: form.zone || null,
      url: form.url.trim() ? normalizePortalUrl(form.url) : null,
      notes: buildPropertyNotes(form.notes, form.photos_link),
    };

    const wasEditing = Boolean(editingProperty);
    const query = editingProperty
      ? supabase.from("properties").update(payload).eq("id", editingProperty.id).select().single()
      : supabase.from("properties").insert(payload).select().single();

    const { data, error } = await query;
    setSaving(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    const savedProperty = data as PropertyRecord;
    const colegaLink = buildPropertyColegaLink(savedProperty);

    setProperties((current) =>
      wasEditing
        ? current.map((item) => (item.id === savedProperty.id ? savedProperty : item))
        : [savedProperty, ...current],
    );
    setSavedColegaLink(
      colegaLink
        ? {
            title: savedProperty.title,
            url: colegaLink,
          }
        : null,
    );
    resetForm();
    setIsAddOpen(false);
    toast.success(wasEditing ? "✅ Propiedad actualizada" : "✅ Propiedad guardada");
  };

  const handleDelete = async (property: PropertyRecord) => {
    if (!supabase) {
      toast.error("Configurá Supabase para eliminar propiedades");
      return;
    }

    if (!window.confirm(`¿Eliminar ${property.title}?`)) {
      return;
    }

    const { error } = await supabase.from("properties").delete().eq("id", property.id);

    if (error) {
      toast.error(error.message);
      return;
    }

    setProperties((current) => current.filter((item) => item.id !== property.id));
    toast.success("Propiedad eliminada");
  };

  const handleCopyLink = async (url: string) => {
    if (!url) {
      toast.error("Esta propiedad todavía no tiene link colega disponible.");
      return;
    }

    await navigator.clipboard.writeText(url);
    toast.success("Link colega copiado");
  };

  const handleShareWhatsApp = (property: PropertyRecord) => {
    const colegaLink = buildPropertyColegaLink(property);

    if (!colegaLink) {
      toast.error("Todavía no se pudo generar el link colega para esta propiedad.");
      return;
    }

    const text = [
      "Hola! Te comparto esta propiedad:",
      property.title,
      property.operation,
      property.price ? `Precio: ${property.price} USD` : null,
      [property.department, property.zone].filter(Boolean).join(" · ") || null,
      `Link colega: ${colegaLink}`,
    ]
      .filter(Boolean)
      .join("\n");

    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.08),_transparent_0),#09090b] text-white">
      <AppNavigation email={session?.email} onLogout={handleLogout} />

      <main className="mx-auto max-w-6xl space-y-5 px-3 py-6 pb-24 sm:px-4 md:py-7 md:pb-7">
        <Card className="premium-fade-up overflow-hidden border border-white/10 bg-white/[0.04] text-white shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl">
          <CardContent className="p-6 md:p-7">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-3">
                <Badge variant="outline" className="border-white/20 bg-white/10 text-white">
                  Cupertino
                </Badge>
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Mis Propiedades</h1>
                  <p className="mt-1 text-sm text-zinc-300">
                    Guardá, compartí y administrá tus propiedades desde un solo lugar.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-300">
                  <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1">
                    <Building2 className="mr-1.5 h-3.5 w-3.5" />
                    {propertyCountLabel}
                  </span>
                  <p className="break-all text-zinc-400">Sesión activa: {session?.email ?? "usuario"}</p>
                </div>
              </div>

              <Button
                className="w-full gap-2 bg-white text-black hover:bg-zinc-200 sm:w-auto"
                onClick={() => {
                  setEditingProperty(null);
                  setSavedColegaLink(null);
                  setIsAddOpen(true);
                }}
              >
                <Building2 className="h-4 w-4" />
                Agregar propiedad
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-3 sm:grid-cols-3">
          <Card className="border border-white/10 bg-white/[0.04] text-white shadow-sm backdrop-blur-xl">
            <CardContent className="p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-400">En venta</p>
              <p className="mt-2 text-2xl font-semibold text-white">{saleCount}</p>
            </CardContent>
          </Card>
          <Card className="border border-white/10 bg-white/[0.04] text-white shadow-sm backdrop-blur-xl">
            <CardContent className="p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-400">En alquiler</p>
              <p className="mt-2 text-2xl font-semibold text-white">{rentalCount}</p>
            </CardContent>
          </Card>
          <Card className="border border-white/10 bg-white/[0.04] text-white shadow-sm backdrop-blur-xl">
            <CardContent className="p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-400">Con fotos</p>
              <p className="mt-2 text-2xl font-semibold text-white">{withPhotosCount}</p>
            </CardContent>
          </Card>
        </div>

        {savedColegaLink && (
          <Card className="border border-emerald-500/30 bg-emerald-500/10 text-white shadow-sm backdrop-blur-xl">
            <CardContent className="space-y-3 p-4 sm:p-5">
              <div className="flex items-center gap-2 text-emerald-100">
                <Sparkles className="h-4 w-4" />
                <p className="font-medium">✅ Propiedad guardada</p>
              </div>
              <div>
                <p className="text-sm text-emerald-50">Tu link colega:</p>
                <p className="mt-1 break-all rounded-xl border border-emerald-400/20 bg-black/20 p-3 font-mono text-sm text-white">
                  {savedColegaLink.url}
                </p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <Button
                  variant="outline"
                  className="w-full border-emerald-400/30 bg-emerald-500/10 text-emerald-50 hover:bg-emerald-500/20"
                  onClick={() =>
                    window.open(
                      `https://wa.me/?text=${encodeURIComponent(`Hola! Te comparto esta propiedad: ${savedColegaLink.url}`)}`,
                      "_blank",
                      "noopener,noreferrer",
                    )
                  }
                >
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Compartir por WhatsApp
                </Button>
                <Button
                  variant="outline"
                  className="w-full border-white/10 bg-transparent text-white hover:bg-white/5"
                  onClick={() => void handleCopyLink(savedColegaLink.url)}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copiar link
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {errorMessage && (
          <Card className="border-amber-500/40 bg-amber-50 shadow-sm">
            <CardContent className="p-4 text-sm text-amber-900">{errorMessage}</CardContent>
          </Card>
        )}

        {loading ? (
          <Card className="border border-white/10 bg-white/[0.04] text-white shadow-sm backdrop-blur-xl">
            <CardContent className="flex items-center gap-2 p-6 text-sm text-zinc-300">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando propiedades...
            </CardContent>
          </Card>
        ) : properties.length === 0 ? (
          <Card className="border border-dashed border-white/10 bg-white/[0.04] text-white shadow-sm backdrop-blur-xl">
            <CardContent className="px-6 py-10 text-center">
              <Building2 className="mx-auto mb-3 h-8 w-8 text-zinc-400" />
              <p className="font-medium text-white">No hay propiedades cargadas.</p>
              <p className="mt-1 text-sm text-zinc-300">Agregá tu primera propiedad.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {properties.map((property) => {
              const locationLabel = [property.department, property.zone].filter(Boolean).join(" · ") || "Sin zona";
              const photosLink = extractPhotosLink(property);
              const colegaLink = buildPropertyColegaLink(property);
              const visibleNotes = stripPhotosLinkFromNotes(property.notes);

              return (
                <Card key={property.id} className="border border-white/10 bg-white/[0.04] text-white shadow-sm backdrop-blur-xl">
                  <CardContent className="p-5 space-y-4">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <h2 className="text-lg font-semibold text-white">{property.title}</h2>
                        <div className="flex flex-wrap gap-2">
                          {property.operation && (
                            <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-200">
                              {property.operation}
                            </Badge>
                          )}
                          {photosLink && (
                            <Badge variant="outline" className="border-white/15 bg-white/10 text-white">
                              Link de fotos
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 text-xs text-zinc-300">
                        {property.type && <span className="rounded-full bg-white/5 px-2.5 py-1">{property.type}</span>}
                        {property.price && <span className="rounded-full bg-white/5 px-2.5 py-1">{property.price}</span>}
                        <span className="rounded-full bg-white/5 px-2.5 py-1">{locationLabel}</span>
                      </div>
                    </div>

                    <div className="space-y-2 rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-zinc-300">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-zinc-500" />
                        <span>{property.type || "Tipo sin definir"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CircleDollarSign className="h-4 w-4 text-zinc-500" />
                        <span>{property.price ? `${property.price} USD` : "Precio sin definir"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-zinc-500" />
                        <span>{locationLabel}</span>
                      </div>
                      {property.url && (
                        <div className="flex items-center gap-2 break-all text-zinc-400">
                          <Link2 className="h-4 w-4 text-zinc-500" />
                          <span>{property.url}</span>
                        </div>
                      )}
                      {photosLink && (
                        <div className="flex items-center gap-2 break-all text-zinc-400">
                          <Link2 className="h-4 w-4 text-zinc-500" />
                          <span>Fotos: {photosLink}</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-sm text-zinc-100">
                      <div className="flex items-center gap-2 text-emerald-100">
                        <Sparkles className="h-4 w-4" />
                        <p className="text-xs uppercase tracking-[0.18em]">Tu link colega</p>
                      </div>
                      <p className="break-all font-mono text-sm text-white">
                        {colegaLink || "Aplicá la migración de auto_id para generar el link automáticamente."}
                      </p>
                    </div>

                    {visibleNotes && (
                      <p className="text-sm text-zinc-300">{visibleNotes}</p>
                    )}

                    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                      <Button
                        variant="outline"
                        className="w-full border-emerald-500/30 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/20"
                        onClick={() => handleShareWhatsApp(property)}
                        disabled={!colegaLink}
                      >
                        <MessageCircle className="mr-2 h-4 w-4" />
                        Compartir por WhatsApp
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full border-white/10 bg-transparent text-white hover:bg-white/5"
                        onClick={() => void handleCopyLink(colegaLink)}
                        disabled={!colegaLink}
                      >
                        <Copy className="mr-2 h-4 w-4" />
                        Copiar link
                      </Button>
                      <Button variant="outline" className="w-full border-white/10 bg-transparent text-white hover:bg-white/5" onClick={() => openEditDialog(property)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Editar
                      </Button>
                      <Button variant="outline" className="w-full border-red-500/30 bg-transparent text-red-200 hover:bg-red-500/10 hover:text-red-100" onClick={() => void handleDelete(property)}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Eliminar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      <Dialog
        open={isAddOpen}
        onOpenChange={(open) => {
          setIsAddOpen(open);
          if (!open && !saving) {
            resetForm();
          }
        }}
      >
        <DialogContent className="fixed inset-0 h-full max-h-full w-full max-w-full translate-x-0 translate-y-0 overflow-y-auto overscroll-y-contain rounded-none border-0 bg-zinc-950 text-white sm:inset-auto sm:left-1/2 sm:top-1/2 sm:h-auto sm:max-h-[90vh] sm:max-w-2xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl sm:border sm:border-white/10">
          <DialogHeader>
            <DialogTitle>{editingProperty ? "Editar propiedad" : "Agregar propiedad"}</DialogTitle>
            <DialogDescription className="text-zinc-300">
              {editingProperty
                ? "Corregí los datos de la propiedad y guardá los cambios."
                : "Completá los datos y guardá la propiedad en Supabase. La URL del portal es opcional y tu borrador queda guardado automáticamente."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="property-title">Título *</Label>
              <div className="relative">
                <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <Input
                  id="property-title"
                  value={form.title}
                  onChange={handleChange("title")}
                  placeholder="Ej: Apto frente al mar en Punta del Este"
                  className={inputWithIconClassName}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="property-type">Tipo</Label>
                <Select value={form.type} onValueChange={handleSelectChange("type")}>
                  <SelectTrigger id="property-type" className={selectTriggerClassName}>
                    <SelectValue placeholder="Seleccioná un tipo" />
                  </SelectTrigger>
                  <SelectContent className={selectContentClassName}>
                    {propertyTypeOptions.map((option) => (
                      <SelectItem key={option} value={option}>{option}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="property-operation">Operación</Label>
                <Select value={form.operation} onValueChange={handleSelectChange("operation")}>
                  <SelectTrigger id="property-operation" className={selectTriggerClassName}>
                    <SelectValue placeholder="Seleccioná una operación" />
                  </SelectTrigger>
                  <SelectContent className={selectContentClassName}>
                    {operationOptions.map((option) => (
                      <SelectItem key={option} value={option}>{option}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="property-price">Precio (USD)</Label>
              <div className="relative">
                <CircleDollarSign className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <PriceCombobox value={form.price} onChange={(value) => setForm((current) => ({ ...current, price: value }))} options={priceOptions} />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="property-department">Departamento</Label>
                <Select value={form.department} onValueChange={handleDepartmentChange}>
                  <SelectTrigger id="property-department" className={selectTriggerClassName}>
                    <SelectValue placeholder="Seleccioná un departamento" />
                  </SelectTrigger>
                  <SelectContent className={selectContentClassName}>
                    {departmentOptions.map((option) => (
                      <SelectItem key={option} value={option}>{option}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="property-zone">Zona</Label>
                <div className="relative">
                  <MapPin className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                  <Select value={form.zone} onValueChange={handleSelectChange("zone")} disabled={!form.department}>
                    <SelectTrigger id="property-zone" className={selectWithIconClassName}>
                      <SelectValue placeholder={form.department ? "Seleccioná una zona" : "Primero elegí un departamento"} />
                    </SelectTrigger>
                    <SelectContent className={selectContentClassName}>
                      {availableZones.map((option) => (
                        <SelectItem key={option} value={option}>{option}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="property-url">URL del portal (opcional)</Label>
              <div className="relative">
                <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <Input
                  id="property-url"
                  value={form.url}
                  onChange={handleChange("url")}
                  placeholder="https://portal.com/propiedad/123"
                  className={inputWithIconClassName}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="property-photos-link">Link de fotos (opcional)</Label>
              <div className="relative">
                <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <Input
                  id="property-photos-link"
                  value={form.photos_link}
                  onChange={handleChange("photos_link")}
                  placeholder="Ej: link de Google Drive, Dropbox o galería del portal"
                  className={inputWithIconClassName}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="property-notes">Notas</Label>
              <Textarea
                id="property-notes"
                value={form.notes}
                onChange={handleChange("notes")}
                placeholder="Detalles, amenities, observaciones..."
                className="min-h-28 border-white/10 bg-black/30 text-white placeholder:text-zinc-500"
              />
            </div>

            <DialogFooter className="sticky bottom-0 z-10 -mx-6 flex-row gap-2 border-t border-white/10 bg-zinc-950/95 px-6 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-4 backdrop-blur sm:-mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:pb-0 sm:pt-0">
              <Button type="button" variant="secondary" className="flex-1 sm:flex-none" onClick={() => setIsAddOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="flex-1 bg-white text-black hover:bg-zinc-200 sm:flex-none" disabled={saving || !supabaseReady}>
                {saving ? "Guardando..." : editingProperty ? "Guardar cambios" : "Guardar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
