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
  Interesado: "border-sky-200 bg-sky-50 text-sky-700",
  "Visita agendada": "border-violet-200 bg-violet-50 text-violet-700",
  Negociando: "border-amber-200 bg-amber-50 text-amber-700",
  Cerrado: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Descartado: "border-slate-200 bg-slate-100 text-slate-600",
};

export function getStageBadgeClass(stage: string) {
  return stageBadgeClasses[stage as ClientStage] || "border-border bg-muted text-muted-foreground";
}

export interface ClientRecord {
  id: string;
  name: string;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  property_type: string | null;
  budget: string | null;
  zone: string | null;
  notes: string | null;
  stage: string;
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
