import { createFileRoute, Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Truck, Warehouse, ClipboardList, BarChart3, ArrowRight, Lock } from "lucide-react";
import { useAuth, type ModuleKey } from "@/hooks/use-auth";

export const Route = createFileRoute("/interno")({
  head: () => ({ meta: [{ title: "YAN Dashboard" }] }),
  component: HubPage,
});

const mainModules: Array<{
  key: ModuleKey;
  to: "/yms" | "/wms" | "/tms";
  title: string;
  subtitle: string;
  icon: typeof Truck;
  gradient: string;
}> = [
  { key: "yms", to: "/yms", title: "YMS", subtitle: "RECEBIMENTO / AGENDAMENTOS", icon: Truck, gradient: "from-emerald-500 to-emerald-700" },
  { key: "wms", to: "/wms", title: "WMS", subtitle: "DEPÓSITO", icon: Warehouse, gradient: "from-amber-500 to-amber-700" },
  { key: "tms", to: "/tms", title: "TMS", subtitle: "EXPEDIÇÃO / ROMANEIOS", icon: ClipboardList, gradient: "from-blue-500 to-blue-700" },
];

function HubPage() {
  const { canAccess } = useAuth();

  return (
    <div className="min-h-[80vh] flex flex-col items-center pt-4">
      <div className="flex flex-col items-center mb-12">
        <img src="/logo.png" alt="MB Logística by YAN" style={{ maxWidth: 260 }} className="w-full h-auto" />
        <p className="text-sm text-muted-foreground uppercase tracking-widest mt-4 font-semibold">
          Centro de Distribuição · Hub Operacional
        </p>
      </div>

      <div className="w-full max-w-6xl space-y-6">
        <div className="grid gap-6 md:grid-cols-3">
          {mainModules.map((m) => {
            const allowed = canAccess(m.key);
            const card = (
              <Card className={`p-8 h-56 flex flex-col justify-between border-2 transition-all duration-200 ${allowed ? "hover:border-primary/50 hover:shadow-xl group-hover:-translate-y-1" : "opacity-50 grayscale cursor-not-allowed"}`}>
                <div className={`p-4 w-fit rounded-2xl bg-gradient-to-br ${m.gradient} text-white shadow-lg relative`}>
                  <m.icon className="h-8 w-8" />
                  {!allowed && (
                    <div className="absolute -top-2 -right-2 bg-background border-2 border-muted-foreground/30 rounded-full p-1">
                      <Lock className="h-3 w-3 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div>
                  <h2 className="text-4xl font-black tracking-tight">{m.title}</h2>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-widest font-bold mt-2">
                    {allowed ? m.subtitle : "Acesso bloqueado"}
                  </p>
                </div>
              </Card>
            );
            return allowed ? (
              <Link key={m.key} to={m.to} className="group">{card}</Link>
            ) : (
              <div key={m.key} title="Você não tem permissão para acessar este módulo">{card}</div>
            );
          })}
        </div>

        {(() => {
          const allowed = canAccess("analytics");
          const card = (
            <Card className={`p-8 h-36 flex items-center justify-between border-2 transition-all duration-200 ${allowed ? "hover:border-primary/50 hover:shadow-xl group-hover:-translate-y-1" : "opacity-50 grayscale cursor-not-allowed"}`}>
              <div className="flex items-center gap-6">
                <div className="p-4 rounded-2xl bg-gradient-to-br from-violet-500 to-violet-700 text-white shadow-lg relative">
                  <BarChart3 className="h-8 w-8" />
                  {!allowed && (
                    <div className="absolute -top-2 -right-2 bg-background border-2 border-muted-foreground/30 rounded-full p-1">
                      <Lock className="h-3 w-3 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div>
                  <h2 className="text-4xl font-black tracking-tight">ANALYTICS</h2>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-widest font-bold mt-2">
                    {allowed ? "Relatórios e Controles do CD" : "Acesso bloqueado"}
                  </p>
                </div>
              </div>
              {allowed && <ArrowRight className="h-7 w-7 text-muted-foreground group-hover:translate-x-1 transition-transform" />}
            </Card>
          );
          return allowed ? (
            <Link to="/analytics" className="group block">{card}</Link>
          ) : (
            <div title="Você não tem permissão para acessar este módulo">{card}</div>
          );
        })()}
      </div>
    </div>
  );
}
