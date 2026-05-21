import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Printer, Search, Trash2, X, Eye } from "lucide-react";
import { toast } from "sonner";
import { printRomaneio } from "@/lib/romaneio-print";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/historico")({
  head: () => ({ meta: [{ title: "Histórico de Romaneios" }] }),
  component: HistoricoPage,
});

function HistoricoPage() {
  const qc = useQueryClient();
  const { isAdmin } = useAuth();

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [branchId, setBranchId] = useState<string>("all");
  const [driverId, setDriverId] = useState<string>("all");
  const [volumeQuery, setVolumeQuery] = useState("");
  const [appliedVolume, setAppliedVolume] = useState("");

  const [detail, setDetail] = useState<any | null>(null);
  const [deleting, setDeleting] = useState<any | null>(null);

  const { data: branches = [] } = useQuery({
    queryKey: ["branches"],
    queryFn: async () => (await supabase.from("branches").select("*").order("number")).data ?? [],
  });
  const { data: drivers = [] } = useQuery({
    queryKey: ["drivers"],
    queryFn: async () => (await supabase.from("drivers").select("*").order("name")).data ?? [],
  });

  const { data: loads = [], isLoading } = useQuery({
    queryKey: ["historico", startDate, endDate, branchId, driverId, appliedVolume],
    queryFn: async () => {
      // If searching by volume, find matching load_ids first
      let filterLoadIds: string[] | null = null;
      if (appliedVolume.trim()) {
        const q = appliedVolume.trim();
        const { data: vols, error } = await supabase
          .from("volumes")
          .select("load_id, barcode")
          .ilike("barcode", `%${q}%`);
        if (error) throw error;
        filterLoadIds = Array.from(new Set((vols ?? []).map((v: any) => v.load_id)));
        if (filterLoadIds.length === 0) return [];
      }

      let query = supabase
        .from("loads")
        .select("*, branches(*), checkers(*), drivers(*), volumes(count)")
        .in("status", ["Finalizado", "Finalizado Parcial"])
        .order("closed_at", { ascending: false });

      if (startDate) query = query.gte("closed_at", new Date(startDate + "T00:00:00").toISOString());
      if (endDate) query = query.lte("closed_at", new Date(endDate + "T23:59:59").toISOString());
      if (branchId !== "all") query = query.eq("branch_id", branchId);
      if (driverId !== "all") query = query.eq("driver_id", driverId);
      if (filterLoadIds) query = query.in("id", filterLoadIds);

      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  const deleteLoad = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("volumes").delete().eq("load_id", id);
      const { error } = await supabase.from("loads").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Romaneio excluído.");
      setDeleting(null);
      qc.invalidateQueries({ queryKey: ["historico"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openDetail = async (l: any) => {
    const { data: vols } = await supabase.from("volumes").select("*").eq("load_id", l.id).order("created_at");
    setDetail({ ...l, _volumes: vols ?? [] });
  };

  const reprintLoad = async (l: any, vols?: any[]) => {
    const list = vols ?? (await supabase.from("volumes").select("*").eq("load_id", l.id).order("created_at")).data ?? [];
    printRomaneio({
      emittedAt: new Date(l.closed_at ?? l.created_at),
      checker: l.checkers?.name ?? "—",
      driver: l.drivers?.name ?? "—",
      branch: `${l.branches.number} — ${l.branches.name}`,
      volumes: list.map((v: any) => v.barcode),
      partialCutCount: l.partial_cut_count ?? 0,
    });
  };

  const clearFilters = () => {
    setStartDate(""); setEndDate(""); setBranchId("all"); setDriverId("all");
    setVolumeQuery(""); setAppliedVolume("");
  };

  const totalVolumes = useMemo(
    () => loads.reduce((acc: number, l: any) => acc + (l.volumes?.[0]?.count ?? 0), 0),
    [loads],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Histórico de Romaneios</h1>
        <p className="text-sm text-muted-foreground">
          Consulte cargas finalizadas, rastreie volumes e reimprima romaneios.
        </p>
      </div>

      <Card className="p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Data Início</Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Data Fim</Label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Filial</Label>
            <Select value={branchId} onValueChange={setBranchId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as filiais</SelectItem>
                {branches.map((b: any) => (
                  <SelectItem key={b.id} value={b.id}>{b.number} — {b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Motorista</Label>
            <Select value={driverId} onValueChange={setDriverId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os motoristas</SelectItem>
                {drivers.map((d: any) => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-end">
          <div className="flex-1 space-y-1">
            <Label className="text-xs">Rastrear volume (código de barras)</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Ex: 2218841 ou 20-141"
                value={volumeQuery}
                onChange={(e) => setVolumeQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    setAppliedVolume(volumeQuery.trim());
                  }
                }}
              />
              <Button onClick={() => setAppliedVolume(volumeQuery.trim())} className="gap-1">
                <Search className="h-4 w-4" /> Buscar
              </Button>
            </div>
          </div>
          <Button variant="outline" onClick={clearFilters} className="gap-1">
            <X className="h-4 w-4" /> Limpar filtros
          </Button>
        </div>

        {appliedVolume && (
          <div className="text-xs text-muted-foreground">
            Filtrando romaneios que contêm o volume <b>{appliedVolume}</b>.
          </div>
        )}
      </Card>

      <Card className="p-0 overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between flex-wrap gap-2">
          <h2 className="font-semibold">Resultados ({loads.length})</h2>
          <span className="text-sm text-muted-foreground">Total de volumes: <b>{totalVolumes}</b></span>
        </div>
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Carregando…</div>
        ) : loads.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">Nenhum romaneio encontrado para os filtros aplicados.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr className="text-left">
                  <th className="px-4 py-2 font-semibold">Data</th>
                  <th className="px-4 py-2 font-semibold">Filial</th>
                  <th className="px-4 py-2 font-semibold">Motorista</th>
                  <th className="px-4 py-2 font-semibold">Conferente</th>
                  <th className="px-4 py-2 font-semibold text-center">Qtd Volumes</th>
                  <th className="px-4 py-2 font-semibold text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loads.map((l: any) => (
                  <tr
                    key={l.id}
                    className="border-t hover:bg-muted/30 cursor-pointer"
                    onClick={() => openDetail(l)}
                  >
                    <td className="px-4 py-2 whitespace-nowrap">
                      {new Date(l.closed_at).toLocaleString("pt-BR")}
                    </td>
                    <td className="px-4 py-2">
                      <span className="font-semibold">{l.branches.number}</span>{" "}
                      <span className="text-muted-foreground">— {l.branches.name}</span>
                    </td>
                    <td className="px-4 py-2">{l.drivers?.name ?? "—"}</td>
                    <td className="px-4 py-2">{l.checkers?.name ?? "—"}</td>
                    <td className="px-4 py-2 text-center font-semibold">{l.volumes?.[0]?.count ?? 0}</td>
                    <td className="px-4 py-2">
                      <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button size="sm" variant="ghost" onClick={() => openDetail(l)} className="gap-1">
                          <Eye className="h-3 w-3" /> Ver
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => reprintLoad(l)} className="gap-1">
                          <Printer className="h-3 w-3" /> Reimprimir
                        </Button>
                        {isAdmin && (
                          <Button size="sm" variant="ghost" onClick={() => setDeleting(l)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Detail dialog */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Romaneio — Filial {detail?.branches?.number} — {detail?.branches?.name}
            </DialogTitle>
            <DialogDescription>
              {detail && (
                <>
                  Fechado em {new Date(detail.closed_at).toLocaleString("pt-BR")} ·{" "}
                  Conferente: <b>{detail.checkers?.name ?? "—"}</b> ·{" "}
                  Motorista: <b>{detail.drivers?.name ?? "—"}</b>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-[55vh] overflow-y-auto">
            <div className="text-sm text-muted-foreground">
              Total de volumes: <b>{detail?._volumes?.length ?? 0}</b>
            </div>
            <ol className="border rounded-md divide-y font-mono text-sm">
              {(detail?._volumes ?? []).map((v: any, idx: number) => {
                const isMatch =
                  appliedVolume &&
                  v.barcode.toLowerCase().includes(appliedVolume.toLowerCase());
                return (
                  <li
                    key={v.id}
                    className={`px-3 py-1.5 flex justify-between ${isMatch ? "bg-yellow-100 dark:bg-yellow-900/30" : ""}`}
                  >
                    <span className="text-muted-foreground w-10">{idx + 1}.</span>
                    <span className="flex-1">{v.barcode}</span>
                  </li>
                );
              })}
            </ol>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetail(null)}>Fechar</Button>
            <Button onClick={() => detail && reprintLoad(detail, detail._volumes)} className="gap-1">
              <Printer className="h-4 w-4" /> Reimprimir Romaneio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir romaneio?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação remove o romaneio e todos os volumes associados. Não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleting && deleteLoad.mutate(deleting.id)}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
