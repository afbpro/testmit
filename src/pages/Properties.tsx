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
  Plus,
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

  const priceOptions = useMemo(() => {
    if (form.operation === "Venta") {
      return salePriceOptions;
    }

    return rentPriceOptions;
  }, [form.operation]);

  const availableZones = form.department ? zoneOptionsByDepartment[form.department] : [];

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

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.title.trim()) {
      toast.error("El título es obligatorio");
      return;
    }

    if (!form.url.trim()) {
      toast.error("La URL del portal es obligatoria");
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
      url: normalizePortalUrl(form.url),
      notes: form.notes.trim() || null,
    };

    const { data, error } = await supabase.from("properties").insert(payload).select().single();
    setSaving(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    setProperties((current) => [data as PropertyRecord, ...current]);
    setForm(initialPropertyForm);
    setIsAddOpen(false);
    toast.success("Propiedad guardada");
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

  const handleCopyLink = async (url: string | null) => {
    if (!url) {
      toast.error("Esta propiedad no tiene link cargado");
      return;
    }

    await navigator.clipboard.writeText(url);
    toast.success("Link copiado");
  };

  const handleShareWhatsApp = (property: PropertyRecord) => {
    const text = [
      property.title,
      property.operation,
      property.price ? `Precio: ${property.price} USD` : null,
      [property.department, property.zone].filter(Boolean).join(" · ") || null,
      property.url,
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
                <p className="break-all text-xs text-zinc-400">Sesión activa: {session?.email ?? "usuario"}</p>
              </div>

              <Button className="w-full gap-2 bg-white text-black hover:bg-zinc-200 sm:w-auto" onClick={() => setIsAddOpen(true)}>
                <Plus className="h-4 w-4" />
                + Agregar propiedad
              </Button>
            </div>
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
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {properties.map((property) => {
              const locationLabel = [property.department, property.zone].filter(Boolean).join(" · ") || "Sin zona";

              return (
                <Card key={property.id} className="border border-white/10 bg-white/[0.04] text-white shadow-sm backdrop-blur-xl">
                  <CardContent className="p-5 space-y-4">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <h2 className="text-lg font-semibold text-white">{property.title}</h2>
                        {property.operation && (
                          <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-200">
                            {property.operation}
                          </Badge>
                        )}
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
                    </div>

                    {property.notes && (
                      <p className="text-sm text-zinc-300">{property.notes}</p>
                    )}

                    <div className="grid gap-2 sm:grid-cols-3">
                      <Button variant="outline" className="w-full border-white/10 bg-transparent text-white hover:bg-white/5" onClick={() => handleShareWhatsApp(property)}>
                        <MessageCircle className="mr-2 h-4 w-4" />
                        WhatsApp
                      </Button>
                      <Button variant="outline" className="w-full border-white/10 bg-transparent text-white hover:bg-white/5" onClick={() => void handleCopyLink(property.url)}>
                        <Copy className="mr-2 h-4 w-4" />
                        Copiar link
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

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="fixed inset-0 h-full max-h-full w-full max-w-full translate-x-0 translate-y-0 overflow-y-auto rounded-none border-0 bg-zinc-950 text-white sm:inset-auto sm:left-1/2 sm:top-1/2 sm:h-auto sm:max-h-[90vh] sm:max-w-2xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl sm:border sm:border-white/10">
          <DialogHeader>
            <DialogTitle>Agregar propiedad</DialogTitle>
            <DialogDescription className="text-zinc-300">
              Completá los datos y guardá la propiedad en Supabase.
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
              <Label htmlFor="property-url">URL del portal *</Label>
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
              <Label htmlFor="property-notes">Notas</Label>
              <Textarea
                id="property-notes"
                value={form.notes}
                onChange={handleChange("notes")}
                placeholder="Detalles, amenities, observaciones..."
                className="min-h-28 border-white/10 bg-black/30 text-white placeholder:text-zinc-500"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => setIsAddOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-white text-black hover:bg-zinc-200" disabled={saving || !supabaseReady}>
                {saving ? "Guardando..." : "Guardar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
