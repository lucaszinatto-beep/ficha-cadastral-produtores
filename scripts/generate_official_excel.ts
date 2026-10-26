import ExcelJS from 'exceljs';
import * as fs from 'fs';
import * as path from 'path';

// Carregar listas reais do banco de dados
const dbLists = JSON.parse(fs.readFileSync('scripts/db_lists.json', 'utf8'));

async function generateOfficialSpreadsheet() {
  console.log('Iniciando geração do MODELO_IMPORTACAO_FICHAS_SETUP.xlsx...');

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Sistema Ficha Cadastral & Setup';
  workbook.lastModifiedBy = 'Painel Corporativo';
  workbook.created = new Date();
  workbook.modified = new Date();

  // ==========================================================================
  // PALETA DE CORES E ESTILOS PROFISSIONAIS
  // ==========================================================================
  const headerFillMandatory: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E3A8A' } // Azul escuro corporativo / obrigatório
  };

  const headerFillOptional: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0F172A' } // Slate escuro elegante / opcional
  };

  const headerFontMandatory: Partial<ExcelJS.Font> = {
    name: 'Calibri',
    size: 11,
    bold: true,
    color: { argb: 'FFFFFFFF' }
  };

  const headerFontOptional: Partial<ExcelJS.Font> = {
    name: 'Calibri',
    size: 11,
    bold: true,
    color: { argb: 'FFE2E8F0' }
  };

  const borderThin: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
  };

  // ==========================================================================
  // 1. ABA: IMPORTAR (Aba Principal de Preenchimento)
  // ==========================================================================
  const wsImportar = workbook.addWorksheet('IMPORTAR', {
    views: [{ state: 'frozen', ySplit: 1, xSplit: 0 }]
  });

  // Lista dos 25 cabeçalhos padronizados oficiais esperados pelo importador
  const columnsDef = [
    { header: 'Avicultor', key: 'avicultor', width: 36, mandatory: true, comment: 'OBRIGATÓRIO: Nome completo do produtor integrado.' },
    { header: 'Instalação', key: 'instalacao', width: 16, mandatory: true, comment: 'OBRIGATÓRIO: Número ou código da instalação/aviário.' },
    { header: 'Extensionista ', key: 'extensionista', width: 26, mandatory: false, comment: 'Nome do extensionista/técnico responsável pelo aviário.' },
    { header: 'Pressão de  vedação', key: 'pressao_vedacao', width: 22, mandatory: false, comment: 'Pressão de teste de vedação em Pascal (Pa).' },
    { header: 'Pressão de trabalho ', key: 'pressao_trabalho', width: 22, mandatory: false, comment: 'Pressão de trabalho em Pascal (Pa).' },
    { header: 'Velocidade de vento', key: 'velocidade_vento', width: 22, mandatory: false, comment: 'Velocidade do ar na altura das aves (m/s).' },
    { header: 'Quantidade de exaustores ', key: 'qtd_exaustores', width: 26, mandatory: false, comment: 'Número total de exaustores instalados.' },
    { header: 'entrada de ar lado direito ', key: 'entrada_ar_direito', width: 28, mandatory: false, comment: 'Especificação ou tipo da entrada de ar direita.' },
    { header: 'entrada de ar lado esquerdo', key: 'entrada_ar_esquerdo', width: 28, mandatory: false, comment: 'Especificação ou tipo da entrada de ar esquerda.' },
    { header: 'Tamanho de placa ', key: 'tamanho_placa', width: 20, mandatory: false, comment: 'Comprimento total das placas evaporativas (m).' },
    { header: 'Tempo para molhar a placa ', key: 'tempo_molhar_placa', width: 28, mandatory: false, comment: 'Tempo para molhar a placa em minutos ou segundos.' },
    { header: 'Altura galpão', key: 'altura_galpao', width: 18, mandatory: false, comment: 'Pé-direito médio do galpão (m).' },
    { header: 'Comprimento galpão', key: 'comprimento_galpao', width: 22, mandatory: false, comment: 'Comprimento total interno do aviário (m).' },
    { header: 'Largura  galpão ', key: 'largura_galpao', width: 20, mandatory: false, comment: 'Largura total interna do aviário (m).' },
    { header: 'Vazão poço 1', key: 'vazao_poco_1', width: 18, mandatory: false, comment: 'Vazão do poço 1 em L/h.' },
    { header: 'Vazão poço 2', key: 'vazao_poco_2', width: 18, mandatory: false, comment: 'Vazão do poço 2 em L/h.' },
    { header: 'Entrada de água no galpão', key: 'entrada_agua_galpao', width: 28, mandatory: false, comment: 'Diâmetro ou vazão de entrada de água.' },
    { header: 'armazenamento de água ', key: 'armazenamento_agua', width: 26, mandatory: false, comment: 'Capacidade total de reservatórios (Litros).' },
    { header: 'Alarme na casa ', key: 'alarme_casa', width: 18, mandatory: false, comment: 'Possui alarme na residência? (Sim/Não)' },
    { header: 'Alarme na casa  funcionando ', key: 'alarme_casa_func', width: 30, mandatory: false, comment: 'Alarme da casa está funcionando? (Sim/Não)' },
    { header: 'Alarme no aviario ', key: 'alarme_aviario', width: 20, mandatory: false, comment: 'Possui alarme no aviário? (Sim/Não)' },
    { header: 'Alarme no aviario funcionado ', key: 'alarme_aviario_func', width: 30, mandatory: false, comment: 'Alarme do aviário está funcionando? (Sim/Não)' },
    { header: 'Alarme nas caixas central', key: 'alarme_caixas', width: 26, mandatory: false, comment: 'Possui alarme nas caixas central? (Sim/Não)' },
    { header: 'Alarme nas caixas central funcionando ', key: 'alarme_caixas_func', width: 36, mandatory: false, comment: 'Alarme das caixas está funcionando? (Sim/Não)' },
    { header: 'lux 100%', key: 'lux_100', width: 16, mandatory: false, comment: 'Intensidade luminosa aferida a 100% de dimmer (lux).' }
  ];

  wsImportar.columns = columnsDef.map(col => ({
    header: col.header,
    key: col.key,
    width: col.width
  }));

  // Estilização do cabeçalho
  const headerRow = wsImportar.getRow(1);
  headerRow.height = 32;

  columnsDef.forEach((col, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.fill = col.mandatory ? headerFillMandatory : headerFillOptional;
    cell.font = col.mandatory ? headerFontMandatory : headerFontOptional;
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: false };
    cell.border = borderThin;
    cell.note = col.comment;
  });

  // Habilitar AutoFiltro
  wsImportar.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: columnsDef.length }
  };

  // Linhas vazias formatadas prontas para uso (linhas 2 a 100)
  for (let r = 2; r <= 100; r++) {
    const row = wsImportar.getRow(r);
    row.height = 22;
    for (let c = 1; c <= columnsDef.length; c++) {
      const cell = row.getCell(c);
      cell.border = borderThin;
      cell.font = { name: 'Calibri', size: 11, color: { argb: 'FF1E293B' } };
      cell.alignment = { vertical: 'middle', horizontal: c <= 3 ? 'left' : 'center' };
    }

    // Validação de dados (Dropdown) para Técnicos (Coluna C)
    row.getCell(3).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: [`LISTAS!$B$2:$B$${dbLists.tecnicos.length + 1}`],
      showErrorMessage: true,
      errorTitle: 'Técnico Inválido',
      error: 'Selecione um técnico da lista cadastrada na aba LISTAS ou digite um técnico válido.'
    };

    // Validação de dados (Dropdown) para Produtores (Coluna A)
    row.getCell(1).dataValidation = {
      type: 'list',
      allowBlank: false,
      formulae: [`LISTAS!$A$2:$A$${dbLists.produtores.length + 1}`],
      showErrorMessage: true,
      errorTitle: 'Produtor Inválido',
      error: 'Selecione um produtor cadastrado ou digite o nome completo.'
    };

    // Validação de dados para Alarmes (Sim / Não)
    // Colunas: S (19), T (20), U (21), V (22), W (23), X (24)
    [19, 20, 21, 22, 23, 24].forEach(colIdx => {
      row.getCell(colIdx).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: ['"Sim,Não"'],
        showErrorMessage: true,
        errorTitle: 'Valor Inválido',
        error: 'Utilize "Sim" ou "Não" para o status do alarme.'
      };
    });
  }

  // ==========================================================================
  // 2. ABA: INSTRUÇÕES (Documentação e Regras de Negócio)
  // ==========================================================================
  const wsInstrucoes = workbook.addWorksheet('INSTRUÇÕES');
  wsInstrucoes.columns = [
    { width: 5 },
    { width: 32 },
    { width: 75 }
  ];

  const instrucoesRows = [
    ['', 'MANUAL OFICIAL DE IMPORTAÇÃO — FICHAS DE SETUP DE AVIÁRIOS', ''],
    ['', 'Versão do Modelo:', '3.0 Oficial Unificado'],
    ['', 'Data de Homologação:', new Date().toLocaleDateString('pt-BR')],
    ['', 'Âmbito de Aplicação:', 'Bello Alimentos, Frango Ouro, Levo Alimentos, Pluma AgroAvícola e coligadas.'],
    ['', '', ''],
    ['', '1. REGRA FUNDAMENTAL DE SEGURANÇA E MULTIEMPRESA', ''],
    ['', '• Isolamento Absoluto:', 'A empresa gravada no banco é identificada AUTOMATICAMENTE pelo contexto do usuário logado no portal. É terminantemente proibido e impossível importar dados de uma empresa para outra.'],
    ['', '• Modelo Único:', 'Esta planilha possui padrão universal e idêntico para todas as empresas do grupo.'],
    ['', '', ''],
    ['', '2. FLUXO OPERACIONAL DE IMPORTAÇÃO', ''],
    ['', 'Passo 1:', 'O usuário autentica-se no Painel Web com suas credenciais corporativas.'],
    ['', 'Passo 2:', 'O sistema identifica a empresa ativa do usuário (Bello, Ouro, Levo ou Pluma).'],
    ['', 'Passo 3:', 'O usuário baixa este modelo oficial pelo botão "BAIXAR PLANILHA PADRÃO".'],
    ['', 'Passo 4:', 'O usuário preenche os dados na aba "IMPORTAR" respeitando as colunas oficiais.'],
    ['', 'Passo 5:', 'O usuário clica em "IMPORTAR BASE" / "IMPORTAR PLANILHA" e seleciona o arquivo.'],
    ['', 'Passo 6:', 'O sistema valida a estrutura, apresenta o resumo prévio (válidas x erros) e realiza o Upsert inteligente.'],
    ['', 'Passo 7:', 'Os resultados consolidados são gravados no Histórico de Importações com auditoria de usuário e data/hora.'],
    ['', '', ''],
    ['', '3. POLÍTICA DE UPSERT INTELIGENTE (NOVO X ATUALIZAÇÃO)', ''],
    ['', '• Registro Novo:', 'Se o Produtor ou Aviário ainda não existir no cadastro da empresa ativa, ele é inserido automaticamente com status "Ativo".'],
    ['', '• Registro Já Existente:', 'Identificado pela chave única (Produtor + Instalação). Se já existir, os parâmetros do Setup são ATUALIZADOS com os novos dados sem duplicar o aviário.'],
    ['', '• Campos Vazios no Setup:', 'Colunas deixadas em branco preservam os valores históricos cadastrados anteriormente no banco de dados.'],
    ['', '• Duplicidade na Planilha:', 'A última linha processada para o mesmo aviário prevalece no Upsert final, garantindo consistência.'],
    ['', '', ''],
    ['', '4. REGRAS DE PREENCHIMENTO E COLUNAS OBRIGATÓRIAS', ''],
    ['', '• Avicultor (Coluna A):', 'OBRIGATÓRIO. Nome completo do produtor integrado. Se vazio, a linha é rejeitada.'],
    ['', '• Instalação (Coluna B):', 'OBRIGATÓRIO. Número ou código do aviário/galpão (ex: 1, 2, 3...). Se vazio, a linha é rejeitada.'],
    ['', '• Extensionista (Coluna C):', 'Opcional. Selecionar na lista suspensa o técnico responsável pelo atendimento ao aviário.'],
    ['', '• Alarmes (Colunas S a X):', 'Opcional. Preencher com "Sim" ou "Não" utilizando as listas suspensas integradas.'],
    ['', '• Medidas e Números:', 'Utilizar ponto (.) ou vírgula (,) para decimais. Não utilizar textos em colunas numéricas.']
  ];

  instrucoesRows.forEach((r, idx) => {
    const row = wsInstrucoes.addRow(r);
    if (idx === 0) {
      row.height = 30;
      row.getCell(2).font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FF1E3A8A' } };
    } else if (r[1] && (r[1].startsWith('1.') || r[1].startsWith('2.') || r[1].startsWith('3.') || r[1].startsWith('4.'))) {
      row.height = 24;
      row.getCell(2).font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FF0F172A' } };
    } else {
      row.height = 20;
      row.getCell(2).font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF475569' } };
      row.getCell(3).font = { name: 'Calibri', size: 10, color: { argb: 'FF1E293B' } };
    }
  });

  // ==========================================================================
  // 3. ABA: LISTAS (Listas Oficiais para Validação de Dados)
  // ==========================================================================
  const wsListas = workbook.addWorksheet('LISTAS');
  wsListas.columns = [
    { header: 'PRODUTORES VÁLIDOS', width: 42 },
    { header: 'TÉCNICOS CADASTRADOS', width: 30 },
    { header: 'INSTALAÇÕES ATIVAS', width: 22 },
    { header: 'STATUS DE ALARME', width: 20 },
    { header: 'ENTRADAS DE AR PADRÃO', width: 30 }
  ];

  const headerListas = wsListas.getRow(1);
  headerListas.height = 28;
  for (let c = 1; c <= 5; c++) {
    const cell = headerListas.getCell(c);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = borderThin;
  }

  const alarmesList = ['Sim', 'Não'];
  const entradasArList = [
    'Inlet 40cm',
    'Inlet 50cm',
    'Inlet Contínuo 40cm',
    'Inlet Regulável 35cm',
    'Inlet Motorizado 50cm',
    'Inlet de Teto 45cm',
    'Cortina Lateral Automática'
  ];

  const maxRowsListas = Math.max(
    dbLists.produtores.length,
    dbLists.tecnicos.length,
    dbLists.instalacoes.length,
    alarmesList.length,
    entradasArList.length
  );

  for (let i = 0; i < maxRowsListas; i++) {
    const row = wsListas.addRow([
      dbLists.produtores[i] || '',
      dbLists.tecnicos[i] || '',
      dbLists.instalacoes[i] || '',
      alarmesList[i] || '',
      entradasArList[i] || ''
    ]);
    row.height = 20;
    for (let c = 1; c <= 5; c++) {
      const cell = row.getCell(c);
      cell.border = borderThin;
      cell.font = { name: 'Calibri', size: 10, color: { argb: 'FF334155' } };
      cell.alignment = { vertical: 'middle', horizontal: c === 3 || c === 4 ? 'center' : 'left' };
    }
  }

  // ==========================================================================
  // 4. ABA: EXEMPLOS (Linhas de Amostra Prontas)
  // ==========================================================================
  const wsExemplos = workbook.addWorksheet('EXEMPLOS', {
    views: [{ state: 'frozen', ySplit: 1 }]
  });

  wsExemplos.columns = columnsDef.map(col => ({
    header: col.header,
    key: col.key,
    width: col.width
  }));

  const headerExemplos = wsExemplos.getRow(1);
  headerExemplos.height = 30;
  columnsDef.forEach((col, idx) => {
    const cell = headerExemplos.getCell(idx + 1);
    cell.fill = col.mandatory ? headerFillMandatory : headerFillOptional;
    cell.font = col.mandatory ? headerFontMandatory : headerFontOptional;
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = borderThin;
  });

  const sampleData = [
    [
      'Ademir Zago',
      1,
      'Bruno faganello',
      38.5,
      26.0,
      3.15,
      14,
      'Inlet Contínuo 40cm',
      'Inlet Contínuo 40cm',
      22.0,
      45.0,
      2.85,
      150.0,
      14.0,
      22000,
      15000,
      60,
      50000,
      'Sim',
      'Sim',
      'Sim',
      'Sim',
      'Sim',
      'Sim',
      45.0
    ],
    [
      'Ademir Zago',
      2,
      'Bruno faganello',
      36.0,
      24.5,
      3.00,
      12,
      'Inlet Regulável 35cm',
      'Inlet Regulável 35cm',
      20.0,
      40.0,
      2.80,
      150.0,
      14.0,
      22000,
      15000,
      60,
      50000,
      'Sim',
      'Sim',
      'Sim',
      'Sim',
      'Sim',
      'Sim',
      42.0
    ],
    [
      'Ademir Zancanaro',
      1,
      'Rafael Nakano',
      40.0,
      27.5,
      3.20,
      14,
      'Inlet de Teto 45cm',
      'Inlet de Teto 45cm',
      22.0,
      45.0,
      2.90,
      150.0,
      15.0,
      28000,
      20000,
      60,
      60000,
      'Sim',
      'Sim',
      'Sim',
      'Sim',
      'Sim',
      'Sim',
      48.0
    ],
    [
      'Alvaro Mario Burin Junior',
      1,
      'Alysson',
      32.0,
      22.0,
      2.75,
      10,
      'Cortina Lateral Automática',
      'Cortina Lateral Automática',
      16.0,
      35.0,
      2.70,
      120.0,
      12.0,
      15000,
      0,
      50,
      30000,
      'Sim',
      'Sim',
      'Sim',
      'Não',
      'Sim',
      'Sim',
      38.0
    ],
    [
      'Claudemir Kuhnen',
      1,
      'Stefani',
      42.0,
      28.0,
      3.30,
      16,
      'Inlet Motorizado 50cm',
      'Inlet Motorizado 50cm',
      24.0,
      50.0,
      3.00,
      160.0,
      16.0,
      25000,
      18000,
      75,
      65000,
      'Sim',
      'Sim',
      'Sim',
      'Sim',
      'Sim',
      'Sim',
      50.0
    ]
  ];

  sampleData.forEach(rowValues => {
    const row = wsExemplos.addRow(rowValues);
    row.height = 22;
    for (let c = 1; c <= columnsDef.length; c++) {
      const cell = row.getCell(c);
      cell.border = borderThin;
      cell.font = { name: 'Calibri', size: 10, color: { argb: 'FF1E293B' } };
      cell.alignment = { vertical: 'middle', horizontal: c <= 3 ? 'left' : 'center' };
    }
  });

  // ==========================================================================
  // SALVAR O ARQUIVO EXCEL OFICIAL
  // ==========================================================================
  const fileName = 'MODELO_IMPORTACAO_FICHAS_SETUP.xlsx';
  const rootPath = path.resolve(process.cwd(), fileName);
  const publicPath = path.resolve(process.cwd(), 'public', fileName);
  const artifactDir = 'C:\\Users\\lucas.zinatto\\.gemini\\antigravity-ide\\brain\\a6d6bdac-1de6-4c9d-8630-4663cd425671';
  const artifactPath = path.resolve(artifactDir, fileName);

  await workbook.xlsx.writeFile(rootPath);
  fs.copyFileSync(rootPath, publicPath);
  if (fs.existsSync(artifactDir)) {
    fs.copyFileSync(rootPath, artifactPath);
  }

  console.log(`✓ Arquivo gerado com sucesso no root: ${rootPath} (${fs.statSync(rootPath).size} bytes)`);
  console.log(`✓ Arquivo copiado para a pasta public: ${publicPath}`);
  console.log(`✓ Arquivo copiado para o diretório de artefatos: ${artifactPath}`);
}

generateOfficialSpreadsheet().catch(console.error);
