import { createFileRoute, Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { ScanBarcode, ClipboardList, History, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/tms")({
  head: () => ({ meta: [{ title: "TMS — Expedição / Romaneios" }] }),
  component: TmsLanding,
});

const items = [
  { to: "/coleta" as const, title: "Coleta de Volumes (Bipe)", desc: "Bipagem de caixas para romaneio de saída.", icon: ScanBarcode },
  { to: "/cargas" as const, title: "Fechamento de Cargas", desc: "Consolidação e fechamento de romaneios.", icon: ClipboardList },
  { to: "/historico" as const, title: "Histórico de Romaneios", desc: "Consulta de conferências passadas.", icon: History },
];

function TmsLanding() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">TMS — Expedição / Romaneios</h1>
        <p className="text-sm text-muted-foreground">Selecione uma operação da expedição.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((m) => (
          <Link key={m.to} to={m.to} className="group">
            <Card className="p-6 h-full hover:border-primary/50 hover:shadow-md transition-all">
              <div className="flex items-start justify-between">
                <div className="p-3 rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                  <m.icon className="h-6 w-6" />
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
              </div>
              <h3 className="font-semibold mt-4">{m.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{m.desc}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
