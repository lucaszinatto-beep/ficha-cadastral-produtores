import React from 'react';
import { User, Home, Wrench, CheckCircle2 } from 'lucide-react';
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
  const selectedProdutor = produtores.find(p => p.id === selectedProdutorId);
  const selectedAviario = aviariosOfProdutor.find(a => a.id === selectedAviarioId);

  const filteredProdutores = produtores.filter(p => 
    p.nome.toLowerCase().includes(searchFilter.toLowerCase()) ||
    (p.municipio && p.municipio.toLowerCase().includes(searchFilter.toLowerCase()))
  );

  return (
    <div className="bg-slate-900 border border-slate-700/80 rounded-3xl p-5 shadow-xl space-y-4">
      
      {/* Step Banner: Filtro em Cascata */}
      <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-sky-400"></span>
          <span className="font-bold text-slate-200 uppercase tracking-wider text-[11px]">
            Filtro Inteligente em Cascata:
          </span>
          <div className="flex items-center gap-1 text-[11px] font-semibold">
            <span className={selectedProdutor ? 'text-sky-400 font-bold' : 'text-slate-500'}>
              1. Produtor
            </span>
            <span className="text-slate-600">➔</span>
            <span className={selectedAviario ? 'text-sky-400 font-bold' : 'text-slate-500'}>
              2. Aviário
            </span>
            <span className="text-slate-600">➔</span>
            <span className="text-emerald-400 font-bold">
              3. Ficha de Setup
            </span>
          </div>
        </div>

        {selectedAviario?.tecnico?.nome && (
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-lg">
            <Wrench className="w-3.5 h-3.5" />
            <span>Técnico Responsável: <strong>{selectedAviario.tecnico.nome}</strong></span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
        
        {/* PASSO 1: SELECIONAR PRODUTOR (Dropdown com busca) */}
        <div className="md:col-span-5 space-y-1.5">
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

        {/* PASSO 2: SELECIONAR AVIÁRIO (Chips interativos) */}
        <div className="md:col-span-7 space-y-1.5">
          <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Home className="w-3.5 h-3.5 text-sky-400" />
              <span>2. Aviários do Produtor ({aviariosOfProdutor.length})</span>
            </div>
            {aviariosOfProdutor.length > 0 && (
              <span className="text-[10px] text-slate-400 font-normal">
                Clique no aviário para abrir o setup
              </span>
            )}
          </label>

          <div className="flex flex-wrap items-center gap-2 min-h-[42px] p-1.5 rounded-2xl bg-slate-950/60 border border-slate-800">
            {aviariosOfProdutor.length === 0 ? (
              <span className="text-xs text-slate-500 italic px-2">
                {selectedProdutorId ? 'Nenhum aviário cadastrado para este produtor.' : 'Selecione um produtor ao lado para ver os aviários.'}
              </span>
            ) : (
              aviariosOfProdutor.map(aviario => {
                const isSelected = aviario.id === selectedAviarioId;
                return (
                  <button
                    key={aviario.id}
                    type="button"
                    onClick={() => onSelectAviario(aviario.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all transform active:scale-95 flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-gradient-to-r from-blue-600 to-sky-500 text-white shadow-lg shadow-sky-500/30 ring-2 ring-sky-400'
                        : 'bg-slate-800/90 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700'
                    }`}
                  >
                    <span>Aviário {aviario.numero_instalacao}</span>
                    {isSelected && <CheckCircle2 className="w-3 h-3 text-sky-200" />}
                  </button>
                );
              })
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
