ALTER TABLE public.volumes
  ADD COLUMN IF NOT EXISTS total_boxes integer,
  ADD COLUMN IF NOT EXISTS scanned_count integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS group_completed boolean NOT NULL DEFAULT false;

-- Permitir UPDATE em volumes para usuários autenticados (necessário para fracionar/incrementar)
DROP POLICY IF EXISTS "auth update volumes" ON public.volumes;
CREATE POLICY "auth update volumes"
ON public.volumes
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);