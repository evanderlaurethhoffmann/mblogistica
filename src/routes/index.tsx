import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Truck, Building2, ArrowRight, Lock, Globe, Package } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sistema Integrado de Logística — CD" },
      { name: "description", content: "Hub central de acessos: Portal do Fornecedor e Portal Interno do Centro de Distribuição." },
    ],
  }),
  component: HubPage,
});

function HubPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const goInternal = () => {
    if (loading) return;
    navigate({ to: user ? "/interno" : "/coleta" });
    // If not logged in, Layout will intercept /coleta and render the LoginPage.
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-background to-slate-100 dark:from-slate-950 dark:via-background dark:to-slate-900">
      <header className="border-b bg-card/70 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-6 py-6 flex flex-col items-center text-center gap-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Package className="h-7 w-7 text-primary" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              SISTEMA INTEGRADO DE LOGÍSTICA — CD
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Hub central de acessos · Centro de Distribuição
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Portal do Fornecedor */}
          <Card className="p-8 flex flex-col gap-6 border-2 hover:border-primary/40 transition-colors shadow-sm hover:shadow-md">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                <Truck className="h-7 w-7" />
              </div>
              <div>
                <div className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                  <Globe className="h-3 w-3" /> Acesso Público
                </div>
                <h2 className="text-2xl font-bold">Portal do Fornecedor</h2>
              </div>
            </div>

            <p className="text-muted-foreground leading-relaxed">
              Área destinada a fornecedores e transportadoras para cadastro e
              agendamento de recebimento de mercadorias.
            </p>

            <ul className="text-sm text-muted-foreground space-y-1.5 flex-1">
              <li>· Cadastro rápido por CNPJ</li>
              <li>· Envio da NF e dados do veículo</li>
              <li>· Calendário com janelas disponíveis (15 dias)</li>
            </ul>

            <Link to="/portal" className="block">
              <Button size="lg" className="w-full gap-2">
                Solicitar Agendamento
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </Card>

          {/* Portal Interno */}
          <Card className="p-8 flex flex-col gap-6 border-2 hover:border-primary/40 transition-colors shadow-sm hover:shadow-md">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                <Building2 className="h-7 w-7" />
              </div>
              <div>
                <div className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-400">
                  <Lock className="h-3 w-3" /> Acesso Restrito
                </div>
                <h2 className="text-2xl font-bold">Portal Interno</h2>
              </div>
            </div>

            <p className="text-muted-foreground leading-relaxed">
              Área restrita para colaboradores do CD. Controle de carregamentos,
              conferência e aprovações.
            </p>

            <ul className="text-sm text-muted-foreground space-y-1.5 flex-1">
              <li>· Aprovações de Agendamento</li>
              <li>· Controle de Romaneios (bipe / fechamento)</li>
              <li>· Histórico e Consultas</li>
              <li>· Gerenciamento de Usuários (Admin)</li>
            </ul>

            <Button size="lg" variant="default" className="w-full gap-2" onClick={goInternal} disabled={loading}>
              Acessar Sistema Interno
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Card>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-10">
          © {new Date().getFullYear()} Centro de Distribuição · Acesso interno apenas para usuários autorizados.
        </p>
      </main>
    </div>
  );
}
