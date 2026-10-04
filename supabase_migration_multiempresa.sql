-- ==============================================================================
-- MIGRAÇÃO DEFINITIVA: PLATAFORMA MULTIEMPRESAS (MULTI-TENANT REAL)
-- Empresas: Bello Alimentos, Levo Alimentos, Frango Ouro, Pluma Agroavícola
-- Execute este script no SQL Editor do Supabase:
-- https://supabase.com/dashboard/project/ebixhddonbiqtrsyvdry/sql/new
-- ==============================================================================

-- 0. Garantir Extensões
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. TABELA DE EMPRESAS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.empresas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    logo_path TEXT NOT NULL,
    cor_primaria TEXT NOT NULL,
    cor_secundaria TEXT NOT NULL,
    cor_destaque TEXT NOT NULL,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Inserir / Atualizar as 4 empresas oficiais com UUIDs determinísticos
INSERT INTO public.empresas (id, nome, slug, logo_path, cor_primaria, cor_secundaria, cor_destaque, ativo)
VALUES 
    (
        'e1100000-0000-0000-0000-000000000001'::uuid,
        'Bello Alimentos',
        'bello',
        '/logos/bello.png',
        '#1e40af', -- Blue 800
        '#0284c7', -- Sky 600
        '#38bdf8', -- Sky 400
        true
    ),
    (
        'e1100000-0000-0000-0000-000000000002'::uuid,
        'Levo Alimentos',
        'levo',
        '/logos/levo.png',
        '#581c87', -- Purple 900
        '#7e22ce', -- Purple 700
        '#a855f7', -- Purple 500
        true
    ),
    (
        'e1100000-0000-0000-0000-000000000003'::uuid,
        'Frango Ouro',
        'ouro',
        '/logos/frango_ouro.png',
        '#991b1b', -- Red 800
        '#b45309', -- Amber 700
        '#f59e0b', -- Amber 500
        true
    ),
    (
        'e1100000-0000-0000-0000-000000000004'::uuid,
        'Pluma Agroavícola',
        'pluma',
        '/logos/pluma.png',
        '#14382c', -- Forest Green Dark
        '#166534', -- Green 800
        '#eab308', -- Yellow / Gold
        true
    )
ON CONFLICT (id) DO UPDATE SET
    nome = EXCLUDED.nome,
    slug = EXCLUDED.slug,
    logo_path = EXCLUDED.logo_path,
    cor_primaria = EXCLUDED.cor_primaria,
    cor_secundaria = EXCLUDED.cor_secundaria,
    cor_destaque = EXCLUDED.cor_destaque,
    ativo = EXCLUDED.ativo;

-- ==============================================================================
-- 2. TABELA DE PERFIS DE USUÁRIO (se ainda não existir)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL DEFAULT '',
    role TEXT NOT NULL DEFAULT 'viewer'
        CHECK (role IN ('super_admin', 'admin', 'extensionista', 'viewer')),
    level INTEGER NOT NULL DEFAULT 10
        CHECK (level >= 0 AND level <= 100),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ==============================================================================
-- 3. TABELA DE VÍNCULO MULTIEMPRESA: usuarios_empresas
-- Permite que um usuário acerte 1 ou mais empresas com papéis independentes
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.usuarios_empresas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'viewer'
        CHECK (role IN ('super_admin', 'admin', 'extensionista', 'viewer')),
    level INTEGER NOT NULL DEFAULT 10
        CHECK (level >= 0 AND level <= 100),
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT unique_user_empresa UNIQUE (user_id, empresa_id)
);

CREATE INDEX IF NOT EXISTS idx_usuarios_empresas_user ON public.usuarios_empresas(user_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_empresas_empresa ON public.usuarios_empresas(empresa_id);

-- ==============================================================================
-- 4. ADICIONAR EMPRESA_ID EM TODAS AS TABELAS OPERACIONAIS
-- ==============================================================================
-- Garantir tabela de histórico caso ainda não tenha sido criada
CREATE TABLE IF NOT EXISTS public.setups_aviarios_historico (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aviario_id UUID NOT NULL REFERENCES public.cadastro_aviarios(id) ON DELETE CASCADE,
    setup_id UUID REFERENCES public.setups_aviarios(id) ON DELETE CASCADE,
    versao INTEGER NOT NULL DEFAULT 1,
    tipo_acao TEXT NOT NULL DEFAULT 'EDICAO',
    usuario_id UUID,
    usuario_nome TEXT NOT NULL,
    usuario_email TEXT,
    dados_snapshot JSONB NOT NULL,
    alteracoes JSONB DEFAULT '[]'::jsonb,
    resumo_alteracoes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Adiciona empresa_id
ALTER TABLE public.produtores ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE;
ALTER TABLE public.tecnicos ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE;
ALTER TABLE public.cadastro_aviarios ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE;
ALTER TABLE public.setups_aviarios ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE;
ALTER TABLE public.setups_aviarios_historico ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE;
ALTER TABLE public.importacoes ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE;

-- ==============================================================================
-- 5. MIGRAÇÃO SEGURA: VINCULAR 100% DOS DADOS EXISTENTES À BELLO ALIMENTOS
-- UUID da Bello Alimentos: 'e1100000-0000-0000-0000-000000000001'
-- ==============================================================================
UPDATE public.produtores 
SET empresa_id = 'e1100000-0000-0000-0000-000000000001'::uuid 
WHERE empresa_id IS NULL;

UPDATE public.tecnicos 
SET empresa_id = 'e1100000-0000-0000-0000-000000000001'::uuid 
WHERE empresa_id IS NULL;

UPDATE public.cadastro_aviarios 
SET empresa_id = 'e1100000-0000-0000-0000-000000000001'::uuid 
WHERE empresa_id IS NULL;

UPDATE public.setups_aviarios 
SET empresa_id = 'e1100000-0000-0000-0000-000000000001'::uuid 
WHERE empresa_id IS NULL;

UPDATE public.setups_aviarios_historico 
SET empresa_id = 'e1100000-0000-0000-0000-000000000001'::uuid 
WHERE empresa_id IS NULL;

UPDATE public.importacoes 
SET empresa_id = 'e1100000-0000-0000-0000-000000000001'::uuid 
WHERE empresa_id IS NULL;

-- Definir valores padrão para novos registros e obrigar NOT NULL
ALTER TABLE public.produtores ALTER COLUMN empresa_id SET DEFAULT 'e1100000-0000-0000-0000-000000000001'::uuid;
ALTER TABLE public.produtores ALTER COLUMN empresa_id SET NOT NULL;

ALTER TABLE public.tecnicos ALTER COLUMN empresa_id SET DEFAULT 'e1100000-0000-0000-0000-000000000001'::uuid;
ALTER TABLE public.tecnicos ALTER COLUMN empresa_id SET NOT NULL;

ALTER TABLE public.cadastro_aviarios ALTER COLUMN empresa_id SET DEFAULT 'e1100000-0000-0000-0000-000000000001'::uuid;
ALTER TABLE public.cadastro_aviarios ALTER COLUMN empresa_id SET NOT NULL;

ALTER TABLE public.setups_aviarios ALTER COLUMN empresa_id SET DEFAULT 'e1100000-0000-0000-0000-000000000001'::uuid;
ALTER TABLE public.setups_aviarios ALTER COLUMN empresa_id SET NOT NULL;

ALTER TABLE public.setups_aviarios_historico ALTER COLUMN empresa_id SET DEFAULT 'e1100000-0000-0000-0000-000000000001'::uuid;

ALTER TABLE public.importacoes ALTER COLUMN empresa_id SET DEFAULT 'e1100000-0000-0000-0000-000000000001'::uuid;
ALTER TABLE public.importacoes ALTER COLUMN empresa_id SET NOT NULL;

-- ==============================================================================
-- 6. AJUSTE DE CONSTRAINTS DE UNICIDADE (ESCOPO POR EMPRESA)
-- Permite nomes idênticos em empresas diferentes sem colisão
-- ==============================================================================
-- 6.1 Produtores: remover unicidade global do nome e criar por empresa
ALTER TABLE public.produtores DROP CONSTRAINT IF EXISTS produtores_nome_key;
ALTER TABLE public.produtores DROP CONSTRAINT IF EXISTS unique_produtor_empresa;
ALTER TABLE public.produtores ADD CONSTRAINT unique_produtor_empresa UNIQUE (empresa_id, nome);

-- 6.2 Técnicos: remover unicidade global do nome e criar por empresa
ALTER TABLE public.tecnicos DROP CONSTRAINT IF EXISTS tecnicos_nome_key;
ALTER TABLE public.tecnicos DROP CONSTRAINT IF EXISTS unique_tecnico_empresa;
ALTER TABLE public.tecnicos ADD CONSTRAINT unique_tecnico_empresa UNIQUE (empresa_id, nome);

-- ==============================================================================
-- 7. ÍNDICES DE PERFORMANCE POR EMPRESA
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_produtores_empresa ON public.produtores(empresa_id);
CREATE INDEX IF NOT EXISTS idx_tecnicos_empresa ON public.tecnicos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_aviarios_empresa ON public.cadastro_aviarios(empresa_id);
CREATE INDEX IF NOT EXISTS idx_setups_empresa ON public.setups_aviarios(empresa_id);
CREATE INDEX IF NOT EXISTS idx_setups_historico_empresa ON public.setups_aviarios_historico(empresa_id);
CREATE INDEX IF NOT EXISTS idx_importacoes_empresa ON public.importacoes(empresa_id);

-- ==============================================================================
-- 8. MIGRAÇÃO DE USUÁRIOS EXISTENTES
-- ==============================================================================
-- Garante perfis existentes
INSERT INTO public.profiles (id, full_name, role, level)
SELECT 
    au.id, 
    COALESCE(au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1)), 
    'admin', 
    80
FROM auth.users au
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = au.id)
ON CONFLICT (id) DO NOTHING;

-- Garantir perfil Super Admin (Nível 100) para Lucas Zinatto (ambos os e-mails conhecidos)
UPDATE public.profiles
SET role = 'super_admin', level = 100, full_name = 'Lucas Zinatto'
WHERE id IN (
    SELECT id FROM auth.users 
    WHERE lower(trim(email)) IN ('lucas_zinatto@hotmail.com', 'lucas.zinatto@belloalimentos.com.br')
);

-- Garantir perfil Super Admin (Nível 100) para João Moraes
UPDATE public.profiles
SET role = 'super_admin', level = 100, full_name = 'João Moraes'
WHERE id IN (
    SELECT id FROM auth.users 
    WHERE lower(trim(email)) = 'joao.moraes@belloalimentos.com.br'
);

-- Conceder a todos os usuários existentes acesso à Bello Alimentos
INSERT INTO public.usuarios_empresas (user_id, empresa_id, role, level, ativo)
SELECT 
    p.id,
    'e1100000-0000-0000-0000-000000000001'::uuid,
    p.role,
    p.level,
    true
FROM public.profiles p
ON CONFLICT (user_id, empresa_id) DO NOTHING;

-- Conceder aos Super Admins (Lucas e João) acesso a TODAS as 4 empresas
INSERT INTO public.usuarios_empresas (user_id, empresa_id, role, level, ativo)
SELECT 
    p.id,
    e.id,
    'super_admin',
    100,
    true
FROM public.profiles p
CROSS JOIN public.empresas e
WHERE p.level = 100 OR p.role = 'super_admin' OR p.id IN (
    SELECT id FROM auth.users 
    WHERE lower(trim(email)) IN (
        'lucas_zinatto@hotmail.com', 
        'lucas.zinatto@belloalimentos.com.br', 
        'joao.moraes@belloalimentos.com.br'
    )
)
ON CONFLICT (user_id, empresa_id) DO UPDATE SET role = 'super_admin', level = 100, ativo = true;

-- ==============================================================================
-- 9. FUNÇÕES DE SEGURANÇA HELPER (POSTGRESQL)
-- ==============================================================================

-- 9.1 Verifica se o usuário atual é Super Admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND (level >= 100 OR role = 'super_admin')
    );
$$;

-- 9.2 Retorna os IDs das empresas que o usuário autenticado pode acessar
CREATE OR REPLACE FUNCTION public.get_user_empresas()
RETURNS TABLE (empresa_id UUID)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    -- Se for super admin, tem acesso a todas as empresas ativas
    SELECT id FROM public.empresas WHERE ativo = true AND public.is_super_admin()
    UNION
    -- Usuários regulares têm acesso apenas às empresas vinculadas e ativas
    SELECT ue.empresa_id 
    FROM public.usuarios_empresas ue
    JOIN public.empresas e ON e.id = ue.empresa_id
    WHERE ue.user_id = auth.uid() 
      AND ue.ativo = true 
      AND e.ativo = true;
$$;

-- 9.3 Retorna o nível de acesso do usuário em uma empresa específica
CREATE OR REPLACE FUNCTION public.get_my_level_in_empresa(target_empresa_id UUID)
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT CASE 
        WHEN public.is_super_admin() THEN 100
        ELSE COALESCE(
            (SELECT level FROM public.usuarios_empresas 
             WHERE user_id = auth.uid() AND empresa_id = target_empresa_id AND ativo = true LIMIT 1),
            0
        )
    END;
$$;

-- ==============================================================================
-- 10. ROW LEVEL SECURITY (RLS) MULTIEMPRESA HERMÉTICO
-- ==============================================================================
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios_empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tecnicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cadastro_aviarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.setups_aviarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.setups_aviarios_historico ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.importacoes ENABLE ROW LEVEL SECURITY;

-- ---- 10.1 EMPRESAS ----
DROP POLICY IF EXISTS "empresas_select_anon" ON public.empresas;
CREATE POLICY "empresas_select_anon"
ON public.empresas FOR SELECT TO anon
USING (ativo = true);

DROP POLICY IF EXISTS "empresas_select" ON public.empresas;
CREATE POLICY "empresas_select"
ON public.empresas FOR SELECT TO authenticated
USING (
    public.is_super_admin() 
    OR id IN (SELECT public.get_user_empresas())
);

DROP POLICY IF EXISTS "empresas_admin_mutate" ON public.empresas;
CREATE POLICY "empresas_admin_mutate"
ON public.empresas FOR ALL TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

-- ---- 10.2 USUARIOS_EMPRESAS ----
DROP POLICY IF EXISTS "usuarios_empresas_select" ON public.usuarios_empresas;
CREATE POLICY "usuarios_empresas_select"
ON public.usuarios_empresas FOR SELECT TO authenticated
USING (
    user_id = auth.uid()
    OR public.is_super_admin()
    OR public.get_my_level_in_empresa(empresa_id) >= 80
);

DROP POLICY IF EXISTS "usuarios_empresas_mutate" ON public.usuarios_empresas;
CREATE POLICY "usuarios_empresas_mutate"
ON public.usuarios_empresas FOR ALL TO authenticated
USING (
    public.is_super_admin()
    OR public.get_my_level_in_empresa(empresa_id) >= 80
)
WITH CHECK (
    public.is_super_admin()
    OR public.get_my_level_in_empresa(empresa_id) >= 80
);

-- ---- 10.3 PRODUTORES ----
DROP POLICY IF EXISTS "produtores_select" ON public.produtores;
DROP POLICY IF EXISTS "Permitir tudo em produtores" ON public.produtores;
CREATE POLICY "produtores_select_multi"
ON public.produtores FOR SELECT TO authenticated
USING (empresa_id IN (SELECT public.get_user_empresas()));

DROP POLICY IF EXISTS "produtores_insert" ON public.produtores;
CREATE POLICY "produtores_insert_multi"
ON public.produtores FOR INSERT TO authenticated
WITH CHECK (
    empresa_id IN (SELECT public.get_user_empresas())
    AND public.get_my_level_in_empresa(empresa_id) >= 50
);

DROP POLICY IF EXISTS "produtores_update" ON public.produtores;
CREATE POLICY "produtores_update_multi"
ON public.produtores FOR UPDATE TO authenticated
USING (
    empresa_id IN (SELECT public.get_user_empresas())
    AND public.get_my_level_in_empresa(empresa_id) >= 50
);

DROP POLICY IF EXISTS "produtores_delete" ON public.produtores;
CREATE POLICY "produtores_delete_multi"
ON public.produtores FOR DELETE TO authenticated
USING (
    empresa_id IN (SELECT public.get_user_empresas())
    AND public.get_my_level_in_empresa(empresa_id) >= 80
);

-- ---- 10.4 TECNICOS ----
DROP POLICY IF EXISTS "tecnicos_select" ON public.tecnicos;
DROP POLICY IF EXISTS "Permitir tudo em tecnicos" ON public.tecnicos;
CREATE POLICY "tecnicos_select_multi"
ON public.tecnicos FOR SELECT TO authenticated
USING (empresa_id IN (SELECT public.get_user_empresas()));

DROP POLICY IF EXISTS "tecnicos_insert" ON public.tecnicos;
CREATE POLICY "tecnicos_insert_multi"
ON public.tecnicos FOR INSERT TO authenticated
WITH CHECK (
    empresa_id IN (SELECT public.get_user_empresas())
    AND public.get_my_level_in_empresa(empresa_id) >= 50
);

DROP POLICY IF EXISTS "tecnicos_update" ON public.tecnicos;
CREATE POLICY "tecnicos_update_multi"
ON public.tecnicos FOR UPDATE TO authenticated
USING (
    empresa_id IN (SELECT public.get_user_empresas())
    AND public.get_my_level_in_empresa(empresa_id) >= 50
);

DROP POLICY IF EXISTS "tecnicos_delete" ON public.tecnicos;
CREATE POLICY "tecnicos_delete_multi"
ON public.tecnicos FOR DELETE TO authenticated
USING (
    empresa_id IN (SELECT public.get_user_empresas())
    AND public.get_my_level_in_empresa(empresa_id) >= 80
);

-- ---- 10.5 CADASTRO_AVIARIOS ----
DROP POLICY IF EXISTS "aviarios_select" ON public.cadastro_aviarios;
DROP POLICY IF EXISTS "Permitir tudo em cadastro_aviarios" ON public.cadastro_aviarios;
CREATE POLICY "aviarios_select_multi"
ON public.cadastro_aviarios FOR SELECT TO authenticated
USING (empresa_id IN (SELECT public.get_user_empresas()));

DROP POLICY IF EXISTS "aviarios_insert" ON public.cadastro_aviarios;
CREATE POLICY "aviarios_insert_multi"
ON public.cadastro_aviarios FOR INSERT TO authenticated
WITH CHECK (
    empresa_id IN (SELECT public.get_user_empresas())
    AND public.get_my_level_in_empresa(empresa_id) >= 50
);

DROP POLICY IF EXISTS "aviarios_update" ON public.cadastro_aviarios;
CREATE POLICY "aviarios_update_multi"
ON public.cadastro_aviarios FOR UPDATE TO authenticated
USING (
    empresa_id IN (SELECT public.get_user_empresas())
    AND public.get_my_level_in_empresa(empresa_id) >= 50
);

DROP POLICY IF EXISTS "aviarios_delete" ON public.cadastro_aviarios;
CREATE POLICY "aviarios_delete_multi"
ON public.cadastro_aviarios FOR DELETE TO authenticated
USING (
    empresa_id IN (SELECT public.get_user_empresas())
    AND public.get_my_level_in_empresa(empresa_id) >= 80
);

-- ---- 10.6 SETUPS_AVIARIOS ----
DROP POLICY IF EXISTS "setups_select" ON public.setups_aviarios;
DROP POLICY IF EXISTS "Permitir tudo em setups_aviarios" ON public.setups_aviarios;
CREATE POLICY "setups_select_multi"
ON public.setups_aviarios FOR SELECT TO authenticated
USING (empresa_id IN (SELECT public.get_user_empresas()));

DROP POLICY IF EXISTS "setups_insert" ON public.setups_aviarios;
CREATE POLICY "setups_insert_multi"
ON public.setups_aviarios FOR INSERT TO authenticated
WITH CHECK (
    empresa_id IN (SELECT public.get_user_empresas())
    AND public.get_my_level_in_empresa(empresa_id) >= 50
);

DROP POLICY IF EXISTS "setups_update" ON public.setups_aviarios;
CREATE POLICY "setups_update_multi"
ON public.setups_aviarios FOR UPDATE TO authenticated
USING (
    empresa_id IN (SELECT public.get_user_empresas())
    AND public.get_my_level_in_empresa(empresa_id) >= 50
);

DROP POLICY IF EXISTS "setups_delete" ON public.setups_aviarios;
CREATE POLICY "setups_delete_multi"
ON public.setups_aviarios FOR DELETE TO authenticated
USING (
    empresa_id IN (SELECT public.get_user_empresas())
    AND public.get_my_level_in_empresa(empresa_id) >= 80
);

-- ---- 10.7 SETUPS_AVIARIOS_HISTORICO ----
DROP POLICY IF EXISTS "historico_select" ON public.setups_aviarios_historico;
CREATE POLICY "historico_select_multi"
ON public.setups_aviarios_historico FOR SELECT TO authenticated
USING (empresa_id IN (SELECT public.get_user_empresas()));

DROP POLICY IF EXISTS "historico_insert" ON public.setups_aviarios_historico;
CREATE POLICY "historico_insert_multi"
ON public.setups_aviarios_historico FOR INSERT TO authenticated
WITH CHECK (
    empresa_id IN (SELECT public.get_user_empresas())
    AND public.get_my_level_in_empresa(empresa_id) >= 50
);

DROP POLICY IF EXISTS "historico_delete" ON public.setups_aviarios_historico;
CREATE POLICY "historico_delete_multi"
ON public.setups_aviarios_historico FOR DELETE TO authenticated
USING (
    empresa_id IN (SELECT public.get_user_empresas())
    AND public.get_my_level_in_empresa(empresa_id) >= 80
);

-- ---- 10.8 IMPORTACOES ----
DROP POLICY IF EXISTS "importacoes_select" ON public.importacoes;
DROP POLICY IF EXISTS "Permitir tudo em importacoes" ON public.importacoes;
CREATE POLICY "importacoes_select_multi"
ON public.importacoes FOR SELECT TO authenticated
USING (empresa_id IN (SELECT public.get_user_empresas()));

DROP POLICY IF EXISTS "importacoes_insert" ON public.importacoes;
CREATE POLICY "importacoes_insert_multi"
ON public.importacoes FOR INSERT TO authenticated
WITH CHECK (
    empresa_id IN (SELECT public.get_user_empresas())
    AND public.get_my_level_in_empresa(empresa_id) >= 80
);

-- Permissões de schema
GRANT ALL ON public.empresas TO authenticated, service_role;
GRANT SELECT ON public.empresas TO anon;
GRANT ALL ON public.profiles TO authenticated, service_role;
GRANT ALL ON public.usuarios_empresas TO authenticated, service_role;
GRANT ALL ON public.setups_aviarios_historico TO authenticated, service_role;

-- ==============================================================================
-- 11. CONSULTA DE VALIDAÇÃO (Exibe o relatório dos acessos restaurados)
-- ==============================================================================
SELECT 
    COALESCE(p.full_name, split_part(au.email, '@', 1)) AS "USUÁRIO",
    au.email AS "EMAIL",
    au.id AS "UUID",
    COALESCE(p.role, 'sem_perfil') AS "ROLE",
    COALESCE(p.level, 0) AS "LEVEL",
    CASE WHEN EXISTS (
        SELECT 1 FROM public.usuarios_empresas ue 
        WHERE ue.user_id = au.id AND ue.empresa_id = 'e1100000-0000-0000-0000-000000000001'::uuid AND ue.ativo = true
    ) THEN '✓' ELSE '✗' END AS "BELLO",
    CASE WHEN EXISTS (
        SELECT 1 FROM public.usuarios_empresas ue 
        WHERE ue.user_id = au.id AND ue.empresa_id = 'e1100000-0000-0000-0000-000000000002'::uuid AND ue.ativo = true
    ) THEN '✓' ELSE '✗' END AS "LEVO",
    CASE WHEN EXISTS (
        SELECT 1 FROM public.usuarios_empresas ue 
        WHERE ue.user_id = au.id AND ue.empresa_id = 'e1100000-0000-0000-0000-000000000003'::uuid AND ue.ativo = true
    ) THEN '✓' ELSE '✗' END AS "FRANGO OURO",
    CASE WHEN EXISTS (
        SELECT 1 FROM public.usuarios_empresas ue 
        WHERE ue.user_id = au.id AND ue.empresa_id = 'e1100000-0000-0000-0000-000000000004'::uuid AND ue.ativo = true
    ) THEN '✓' ELSE '✗' END AS "PLUMA"
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
WHERE lower(trim(au.email)) IN (
    'lucas_zinatto@hotmail.com',
    'lucas.zinatto@belloalimentos.com.br',
    'joao.moraes@belloalimentos.com.br'
)
ORDER BY "LEVEL" DESC;
