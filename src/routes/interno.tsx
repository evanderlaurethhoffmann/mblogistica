import { createFileRoute, Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Inbox, ClipboardList, History, Users, ArrowRight, ScanBarcode } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/interno")({
  head: () => ({ meta: [{ title: "Portal Interno — Menu" }] }),
  component: InternoMenu,
});

function InternoMenu() {
  const { isAdmin } = useAuth();

  const items = [
    {
      to: "/recebimento",
      title: "Aprovações de Agendamento",
      desc: "Gestão de recebimento de cargas dos fornecedores.",
      icon: Inbox,
      adminOnly: true,
    },
    {
      to: "/coleta",
      title: "Coleta de Volumes",
      desc: "Bipe e conferência de volumes na doca.",
      icon: ScanBarcode,
      adminOnly: false,
    },
    {
      to: "/cargas",
      title: "Controle de Romaneios",
      desc: "Fechamento de cargas e emissão de romaneio.",
      icon: ClipboardList,
      adminOnly: false,
    },
    {
      to: "/historico",
      title: "Histórico e Consultas",
      desc: "Banco de dados de conferências passadas.",
      icon: History,
      adminOnly: false,
    },
    {
      to: "/usuarios",
      title: "Gerenciamento de Usuários",
      desc: "Cadastro e permissões de operadores (Administrador).",
      icon: Users,
      adminOnly: true,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Portal Interno</h1>
        <p className="text-sm text-muted-foreground">Selecione uma área para continuar.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items
          .filter((i) => !i.adminOnly || isAdmin)
          .map(({ to, title, desc, icon: Icon }) => (
            <Link key={to} to={to}>
              <Card className="p-6 h-full hover:border-primary/40 hover:shadow-md transition-all cursor-pointer group">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold">{title}</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4">{desc}</p>
                <div className="flex items-center gap-1 text-sm text-primary font-medium group-hover:gap-2 transition-all">
                  Abrir <ArrowRight className="h-4 w-4" />
                </div>
              </Card>
            </Link>
          ))}
      </div>
    </div>
  );
}
