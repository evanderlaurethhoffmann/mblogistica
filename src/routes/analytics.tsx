import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { BarChart3, Construction } from "lucide-react";

export const Route = createFileRoute("/analytics")({
  head: () => ({ meta: [{ title: "Analytics — Relatórios" }] }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-sm text-muted-foreground">Relatórios e controles do CD.</p>
      </div>
      <Card className="p-16 flex flex-col items-center justify-center text-center gap-4 border-dashed border-2">
        <div className="p-4 rounded-2xl bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300">
          <Construction className="h-10 w-10" />
        </div>
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2 justify-center">
            <BarChart3 className="h-6 w-6" /> Em Desenvolvimento
          </h2>
          <p className="text-sm text-muted-foreground mt-2 max-w-md">
            Em breve, indicadores consolidados, BI, exportações e relatórios gerenciais.
          </p>
        </div>
      </Card>
    </div>
  );
}
