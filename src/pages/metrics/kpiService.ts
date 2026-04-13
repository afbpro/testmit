import { supabase } from "@/lib/supabaseClient";

export async function getKpiMetrics() {
  // Acciones totales
  const { count: totalActions } = await supabase
    .from("crm_actions")
    .select("id", { count: "exact", head: true });

  // Leads totales
  const { count: totalLeads } = await supabase
    .from("clients")
    .select("id", { count: "exact", head: true });

  // Visitas agendadas
  const { count: visitasAgendadas } = await supabase
    .from("crm_actions")
    .select("id", { count: "exact", head: true })
    .eq("action_type", "agendar visita venta");

  // Ventas cerradas
  const { count: ventasCerradas } = await supabase
    .from("crm_actions")
    .select("id", { count: "exact", head: true })
    .eq("action_type", "venta cerrada");

  return {
    totalActions: totalActions ?? 0,
    totalLeads: totalLeads ?? 0,
    visitasAgendadas: visitasAgendadas ?? 0,
    ventasCerradas: ventasCerradas ?? 0,
  };
}
