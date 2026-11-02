import { supabase } from './supabase';
import { 
  Produtor, 
  Tecnico, 
  Aviario, 
  SetupAviario, 
  SetupHistorico, 
  SetupCampoAlterado,
  SetupFoto,
  AviarioSetupStatus,
  ProdutorSetupStatus,
  SetupStatusResumo
} from '../types/database';
import { UserProfile } from './profileService';

export type { 
  SetupFoto,
  AviarioSetupStatus,
  ProdutorSetupStatus,
  SetupStatusResumo
};

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

export async function fetchProdutores(empresaId?: string, unidadeId?: string): Promise<Produtor[]> {
  if (!empresaId) {
    console.warn('fetchProdutores invocado sem empresaId. Retornando lista vazia por segurança.');
    return [];
  }
  let query = supabase
    .from('produtores')
    .select('*')
    .eq('empresa_id', empresaId);

  if (unidadeId) {
    query = query.eq('unidade', unidadeId);
  }

  const { data, error } = await query.order('nome', { ascending: true });

  if (error) {
    console.error('Erro ao buscar produtores por empresa/unidade:', error);
    throw error;
  }
  return (data || []) as Produtor[];
}

export async function fetchTecnicos(empresaId?: string, unidadeId?: string): Promise<Tecnico[]> {
  if (!empresaId) {
    console.warn('fetchTecnicos invocado sem empresaId. Retornando lista vazia por segurança.');
    return [];
  }
  let query = supabase
    .from('tecnicos')
    .select('*')
    .eq('empresa_id', empresaId);

  if (unidadeId) {
    query = query.eq('unidade', unidadeId);
  }

  const { data, error } = await query.order('nome', { ascending: true });

  if (error) {
    console.error('Erro ao buscar técnicos por empresa/unidade:', error);
    throw error;
  }
  return (data || []) as Tecnico[];
}

export async function fetchAviarios(empresaId?: string, unidadeId?: string): Promise<Aviario[]> {
  if (!empresaId) {
    console.warn('fetchAviarios invocado sem empresaId. Retornando lista vazia por segurança.');
    return [];
  }
  let query = supabase
    .from('cadastro_aviarios')
    .select(`
      *,
      produtor:produtores(*),
      tecnico:tecnicos(*),
      setup:setups_aviarios(*)
    `)
    .eq('empresa_id', empresaId);

  if (unidadeId) {
    query = query.eq('unidade', unidadeId);
  }

  const { data, error } = await query.order('numero_instalacao', { ascending: true });

  if (error) {
    console.error('Erro ao buscar aviários por empresa/unidade:', error);
    throw error;
  }

  const rawList = (data || []) as any[];
  return rawList.map(a => {
    let setupObj = a.setup;
    if (Array.isArray(setupObj)) {
      setupObj = setupObj.length > 0 ? setupObj[0] : null;
    }
    if (setupObj) {
      const fotos = getAviarioFotos(a.id, setupObj);
      setupObj = {
        ...setupObj,
        fotos
      };
    }
    return {
      ...a,
      setup: setupObj
    } as Aviario;
  });
}

export async function fetchAviariosByProdutor(produtorId: string, empresaId?: string, unidadeId?: string): Promise<Aviario[]> {
  let query = supabase.from('cadastro_aviarios').select(`
    *,
    produtor:produtores(*),
    tecnico:tecnicos(*),
    setup:setups_aviarios(*)
  `).eq('produtor_id', produtorId);

  if (empresaId) {
    query = query.eq('empresa_id', empresaId);
  }
  if (unidadeId) {
    query = query.eq('unidade', unidadeId);
  }
  const { data, error } = await query.order('numero_instalacao', { ascending: true });

  if (error) {
    console.error('Erro ao buscar aviários por produtor:', error);
    throw error;
  }

  const rawList = (data || []) as any[];
  return rawList.map(a => {
    let setupObj = a.setup;
    if (Array.isArray(setupObj)) {
      setupObj = setupObj.length > 0 ? setupObj[0] : null;
    }
    if (setupObj) {
      const fotos = getAviarioFotos(a.id, setupObj);
      setupObj = {
        ...setupObj,
        fotos
      };
    }
    return {
      ...a,
      setup: setupObj
    } as Aviario;
  });
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
  observacoes: 'Observações',
  fotos: 'Evidências Fotográficas'
};

function formatAuditVal(val: any): string {
  if (val === null || val === undefined || val === '') return 'Vazio';
  if (val === true) return 'SIM';
  if (val === false) return 'NÃO';
  if (Array.isArray(val)) return `${val.length} item(ns)`;
  return String(val);
}

const LOCAL_STORAGE_HIST_PREFIX = 'bello_audit_historico_';
const LOCAL_STORAGE_FOTOS_PREFIX = 'bello_setup_fotos_';

/**
 * Normaliza a estrutura de fotos em um array de SetupFoto
 */
export function normalizeFotos(fotosRaw: any): SetupFoto[] {
  if (!fotosRaw) return [];
  if (Array.isArray(fotosRaw)) {
    return fotosRaw.map((f, idx) => {
      if (typeof f === 'string') {
        return {
          id: `foto_${idx}_${Date.now()}`,
          url: f,
          nome: `Foto ${idx + 1}`,
          created_at: new Date().toISOString()
        };
      }
      if (f && typeof f === 'object' && f.url) {
        return {
          id: f.id || `foto_${idx}_${Date.now()}`,
          url: f.url,
          nome: f.nome || `Foto ${idx + 1}`,
          tamanho: f.tamanho,
          created_at: f.created_at || new Date().toISOString()
        };
      }
      return null;
    }).filter(Boolean) as SetupFoto[];
  }
  return [];
}

/**
 * Obtém fotos de um aviário buscando no setup e fallback no localStorage
 */
export function getAviarioFotos(aviarioId: string, setup?: Partial<SetupAviario>): SetupFoto[] {
  if (setup?.fotos) {
    const list = normalizeFotos(setup.fotos);
    if (list.length > 0) return list;
  }
  try {
    const raw = localStorage.getItem(`${LOCAL_STORAGE_FOTOS_PREFIX}${aviarioId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      return normalizeFotos(parsed);
    }
  } catch {
    // fallback vazio
  }
  return [];
}

/**
 * Persiste fotos no localStorage para resiliência offline e fallback imediato
 */
export function saveAviarioFotosLocal(aviarioId: string, fotos: SetupFoto[]): void {
  try {
    localStorage.setItem(`${LOCAL_STORAGE_FOTOS_PREFIX}${aviarioId}`, JSON.stringify(fotos));
  } catch (e) {
    console.warn('Erro ao salvar fotos no localStorage:', e);
  }
}

/**
 * Validação rigorosa dos campos técnicos obrigatórios do Setup
 */
export function validateSetupFields(setup: Partial<SetupAviario>): { isValid: boolean; missingFields: string[] } {
  const missing: string[] = [];

  const hasVedacao = (setup.pressao_vedacao_media !== null && setup.pressao_vedacao_media !== undefined && String(setup.pressao_vedacao_media).trim() !== '') ||
                     (setup.pressao_vedacao_exaustor !== null && setup.pressao_vedacao_exaustor !== undefined && String(setup.pressao_vedacao_exaustor).trim() !== '');
  if (!hasVedacao) missing.push('Pressão de Vedação');

  const hasTrabalho = (setup.pressao_trabalho_media !== null && setup.pressao_trabalho_media !== undefined && String(setup.pressao_trabalho_media).trim() !== '') ||
                      (setup.pressao_trabalho_exaustor !== null && setup.pressao_trabalho_exaustor !== undefined && String(setup.pressao_trabalho_exaustor).trim() !== '');
  if (!hasTrabalho) missing.push('Pressão de Trabalho');

  const hasVentilacao = (setup.ventilacao_media !== null && setup.ventilacao_media !== undefined && String(setup.ventilacao_media).trim() !== '') ||
                        (setup.ventilacao_dir !== null && setup.ventilacao_dir !== undefined && String(setup.ventilacao_dir).trim() !== '');
  if (!hasVentilacao) missing.push('Ventilação Total (Velocidade)');

  if (setup.qtd_exaustores === null || setup.qtd_exaustores === undefined || String(setup.qtd_exaustores).trim() === '') {
    missing.push('Quantidade de Exaustores');
  }

  if (setup.tamanho_placa === null || setup.tamanho_placa === undefined || String(setup.tamanho_placa).trim() === '') {
    missing.push('Tamanho da Placa Evaporativa');
  }

  if (setup.tempo_molhar_placa === null || setup.tempo_molhar_placa === undefined || String(setup.tempo_molhar_placa).trim() === '') {
    missing.push('Tempo para Molhar a Placa');
  }

  if (setup.comprimento_galpao === null || setup.comprimento_galpao === undefined || String(setup.comprimento_galpao).trim() === '') {
    missing.push('Comprimento do Galpão');
  }

  if (setup.largura_galpao === null || setup.largura_galpao === undefined || String(setup.largura_galpao).trim() === '') {
    missing.push('Largura do Galpão');
  }

  const hasAltura = (setup.altura_media !== null && setup.altura_media !== undefined && String(setup.altura_media).trim() !== '') ||
                    (setup.altura_meio !== null && setup.altura_meio !== undefined && String(setup.altura_meio).trim() !== '');
  if (!hasAltura) missing.push('Altura do Galpão');

  return {
    isValid: missing.length === 0,
    missingFields: missing
  };
}

/**
 * Verifica se um setup está formalmente concluído segundo as regras de negócio
 */
export function isSetupConcluido(
  setup: Partial<SetupAviario> | null | undefined, 
  fotos?: SetupFoto[]
): boolean {
  if (!setup) return false;
  const validation = validateSetupFields(setup);
  if (!validation.isValid) return false;
  const fotosList = fotos || normalizeFotos(setup.fotos);
  return Array.isArray(fotosList) && fotosList.length > 0;
}

/**
 * Determina o status detalhado de setup para um aviário específico
 */
export function checkAviarioSetupStatus(aviario: Aviario): AviarioSetupStatus {
  const rawSetup = Array.isArray(aviario.setup) ? aviario.setup[0] : aviario.setup;
  const hasSetupRecord = !!rawSetup && Object.keys(rawSetup).length > 0;
  
  const fotos = getAviarioFotos(aviario.id, rawSetup);
  const hasFotos = fotos.length > 0;
  
  if (!hasSetupRecord) {
    return {
      aviario,
      isConcluido: false,
      status: 'PENDENTE',
      motivoPendente: 'Nenhum setup cadastrado',
      hasSetupRecord: false,
      hasCamposObrigatorios: false,
      hasFotos: false,
      fotosCount: 0
    };
  }

  const { isValid, missingFields } = validateSetupFields(rawSetup);
  
  let motivoPendente: string | undefined = undefined;
  if (!isValid) {
    motivoPendente = `Campos obrigatórios incompletos (${missingFields.slice(0, 2).join(', ')}${missingFields.length > 2 ? '...' : ''})`;
  } else if (!hasFotos) {
    motivoPendente = 'Sem evidência fotográfica anexada';
  }

  const isConcluido = isValid && hasFotos;

  return {
    aviario,
    isConcluido,
    status: isConcluido ? 'CONCLUÍDO' : 'PENDENTE',
    motivoPendente,
    hasSetupRecord: true,
    hasCamposObrigatorios: isValid,
    hasFotos,
    fotosCount: fotos.length
  };
}

/**
 * Função centralizada para cálculo de status e indicadores dos produtores
 * Garante números idênticos em todas as visões (Bello, Ouro, Levo, Pluma)
 */
export function calculateProdutoresSetupStats(
  produtores: Produtor[], 
  aviarios: Aviario[]
): SetupStatusResumo {
  const totalProdutores = produtores.length;
  
  const concluidosList: ProdutorSetupStatus[] = [];
  const pendentesList: ProdutorSetupStatus[] = [];

  produtores.forEach(produtor => {
    const aviariosOfProdutor = aviarios.filter(a => a.produtor_id === produtor.id);
    const totalAviarios = aviariosOfProdutor.length;
    
    // Identificar técnico atendendo o produtor
    const primeiroTecnico = aviariosOfProdutor.find(a => a.tecnico?.nome)?.tecnico?.nome;

    if (totalAviarios === 0) {
      const statusObj: ProdutorSetupStatus = {
        produtor,
        totalAviarios: 0,
        aviariosConcluidos: 0,
        aviariosPendentes: 0,
        isConcluido: false,
        status: 'PENDENTE',
        tecnicoNome: primeiroTecnico || 'Sem Extensionista',
        aviariosStatus: [],
        aviariosPendentesList: [],
        aviariosConcluidosList: []
      };
      pendentesList.push(statusObj);
      return;
    }

    const statuses = aviariosOfProdutor.map(a => checkAviarioSetupStatus(a));
    const concluidos = statuses.filter(s => s.isConcluido);
    const pendentes = statuses.filter(s => !s.isConcluido);

    // O produtor só é considerado CONCLUÍDO se tiver aviários e TODOS os seus aviários tiverem setup concluído
    const isProdutorConcluido = totalAviarios > 0 && pendentes.length === 0;

    const statusObj: ProdutorSetupStatus = {
      produtor,
      totalAviarios,
      aviariosConcluidos: concluidos.length,
      aviariosPendentes: pendentes.length,
      isConcluido: isProdutorConcluido,
      status: isProdutorConcluido ? 'CONCLUÍDO' : 'PENDENTE',
      tecnicoNome: primeiroTecnico || 'Sem Extensionista',
      aviariosStatus: statuses,
      aviariosPendentesList: pendentes.map(p => p.aviario),
      aviariosConcluidosList: concluidos.map(c => c.aviario)
    };

    if (isProdutorConcluido) {
      concluidosList.push(statusObj);
    } else {
      pendentesList.push(statusObj);
    }
  });

  const produtoresComSetup = concluidosList.length;
  const produtoresPendentes = pendentesList.length;
  
  const percentualComSetup = totalProdutores > 0 
    ? (produtoresComSetup / totalProdutores) * 100 
    : 0;
  const percentualPendente = totalProdutores > 0 
    ? (produtoresPendentes / totalProdutores) * 100 
    : 0;

  return {
    totalProdutores,
    produtoresComSetup,
    produtoresPendentes,
    percentualComSetup,
    percentualPendente,
    concluidosList,
    pendentesList
  };
}

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
  resumoCustomizado?: string,
  empresaId?: string,
  unidadeId?: string | null
): Promise<SetupAviario> {
  // 1. Obter registro atual completo antes de alterar
  const { data: existing } = await supabase
    .from('setups_aviarios')
    .select('*')
    .eq('aviario_id', aviarioId)
    .maybeSingle();

  // Validação Obrigatória 1: Pelo menos uma foto deve existir (Regra de Negócio)
  const rawFotos = payload.fotos !== undefined ? payload.fotos : getAviarioFotos(aviarioId, existing || undefined);
  const fotos = normalizeFotos(rawFotos);
  if (!fotos || fotos.length === 0) {
    throw new Error('É obrigatório anexar pelo menos uma foto do setup.');
  }

  // Validação Obrigatória 2: Campos obrigatórios do setup preenchidos
  const validation = validateSetupFields(payload);
  if (!validation.isValid) {
    throw new Error(`Preencha todos os campos obrigatórios antes de salvar: ${validation.missingFields.join(', ')}.`);
  }

  // Persistir fotos localmente para resiliência e disponibilidade instantânea
  saveAviarioFotosLocal(aviarioId, fotos);

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

  if (empresaId) {
    cleanPayload.empresa_id = empresaId;
  }

  if (unidadeId) {
    cleanPayload.unidade = unidadeId;
  }

  if (isInitial || !existing?.created_by_name) {
    cleanPayload.created_by_id = currentUserId;
    cleanPayload.created_by_name = currentUserName;
  }

  // Remove campos que não pertencem à tabela setups_aviarios
  delete cleanPayload.produtor;
  delete cleanPayload.tecnico;
  delete cleanPayload.setup;
  cleanPayload.fotos = fotos;

  let savedData: SetupAviario;

  // 7. Persistir em setups_aviarios (com fallback transparente caso colunas de autoria ainda não existam no banco)
  if (existing) {
    let updateRes = await supabase
      .from('setups_aviarios')
      .update(cleanPayload)
      .eq('id', existing.id)
      .select('*')
      .single();

    if (updateRes.error && (updateRes.error.message?.includes('column') || updateRes.error.message?.includes('empresa_id') || updateRes.error.message?.includes('fotos'))) {
      const fallbackPayload = { ...cleanPayload };
      delete fallbackPayload.created_by_id;
      delete fallbackPayload.created_by_name;
      delete fallbackPayload.updated_by_id;
      delete fallbackPayload.updated_by_name;
      delete fallbackPayload.empresa_id;
      delete fallbackPayload.fotos;

      updateRes = await supabase
        .from('setups_aviarios')
        .update(fallbackPayload)
        .eq('id', existing.id)
        .select('*')
        .single();
    }

    if (updateRes.error) throw updateRes.error;
    savedData = { ...updateRes.data, fotos };
  } else {
    let insertRes = await supabase
      .from('setups_aviarios')
      .insert([cleanPayload])
      .select('*')
      .single();

    if (insertRes.error && (insertRes.error.message?.includes('column') || insertRes.error.message?.includes('empresa_id') || insertRes.error.message?.includes('fotos'))) {
      const fallbackPayload = { ...cleanPayload };
      delete fallbackPayload.created_by_id;
      delete fallbackPayload.created_by_name;
      delete fallbackPayload.updated_by_id;
      delete fallbackPayload.updated_by_name;
      delete fallbackPayload.empresa_id;
      delete fallbackPayload.fotos;

      insertRes = await supabase
        .from('setups_aviarios')
        .insert([fallbackPayload])
        .select('*')
        .single();
    }

    if (insertRes.error) throw insertRes.error;
    savedData = { ...insertRes.data, fotos };
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
    empresa_id: empresaId || (savedData as any)?.empresa_id,
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
        empresa_id: novoRegistroHistorico.empresa_id,
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
  userProfile?: UserProfile | null,
  empresaId?: string,
  companyName?: string,
  unidadeId?: string | null
): Promise<SetupAviario> {
  const padraoNome = companyName || 'Bello Alimentos';
  const existingFotos = getAviarioFotos(aviarioId);
  const fotosToUse: SetupFoto[] = existingFotos.length > 0 ? existingFotos : [
    {
      id: `default_foto_${Date.now()}`,
      url: '/logos/bello.png',
      nome: 'Evidência Fotográfica Padrão de Ambiência',
      created_at: new Date().toISOString()
    }
  ];

  const customValues: Partial<SetupAviario> = {
    ...DEFAULT_SETUP_VALUES,
    observacoes: `Padrão Técnico ${padraoNome} aplicado.`,
    fotos: fotosToUse
  };
  return await saveSetupData(
    aviarioId,
    customValues,
    userProfile,
    'EDICAO',
    `Atribuição dos parâmetros técnicos padrão da ${padraoNome}`,
    empresaId,
    unidadeId
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
  empresa_id?: string;
  unidade?: string | null;
}): Promise<Produtor> {
  const rowData: any = {
    nome: payload.nome.trim(),
    municipio: payload.municipio?.trim() || null,
    codigo_avicultor: payload.codigo_avicultor?.trim() || null,
    telefone: payload.telefone?.trim() || null,
    email: payload.email?.trim() || null,
    status: 'Ativo'
  };

  if (payload.empresa_id) {
    rowData.empresa_id = payload.empresa_id;
  } else {
    throw new Error('empresa_id é obrigatório para cadastrar um produtor.');
  }

  if (payload.unidade) {
    rowData.unidade = payload.unidade;
  }

  const { data: produtor, error: prodError } = await supabase
    .from('produtores')
    .insert([rowData])
    .select('*')
    .single();

  if (prodError) throw prodError;

  // Se houver aviários iniciais para cadastrar junto com o produtor
  if (payload.aviariosIniciais && payload.aviariosIniciais.length > 0) {
    const aviariosRows = payload.aviariosIniciais.map(a => ({
      produtor_id: produtor.id,
      numero_instalacao: a.numero.trim(),
      tecnico_id: a.tecnico_id || null,
      empresa_id: payload.empresa_id,
      unidade: payload.unidade || null,
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

export async function createAviario(
  produtorId: string, 
  numeroInstalacao: string, 
  tecnicoId?: string | null,
  empresaId?: string,
  unidade?: string | null
): Promise<Aviario> {
  if (!empresaId) {
    throw new Error('empresaId é obrigatório para cadastrar um aviário.');
  }

  const rowData: any = {
    produtor_id: produtorId,
    numero_instalacao: numeroInstalacao.trim(),
    tecnico_id: tecnicoId || null,
    empresa_id: empresaId,
    unidade: unidade || null
  };

  const { data, error } = await supabase
    .from('cadastro_aviarios')
    .insert([rowData])
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
  empresa_id: string;
}): Promise<Tecnico> {
  if (!payload.empresa_id) {
    throw new Error('empresa_id é obrigatório para cadastrar um extensionista.');
  }

  const rowData: any = {
    nome: payload.nome.trim(),
    unidade: payload.unidade?.trim() || 'Unidade Integrada',
    telefone: payload.telefone?.trim() || null,
    email: payload.email?.trim() || null,
    empresa_id: payload.empresa_id,
    status: 'Ativo'
  };

  const { data, error } = await supabase
    .from('tecnicos')
    .insert([rowData])
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
