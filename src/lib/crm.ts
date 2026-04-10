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

export function getStageBadgeClass(stage: string) {
  return stageBadgeClasses[stage as ClientStage] || "border-border bg-muted text-muted-foreground";
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
      label: "Cold",
      className: "border-sky-400/30 bg-sky-500/10 text-sky-100",
    };
  }

  if (days <= 2) {
    return {
      emoji: "🔥",
      label: "Hot",
      className: "border-rose-400/30 bg-rose-500/10 text-rose-100",
    };
  }

  return {
    emoji: "🟡",
    label: "Warm",
    className: "border-amber-400/30 bg-amber-500/10 text-amber-100",
  };
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
  title: string;
  type: string | null;
  operation: string | null;
  price: string | null;
  department: string | null;
  zone: string | null;
  zone_specific: string | null;
  url: string | null;
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
