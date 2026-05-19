
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role app_role;
  v_has_any_admin BOOLEAN;
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name', ''));

  -- If a role was provided in metadata, use it
  IF NEW.raw_user_meta_data ? 'role' THEN
    v_role := (NEW.raw_user_meta_data->>'role')::app_role;
  ELSE
    -- Bootstrap: first user becomes admin
    SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') INTO v_has_any_admin;
    v_role := CASE WHEN v_has_any_admin THEN 'operator'::app_role ELSE 'admin'::app_role END;
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, v_role);
  RETURN NEW;
END;
$$;
