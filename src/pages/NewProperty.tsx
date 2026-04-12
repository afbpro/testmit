import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import AppNavigation from "@/components/AppNavigation";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useIsMobile } from "@/hooks/use-mobile";
import { getStoredSession, signOut } from "@/lib/auth";
import { supabase } from "@/lib/supabaseClient";

type Currency = "USD" | "UYU";
type YesNo = "Sí" | "No";

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
const statusOptions = ["Disponible", "Reservado", "Vendido", "Alquilado", "Fuera de mercado"] as const;
const viewOptions = ["----", "Al mar", "A la laguna", "Al campo", "A la sierra", "Al río", "A la ciudad"] as const;
const houseTypeOptions = ["Casa", "Quinta", "Chalet", "Villa", "Duplex", "Triplex"] as const;
const orientationOptions = ["----", "Norte", "Sur", "Este", "Oeste", "NE", "NO", "SE", "SO"] as const;
const dispositionOptions = ["----", "Frente", "Contrafrente", "Lateral", "Interno"] as const;
const toiletteOptions = ["----", "1", "2", "3+"] as const;
const cocinaOptions = ["----", "Sí", "No", "Americana"] as const;
const piscinaOptions = ["----", "No", "Sí", "Climatizada"] as const;
const parrilleroOptions = ["----", "No", "Sí", "Cubierto"] as const;
const calefaccionOptions = ["----", "Central", "Radiadores", "Piso radiante", "Split", "Estufa"] as const;
const mueblesOptions = ["----", "No", "Sí", "Parcial"] as const;
const amobladaOptions = ["----", "No", "Sí", "Parcial"] as const;
const estadoPropiedadOptions = ["----", "A estrenar", "Muy bueno", "Bueno", "Regular", "A reciclar"] as const;
const cocheraOptions = ["----", "No", "1", "2", "3+"] as const;
const garageOptions = ["----", "No", "Simple", "Doble", "Triple"] as const;
const yesNoOptions = ["No", "Sí"] as const;

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

const cityOptionsByDepartment: Record<(typeof departmentOptions)[number], readonly string[]> = {
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
};

const steps = [
  "/propiedades/nueva",
  "/propiedades/nueva/basicos",
  "/propiedades/nueva/extras",
  "/propiedades/nueva/precios",
  "/propiedades/nueva/detalles",
] as const;

const stepMeta = [
  { title: "Operación", description: "Elegí si la propiedad va para venta, alquiler o ambas." },
  { title: "Datos básicos", description: "Completá la información principal y ubicación de la propiedad." },
  { title: "Comodidades y extras", description: "Indicá ambientes, servicios y características generales." },
  { title: "Precios", description: "Cargá valores, monedas y condiciones comerciales." },
  { title: "Estado y detalle", description: "Completá estado, referencias catastrales y observaciones." },
] as const;

const initialForm = {
  title: "",
  property_type_detail: "",
  operation: "",
  country: "Uruguay",
  department: "",
  city: "",
  barrio_zona: "",
  address: "",
  estado_prop: "Disponible",

  vista: "----",
  house_type: "",
  orientacion: "----",
  disposicion: "----",
  distancia_mar_mts: "",
  frente_mar: "No" as YesNo,
  video_url: "",
  matterport_url: "",
  cartel: "No" as YesNo,
  uso_comercial: "No" as YesNo,
  manzana: "",
  padron: "",
  solar: "",
  parada: "",
  door_number: "",
  phone_number: "",
  comentario: "",

  precio_venta: "",
  precio_venta_moneda: "USD" as Currency,
  precio_libre: "",
  precio_libre_moneda: "USD" as Currency,
  precio_tasacion: "",
  precio_tasacion_moneda: "USD" as Currency,
  saldo_banco: "",
  saldo_banco_moneda: "USD" as Currency,
  vigencia_venta: "",
  en_venta: "Sí" as YesNo,
  permuta: "No" as YesNo,
  oferta: "No" as YesNo,
  financia: "No" as YesNo,
  renta: "No" as YesNo,
  porcentaje_renta: "",
  habilitada_banco: "No" as YesNo,
  comentario_venta: "",

  en_alquiler: "No" as YesNo,
  precio_portales: "",
  precio_portales_moneda: "USD" as Currency,
  vigencia_alquiler: "",
  acepta_mascota: "No" as YesNo,
  acepta_fumador: "No" as YesNo,
  acepta_ninos: "No" as YesNo,
  nota_alquiler: "",

  dormitorios: "",
  banos: "",
  suites: "",
  toilette: "----",
  living: "No" as YesNo,
  comedor: "No" as YesNo,
  living_comedor: "No" as YesNo,
  comedor_diario: "No" as YesNo,
  cocina: "----",
  cap_personas: "",
  cantidad_camas: "",
  dep_servicio: "No" as YesNo,
  bano_servicio: "No" as YesNo,
  estufa_lena: "No" as YesNo,
  piscina: "----",
  playroom: "No" as YesNo,
  parrillero: "----",
  lavadero: "No" as YesNo,
  calefaccion: "----",
  despensa: "No" as YesNo,
  muebles: "----",
  amoblada: "----",
  adaptada_movilidad: "No" as YesNo,
  clave_wifi: "",

  sup_terreno: "",
  sup_cubierta: "",
  sup_semi_cubierta: "",
  plantas: "",
  terraza: "No" as YesNo,
  propiedad_horizontal: "No" as YesNo,
  estado_propiedad_detalle: "----",
  cochera: "----",
  garage: "----",
  descripcion: "",
  notes: "",
};

function CurrencyToggle({
  value,
  onChange,
}: {
  value: Currency;
  onChange: (value: Currency) => void;
}) {
  return (
    <div className="inline-flex rounded-lg border border-white/10 p-1">
      {(["UYU", "USD"] as const).map((currency) => (
        <button
          key={currency}
          type="button"
          onClick={() => onChange(currency)}
          className={`rounded-md px-2 py-1 text-xs ${value === currency ? "bg-white text-black" : "text-zinc-300"}`}
        >
          {currency === "UYU" ? "$ UYU" : "USD"}
        </button>
      ))}
    </div>
  );
}

function YesNoToggle({ value, onChange }: { value: YesNo; onChange: (value: YesNo) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {yesNoOptions.map((option) => (
        <Button
          key={option}
          type="button"
          variant="outline"
          onClick={() => onChange(option)}
          className={`h-11 border-white/10 ${value === option ? "bg-white text-black hover:bg-zinc-200" : "bg-transparent text-white"}`}
        >
          {option}
        </Button>
      ))}
    </div>
  );
}

export default function NewProperty() {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const session = getStoredSession();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(initialForm);

  const stepIndex = Math.max(0, steps.indexOf(location.pathname as (typeof steps)[number]));
  const availableCities = form.department ? cityOptionsByDepartment[form.department as (typeof departmentOptions)[number]] ?? [] : [];
  const availableNeighborhoods = form.city ? neighborhoodOptionsByCity[form.city] ?? [] : [];
  const includesVenta = form.operation === "Venta" || form.operation === "Ambas";
  const includesAlquiler = form.operation === "Alquiler" || form.operation === "Ambas";
  const currentStepMeta = stepMeta[stepIndex] ?? stepMeta[0];

  const handleLogout = async () => {
    const result = await signOut();
    if (!result.ok) {
      toast.error(result.message);
    }
    navigate("/login", { replace: true });
  };

  const handleChange = (field: keyof typeof initialForm) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const handleSelect = (field: keyof typeof initialForm) => (value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const nextStep = () => {
    if (stepIndex === 0 && !form.operation) {
      toast.error("Seleccioná una operación para continuar.");
      return;
    }

    const next = Math.min(stepIndex + 1, steps.length - 1);
    navigate(steps[next]);
  };

  const prevStep = () => {
    const prev = Math.max(stepIndex - 1, 0);
    navigate(steps[prev]);
  };

  const parseNumber = (value: string) => {
    if (!value.trim()) {
      return null;
    }
    const parsed = Number(value.replace(/,/g, "."));
    return Number.isNaN(parsed) ? null : parsed;
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.property_type_detail || !form.operation) {
      toast.error("Completá Nombre, Tipo de Propiedad y Operación.");
      return;
    }

    if (!supabase) {
      toast.error("Configurá Supabase para guardar propiedades.");
      return;
    }

    setSaving(true);

    const payload = {
      title: form.title.trim(),
      property_type_detail: form.property_type_detail,
      type: form.property_type_detail,
      operation: form.operation,
      country: form.country,
      department: form.department || null,
      city: form.city || null,
      barrio_zona: form.barrio_zona || null,
      zone: form.barrio_zona || null,
      address: form.address || null,
      estado_prop: form.estado_prop || null,

      vista: form.vista === "----" ? null : form.vista,
      house_type: form.house_type || null,
      orientacion: form.orientacion === "----" ? null : form.orientacion,
      disposicion: form.disposicion === "----" ? null : form.disposicion,
      distancia_mar_mts: parseNumber(form.distancia_mar_mts),
      frente_mar: form.frente_mar,
      video_url: form.video_url || null,
      matterport_url: form.matterport_url || null,
      cartel: form.cartel,
      uso_comercial: form.uso_comercial,
      manzana: form.manzana || null,
      padron: form.padron || null,
      solar: form.solar || null,
      parada: form.parada || null,
      door_number: form.door_number || null,
      phone_number: form.phone_number || null,
      comentario: form.comentario || null,

      precio_venta: form.precio_venta || null,
      precio_venta_moneda: form.precio_venta_moneda,
      precio_libre: form.precio_libre || null,
      precio_libre_moneda: form.precio_libre_moneda,
      precio_tasacion: form.precio_tasacion || null,
      precio_tasacion_moneda: form.precio_tasacion_moneda,
      saldo_banco: form.saldo_banco || null,
      saldo_banco_moneda: form.saldo_banco_moneda,
      vigencia_venta: form.vigencia_venta || null,
      en_venta: form.en_venta,
      permuta: form.permuta,
      oferta: form.oferta,
      financia: form.financia,
      renta: form.renta,
      porcentaje_renta: parseNumber(form.porcentaje_renta),
      habilitada_banco: form.habilitada_banco,
      comentario_venta: form.comentario_venta || null,

      en_alquiler: form.en_alquiler,
      precio_portales: form.precio_portales || null,
      precio_portales_moneda: form.precio_portales_moneda,
      vigencia_alquiler: form.vigencia_alquiler || null,
      acepta_mascota: form.acepta_mascota,
      acepta_fumador: form.acepta_fumador,
      acepta_ninos: form.acepta_ninos,
      nota_alquiler: form.nota_alquiler || null,

      dormitorios: form.dormitorios || null,
      banos: form.banos || null,
      suites: parseNumber(form.suites),
      toilette: form.toilette === "----" ? null : form.toilette,
      living: form.living,
      comedor: form.comedor,
      living_comedor: form.living_comedor,
      comedor_diario: form.comedor_diario,
      cocina: form.cocina === "----" ? null : form.cocina,
      cap_personas: parseNumber(form.cap_personas),
      cantidad_camas: parseNumber(form.cantidad_camas),
      dep_servicio: form.dep_servicio,
      bano_servicio: form.bano_servicio,
      estufa_lena: form.estufa_lena,
      piscina: form.piscina === "----" ? null : form.piscina,
      playroom: form.playroom,
      parrillero: form.parrillero === "----" ? null : form.parrillero,
      lavadero: form.lavadero,
      calefaccion: form.calefaccion === "----" ? null : form.calefaccion,
      despensa: form.despensa,
      muebles: form.muebles === "----" ? null : form.muebles,
      amoblada: form.amoblada === "----" ? null : form.amoblada,
      adaptada_movilidad: form.adaptada_movilidad,
      clave_wifi: form.clave_wifi || null,

      sup_terreno: parseNumber(form.sup_terreno),
      sup_cubierta: parseNumber(form.sup_cubierta),
      sup_semi_cubierta: parseNumber(form.sup_semi_cubierta),
      plantas: parseNumber(form.plantas),
      terraza: form.terraza,
      propiedad_horizontal: form.propiedad_horizontal,
      estado_propiedad_detalle: form.estado_propiedad_detalle === "----" ? null : form.estado_propiedad_detalle,
      cochera: form.cochera === "----" ? null : form.cochera,
      garage: form.garage === "----" ? null : form.garage,
      descripcion: form.descripcion || null,
      notes: form.notes || null,
      price: form.precio_venta || form.precio_portales || null,
    };

    const { error } = await supabase.from("properties").insert(payload);
    setSaving(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Propiedad guardada");
    navigate("/propiedades");
  };

  const priceField = (
    label: string,
    amountKey: keyof typeof initialForm,
    currencyKey: keyof typeof initialForm,
  ) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="space-y-2">
        <CurrencyToggle
          value={form[currencyKey] as Currency}
          onChange={(value) => setForm((current) => ({ ...current, [currencyKey]: value }))}
        />
        <Input value={form[amountKey]} onChange={handleChange(amountKey)} className="h-11 border-white/10 bg-black/30 text-white" />
      </div>
    </div>
  );

  const step1 = (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Operación *</Label>
        <div className="flex flex-col gap-3">
          {operationOptions.map((option) => (
            <Button
              key={option}
              type="button"
              variant="outline"
              onClick={() => setForm((current) => ({ ...current, operation: option }))}
              className={`w-full justify-center rounded-xl px-5 font-semibold transition-all ${isMobile ? "h-20 text-lg" : "h-16 text-base"} ${
                form.operation === option
                  ? "!border-emerald-400/70 !bg-emerald-500/20 !text-emerald-100 md:hover:!bg-emerald-500/30"
                  : "border-white/10 bg-black/30 text-white md:hover:bg-white/10"
              }`}
            >
              {option}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );

  const step2 = (
    <div className="space-y-4">
      <div className="space-y-2"><Label>Nombre / Referencia *</Label><Input value={form.title} onChange={handleChange("title")} className="h-11 border-white/10 bg-black/30 text-white" /></div>
      <div className="space-y-2">
        <Label>Tipo de Propiedad *</Label>
        <Select value={form.property_type_detail} onValueChange={handleSelect("property_type_detail")}>
          <SelectTrigger className="h-11 border-white/10 bg-black/30 text-white"><SelectValue placeholder="Seleccioná tipo" /></SelectTrigger>
          <SelectContent className="border-white/10 bg-zinc-950 text-white">{propertyTypeOptions.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>País</Label>
        <Select value={form.country} onValueChange={handleSelect("country")}>
          <SelectTrigger className="h-11 border-white/10 bg-black/30 text-white"><SelectValue /></SelectTrigger>
          <SelectContent className="border-white/10 bg-zinc-950 text-white">{countryOptions.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Departamento</Label>
        <Select value={form.department} onValueChange={(value) => setForm((current) => ({ ...current, department: value, city: "", barrio_zona: "" }))}>
          <SelectTrigger className="h-11 border-white/10 bg-black/30 text-white"><SelectValue placeholder="Seleccioná departamento" /></SelectTrigger>
          <SelectContent className="border-white/10 bg-zinc-950 text-white">{departmentOptions.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Ciudad</Label>
        <Select value={form.city} onValueChange={(value) => setForm((current) => ({ ...current, city: value, barrio_zona: "" }))} disabled={!form.department}>
          <SelectTrigger className="h-11 border-white/10 bg-black/30 text-white"><SelectValue placeholder="Seleccioná ciudad" /></SelectTrigger>
          <SelectContent className="border-white/10 bg-zinc-950 text-white">{availableCities.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Barrio / Zona</Label>
        <Select value={form.barrio_zona} onValueChange={handleSelect("barrio_zona")} disabled={!form.city}>
          <SelectTrigger className="h-11 border-white/10 bg-black/30 text-white"><SelectValue placeholder="Seleccioná barrio/zona" /></SelectTrigger>
          <SelectContent className="border-white/10 bg-zinc-950 text-white">{availableNeighborhoods.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-2"><Label>Dirección</Label><Input value={form.address} onChange={handleChange("address")} className="h-11 border-white/10 bg-black/30 text-white" /></div>
      <div className="space-y-2">
        <Label>Estado</Label>
        <Select value={form.estado_prop} onValueChange={handleSelect("estado_prop")}>
          <SelectTrigger className="h-11 border-white/10 bg-black/30 text-white"><SelectValue /></SelectTrigger>
          <SelectContent className="border-white/10 bg-zinc-950 text-white">{statusOptions.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent>
        </Select>
      </div>
    </div>
  );

  const step3 = (
    <div className="space-y-4">
      <div className="space-y-2"><Label>Vista</Label><Select value={form.vista} onValueChange={handleSelect("vista")}><SelectTrigger className="h-11 border-white/10 bg-black/30 text-white"><SelectValue /></SelectTrigger><SelectContent className="border-white/10 bg-zinc-950 text-white">{viewOptions.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select></div>
      <div className="space-y-2"><Label>Tipo de Casa</Label><Select value={form.house_type} onValueChange={handleSelect("house_type")}><SelectTrigger className="h-11 border-white/10 bg-black/30 text-white"><SelectValue placeholder="Seleccioná" /></SelectTrigger><SelectContent className="border-white/10 bg-zinc-950 text-white">{houseTypeOptions.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select></div>
      <div className="space-y-2"><Label>Orientación</Label><Select value={form.orientacion} onValueChange={handleSelect("orientacion")}><SelectTrigger className="h-11 border-white/10 bg-black/30 text-white"><SelectValue /></SelectTrigger><SelectContent className="border-white/10 bg-zinc-950 text-white">{orientationOptions.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select></div>
      <div className="space-y-2"><Label>Disposición</Label><Select value={form.disposicion} onValueChange={handleSelect("disposicion")}><SelectTrigger className="h-11 border-white/10 bg-black/30 text-white"><SelectValue /></SelectTrigger><SelectContent className="border-white/10 bg-zinc-950 text-white">{dispositionOptions.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select></div>
      <div className="space-y-2"><Label>Distancia Mar metros</Label><Input type="number" value={form.distancia_mar_mts} onChange={handleChange("distancia_mar_mts")} className="h-11 border-white/10 bg-black/30 text-white" /></div>
      <div className="space-y-2"><Label>Frente Mar</Label><YesNoToggle value={form.frente_mar} onChange={(value) => setForm((c) => ({ ...c, frente_mar: value }))} /></div>
      <div className="space-y-2"><Label>Video YouTube URL</Label><Input value={form.video_url} onChange={handleChange("video_url")} className="h-11 border-white/10 bg-black/30 text-white" /></div>
      <div className="space-y-2"><Label>Link MatterPort</Label><Input value={form.matterport_url} onChange={handleChange("matterport_url")} className="h-11 border-white/10 bg-black/30 text-white" /></div>
      <div className="space-y-2"><Label>Cartel</Label><YesNoToggle value={form.cartel} onChange={(value) => setForm((c) => ({ ...c, cartel: value }))} /></div>
      <div className="space-y-2"><Label>Uso Comercial</Label><YesNoToggle value={form.uso_comercial} onChange={(value) => setForm((c) => ({ ...c, uso_comercial: value }))} /></div>
      <div className="grid gap-4">
        <div className="space-y-2"><Label>Manzana</Label><Input value={form.manzana} onChange={handleChange("manzana")} className="h-11 border-white/10 bg-black/30 text-white" /></div>
        <div className="space-y-2"><Label>Padrón</Label><Input value={form.padron} onChange={handleChange("padron")} className="h-11 border-white/10 bg-black/30 text-white" /></div>
        <div className="space-y-2"><Label>Solar</Label><Input value={form.solar} onChange={handleChange("solar")} className="h-11 border-white/10 bg-black/30 text-white" /></div>
        <div className="space-y-2"><Label>Parada</Label><Input value={form.parada} onChange={handleChange("parada")} className="h-11 border-white/10 bg-black/30 text-white" /></div>
        <div className="space-y-2"><Label>Número Puerta</Label><Input value={form.door_number} onChange={handleChange("door_number")} className="h-11 border-white/10 bg-black/30 text-white" /></div>
        <div className="space-y-2"><Label>Nro. Teléfono</Label><Input value={form.phone_number} onChange={handleChange("phone_number")} className="h-11 border-white/10 bg-black/30 text-white" /></div>
        <div className="space-y-2"><Label>Comentario</Label><Textarea value={form.comentario} onChange={handleChange("comentario")} className="min-h-20 border-white/10 bg-black/30 text-white" /></div>
      </div>
    </div>
  );

  const step4 = (
    <div className="space-y-6">
      {includesVenta && (
        <div className="space-y-4 rounded-xl border border-white/10 p-4">
          <p className="text-sm font-medium text-white">Venta</p>
          {priceField("Precio Venta", "precio_venta", "precio_venta_moneda")}
          {priceField("Precio Libre", "precio_libre", "precio_libre_moneda")}
          {priceField("Precio Tasación", "precio_tasacion", "precio_tasacion_moneda")}
          {priceField("Saldo Banco", "saldo_banco", "saldo_banco_moneda")}
          <div className="space-y-2"><Label>Vigencia Venta</Label><Input type="date" value={form.vigencia_venta} onChange={handleChange("vigencia_venta")} className="h-11 border-white/10 bg-black/30 text-white" /></div>
          <div className="space-y-2"><Label>En Venta</Label><YesNoToggle value={form.en_venta} onChange={(value) => setForm((c) => ({ ...c, en_venta: value }))} /></div>
          <div className="space-y-2"><Label>Permuta</Label><YesNoToggle value={form.permuta} onChange={(value) => setForm((c) => ({ ...c, permuta: value }))} /></div>
          <div className="space-y-2"><Label>Oferta</Label><YesNoToggle value={form.oferta} onChange={(value) => setForm((c) => ({ ...c, oferta: value }))} /></div>
          <div className="space-y-2"><Label>Financia</Label><YesNoToggle value={form.financia} onChange={(value) => setForm((c) => ({ ...c, financia: value }))} /></div>
          <div className="space-y-2"><Label>Renta</Label><YesNoToggle value={form.renta} onChange={(value) => setForm((c) => ({ ...c, renta: value }))} /></div>
          <div className="space-y-2"><Label>% Renta</Label><Input type="number" value={form.porcentaje_renta} onChange={handleChange("porcentaje_renta")} className="h-11 border-white/10 bg-black/30 text-white" /></div>
          <div className="space-y-2"><Label>Habilitada Banco</Label><YesNoToggle value={form.habilitada_banco} onChange={(value) => setForm((c) => ({ ...c, habilitada_banco: value }))} /></div>
          <div className="space-y-2"><Label>Comentario Venta</Label><Textarea value={form.comentario_venta} onChange={handleChange("comentario_venta")} className="min-h-20 border-white/10 bg-black/30 text-white" /></div>
        </div>
      )}

      {includesAlquiler && (
        <div className="space-y-4 rounded-xl border border-white/10 p-4">
          <p className="text-sm font-medium text-white">Alquiler</p>
          <div className="space-y-2"><Label>En Alquiler</Label><YesNoToggle value={form.en_alquiler} onChange={(value) => setForm((c) => ({ ...c, en_alquiler: value }))} /></div>
          {priceField("Precio Publicación Portales", "precio_portales", "precio_portales_moneda")}
          <div className="space-y-2"><Label>Vigencia Alquiler</Label><Input type="date" value={form.vigencia_alquiler} onChange={handleChange("vigencia_alquiler")} className="h-11 border-white/10 bg-black/30 text-white" /></div>
          <div className="space-y-2"><Label>Acepta Mascota</Label><YesNoToggle value={form.acepta_mascota} onChange={(value) => setForm((c) => ({ ...c, acepta_mascota: value }))} /></div>
          <div className="space-y-2"><Label>Acepta Fumador</Label><YesNoToggle value={form.acepta_fumador} onChange={(value) => setForm((c) => ({ ...c, acepta_fumador: value }))} /></div>
          <div className="space-y-2"><Label>Acepta Niños</Label><YesNoToggle value={form.acepta_ninos} onChange={(value) => setForm((c) => ({ ...c, acepta_ninos: value }))} /></div>
          <div className="space-y-2"><Label>Nota Alquiler</Label><Textarea value={form.nota_alquiler} onChange={handleChange("nota_alquiler")} className="min-h-20 border-white/10 bg-black/30 text-white" /></div>
        </div>
      )}
    </div>
  );

  const step5 = (
    <div className="space-y-6">
      <div className="space-y-4 rounded-xl border border-white/10 p-4">
        <p className="text-sm font-medium text-white">Comodidades</p>
        <div className="space-y-2"><Label>Dormitorios</Label><Input type="number" value={form.dormitorios} onChange={handleChange("dormitorios")} className="h-11 border-white/10 bg-black/30 text-white" /></div>
        <div className="space-y-2"><Label>Baños</Label><Input type="number" value={form.banos} onChange={handleChange("banos")} className="h-11 border-white/10 bg-black/30 text-white" /></div>
        <div className="space-y-2"><Label>Suites</Label><Input type="number" value={form.suites} onChange={handleChange("suites")} className="h-11 border-white/10 bg-black/30 text-white" /></div>
        <div className="space-y-2"><Label>Toilette</Label><Select value={form.toilette} onValueChange={handleSelect("toilette")}><SelectTrigger className="h-11 border-white/10 bg-black/30 text-white"><SelectValue /></SelectTrigger><SelectContent className="border-white/10 bg-zinc-950 text-white">{toiletteOptions.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-2"><Label>Living</Label><YesNoToggle value={form.living} onChange={(value) => setForm((c) => ({ ...c, living: value }))} /></div>
        <div className="space-y-2"><Label>Comedor</Label><YesNoToggle value={form.comedor} onChange={(value) => setForm((c) => ({ ...c, comedor: value }))} /></div>
        <div className="space-y-2"><Label>Living Comedor</Label><YesNoToggle value={form.living_comedor} onChange={(value) => setForm((c) => ({ ...c, living_comedor: value }))} /></div>
        <div className="space-y-2"><Label>Comedor Diario</Label><YesNoToggle value={form.comedor_diario} onChange={(value) => setForm((c) => ({ ...c, comedor_diario: value }))} /></div>
        <div className="space-y-2"><Label>Cocina</Label><Select value={form.cocina} onValueChange={handleSelect("cocina")}><SelectTrigger className="h-11 border-white/10 bg-black/30 text-white"><SelectValue /></SelectTrigger><SelectContent className="border-white/10 bg-zinc-950 text-white">{cocinaOptions.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-2"><Label>Cap. Personas</Label><Input type="number" value={form.cap_personas} onChange={handleChange("cap_personas")} className="h-11 border-white/10 bg-black/30 text-white" /></div>
        <div className="space-y-2"><Label>Cantidad Camas</Label><Input type="number" value={form.cantidad_camas} onChange={handleChange("cantidad_camas")} className="h-11 border-white/10 bg-black/30 text-white" /></div>
        <div className="space-y-2"><Label>Dep. Servicio</Label><YesNoToggle value={form.dep_servicio} onChange={(value) => setForm((c) => ({ ...c, dep_servicio: value }))} /></div>
        <div className="space-y-2"><Label>Baño Servicio</Label><YesNoToggle value={form.bano_servicio} onChange={(value) => setForm((c) => ({ ...c, bano_servicio: value }))} /></div>
        <div className="space-y-2"><Label>Estufa Leña</Label><YesNoToggle value={form.estufa_lena} onChange={(value) => setForm((c) => ({ ...c, estufa_lena: value }))} /></div>
        <div className="space-y-2"><Label>Piscina</Label><Select value={form.piscina} onValueChange={handleSelect("piscina")}><SelectTrigger className="h-11 border-white/10 bg-black/30 text-white"><SelectValue /></SelectTrigger><SelectContent className="border-white/10 bg-zinc-950 text-white">{piscinaOptions.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-2"><Label>PlayRoom</Label><YesNoToggle value={form.playroom} onChange={(value) => setForm((c) => ({ ...c, playroom: value }))} /></div>
        <div className="space-y-2"><Label>Parrillero</Label><Select value={form.parrillero} onValueChange={handleSelect("parrillero")}><SelectTrigger className="h-11 border-white/10 bg-black/30 text-white"><SelectValue /></SelectTrigger><SelectContent className="border-white/10 bg-zinc-950 text-white">{parrilleroOptions.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-2"><Label>Lavadero</Label><YesNoToggle value={form.lavadero} onChange={(value) => setForm((c) => ({ ...c, lavadero: value }))} /></div>
        <div className="space-y-2"><Label>Calefacción</Label><Select value={form.calefaccion} onValueChange={handleSelect("calefaccion")}><SelectTrigger className="h-11 border-white/10 bg-black/30 text-white"><SelectValue /></SelectTrigger><SelectContent className="border-white/10 bg-zinc-950 text-white">{calefaccionOptions.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-2"><Label>Despensa</Label><YesNoToggle value={form.despensa} onChange={(value) => setForm((c) => ({ ...c, despensa: value }))} /></div>
        <div className="space-y-2"><Label>Muebles</Label><Select value={form.muebles} onValueChange={handleSelect("muebles")}><SelectTrigger className="h-11 border-white/10 bg-black/30 text-white"><SelectValue /></SelectTrigger><SelectContent className="border-white/10 bg-zinc-950 text-white">{mueblesOptions.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-2"><Label>Amoblada</Label><Select value={form.amoblada} onValueChange={handleSelect("amoblada")}><SelectTrigger className="h-11 border-white/10 bg-black/30 text-white"><SelectValue /></SelectTrigger><SelectContent className="border-white/10 bg-zinc-950 text-white">{amobladaOptions.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-2"><Label>Adaptada Movilidad Reducida</Label><YesNoToggle value={form.adaptada_movilidad} onChange={(value) => setForm((c) => ({ ...c, adaptada_movilidad: value }))} /></div>
        <div className="space-y-2"><Label>Clave WiFi</Label><Input value={form.clave_wifi} onChange={handleChange("clave_wifi")} className="h-11 border-white/10 bg-black/30 text-white" /></div>
      </div>

      <div className="space-y-4 rounded-xl border border-white/10 p-4">
        <p className="text-sm font-medium text-white">Características</p>
        <div className="space-y-2"><Label>Superficie Terreno m²</Label><Input type="number" value={form.sup_terreno} onChange={handleChange("sup_terreno")} className="h-11 border-white/10 bg-black/30 text-white" /></div>
        <div className="space-y-2"><Label>Superficie Cubierta m²</Label><Input type="number" value={form.sup_cubierta} onChange={handleChange("sup_cubierta")} className="h-11 border-white/10 bg-black/30 text-white" /></div>
        <div className="space-y-2"><Label>Superficie Semi-Cubierta m²</Label><Input type="number" value={form.sup_semi_cubierta} onChange={handleChange("sup_semi_cubierta")} className="h-11 border-white/10 bg-black/30 text-white" /></div>
        <div className="space-y-2"><Label>Cantidad de Plantas</Label><Input type="number" value={form.plantas} onChange={handleChange("plantas")} className="h-11 border-white/10 bg-black/30 text-white" /></div>
        <div className="space-y-2"><Label>Terraza/Balcón</Label><YesNoToggle value={form.terraza} onChange={(value) => setForm((c) => ({ ...c, terraza: value }))} /></div>
        <div className="space-y-2"><Label>Propiedad Horizontal</Label><YesNoToggle value={form.propiedad_horizontal} onChange={(value) => setForm((c) => ({ ...c, propiedad_horizontal: value }))} /></div>
        <div className="space-y-2"><Label>Estado propiedad</Label><Select value={form.estado_propiedad_detalle} onValueChange={handleSelect("estado_propiedad_detalle")}><SelectTrigger className="h-11 border-white/10 bg-black/30 text-white"><SelectValue /></SelectTrigger><SelectContent className="border-white/10 bg-zinc-950 text-white">{estadoPropiedadOptions.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-2"><Label>Cochera</Label><Select value={form.cochera} onValueChange={handleSelect("cochera")}><SelectTrigger className="h-11 border-white/10 bg-black/30 text-white"><SelectValue /></SelectTrigger><SelectContent className="border-white/10 bg-zinc-950 text-white">{cocheraOptions.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-2"><Label>Garage</Label><Select value={form.garage} onValueChange={handleSelect("garage")}><SelectTrigger className="h-11 border-white/10 bg-black/30 text-white"><SelectValue /></SelectTrigger><SelectContent className="border-white/10 bg-zinc-950 text-white">{garageOptions.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select></div>
      </div>

      <div className="space-y-4 rounded-xl border border-white/10 p-4">
        <p className="text-sm font-medium text-white">Notas</p>
        <div className="space-y-2"><Label>Descripción pública</Label><Textarea rows={6} value={form.descripcion} onChange={handleChange("descripcion")} className="min-h-32 border-white/10 bg-black/30 text-white" /></div>
        <div className="space-y-2"><Label>Notas internas</Label><Textarea rows={4} value={form.notes} onChange={handleChange("notes")} className="min-h-24 border-white/10 bg-black/30 text-white" /></div>
      </div>
    </div>
  );

  const desktopContent = (
    <div className="space-y-5">
      <div className="sticky top-[72px] z-30 flex items-center justify-between rounded-xl border border-white/10 bg-zinc-900/95 px-4 py-3 backdrop-blur">
        <div>
          <h1 className="text-lg font-semibold text-white">Nueva propiedad</h1>
          <p className="text-xs text-zinc-400">Formulario completo compatible de sincronización.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" className="border-white/10 bg-transparent text-white" onClick={() => navigate("/propiedades")}>Cancelar</Button>
          <Button type="button" className="bg-white text-black hover:bg-zinc-200" onClick={() => void handleSave()} disabled={saving}>{saving ? "Guardando..." : "Guardar"}</Button>
        </div>
      </div>

      <Card className="border border-white/10 bg-white/[0.04] text-white"><CardContent className="space-y-5 p-5">{step2}
        <Accordion type="multiple" className="space-y-3">
          <AccordionItem value="extras" className="rounded-xl border border-white/10 bg-black/20 px-4"><AccordionTrigger>Comodidades y extras</AccordionTrigger><AccordionContent className="pt-3">{step5}</AccordionContent></AccordionItem>
          <AccordionItem value="precios" className="rounded-xl border border-white/10 bg-black/20 px-4"><AccordionTrigger>Precios</AccordionTrigger><AccordionContent className="pt-3">{step4}</AccordionContent></AccordionItem>
          <AccordionItem value="detalles" className="rounded-xl border border-white/10 bg-black/20 px-4"><AccordionTrigger>Estado y detalle</AccordionTrigger><AccordionContent className="pt-3">{step3}</AccordionContent></AccordionItem>
        </Accordion>
      </CardContent></Card>
    </div>
  );

  const operationScreen = (
    <div className={`mx-auto w-full space-y-4 ${isMobile ? "max-w-none" : "max-w-3xl"}`}>
      <Card className={`border border-white/10 bg-white/[0.04] text-white ${isMobile ? "min-h-[76vh]" : ""}`}>
        <CardContent className={`space-y-5 ${isMobile ? "p-4" : "p-5"}`}>
          <div>
            <h1 className="text-lg font-semibold text-white">Nueva propiedad</h1>
            <p className="text-sm text-zinc-400">{stepMeta[0].description}</p>
          </div>
          {step1}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <Button type="button" variant="outline" className="h-11 border-white/10 bg-transparent text-white" onClick={() => navigate("/propiedades")}>← Volver</Button>
            <Button type="button" className="h-11 bg-white text-black hover:bg-zinc-200" onClick={nextStep}>Siguiente →</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const stepContent = [step1, step2, step5, step4, step3][stepIndex] ?? step1;

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.08),_transparent_0),#09090b] text-white">
      <AppNavigation email={session?.email} isAdmin={session?.role === "administrador"} onLogout={handleLogout} />
      <main className="mx-auto w-full max-w-5xl px-3 py-6 pb-24 sm:px-4">
        {stepIndex === 0 ? operationScreen : isMobile ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
              <div className="mb-2 flex items-center justify-between text-sm text-zinc-300">
                <span>Paso {stepIndex + 1} de 5</span>
                <Badge variant="outline" className="border-white/20 bg-white/10 text-white">Nueva propiedad</Badge>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-white/10"><div className="h-full bg-white" style={{ width: `${((stepIndex + 1) / 5) * 100}%` }} /></div>
              <div className="mt-3">
                <p className="text-sm font-semibold text-white">{currentStepMeta.title}</p>
                <p className="text-xs text-zinc-400">{currentStepMeta.description}</p>
              </div>
            </div>
            <Card className="border border-white/10 bg-white/[0.04] text-white"><CardContent className="space-y-4 p-4">{stepContent}</CardContent></Card>
            <div className="sticky bottom-0 z-20 grid grid-cols-2 gap-2 border-t border-white/10 bg-zinc-950/95 px-1 py-3 backdrop-blur">
              <Button type="button" variant="outline" className="h-11 border-white/10 bg-transparent text-white" onClick={stepIndex === 0 ? () => navigate("/propiedades") : prevStep}>← Volver</Button>
              {stepIndex === 4 ? (
                <Button type="button" className="h-11 bg-white text-black hover:bg-zinc-200" onClick={() => void handleSave()} disabled={saving}>{saving ? "Guardando..." : "Guardar"}</Button>
              ) : (
                <Button type="button" className="h-11 bg-white text-black hover:bg-zinc-200" onClick={nextStep}>Siguiente →</Button>
              )}
            </div>
          </div>
        ) : (
          desktopContent
        )}
      </main>
    </div>
  );
}
