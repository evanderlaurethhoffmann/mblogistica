import { createFileRoute } from "@tanstack/react-router";
import { CrudList } from "@/components/CrudList";

export const Route = createFileRoute("/cadastros/motoristas")({
  component: () => (
    <CrudList
      table="drivers"
      title="Motorista"
      fields={[{ name: "name", label: "Nome Completo", placeholder: "Ex: Carlos Souza" }]}
      display={(r) => r.name}
    />
  ),
});
