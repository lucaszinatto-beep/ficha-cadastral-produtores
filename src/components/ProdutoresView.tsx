import React, { useState } from 'react';
import { Users, Search, Home, ArrowUpRight, MapPin } from 'lucide-react';
import { Produtor, Aviario } from '../types/database';

interface ProdutoresViewProps {
  produtores: Produtor[];
  aviarios: Aviario[];
  onSelectProdutorAndAviario: (produtorId: string, aviarioId?: string) => void;
}

export const ProdutoresView: React.FC<ProdutoresViewProps> = ({
  produtores,
  aviarios,
  onSelectProdutorAndAviario
}) => {
  const [filter, setFilter] = useState('');

  const filteredProdutores = produtores.filter(p => 
    p.nome.toLowerCase().includes(filter.toLowerCase()) ||
    (p.municipio && p.municipio.toLowerCase().includes(filter.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      
      {/* Header & Search */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 border border-slate-700/80 rounded-3xl p-6 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Produtores Cadastrados ({produtores.length})</h2>
            <p className="text-xs text-slate-400">
              Listagem consolidada de todos os produtores e seus respectivos aviários vinculados.
            </p>
          </div>
        </div>

        <div className="w-full sm:w-72 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Buscar produtor por nome..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>
      </div>

      {/* Grid de Produtores */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProdutores.map((produtor) => {
          const aviariosDoProdutor = aviarios.filter(a => a.produtor_id === produtor.id);
          
          return (
            <div
              key={produtor.id}
              className="bg-slate-900 border border-slate-800 hover:border-sky-500/50 rounded-2xl p-5 shadow-lg transition-all hover:-translate-y-1 group"
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div>
                  <h3 className="text-sm font-bold text-white group-hover:text-sky-300 transition-colors uppercase tracking-tight">
                    {produtor.nome}
                  </h3>
                  {produtor.municipio && (
                    <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-sky-400" /> {produtor.municipio}
                    </span>
                  )}
                </div>
                <span className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-[10px] font-bold text-sky-400">
                  {aviariosDoProdutor.length} {aviariosDoProdutor.length === 1 ? 'aviário' : 'aviários'}
                </span>
              </div>

              {/* Badges de Aviários */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Instalações / Aviários:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {aviariosDoProdutor.map(aviario => (
                    <button
                      key={aviario.id}
                      onClick={() => onSelectProdutorAndAviario(produtor.id, aviario.id)}
                      className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-sky-600 hover:text-white border border-slate-800 text-slate-300 text-xs font-mono font-bold transition-all flex items-center gap-1"
                    >
                      <Home className="w-3 h-3" />
                      <span>{aviario.numero_instalacao}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80 flex justify-end">
                <button
                  onClick={() => onSelectProdutorAndAviario(produtor.id, aviariosDoProdutor[0]?.id)}
                  className="text-xs font-bold text-sky-400 hover:text-sky-300 flex items-center gap-1 group-hover:underline"
                >
                  <span>Abrir Ficha de Setup</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};
