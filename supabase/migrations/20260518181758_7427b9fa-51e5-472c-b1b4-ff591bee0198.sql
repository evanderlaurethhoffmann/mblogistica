
CREATE TABLE public.branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.checkers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.loads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
  checker_id UUID NOT NULL REFERENCES public.checkers(id) ON DELETE RESTRICT,
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'Em aberto',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ
);

CREATE TABLE public.volumes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  load_id UUID NOT NULL REFERENCES public.loads(id) ON DELETE CASCADE,
  barcode TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_loads_status ON public.loads(status);
CREATE INDEX idx_volumes_load ON public.volumes(load_id);

ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.volumes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public all branches" ON public.branches FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public all checkers" ON public.checkers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public all drivers" ON public.drivers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public all loads" ON public.loads FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public all volumes" ON public.volumes FOR ALL USING (true) WITH CHECK (true);
