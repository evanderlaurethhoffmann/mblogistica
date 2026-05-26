import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Inbox, Check, X, Download, Ban, CalendarX } from "lucide-react";
import { AdminOnly } from "@/components/Layout";

export const Route = createFileRoute("/recebimento")({
  head: () => ({ meta: [{ title: "Gestão de Recebimento" }] }),
  component: () => <AdminOnly><RecebimentoPage /></AdminOnly>,
});

function ymd(d: Date) {
  const y = d.getFullYear(); const m = String(d.getMonth() + 1).padStart(2, "0"); const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${da}`;
}

function RecebimentoPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Inbox className="h-6 w-6" /> Gestão de Recebimento</h1>
        <p className="text-sm text-muted-foreground">Aprove agendamentos enviados pelos fornecedores e gerencie dias bloqueados.</p>
      </div>

      <Tabs defaultValue="pendentes">
        <TabsList>
          <TabsTrigger value="pendentes">Pendentes</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
          <TabsTrigger value="dias">Configuração de Dias</TabsTrigger>
        </TabsList>
        <TabsContent value="pendentes"><ListaAgendamentos statusFilter="Pendente" /></TabsContent>
        <TabsContent value="historico"><ListaAgendamentos statusFilter={null} /></TabsContent>
        <TabsContent value="dias"><DiasBloqueados /></TabsContent>
      </Tabs>
    </div>
  );
}

function ListaAgendamentos({ statusFilter }: { statusFilter: string | null }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState<any | null>(null);
  const [refusal, setRefusal] = useState("");
  const [editMinutes, setEditMinutes] = useState(0);
  const [showRefuse, setShowRefuse] = useState(false);

  const { data = [], isLoading } = useQuery({
    queryKey: ["appointments", statusFilter],
    queryFn: async () => {
      let q = supabase.from("appointments").select("*, suppliers(nome_fantasia, razao_social, cnpj, whatsapp, email)").order("scheduled_date").order("scheduled_time");
      if (statusFilter) q = q.eq("status", statusFilter);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const accept = useMutation({
    mutationFn: async ({ id, minutes }: { id: string; minutes: number }) => {
      const { error } = await supabase.from("appointments")
        .update({ status: "Confirmado", estimated_minutes: minutes, refusal_reason: null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["appointments"] }); toast.success("Agendamento confirmado."); setOpen(null); },
    onError: (e: Error) => toast.error(e.message),
  });
  const refuse = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { error } = await supabase.from("appointments")
        .update({ status: "Recusado", refusal_reason: reason })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["appointments"] }); toast.success("Agendamento recusado."); setOpen(null); setShowRefuse(false); setRefusal(""); },
    onError: (e: Error) => toast.error(e.message),
  });

  const downloadNf = async (path: string) => {
    const { data, error } = await supabase.storage.from("nf-uploads").createSignedUrl(path, 60);
    if (error || !data?.signedUrl) { toast.error("Falha ao gerar link."); return; }
    window.open(data.signedUrl, "_blank");
  };

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      Pendente: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
      Confirmado: "bg-green-500/15 text-green-700 dark:text-green-400",
      Recusado: "bg-destructive/15 text-destructive",
    };
    return <Badge variant="outline" className={map[s] ?? ""}>{s}</Badge>;
  };

  return (
    <Card className="p-4">
      {isLoading ? <p className="text-sm text-muted-foreground p-4">Carregando…</p> : data.length === 0 ? (
        <p className="text-sm text-muted-foreground p-4 text-center">Nenhuma solicitação.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data / Hora</TableHead>
              <TableHead>Fornecedor</TableHead>
              <TableHead>Veículo</TableHead>
              <TableHead>Volumes</TableHead>
              <TableHead>Tempo (min)</TableHead>
              <TableHead>Status</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((a: any) => (
              <TableRow key={a.id} className="cursor-pointer" onClick={() => { setOpen(a); setEditMinutes(a.estimated_minutes); setShowRefuse(false); setRefusal(""); }}>
                <TableCell>{a.scheduled_date.split("-").reverse().join("/")} {(a.scheduled_time as string).slice(0, 5)}</TableCell>
                <TableCell>
                  <div className="font-medium">{a.suppliers?.nome_fantasia ?? "—"}</div>
                  <div className="text-xs text-muted-foreground">{a.suppliers?.cnpj}</div>
                </TableCell>
                <TableCell>{a.vehicle_type} · {a.vehicle_plate}</TableCell>
                <TableCell>{a.nf_volumes}</TableCell>
                <TableCell>{a.estimated_minutes}</TableCell>
                <TableCell>{statusBadge(a.status)}</TableCell>
                <TableCell><Button size="sm" variant="ghost">Abrir</Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={!!open} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Agendamento</DialogTitle>
          </DialogHeader>
          {open && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Fornecedor:</span> <strong>{open.suppliers?.nome_fantasia}</strong></div>
                <div><span className="text-muted-foreground">CNPJ:</span> {open.suppliers?.cnpj}</div>
                <div><span className="text-muted-foreground">Razão Social:</span> {open.suppliers?.razao_social}</div>
                <div><span className="text-muted-foreground">E-mail:</span> {open.suppliers?.email}</div>
                <div><span className="text-muted-foreground">WhatsApp:</span> {open.suppliers?.whatsapp}</div>
                <div><span className="text-muted-foreground">Motorista:</span> {open.driver_contact}</div>
                <div><span className="text-muted-foreground">Veículo:</span> {open.vehicle_type} · {open.vehicle_plate}</div>
                <div><span className="text-muted-foreground">Carga:</span> {open.cargo_type}</div>
                <div><span className="text-muted-foreground">Volumes:</span> {open.nf_volumes}</div>
                <div><span className="text-muted-foreground">Data/Hora:</span> {open.scheduled_date.split("-").reverse().join("/")} {(open.scheduled_time as string).slice(0, 5)}</div>
                <div><span className="text-muted-foreground">Status:</span> {statusBadge(open.status)}</div>
              </div>

              {open.nf_file_url && (
                <Button size="sm" variant="outline" onClick={() => downloadNf(open.nf_file_url)} className="gap-1">
                  <Download className="h-4 w-4" /> Baixar NF anexada
                </Button>
              )}

              {open.status === "Recusado" && open.refusal_reason && (
                <div className="p-3 border border-destructive/50 rounded-md bg-destructive/5 text-sm">
                  <strong>Motivo da recusa:</strong> {open.refusal_reason}
                </div>
              )}

              {open.status === "Pendente" && (
                <>
                  <div className="space-y-1">
                    <Label>Tempo de descarga (min) — ajuste se necessário antes de aceitar</Label>
                    <Input type="number" min={15} value={editMinutes} onChange={(e) => setEditMinutes(Number(e.target.value))} />
                  </div>

                  {showRefuse && (
                    <div className="space-y-1">
                      <Label>Motivo da recusa *</Label>
                      <Textarea value={refusal} onChange={(e) => setRefusal(e.target.value)} rows={3} />
                    </div>
                  )}
                </>
              )}
            </div>
          )}
          <DialogFooter className="gap-2">
            {open?.status === "Pendente" && !showRefuse && (
              <>
                <Button variant="destructive" onClick={() => setShowRefuse(true)} className="gap-1"><X className="h-4 w-4" /> Recusar</Button>
                <Button onClick={() => accept.mutate({ id: open.id, minutes: editMinutes })} className="gap-1" disabled={accept.isPending}>
                  <Check className="h-4 w-4" /> Aceitar
                </Button>
              </>
            )}
            {open?.status === "Pendente" && showRefuse && (
              <>
                <Button variant="ghost" onClick={() => setShowRefuse(false)}>Cancelar</Button>
                <Button variant="destructive" disabled={!refusal.trim() || refuse.isPending} onClick={() => refuse.mutate({ id: open.id, reason: refusal.trim() })} className="gap-1">
                  <X className="h-4 w-4" /> Confirmar recusa
                </Button>
              </>
            )}
            {open?.status !== "Pendente" && (
              <Button variant="outline" onClick={() => setOpen(null)}>Fechar</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function DiasBloqueados() {
  const qc = useQueryClient();
  const today = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; })();
  const maxDate = (() => { const d = new Date(today); d.setDate(d.getDate() + 15); return d; })();

  const { data: blocked = [] } = useQuery({
    queryKey: ["blocked-dates"],
    queryFn: async () => {
      const { data, error } = await supabase.from("blocked_dates").select("*").order("blocked_date");
      if (error) throw error;
      return data ?? [];
    },
  });

  const [selected, setSelected] = useState<Date | undefined>(undefined);
  const [reason, setReason] = useState("");

  const block = useMutation({
    mutationFn: async () => {
      if (!selected) throw new Error("Selecione um dia.");
      const { error } = await supabase.from("blocked_dates").insert({ blocked_date: ymd(selected), reason: reason || null });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["blocked-dates"] }); setReason(""); setSelected(undefined); toast.success("Dia bloqueado."); },
    onError: (e: Error) => toast.error(e.message),
  });
  const unblock = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("blocked_dates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["blocked-dates"] }); toast.success("Bloqueio removido."); },
    onError: (e: Error) => toast.error(e.message),
  });

  const blockedSet = new Set(blocked.map((b: any) => b.blocked_date));

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Card className="p-4 space-y-3">
        <h3 className="font-semibold flex items-center gap-2"><CalendarX className="h-4 w-4" /> Bloquear novo dia</h3>
        <Calendar
          mode="single"
          selected={selected}
          onSelect={setSelected}
          fromDate={today}
          toDate={maxDate}
          disabled={(d) => d < today || d > maxDate || blockedSet.has(ymd(d))}
          className="p-3 pointer-events-auto rounded-md border"
        />
        <div className="space-y-1">
          <Label>Motivo (opcional)</Label>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex: Feriado, balanço…" />
        </div>
        <Button onClick={() => block.mutate()} disabled={!selected || block.isPending} className="w-full gap-1">
          <Ban className="h-4 w-4" /> Bloquear este dia
        </Button>
      </Card>

      <Card className="p-4">
        <h3 className="font-semibold mb-3">Dias bloqueados</h3>
        {blocked.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum dia bloqueado.</p> : (
          <ul className="divide-y">
            {blocked.map((b: any) => (
              <li key={b.id} className="flex items-center justify-between py-2 gap-2">
                <div>
                  <div className="font-medium">{(b.blocked_date as string).split("-").reverse().join("/")}</div>
                  {b.reason && <div className="text-xs text-muted-foreground">{b.reason}</div>}
                </div>
                <Button size="sm" variant="ghost" onClick={() => unblock.mutate(b.id)}>Remover</Button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
