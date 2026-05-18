import { Link, Outlet } from "@tanstack/react-router";
import { Package, Settings, ClipboardList, ScanBarcode } from "lucide-react";

const navItems = [
  { to: "/", label: "Coleta", icon: ScanBarcode },
  { to: "/cargas", label: "Cargas / Fechamento", icon: ClipboardList },
  { to: "/cadastros", label: "Cadastros", icon: Settings },
];

export function Layout() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card shadow-sm">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg">Romaneio</span>
          </div>
          <nav className="flex gap-1">
            {navItems.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                activeOptions={{ exact: to === "/" }}
                className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                activeProps={{ className: "!bg-primary !text-primary-foreground" }}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
