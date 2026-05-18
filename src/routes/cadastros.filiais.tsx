import { createFileRoute } from "@tanstack/react-router";
import { CrudList } from "@/components/CrudList";

export const Route = createFileRoute("/cadastros/filiais")({
  component: () => (
    <CrudList
      table="branches"
      title="Filial"
      fields={[
        { name: "number", label: "Número da Filial", placeholder: "Ex: 001" },
        { name: "name", label: "Nome / Cidade", placeholder: "Ex: São Paulo" },
      ]}
      display={(r) => `${r.number} — ${r.name}`}
    />
  ),
});
