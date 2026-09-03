-- ==============================================================================
-- MIGRAÇÃO: Auditoria e Histórico de Versões da Ficha Técnica (Setup de Aviários)
-- Execute este script no SQL Editor do seu projeto Supabase:
-- https://supabase.com/dashboard/project/evzmmdteliaupztfqepl/sql/new
-- ==============================================================================

-- 1. Adicionar colunas de autoria em setups_aviarios (se ainda não existirem)
ALTER TABLE public.setups_aviarios 
    ADD COLUMN IF NOT EXISTS created_by_id UUID,
    ADD COLUMN IF NOT EXISTS created_by_name TEXT,
    ADD COLUMN IF NOT EXISTS updated_by_id UUID,
    ADD COLUMN IF NOT EXISTS updated_by_name TEXT;

-- 2. Criar a tabela de histórico de versões e auditoria
CREATE TABLE IF NOT EXISTS public.setups_aviarios_historico (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aviario_id UUID NOT NULL REFERENCES public.cadastro_aviarios(id) ON DELETE CASCADE,
    setup_id UUID REFERENCES public.setups_aviarios(id) ON DELETE CASCADE,
    versao INTEGER NOT NULL DEFAULT 1,
    tipo_acao TEXT NOT NULL DEFAULT 'EDICAO', -- 'CRIACAO', 'EDICAO', 'RESTAURACAO'
    usuario_id UUID,
    usuario_nome TEXT NOT NULL,
    usuario_email TEXT,
    dados_snapshot JSONB NOT NULL,
    alteracoes JSONB DEFAULT '[]'::jsonb,
    resumo_alteracoes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Índices de performance para busca rápida pelo aviário e ordenação cronológica
CREATE INDEX IF NOT EXISTS idx_setups_historico_aviario 
    ON public.setups_aviarios_historico(aviario_id, versao DESC);

CREATE INDEX IF NOT EXISTS idx_setups_historico_created_at 
    ON public.setups_aviarios_historico(created_at DESC);

-- 4. Habilitar Row Level Security (RLS)
ALTER TABLE public.setups_aviarios_historico ENABLE ROW LEVEL SECURITY;

-- 5. Políticas RLS
-- Leitura permitida para qualquer usuário autenticado
DROP POLICY IF EXISTS "historico_select" ON public.setups_aviarios_historico;
CREATE POLICY "historico_select"
ON public.setups_aviarios_historico FOR SELECT TO authenticated
USING (true);

-- Inserção permitida para usuários autenticados com nível >= 50 (extensionistas e administradores)
DROP POLICY IF EXISTS "historico_insert" ON public.setups_aviarios_historico;
CREATE POLICY "historico_insert"
ON public.setups_aviarios_historico FOR INSERT TO authenticated
WITH CHECK (
    -- Permite se existir função get_my_level() ou fallback para true
    EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_my_level') AND public.get_my_level() >= 50
    OR NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_my_level')
);

-- Exclusão restrita apenas para administradores (level >= 80) se necessário
DROP POLICY IF EXISTS "historico_delete" ON public.setups_aviarios_historico;
CREATE POLICY "historico_delete"
ON public.setups_aviarios_historico FOR DELETE TO authenticated
USING (
    EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_my_level') AND public.get_my_level() >= 80
);

-- Conceder permissões para roles authenticated e service_role
GRANT ALL ON public.setups_aviarios_historico TO authenticated, service_role;
