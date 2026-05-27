import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Cog, Plus, Trash2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { AdminOnly } from "@/components/Layout";

const sb = supabase as any;

export const Route = createFileRoute("/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações" }] }),
  component: () => <AdminOnly><ConfigPage /></AdminOnly>,
});

function ConfigPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Cog className="h-6 w-6" /> Configurações</h1>
        <p className="text-sm text-muted-foreground">Cadastros e parâmetros do agendamento de recebimento.</p>
      </div>

      <Tabs defaultValue="empresas">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="empresas">Empresas</TabsTrigger>
          <TabsTrigger value="usuarios">Usuários</TabsTrigger>
          <TabsTrigger value="filiais">Filiais</TabsTrigger>
          <TabsTrigger value="horarios">Horários</TabsTrigger>
          <TabsTrigger value="motivos">Motivos de Recusa</TabsTrigger>
          <TabsTrigger value="docas">Docas</TabsTrigger>
          <TabsTrigger value="fixas">Agendas Fixas</TabsTrigger>
          <TabsTrigger value="integracoes">Integrações</TabsTrigger>
        </TabsList>

        <TabsContent value="empresas"><Empresas /></TabsContent>
        <TabsContent value="usuarios"><Usuarios /></TabsContent>
        <TabsContent value="filiais"><Filiais /></TabsContent>
        <TabsContent value="horarios"><Horarios /></TabsContent>
        <TabsContent value="motivos"><Motivos /></TabsContent>
        <TabsContent value="docas"><Docas /></TabsContent>
        <TabsContent value="fixas"><AgendasFixas /></TabsContent>
        <TabsContent value="integracoes"><Integracoes /></TabsContent>
      </Tabs>
    </div>
  );
}

/* ================== EMPRESAS ================== */
function Empresas() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ nome_fantasia: "", razao_social: "", cnpj: "", whatsapp: "", email: "", active: true });

  const { data = [] } = useQuery({
    queryKey: ["suppliers-all"],
    queryFn: async () => {
      const { data, error } = await sb.from("suppliers").select("*").order("nome_fantasia");
      if (error) throw error;
      return data ?? [];
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      if (!form.nome_fantasia || !form.razao_social || !form.cnpj) throw new Error("Preencha Nome Fantasia, Razão Social e CNPJ.");
      const { error } = await sb.from("suppliers").insert({ ...form, cnpj: form.cnpj.replace(/\D/g, "") });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["suppliers-all"] }); setForm({ nome_fantasia: "", razao_social: "", cnpj: "", whatsapp: "", email: "", active: true }); toast.success("Empresa cadastrada."); },
    onError: (e: Error) => toast.error(e.message),
  });
  const toggle = useMutation({
    mutationFn: async ({ id, active }: any) => { const { error } = await sb.from("suppliers").update({ active }).eq("id", id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["suppliers-all"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-3">
        <h2 className="font-semibold">Nova empresa</h2>
        <div className="grid md:grid-cols-3 gap-3">
          <Input placeholder="Nome Fantasia" value={form.nome_fantasia} onChange={(e) => setForm({ ...form, nome_fantasia: e.target.value })} />
          <Input placeholder="Razão Social" value={form.razao_social} onChange={(e) => setForm({ ...form, razao_social: e.target.value })} />
          <Input placeholder="CNPJ" value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} />
          <Input placeholder="WhatsApp" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} />
          <Input placeholder="E-mail" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Button onClick={() => add.mutate()} className="gap-1"><Plus className="h-4 w-4" /> Adicionar</Button>
        </div>
      </Card>
      <Card className="p-2">
        <Table>
          <TableHeader><TableRow><TableHead>Nome Fantasia</TableHead><TableHead>Razão Social</TableHead><TableHead>CNPJ</TableHead><TableHead>Contato</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
          <TableBody>
            {data.map((s: any) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.nome_fantasia}</TableCell>
                <TableCell>{s.razao_social}</TableCell>
                <TableCell>{s.cnpj}</TableCell>
                <TableCell><div className="text-xs">{s.email}</div><div className="text-xs text-muted-foreground">{s.whatsapp}</div></TableCell>
                <TableCell>
                  <Button size="sm" variant={s.active ? "default" : "outline"} onClick={() => toggle.mutate({ id: s.id, active: !s.active })}>
                    {s.active ? "Ativo" : "Inativo"}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

/* ================== USUARIOS (link) ================== */
function Usuarios() {
  return (
    <Card className="p-6 text-center space-y-3">
      <p className="text-sm text-muted-foreground">O cadastro de usuários internos está na tela dedicada.</p>
      <Button asChild><Link to="/usuarios" className="gap-1"><ExternalLink className="h-4 w-4" /> Abrir Gerenciamento de Usuários</Link></Button>
    </Card>
  );
}

/* ================== FILIAIS ================== */
function Filiais() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ number: "", name: "", cnpj: "" });

  const { data = [] } = useQuery({
    queryKey: ["branches-all"],
    queryFn: async () => { const { data, error } = await sb.from("branches").select("*").order("number"); if (error) throw error; return data ?? []; },
  });
  const add = useMutation({
    mutationFn: async () => {
      if (!form.number || !form.name) throw new Error("Número e Nome são obrigatórios.");
      const { error } = await sb.from("branches").insert(form); if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["branches-all"] }); setForm({ number: "", name: "", cnpj: "" }); toast.success("Filial cadastrada."); },
    onError: (e: Error) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await sb.from("branches").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["branches-all"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-3">
        <h2 className="font-semibold">Nova filial</h2>
        <div className="grid md:grid-cols-4 gap-3">
          <Input placeholder="Número (ex: 82)" value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} />
          <Input placeholder="Nome/Cidade" className="md:col-span-2" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input placeholder="CNPJ" value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} />
          <Button onClick={() => add.mutate()} className="gap-1"><Plus className="h-4 w-4" /> Adicionar</Button>
        </div>
      </Card>
      <Card className="p-2">
        <Table>
          <TableHeader><TableRow><TableHead>Número</TableHead><TableHead>Nome</TableHead><TableHead>CNPJ</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>
            {data.map((b: any) => (
              <TableRow key={b.id}>
                <TableCell className="font-medium">{b.number}</TableCell>
                <TableCell>{b.name}</TableCell>
                <TableCell>{b.cnpj ?? "—"}</TableCell>
                <TableCell><Button size="icon" variant="ghost" onClick={() => remove.mutate(b.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

/* ================== HORARIOS ================== */
const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
function Horarios() {
  const qc = useQueryClient();
  const { data = [] } = useQuery({
    queryKey: ["work-hours"],
    queryFn: async () => { const { data, error } = await sb.from("work_hours").select("*").order("weekday"); if (error) throw error; return data ?? []; },
  });
  const save = useMutation({
    mutationFn: async (row: any) => {
      const { error } = await sb.from("work_hours").update({
        enabled: row.enabled, start_time: row.start_time, end_time: row.end_time, updated_at: new Date().toISOString(),
      }).eq("weekday", row.weekday);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["work-hours"] }); toast.success("Horários atualizados."); },
    onError: (e: Error) => toast.error(e.message),
  });

  const [local, setLocal] = useState<any[]>([]);
  useEffect(() => { setLocal(data); }, [data]);

  return (
    <Card className="p-4 space-y-3">
      <h2 className="font-semibold">Janelas de Atendimento (alimentam o portal externo)</h2>
      <div className="space-y-2">
        {local.map((row: any, i: number) => (
          <div key={row.id} className="grid grid-cols-[160px_80px_1fr_1fr_auto] items-center gap-3 border rounded p-2">
            <div className="font-medium">{WEEKDAYS[row.weekday]}</div>
            <div className="flex items-center gap-2">
              <Checkbox checked={row.enabled} onCheckedChange={(v) => { const c=[...local]; c[i] = { ...row, enabled: !!v }; setLocal(c); }} />
              <Label className="text-xs">Ativo</Label>
            </div>
            <Input type="time" value={(row.start_time as string).slice(0,5)} disabled={!row.enabled}
              onChange={(e) => { const c=[...local]; c[i] = { ...row, start_time: e.target.value }; setLocal(c); }} />
            <Input type="time" value={(row.end_time as string).slice(0,5)} disabled={!row.enabled}
              onChange={(e) => { const c=[...local]; c[i] = { ...row, end_time: e.target.value }; setLocal(c); }} />
            <Button size="sm" onClick={() => save.mutate(row)}>Salvar</Button>
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ================== MOTIVOS ================== */
function Motivos() {
  const qc = useQueryClient();
  const [label, setLabel] = useState("");
  const { data = [] } = useQuery({
    queryKey: ["refusal-reasons"],
    queryFn: async () => { const { data, error } = await sb.from("refusal_reasons").select("*").order("label"); if (error) throw error; return data ?? []; },
  });
  const add = useMutation({
    mutationFn: async () => { if (!label.trim()) throw new Error("Informe o motivo."); const { error } = await sb.from("refusal_reasons").insert({ label: label.trim() }); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["refusal-reasons"] }); setLabel(""); toast.success("Motivo cadastrado."); },
    onError: (e: Error) => toast.error(e.message),
  });
  const toggle = useMutation({
    mutationFn: async ({ id, active }: any) => { const { error } = await sb.from("refusal_reasons").update({ active }).eq("id", id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["refusal-reasons"] }),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await sb.from("refusal_reasons").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["refusal-reasons"] }),
  });

  return (
    <div className="space-y-4">
      <Card className="p-4 flex gap-2">
        <Input placeholder="Ex: XML com divergência" value={label} onChange={(e) => setLabel(e.target.value)} />
        <Button onClick={() => add.mutate()} className="gap-1"><Plus className="h-4 w-4" /> Adicionar</Button>
      </Card>
      <Card className="p-2">
        <Table>
          <TableHeader><TableRow><TableHead>Motivo</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>
            {data.map((r: any) => (
              <TableRow key={r.id}>
                <TableCell>{r.label}</TableCell>
                <TableCell>
                  <Button size="sm" variant={r.active ? "default" : "outline"} onClick={() => toggle.mutate({ id: r.id, active: !r.active })}>
                    {r.active ? "Ativo" : "Inativo"}
                  </Button>
                </TableCell>
                <TableCell><Button size="icon" variant="ghost" onClick={() => remove.mutate(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

/* ================== DOCAS ================== */
function Docas() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const { data = [] } = useQuery({
    queryKey: ["docks"],
    queryFn: async () => { const { data, error } = await sb.from("docks").select("*").order("name"); if (error) throw error; return data ?? []; },
  });
  const add = useMutation({
    mutationFn: async () => { if (!name.trim()) throw new Error("Informe o nome."); const { error } = await sb.from("docks").insert({ name: name.trim() }); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["docks"] }); setName(""); toast.success("Doca cadastrada."); },
    onError: (e: Error) => toast.error(e.message),
  });
  const setStatus = useMutation({
    mutationFn: async ({ id, status }: any) => { const { error } = await sb.from("docks").update({ status }).eq("id", id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["docks"] }),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await sb.from("docks").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["docks"] }),
  });

  return (
    <div className="space-y-4">
      <Card className="p-4 flex gap-2">
        <Input placeholder="Ex: Doca 05" value={name} onChange={(e) => setName(e.target.value)} />
        <Button onClick={() => add.mutate()} className="gap-1"><Plus className="h-4 w-4" /> Adicionar</Button>
      </Card>
      <Card className="p-2">
        <Table>
          <TableHeader><TableRow><TableHead>Doca</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>
            {data.map((d: any) => (
              <TableRow key={d.id}>
                <TableCell className="font-medium">{d.name}</TableCell>
                <TableCell>
                  <Select value={d.status} onValueChange={(v) => setStatus.mutate({ id: d.id, status: v })}>
                    <SelectTrigger className="w-40 h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Ativa">Ativa</SelectItem>
                      <SelectItem value="Manutenção">Manutenção</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell><Button size="icon" variant="ghost" onClick={() => remove.mutate(d.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

/* ================== AGENDAS FIXAS ================== */
function AgendasFixas() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ supplier_id: "", dock_id: "", weekday: "1", scheduled_time: "08:00" });

  const { data = [] } = useQuery({
    queryKey: ["fixed-schedules"],
    queryFn: async () => {
      const { data, error } = await sb.from("fixed_schedules")
        .select("*, suppliers(nome_fantasia), docks(name)").order("weekday").order("scheduled_time");
      if (error) throw error;
      return data ?? [];
    },
  });
  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers-active"],
    queryFn: async () => { const { data } = await sb.from("suppliers").select("id, nome_fantasia").eq("active", true).order("nome_fantasia"); return data ?? []; },
  });
  const { data: docks = [] } = useQuery({
    queryKey: ["docks-active"],
    queryFn: async () => { const { data } = await sb.from("docks").select("id, name").eq("status", "Ativa").order("name"); return data ?? []; },
  });

  const add = useMutation({
    mutationFn: async () => {
      if (!form.supplier_id || !form.dock_id) throw new Error("Selecione fornecedor e doca.");
      const { error } = await sb.from("fixed_schedules").insert({
        supplier_id: form.supplier_id, dock_id: form.dock_id,
        weekday: Number(form.weekday), scheduled_time: form.scheduled_time,
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["fixed-schedules"] }); toast.success("Agenda fixa criada."); },
    onError: (e: Error) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await sb.from("fixed_schedules").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fixed-schedules"] }),
  });

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-3">
        <h2 className="font-semibold">Nova agenda fixa</h2>
        <div className="grid md:grid-cols-5 gap-3">
          <Select value={form.supplier_id} onValueChange={(v) => setForm({ ...form, supplier_id: v })}>
            <SelectTrigger><SelectValue placeholder="Fornecedor" /></SelectTrigger>
            <SelectContent>{suppliers.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.nome_fantasia}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={form.dock_id} onValueChange={(v) => setForm({ ...form, dock_id: v })}>
            <SelectTrigger><SelectValue placeholder="Doca" /></SelectTrigger>
            <SelectContent>{docks.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={form.weekday} onValueChange={(v) => setForm({ ...form, weekday: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{WEEKDAYS.map((d, i) => <SelectItem key={i} value={String(i)}>{d}</SelectItem>)}</SelectContent>
          </Select>
          <Input type="time" value={form.scheduled_time} onChange={(e) => setForm({ ...form, scheduled_time: e.target.value })} />
          <Button onClick={() => add.mutate()} className="gap-1"><Plus className="h-4 w-4" /> Adicionar</Button>
        </div>
      </Card>
      <Card className="p-2">
        <Table>
          <TableHeader><TableRow><TableHead>Fornecedor</TableHead><TableHead>Doca</TableHead><TableHead>Dia</TableHead><TableHead>Horário</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>
            {data.map((r: any) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.suppliers?.nome_fantasia}</TableCell>
                <TableCell>{r.docks?.name}</TableCell>
                <TableCell>{WEEKDAYS[r.weekday]}</TableCell>
                <TableCell><Badge variant="outline">{(r.scheduled_time as string).slice(0,5)}</Badge></TableCell>
                <TableCell><Button size="icon" variant="ghost" onClick={() => remove.mutate(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

/* ================== INTEGRACOES (mantém webhook antigo) ================== */
function Integracoes() {
  const qc = useQueryClient();
  const [url, setUrl] = useState("");
  const { data } = useQuery({
    queryKey: ["setting", "google_sheets_webhook_url"],
    queryFn: async () => { const { data } = await sb.from("app_settings").select("value").eq("key", "google_sheets_webhook_url").maybeSingle(); return data?.value ?? ""; },
  });
  useEffect(() => { if (data !== undefined) setUrl(data); }, [data]);
  const save = useMutation({
    mutationFn: async () => { const { error } = await sb.from("app_settings").upsert({ key: "google_sheets_webhook_url", value: url, updated_at: new Date().toISOString() }); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["setting"] }); toast.success("Configuração salva."); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Card className="p-6 space-y-4 max-w-3xl">
      <h2 className="font-semibold">Webhook — Google Sheets</h2>
      <p className="text-sm text-muted-foreground">URL pública do Google Apps Script para envio dos fechamentos de carga.</p>
      <Input placeholder="https://script.google.com/macros/s/AKfy.../exec" value={url} onChange={(e) => setUrl(e.target.value)} />
      <Button onClick={() => save.mutate()} disabled={save.isPending}>Salvar</Button>
    </Card>
  );
}
