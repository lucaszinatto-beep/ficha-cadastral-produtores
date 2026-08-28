-- ==============================================================================
-- SCHEMA SUPABASE: Ficha Cadastral de Produtores & Setup de Granjas (Bello Alimentos)
-- Execute este script no SQL Editor do seu projeto Supabase:
-- https://supabase.com/dashboard/project/evzmmdteliaupztfqepl/sql/new
-- ==============================================================================

-- 1. Extensões
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. TABELAS PRINCIPAIS
-- ==============================================================================

-- Tabela: produtores
CREATE TABLE IF NOT EXISTS public.produtores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL UNIQUE,
    codigo_avicultor TEXT,
    municipio TEXT,
    telefone TEXT,
    email TEXT,
    status TEXT DEFAULT 'Ativo',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela: tecnicos
CREATE TABLE IF NOT EXISTS public.tecnicos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL UNIQUE,
    telefone TEXT,
    email TEXT,
    unidade TEXT,
    status TEXT DEFAULT 'Ativo',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela: cadastro_aviarios
CREATE TABLE IF NOT EXISTS public.cadastro_aviarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    produtor_id UUID NOT NULL REFERENCES public.produtores(id) ON DELETE CASCADE,
    tecnico_id UUID REFERENCES public.tecnicos(id) ON DELETE SET NULL,
    numero_instalacao TEXT NOT NULL,
    nucleo TEXT,
    capacidade INTEGER,
    area_m2 NUMERIC,
    densidade NUMERIC,
    status TEXT DEFAULT 'Ativo',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT unique_produtor_instalacao UNIQUE (produtor_id, numero_instalacao)
);

-- Tabela: setups_aviarios
CREATE TABLE IF NOT EXISTS public.setups_aviarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aviario_id UUID NOT NULL UNIQUE REFERENCES public.cadastro_aviarios(id) ON DELETE CASCADE,
    
    -- Pressão de Vedação
    pressao_vedacao_exaustor NUMERIC,
    pressao_vedacao_manometro NUMERIC,
    pressao_vedacao_painel NUMERIC,
    pressao_vedacao_media NUMERIC,
    
    -- Pressão de Trabalho
    pressao_trabalho_exaustor NUMERIC,
    pressao_trabalho_manometro NUMERIC,
    pressao_trabalho_painel NUMERIC,
    pressao_trabalho_media NUMERIC,
    
    -- Ventilação Total
    ventilacao_dir NUMERIC,
    ventilacao_meio NUMERIC,
    ventilacao_esq NUMERIC,
    ventilacao_media NUMERIC,
    
    -- Quantidade de Exaustores
    qtd_exaustores NUMERIC,
    
    -- Ventilação Entrada de Ar
    vent_ar_l1_p1 NUMERIC,
    vent_ar_l1_p2 NUMERIC,
    vent_ar_l1_p3 NUMERIC,
    vent_ar_l2_p1 NUMERIC,
    vent_ar_l2_p2 NUMERIC,
    vent_ar_l2_p3 NUMERIC,
    vent_ar_media NUMERIC,
    entrada_ar_direito TEXT,
    entrada_ar_esquerdo TEXT,
    
    -- Iluminação / Lux
    iluminacao_sob_lampada NUMERIC,
    iluminacao_lateral NUMERIC,
    iluminacao_triangulo NUMERIC,
    lux_100 NUMERIC,
    
    -- Placa Evaporativa
    tamanho_placa NUMERIC,
    tempo_molhar_placa NUMERIC,
    
    -- Dimensões do Galpão
    altura_frente NUMERIC,
    altura_meio NUMERIC,
    altura_fundo NUMERIC,
    altura_media NUMERIC,
    comprimento_galpao NUMERIC,
    largura_galpao NUMERIC,
    
    -- Recursos Hídricos
    vazao_poco_1 NUMERIC,
    vazao_poco_2 NUMERIC,
    entrada_agua_galpao NUMERIC,
    armazenamento_agua NUMERIC,
    
    -- Alarmes
    alarme_casa BOOLEAN DEFAULT false,
    alarme_casa_func BOOLEAN DEFAULT false,
    alarme_aviario BOOLEAN DEFAULT false,
    alarme_aviario_func BOOLEAN DEFAULT false,
    alarme_caixas BOOLEAN DEFAULT false,
    alarme_caixas_func BOOLEAN DEFAULT false,
    
    observacoes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela: importacoes (Histórico de logs de importação)
CREATE TABLE IF NOT EXISTS public.importacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome_arquivo TEXT NOT NULL,
    aba_origem TEXT NOT NULL,
    total_registros INTEGER DEFAULT 0,
    produtores_criados INTEGER DEFAULT 0,
    produtores_atualizados INTEGER DEFAULT 0,
    aviarios_criados INTEGER DEFAULT 0,
    aviarios_atualizados INTEGER DEFAULT 0,
    tecnicos_criados INTEGER DEFAULT 0,
    tecnicos_atualizados INTEGER DEFAULT 0,
    setups_criados INTEGER DEFAULT 0,
    setups_atualizados INTEGER DEFAULT 0,
    registros_com_erro INTEGER DEFAULT 0,
    erros_json JSONB,
    importado_por TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ==============================================================================
-- 3. ÍNDICES DE DESEMPENHO
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_produtores_nome ON public.produtores(nome);
CREATE INDEX IF NOT EXISTS idx_tecnicos_nome ON public.tecnicos(nome);
CREATE INDEX IF NOT EXISTS idx_aviarios_produtor ON public.cadastro_aviarios(produtor_id);
CREATE INDEX IF NOT EXISTS idx_aviarios_tecnico ON public.cadastro_aviarios(tecnico_id);
CREATE INDEX IF NOT EXISTS idx_setups_aviario ON public.setups_aviarios(aviario_id);
CREATE INDEX IF NOT EXISTS idx_importacoes_created_at ON public.importacoes(created_at DESC);

-- ==============================================================================
-- 4. FUNÇÃO & TRIGGERS PARA UPDATED_AT AUTOMÁTICO
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS tr_produtores_updated_at ON public.produtores;
CREATE TRIGGER tr_produtores_updated_at
    BEFORE UPDATE ON public.produtores
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS tr_tecnicos_updated_at ON public.tecnicos;
CREATE TRIGGER tr_tecnicos_updated_at
    BEFORE UPDATE ON public.tecnicos
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS tr_cadastro_aviarios_updated_at ON public.cadastro_aviarios;
CREATE TRIGGER tr_cadastro_aviarios_updated_at
    BEFORE UPDATE ON public.cadastro_aviarios
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS tr_setups_aviarios_updated_at ON public.setups_aviarios;
CREATE TRIGGER tr_setups_aviarios_updated_at
    BEFORE UPDATE ON public.setups_aviarios
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- 5. ROW LEVEL SECURITY (RLS) & PERMISSÕES
-- ==============================================================================
ALTER TABLE public.produtores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tecnicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cadastro_aviarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.setups_aviarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.importacoes ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso irrestrito para os clientes anon e authenticated
DROP POLICY IF EXISTS "Permitir tudo em produtores" ON public.produtores;
CREATE POLICY "Permitir tudo em produtores" ON public.produtores FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir tudo em tecnicos" ON public.tecnicos;
CREATE POLICY "Permitir tudo em tecnicos" ON public.tecnicos FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir tudo em cadastro_aviarios" ON public.cadastro_aviarios;
CREATE POLICY "Permitir tudo em cadastro_aviarios" ON public.cadastro_aviarios FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir tudo em setups_aviarios" ON public.setups_aviarios;
CREATE POLICY "Permitir tudo em setups_aviarios" ON public.setups_aviarios FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir tudo em importacoes" ON public.importacoes;
CREATE POLICY "Permitir tudo em importacoes" ON public.importacoes FOR ALL USING (true) WITH CHECK (true);

-- Concessão explícita de permissões
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
