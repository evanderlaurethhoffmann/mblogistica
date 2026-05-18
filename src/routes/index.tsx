import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScanBarcode, Package2, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Coleta de Volumes — Romaneio" }] }),
  component: ColetaPage,
});

function ColetaPage() {
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [branchId, setBranchId] = useState("");
  const [checkerId, setCheckerId] = useState("");
  const [driverId, setDriverId] = useState("");
  const [code, setCode] = useState("");

  const { data: branches = [] } = useQuery({
    queryKey: ["branches"],
    queryFn: async () => {
      const { data, error } = await supabase.from("branches").select("*").order("number");
      if (error) throw error;
      return data;
    },
  });
  const { data: checkers = [] } = useQuery({
    queryKey: ["checkers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("checkers").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });
  const { data: drivers = [] } = useQuery({
    queryKey: ["drivers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("drivers").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  // Find or create open load for selection
  const { data: load, refetch: refetchLoad } = useQuery({
    queryKey: ["open-load", branchId, checkerId, driverId],
    enabled: !!(branchId && checkerId && driverId),
    queryFn: async () => {
      const { data: existing, error } = await supabase
        .from("loads")
        .select("*")
        .eq("branch_id", branchId)
        .eq("checker_id", checkerId)
        .eq("driver_id", driverId)
        .eq("status", "Em aberto")
        .maybeSingle();
      if (error) throw error;
      if (existing) return existing;
      const { data: created, error: cErr } = await supabase
        .from("loads")
        .insert({ branch_id: branchId, checker_id: checkerId, driver_id: driverId })
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

  const addVolume = useMutation({
    mutationFn: async (barcode: string) => {
      if (!load) throw new Error("Selecione filial, conferente e motorista primeiro.");
      const { error } = await supabase.from("volumes").insert({ load_id: load.id, barcode });
      if (error) throw error;
    },
    onSuccess: () => {
      refetchVolumes();
      setCode("");
      inputRef.current?.focus();
    },
    onError: (e: Error) => toast.error(e.message),
  });

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

  const ready = !!load;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const v = code.trim();
    if (!v) return;
    addVolume.mutate(v);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Coleta de Volumes</h1>
        <p className="text-sm text-muted-foreground">Bipe os códigos de barras para vincular à carga selecionada.</p>
      </div>

      <Card className="p-6">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label>Filial</Label>
            <Select value={branchId} onValueChange={setBranchId}>
              <SelectTrigger><SelectValue placeholder="Selecione a filial" /></SelectTrigger>
              <SelectContent>
                {branches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>{b.number} — {b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Conferente</Label>
            <Select value={checkerId} onValueChange={setCheckerId}>
              <SelectTrigger><SelectValue placeholder="Selecione o conferente" /></SelectTrigger>
              <SelectContent>
                {checkers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Motorista</Label>
            <Select value={driverId} onValueChange={setDriverId}>
              <SelectTrigger><SelectValue placeholder="Selecione o motorista" /></SelectTrigger>
              <SelectContent>
                {drivers.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {ready && (
          <p className="mt-4 text-sm text-success font-medium">
            ● Carga em aberto — pronto para bipar
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
            disabled={!ready}
            placeholder={ready ? "Aguardando código..." : "Selecione filial, conferente e motorista"}
            className="text-lg h-12 font-mono"
            autoComplete="off"
          />
        </form>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold flex items-center gap-2">
            <Package2 className="h-5 w-5" /> Volumes bipados nesta sessão
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
