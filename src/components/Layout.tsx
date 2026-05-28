import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import {
  Package, Settings, ClipboardList, ScanBarcode, Users, LogOut, Cog,
  History, Inbox, LayoutGrid, FileText, LayoutDashboard, Home, Truck,
  Warehouse, BarChart3,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { LoginPage } from "@/components/LoginPage";
import { Button } from "@/components/ui/button";

type ModuleKey = "yms" | "wms" | "tms" | "analytics";

type NavItem = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
  exact?: boolean;
};

const moduleConfigs: Record<ModuleKey, {
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
  items: NavItem[];
}> = {
  yms: {
    title: "YMS",
    subtitle: "Recebimento / Agendamentos",
    icon: Truck,
    accent: "text-emerald-600",
    items: [
      { to: "/yms", label: "Dashboard de Indicadores", icon: LayoutDashboard, exact: true },
      { to: "/recebimento", label: "Solicitações de Agendamento", icon: Inbox },
      { to: "/docas", label: "Painel de Ocupação de Docas", icon: LayoutGrid },
      { to: "/notas-fiscais", label: "Conferência de NFs", icon: FileText },
      { to: "/cadastros", label: "Cadastros Base", icon: Settings },
      { to: "/configuracoes", label: "Configurações", icon: Cog, adminOnly: true },
    ],
  },
  tms: {
    title: "TMS",
    subtitle: "Expedição / Romaneios",
    icon: ClipboardList,
    accent: "text-blue-600",
    items: [
      { to: "/tms", label: "Visão Geral", icon: LayoutDashboard, exact: true },
      { to: "/coleta", label: "Coleta de Volumes (Bipe)", icon: ScanBarcode },
      { to: "/cargas", label: "Fechamento de Cargas", icon: ClipboardList },
      { to: "/historico", label: "Histórico de Romaneios", icon: History },
    ],
  },
  wms: {
    title: "WMS",
    subtitle: "Depósito",
    icon: Warehouse,
    accent: "text-amber-600",
    items: [
      { to: "/wms", label: "Visão Geral", icon: LayoutDashboard, exact: true },
    ],
  },
  analytics: {
    title: "Analytics",
    subtitle: "Relatórios e Controles",
    icon: BarChart3,
    accent: "text-violet-600",
    items: [
      { to: "/analytics", label: "Visão Geral", icon: LayoutDashboard, exact: true },
      { to: "/usuarios", label: "Usuários", icon: Users, adminOnly: true },
    ],
  },
};

function getModule(pathname: string): ModuleKey | null {
  if (pathname.startsWith("/yms")) return "yms";
  if (
    pathname.startsWith("/recebimento") ||
    pathname.startsWith("/docas") ||
    pathname.startsWith("/notas-fiscais") ||
    pathname.startsWith("/cadastros") ||
    pathname.startsWith("/configuracoes")
  ) return "yms";
  if (pathname.startsWith("/tms")) return "tms";
  if (
    pathname.startsWith("/coleta") ||
    pathname.startsWith("/cargas") ||
    pathname.startsWith("/historico")
  ) return "tms";
  if (pathname.startsWith("/wms")) return "wms";
  if (pathname.startsWith("/analytics") || pathname.startsWith("/usuarios")) return "analytics";
  return null;
}

export function Layout() {
  const { user, loading, isAdmin, role, signOut } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  // Rotas públicas (sem chrome interno)
  if (pathname === "/" || pathname.startsWith("/portal")) {
    return <Outlet />;
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Carregando…</div>;
  }

  if (!user) return <LoginPage />;

  // Hub (sem sidebar)
  if (pathname === "/interno") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-background to-slate-100 dark:from-slate-950 dark:via-background dark:to-slate-900">
        <header className="border-b bg-card/70 backdrop-blur-sm">
          <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="h-6 w-6 text-primary" />
              <span className="font-bold">YAN · Logística CD</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-muted-foreground hidden sm:inline">
                {user.email} <span className="ml-1 text-xs uppercase font-bold text-primary">({role})</span>
              </span>
              <Button size="sm" variant="ghost" onClick={signOut} className="gap-1">
                <LogOut className="h-4 w-4" /> Sair
              </Button>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-6 py-10">
          <Outlet />
        </main>
      </div>
    );
  }

  const moduleKey = getModule(pathname);
  const config = moduleKey ? moduleConfigs[moduleKey] : null;

  // Fallback (rota interna desconhecida): apenas header com voltar
  if (!config) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card">
          <div className="mx-auto max-w-7xl px-6 py-3 flex items-center justify-between">
            <Link to="/interno" className="flex items-center gap-2 font-semibold">
              <Home className="h-4 w-4" /> Voltar ao Hub YAN
            </Link>
            <Button size="sm" variant="ghost" onClick={signOut} className="gap-1">
              <LogOut className="h-4 w-4" /> Sair
            </Button>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-6 py-8"><Outlet /></main>
      </div>
    );
  }

  const ModuleIcon = config.icon;

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="w-64 shrink-0 border-r bg-card flex flex-col print:hidden">
        <Link
          to="/interno"
          className="flex items-center gap-2 px-4 py-3 border-b text-sm font-semibold hover:bg-accent transition-colors"
        >
          <Home className="h-4 w-4" />
          Voltar ao Hub YAN
        </Link>

        <div className="px-4 py-4 border-b">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg bg-muted ${config.accent}`}>
              <ModuleIcon className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Módulo</div>
              <div className="font-bold text-lg leading-none mt-0.5">{config.title}</div>
              <div className="text-[11px] text-muted-foreground">{config.subtitle}</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {config.items.filter((i) => !i.adminOnly || isAdmin).map(({ to, label, icon: Icon, exact }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: !!exact }}
              className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
              activeProps={{ className: "!bg-primary !text-primary-foreground" }}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{label}</span>
            </Link>
          ))}
        </nav>

        <div className="p-3 border-t text-xs text-muted-foreground">
          <div className="truncate">{user.email}</div>
          <div className="uppercase font-bold text-primary text-[10px] mt-0.5">{role}</div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="border-b bg-card print:hidden">
          <div className="px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Package className="h-4 w-4 text-primary" />
              <span>YAN Dashboard</span>
              <span>/</span>
              <span className="font-semibold text-foreground">{config.title}</span>
            </div>
            <Button size="sm" variant="ghost" onClick={signOut} className="gap-1">
              <LogOut className="h-4 w-4" /> Sair
            </Button>
          </div>
        </header>
        <main className="flex-1 px-6 py-8 print:p-0 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export function AdminOnly({ children }: { children: React.ReactNode }) {
  const { isAdmin, loading } = useAuth();
  if (loading) return null;
  if (!isAdmin) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-bold">Acesso restrito</h2>
        <p className="text-muted-foreground mt-2">Esta área é exclusiva para administradores.</p>
      </div>
    );
  }
  return <>{children}</>;
}
