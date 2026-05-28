import { createFileRoute, Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Truck, Warehouse, ClipboardList, BarChart3, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/interno")({
  head: () => ({ meta: [{ title: "YAN Dashboard" }] }),
  component: HubPage,
});

const mainModules = [
  {
    to: "/yms" as const,
    title: "YMS",
    subtitle: "RECEBIMENTO / AGENDAMENTOS",
    icon: Truck,
    gradient: "from-emerald-500 to-emerald-700",
  },
  {
    to: "/wms" as const,
    title: "WMS",
    subtitle: "DEPÓSITO",
    icon: Warehouse,
    gradient: "from-amber-500 to-amber-700",
  },
  {
    to: "/tms" as const,
    title: "TMS",
    subtitle: "EXPEDIÇÃO / ROMANEIOS",
    icon: ClipboardList,
    gradient: "from-blue-500 to-blue-700",
  },
];

function HubPage() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center pt-4">
      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold tracking-tight">YAN DASHBOARD</h1>
        <p className="text-sm text-muted-foreground uppercase tracking-widest mt-2 font-semibold">
          Centro de Distribuição · Hub Operacional
        </p>
      </div>

      <div className="w-full max-w-6xl space-y-6">
        <div className="grid gap-6 md:grid-cols-3">
          {mainModules.map((m) => (
            <Link key={m.to} to={m.to} className="group">
              <Card className="p-8 h-56 flex flex-col justify-between border-2 hover:border-primary/50 hover:shadow-xl transition-all duration-200 group-hover:-translate-y-1">
                <div className={`p-4 w-fit rounded-2xl bg-gradient-to-br ${m.gradient} text-white shadow-lg`}>
                  <m.icon className="h-8 w-8" />
                </div>
                <div>
                  <h2 className="text-4xl font-black tracking-tight">{m.title}</h2>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-widest font-bold mt-2">
                    {m.subtitle}
                  </p>
                </div>
              </Card>
            </Link>
          ))}
        </div>

        <Link to="/analytics" className="group block">
          <Card className="p-8 h-36 flex items-center justify-between border-2 hover:border-primary/50 hover:shadow-xl transition-all duration-200 group-hover:-translate-y-1">
            <div className="flex items-center gap-6">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-violet-500 to-violet-700 text-white shadow-lg">
                <BarChart3 className="h-8 w-8" />
              </div>
              <div>
                <h2 className="text-4xl font-black tracking-tight">ANALYTICS</h2>
                <p className="text-[11px] text-muted-foreground uppercase tracking-widest font-bold mt-2">
                  Relatórios e Controles do CD
                </p>
              </div>
            </div>
            <ArrowRight className="h-7 w-7 text-muted-foreground group-hover:translate-x-1 transition-transform" />
          </Card>
        </Link>
      </div>
    </div>
  );
}
