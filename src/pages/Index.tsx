import { useState, useMemo, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Copy, ExternalLink, HelpCircle, History, Trash2 } from "lucide-react";
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

interface HistoryEntry {
  url: string;
  agencyName: string;
  type: string;
  propertyId: string;
  timestamp: number;
}

const HISTORY_KEY = "cupertino-link-history";
const MAX_HISTORY = 20;

function loadHistory(): HistoryEntry[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveHistory(entries: HistoryEntry[]) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(0, MAX_HISTORY)));
}

export default function Index() {
  const [selectedAgencyId, setSelectedAgencyId] = useState<number | null>(null);
  const [propertyType, setPropertyType] = useState<"Apartamentos" | "Casas">("Apartamentos");
  const [propertyId, setPropertyId] = useState("");
  const [generatedUrl, setGeneratedUrl] = useState("");
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>(loadHistory);

  const selectedAgency = useMemo(
    () => agencies.find((a) => a.id === selectedAgencyId),
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

    const entry: HistoryEntry = {
      url,
      agencyName: selectedAgency?.name || `ID ${selectedAgencyId}`,
      type: propertyType,
      propertyId: propertyId,
      timestamp: Date.now(),
    };
    const updated = [entry, ...history.filter((h) => h.url !== url)].slice(0, MAX_HISTORY);
    setHistory(updated);
    saveHistory(updated);
  };

  const handleCopy = async (url: string) => {
    await navigator.clipboard.writeText(url);
    toast.success("¡Link copiado!");
  };

  const handleClearHistory = () => {
    setHistory([]);
    saveHistory([]);
    toast("Historial borrado");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card py-6">
        <div className="mx-auto flex max-w-lg justify-center px-4">
          <img src={logo} alt="Cupertino Negocios Inmobiliarios" className="h-20 object-contain" />
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-8 space-y-6">
        <h1 className="text-2xl font-semibold text-foreground text-center tracking-tight">
          Generador de Link Colega
        </h1>

        {/* Form */}
        <Card>
          <CardContent className="p-6 space-y-5">
            {/* Agency selector */}
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs uppercase tracking-wider">Inmobiliaria colega</Label>
              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start font-normal"
                  >
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

            {/* Property type */}
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs uppercase tracking-wider">Tipo de propiedad</Label>
              <RadioGroup
                value={propertyType}
                onValueChange={(v) => setPropertyType(v as "Apartamentos" | "Casas")}
                className="flex gap-6"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="Apartamentos" id="apt" />
                  <Label htmlFor="apt" className="cursor-pointer">Apartamentos</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="Casas" id="casas" />
                  <Label htmlFor="casas" className="cursor-pointer">Casas</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Property ID */}
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs uppercase tracking-wider">ID de la propiedad</Label>
              <Input
                type="number"
                placeholder="Ej: 25656"
                value={propertyId}
                onChange={(e) => setPropertyId(e.target.value)}
              />
            </div>

            <Button className="w-full" onClick={handleGenerate}>
              Generar Link
            </Button>
          </CardContent>
        </Card>

        {/* Output */}
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

        {/* History */}
        {history.length > 0 && (
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <History className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-muted-foreground text-xs uppercase tracking-wider">Historial</Label>
                </div>
                <Button variant="ghost" size="sm" onClick={handleClearHistory} className="text-muted-foreground h-7 px-2">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="space-y-2">
                {history.map((entry) => (
                  <div
                    key={entry.timestamp}
                    className="flex items-center gap-2 rounded-lg bg-secondary p-3 group"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground truncate">
                        {entry.agencyName} · {entry.type} · ID {entry.propertyId}
                      </p>
                      <p className="text-sm font-mono text-foreground truncate">{entry.url}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 h-8 w-8"
                      onClick={() => handleCopy(entry.url)}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Help card */}
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
      </main>
    </div>
  );
}
