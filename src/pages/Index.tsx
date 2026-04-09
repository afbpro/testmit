import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Copy, ExternalLink, HelpCircle, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { agencies } from "@/data/agencies";
import logo from "@/assets/logo.png";
import { clearLegacyLinkHistory, getSession, signOut } from "@/lib/auth";

const propertyTypes = ["Apartamentos", "Casas", "Terrenos", "Chacras", "Campos", "Locales"] as const;
type PropertyType = (typeof propertyTypes)[number];
type DashboardView = "colega" | "jira";

const initialLeadForm = {
  fullName: "",
  phone: "",
  email: "",
  zone: "",
  details: "",
};

export default function Index() {
  const navigate = useNavigate();
  const session = getSession();
  const [selectedAgencyId, setSelectedAgencyId] = useState<number | null>(null);
  const [propertyType, setPropertyType] = useState<PropertyType>("Apartamentos");
  const [propertyId, setPropertyId] = useState("");
  const [generatedUrl, setGeneratedUrl] = useState("");
  const [open, setOpen] = useState(false);
  const [activeView, setActiveView] = useState<DashboardView>("colega");
  const [leadForm, setLeadForm] = useState(initialLeadForm);

  useEffect(() => {
    clearLegacyLinkHistory();
  }, []);

  const selectedAgency = useMemo(
    () => agencies.find((agency) => agency.id === selectedAgencyId),
    [selectedAgencyId]
  );

  const handleGenerate = () => {
    if (!selectedAgencyId || !propertyId) {
      toast.error("Completá todos los campos");
      return;
    }

    const pid = parseInt(propertyId, 10);
    if (isNaN(pid)) {
      toast.error("El ID de propiedad debe ser numérico");
      return;
    }

    const calculatedId = pid * selectedAgencyId + 9876;
    const url = `https://www.inmobiliaria.link/c/inmobiliaria_${selectedAgencyId}/${propertyType}/${calculatedId}`;
    setGeneratedUrl(url);
  };

  const handleCopy = async (url: string) => {
    await navigator.clipboard.writeText(url);
    toast.success("¡Link copiado!");
  };

  const handleLogout = () => {
    signOut();
    setSelectedAgencyId(null);
    setPropertyType("Apartamentos");
    setPropertyId("");
    setGeneratedUrl("");
    setOpen(false);
    toast("Sesión cerrada");
    navigate("/login", { replace: true });
  };

  const handleLeadChange = (field: keyof typeof initialLeadForm) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setLeadForm((current) => ({
      ...current,
      [field]: event.target.value,
    }));
  };

  const handleLeadSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!leadForm.fullName || !leadForm.phone || !leadForm.details) {
      toast.error("Completá nombre, teléfono y detalle del lead");
      return;
    }

    if (leadForm.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(leadForm.email.trim())) {
      toast.error("Ingresá un email válido para el lead");
      return;
    }

    const jiraLead = [
      `Lead: ${leadForm.fullName}`,
      `Teléfono: ${leadForm.phone}`,
      `Email: ${leadForm.email || "No informado"}`,
      `Zona / propiedad: ${leadForm.zone || "No informada"}`,
      `Detalle: ${leadForm.details}`,
      `Cargado por: ${session?.email ?? "usuario"}`,
    ].join("\n");

    await navigator.clipboard.writeText(jiraLead);
    toast.success("Lead preparado y copiado para Jira");
    setLeadForm(initialLeadForm);
  };

  const openExternalJira = () => {
    window.open("https://cupertino.uy/jira", "_blank", "noopener,noreferrer");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-zinc-800 bg-black py-4 md:py-5 shadow-sm">
        <div className="mx-auto flex max-w-2xl justify-center px-4">
          <img
            src={logo}
            alt="Cupertino Negocios Inmobiliarios"
            className="h-20 md:h-24 w-auto max-w-full object-contain"
          />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6 md:py-7 space-y-5">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">
            Panel Jira y Link de Colega
          </h1>
          <p className="text-sm text-muted-foreground">Sesión activa: {session?.email ?? "usuario"}</p>
        </div>

        <div className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
          <Button
            variant={activeView === "colega" ? "default" : "outline"}
            onClick={() => setActiveView("colega")}
          >
            Link de colega
          </Button>
          <Button
            variant={activeView === "jira" ? "default" : "outline"}
            onClick={() => setActiveView("jira")}
          >
            Formulario Jira
          </Button>
          <Button variant="outline" onClick={openExternalJira}>
            Abrir Jira real
          </Button>
          <Button variant="outline" size="sm" onClick={handleLogout} className="gap-2">
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </Button>
        </div>

        {activeView === "colega" ? (
          <>
            <Card>
              <CardContent className="p-6 space-y-5">
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold text-foreground">Generador de Link Colega</h2>
                  <p className="text-sm text-muted-foreground">
                    Armá el link para compartir propiedades con colegas.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs uppercase tracking-wider">Inmobiliaria colega</Label>
                  <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start font-normal">
                        {selectedAgency
                          ? `${selectedAgency.id} — ${selectedAgency.name}`
                          : "Seleccionar inmobiliaria..."}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Buscar por nombre o ID..." />
                        <CommandList>
                          <CommandEmpty>No se encontró.</CommandEmpty>
                          <CommandGroup>
                            {agencies.map((agency) => (
                              <CommandItem
                                key={agency.id}
                                value={`${agency.id} ${agency.name}`}
                                onSelect={() => {
                                  setSelectedAgencyId(agency.id);
                                  setOpen(false);
                                }}
                              >
                                <span className="text-muted-foreground mr-2 font-mono text-xs">{agency.id}</span>
                                {agency.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs uppercase tracking-wider">Tipo de propiedad</Label>
                  <RadioGroup
                    value={propertyType}
                    onValueChange={(value) => setPropertyType(value as PropertyType)}
                    className="grid grid-cols-2 gap-3"
                  >
                    {propertyTypes.map((type) => {
                      const id = type.toLowerCase();

                      return (
                        <div key={type} className="flex items-center gap-2 rounded-md border border-border px-3 py-2">
                          <RadioGroupItem value={type} id={id} />
                          <Label htmlFor={id} className="cursor-pointer">{type}</Label>
                        </div>
                      );
                    })}
                  </RadioGroup>
                </div>

                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs uppercase tracking-wider">ID de la propiedad</Label>
                  <Input
                    type="number"
                    placeholder="Ej: 25656"
                    value={propertyId}
                    onChange={(event) => setPropertyId(event.target.value)}
                  />
                </div>

                <Button className="w-full" onClick={handleGenerate}>
                  Generar Link
                </Button>
              </CardContent>
            </Card>

            {generatedUrl && (
              <Card className="border-primary/20">
                <CardContent className="p-6 space-y-4">
                  <Label className="text-muted-foreground text-xs uppercase tracking-wider">Link generado</Label>
                  <div className="rounded-lg bg-secondary p-4 break-all font-mono text-sm text-foreground">
                    {generatedUrl}
                  </div>
                  <div className="flex gap-3">
                    <Button onClick={() => handleCopy(generatedUrl)} className="flex-1 gap-2">
                      <Copy className="h-4 w-4" />
                      Copiar link
                    </Button>
                    <Button variant="outline" asChild>
                      <a href={generatedUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="border-border/50">
              <CardContent className="p-5 flex gap-3 items-start">
                <HelpCircle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground">¿Cómo obtener el ID de la propiedad?</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Buscá la propiedad en la página de la inmobiliaria colega y copiá el número que aparece al final de la URL.
                  </p>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card>
            <CardContent className="p-6 space-y-5">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold text-foreground">Formulario para Jira</h2>
                <p className="text-sm text-muted-foreground">
                  Cargá el lead y lo dejamos listo para copiar o derivar a Jira.
                </p>
              </div>

              <form onSubmit={handleLeadSubmit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="lead-name" className="text-muted-foreground text-xs uppercase tracking-wider">
                      Nombre y apellido
                    </Label>
                    <Input
                      id="lead-name"
                      placeholder="Ej: María Pérez"
                      value={leadForm.fullName}
                      onChange={handleLeadChange("fullName")}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lead-phone" className="text-muted-foreground text-xs uppercase tracking-wider">
                      Teléfono
                    </Label>
                    <Input
                      id="lead-phone"
                      placeholder="Ej: 099 123 456"
                      value={leadForm.phone}
                      onChange={handleLeadChange("phone")}
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="lead-email" className="text-muted-foreground text-xs uppercase tracking-wider">
                      Email
                    </Label>
                    <Input
                      id="lead-email"
                      type="email"
                      placeholder="nombre@correo.com"
                      value={leadForm.email}
                      onChange={handleLeadChange("email")}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lead-zone" className="text-muted-foreground text-xs uppercase tracking-wider">
                      Zona / propiedad
                    </Label>
                    <Input
                      id="lead-zone"
                      placeholder="Ej: Punta del Este, apto 2 dorm."
                      value={leadForm.zone}
                      onChange={handleLeadChange("zone")}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lead-details" className="text-muted-foreground text-xs uppercase tracking-wider">
                    Detalle del lead
                  </Label>
                  <Textarea
                    id="lead-details"
                    placeholder="Describí la consulta, necesidad y cualquier dato útil para cargar en Jira."
                    value={leadForm.details}
                    onChange={handleLeadChange("details")}
                    className="min-h-28"
                  />
                </div>

                <Button type="submit" className="w-full">
                  Ingresar lead
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
