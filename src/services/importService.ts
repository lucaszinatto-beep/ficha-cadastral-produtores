import * as XLSX from 'xlsx';
import { supabase } from './supabase';
import { ParsedRowValidation, ImportPreviewSummary, ImportacaoLog } from '../types/database';

/**
 * Normaliza uma string removendo acentos, espaços extras e convertendo para minúsculas
 */
export function normalizeHeaderKey(key: string): string {
  return key
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

/**
 * Limpa e normaliza espaços internos duplicados em textos
 */
export function cleanText(value: any): string {
  if (value === null || value === undefined) return '';
  return String(value).replace(/\s+/g, ' ').trim();
}

/**
 * Converte valor numérico com segurança, mantendo null se estiver vazio
 */
export function parseNullableNumber(value: any): number | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return isNaN(value) ? null : value;
  
  const str = String(value).trim().replace(',', '.');
  if (str === '' || str.toLowerCase() === 'null' || str === '-') return null;
  
  const num = parseFloat(str);
  return isNaN(num) ? null : num;
}

/**
 * Converte valores para booleano ou null (compatível com Sim/Não/1/0/True/False)
 */
export function parseNullableBoolean(value: any): boolean | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1 ? true : value === 0 ? false : null;
  
  const str = String(value).trim().toLowerCase();
  if (['sim', 's', 'true', '1', 'ok', 'ativo', 'funciona', 'funcionando'].includes(str)) return true;
  if (['nao', 'não', 'n', 'false', '0', 'inativo', 'parado'].includes(str)) return false;
  return null;
}

/**
 * Identifica o cabeçalho mapeado para cada campo padrão
 */
export const COLUMN_MAPPINGS: Record<string, string[]> = {
  // Alarmes detalhados primeiro para evitar colisões
  alarme_casa_func: ['alarme na casa funcionando', 'alarme casa funcionando', 'alarme casa func'],
  alarme_casa: ['alarme na casa', 'alarme casa', 'possui alarme casa'],
  alarme_aviario_func: ['alarme no aviario funcionado', 'alarme no aviario funcionando', 'alarme aviario func', 'alarme aviario funcionando'],
  alarme_aviario: ['alarme no aviario', 'alarme no aviário', 'alarme aviario', 'possui alarme aviario'],
  alarme_caixas_func: ['alarme nas caixas central funcionando', 'alarme caixa central funcionando', 'alarme caixas funcionando'],
  alarme_caixas: ['alarme nas caixas central', 'alarme caixas central', 'alarme caixa central'],
  
  // Pressões & Ventilação
  pressao_vedacao_media: ['pressao de vedacao', 'pressao vedacao', 'vedacao'],
  pressao_trabalho_media: ['pressao de trabalho', 'pressao trabalho'],
  ventilacao_media: ['velocidade de vento', 'velocidade do vento', 'velocidade vento', 'vento'],
  qtd_exaustores: ['quantidade de exaustores', 'qtd exaustores', 'exaustores'],
  entrada_ar_direito: ['entrada de ar lado direito', 'entrada ar direito'],
  entrada_ar_esquerdo: ['entrada de ar lado esquerdo', 'entrada ar esquerdo'],
  tamanho_placa: ['tamanho de placa', 'tamanho placa'],
  tempo_molhar_placa: ['tempo para molhar a placa', 'tempo molhar placa'],
  
  // Dimensões
  altura_galpao: ['altura galpao', 'altura galpão'],
  comprimento_galpao: ['comprimento galpao', 'comprimento galpão'],
  largura_galpao: ['largura galpao', 'largura galpão'],
  
  // Hídrico
  vazao_poco_1: ['vazao poco 1', 'vazao poço 1', 'poco 1', 'poço 1'],
  vazao_poco_2: ['vazao poco 2', 'vazao poço 2', 'poco 2', 'poço 2'],
  entrada_agua_galpao: ['entrada de agua no galpao', 'entrada de agua', 'entrada agua galpao'],
  armazenamento_agua: ['armazenamento de agua', 'armazenamento agua'],
  
  // Iluminação
  lux_100: ['lux 100%', 'lux 100', 'lux', 'iluminacao lux'],

  // Entidades Principais
  avicultor: ['avicultor', 'produtor', 'nome produtor', 'nome avicultor', 'cliente'],
  instalacao: ['instalacao', 'instalacão', 'numero instalacao', 'instalacao / aviario', 'n instalacao', 'aviario'],
  extensionista: ['extensionista', 'tecnico', 'técnico', 'consultor', 'veterinario', 'responsavel']
};

/**
 * Encontra a chave mapeada para o cabeçalho encontrado com matching exato prioritário
 */
export function mapHeaderToField(header: string): string | null {
  const norm = normalizeHeaderKey(header);
  
  // 1. Prioridade absoluta para correspondência exata
  for (const [field, aliases] of Object.entries(COLUMN_MAPPINGS)) {
    for (const alias of aliases) {
      if (norm === alias) {
        return field;
      }
    }
  }

  // 2. Correspondência por contenção (substring)
  for (const [field, aliases] of Object.entries(COLUMN_MAPPINGS)) {
    for (const alias of aliases) {
      if (norm.includes(alias)) {
        return field;
      }
    }
  }

  return null;
}

/**
 * Lê e analisa a planilha Excel retornando lista de abas e pré-visualização
 */
export async function parseExcelFile(file: File, selectedSheet?: string): Promise<{
  sheets: string[];
  activeSheet: string;
  previewSummary: ImportPreviewSummary;
}> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheets = workbook.SheetNames;

  if (sheets.length === 0) {
    throw new Error('A planilha fornecida não possui nenhuma aba legível.');
  }

  // Prioridade para a aba "Tbl_txt", caso exista
  let activeSheet = selectedSheet;
  if (!activeSheet || !sheets.includes(activeSheet)) {
    const tblTxtFound = sheets.find((s: string) => s.trim().toLowerCase() === 'tbl_txt');
    activeSheet = tblTxtFound || sheets[0];
  }

  const worksheet = workbook.Sheets[activeSheet];
  const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

  if (rawRows.length === 0) {
    throw new Error(`A aba "${activeSheet}" está completamente vazia.`);
  }

  // Encontrar a linha de cabeçalho
  let headerRowIndex = 0;
  for (let i = 0; i < Math.min(rawRows.length, 10); i++) {
    const row = rawRows[i];
    const rowStr = row.map(c => normalizeHeaderKey(String(c))).join(' ');
    if (rowStr.includes('avicultor') || rowStr.includes('produtor') || rowStr.includes('instalac')) {
      headerRowIndex = i;
      break;
    }
  }

  const headers = rawRows[headerRowIndex].map(h => String(h).trim());
  const headerMap: Record<number, string> = {};

  headers.forEach((h, idx) => {
    if (h) {
      const mappedField = mapHeaderToField(h);
      if (mappedField) {
        headerMap[idx] = mappedField;
      }
    }
  });

  const parsedRows: ParsedRowValidation[] = [];
  const uniqueProdutores = new Set<string>();
  const uniqueAviarios = new Set<string>();
  const uniqueTecnicos = new Set<string>();

  for (let i = headerRowIndex + 1; i < rawRows.length; i++) {
    const rawRow = rawRows[i];
    if (!rawRow || rawRow.every(c => c === '' || c === null || c === undefined)) {
      continue; // Ignora linhas completamente vazias
    }

    const rowData: Record<string, any> = {};
    headers.forEach((_, idx) => {
      const field = headerMap[idx];
      if (field) {
        rowData[field] = rawRow[idx];
      }
    });

    const avicultorRaw = String(rowData.avicultor || '').trim();
    const avicultorClean = cleanText(avicultorRaw);
    
    const instalacaoRaw = rowData.instalacao !== undefined && rowData.instalacao !== null ? rowData.instalacao : '';
    const instalacaoClean = cleanText(instalacaoRaw);
    
    const extensionistaRaw = String(rowData.extensionista || '').trim();
    const extensionistaClean = cleanText(extensionistaRaw);

    const erros: string[] = [];
    const avisos: string[] = [];

    // Regra 1: Avicultor obrigatório
    if (!avicultorClean) {
      erros.push('Nome do Avicultor/Produtor é obrigatório');
    }

    // Regra 2: Instalação obrigatória
    if (!instalacaoClean) {
      erros.push('Número da Instalação/Aviário é obrigatório');
    }

    if (avicultorClean && instalacaoClean) {
      uniqueProdutores.add(avicultorClean.toUpperCase());
      uniqueAviarios.add(`${avicultorClean.toUpperCase()}###${instalacaoClean}`);
      if (extensionistaClean) {
        uniqueTecnicos.add(extensionistaClean.toUpperCase());
      }
    }

    parsedRows.push({
      linha: i + 1,
      avicultorRaw,
      avicultorClean,
      instalacaoRaw,
      instalacaoClean,
      extensionistaRaw,
      extensionistaClean,
      isValid: erros.length === 0,
      erros,
      avisos,
      data: rowData
    });
  }

  const linhasValidas = parsedRows.filter(r => r.isValid).length;
  const linhasComErro = parsedRows.filter(r => !r.isValid).length;

  const previewSummary: ImportPreviewSummary = {
    totalLinhas: parsedRows.length,
    linhasValidas,
    linhasComErro,
    produtoresUnicos: uniqueProdutores.size,
    aviariosUnicos: uniqueAviarios.size,
    tecnicosUnicos: uniqueTecnicos.size,
    previewRows: parsedRows.slice(0, 50),
    allRows: parsedRows
  };

  return {
    sheets,
    activeSheet: activeSheet || sheets[0],
    previewSummary
  };
}

export interface ImportProgressCallback {
  (progress: {
    stage: 'produtores' | 'tecnicos' | 'aviarios' | 'setups' | 'finalizando';
    percent: number;
    message: string;
    stats: {
      produtoresCriados: number;
      produtoresAtualizados: number;
      tecnicosCriados: number;
      tecnicosAtualizados: number;
      aviariosCriados: number;
      aviariosAtualizados: number;
      setupsCriados: number;
      setupsAtualizados: number;
      erros: number;
    };
  }): void;
}

/**
 * Executa a importação inteligente no Supabase com Upsert em lote e alta performance
 */
export async function executeImport(
  rows: ParsedRowValidation[],
  fileName: string,
  sheetName: string,
  userEmail: string = 'Administrador',
  onProgress?: ImportProgressCallback
): Promise<ImportacaoLog> {
  const stats = {
    produtoresCriados: 0,
    produtoresAtualizados: 0,
    tecnicosCriados: 0,
    tecnicosAtualizados: 0,
    aviariosCriados: 0,
    aviariosAtualizados: 0,
    setupsCriados: 0,
    setupsAtualizados: 0,
    erros: 0
  };

  const logsErros: Array<{ linha: number; produtor?: string; instalacao?: string | number; erro: string }> = [];

  // Filtrar apenas linhas válidas
  const validRows = rows.filter(r => r.isValid);

  // 1. Processar Técnicos Únicos em Lote
  onProgress?.({
    stage: 'tecnicos',
    percent: 15,
    message: 'Processando Técnicos / Extensionistas...',
    stats
  });

  const tecnicosMap = new Map<string, string>(); // nomeUpper -> id
  const { data: existingTecnicos } = await supabase.from('tecnicos').select('id, nome');
  (existingTecnicos || []).forEach((t: any) => {
    tecnicosMap.set(cleanText(t.nome).toUpperCase(), t.id);
  });

  const uniqueTecnicosNames = Array.from(
    new Set(validRows.map(r => r.extensionistaClean).filter(Boolean) as string[])
  );

  const missingTecnicos = uniqueTecnicosNames.filter(name => !tecnicosMap.has(name.toUpperCase()));
  if (missingTecnicos.length > 0) {
    const { data: insertedTecs } = await supabase
      .from('tecnicos')
      .insert(missingTecnicos.map(nome => ({ nome })))
      .select('id, nome');
    
    (insertedTecs || []).forEach((t: any) => {
      tecnicosMap.set(cleanText(t.nome).toUpperCase(), t.id);
    });
    stats.tecnicosCriados += missingTecnicos.length;
  }
  stats.tecnicosAtualizados = uniqueTecnicosNames.length - missingTecnicos.length;

  // 2. Processar Produtores Únicos em Lote
  onProgress?.({
    stage: 'produtores',
    percent: 35,
    message: 'Processando Produtores...',
    stats
  });

  const produtoresMap = new Map<string, string>(); // nomeUpper -> id
  const { data: existingProdutores } = await supabase.from('produtores').select('id, nome');
  (existingProdutores || []).forEach((p: any) => {
    produtoresMap.set(cleanText(p.nome).toUpperCase(), p.id);
  });

  const uniqueProdutoresNames = Array.from(
    new Set(validRows.map(r => r.avicultorClean).filter(Boolean))
  );

  const missingProdutores = uniqueProdutoresNames.filter(name => !produtoresMap.has(name.toUpperCase()));
  if (missingProdutores.length > 0) {
    const { data: insertedProds } = await supabase
      .from('produtores')
      .insert(missingProdutores.map(nome => ({ nome })))
      .select('id, nome');

    (insertedProds || []).forEach((p: any) => {
      produtoresMap.set(cleanText(p.nome).toUpperCase(), p.id);
    });
    stats.produtoresCriados += missingProdutores.length;
  }
  stats.produtoresAtualizados = uniqueProdutoresNames.length - missingProdutores.length;

  // 3. Processar Aviários em Lote com Upsert
  onProgress?.({
    stage: 'aviarios',
    percent: 60,
    message: 'Processando Aviários e Instalações...',
    stats
  });

  const aviariosMap = new Map<string, string>(); // produtorId###numeroInstalacao -> aviarioId
  const { data: existingAviarios } = await supabase
    .from('cadastro_aviarios')
    .select('id, produtor_id, numero_instalacao');
  
  (existingAviarios || []).forEach((a: any) => {
    aviariosMap.set(`${a.produtor_id}###${cleanText(a.numero_instalacao).toUpperCase()}`, a.id);
  });

  const aviariosToUpsert: any[] = [];
  for (const row of validRows) {
    const produtorId = produtoresMap.get(row.avicultorClean.toUpperCase());
    if (!produtorId) continue;
    const tecnicoId = row.extensionistaClean ? (tecnicosMap.get(row.extensionistaClean.toUpperCase()) || null) : null;
    
    const key = `${produtorId}###${row.instalacaoClean.toUpperCase()}`;
    if (!aviariosMap.has(key)) {
      stats.aviariosCriados++;
    } else {
      stats.aviariosAtualizados++;
    }

    aviariosToUpsert.push({
      produtor_id: produtorId,
      tecnico_id: tecnicoId,
      numero_instalacao: row.instalacaoClean,
      status: 'Ativo',
      updated_at: new Date().toISOString()
    });
  }

  // Upsert aviários em lotes de 100
  const chunkSize = 100;
  for (let i = 0; i < aviariosToUpsert.length; i += chunkSize) {
    const chunk = aviariosToUpsert.slice(i, i + chunkSize);
    await supabase.from('cadastro_aviarios').upsert(chunk, {
      onConflict: 'produtor_id,numero_instalacao'
    });
  }

  // Recarregar mapa completo de aviários
  const { data: allAviariosUpdated } = await supabase
    .from('cadastro_aviarios')
    .select('id, produtor_id, numero_instalacao');
  
  (allAviariosUpdated || []).forEach((a: any) => {
    aviariosMap.set(`${a.produtor_id}###${cleanText(a.numero_instalacao).toUpperCase()}`, a.id);
  });

  // 4. Processar Setups dos Aviários em Lote
  onProgress?.({
    stage: 'setups',
    percent: 85,
    message: 'Processando Configurações de Setups...',
    stats
  });

  // Identificar setups existentes para contagem de criados vs atualizados
  const { data: existingSetups } = await supabase.from('setups_aviarios').select('aviario_id');
  const existingSetupsSet = new Set((existingSetups || []).map((s: any) => s.aviario_id));

  const setupsToUpsert: any[] = [];
  for (const row of validRows) {
    const produtorId = produtoresMap.get(row.avicultorClean.toUpperCase());
    if (!produtorId) continue;
    
    const aviarioId = aviariosMap.get(`${produtorId}###${row.instalacaoClean.toUpperCase()}`);
    if (!aviarioId) continue;

    if (existingSetupsSet.has(aviarioId)) {
      stats.setupsAtualizados++;
    } else {
      stats.setupsCriados++;
    }

    const d = row.data;
    setupsToUpsert.push({
      aviario_id: aviarioId,
      pressao_vedacao_media: parseNullableNumber(d.pressao_vedacao_media),
      pressao_trabalho_media: parseNullableNumber(d.pressao_trabalho_media),
      ventilacao_media: parseNullableNumber(d.ventilacao_media),
      qtd_exaustores: parseNullableNumber(d.qtd_exaustores),
      entrada_ar_direito: d.entrada_ar_direito !== undefined && d.entrada_ar_direito !== null ? String(d.entrada_ar_direito).trim() : null,
      entrada_ar_esquerdo: d.entrada_ar_esquerdo !== undefined && d.entrada_ar_esquerdo !== null ? String(d.entrada_ar_esquerdo).trim() : null,
      tamanho_placa: parseNullableNumber(d.tamanho_placa),
      tempo_molhar_placa: parseNullableNumber(d.tempo_molhar_placa),
      altura_media: parseNullableNumber(d.altura_galpao),
      comprimento_galpao: parseNullableNumber(d.comprimento_galpao),
      largura_galpao: parseNullableNumber(d.largura_galpao),
      vazao_poco_1: parseNullableNumber(d.vazao_poco_1),
      vazao_poco_2: parseNullableNumber(d.vazao_poco_2),
      entrada_agua_galpao: parseNullableNumber(d.entrada_agua_galpao),
      armazenamento_agua: parseNullableNumber(d.armazenamento_agua),
      alarme_casa: parseNullableBoolean(d.alarme_casa),
      alarme_casa_func: parseNullableBoolean(d.alarme_casa_func),
      alarme_aviario: parseNullableBoolean(d.alarme_aviario),
      alarme_aviario_func: parseNullableBoolean(d.alarme_aviario_func),
      alarme_caixas: parseNullableBoolean(d.alarme_caixas),
      alarme_caixas_func: parseNullableBoolean(d.alarme_caixas_func),
      lux_100: parseNullableNumber(d.lux_100),
      updated_at: new Date().toISOString()
    });
  }

  // Upsert setups em lotes de 100
  for (let i = 0; i < setupsToUpsert.length; i += chunkSize) {
    const chunk = setupsToUpsert.slice(i, i + chunkSize);
    await supabase.from('setups_aviarios').upsert(chunk, {
      onConflict: 'aviario_id'
    });
  }

  // Linhas com erro de validação
  rows.filter(r => !r.isValid).forEach(r => {
    stats.erros++;
    logsErros.push({
      linha: r.linha,
      produtor: r.avicultorRaw || 'Vazio',
      instalacao: r.instalacaoRaw || 'Vazio',
      erro: r.erros.join('; ')
    });
  });

  // 5. Salvar Log de Histórico de Importação
  onProgress?.({
    stage: 'finalizando',
    percent: 100,
    message: 'Salvando relatório da importação...',
    stats
  });

  const logPayload = {
    nome_arquivo: fileName,
    aba_origem: sheetName,
    total_registros: rows.length,
    produtores_criados: stats.produtoresCriados,
    produtores_atualizados: stats.produtoresAtualizados,
    aviarios_criados: stats.aviariosCriados,
    aviarios_atualizados: stats.aviariosAtualizados,
    tecnicos_criados: stats.tecnicosCriados,
    tecnicos_atualizados: stats.tecnicosAtualizados,
    setups_criados: stats.setupsCriados,
    setups_atualizados: stats.setupsAtualizados,
    registros_com_erro: stats.erros,
    erros_json: logsErros.length > 0 ? logsErros : null,
    importado_por: userEmail
  };

  const { data: savedLog } = await supabase
    .from('importacoes')
    .insert([logPayload])
    .select('*')
    .single();

  return savedLog || (logPayload as any);
}

/**
 * Carrega a lista do histórico de importações
 */
export async function loadImportacoesHistory(): Promise<ImportacaoLog[]> {
  const { data, error } = await supabase
    .from('importacoes')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Erro ao carregar histórico de importações:', error);
    return [];
  }
  return data || [];
}
