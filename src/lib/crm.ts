export const clientStages = [
  "Interesado",
  "Visita agendada",
  "Negociando",
  "Cerrado",
  "Descartado",
] as const;

export type ClientStage = (typeof clientStages)[number];

export const defaultClientStage: ClientStage = clientStages[0];

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
