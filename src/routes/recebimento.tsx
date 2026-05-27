import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Inbox, Eye, Ban, CalendarX, Search } from "lucide-react";
import { AppointmentDetailsDialog } from "@/components/AppointmentDetailsDialog";

const sb = supabase as any;

export const Route = createFileRoute("/recebimento")({
  head: () => ({ meta: [{ title: "Aprovações de Agendamento" }] }),
  component: RecebimentoPage,
});

function ymd(d: Date) {
  const y = d.getFullYear(); const m = String(d.getMonth() + 1).padStart(2, "0"); const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${da}`;
}

function RecebimentoPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Inbox className="h-6 w-6" /> Aprovações de Agendamento</h1>
        <p className="text-sm text-muted-foreground">Gerencie solicitações enviadas pelos fornecedores.</p>
      </div>

      <Tabs defaultValue="lista">
        <TabsList>
          <TabsTrigger value="lista">Agendamentos</TabsTrigger>
          <TabsTrigger value="dias">Configuração de Dias</TabsTrigger>
        </TabsList>
        <TabsContent value="lista"><ListaAgendamentos /></TabsContent>
        <TabsContent value="dias"><DiasBloqueados /></TabsContent>
      </Tabs>
    </div>
  );
}

function statusBadge(s: string) {
  const map: Record<string, string> = {
    Pendente: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
    Confirmado: "bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30",
    Recusado: "bg-destructive/15 text-destructive border-destructive/30",
  };
  return <Badge variant="outline" className={map[s] ?? ""}>{s}</Badge>;
}

function ListaAgendamentos() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("Todos");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [openId, setOpenId] = useState<string | null>(null);

  const { data = [], isLoading } = useQuery({
    queryKey: ["appointments", status, dateFrom, dateTo],
    queryFn: async () => {
      let q = sb.from("appointments")
        .select("*, suppliers(nome_fantasia, razao_social, cnpj)")
        .order("scheduled_date", { ascending: false })
        .order("scheduled_time", { ascending: false });
      if (status !== "Todos") q = q.eq("status", status);
      if (dateFrom) q = q.gte("scheduled_date", dateFrom);
      if (dateTo) q = q.lte("scheduled_date", dateTo);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = useMemo(() => {
    if (!search.trim()) return data;
    const s = search.trim().toLowerCase();
    return data.filter((a: any) =>
      (a.suppliers?.nome_fantasia ?? "").toLowerCase().includes(s) ||
      (a.suppliers?.cnpj ?? "").toLowerCase().includes(s) ||
      (a.protocol ?? "").toLowerCase().includes(s),
    );
  }, [data, search]);

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="grid md:grid-cols-4 gap-3">
          <div className="md:col-span-2 space-y-1">
            <Label>Buscar</Label>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nome fantasia, CNPJ ou protocolo" className="pl-8" />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["Todos", "Pendente", "Confirmado", "Recusado"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label>De</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Até</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-2">
        {isLoading ? (
          <p className="text-sm text-muted-foreground p-6 text-center">Carregando…</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground p-6 text-center">Nenhum agendamento encontrado.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data/Hora</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Carga / Veículo</TableHead>
                <TableHead className="text-right">Volumes</TableHead>
                <TableHead className="text-right">Duração</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((a: any) => (
                <TableRow key={a.id} className="cursor-pointer hover:bg-muted/40" onClick={() => setOpenId(a.id)}>
                  <TableCell>
                    <div className="font-medium">{(a.scheduled_date as string).split("-").reverse().join("/")}</div>
                    <div className="text-xs text-muted-foreground">{(a.scheduled_time as string).slice(0, 5)}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{a.suppliers?.nome_fantasia ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{a.suppliers?.cnpj}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="secondary" className="text-xs">{a.cargo_type}</Badge>
                      <Badge variant="outline" className="text-xs">{a.vehicle_type} · {a.vehicle_plate}</Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{a.nf_volumes}</TableCell>
                  <TableCell className="text-right">{a.estimated_minutes} min</TableCell>
                  <TableCell>{statusBadge(a.status)}</TableCell>
                  <TableCell>
                    <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); setOpenId(a.id); }}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <AppointmentDetailsDialog appointmentId={openId} open={!!openId} onOpenChange={(v) => !v && setOpenId(null)} />
    </div>
  );
}

function DiasBloqueados() {
  const qc = useQueryClient();
  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);
  const maxDate = useMemo(() => { const d = new Date(today); d.setDate(d.getDate() + 15); return d; }, [today]);

  const { data: blocked = [] } = useQuery({
    queryKey: ["blocked-dates"],
    queryFn: async () => {
      const { data, error } = await sb.from("blocked_dates").select("*").order("blocked_date");
      if (error) throw error;
      return data ?? [];
    },
  });

  const [selected, setSelected] = useState<Date | undefined>(undefined);
  const [reason, setReason] = useState("");

  const block = useMutation({
    mutationFn: async () => {
      if (!selected) throw new Error("Selecione um dia.");
      const { error } = await sb.from("blocked_dates").insert({ blocked_date: ymd(selected), reason: reason || null });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["blocked-dates"] }); setReason(""); setSelected(undefined); toast.success("Dia bloqueado."); },
    onError: (e: Error) => toast.error(e.message),
  });
  const unblock = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from("blocked_dates").delete().eq("id", id);
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
