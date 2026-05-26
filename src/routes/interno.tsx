import { createFileRoute, Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  CalendarCheck,
  Clock,
  XCircle,
  FileText,
  PackageCheck,
  Timer,
  Inbox,
  ClipboardList,
  History,
  Users,
  ScanBarcode,
  ArrowRight,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useMemo } from "react";

export const Route = createFileRoute("/interno")({
  head: () => ({ meta: [{ title: "Dashboard — Portal Interno" }] }),
  component: InternoDashboard,
});

const todayISO = () => new Date().toISOString().slice(0, 10);

function useAppointments() {
  return useQuery({
    queryKey: ["dashboard-appointments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("id,status,scheduled_date,scheduled_time,nf_volumes,created_at,updated_at")
        .order("scheduled_date", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 30_000,
  });
}

function InternoDashboard() {
  const { isAdmin } = useAuth();
  const { data: appts = [], isLoading } = useAppointments();

  const today = todayISO();

  const metrics = useMemo(() => {
    const isToday = (d: string) => d === today;
    const confirmedToday = appts.filter((a) => isToday(a.scheduled_date) && a.status === "Confirmado").length;
    const pending = appts.filter((a) => a.status === "Pendente").length;
    const refusedToday = appts.filter(
      (a) => a.status === "Recusado" && a.updated_at?.slice(0, 10) === today,
    ).length;

    const nfScheduled = appts
      .filter((a) => a.status === "Confirmado" && a.scheduled_date >= today)
      .reduce((sum, a) => sum + (a.nf_volumes || 0), 0);

    const nfReceived = appts
      .filter((a) => a.status === "Confirmado" && a.scheduled_date < today)
      .reduce((sum, a) => sum + (a.nf_volumes || 0), 0);

    // Tempo médio de confirmação (minutos) entre created_at e updated_at em itens Confirmados
    const confirmed = appts.filter((a) => a.status === "Confirmado");
    let avgMin = 0;
    if (confirmed.length) {
      const total = confirmed.reduce((s, a) => {
        const c = new Date(a.created_at).getTime();
        const u = new Date(a.updated_at).getTime();
        return s + Math.max(0, (u - c) / 60000);
      }, 0);
      avgMin = Math.round(total / confirmed.length);
    }

    return { confirmedToday, pending, refusedToday, nfScheduled, nfReceived, avgMin };
  }, [appts, today]);

  // Heatmap: dia da semana (Seg-Sáb) x hora (08-17)
  const heat = useMemo(() => {
    const hours = Array.from({ length: 10 }, (_, i) => i + 8); // 8..17
    const days = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    const grid: number[][] = days.map(() => hours.map(() => 0));
    appts.forEach((a) => {
      if (a.status !== "Confirmado" || !a.scheduled_time) return;
      const dt = new Date(`${a.scheduled_date}T${a.scheduled_time}`);
      const dow = dt.getDay(); // 0 dom, 1 seg..6 sab
      const dayIdx = dow === 0 ? -1 : dow - 1; // Seg..Sáb
      if (dayIdx < 0 || dayIdx > 5) return;
      const h = dt.getHours();
      const hIdx = hours.indexOf(h);
      if (hIdx < 0) return;
      grid[dayIdx][hIdx]++;
    });
    const max = Math.max(1, ...grid.flat());
    return { hours, days, grid, max };
  }, [appts]);

  const navItems = [
    { to: "/recebimento", title: "Aprovar Agendas", icon: Inbox, adminOnly: true },
    { to: "/coleta", title: "Coleta de Volumes", icon: ScanBarcode },
    { to: "/cargas", title: "Romaneio de Saída", icon: ClipboardList },
    { to: "/historico", title: "Histórico", icon: History },
    { to: "/usuarios", title: "Usuários", icon: Users, adminOnly: true },
  ].filter((i) => !i.adminOnly || isAdmin);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Dashboard Operacional</h1>
          <p className="text-sm text-muted-foreground">
            Visão em tempo real dos agendamentos e recebimentos do dia.
          </p>
        </div>
        <nav className="flex flex-wrap gap-2">
          {navItems.map(({ to, title, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="inline-flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm font-medium hover:border-primary/40 hover:bg-accent transition-colors"
            >
              <Icon className="h-4 w-4" />
              {title}
            </Link>
          ))}
        </nav>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Coluna esquerda - cards */}
        <div className="lg:col-span-2 space-y-4">
          {/* Linha 1 - Resumo do dia */}
          <div className="grid gap-4 sm:grid-cols-3">
            <KpiCard
              title="Agendamentos Confirmados (Hoje)"
              value={metrics.confirmedToday}
              accent="emerald"
              icon={CalendarCheck}
              loading={isLoading}
            />
            <KpiCard
              title="Aguardando Análise"
              value={metrics.pending}
              accent="amber"
              icon={Clock}
              loading={isLoading}
            />
            <KpiCard
              title="Agendamentos Recusados"
              value={metrics.refusedToday}
              accent="rose"
              icon={XCircle}
              loading={isLoading}
            />
          </div>

          {/* Linha 2 - Operação */}
          <div className="grid gap-4 sm:grid-cols-3">
            <KpiCard
              title="NFs Agendadas"
              value={metrics.nfScheduled}
              accent="blue"
              icon={FileText}
              loading={isLoading}
              hint="Volumes em agendamentos futuros"
            />
            <KpiCard
              title="NFs Recebidas / Descarregadas"
              value={metrics.nfReceived}
              accent="violet"
              icon={PackageCheck}
              loading={isLoading}
              hint="Volumes já processados"
            />
            <KpiCard
              title="Tempo Médio de Confirmação"
              value={`${metrics.avgMin} min`}
              accent="slate"
              icon={Timer}
              loading={isLoading}
              hint="Da solicitação até o aceite"
            />
          </div>
        </div>

        {/* Heatmap lateral */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="font-semibold">Mapa de Ocupação</h2>
              <p className="text-xs text-muted-foreground">
                Agendamentos confirmados por dia × horário
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs border-separate border-spacing-1">
              <thead>
                <tr>
                  <th className="text-left text-muted-foreground font-medium pr-2"></th>
                  {heat.hours.map((h) => (
                    <th key={h} className="text-muted-foreground font-medium text-[10px]">
                      {String(h).padStart(2, "0")}h
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {heat.days.map((d, di) => (
                  <tr key={d}>
                    <td className="text-muted-foreground font-medium pr-2">{d}</td>
                    {heat.hours.map((h, hi) => {
                      const v = heat.grid[di][hi];
                      const intensity = v / heat.max;
                      return (
                        <td key={h}>
                          <div
                            className="aspect-square rounded-sm flex items-center justify-center text-[10px] font-medium transition-colors"
                            title={`${d} ${String(h).padStart(2, "0")}h — ${v} agend.`}
                            style={{
                              backgroundColor:
                                v === 0
                                  ? "hsl(var(--muted))"
                                  : `oklch(${0.92 - intensity * 0.45} ${0.12 + intensity * 0.08} 150)`,
                              color: intensity > 0.55 ? "white" : "hsl(var(--foreground))",
                            }}
                          >
                            {v || ""}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center gap-2 mt-4 text-[10px] text-muted-foreground">
            <span>Menos</span>
            <div className="flex gap-1 flex-1">
              {[0.1, 0.3, 0.5, 0.7, 0.95].map((i) => (
                <div
                  key={i}
                  className="h-2 flex-1 rounded-sm"
                  style={{ backgroundColor: `oklch(${0.92 - i * 0.45} ${0.12 + i * 0.08} 150)` }}
                />
              ))}
            </div>
            <span>Mais</span>
          </div>
        </Card>
      </div>

      {/* Atalhos */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {navItems.slice(0, 4).map(({ to, title, icon: Icon }) => (
          <Link key={to} to={to}>
            <Card className="p-4 hover:border-primary/40 hover:shadow-sm transition-all group">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="font-medium text-sm">{title}</span>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

type Accent = "emerald" | "amber" | "rose" | "blue" | "violet" | "slate";

const accentClasses: Record<Accent, { ring: string; bg: string; text: string; dot: string }> = {
  emerald: {
    ring: "border-l-emerald-500",
    bg: "bg-emerald-100 dark:bg-emerald-950",
    text: "text-emerald-700 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
  amber: {
    ring: "border-l-amber-500",
    bg: "bg-amber-100 dark:bg-amber-950",
    text: "text-amber-700 dark:text-amber-300",
    dot: "bg-amber-500",
  },
  rose: {
    ring: "border-l-rose-500",
    bg: "bg-rose-100 dark:bg-rose-950",
    text: "text-rose-700 dark:text-rose-300",
    dot: "bg-rose-500",
  },
  blue: {
    ring: "border-l-blue-500",
    bg: "bg-blue-100 dark:bg-blue-950",
    text: "text-blue-700 dark:text-blue-300",
    dot: "bg-blue-500",
  },
  violet: {
    ring: "border-l-violet-500",
    bg: "bg-violet-100 dark:bg-violet-950",
    text: "text-violet-700 dark:text-violet-300",
    dot: "bg-violet-500",
  },
  slate: {
    ring: "border-l-slate-500",
    bg: "bg-slate-100 dark:bg-slate-800",
    text: "text-slate-700 dark:text-slate-300",
    dot: "bg-slate-500",
  },
};

function KpiCard({
  title,
  value,
  accent,
  icon: Icon,
  loading,
  hint,
}: {
  title: string;
  value: number | string;
  accent: Accent;
  icon: React.ComponentType<{ className?: string }>;
  loading?: boolean;
  hint?: string;
}) {
  const c = accentClasses[accent];
  return (
    <Card className={`p-5 border-l-4 ${c.ring} flex flex-col gap-3`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide leading-tight">
          {title}
        </span>
        <div className={`p-2 rounded-lg ${c.bg} ${c.text}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="flex items-end gap-2">
        <span className="text-4xl font-bold tabular-nums">{loading ? "—" : value}</span>
        <span className={`h-2 w-2 rounded-full ${c.dot} mb-2`} />
      </div>
      {hint && <span className="text-[11px] text-muted-foreground -mt-1">{hint}</span>}
    </Card>
  );
}
