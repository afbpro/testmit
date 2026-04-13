import { useEffect, useState } from "react";
import { KpiCard } from "./KpiCard";
import { getKpiMetrics } from "./kpiService";
import { KpiFilters, KpiFiltersState } from "./KpiFilters";

export default function KpiDashboard() {
  const [metrics, setMetrics] = useState<any>(null);
  const [filters, setFilters] = useState<KpiFiltersState>({
    from: "",
    to: "",
    asesor: "",
    categoria: "",
    canal: "",
  });

  useEffect(() => {
    getKpiMetrics(filters).then(setMetrics);
  }, [filters]);

  if (!metrics) return <div className="p-8 text-center text-zinc-400">Cargando métricas...</div>;

  return (
    <div className="p-4">
      <KpiFilters value={filters} onChange={setFilters} />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard label="Acciones totales" value={metrics.totalActions} />
        <KpiCard label="Leads totales" value={metrics.totalLeads} />
        <KpiCard label="Visitas agendadas" value={metrics.visitasAgendadas} />
        <KpiCard label="Ventas cerradas" value={metrics.ventasCerradas} />
      </div>
    </div>
  );
}
