import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Check, X, Download, Clock, FileText } from "lucide-react";

const sb = supabase as any;

function statusBadge(s: string) {
  const map: Record<string, string> = {
    Pendente: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
    Confirmado: "bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30",
    Recusado: "bg-destructive/15 text-destructive border-destructive/30",
  };
  return <Badge variant="outline" className={map[s] ?? ""}>{s}</Badge>;
}

function fmtDate(d?: string | null) {
  if (!d) return "—";
  return d.split("-").reverse().join("/");
}
function fmtTime(t?: string | null) {
  if (!t) return "—";
  return t.slice(0, 5);
}
function fmtDateTime(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("pt-BR");
}

export function AppointmentDetailsDialog({
  appointmentId,
  open,
  onOpenChange,
}: {
  appointmentId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const { isAdmin } = useAuth();

  const { data: appt, isLoading } = useQuery({
    queryKey: ["appointment", appointmentId],
    enabled: !!appointmentId && open,
    queryFn: async () => {
      const { data, error } = await sb
        .from("appointments")
        .select("*, suppliers(nome_fantasia, razao_social, cnpj, whatsapp, email)")
        .eq("id", appointmentId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: docks = [] } = useQuery({
    queryKey: ["docks-active"],
    queryFn: async () => {
      const { data, error } = await sb.from("docks").select("*").eq("status", "Ativa").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: reasons = [] } = useQuery({
    queryKey: ["refusal-reasons-active"],
    queryFn: async () => {
      const { data, error } = await sb.from("refusal_reasons").select("*").eq("active", true).order("label");
      if (error) throw error;
      return data ?? [];
    },
  });

  const [dockId, setDockId] = useState<string>("");
  const [minutes, setMinutes] = useState<number>(60);
  const [editingMinutes, setEditingMinutes] = useState(false);
  const [refusing, setRefusing] = useState(false);
  const [refusalReasonId, setRefusalReasonId] = useState<string>("");
  const [refusalText, setRefusalText] = useState("");

  useEffect(() => {
    if (appt) {
      setDockId(appt.dock_id ?? "");
      setMinutes(appt.estimated_minutes ?? 60);
      setEditingMinutes(false);
      setRefusing(false);
      setRefusalReasonId(appt.refusal_reason_id ?? "");
      setRefusalText(appt.refusal_reason ?? "");
    }
  }, [appt]);

  const approve = useMutation({
    mutationFn: async () => {
      if (!appt) return;
      if (!dockId) throw new Error("Selecione uma doca antes de aprovar.");
      // conflict check: outra confirmação na mesma doca/data/hora
      const { data: conflict } = await sb.from("appointments")
        .select("id").eq("dock_id", dockId).eq("scheduled_date", appt.scheduled_date)
        .eq("scheduled_time", appt.scheduled_time).eq("status", "Confirmado").neq("id", appt.id).maybeSingle();
      if (conflict) throw new Error("Já existe um agendamento confirmado nessa doca e horário.");
      const { error } = await sb.from("appointments").update({
        status: "Confirmado",
        dock_id: dockId,
        estimated_minutes: minutes,
        refusal_reason: null,
        refusal_reason_id: null,
      }).eq("id", appt.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["appointments"] });
      qc.invalidateQueries({ queryKey: ["appointment", appointmentId] });
      qc.invalidateQueries({ queryKey: ["dock-grid"] });
      toast.success("Agendamento aprovado.");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const refuse = useMutation({
    mutationFn: async () => {
      if (!appt) return;
      if (!refusalText.trim()) throw new Error("Informe o motivo da recusa.");
      const { error } = await sb.from("appointments").update({
        status: "Recusado",
        refusal_reason: refusalText.trim(),
        refusal_reason_id: refusalReasonId || null,
      }).eq("id", appt.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["appointments"] });
      qc.invalidateQueries({ queryKey: ["appointment", appointmentId] });
      toast.success("Agendamento recusado.");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveMinutes = useMutation({
    mutationFn: async () => {
      if (!appt) return;
      const { error } = await sb.from("appointments").update({ estimated_minutes: minutes }).eq("id", appt.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["appointments"] });
      qc.invalidateQueries({ queryKey: ["appointment", appointmentId] });
      toast.success("Tempo atualizado.");
      setEditingMinutes(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const downloadNf = async () => {
    if (!appt?.nf_file_url) return;
    const { data, error } = await supabase.storage.from("nf-uploads").createSignedUrl(appt.nf_file_url, 60);
    if (error || !data?.signedUrl) { toast.error("Falha ao gerar link."); return; }
    window.open(data.signedUrl, "_blank");
  };

  const fileExt = useMemo(() => {
    if (!appt?.nf_file_url) return null;
    return (appt.nf_file_url as string).split(".").pop()?.toUpperCase() ?? null;
  }, [appt?.nf_file_url]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            Detalhes do Agendamento
            {appt && statusBadge(appt.status)}
            {appt?.protocol && (
              <span className="text-xs font-mono text-muted-foreground">{appt.protocol}</span>
            )}
          </DialogTitle>
        </DialogHeader>

        {isLoading || !appt ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Carregando…</p>
        ) : (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* COLUNA ESQUERDA */}
            <div className="lg:col-span-2 space-y-4">
              <Section title="Dados da Solicitação">
                <Grid>
                  <KV k="Protocolo" v={<span className="font-mono">{appt.protocol ?? "—"}</span>} />
                  <KV k="Solicitada em" v={fmtDateTime(appt.created_at)} />
                  <KV k="Solicitada para" v={`${fmtDate(appt.scheduled_date)} ${fmtTime(appt.scheduled_time)}`} />
                  <KV k="Tipo de Carga" v={appt.cargo_type} />
                  <KV k="CNPJ" v={appt.suppliers?.cnpj} />
                  <KV k="Razão Social" v={appt.suppliers?.razao_social} />
                  <KV k="Nome Fantasia" v={appt.suppliers?.nome_fantasia} />
                  <KV k="E-mail" v={appt.suppliers?.email} />
                  <KV k="WhatsApp" v={appt.suppliers?.whatsapp} />
                </Grid>
                {appt.observations && (
                  <div className="mt-3">
                    <div className="text-xs text-muted-foreground">Observações</div>
                    <div className="text-sm whitespace-pre-wrap">{appt.observations}</div>
                  </div>
                )}
              </Section>

              <Section title="Dados da Carga">
                <Grid>
                  <KV k="Disposição" v={appt.disposition ?? appt.cargo_type} />
                  <KV k="Nº de Volumes" v={appt.nf_volumes} />
                  <KV k="Nº de Paletes" v={appt.palette_count ?? 0} />
                  <KV k="Tipo de Veículo" v={appt.vehicle_type} />
                  <KV k="Placa" v={appt.vehicle_plate} />
                  <KV k="Motorista" v={appt.driver_name ?? "—"} />
                  <KV k="Contato do Motorista" v={appt.driver_contact} />
                  <KV k="Transportadora" v={appt.carrier_name ?? "—"} />
                </Grid>
              </Section>

              <Section title="Alocação de Doca">
                <Grid>
                  <KV k="Agendado para" v={fmtDate(appt.scheduled_date)} />
                  <KV k="Horário" v={fmtTime(appt.scheduled_time)} />
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">Doca</div>
                    <Select value={dockId} onValueChange={setDockId} disabled={!isAdmin || appt.status === "Recusado"}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Selecione…" /></SelectTrigger>
                      <SelectContent>
                        {docks.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">Tempo de Descarregamento (min)</div>
                    {editingMinutes ? (
                      <div className="flex gap-1">
                        <Input type="number" min={15} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} className="h-9" />
                        <Button size="sm" onClick={() => saveMinutes.mutate()} disabled={saveMinutes.isPending}>OK</Button>
                      </div>
                    ) : (
                      <div className="text-sm flex items-center gap-2">
                        <span className="font-medium">{minutes} min</span>
                        {isAdmin && (
                          <Button size="sm" variant="ghost" onClick={() => setEditingMinutes(true)} className="h-7 gap-1">
                            <Clock className="h-3 w-3" /> Alterar
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </Grid>
              </Section>

              {appt.status === "Recusado" && appt.refusal_reason && (
                <div className="p-3 border border-destructive/40 rounded-md bg-destructive/5 text-sm">
                  <strong>Motivo da recusa:</strong> {appt.refusal_reason}
                </div>
              )}

              {refusing && (
                <Section title="Recusar Agendamento" tone="destructive">
                  <div className="space-y-2">
                    <Label>Motivo pré-cadastrado</Label>
                    <Select value={refusalReasonId} onValueChange={(v) => {
                      setRefusalReasonId(v);
                      const r = reasons.find((x: any) => x.id === v);
                      if (r) setRefusalText((prev) => prev || r.label);
                    }}>
                      <SelectTrigger><SelectValue placeholder="Selecione um motivo…" /></SelectTrigger>
                      <SelectContent>
                        {reasons.map((r: any) => <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 mt-3">
                    <Label>Justificativa enviada ao fornecedor *</Label>
                    <Textarea rows={3} value={refusalText} onChange={(e) => setRefusalText(e.target.value)}
                      placeholder="Informe o motivo da recusa para o fornecedor" />
                  </div>
                </Section>
              )}
            </div>

            {/* COLUNA DIREITA */}
            <div className="space-y-4">
              <Section title="Notas Fiscais e Anexos">
                <div className="space-y-3">
                  <KV k="Nº da NF" v={appt.nf_number ?? "—"} />
                  <KV k="Chave de Acesso" v={appt.nf_access_key ? <span className="font-mono text-xs break-all">{appt.nf_access_key}</span> : "—"} />
                  <KV k="Status da NF" v={appt.nf_status ?? "Pendente"} />
                  {appt.nf_file_url ? (
                    <Button variant="outline" size="sm" onClick={downloadNf} className="w-full gap-2 mt-1">
                      <Download className="h-4 w-4" /> Baixar arquivo {fileExt}
                    </Button>
                  ) : (
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <FileText className="h-3 w-3" /> Sem arquivo anexado
                    </div>
                  )}
                </div>
              </Section>
            </div>
          </div>
        )}

        {/* Rodapé fixo */}
        {appt && isAdmin && appt.status === "Pendente" && (
          <div className="flex items-center justify-end gap-2 pt-4 border-t mt-2">
            {!refusing ? (
              <>
                <Button variant="destructive" onClick={() => setRefusing(true)} className="gap-1">
                  <X className="h-4 w-4" /> Recusar
                </Button>
                <Button onClick={() => approve.mutate()} disabled={approve.isPending} className="gap-1">
                  <Check className="h-4 w-4" /> Aprovar Agendamento
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" onClick={() => setRefusing(false)}>Cancelar</Button>
                <Button variant="destructive" disabled={!refusalText.trim() || refuse.isPending} onClick={() => refuse.mutate()} className="gap-1">
                  <X className="h-4 w-4" /> Confirmar recusa
                </Button>
              </>
            )}
          </div>
        )}
        {appt && (!isAdmin || appt.status !== "Pendente") && (
          <div className="flex justify-end pt-4 border-t mt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Section({ title, children, tone }: { title: string; children: React.ReactNode; tone?: "destructive" }) {
  return (
    <div className={`rounded-lg border p-4 ${tone === "destructive" ? "border-destructive/40 bg-destructive/5" : "bg-card"}`}>
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">{title}</h3>
      {children}
    </div>
  );
}
function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid sm:grid-cols-2 gap-3">{children}</div>;
}
function KV({ k, v }: { k: string; v: any }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{k}</div>
      <div className="text-sm font-medium">{v || "—"}</div>
    </div>
  );
}
