export interface Produtor {
  id: string;
  nome: string;
  codigo_avicultor?: string | null;
  municipio?: string | null;
  telefone?: string | null;
  email?: string | null;
  status?: string;
  created_at: string;
  updated_at: string;
}

export interface Tecnico {
  id: string;
  nome: string;
  telefone?: string | null;
  email?: string | null;
  unidade?: string | null;
  status?: string;
  created_at: string;
  updated_at: string;
}

export interface Aviario {
  id: string;
  produtor_id: string;
  tecnico_id?: string | null;
  numero_instalacao: string;
  nucleo?: string | null;
  capacidade?: number | null;
  area_m2?: number | null;
  densidade?: number | null;
  status?: string;
  created_at: string;
  updated_at: string;
  // Joins
  produtor?: Produtor;
  tecnico?: Tecnico;
  setup?: SetupAviario;
}

export interface SetupAviario {
  id: string;
  aviario_id: string;
  
  // Pressao de Vedacao
  pressao_vedacao_exaustor?: number | null;
  pressao_vedacao_manometro?: number | null;
  pressao_vedacao_painel?: number | null;
  pressao_vedacao_media?: number | null;
  
  // Pressao de Trabalho
  pressao_trabalho_exaustor?: number | null;
  pressao_trabalho_manometro?: number | null;
  pressao_trabalho_painel?: number | null;
  pressao_trabalho_media?: number | null;
  
  // Ventilacao Total (m/s)
  ventilacao_dir?: number | null;
  ventilacao_meio?: number | null;
  ventilacao_esq?: number | null;
  ventilacao_media?: number | null;
  
  // Quantidade de Exaustores
  qtd_exaustores?: number | null;
  
  // Ventilacao Entrada de Ar (m/s)
  vent_ar_l1_p1?: number | null;
  vent_ar_l1_p2?: number | null;
  vent_ar_l1_p3?: number | null;
  vent_ar_l2_p1?: number | null;
  vent_ar_l2_p2?: number | null;
  vent_ar_l2_p3?: number | null;
  vent_ar_media?: number | null;
  entrada_ar_direito?: string | null;
  entrada_ar_esquerdo?: string | null;
  
  // Iluminacao / Lux
  iluminacao_sob_lampada?: number | null;
  iluminacao_lateral?: number | null;
  iluminacao_triangulo?: number | null;
  lux_100?: number | null;
  
  // Placa Evaporativa
  tamanho_placa?: number | null;
  tempo_molhar_placa?: number | null;
  
  // Dimensoes do Galpao
  altura_frente?: number | null;
  altura_meio?: number | null;
  altura_fundo?: number | null;
  altura_media?: number | null;
  comprimento_galpao?: number | null;
  largura_galpao?: number | null;
  
  // Recursos Hidricos
  vazao_poco_1?: number | null;
  vazao_poco_2?: number | null;
  entrada_agua_galpao?: number | null;
  armazenamento_agua?: number | null;
  
  // Alarmes
  alarme_casa?: boolean | null;
  alarme_casa_func?: boolean | null;
  alarme_aviario?: boolean | null;
  alarme_aviario_func?: boolean | null;
  alarme_caixas?: boolean | null;
  alarme_caixas_func?: boolean | null;
  
  observacoes?: string | null;
  created_at: string;
  updated_at: string;

  // Auditoria e Rastreamento
  created_by_id?: string | null;
  created_by_name?: string | null;
  updated_by_id?: string | null;
  updated_by_name?: string | null;
}

export interface SetupCampoAlterado {
  campo: string;
  label: string;
  valor_anterior: any;
  valor_novo: any;
}

export interface SetupHistorico {
  id: string;
  aviario_id: string;
  setup_id?: string | null;
  versao: number;
  tipo_acao: 'CRIACAO' | 'EDICAO' | 'RESTAURACAO';
  usuario_id?: string | null;
  usuario_nome: string;
  usuario_email?: string | null;
  dados_snapshot: Partial<SetupAviario>;
  alteracoes: SetupCampoAlterado[];
  resumo_alteracoes?: string | null;
  created_at: string;
}

export interface ImportacaoLog {
  id: string;
  nome_arquivo: string;
  aba_origem: string;
  total_registros: number;
  produtores_criados: number;
  produtores_atualizados: number;
  aviarios_criados: number;
  aviarios_atualizados: number;
  tecnicos_criados: number;
  tecnicos_atualizados: number;
  setups_criados: number;
  setups_atualizados: number;
  registros_com_erro: number;
  erros_json?: Array<{
    linha: number;
    produtor?: string;
    instalacao?: string | number;
    erro: string;
  }> | null;
  importado_por?: string;
  created_at: string;
}

export interface ParsedRowValidation {
  linha: number;
  avicultorRaw: string;
  avicultorClean: string;
  instalacaoRaw: string | number;
  instalacaoClean: string;
  extensionistaRaw?: string;
  extensionistaClean?: string;
  isValid: boolean;
  erros: string[];
  avisos: string[];
  data: Record<string, any>;
}

export interface ImportPreviewSummary {
  totalLinhas: number;
  linhasValidas: number;
  linhasComErro: number;
  produtoresUnicos: number;
  aviariosUnicos: number;
  tecnicosUnicos: number;
  previewRows: ParsedRowValidation[];
  allRows: ParsedRowValidation[];
}
