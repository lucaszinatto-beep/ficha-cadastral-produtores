import React, { useState, useMemo } from 'react';
import {
  X,
  BookOpen,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Layers,
  Users,
  UserCheck,
  History,
  UploadCloud,
  Search,
  Printer,
  Shield,
  CheckCircle2,
  Lightbulb,
  Sparkles,
  ArrowRight,
  Sliders,
  ExternalLink,
  Info
} from 'lucide-react';

interface TutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (tab: 'fichas' | 'produtores' | 'tecnicos' | 'historico') => void;
}

// 6 Passos do Tour Rápido
interface TourStep {
  step: number;
  title: string;
  badge: string;
  shortDesc: string;
  icon: React.ReactNode;
  content: React.ReactNode;
  targetTab?: 'fichas' | 'produtores' | 'tecnicos' | 'historico';
  tabActionLabel?: string;
}

// Tópicos do Guia Completo por Módulos
interface GuideTopic {
  id: string;
  title: string;
  category: 'fichas' | 'navegacao' | 'produtores' | 'tecnicos' | 'importacao' | 'seguranca' | 'faq';
  keywords: string[];
  icon: React.ReactNode;
  content: React.ReactNode;
  targetTab?: 'fichas' | 'produtores' | 'tecnicos' | 'historico';
}

export const TutorialModal: React.FC<TutorialModalProps> = ({
  isOpen,
  onClose,
  onNavigateTab
}) => {
  const [activeMode, setActiveMode] = useState<'tour' | 'guide'>('tour');
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [guideSearch, setGuideSearch] = useState('');
  const [selectedTopicId, setSelectedTopicId] = useState<string>('fichas-estrutura');

  // Definição dos passos do Tour Rápido
  const tourSteps: TourStep[] = useMemo(() => [
    {
      step: 1,
      title: 'Bem-vindo ao Sistema Bello Alimentos',
      badge: 'Visão Geral & Barra Superior',
      shortDesc: 'Aprenda como se orientar na plataforma em menos de 1 minuto.',
      icon: <Sparkles className="w-5 h-5 text-sky-400" />,
      targetTab: 'fichas',
      tabActionLabel: 'Ir para a Tela Inicial',
      content: (
        <div className="space-y-4">
          <p className="text-sm text-slate-300 leading-relaxed">
            Este sistema foi projetado especificamente para unificar a <strong>Ficha Cadastral de Produtores</strong>, o gerenciamento de <strong>Aviários</strong> e as <strong>Fichas Técnicas de Setup de Granja</strong> em uma interface rápida e intuitiva.
          </p>
          
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 space-y-3">
            <h4 className="text-xs font-bold text-sky-300 uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4" /> Elementos Principais do Topo
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                <span className="font-bold text-white block mb-1">🔢 Contadores em Tempo Real</span>
                <span className="text-slate-400">Total de produtores e aviários cadastrados sincronizados com o Supabase.</span>
              </div>
              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                <span className="font-bold text-white block mb-1">🔍 Busca Global Universal</span>
                <span className="text-slate-400">Encontre qualquer produtor pelo nome em qualquer ponto do sistema.</span>
              </div>
              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                <span className="font-bold text-white block mb-1">📑 Abas de Navegação</span>
                <span className="text-slate-400">Alterne entre Fichas de Setup, Produtores, Técnicos e Histórico.</span>
              </div>
              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                <span className="font-bold text-white block mb-1">👤 Perfil & Nível</span>
                <span className="text-slate-400">Identificação de login e nível de permissão (Super Admin, Admin, etc.).</span>
              </div>
            </div>
          </div>

          <div className="p-3 bg-sky-950/40 border border-sky-500/30 rounded-xl text-xs text-sky-200 flex items-start gap-2.5">
            <Lightbulb className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
            <span><strong>Dica:</strong> Você pode navegar pelas 4 visões principais a qualquer momento através da barra de abas no topo da tela.</span>
          </div>
        </div>
      )
    },
    {
      step: 2,
      title: 'Filtro em Cascata Dinâmico',
      badge: 'Como Encontrar Qualquer Granja',
      shortDesc: 'Produtor ➔ Aviários (Chips) ➔ Ficha Instantânea.',
      icon: <Sliders className="w-5 h-5 text-indigo-400" />,
      targetTab: 'fichas',
      tabActionLabel: 'Testar Filtro em Cascata',
      content: (
        <div className="space-y-4">
          <p className="text-sm text-slate-300 leading-relaxed">
            Para consultar os parâmetros de um aviário, o sistema utiliza uma <strong>cascata de 2 etapas</strong> que evita cliques desnecessários:
          </p>

          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-4">
            {/* Simulação Visual do Filtro */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Etapa 1: Selecione o Produtor
              </span>
              <div className="bg-slate-800 border border-slate-700 px-3 py-2 rounded-xl text-xs text-white flex items-center justify-between">
                <span className="font-medium text-sky-300">Ex: 010203 - AGROPECUARIA SÃO PEDRO</span>
                <span className="text-[10px] bg-slate-700 px-2 py-0.5 rounded text-slate-300">4 Aviários</span>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Etapa 2: Clique no Aviário Desejado
              </span>
              <div className="flex flex-wrap gap-2">
                <div className="px-3 py-1.5 rounded-lg bg-sky-500/20 text-sky-300 border border-sky-400 text-xs font-bold flex items-center gap-1.5 shadow-sm">
                  <span>🏠 Galpão 01</span>
                  <span className="text-[10px] text-sky-400">● Selecionado</span>
                </div>
                <div className="px-3 py-1.5 rounded-lg bg-slate-800/80 text-slate-300 border border-slate-700 text-xs hover:border-slate-500">
                  <span>🏠 Galpão 02</span>
                </div>
                <div className="px-3 py-1.5 rounded-lg bg-slate-800/80 text-slate-300 border border-slate-700 text-xs hover:border-slate-500">
                  <span>🏠 Galpão 03</span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-xs text-emerald-200 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>Ao clicar em qualquer galpão, a ficha técnica inteira é carregada em menos de 1 segundo com todas as informações salvas no Supabase.</span>
          </div>
        </div>
      )
    },
    {
      step: 3,
      title: 'Ficha Técnica Oficial de Setup',
      badge: 'Padrão Oficial Bello Alimentos',
      shortDesc: 'Medições precisas de pressão, ventilação, placas e alarmes.',
      icon: <Layers className="w-5 h-5 text-emerald-400" />,
      targetTab: 'fichas',
      tabActionLabel: 'Visualizar Ficha de Setup',
      content: (
        <div className="space-y-4">
          <p className="text-sm text-slate-300 leading-relaxed">
            A Ficha de Setup replica 100% dos blocos e seções técnicas do documento oficial da Bello Alimentos:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/80">
              <span className="font-bold text-sky-300 block mb-1">💨 Pressão de Vedação & Trabalho</span>
              <p className="text-slate-400 leading-normal">
                Campos para Exaustor, Manômetro e Painel com <strong>cálculo automático de médias</strong>.
              </p>
            </div>
            <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/80">
              <span className="font-bold text-sky-300 block mb-1">🌀 Ventilação Total & Entradas</span>
              <p className="text-slate-400 leading-normal">
                Velocidade do vento (m/s) em Lateral Direita, Meio, Lateral Esquerda e Lados 1 e 2.
              </p>
            </div>
            <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/80">
              <span className="font-bold text-sky-300 block mb-1">💡 Iluminação & Placas</span>
              <p className="text-slate-400 leading-normal">
                Níveis de Lux (Sob Lâmpada, Lateral, Triângulo) e área (m²) com tempo para molhar placa.
              </p>
            </div>
            <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/80">
              <span className="font-bold text-sky-300 block mb-1">🚨 Painel de Alarmes & Água</span>
              <p className="text-slate-400 leading-normal">
                Status de alarmes (Casa, Galpão, Caixas Centrais) e vazões de poços e reservatório.
              </p>
            </div>
          </div>

          <div className="p-3 bg-blue-950/40 border border-blue-500/30 rounded-xl text-xs text-blue-200 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <span>As médias de vedação, trabalho, ventilação e altura são recalculadas automaticamente na tela conforme você digita os valores.</span>
          </div>
        </div>
      )
    },
    {
      step: 4,
      title: 'Edição, Auditoria & Impressão',
      badge: 'Controle & Segurança de Dados',
      shortDesc: 'Modifique valores, veja quem alterou e imprima em PDF.',
      icon: <Printer className="w-5 h-5 text-amber-400" />,
      targetTab: 'fichas',
      tabActionLabel: 'Abrir Ficha de Setup',
      content: (
        <div className="space-y-4">
          <p className="text-sm text-slate-300 leading-relaxed">
            Todas as ações realizadas nas fichas são rastreadas para total segurança operacional:
          </p>

          <div className="space-y-2.5 text-xs">
            <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 flex items-start gap-3">
              <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg shrink-0">
                <Sliders className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-white block">1. Modo de Edição e Salvamento</span>
                <p className="text-slate-400 mt-0.5">
                  Clique no botão <strong>"Editar Ficha"</strong> no topo do card, faça as alterações necessárias e clique em <strong>"Salvar Alterações"</strong>.
                </p>
              </div>
            </div>

            <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 flex items-start gap-3">
              <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg shrink-0">
                <History className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-white block">2. Histórico de Versões & Auditoria</span>
                <p className="text-slate-400 mt-0.5">
                  O botão <strong>"Histórico de Alterações"</strong> exibe todas as versões salvas, com data, hora, usuário responsável e opção de <strong>restaurar qualquer versão anterior</strong>.
                </p>
              </div>
            </div>

            <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 flex items-start gap-3">
              <div className="p-2 bg-purple-500/20 text-purple-400 rounded-lg shrink-0">
                <Printer className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-white block">3. Impressão Oficial em PDF</span>
                <p className="text-slate-400 mt-0.5">
                  Clique em <strong>"Imprimir Ficha"</strong> para visualizar o documento diagramado fielmente ao PDF oficial da Bello Alimentos, pronto para impressão em folha A4 ou salvar como PDF.
                </p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      step: 5,
      title: 'Gestão de Produtores & Técnicos',
      badge: 'Módulos Especializados',
      shortDesc: 'Visão agregada de granjas e controle da equipe de extensionistas.',
      icon: <Users className="w-5 h-5 text-sky-400" />,
      targetTab: 'produtores',
      tabActionLabel: 'Ver Visão de Produtores',
      content: (
        <div className="space-y-4">
          <p className="text-sm text-slate-300 leading-relaxed">
            Além da ficha técnica individual, você conta com duas telas dedicadas para visão geral da operação:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700 space-y-2">
              <div className="flex items-center gap-2 text-sky-300 font-bold">
                <Users className="w-4 h-4" /> Aba Produtores
              </div>
              <p className="text-slate-400 leading-normal">
                Visualize todos os produtores, total de aviários, capacidade de aves de cada instalação, área em m² e densidade média.
              </p>
              <div className="text-[11px] text-sky-400 font-semibold">
                ➜ Atalhos diretos para abrir a ficha de qualquer galpão com 1 clique.
              </div>
            </div>

            <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700 space-y-2">
              <div className="flex items-center gap-2 text-emerald-300 font-bold">
                <UserCheck className="w-4 h-4" /> Aba Extensionistas
              </div>
              <p className="text-slate-400 leading-normal">
                Cadastre novos técnicos, edite contatos (telefone, email, unidade) e consulte a lista de aviários atendidos por cada um.
              </p>
              <div className="text-[11px] text-emerald-400 font-semibold">
                ➜ Exclusão segura: desvincula aviários sem apagar históricos de fichas.
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      step: 6,
      title: 'Importação Excel & Segurança',
      badge: 'Importação Inteligente & Perfis',
      shortDesc: 'Como planilhas são carregadas e quem tem permissão para editar.',
      icon: <UploadCloud className="w-5 h-5 text-blue-400" />,
      targetTab: 'historico',
      tabActionLabel: 'Ver Histórico de Importações',
      content: (
        <div className="space-y-4">
          <p className="text-sm text-slate-300 leading-relaxed">
            A engine inteligente de importação permite carregar planilhas completas com regras automáticas de proteção contra duplicidades:
          </p>

          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3 text-xs">
            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 font-bold flex items-center justify-center shrink-0 text-[11px]">1</span>
              <div>
                <strong className="text-white">Detecção de Abas e Mapeamento Tolerante:</strong>
                <p className="text-slate-400 mt-0.5">O sistema localiza a aba <code>Tbl_txt</code> e identifica 25 colunas mesmo com acentuações ou variações de maiúsculas.</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 font-bold flex items-center justify-center shrink-0 text-[11px]">2</span>
              <div>
                <strong className="text-white">Estratégia Anti-Duplicidade (Upsert):</strong>
                <p className="text-slate-400 mt-0.5">Importar a mesma planilha repetidas vezes apenas atualiza registros sem gerar linhas duplicadas.</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 font-bold flex items-center justify-center shrink-0 text-[11px]">3</span>
              <div>
                <strong className="text-white">Níveis de Acesso:</strong>
                <p className="text-slate-400 mt-0.5">
                  <strong>Super Admin</strong> pode importar planilhas e gerenciar usuários; <strong>Admin</strong> e <strong>Extensionista</strong> editam fichas e técnicos; <strong>Visualizador</strong> consulta e imprime.
                </p>
              </div>
            </div>
          </div>

          <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-xs text-emerald-200 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <strong>Pronto para começar! Você completou o tour.</strong>
            </span>
          </div>
        </div>
      )
    }
  ], []);

  // Tópicos do Guia Completo por Módulos
  const guideTopics: GuideTopic[] = useMemo(() => [
    {
      id: 'fichas-estrutura',
      title: 'Estrutura Completa da Ficha Técnica',
      category: 'fichas',
      keywords: ['ficha', 'setup', 'pressão', 'vedação', 'trabalho', 'médias', 'calculo', 'lux'],
      icon: <Layers className="w-4 h-4 text-sky-400" />,
      targetTab: 'fichas',
      content: (
        <div className="space-y-3 text-xs text-slate-300">
          <p>A ficha técnica é organizada em blocos modulares espelhados no PDF oficial da Bello Alimentos:</p>
          <ul className="list-disc pl-4 space-y-1.5 text-slate-400">
            <li><strong>Pressão de Vedação (mmca / Pa):</strong> Leituras no exaustor, no manômetro e no controlador. A média é calculada automaticamente.</li>
            <li><strong>Pressão de Trabalho (mmca / Pa):</strong> Parâmetro de operação em regime ativo com cálculo de média em tempo real.</li>
            <li><strong>Ventilação Total (m/s):</strong> Velocidade anemométrica nas posições Lateral Direita, Centro e Lateral Esquerda, além do número de exaustores instalados.</li>
            <li><strong>Entrada de Ar (m/s):</strong> Medições do Lado 01 (Fornos) e Lado 02 divididos em Frente, Meio e Fundo.</li>
            <li><strong>Iluminação (Lux):</strong> Intensidade luminosa sob a lâmpada, nas laterais, no triângulo central e percentual a 100%.</li>
            <li><strong>Placas Evaporativas:</strong> Área total das placas (m²) e cronômetro de tempo necessário para molhar toda a superfície.</li>
            <li><strong>Dimensões do Aviário:</strong> Comprimento (m), largura (m) e alturas de pé direito (frente, meio e fundo).</li>
            <li><strong>Sistemas de Alarme:</strong> Status operacional dos alarmes da residência, do aviário e das caixas centrais.</li>
          </ul>
        </div>
      )
    },
    {
      id: 'fichas-edicao',
      title: 'Como Editar e Salvar Informações',
      category: 'fichas',
      keywords: ['editar', 'salvar', 'modificar', 'alterar', 'atualizar', 'guardar'],
      icon: <Sliders className="w-4 h-4 text-amber-400" />,
      targetTab: 'fichas',
      content: (
        <div className="space-y-3 text-xs text-slate-300">
          <p>Para alterar qualquer medição ou dado técnico:</p>
          <ol className="list-decimal pl-4 space-y-1.5 text-slate-400">
            <li>Navegue até o aviário desejado usando o <strong>Filtro em Cascata</strong>.</li>
            <li>Clique no botão <strong>"Editar Ficha"</strong> com ícone de lápis no canto superior direito do card da Ficha.</li>
            <li>Os campos passarão a exibir caixas de entrada de texto e números com contorno editável.</li>
            <li>Faça as medições ou alterações de valores. Os campos de média serão atualizados instantaneamente.</li>
            <li>Clique no botão verde <strong>"Salvar Alterações"</strong>.</li>
            <li>Uma mensagem de confirmação será exibida e uma nova versão de histórico será gerada automaticamente.</li>
          </ol>
        </div>
      )
    },
    {
      id: 'fichas-historico',
      title: 'Histórico de Versões e Auditoria',
      category: 'fichas',
      keywords: ['historico', 'auditoria', 'versão', 'restaurar', 'quem alterou', 'data'],
      icon: <History className="w-4 h-4 text-purple-400" />,
      targetTab: 'fichas',
      content: (
        <div className="space-y-3 text-xs text-slate-300">
          <p>O sistema mantém um log de versionamento detalhado para cada aviário:</p>
          <ul className="list-disc pl-4 space-y-1.5 text-slate-400">
            <li>Clique no botão <strong>"Histórico"</strong> na Ficha de Setup.</li>
            <li>Você verá a lista cronológica de todas as alterações realizadas.</li>
            <li>Cada registro exibe o <strong>e-mail do usuário</strong>, a <strong>data e horário exato</strong> e os valores antigos vs. novos.</li>
            <li>Se um erro foi cometido, utilize o botão <strong>"Restaurar Versão"</strong> para retornar imediatamente aos valores anteriores.</li>
          </ul>
        </div>
      )
    },
    {
      id: 'fichas-impressao',
      title: 'Impressão em Papel & Exportação PDF',
      category: 'fichas',
      keywords: ['imprimir', 'impressão', 'pdf', 'papel', 'relatorio', 'exportar'],
      icon: <Printer className="w-4 h-4 text-emerald-400" />,
      targetTab: 'fichas',
      content: (
        <div className="space-y-3 text-xs text-slate-300">
          <p>Você pode gerar relatórios físicos idênticos ao padrão impresso da Bello Alimentos:</p>
          <ol className="list-decimal pl-4 space-y-1.5 text-slate-400">
            <li>Selecione o aviário e clique no botão <strong>"Imprimir Ficha"</strong>.</li>
            <li>Uma janela de pré-visualização oficial abrirá com logotipo em alta definição, layout A4 ajustado e campos em preto e branco com bordas limpas para economia de tinta.</li>
            <li>Clique no botão <strong>"Confirmar Impressão"</strong>.</li>
            <li>Na caixa de diálogo do navegador, você pode escolher sua <strong>impressora física</strong> ou optar por <strong>"Salvar como PDF"</strong>.</li>
          </ol>
        </div>
      )
    },
    {
      id: 'filtro-cascata',
      title: 'Como Utilizar o Filtro em Cascata',
      category: 'navegacao',
      keywords: ['filtro', 'cascata', 'produtor', 'galpao', 'selecionar', 'busca'],
      icon: <Search className="w-4 h-4 text-sky-400" />,
      targetTab: 'fichas',
      content: (
        <div className="space-y-3 text-xs text-slate-300">
          <p>O Filtro em Cascata foi desenhado para eliminar a necessidade de recarregar a página ou navegar por formulários lentos:</p>
          <ul className="list-disc pl-4 space-y-1.5 text-slate-400">
            <li><strong>Dropdown de Produtor:</strong> Digite o nome do produtor ou código de avicultor para filtrar instantaneamente na lista suspensa.</li>
            <li><strong>Chips de Aviários:</strong> Logo abaixo do produtor, surgem pequenos botões (chips) para cada instalação cadastrada (Galpão 01, 02, etc.).</li>
            <li><strong>Identificação Rápida:</strong> Cada chip mostra se o aviário possui técnico vinculado e o status do galpão.</li>
          </ul>
        </div>
      )
    },
    {
      id: 'produtores-visao',
      title: 'Visão Consolidada de Produtores',
      category: 'produtores',
      keywords: ['produtores', 'avicultor', 'galpoes', 'capacidade', 'area', 'densidade'],
      icon: <Users className="w-4 h-4 text-blue-400" />,
      targetTab: 'produtores',
      content: (
        <div className="space-y-3 text-xs text-slate-300">
          <p>Acesse a aba <strong>Produtores</strong> para uma análise geral do parque avícola:</p>
          <ul className="list-disc pl-4 space-y-1.5 text-slate-400">
            <li>Visualize a contagem total de granjas de cada produtor.</li>
            <li>Expanda o card do produtor para ver todos os aviários, capacidade de alojamento (número de aves), metragem quadrada e densidade zootécnica.</li>
            <li>Clique no botão de atalho <strong>"Abrir Ficha"</strong> em qualquer aviário para ir diretamente ao setup dele.</li>
          </ul>
        </div>
      )
    },
    {
      id: 'tecnicos-gestao',
      title: 'Gestão de Técnicos & Extensionistas',
      category: 'tecnicos',
      keywords: ['tecnicos', 'extensionistas', 'cadastrar', 'vincular', 'telefone', 'unidade'],
      icon: <UserCheck className="w-4 h-4 text-emerald-400" />,
      targetTab: 'tecnicos',
      content: (
        <div className="space-y-3 text-xs text-slate-300">
          <p>O módulo de Extensionistas permite organizar o atendimento de campo:</p>
          <ul className="list-disc pl-4 space-y-1.5 text-slate-400">
            <li><strong>Cadastrar Técnico:</strong> Adicione novos profissionais informando Nome, Telefone/WhatsApp, E-mail e Unidade operacional.</li>
            <li><strong>Edição Rápida:</strong> Atualize telefones e contatos diretamente no card do técnico.</li>
            <li><strong>Aviários Atendidos:</strong> Veja a lista completa de produtores e aviários sob a responsabilidade de cada extensionista.</li>
            <li><strong>Desvinculação Segura:</strong> Ao excluir um técnico, o sistema desvincula seus aviários sem apagar nenhum histórico cadastral ou ficha técnica.</li>
          </ul>
        </div>
      )
    },
    {
      id: 'importacao-excel',
      title: 'Importação de Planilhas Excel (.xlsx)',
      category: 'importacao',
      keywords: ['importacao', 'excel', 'xlsx', 'planilha', 'tbl_txt', 'base', 'upload'],
      icon: <UploadCloud className="w-4 h-4 text-indigo-400" />,
      targetTab: 'historico',
      content: (
        <div className="space-y-3 text-xs text-slate-300">
          <p>Para Super Administradores que precisam atualizar a base em lote:</p>
          <ol className="list-decimal pl-4 space-y-1.5 text-slate-400">
            <li>Clique no botão azul <strong>"IMPORTAR BASE DE DADOS"</strong> no topo da tela.</li>
            <li>Arraste o arquivo <code>.xlsx</code> ou clique para selecionar.</li>
            <li>O sistema detecta automaticamente a aba <code>Tbl_txt</code> e valida todos os cabeçalhos.</li>
            <li>Confira o resumo prévio (Produtores, Aviários e Técnicos identificados).</li>
            <li>Clique em <strong>"Confirmar e Gravar no Supabase"</strong>.</li>
            <li>Acompanhe o checklist em tempo real com barra de progresso animada.</li>
          </ol>
        </div>
      )
    },
    {
      id: 'seguranca-perfis',
      title: 'Níveis de Permissão e Perfis de Acesso',
      category: 'seguranca',
      keywords: ['perfil', 'niveis', 'segurança', 'super admin', 'admin', 'extensionista', 'visualizador'],
      icon: <Shield className="w-4 h-4 text-purple-400" />,
      content: (
        <div className="space-y-3 text-xs text-slate-300">
          <p>O sistema possui 4 níveis de controle com base no perfil de cada usuário:</p>
          <div className="space-y-2">
            <div className="p-2 bg-purple-500/10 border border-purple-500/20 rounded-lg">
              <strong className="text-purple-300">Super Admin (Nível 100):</strong>
              <p className="text-slate-400 text-[11px] mt-0.5">Acesso total irrestrito: importação de planilhas Excel, gestão de usuários e deleção de dados.</p>
            </div>
            <div className="p-2 bg-rose-500/10 border border-rose-500/20 rounded-lg">
              <strong className="text-rose-300">Administrador (Nível 80):</strong>
              <p className="text-slate-400 text-[11px] mt-0.5">Edição de fichas, cadastro e alteração de produtores e técnicos de campo.</p>
            </div>
            <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <strong className="text-amber-300">Extensionista (Nível 40):</strong>
              <p className="text-slate-400 text-[11px] mt-0.5">Edição e atualização técnica das fichas dos aviários sob sua responsabilidade.</p>
            </div>
            <div className="p-2 bg-slate-800/80 border border-slate-700 rounded-lg">
              <strong className="text-slate-300">Visualizador (Nível 10):</strong>
              <p className="text-slate-400 text-[11px] mt-0.5">Apenas consulta de dados e emissão de impressões/PDFs.</p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'faq-duvidas',
      title: 'Perguntas Frequentes (FAQ) & Solução Rápida',
      category: 'faq',
      keywords: ['faq', 'duvidas', 'erro', 'problema', 'ajuda', 'senha'],
      icon: <HelpCircle className="w-4 h-4 text-sky-400" />,
      content: (
        <div className="space-y-3 text-xs text-slate-300">
          <div className="space-y-2.5">
            <div className="border-b border-slate-800 pb-2">
              <span className="font-bold text-sky-300 block">❓ O que fazer se um valor digitado na ficha sumir?</span>
              <span className="text-slate-400 mt-1 block">
                Certifique-se de clicar em <strong>"Salvar Alterações"</strong> antes de trocar de aviário ou fechar a aba do navegador.
              </span>
            </div>
            <div className="border-b border-slate-800 pb-2">
              <span className="font-bold text-sky-300 block">❓ Posso restaurar um valor anterior que foi alterado por engano?</span>
              <span className="text-slate-400 mt-1 block">
                Sim! Abra a ficha do galpão, clique em <strong>"Histórico"</strong>, localize a versão desejada pelo horário e clique em <strong>"Restaurar Versão"</strong>.
              </span>
            </div>
            <div className="border-b border-slate-800 pb-2">
              <span className="font-bold text-sky-300 block">❓ Como trocar de senha?</span>
              <span className="text-slate-400 mt-1 block">
                Ao sair da conta, clique em <strong>"Esqueci minha senha"</strong> na tela de login para receber o link seguro de redefinição por e-mail.
              </span>
            </div>
          </div>
        </div>
      )
    }
  ], []);

  // Filtro de tópicos por busca
  const filteredTopics = useMemo(() => {
    if (!guideSearch.trim()) return guideTopics;
    const q = guideSearch.toLowerCase();
    return guideTopics.filter(t => 
      t.title.toLowerCase().includes(q) ||
      t.keywords.some(k => k.toLowerCase().includes(q))
    );
  }, [guideTopics, guideSearch]);

  // Tópico selecionado atual
  const activeTopic = useMemo(() => {
    return guideTopics.find(t => t.id === selectedTopicId) || guideTopics[0];
  }, [guideTopics, selectedTopicId]);

  const currentTour = tourSteps[currentStepIndex];

  const handleNextStep = () => {
    if (currentStepIndex < tourSteps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      onClose();
    }
  };

  const handlePrevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  const handleNavigateFromTour = (tab?: 'fichas' | 'produtores' | 'tecnicos' | 'historico') => {
    if (tab) {
      onNavigateTab(tab);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl shadow-black/80 max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho do Modal */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-sky-500/10 text-sky-400 border border-sky-500/20 shadow-inner">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-wide">
                  Tutorial & Guia da Plataforma
                </h3>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30">
                  Bello Alimentos
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Aprenda a utilizar os recursos de forma rápida e prática.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Seletor de Modo (Tour Rápido vs Guia Completo) */}
            <div className="hidden sm:flex items-center p-1 bg-slate-800/80 border border-slate-700 rounded-xl text-xs">
              <button
                onClick={() => setActiveMode('tour')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  activeMode === 'tour'
                    ? 'bg-sky-500 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                🎯 Tour Passo a Passo
              </button>
              <button
                onClick={() => setActiveMode('guide')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  activeMode === 'guide'
                    ? 'bg-sky-500 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                📚 Guia por Tópicos
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Fechar Tutorial"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Seletor de Modo Mobile */}
        <div className="sm:hidden px-4 py-2 border-b border-slate-800 bg-slate-900/80 flex items-center justify-center gap-2">
          <button
            onClick={() => setActiveMode('tour')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold text-center transition-all ${
              activeMode === 'tour'
                ? 'bg-sky-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-white bg-slate-800'
            }`}
          >
            🎯 Tour Passo a Passo
          </button>
          <button
            onClick={() => setActiveMode('guide')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold text-center transition-all ${
              activeMode === 'guide'
                ? 'bg-sky-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-white bg-slate-800'
            }`}
          >
            📚 Guia por Tópicos
          </button>
        </div>

        {/* CORPO DO MODAL */}
        <div className="flex-1 overflow-y-auto">
          {activeMode === 'tour' ? (
            /* ========================================================= */
            /* MODO 1: TOUR PASSO A PASSO GUIADO                         */
            /* ========================================================= */
            <div className="p-6 sm:p-8 flex flex-col justify-between h-full space-y-6">
              
              {/* Barra de Progresso & Indicadores de Passo */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-sky-400 flex items-center gap-2">
                    {currentTour.icon}
                    <span>Passo {currentStepIndex + 1} de {tourSteps.length}</span>
                  </span>
                  <span className="text-slate-400 font-medium">
                    {Math.round(((currentStepIndex + 1) / tourSteps.length) * 100)}% concluído
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-sky-500 to-blue-600 rounded-full transition-all duration-300"
                    style={{ width: `${((currentStepIndex + 1) / tourSteps.length) * 100}%` }}
                  />
                </div>

                {/* Step Dots */}
                <div className="flex items-center justify-center gap-2 pt-1">
                  {tourSteps.map((step, idx) => (
                    <button
                      key={step.step}
                      onClick={() => setCurrentStepIndex(idx)}
                      className={`h-2 transition-all rounded-full ${
                        idx === currentStepIndex
                          ? 'w-8 bg-sky-400'
                          : idx < currentStepIndex
                          ? 'w-3 bg-sky-600/70 hover:bg-sky-500'
                          : 'w-3 bg-slate-700 hover:bg-slate-600'
                      }`}
                      title={`Passo ${idx + 1}: ${step.title}`}
                    />
                  ))}
                </div>
              </div>

              {/* Conteúdo do Passo Atual */}
              <div className="bg-slate-950/60 border border-slate-800/90 rounded-3xl p-6 sm:p-7 space-y-4 shadow-inner">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                  <div>
                    <span className="text-[11px] font-bold text-sky-400 uppercase tracking-wider block">
                      {currentTour.badge}
                    </span>
                    <h2 className="text-lg sm:text-xl font-bold text-white mt-0.5">
                      {currentTour.title}
                    </h2>
                  </div>
                  {currentTour.targetTab && currentTour.tabActionLabel && (
                    <button
                      onClick={() => handleNavigateFromTour(currentTour.targetTab)}
                      className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 hover:border-sky-500/40 transition-all group"
                      title="Navegar diretamente para esta tela"
                    >
                      <span>{currentTour.tabActionLabel}</span>
                      <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  )}
                </div>

                {/* Renderização do conteúdo dinâmico */}
                <div className="pt-1">
                  {currentTour.content}
                </div>
              </div>

              {/* Controles de Navegação do Tour (Voltar / Avançar) */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                <button
                  onClick={handlePrevStep}
                  disabled={currentStepIndex === 0}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    currentStepIndex === 0
                      ? 'text-slate-600 bg-slate-900 border border-slate-800 cursor-not-allowed'
                      : 'text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:text-white'
                  }`}
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Anterior</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={onClose}
                    className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    Pular Tutorial
                  </button>

                  <button
                    onClick={handleNextStep}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 shadow-lg shadow-sky-600/30 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
                  >
                    <span>{currentStepIndex === tourSteps.length - 1 ? 'Concluir Tour' : 'Próximo Passo'}</span>
                    {currentStepIndex === tourSteps.length - 1 ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

            </div>
          ) : (
            /* ========================================================= */
            /* MODO 2: GUIA COMPLETO POR MÓDULOS COM BUSCA INTERNA       */
            /* ========================================================= */
            <div className="grid grid-cols-1 md:grid-cols-12 min-h-[480px]">
              
              {/* Menu Lateral de Tópicos */}
              <div className="md:col-span-4 border-r border-slate-800 bg-slate-950/40 p-4 space-y-3">
                {/* Campo de Busca Rápida no Guia */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={guideSearch}
                    onChange={(e) => setGuideSearch(e.target.value)}
                    placeholder="Buscar no tutorial..."
                    className="w-full pl-8 pr-7 py-2 text-xs rounded-xl bg-slate-900 border border-slate-800 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                  {guideSearch && (
                    <button
                      onClick={() => setGuideSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Lista de Tópicos */}
                <div className="space-y-1 overflow-y-auto max-h-[380px] pr-1">
                  {filteredTopics.length === 0 ? (
                    <div className="text-center py-8 text-xs text-slate-500 space-y-1">
                      <HelpCircle className="w-6 h-6 mx-auto text-slate-600" />
                      <p>Nenhum tópico encontrado.</p>
                      <button
                        onClick={() => setGuideSearch('')}
                        className="text-sky-400 hover:underline text-[11px]"
                      >
                        Limpar busca
                      </button>
                    </div>
                  ) : (
                    filteredTopics.map((topic) => {
                      const isSelected = topic.id === activeTopic.id;
                      return (
                        <button
                          key={topic.id}
                          onClick={() => setSelectedTopicId(topic.id)}
                          className={`w-full text-left p-2.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all ${
                            isSelected
                              ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30 shadow-sm'
                              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
                          }`}
                        >
                          <span className="shrink-0">{topic.icon}</span>
                          <span className="truncate flex-1">{topic.title}</span>
                          {isSelected && (
                            <ArrowRight className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Painel de Leitura do Conteúdo */}
              <div className="md:col-span-8 p-6 space-y-4 bg-slate-900/60 overflow-y-auto max-h-[480px]">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-sky-400">
                      {activeTopic.icon}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">
                        {activeTopic.title}
                      </h3>
                      <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                        Categoria: {activeTopic.category}
                      </span>
                    </div>
                  </div>

                  {activeTopic.targetTab && (
                    <button
                      onClick={() => handleNavigateFromTour(activeTopic.targetTab)}
                      className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/30 transition-all group"
                      title="Ir para esta tela no sistema"
                    >
                      <span>Abrir no Sistema</span>
                      <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  )}
                </div>

                {/* Conteúdo do Tópico */}
                <div className="pt-2 leading-relaxed">
                  {activeTopic.content}
                </div>

                {/* Dica de rodapé */}
                <div className="mt-6 pt-4 border-t border-slate-800 text-[11px] text-slate-500 flex items-center justify-between">
                  <span>Dúvida persistente? Consulte seu administrador Bello Alimentos.</span>
                  <button
                    onClick={() => setActiveMode('tour')}
                    className="text-sky-400 hover:underline flex items-center gap-1"
                  >
                    <span>Ver Tour Rápido</span> ➔
                  </button>
                </div>
              </div>

            </div>
          )}
        </div>

        {/* Rodapé com Atalho de Fechamento */}
        <div className="px-6 py-3 border-t border-slate-800/80 bg-slate-950/70 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span>Sistema Ficha Cadastral e Setup de Granjas • Versão 2026</span>
          </span>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors font-semibold"
          >
            Fechar Janela
          </button>
        </div>

      </div>
    </div>
  );
};
