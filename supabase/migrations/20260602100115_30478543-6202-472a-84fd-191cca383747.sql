ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username text,
  ADD COLUMN IF NOT EXISTS nome_completo text,
  ADD COLUMN IF NOT EXISTS perfil_categoria text;

UPDATE public.profiles
SET
  username = COALESCE(NULLIF(username, ''), lower(split_part(email, '@', 1))),
  nome_completo = COALESCE(NULLIF(nome_completo, ''), NULLIF(name, ''), email),
  perfil_categoria = COALESCE(NULLIF(perfil_categoria, ''), NULLIF(category, ''), 'Conferente')
WHERE username IS NULL
   OR username = ''
   OR nome_completo IS NULL
   OR nome_completo = ''
   OR perfil_categoria IS NULL
   OR perfil_categoria = '';

ALTER TABLE public.profiles
  ALTER COLUMN username SET NOT NULL,
  ALTER COLUMN nome_completo SET NOT NULL,
  ALTER COLUMN perfil_categoria SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique_idx
  ON public.profiles (lower(username));

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
  v_username text;
  v_nome_completo text;
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

  v_username := lower(COALESCE(NULLIF(NEW.raw_user_meta_data->>'username', ''), split_part(NEW.email, '@', 1)));
  v_nome_completo := COALESCE(NULLIF(NEW.raw_user_meta_data->>'nome_completo', ''), NULLIF(NEW.raw_user_meta_data->>'name', ''), NEW.email);

  IF v_role = 'admin' THEN
    v_category := COALESCE(NULLIF(NEW.raw_user_meta_data->>'perfil_categoria', ''), NULLIF(NEW.raw_user_meta_data->>'category', ''), 'Administrador');
    v_yms := true; v_wms := true; v_tms := true; v_analytics := true;
  ELSE
    v_category := COALESCE(NULLIF(NEW.raw_user_meta_data->>'perfil_categoria', ''), NULLIF(NEW.raw_user_meta_data->>'category', ''), 'Conferente');
    v_yms := COALESCE((NEW.raw_user_meta_data->>'acesso_yms')::boolean, false);
    v_wms := COALESCE((NEW.raw_user_meta_data->>'acesso_wms')::boolean, false);
    v_tms := COALESCE((NEW.raw_user_meta_data->>'acesso_tms')::boolean, true);
    v_analytics := COALESCE((NEW.raw_user_meta_data->>'acesso_analytics')::boolean, false);
  END IF;

  INSERT INTO public.profiles (
    id, email, name, username, nome_completo, category, perfil_categoria,
    acesso_yms, acesso_wms, acesso_tms, acesso_analytics
  )
  VALUES (
    NEW.id, NEW.email, v_nome_completo, v_username, v_nome_completo, v_category, v_category,
    v_yms, v_wms, v_tms, v_analytics
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    username = EXCLUDED.username,
    nome_completo = EXCLUDED.nome_completo,
    category = EXCLUDED.category,
    perfil_categoria = EXCLUDED.perfil_categoria,
    acesso_yms = EXCLUDED.acesso_yms,
    acesso_wms = EXCLUDED.acesso_wms,
    acesso_tms = EXCLUDED.acesso_tms,
    acesso_analytics = EXCLUDED.acesso_analytics;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, v_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$function$;