import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const PayloadSchema = z.object({
  loadId: z.string().uuid(),
  date: z.string().min(1).max(64),
  branch: z.string().min(1).max(255),
  checker: z.string().min(1).max(255),
  driver: z.string().min(1).max(255),
  volumes: z.array(z.string().min(1).max(255)).max(5000),
});

export const sendCloseWebhook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => PayloadSchema.parse(input))
  .handler(async ({ data }) => {
    // Read webhook URL from app_settings (admin-only via RLS, so use admin client)
    const { data: setting } = await supabaseAdmin
      .from("app_settings")
      .select("value")
      .eq("key", "google_sheets_webhook_url")
      .maybeSingle();

    const url = setting?.value?.trim();
    if (!url) {
      return { ok: false, skipped: true, reason: "Webhook URL not configured" };
    }

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return { ok: res.ok, status: res.status };
    } catch (e: any) {
      return { ok: false, error: String(e?.message ?? e) };
    }
  });
