import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { AdminOnly } from "@/components/Layout";

export const Route = createFileRoute("/cadastros")({
  head: () => ({ meta: [{ title: "Cadastros — Romaneio" }] }),
  component: () => (
    <AdminOnly>
      <CadastrosLayout />
    </AdminOnly>
  ),
});

const tabs = [
  { to: "/cadastros/filiais", label: "Filiais" },
  { to: "/cadastros/conferentes", label: "Conferentes" },
  { to: "/cadastros/motoristas", label: "Motoristas" },
];

function CadastrosLayout() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Cadastros</h1>
        <p className="text-sm text-muted-foreground">Gerencie os dados usados nos seletores do sistema.</p>
      </div>
      <Card className="p-2">
        <nav className="flex gap-1">
          {tabs.map((t) => (
            <Link
              key={t.to}
              to={t.to}
              className="px-4 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-secondary"
              activeProps={{ className: "!bg-primary !text-primary-foreground" }}
            >
              {t.label}
            </Link>
          ))}
        </nav>
      </Card>
      <Outlet />
    </div>
  );
}
