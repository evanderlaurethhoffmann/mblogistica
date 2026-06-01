
-- Add module-level permissions and category to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'Conferente',
  ADD COLUMN IF NOT EXISTS acesso_yms boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS acesso_wms boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS acesso_tms boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS acesso_analytics boolean NOT NULL DEFAULT false;

-- Backfill: admins get full access
UPDATE public.profiles p
SET acesso_yms = true,
    acesso_wms = true,
    acesso_tms = true,
    acesso_analytics = true,
    category = 'Administrador'
WHERE EXISTS (
  SELECT 1 FROM public.user_roles ur
  WHERE ur.user_id = p.id AND ur.role = 'admin'
);

-- Update handle_new_user trigger to set permissions based on role
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_role app_role;
  v_has_any_admin BOOLEAN;
  v_category text;
  v_yms boolean := false;
  v_wms boolean := false;
  v_tms boolean := true;
  v_analytics boolean := false;
BEGIN
  IF NEW.raw_user_meta_data ? 'role' THEN
    v_role := (NEW.raw_user_meta_data->>'role')::app_role;
  ELSE
    SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') INTO v_has_any_admin;
    v_role := CASE WHEN v_has_any_admin THEN 'operator'::app_role ELSE 'admin'::app_role END;
  END IF;

  IF v_role = 'admin' THEN
    v_category := 'Administrador';
    v_yms := true; v_wms := true; v_tms := true; v_analytics := true;
  ELSE
    v_category := COALESCE(NEW.raw_user_meta_data->>'category', 'Conferente');
    v_yms := COALESCE((NEW.raw_user_meta_data->>'acesso_yms')::boolean, false);
    v_wms := COALESCE((NEW.raw_user_meta_data->>'acesso_wms')::boolean, false);
    v_tms := COALESCE((NEW.raw_user_meta_data->>'acesso_tms')::boolean, true);
    v_analytics := COALESCE((NEW.raw_user_meta_data->>'acesso_analytics')::boolean, false);
  END IF;

  INSERT INTO public.profiles (id, email, name, category, acesso_yms, acesso_wms, acesso_tms, acesso_analytics)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name', ''),
          v_category, v_yms, v_wms, v_tms, v_analytics);

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, v_role);
  RETURN NEW;
END;
$function$;
