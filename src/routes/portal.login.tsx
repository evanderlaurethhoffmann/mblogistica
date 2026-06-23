import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/portal/login")({
  head: () => ({ meta: [{ title: "Acesso do Fornecedor — Endereço Alterado" }] }),
  component: () => <Navigate to="/portal" replace />,
});
