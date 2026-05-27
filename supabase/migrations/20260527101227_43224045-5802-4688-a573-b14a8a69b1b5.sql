-- EXTEND appointments
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS protocol TEXT,
  ADD COLUMN IF NOT EXISTS dock_id UUID,
  ADD COLUMN IF NOT EXISTS nf_number TEXT,
  ADD COLUMN IF NOT EXISTS nf_access_key TEXT,
  ADD COLUMN IF NOT EXISTS nf_status TEXT NOT NULL DEFAULT 'Pendente',
  ADD COLUMN IF NOT EXISTS palette_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS disposition TEXT,
  ADD COLUMN IF NOT EXISTS driver_name TEXT,
  ADD COLUMN IF NOT EXISTS carrier_name TEXT,
  ADD COLUMN IF NOT EXISTS observations TEXT,
  ADD COLUMN IF NOT EXISTS refusal_reason_id UUID;

CREATE UNIQUE INDEX IF NOT EXISTS appointments_protocol_uidx ON public.appointments(protocol) WHERE protocol IS NOT NULL;

ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.branches  ADD COLUMN IF NOT EXISTS cnpj TEXT;

-- docks
CREATE TABLE IF NOT EXISTS public.docks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'Ativa',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.docks TO authenticated;
GRANT ALL ON public.docks TO service_role;
ALTER TABLE public.docks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read docks" ON public.docks FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin write docks" ON public.docks FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "admin update docks" ON public.docks FOR UPDATE TO authenticated USING (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "admin delete docks" ON public.docks FOR DELETE TO authenticated USING (has_role(auth.uid(),'admin'::app_role));
INSERT INTO public.docks (name) VALUES ('Doca 01'),('Doca 02'),('Doca 03'),('Doca 04') ON CONFLICT (name) DO NOTHING;

-- work_hours
CREATE TABLE IF NOT EXISTS public.work_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  weekday SMALLINT NOT NULL UNIQUE CHECK (weekday BETWEEN 0 AND 6),
  enabled BOOLEAN NOT NULL DEFAULT true,
  start_time TIME NOT NULL DEFAULT '08:00',
  end_time   TIME NOT NULL DEFAULT '17:00',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.work_hours TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_hours TO authenticated;
GRANT ALL ON public.work_hours TO service_role;
ALTER TABLE public.work_hours ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read work hours" ON public.work_hours FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin manage work hours" ON public.work_hours FOR ALL TO authenticated USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
INSERT INTO public.work_hours (weekday, enabled, start_time, end_time) VALUES
  (0,false,'08:00','17:00'),(1,true,'08:00','17:00'),(2,true,'08:00','17:00'),
  (3,true,'08:00','17:00'),(4,true,'08:00','17:00'),(5,true,'08:00','17:00'),
  (6,true,'08:00','12:00') ON CONFLICT (weekday) DO NOTHING;

-- refusal_reasons
CREATE TABLE IF NOT EXISTS public.refusal_reasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL UNIQUE,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.refusal_reasons TO authenticated;
GRANT ALL ON public.refusal_reasons TO service_role;
ALTER TABLE public.refusal_reasons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read refusal reasons" ON public.refusal_reasons FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin manage refusal reasons" ON public.refusal_reasons FOR ALL TO authenticated USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
INSERT INTO public.refusal_reasons (label) VALUES
  ('XML com divergência'),('Falta de espaço físico no CD'),('Horário limite estourado'),('Documentação incompleta')
ON CONFLICT (label) DO NOTHING;

-- fixed_schedules
CREATE TABLE IF NOT EXISTS public.fixed_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL,
  dock_id UUID NOT NULL,
  weekday SMALLINT NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  scheduled_time TIME NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (weekday, scheduled_time, dock_id)
);
GRANT SELECT ON public.fixed_schedules TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fixed_schedules TO authenticated;
GRANT ALL ON public.fixed_schedules TO service_role;
ALTER TABLE public.fixed_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read fixed schedules" ON public.fixed_schedules FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin manage fixed schedules" ON public.fixed_schedules FOR ALL TO authenticated USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));

-- dock_blocks
CREATE TABLE IF NOT EXISTS public.dock_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dock_id UUID NOT NULL,
  blocked_date DATE NOT NULL,
  blocked_time TIME NOT NULL,
  kind TEXT NOT NULL DEFAULT 'block',
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (dock_id, blocked_date, blocked_time)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dock_blocks TO authenticated;
GRANT ALL ON public.dock_blocks TO service_role;
ALTER TABLE public.dock_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read dock blocks" ON public.dock_blocks FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin manage dock blocks" ON public.dock_blocks FOR ALL TO authenticated USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));

-- protocol trigger
CREATE OR REPLACE FUNCTION public.gen_appointment_protocol()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_date TEXT; v_seq INT;
BEGIN
  IF NEW.protocol IS NOT NULL THEN RETURN NEW; END IF;
  v_date := to_char(now() AT TIME ZONE 'America/Sao_Paulo','YYYYMMDD');
  SELECT COALESCE(MAX(SUBSTRING(protocol FROM 13)::INT),0)+1 INTO v_seq
  FROM public.appointments WHERE protocol LIKE 'AG-'||v_date||'-%';
  NEW.protocol := 'AG-'||v_date||'-'||lpad(v_seq::TEXT,4,'0');
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_gen_appointment_protocol ON public.appointments;
CREATE TRIGGER trg_gen_appointment_protocol BEFORE INSERT ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.gen_appointment_protocol();

-- Backfill protocols (CTE)
WITH numbered AS (
  SELECT id,
         'AG-'||to_char(created_at AT TIME ZONE 'America/Sao_Paulo','YYYYMMDD')||'-'||
         lpad((row_number() OVER (PARTITION BY to_char(created_at AT TIME ZONE 'America/Sao_Paulo','YYYYMMDD') ORDER BY created_at))::TEXT,4,'0') AS p
  FROM public.appointments WHERE protocol IS NULL
)
UPDATE public.appointments a SET protocol = n.p FROM numbered n WHERE a.id = n.id;