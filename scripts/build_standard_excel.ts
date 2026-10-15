import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

console.log('Iniciando geração do MODELO_PADRAO_IMPORTACAO_PAINEL.xlsx...');

const wb = XLSX.utils.book_new();

// ============================================================================
// 1. ABA DE INSTRUÇÕES E DICIONÁRIO DE DADOS
// ============================================================================
const instrucoesData: any[][] = [
  ['GUIA OFICIAL DE IMPORTAÇÃO DE DADOS — GRUPO BELLO / LEVO / OURO / PLUMA'],
  ['Versão do Modelo:', '2.0.0 — Padrão Corporativo Consolidado'],
  ['Data de Emissão:', new Date().toLocaleDateString('pt-BR')],
  ['Compatibilidade:', 'Bello Alimentos, Levo Alimentos, Frango Ouro, Pluma AgroAvícola'],
  [''],
  ['1. INSTRUÇÕES GERAIS E ARQUITETURA MULTIEMPRESA'],
  ['• Âmbito de Uso:', 'Esta planilha é o modelo mestre oficial para importação e atualização de dados no Painel Corporativo.'],
  ['• Multiempresa:', 'A empresa de destino é definida pelo contexto da sessão ativa do usuário no portal web (Bello, Levo, Ouro ou Pluma). Não há coluna manual de empresa para garantir isolamento e segurança RLS no banco de dados.'],
  ['• Upsert Inteligente:', 'O sistema identifica registros existentes por chaves únicas (ex: Produtor + Instalação) e atualiza os dados sem duplicar nem sobrescrever campos com dados nulos indevidos.'],
  ['• Formatos Suportados:', 'Arquivos .xlsx (Excel moderno) e .xls. A aba "Tbl_txt" é lida automaticamente pelo importador web de Ficha Cadastral & Setups.'],
  ['• Preservação de Dados:', 'Colunas deixadas em branco nos dados do setup não apagam configurações previamente existentes no banco, preservando o histórico.'],
  [''],
  ['2. ESTRUTURA DAS ABAS DESTA PLANILHA'],
  ['Aba', 'Módulo do Sistema', 'Status no Painel', 'Finalidade Operacional'],
  ['INSTRUCOES_E_DICIONARIO', 'Geral / Documentação', 'Documental', 'Instruções operacionais e dicionário de dados de todos os campos'],
  ['Tbl_txt', 'Ficha Cadastral e Setups', 'Importação Ativa (Web)', 'Importação de Produtores, Técnicos, Aviários e Setups de ambiência/infraestrutura'],
  ['Base Geral', 'Acompanhamento de Lotes', 'Base Integrada de Lotes', 'Acompanhamento zootécnico completo, pesagens, abates, consumo e custos de lotes a campo'],
  ['Lotes_Condominios', 'Condomínios e Lotes', 'Módulo de Condomínios', 'Gestão de condomínios avícolas, núcleos, alojamentos, fechamentos e resultados financeiros'],
  [''],
  ['3. DICIONÁRIO DE DADOS COMPLETO'],
  ['Aba / Módulo', 'Coluna / Cabeçalho', 'Tipo de Dado', 'Obrigatório?', 'Aliases / Variações Aceitas', 'Valores Permitidos / Formato', 'Exemplo de Preenchimento', 'Regras de Negócio e Observações'],
  
  // Tbl_txt
  ['Tbl_txt', 'Avicultor', 'Texto', 'SIM (Obrigatório)', 'avicultor, produtor, nome produtor, cliente', 'Texto livre (nome completo)', 'Agropecuária Bela Vista', 'Chave de busca do produtor. Se não existir, é criado automaticamente.'],
  ['Tbl_txt', 'Instalação', 'Inteiro / Texto', 'SIM (Obrigatório)', 'instalacao, instalacão, numero instalacao, aviario', 'Número inteiro ou código', '1', 'Número do aviário/galpão. Chave composta unívoca com Avicultor.'],
  ['Tbl_txt', 'Extensionista ', 'Texto', 'NÃO (Opcional)', 'extensionista, tecnico, técnico, consultor, veterinario', 'Nome do técnico responsável', 'Carlos Eduardo Veterinário', 'Vincula o aviário ao técnico extensionista. Cadastrado se inexistente.'],
  ['Tbl_txt', 'Pressão de  vedação', 'Decimal', 'NÃO (Opcional)', 'pressao de vedacao, pressao vedacao, vedacao', 'Número positivo (Pa)', '38.5', 'Pressão estática de teste de vedação do galpão.'],
  ['Tbl_txt', 'Pressão de trabalho ', 'Decimal', 'NÃO (Opcional)', 'pressao de trabalho, pressao trabalho', 'Número positivo (Pa)', '25.0', 'Pressão estática de trabalho contínuo com exaustão ativa.'],
  ['Tbl_txt', 'Velocidade de vento', 'Decimal', 'NÃO (Opcional)', 'velocidade de vento, velocidade do vento, vento', 'Número decimal (m/s)', '2.85', 'Velocidade média do vento na área dos frangos.'],
  ['Tbl_txt', 'Quantidade de exaustores ', 'Inteiro', 'NÃO (Opcional)', 'quantidade de exaustores, qtd exaustores, exaustores', 'Inteiro positivo', '12', 'Número total de exaustores instalados.'],
  ['Tbl_txt', 'entrada de ar lado direito ', 'Texto', 'NÃO (Opcional)', 'entrada de ar lado direito, entrada ar direito', 'Texto ou medida', 'Inlet 40cm', 'Tipo ou especificação da admissão de ar direito.'],
  ['Tbl_txt', 'entrada de ar lado esquerdo', 'Texto', 'NÃO (Opcional)', 'entrada de ar lado esquerdo, entrada ar esquerdo', 'Texto ou medida', 'Inlet 40cm', 'Tipo ou especificação da admissão de ar esquerdo.'],
  ['Tbl_txt', 'Tamanho de placa ', 'Decimal', 'NÃO (Opcional)', 'tamanho de placa, tamanho placa', 'Metros (m)', '18.0', 'Comprimento total das placas evaporativas cooling pad.'],
  ['Tbl_txt', 'Tempo para molhar a placa ', 'Decimal', 'NÃO (Opcional)', 'tempo para molhar a placa, tempo molhar placa', 'Segundos ou Minutos', '45', 'Tempo de acionamento da bomba de umidificação.'],
  ['Tbl_txt', 'Altura galpão', 'Decimal', 'NÃO (Opcional)', 'altura galpao, altura galpão', 'Metros (m)', '2.80', 'Altura do pé-direito médio do galpão.'],
  ['Tbl_txt', 'Comprimento galpão', 'Decimal', 'NÃO (Opcional)', 'comprimento galpao, comprimento galpão', 'Metros (m)', '150.0', 'Comprimento total interno do aviário.'],
  ['Tbl_txt', 'Largura  galpão ', 'Decimal', 'NÃO (Opcional)', 'largura galpao, largura galpão', 'Metros (m)', '14.0', 'Largura total interna do aviário.'],
  ['Tbl_txt', 'Vazão poço 1', 'Decimal', 'NÃO (Opcional)', 'vazao poco 1, vazao poço 1, poco 1', 'L/h ou m³/h', '18000', 'Vazão do poço artesiano principal de abastecimento.'],
  ['Tbl_txt', 'Vazão poço 2', 'Decimal', 'NÃO (Opcional)', 'vazao poco 2, vazao poço 2, poco 2', 'L/h ou m³/h', '12000', 'Vazão do poço auxiliar/reserva.'],
  ['Tbl_txt', 'Entrada de água no galpão', 'Decimal', 'NÃO (Opcional)', 'entrada de agua no galpao, entrada agua galpao', 'Milímetros (mm) ou pol', '50', 'Diâmetro do cano de entrada de água.'],
  ['Tbl_txt', 'armazenamento de água ', 'Decimal', 'NÃO (Opcional)', 'armazenamento de agua, armazenamento agua', 'Litros (L)', '45000', 'Capacidade total dos reservatórios do galpão.'],
  ['Tbl_txt', 'Alarme na casa ', 'Booleano', 'NÃO (Opcional)', 'alarme na casa, alarme casa, possui alarme casa', 'Sim / Não / 1 / 0', 'Sim', 'Indica presença de campainha de alarme na casa do granjeiro.'],
  ['Tbl_txt', 'Alarme na casa  funcionando ', 'Booleano', 'NÃO (Opcional)', 'alarme na casa funcionando, alarme casa func', 'Sim / Não / 1 / 0', 'Sim', 'Indica se o alarme da residência está 100% funcional.'],
  ['Tbl_txt', 'Alarme no aviario ', 'Booleano', 'NÃO (Opcional)', 'alarme no aviario, alarme aviario', 'Sim / Não / 1 / 0', 'Sim', 'Indica presença de alarme sonoro/visual no aviário.'],
  ['Tbl_txt', 'Alarme no aviario funcionado ', 'Booleano', 'NÃO (Opcional)', 'alarme no aviario funcionado, alarme aviario func', 'Sim / Não / 1 / 0', 'Sim', 'Indica se a sirene/sinalizador do aviário está funcional.'],
  ['Tbl_txt', 'Alarme nas caixas central', 'Booleano', 'NÃO (Opcional)', 'alarme nas caixas central, alarme caixas central', 'Sim / Não / 1 / 0', 'Sim', 'Indica alarme nos painéis de controle central elétrico.'],
  ['Tbl_txt', 'Alarme nas caixas central funcionando ', 'Booleano', 'NÃO (Opcional)', 'alarme nas caixas central funcionando', 'Sim / Não / 1 / 0', 'Sim', 'Indica status de funcionamento do alarme das caixas.'],
  ['Tbl_txt', 'lux 100%', 'Decimal', 'NÃO (Opcional)', 'lux 100%, lux 100, lux, iluminacao lux', 'Lux (lx)', '42.5', 'Intensidade luminosa aferida com dimmer a 100%.'],

  // Base Geral
  ['Base Geral', 'Contrato', 'Inteiro / Texto', 'SIM', 'contrato, num contrato', 'Identificador numérico', '23644', 'Número do contrato de integração da ave com a indústria.'],
  ['Base Geral', 'Empresa', 'Inteiro / Texto', 'SIM', 'empresa, cod empresa', 'Código ou nome da empresa', '1', 'Código de identificação da empresa (Bello=1, Levo=2, etc.).'],
  ['Base Geral', 'Instalação', 'Inteiro / Texto', 'SIM', 'instalacao, aviario', 'Número do aviário', '32', 'Número de instalação compatível com o cadastro de aviários.'],
  ['Base Geral', 'Município', 'Texto', 'NÃO', 'municipio, cidade', 'Nome da cidade', 'Itaquiraí', 'Município da granja.'],
  ['Base Geral', 'Cod. Avicultor', 'Inteiro / Texto', 'SIM', 'cod avicultor, cod produtor', 'Código ERP', '469', 'Código ERP/SAP do produtor integrado.'],
  ['Base Geral', 'Avicultor', 'Texto', 'SIM', 'avicultor, produtor', 'Nome do Produtor', 'Mauri Antonio Mazurek', 'Nome completo do avicultor integrado.'],
  ['Base Geral', 'Codigo Núcleo', 'Inteiro / Texto', 'NÃO', 'codigo nucleo', 'Código do núcleo', '145', 'Código identificador do núcleo produtivo.'],
  ['Base Geral', 'Núcleo', 'Texto', 'NÃO', 'nucleo, nome nucleo', 'Nome do núcleo', 'NÚCLEO 01', 'Nome do núcleo de aviários da propriedade.'],
  ['Base Geral', 'Alojamento', 'Data', 'SIM', 'alojamento, data alojamento', 'DD/MM/AAAA', '15/11/2024', 'Data efetiva de entrada dos pintainhos no galpão.'],
  ['Base Geral', 'Abate', 'Data', 'SIM', 'abate, data abate', 'DD/MM/AAAA', '07/01/2025', 'Data de carregamento e abate no frigorífico.'],
  ['Base Geral', 'Linhagem', 'Texto', 'NÃO', 'linhagem, raca', 'Cobb 500, Ross 308, etc.', 'Cobb 500 Slow', 'Linhagem genética das aves do lote.'],
  ['Base Geral', 'Qtde Alojamento', 'Inteiro', 'SIM', 'qtde alojamento, aves alojadas', 'Inteiro positivo', '41000', 'Total de pintainhos alojados no início do ciclo.'],
  ['Base Geral', 'Aves Abate', 'Inteiro', 'SIM', 'aves abate, total abatido', 'Inteiro positivo', '37820', 'Total de frangos vivos recebidos no frigorífico.'],
  ['Base Geral', 'Viabilidade', 'Percentual', 'NÃO', 'viabilidade', '0.00 a 1.00 ou 0 a 100%', '92.24%', 'Percentual de aves entregues sobre o alojado.'],
  ['Base Geral', 'Ps Médio', 'Decimal', 'NÃO', 'ps medio, peso medio', 'Quilos (kg)', '3.630', 'Peso médio individual das aves no abate.'],
  ['Base Geral', 'GPD', 'Decimal', 'NÃO', 'gpd, ganho de peso', 'Gramas/dia (g)', '69.99', 'Ganho de Peso Diário médio durante o lote.'],
  ['Base Geral', 'CA.', 'Decimal', 'NÃO', 'ca, conversao alimentar', 'Índice decimal', '1.779', 'Conversão Alimentar real (kg ração / kg carne).'],
  ['Base Geral', 'Consumo Ração', 'Decimal', 'NÃO', 'consumo racao', 'Quilos (kg)', '244243', 'Volume total de ração consumida pelo lote.'],
  ['Base Geral', 'Valor Ração', 'Moeda', 'NÃO', 'valor racao, custo racao', 'Reais (R$)', '406193.93', 'Custo total de ração faturada para o lote.'],
  ['Base Geral', 'Repasse integrado', 'Moeda', 'NÃO', 'repasse integrado', 'Reais (R$)', '54853.57', 'Valor líquido pago ao integrado no acerto final.'],
  ['Base Geral', 'Rentabilidade/Kg', 'Moeda', 'NÃO', 'rentabilidade kg', 'Reais por kg (R$/kg)', '0.398', 'Margem de contribuição ou rentabilidade por kg abatido.'],

  // Lotes_Condominios
  ['Lotes_Condominios', 'Número do Lote', 'Texto', 'SIM (Obrigatório)', 'numero_lote, lote', 'Código do Lote', 'LOTE-2026-094', 'Identificador único do lote do condomínio.'],
  ['Lotes_Condominios', 'Condomínio', 'Texto', 'SIM (Obrigatório)', 'condominio, condominio_nome', 'Nome do Condomínio', 'Aroeira', 'Nome do condomínio avícola cadastrado no sistema.'],
  ['Lotes_Condominios', 'Núcleo', 'Texto', 'NÃO (Opcional)', 'nucleo, nucleo_nome', 'Nome do Núcleo', 'Único', 'Identificação do núcleo de aviários do condomínio.'],
  ['Lotes_Condominios', 'Número Aviário / Instalação', 'Inteiro / Texto', 'SIM (Obrigatório)', 'aviario_numero, instalacao', 'Número do aviário', '94', 'Número do galpão dentro do condomínio.'],
  ['Lotes_Condominios', 'Nome do Produtor', 'Texto', 'SIM (Obrigatório)', 'produtor_nome, avicultor', 'Nome completo', 'Carlos Eduardo Silva', 'Produtor ou cooperado responsável pelo aviário.'],
  ['Lotes_Condominios', 'Data Alojamento', 'Data', 'SIM (Obrigatório)', 'data_alojamento', 'DD/MM/AAAA', '14/05/2026', 'Data de início do lote com alojamento das aves.'],
  ['Lotes_Condominios', 'Data Abate Prevista', 'Data', 'NÃO (Opcional)', 'data_abate_prevista', 'DD/MM/AAAA', '26/06/2026', 'Previsão de carregamento para abate.'],
  ['Lotes_Condominios', 'Data Abate Real', 'Data', 'NÃO (Opcional)', 'data_abate_real', 'DD/MM/AAAA', '25/06/2026', 'Data em que ocorreu o abate no frigorífico.'],
  ['Lotes_Condominios', 'Status', 'Texto', 'SIM (Obrigatório)', 'status', 'aberto / em andamento / encerrado', 'encerrado', 'Situação operacional e contábil do lote.'],
  ['Lotes_Condominios', 'Quantidade Alojada', 'Inteiro', 'SIM (Obrigatório)', 'qtd_alojada', 'Inteiro positivo', '34500', 'Número de aves alojadas no início do ciclo.'],
  ['Lotes_Condominios', 'Quantidade Abatida', 'Inteiro', 'NÃO (Opcional)', 'qtd_abatida', 'Inteiro positivo', '33430', 'Número de aves abatidas com sucesso.'],
  ['Lotes_Condominios', 'Peso Médio (kg)', 'Decimal', 'NÃO (Opcional)', 'peso_medio', 'Quilos (kg)', '3.301', 'Peso médio individual ao abate.'],
  ['Lotes_Condominios', 'Mortalidade (%)', 'Percentual', 'NÃO (Opcional)', 'mortalidade_pct', 'Percentual (0 a 100%)', '3.10%', 'Taxa de mortalidade acumulada no ciclo.'],
  ['Lotes_Condominios', 'Idade Abate (dias)', 'Inteiro', 'NÃO (Opcional)', 'idade_abate', 'Dias', '42', 'Duração do ciclo do alojamento ao abate.'],
  ['Lotes_Condominios', 'Conversão Alimentar (CA)', 'Decimal', 'NÃO (Opcional)', 'ca', 'Índice CA', '1.55', 'Conversão alimentar realizada no lote.'],
  ['Lotes_Condominios', 'Ganho Peso Diário (GPD g)', 'Decimal', 'NÃO (Opcional)', 'gpd', 'Gramas/dia', '74.20', 'GPD obtido pelo lote no período.'],
  ['Lotes_Condominios', 'Índice Eficiência Produtiva (IEP)', 'Inteiro', 'NÃO (Opcional)', 'iep', 'Pontos IEP', '438', 'Índice de Eficiência Produtiva Zootécnica.'],
  ['Lotes_Condominios', 'Viabilidade (%)', 'Percentual', 'NÃO (Opcional)', 'viabilidade', 'Percentual (0 a 100%)', '96.90%', 'Percentual de sobrevivência das aves entregues.'],
  ['Lotes_Condominios', 'Receita Total (R$)', 'Moeda', 'NÃO (Opcional)', 'receita_total', 'Reais (R$)', '270941.32', 'Faturamento bruto gerado pelo lote.'],
  ['Lotes_Condominios', 'Custo Total (R$)', 'Moeda', 'NÃO (Opcional)', 'custo_total', 'Reais (R$)', '218500.00', 'Soma de despesas e insumos do lote.'],
  ['Lotes_Condominios', 'Resultado Líquido (R$)', 'Moeda', 'NÃO (Opcional)', 'resultado_liquido', 'Reais (R$)', '52441.32', 'Lucro líquido do lote (Receita - Custo).'],
  ['Lotes_Condominios', 'Receita por Cabeça (R$)', 'Moeda', 'NÃO (Opcional)', 'receita_por_cabeca', 'Reais (R$)', '8.10', 'Receita líquida rateada por ave abatida.'],
  ['Lotes_Condominios', 'Receita por Kg (R$)', 'Moeda', 'NÃO (Opcional)', 'receita_por_kg', 'Reais (R$)', '2.45', 'Receita líquida por quilo de frango vivo.']
];

const wsInstrucoes = XLSX.utils.aoa_to_sheet(instrucoesData);
wsInstrucoes['!cols'] = [
  { wch: 22 }, // Aba / Módulo
  { wch: 38 }, // Coluna / Cabeçalho
  { wch: 20 }, // Tipo de Dado
  { wch: 22 }, // Obrigatório?
  { wch: 45 }, // Aliases
  { wch: 32 }, // Formato
  { wch: 28 }, // Exemplo
  { wch: 55 }  // Regras
];
XLSX.utils.book_append_sheet(wb, wsInstrucoes, 'INSTRUCOES_E_DICIONARIO');

// ============================================================================
// 2. ABA Tbl_txt — FICHA CADASTRAL, PRODUTORES, AVIÁRIOS E SETUPS
// ============================================================================
const tblTxtHeaders = [
  'Avicultor',
  'Instalação',
  'Extensionista ',
  'Pressão de  vedação',
  'Pressão de trabalho ',
  'Velocidade de vento',
  'Quantidade de exaustores ',
  'entrada de ar lado direito ',
  'entrada de ar lado esquerdo',
  'Tamanho de placa ',
  'Tempo para molhar a placa ',
  'Altura galpão',
  'Comprimento galpão',
  'Largura  galpão ',
  'Vazão poço 1',
  'Vazão poço 2',
  'Entrada de água no galpão',
  'armazenamento de água ',
  'Alarme na casa ',
  'Alarme na casa  funcionando ',
  'Alarme no aviario ',
  'Alarme no aviario funcionado ',
  'Alarme nas caixas central',
  'Alarme nas caixas central funcionando ',
  'lux 100%'
];

const tblTxtRows = [
  tblTxtHeaders,
  // Linha 1: Exemplo Produtor Padrão Dark House
  [
    'Agropecuária Vale do Sol Ltda',
    1,
    'Dr. Bruno Faganello',
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
  // Linha 2: Exemplo Produtor Galpão 2
  [
    'Agropecuária Vale do Sol Ltda',
    2,
    'Dr. Bruno Faganello',
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
  // Linha 3: Granja Esperança
  [
    'Granja Esperança e Prosperidade',
    1,
    'Eng. Mariana Vasconcelos',
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
  ],
  // Linha 4: Sítio Primavera
  [
    'Sítio Primavera das Aves',
    1,
    'Dr. Ricardo Albuquerque',
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
  // Linha 5: Fazenda Rio Claro
  [
    'Fazenda Rio Claro Agropecuária',
    1,
    'Dr. Bruno Faganello',
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
  ]
];

const wsTblTxt = XLSX.utils.aoa_to_sheet(tblTxtRows);
wsTblTxt['!cols'] = tblTxtHeaders.map(h => ({ wch: Math.max(h.length + 4, 14) }));
wsTblTxt['!autofilter'] = { ref: `A1:Y${tblTxtRows.length}` };
XLSX.utils.book_append_sheet(wb, wsTblTxt, 'Tbl_txt');

// ============================================================================
// 3. ABA Base Geral — ACOMPANHAMENTO DE LOTES A CAMPO & DESEMPENHO ZOOTÉCNICO
// ============================================================================
const baseGeralHeaders = [
  'Contrato',
  'Empresa',
  'Instalação',
  'Município',
  'Cod. Avicultor',
  'Avicultor',
  'Codigo Núcleo',
  'Núcleo',
  'Alojamento',
  'Abate',
  'Mês Aloj',
  'Ano Aloj',
  'Mês Abate',
  'Ano Abate',
  'Fornecedor',
  'Incubatório',
  'Linhagem',
  'Qtde Alojamento',
  'Área M²',
  'Densidade',
  'Peso Pintainho',
  'Sexo',
  'Tp Animal',
  'Lote Matriz Majoritária',
  'Idade Matriz',
  'Unidade',
  'Status',
  'Idade Matriz Majoritária',
  'Idade Matriz Real',
  'Idade Matriz Predominante',
  'Código Projeto',
  'Projeto',
  'Código Tipo Projeto',
  'Tipo Projeto',
  'Pesos',
  'Aves Alojto',
  'Aves Abate',
  'Viabilidade',
  'Ps Acerto',
  'Ps Médio',
  'Idade :',
  'GPD',
  'CA.',
  'CA. Aj. 3.0',
  'C.A.Aj. 2.7:',
  '%Mort.',
  'Ração Pre Inicial',
  'Ração Inicial',
  'Ração Crescimento',
  'Ração Final',
  'Devolução',
  'Consumo Ração',
  'Consumo Ave',
  'Valor Pintainhos',
  'Valor Pintainho/kg',
  'Ração KG/Aves:',
  'Repasse integrado',
  'Rentabilidade/Kg',
  'Rentabilidade/Und',
  'Medicamentos',
  'Medicamento/Kg',
  'Valor Ração',
  'Ração/Kg Fgo Vivo',
  'CA. Real Ponderada',
  'CA. Aj. 3.0 Ponderada',
  'C.A.Aj. 2.7 Ponderada',
  'Mort 7 Dias',
  '% Mort 7 Dias',
  'Mort 14 Dias',
  '% Mort 14 Dias',
  'Mort 21 Dias',
  '% Mort 21 Dias',
  'Mort 28 Dias',
  '% Mort 28 Dias',
  'Mort 35 Dias',
  '% Mort 35 Dias',
  'Mort 42 Dias',
  '% Mort 42 Dias',
  'Mort 49 Dias',
  '% Mort 49 Dias',
  'PM 07 Dias',
  'PM 14 Dias',
  'PM 21 Dias',
  'PM 28 Dias',
  'PM 35 Dias',
  'PM 42 Dias',
  'PM 49 Dias'
];

const baseGeralSampleRows = [
  baseGeralHeaders,
  // Linha 1 Exemplo
  [
    24101, 1, 1, 'Itaquiraí', 469, 'Agropecuária Vale do Sol Ltda', 145, 'NÚCLEO 01',
    '15/01/2026', '27/02/2026', 'jan', 2026, 2, 2026,
    'Pluma Agro Avícola Ltda', 'Incubatório Central', 'Cobb 500 Slow', 42000, 3150, 13.33, 0.040,
    'Misto', 1, 13100, 46, 'Bello Alimentos', 'Encerrado', 46, '46', 46,
    101, 'Projeto Alta Eficiência', 1, 'Dark House Convencional', 8.50, 42000, 40450, 0.9631,
    145620, 3.60, 43, 72.50, 1.62, 1.55, 1.48, 0.0369,
    8500, 16200, 125000, 105000, -2500, 252200, 6.23,
    115500.00, 0.79, 6.23, 62500.00, 0.43, 1.54, 1200.00, 0.008, 416130.00, 2.85,
    252200, 235000, 224000,
    290, 0.0069, 140, 0.0033, 280, 0.0066, 350, 0.0083, 310, 0.0073, 180, 0.0042, 0, 0,
    0.195, 0.490, 0.985, 1.590, 2.310, 3.050, 3.600
  ],
  // Linha 2 Exemplo
  [
    24102, 1, 2, 'Itaquiraí', 469, 'Agropecuária Vale do Sol Ltda', 145, 'NÚCLEO 01',
    '18/01/2026', '02/03/2026', 'jan', 2026, 3, 2026,
    'Pluma Agro Avícola Ltda', 'Incubatório Central', 'Ross 308 AP', 42000, 3150, 13.33, 0.041,
    'Misto', 1, 13105, 48, 'Bello Alimentos', 'Encerrado', 48, '48', 48,
    101, 'Projeto Alta Eficiência', 1, 'Dark House Convencional', 8.50, 42000, 40100, 0.9548,
    144360, 3.60, 43, 72.10, 1.64, 1.56, 1.50, 0.0452,
    8600, 16400, 126000, 107000, -2000, 256000, 6.38,
    115500.00, 0.80, 6.38, 59800.00, 0.41, 1.49, 1350.00, 0.009, 422400.00, 2.92,
    256000, 238000, 228000,
    310, 0.0073, 160, 0.0038, 300, 0.0071, 380, 0.0090, 450, 0.0107, 300, 0.0071, 0, 0,
    0.190, 0.485, 0.970, 1.570, 2.290, 3.020, 3.600
  ],
  // Linha 3 Exemplo
  [
    24103, 2, 1, 'Iporã', 512, 'Granja Esperança e Prosperidade', 160, 'NÚCLEO UNICO',
    '05/02/2026', '20/03/2026', 'fev', 2026, 3, 2026,
    'Pluma Agro Avícola Ltda', 'Incubatório Oeste', 'Cobb 500 Slow', 45000, 3400, 13.23, 0.039,
    'Misto', 1, 13120, 44, 'Levo Alimentos', 'Encerrado', 44, '44', 44,
    102, 'Expansão Climatizada', 2, 'Dark House Solid Wall', 8.90, 45000, 43600, 0.9689,
    161320, 3.70, 43, 74.40, 1.58, 1.50, 1.44, 0.0311,
    9100, 17500, 135000, 114000, -1800, 273800, 6.28,
    123750.00, 0.76, 6.28, 71200.00, 0.44, 1.63, 1100.00, 0.007, 451770.00, 2.80,
    273800, 252000, 241000,
    250, 0.0055, 120, 0.0026, 220, 0.0048, 290, 0.0064, 310, 0.0068, 210, 0.0046, 0, 0,
    0.200, 0.505, 1.010, 1.630, 2.370, 3.120, 3.700
  ]
];

const wsBaseGeral = XLSX.utils.aoa_to_sheet(baseGeralSampleRows);
wsBaseGeral['!cols'] = baseGeralHeaders.map(h => ({ wch: Math.max(h.length + 3, 12) }));
wsBaseGeral['!autofilter'] = { ref: `A1:CK${baseGeralSampleRows.length}` };
XLSX.utils.book_append_sheet(wb, wsBaseGeral, 'Base Geral');

// ============================================================================
// 4. ABA Lotes_Condominios — MÓDULO CONDOMÍNIOS, NÚCLEOS & FECHAMENTO
// ============================================================================
const lotesHeaders = [
  'Número do Lote',
  'Condomínio',
  'Núcleo',
  'Número Aviário / Instalação',
  'Nome do Produtor',
  'Data Alojamento',
  'Data Abate Prevista',
  'Data Abate Real',
  'Mês Abate',
  'Ano Abate',
  'Status',
  'Quantidade Alojada',
  'Quantidade Abatida',
  'Peso Médio (kg)',
  'Mortalidade (%)',
  'Idade Abate (dias)',
  'Conversão Alimentar (CA)',
  'Ganho Peso Diário (GPD g)',
  'Índice Eficiência Produtiva (IEP)',
  'Viabilidade (%)',
  'Receita Total (R$)',
  'Custo Total (R$)',
  'Resultado Líquido (R$)',
  'Receita por Cabeça (R$)',
  'Receita por Kg (R$)'
];

const lotesRows = [
  lotesHeaders,
  // Linha 1 Exemplo Condomínio Aroeira
  [
    'LOTE-2026-094',
    'Aroeira',
    'Único',
    '94',
    'Carlos Eduardo Silva',
    '14/05/2026',
    '26/06/2026',
    '25/06/2026',
    6,
    2026,
    'encerrado',
    34500,
    33430,
    3.301,
    0.031,
    42,
    1.55,
    74.2,
    438,
    0.969,
    270941.32,
    218500.00,
    52441.32,
    8.10,
    2.45
  ],
  // Linha 2 Exemplo Campo Verde Núcleo 1
  [
    'LOTE-2026-095',
    'Campo Verde',
    'Núcleo 01',
    '01',
    'Marcos Vinicius Pereira',
    '20/05/2026',
    '02/07/2026',
    '01/07/2026',
    7,
    2026,
    'encerrado',
    36000,
    34920,
    3.380,
    0.030,
    42,
    1.53,
    75.8,
    452,
    0.970,
    289836.00,
    228400.00,
    61436.00,
    8.30,
    2.46
  ],
  // Linha 3 Exemplo Campo Verde Núcleo 2
  [
    'LOTE-2026-096',
    'Campo Verde',
    'Núcleo 02',
    '02',
    'Juliana Rodrigues Alves',
    '22/05/2026',
    '04/07/2026',
    '03/07/2026',
    7,
    2026,
    'encerrado',
    36000,
    34740,
    3.350,
    0.035,
    42,
    1.56,
    74.5,
    435,
    0.965,
    285620.00,
    231000.00,
    54620.00,
    8.22,
    2.45
  ],
  // Linha 4 Exemplo Em Andamento
  [
    'LOTE-2026-110',
    'Aroeira',
    'Único',
    '95',
    'Carlos Eduardo Silva',
    '01/09/2026',
    '13/10/2026',
    null,
    10,
    2026,
    'em andamento',
    35000,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null
  ]
];

const wsLotes = XLSX.utils.aoa_to_sheet(lotesRows);
wsLotes['!cols'] = lotesHeaders.map(h => ({ wch: Math.max(h.length + 4, 15) }));
wsLotes['!autofilter'] = { ref: `A1:Y${lotesRows.length}` };
XLSX.utils.book_append_sheet(wb, wsLotes, 'Lotes_Condominios');

// ============================================================================
// SALVAR ARQUIVO NO ROOT DO PROJETO
// ============================================================================
const outputPath = path.resolve(process.cwd(), 'MODELO_PADRAO_IMPORTACAO_PAINEL.xlsx');
XLSX.writeFile(wb, outputPath);
console.log(`\n✓ Arquivo gerado com sucesso em: ${outputPath}`);
console.log(`Tamanho do arquivo: ${fs.statSync(outputPath).size} bytes`);
