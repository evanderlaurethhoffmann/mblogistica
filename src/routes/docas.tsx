import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { LayoutGrid, ChevronLeft, ChevronRight, Lock, Unlock } from "lucide-react";
import { AppointmentDetailsDialog } from "@/components/AppointmentDetailsDialog";

const sb = supabase as any;

export const Route = createFileRoute("/docas")({
  head: () => ({ meta: [{ title: "Painel de Ocupação de Docas" }] }),
  component: DocasPage,
});

function ymd(d: Date) {
  const y = d.getFullYear(); const m = String(d.getMonth() + 1).padStart(2, "0"); const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${da}`;
}
function timesBetween(start: string, end: string): string[] {
  const [sh] = start.split(":").map(Number);
  const [eh] = end.split(":").map(Number);
  const out: string[] = [];
  for (let h = sh; h < eh; h++) out.push(`${String(h).padStart(2, "0")}:00`);
  return out;
}

function DocasPage() {
  const qc = useQueryClient();
  const { isAdmin } = useAuth();
  const [date, setDate] = useState<Date>(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; });
  const [openApptId, setOpenApptId] = useState<string | null>(null);

  const dateStr = ymd(date);
  const weekday = date.getDay();

  const { data: docks = [] } = useQuery({
    queryKey: ["docks-active"],
    queryFn: async () => {
      const { data, error } = await sb.from("docks").select("*").eq("status", "Ativa").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: workHour } = useQuery({
    queryKey: ["work-hour", weekday],
    queryFn: async () => {
      const { data, error } = await sb.from("work_hours").select("*").eq("weekday", weekday).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: appts = [] } = useQuery({
    queryKey: ["dock-grid", "appts", dateStr],
    queryFn: async () => {
      const { data, error } = await sb.from("appointments")
        .select("id, scheduled_time, dock_id, status, suppliers(nome_fantasia)")
        .eq("scheduled_date", dateStr).eq("status", "Confirmado");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: blocks = [] } = useQuery({
    queryKey: ["dock-grid", "blocks", dateStr],
    queryFn: async () => {
      const { data, error } = await sb.from("dock_blocks").select("*").eq("blocked_date", dateStr);
      if (error) throw error;
      return data ?? [];
    },
  });

  const hours = useMemo(() => {
    if (!workHour?.enabled) return [];
    return timesBetween(workHour.start_time as string, workHour.end_time as string);
  }, [workHour]);

  const cellMap = useMemo(() => {
    const m = new Map<string, any>();
    appts.forEach((a: any) => {
      const t = (a.scheduled_time as string).slice(0, 5);
      m.set(`${a.dock_id}|${t}`, { type: "appt", data: a });
    });
    blocks.forEach((b: any) => {
      const t = (b.blocked_time as string).slice(0, 5);
      const key = `${b.dock_id}|${t}`;
      if (!m.has(key)) m.set(key, { type: "block", data: b });
    });
    return m;
  }, [appts, blocks]);

  const addBlock = useMutation({
    mutationFn: async ({ dockId, time, kind, reason }: any) => {
      const { error } = await sb.from("dock_blocks").insert({
        dock_id: dockId, blocked_date: dateStr, blocked_time: time, kind, reason: reason || null,
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["dock-grid"] }); toast.success("Horário atualizado."); },
    onError: (e: Error) => toast.error(e.message),
  });
  const removeBlock = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from("dock_blocks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["dock-grid"] }); toast.success("Horário liberado."); },
    onError: (e: Error) => toast.error(e.message),
  });

  const shiftDay = (delta: number) => {
    const d = new Date(date); d.setDate(d.getDate() + delta); setDate(d);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><LayoutGrid className="h-6 w-6" /> Painel de Ocupação de Docas</h1>
        <p className="text-sm text-muted-foreground">Linha do tempo visual de cargas confirmadas por doca.</p>
      </div>

      <Card className="p-4 flex flex-wrap items-end gap-3">
        <Button size="icon" variant="outline" onClick={() => shiftDay(-1)}><ChevronLeft className="h-4 w-4" /></Button>
        <div className="space-y-1">
          <Label>Data</Label>
          <Input type="date" value={dateStr} onChange={(e) => { const [y,m,d] = e.target.value.split("-").map(Number); setDate(new Date(y, m-1, d)); }} className="w-44" />
        </div>
        <Button size="icon" variant="outline" onClick={() => shiftDay(1)}><ChevronRight className="h-4 w-4" /></Button>
        <div className="ml-auto text-sm text-muted-foreground">
          {date.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
        </div>
      </Card>

      <Card className="p-4 overflow-x-auto">
        {!workHour?.enabled ? (
          <p className="text-sm text-muted-foreground text-center py-8">Recebimento fechado neste dia da semana.</p>
        ) : docks.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhuma doca ativa cadastrada.</p>
        ) : (
          <div className="min-w-fit">
            <div className="grid gap-1" style={{ gridTemplateColumns: `120px repeat(${hours.length}, minmax(110px, 1fr))` }}>
              <div></div>
              {hours.map((h) => (
                <div key={h} className="text-xs font-semibold text-center text-muted-foreground py-1">{h}</div>
              ))}
              {docks.map((d: any) => (
                <FragmentRow key={d.id} dock={d} hours={hours} cellMap={cellMap} isAdmin={isAdmin}
                  onOpenAppt={setOpenApptId}
                  onBlock={(time, kind, reason) => addBlock.mutate({ dockId: d.id, time, kind, reason })}
                  onRelease={(id) => removeBlock.mutate(id)} />
              ))}
            </div>
            <div className="flex gap-4 mt-4 text-xs">
              <Legend color="bg-blue-500/20 border-blue-500/50" label="Ocupado" />
              <Legend color="bg-muted border-border" label="Disponível" />
              <Legend color="bg-zinc-300 dark:bg-zinc-700 border-zinc-400" label="Bloqueado" striped />
              <Legend color="bg-violet-500/20 border-violet-500/50" label="Reserva interna" />
            </div>
          </div>
        )}
      </Card>

      <AppointmentDetailsDialog appointmentId={openApptId} open={!!openApptId} onOpenChange={(v) => !v && setOpenApptId(null)} />
    </div>
  );
}

function Legend({ color, label, striped }: { color: string; label: string; striped?: boolean }) {
  return (
    <div className="flex items-center gap-1">
      <div className={`w-4 h-4 rounded border ${color} ${striped ? "bg-[repeating-linear-gradient(45deg,transparent,transparent_3px,rgba(0,0,0,.15)_3px,rgba(0,0,0,.15)_6px)]" : ""}`} />
      <span>{label}</span>
    </div>
  );
}

function FragmentRow({ dock, hours, cellMap, isAdmin, onOpenAppt, onBlock, onRelease }: any) {
  return (
    <>
      <div className="text-sm font-medium py-2 pr-2 border-r flex items-center">{dock.name}</div>
      {hours.map((t: string) => {
        const cell = cellMap.get(`${dock.id}|${t}`);
        if (cell?.type === "appt") {
          return (
            <button key={t} onClick={() => onOpenAppt(cell.data.id)}
              className="bg-blue-500/20 border border-blue-500/50 rounded p-1 text-xs text-left hover:bg-blue-500/30 transition-colors min-h-[48px]">
              <div className="font-medium truncate">{cell.data.suppliers?.nome_fantasia ?? "Agendamento"}</div>
              <div className="text-[10px] text-muted-foreground">Confirmado</div>
            </button>
          );
        }
        if (cell?.type === "block") {
          const isReserve = cell.data.kind === "reserve";
          return (
            <BlockCell key={t} block={cell.data} isReserve={isReserve} isAdmin={isAdmin}
              onRelease={() => onRelease(cell.data.id)} />
          );
        }
        return <FreeCell key={t} time={t} isAdmin={isAdmin} onBlock={onBlock} />;
      })}
    </>
  );
}

function BlockCell({ block, isReserve, isAdmin, onRelease }: any) {
  const base = isReserve
    ? "bg-violet-500/20 border-violet-500/50"
    : "bg-zinc-300 dark:bg-zinc-700 border-zinc-400 bg-[repeating-linear-gradient(45deg,transparent,transparent_3px,rgba(0,0,0,.15)_3px,rgba(0,0,0,.15)_6px)]";
  const content = (
    <div className={`rounded border p-1 text-xs min-h-[48px] ${base} ${isAdmin ? "cursor-pointer" : ""}`}>
      <div className="font-medium uppercase text-[10px]">{isReserve ? "RESERVA" : "BLOQUEADO"}</div>
      {block.reason && <div className="text-[10px] truncate">{block.reason}</div>}
    </div>
  );
  if (!isAdmin) return content;
  return (
    <Popover>
      <PopoverTrigger asChild><div>{content}</div></PopoverTrigger>
      <PopoverContent className="w-64">
        <div className="space-y-2">
          <div className="text-sm font-medium">{isReserve ? "Reserva interna" : "Horário bloqueado"}</div>
          {block.reason && <div className="text-xs text-muted-foreground">{block.reason}</div>}
          <Button size="sm" variant="outline" className="w-full gap-1" onClick={onRelease}>
            <Unlock className="h-3 w-3" /> Desbloquear / Liberar
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function FreeCell({ time, isAdmin, onBlock }: any) {
  const [reason, setReason] = useState("");
  const cell = (
    <div className="bg-muted/40 border border-dashed border-border rounded p-1 text-xs min-h-[48px] flex items-center justify-center text-muted-foreground hover:bg-muted/70 transition-colors cursor-pointer">
      Livre
    </div>
  );
  if (!isAdmin) return cell;
  return (
    <Popover>
      <PopoverTrigger asChild><div>{cell}</div></PopoverTrigger>
      <PopoverContent className="w-64 space-y-3">
        <div className="text-sm font-medium">Horário {time}</div>
        <Button size="sm" variant="outline" className="w-full gap-1" onClick={() => onBlock(time, "block", "Bloqueio interno")}>
          <Lock className="h-3 w-3" /> Bloquear Horário
        </Button>
        <div className="space-y-1 border-t pt-2">
          <Label className="text-xs">Reserva interna (motivo)</Label>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex: devolução de filial" className="h-8" />
          <Button size="sm" className="w-full" disabled={!reason.trim()} onClick={() => { onBlock(time, "reserve", reason.trim()); setReason(""); }}>
            Reservar Internamente
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
