-- ==============================================================================
-- CORREÇÃO CIRÚRGICA DE RLS: ELIMINAÇÃO TOTAL DE RECURSÃO INFINITA
-- ==============================================================================

-- 1. Função Auxiliar SECURITY DEFINER: Verificar se o usuário autenticado é Super Admin
-- Utiliza "SET row_security = off" para NUNCA disparar policies RLS internamente.
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
SET row_security = off
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_is_super boolean;
BEGIN
  IF v_caller_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT coalesce(p.level >= 100 OR p.role = 'super_admin', false)
    INTO v_is_super
    FROM public.profiles p
   WHERE p.id = v_caller_id;

  RETURN coalesce(v_is_super, false);
END;
$$;

-- 2. Função Auxiliar SECURITY DEFINER: Obter IDs das empresas que o usuário autenticado administra (level >= 80)
-- Utiliza "SET row_security = off" para NUNCA disparar policies de usuarios_empresas nem entrar em ciclo com profiles.
CREATE OR REPLACE FUNCTION public.get_my_admin_empresa_ids()
RETURNS SETOF uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
SET row_security = off
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
BEGIN
  IF v_caller_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT ue.empresa_id 
    FROM public.usuarios_empresas ue
   WHERE ue.user_id::text = v_caller_id::text
     AND coalesce(ue.ativo, true) = true
     AND coalesce(ue.level, 10) >= 80;
END;
$$;

-- Conceder execução pública para as funções auxiliares
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_my_admin_empresa_ids() TO authenticated, anon;

-- ==============================================================================
-- 3. POLICIES PARA PUBLIC.PROFILES (Sem qualquer subquery em profiles!)
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_isolated" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_authenticated" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_auth" ON public.profiles;
DROP POLICY IF EXISTS "profiles_mutate_auth" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_clean" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_clean" ON public.profiles;

-- Política de Leitura (SELECT):
-- Regra A: O próprio usuário pode ler seu profile diretamente (id = auth.uid()) sem subqueries.
-- Regra B: Super Admin pode ler todos os profiles (via função SECURITY DEFINER is_super_admin()).
-- Regra C: Administrador de empresa pode ler profiles de usuários vinculados às empresas que ele administra.
CREATE POLICY "profiles_select_clean" ON public.profiles
FOR SELECT USING (
  id = auth.uid()
  OR
  public.is_super_admin()
  OR
  id::text IN (
    SELECT ue.user_id::text 
      FROM public.usuarios_empresas ue
     WHERE ue.empresa_id IN (SELECT public.get_my_admin_empresa_ids())
       AND coalesce(ue.ativo, true) = true
  )
);

-- Política de Edição (UPDATE):
CREATE POLICY "profiles_update_clean" ON public.profiles
FOR UPDATE USING (
  id = auth.uid() OR public.is_super_admin()
) WITH CHECK (
  id = auth.uid() OR public.is_super_admin()
);

-- ==============================================================================
-- 4. POLICIES PARA PUBLIC.USUARIOS_EMPRESAS (Sem dependência recursiva com profiles!)
-- ==============================================================================
ALTER TABLE public.usuarios_empresas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "usuarios_empresas_select_isolated" ON public.usuarios_empresas;
DROP POLICY IF EXISTS "usuarios_empresas_select_auth" ON public.usuarios_empresas;
DROP POLICY IF EXISTS "usuarios_empresas_mutate_auth" ON public.usuarios_empresas;
DROP POLICY IF EXISTS "usuarios_empresas_select" ON public.usuarios_empresas;
DROP POLICY IF EXISTS "usuarios_empresas_select_clean" ON public.usuarios_empresas;
DROP POLICY IF EXISTS "usuarios_empresas_modify_clean" ON public.usuarios_empresas;

-- Política de Leitura (SELECT):
-- 1. O próprio usuário pode ler seus próprios vínculos.
-- 2. Super Admin pode ler todos os vínculos (is_super_admin()).
-- 3. Admin da empresa pode ler os vínculos das empresas que administra.
CREATE POLICY "usuarios_empresas_select_clean" ON public.usuarios_empresas
FOR SELECT USING (
  user_id::text = auth.uid()::text
  OR
  public.is_super_admin()
  OR
  empresa_id IN (SELECT public.get_my_admin_empresa_ids())
);

-- Permissão de mutação apenas para Super Admin diretamente ou via RPCs SECURITY DEFINER
CREATE POLICY "usuarios_empresas_modify_clean" ON public.usuarios_empresas
FOR ALL USING (
  public.is_super_admin()
) WITH CHECK (
  public.is_super_admin()
);

-- ==============================================================================
-- 5. POLICIES PARA PUBLIC.AUDIT_USER_ACCESS
-- ==============================================================================
ALTER TABLE public.audit_user_access ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_user_access_select" ON public.audit_user_access;
DROP POLICY IF EXISTS "audit_user_access_select_clean" ON public.audit_user_access;

CREATE POLICY "audit_user_access_select_clean" ON public.audit_user_access
FOR SELECT USING (
  public.is_super_admin()
  OR
  empresa_id IN (SELECT public.get_my_admin_empresa_ids())
);
