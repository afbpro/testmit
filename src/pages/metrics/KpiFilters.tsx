import { useState } from "react";

export type KpiFiltersState = {
  from: string;
  to: string;
  asesor: string;
  categoria: string;
  canal: string;
};

const categorias = ["", "Ventas", "Captación", "Prospección", "Rentas", "Marketing", "Trámites"];
const canales = ["", "Meta Ads", "Portales", "Networking", "Referidos", "Orgánico", "Open House"];

export function KpiFilters({ value, onChange }: {
  value: KpiFiltersState;
  onChange: (v: KpiFiltersState) => void;
}) {
  return (
    <form className="flex flex-wrap gap-3 items-end p-2 bg-black/60 rounded-xl mb-4">
      <div>
        <label className="block text-xs text-zinc-400 mb-1">Desde</label>
        <input type="date" value={value.from} onChange={e => onChange({ ...value, from: e.target.value })} className="h-9 rounded bg-zinc-900 border border-white/10 px-2 text-white" />
      </div>
      <div>
        <label className="block text-xs text-zinc-400 mb-1">Hasta</label>
        <input type="date" value={value.to} onChange={e => onChange({ ...value, to: e.target.value })} className="h-9 rounded bg-zinc-900 border border-white/10 px-2 text-white" />
      </div>
      <div>
        <label className="block text-xs text-zinc-400 mb-1">Categoría</label>
        <select value={value.categoria} onChange={e => onChange({ ...value, categoria: e.target.value })} className="h-9 rounded bg-zinc-900 border border-white/10 px-2 text-white">
          {categorias.map(c => <option key={c} value={c}>{c || "Todas"}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs text-zinc-400 mb-1">Canal</label>
        <select value={value.canal} onChange={e => onChange({ ...value, canal: e.target.value })} className="h-9 rounded bg-zinc-900 border border-white/10 px-2 text-white">
          {canales.map(c => <option key={c} value={c}>{c || "Todos"}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs text-zinc-400 mb-1">Asesor</label>
        <input type="text" value={value.asesor} onChange={e => onChange({ ...value, asesor: e.target.value })} placeholder="Nombre o email" className="h-9 rounded bg-zinc-900 border border-white/10 px-2 text-white" />
      </div>
    </form>
  );
}
