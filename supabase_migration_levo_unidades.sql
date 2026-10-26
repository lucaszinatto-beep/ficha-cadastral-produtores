-- ==============================================================================
-- MIGRAÇÃO DEFINITIVA: SUPORTE A UNIDADES NA LEVO ALIMENTOS
-- Unidades: LEVO_UMUARAMA e LEVO_CAPANEMA
-- Garante isolamento estrito de dados por empresa e por unidade
-- ==============================================================================

-- 1. ADICIONAR COLUNA unidade NAS TABELAS PRINCIPAIS (SE NÃO EXISTIR)
ALTER TABLE public.produtores 
  ADD COLUMN IF NOT EXISTS unidade TEXT;

ALTER TABLE public.cadastro_aviarios 
  ADD COLUMN IF NOT EXISTS unidade TEXT;

ALTER TABLE public.setups_aviarios 
  ADD COLUMN IF NOT EXISTS unidade TEXT;

ALTER TABLE public.importacoes 
  ADD COLUMN IF NOT EXISTS unidade TEXT;

ALTER TABLE public.usuario_empresa_painel 
  ADD COLUMN IF NOT EXISTS unidade TEXT;

ALTER TABLE public.usuarios_empresas 
  ADD COLUMN IF NOT EXISTS unidade TEXT;

-- Nota: a tabela public.tecnicos já possui a coluna unidade TEXT.

-- 2. CRIAÇÃO DE ÍNDICES OTIMIZADOS POR EMPRESA E UNIDADE
CREATE INDEX IF NOT EXISTS idx_produtores_empresa_unidade 
  ON public.produtores(empresa_id, unidade);

CREATE INDEX IF NOT EXISTS idx_cadastro_aviarios_empresa_unidade 
  ON public.cadastro_aviarios(empresa_id, unidade);

CREATE INDEX IF NOT EXISTS idx_tecnicos_empresa_unidade 
  ON public.tecnicos(empresa_id, unidade);

CREATE INDEX IF NOT EXISTS idx_setups_aviarios_empresa_unidade 
  ON public.setups_aviarios(empresa_id, unidade);

CREATE INDEX IF NOT EXISTS idx_importacoes_empresa_unidade 
  ON public.importacoes(empresa_id, unidade);

CREATE INDEX IF NOT EXISTS idx_uep_empresa_unidade 
  ON public.usuario_empresa_painel(empresa_id, unidade);

-- 3. AJUSTE DE CONSTRAINTS DE UNICIDADE MULTIEMPRESA E MULTIUNIDADE
-- Produtores: nome único por empresa e unidade
ALTER TABLE public.produtores DROP CONSTRAINT IF EXISTS produtores_nome_key;
CREATE UNIQUE INDEX IF NOT EXISTS uq_produtores_empresa_unidade_nome 
  ON public.produtores(empresa_id, COALESCE(unidade, ''), nome);

-- Técnicos: nome único por empresa e unidade
ALTER TABLE public.tecnicos DROP CONSTRAINT IF EXISTS tecnicos_nome_key;
CREATE UNIQUE INDEX IF NOT EXISTS uq_tecnicos_empresa_unidade_nome 
  ON public.tecnicos(empresa_id, COALESCE(unidade, ''), nome);

-- Vínculo de usuário no painel: único por user, empresa, painel e unidade
ALTER TABLE public.usuario_empresa_painel DROP CONSTRAINT IF EXISTS uq_user_empresa_painel;
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_empresa_painel_unidade 
  ON public.usuario_empresa_painel(user_id, empresa_id, painel_id, COALESCE(unidade, ''));

-- 4. ATUALIZAR POLÍTICAS DE ROW LEVEL SECURITY (RLS) COM ISOLAMENTO DE UNIDADE

-- PRODUTORES: SELECT
DROP POLICY IF EXISTS "produtores_select_policy" ON public.produtores;
CREATE POLICY "produtores_select_policy" ON public.produtores
FOR SELECT TO authenticated
USING (
  (EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.level >= 100
  ))
  OR (empresa_id IN (
    SELECT uep.empresa_id FROM public.usuario_empresa_painel uep
    WHERE uep.user_id = auth.uid() 
      AND uep.painel_id = 'ficha_cadastral' 
      AND uep.ativo = true
      AND (uep.unidade IS NULL OR produtores.unidade IS NULL OR uep.unidade = produtores.unidade)
  ))
  OR (empresa_id IN (
    SELECT ue.empresa_id FROM public.usuarios_empresas ue
    WHERE (ue.user_id = auth.uid()::text OR ue.usuario_id = auth.uid()::text) 
      AND ue.ativo = true
      AND (ue.unidade IS NULL OR produtores.unidade IS NULL OR ue.unidade = produtores.unidade)
  ))
);

-- PRODUTORES: INSERT
DROP POLICY IF EXISTS "produtores_insert_policy" ON public.produtores;
CREATE POLICY "produtores_insert_policy" ON public.produtores
FOR INSERT TO authenticated
WITH CHECK (
  empresa_id IS NOT NULL AND (
    (EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.level >= 100
    ))
    OR (empresa_id IN (
      SELECT uep.empresa_id FROM public.usuario_empresa_painel uep
      WHERE uep.user_id = auth.uid() 
        AND uep.painel_id = 'ficha_cadastral' 
        AND uep.ativo = true
        AND (uep.unidade IS NULL OR produtores.unidade IS NULL OR uep.unidade = produtores.unidade)
    ))
    OR (empresa_id IN (
      SELECT ue.empresa_id FROM public.usuarios_empresas ue
      WHERE (ue.user_id = auth.uid()::text OR ue.usuario_id = auth.uid()::text) 
        AND ue.ativo = true
        AND (ue.unidade IS NULL OR produtores.unidade IS NULL OR ue.unidade = produtores.unidade)
    ))
  )
);

-- PRODUTORES: UPDATE
DROP POLICY IF EXISTS "produtores_update_policy" ON public.produtores;
CREATE POLICY "produtores_update_policy" ON public.produtores
FOR UPDATE TO authenticated
USING (
  (EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.level >= 100
  ))
  OR (empresa_id IN (
    SELECT uep.empresa_id FROM public.usuario_empresa_painel uep
    WHERE uep.user_id = auth.uid() 
      AND uep.painel_id = 'ficha_cadastral' 
      AND uep.ativo = true
      AND (uep.unidade IS NULL OR produtores.unidade IS NULL OR uep.unidade = produtores.unidade)
  ))
  OR (empresa_id IN (
    SELECT ue.empresa_id FROM public.usuarios_empresas ue
    WHERE (ue.user_id = auth.uid()::text OR ue.usuario_id = auth.uid()::text) 
      AND ue.ativo = true
      AND (ue.unidade IS NULL OR produtores.unidade IS NULL OR ue.unidade = produtores.unidade)
  ))
)
WITH CHECK (
  empresa_id IS NOT NULL AND (
    (EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.level >= 100
    ))
    OR (empresa_id IN (
      SELECT uep.empresa_id FROM public.usuario_empresa_painel uep
      WHERE uep.user_id = auth.uid() 
        AND uep.painel_id = 'ficha_cadastral' 
        AND uep.ativo = true
        AND (uep.unidade IS NULL OR produtores.unidade IS NULL OR uep.unidade = produtores.unidade)
    ))
  )
);

-- PRODUTORES: DELETE
DROP POLICY IF EXISTS "produtores_delete_policy" ON public.produtores;
CREATE POLICY "produtores_delete_policy" ON public.produtores
FOR DELETE TO authenticated
USING (
  (EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.level >= 100
  ))
  OR (empresa_id IN (
    SELECT uep.empresa_id FROM public.usuario_empresa_painel uep
    WHERE uep.user_id = auth.uid() 
      AND uep.painel_id = 'ficha_cadastral' 
      AND uep.ativo = true
      AND (uep.unidade IS NULL OR produtores.unidade IS NULL OR uep.unidade = produtores.unidade)
  ))
);

-- CADASTRO_AVIARIOS: SELECT & ALL
DROP POLICY IF EXISTS "aviarios_select_policy" ON public.cadastro_aviarios;
CREATE POLICY "aviarios_select_policy" ON public.cadastro_aviarios
FOR SELECT TO authenticated
USING (
  (EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.level >= 100
  ))
  OR (empresa_id IN (
    SELECT uep.empresa_id FROM public.usuario_empresa_painel uep
    WHERE uep.user_id = auth.uid() 
      AND uep.painel_id = 'ficha_cadastral' 
      AND uep.ativo = true
      AND (uep.unidade IS NULL OR cadastro_aviarios.unidade IS NULL OR uep.unidade = cadastro_aviarios.unidade)
  ))
);

DROP POLICY IF EXISTS "aviarios_all_policy" ON public.cadastro_aviarios;
CREATE POLICY "aviarios_all_policy" ON public.cadastro_aviarios
FOR ALL TO authenticated
USING (
  (EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.level >= 100
  ))
  OR (empresa_id IN (
    SELECT uep.empresa_id FROM public.usuario_empresa_painel uep
    WHERE uep.user_id = auth.uid() 
      AND uep.painel_id = 'ficha_cadastral' 
      AND uep.ativo = true
      AND (uep.unidade IS NULL OR cadastro_aviarios.unidade IS NULL OR uep.unidade = cadastro_aviarios.unidade)
  ))
)
WITH CHECK (
  (EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.level >= 100
  ))
  OR (empresa_id IN (
    SELECT uep.empresa_id FROM public.usuario_empresa_painel uep
    WHERE uep.user_id = auth.uid() 
      AND uep.painel_id = 'ficha_cadastral' 
      AND uep.ativo = true
      AND (uep.unidade IS NULL OR cadastro_aviarios.unidade IS NULL OR uep.unidade = cadastro_aviarios.unidade)
  ))
);

-- TECNICOS: SELECT & ALL
DROP POLICY IF EXISTS "tecnicos_select_policy" ON public.tecnicos;
CREATE POLICY "tecnicos_select_policy" ON public.tecnicos
FOR SELECT TO authenticated
USING (
  (EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.level >= 100
  ))
  OR (empresa_id IN (
    SELECT uep.empresa_id FROM public.usuario_empresa_painel uep
    WHERE uep.user_id = auth.uid() 
      AND uep.painel_id = 'ficha_cadastral' 
      AND uep.ativo = true
      AND (uep.unidade IS NULL OR tecnicos.unidade IS NULL OR uep.unidade = tecnicos.unidade)
  ))
);

DROP POLICY IF EXISTS "tecnicos_all_policy" ON public.tecnicos;
CREATE POLICY "tecnicos_all_policy" ON public.tecnicos
FOR ALL TO authenticated
USING (
  (EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.level >= 100
  ))
  OR (empresa_id IN (
    SELECT uep.empresa_id FROM public.usuario_empresa_painel uep
    WHERE uep.user_id = auth.uid() 
      AND uep.painel_id = 'ficha_cadastral' 
      AND uep.ativo = true
      AND (uep.unidade IS NULL OR tecnicos.unidade IS NULL OR uep.unidade = tecnicos.unidade)
  ))
)
WITH CHECK (
  (EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.level >= 100
  ))
  OR (empresa_id IN (
    SELECT uep.empresa_id FROM public.usuario_empresa_painel uep
    WHERE uep.user_id = auth.uid() 
      AND uep.painel_id = 'ficha_cadastral' 
      AND uep.ativo = true
      AND (uep.unidade IS NULL OR tecnicos.unidade IS NULL OR uep.unidade = tecnicos.unidade)
  ))
);

-- SETUPS_AVIARIOS: SELECT & ALL
DROP POLICY IF EXISTS "setups_select_policy" ON public.setups_aviarios;
CREATE POLICY "setups_select_policy" ON public.setups_aviarios
FOR SELECT TO authenticated
USING (
  (EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.level >= 100
  ))
  OR (empresa_id IN (
    SELECT uep.empresa_id FROM public.usuario_empresa_painel uep
    WHERE uep.user_id = auth.uid() 
      AND uep.painel_id = 'ficha_cadastral' 
      AND uep.ativo = true
      AND (uep.unidade IS NULL OR setups_aviarios.unidade IS NULL OR uep.unidade = setups_aviarios.unidade)
  ))
);

DROP POLICY IF EXISTS "setups_all_policy" ON public.setups_aviarios;
CREATE POLICY "setups_all_policy" ON public.setups_aviarios
FOR ALL TO authenticated
USING (
  (EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.level >= 100
  ))
  OR (empresa_id IN (
    SELECT uep.empresa_id FROM public.usuario_empresa_painel uep
    WHERE uep.user_id = auth.uid() 
      AND uep.painel_id = 'ficha_cadastral' 
      AND uep.ativo = true
      AND (uep.unidade IS NULL OR setups_aviarios.unidade IS NULL OR uep.unidade = setups_aviarios.unidade)
  ))
)
WITH CHECK (
  (EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.level >= 100
  ))
  OR (empresa_id IN (
    SELECT uep.empresa_id FROM public.usuario_empresa_painel uep
    WHERE uep.user_id = auth.uid() 
      AND uep.painel_id = 'ficha_cadastral' 
      AND uep.ativo = true
      AND (uep.unidade IS NULL OR setups_aviarios.unidade IS NULL OR uep.unidade = setups_aviarios.unidade)
  ))
);

-- IMPORTACOES: SELECT & ALL
DROP POLICY IF EXISTS "importacoes_select_policy" ON public.importacoes;
CREATE POLICY "importacoes_select_policy" ON public.importacoes
FOR SELECT TO authenticated
USING (
  (EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.level >= 100
  ))
  OR (empresa_id IN (
    SELECT uep.empresa_id FROM public.usuario_empresa_painel uep
    WHERE uep.user_id = auth.uid() 
      AND uep.painel_id = 'ficha_cadastral' 
      AND uep.ativo = true
      AND (uep.unidade IS NULL OR importacoes.unidade IS NULL OR uep.unidade = importacoes.unidade)
  ))
);

DROP POLICY IF EXISTS "importacoes_all_policy" ON public.importacoes;
CREATE POLICY "importacoes_all_policy" ON public.importacoes
FOR ALL TO authenticated
USING (
  (EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.level >= 100
  ))
  OR (empresa_id IN (
    SELECT uep.empresa_id FROM public.usuario_empresa_painel uep
    WHERE uep.user_id = auth.uid() 
      AND uep.painel_id = 'ficha_cadastral' 
      AND uep.ativo = true
      AND (uep.unidade IS NULL OR importacoes.unidade IS NULL OR uep.unidade = importacoes.unidade)
  ))
)
WITH CHECK (
  (EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.level >= 100
  ))
  OR (empresa_id IN (
    SELECT uep.empresa_id FROM public.usuario_empresa_painel uep
    WHERE uep.user_id = auth.uid() 
      AND uep.painel_id = 'ficha_cadastral' 
      AND uep.ativo = true
      AND (uep.unidade IS NULL OR importacoes.unidade IS NULL OR uep.unidade = importacoes.unidade)
  ))
);
