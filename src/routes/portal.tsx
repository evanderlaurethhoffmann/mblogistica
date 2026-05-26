import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Truck, Package2, CalendarCheck, CheckCircle2, ArrowLeft, ArrowRight } from "lucide-react";
import { z } from "zod";

export const Route = createFileRoute("/portal")({
  head: () => ({
    meta: [
      { title: "Portal de Agendamento do Fornecedor" },
      { name: "description", content: "Solicite agendamento de entrega no Centro de Distribuição." },
    ],
  }),
  component: PortalPage,
});

const SLOTS = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"];

const supplierSchema = z.object({
  nome_fantasia: z.string().trim().min(2).max(255),
  razao_social: z.string().trim().min(2).max(255),
  cnpj: z.string().trim().min(14).max(18),
  whatsapp: z.string().trim().min(8).max(20),
  email: z.string().trim().email().max(255),
});

function onlyDigits(s: string) { return s.replace(/\D/g, ""); }
function ymd(d: Date) {
  const y = d.getFullYear(); const m = String(d.getMonth() + 1).padStart(2, "0"); const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${da}`;
}

function PortalPage() {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [protocolo, setProtocolo] = useState<string>("");

  const [supplier, setSupplier] = useState({
    nome_fantasia: "", razao_social: "", cnpj: "", whatsapp: "", email: "",
  });
  const [cargo, setCargo] = useState({
    vehicle_type: "", vehicle_plate: "", cargo_type: "", driver_contact: "",
    nf_volumes: 0, nf_file_url: "" as string,
  });
  const [nfFile, setNfFile] = useState<File | null>(null);
  const [schedule, setSchedule] = useState({
    date: undefined as Date | undefined, time: "", estimated_minutes: 60,
  });

  // ---- Step 1: Supplier ----
  const submitSupplier = async () => {
    try {
      const data = supplierSchema.parse({ ...supplier, cnpj: onlyDigits(supplier.cnpj) });
      // upsert by cnpj
      const { data: existing } = await supabase.from("suppliers").select("id").eq("cnpj", data.cnpj).maybeSingle();
      if (existing?.id) {
        await supabase.from("suppliers").update(data).eq("id", existing.id);
        setSupplierId(existing.id);
      } else {
        const { data: inserted, error } = await supabase.from("suppliers").insert(data).select("id").single();
        if (error) throw error;
        setSupplierId(inserted.id);
      }
      setStep(2);
    } catch (e: any) {
      toast.error(e?.message ?? "Verifique os dados do fornecedor.");
    }
  };

  // ---- Step 2: Cargo + NF upload ----
  const submitCargo = async () => {
    if (!cargo.vehicle_type || !cargo.vehicle_plate || !cargo.cargo_type || !cargo.driver_contact) {
      toast.error("Preencha todos os campos obrigatórios."); return;
    }
    if (!cargo.nf_volumes || cargo.nf_volumes <= 0) {
      toast.error("Informe a quantidade de volumes."); return;
    }
    if (!nfFile) {
      toast.error("Anexe o arquivo da NF (XML ou PDF)."); return;
    }
    try {
      const ext = nfFile.name.split(".").pop()?.toLowerCase() ?? "bin";
      if (!["xml", "pdf"].includes(ext)) { toast.error("Arquivo deve ser XML ou PDF."); return; }
      const path = `${supplierId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from("nf-uploads").upload(path, nfFile, {
        contentType: ext === "pdf" ? "application/pdf" : "application/xml",
      });
      if (error) throw error;
      setCargo((c) => ({ ...c, nf_file_url: path }));
      setStep(3);
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao enviar arquivo.");
    }
  };

  // ---- Step 3: Calendar ----
  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);
  const maxDate = useMemo(() => { const d = new Date(today); d.setDate(d.getDate() + 15); return d; }, [today]);

  const [blocked, setBlocked] = useState<string[]>([]);
  const [confirmedSlots, setConfirmedSlots] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (step !== 3) return;
    (async () => {
      const fromStr = ymd(today); const toStr = ymd(maxDate);
      const [{ data: bd }, { data: ap }] = await Promise.all([
        supabase.from("blocked_dates").select("blocked_date").gte("blocked_date", fromStr).lte("blocked_date", toStr),
        supabase.from("appointments").select("scheduled_date, scheduled_time, status")
          .gte("scheduled_date", fromStr).lte("scheduled_date", toStr).eq("status", "Confirmado"),
      ]);
      setBlocked((bd ?? []).map((r: any) => r.blocked_date));
      const map: Record<string, string[]> = {};
      (ap ?? []).forEach((r: any) => {
        const t = (r.scheduled_time as string).slice(0, 5);
        (map[r.scheduled_date] ??= []).push(t);
      });
      setConfirmedSlots(map);
    })();
  }, [step, today, maxDate]);

  const disabledDays = (date: Date) => {
    if (date < today || date > maxDate) return true;
    const s = ymd(date);
    if (blocked.includes(s)) return true;
    const taken = confirmedSlots[s]?.length ?? 0;
    return taken >= SLOTS.length;
  };

  const submitSchedule = async () => {
    if (!schedule.date || !schedule.time) { toast.error("Selecione data e horário."); return; }
    if (!schedule.estimated_minutes || schedule.estimated_minutes <= 0) { toast.error("Informe o tempo estimado."); return; }
    try {
      const payload = {
        supplier_id: supplierId!,
        vehicle_type: cargo.vehicle_type,
        vehicle_plate: cargo.vehicle_plate.toUpperCase().trim(),
        cargo_type: cargo.cargo_type,
        driver_contact: cargo.driver_contact,
        nf_file_url: cargo.nf_file_url,
        nf_volumes: cargo.nf_volumes,
        scheduled_date: ymd(schedule.date),
        scheduled_time: schedule.time,
        estimated_minutes: schedule.estimated_minutes,
        status: "Pendente",
      };
      const { data, error } = await supabase.from("appointments").insert(payload).select("id").single();
      if (error) throw error;
      setProtocolo(data.id.slice(0, 8).toUpperCase());
      setStep(4);
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao enviar solicitação.");
    }
  };

  const StepHeader = (
    <div className="flex items-center justify-center gap-2 mb-6 flex-wrap">
      {[
        { n: 1, label: "Fornecedor", icon: Truck },
        { n: 2, label: "Carga", icon: Package2 },
        { n: 3, label: "Agenda", icon: CalendarCheck },
      ].map(({ n, label, icon: Icon }) => (
        <div key={n} className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${step === n ? "bg-primary text-primary-foreground" : step > n ? "bg-secondary text-foreground" : "bg-muted text-muted-foreground"}`}>
          <Icon className="h-4 w-4" /> {n}. {label}
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/30 py-10 px-4">
      <div className="mx-auto max-w-3xl">
        <header className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <Truck className="h-7 w-7 text-primary" />
            <h1 className="text-3xl font-bold">Portal de Agendamento</h1>
          </div>
          <p className="text-muted-foreground">Solicite seu horário de entrega no Centro de Distribuição.</p>
        </header>

        {step !== 4 && StepHeader}

        {step === 1 && (
          <Card className="p-6 space-y-4">
            <h2 className="font-semibold text-lg">Dados da Empresa</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Nome Fantasia *</Label>
                <Input value={supplier.nome_fantasia} onChange={(e) => setSupplier({ ...supplier, nome_fantasia: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Razão Social *</Label>
                <Input value={supplier.razao_social} onChange={(e) => setSupplier({ ...supplier, razao_social: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>CNPJ *</Label>
                <Input value={supplier.cnpj} onChange={(e) => setSupplier({ ...supplier, cnpj: e.target.value })} placeholder="00.000.000/0000-00" />
              </div>
              <div className="space-y-1">
                <Label>WhatsApp *</Label>
                <Input value={supplier.whatsapp} onChange={(e) => setSupplier({ ...supplier, whatsapp: e.target.value })} placeholder="(00) 00000-0000" />
              </div>
              <div className="space-y-1 md:col-span-2">
                <Label>E-mail *</Label>
                <Input type="email" value={supplier.email} onChange={(e) => setSupplier({ ...supplier, email: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <Button onClick={submitSupplier} className="gap-1">Avançar <ArrowRight className="h-4 w-4" /></Button>
            </div>
          </Card>
        )}

        {step === 2 && (
          <Card className="p-6 space-y-4">
            <h2 className="font-semibold text-lg">Informações da Carga</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Tipo de Veículo *</Label>
                <Select value={cargo.vehicle_type} onValueChange={(v) => setCargo({ ...cargo, vehicle_type: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
                  <SelectContent>
                    {["Van", "Toco", "Truck", "Carreta", "Bitrem", "Outro"].map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Placa do Veículo *</Label>
                <Input value={cargo.vehicle_plate} onChange={(e) => setCargo({ ...cargo, vehicle_plate: e.target.value })} placeholder="ABC1D23" />
              </div>
              <div className="space-y-1">
                <Label>Tipo de Carga *</Label>
                <Select value={cargo.cargo_type} onValueChange={(v) => setCargo({ ...cargo, cargo_type: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
                  <SelectContent>
                    {["Paletizada", "Batida", "Química", "Refrigerada", "Granel", "Outro"].map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Contato do Motorista *</Label>
                <Input value={cargo.driver_contact} onChange={(e) => setCargo({ ...cargo, driver_contact: e.target.value })} placeholder="(00) 00000-0000" />
              </div>
              <div className="space-y-1">
                <Label>NF (XML ou PDF) *</Label>
                <Input type="file" accept=".xml,.pdf,application/xml,application/pdf,text/xml" onChange={(e) => setNfFile(e.target.files?.[0] ?? null)} />
              </div>
              <div className="space-y-1">
                <Label>Quantidade de Volumes *</Label>
                <Input type="number" min={1} value={cargo.nf_volumes || ""} onChange={(e) => setCargo({ ...cargo, nf_volumes: Number(e.target.value) })} />
              </div>
            </div>
            <div className="flex justify-between pt-2">
              <Button variant="ghost" onClick={() => setStep(1)} className="gap-1"><ArrowLeft className="h-4 w-4" /> Voltar</Button>
              <Button onClick={submitCargo} className="gap-1">Avançar <ArrowRight className="h-4 w-4" /></Button>
            </div>
          </Card>
        )}

        {step === 3 && (
          <Card className="p-6 space-y-4">
            <h2 className="font-semibold text-lg">Selecione data e horário</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="flex justify-center">
                <Calendar
                  mode="single"
                  selected={schedule.date}
                  onSelect={(d) => setSchedule({ ...schedule, date: d ?? undefined, time: "" })}
                  disabled={disabledDays}
                  fromDate={today}
                  toDate={maxDate}
                  className="p-3 pointer-events-auto rounded-md border"
                />
              </div>
              <div className="space-y-4">
                <div>
                  <Label>Horários disponíveis</Label>
                  {!schedule.date && <p className="text-sm text-muted-foreground mt-2">Selecione uma data primeiro.</p>}
                  {schedule.date && (
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {SLOTS.map((s) => {
                        const taken = confirmedSlots[ymd(schedule.date!)]?.includes(s);
                        return (
                          <Button
                            key={s}
                            type="button"
                            size="sm"
                            variant={schedule.time === s ? "default" : "outline"}
                            disabled={taken}
                            onClick={() => setSchedule({ ...schedule, time: s })}
                          >
                            {s}{taken ? " 🚫" : ""}
                          </Button>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <Label>Tempo estimado para descarga (min) *</Label>
                  <Input
                    type="number" min={15} step={15}
                    value={schedule.estimated_minutes || ""}
                    onChange={(e) => setSchedule({ ...schedule, estimated_minutes: Number(e.target.value) })}
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-between pt-2">
              <Button variant="ghost" onClick={() => setStep(2)} className="gap-1"><ArrowLeft className="h-4 w-4" /> Voltar</Button>
              <Button onClick={submitSchedule} className="gap-1">Enviar Solicitação <CheckCircle2 className="h-4 w-4" /></Button>
            </div>
          </Card>
        )}

        {step === 4 && (
          <Card className="p-8 text-center space-y-4">
            <CheckCircle2 className="h-16 w-16 text-primary mx-auto" />
            <h2 className="text-2xl font-bold">Solicitação enviada!</h2>
            <p className="text-muted-foreground">
              Sua solicitação foi recebida e está <strong>pendente</strong> de aprovação pelo Centro de Distribuição.
            </p>
            <div className="inline-block bg-secondary px-6 py-3 rounded-lg">
              <div className="text-xs text-muted-foreground">Protocolo</div>
              <div className="text-2xl font-mono font-bold">{protocolo}</div>
            </div>
            <p className="text-sm text-muted-foreground">Guarde este número para acompanhamento.</p>
            <div className="pt-2">
              <Button variant="outline" onClick={() => {
                setStep(1); setSupplierId(null); setProtocolo("");
                setSupplier({ nome_fantasia: "", razao_social: "", cnpj: "", whatsapp: "", email: "" });
                setCargo({ vehicle_type: "", vehicle_plate: "", cargo_type: "", driver_contact: "", nf_volumes: 0, nf_file_url: "" });
                setNfFile(null);
                setSchedule({ date: undefined, time: "", estimated_minutes: 60 });
              }}>Nova solicitação</Button>
            </div>
          </Card>
        )}

        <footer className="text-center text-xs text-muted-foreground mt-8">
          Em caso de dúvidas, entre em contato com o CD.
        </footer>
      </div>
    </div>
  );
}
