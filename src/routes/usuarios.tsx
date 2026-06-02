import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Trash2, Plus, UserCog, Pencil } from "lucide-react";
import { toast } from "sonner";
import { AdminOnly } from "@/components/Layout";
import { createUser, deleteUser, getInternalUsers, updateUserAccess } from "@/lib/users.functions";

export const Route = createFileRoute("/usuarios")({
  head: () => ({ meta: [{ title: "Usuários — YAN Dashboard" }] }),
  component: () => <AdminOnly><UsuariosPage /></AdminOnly>,
});

type Perms = { acesso_yms: boolean; acesso_wms: boolean; acesso_tms: boolean; acesso_analytics: boolean };
type Role = "admin" | "operator";
type Category = "Administrador" | "Supervisor" | "CPD" | "Conferente";

const CATEGORY_PRESETS: Record<Category, { role: Role } & Perms> = {
  Administrador: { role: "admin", acesso_yms: true, acesso_wms: true, acesso_tms: true, acesso_analytics: true },
  Supervisor:    { role: "admin", acesso_yms: true, acesso_wms: true, acesso_tms: true, acesso_analytics: true },
  CPD:           { role: "operator", acesso_yms: true, acesso_wms: false, acesso_tms: true, acesso_analytics: false },
  Conferente:    { role: "operator", acesso_yms: false, acesso_wms: false, acesso_tms: true, acesso_analytics: false },
};

const CATEGORIES: Category[] = ["Administrador", "Supervisor", "CPD", "Conferente"];

const emptyForm = {
  username: "", name: "", email: "", password: "",
  category: "Conferente" as Category,
  role: "operator" as Role,
  acesso_yms: false, acesso_wms: false, acesso_tms: true, acesso_analytics: false,
};

function ModulesCheckboxes({
  value, onChange, disabled,
}: { value: Perms; onChange: (p: Perms) => void; disabled?: boolean }) {
  const items: Array<{ key: keyof Perms; label: string }> = [
    { key: "acesso_yms", label: "YMS" },
    { key: "acesso_wms", label: "WMS" },
    { key: "acesso_tms", label: "TMS" },
    { key: "acesso_analytics", label: "Analytics" },
  ];
  return (
    <div className="grid grid-cols-2 gap-2">
      {items.map((it) => (
        <label key={it.key} className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm ${disabled ? "opacity-60" : "cursor-pointer hover:bg-accent"}`}>
          <Checkbox
            checked={value[it.key]}
            disabled={disabled}
            onCheckedChange={(c) => onChange({ ...value, [it.key]: !!c })}
          />
          <span className="font-medium">{it.label}</span>
        </label>
      ))}
    </div>
  );
}

function UsuariosPage() {
  const qc = useQueryClient();
  const callCreate = useServerFn(createUser);
  const callUpdate = useServerFn(updateUserAccess);
  const callDelete = useServerFn(deleteUser);
  const callGetUsers = useServerFn(getInternalUsers);

  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState<null | {
    id: string; name: string; email: string;
    category: Category; role: Role;
  } & Perms>(null);

  const { data: users = [] } = useQuery({
    queryKey: ["users-with-roles"],
    queryFn: async () => callGetUsers(),
  });

  function applyCategory(cat: Category, target: "form" | "editing") {
    const preset = CATEGORY_PRESETS[cat];
    if (target === "form") {
      setForm((f) => ({ ...f, category: cat, ...preset }));
    } else if (editing) {
      setEditing({ ...editing, category: cat, ...preset });
    }
  }

  const add = useMutation({
    mutationFn: async () => {
      if (!form.username || !form.name || !form.email || !form.password) throw new Error("Preencha todos os campos.");
      if (form.password.length < 6) throw new Error("Senha deve ter ao menos 6 caracteres.");
      await callCreate({ data: form });
    },
    onSuccess: () => {
      setForm(emptyForm);
      qc.invalidateQueries({ queryKey: ["users-with-roles"] });
      toast.success("Usuário cadastrado.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async () => {
      if (!editing) return;
      await callUpdate({
        data: {
          userId: editing.id,
          category: editing.category,
          role: editing.role,
          acesso_yms: editing.acesso_yms,
          acesso_wms: editing.acesso_wms,
          acesso_tms: editing.acesso_tms,
          acesso_analytics: editing.acesso_analytics,
        },
      });
    },
    onSuccess: () => {
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["users-with-roles"] });
      toast.success("Usuário atualizado.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => { await callDelete({ data: { userId: id } }); },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users-with-roles"] });
      toast.success("Usuário removido.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const isAdminForm = form.role === "admin";
  const isAdminEdit = editing?.role === "admin";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><UserCog className="h-6 w-6" /> Usuários e Permissões</h1>
        <p className="text-sm text-muted-foreground">
          Cadastre operadores e administradores. Defina o perfil e quais módulos do YAN Dashboard cada usuário pode acessar.
        </p>
      </div>

      <Card className="p-6">
        <h2 className="font-semibold mb-4">Novo usuário</h2>
        <form onSubmit={(e) => { e.preventDefault(); add.mutate(); }} className="space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <div className="space-y-1">
              <Label>Nome de Usuário</Label>
              <Input autoCapitalize="none" autoComplete="username" placeholder="evander.hoffmann" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase().trim() })} />
            </div>
            <div className="space-y-1">
              <Label>Nome Completo</Label>
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
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <Label>Perfil / Categoria</Label>
              <Select value={form.category} onValueChange={(v) => applyCategory(v as Category, "form")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Categoria define o role base e os módulos. Você pode ajustar os módulos abaixo.
              </p>
            </div>
            <div className="space-y-1">
              <Label>Módulos liberados {isAdminForm && <span className="text-xs text-primary">(Admin: todos)</span>}</Label>
              <ModulesCheckboxes
                value={form}
                disabled={isAdminForm}
                onChange={(p) => setForm({ ...form, ...p })}
              />
            </div>
          </div>

          <div>
            <Button type="submit" className="gap-1" disabled={add.isPending}>
              <Plus className="h-4 w-4" /> Adicionar usuário
            </Button>
          </div>
        </form>
      </Card>

      <Card className="p-6">
        <h2 className="font-semibold mb-4">Usuários cadastrados ({users.length})</h2>
        <div className="space-y-2">
          {users.map((u: any) => (
            <div key={u.id} className="flex items-center justify-between gap-3 flex-wrap border rounded-md p-3">
              <div className="min-w-0">
                <div className="font-medium truncate">{u.name || u.nome_completo || "(sem nome)"}</div>
                <div className="text-xs text-muted-foreground truncate">
                  @{u.username || String(u.email || "").split("@")[0]} · {u.email}
                </div>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  <Badge variant={u.role === "admin" ? "default" : "secondary"}>{u.category || (u.role === "admin" ? "Administrador" : "Conferente")}</Badge>
                  {u.acesso_yms && <Badge variant="outline">YMS</Badge>}
                  {u.acesso_wms && <Badge variant="outline">WMS</Badge>}
                  {u.acesso_tms && <Badge variant="outline">TMS</Badge>}
                  {u.acesso_analytics && <Badge variant="outline">Analytics</Badge>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" className="gap-1" onClick={() => setEditing({
                  id: u.id, name: u.name, email: u.email,
                  category: (u.category as Category) || (u.role === "admin" ? "Administrador" : "Conferente"),
                  role: u.role,
                  acesso_yms: !!u.acesso_yms,
                  acesso_wms: !!u.acesso_wms,
                  acesso_tms: !!u.acesso_tms,
                  acesso_analytics: !!u.acesso_analytics,
                })}>
                  <Pencil className="h-3.5 w-3.5" /> Editar
                </Button>
                <Button size="icon" variant="ghost" onClick={() => {
                  if (confirm(`Excluir ${u.email}?`)) remove.mutate(u.id);
                }}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar permissões — {editing?.name || editing?.email}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="space-y-1">
                <Label>Perfil / Categoria</Label>
                <Select value={editing.category} onValueChange={(v) => applyCategory(v as Category, "editing")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Módulos liberados {isAdminEdit && <span className="text-xs text-primary">(Admin: todos)</span>}</Label>
                <ModulesCheckboxes
                  value={editing}
                  disabled={isAdminEdit}
                  onChange={(p) => setEditing({ ...editing, ...p })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={() => update.mutate()} disabled={update.isPending}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
