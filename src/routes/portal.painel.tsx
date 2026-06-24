import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { SupplierAuthProvider, useSupplierAuth } from "@/hooks/use-supplier-auth";
import { getSupplierAppointments } from "@/lib/supplier-auth.functions";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { LogOut, Info, AlertTriangle, ExternalLink } from "lucide-react";


export const Route = createFileRoute("/portal/painel")({
  head: () => ({ meta: [{ title: "Meu Painel — YAN" }] }),
  component: () => (
    <SupplierAuthProvider>
      <Painel />
    </SupplierAuthProvider>
  ),
});

function statusBadge(status: string) {
  if (status === "Confirmado") return <Badge className="bg-green-600 hover:bg-green-700">Confirmado</Badge>;
  if (status === "Recusado") return <Badge className="bg-red-600 hover:bg-red-700">Recusado</Badge>;
  return <Badge className="bg-yellow-500 hover:bg-yellow-600 text-black">Pendente</Badge>;
}

function Painel() {
  const { supplier, token, loading, logout } = useSupplierAuth();
  const navigate = useNavigate();
  const fetchAppts = useServerFn(getSupplierAppointments);

  const [items, setItems] = useState<any[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [open, setOpen] = useState(false);

  const refresh = useCallback(async () => {
    if (!token) return;
    setLoadingList(true);
    try {
      const res = await fetchAppts({ data: { token } });
      setItems(res.appointments);
    } finally {
      setLoadingList(false);
    }
  }, [token, fetchAppts]);

  useEffect(() => {
    if (!loading && !supplier) navigate({ to: "/portal/login", replace: true });
  }, [loading, supplier, navigate]);

  useEffect(() => { if (supplier) refresh(); }, [supplier, refresh]);

  if (loading || !supplier || !token) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Carregando…</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/30 px-4 py-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-col items-center gap-3">
          <img src="/logo.png" alt="YAN" style={{ maxWidth: 200 }} className="h-auto" />
          <div className="flex items-center justify-between w-full">
            <div>
              <h1 className="text-xl font-bold">{supplier.nome_fantasia}</h1>
              <p className="text-sm text-muted-foreground">Painel do Fornecedor</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => logout().then(() => navigate({ to: "/portal" }))} className="gap-1">
              <LogOut className="h-4 w-4" /> Sair
            </Button>
          </div>
        </header>

        <Alert variant="destructive" className="border-destructive/60">
          <AlertTriangle className="h-5 w-5" />
          <AlertTitle className="text-base font-bold">Atenção: Novas solicitações migraram de endereço</AlertTitle>
          <AlertDescription className="space-y-3 mt-2">
            <p>
              As <strong>novas solicitações de agendamento</strong> agora devem ser feitas exclusivamente pelo novo portal:
            </p>
            <a
              href="https://logistica.mbfarmacias.com.br"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 font-semibold underline underline-offset-4 break-all"
            >
              logistica.mbfarmacias.com.br <ExternalLink className="h-4 w-4" />
            </a>
            <p className="text-sm">
              Solicitações já <strong>confirmadas</strong> ou <strong>pendentes</strong> registradas aqui serão mantidas normalmente. Este painel ficará disponível apenas para consulta.
            </p>
          </AlertDescription>
        </Alert>


        <Card className="p-2">
          <div className="p-4 pb-2"><h2 className="font-semibold">Histórico de Solicitações</h2></div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Protocolo</TableHead>
                <TableHead>Data/Hora Solicitada</TableHead>
                <TableHead>Volumes</TableHead>
                <TableHead>Placa</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingList && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">Carregando…</TableCell></TableRow>
              )}
              {!loadingList && items.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">Nenhuma solicitação ainda.</TableCell></TableRow>
              )}
              {items.map((it) => (
                <TableRow key={it.id}>
                  <TableCell className="font-mono text-xs">{it.protocol ?? it.id.slice(0, 8).toUpperCase()}</TableCell>
                  <TableCell>{new Date(it.scheduled_date + "T" + it.scheduled_time).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</TableCell>
                  <TableCell>{it.nf_volumes}</TableCell>
                  <TableCell className="font-mono">{it.vehicle_plate}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {statusBadge(it.status)}
                      {it.status === "Recusado" && it.refusal_reason && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs"><p className="text-sm"><strong>Motivo:</strong> {it.refusal_reason}</p></TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>

    </div>
  );
}

