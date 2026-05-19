import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScanBarcode, Package2, Trash2, Split, Check, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";

const STORAGE_KEY = "coleta:branch_id";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Coleta de Volumes — Romaneio" }] }),
  component: ColetaPage,
});

function ColetaPage() {
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [branchId, setBranchId] = useState<string>(() =>
    typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) ?? "" : ""
  );
  const [code, setCode] = useState("");
  const [splittingId, setSplittingId] = useState<string | null>(null);
  const [splitTotal, setSplitTotal] = useState("");

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const raw = code.trim();
    if (!raw) return;

    try {
      let targetBranchId = branchId;

      if (raw.includes("-")) {
        const prefix = raw.split("-")[0].trim();
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
      } else {
        if (!targetBranchId) {
          toast.error("Selecione uma filial ou bipe um código no formato 82-2218841.");
          return;
        }
      }

      const targetLoad = await findOrCreateLoad(targetBranchId);

      // Verifica se já existe um volume fracionado pendente para este código
      const { data: existingFractional } = await supabase
        .from("volumes")
        .select("*")
        .eq("load_id", targetLoad.id)
        .eq("barcode", raw)
        .not("total_boxes", "is", null)
        .eq("group_completed", false)
        .order("created_at", { ascending: false })
        .limit(1);

      const pending = existingFractional?.[0] as any;
      if (pending && pending.scanned_count < pending.total_boxes) {
        const newCount = pending.scanned_count + 1;
        const completed = newCount >= pending.total_boxes;
        const { error } = await supabase
          .from("volumes")
          .update({ scanned_count: newCount, group_completed: completed })
          .eq("id", pending.id);
        if (error) throw error;
        toast.success(
          completed
            ? `Grupo concluído: ${newCount}/${pending.total_boxes}`
            : `Bipado: ${newCount}/${pending.total_boxes}`,
        );
      } else {
        const { error } = await supabase
          .from("volumes")
          .insert({ load_id: targetLoad.id, barcode: raw });
        if (error) throw error;
      }

      await Promise.all([refetchLoad(), refetchVolumes()]);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setCode("");
      inputRef.current?.focus();
    }
  };

  // Atalho "+" para abrir fracionamento no item mais recente
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "+" && code.trim() === "" && volumes.length > 0 && !splittingId) {
      e.preventDefault();
      const latest = volumes[0] as any;
      if (latest.total_boxes == null) {
        setSplittingId(latest.id);
        setSplitTotal("");
      }
    }
  };

  const openSplit = (id: string) => {
    setSplittingId(id);
    setSplitTotal("");
  };

  const confirmSplit = async () => {
    if (!splittingId) return;
    const total = parseInt(splitTotal, 10);
    if (!Number.isFinite(total) || total < 2) {
      toast.error("Informe um total de caixas válido (mínimo 2).");
      return;
    }
    const { error } = await supabase
      .from("volumes")
      .update({ total_boxes: total, scanned_count: 0, group_completed: false })
      .eq("id", splittingId);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Volume marcado como fracionado (0/${total}). Bipe novamente para confirmar cada caixa.`);
    setSplittingId(null);
    setSplitTotal("");
    await refetchVolumes();
    inputRef.current?.focus();
  };

  const markGroupCompleted = async (id: string) => {
    const v = volumes.find((x) => x.id === id) as any;
    if (!v) return;
    const { error } = await supabase
      .from("volumes")
      .update({ group_completed: true, scanned_count: v.total_boxes ?? v.scanned_count })
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Grupo marcado como concluído.");
    refetchVolumes();
  };

  const pendingCount = volumes.filter(
    (v: any) => v.total_boxes != null && !v.group_completed,
  ).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Coleta de Volumes</h1>
        <p className="text-sm text-muted-foreground">
          Bipe os códigos. Para volumes fracionados (ex: caixa 1 de 2), pressione <kbd className="px-1.5 py-0.5 bg-secondary rounded text-xs">+</kbd> ou clique em <b>Fracionar</b>.
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
            onKeyDown={handleKeyDown}
            placeholder={branchId ? "Aguardando código... ( + para fracionar último )" : "Bipe (ex: 82-2218841) — filial será detectada"}
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
            {pendingCount > 0 && (
              <span className="text-xs font-medium bg-amber-100 text-amber-900 px-2 py-1 rounded">
                {pendingCount} pendente(s)
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
            {volumes.map((v: any, i) => {
              const isFractional = v.total_boxes != null;
              const isPending = isFractional && !v.group_completed;
              const isSplitting = splittingId === v.id;
              return (
                <li key={v.id} className="py-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xs text-muted-foreground w-8 shrink-0">#{volumes.length - i}</span>
                      <span className="font-mono truncate">{v.barcode}</span>
                      {isFractional && (
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded shrink-0 ${
                            isPending
                              ? "bg-amber-100 text-amber-900"
                              : "bg-green-100 text-green-900"
                          }`}
                        >
                          {isPending ? "Pendente" : "Grupo OK"} ({v.scanned_count}/{v.total_boxes})
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {!isFractional && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openSplit(v.id)}
                          className="gap-1 h-8"
                          title="Marcar como volume fracionado"
                        >
                          <Split className="h-3.5 w-3.5" /> Fracionar
                        </Button>
                      )}
                      {isPending && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => markGroupCompleted(v.id)}
                          className="gap-1 h-8 text-green-700"
                          title="Marcar grupo como concluído manualmente"
                        >
                          <Check className="h-3.5 w-3.5" /> Concluir
                        </Button>
                      )}
                      <Button size="icon" variant="ghost" onClick={() => removeVolume.mutate(v.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  {isSplitting && (
                    <div className="mt-2 ml-11 flex items-center gap-2">
                      <Label className="text-xs">Total de caixas:</Label>
                      <Input
                        autoFocus
                        type="number"
                        min={2}
                        value={splitTotal}
                        onChange={(e) => setSplitTotal(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") { e.preventDefault(); confirmSplit(); }
                          if (e.key === "Escape") { setSplittingId(null); inputRef.current?.focus(); }
                        }}
                        className="h-8 w-24"
                        placeholder="Ex: 2"
                      />
                      <Button size="sm" onClick={confirmSplit} className="h-8 gap-1">
                        <Check className="h-3.5 w-3.5" /> OK
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => { setSplittingId(null); inputRef.current?.focus(); }}
                        className="h-8 gap-1"
                      >
                        <X className="h-3.5 w-3.5" /> Cancelar
                      </Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {pendingCount > 0 && (
          <p className="mt-4 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
            ⚠ Existem {pendingCount} grupo(s) fracionado(s) pendente(s). Bipe novamente o mesmo código para confirmar cada caixa, ou marque manualmente como concluído. O fechamento da carga será bloqueado enquanto houver pendências.
          </p>
        )}
      </Card>
    </div>
  );
}
