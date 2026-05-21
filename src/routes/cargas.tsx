import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Package2, Printer, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { printRomaneio } from "@/lib/romaneio-print";
import { sendCloseWebhook } from "@/lib/webhook.functions";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/cargas")({
  head: () => ({ meta: [{ title: "Cargas — Romaneio" }] }),
  component: CargasPage,
});

function CargasPage() {
  const qc = useQueryClient();
  const { isAdmin } = useAuth();
  const callWebhook = useServerFn(sendCloseWebhook);
  const [closing, setClosing] = useState<any | null>(null);
  const [deleting, setDeleting] = useState<any | null>(null);
  const [checkerId, setCheckerId] = useState("");
  const [driverId, setDriverId] = useState("");
  const [incomplete, setIncomplete] = useState<{ base: string; count: number; total: number }[]>([]);

  const { data: loads = [] } = useQuery({
    queryKey: ["loads-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("loads")
        .select("*, branches(*), checkers(*), drivers(*), volumes(count)")
        .order("status")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: checkers = [] } = useQuery({
    queryKey: ["checkers"],
    queryFn: async () => (await supabase.from("checkers").select("*").order("name")).data ?? [],
  });
  const { data: drivers = [] } = useQuery({
    queryKey: ["drivers"],
    queryFn: async () => (await supabase.from("drivers").select("*").order("name")).data ?? [],
  });

  const confirmClose = useMutation({
    mutationFn: async ({ force }: { force: boolean }) => {
      if (!closing) throw new Error("Carga não encontrada.");
      if (!checkerId || !driverId) throw new Error("Selecione conferente e motorista.");

      const { data: vols, error: vErr } = await supabase
        .from("volumes").select("*").eq("load_id", closing.id).order("created_at");
      if (vErr) throw vErr;
      if (!vols?.length) throw new Error("Carga sem volumes — bipe ao menos um volume.");

      // Group by base barcode (strip " N/M" suffix) and check completeness
      const groups = new Map<string, { total: number; count: number; ids: string[] }>();
      for (const v of vols as any[]) {
        const base = String(v.barcode).replace(/\s+\d+\/\d+\s*$/, "").trim();
        const total = v.total_boxes ?? 1;
        const g: { total: number; count: number; ids: string[] } =
          groups.get(base) ?? { total, count: 0, ids: [] };
        g.total = total;
        g.count += 1;
        g.ids.push(String(v.id));
        groups.set(base, g);
      }
      const missing: { base: string; count: number; total: number; ids: string[] }[] = [];
      for (const [base, g] of groups.entries()) {
        if (g.count < g.total) missing.push({ base, count: g.count, total: g.total, ids: g.ids });
      }

      if (missing.length > 0 && !force) {
        // Surface warning to UI; do not throw
        setIncomplete(missing.map(({ base, count, total }) => ({ base, count, total })));
        return { needsConfirm: true } as const;
      }

      let cutCount = 0;
      if (force && missing.length > 0) {
        // Renumber scanned volumes to N/count and update total_boxes
        for (const g of missing) {
          cutCount += g.total - g.count;
          for (let i = 0; i < g.ids.length; i++) {
            const newBarcode = `${g.base} ${i + 1}/${g.count}`;
            const { error } = await supabase
              .from("volumes")
              .update({ barcode: newBarcode, total_boxes: g.count, group_completed: true })
              .eq("id", g.ids[i]);
            if (error) throw error;
          }
        }
      }

      const checker = checkers.find((c: any) => c.id === checkerId);
      const driver = drivers.find((d: any) => d.id === driverId);

      const closedAt = new Date();
      const { error: uErr } = await supabase
        .from("loads")
        .update({
          status: cutCount > 0 ? "Finalizado Parcial" : "Finalizado",
          closed_at: closedAt.toISOString(),
          checker_id: checkerId,
          driver_id: driverId,
          partial_cut_count: cutCount,
        })
        .eq("id", closing.id);
      if (uErr) throw uErr;

      // Re-fetch volumes to get the renumbered barcodes for printing
      const { data: vols2 } = await supabase
        .from("volumes").select("*").eq("load_id", closing.id).order("created_at");

      const branchLabel = `${closing.branches.number} — ${closing.branches.name}`;
      const volumeCodes = (vols2 ?? vols).map((v: any) => v.barcode);

      callWebhook({
        data: {
          loadId: closing.id,
          date: closedAt.toISOString(),
          branch: branchLabel,
          checker: checker!.name,
          driver: driver!.name,
          volumes: volumeCodes,
        },
      }).then((res) => {
        if (!res.ok && !res.skipped) toast.warning("Webhook não enviado (verifique configurações).");
      }).catch(() => {});

      printRomaneio({
        emittedAt: closedAt,
        checker: checker!.name,
        driver: driver!.name,
        branch: branchLabel,
        volumes: volumeCodes,
        partialCutCount: cutCount,
      });

      return { needsConfirm: false, cutCount } as const;
    },
    onSuccess: (res) => {
      if (res?.needsConfirm) return; // wait for user to force
      toast.success(
        res?.cutCount && res.cutCount > 0
          ? `Carga finalizada com corte de ${res.cutCount} caixa(s).`
          : "Carga finalizada e romaneio gerado.",
      );
      setClosing(null);
      setCheckerId(""); setDriverId("");
      setIncomplete([]);
      qc.invalidateQueries({ queryKey: ["loads-all"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteLoad = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("volumes").delete().eq("load_id", id);
      const { error } = await supabase.from("loads").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Carga excluída.");
      setDeleting(null);
      qc.invalidateQueries({ queryKey: ["loads-all"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reprintLoad = async (l: any) => {
    const { data: vols } = await supabase.from("volumes").select("*").eq("load_id", l.id).order("created_at");
    printRomaneio({
      emittedAt: new Date(l.closed_at ?? l.created_at),
      checker: l.checkers?.name ?? "—",
      driver: l.drivers?.name ?? "—",
      branch: `${l.branches.number} — ${l.branches.name}`,
      volumes: (vols ?? []).map((v) => v.barcode),
    });
  };

  const open = loads.filter((l: any) => l.status === "Em aberto");
  const closed = loads.filter((l: any) => l.status === "Finalizado" || l.status === "Finalizado Parcial");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Cargas</h1>
        <p className="text-sm text-muted-foreground">Feche cargas em aberto e consulte o histórico.</p>
      </div>

      <section className="space-y-3">
        <h2 className="font-semibold text-lg">Em aberto ({open.length})</h2>
        {open.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">Nenhuma carga em aberto.</Card>
        ) : (
          <div className="grid gap-3">
            {open.map((l: any) => (
              <Card key={l.id} className="p-5 flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-primary">Filial {l.branches.number}</span>
                    <span className="text-muted-foreground">— {l.branches.name}</span>
                  </div>
                  <div className="text-sm text-muted-foreground inline-flex items-center gap-1 mt-1">
                    <Package2 className="h-3 w-3" /> {l.volumes[0]?.count ?? 0} volumes
                  </div>
                </div>
                <Button onClick={() => setClosing(l)} className="gap-2">
                  <FileText className="h-4 w-4" /> Fechar Carga
                </Button>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold text-lg">Histórico — Finalizadas ({closed.length})</h2>
        {closed.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">Nenhuma carga finalizada ainda.</Card>
        ) : (
          <div className="grid gap-3">
            {closed.map((l: any) => (
              <Card key={l.id} className="p-5 flex items-center justify-between gap-4 flex-wrap">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold">Filial {l.branches.number}</span>
                    <span className="text-muted-foreground">— {l.branches.name}</span>
                  </div>
                  <div className="text-xs text-muted-foreground space-x-3">
                    <span>Fechada: {new Date(l.closed_at).toLocaleString("pt-BR")}</span>
                    <span>Conf: {l.checkers?.name ?? "—"}</span>
                    <span>Mot: {l.drivers?.name ?? "—"}</span>
                    <span>{l.volumes[0]?.count ?? 0} vol.</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => reprintLoad(l)} className="gap-1">
                    <Printer className="h-3 w-3" /> Reimprimir
                  </Button>
                  {isAdmin && (
                    <Button size="sm" variant="ghost" onClick={() => setDeleting(l)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Close Dialog */}
      <Dialog open={!!closing} onOpenChange={(o) => { if (!o) { setClosing(null); setIncomplete([]); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fechar carga</DialogTitle>
            <DialogDescription>
              {closing && <>Filial <b>{closing.branches.number} — {closing.branches.name}</b>. Selecione conferente e motorista.</>}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Conferente</Label>
              <Select value={checkerId} onValueChange={setCheckerId}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {checkers.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Motorista</Label>
              <Select value={driverId} onValueChange={setDriverId}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {drivers.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {incomplete.length > 0 && (
            <div className="rounded-md border-2 border-yellow-500 bg-yellow-50 dark:bg-yellow-950/30 p-3 space-y-2">
              <div className="font-bold text-yellow-900 dark:text-yellow-200 text-sm">
                ⚠ Atenção: Existem volumes incompletos nesta carga
              </div>
              <ul className="text-xs font-mono space-y-0.5 text-yellow-900 dark:text-yellow-200">
                {incomplete.map((g) => (
                  <li key={g.base}>• {g.base} — {g.count} de {g.total} caixas bipadas</li>
                ))}
              </ul>
              <p className="text-xs text-yellow-800 dark:text-yellow-300">
                Você pode bipar as caixas faltantes ou forçar o fechamento parcial cortando o saldo.
                As caixas não bipadas continuarão disponíveis para o próximo romaneio desta filial.
              </p>
              <Button
                variant="destructive"
                size="sm"
                className="w-full"
                onClick={() => confirmClose.mutate({ force: true })}
                disabled={confirmClose.isPending}
              >
                Forçar Fechamento Parcial (Cortar Saldo)
              </Button>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => { setClosing(null); setIncomplete([]); }}>Cancelar</Button>
            <Button
              onClick={() => confirmClose.mutate({ force: false })}
              disabled={confirmClose.isPending || !checkerId || !driverId}
            >
              Confirmar fechamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir carga finalizada?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação remove a carga e todos os volumes associados do histórico. Não pode ser desfeita.
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
