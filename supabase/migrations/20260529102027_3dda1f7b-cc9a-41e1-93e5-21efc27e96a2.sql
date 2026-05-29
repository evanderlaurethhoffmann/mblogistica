
-- pgcrypto for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Supplier accounts (auth for external suppliers)
CREATE TABLE public.supplier_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL UNIQUE,
  cnpj text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.supplier_accounts TO service_role;
ALTER TABLE public.supplier_accounts ENABLE ROW LEVEL SECURITY;

-- Block all anon/authenticated direct access — only server functions via supabaseAdmin
CREATE POLICY "admin manage supplier accounts" ON public.supplier_accounts
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER supplier_accounts_touch BEFORE UPDATE ON public.supplier_accounts
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Supplier sessions (token storage)
CREATE TABLE public.supplier_sessions (
  token text PRIMARY KEY,
  supplier_id uuid NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.supplier_sessions TO service_role;
ALTER TABLE public.supplier_sessions ENABLE ROW LEVEL SECURITY;
-- No policies — only service_role (via supabaseAdmin) can access
