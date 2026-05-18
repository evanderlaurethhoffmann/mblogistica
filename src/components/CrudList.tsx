import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Trash2, Plus } from "lucide-react";
import { toast } from "sonner";

type Field = { name: string; label: string; placeholder?: string };

export function CrudList({
  table,
  title,
  fields,
  display,
}: {
  table: "branches" | "checkers" | "drivers";
  title: string;
  fields: Field[];
  display: (row: any) => string;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState<Record<string, string>>({});

  const { data = [] } = useQuery({
    queryKey: [table],
    queryFn: async () => {
      const { data, error } = await supabase.from(table).select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      for (const f of fields) if (!form[f.name]?.trim()) throw new Error(`Preencha ${f.label}.`);
      const { error } = await supabase.from(table).insert(form as any);
      if (error) throw error;
    },
    onSuccess: () => {
      setForm({});
      qc.invalidateQueries({ queryKey: [table] });
      toast.success("Cadastro adicionado.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [table] });
      toast.success("Excluído.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <h2 className="font-semibold mb-4">Novo {title}</h2>
        <form
          onSubmit={(e) => { e.preventDefault(); add.mutate(); }}
          className="flex flex-wrap gap-3 items-end"
        >
          {fields.map((f) => (
            <div key={f.name} className="flex-1 min-w-[180px] space-y-1">
              <label className="text-sm font-medium">{f.label}</label>
              <Input
                value={form[f.name] ?? ""}
                onChange={(e) => setForm((p) => ({ ...p, [f.name]: e.target.value }))}
                placeholder={f.placeholder}
              />
            </div>
          ))}
          <Button type="submit" className="gap-1"><Plus className="h-4 w-4" /> Adicionar</Button>
        </form>
      </Card>

      <Card className="p-6">
        <h2 className="font-semibold mb-4">{title} cadastrados ({data.length})</h2>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Nenhum cadastro.</p>
        ) : (
          <ul className="divide-y">
            {data.map((row) => (
              <li key={row.id} className="flex items-center justify-between py-2">
                <span>{display(row)}</span>
                <Button size="icon" variant="ghost" onClick={() => remove.mutate(row.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
