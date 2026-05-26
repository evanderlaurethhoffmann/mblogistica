import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Package, Settings, ClipboardList, ScanBarcode, Users, LogOut, Cog, History, Inbox } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { LoginPage } from "@/components/LoginPage";
import { Button } from "@/components/ui/button";

export function Layout() {
  const { user, loading, isAdmin, role, signOut } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  // Public routes (no auth / no internal chrome)
  if (pathname === "/" || pathname.startsWith("/portal")) {
    return <Outlet />;
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Carregando…</div>;
  }

  if (!user) return <LoginPage />;

  const navItems = [
    { to: "/interno", label: "Menu", icon: Package, show: true },
    { to: "/coleta", label: "Coleta", icon: ScanBarcode, show: true },
    { to: "/cargas", label: "Cargas / Fechamento", icon: ClipboardList, show: true },
    { to: "/historico", label: "Histórico", icon: History, show: true },
    { to: "/recebimento", label: "Recebimento", icon: Inbox, show: isAdmin },
    { to: "/cadastros", label: "Cadastros", icon: Settings, show: isAdmin },
    { to: "/usuarios", label: "Usuários", icon: Users, show: isAdmin },
    { to: "/configuracoes", label: "Configurações", icon: Cog, show: isAdmin },
  ];


  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card shadow-sm print:hidden">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Package className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg">Romaneio</span>
          </div>
          <nav className="flex gap-1 flex-wrap">
            {navItems.filter(n => n.show).map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                activeOptions={{ exact: to === "/" }}
                className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                activeProps={{ className: "!bg-primary !text-primary-foreground" }}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
          </nav>
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
      <main className="mx-auto max-w-7xl px-6 py-8 print:p-0 print:max-w-none">
        <Outlet />
      </main>
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
