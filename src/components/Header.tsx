import React from 'react';
import { UploadCloud, RefreshCw, Layers, Users, UserCheck, History, Search } from 'lucide-react';

interface HeaderProps {
  activeTab: 'fichas' | 'produtores' | 'tecnicos' | 'historico';
  setActiveTab: (tab: 'fichas' | 'produtores' | 'tecnicos' | 'historico') => void;
  onOpenImportModal: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  totalProdutores: number;
  totalAviarios: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenImportModal,
  searchQuery,
  setSearchQuery,
  totalProdutores,
  totalAviarios
}) => {
  return (
    <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 sticky top-0 z-30 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo & Marca Bello Alimentos */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-gradient-to-tr from-blue-700 via-sky-500 to-amber-400 p-[2px] shadow-lg shadow-blue-600/20">
                <div className="h-full w-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                  <span className="text-xl font-black bg-gradient-to-r from-blue-400 to-amber-300 bg-clip-text text-transparent tracking-tighter">
                    B
                  </span>
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-black tracking-tight text-white flex items-center gap-1.5">
                    BELLO <span className="text-sky-400 font-bold">ALIMENTOS</span>
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 font-semibold tracking-wider uppercase">
                    Set Up Granja
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Ficha Cadastral de Produtores & Gestão de Aviários
                </p>
              </div>
            </div>

            {/* Quick Stats Badges */}
            <div className="hidden lg:flex items-center gap-2 ml-6 pl-6 border-l border-slate-800">
              <div className="text-xs px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-300 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Produtores: <strong>{totalProdutores}</strong></span>
              </div>
              <div className="text-xs px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-300 flex items-center gap-1.5">
                <span>Aviários: <strong>{totalAviarios}</strong></span>
              </div>
            </div>
          </div>

          {/* Action Buttons: Importar Base & Atualizar Base */}
          <div className="flex items-center gap-3">
            
            {/* Quick Search */}
            <div className="relative hidden md:block w-48 lg:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar produtor, aviário..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-800/70 border border-slate-700/60 text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Botão [ ⟳ ATUALIZAR BASE ] */}
            <button
              id="btn-atualizar-base"
              onClick={onOpenImportModal}
              className="hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-slate-800/90 hover:bg-slate-700 hover:text-white border border-slate-700 hover:border-slate-600 transition-all shadow-sm hover:shadow active:scale-95"
              title="Atualizar dados existentes sem duplicidade"
            >
              <RefreshCw className="w-3.5 h-3.5 text-sky-400" />
              <span>⟳ ATUALIZAR BASE</span>
            </button>

            {/* Botão Principal [ ⬆ IMPORTAR BASE DE DADOS ] */}
            <button
              id="btn-importar-base"
              onClick={onOpenImportModal}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 via-sky-600 to-blue-700 hover:from-blue-500 hover:to-sky-500 border border-sky-400/30 shadow-lg shadow-sky-600/30 hover:shadow-sky-600/50 transition-all transform hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
            >
              <UploadCloud className="w-4 h-4 animate-bounce" />
              <span>⬆ IMPORTAR BASE DE DADOS</span>
            </button>

          </div>
        </div>

        {/* Sub-Navigation Tabs */}
        <div className="flex items-center space-x-1 border-t border-slate-800/80 pt-2 pb-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('fichas')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === 'fichas'
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Fichas de Setup</span>
          </button>

          <button
            onClick={() => setActiveTab('produtores')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === 'produtores'
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Produtores ({totalProdutores})</span>
          </button>

          <button
            onClick={() => setActiveTab('tecnicos')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === 'tecnicos'
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Extensionistas / Técnicos</span>
          </button>

          <button
            onClick={() => setActiveTab('historico')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === 'historico'
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Histórico de Importações</span>
          </button>
        </div>

      </div>
    </header>
  );
};
