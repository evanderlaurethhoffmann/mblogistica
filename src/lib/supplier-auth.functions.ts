import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const sb = () => supabaseAdmin as any;

const cnpjDigits = (s: string) => s.replace(/\D/g, "");

const RegisterSchema = z.object({
  cnpj: z.string().min(14).max(20),
  nome_fantasia: z.string().min(2).max(255),
  razao_social: z.string().min(2).max(255),
  whatsapp: z.string().min(8).max(20),
  email: z.string().email().max(255),
  password: z.string().min(6).max(128),
});

const LoginSchema = z.object({
  cnpj: z.string().min(14).max(20),
  password: z.string().min(1).max(128),
});

const TokenSchema = z.object({ token: z.string().min(10).max(128) });

const SESSION_DAYS = 30;

async function createSession(supplier_id: string) {
  const token = crypto.randomUUID() + crypto.randomUUID().replace(/-/g, "");
  const expires_at = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { error } = await sb().from("supplier_sessions").insert({ token, supplier_id, expires_at });
  if (error) throw new Error(error.message);
  return { token, expires_at };
}

async function getSupplierFromToken(token: string) {
  const { data, error } = await sb()
    .from("supplier_sessions")
    .select("supplier_id, expires_at")
    .eq("token", token)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Sessão inválida.");
  if (new Date(data.expires_at) < new Date()) {
    await sb().from("supplier_sessions").delete().eq("token", token);
    throw new Error("Sessão expirada.");
  }
  const { data: supplier } = await sb()
    .from("suppliers")
    .select("id, nome_fantasia, razao_social, cnpj, whatsapp, email")
    .eq("id", data.supplier_id)
    .maybeSingle();
  if (!supplier) throw new Error("Fornecedor não encontrado.");
  return supplier;
}

export const registerSupplier = createServerFn({ method: "POST" })
  .inputValidator((i) => RegisterSchema.parse(i))
  .handler(async ({ data }) => {
    const cnpj = cnpjDigits(data.cnpj);
    if (cnpj.length !== 14) throw new Error("CNPJ inválido.");

    // Reject if account already exists
    const { data: existingAcct } = await sb()
      .from("supplier_accounts").select("id").eq("cnpj", cnpj).maybeSingle();
    if (existingAcct) throw new Error("Já existe uma conta para este CNPJ. Faça login.");

    // upsert supplier
    let supplier_id: string;
    const { data: existingSupplier } = await sb()
      .from("suppliers").select("id").eq("cnpj", cnpj).maybeSingle();
    if (existingSupplier) {
      supplier_id = existingSupplier.id;
      await sb().from("suppliers").update({
        nome_fantasia: data.nome_fantasia,
        razao_social: data.razao_social,
        whatsapp: data.whatsapp,
        email: data.email,
      }).eq("id", supplier_id);
    } else {
      const { data: created, error } = await sb().from("suppliers").insert({
        cnpj, nome_fantasia: data.nome_fantasia, razao_social: data.razao_social,
        whatsapp: data.whatsapp, email: data.email,
      }).select("id").single();
      if (error) throw new Error(error.message);
      supplier_id = created.id;
    }

    const { data: hashRow, error: hashErr } = await sb().rpc("crypt_password", { p: data.password }).single();
    if (hashErr) throw new Error("Falha ao gerar hash da senha.");
    const password_hash = (hashRow as any).hash as string;

    const { error: acctErr } = await sb().from("supplier_accounts").insert({
      supplier_id, cnpj, password_hash,
    });
    if (acctErr) throw new Error(acctErr.message);

    const { token } = await createSession(supplier_id);
    return { token, supplier_id, nome_fantasia: data.nome_fantasia };
  });

export const loginSupplier = createServerFn({ method: "POST" })
  .inputValidator((i) => LoginSchema.parse(i))
  .handler(async ({ data }) => {
    const cnpj = cnpjDigits(data.cnpj);
    const { data: acct } = await sb()
      .from("supplier_accounts").select("supplier_id, password_hash").eq("cnpj", cnpj).maybeSingle();
    if (!acct) throw new Error("CNPJ ou senha inválidos.");

    const { data: check, error: chkErr } = await sb()
      .rpc("verify_supplier_password", { p: data.password, h: acct.password_hash }).single();
    if (chkErr) throw new Error("Falha ao verificar senha.");
    if (!(check as any).ok) throw new Error("CNPJ ou senha inválidos.");

    const { data: supplier } = await sb()
      .from("suppliers").select("nome_fantasia").eq("id", acct.supplier_id).maybeSingle();
    const { token } = await createSession(acct.supplier_id);
    return { token, supplier_id: acct.supplier_id, nome_fantasia: supplier?.nome_fantasia ?? "" };
  });

export const logoutSupplier = createServerFn({ method: "POST" })
  .inputValidator((i) => TokenSchema.parse(i))
  .handler(async ({ data }) => {
    await sb().from("supplier_sessions").delete().eq("token", data.token);
    return { ok: true };
  });

export const getSupplierSession = createServerFn({ method: "POST" })
  .inputValidator((i) => TokenSchema.parse(i))
  .handler(async ({ data }) => {
    const s = await getSupplierFromToken(data.token);
    return { supplier_id: s.id, nome_fantasia: s.nome_fantasia, cnpj: s.cnpj, email: s.email };
  });

export const getSupplierAppointments = createServerFn({ method: "POST" })
  .inputValidator((i) => TokenSchema.parse(i))
  .handler(async ({ data }) => {
    const s = await getSupplierFromToken(data.token);
    const { data: rows, error } = await sb()
      .from("appointments")
      .select("id, protocol, scheduled_date, scheduled_time, vehicle_plate, nf_volumes, status, refusal_reason, created_at")
      .eq("supplier_id", s.id)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return { appointments: rows ?? [] };
  });

const NewApptSchema = z.object({
  token: z.string().min(10).max(128),
  vehicle_type: z.string().min(1).max(50),
  vehicle_plate: z.string().min(5).max(10),
  cargo_type: z.string().min(1).max(50),
  driver_contact: z.string().min(5).max(30),
  nf_volumes: z.number().int().min(1).max(99999),
  nf_file_url: z.string().max(500).optional().nullable(),
  scheduled_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  scheduled_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
  estimated_minutes: z.number().int().min(15).max(600),
});

export const createSupplierAppointment = createServerFn({ method: "POST" })
  .inputValidator((i) => NewApptSchema.parse(i))
  .handler(async ({ data }) => {
    // Bloqueio total: novas solicitações migraram para logistica.mbfarmacias.com.br
    throw new Error("As solicitações de agendamento foram migradas para https://logistica.mbfarmacias.com.br. Acesse o novo portal para solicitar horários.");
    // eslint-disable-next-line @typescript-eslint/no-unreachable
    const s = await getSupplierFromToken(data.token);

    // Bloqueio de slot: impede solicitar horário já reservado (Pendente ou Confirmado).
    const { data: conflict, error: conflictErr } = await sb()
      .from("appointments")
      .select("id")
      .eq("scheduled_date", data.scheduled_date)
      .eq("scheduled_time", data.scheduled_time)
      .in("status", ["Pendente", "Confirmado"])
      .limit(1);
    if (conflictErr) throw new Error(conflictErr.message);
    if (conflict && conflict.length > 0) {
      throw new Error("Este horário acabou de ser reservado por outro fornecedor. Escolha outro horário.");
    }
    const { data: row, error } = await sb().from("appointments").insert({
      supplier_id: s.id,
      vehicle_type: data.vehicle_type,
      vehicle_plate: data.vehicle_plate.toUpperCase().trim(),
      cargo_type: data.cargo_type,
      driver_contact: data.driver_contact,
      nf_volumes: data.nf_volumes,
      nf_file_url: data.nf_file_url ?? null,
      scheduled_date: data.scheduled_date,
      scheduled_time: data.scheduled_time,
      estimated_minutes: data.estimated_minutes,
      status: "Pendente",
    }).select("id, protocol").single();
    if (error) throw new Error(error.message);
    return { id: row.id, protocol: row.protocol };
  });

// ---- Admin ----
const AdminResetSchema = z.object({
  supplier_id: z.string().uuid(),
  newPassword: z.string().min(6).max(128),
});

async function assertAdmin(userId: string) {
  const { data } = await sb()
    .from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (!data) throw new Error("Acesso negado.");
}

export const adminResetSupplierPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => AdminResetSchema.parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: hashRow, error: hashErr } = await sb()
      .rpc("crypt_password", { p: data.newPassword }).single();
    if (hashErr) throw new Error("Falha ao gerar hash.");
    const password_hash = (hashRow as any).hash as string;
    const { data: existing } = await sb()
      .from("supplier_accounts").select("id").eq("supplier_id", data.supplier_id).maybeSingle();
    if (existing) {
      const { error } = await sb().from("supplier_accounts")
        .update({ password_hash, updated_at: new Date().toISOString() })
        .eq("supplier_id", data.supplier_id);
      if (error) throw new Error(error.message);
    } else {
      const { data: supplier } = await sb().from("suppliers").select("cnpj").eq("id", data.supplier_id).maybeSingle();
      if (!supplier) throw new Error("Fornecedor não encontrado.");
      const { error } = await sb().from("supplier_accounts").insert({
        supplier_id: data.supplier_id, cnpj: supplier.cnpj, password_hash,
      });
      if (error) throw new Error(error.message);
    }
    // revoke all sessions
    await sb().from("supplier_sessions").delete().eq("supplier_id", data.supplier_id);
    return { ok: true };
  });

export const listSuppliersWithAccountStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data: suppliers } = await sb()
      .from("suppliers").select("id, nome_fantasia, cnpj, email").order("nome_fantasia");
    const { data: accts } = await sb()
      .from("supplier_accounts").select("supplier_id");
    const set = new Set((accts ?? []).map((a: any) => a.supplier_id));
    return { suppliers: (suppliers ?? []).map((s: any) => ({ ...s, has_account: set.has(s.id) })) };
  });
