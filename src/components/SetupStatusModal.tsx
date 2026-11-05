import React, { useState, useMemo } from 'react';
import { 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  Search, 
  Home, 
  User, 
  Wrench, 
  ChevronDown, 
  ChevronUp, 
  ArrowRight, 
  Sliders,
  Camera,
  Layers
} from 'lucide-react';
import { Produtor, Aviario, Tecnico } from '../types/database';
import { calculateProdutoresSetupStats } from '../services/dataService';
import { useCompany } from '../context/CompanyContext';

interface SetupStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'concluidos' | 'pendentes';
  produtores: Produtor[];
  aviarios: Aviario[];
  tecnicos?: Tecnico[];
  onSelectProdutorAndAviario: (produtorId: string, aviarioId?: string) => void;
}

export const SetupStatusModal: React.FC<SetupStatusModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'concluidos',
  produtores,
  aviarios,
  onSelectProdutorAndAviario
}) => {
  const { currentCompany, currentUnit } = useCompany();
  const [activeTab, setActiveTab] = useState<'concluidos' | 'pendentes'>(initialTab);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Set de produtores expandidos na aba de pendentes
  const [expandedProdutorIds, setExpandedProdutorIds] = useState<Set<string>>(new Set());

  // Atualiza a aba inicial sempre que o modal abrir
  React.useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setSearchTerm('');
    }
  }, [isOpen, initialTab]);

  // Cálculo centralizado das métricas e listas
  const stats = useMemo(() => {
    return calculateProdutoresSetupStats(produtores, aviarios);
  }, [produtores, aviarios]);

  // Filtro de busca na lista ativa
  const filteredList = useMemo(() => {
    let list: typeof stats.concluidosList = [];
    if (activeTab === 'concluidos') {
      list = stats.concluidosList;
    } else {
      // Na aba de pendentes, incluir os que não têm nenhum setup e também produtores com aviários pendentes residuais
      const parciais = stats.concluidosList.filter(c => c.aviariosPendentes > 0);
      list = [...stats.pendentesList, ...parciais];
    }
    
    if (!searchTerm.trim()) return list;

    const q = searchTerm.toLowerCase().trim();
    return list.filter(item => {
      const matchNome = item.produtor.nome.toLowerCase().includes(q);
      const matchMunicipio = (item.produtor.municipio || '').toLowerCase().includes(q);
      const matchTecnico = (item.tecnicoNome || '').toLowerCase().includes(q);
      const matchAviario = item.aviariosStatus.some(av => 
        av.aviario.numero_instalacao.toLowerCase().includes(q)
      );
      return matchNome || matchMunicipio || matchTecnico || matchAviario;
    });
  }, [activeTab, stats, searchTerm]);

  if (!isOpen) return null;

  const toggleExpandProdutor = (produtorId: string) => {
    setExpandedProdutorIds(prev => {
      const next = new Set(prev);
      if (next.has(produtorId)) {
        next.delete(produtorId);
      } else {
        next.add(produtorId);
      }
      return next;
    });
  };

  const handleOpenFicha = (produtorId: string, aviarioId?: string) => {
    onSelectProdutorAndAviario(produtorId, aviarioId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-950/85 backdrop-blur-md animate-fade-in no-print">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-5xl max-h-[92vh] shadow-2xl flex flex-col overflow-hidden animate-scale-up">
        
        {/* ========================================================================= */}
        {/* HEADER DO MODAL COM RESUMO GERAL                                          */}
        {/* ========================================================================= */}
        <div className="px-5 sm:px-6 py-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-sky-500/10 text-sky-400 border border-sky-500/20 shadow-inner">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black text-white tracking-tight">
                  Status de Cadastro de Setups dos Produtores
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border bg-sky-500/10 text-sky-300 border-sky-500/20">
                  {currentCompany.nome}{currentUnit ? ` • ${currentUnit.nome}` : ''}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
                Acompanhamento dinâmico de produtores com setup concluído vs. pendente
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
            title="Fechar Janela"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ========================================================================= */}
        {/* CARDS INDICADORES RESUMO (Exatamente conforme regra de cálculo)           */}
        {/* ========================================================================= */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/50">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            
            {/* CARD 1: TOTAL DE PRODUTORES */}
            <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between shadow-sm">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                  Total de Produtores
                </span>
                <span className="text-xl font-black text-white font-mono mt-0.5 block">
                  {stats.totalProdutores}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-800 text-slate-300">
                <User className="w-4 h-4" />
              </div>
            </div>

            {/* CARD 2: PRODUTORES COM SETUP */}
            <div 
              onClick={() => setActiveTab('concluidos')}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                activeTab === 'concluidos'
                  ? 'bg-emerald-950/40 border-emerald-500/50 shadow-md ring-1 ring-emerald-500/30'
                  : 'bg-slate-900 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div>
                <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider block">
                  Produtores com Setup
                </span>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-xl font-black text-white font-mono">
                    {stats.produtoresComSetup} <span className="text-xs text-slate-400 font-normal">/ {stats.totalProdutores}</span>
                  </span>
                  <span className="text-xs font-bold text-emerald-400 font-mono bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                    {stats.percentualComSetup.toFixed(2)}%
                  </span>
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>

            {/* CARD 3: PRODUTORES PENDENTES */}
            <div 
              onClick={() => setActiveTab('pendentes')}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                activeTab === 'pendentes'
                  ? 'bg-amber-950/40 border-amber-500/50 shadow-md ring-1 ring-amber-500/30'
                  : 'bg-slate-900 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div>
                <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider block">
                  Faltam Cadastrar (Pendentes)
                </span>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-xl font-black text-white font-mono">
                    {stats.produtoresPendentes}
                  </span>
                  <span className="text-xs font-bold text-amber-400 font-mono bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                    {stats.percentualPendente.toFixed(2)}%
                  </span>
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>

          </div>
        </div>

        {/* ========================================================================= */}
        {/* BARRA DE CONTROLE: ABAS & BUSCA                                           */}
        {/* ========================================================================= */}
        <div className="p-4 bg-slate-900 border-b border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          
          {/* Navegação entre as duas abas solicitadas */}
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-2xl border border-slate-800">
            <button
              type="button"
              onClick={() => setActiveTab('concluidos')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'concluidos'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/50'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>SETUPS CADASTRADOS</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                activeTab === 'concluidos' ? 'bg-emerald-700 text-white' : 'bg-slate-800 text-slate-400'
              }`}>
                {stats.concluidosList.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('pendentes')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'pendentes'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-950/50'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>SETUPS PENDENTES</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                activeTab === 'pendentes' ? 'bg-amber-700 text-white' : 'bg-slate-800 text-slate-400'
              }`}>
                {stats.pendentesList.length}
              </span>
            </button>
          </div>

          {/* Campo de Busca Rápida */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filtrar por produtor, aviário..."
              className="w-full pl-8 pr-7 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            )}
          </div>

        </div>

        {/* ========================================================================= */}
        {/* CORPO DA LISTAGEM (Scrollável)                                            */}
        {/* ========================================================================= */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 custom-scrollbar">
          
          {filteredList.length === 0 ? (
            <div className="py-16 text-center text-slate-400 space-y-2">
              <Home className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-sm font-semibold">Nenhum produtor encontrado nesta categoria.</p>
              {searchTerm && (
                <p className="text-xs text-slate-500">Tente ajustar o termo de pesquisa digitado.</p>
              )}
            </div>
          ) : activeTab === 'concluidos' ? (
            
            /* ===================================================================== */
            /* ABA 1: SETUPS CADASTRADOS                                             */
            /* ===================================================================== */
            <div className="space-y-2.5">
              {filteredList.map((item) => {
                const firstAviarioId = item.aviariosStatus[0]?.aviario.id;

                return (
                  <div
                    key={item.produtor.id}
                    className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 hover:border-slate-700/80 transition-all flex flex-col md:flex-row md:items-center justify-between gap-3"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-black text-sm text-white uppercase">
                          {item.produtor.nome}
                        </span>
                        {item.produtor.municipio && (
                          <span className="text-[11px] text-slate-400">
                            • {item.produtor.municipio}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <Wrench className="w-3.5 h-3.5 text-amber-400" />
                          <span>Técnico: <strong className="text-slate-200">{item.tecnicoNome}</strong></span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Home className="w-3.5 h-3.5 text-sky-400" />
                          <span>Aviários: <strong className="text-slate-200">{item.totalAviarios}</strong></span>
                        </div>
                      </div>

                      {/* Lista de aviários cadastrados com badges de fotos */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        {item.aviariosStatus.map(avStatus => (
                          <span
                            key={avStatus.aviario.id}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-900 border border-slate-700 text-slate-200"
                          >
                            <span>Aviário {avStatus.aviario.numero_instalacao}</span>
                            <span className="text-emerald-400 font-mono">✓</span>
                            {avStatus.fotosCount > 0 && (
                              <span className="text-[9px] text-sky-400 flex items-center gap-0.5 ml-0.5">
                                <Camera className="w-2.5 h-2.5" /> {avStatus.fotosCount}
                              </span>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end md:self-center shrink-0">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Concluído</span>
                      </span>

                      <button
                        type="button"
                        onClick={() => handleOpenFicha(item.produtor.id, firstAviarioId)}
                        className="px-3.5 py-1.5 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 hover:text-white border border-sky-500/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                      >
                        <span>Abrir Ficha</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

          ) : (
            
            /* ===================================================================== */
            /* ABA 2: SETUPS PENDENTES (Com Detalhamento Específico ao Clicar)        */
            /* ===================================================================== */
            <div className="space-y-3">
              {filteredList.map((item) => {
                const isExpanded = expandedProdutorIds.has(item.produtor.id);

                return (
                  <div
                    key={item.produtor.id}
                    className="rounded-2xl bg-slate-950/70 border border-amber-900/30 hover:border-amber-700/50 transition-all overflow-hidden"
                  >
                    {/* Linha Principal Clicável (Abre/Fecha Detalhamento dos Pendentes) */}
                    <div
                      onClick={() => toggleExpandProdutor(item.produtor.id)}
                      className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer hover:bg-slate-900/40 transition-colors"
                    >
                      <div className="space-y-1.5 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-black text-sm text-white uppercase">
                            {item.produtor.nome}
                          </span>
                          {item.produtor.municipio && (
                            <span className="text-[11px] text-slate-400">
                              • {item.produtor.municipio}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                          <div className="flex items-center gap-1.5">
                            <Wrench className="w-3.5 h-3.5 text-amber-400" />
                            <span>Técnico: <strong className="text-slate-200">{item.tecnicoNome}</strong></span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Home className="w-3.5 h-3.5 text-sky-400" />
                            <span>Total de Aviários: <strong className="text-white font-mono">{item.totalAviarios}</strong></span>
                            {item.aviariosPendentes > 0 && (
                              <span className="text-amber-400 font-bold ml-1">
                                ({item.aviariosPendentes} pendente{item.aviariosPendentes > 1 ? 's' : ''})
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 self-end md:self-center shrink-0">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Pendente de Setup</span>
                        </span>

                        <div className="flex items-center gap-1 text-xs text-slate-400 hover:text-white font-semibold">
                          <span>{isExpanded ? 'Recolher' : 'Ver Detalhes'}</span>
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-amber-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-slate-400" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* ============================================================= */}
                    {/* DETALHAMENTO DO PRODUTOR PENDENTE (Conforme Item 4 do Escopo) */}
                    {/* ============================================================= */}
                    {isExpanded && (
                      <div className="p-4 bg-slate-900/90 border-t border-slate-800/80 space-y-3 animate-in fade-in duration-150">
                        <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between border-b border-slate-800 pb-2">
                          <span className="flex items-center gap-1.5 text-amber-400">
                            <Sliders className="w-3.5 h-3.5" /> Detalhamento dos Aviários do Produtor
                          </span>
                          <span className="text-[11px] text-slate-400 font-normal">
                            Clique em "Cadastrar Setup" para abrir e preencher a ficha
                          </span>
                        </div>

                        {item.aviariosStatus.length === 0 ? (
                          <div className="text-xs text-slate-500 italic py-2">
                            Nenhum aviário cadastrado para este produtor.
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {item.aviariosStatus.map((avStatus) => {
                              const isAvConcluido = avStatus.isConcluido;

                              return (
                                <div
                                  key={avStatus.aviario.id}
                                  className={`p-3 rounded-xl border flex items-center justify-between gap-2.5 transition-all ${
                                    isAvConcluido
                                      ? 'bg-slate-950/60 border-slate-800 text-slate-300'
                                      : 'bg-amber-950/20 border-amber-500/30 text-amber-200'
                                  }`}
                                >
                                  <div className="space-y-0.5 truncate flex-1">
                                    <div className="flex items-center gap-1.5 font-bold text-xs text-white">
                                      <Home className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                                      <span className="truncate">Aviário {avStatus.aviario.numero_instalacao}</span>
                                    </div>
                                    
                                    <div className="text-[11px]">
                                      {isAvConcluido ? (
                                        <span className="text-emerald-400 font-semibold flex items-center gap-1">
                                          <CheckCircle2 className="w-3 h-3" /> Setup Concluído
                                          {avStatus.fotosCount > 0 && ` (${avStatus.fotosCount} fotos)`}
                                        </span>
                                      ) : (
                                        <span className="text-amber-300 font-semibold flex items-center gap-1">
                                          <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                                          <span className="truncate">{avStatus.motivoPendente || 'Pendente de Setup'}</span>
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => handleOpenFicha(item.produtor.id, avStatus.aviario.id)}
                                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1 active:scale-95 ${
                                      isAvConcluido
                                        ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                                        : 'bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-white shadow-sm'
                                    }`}
                                  >
                                    <span>{isAvConcluido ? 'Ver Setup' : 'Cadastrar Setup'}</span>
                                    <ArrowRight className="w-3 h-3" />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                  </div>
                );
              })}
            </div>

          )}

        </div>

        {/* ========================================================================= */}
        {/* FOOTER DO MODAL                                                           */}
        {/* ========================================================================= */}
        <div className="px-6 py-3.5 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <span>
            {stats.totalProdutores} produtores cadastrados em {currentCompany.nome}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all cursor-pointer"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
