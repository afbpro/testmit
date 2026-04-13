import { Card, CardContent } from "@/components/ui/card";

export function KpiCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card className="bg-black/80 border-white/10 text-white">
      <CardContent className="flex flex-col items-center justify-center py-6">
        <div className="text-3xl font-bold">{value}</div>
        <div className="mt-2 text-xs uppercase tracking-widest text-zinc-400">{label}</div>
      </CardContent>
    </Card>
  );
}
