import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScanBarcode, Package2, Trash2 } from "lucide-react";
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

  // Find or create an "Em aberto" load for this branch (persists across sessions)
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

  const ready = true;
  const branchInfo = branches.find((b) => b.id === branchId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const raw = code.trim();
    if (!raw) return;

    try {
      let targetBranchId = branchId;

      if (!targetBranchId) {
        if (!raw.includes("-")) {
          toast.error("Selecione uma filial ou bipe um código no formato 82-2218841.");
          return;
        }
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
        setBranchId(found.id);
        toast.success(`Filial ${found.number} — ${found.name} selecionada automaticamente.`);
      }

      const targetLoad = await findOrCreateLoad(targetBranchId);
      const { error } = await supabase
        .from("volumes")
        .insert({ load_id: targetLoad.id, barcode: raw });
      if (error) throw error;

      setCode("");
      inputRef.current?.focus();
      await Promise.all([refetchLoad(), refetchVolumes()]);
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Coleta de Volumes</h1>
        <p className="text-sm text-muted-foreground">
          Selecione a filial e bipe os códigos. Os volumes ficam salvos como "Em aberto" mesmo que você feche o navegador.
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
        {ready && branchInfo && (
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
          <span className="text-sm font-mono bg-secondary px-3 py-1 rounded">
            Total: {volumes.length}
          </span>
        </div>
        {volumes.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhum volume bipado ainda.</p>
        ) : (
          <ul className="divide-y">
            {volumes.map((v, i) => (
              <li key={v.id} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-8">#{volumes.length - i}</span>
                  <span className="font-mono">{v.barcode}</span>
                </div>
                <Button size="icon" variant="ghost" onClick={() => removeVolume.mutate(v.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
