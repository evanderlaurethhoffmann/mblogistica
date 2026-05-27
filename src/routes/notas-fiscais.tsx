import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Search, Download } from "lucide-react";
import { toast } from "sonner";
import { AppointmentDetailsDialog } from "@/components/AppointmentDetailsDialog";

const sb = supabase as any;

export const Route = createFileRoute("/notas-fiscais")({
  head: () => ({ meta: [{ title: "Conferência de Notas Fiscais" }] }),
  component: NfPage,
});

function statusBadge(s: string) {
  const map: Record<string, string> = {
    Pendente: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
    Confirmado: "bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30",
    Recusado: "bg-destructive/15 text-destructive border-destructive/30",
  };
  return <Badge variant="outline" className={map[s] ?? ""}>{s}</Badge>;
}

function NfPage() {
  const [search, setSearch] = useState("");
  const [nfStatus, setNfStatus] = useState("Todos");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const { data = [], isLoading } = useQuery({
    queryKey: ["nf-list", nfStatus, dateFrom, dateTo],
    queryFn: async () => {
      let q = sb.from("appointments")
        .select("id, scheduled_date, scheduled_time, nf_number, nf_access_key, nf_volumes, nf_file_url, nf_status, status, suppliers(nome_fantasia, razao_social)")
        .order("scheduled_date", { ascending: false });
      if (nfStatus !== "Todos") q = q.eq("nf_status", nfStatus);
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
      (a.nf_number ?? "").toLowerCase().includes(s) ||
      (a.nf_access_key ?? "").toLowerCase().includes(s) ||
      (a.suppliers?.nome_fantasia ?? "").toLowerCase().includes(s),
    );
  }, [data, search]);

  const downloadNf = async (path: string) => {
    const { data, error } = await supabase.storage.from("nf-uploads").createSignedUrl(path, 60);
    if (error || !data?.signedUrl) { toast.error("Falha ao gerar link."); return; }
    window.open(data.signedUrl, "_blank");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><FileText className="h-6 w-6" /> Conferência de Notas Fiscais</h1>
        <p className="text-sm text-muted-foreground">Todas as NFs anexadas pelos fornecedores nos agendamentos.</p>
      </div>

      <Card className="p-4">
        <div className="grid md:grid-cols-4 gap-3">
          <div className="md:col-span-2 space-y-1">
            <Label>Buscar</Label>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nº NF, chave ou fornecedor" className="pl-8" />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Status NF</Label>
            <Select value={nfStatus} onValueChange={setNfStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["Todos", "Pendente", "Recebida", "Cancelada"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
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
          <p className="text-sm text-muted-foreground p-6 text-center">Nenhuma NF encontrada.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nº NF</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Data Prevista</TableHead>
                <TableHead className="text-right">Volumes</TableHead>
                <TableHead>Arquivo</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((a: any) => {
                const ext = a.nf_file_url ? (a.nf_file_url as string).split(".").pop()?.toUpperCase() : null;
                return (
                  <TableRow key={a.id} className="cursor-pointer hover:bg-muted/40" onClick={() => setOpenId(a.id)}>
                    <TableCell className="font-medium">{a.nf_number ?? "—"}</TableCell>
                    <TableCell>
                      <div className="font-medium">{a.suppliers?.nome_fantasia ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{a.suppliers?.razao_social}</div>
                    </TableCell>
                    <TableCell>
                      {(a.scheduled_date as string).split("-").reverse().join("/")} <span className="text-xs text-muted-foreground">{(a.scheduled_time as string).slice(0, 5)}</span>
                    </TableCell>
                    <TableCell className="text-right">{a.nf_volumes}</TableCell>
                    <TableCell>
                      {ext ? (
                        <Badge variant="outline"
                          className={`cursor-pointer ${ext === "XML" ? "bg-green-500/15 text-green-700 dark:text-green-400" : "bg-rose-500/15 text-rose-700 dark:text-rose-400"}`}
                          onClick={(e) => { e.stopPropagation(); downloadNf(a.nf_file_url); }}>
                          <Download className="h-3 w-3 mr-1" /> {ext}
                        </Badge>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>{statusBadge(a.status)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      <AppointmentDetailsDialog appointmentId={openId} open={!!openId} onOpenChange={(v) => !v && setOpenId(null)} />
    </div>
  );
}
