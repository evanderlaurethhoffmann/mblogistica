import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { SupplierAuthProvider, useSupplierAuth } from "@/hooks/use-supplier-auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CalendarCheck, LogIn, UserPlus } from "lucide-react";

export const Route = createFileRoute("/portal/")({
  head: () => ({
    meta: [
      { title: "Portal do Fornecedor — YAN" },
      { name: "description", content: "Acesso de fornecedores para agendamento de entregas." },
    ],
  }),
  component: () => (
    <SupplierAuthProvider>
      <PortalLanding />
    </SupplierAuthProvider>
  ),
});

function PortalLanding() {
  const { supplier, loading } = useSupplierAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && supplier) navigate({ to: "/portal/painel", replace: true });
  }, [loading, supplier, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/30 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-2xl">
        <div className="flex justify-center mb-8">
          <img src="/logo.png" alt="YAN — Your Active Network" style={{ maxWidth: 200 }} className="h-auto" />
        </div>
        <Card className="p-8 text-center space-y-6">
          <h1 className="text-2xl font-bold">Bem-vindo ao Portal do Fornecedor</h1>
          <p className="text-muted-foreground">
            Faça login com seu CNPJ para gerenciar seus agendamentos no Centro de Distribuição,
            ou crie uma conta caso esta seja sua primeira solicitação.
          </p>
          <div className="grid sm:grid-cols-2 gap-3 pt-2">
            <Button asChild size="lg" className="gap-2">
              <Link to="/portal/login" search={{ tab: "login" }}><LogIn className="h-5 w-5" /> Entrar</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="gap-2">
              <Link to="/portal/login" search={{ tab: "register" }}><UserPlus className="h-5 w-5" /> Criar Conta</Link>
            </Button>
          </div>
          <div className="pt-4 border-t">
            <Button asChild variant="ghost" className="gap-2">
              <Link to="/portal/login"><CalendarCheck className="h-4 w-4" /> Solicitar Agendamento</Link>
            </Button>
          </div>
        </Card>
        <p className="text-center text-xs text-muted-foreground mt-6">
          Em caso de dúvidas, entre em contato com o CD.
        </p>
      </div>
    </div>
  );
}
