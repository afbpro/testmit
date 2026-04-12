export const clientStages = [
  "Interesado",
  "Visita agendada",
  "Negociando",
  "Cerrado",
  "Descartado",
] as const;

export type ClientStage = (typeof clientStages)[number];

export const defaultClientStage: ClientStage = clientStages[0];

const stageBadgeClasses: Record<ClientStage, string> = {
  Interesado: "border-yellow-400/40 bg-yellow-500/20 text-yellow-300",
  "Visita agendada": "border-blue-400/40 bg-blue-500/20 text-blue-300",
  Negociando: "border-orange-400/40 bg-orange-500/20 text-orange-300",
  Cerrado: "border-emerald-400/40 bg-emerald-500/20 text-emerald-300",
  Descartado: "border-red-400/40 bg-red-500/20 text-red-300",
};

const stageDotClasses: Record<ClientStage, string> = {
  Interesado: "bg-yellow-300",
  "Visita agendada": "bg-blue-300",
  Negociando: "bg-orange-300",
  Cerrado: "bg-emerald-300",
  Descartado: "bg-red-300",
};

export function getStageBadgeClass(stage: string) {
  return stageBadgeClasses[stage as ClientStage] || "border-border bg-muted text-muted-foreground";
}

export function getStageDotClass(stage: string) {
  return stageDotClasses[stage as ClientStage] || "bg-zinc-300";
}

export type ClientActivityType = "client" | "contact" | "stage" | "link" | "note";

export interface ClientActivityEntry {
  id: string;
  type: ClientActivityType;
  label: string;
  created_at: string;
}

export function normalizeActivityLog(log: unknown): ClientActivityEntry[] {
  if (!Array.isArray(log)) {
    return [];
  }

  return log
    .filter((item): item is ClientActivityEntry => {
      return Boolean(
        item &&
          typeof item === "object" &&
          "id" in item &&
          "label" in item &&
          "created_at" in item
      );
    })
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
}

export function createActivityEntry(label: string, type: ClientActivityType): ClientActivityEntry {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    label,
    created_at: new Date().toISOString(),
  };
}

export function appendActivityLog(
  currentLog: unknown,
  nextEntry: ClientActivityEntry | ClientActivityEntry[],
) {
  const existing = normalizeActivityLog(currentLog);
  const entries = Array.isArray(nextEntry) ? nextEntry : [nextEntry];

  return [...entries, ...existing].slice(0, 30);
}

export function getDaysSinceLastContact(lastContactAt: string | null | undefined) {
  if (!lastContactAt) {
    return null;
  }

  const timestamp = new Date(lastContactAt).getTime();

  if (Number.isNaN(timestamp)) {
    return null;
  }

  const diffMs = Date.now() - timestamp;
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

export function getLeadTemperature(lastContactAt: string | null | undefined) {
  const days = getDaysSinceLastContact(lastContactAt);

  if (days === null || days > 7) {
    return {
      emoji: "🧊",
      label: "Frío",
      className: "border-sky-400/30 bg-sky-500/10 text-sky-100",
    };
  }

  if (days <= 2) {
    return {
      emoji: "🔥",
      label: "Activo",
      className: "border-rose-400/30 bg-rose-500/10 text-rose-100",
    };
  }

  return {
    emoji: "🟡",
    label: "Tibio",
    className: "border-amber-400/30 bg-amber-500/10 text-amber-100",
  };
}

export function buildWhatsAppHref(phone: string | null | undefined, message?: string) {
  const digits = (phone ?? "").replace(/\D/g, "");

  if (!digits) {
    return "";
  }

  const normalizedMessage = message?.trim();

  return normalizedMessage
    ? `https://wa.me/${digits}?text=${encodeURIComponent(normalizedMessage)}`
    : `https://wa.me/${digits}`;
}

function getClientFirstName(name: string | null | undefined) {
  const trimmedName = name?.trim() ?? "";

  if (!trimmedName) {
    return "";
  }

  return trimmedName.split(/\s+/)[0] ?? trimmedName;
}

function buildClientInterestText(
  client: Pick<ClientRecord, "operation_type" | "property_type" | "zone" | "period">,
) {
  const propertyLabel = client.property_type?.trim().toLowerCase() || "propiedad";
  const zoneLabel = client.zone ? ` en ${client.zone}` : "";

  switch (client.operation_type) {
    case "Compra":
      return `por tu búsqueda de ${propertyLabel}${zoneLabel}`;
    case "Venta":
      return `por la venta de tu ${propertyLabel}${zoneLabel}`;
    case "Alquiler temporal":
      return `por tu búsqueda de alquiler temporal de ${propertyLabel}${zoneLabel}${client.period ? ` para ${client.period}` : ""}`;
    case "Alquiler anual":
      return `por tu búsqueda de alquiler anual de ${propertyLabel}${zoneLabel}`;
    case "Alquiler invernal":
      return `por tu búsqueda de alquiler invernal de ${propertyLabel}${zoneLabel}`;
    default:
      return "por tu consulta";
  }
}

export function buildClientWhatsAppMessage(
  client: Pick<ClientRecord, "name" | "operation_type" | "property_type" | "zone" | "period">,
) {
  const firstName = getClientFirstName(client.name);
  const greeting = firstName ? `Hola ${firstName}, ¿cómo estás?` : "Hola, ¿cómo estás?";
  const interestText = buildClientInterestText(client);

  return [
    greeting,
    "Soy de Cupertino.",
    `Te escribo ${interestText}.`,
    "Quedo atento si querés que te pase más opciones.",
  ].join(" ");
}

export function buildClientWhatsAppUrl(
  client: Pick<ClientRecord, "name" | "phone" | "whatsapp" | "operation_type" | "property_type" | "zone" | "period">,
) {
  return buildWhatsAppHref(client.whatsapp || client.phone, buildClientWhatsAppMessage(client));
}

export interface ClientRecord {
  id: string;
  name: string;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  operation_type: string | null;
  property_type: string | null;
  department: string | null;
  zone: string | null;
  zone_specific: string | null;
  budget: string | null;
  period: string | null;
  budget_notes: string | null;
  notes: string | null;
  last_contact: string | null;
  activity_log: ClientActivityEntry[] | null;
  stage: string;
  created_at: string;
}

export interface PropertyRecord {
  id: string;
  auto_id: number | null;
  title: string;
  comentario: string | null;
  country: string | null;
  property_type_detail: string | null;
  type: string | null;
  operation: string | null;
  price: string | null;
  estado_prop: string | null;
  city: string | null;
  barrio_zona: string | null;
  manzana: string | null;
  padron: string | null;
  solar: string | null;
  parada: string | null;
  phone_number: string | null;
  address: string | null;
  door_number: string | null;
  vista: string | null;
  house_type: string | null;
  orientacion: string | null;
  disposicion: string | null;
  distancia_mar_mts: number | null;
  frente_mar: string | null;
  cartel: string | null;
  precio_venta: string | null;
  precio_alquiler: string | null;
  precio_escritura: string | null;
  precio_libre: string | null;
  precio_tasacion: string | null;
  precio_portales: string | null;
  vigencia_venta: string | null;
  vigencia_alquiler: string | null;
  nota_alquiler: string | null;
  permuta: string | null;
  ambientes: number | null;
  dormitorios: string | null;
  banos: string | null;
  bano_servicio: string | null;
  cochera: string | null;
  garage: string | null;
  plantas: number | null;
  sup_terreno: number | null;
  sup_cubierta: number | null;
  sup_semi_cubierta: number | null;
  terraza: string | null;
  propiedad_horizontal: string | null;
  piscina: string | null;
  descripcion: string | null;
  video_url: string | null;
  matterport_url: string | null;
  en_venta: string | null;
  en_alquiler: string | null;
  department: string | null;
  zone: string | null;
  zone_specific: string | null;
  url: string | null;
  image_urls: string[] | null;
  notes: string | null;
  created_at: string;
}

export interface PropertyLinkRecord {
  id: string;
  client_id: string | null;
  generated_url: string | null;
  property_type: string | null;
  colleague_agency: string | null;
  created_at: string;
}
