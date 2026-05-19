import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Cog } from "lucide-react";
import { toast } from "sonner";
import { AdminOnly } from "@/components/Layout";

export const Route = createFileRoute("/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações — Romaneio" }] }),
  component: () => <AdminOnly><ConfigPage /></AdminOnly>,
});

function ConfigPage() {
  const qc = useQueryClient();
  const [url, setUrl] = useState("");

  const { data } = useQuery({
    queryKey: ["setting", "google_sheets_webhook_url"],
    queryFn: async () => {
      const { data } = await supabase.from("app_settings").select("value").eq("key", "google_sheets_webhook_url").maybeSingle();
      return data?.value ?? "";
    },
  });

  useEffect(() => { if (data !== undefined) setUrl(data); }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("app_settings")
        .upsert({ key: "google_sheets_webhook_url", value: url, updated_at: new Date().toISOString() });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["setting"] });
      toast.success("Configuração salva.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Cog className="h-6 w-6" /> Configurações</h1>
        <p className="text-sm text-muted-foreground">Integrações e parâmetros do sistema.</p>
      </div>

      <Card className="p-6 space-y-4">
        <h2 className="font-semibold">Webhook — Google Sheets</h2>
        <p className="text-sm text-muted-foreground">
          URL pública de um Google Apps Script publicado como "Web App" (Anyone). A cada fechamento de carga, o sistema
          envia <code className="text-xs bg-secondary px-1 rounded">POST</code> com:
          <code className="text-xs bg-secondary px-1 rounded ml-1">{`{ loadId, date, branch, checker, driver, volumes[] }`}</code>.
        </p>
        <div className="space-y-2">
          <Label htmlFor="webhook">URL do Webhook</Label>
          <Input
            id="webhook"
            placeholder="https://script.google.com/macros/s/AKfy.../exec"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </div>
        <Button onClick={() => save.mutate()} disabled={save.isPending}>Salvar</Button>
      </Card>
    </div>
  );
}
