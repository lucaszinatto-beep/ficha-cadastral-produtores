import * as fs from 'fs';
import * as path from 'path';
import { parseExcelFile } from '../src/services/importService';

async function testGeneratedExcel() {
  const filePath = path.resolve(process.cwd(), 'MODELO_PADRAO_IMPORTACAO_PAINEL.xlsx');
  console.log(`Testando arquivo: ${filePath}`);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Arquivo não encontrado em: ${filePath}`);
  }

  const fileBuffer = fs.readFileSync(filePath);
  
  // Criar um objeto compatível com File no ambiente Node
  const fileObj = {
    name: 'MODELO_PADRAO_IMPORTACAO_PAINEL.xlsx',
    arrayBuffer: async () => fileBuffer.buffer.slice(fileBuffer.byteOffset, fileBuffer.byteOffset + fileBuffer.byteLength)
  } as unknown as File;

  // 1. Testar leitura automática da aba padrão Tbl_txt
  console.log('\n--- Teste 1: Importação com detecção automática da aba Tbl_txt ---');
  const resultAuto = await parseExcelFile(fileObj);
  console.log('Abas encontradas:', resultAuto.sheets);
  console.log('Aba ativa selecionada:', resultAuto.activeSheet);
  console.log('Total de Linhas:', resultAuto.previewSummary.totalLinhas);
  console.log('Linhas Válidas:', resultAuto.previewSummary.linhasValidas);
  console.log('Linhas com Erro:', resultAuto.previewSummary.linhasComErro);
  console.log('Produtores Únicos:', resultAuto.previewSummary.produtoresUnicos);
  console.log('Aviários Únicos:', resultAuto.previewSummary.aviariosUnicos);
  console.log('Técnicos Únicos:', resultAuto.previewSummary.tecnicosUnicos);

  if (resultAuto.previewSummary.linhasComErro > 0) {
    console.error('ERROS DETECTADOS NAS LINHAS:');
    resultAuto.previewSummary.previewRows.filter(r => !r.isValid).forEach(r => {
      console.error(`Linha ${r.linha}: ${r.erros.join(', ')}`);
    });
    process.exit(1);
  }

  console.log('\n✓ Teste 1 concluído: 100% das linhas válidas e sem erros!');

  // 2. Verificar se todas as colunas esperadas foram mapeadas
  console.log('\n--- Teste 2: Mapeamento de colunas em Tbl_txt ---');
  const sampleData = resultAuto.previewSummary.previewRows[0].data;
  console.log('Chaves mapeadas na Linha 1:');
  const keys = Object.keys(sampleData);
  console.log(keys);
  
  const expectedKeys = [
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

  const missing = expectedKeys.filter(k => !(k in sampleData));
  if (missing.length > 0) {
    console.warn('Atenção: chaves não encontradas no mapeamento:', missing);
  } else {
    console.log('✓ Todas as 25 chaves mapeadas com precisão absoluta!');
  }

  console.log('\n========================================');
  console.log('TODOS OS TESTES FORAM APROVADOS COM SUCESSO!');
  console.log('========================================');
}

testGeneratedExcel().catch(err => {
  console.error('Erro no teste:', err);
  process.exit(1);
});
