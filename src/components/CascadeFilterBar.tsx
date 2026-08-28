import React, { useState, useMemo, useEffect } from 'react';
import {
  User,
  Home,
  Wrench,
  CheckCircle2,
  Users,
  Search
} from 'lucide-react';
import { Produtor, Aviario } from '../types/database';

interface CascadeFilterBarProps {
  produtores: Produtor[];
  selectedProdutorId: string;
  onSelectProdutor: (id: string) => void;
  aviariosOfProdutor: Aviario[];
  selectedAviarioId: string;
  onSelectAviario: (id: string) => void;
  searchFilter: string;
  setSearchFilter: (term: string) => void;
}

export const CascadeFilterBar: React.FC<CascadeFilterBarProps> = ({
  produtores,
  selectedProdutorId,
  onSelectProdutor,
  aviariosOfProdutor,
  selectedAviarioId,
  onSelectAviario,
  searchFilter,
  setSearchFilter
}) => {
  // Passo 2: Filtro de Extensionista
  const [selectedTecnicoId, setSelectedTecnicoId] = useState<string>('all');
  
  // Busca rápida interna de aviários
  const [aviarioSearch, setAviarioSearch] = useState<string>('');

  const selectedProdutor = produtores.find(p => p.id === selectedProdutorId);
  const selectedAviario = aviariosOfProdutor.find(a => a.id === selectedAviarioId);

  // Lista de Extensionistas distintos deste produtor
  const tecnicosOfProdutor = useMemo(() => {
    const map = new Map<string, { id: string; nome: string; count: number }>();
    aviariosOfProdutor.forEach(a => {
      const tecId = a.tecnico_id || 'sem_tecnico';
      const tecNome = a.tecnico?.nome || 'Sem Extensionista';
      if (!map.has(tecId)) {
        map.set(tecId, { id: tecId, nome: tecNome, count: 0 });
      }
      map.get(tecId)!.count++;
    });
    return Array.from(map.values());
  }, [aviariosOfProdutor]);

  // Reset do filtro de técnico ao trocar de produtor
  useEffect(() => {
    setSelectedTecnicoId('all');
    setAviarioSearch('');
  }, [selectedProdutorId]);

  // Aviários filtrados pelo Extensionista (Passo 2) e busca
  const displayedAviarios = useMemo(() => {
    let list = aviariosOfProdutor;
    if (selectedTecnicoId !== 'all') {
      list = list.filter(a => (a.tecnico_id || 'sem_tecnico') === selectedTecnicoId);
    }
    if (aviarioSearch.trim()) {
      const q = aviarioSearch.trim().toLowerCase();
      list = list.filter(a =>
        a.numero_instalacao.toLowerCase().includes(q) ||
        (a.tecnico?.nome && a.tecnico.nome.toLowerCase().includes(q))
      );
    }
    return list;
  }, [aviariosOfProdutor, selectedTecnicoId, aviarioSearch]);

  const filteredProdutores = produtores.filter(p => 
    p.nome.toLowerCase().includes(searchFilter.toLowerCase()) ||
    (p.municipio && p.municipio.toLowerCase().includes(searchFilter.toLowerCase()))
  );

  return (
    <div className="bg-slate-900 border border-slate-700/80 rounded-3xl p-5 shadow-xl space-y-4">
      
      {/* Banner de Rastreamento da Cascata */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-sky-400"></span>
          <span className="font-bold text-slate-200 uppercase tracking-wider text-[11px]">
            Filtro em Cascata:
          </span>
          <div className="flex flex-wrap items-center gap-1 text-[11px] font-semibold">
            <span className={selectedProdutor ? 'text-sky-400 font-bold' : 'text-slate-500'}>
              1. Produtor
            </span>
            <span className="text-slate-600">➔</span>
            <span className={selectedTecnicoId !== 'all' ? 'text-amber-400 font-bold' : 'text-slate-400'}>
              2. Extensionista
            </span>
            <span className="text-slate-600">➔</span>
            <span className={selectedAviario ? 'text-sky-400 font-bold' : 'text-slate-500'}>
              3. Aviário ({aviariosOfProdutor.length})
            </span>
            <span className="text-slate-600">➔</span>
            <span className="text-emerald-400 font-bold">
              4. Ficha Técnica
            </span>
          </div>
        </div>

        {/* Informações de Extensionistas */}
        <div className="flex flex-wrap items-center gap-2">
          {tecnicosOfProdutor.length > 1 && (
            <div className="flex items-center gap-1.5 text-xs text-sky-300 bg-sky-500/10 border border-sky-500/30 px-2.5 py-0.5 rounded-lg font-semibold">
              <Users className="w-3.5 h-3.5 text-sky-400" />
              <span>{tecnicosOfProdutor.length} Extensionistas Atendendo</span>
            </div>
          )}

          {selectedAviario?.tecnico?.nome && (
            <div className="flex items-center gap-1.5 text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-lg font-semibold">
              <Wrench className="w-3.5 h-3.5" />
              <span>Técnico Aviário {selectedAviario.numero_instalacao}: <strong>{selectedAviario.tecnico.nome}</strong></span>
            </div>
          )}
        </div>
      </div>

      {/* Grid Principal dos Filtros */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* ========================================================================= */}
        {/* COLUNA ESQUERDA: PASSO 1 (PRODUTOR) & PASSO 2 (EXTENSIONISTA)              */}
        {/* ========================================================================= */}
        <div className="lg:col-span-4 space-y-4">
          
          {/* PASSO 1: SELECIONAR PRODUTOR */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-sky-400" />
                <span>1. Selecionar Produtor ({produtores.length})</span>
              </label>
              {searchFilter && (
                <button
                  onClick={() => setSearchFilter('')}
                  className="text-[10px] text-sky-400 hover:underline"
                >
                  Limpar busca
                </button>
              )}
            </div>
            
            <div className="relative">
              <select
                value={selectedProdutorId}
                onChange={(e) => onSelectProdutor(e.target.value)}
                className="w-full pl-3 pr-8 py-2.5 rounded-2xl bg-slate-950 border border-slate-700 text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all cursor-pointer truncate"
              >
                <option value="">-- Selecione o Produtor --</option>
                {filteredProdutores.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.nome} {p.municipio ? `(${p.municipio})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* PASSO 2: SELECIONAR EXTENSIONISTA / TÉCNICO */}
          <div className="space-y-1.5 pt-2 border-t border-slate-800">
            <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Wrench className="w-3.5 h-3.5 text-amber-400" />
                <span>2. Extensionista / Técnico</span>
              </div>
              <span className="text-[10px] px-2 py-0.2 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 font-mono font-bold">
                {tecnicosOfProdutor.length} {tecnicosOfProdutor.length === 1 ? 'técnico' : 'técnicos'}
              </span>
            </label>
            
            <div className="relative">
              <select
                value={selectedTecnicoId}
                onChange={(e) => {
                  const tecId = e.target.value;
                  setSelectedTecnicoId(tecId);
                  if (tecId !== 'all') {
                    const firstOfTec = aviariosOfProdutor.find(a => (a.tecnico_id || 'sem_tecnico') === tecId);
                    if (firstOfTec) onSelectAviario(firstOfTec.id);
                  }
                }}
                disabled={aviariosOfProdutor.length === 0}
                className="w-full pl-3 pr-8 py-2.5 rounded-2xl bg-slate-950 border border-slate-700 text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all cursor-pointer truncate disabled:opacity-50"
              >
                <option value="all">
                  🌟 Todos os Extensionistas ({aviariosOfProdutor.length} aviários)
                </option>
                {tecnicosOfProdutor.map(tec => (
                  <option key={tec.id} value={tec.id}>
                    👤 {tec.nome} ({tec.count} {tec.count === 1 ? 'aviário' : 'aviários'})
                  </option>
                ))}
              </select>
            </div>
          </div>

        </div>

        {/* ========================================================================= */}
        {/* COLUNA DIREITA: PASSO 3 (AVIÁRIOS)                                         */}
        {/* ========================================================================= */}
        <div className="lg:col-span-8 space-y-2.5">
          
          {/* Header do Passo 3 */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Home className="w-3.5 h-3.5 text-sky-400" />
                <span>3. Aviários do Produtor ({displayedAviarios.length}{displayedAviarios.length !== aviariosOfProdutor.length ? ` de ${aviariosOfProdutor.length}` : ''})</span>
              </label>
              
              <span className="hidden sm:inline-block text-[10px] text-slate-400">
                • Clique no aviário para abrir o setup
              </span>
            </div>

            {/* Busca Rápida de Aviário */}
            {aviariosOfProdutor.length > 8 && (
              <div className="relative w-32 sm:w-40">
                <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={aviarioSearch}
                  onChange={(e) => setAviarioSearch(e.target.value)}
                  placeholder="Filtrar nº..."
                  className="w-full pl-7 pr-2 py-1 text-[11px] rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>
            )}
          </div>

          {/* Grid de Chips dos Aviários com Scroll */}
          <div className="hidden sm:block">
            <div className="max-h-60 overflow-y-auto p-2 rounded-2xl bg-slate-950/70 border border-slate-800 shadow-inner custom-scrollbar">
              {displayedAviarios.length === 0 ? (
                <div className="text-center py-6 text-slate-500 text-xs italic">
                  {selectedProdutorId
                    ? 'Nenhum aviário corresponde aos filtros de técnico ou busca.'
                    : 'Selecione um produtor ao lado para carregar os aviários.'}
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2">
                  {displayedAviarios.map(aviario => {
                    const isActive = aviario.id === selectedAviarioId;
                    const hasMultipleTecnicos = tecnicosOfProdutor.length > 1;

                    return (
                      <button
                        key={aviario.id}
                        type="button"
                        onClick={() => onSelectAviario(aviario.id)}
                        className={`p-2.5 rounded-xl border text-xs transition-all flex items-center justify-between gap-1.5 text-left transform active:scale-95 ${
                          isActive
                            ? 'bg-gradient-to-r from-blue-600 to-sky-500 text-white shadow-lg shadow-sky-600/30 ring-2 ring-sky-400 border-transparent font-bold'
                            : 'bg-slate-900/90 hover:bg-slate-800 text-slate-300 border-slate-800 hover:border-slate-700 font-semibold'
                        }`}
                      >
                        <div className="truncate flex-1">
                          <div className="flex items-center gap-1.5">
                            <span>Aviário {aviario.numero_instalacao}</span>
                            {isActive && <CheckCircle2 className="w-3.5 h-3.5 text-sky-200 shrink-0" />}
                          </div>
                          
                          {hasMultipleTecnicos && (
                            <span className={`text-[9.5px] font-normal truncate block mt-0.5 ${
                              isActive ? 'text-sky-100' : 'text-amber-300'
                            }`}>
                              {aviario.tecnico?.nome ? aviario.tecnico.nome.split(' ')[0] : 'Sem Técnico'}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Seletor Mobile */}
          <div className="sm:hidden">
            <select
              value={selectedAviarioId}
              onChange={(e) => onSelectAviario(e.target.value)}
              disabled={displayedAviarios.length === 0}
              className="w-full pl-3 pr-8 py-2.5 rounded-2xl bg-slate-950 border border-slate-700 text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all truncate"
            >
              {displayedAviarios.length === 0 ? (
                <option value="">Nenhum aviário disponível</option>
              ) : (
                displayedAviarios.map(a => (
                  <option key={a.id} value={a.id}>
                    Aviário {a.numero_instalacao} {a.tecnico?.nome ? `(${a.tecnico.nome})` : ''}
                  </option>
                ))
              )}
            </select>
          </div>

        </div>

      </div>

    </div>
  );
};
