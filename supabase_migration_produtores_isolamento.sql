-- ============================================================================
-- MIGRAÇÃO DE ISOLAMENTO DEFINITIVO DE PRODUTORES E OPERAÇÕES POR EMPRESA
-- Data: 2026-10-04
-- ============================================================================

-- 1. ADICIONAR COLUNA empresa_id NAS TABELAS OPERACIONAIS
ALTER TABLE public.produtores 
  ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES public.empresas(id) ON DELETE RESTRICT;

ALTER TABLE public.cadastro_aviarios 
  ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES public.empresas(id) ON DELETE RESTRICT;

ALTER TABLE public.tecnicos 
  ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES public.empresas(id) ON DELETE RESTRICT;

ALTER TABLE public.setups_aviarios 
  ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES public.empresas(id) ON DELETE RESTRICT;

ALTER TABLE public.importacoes 
  ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES public.empresas(id) ON DELETE RESTRICT;

-- 2. VINCULAR DADOS HISTÓRICOS EXCLUSIVAMENTE À BELLO ALIMENTOS ('e1100000-0000-0000-0000-000000000001')
UPDATE public.produtores 
SET empresa_id = 'e1100000-0000-0000-0000-000000000001' 
WHERE empresa_id IS NULL;

UPDATE public.cadastro_aviarios 
SET empresa_id = 'e1100000-0000-0000-0000-000000000001' 
WHERE empresa_id IS NULL;

UPDATE public.tecnicos 
SET empresa_id = 'e1100000-0000-0000-0000-000000000001' 
WHERE empresa_id IS NULL;

UPDATE public.setups_aviarios 
SET empresa_id = 'e1100000-0000-0000-0000-000000000001' 
WHERE empresa_id IS NULL;

UPDATE public.importacoes 
SET empresa_id = 'e1100000-0000-0000-0000-000000000001' 
WHERE empresa_id IS NULL;

-- 3. ÍNDICES DE PERFORMANCE PARA FILTRAGEM POR EMPRESA
CREATE INDEX IF NOT EXISTS idx_produtores_empresa_id ON public.produtores(empresa_id);
CREATE INDEX IF NOT EXISTS idx_cadastro_aviarios_empresa_id ON public.cadastro_aviarios(empresa_id);
CREATE INDEX IF NOT EXISTS idx_tecnicos_empresa_id ON public.tecnicos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_setups_aviarios_empresa_id ON public.setups_aviarios(empresa_id);
CREATE INDEX IF NOT EXISTS idx_importacoes_empresa_id ON public.importacoes(empresa_id);

-- 4. HABILITAR ROW LEVEL SECURITY (RLS)
ALTER TABLE public.produtores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cadastro_aviarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tecnicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.setups_aviarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.importacoes ENABLE ROW LEVEL SECURITY;

-- 5. REMOVER POLICIES PERMISSIVAS LEGADAS (Allow all access...)
DROP POLICY IF EXISTS "Allow all access to produtores" ON public.produtores;
DROP POLICY IF EXISTS "Allow all access to cadastro_aviarios" ON public.cadastro_aviarios;
DROP POLICY IF EXISTS "Allow all access to tecnicos" ON public.tecnicos;
DROP POLICY IF EXISTS "Allow all access to setups_aviarios" ON public.setups_aviarios;
DROP POLICY IF EXISTS "Allow all access to importacoes" ON public.importacoes;

-- 6. POLICIES COM ISOLAMENTO ESTRITO POR EMPRESA E AUTORIZAÇÃO DE USUÁRIO
-- PRODUTORES: Leitura
DROP POLICY IF EXISTS "produtores_select_policy" ON public.produtores;
CREATE POLICY "produtores_select_policy" ON public.produtores
FOR SELECT TO authenticated
USING (
  empresa_id IN (
    SELECT ue.empresa_id 
    FROM public.usuarios_empresas ue 
    WHERE (ue.user_id = auth.uid()::text OR ue.usuario_id = auth.uid()::text) AND ue.ativo = true
  )
  OR EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() AND p.level >= 100
  )
);

-- PRODUTORES: Inserção
DROP POLICY IF EXISTS "produtores_insert_policy" ON public.produtores;
CREATE POLICY "produtores_insert_policy" ON public.produtores
FOR INSERT TO authenticated
WITH CHECK (
  empresa_id IS NOT NULL 
  AND (
    empresa_id IN (
      SELECT ue.empresa_id 
      FROM public.usuarios_empresas ue 
      WHERE (ue.user_id = auth.uid()::text OR ue.usuario_id = auth.uid()::text) AND ue.ativo = true
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() AND p.level >= 100
    )
  )
);

-- PRODUTORES: Atualização
DROP POLICY IF EXISTS "produtores_update_policy" ON public.produtores;
CREATE POLICY "produtores_update_policy" ON public.produtores
FOR UPDATE TO authenticated
USING (
  empresa_id IN (
    SELECT ue.empresa_id 
    FROM public.usuarios_empresas ue 
    WHERE (ue.user_id = auth.uid()::text OR ue.usuario_id = auth.uid()::text) AND ue.ativo = true
  )
  OR EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() AND p.level >= 100
  )
)
WITH CHECK (
  empresa_id IN (
    SELECT ue.empresa_id 
    FROM public.usuarios_empresas ue 
    WHERE (ue.user_id = auth.uid()::text OR ue.usuario_id = auth.uid()::text) AND ue.ativo = true
  )
  OR EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() AND p.level >= 100
  )
);

-- PRODUTORES: Exclusão
DROP POLICY IF EXISTS "produtores_delete_policy" ON public.produtores;
CREATE POLICY "produtores_delete_policy" ON public.produtores
FOR DELETE TO authenticated
USING (
  empresa_id IN (
    SELECT ue.empresa_id 
    FROM public.usuarios_empresas ue 
    WHERE (ue.user_id = auth.uid()::text OR ue.usuario_id = auth.uid()::text) AND ue.ativo = true
  )
  OR EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() AND p.level >= 100
  )
);

-- CADASTRO_AVIARIOS
DROP POLICY IF EXISTS "aviarios_select_policy" ON public.cadastro_aviarios;
CREATE POLICY "aviarios_select_policy" ON public.cadastro_aviarios
FOR SELECT TO authenticated
USING (
  empresa_id IN (SELECT ue.empresa_id FROM public.usuarios_empresas ue WHERE (ue.user_id = auth.uid()::text OR ue.usuario_id = auth.uid()::text) AND ue.ativo = true)
  OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.level >= 100)
);

DROP POLICY IF EXISTS "aviarios_all_policy" ON public.cadastro_aviarios;
CREATE POLICY "aviarios_all_policy" ON public.cadastro_aviarios
FOR ALL TO authenticated
USING (
  empresa_id IN (SELECT ue.empresa_id FROM public.usuarios_empresas ue WHERE (ue.user_id = auth.uid()::text OR ue.usuario_id = auth.uid()::text) AND ue.ativo = true)
  OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.level >= 100)
)
WITH CHECK (
  empresa_id IN (SELECT ue.empresa_id FROM public.usuarios_empresas ue WHERE (ue.user_id = auth.uid()::text OR ue.usuario_id = auth.uid()::text) AND ue.ativo = true)
  OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.level >= 100)
);

-- TECNICOS
DROP POLICY IF EXISTS "tecnicos_select_policy" ON public.tecnicos;
CREATE POLICY "tecnicos_select_policy" ON public.tecnicos
FOR SELECT TO authenticated
USING (
  empresa_id IN (SELECT ue.empresa_id FROM public.usuarios_empresas ue WHERE (ue.user_id = auth.uid()::text OR ue.usuario_id = auth.uid()::text) AND ue.ativo = true)
  OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.level >= 100)
);

DROP POLICY IF EXISTS "tecnicos_all_policy" ON public.tecnicos;
CREATE POLICY "tecnicos_all_policy" ON public.tecnicos
FOR ALL TO authenticated
USING (
  empresa_id IN (SELECT ue.empresa_id FROM public.usuarios_empresas ue WHERE (ue.user_id = auth.uid()::text OR ue.usuario_id = auth.uid()::text) AND ue.ativo = true)
  OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.level >= 100)
)
WITH CHECK (
  empresa_id IN (SELECT ue.empresa_id FROM public.usuarios_empresas ue WHERE (ue.user_id = auth.uid()::text OR ue.usuario_id = auth.uid()::text) AND ue.ativo = true)
  OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.level >= 100)
);

-- SETUPS_AVIARIOS
DROP POLICY IF EXISTS "setups_select_policy" ON public.setups_aviarios;
CREATE POLICY "setups_select_policy" ON public.setups_aviarios
FOR SELECT TO authenticated
USING (
  empresa_id IN (SELECT ue.empresa_id FROM public.usuarios_empresas ue WHERE (ue.user_id = auth.uid()::text OR ue.usuario_id = auth.uid()::text) AND ue.ativo = true)
  OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.level >= 100)
);

DROP POLICY IF EXISTS "setups_all_policy" ON public.setups_aviarios;
CREATE POLICY "setups_all_policy" ON public.setups_aviarios
FOR ALL TO authenticated
USING (
  empresa_id IN (SELECT ue.empresa_id FROM public.usuarios_empresas ue WHERE (ue.user_id = auth.uid()::text OR ue.usuario_id = auth.uid()::text) AND ue.ativo = true)
  OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.level >= 100)
)
WITH CHECK (
  empresa_id IN (SELECT ue.empresa_id FROM public.usuarios_empresas ue WHERE (ue.user_id = auth.uid()::text OR ue.usuario_id = auth.uid()::text) AND ue.ativo = true)
  OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.level >= 100)
);

-- IMPORTACOES
DROP POLICY IF EXISTS "importacoes_select_policy" ON public.importacoes;
CREATE POLICY "importacoes_select_policy" ON public.importacoes
FOR SELECT TO authenticated
USING (
  empresa_id IN (SELECT ue.empresa_id FROM public.usuarios_empresas ue WHERE (ue.user_id = auth.uid()::text OR ue.usuario_id = auth.uid()::text) AND ue.ativo = true)
  OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.level >= 100)
);

DROP POLICY IF EXISTS "importacoes_all_policy" ON public.importacoes;
CREATE POLICY "importacoes_all_policy" ON public.importacoes
FOR ALL TO authenticated
USING (
  empresa_id IN (SELECT ue.empresa_id FROM public.usuarios_empresas ue WHERE (ue.user_id = auth.uid()::text OR ue.usuario_id = auth.uid()::text) AND ue.ativo = true)
  OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.level >= 100)
)
WITH CHECK (
  empresa_id IN (SELECT ue.empresa_id FROM public.usuarios_empresas ue WHERE (ue.user_id = auth.uid()::text OR ue.usuario_id = auth.uid()::text) AND ue.ativo = true)
  OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.level >= 100)
);

-- 7. RECARREGAR O SCHEMA CACHE DO POSTGREST
NOTIFY pgrst, 'reload schema';
