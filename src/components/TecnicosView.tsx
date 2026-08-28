import React, { useState } from 'react';
import { UserCheck, Search, Home } from 'lucide-react';
import { Tecnico, Aviario, Produtor } from '../types/database';

interface TecnicosViewProps {
  tecnicos: Tecnico[];
  aviarios: Aviario[];
  produtores: Produtor[];
  onSelectProdutorAndAviario: (produtorId: string, aviarioId?: string) => void;
}

export const TecnicosView: React.FC<TecnicosViewProps> = ({
  tecnicos,
  aviarios,
  onSelectProdutorAndAviario
}) => {
  const [filter, setFilter] = useState('');

  const filteredTecnicos = tecnicos.filter(t => 
    t.nome.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="space-y-6">
      
      {/* Header & Search */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 border border-slate-700/80 rounded-3xl p-6 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Extensionistas & Técnicos ({tecnicos.length})</h2>
            <p className="text-xs text-slate-400">
              Equipe técnica responsável pelo acompanhamento dos lotes e granjas.
            </p>
          </div>
        </div>

        <div className="w-full sm:w-72 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Buscar técnico..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>
      </div>

      {/* Grid de Técnicos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTecnicos.map((tecnico) => {
          const aviariosDoTecnico = aviarios.filter(a => a.tecnico_id === tecnico.id);
          const produtoresAtendidos = new Set(aviariosDoTecnico.map(a => a.produtor_id));

          return (
            <div
              key={tecnico.id}
              className="bg-slate-900 border border-slate-800 hover:border-amber-500/50 rounded-2xl p-5 shadow-lg transition-all hover:-translate-y-1 group"
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div>
                  <h3 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors uppercase tracking-tight">
                    {tecnico.nome}
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    Unidade: {tecnico.unidade || 'Bello Alimentos'}
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-[10px] font-bold text-amber-400">
                  {aviariosDoTecnico.length} {aviariosDoTecnico.length === 1 ? 'aviário' : 'aviários'}
                </span>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-800 text-xs text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-500">Produtores Atendidos:</span>
                  <span className="font-bold text-white">{produtoresAtendidos.size}</span>
                </div>

                {aviariosDoTecnico.length > 0 && (
                  <div className="pt-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Alguns Aviários Vinculados:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {aviariosDoTecnico.slice(0, 6).map(a => (
                        <button
                          key={a.id}
                          onClick={() => onSelectProdutorAndAviario(a.produtor_id, a.id)}
                          className="px-2 py-0.5 rounded bg-slate-950 hover:bg-amber-600 hover:text-white border border-slate-800 text-slate-400 hover:text-white text-[11px] font-mono transition-all flex items-center gap-1"
                        >
                          <Home className="w-2.5 h-2.5" />
                          <span>{a.produtor?.nome?.split(' ')[0]} - {a.numero_instalacao}</span>
                        </button>
                      ))}
                      {aviariosDoTecnico.length > 6 && (
                        <span className="text-[10px] text-slate-500 self-center">
                          +{aviariosDoTecnico.length - 6} outros
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};
