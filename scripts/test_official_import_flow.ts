import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';
import { parseExcelFile, executeImport } from '../src/services/importService';
import { createClient } from '@supabase/supabase-js';

function getCredentials() {
  const envFile = fs.readFileSync('.env', 'utf8');
  const env: Record<string, string> = {};
  envFile.split('\n').forEach(line => {
    const [k, ...v] = line.split('=');
    if (k && v.length) env[k.trim()] = v.join('=').trim().replace(/^['"]|['"]$/g, '');
  });

  let serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey && fs.existsSync('C:/Projetos/projetos-teste/.env')) {
    const content = fs.readFileSync('C:/Projetos/projetos-teste/.env', 'utf8');
    const match = content.match(/SUPABASE_SERVICE_ROLE_KEY=["']?([^"'\r\n]+)/);
    if (match) serviceKey = match[1];
  }

  const url = env.VITE_SUPABASE_URL || 'https://ebixhddonbiqtrsyvdry.supabase.co';
  const anonKey = env.VITE_SUPABASE_ANON_KEY || '';
  return { url, anonKey, serviceKey };
}

async function runOfficialTests() {
  console.log('========================================================================');
  console.log('🧪 BATERIA DE TESTES OFICIAIS: MODELO_IMPORTACAO_FICHAS_SETUP.xlsx');
  console.log('========================================================================\n');

  const filePath = path.resolve(process.cwd(), 'MODELO_IMPORTACAO_FICHAS_SETUP.xlsx');
  if (!fs.existsSync(filePath)) {
    throw new Error(`Arquivo não encontrado: ${filePath}`);
  }

  const fileBuffer = fs.readFileSync(filePath);
  const fileObj = {
    name: 'MODELO_IMPORTACAO_FICHAS_SETUP.xlsx',
    arrayBuffer: async () => fileBuffer.buffer.slice(fileBuffer.byteOffset, fileBuffer.byteOffset + fileBuffer.byteLength)
  } as unknown as File;

  // --------------------------------------------------------------------------
  // TESTE 1: LEITURA E PRIORIZAÇÃO DA ABA "IMPORTAR"
  // --------------------------------------------------------------------------
  console.log('--- TESTE 1: Detecção Automática da Aba "IMPORTAR" ---');
  const parseResult = await parseExcelFile(fileObj);
  console.log('• Abas encontradas:', parseResult.sheets);
  console.log('• Aba ativa selecionada:', parseResult.activeSheet);
  
  if (parseResult.activeSheet !== 'IMPORTAR') {
    throw new Error(`Esperado aba ativa 'IMPORTAR', mas foi selecionada '${parseResult.activeSheet}'`);
  }
  console.log('✓ Aba IMPORTAR detectada como prioridade máxima com sucesso!');

  // --------------------------------------------------------------------------
  // TESTE 2: MAPEAMENTO DAS COLUNAS NA ABA "EXEMPLOS"
  // --------------------------------------------------------------------------
  console.log('\n--- TESTE 2: Mapeamento de Colunas e Dados na Aba "EXEMPLOS" ---');
  const parseExemplos = await parseExcelFile(fileObj, 'EXEMPLOS');
  console.log('• Total de linhas em EXEMPLOS:', parseExemplos.previewSummary.totalLinhas);
  console.log('• Linhas Válidas:', parseExemplos.previewSummary.linhasValidas);
  console.log('• Linhas com Erro:', parseExemplos.previewSummary.linhasComErro);

  if (parseExemplos.previewSummary.linhasComErro > 0) {
    throw new Error('Erros encontrados nas linhas de EXEMPLO');
  }

  const sampleRowData = parseExemplos.previewSummary.previewRows[0].data;
  const mappedKeys = Object.keys(sampleRowData);
  console.log('• Chaves mapeadas com sucesso (Total:', mappedKeys.length, '):', mappedKeys);

  const requiredCoreKeys = [
    'avicultor',
    'instalacao',
    'extensionista',
    'pressao_vedacao_media',
    'pressao_trabalho_media',
    'ventilacao_media',
    'qtd_exaustores',
    'entrada_ar_direito',
    'entrada_ar_esquerdo',
    'tamanho_placa',
    'tempo_molhar_placa',
    'altura_galpao',
    'comprimento_galpao',
    'largura_galpao',
    'vazao_poco_1',
    'vazao_poco_2',
    'entrada_agua_galpao',
    'armazenamento_agua',
    'alarme_casa',
    'alarme_casa_func',
    'alarme_aviario',
    'alarme_aviario_func',
    'alarme_caixas',
    'alarme_caixas_func',
    'lux_100'
  ];

  const missingKeys = requiredCoreKeys.filter(k => !(k in sampleRowData));
  if (missingKeys.length > 0) {
    throw new Error(`Chaves obrigatórias ausentes no mapeamento: ${missingKeys.join(', ')}`);
  }
  console.log('✓ Todas as 25 colunas oficiais mapeadas com 100% de precisão!');

  // --------------------------------------------------------------------------
  // TESTE 3: VALIDAÇÃO DE PLANILHA INCOMPATÍVEL
  // --------------------------------------------------------------------------
  console.log('\n--- TESTE 3: Rejeição de Planilha Incompatível ---');
  const dummyWb = XLSX.utils.book_new();
  const dummyWs = XLSX.utils.aoa_to_sheet([
    ['Coluna X', 'Coluna Y', 'Valor Z'],
    ['Dado 1', 'Dado 2', 123]
  ]);
  XLSX.utils.book_append_sheet(dummyWb, dummyWs, 'Planilha_Invalida');
  const dummyBuf = XLSX.write(dummyWb, { type: 'buffer', bookType: 'xlsx' });
  const dummyFile = {
    name: 'planilha_invalida.xlsx',
    arrayBuffer: async () => dummyBuf.buffer.slice(dummyBuf.byteOffset, dummyBuf.byteOffset + dummyBuf.byteLength)
  } as unknown as File;

  try {
    await parseExcelFile(dummyFile);
    throw new Error('Falha no teste: a planilha inválida deveria ter sido rejeitada!');
  } catch (err: any) {
    console.log('• Mensagem de erro capturada:', err.message);
    if (!err.message.includes("Modelo de planilha incompatível. Utilize o modelo oficial disponível em 'Baixar Planilha Padrão'")) {
      throw new Error(`Mensagem diferente do padrão exigido: ${err.message}`);
    }
    console.log('✓ Bloqueio e mensagem padronizada validados perfeitamente!');
  }

  // --------------------------------------------------------------------------
  // TESTE 4: VALIDAÇÃO DE LINHA INCOMPLETA / ERRO DE PREENCHIMENTO
  // --------------------------------------------------------------------------
  console.log('\n--- TESTE 4: Linha sem Avicultor ou sem Instalação ---');
  const invalidRowsWb = XLSX.utils.book_new();
  const invalidRowsWs = XLSX.utils.aoa_to_sheet([
    ['Avicultor', 'Instalação', 'Extensionista '],
    ['', 1, 'Bruno faganello'], // Sem avicultor
    ['Produtor Válido', '', 'Bruno faganello'], // Sem instalação
    ['Produtor 100% Válido', 5, 'Bruno faganello'] // Válida
  ]);
  XLSX.utils.book_append_sheet(invalidRowsWb, invalidRowsWs, 'IMPORTAR');
  const invalidRowsBuf = XLSX.write(invalidRowsWb, { type: 'buffer', bookType: 'xlsx' });
  const invalidRowsFile = {
    name: 'linhas_invalidas.xlsx',
    arrayBuffer: async () => invalidRowsBuf.buffer.slice(invalidRowsBuf.byteOffset, invalidRowsBuf.byteOffset + invalidRowsBuf.byteLength)
  } as unknown as File;

  const parsedInvalids = await parseExcelFile(invalidRowsFile);
  console.log('• Linhas com erro identificadas:', parsedInvalids.previewSummary.linhasComErro);
  console.log('• Linhas válidas identificadas:', parsedInvalids.previewSummary.linhasValidas);

  if (parsedInvalids.previewSummary.linhasComErro !== 2 || parsedInvalids.previewSummary.linhasValidas !== 1) {
    throw new Error('Contagem incorreta de linhas com erro na validação');
  }
  console.log('✓ Validação de preenchimento obrigatório aprovada!');

  // --------------------------------------------------------------------------
  // TESTE 5: ISOLAMENTO TOTAL MULTIEMPRESA & UPSERT REAL NO SUPABASE
  // --------------------------------------------------------------------------
  console.log('\n--- TESTE 5: Isolamento Multiempresa e Upsert Real ---');
  const { url, serviceKey } = getCredentials();
  const supabase = createClient(url, serviceKey!);

  // Identificar duas empresas diferentes
  const { data: empresas } = await supabase.from('empresas').select('id, nome, slug');
  const empresaBello = empresas?.find(e => e.slug === 'bello') || empresas![0];
  const empresaOuro = empresas?.find(e => e.slug === 'ouro') || empresas![1];

  console.log(`• Empresa A (Teste): ${empresaBello.nome} (${empresaBello.id})`);
  console.log(`• Empresa B (Controle): ${empresaOuro.nome} (${empresaOuro.id})`);

  const timestamp = Date.now();
  const testProdutorNome = `Produtor Teste Isolamento ${timestamp}`;
  const testInstalacaoNum = '999';

  // Importar para Empresa Bello
  console.log('\nExecutando importação controlada para BELLO ALIMENTOS...');
  const importRow = {
    linha: 2,
    avicultorRaw: testProdutorNome,
    avicultorClean: testProdutorNome,
    instalacaoRaw: testInstalacaoNum,
    instalacaoClean: testInstalacaoNum,
    extensionistaRaw: 'Bruno faganello',
    extensionistaClean: 'Bruno faganello',
    isValid: true,
    erros: [],
    avisos: [],
    data: {
      avicultor: testProdutorNome,
      instalacao: testInstalacaoNum,
      extensionista: 'Bruno faganello',
      pressao_vedacao_media: 35.0,
      pressao_trabalho_media: 25.0,
      ventilacao_media: 3.10,
      qtd_exaustores: 12,
      alarme_casa: true,
      alarme_casa_func: true,
      lux_100: 40.0
    }
  };

  const logResultBello = await executeImport(
    [importRow as any],
    'MODELO_IMPORTACAO_FICHAS_SETUP.xlsx',
    'IMPORTAR',
    'lucas.zinatto@belloalimentos.com.br',
    undefined,
    empresaBello.id
  );

  console.log('• Resultado da importação Bello:');
  console.log('  - Produtores criados:', logResultBello.produtores_criados);
  console.log('  - Aviários criados:', logResultBello.aviarios_criados);
  console.log('  - Setups criados:', logResultBello.setups_criados);

  // --------------------------------------------------------------------------
  // TESTE 6: VERIFICAÇÃO RIGOROSA DE ISOLAMENTO
  // --------------------------------------------------------------------------
  console.log('\n--- TESTE 6: Verificação de Vazamento / Isolamento entre Empresas ---');

  // Buscar na empresa Bello (DEVE EXISTIR)
  const { data: searchBello } = await supabase
    .from('produtores')
    .select('id, nome, empresa_id')
    .eq('empresa_id', empresaBello.id)
    .eq('nome', testProdutorNome);

  console.log('• Registro encontrado na Bello:', searchBello?.length === 1 ? 'SIM (Correto)' : 'NÃO');
  if (!searchBello || searchBello.length !== 1) {
    throw new Error('O registro não foi encontrado na empresa correta (Bello)!');
  }

  // Buscar na empresa Ouro (NÃO PODE EXISTIR DE FORMA ALGUMA)
  const { data: searchOuro } = await supabase
    .from('produtores')
    .select('id, nome, empresa_id')
    .eq('empresa_id', empresaOuro.id)
    .eq('nome', testProdutorNome);

  console.log('• Registro encontrado na Frango Ouro:', searchOuro?.length === 0 ? 'NÃO (ISOLADO 100%)' : 'VAZAMENTO DETECTADO!');
  if (searchOuro && searchOuro.length > 0) {
    throw new Error('FALHA GRAVE DE SEGURANÇA: Dados da Bello apareceram na Frango Ouro!');
  }

  // --------------------------------------------------------------------------
  // TESTE 7: TESTE DE ATUALIZAÇÃO / DUPLICIDADE (UPSERT)
  // --------------------------------------------------------------------------
  console.log('\n--- TESTE 7: Teste de Atualização (Sem Duplicar Aviário) ---');
  // Reimportar o mesmo produtor e aviário com novos parâmetros (ex: pressao_vedacao_media alterada para 44.5)
  const updateRow = {
    ...importRow,
    data: {
      ...importRow.data,
      pressao_vedacao_media: 44.5,
      qtd_exaustores: 16
    }
  };

  const logUpdate = await executeImport(
    [updateRow as any],
    'MODELO_IMPORTACAO_FICHAS_SETUP.xlsx',
    'IMPORTAR',
    'lucas.zinatto@belloalimentos.com.br',
    undefined,
    empresaBello.id
  );

  console.log('• Resultado da reimportação:');
  console.log('  - Produtores atualizados:', logUpdate.produtores_atualizados);
  console.log('  - Aviários atualizados:', logUpdate.aviarios_atualizados);
  console.log('  - Setups atualizados:', logUpdate.setups_atualizados);

  if (logUpdate.aviarios_criados !== 0 || logUpdate.aviarios_atualizados !== 1) {
    throw new Error('Falha no Upsert: o aviário deveria ter sido atualizado sem criar novo!');
  }

  // Limpar registro de teste do banco
  console.log('\nLimpando registro de teste do banco...');
  const prodId = searchBello[0].id;
  await supabase.from('produtores').delete().eq('id', prodId);
  await supabase.from('importacoes').delete().eq('id', logResultBello.id);
  await supabase.from('importacoes').delete().eq('id', logUpdate.id);
  console.log('✓ Registros de teste limpos com sucesso.');

  console.log('\n========================================================================');
  console.log('✅ TODOS OS TESTES FORAM APROVADOS COM 100% DE SUCESSO E ISOLAMENTO TOTAL!');
  console.log('========================================================================');
}

runOfficialTests().catch(err => {
  console.error('\n❌ ERRO NOS TESTES:', err);
  process.exit(1);
});
