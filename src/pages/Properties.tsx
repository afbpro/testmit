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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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

const propertyTypeOptions = [
  "Apartamento",
  "Casa",
  "Campo",
  "Chacra",
  "Cochera",
  "Galpón",
  "Hotel",
  "Local",
  "Oficina",
  "Terreno",
  "Edificio",
  "Barrio Privado",
  "Tasación",
] as const;
const operationOptions = ["Venta", "Alquiler", "Ambas"] as const;
const countryOptions = ["Uruguay"] as const;
const departmentOptions = [
  "Artigas",
  "Canelones",
  "Cerro Largo",
  "Colonia",
  "Durazno",
  "Flores",
  "Florida",
  "Lavalleja",
  "Maldonado",
  "Montevideo",
  "Paysandu",
  "Rio Negro",
  "Rivera",
  "Rocha",
  "Salto",
  "San Jose",
  "Soriano",
  "Tacuarembo",
  "Treinta y Tres",
] as const;
const triStateOptions = ["----", "Sí", "No"] as const;
const houseTypeOptions = ["Casa", "Quinta", "Chalet", "Villa", "Duplex", "Triplex"] as const;
const viewOptions = ["----", "Al mar", "A la laguna", "Al campo", "A la sierra", "Al río", "A la ciudad"] as const;
const orientationOptions = ["----", "Norte", "Sur", "Este", "Oeste", "Noreste", "Noroeste", "Sureste", "Suroeste"] as const;
const dispositionOptions = ["----", "Frente", "Contrafrente", "Lateral", "Interno"] as const;
const statusOptions = ["Disponible", "Reservado", "Vendido", "Alquilado", "Fuera de mercado"] as const;
const yesNoOptions = ["No", "Sí"] as const;
const dormitoriosOptions = ["1", "2", "3", "4", "5+"] as const;
const banosOptions = ["1", "2", "3+"] as const;
const cocheraOptions = ["No", "1", "2", "3+"] as const;
const garageOptions = ["No", "Sí", "Simple", "Doble"] as const;
const pricePresetOptions = [
  "50000",
  "75000",
  "100000",
  "150000",
  "200000",
  "250000",
  "300000",
  "400000",
  "500000",
  "1000",
  "1500",
  "2000",
  "2500",
  "3000",
] as const;
const PROPERTY_DRAFT_STORAGE_KEY = "colega-linker-property-draft";
const COLEGA_AGENCY_ID = 584;

type PropertyTypeOption = (typeof propertyTypeOptions)[number];
type OperationOption = (typeof operationOptions)[number];
type DepartmentOption = (typeof departmentOptions)[number];
type CountryOption = (typeof countryOptions)[number];
type PropertyFilterOption = "all" | OperationOption;

const cityOptionsByDepartment: Record<DepartmentOption, readonly string[]> = {
  Artigas: ["Artigas", "Bella Union"],
  Canelones: ["Ciudad de la Costa", "Pando", "Las Piedras", "La Floresta", "Atlantida"],
  "Cerro Largo": ["Melo", "Rio Branco"],
  Colonia: ["Colonia del Sacramento", "Carmelo", "Nueva Helvecia"],
  Durazno: ["Durazno", "Sarandi del Yi"],
  Flores: ["Trinidad", "Ismael Cortinas"],
  Florida: ["Florida", "Sarandi Grande"],
  Lavalleja: ["Minas", "Jose Pedro Varela"],
  Maldonado: ["Maldonado", "Punta del Este", "San Carlos", "Piriapolis", "La Barra", "Manantiales", "Jose Ignacio"],
  Montevideo: ["Montevideo"],
  Paysandu: ["Paysandu", "Guichon"],
  "Rio Negro": ["Fray Bentos", "Young"],
  Rivera: ["Rivera", "Tranqueras"],
  Rocha: ["Rocha", "La Paloma", "La Pedrera", "Punta del Diablo", "Aguas Dulces", "Chuy"],
  Salto: ["Salto", "Constitucion"],
  "San Jose": ["San Jose de Mayo", "Ciudad del Plata"],
  Soriano: ["Mercedes", "Dolores"],
  Tacuarembo: ["Tacuarembo", "Paso de los Toros"],
  "Treinta y Tres": ["Treinta y Tres", "Vergara"],
};

const neighborhoodOptionsByCity: Record<string, readonly string[]> = {
  "Punta del Este": ["Península", "Brava", "Mansa", "Aidy Grill", "San Rafael"],
  Maldonado: ["Centro", "Pinares", "La Sonrisa", "Jardín Los 33", "Beverly Hills"],
  "Ciudad de la Costa": ["Shangrila", "Solymar", "Lagomar", "El Pinar"],
  Montevideo: ["Pocitos", "Punta Carretas", "Carrasco", "Centro", "Cordón", "Malvin"],
  Rocha: ["Centro", "La Aguada", "La Riviera"],
  "La Paloma": ["Anaconda", "Bahia Grande", "Centro"],
  "La Pedrera": ["Centro", "Punta Rubia", "Barrancas"],
  "Punta del Diablo": ["La Viuda", "Rivero", "Pueblo"],
};

const fieldClassName = "h-11 border-white/10 bg-black/30 text-white placeholder:text-zinc-500";
const inputWithIconClassName = `${fieldClassName} pl-10`;
const selectTriggerClassName = "h-11 border-white/10 bg-black/30 text-white";
const selectWithIconClassName = `${selectTriggerClassName} pl-10`;
const selectContentClassName = "border-white/10 bg-zinc-950 text-white";

const initialPropertyForm = {
  country: "Uruguay" as CountryOption,
  title: "",
  comentario: "",
  property_type_detail: "" as PropertyTypeOption | "",
  operation: "" as OperationOption | "",
  department: "" as DepartmentOption | "",
  city: "",
  barrio_zona: "",
  manzana: "",
  padron: "",
  solar: "",
  parada: "",
  phone_number: "",
  address: "",
  door_number: "",
  vista: "----" as (typeof viewOptions)[number],
  house_type: "" as (typeof houseTypeOptions)[number] | "",
  orientacion: "----" as (typeof orientationOptions)[number],
  disposicion: "----" as (typeof dispositionOptions)[number],
  distancia_mar_mts: "",
  frente_mar: "----" as (typeof triStateOptions)[number],
  precio_venta: "",
  precio_alquiler: "",
  en_venta: "Sí" as (typeof yesNoOptions)[number],
  en_alquiler: "No" as (typeof yesNoOptions)[number],
  estado_prop: "Disponible" as (typeof statusOptions)[number],
  url: "",
  ambientes: "",
  dormitorios: "" as (typeof dormitoriosOptions)[number] | "",
  banos: "" as (typeof banosOptions)[number] | "",
  bano_servicio: "No" as (typeof yesNoOptions)[number],
  cochera: "No" as (typeof cocheraOptions)[number],
  garage: "No" as (typeof garageOptions)[number],
  plantas: "",
  sup_terreno: "",
  sup_cubierta: "",
  sup_semi_cubierta: "",
  terraza: "No" as (typeof yesNoOptions)[number],
  propiedad_horizontal: "No" as (typeof yesNoOptions)[number],
  piscina: "No" as (typeof yesNoOptions)[number],
  precio_escritura: "",
  precio_libre: "",
  precio_tasacion: "",
  vigencia_venta: "",
  vigencia_alquiler: "",
  precio_portales: "",
  nota_alquiler: "",
  permuta: "No" as (typeof yesNoOptions)[number],
  descripcion: "",
  video_url: "",
  matterport_url: "",
  cartel: "----" as (typeof triStateOptions)[number],
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

function buildPropertyNotes(notes: string) {
  return notes.trim() || null;
}

function stripPhotosLinkFromNotes(notes: string | null | undefined) {
  return (notes ?? "").trim();
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

  if (normalizedText.includes("oficina")) {
    return "Oficina";
  }

  if (normalizedText.includes("terreno") || normalizedText.includes("lote")) {
    return "Terreno";
  }

  if (normalizedText.includes("chacra")) {
    return "Chacra";
  }

  if (normalizedText.includes("campo")) {
    return "Campo";
  }

  return "";
}

function inferOperationFromText(text: string): OperationOption | "" {
  const normalizedText = text.toLowerCase();

  const hasVenta = normalizedText.includes("venta");
  const hasAlquiler = normalizedText.includes("alquiler");

  if (hasVenta && hasAlquiler) {
    return "Ambas";
  }

  if (hasAlquiler) {
    return "Alquiler";
  }

  if (hasVenta) {
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
    const cityMatch = cityOptionsByDepartment[department].find((city) => normalizedText.includes(city.toLowerCase()));

    if (cityMatch) {
      const neighborhoodMatch = neighborhoodOptionsByCity[cityMatch]?.find((item) =>
        normalizedText.includes(item.toLowerCase()),
      );
      return { department, city: cityMatch, barrio_zona: neighborhoodMatch ?? "" };
    }
  }

  if (normalizedText.includes("maldonado")) {
    return { department: "Maldonado" as DepartmentOption, city: "", barrio_zona: "" };
  }

  if (normalizedText.includes("rocha")) {
    return { department: "Rocha" as DepartmentOption, city: "", barrio_zona: "" };
  }

  return { department: "" as DepartmentOption | "", city: "", barrio_zona: "" };
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

  const availableCities = form.department ? cityOptionsByDepartment[form.department] : [];
  const availableNeighborhoods = form.city ? neighborhoodOptionsByCity[form.city] ?? [] : [];
  const operationIncludesVenta = form.operation === "Venta" || form.operation === "Ambas";
  const operationIncludesAlquiler = form.operation === "Alquiler" || form.operation === "Ambas";
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
          property.property_type_detail,
          property.type,
          property.operation,
          property.precio_venta,
          property.precio_alquiler,
          property.price,
          property.country,
          property.department,
          property.city,
          property.barrio_zona,
          property.zone,
          property.estado_prop,
          property.descripcion,
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
    const mode =
      field === "title"
        ? "title"
        : field === "descripcion" || field === "notes" || field === "nota_alquiler"
          ? "sentence"
          : field === "video_url" || field === "matterport_url" || field === "url"
            ? "email"
            : "none";

    setForm((current) => ({
      ...current,
      [field]: formatSmartText(event.target.value, mode),
    }));
  };

  const handleSelectChange = (field: keyof typeof initialPropertyForm) => (value: string) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleDepartmentChange = (value: string) => {
    setForm((current) => ({
      ...current,
      department: value as DepartmentOption,
      city: "",
      barrio_zona: "",
    }));
  };

  const handleCityChange = (value: string) => {
    setForm((current) => ({
      ...current,
      city: value,
      barrio_zona: "",
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
        comentario: current.comentario || description || current.comentario,
        property_type_detail: inferredType || current.property_type_detail,
        operation: inferredOperation || current.operation,
        precio_venta: operationIncludesVenta ? current.precio_venta : inferredPrice || current.precio_venta,
        precio_alquiler: operationIncludesAlquiler ? current.precio_alquiler : current.precio_alquiler,
        department: inferredLocation.department || current.department,
        city: inferredLocation.city || current.city,
        barrio_zona: inferredLocation.barrio_zona || current.barrio_zona,
        descripcion: current.descripcion || description || current.descripcion,
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
      comentario: property.comentario || "",
      country: (property.country as CountryOption) || "Uruguay",
      property_type_detail: (property.property_type_detail as PropertyTypeOption) || (property.type as PropertyTypeOption) || "",
      operation: (property.operation as OperationOption) || "",
      department: (property.department as DepartmentOption) || "",
      city: property.city || "",
      barrio_zona: property.barrio_zona || property.zone || "",
      manzana: property.manzana || "",
      padron: property.padron || "",
      solar: property.solar || "",
      parada: property.parada || "",
      phone_number: property.phone_number || "",
      address: property.address || "",
      door_number: property.door_number || "",
      vista: (property.vista as (typeof viewOptions)[number]) || "----",
      house_type: (property.house_type as (typeof houseTypeOptions)[number]) || "",
      orientacion: (property.orientacion as (typeof orientationOptions)[number]) || "----",
      disposicion: (property.disposicion as (typeof dispositionOptions)[number]) || "----",
      distancia_mar_mts: property.distancia_mar_mts ? String(property.distancia_mar_mts) : "",
      frente_mar: (property.frente_mar as (typeof triStateOptions)[number]) || "----",
      precio_venta: property.precio_venta || "",
      precio_alquiler: property.precio_alquiler || "",
      en_venta: (property.en_venta as (typeof yesNoOptions)[number]) || "No",
      en_alquiler: (property.en_alquiler as (typeof yesNoOptions)[number]) || "No",
      estado_prop: (property.estado_prop as (typeof statusOptions)[number]) || "Disponible",
      url: property.url || "",
      ambientes: property.ambientes ? String(property.ambientes) : "",
      dormitorios: (property.dormitorios as (typeof dormitoriosOptions)[number]) || "",
      banos: (property.banos as (typeof banosOptions)[number]) || "",
      bano_servicio: (property.bano_servicio as (typeof yesNoOptions)[number]) || "No",
      cochera: (property.cochera as (typeof cocheraOptions)[number]) || "No",
      garage: (property.garage as (typeof garageOptions)[number]) || "No",
      plantas: property.plantas ? String(property.plantas) : "",
      sup_terreno: property.sup_terreno ? String(property.sup_terreno) : "",
      sup_cubierta: property.sup_cubierta ? String(property.sup_cubierta) : "",
      sup_semi_cubierta: property.sup_semi_cubierta ? String(property.sup_semi_cubierta) : "",
      terraza: (property.terraza as (typeof yesNoOptions)[number]) || "No",
      propiedad_horizontal: (property.propiedad_horizontal as (typeof yesNoOptions)[number]) || "No",
      piscina: (property.piscina as (typeof yesNoOptions)[number]) || "No",
      precio_escritura: property.precio_escritura || "",
      precio_libre: property.precio_libre || "",
      precio_tasacion: property.precio_tasacion || "",
      vigencia_venta: property.vigencia_venta || "",
      vigencia_alquiler: property.vigencia_alquiler || "",
      precio_portales: property.precio_portales || "",
      nota_alquiler: property.nota_alquiler || "",
      permuta: (property.permuta as (typeof yesNoOptions)[number]) || "No",
      descripcion: property.descripcion || "",
      video_url: property.video_url || "",
      matterport_url: property.matterport_url || "",
      cartel: (property.cartel as (typeof triStateOptions)[number]) || "----",
      notes: stripPhotosLinkFromNotes(property.notes),
    });
    setIsAddOpen(true);
  };

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.property_type_detail || !form.operation) {
      toast.error("Completá Tipo de Propiedad y Operación");
      return;
    }

    if (!supabase) {
      toast.error("Configurá Supabase para guardar propiedades");
      return;
    }

    const parseIntegerOrNull = (value: string) => {
      if (!value.trim()) {
        return null;
      }

      const parsed = Number.parseInt(value, 10);
      return Number.isNaN(parsed) ? null : parsed;
    };

    const parseNumericOrNull = (value: string) => {
      if (!value.trim()) {
        return null;
      }

      const normalized = value.replace(/,/g, ".");
      const parsed = Number.parseFloat(normalized);
      return Number.isNaN(parsed) ? null : parsed;
    };

    const safeTitle =
      form.title.trim() || `${form.property_type_detail} ${form.barrio_zona || form.city || ""}`.trim() || "Propiedad";

    setSaving(true);
    const payload = {
      title: safeTitle,
      comentario: form.comentario.trim() || null,
      country: form.country,
      type: form.property_type_detail || null,
      property_type_detail: form.property_type_detail || null,
      operation: form.operation || null,
      price: form.precio_venta.trim() || form.precio_alquiler.trim() || null,
      barrio_zona: form.barrio_zona || null,
      manzana: form.manzana.trim() || null,
      padron: form.padron.trim() || null,
      solar: form.solar.trim() || null,
      parada: form.parada.trim() || null,
      phone_number: form.phone_number.trim() || null,
      address: form.address.trim() || null,
      door_number: form.door_number.trim() || null,
      vista: form.vista === "----" ? null : form.vista,
      house_type: form.house_type || null,
      orientacion: form.orientacion === "----" ? null : form.orientacion,
      disposicion: form.disposicion === "----" ? null : form.disposicion,
      distancia_mar_mts: parseIntegerOrNull(form.distancia_mar_mts),
      frente_mar: form.frente_mar === "----" ? null : form.frente_mar,
      precio_venta: form.precio_venta.trim() || null,
      precio_alquiler: form.precio_alquiler.trim() || null,
      en_venta: form.en_venta,
      en_alquiler: form.en_alquiler,
      estado_prop: form.estado_prop,
      department: form.department || null,
      city: form.city || null,
      zone: form.barrio_zona || null,
      url: form.url.trim() ? normalizePortalUrl(form.url) : null,
      ambientes: parseIntegerOrNull(form.ambientes),
      dormitorios: form.dormitorios || null,
      banos: form.banos || null,
      bano_servicio: form.bano_servicio,
      cochera: form.cochera,
      garage: form.garage,
      plantas: parseIntegerOrNull(form.plantas),
      sup_terreno: parseNumericOrNull(form.sup_terreno),
      sup_cubierta: parseNumericOrNull(form.sup_cubierta),
      sup_semi_cubierta: parseNumericOrNull(form.sup_semi_cubierta),
      terraza: form.terraza,
      propiedad_horizontal: form.propiedad_horizontal,
      piscina: form.piscina,
      precio_escritura: form.precio_escritura.trim() || null,
      precio_libre: form.precio_libre.trim() || null,
      precio_tasacion: form.precio_tasacion.trim() || null,
      vigencia_venta: form.vigencia_venta || null,
      vigencia_alquiler: form.vigencia_alquiler || null,
      precio_portales: form.precio_portales.trim() || null,
      nota_alquiler: form.nota_alquiler.trim() || null,
      permuta: form.permuta,
      descripcion: form.descripcion.trim() || null,
      video_url: form.video_url.trim() || null,
      matterport_url: form.matterport_url.trim() || null,
      cartel: form.cartel === "----" ? null : form.cartel,
      notes: buildPropertyNotes(form.notes),
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
      [property.department, property.city, property.barrio_zona || property.zone].filter(Boolean).join(" · ") || null,
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
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="border-white/20 bg-white/10 text-white">
                    Cupertino
                  </Badge>
                  <Badge variant="outline" className="border-emerald-400/35 bg-emerald-500/10 text-emerald-200">
                    Sync formato v2
                  </Badge>
                </div>
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
                  navigate("/propiedades/nueva");
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
              const locationLabel =
                [property.department, property.city, property.barrio_zona || property.zone].filter(Boolean).join(" · ") ||
                "Sin zona";
              const colegaLink = buildPropertyColegaLink(property);
              const visibleNotes = property.descripcion || stripPhotosLinkFromNotes(property.notes);

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
                          {property.estado_prop && (
                            <Badge variant="outline" className="border-white/15 bg-white/10 text-white">
                              {property.estado_prop}
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 text-xs text-zinc-300">
                        {(property.property_type_detail || property.type) && <span className="rounded-full bg-white/5 px-2.5 py-1">{property.property_type_detail || property.type}</span>}
                        {(property.precio_venta || property.precio_alquiler || property.price) && (
                          <span className="rounded-full bg-white/5 px-2.5 py-1">
                            {property.precio_venta ? `Venta: ${property.precio_venta}` : property.precio_alquiler ? `Alquiler: ${property.precio_alquiler}` : property.price}
                          </span>
                        )}
                        <span className="rounded-full bg-white/5 px-2.5 py-1">{locationLabel}</span>
                      </div>
                    </div>

                    <div className="space-y-2 rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-zinc-300">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-zinc-500" />
                        <span>{property.property_type_detail || property.type || "Tipo sin definir"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CircleDollarSign className="h-4 w-4 text-zinc-500" />
                        <span>
                          {property.precio_venta || property.precio_alquiler || property.price
                            ? [
                                property.precio_venta ? `Venta: ${property.precio_venta} USD` : null,
                                property.precio_alquiler ? `Alquiler: ${property.precio_alquiler} USD` : null,
                                !property.precio_venta && !property.precio_alquiler && property.price ? `${property.price} USD` : null,
                              ]
                                .filter(Boolean)
                                .join(" · ")
                            : "Precio sin definir"}
                        </span>
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
                    </div>

                    {!colegaLink && (
                      <p className="rounded-xl border border-dashed border-white/10 bg-black/20 px-3 py-2 text-xs text-zinc-400">
                        Aplicá la migración de auto_id para generar el link colega automáticamente.
                      </p>
                    )}

                    {visibleNotes && (
                      <p className="text-sm text-zinc-300">{visibleNotes}</p>
                    )}

                    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                      {colegaLink && (
                        <Button
                          type="button"
                          variant="outline"
                          className="h-11 w-full justify-center border-white bg-white text-black hover:bg-zinc-200 sm:flex-1 sm:min-w-[210px]"
                          onClick={() => void handleCopyLink(colegaLink)}
                        >
                          <Copy className="mr-2 h-4 w-4" />
                          Copiar link colega
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        className="h-11 w-full justify-center border-emerald-500/30 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/20 sm:flex-1 sm:min-w-[210px]"
                        onClick={() => handleShareWhatsApp(property)}
                        disabled={!colegaLink}
                      >
                        <MessageCircle className="mr-2 h-4 w-4" />
                        Compartir por WhatsApp
                      </Button>
                      <Button
                        variant="outline"
                        className="h-11 w-full border-white/10 bg-transparent text-white hover:bg-white/5 sm:flex-1 sm:min-w-[140px]"
                        onClick={() => openEditDialog(property)}
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        Editar
                      </Button>
                      <Button
                        variant="outline"
                        className="h-11 w-full border-red-500/30 bg-transparent text-red-200 hover:bg-red-500/10 hover:text-red-100 sm:flex-1 sm:min-w-[140px]"
                        onClick={() => void handleDelete(property)}
                      >
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

          <form onSubmit={handleSave} className="space-y-5">
            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
              <div className="mb-4 space-y-1">
                <p className="text-sm font-semibold tracking-tight text-white">Datos básicos</p>
                <p className="text-xs text-zinc-400">Formato compatible para sincronización entre CRMs.</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="property-title">Nombre / Referencia</Label>
                  <Input
                    id="property-title"
                    value={form.title}
                    onChange={handleChange("title")}
                    placeholder="Ej: Casa en Barrio Privado"
                    className="h-12 border-white/10 bg-black/30 text-white placeholder:text-zinc-500"
                  />
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="comentario">Comentario</Label>
                  <Textarea
                    id="comentario"
                    value={form.comentario}
                    onChange={handleChange("comentario")}
                    rows={2}
                    className="min-h-[72px] border-white/10 bg-black/30 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country">País</Label>
                  <Select value={form.country} onValueChange={handleSelectChange("country")}>
                    <SelectTrigger id="country" className="h-12 border-white/10 bg-black/30 text-white">
                      <SelectValue placeholder="Seleccioná país" />
                    </SelectTrigger>
                    <SelectContent className={selectContentClassName}>
                      {countryOptions.map((option) => (
                        <SelectItem key={option} value={option}>{option}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="property-department">Departamento</Label>
                  <Select value={form.department} onValueChange={handleDepartmentChange}>
                    <SelectTrigger id="property-department" className="h-12 border-white/10 bg-black/30 text-white">
                      <SelectValue placeholder="Seleccioná departamento" />
                    </SelectTrigger>
                    <SelectContent className={selectContentClassName}>
                      {departmentOptions.map((option) => (
                        <SelectItem key={option} value={option}>{option}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="property-city">Ciudad</Label>
                  <Select value={form.city} onValueChange={handleCityChange} disabled={!form.department}>
                    <SelectTrigger id="property-city" className="h-12 border-white/10 bg-black/30 text-white">
                      <SelectValue placeholder={form.department ? "Seleccioná ciudad" : "Elegí departamento"} />
                    </SelectTrigger>
                    <SelectContent className={selectContentClassName}>
                      {availableCities.map((option) => (
                        <SelectItem key={option} value={option}>{option}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="property-neighborhood">Barrio / Zona</Label>
                  <Select
                    value={form.barrio_zona}
                    onValueChange={handleSelectChange("barrio_zona")}
                    disabled={!form.city}
                  >
                    <SelectTrigger id="property-neighborhood" className="h-12 border-white/10 bg-black/30 text-white">
                      <SelectValue placeholder={form.city ? "Seleccioná barrio/zona" : "Elegí ciudad"} />
                    </SelectTrigger>
                    <SelectContent className={selectContentClassName}>
                      {availableNeighborhoods.map((option) => (
                        <SelectItem key={option} value={option}>{option}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2"><Label htmlFor="manzana">Manzana</Label><Input id="manzana" value={form.manzana} onChange={handleChange("manzana")} className="h-12 border-white/10 bg-black/30 text-white" /></div>
                <div className="space-y-2"><Label htmlFor="padron">Padrón</Label><Input id="padron" value={form.padron} onChange={handleChange("padron")} className="h-12 border-white/10 bg-black/30 text-white" /></div>
                <div className="space-y-2"><Label htmlFor="solar">Solar</Label><Input id="solar" value={form.solar} onChange={handleChange("solar")} className="h-12 border-white/10 bg-black/30 text-white" /></div>
                <div className="space-y-2"><Label htmlFor="parada">Parada</Label><Input id="parada" value={form.parada} onChange={handleChange("parada")} className="h-12 border-white/10 bg-black/30 text-white" /></div>
                <div className="space-y-2"><Label htmlFor="phone-number">Nro. Teléfono</Label><Input id="phone-number" value={form.phone_number} onChange={handleChange("phone_number")} className="h-12 border-white/10 bg-black/30 text-white" /></div>
                <div className="space-y-2 sm:col-span-2"><Label htmlFor="address">Dirección</Label><Input id="address" value={form.address} onChange={handleChange("address")} className="h-12 border-white/10 bg-black/30 text-white" /></div>
                <div className="space-y-2"><Label htmlFor="door-number">Número Puerta</Label><Input id="door-number" value={form.door_number} onChange={handleChange("door_number")} className="h-12 border-white/10 bg-black/30 text-white" /></div>

                <div className="space-y-2">
                  <Label htmlFor="vista">Vista</Label>
                  <Select value={form.vista} onValueChange={handleSelectChange("vista")}>
                    <SelectTrigger id="vista" className="h-12 border-white/10 bg-black/30 text-white"><SelectValue /></SelectTrigger>
                    <SelectContent className={selectContentClassName}>{viewOptions.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="house-type">Tipo de Casa</Label>
                  <Select value={form.house_type} onValueChange={handleSelectChange("house_type")}>
                    <SelectTrigger id="house-type" className="h-12 border-white/10 bg-black/30 text-white"><SelectValue placeholder="Seleccioná tipo" /></SelectTrigger>
                    <SelectContent className={selectContentClassName}>{houseTypeOptions.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="orientacion">Orientación</Label>
                  <Select value={form.orientacion} onValueChange={handleSelectChange("orientacion")}>
                    <SelectTrigger id="orientacion" className="h-12 border-white/10 bg-black/30 text-white"><SelectValue /></SelectTrigger>
                    <SelectContent className={selectContentClassName}>{orientationOptions.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="disposicion">Disposición</Label>
                  <Select value={form.disposicion} onValueChange={handleSelectChange("disposicion")}>
                    <SelectTrigger id="disposicion" className="h-12 border-white/10 bg-black/30 text-white"><SelectValue /></SelectTrigger>
                    <SelectContent className={selectContentClassName}>{dispositionOptions.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent>
                  </Select>
                </div>

                <div className="space-y-2"><Label htmlFor="distancia-mar">Distancia Mar (mts)</Label><Input id="distancia-mar" type="number" value={form.distancia_mar_mts} onChange={handleChange("distancia_mar_mts")} className="h-12 border-white/10 bg-black/30 text-white" /></div>

                <div className="space-y-2">
                  <Label htmlFor="frente-mar">Frente Mar</Label>
                  <Select value={form.frente_mar} onValueChange={handleSelectChange("frente_mar")}>
                    <SelectTrigger id="frente-mar" className="h-12 border-white/10 bg-black/30 text-white"><SelectValue /></SelectTrigger>
                    <SelectContent className={selectContentClassName}>{triStateOptions.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 sm:col-span-2"><Label htmlFor="video-youtube">Video Youtube</Label><Input id="video-youtube" value={form.video_url} onChange={handleChange("video_url")} className="h-12 border-white/10 bg-black/30 text-white" /></div>
                <div className="space-y-2 sm:col-span-2"><Label htmlFor="matterport-url">Link MatterPort Tour Virtual</Label><Input id="matterport-url" value={form.matterport_url} onChange={handleChange("matterport_url")} className="h-12 border-white/10 bg-black/30 text-white" /></div>

                <div className="space-y-2">
                  <Label htmlFor="cartel">Cartel</Label>
                  <Select value={form.cartel} onValueChange={handleSelectChange("cartel")}>
                    <SelectTrigger id="cartel" className="h-12 border-white/10 bg-black/30 text-white"><SelectValue /></SelectTrigger>
                    <SelectContent className={selectContentClassName}>{triStateOptions.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="property-type-detail">Tipo de Propiedad *</Label>
                  <Select value={form.property_type_detail} onValueChange={handleSelectChange("property_type_detail")}>
                    <SelectTrigger id="property-type-detail" className="h-12 border-white/10 bg-black/30 text-white">
                      <SelectValue placeholder="Seleccioná tipo" />
                    </SelectTrigger>
                    <SelectContent className={selectContentClassName}>
                      {propertyTypeOptions.map((option) => (
                        <SelectItem key={option} value={option}>{option}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <Label>Operación *</Label>
                <div className="grid grid-cols-3 gap-2">
                  {operationOptions.map((option) => (
                    <Button
                      key={option}
                      type="button"
                      variant="outline"
                      className={`h-12 ${form.operation === option ? "border-white bg-white text-black hover:bg-zinc-200" : "border-white/10 bg-transparent text-white hover:bg-white/5"}`}
                      onClick={() => setForm((current) => ({ ...current, operation: option }))}
                    >
                      {option}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            {operationIncludesVenta && (
              <div className="space-y-2">
                <Label htmlFor="precio-venta">Precio Venta (USD)</Label>
                <Input
                  id="precio-venta"
                  list="precio-venta-options"
                  value={form.precio_venta}
                  onChange={handleChange("precio_venta")}
                  placeholder="Seleccioná o escribí precio"
                  className="h-12 border-white/10 bg-black/30 text-white placeholder:text-zinc-500"
                />
                <datalist id="precio-venta-options">
                  {pricePresetOptions.map((option) => (
                    <option key={`venta-${option}`} value={option} />
                  ))}
                </datalist>
              </div>
            )}

            {operationIncludesAlquiler && (
              <div className="space-y-2">
                <Label htmlFor="precio-alquiler">Precio Alquiler (USD)</Label>
                <Input
                  id="precio-alquiler"
                  list="precio-alquiler-options"
                  value={form.precio_alquiler}
                  onChange={handleChange("precio_alquiler")}
                  placeholder="Seleccioná o escribí precio"
                  className="h-12 border-white/10 bg-black/30 text-white placeholder:text-zinc-500"
                />
                <datalist id="precio-alquiler-options">
                  {pricePresetOptions.map((option) => (
                    <option key={`alq-${option}`} value={option} />
                  ))}
                </datalist>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>En Venta</Label>
                <div className="grid grid-cols-2 gap-2">
                  {yesNoOptions.map((option) => (
                    <Button
                      key={`enventa-${option}`}
                      type="button"
                      variant="outline"
                      className={`h-12 ${form.en_venta === option ? "border-white bg-white text-black hover:bg-zinc-200" : "border-white/10 bg-transparent text-white hover:bg-white/5"}`}
                      onClick={() => setForm((current) => ({ ...current, en_venta: option }))}
                    >
                      {option}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>En Alquiler</Label>
                <div className="grid grid-cols-2 gap-2">
                  {yesNoOptions.map((option) => (
                    <Button
                      key={`enalquiler-${option}`}
                      type="button"
                      variant="outline"
                      className={`h-12 ${form.en_alquiler === option ? "border-white bg-white text-black hover:bg-zinc-200" : "border-white/10 bg-transparent text-white hover:bg-white/5"}`}
                      onClick={() => setForm((current) => ({ ...current, en_alquiler: option }))}
                    >
                      {option}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="estado-prop">Estado</Label>
              <Select value={form.estado_prop} onValueChange={handleSelectChange("estado_prop")}>
                <SelectTrigger id="estado-prop" className="h-12 border-white/10 bg-black/30 text-white">
                  <SelectValue placeholder="Seleccioná estado" />
                </SelectTrigger>
                <SelectContent className={selectContentClassName}>
                  {statusOptions.map((option) => (
                    <SelectItem key={option} value={option}>{option}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="property-url">URL del portal (opcional)</Label>
              <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                <Input
                  id="property-url"
                  value={form.url}
                  onChange={handleChange("url")}
                  placeholder="https://portal.com/propiedad/123"
                  className="h-12 border-white/10 bg-black/30 text-white placeholder:text-zinc-500"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="h-12 border-white/10 bg-transparent text-white hover:bg-white/5"
                  onClick={() => void handleImportFromUrl()}
                  disabled={importingFromUrl || !form.url.trim()}
                >
                  {importingFromUrl ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Link2 className="mr-2 h-4 w-4" />}
                  Traer info
                </Button>
              </div>
            </div>

            <Accordion type="multiple" className="w-full space-y-3">
              <AccordionItem value="caracteristicas" className="rounded-xl border border-white/10 bg-black/20 px-4">
                <AccordionTrigger className="py-4 text-sm font-medium">Características</AccordionTrigger>
                <AccordionContent className="space-y-4 pb-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="ambientes">Ambientes</Label>
                      <Input id="ambientes" type="number" value={form.ambientes} onChange={handleChange("ambientes")} className="h-12 border-white/10 bg-black/30 text-white" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dormitorios">Dormitorios</Label>
                      <Select value={form.dormitorios} onValueChange={handleSelectChange("dormitorios")}>
                        <SelectTrigger id="dormitorios" className="h-12 border-white/10 bg-black/30 text-white"><SelectValue placeholder="Seleccioná" /></SelectTrigger>
                        <SelectContent className={selectContentClassName}>{dormitoriosOptions.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="banos">Baños</Label>
                      <Select value={form.banos} onValueChange={handleSelectChange("banos")}>
                        <SelectTrigger id="banos" className="h-12 border-white/10 bg-black/30 text-white"><SelectValue placeholder="Seleccioná" /></SelectTrigger>
                        <SelectContent className={selectContentClassName}>{banosOptions.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cochera">Cochera</Label>
                      <Select value={form.cochera} onValueChange={handleSelectChange("cochera")}>
                        <SelectTrigger id="cochera" className="h-12 border-white/10 bg-black/30 text-white"><SelectValue placeholder="Seleccioná" /></SelectTrigger>
                        <SelectContent className={selectContentClassName}>{cocheraOptions.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="garage">Garage</Label>
                      <Select value={form.garage} onValueChange={handleSelectChange("garage")}>
                        <SelectTrigger id="garage" className="h-12 border-white/10 bg-black/30 text-white"><SelectValue placeholder="Seleccioná" /></SelectTrigger>
                        <SelectContent className={selectContentClassName}>{garageOptions.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="plantas">Cantidad de Plantas</Label>
                      <Input id="plantas" type="number" value={form.plantas} onChange={handleChange("plantas")} className="h-12 border-white/10 bg-black/30 text-white" />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-2"><Label htmlFor="sup-terreno">Sup. Terreno m²</Label><Input id="sup-terreno" type="number" value={form.sup_terreno} onChange={handleChange("sup_terreno")} className="h-12 border-white/10 bg-black/30 text-white" /></div>
                    <div className="space-y-2"><Label htmlFor="sup-cubierta">Sup. Cubierta m²</Label><Input id="sup-cubierta" type="number" value={form.sup_cubierta} onChange={handleChange("sup_cubierta")} className="h-12 border-white/10 bg-black/30 text-white" /></div>
                    <div className="space-y-2"><Label htmlFor="sup-semi">Sup. Semi-Cubierta m²</Label><Input id="sup-semi" type="number" value={form.sup_semi_cubierta} onChange={handleChange("sup_semi_cubierta")} className="h-12 border-white/10 bg-black/30 text-white" /></div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    {([
                      ["bano_servicio", "Baño de Servicio", form.bano_servicio],
                      ["terraza", "Terraza/Balcón", form.terraza],
                      ["propiedad_horizontal", "Propiedad Horizontal", form.propiedad_horizontal],
                      ["piscina", "Piscina", form.piscina],
                      ["permuta", "Permuta", form.permuta],
                    ] as Array<[keyof typeof initialPropertyForm, string, string]>).map(([field, label, value]) => (
                      <div key={String(field)} className="space-y-2">
                        <Label>{label}</Label>
                        <div className="grid grid-cols-2 gap-2">
                          {yesNoOptions.map((option) => (
                            <Button
                              key={`${String(field)}-${option}`}
                              type="button"
                              variant="outline"
                              className={`h-12 ${value === option ? "border-white bg-white text-black hover:bg-zinc-200" : "border-white/10 bg-transparent text-white hover:bg-white/5"}`}
                              onClick={() => setForm((current) => ({ ...current, [field]: option }))}
                            >
                              {option}
                            </Button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="fiscal" className="rounded-xl border border-white/10 bg-black/20 px-4">
                <AccordionTrigger className="py-4 text-sm font-medium">Fiscal y precios</AccordionTrigger>
                <AccordionContent className="space-y-4 pb-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2"><Label htmlFor="precio-escritura">Precio Compra/Escritura (USD)</Label><Input id="precio-escritura" value={form.precio_escritura} onChange={handleChange("precio_escritura")} className="h-12 border-white/10 bg-black/30 text-white" /></div>
                    <div className="space-y-2"><Label htmlFor="precio-libre">Precio Libre (USD)</Label><Input id="precio-libre" value={form.precio_libre} onChange={handleChange("precio_libre")} className="h-12 border-white/10 bg-black/30 text-white" /></div>
                    <div className="space-y-2"><Label htmlFor="precio-tasacion">Precio Tasación (USD)</Label><Input id="precio-tasacion" value={form.precio_tasacion} onChange={handleChange("precio_tasacion")} className="h-12 border-white/10 bg-black/30 text-white" /></div>
                    <div className="space-y-2"><Label htmlFor="precio-portales">Precio Publicación Portales (USD)</Label><Input id="precio-portales" value={form.precio_portales} onChange={handleChange("precio_portales")} className="h-12 border-white/10 bg-black/30 text-white" /></div>
                    <div className="space-y-2"><Label htmlFor="vigencia-venta">Vigencia Venta</Label><Input id="vigencia-venta" type="date" value={form.vigencia_venta} onChange={handleChange("vigencia_venta")} className="h-12 border-white/10 bg-black/30 text-white" /></div>
                    <div className="space-y-2"><Label htmlFor="vigencia-alquiler">Vigencia Alquiler</Label><Input id="vigencia-alquiler" type="date" value={form.vigencia_alquiler} onChange={handleChange("vigencia_alquiler")} className="h-12 border-white/10 bg-black/30 text-white" /></div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="nota-alquiler">Nota Alquiler</Label>
                    <Textarea id="nota-alquiler" value={form.nota_alquiler} onChange={handleChange("nota_alquiler")} className="min-h-24 border-white/10 bg-black/30 text-white" />
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="descripcion" className="rounded-xl border border-white/10 bg-black/20 px-4">
                <AccordionTrigger className="py-4 text-sm font-medium">Descripción</AccordionTrigger>
                <AccordionContent className="space-y-4 pb-4">
                  <div className="space-y-2">
                    <Label htmlFor="descripcion">Descripción</Label>
                    <Textarea id="descripcion" value={form.descripcion} onChange={handleChange("descripcion")} className="min-h-36 border-white/10 bg-black/30 text-white" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notas-internas">Notas internas</Label>
                    <Textarea id="notas-internas" value={form.notes} onChange={handleChange("notes")} className="min-h-24 border-white/10 bg-black/30 text-white" />
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

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
