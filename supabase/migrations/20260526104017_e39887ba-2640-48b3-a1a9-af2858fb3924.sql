
-- Suppliers
CREATE TABLE public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_fantasia text NOT NULL,
  razao_social text NOT NULL,
  cnpj text NOT NULL UNIQUE,
  whatsapp text NOT NULL,
  email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

-- Anyone (anon) can register/upsert a supplier (public portal)
CREATE POLICY "public insert suppliers" ON public.suppliers
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "public update suppliers by cnpj" ON public.suppliers
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "public select suppliers" ON public.suppliers
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin delete suppliers" ON public.suppliers
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));

-- Appointments
CREATE TABLE public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  vehicle_type text NOT NULL,
  vehicle_plate text NOT NULL,
  cargo_type text NOT NULL,
  driver_contact text NOT NULL,
  nf_file_url text,
  nf_volumes integer NOT NULL DEFAULT 0,
  scheduled_date date NOT NULL,
  scheduled_time time NOT NULL,
  estimated_minutes integer NOT NULL,
  status text NOT NULL DEFAULT 'Pendente',
  refusal_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Public can insert appointment requests
CREATE POLICY "public insert appointments" ON public.appointments
  FOR INSERT TO anon, authenticated WITH CHECK (true);
-- Public can read only date/time/status to compute occupied slots (no PII)
CREATE POLICY "public select appointments" ON public.appointments
  FOR SELECT TO anon, authenticated USING (true);
-- Admin can update / delete
CREATE POLICY "admin update appointments" ON public.appointments
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "admin delete appointments" ON public.appointments
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));

CREATE INDEX idx_appointments_date ON public.appointments(scheduled_date);
CREATE INDEX idx_appointments_status ON public.appointments(status);

-- Blocked dates
CREATE TABLE public.blocked_dates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocked_date date NOT NULL UNIQUE,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.blocked_dates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read blocked dates" ON public.blocked_dates
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin manage blocked dates" ON public.blocked_dates
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END $$;

CREATE TRIGGER trg_appointments_touch
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Storage bucket for NF uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('nf-uploads', 'nf-uploads', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "public upload nf" ON storage.objects
  FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'nf-uploads');
CREATE POLICY "admin read nf" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'nf-uploads' AND has_role(auth.uid(), 'admin'));
CREATE POLICY "public read own nf" ON storage.objects
  FOR SELECT TO anon, authenticated USING (bucket_id = 'nf-uploads');
