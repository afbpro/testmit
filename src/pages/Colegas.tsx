import React, { useState, useEffect } from "react";
import AppNavigation from "../components/AppNavigation";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { authApiRequest, getStoredSession, signOut } from "../lib/auth";
export type Company = {
  id: number;
  name: string;
  email: string;
  phone1: string;
  phone2: string;
  mobile1: string;
  mobile2: string;
  web: string;
  address: string;
  created_at: string;
  updated_at: string;
};

export default function Colegas() {
  const session = getStoredSession();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<'asc' | 'desc'>("asc");
  const [page, setPage] = useState(1);
  const [perPage] = useState(10);
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await authApiRequest<{ ok: boolean; companies: Company[]; message?: string }>(
          "companies/list",
          {}
        );
        if (!data.ok) throw new Error(data.message || "Error al cargar inmobiliarias");
        setCompanies(data.companies);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al cargar inmobiliarias");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Ordenar y filtrar
  const filteredCompanies = companies
    .filter((c) => {
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return (
        (c.name || "").toLowerCase().includes(q) ||
        (c.email || "").toLowerCase().includes(q) ||
        (c.address || "").toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      const an = (a.name  || "").toLowerCase();
      const bn = (b.name || "").toLowerCase();
      if (an < bn) return order === "asc" ? -1 : 1;
      if (an > bn) return order === "asc" ? 1 : -1;
      return 0;
    });

  const totalPages = Math.max(1, Math.ceil(filteredCompanies.length / perPage));
  const pagedCompanies = filteredCompanies.slice((page - 1) * perPage, page * perPage);

  const handleLogout = async () => {
    await signOut();
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-8">
      <AppNavigation
        email={session?.email}
        isAdmin={(session?.role || "").trim().toLowerCase() === "administrador"}
        onLogout={handleLogout}
      />
      <main className="mx-auto max-w-6xl space-y-5 px-3 py-5 sm:px-4 md:py-7">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Listado de inmobiliarias</h1>
            <p className="text-sm text-muted-foreground">Colegas registrados en la plataforma.</p>
          </div>
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-4">
            <Input
              className="w-48"
              placeholder="Buscar por nombre, email o dirección"
              value={search}
              onChange={e => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
            <Button
              variant="outline"
              onClick={() => setOrder(order === "asc" ? "desc" : "asc")}
              title="Ordenar por nombre"
            >
              {order === "asc" ? "Nombre A-Z" : "Nombre Z-A"}
            </Button>
          </div>
        </div>
        {loading ? (
          <Card>
            <CardContent className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
              Cargando inmobiliarias...
            </CardContent>
          </Card>
        ) : error ? (
          <Card>
            <CardContent className="p-6 text-sm text-destructive-foreground">{error}</CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-3">
              {pagedCompanies.map((c) => (
                <Card key={c.id}>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center justify-between gap-3 text-base">
                      <span>{c.name}</span>
                      <div className="flex items-center gap-2">
                        {c.web && <Badge variant="outline">{c.web}</Badge>}
                        {c.email && <Badge variant="secondary">{c.email}</Badge>}
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <p>Dirección: {c.address}</p>
                      <p>Teléfonos: {[c.phone1, c.phone2].filter(Boolean).join(" / ")}</p>
                      {/* Ciudad y país no disponibles en el tipo Company */}
                    </div>
                  </CardContent>
                </Card>
              ))}
              {!pagedCompanies.length && (
                <Card>
                  <CardContent className="p-6 text-sm text-muted-foreground">No se encontraron inmobiliarias.</CardContent>
                </Card>
              )}
            </div>
            {/* Paginado */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-6">
                <Button variant="outline" size="sm" onClick={() => setPage(1)} disabled={page === 1}>&laquo;</Button>
                <Button variant="outline" size="sm" onClick={() => setPage(page - 1)} disabled={page === 1}>&lsaquo;</Button>
                <span className="text-sm">Página {page} de {totalPages}</span>
                <Button variant="outline" size="sm" onClick={() => setPage(page + 1)} disabled={page === totalPages}>&rsaquo;</Button>
                <Button variant="outline" size="sm" onClick={() => setPage(totalPages)} disabled={page === totalPages}>&raquo;</Button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

