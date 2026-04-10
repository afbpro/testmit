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
