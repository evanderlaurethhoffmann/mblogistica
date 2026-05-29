
CREATE OR REPLACE FUNCTION public.crypt_password(p text)
RETURNS TABLE(hash text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT crypt(p, gen_salt('bf', 10));
$$;

CREATE OR REPLACE FUNCTION public.verify_supplier_password(p text, h text)
RETURNS TABLE(ok boolean)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT crypt(p, h) = h;
$$;

REVOKE ALL ON FUNCTION public.crypt_password(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.verify_supplier_password(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.crypt_password(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.verify_supplier_password(text, text) TO service_role;
