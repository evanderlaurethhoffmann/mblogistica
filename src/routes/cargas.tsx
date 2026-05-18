import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FileText, Package2 } from "lucide-react";
import { toast } from "sonner";
import { generateRomaneioPdf } from "@/lib/romaneio-pdf";

export const Route = createFileRoute("/cargas")({
  head: () => ({ meta: [{ title: "Cargas em Aberto — Romaneio" }] }),
  component: CargasPage,
});

function CargasPage() {
  const { data: loads = [], refetch } = useQuery({
    queryKey: ["loads-open"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("loads")
        .select("*, branches(*), checkers(*), drivers(*), volumes(count)")
        .eq("status", "Em aberto")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const closeLoad = useMutation({
    mutationFn: async (loadId: string) => {
      const { data: load, error: lErr } = await supabase
        .from("loads")
        .select("*, branches(*), checkers(*), drivers(*)")
        .eq("id", loadId)
        .single();
      if (lErr) throw lErr;
      const { data: vols, error: vErr } = await supabase
        .from("volumes")
        .select("*")
        .eq("load_id", loadId)
        .order("created_at");
      if (vErr) throw vErr;
      if (!vols || vols.length === 0) throw new Error("Carga sem volumes — bipe ao menos um volume.");

      const closedAt = new Date().toISOString();
      const { error: uErr } = await supabase
        .from("loads")
        .update({ status: "Finalizado", closed_at: closedAt })
        .eq("id", loadId);
      if (uErr) throw uErr;

      generateRomaneioPdf({
        emittedAt: new Date(),
        checker: (load as any).checkers.name,
        driver: (load as any).drivers.name,
        branch: `${(load as any).branches.number} — ${(load as any).branches.name}`,
        volumes: vols.map((v) => v.barcode),
      });
    },
    onSuccess: () => {
      toast.success("Carga finalizada e romaneio gerado.");
      refetch();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Cargas em Aberto / Fechamento</h1>
        <p className="text-sm text-muted-foreground">Feche uma carga para gerar o romaneio em PDF.</p>
      </div>

      {loads.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">
          Nenhuma carga em aberto no momento.
        </Card>
      ) : (
        <div className="grid gap-4">
          {loads.map((l: any) => (
            <Card key={l.id} className="p-6 flex items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-primary">Filial {l.branches.number}</span>
                  <span className="text-muted-foreground">— {l.branches.name}</span>
                </div>
                <div className="text-sm text-muted-foreground space-x-4">
                  <span><b>Conferente:</b> {l.checkers.name}</span>
                  <span><b>Motorista:</b> {l.drivers.name}</span>
                  <span className="inline-flex items-center gap-1">
                    <Package2 className="h-3 w-3" /> {l.volumes[0]?.count ?? 0} volumes
                  </span>
                </div>
              </div>
              <Button
                onClick={() => closeLoad.mutate(l.id)}
                disabled={closeLoad.isPending}
                className="gap-2"
              >
                <FileText className="h-4 w-4" />
                Fechar Carga e Gerar Romaneio
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
