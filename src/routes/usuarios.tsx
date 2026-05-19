import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus, UserCog } from "lucide-react";
import { toast } from "sonner";
import { AdminOnly } from "@/components/Layout";
import { createUser, deleteUser } from "@/lib/users.functions";

export const Route = createFileRoute("/usuarios")({
  head: () => ({ meta: [{ title: "Usuários — Romaneio" }] }),
  component: () => <AdminOnly><UsuariosPage /></AdminOnly>,
});

function UsuariosPage() {
  const qc = useQueryClient();
  const callCreate = useServerFn(createUser);
  const callDelete = useServerFn(deleteUser);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "operator" as "admin" | "operator" });

  const { data: users = [] } = useQuery({
    queryKey: ["users-with-roles"],
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, email, name, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const { data: roles } = await supabase.from("user_roles").select("user_id, role");
      return profiles.map((p) => ({
        ...p,
        role: roles?.find((r) => r.user_id === p.id)?.role ?? "operator",
      }));
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      if (!form.name || !form.email || !form.password) throw new Error("Preencha todos os campos.");
      if (form.password.length < 6) throw new Error("Senha deve ter ao menos 6 caracteres.");
      await callCreate({ data: form });
    },
    onSuccess: () => {
      setForm({ name: "", email: "", password: "", role: "operator" });
      qc.invalidateQueries({ queryKey: ["users-with-roles"] });
      toast.success("Usuário cadastrado.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const changeRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: "admin" | "operator" }) => {
      await supabase.from("user_roles").delete().eq("user_id", userId);
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users-with-roles"] });
      toast.success("Permissão atualizada.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      await callDelete({ data: { userId: id } });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users-with-roles"] });
      toast.success("Usuário removido.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><UserCog className="h-6 w-6" /> Usuários e Permissões</h1>
        <p className="text-sm text-muted-foreground">Cadastre operadores e administradores do sistema.</p>
      </div>

      <Card className="p-6">
        <h2 className="font-semibold mb-4">Novo usuário</h2>
        <form onSubmit={(e) => { e.preventDefault(); add.mutate(); }} className="grid gap-3 md:grid-cols-5 items-end">
          <div className="space-y-1">
            <Label>Nome</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>E-mail</Label>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Senha</Label>
            <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Permissão</Label>
            <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as any })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="operator">Operador</SelectItem>
                <SelectItem value="admin">Administrador</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" className="gap-1" disabled={add.isPending}>
            <Plus className="h-4 w-4" /> Adicionar
          </Button>
        </form>
      </Card>

      <Card className="p-6">
        <h2 className="font-semibold mb-4">Usuários cadastrados ({users.length})</h2>
        <ul className="divide-y">
          {users.map((u: any) => (
            <li key={u.id} className="flex items-center justify-between py-3 gap-3 flex-wrap">
              <div>
                <div className="font-medium">{u.name || "(sem nome)"}</div>
                <div className="text-xs text-muted-foreground">{u.email}</div>
              </div>
              <div className="flex items-center gap-2">
                <Select value={u.role} onValueChange={(v) => changeRole.mutate({ userId: u.id, role: v as any })}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="operator">Operador</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
                <Button size="icon" variant="ghost" onClick={() => remove.mutate(u.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
