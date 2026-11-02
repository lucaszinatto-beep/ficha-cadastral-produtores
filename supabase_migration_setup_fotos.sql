-- ==============================================================================
-- MIGRAÇÃO SUPABASE: EVIDÊNCIAS FOTOGRÁFICAS E OBSERVAÇÕES NO SETUP DE AVIÁRIOS
-- Executar no SQL Editor do projeto Supabase para habilitar armazenamento no banco
-- ==============================================================================

-- 1. Adicionar coluna fotos (JSONB) na tabela setups_aviarios caso não exista
ALTER TABLE IF EXISTS public.setups_aviarios 
ADD COLUMN IF NOT EXISTS fotos JSONB DEFAULT '[]'::jsonb;

-- 2. Garantir que a coluna observacoes exista na tabela setups_aviarios
ALTER TABLE IF EXISTS public.setups_aviarios 
ADD COLUMN IF NOT EXISTS observacoes TEXT;

-- 3. Adicionar coluna fotos no histórico de auditoria setups_aviarios_historico (opcional)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'setups_aviarios_historico') THEN
        ALTER TABLE public.setups_aviarios_historico ADD COLUMN IF NOT EXISTS fotos JSONB DEFAULT '[]'::jsonb;
    END IF;
END $$;

-- 4. Comentários para documentação de schema
COMMENT ON COLUMN public.setups_aviarios.fotos IS 'Lista de evidências fotográficas do setup do aviário (array JSON de {id, url, nome, tamanho, created_at})';
COMMENT ON COLUMN public.setups_aviarios.observacoes IS 'Observações técnicas específicas do setup do aviário';

