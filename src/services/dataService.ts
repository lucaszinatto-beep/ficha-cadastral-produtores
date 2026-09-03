import { supabase } from './supabase';
import { Produtor, Tecnico, Aviario, SetupAviario, SetupHistorico, SetupCampoAlterado } from '../types/database';
import { UserProfile } from './profileService';

export async function validateSupabaseConnection(): Promise<{
  isValid: boolean;
  error?: string;
  counts?: { produtores: number; aviarios: number; tecnicos: number };
}> {
  try {
    const { count: prodCount, error: prodErr } = await supabase
      .from('produtores')
      .select('*', { count: 'exact', head: true });

    if (prodErr) {
      return { isValid: false, error: `Erro ao acessar tabela 'produtores': ${prodErr.message}` };
    }

    const { count: avCount, error: avErr } = await supabase
      .from('cadastro_aviarios')
      .select('*', { count: 'exact', head: true });

    if (avErr) {
      return { isValid: false, error: `Erro ao acessar tabela 'cadastro_aviarios': ${avErr.message}` };
    }

    const { count: tecCount, error: tecErr } = await supabase
      .from('tecnicos')
      .select('*', { count: 'exact', head: true });

    if (tecErr) {
      return { isValid: false, error: `Erro ao acessar tabela 'tecnicos': ${tecErr.message}` };
    }

    return {
      isValid: true,
      counts: {
        produtores: prodCount || 0,
        aviarios: avCount || 0,
        tecnicos: tecCount || 0
      }
    };
  } catch (err: any) {
    return { isValid: false, error: err?.message || 'Falha ao conectar no Supabase' };
  }
}

export async function fetchProdutores(): Promise<Produtor[]> {
  const { data, error } = await supabase
    .from('produtores')
    .select('*')
    .order('nome', { ascending: true });

  if (error) {
    console.error('Erro ao buscar produtores:', error);
    throw error;
  }
  return data || [];
}

export async function fetchTecnicos(): Promise<Tecnico[]> {
  const { data, error } = await supabase
    .from('tecnicos')
    .select('*')
    .order('nome', { ascending: true });

  if (error) {
    console.error('Erro ao buscar técnicos:', error);
    throw error;
  }
  return data || [];
}

export async function fetchAviarios(): Promise<Aviario[]> {
  const { data, error } = await supabase
    .from('cadastro_aviarios')
    .select(`
      *,
      produtor:produtores(*),
      tecnico:tecnicos(*),
      setup:setups_aviarios(*)
    `)
    .order('numero_instalacao', { ascending: true });

  if (error) {
    console.error('Erro ao buscar aviários:', error);
    throw error;
  }
  return (data || []) as Aviario[];
}

export async function fetchAviariosByProdutor(produtorId: string): Promise<Aviario[]> {
  const { data, error } = await supabase
    .from('cadastro_aviarios')
    .select(`
      *,
      produtor:produtores(*),
      tecnico:tecnicos(*),
      setup:setups_aviarios(*)
    `)
    .eq('produtor_id', produtorId)
    .order('numero_instalacao', { ascending: true });

  if (error) {
    console.error('Erro ao buscar aviários por produtor:', error);
    throw error;
  }
  return (data || []) as Aviario[];
}

export const SETUP_FIELD_LABELS: Record<string, string> = {
  pressao_vedacao_exaustor: 'Pressão Vedação - Nº Exaustor',
  pressao_vedacao_manometro: 'Pressão Vedação - Manômetro',
  pressao_vedacao_painel: 'Pressão Vedação - Painel',
  pressao_vedacao_media: 'Pressão Vedação - Média',
  pressao_trabalho_exaustor: 'Pressão Trabalho - Nº Exaustor',
  pressao_trabalho_manometro: 'Pressão Trabalho - Manômetro',
  pressao_trabalho_painel: 'Pressão Trabalho - Painel',
  pressao_trabalho_media: 'Pressão Trabalho - Média',
  ventilacao_dir: 'Ventilação Total - Lateral Dir.',
  ventilacao_meio: 'Ventilação Total - Meio',
  ventilacao_esq: 'Ventilação Total - Lateral Esq.',
  ventilacao_media: 'Ventilação Total - Média',
  qtd_exaustores: 'Qtd. Exaustores',
  vent_ar_l1_p1: 'Entrada Ar L1 (Fornos) - P1 Frente',
  vent_ar_l1_p2: 'Entrada Ar L1 (Fornos) - P2 Centro',
  vent_ar_l1_p3: 'Entrada Ar L1 (Fornos) - P3 Fundo',
  vent_ar_l2_p1: 'Entrada Ar L2 - P1 Frente',
  vent_ar_l2_p2: 'Entrada Ar L2 - P2 Centro',
  vent_ar_l2_p3: 'Entrada Ar L2 - P3 Fundo',
  vent_ar_media: 'Média Entrada de Ar',
  entrada_ar_direito: 'Entrada Ar Direito',
  entrada_ar_esquerdo: 'Entrada Ar Esquerdo',
  iluminacao_sob_lampada: 'Iluminação - Sob Lâmpada',
  iluminacao_lateral: 'Iluminação - Lateral',
  iluminacao_triangulo: 'Iluminação - Triângulo',
  lux_100: 'Iluminação - LUX 100%',
  tamanho_placa: 'Placa Evaporativa - Tamanho',
  tempo_molhar_placa: 'Placa Evaporativa - Tempo Molhar',
  altura_frente: 'Dimensões - Altura Frente',
  altura_meio: 'Dimensões - Altura Meio',
  altura_fundo: 'Dimensões - Altura Fundo',
  altura_media: 'Dimensões - Altura Média',
  comprimento_galpao: 'Dimensões - Comprimento',
  largura_galpao: 'Dimensões - Largura',
  vazao_poco_1: 'Recursos Hídricos - Poço 1',
  vazao_poco_2: 'Recursos Hídricos - Poço 2',
  entrada_agua_galpao: 'Recursos Hídricos - Entrada Galpão',
  armazenamento_agua: 'Recursos Hídricos - Armazenamento',
  alarme_casa: 'Alarme Casa (Possui)',
  alarme_casa_func: 'Alarme Casa (Funcionando)',
  alarme_aviario: 'Alarme Aviário (Possui)',
  alarme_aviario_func: 'Alarme Aviário (Funcionando)',
  alarme_caixas: 'Alarme Caixas Central (Possui)',
  alarme_caixas_func: 'Alarme Caixas Central (Funcionando)',
  observacoes: 'Observações'
};

function formatAuditVal(val: any): string {
  if (val === null || val === undefined || val === '') return 'Vazio';
  if (val === true) return 'SIM';
  if (val === false) return 'NÃO';
  return String(val);
}

const LOCAL_STORAGE_HIST_PREFIX = 'bello_audit_historico_';

function getLocalHistorico(aviarioId: string): SetupHistorico[] {
  try {
    const raw = localStorage.getItem(`${LOCAL_STORAGE_HIST_PREFIX}${aviarioId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalHistorico(aviarioId: string, historico: SetupHistorico[]): void {
  try {
    localStorage.setItem(`${LOCAL_STORAGE_HIST_PREFIX}${aviarioId}`, JSON.stringify(historico));
  } catch (e) {
    console.warn('Erro ao salvar histórico no localStorage:', e);
  }
}

export async function fetchSetupHistorico(aviarioId: string): Promise<SetupHistorico[]> {
  const localList = getLocalHistorico(aviarioId);

  try {
    const { data, error } = await supabase
      .from('setups_aviarios_historico')
      .select('*')
      .eq('aviario_id', aviarioId)
      .order('versao', { ascending: false });

    if (error) {
      // Se a tabela ainda não existir no Supabase, usa o fallback local
      console.warn('Histórico Supabase indisponível (usando local):', error.message);
      return localList.sort((a, b) => b.versao - a.versao);
    }

    if (data && data.length > 0) {
      // Sincroniza com local para acesso offline rápido
      saveLocalHistorico(aviarioId, data as SetupHistorico[]);
      return data as SetupHistorico[];
    }
  } catch (err) {
    console.warn('Falha na consulta ao histórico do Supabase:', err);
  }

  return localList.sort((a, b) => b.versao - a.versao);
}

export async function saveSetupData(
  aviarioId: string, 
  payload: Partial<SetupAviario>,
  userProfile?: UserProfile | null,
  tipoAcaoOverride?: 'CRIACAO' | 'EDICAO' | 'RESTAURACAO',
  resumoCustomizado?: string
): Promise<SetupAviario> {
  // 1. Obter registro atual completo antes de alterar
  const { data: existing } = await supabase
    .from('setups_aviarios')
    .select('*')
    .eq('aviario_id', aviarioId)
    .maybeSingle();

  // 2. Identificar usuário atual
  let currentUserId = userProfile?.id || null;
  let currentUserName = userProfile?.full_name || '';
  let currentUserEmail: string | null = null;

  if (!currentUserName) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        currentUserId = user.id;
        currentUserEmail = user.email || null;
        currentUserName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuário';
      }
    } catch {
      // continua com fallback
    }
  }

  if (!currentUserName) currentUserName = 'Usuário do Sistema';

  // 3. Verificar se é primeiro cadastro do aviário
  const hasExistingData = existing && Object.keys(SETUP_FIELD_LABELS).some(k => (existing as any)[k] !== null && (existing as any)[k] !== undefined);
  const isInitial = !hasExistingData;

  const tipoAcao = tipoAcaoOverride || (isInitial ? 'CRIACAO' : 'EDICAO');

  // 4. Calcular diferenças (o que gravou / o que ajustou)
  const alteracoes: SetupCampoAlterado[] = [];
  
  if (tipoAcao === 'CRIACAO') {
    Object.keys(SETUP_FIELD_LABELS).forEach(field => {
      const val = (payload as any)[field];
      if (val !== undefined && val !== null && val !== '') {
        alteracoes.push({
          campo: field,
          label: SETUP_FIELD_LABELS[field] || field,
          valor_anterior: null,
          valor_novo: val
        });
      }
    });
  } else {
    // É ajuste ou restauração: comparar campo a campo
    Object.keys(SETUP_FIELD_LABELS).forEach(field => {
      const oldVal = (existing as any)?.[field] ?? null;
      const newVal = (payload as any)[field] ?? null;

      // Normaliza comparação (trata null e undefined de forma idêntica)
      const oldNorm = (oldVal === '' || oldVal === undefined) ? null : oldVal;
      const newNorm = (newVal === '' || newVal === undefined) ? null : newVal;

      if (oldNorm !== newNorm) {
        alteracoes.push({
          campo: field,
          label: SETUP_FIELD_LABELS[field] || field,
          valor_anterior: oldNorm,
          valor_novo: newNorm
        });
      }
    });
  }

  // 5. Construir resumo legível das alterações
  let resumo = resumoCustomizado || '';
  if (!resumo) {
    if (tipoAcao === 'CRIACAO') {
      resumo = `Cadastro inicial da Ficha Técnica (${alteracoes.length} parâmetros informados)`;
    } else if (tipoAcao === 'RESTAURACAO') {
      resumo = `Restauração de versão anterior (${alteracoes.length} parâmetros ajustados)`;
    } else {
      if (alteracoes.length === 0) {
        resumo = 'Ficha salva sem alterações nos parâmetros técnicos.';
      } else {
        const amostra = alteracoes.slice(0, 3).map(a => 
          `${a.label}: ${formatAuditVal(a.valor_anterior)} → ${formatAuditVal(a.valor_novo)}`
        ).join(' | ');
        const extra = alteracoes.length > 3 ? ` (+${alteracoes.length - 3} outros campos)` : '';
        resumo = `Ajustou ${alteracoes.length} campo(s): ${amostra}${extra}`;
      }
    }
  }

  // 6. Preparar payload de atualização para setups_aviarios
  const nowIso = new Date().toISOString();
  const cleanPayload: any = {
    ...payload,
    aviario_id: aviarioId,
    updated_at: nowIso,
    updated_by_id: currentUserId,
    updated_by_name: currentUserName
  };

  if (isInitial || !existing?.created_by_name) {
    cleanPayload.created_by_id = currentUserId;
    cleanPayload.created_by_name = currentUserName;
  }

  // Remove campos que não pertencem à tabela setups_aviarios
  delete cleanPayload.produtor;
  delete cleanPayload.tecnico;
  delete cleanPayload.setup;

  let savedData: SetupAviario;

  // 7. Persistir em setups_aviarios (com fallback transparente caso colunas de autoria ainda não existam no banco)
  if (existing) {
    let updateRes = await supabase
      .from('setups_aviarios')
      .update(cleanPayload)
      .eq('id', existing.id)
      .select('*')
      .single();

    if (updateRes.error && updateRes.error.message?.includes('column')) {
      // Se colunas de autoria ainda não existem na tabela, remove-as e tenta novamente
      const fallbackPayload = { ...cleanPayload };
      delete fallbackPayload.created_by_id;
      delete fallbackPayload.created_by_name;
      delete fallbackPayload.updated_by_id;
      delete fallbackPayload.updated_by_name;

      updateRes = await supabase
        .from('setups_aviarios')
        .update(fallbackPayload)
        .eq('id', existing.id)
        .select('*')
        .single();
    }

    if (updateRes.error) throw updateRes.error;
    savedData = updateRes.data;
  } else {
    let insertRes = await supabase
      .from('setups_aviarios')
      .insert([cleanPayload])
      .select('*')
      .single();

    if (insertRes.error && insertRes.error.message?.includes('column')) {
      const fallbackPayload = { ...cleanPayload };
      delete fallbackPayload.created_by_id;
      delete fallbackPayload.created_by_name;
      delete fallbackPayload.updated_by_id;
      delete fallbackPayload.updated_by_name;

      insertRes = await supabase
        .from('setups_aviarios')
        .insert([fallbackPayload])
        .select('*')
        .single();
    }

    if (insertRes.error) throw insertRes.error;
    savedData = insertRes.data;
  }

  // 8. Calcular número da nova versão de histórico
  const historicoAnterior = await fetchSetupHistorico(aviarioId);
  const maiorVersao = historicoAnterior.reduce((max, h) => Math.max(max, h.versao || 0), 0);
  const novaVersao = maiorVersao + 1;

  // 9. Criar objeto de auditoria e salvar no histórico
  const novoRegistroHistorico: SetupHistorico = {
    id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `hist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    aviario_id: aviarioId,
    setup_id: savedData.id,
    versao: novaVersao,
    tipo_acao: tipoAcao,
    usuario_id: currentUserId,
    usuario_nome: currentUserName,
    usuario_email: currentUserEmail,
    dados_snapshot: { ...savedData },
    alteracoes,
    resumo_alteracoes: resumo,
    created_at: nowIso
  };

  // Salva no Supabase (se a tabela de histórico existir)
  try {
    const { error: histError } = await supabase
      .from('setups_aviarios_historico')
      .insert([{
        id: novoRegistroHistorico.id,
        aviario_id: novoRegistroHistorico.aviario_id,
        setup_id: novoRegistroHistorico.setup_id,
        versao: novoRegistroHistorico.versao,
        tipo_acao: novoRegistroHistorico.tipo_acao,
        usuario_id: novoRegistroHistorico.usuario_id,
        usuario_nome: novoRegistroHistorico.usuario_nome,
        usuario_email: novoRegistroHistorico.usuario_email,
        dados_snapshot: novoRegistroHistorico.dados_snapshot,
        alteracoes: novoRegistroHistorico.alteracoes,
        resumo_alteracoes: novoRegistroHistorico.resumo_alteracoes,
        created_at: novoRegistroHistorico.created_at
      }]);

    if (histError) {
      console.warn('Histórico Supabase não gravado (usando localStorage):', histError.message);
    }
  } catch (err) {
    console.warn('Erro ao inserir histórico no Supabase:', err);
  }

  // Sempre sincroniza com localStorage para redundância e disponibilidade imediata
  const historicoAtualizado = [novoRegistroHistorico, ...historicoAnterior.filter(h => h.id !== novoRegistroHistorico.id)];
  saveLocalHistorico(aviarioId, historicoAtualizado);

  return savedData;
}

export async function restoreSetupVersion(
  aviarioId: string, 
  historicoItem: SetupHistorico, 
  userProfile?: UserProfile | null
): Promise<SetupAviario> {
  const snapshot = { ...historicoItem.dados_snapshot };
  
  // Limpar chaves internas que não devem ser sobrescritas diretamente
  delete snapshot.id;
  delete snapshot.aviario_id;
  delete snapshot.created_at;
  delete snapshot.updated_at;

  const dataFormatada = new Date(historicoItem.created_at).toLocaleString('pt-BR');
  const motivo = `Restauração para a Versão ${historicoItem.versao} (gravada por ${historicoItem.usuario_nome} em ${dataFormatada})`;

  return await saveSetupData(
    aviarioId, 
    snapshot, 
    userProfile, 
    'RESTAURACAO', 
    motivo
  );
}

export async function deleteSetupHistoricoItem(historyId: string, aviarioId: string): Promise<boolean> {
  // 1. Tentar deletar no Supabase
  try {
    const { error } = await supabase
      .from('setups_aviarios_historico')
      .delete()
      .eq('id', historyId);

    if (error) {
      console.warn('Erro ao deletar histórico no Supabase:', error.message);
    }
  } catch (err) {
    console.warn('Falha na exclusão do histórico no Supabase:', err);
  }

  // 2. Deletar no localStorage
  const localList = getLocalHistorico(aviarioId);
  const updatedList = localList.filter(h => h.id !== historyId);
  saveLocalHistorico(aviarioId, updatedList);

  return true;
}

export async function clearAllSetupHistorico(aviarioId: string): Promise<boolean> {
  // 1. Tentar limpar no Supabase
  try {
    const { error } = await supabase
      .from('setups_aviarios_historico')
      .delete()
      .eq('aviario_id', aviarioId);

    if (error) {
      console.warn('Erro ao limpar histórico no Supabase:', error.message);
    }
  } catch (err) {
    console.warn('Falha ao limpar histórico no Supabase:', err);
  }

  // 2. Limpar no localStorage
  saveLocalHistorico(aviarioId, []);
  return true;
}

export const DEFAULT_SETUP_VALUES: Partial<SetupAviario> = {
  // Pressão de Vedação
  pressao_vedacao_exaustor: 15,
  pressao_vedacao_manometro: 15,
  pressao_vedacao_painel: 15,
  pressao_vedacao_media: 15,

  // Pressão de Trabalho
  pressao_trabalho_exaustor: 25,
  pressao_trabalho_manometro: 25,
  pressao_trabalho_painel: 25,
  pressao_trabalho_media: 25,

  // Ventilação Total
  ventilacao_dir: 2.5,
  ventilacao_meio: 2.5,
  ventilacao_esq: 2.5,
  ventilacao_media: 2.5,
  qtd_exaustores: 6,

  // Entrada de Ar
  vent_ar_l1_p1: 4.0,
  vent_ar_l1_p2: 4.0,
  vent_ar_l1_p3: 4.0,
  vent_ar_l2_p1: 4.0,
  vent_ar_l2_p2: 4.0,
  vent_ar_l2_p3: 4.0,
  vent_ar_media: 4.0,
  entrada_ar_direito: 'Inlet 100%',
  entrada_ar_esquerdo: 'Inlet 100%',

  // Iluminação / Lux
  iluminacao_sob_lampada: 25,
  iluminacao_lateral: 18,
  iluminacao_triangulo: 20,
  lux_100: 25,

  // Placa Evaporativa
  tamanho_placa: 1.8,
  tempo_molhar_placa: 1.5,

  // Dimensões do Galpão
  altura_frente: 2.8,
  altura_meio: 2.8,
  altura_fundo: 2.8,
  altura_media: 2.8,
  comprimento_galpao: 150,
  largura_galpao: 14,

  // Recursos Hídricos
  vazao_poco_1: 5000,
  vazao_poco_2: 5000,
  entrada_agua_galpao: 4000,
  armazenamento_agua: 30000,

  // Alarmes
  alarme_casa: true,
  alarme_casa_func: true,
  alarme_aviario: true,
  alarme_aviario_func: true,
  alarme_caixas: true,
  alarme_caixas_func: true,

  observacoes: 'Padrão Técnico Bello Alimentos aplicado.'
};

export async function applyDefaultSetupValues(
  aviarioId: string,
  userProfile?: UserProfile | null
): Promise<SetupAviario> {
  return await saveSetupData(
    aviarioId,
    DEFAULT_SETUP_VALUES,
    userProfile,
    'EDICAO',
    'Atribuição dos parâmetros técnicos padrão da Bello Alimentos'
  );
}

export async function updateAviarioTecnico(aviarioId: string, tecnicoId: string | null): Promise<void> {
  const { error } = await supabase
    .from('cadastro_aviarios')
    .update({
      tecnico_id: tecnicoId,
      updated_at: new Date().toISOString()
    })
    .eq('id', aviarioId);

  if (error) throw error;
}

export async function createProdutor(payload: {
  nome: string;
  municipio?: string | null;
  codigo_avicultor?: string | null;
  telefone?: string | null;
  email?: string | null;
  aviariosIniciais?: Array<{ numero: string; tecnico_id?: string | null }>;
}): Promise<Produtor> {
  const { data: produtor, error: prodError } = await supabase
    .from('produtores')
    .insert([{
      nome: payload.nome.trim(),
      municipio: payload.municipio?.trim() || null,
      codigo_avicultor: payload.codigo_avicultor?.trim() || null,
      telefone: payload.telefone?.trim() || null,
      email: payload.email?.trim() || null,
      status: 'Ativo'
    }])
    .select('*')
    .single();

  if (prodError) throw prodError;

  // Se houver aviários iniciais para cadastrar junto com o produtor
  if (payload.aviariosIniciais && payload.aviariosIniciais.length > 0) {
    const aviariosRows = payload.aviariosIniciais.map(a => ({
      produtor_id: produtor.id,
      numero_instalacao: a.numero.trim(),
      tecnico_id: a.tecnico_id || null,
      status: 'Ativo'
    }));

    const { error: avError } = await supabase
      .from('cadastro_aviarios')
      .insert(aviariosRows);

    if (avError) console.error('Erro ao cadastrar aviários iniciais:', avError);
  }

  return produtor as Produtor;
}

export async function updateProdutor(
  id: string,
  payload: {
    nome?: string;
    municipio?: string | null;
    codigo_avicultor?: string | null;
    telefone?: string | null;
    email?: string | null;
    status?: string;
  }
): Promise<Produtor> {
  const cleanPayload: Record<string, any> = {
    updated_at: new Date().toISOString()
  };

  if (payload.nome !== undefined) cleanPayload.nome = payload.nome.trim();
  if (payload.municipio !== undefined) cleanPayload.municipio = payload.municipio?.trim() || null;
  if (payload.codigo_avicultor !== undefined) cleanPayload.codigo_avicultor = payload.codigo_avicultor?.trim() || null;
  if (payload.telefone !== undefined) cleanPayload.telefone = payload.telefone?.trim() || null;
  if (payload.email !== undefined) cleanPayload.email = payload.email?.trim() || null;
  if (payload.status !== undefined) cleanPayload.status = payload.status;

  const { data, error } = await supabase
    .from('produtores')
    .update(cleanPayload)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data as Produtor;
}

export async function deleteProdutor(id: string): Promise<void> {
  const { error } = await supabase
    .from('produtores')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function deleteAviario(id: string): Promise<void> {
  const { error } = await supabase
    .from('cadastro_aviarios')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function createAviario(produtorId: string, numeroInstalacao: string, tecnicoId?: string | null): Promise<Aviario> {
  const { data, error } = await supabase
    .from('cadastro_aviarios')
    .insert([{
      produtor_id: produtorId,
      numero_instalacao: numeroInstalacao.trim(),
      tecnico_id: tecnicoId || null
    }])
    .select(`
      *,
      produtor:produtores(*),
      tecnico:tecnicos(*),
      setup:setups_aviarios(*)
    `)
    .single();

  if (error) throw error;
  return data as Aviario;
}

export async function createTecnico(payload: {
  nome: string;
  unidade?: string | null;
  telefone?: string | null;
  email?: string | null;
}): Promise<Tecnico> {
  const { data, error } = await supabase
    .from('tecnicos')
    .insert([{
      nome: payload.nome.trim(),
      unidade: payload.unidade?.trim() || 'Bello Alimentos',
      telefone: payload.telefone?.trim() || null,
      email: payload.email?.trim() || null,
      status: 'Ativo'
    }])
    .select('*')
    .single();

  if (error) throw error;
  return data as Tecnico;
}

export async function updateTecnico(
  id: string,
  payload: {
    nome?: string;
    unidade?: string | null;
    telefone?: string | null;
    email?: string | null;
    status?: string;
  }
): Promise<Tecnico> {
  const cleanPayload: Record<string, any> = {
    updated_at: new Date().toISOString()
  };

  if (payload.nome !== undefined) cleanPayload.nome = payload.nome.trim();
  if (payload.unidade !== undefined) cleanPayload.unidade = payload.unidade?.trim() || null;
  if (payload.telefone !== undefined) cleanPayload.telefone = payload.telefone?.trim() || null;
  if (payload.email !== undefined) cleanPayload.email = payload.email?.trim() || null;
  if (payload.status !== undefined) cleanPayload.status = payload.status;

  const { data, error } = await supabase
    .from('tecnicos')
    .update(cleanPayload)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data as Tecnico;
}

export async function deleteTecnico(id: string): Promise<void> {
  // Desvincula os aviários vinculados a este técnico antes de excluir
  await supabase
    .from('cadastro_aviarios')
    .update({ tecnico_id: null, updated_at: new Date().toISOString() })
    .eq('tecnico_id', id);

  const { error } = await supabase
    .from('tecnicos')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
