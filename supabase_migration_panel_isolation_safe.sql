-- ==============================================================================
-- MIGRAÇÃO DE ISOLAMENTO LÓGICO SEGURO ENTRE PAINÉIS
-- PROJETO: FICHA CADASTRAL PRODUTORES (painel_id = 'ficha_cadastral')
-- SUPABASE COMPARTILHADO: ebixhddonbiqtrsyvdry.supabase.co
-- ==============================================================================
-- REGRAS FUNDAMENTAIS:
-- 1. NUNCA excluir registros de auth.users automaticamente (compartilhado com Central Frango Forte e APPFinanças).
-- 2. NUNCA excluir registros de public.usuarios_sistema (tabela exclusiva do Central Frango Forte).
-- 3. O Ficha Cadastral utiliza public.usuario_empresa_painel com painel_id = 'ficha_cadastral' como fonte da verdade.
-- 4. Excluir usuário no Ficha Cadastral significa desvincular o painel/empresa e preservar a conta global.
-- ==============================================================================

-- 1. ESTRUTURA DA TABELA DE CONTROLE DE ACESSO POR PAINEL
CREATE TABLE IF NOT EXISTS public.usuario_empresa_painel (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    painel_id TEXT NOT NULL DEFAULT 'ficha_cadastral',
    role TEXT NOT NULL DEFAULT 'viewer',
    level INTEGER NOT NULL DEFAULT 10,
    ativo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT uq_user_empresa_painel UNIQUE (user_id, empresa_id, painel_id)
);

-- Índices otimizados para busca rápida e isolamento
CREATE INDEX IF NOT EXISTS idx_uep_user_painel ON public.usuario_empresa_painel(user_id, painel_id);
CREATE INDEX IF NOT EXISTS idx_uep_empresa_painel ON public.usuario_empresa_painel(empresa_id, painel_id);
CREATE INDEX IF NOT EXISTS idx_uep_painel_id ON public.usuario_empresa_painel(painel_id);

-- RLS para usuario_empresa_painel (sem recursão infinita)
ALTER TABLE public.usuario_empresa_painel ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "uep_select_own_or_admin" ON public.usuario_empresa_painel;
CREATE POLICY "uep_select_own_or_admin" 
ON public.usuario_empresa_painel FOR SELECT TO authenticated
USING (
    user_id = auth.uid()
    OR COALESCE((SELECT level FROM public.profiles WHERE id = auth.uid()), 0) >= 80
);

DROP POLICY IF EXISTS "uep_admin_manage" ON public.usuario_empresa_painel;
CREATE POLICY "uep_admin_manage" 
ON public.usuario_empresa_painel FOR ALL TO authenticated
USING (
    COALESCE((SELECT level FROM public.profiles WHERE id = auth.uid()), 0) >= 80
)
WITH CHECK (
    COALESCE((SELECT level FROM public.profiles WHERE id = auth.uid()), 0) >= 80
);

GRANT ALL ON public.usuario_empresa_painel TO authenticated, service_role;

-- ==============================================================================
-- 2. TABELA DE AUDITORIA DE USUÁRIOS (Log de Segurança)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.auditoria_usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    acao TEXT NOT NULL,
    autor_id UUID,
    autor_nome TEXT,
    autor_email TEXT,
    alvo_id UUID NOT NULL,
    alvo_nome TEXT,
    alvo_email TEXT,
    detalhes JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auditoria_usuarios_alvo ON public.auditoria_usuarios(alvo_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_usuarios_created_at ON public.auditoria_usuarios(created_at DESC);

ALTER TABLE public.auditoria_usuarios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auditoria_usuarios_select" ON public.auditoria_usuarios;
CREATE POLICY "auditoria_usuarios_select" 
ON public.auditoria_usuarios FOR SELECT TO authenticated
USING (
    COALESCE((SELECT level FROM public.profiles WHERE id = auth.uid()), 0) >= 80
);

DROP POLICY IF EXISTS "auditoria_usuarios_insert" ON public.auditoria_usuarios;
CREATE POLICY "auditoria_usuarios_insert" 
ON public.auditoria_usuarios FOR INSERT TO authenticated
WITH CHECK (true);

GRANT ALL ON public.auditoria_usuarios TO authenticated, service_role;

-- ==============================================================================
-- 3. RPC: CONCEDER OU ATUALIZAR ACESSO A UM PAINEL ESPECÍFICO
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.admin_set_user_panel_access(
    target_user_id UUID,
    target_empresa_id UUID,
    target_painel_id TEXT,
    target_role TEXT,
    target_level INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
    caller_id UUID;
    caller_level INTEGER;
    caller_name TEXT;
    caller_email TEXT;
    target_name TEXT;
    target_email TEXT;
BEGIN
    caller_id := auth.uid();
    IF caller_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Não autenticado.');
    END IF;

    -- Validar nível do chamador
    SELECT level, full_name, email INTO caller_level, caller_name, caller_email 
    FROM public.profiles WHERE id = caller_id;

    IF caller_level IS NULL THEN
        IF EXISTS (SELECT 1 FROM public.profiles WHERE id = caller_id AND (level >= 100 OR role = 'super_admin')) THEN
            caller_level := 100;
        ELSE
            caller_level := 0;
        END IF;
    END IF;

    IF caller_level < 80 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Permissão insuficiente para gerenciar acessos.');
    END IF;

    IF caller_level < 100 AND target_level >= caller_level THEN
        RETURN jsonb_build_object('success', false, 'error', 'Administrador não pode conceder nível igual ou superior ao seu.');
    END IF;

    SELECT full_name, email INTO target_name, target_email
    FROM public.profiles WHERE id = target_user_id;

    -- 1. Inserir ou atualizar no usuario_empresa_painel
    INSERT INTO public.usuario_empresa_painel (
        user_id, empresa_id, painel_id, role, level, ativo, updated_at
    ) VALUES (
        target_user_id, target_empresa_id, target_painel_id, target_role, target_level, true, now()
    )
    ON CONFLICT (user_id, empresa_id, painel_id)
    DO UPDATE SET 
        role = EXCLUDED.role,
        level = EXCLUDED.level,
        ativo = true,
        updated_at = now();

    -- 2. Manter compatibilidade com usuarios_empresas
    INSERT INTO public.usuarios_empresas (
        user_id, empresa_id, role, level, ativo, updated_at
    ) VALUES (
        target_user_id::text, target_empresa_id, target_role, target_level, true, now()
    )
    ON CONFLICT (user_id, empresa_id)
    DO UPDATE SET 
        role = EXCLUDED.role,
        level = EXCLUDED.level,
        ativo = true,
        updated_at = now();

    -- 3. Auditoria
    INSERT INTO public.auditoria_usuarios (
        acao, autor_id, autor_nome, autor_email,
        alvo_id, alvo_nome, alvo_email, detalhes
    ) VALUES (
        'CONCESSAO_PAINEL',
        caller_id, COALESCE(caller_name, 'Admin'), caller_email,
        target_user_id, COALESCE(target_name, 'Usuário'), target_email,
        jsonb_build_object(
            'empresa_id', target_empresa_id,
            'painel_id', target_painel_id,
            'role', target_role,
            'level', target_level
        )
    );

    RETURN jsonb_build_object('success', true, 'message', 'Acesso ao painel concedido com sucesso.');
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_user_panel_access(UUID, UUID, TEXT, TEXT, INTEGER) TO authenticated, service_role;

-- ==============================================================================
-- 4. RPC: REMOVER ACESSO DE PAINEL DE FORMA SEGURA (PRESERVANDO auth.users)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.admin_remove_user_from_panel(
    target_user_id UUID,
    target_empresa_id UUID,
    target_painel_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
    caller_id UUID;
    caller_level INTEGER;
    caller_name TEXT;
    caller_email TEXT;
    target_level INTEGER;
    target_name TEXT;
    target_email TEXT;
    remaining_panels_count INTEGER;
BEGIN
    caller_id := auth.uid();
    IF caller_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Não autenticado.');
    END IF;

    IF caller_id = target_user_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'Não é permitido remover o próprio acesso.');
    END IF;

    SELECT level, full_name, email INTO caller_level, caller_name, caller_email 
    FROM public.profiles WHERE id = caller_id;

    IF caller_level IS NULL THEN
        IF EXISTS (SELECT 1 FROM public.profiles WHERE id = caller_id AND (level >= 100 OR role = 'super_admin')) THEN
            caller_level := 100;
        ELSE
            caller_level := 0;
        END IF;
    END IF;

    IF caller_level < 80 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Permissão insuficiente para remover acessos.');
    END IF;

    SELECT level, full_name, email INTO target_level, target_name, target_email
    FROM public.profiles WHERE id = target_user_id;

    IF caller_level < 100 AND target_level >= caller_level THEN
        RETURN jsonb_build_object('success', false, 'error', 'Não é permitido remover usuário com nível igual ou superior.');
    END IF;

    -- 1. Remove o vínculo do painel especificado
    DELETE FROM public.usuario_empresa_painel
    WHERE user_id = target_user_id
      AND empresa_id = target_empresa_id
      AND painel_id = target_painel_id;

    -- 2. Verifica se sobrou algum outro painel nesta empresa
    SELECT COUNT(*) INTO remaining_panels_count
    FROM public.usuario_empresa_painel
    WHERE user_id = target_user_id AND empresa_id = target_empresa_id;

    -- Se não sobrou nenhum painel nessa empresa, remove o vínculo da empresa também
    IF remaining_panels_count = 0 THEN
        DELETE FROM public.usuarios_empresas
        WHERE (user_id = target_user_id::text OR usuario_id = target_user_id::text)
          AND empresa_id = target_empresa_id;
    END IF;

    -- 3. Auditoria (sem excluir auth.users nem usuarios_sistema!)
    INSERT INTO public.auditoria_usuarios (
        acao, autor_id, autor_nome, autor_email,
        alvo_id, alvo_nome, alvo_email, detalhes
    ) VALUES (
        'REMOCAO_PAINEL',
        caller_id, COALESCE(caller_name, 'Admin'), caller_email,
        target_user_id, COALESCE(target_name, 'Usuário'), target_email,
        jsonb_build_object(
            'empresa_id', target_empresa_id,
            'painel_id', target_painel_id,
            'auth_users_preservado', true
        )
    );

    RETURN jsonb_build_object(
        'success', true, 
        'message', 'Acesso ao painel removido com sucesso. Conta global preservada.'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_remove_user_from_panel(UUID, UUID, TEXT) TO authenticated, service_role;

-- ==============================================================================
-- 5. RPC: LISTAR USUÁRIOS ESTRITAMENTE POR PAINEL E EMPRESA
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.admin_get_panel_company_users(
    p_empresa_id UUID,
    p_painel_id TEXT DEFAULT 'ficha_cadastral'
)
RETURNS TABLE (
    id UUID,
    email TEXT,
    full_name TEXT,
    empresa_id UUID,
    empresa_nome TEXT,
    company_role TEXT,
    company_level INTEGER,
    painel_id TEXT,
    ativo BOOLEAN,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_caller_id UUID := auth.uid();
    v_is_super BOOLEAN;
BEGIN
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Não autenticado.';
    END IF;

    SELECT COALESCE(p.level >= 100 OR p.role = 'super_admin', false)
    INTO v_is_super
    FROM public.profiles p
    WHERE p.id = v_caller_id;

    IF NOT v_is_super THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.usuario_empresa_painel uep
            WHERE uep.user_id = v_caller_id
              AND uep.empresa_id = p_empresa_id
              AND uep.painel_id = p_painel_id
              AND uep.ativo = true
              AND uep.level >= 80
        ) THEN
            RAISE EXCEPTION 'Acesso negado: permissão insuficiente nesta empresa e painel.';
        END IF;
    END IF;

    RETURN QUERY
    SELECT 
        p.id,
        p.email,
        p.full_name,
        uep.empresa_id,
        e.nome AS empresa_nome,
        uep.role AS company_role,
        uep.level AS company_level,
        uep.painel_id,
        uep.ativo,
        uep.created_at,
        uep.updated_at
    FROM public.usuario_empresa_painel uep
    JOIN public.profiles p ON p.id = uep.user_id
    JOIN public.empresas e ON e.id = uep.empresa_id
    WHERE uep.empresa_id = p_empresa_id
      AND uep.painel_id = p_painel_id
      AND uep.ativo = true
    ORDER BY uep.level DESC, p.full_name ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_panel_company_users(UUID, TEXT) TO authenticated, service_role;

-- ==============================================================================
-- 6. RPC: ALTERAÇÃO DE SENHA COM CONFIRMAÇÃO DE EMAIL AUTOMÁTICA
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.admin_reset_user_password(
    target_user_id UUID,
    new_password TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
    caller_id UUID;
    caller_level INTEGER;
    caller_name TEXT;
    caller_email TEXT;
    target_level INTEGER;
    target_name TEXT;
    target_email TEXT;
BEGIN
    caller_id := auth.uid();
    IF caller_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Não autenticado.');
    END IF;

    SELECT level, full_name, email INTO caller_level, caller_name, caller_email 
    FROM public.profiles WHERE id = caller_id;
    
    IF caller_level IS NULL THEN
        IF EXISTS (SELECT 1 FROM public.profiles WHERE id = caller_id AND (level >= 100 OR role = 'super_admin')) THEN
            caller_level := 100;
        ELSE
            caller_level := 0;
        END IF;
    END IF;

    IF caller_level < 80 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Permissão negada: nível insuficiente para alterar senha.');
    END IF;

    SELECT level, full_name, email INTO target_level, target_name, target_email 
    FROM public.profiles WHERE id = target_user_id;

    IF target_level IS NULL THEN
        target_level := 10;
    END IF;

    IF caller_level < 100 AND target_level >= caller_level AND caller_id <> target_user_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'Permissão negada: não é permitido alterar a senha de usuários com nível igual ou superior.');
    END IF;

    IF length(new_password) < 6 THEN
        RETURN jsonb_build_object('success', false, 'error', 'A senha deve conter no mínimo 6 caracteres.');
    END IF;

    -- Atualiza a senha no Supabase Auth e garante confirmação de email para liberar login
    UPDATE auth.users
    SET encrypted_password = crypt(new_password, gen_salt('bf')),
        email_confirmed_at = COALESCE(email_confirmed_at, now()),
        updated_at = now()
    WHERE id = target_user_id;

    -- Registrar auditoria
    INSERT INTO public.auditoria_usuarios (
        acao, autor_id, autor_nome, autor_email,
        alvo_id, alvo_nome, alvo_email, detalhes
    ) VALUES (
        'ALTERACAO_SENHA',
        caller_id, COALESCE(caller_name, 'Admin'), caller_email,
        target_user_id, COALESCE(target_name, 'Usuário'), target_email,
        jsonb_build_object('timestamp', now(), 'alterado_por_id', caller_id)
    );

    RETURN jsonb_build_object('success', true, 'message', 'Senha alterada com sucesso.');
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_reset_user_password(UUID, TEXT) TO authenticated, service_role;

-- ==============================================================================
-- 7. OVERRIDE SEGURO: admin_delete_user NÃO DEVE APAGAR auth.users
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.admin_delete_user(
    target_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
    caller_id UUID;
    caller_level INTEGER;
BEGIN
    caller_id := auth.uid();
    IF caller_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Não autenticado.');
    END IF;

    SELECT level INTO caller_level FROM public.profiles WHERE id = caller_id;
    IF COALESCE(caller_level, 0) < 80 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Permissão insuficiente.');
    END IF;

    -- Desvincula apenas do painel ficha_cadastral
    DELETE FROM public.usuario_empresa_painel 
    WHERE user_id = target_user_id AND painel_id = 'ficha_cadastral';

    RETURN jsonb_build_object(
        'success', true, 
        'message', 'Acesso ao painel Ficha Cadastral removido com sucesso. Conta no Auth preservada.'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_delete_user(UUID) TO authenticated, service_role;
