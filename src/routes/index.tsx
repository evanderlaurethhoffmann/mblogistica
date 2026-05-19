import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { ScanBarcode, Package2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";

const STORAGE_KEY = "coleta:branch_id";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Coleta de Volumes — Romaneio" }] }),
  component: ColetaPage,
});

// Strip any trailing "N/M" fraction so we can find the base code
function extractBase(raw: string): string {
  return raw.replace(/\s+\d+\/\d+\s*$/, "").trim();
}

function beep() {
  try {
    const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = 880;
    o.connect(g);
    g.connect(ctx.destination);
    g.gain.setValueAtTime(0.15, ctx.currentTime);
    o.start();
    setTimeout(() => { o.stop(); ctx.close(); }, 250);
  } catch {}
}

function ColetaPage() {
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const totalInputRef = useRef<HTMLInputElement>(null);
  const [branchId, setBranchId] = useState<string>(() =>
    typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) ?? "" : ""
  );
  const [code, setCode] = useState("");
  const [askTotal, setAskTotal] = useState<{ base: string; targetLoadId: string } | null>(null);
  const [totalStr, setTotalStr] = useState("");

  useEffect(() => {
    if (branchId) localStorage.setItem(STORAGE_KEY, branchId);
  }, [branchId]);

  const { data: branches = [] } = useQuery({
    queryKey: ["branches"],
    queryFn: async () => {
      const { data, error } = await supabase.from("branches").select("*").order("number");
      if (error) throw error;
      return data;
    },
  });

  const { data: load, refetch: refetchLoad } = useQuery({
    queryKey: ["open-load", branchId],
    enabled: !!branchId && !!user,
    queryFn: async () => {
      const { data: existing, error } = await supabase
        .from("loads")
        .select("*")
        .eq("branch_id", branchId)
        .eq("status", "Em aberto")
        .maybeSingle();
      if (error) throw error;
      if (existing) return existing;
      const { data: created, error: cErr } = await supabase
        .from("loads")
        .insert({ branch_id: branchId, status: "Em aberto" })
        .select()
        .single();
      if (cErr) throw cErr;
      return created;
    },
  });

  const { data: volumes = [], refetch: refetchVolumes } = useQuery({
    queryKey: ["volumes", load?.id],
    enabled: !!load?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("volumes")
        .select("*")
        .eq("load_id", load!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const findOrCreateLoad = async (bId: string) => {
    const { data: existing } = await supabase
      .from("loads")
      .select("*")
      .eq("branch_id", bId)
      .eq("status", "Em aberto")
      .maybeSingle();
    if (existing) return existing;
    const { data: created, error } = await supabase
      .from("loads")
      .insert({ branch_id: bId, status: "Em aberto" })
      .select()
      .single();
    if (error) throw error;
    return created;
  };

  const removeVolume = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("volumes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => refetchVolumes(),
  });

  useEffect(() => {
    inputRef.current?.focus();
  }, [load?.id]);

  const branchInfo = branches.find((b) => b.id === branchId);

  // Group volumes by base barcode for pending detection
  const pendingGroups = useMemo(() => {
    const map = new Map<string, { total: number; count: number }>();
    for (const v of volumes as any[]) {
      const base = extractBase(v.barcode);
      const total = v.total_boxes ?? 1;
      const g = map.get(base) ?? { total, count: 0 };
      g.total = total;
      g.count += 1;
      map.set(base, g);
    }
    const pending: string[] = [];
    for (const [base, g] of map.entries()) {
      if (g.count < g.total) pending.push(`${base} (${g.count}/${g.total})`);
    }
    return pending;
  }, [volumes]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const raw = code.trim();
    if (!raw) return;

    try {
      let targetBranchId = branchId;
      const base = extractBase(raw);

      if (base.includes("-")) {
        const prefix = base.split("-")[0].trim();
        const prefixNum = parseInt(prefix, 10);
        const found = branches.find(
          (b) => b.number.trim() === prefix || parseInt(b.number, 10) === prefixNum,
        );
        if (!found) {
          toast.error(`Filial ${prefix} não encontrada no cadastro.`);
          return;
        }
        targetBranchId = found.id;
        if (branchId !== found.id) {
          setBranchId(found.id);
          toast.success(`Filial ${found.number} — ${found.name} detectada pelo código.`);
        }
      } else if (!targetBranchId) {
        toast.error("Selecione uma filial ou bipe um código no formato 82-2218841.");
        return;
      }

      const targetLoad = await findOrCreateLoad(targetBranchId);

      // Find existing rows for the same base in this load
      const { data: matches, error: qErr } = await supabase
        .from("volumes")
        .select("*")
        .eq("load_id", targetLoad.id)
        .like("barcode", `${base}%`);
      if (qErr) throw qErr;
      const existing = (matches ?? []).filter((v: any) => {
        const bc = String(v.barcode);
        return bc === base || bc.startsWith(`${base} `);
      });

      if (existing.length === 0) {
        // First time → ask the operator for total boxes
        setAskTotal({ base, targetLoadId: targetLoad.id });
        setTotalStr("");
        setCode("");
        return;
      }

      const total = (existing[0] as any).total_boxes ?? existing.length;
      const count = existing.length;

      if (count >= total) {
        beep();
        toast.error(`Atenção: todas as caixas do volume ${base} já foram bipadas (${total}/${total}).`);
        return;
      }

      const nextIndex = count + 1;
      const newBarcode = `${base} ${nextIndex}/${total}`;
      const { error } = await supabase.from("volumes").insert({
        load_id: targetLoad.id,
        barcode: newBarcode,
        total_boxes: total,
        scanned_count: nextIndex,
        group_completed: nextIndex >= total,
      });
      if (error) throw error;

      toast.success(`Bipado: ${newBarcode}`);
      await Promise.all([refetchLoad(), refetchVolumes()]);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setCode("");
      inputRef.current?.focus();
    }
  };

  const confirmTotal = async () => {
    if (!askTotal) return;
    const total = parseInt(totalStr, 10);
    if (!Number.isFinite(total) || total < 1) {
      toast.error("Informe um total de caixas válido (mínimo 1).");
      totalInputRef.current?.focus();
      return;
    }
    const { base, targetLoadId } = askTotal;
    const newBarcode = total === 1 ? `${base} 1/1` : `${base} 1/${total}`;
    const { error } = await supabase.from("volumes").insert({
      load_id: targetLoadId,
      barcode: newBarcode,
      total_boxes: total,
      scanned_count: 1,
      group_completed: total === 1,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(
      total === 1
        ? `Volume ${base} registrado.`
        : `Volume ${base} aberto. Bipe novamente para 2/${total}.`,
    );
    setAskTotal(null);
    setTotalStr("");
    await refetchVolumes();
    inputRef.current?.focus();
  };

  const cancelTotal = () => {
    setAskTotal(null);
    setTotalStr("");
    inputRef.current?.focus();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Coleta de Volumes</h1>
        <p className="text-sm text-muted-foreground">
          Bipe o código. No primeiro bipe de cada volume, informe quantas caixas ele tem no total.
        </p>
      </div>

      <Card className="p-6">
        <div className="space-y-2 max-w-md">
          <Label>Filial de destino</Label>
          <Select value={branchId} onValueChange={(v) => { setBranchId(v); refetchLoad(); }}>
            <SelectTrigger><SelectValue placeholder="Selecione a filial" /></SelectTrigger>
            <SelectContent>
              {branches.map((b) => (
                <SelectItem key={b.id} value={b.id}>{b.number} — {b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {branchInfo && (
          <p className="mt-4 text-sm font-medium text-green-600">
            ● Carga em aberto para Filial {branchInfo.number} — {branchInfo.name}
          </p>
        )}
      </Card>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-2">
          <Label htmlFor="barcode" className="flex items-center gap-2 text-base">
            <ScanBarcode className="h-5 w-5 text-primary" />
            Bipar ou Digitar Código de Barras
          </Label>
          <Input
            id="barcode"
            ref={inputRef}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder={branchId ? "Aguardando código..." : "Bipe (ex: 82-2218841) — filial será detectada"}
            className="text-lg h-12 font-mono"
            autoComplete="off"
          />
        </form>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold flex items-center gap-2">
            <Package2 className="h-5 w-5" /> Volumes bipados
          </h2>
          <div className="flex items-center gap-2">
            {pendingGroups.length > 0 && (
              <span className="text-xs font-medium bg-amber-100 text-amber-900 px-2 py-1 rounded">
                {pendingGroups.length} grupo(s) pendente(s)
              </span>
            )}
            <span className="text-sm font-mono bg-secondary px-3 py-1 rounded">
              Total: {volumes.length}
            </span>
          </div>
        </div>
        {volumes.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhum volume bipado ainda.</p>
        ) : (
          <ul className="divide-y">
            {volumes.map((v: any, i) => (
              <li key={v.id} className="py-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xs text-muted-foreground w-8 shrink-0">#{volumes.length - i}</span>
                  <span className="font-mono truncate">{v.barcode}</span>
                </div>
                <Button size="icon" variant="ghost" onClick={() => removeVolume.mutate(v.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </li>
            ))}
          </ul>
        )}
        {pendingGroups.length > 0 && (
          <div className="mt-4 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
            ⚠ Faltam bipar caixas para: <b>{pendingGroups.join(", ")}</b>. O fechamento da carga será bloqueado até completar.
          </div>
        )}
      </Card>

      {/* Dialog: total de caixas no primeiro bipe */}
      <Dialog open={!!askTotal} onOpenChange={(o) => { if (!o) cancelTotal(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Quantas caixas tem este volume?</DialogTitle>
            <DialogDescription>
              Volume <b className="font-mono">{askTotal?.base}</b>. Informe o total de caixas indicado na etiqueta (ex: 3).
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Input
              ref={totalInputRef}
              autoFocus
              type="number"
              min={1}
              value={totalStr}
              onChange={(e) => setTotalStr(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); confirmTotal(); }
                if (e.key === "Escape") { e.preventDefault(); cancelTotal(); }
              }}
              placeholder="Total de caixas"
              className="h-12 text-lg"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={cancelTotal}>Cancelar</Button>
            <Button onClick={confirmTotal}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
