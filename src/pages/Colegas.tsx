import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";

export type Company = {
  id: number;
  nombre: string;
  email: string;
  telefono: string;
  direccion: string;
  created_at: string;
  updated_at: string;
};

export default function Colegas() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("https://app.cupertino.uy/api?action=companies-list", { credentials: "include", method: "POST" })
      .then(async (res) => {
        const data = await res.json();
        if (!data.ok) throw new Error(data.message || "Error al cargar inmobiliarias");
        setCompanies(data.companies);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-6">Cargando inmobiliarias...</div>;
  if (error) return <div className="p-6 text-red-500">{error}</div>;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Colegas</h1>
      <div className="grid gap-4">
        {companies.map((c) => (
          <Card key={c.id} className="p-4 flex flex-col gap-1">
            <div className="font-semibold text-lg">{c.nombre}</div>
            <div className="text-sm text-zinc-500">{c.email} | {c.telefono}</div>
            <div className="text-sm text-zinc-400">{c.direccion}</div>
          </Card>
        ))}
      </div>
    </div>
  );
}
