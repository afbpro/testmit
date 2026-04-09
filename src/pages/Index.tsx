import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Copy, ExternalLink, HelpCircle, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
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

const AUTH_SESSION_KEY = "cupertino-auth-session";
const LEGACY_HISTORY_KEY = "cupertino-link-history";
const propertyTypes = ["Apartamentos", "Casas", "Terrenos", "Chacras", "Campos", "Locales"] as const;
type PropertyType = (typeof propertyTypes)[number];

function loadSession() {
  try {
    return localStorage.getItem(AUTH_SESSION_KEY) || "";
  } catch {
    return "";
  }
}

export default function Index() {
  const [selectedAgencyId, setSelectedAgencyId] = useState<number | null>(null);
  const [propertyType, setPropertyType] = useState<PropertyType>("Apartamentos");
  const [propertyId, setPropertyId] = useState("");
  const [generatedUrl, setGeneratedUrl] = useState("");
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loggedInEmail, setLoggedInEmail] = useState(loadSession);

  useEffect(() => {
    try {
      localStorage.removeItem(LEGACY_HISTORY_KEY);
    } catch {
      // Ignore storage cleanup errors.
    }
  }, []);

  const selectedAgency = useMemo(
    () => agencies.find((agency) => agency.id === selectedAgencyId),
    [selectedAgencyId]
  );

  const handleLogin = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      toast.error("Ingresá un email válido");
      return;
    }

    if (password.trim().length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    localStorage.setItem(AUTH_SESSION_KEY, normalizedEmail);
    setLoggedInEmail(normalizedEmail);
    setEmail(normalizedEmail);
    setPassword("");
    toast.success("Sesión iniciada");
  };

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
    localStorage.removeItem(AUTH_SESSION_KEY);
    setLoggedInEmail("");
    setEmail("");
    setPassword("");
    setSelectedAgencyId(null);
    setPropertyType("Apartamentos");
    setPropertyId("");
    setGeneratedUrl("");
    setOpen(false);
    toast("Sesión cerrada");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card py-6">
        <div className="mx-auto flex max-w-lg justify-center px-4">
          <img src={logo} alt="Cupertino Negocios Inmobiliarios" className="h-20 object-contain" />
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-8 space-y-6">
        {!loggedInEmail ? (
          <>
            <div className="space-y-2 text-center">
              <h1 className="text-2xl font-semibold text-foreground tracking-tight">Iniciar sesión</h1>
              <p className="text-sm text-muted-foreground">
                Ingresá con tu mail y contraseña para usar el generador de links.
              </p>
            </div>

            <Card>
              <CardContent className="p-6">
                <form onSubmit={handleLogin} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-muted-foreground text-xs uppercase tracking-wider">
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="nombre@empresa.com"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-muted-foreground text-xs uppercase tracking-wider">
                      Contraseña
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Mínimo 6 caracteres"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                    />
                  </div>

                  <Button type="submit" className="w-full">
                    Ingresar
                  </Button>
                </form>
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            <div className="space-y-2 text-center">
              <h1 className="text-2xl font-semibold text-foreground tracking-tight">
                Generador de Link Colega
              </h1>
              <p className="text-sm text-muted-foreground">Sesión activa: {loggedInEmail}</p>
            </div>

            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={handleLogout} className="gap-2">
                <LogOut className="h-4 w-4" />
                Cerrar sesión
              </Button>
            </div>

            <Card>
              <CardContent className="p-6 space-y-5">
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
        )}
      </main>
    </div>
  );
}
