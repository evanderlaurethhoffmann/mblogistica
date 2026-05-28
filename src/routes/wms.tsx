import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Warehouse, Construction } from "lucide-react";

export const Route = createFileRoute("/wms")({
  head: () => ({ meta: [{ title: "WMS — Depósito" }] }),
  component: WmsPage,
});

function WmsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">WMS — Depósito</h1>
        <p className="text-sm text-muted-foreground">Gestão de armazenagem e estoque.</p>
      </div>
      <Card className="p-16 flex flex-col items-center justify-center text-center gap-4 border-dashed border-2">
        <div className="p-4 rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
          <Construction className="h-10 w-10" />
        </div>
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2 justify-center">
            <Warehouse className="h-6 w-6" /> Em Desenvolvimento
          </h2>
          <p className="text-sm text-muted-foreground mt-2 max-w-md">
            Este módulo está sendo preparado. Em breve traremos as funcionalidades de
            endereçamento, picking e gestão de estoque.
          </p>
        </div>
      </Card>
    </div>
  );
}
