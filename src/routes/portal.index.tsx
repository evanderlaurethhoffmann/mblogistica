import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { AlertTriangle, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/portal/")({
  head: () => ({
    meta: [
      { title: "Portal do Fornecedor — Novo Endereço" },
      { name: "description", content: "O portal de agendamento mudou de endereço." },
    ],
  }),
  component: PortalNoticePage,
});

function PortalNoticePage() {
  const newUrl = "https://logistica.mbfarmacias.com.br";
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/30 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-2xl">
        <div className="flex justify-center mb-8">
          <img src="/logo.png" alt="MB Farmácias" style={{ maxWidth: 200 }} className="h-auto" />
        </div>
        <Card className="p-8 space-y-6 border-destructive/40">
          <div className="flex items-center gap-3 justify-center text-destructive">
            <AlertTriangle className="h-8 w-8" />
            <h1 className="text-2xl font-bold">Atenção — Endereço Alterado</h1>
          </div>

          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 text-center space-y-2">
            <p className="text-sm font-medium">
              A página de agendamento de fornecedores foi <strong>migrada</strong> para um novo endereço:
            </p>
            <a
              href={newUrl}
              className="inline-flex items-center gap-2 text-lg font-bold text-primary hover:underline break-all"
            >
              <ExternalLink className="h-5 w-5 shrink-0" />
              logistica.mbfarmacias.com.br
            </a>
          </div>

          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              ✅ <strong className="text-foreground">Novas solicitações</strong> de agendamento devem ser
              realizadas exclusivamente através do novo link acima.
            </p>
            <p>
              ✅ <strong className="text-foreground">Agendamentos já solicitados ou confirmados</strong> nesta
              plataforma serão <strong className="text-foreground">mantidos normalmente</strong> e honrados pelo
              Centro de Distribuição.
            </p>
            <p>
              🚫 <strong className="text-foreground">O acesso ao login deste endereço foi desativado.</strong>
            </p>
          </div>

          <a
            href={newUrl}
            className="block w-full text-center bg-primary text-primary-foreground rounded-md py-3 font-semibold hover:opacity-90 transition"
          >
            Ir para o novo portal →
          </a>
        </Card>
        <p className="text-center text-xs text-muted-foreground mt-6">
          Em caso de dúvidas, entre em contato com o CD.
        </p>
      </div>
    </div>
  );
}
