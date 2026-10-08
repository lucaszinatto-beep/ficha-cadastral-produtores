-- ==============================================================================
-- MIGRAÇÃO: Ações Administrativas de Usuário (Alterar Senha e Excluir Usuário)
-- Execute este script no SQL Editor do seu projeto Supabase:
-- https://supabase.com/dashboard/project/ebixhddonbiqtrsyvdry/sql/new
-- ==============================================================================

-- 1. TABELA DE AUDITORIA DE USUÁRIOS (Log de Segurança & Governança)
CREATE TABLE IF NOT EXISTS public.auditoria_usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    acao TEXT NOT NULL, -- 'ALTERACAO_SENHA', 'EXCLUSAO_USUARIO', 'ALTERACAO_CARGO'
    autor_id UUID,
    autor_nome TEXT,
    autor_email TEXT,
    alvo_id UUID NOT NULL,
    alvo_nome TEXT,
    alvo_email TEXT,
    detalhes JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para auditoria rápida
CREATE INDEX IF NOT EXISTS idx_auditoria_usuarios_alvo ON public.auditoria_usuarios(alvo_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_usuarios_created_at ON public.auditoria_usuarios(created_at DESC);

-- RLS para tabela de auditoria
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
-- 2. FUNÇÃO RPC: ALTERAÇÃO DE SENHA POR ADMINISTRADOR
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
        RAISE EXCEPTION 'Não autenticado.';
    END IF;

    -- Obter perfil do usuário solicitante
    SELECT level, full_name, email INTO caller_level, caller_name, caller_email 
    FROM public.profiles WHERE id = caller_id;
    
    IF caller_level IS NULL THEN
        IF EXISTS (SELECT 1 FROM public.profiles WHERE id = caller_id AND (level >= 100 OR role = 'super_admin')) THEN
            caller_level := 100;
        ELSE
            caller_level := 0;
        END IF;
    END IF;

    -- Apenas administradores (nível >= 80) podem alterar senha de outros usuários
    IF caller_level < 80 THEN
        RAISE EXCEPTION 'Permissão negada: nível insuficiente para alterar senha de outros usuários.';
    END IF;

    -- Obter perfil do usuário alvo
    SELECT level, full_name, email INTO target_level, target_name, target_email 
    FROM public.profiles WHERE id = target_user_id;

    IF target_level IS NULL THEN
        target_level := 10;
    END IF;

    -- Regra de Hierarquia: Administrador comum (< 100) não pode alterar senha de quem tem nível igual ou superior
    IF caller_level < 100 AND target_level >= caller_level AND caller_id <> target_user_id THEN
        RAISE EXCEPTION 'Permissão negada: você não possui permissão para alterar a senha de usuários com nível igual ou superior ao seu.';
    END IF;

    -- Validação da política de senha
    IF length(new_password) < 6 THEN
        RAISE EXCEPTION 'A senha deve conter no mínimo 6 caracteres.';
    END IF;

    -- Atualiza a senha no Supabase Auth com hash Blowfish seguro
    UPDATE auth.users
    SET encrypted_password = crypt(new_password, gen_salt('bf')),
        updated_at = now()
    WHERE id = target_user_id;

    -- Registrar auditoria
    INSERT INTO public.auditoria_usuarios (
        acao, autor_id, autor_nome, autor_email,
        alvo_id, alvo_nome, alvo_email, detalhes
    ) VALUES (
        'ALTERACAO_SENHA',
        caller_id,
        COALESCE(caller_name, 'Admin'),
        caller_email,
        target_user_id,
        COALESCE(target_name, 'Usuário'),
        target_email,
        jsonb_build_object('timestamp', now(), 'alterado_por_id', caller_id)
    );

    RETURN jsonb_build_object('success', true, 'message', 'Senha alterada com sucesso.');
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_reset_user_password(UUID, TEXT) TO authenticated, service_role;

-- ==============================================================================
-- 3. FUNÇÃO RPC: EXCLUSÃO DE USUÁRIO POR ADMINISTRADOR / SUPER ADMIN
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
    caller_name TEXT;
    caller_email TEXT;
    target_level INTEGER;
    target_name TEXT;
    target_email TEXT;
BEGIN
    caller_id := auth.uid();
    IF caller_id IS NULL THEN
        RAISE EXCEPTION 'Não autenticado.';
    END IF;

    -- Não permitir excluir a própria conta
    IF caller_id = target_user_id THEN
        RAISE EXCEPTION 'Não é permitido excluir a própria conta.';
    END IF;

    -- Obter perfil do chamador
    SELECT level, full_name, email INTO caller_level, caller_name, caller_email 
    FROM public.profiles WHERE id = caller_id;
    
    IF caller_level IS NULL THEN
        IF EXISTS (SELECT 1 FROM public.profiles WHERE id = caller_id AND (level >= 100 OR role = 'super_admin')) THEN
            caller_level := 100;
        ELSE
            caller_level := 0;
        END IF;
    END IF;

    -- Apenas administradores (nível >= 80) podem excluir usuários
    IF caller_level < 80 THEN
        RAISE EXCEPTION 'Permissão negada: nível insuficiente para excluir usuários.';
    END IF;

    -- Obter perfil do usuário alvo
    SELECT level, full_name, email INTO target_level, target_name, target_email 
    FROM public.profiles WHERE id = target_user_id;

    IF target_level IS NULL THEN
        SELECT papel, nome, email INTO target_name, target_name, target_email 
        FROM public.usuarios_sistema WHERE id = target_user_id;
        target_level := 10;
    END IF;

    -- Regra de Hierarquia: Administrador comum (< 100) não pode excluir usuário com nível igual ou superior
    IF caller_level < 100 AND target_level >= caller_level THEN
        RAISE EXCEPTION 'Permissão negada: administradores não podem excluir usuários com nível igual ou superior ao seu.';
    END IF;

    -- Registrar auditoria antes da exclusão definitiva
    INSERT INTO public.auditoria_usuarios (
        acao, autor_id, autor_nome, autor_email,
        alvo_id, alvo_nome, alvo_email, detalhes
    ) VALUES (
        'EXCLUSAO_USUARIO',
        caller_id,
        COALESCE(caller_name, 'Admin'),
        caller_email,
        target_user_id,
        COALESCE(target_name, 'Usuário'),
        target_email,
        jsonb_build_object(
            'deleted_at', now(),
            'target_level', target_level,
            'excluido_por_id', caller_id
        )
    );

    -- 1. Remover vínculos de multiempresa (usuarios_empresas)
    DELETE FROM public.usuarios_empresas 
    WHERE user_id = target_user_id OR usuario_id = target_user_id;

    -- 2. Remover da tabela legado usuarios_sistema se existir
    DELETE FROM public.usuarios_sistema 
    WHERE id = target_user_id;

    -- 3. Remover de public.profiles
    DELETE FROM public.profiles 
    WHERE id = target_user_id;

    -- 4. Remover de auth.users (desvinculando do Supabase Auth e revogando acesso imediatamente)
    DELETE FROM auth.users 
    WHERE id = target_user_id;

    RETURN jsonb_build_object(
        'success', true, 
        'message', 'Usuário e acessos excluídos com sucesso.'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_delete_user(UUID) TO authenticated, service_role;
