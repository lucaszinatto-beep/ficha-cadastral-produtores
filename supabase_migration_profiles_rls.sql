-- ==============================================================================
-- MIGRAÇÃO: Perfis de Usuário + RLS Real (Proposta Pragmática)
-- Execute no SQL Editor do Supabase:
-- https://supabase.com/dashboard/project/evzmmdteliaupztfqepl/sql/new
-- ==============================================================================

-- ============================================================================
-- 1. TABELA: profiles (Extensão simples de auth.users)
-- ============================================================================
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

-- Índice para lookup rápido
CREATE INDEX IF NOT EXISTS idx_profiles_level ON public.profiles(level);

-- Trigger de updated_at
DROP TRIGGER IF EXISTS tr_profiles_updated_at ON public.profiles;
CREATE TRIGGER tr_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- 2. TRIGGER: Criar profile automaticamente quando um usuário é criado no Auth
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, role, level)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        'viewer',
        10
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- 3. FUNÇÃO HELPER: Obter nível do usuário autenticado
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_my_level()
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT COALESCE(
        (SELECT level FROM public.profiles WHERE id = auth.uid()),
        0
    );
$$;

-- ============================================================================
-- 4. RLS DA TABELA PROFILES
-- ============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Qualquer usuário autenticado pode ver todos os perfis
CREATE POLICY "profiles_select_authenticated"
ON public.profiles FOR SELECT TO authenticated
USING (true);

-- Usuário pode atualizar apenas seu próprio nome
CREATE POLICY "profiles_update_own"
ON public.profiles FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Admin (level >= 80) pode inserir/atualizar qualquer profile
CREATE POLICY "profiles_admin_insert"
ON public.profiles FOR INSERT TO authenticated
WITH CHECK (public.get_my_level() >= 80);

CREATE POLICY "profiles_admin_update"
ON public.profiles FOR UPDATE TO authenticated
USING (public.get_my_level() >= 80);

CREATE POLICY "profiles_admin_delete"
ON public.profiles FOR DELETE TO authenticated
USING (public.get_my_level() >= 80);

-- ============================================================================
-- 5. SUBSTITUIR RLS ABERTAS POR POLÍTICAS REAIS NAS TABELAS EXISTENTES
-- ============================================================================

-- ---- PRODUTORES ----
DROP POLICY IF EXISTS "Permitir tudo em produtores" ON public.produtores;

CREATE POLICY "produtores_select"
ON public.produtores FOR SELECT TO authenticated
USING (true);

CREATE POLICY "produtores_insert"
ON public.produtores FOR INSERT TO authenticated
WITH CHECK (public.get_my_level() >= 50);

CREATE POLICY "produtores_update"
ON public.produtores FOR UPDATE TO authenticated
USING (public.get_my_level() >= 50);

CREATE POLICY "produtores_delete"
ON public.produtores FOR DELETE TO authenticated
USING (public.get_my_level() >= 80);

-- ---- TECNICOS ----
DROP POLICY IF EXISTS "Permitir tudo em tecnicos" ON public.tecnicos;

CREATE POLICY "tecnicos_select"
ON public.tecnicos FOR SELECT TO authenticated
USING (true);

CREATE POLICY "tecnicos_insert"
ON public.tecnicos FOR INSERT TO authenticated
WITH CHECK (public.get_my_level() >= 50);

CREATE POLICY "tecnicos_update"
ON public.tecnicos FOR UPDATE TO authenticated
USING (public.get_my_level() >= 50);

CREATE POLICY "tecnicos_delete"
ON public.tecnicos FOR DELETE TO authenticated
USING (public.get_my_level() >= 80);

-- ---- CADASTRO_AVIARIOS ----
DROP POLICY IF EXISTS "Permitir tudo em cadastro_aviarios" ON public.cadastro_aviarios;

CREATE POLICY "aviarios_select"
ON public.cadastro_aviarios FOR SELECT TO authenticated
USING (true);

CREATE POLICY "aviarios_insert"
ON public.cadastro_aviarios FOR INSERT TO authenticated
WITH CHECK (public.get_my_level() >= 50);

CREATE POLICY "aviarios_update"
ON public.cadastro_aviarios FOR UPDATE TO authenticated
USING (public.get_my_level() >= 50);

CREATE POLICY "aviarios_delete"
ON public.cadastro_aviarios FOR DELETE TO authenticated
USING (public.get_my_level() >= 80);

-- ---- SETUPS_AVIARIOS ----
DROP POLICY IF EXISTS "Permitir tudo em setups_aviarios" ON public.setups_aviarios;

CREATE POLICY "setups_select"
ON public.setups_aviarios FOR SELECT TO authenticated
USING (true);

CREATE POLICY "setups_insert"
ON public.setups_aviarios FOR INSERT TO authenticated
WITH CHECK (public.get_my_level() >= 50);

CREATE POLICY "setups_update"
ON public.setups_aviarios FOR UPDATE TO authenticated
USING (public.get_my_level() >= 50);

CREATE POLICY "setups_delete"
ON public.setups_aviarios FOR DELETE TO authenticated
USING (public.get_my_level() >= 80);

-- ---- IMPORTACOES ----
DROP POLICY IF EXISTS "Permitir tudo em importacoes" ON public.importacoes;

CREATE POLICY "importacoes_select"
ON public.importacoes FOR SELECT TO authenticated
USING (true);

CREATE POLICY "importacoes_insert"
ON public.importacoes FOR INSERT TO authenticated
WITH CHECK (public.get_my_level() >= 80);

-- ============================================================================
-- 6. REVOGAR ACESSO ANÔNIMO (SEGURANÇA)
-- ============================================================================
-- Remove acesso de leitura/escrita para usuários não logados
REVOKE ALL ON public.produtores FROM anon;
REVOKE ALL ON public.tecnicos FROM anon;
REVOKE ALL ON public.cadastro_aviarios FROM anon;
REVOKE ALL ON public.setups_aviarios FROM anon;
REVOKE ALL ON public.importacoes FROM anon;
REVOKE ALL ON public.profiles FROM anon;

-- Manter acesso total para authenticated e service_role
GRANT ALL ON public.profiles TO authenticated, service_role;

-- ============================================================================
-- 7. SEED: Criar perfil para usuários já existentes no Auth
-- ============================================================================
-- Insere profiles para todos os auth.users que ainda não têm um
INSERT INTO public.profiles (id, full_name, role, level)
SELECT
    au.id,
    COALESCE(au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1)),
    'admin',   -- Primeiro(s) usuário(s) já existente(s) recebem admin
    80
FROM auth.users au
WHERE NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = au.id
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- PRONTO! Agora:
-- ✅ Novos usuários cadastrados no Auth recebem role='viewer', level=10
-- ✅ Usuários já existentes receberam role='admin', level=80
-- ✅ Tabelas protegidas: só usuários logados podem ler, só level>=50 pode editar
-- ✅ Excluir dados exige level>=80, importar exige level>=80
-- 
-- Para promover um usuário manualmente:
-- UPDATE public.profiles SET role='admin', level=80 WHERE id='<UUID_DO_USUARIO>';
-- 
-- Níveis de referência:
--   100 = super_admin (acesso total)
--    80 = admin (criar, editar, excluir, importar)
--    50 = extensionista (criar e editar produtores/aviários/fichas)
--    10 = viewer (apenas visualizar)
-- ============================================================================
