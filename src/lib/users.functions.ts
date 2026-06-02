import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const INTERNAL_AUTH_DOMAIN = "yaninternal.com";

const UsernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Nome de usuário deve ter ao menos 3 caracteres.")
  .max(64, "Nome de usuário muito longo.")
  .regex(/^[a-z0-9._-]+$/, "Use apenas letras, números, ponto, traço ou underline.");

const PermsSchema = z.object({
  acesso_yms: z.boolean(),
  acesso_wms: z.boolean(),
  acesso_tms: z.boolean(),
  acesso_analytics: z.boolean(),
});

const CreateSchema = z.object({
  username: UsernameSchema,
  email: z.string().email().max(255),
  password: z.string().min(6).max(128),
  name: z.string().min(1).max(255),
  role: z.enum(["admin", "operator"]),
  category: z.string().min(1).max(64),
}).merge(PermsSchema);

const UpdateSchema = z.object({
  userId: z.string().uuid(),
  category: z.string().min(1).max(64),
  role: z.enum(["admin", "operator"]),
}).merge(PermsSchema);

async function assertAdmin(userId: string) {
  const { data } = await supabaseAdmin
    .from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (!data) throw new Error("Acesso negado: apenas administradores.");
}

function categoryForRole(role: "admin" | "operator", category: string) {
  return role === "admin" ? (category === "Supervisor" ? "Supervisor" : "Administrador") : category;
}

function authEmailFromUsername(username: string) {
  return `${username}@${INTERNAL_AUTH_DOMAIN}`;
}

export const resolveInternalLogin = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ identifier: z.string().trim().min(1).max(255) }).parse(input))
  .handler(async ({ data }) => {
    const identifier = data.identifier.toLowerCase();
    if (identifier.includes("@")) return { email: identifier };

    const username = UsernameSchema.parse(identifier);
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("email")
      .ilike("username", username)
      .maybeSingle();

    return { email: (profile as { email?: string } | null)?.email ?? authEmailFromUsername(username) };
  });

export const getInternalUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);

    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (authError) throw new Error(authError.message);

    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from("profiles")
      .select("id, email, name, username, nome_completo, category, perfil_categoria, acesso_yms, acesso_wms, acesso_tms, acesso_analytics, created_at")
      .order("created_at", { ascending: false });
    if (profilesError) throw new Error(profilesError.message);

    const existingProfiles = new Map((profiles as any[]).map((p) => [p.id, p]));
    const missingProfiles = authUsers.users
      .filter((u) => !existingProfiles.has(u.id) && u.email)
      .map((u) => {
        const username = String(u.user_metadata?.username ?? u.email!.split("@")[0]).toLowerCase();
        const name = String(u.user_metadata?.nome_completo ?? u.user_metadata?.name ?? username);
        const category = String(u.user_metadata?.perfil_categoria ?? u.user_metadata?.category ?? "Conferente");
        return {
          id: u.id,
          email: u.email!,
          name,
          username,
          nome_completo: name,
          category,
          perfil_categoria: category,
          acesso_yms: !!u.user_metadata?.acesso_yms,
          acesso_wms: !!u.user_metadata?.acesso_wms,
          acesso_tms: u.user_metadata?.acesso_tms !== false,
          acesso_analytics: !!u.user_metadata?.acesso_analytics,
        };
      });

    if (missingProfiles.length > 0) {
      const { error } = await supabaseAdmin.from("profiles").upsert(missingProfiles as any, { onConflict: "id" });
      if (error) throw new Error(error.message);
    }

    const { data: refreshedProfiles } = await supabaseAdmin
      .from("profiles")
      .select("id, email, name, username, nome_completo, category, perfil_categoria, acesso_yms, acesso_wms, acesso_tms, acesso_analytics, created_at")
      .order("created_at", { ascending: false });

    const { data: roles } = await supabaseAdmin.from("user_roles").select("user_id, role");
    const roleByUser = new Map<string, "admin" | "operator">();
    (roles as any[] | null)?.forEach((r) => {
      if (r.role === "admin" || !roleByUser.has(r.user_id)) roleByUser.set(r.user_id, r.role);
    });

    return ((refreshedProfiles ?? profiles) as any[]).map((p) => ({
      ...p,
      name: p.nome_completo || p.name || p.username,
      category: p.perfil_categoria || p.category || "Conferente",
      role: roleByUser.get(p.id) ?? "operator",
    }));
  });

export const createUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => CreateSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);

    const isAdmin = data.role === "admin";
    const category = categoryForRole(data.role, data.category);
    const perms = isAdmin
      ? { acesso_yms: true, acesso_wms: true, acesso_tms: true, acesso_analytics: true }
      : {
          acesso_yms: data.acesso_yms,
          acesso_wms: data.acesso_wms,
          acesso_tms: data.acesso_tms,
          acesso_analytics: data.acesso_analytics,
        };

    const { data: usernameExists } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .ilike("username", data.username)
      .maybeSingle();
    if (usernameExists) throw new Error("Nome de usuário já cadastrado.");

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        username: data.username,
        name: data.name,
        nome_completo: data.name,
        role: data.role,
        category,
        perfil_categoria: category,
        ...perms,
      },
    });
    if (error) throw new Error(error.message);
    const uid = created.user!.id;

    await supabaseAdmin.from("user_roles").delete().eq("user_id", uid);
    await supabaseAdmin.from("user_roles").insert({ user_id: uid, role: data.role });

    const { error: profileError } = await supabaseAdmin.from("profiles").upsert({
      id: uid,
      email: data.email,
      name: data.name,
      username: data.username,
      nome_completo: data.name,
      category,
      perfil_categoria: category,
      ...perms,
    } as any, { onConflict: "id" });
    if (profileError) throw new Error(profileError.message);

    return { id: uid };
  });

export const updateUserAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => UpdateSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const isAdmin = data.role === "admin";
    const category = categoryForRole(data.role, data.category);
    const perms = isAdmin
      ? { acesso_yms: true, acesso_wms: true, acesso_tms: true, acesso_analytics: true }
      : {
          acesso_yms: data.acesso_yms,
          acesso_wms: data.acesso_wms,
          acesso_tms: data.acesso_tms,
          acesso_analytics: data.acesso_analytics,
        };

    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);
    await supabaseAdmin.from("user_roles").insert({ user_id: data.userId, role: data.role });
    const { error } = await supabaseAdmin.from("profiles").update({
      category,
      perfil_categoria: category,
      ...perms,
    } as any).eq("id", data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ userId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    if (data.userId === context.userId) throw new Error("Você não pode excluir a si mesmo.");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
