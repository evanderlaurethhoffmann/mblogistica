import { createFileRoute } from "@tanstack/react-router";
import { CrudList } from "@/components/CrudList";

export const Route = createFileRoute("/cadastros/conferentes")({
  component: () => (
    <CrudList
      table="checkers"
      title="Conferente"
      fields={[{ name: "name", label: "Nome Completo", placeholder: "Ex: João Silva" }]}
      display={(r) => r.name}
    />
  ),
});
