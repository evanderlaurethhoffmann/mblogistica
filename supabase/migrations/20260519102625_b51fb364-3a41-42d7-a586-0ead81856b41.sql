
-- Enum de papéis
CREATE TYPE public.app_role AS ENUM ('admin', 'operator');

-- Tabela de perfis
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Tabela de papéis
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Função has_role (SECURITY DEFINER para evitar recursão em RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- Trigger para criar profile automaticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name', ''));

  -- Papel padrão: operador
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'operator'));

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Tabela de configurações
CREATE TABLE public.app_settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
INSERT INTO public.app_settings (key, value) VALUES ('google_sheets_webhook_url', '');

-- Ajustes em loads: conferente e motorista opcionais
ALTER TABLE public.loads ALTER COLUMN checker_id DROP NOT NULL;
ALTER TABLE public.loads ALTER COLUMN driver_id DROP NOT NULL;

-- Apenas uma carga aberta por filial
CREATE UNIQUE INDEX one_open_load_per_branch
ON public.loads (branch_id) WHERE status = 'Em aberto';

-- Remove policies públicas antigas
DROP POLICY IF EXISTS "public all branches" ON public.branches;
DROP POLICY IF EXISTS "public all checkers" ON public.checkers;
DROP POLICY IF EXISTS "public all drivers" ON public.drivers;
DROP POLICY IF EXISTS "public all loads" ON public.loads;
DROP POLICY IF EXISTS "public all volumes" ON public.volumes;

-- PROFILES: usuário vê o próprio; admin vê todos
CREATE POLICY "users read own profile" ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin manage profiles" ON public.profiles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- USER_ROLES: usuário vê os próprios; admin gerencia todos
CREATE POLICY "users read own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin manage roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- BRANCHES: todos autenticados leem; só admin altera
CREATE POLICY "auth read branches" ON public.branches FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin write branches" ON public.branches FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin update branches" ON public.branches FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin delete branches" ON public.branches FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- CHECKERS
CREATE POLICY "auth read checkers" ON public.checkers FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin write checkers" ON public.checkers FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin update checkers" ON public.checkers FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin delete checkers" ON public.checkers FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- DRIVERS
CREATE POLICY "auth read drivers" ON public.drivers FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin write drivers" ON public.drivers FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin update drivers" ON public.drivers FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin delete drivers" ON public.drivers FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- LOADS: autenticados podem ler/criar/atualizar; só admin exclui
CREATE POLICY "auth read loads" ON public.loads FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert loads" ON public.loads FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update loads" ON public.loads FOR UPDATE TO authenticated USING (true);
CREATE POLICY "admin delete loads" ON public.loads FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- VOLUMES
CREATE POLICY "auth read volumes" ON public.volumes FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert volumes" ON public.volumes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth delete volumes" ON public.volumes FOR DELETE TO authenticated USING (true);

-- APP_SETTINGS: somente admin
CREATE POLICY "admin read settings" ON public.app_settings FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin write settings" ON public.app_settings FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
