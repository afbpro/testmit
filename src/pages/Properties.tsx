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
  Search,
  Trash2,
  X,
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
import { formatSmartText } from "@/lib/utils";

const propertyTypeOptions = ["Apartamento", "Casa", "Local", "Terreno", "Campo"] as const;
const operationOptions = ["Venta", "Alquiler temporal", "Alquiler anual", "Alquiler invernal"] as const;
const departmentOptions = ["Maldonado", "Rocha"] as const;
const PROPERTY_DRAFT_STORAGE_KEY = "colega-linker-property-draft";
const COLEGA_AGENCY_ID = 584;

type PropertyTypeOption = (typeof propertyTypeOptions)[number];
type OperationOption = (typeof operationOptions)[number];
type DepartmentOption = (typeof departmentOptions)[number];
type PropertyFilterOption = "all" | OperationOption;

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

function extractMetaContent(document: Document, selectors: string[]) {
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    const content = element?.getAttribute("content")?.trim() || element?.textContent?.trim();

    if (content) {
      return content;
    }
  }

  return "";
}

function inferPropertyTypeFromText(text: string): PropertyTypeOption | "" {
  const normalizedText = text.toLowerCase();

  if (normalizedText.includes("apartamento") || normalizedText.includes("apto")) {
    return "Apartamento";
  }

  if (normalizedText.includes("casa")) {
    return "Casa";
  }

  if (normalizedText.includes("local")) {
    return "Local";
  }

  if (normalizedText.includes("terreno") || normalizedText.includes("lote")) {
    return "Terreno";
  }

  if (normalizedText.includes("campo") || normalizedText.includes("chacra")) {
    return "Campo";
  }

  return "";
}

function inferOperationFromText(text: string): OperationOption | "" {
  const normalizedText = text.toLowerCase();

  if (normalizedText.includes("alquiler temporal") || normalizedText.includes("alquiler temporario") || normalizedText.includes("temporada")) {
    return "Alquiler temporal";
  }

  if (normalizedText.includes("alquiler anual")) {
    return "Alquiler anual";
  }

  if (normalizedText.includes("alquiler invernal") || normalizedText.includes("invernal")) {
    return "Alquiler invernal";
  }

  if (normalizedText.includes("venta")) {
    return "Venta";
  }

  return "";
}

function extractPriceFromText(text: string) {
  const match = text.match(/(?:u\$s|usd|us\$|\$)\s*([\d.]+(?:,\d+)?)/i);
  return match?.[1]?.trim() ?? "";
}

function inferLocationFromText(text: string) {
  const normalizedText = text.toLowerCase();

  for (const department of departmentOptions) {
    const zoneMatch = zoneOptionsByDepartment[department].find((zone) => normalizedText.includes(zone.toLowerCase()));

    if (zoneMatch) {
      return { department, zone: zoneMatch };
    }
  }

  if (normalizedText.includes("maldonado")) {
    return { department: "Maldonado" as DepartmentOption, zone: "" };
  }

  if (normalizedText.includes("rocha")) {
    return { department: "Rocha" as DepartmentOption, zone: "" };
  }

  return { department: "" as DepartmentOption | "", zone: "" };
}

function normalizeSearchText(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
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
  const [editingProperty, setEditingProperty] = useState<PropertyRecord | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [operationFilter, setOperationFilter] = useState<PropertyFilterOption>("all");
  const [importingFromUrl, setImportingFromUrl] = useState(false);

  const availableZones = form.department ? zoneOptionsByDepartment[form.department] : [];
  const propertyCountLabel = loading
    ? "Cargando propiedades..."
    : `${properties.length} ${properties.length === 1 ? "propiedad cargada" : "propiedades cargadas"}`;

  const operationCountMap = useMemo(
    () =>
      Object.fromEntries(
        operationOptions.map((option) => [option, properties.filter((property) => property.operation === option).length]),
      ) as Record<OperationOption, number>,
    [properties],
  );
  const hasActiveFilters = searchQuery.trim().length > 0 || operationFilter !== "all";

  const filteredProperties = useMemo(() => {
    const normalizedQuery = normalizeSearchText(searchQuery.trim());

    return properties.filter((property) => {
      const matchesOperation = operationFilter === "all" || property.operation === operationFilter;

      if (!matchesOperation) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const searchableText = normalizeSearchText(
        [
          property.title,
          property.type,
          property.operation,
          property.price,
          property.department,
          property.zone,
          stripPhotosLinkFromNotes(property.notes),
        ]
          .filter(Boolean)
          .join(" "),
      );

      return searchableText.includes(normalizedQuery);
    });
  }, [properties, searchQuery, operationFilter]);

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
    const mode = field === "title" ? "title" : field === "notes" ? "sentence" : "none";

    setForm((current) => ({
      ...current,
      [field]: formatSmartText(event.target.value, mode),
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

  const handleImportFromUrl = async () => {
    if (!form.url.trim()) {
      toast.error("Pegá primero un enlace del portal.");
      return;
    }

    setImportingFromUrl(true);

    try {
      const normalizedUrl = normalizePortalUrl(form.url);
      const attempts = [
        `https://api.allorigins.win/raw?url=${encodeURIComponent(normalizedUrl)}`,
        normalizedUrl,
      ];

      let html = "";

      for (const attempt of attempts) {
        try {
          const response = await fetch(attempt);

          if (response.ok) {
            html = await response.text();
            if (html.trim()) {
              break;
            }
          }
        } catch {
          // try next attempt
        }
      }

      if (!html) {
        throw new Error("No se pudo leer el enlace.");
      }

      const document = new DOMParser().parseFromString(html, "text/html");
      const title =
        extractMetaContent(document, [
          'meta[property="og:title"]',
          'meta[name="twitter:title"]',
          "title",
        ]) || form.title;
      const description = extractMetaContent(document, [
        'meta[property="og:description"]',
        'meta[name="description"]',
      ]);
      const bodyText = `${title} ${description} ${document.body?.textContent ?? ""}`.replace(/\s+/g, " ").trim();
      const inferredType = inferPropertyTypeFromText(bodyText);
      const inferredOperation = inferOperationFromText(bodyText);
      const inferredPrice = extractPriceFromText(bodyText);
      const inferredLocation = inferLocationFromText(bodyText);

      setForm((current) => ({
        ...current,
        url: normalizedUrl,
        title: title || current.title,
        type: inferredType || current.type,
        operation: inferredOperation || current.operation,
        price: inferredPrice || current.price,
        department: inferredLocation.department || current.department,
        zone: inferredLocation.zone || current.zone,
        photos_link: current.photos_link || normalizedUrl,
        notes: current.notes || description || current.notes,
      }));

      toast.success("Info extraída del enlace.");
    } catch {
      toast.error("No pude extraer la info automáticamente. Podés completar los campos manualmente.");
    } finally {
      setImportingFromUrl(false);
    }
  };

  const openEditDialog = (property: PropertyRecord) => {
    setEditingProperty(property);
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

    setProperties((current) =>
      wasEditing
        ? current.map((item) => (item.id === savedProperty.id ? savedProperty : item))
        : [savedProperty, ...current],
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
                  setIsAddOpen(true);
                }}
              >
                <Building2 className="h-4 w-4" />
                Agregar propiedad
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-white/10 bg-white/[0.04] text-white shadow-sm backdrop-blur-xl">
          <CardContent className="space-y-3 p-4">
            <div className="flex flex-col gap-3 md:flex-row">
              <div className="relative flex-1 rounded-2xl border border-white/10 bg-black/30 shadow-inner shadow-black/20">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Buscar por título, zona, precio o comentario"
                  className="h-11 border-0 bg-transparent pl-10 text-white placeholder:text-zinc-500 focus-visible:ring-1 focus-visible:ring-white/20"
                />
              </div>

              <div className="flex gap-2 md:w-auto">
                <div className="min-w-0 flex-1 md:w-[260px] md:flex-none">
                  <Select value={operationFilter} onValueChange={(value) => setOperationFilter(value as PropertyFilterOption)}>
                    <SelectTrigger className={selectTriggerClassName}>
                      <SelectValue placeholder="Filtrar por operación" />
                    </SelectTrigger>
                    <SelectContent className={selectContentClassName}>
                      <SelectItem value="all">Todas ({properties.length})</SelectItem>
                      {operationOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option} ({operationCountMap[option]})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {hasActiveFilters && (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 shrink-0 border-white/10 bg-transparent text-white hover:bg-white/5"
                    onClick={() => {
                      setSearchQuery("");
                      setOperationFilter("all");
                    }}
                  >
                    Limpiar
                  </Button>
                )}
              </div>
            </div>

            <p className="text-sm text-zinc-300">
              Mostrando <span className="font-medium text-white">{filteredProperties.length}</span> de <span className="font-medium text-white">{properties.length}</span> propiedades.
            </p>
          </CardContent>
        </Card>

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
        ) : filteredProperties.length === 0 ? (
          <Card className="border border-dashed border-white/10 bg-white/[0.04] text-white shadow-sm backdrop-blur-xl">
            <CardContent className="px-6 py-10 text-center">
              <Search className="mx-auto mb-3 h-8 w-8 text-zinc-400" />
              <p className="font-medium text-white">No encontramos propiedades con ese filtro.</p>
              <p className="mt-1 text-sm text-zinc-300">Probá buscando otro texto o cambiando la operación.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {filteredProperties.map((property) => {
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

                    {colegaLink ? (
                      <div className="flex justify-end rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 p-3 text-sm text-emerald-50 shadow-inner shadow-emerald-950/10">
                        <Button
                          type="button"
                          variant="secondary"
                          className="h-9 border border-white/10 bg-black/30 text-white hover:bg-black/40"
                          onClick={() => void handleCopyLink(colegaLink)}
                        >
                          <Copy className="mr-2 h-4 w-4" />
                          Copiar link colega
                        </Button>
                      </div>
                    ) : (
                      <p className="rounded-xl border border-dashed border-white/10 bg-black/20 px-3 py-2 text-xs text-zinc-400">
                        Aplicá la migración de auto_id para generar el link colega automáticamente.
                      </p>
                    )}

                    {visibleNotes && (
                      <p className="text-sm text-zinc-300">{visibleNotes}</p>
                    )}

                    <div className="grid gap-2 sm:grid-cols-3">
                      <Button
                        variant="outline"
                        className="h-11 w-full justify-center border-emerald-500/30 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/20"
                        onClick={() => handleShareWhatsApp(property)}
                        disabled={!colegaLink}
                      >
                        <MessageCircle className="mr-2 h-4 w-4" />
                        Compartir por WhatsApp
                      </Button>
                      <Button variant="outline" className="h-11 w-full border-white/10 bg-transparent text-white hover:bg-white/5" onClick={() => openEditDialog(property)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Editar
                      </Button>
                      <Button variant="outline" className="h-11 w-full border-red-500/30 bg-transparent text-red-200 hover:bg-red-500/10 hover:text-red-100" onClick={() => void handleDelete(property)}>
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
                <Input
                  id="property-price"
                  value={form.price}
                  onChange={handleChange("price")}
                  placeholder="Ej: 250000 o 1200"
                  className={inputWithIconClassName}
                />
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
              <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
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
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 border-white/10 bg-transparent text-white hover:bg-white/5"
                  onClick={() => void handleImportFromUrl()}
                  disabled={importingFromUrl || !form.url.trim()}
                >
                  {importingFromUrl ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Link2 className="mr-2 h-4 w-4" />}
                  Traer info
                </Button>
              </div>
              <p className="text-xs text-zinc-400">
                Pegá un enlace del portal y vamos a intentar completar título, tipo, operación, precio y zona automáticamente.
              </p>
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
