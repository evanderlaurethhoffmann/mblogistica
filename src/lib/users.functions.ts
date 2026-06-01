import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const PermsSchema = z.object({
  acesso_yms: z.boolean(),
  acesso_wms: z.boolean(),
  acesso_tms: z.boolean(),
  acesso_analytics: z.boolean(),
});

const CreateSchema = z.object({
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

export const createUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => CreateSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);

    // Admins get full access regardless of checkboxes
    const isAdmin = data.role === "admin";
    const perms = isAdmin
      ? { acesso_yms: true, acesso_wms: true, acesso_tms: true, acesso_analytics: true }
      : {
          acesso_yms: data.acesso_yms,
          acesso_wms: data.acesso_wms,
          acesso_tms: data.acesso_tms,
          acesso_analytics: data.acesso_analytics,
        };

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        name: data.name,
        role: data.role,
        category: isAdmin ? "Administrador" : data.category,
        ...perms,
      },
    });
    if (error) throw new Error(error.message);
    const uid = created.user!.id;

    await supabaseAdmin.from("user_roles").delete().eq("user_id", uid);
    await supabaseAdmin.from("user_roles").insert({ user_id: uid, role: data.role });

    // Ensure profile reflects the desired permissions (trigger may have used defaults)
    await supabaseAdmin.from("profiles").update({
      name: data.name,
      category: isAdmin ? "Administrador" : data.category,
      ...perms,
    }).eq("id", uid);

    return { id: uid };
  });

export const updateUserAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => UpdateSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const isAdmin = data.role === "admin";
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
      category: isAdmin ? "Administrador" : data.category,
      ...perms,
    }).eq("id", data.userId);
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
