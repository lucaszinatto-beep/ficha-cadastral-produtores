-- ==============================================================================
-- RESTAURAÇÃO DE ACESSO MULTIEMPRESA: LUCAS ZINATTO & JOÃO MORAES
-- Execute este script no SQL Editor do Supabase:
-- https://supabase.com/dashboard/project/ebixhddonbiqtrsyvdry/sql/new
--
-- REGRAS:
-- 1. NÃO cria novos usuários no Auth (usa os UUIDs existentes em auth.users).
-- 2. NÃO apaga usuários nem altera senhas.
-- 3. NÃO altera produtores, aviários, fichas nem dados operacionais.
-- 4. NÃO abre RLS com USING (true).
-- 5. Restaura acesso total às 4 empresas:
--    - Bello Alimentos (e1100000-0000-0000-0000-000000000001)
--    - Levo Alimentos (e1100000-0000-0000-0000-000000000002)
--    - Frango Ouro (e1100000-0000-0000-0000-000000000003)
--    - Pluma Agroavícola (e1100000-0000-0000-0000-000000000004)
-- ==============================================================================

-- 0. Garantir extensão pgcrypto
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. TABELA DE EMPRESAS (Garantir que as 4 empresas oficiais existam)
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

INSERT INTO public.empresas (id, nome, slug, logo_path, cor_primaria, cor_secundaria, cor_destaque, ativo)
VALUES 
    (
        'e1100000-0000-0000-0000-000000000001'::uuid,
        'Bello Alimentos',
        'bello',
        '/logos/bello.png',
        '#1e40af',
        '#0284c7',
        '#38bdf8',
        true
    ),
    (
        'e1100000-0000-0000-0000-000000000002'::uuid,
        'Levo Alimentos',
        'levo',
        '/logos/levo.png',
        '#581c87',
        '#7e22ce',
        '#a855f7',
        true
    ),
    (
        'e1100000-0000-0000-0000-000000000003'::uuid,
        'Frango Ouro',
        'ouro',
        '/logos/frango_ouro.png',
        '#991b1b',
        '#b45309',
        '#f59e0b',
        true
    ),
    (
        'e1100000-0000-0000-0000-000000000004'::uuid,
        'Pluma Agroavícola',
        'pluma',
        '/logos/pluma.png',
        '#14382c',
        '#166534',
        '#eab308',
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
-- 2. TABELA PROFILES (Perfis associados ao auth.users)
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
-- 3. TABELA USUARIOS_EMPRESAS (Vínculos de acesso por empresa)
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
-- 4. RESTAURAÇÃO DOS PERFIS PARA USUÁRIOS EXISTENTES (auth.users)
-- ==============================================================================
-- 4.1 Inserir perfil para todos os auth.users que ainda não possuem profile
INSERT INTO public.profiles (id, full_name, role, level)
SELECT 
    au.id, 
    COALESCE(au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1)), 
    'admin', 
    80
FROM auth.users au
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = au.id)
ON CONFLICT (id) DO NOTHING;

-- 4.2 Preservar e Garantir Perfil Super Admin (Level 100) para Lucas Zinatto
-- Abrange tanto o e-mail de login (Hotmail) quanto o e-mail corporativo (Bello)
UPDATE public.profiles
SET 
    role = 'super_admin', 
    level = 100, 
    full_name = 'Lucas Zinatto',
    updated_at = now()
WHERE id IN (
    SELECT id FROM auth.users 
    WHERE lower(trim(email)) IN ('lucas_zinatto@hotmail.com', 'lucas.zinatto@belloalimentos.com.br')
);

-- 4.3 Preservar e Garantir Perfil Super Admin (Level 100) para João Moraes
UPDATE public.profiles
SET 
    role = 'super_admin', 
    level = 100, 
    full_name = 'João Moraes',
    updated_at = now()
WHERE id IN (
    SELECT id FROM auth.users 
    WHERE lower(trim(email)) = 'joao.moraes@belloalimentos.com.br'
);

-- ==============================================================================
-- 5. RESTAURAÇÃO DOS VÍNCULOS MULTIEMPRESA (usuarios_empresas)
-- ==============================================================================
-- 5.1 Vínculo com a Bello Alimentos para todos os usuários legados existentes
INSERT INTO public.usuarios_empresas (user_id, empresa_id, role, level, ativo)
SELECT 
    p.id,
    'e1100000-0000-0000-0000-000000000001'::uuid,
    p.role,
    p.level,
    true
FROM public.profiles p
ON CONFLICT (user_id, empresa_id) DO UPDATE 
SET role = EXCLUDED.role, level = EXCLUDED.level, ativo = true;

-- 5.2 Conceder acesso a TODAS as 4 EMPRESAS para Lucas Zinatto e João Moraes
INSERT INTO public.usuarios_empresas (user_id, empresa_id, role, level, ativo)
SELECT 
    au.id AS user_id,
    e.id AS empresa_id,
    'super_admin' AS role,
    100 AS level,
    true AS ativo
FROM auth.users au
CROSS JOIN public.empresas e
WHERE lower(trim(au.email)) IN (
    'lucas_zinatto@hotmail.com', 
    'lucas.zinatto@belloalimentos.com.br', 
    'joao.moraes@belloalimentos.com.br'
)
ON CONFLICT (user_id, empresa_id) DO UPDATE 
SET 
    role = 'super_admin', 
    level = 100, 
    ativo = true;

-- ==============================================================================
-- 6. PERMISSÕES DE SCHEMA (GRANTS) E POLÍTICAS RLS
-- ==============================================================================
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios_empresas ENABLE ROW LEVEL SECURITY;

-- 6.1 Políticas para empresas (leitura anônima para seleção inicial e autenticada)
DROP POLICY IF EXISTS "empresas_select_anon" ON public.empresas;
CREATE POLICY "empresas_select_anon" ON public.empresas FOR SELECT TO anon USING (ativo = true);

DROP POLICY IF EXISTS "empresas_select_auth" ON public.empresas;
CREATE POLICY "empresas_select_auth" ON public.empresas FOR SELECT TO authenticated USING (ativo = true);

-- 6.2 Políticas para profiles (leitura para usuários autenticados)
DROP POLICY IF EXISTS "profiles_select_authenticated" ON public.profiles;
CREATE POLICY "profiles_select_authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- 6.3 Políticas para usuarios_empresas
DROP POLICY IF EXISTS "usuarios_empresas_select" ON public.usuarios_empresas;
CREATE POLICY "usuarios_empresas_select" ON public.usuarios_empresas FOR SELECT TO authenticated
USING (
    user_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND (level >= 100 OR role = 'super_admin')
    )
);

-- Concessão de permissões
GRANT ALL ON public.empresas TO authenticated, service_role;
GRANT SELECT ON public.empresas TO anon;
GRANT ALL ON public.profiles TO authenticated, service_role;
GRANT ALL ON public.usuarios_empresas TO authenticated, service_role;

-- ==============================================================================
-- 7. CONSULTA DE VALIDAÇÃO (Exibe o relatório dos acessos restaurados)
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
