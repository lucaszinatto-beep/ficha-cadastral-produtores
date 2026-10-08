-- ==============================================================================
-- MIGRATION: ISOLAMENTO MULTIEMPRESA E GESTÃO INDEPENDENTE DE ACESSOS (CORREÇÃO DE QUALIFICAÇÃO)
-- ==============================================================================

-- 1. Assegurar colunas e constraints em public.usuarios_empresas
ALTER TABLE public.usuarios_empresas 
  ADD COLUMN IF NOT EXISTS ativo boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS role text DEFAULT 'viewer',
  ADD COLUMN IF NOT EXISTS level integer DEFAULT 10,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

UPDATE public.usuarios_empresas ue
   SET role = COALESCE(ue.role, p.role, 'viewer'),
       level = COALESCE(ue.level, p.level, 10),
       ativo = COALESCE(ue.ativo, true)
  FROM public.profiles p
 WHERE ue.user_id::text = p.id::text;

-- Garantir constraint UNIQUE (user_id, empresa_id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_usuarios_empresas_user_empresa'
  ) THEN
    ALTER TABLE public.usuarios_empresas 
      ADD CONSTRAINT uq_usuarios_empresas_user_empresa UNIQUE (user_id, empresa_id);
  END IF;
END $$;

-- 2. Tabela de Log de Auditoria
CREATE TABLE IF NOT EXISTS public.audit_user_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  target_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  empresa_id uuid REFERENCES public.empresas(id) ON DELETE SET NULL,
  action text NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.audit_user_access ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_user_access_select" ON public.audit_user_access;
CREATE POLICY "audit_user_access_select" ON public.audit_user_access
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND (p.level >= 100 OR p.role = 'super_admin')
  )
  OR
  empresa_id IN (
    SELECT ue.empresa_id FROM public.usuarios_empresas ue
     WHERE ue.user_id::text = auth.uid()::text AND coalesce(ue.ativo, true) = true AND coalesce(ue.level, 10) >= 80
  )
);

-- 3. RPC: Listar Usuários Isolados por Empresa (admin_get_company_users) com nomes qualificados
CREATE OR REPLACE FUNCTION public.admin_get_company_users(
  p_empresa_id uuid
)
RETURNS TABLE (
  id uuid,
  email text,
  full_name text,
  avatar_url text,
  empresa_id uuid,
  empresa_nome text,
  company_role text,
  company_level integer,
  ativo boolean,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_is_super boolean;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado.';
  END IF;

  SELECT coalesce(p.level >= 100 OR p.role = 'super_admin', false)
    INTO v_is_super
    FROM public.profiles p
   WHERE p.id = v_caller_id;

  -- Se não for super admin, precisa ser admin (level >= 80) na empresa solicitada
  IF NOT v_is_super THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.usuarios_empresas ue
       WHERE ue.user_id::text = v_caller_id::text
         AND ue.empresa_id = p_empresa_id
         AND coalesce(ue.ativo, true) = true
         AND coalesce(ue.level, 10) >= 80
    ) THEN
      RAISE EXCEPTION 'Acesso negado: você não tem permissão de administração nesta empresa.';
    END IF;
  END IF;

  RETURN QUERY
  SELECT 
    p.id,
    p.email,
    p.full_name,
    NULL::text AS avatar_url,
    ue.empresa_id,
    e.nome AS empresa_nome,
    coalesce(ue.role, 'viewer') AS company_role,
    coalesce(ue.level, 10) AS company_level,
    coalesce(ue.ativo, true) AS ativo,
    ue.created_at,
    ue.updated_at
  FROM public.usuarios_empresas ue
  JOIN public.profiles p ON p.id::text = ue.user_id::text
  JOIN public.empresas e ON e.id = ue.empresa_id
  WHERE ue.empresa_id = p_empresa_id
    AND coalesce(ue.ativo, true) = true
  ORDER BY coalesce(ue.level, 10) DESC, p.full_name ASC;
END;
$$;

-- 4. RPC: Remover Acesso Exclusivamente de Uma Empresa (admin_remove_user_from_company)
CREATE OR REPLACE FUNCTION public.admin_remove_user_from_company(
  target_user_id uuid,
  target_empresa_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_caller_level int;
  v_is_super boolean;
  v_target_level int;
  v_empresa_nome text;
BEGIN
  IF v_caller_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Não autenticado.');
  END IF;

  IF v_caller_id = target_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Não é permitido remover o próprio acesso da empresa.');
  END IF;

  SELECT coalesce(p.level, 0), coalesce(p.role = 'super_admin' OR p.level >= 100, false)
    INTO v_caller_level, v_is_super
    FROM public.profiles p
   WHERE p.id = v_caller_id;

  IF NOT v_is_super THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.usuarios_empresas ue
       WHERE ue.user_id::text = v_caller_id::text 
         AND ue.empresa_id = target_empresa_id 
         AND coalesce(ue.ativo, true) = true 
         AND coalesce(ue.level, 10) >= 80
    ) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Você não tem permissão de administrador nesta empresa.');
    END IF;
  END IF;

  SELECT coalesce(ue.level, 10) INTO v_target_level
    FROM public.usuarios_empresas ue
   WHERE ue.user_id::text = target_user_id::text AND ue.empresa_id = target_empresa_id;

  IF v_target_level IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuário não possui vínculo com esta empresa.');
  END IF;

  IF NOT v_is_super AND v_target_level >= v_caller_level THEN
    RETURN jsonb_build_object('success', false, 'error', 'Permissão insuficiente para remover usuário com nível igual ou superior.');
  END IF;

  SELECT e.nome INTO v_empresa_nome FROM public.empresas e WHERE e.id = target_empresa_id;

  -- Remove SOMENTE o vínculo desta empresa
  DELETE FROM public.usuarios_empresas ue
   WHERE ue.user_id::text = target_user_id::text 
     AND ue.empresa_id = target_empresa_id;

  -- Registrar no log de auditoria
  INSERT INTO public.audit_user_access (actor_user_id, target_user_id, empresa_id, action, details)
  VALUES (
    v_caller_id, 
    target_user_id, 
    target_empresa_id, 
    'REVOKE_ACCESS', 
    jsonb_build_object('empresa_nome', v_empresa_nome, 'removed_by', v_caller_id)
  );

  RETURN jsonb_build_object(
    'success', true, 
    'message', 'Acesso da empresa ' || coalesce(v_empresa_nome, '') || ' removido com sucesso.'
  );
END;
$$;

-- 5. RPC: Conceder ou Atualizar Acesso de Empresa (admin_set_user_company_access)
CREATE OR REPLACE FUNCTION public.admin_set_user_company_access(
  target_user_id uuid,
  target_empresa_id uuid,
  target_role text,
  target_level integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_caller_level int;
  v_is_super boolean;
  v_empresa_nome text;
BEGIN
  IF v_caller_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Não autenticado.');
  END IF;

  SELECT coalesce(p.level, 0), coalesce(p.role = 'super_admin' OR p.level >= 100, false)
    INTO v_caller_level, v_is_super
    FROM public.profiles p
   WHERE p.id = v_caller_id;

  IF NOT v_is_super THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.usuarios_empresas ue
       WHERE ue.user_id::text = v_caller_id::text 
         AND ue.empresa_id = target_empresa_id 
         AND coalesce(ue.ativo, true) = true 
         AND coalesce(ue.level, 10) >= 80
    ) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Você não tem permissão de administrador nesta empresa.');
    END IF;

    IF target_level >= v_caller_level THEN
      RETURN jsonb_build_object('success', false, 'error', 'Administrador não pode conceder nível igual ou superior ao seu.');
    END IF;
  END IF;

  SELECT e.nome INTO v_empresa_nome FROM public.empresas e WHERE e.id = target_empresa_id;

  INSERT INTO public.usuarios_empresas (user_id, empresa_id, role, level, ativo, updated_at)
  VALUES (target_user_id::text, target_empresa_id, target_role, target_level, true, now())
  ON CONFLICT (user_id, empresa_id) DO UPDATE
  SET role = EXCLUDED.role,
      level = EXCLUDED.level,
      ativo = true,
      updated_at = now();

  INSERT INTO public.audit_user_access (actor_user_id, target_user_id, empresa_id, action, details)
  VALUES (
    v_caller_id, 
    target_user_id, 
    target_empresa_id, 
    'SET_ACCESS', 
    jsonb_build_object('role', target_role, 'level', target_level, 'empresa_nome', v_empresa_nome)
  );

  RETURN jsonb_build_object('success', true, 'message', 'Vínculo com ' || coalesce(v_empresa_nome, '') || ' atualizado com sucesso.');
END;
$$;

-- 6. RPC: Exclusão Global (Exclusiva para Super Admin)
CREATE OR REPLACE FUNCTION public.admin_delete_user_globally(
  target_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_is_super boolean;
  v_target_email text;
BEGIN
  IF v_caller_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Não autenticado.');
  END IF;

  IF v_caller_id = target_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Não é permitido excluir a própria conta.');
  END IF;

  SELECT coalesce(p.role = 'super_admin' OR p.level >= 100, false)
    INTO v_is_super
    FROM public.profiles p
   WHERE p.id = v_caller_id;

  IF NOT v_is_super THEN
    RETURN jsonb_build_object('success', false, 'error', 'Apenas Super Administradores podem excluir contas globais.');
  END IF;

  SELECT au.email INTO v_target_email FROM auth.users au WHERE au.id = target_user_id;

  DELETE FROM public.usuarios_empresas ue WHERE ue.user_id::text = target_user_id::text;
  DELETE FROM public.profiles p WHERE p.id = target_user_id;
  DELETE FROM public.usuarios_sistema us WHERE us.auth_user_id = target_user_id OR us.id = target_user_id;
  DELETE FROM auth.users au WHERE au.id = target_user_id;

  INSERT INTO public.audit_user_access (actor_user_id, target_user_id, empresa_id, action, details)
  VALUES (
    v_caller_id, 
    target_user_id, 
    NULL, 
    'GLOBAL_DELETE', 
    jsonb_build_object('email', v_target_email, 'message', 'Conta excluída globalmente pelo Super Admin')
  );

  RETURN jsonb_build_object('success', true, 'message', 'Conta global e todos os vínculos foram excluídos com sucesso.');
END;
$$;
