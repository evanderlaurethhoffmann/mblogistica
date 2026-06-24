import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { createSupplierAppointment } from "@/lib/supplier-auth.functions";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, CheckCircle2, Package2, CalendarCheck } from "lucide-react";

const SLOTS = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"];

const ymd = (d: Date) => {
  const y = d.getFullYear(); const m = String(d.getMonth() + 1).padStart(2, "0"); const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${da}`;
};

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  token: string;
  supplierId: string;
  onCreated?: () => void;
};

export function SupplierAppointmentDialog({ open, onOpenChange, token, supplierId, onCreated }: Props) {
  const createFn = useServerFn(createSupplierAppointment);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [protocolo, setProtocolo] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [cargo, setCargo] = useState({
    vehicle_type: "", vehicle_plate: "", cargo_type: "", driver_contact: "",
    nf_volumes: 0, nf_file_url: "" as string,
  });
  const [nfFile, setNfFile] = useState<File | null>(null);
  const [schedule, setSchedule] = useState({
    date: undefined as Date | undefined, time: "", estimated_minutes: 60,
  });

  useEffect(() => {
    if (!open) {
      setStep(1); setProtocolo("");
      setCargo({ vehicle_type: "", vehicle_plate: "", cargo_type: "", driver_contact: "", nf_volumes: 0, nf_file_url: "" });
      setNfFile(null); setSchedule({ date: undefined, time: "", estimated_minutes: 60 });
    }
  }, [open]);

  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);
  const maxDate = useMemo(() => { const d = new Date(today); d.setDate(d.getDate() + 15); return d; }, [today]);

  const [blocked, setBlocked] = useState<string[]>([]);
  const [confirmedSlots, setConfirmedSlots] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (step !== 2) return;
    (async () => {
      const fromStr = ymd(today); const toStr = ymd(maxDate);
      const [{ data: bd }, { data: ap }] = await Promise.all([
        supabase.from("blocked_dates").select("blocked_date").gte("blocked_date", fromStr).lte("blocked_date", toStr),
        supabase.from("appointments").select("scheduled_date, scheduled_time, status")
          .gte("scheduled_date", fromStr).lte("scheduled_date", toStr).in("status", ["Pendente", "Confirmado"]),
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
    return (confirmedSlots[s]?.length ?? 0) >= SLOTS.length;
  };

  const submitCargo = async () => {
    if (!cargo.vehicle_type || !cargo.vehicle_plate || !cargo.cargo_type || !cargo.driver_contact) {
      toast.error("Preencha todos os campos obrigatórios."); return;
    }
    if (!cargo.nf_volumes || cargo.nf_volumes <= 0) { toast.error("Informe a quantidade de volumes."); return; }
    if (!nfFile) {
      toast.error("Anexar a Nota Fiscal (XML, PDF ou Imagem) é OBRIGATÓRIO para prosseguir.");
      return;
    }
    const ext = nfFile.name.split(".").pop()?.toLowerCase() ?? "bin";
    const allowed = ["xml", "pdf", "jpg", "jpeg", "png", "webp"];
    if (!allowed.includes(ext)) { toast.error("Arquivo da NF deve ser XML, PDF ou imagem (JPG, PNG, WEBP)."); return; }
    const path = `${supplierId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const contentType = ext === "pdf" ? "application/pdf" : ext === "xml" ? "application/xml" : ext === "webp" ? "image/webp" : "image/jpeg";
    const { error } = await supabase.storage.from("nf-uploads").upload(path, nfFile, { contentType });
    if (error) { toast.error(error.message); return; }
    setCargo((c) => ({ ...c, nf_file_url: path }));
    setStep(2);
  };

  const submitSchedule = async () => {
    if (!schedule.date || !schedule.time) { toast.error("Selecione data e horário."); return; }
    if (!schedule.estimated_minutes || schedule.estimated_minutes <= 0) { toast.error("Informe o tempo estimado."); return; }
    setSubmitting(true);
    try {
      const res = await createFn({ data: {
        token,
        vehicle_type: cargo.vehicle_type,
        vehicle_plate: cargo.vehicle_plate,
        cargo_type: cargo.cargo_type,
        driver_contact: cargo.driver_contact,
        nf_volumes: cargo.nf_volumes,
        nf_file_url: cargo.nf_file_url || null,
        scheduled_date: ymd(schedule.date),
        scheduled_time: schedule.time,
        estimated_minutes: schedule.estimated_minutes,
      } });
      const r: any = res;
      setProtocolo(r?.protocol ?? r?.id?.slice(0, 8).toUpperCase() ?? "");

      setStep(3);
      onCreated?.();
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao enviar solicitação.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step === 1 && <><Package2 className="h-5 w-5" /> Informações da Carga</>}
            {step === 2 && <><CalendarCheck className="h-5 w-5" /> Data e Horário</>}
            {step === 3 && <><CheckCircle2 className="h-5 w-5 text-primary" /> Solicitação Enviada</>}
          </DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4">
            <div className="rounded-md border-2 border-destructive/60 bg-destructive/10 p-3 text-sm font-semibold text-destructive">
              ⚠️ ATENÇÃO: O envio da Nota Fiscal (XML, PDF ou Imagem) é OBRIGATÓRIO. Sem o anexo da NF a solicitação NÃO será aceita.
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Tipo de Veículo *</Label>
                <Select value={cargo.vehicle_type} onValueChange={(v) => setCargo({ ...cargo, vehicle_type: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
                  <SelectContent>{["Van", "Toco", "Truck", "Carreta", "Bitrem", "Outro"].map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Placa *</Label>
                <Input value={cargo.vehicle_plate} onChange={(e) => setCargo({ ...cargo, vehicle_plate: e.target.value })} placeholder="ABC1D23" />
              </div>
              <div className="space-y-1">
                <Label>Tipo de Carga *</Label>
                <Select value={cargo.cargo_type} onValueChange={(v) => setCargo({ ...cargo, cargo_type: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
                  <SelectContent>{["Paletizada", "Batida", "Química", "Refrigerada", "Granel", "Outro"].map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Contato do Motorista *</Label>
                <Input value={cargo.driver_contact} onChange={(e) => setCargo({ ...cargo, driver_contact: e.target.value })} placeholder="(00) 00000-0000" />
              </div>
              <div className="space-y-1">
                <Label className="text-destructive font-semibold">NF (XML, PDF ou Imagem) * — OBRIGATÓRIO</Label>
                <Input type="file" accept=".xml,.pdf,.jpg,.jpeg,.png,.webp" required onChange={(e) => setNfFile(e.target.files?.[0] ?? null)} className={nfFile ? "" : "border-destructive"} />
                {nfFile ? (
                  <p className="text-xs text-green-600">✓ Arquivo selecionado: {nfFile.name}</p>
                ) : (
                  <p className="text-xs text-destructive">Anexe a Nota Fiscal (XML, PDF ou foto) para conseguir avançar.</p>
                )}
              </div>
              <div className="space-y-1">
                <Label>Quantidade de Volumes *</Label>
                <Input type="number" min={1} value={cargo.nf_volumes || ""} onChange={(e) => setCargo({ ...cargo, nf_volumes: Number(e.target.value) })} />
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={submitCargo} className="gap-1">Avançar <ArrowRight className="h-4 w-4" /></Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="flex justify-center">
                <Calendar
                  mode="single"
                  selected={schedule.date}
                  onSelect={(d) => setSchedule({ ...schedule, date: d ?? undefined, time: "" })}
                  disabled={disabledDays}
                  fromDate={today} toDate={maxDate}
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
                          <Button key={s} type="button" size="sm"
                            variant={schedule.time === s ? "default" : "outline"}
                            disabled={taken}
                            onClick={() => setSchedule({ ...schedule, time: s })}>
                            {s}{taken ? " 🚫" : ""}
                          </Button>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <Label>Tempo estimado para descarga (min) *</Label>
                  <Input type="number" min={15} step={15} value={schedule.estimated_minutes || ""}
                    onChange={(e) => setSchedule({ ...schedule, estimated_minutes: Number(e.target.value) })} />
                </div>
              </div>
            </div>
            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep(1)} className="gap-1"><ArrowLeft className="h-4 w-4" /> Voltar</Button>
              <Button onClick={submitSchedule} disabled={submitting} className="gap-1">
                Enviar Solicitação <CheckCircle2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="text-center space-y-4 py-4">
            <CheckCircle2 className="h-16 w-16 text-primary mx-auto" />
            <h3 className="text-xl font-bold">Solicitação enviada!</h3>
            <p className="text-muted-foreground">Sua solicitação está <strong>pendente</strong> de aprovação.</p>
            <div className="inline-block bg-secondary px-6 py-3 rounded-lg">
              <div className="text-xs text-muted-foreground">Protocolo</div>
              <div className="text-2xl font-mono font-bold">{protocolo}</div>
            </div>
            <div className="pt-2">
              <Button onClick={() => onOpenChange(false)}>Fechar</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
