import { KpiFiltersState } from "./KpiFilters";

export async function getKpiMetrics(filters?: KpiFiltersState) {
  const { from, to, asesor, categoria, canal } = filters || {};

  let actionsQuery = supabase
    .from("crm_actions")
    .select("id", { count: "exact", head: true });
  if (from) actionsQuery = actionsQuery.gte("created_at", from);
  if (to) actionsQuery = actionsQuery.lte("created_at", to);
  if (asesor) actionsQuery = actionsQuery.ilike("user_id", `%${asesor}%`);
  if (categoria) actionsQuery = actionsQuery.eq("category", categoria);
  if (canal) actionsQuery = actionsQuery.eq("source_channel", canal);
  const { count: totalActions } = await actionsQuery;

  let leadsQuery = supabase
    .from("clients")
    .select("id", { count: "exact", head: true });
  if (from) leadsQuery = leadsQuery.gte("created_at", from);
  if (to) leadsQuery = leadsQuery.lte("created_at", to);
  if (canal) leadsQuery = leadsQuery.eq("source_channel", canal);
  const { count: totalLeads } = await leadsQuery;

  let visitasQuery = supabase
    .from("crm_actions")
    .select("id", { count: "exact", head: true })
    .eq("action_type", "agendar visita venta");
  if (from) visitasQuery = visitasQuery.gte("created_at", from);
  if (to) visitasQuery = visitasQuery.lte("created_at", to);
  if (asesor) visitasQuery = visitasQuery.ilike("user_id", `%${asesor}%`);
  if (categoria) visitasQuery = visitasQuery.eq("category", categoria);
  if (canal) visitasQuery = visitasQuery.eq("source_channel", canal);
  const { count: visitasAgendadas } = await visitasQuery;

  let ventasQuery = supabase
    .from("crm_actions")
    .select("id", { count: "exact", head: true })
    .eq("action_type", "venta cerrada");
  if (from) ventasQuery = ventasQuery.gte("created_at", from);
  if (to) ventasQuery = ventasQuery.lte("created_at", to);
  if (asesor) ventasQuery = ventasQuery.ilike("user_id", `%${asesor}%`);
  if (categoria) ventasQuery = ventasQuery.eq("category", categoria);
  if (canal) ventasQuery = ventasQuery.eq("source_channel", canal);
  const { count: ventasCerradas } = await ventasQuery;

  return {
    totalActions: totalActions ?? 0,
    totalLeads: totalLeads ?? 0,
    visitasAgendadas: visitasAgendadas ?? 0,
    ventasCerradas: ventasCerradas ?? 0,
  };
}
