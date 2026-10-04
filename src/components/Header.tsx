import React, { useState, useRef, useEffect } from 'react';
import { 
  UploadCloud, 
  Layers, 
  Users, 
  UserCheck, 
  History, 
  Search, 
  LogOut, 
  User, 
  Settings, 
  BookOpen, 
  HelpCircle,
  ChevronDown,
  Check,
  Building2,
  Grid
} from 'lucide-react';
import { CompanyLogo } from './CompanyLogo';
import { useCompany } from '../context/CompanyContext';

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  super_admin: { label: 'Super Admin', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
  admin: { label: 'Admin', color: 'bg-rose-500/20 text-rose-300 border-rose-500/30' },
  extensionista: { label: 'Extensionista', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  viewer: { label: 'Visualizador', color: 'bg-slate-700/50 text-slate-300 border-slate-600' }
};

interface HeaderProps {
  activeTab: 'fichas' | 'produtores' | 'tecnicos' | 'historico';
  setActiveTab: (tab: 'fichas' | 'produtores' | 'tecnicos' | 'historico') => void;
  onOpenImportModal: () => void;
  onOpenTutorial?: () => void;
  onOpenCompanySelector?: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  totalProdutores: number;
  totalAviarios: number;
  userEmail?: string;
  onLogout?: () => void;
  onOpenUserManagement?: () => void;
  userLevel?: number;
  userRole?: string;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenImportModal,
  onOpenTutorial,
  onOpenCompanySelector,
  searchQuery,
  setSearchQuery,
  totalProdutores,
  totalAviarios,
  userEmail,
  onLogout,
  onOpenUserManagement,
  userLevel = 10,
  userRole = 'viewer'
}) => {
  const { currentCompany, userCompanies, isSuperAdmin, switchCompany } = useCompany();
  const [isCompanyMenuOpen, setIsCompanyMenuOpen] = useState(false);
  const companyMenuRef = useRef<HTMLDivElement>(null);

  const roleInfo = ROLE_LABELS[userRole] || ROLE_LABELS.viewer;

  // Fecha o dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (companyMenuRef.current && !companyMenuRef.current.contains(event.target as Node)) {
        setIsCompanyMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const canSwitchCompany = isSuperAdmin || userCompanies.length > 1;

  return (
    <header className="bg-slate-900/95 backdrop-blur-md border-b border-slate-800 sticky top-0 z-30 transition-all font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo & Marca da Empresa Ativa */}
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-3">
              <div 
                className="h-12 w-auto min-w-[90px] max-w-[150px] bg-white rounded-xl px-2.5 py-1 flex items-center justify-center shadow-lg shadow-black/20 border transition-all"
                style={{ borderColor: currentCompany.cor_destaque }}
              >
                <CompanyLogo company={currentCompany} className="h-9 w-auto" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] sm:text-xs px-2 py-0.5 rounded-full font-bold tracking-wider uppercase border ${currentCompany.badgeBg} ${currentCompany.badgeText} ${currentCompany.badgeBorder}`}>
                    Set Up Granja
                  </span>
                </div>
                <h2 className="text-xs sm:text-sm font-black text-white tracking-tight flex items-center gap-1.5 mt-0.5">
                  <span>{currentCompany.nome}</span>
                </h2>
              </div>
            </div>

            {/* Badges de Contagem Real do Banco */}
            <div className="hidden xl:flex items-center gap-2 ml-4 pl-4 border-l border-slate-800">
              <div className="text-xs px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-200 flex items-center gap-2 shadow-inner">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Produtores: <strong className="font-mono text-sm" style={{ color: currentCompany.cor_destaque }}>{totalProdutores}</strong></span>
              </div>
              <div className="text-xs px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-200 flex items-center gap-2 shadow-inner">
                <span>Aviários: <strong className="font-mono text-sm" style={{ color: currentCompany.cor_destaque }}>{totalAviarios}</strong></span>
              </div>
            </div>
          </div>

          {/* Action Area: Busca, Empresa, Importar e Perfil */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* Quick Search */}
            <div className="relative hidden md:block w-40 lg:w-56">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar produtor, aviário..."
                className="w-full pl-9 pr-8 py-2 text-xs rounded-xl bg-slate-800/80 border border-slate-700 text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all"
                style={{
                  outlineColor: currentCompany.cor_destaque
                }}
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

            {/* DROPDOWN: SELETOR / TROCA DE EMPRESA */}
            <div className="relative" ref={companyMenuRef}>
              <button
                type="button"
                onClick={() => canSwitchCompany && setIsCompanyMenuOpen(!isCompanyMenuOpen)}
                disabled={!canSwitchCompany}
                className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                  canSwitchCompany 
                    ? 'bg-slate-800 hover:bg-slate-700/80 border-slate-700 text-white cursor-pointer hover:border-slate-600 shadow-sm'
                    : 'bg-slate-900 border-slate-800 text-slate-300 cursor-default'
                }`}
                title={canSwitchCompany ? 'Trocar de empresa' : `Empresa atual: ${currentCompany.nome}`}
              >
                <Building2 className="w-3.5 h-3.5" style={{ color: currentCompany.cor_destaque }} />
                <span className="hidden sm:inline text-slate-400 font-normal">Empresa:</span>
                <span className="font-bold truncate max-w-[120px]">{currentCompany.nome}</span>
                {canSwitchCompany && (
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isCompanyMenuOpen ? 'rotate-180' : ''}`} />
                )}
              </button>

              {/* Menu Dropdown de Troca de Empresa */}
              {isCompanyMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3 py-2 border-b border-slate-800 flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Trocar Empresa
                    </span>
                    {onOpenCompanySelector && (
                      <button
                        onClick={() => {
                          setIsCompanyMenuOpen(false);
                          onOpenCompanySelector();
                        }}
                        className="text-[10px] text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1"
                        title="Ver tela com todos os cards"
                      >
                        <Grid className="w-3 h-3" />
                        <span>Ver Cards</span>
                      </button>
                    )}
                  </div>

                  <div className="py-1 space-y-1">
                    {userCompanies.map((comp) => {
                      const isSelected = comp.id === currentCompany.id;
                      return (
                        <button
                          key={comp.id}
                          onClick={() => {
                            switchCompany(comp.id);
                            setIsCompanyMenuOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                            isSelected 
                              ? 'bg-slate-800 text-white' 
                              : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 truncate">
                            <div className="w-6 h-6 rounded-lg bg-white p-0.5 flex items-center justify-center shrink-0">
                              <img src={comp.logo_path} alt={comp.nome} className="max-h-full max-w-full object-contain" />
                            </div>
                            <span className="truncate">{comp.nome}</span>
                          </div>
                          {isSelected && (
                            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* BOTÃO DE TUTORIAL / COMO USAR */}
            {onOpenTutorial && (
              <button
                id="btn-abrir-tutorial"
                onClick={onOpenTutorial}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl text-xs font-bold text-sky-300 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 hover:border-sky-400/60 shadow-sm transition-all transform hover:-translate-y-0.5 active:translate-y-0"
                title="Como usar a plataforma (Tutorial Interativo e Guia Rápido)"
              >
                <BookOpen className="w-4 h-4 text-sky-400 shrink-0" />
                <span className="hidden lg:inline">Como Usar</span>
              </button>
            )}

            {/* BOTÃO DE IMPORTAÇÃO - Permitido para Super Admin ou Administrador da empresa ativa */}
            {userLevel >= 80 && (
              <button
                id="btn-importar-base-unico"
                onClick={onOpenImportModal}
                className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r ${currentCompany.buttonGradient} ${currentCompany.buttonHoverGradient} border border-white/20 shadow-lg transition-all transform hover:-translate-y-0.5 active:translate-y-0 active:scale-95`}
              >
                <UploadCloud className="w-4 h-4" />
                <span className="hidden sm:inline">IMPORTAR BASE</span>
                <span className="sm:hidden">IMPORTAR</span>
              </button>
            )}

            {/* Perfil do Usuário Autenticado & Sair */}
            {onLogout && (
              <div className="flex items-center gap-1.5 sm:gap-2 pl-2 border-l border-slate-800">
                {userEmail && (
                  <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-300 text-xs font-medium max-w-[200px]" title={userEmail}>
                    <User className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                    <span className="truncate">{userEmail.split('@')[0]}</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold border shrink-0 ${roleInfo.color}`}>
                      {roleInfo.label}
                    </span>
                  </div>
                )}
                {userLevel >= 80 && onOpenUserManagement && (
                  <button
                    onClick={onOpenUserManagement}
                    className="flex items-center gap-1.5 p-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-700 border border-slate-700/50 transition-all"
                    title="Gestão de Usuários e Empresas"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={onLogout}
                  className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition-all"
                  title="Sair da Conta"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Sair</span>
                </button>
              </div>
            )}

          </div>
        </div>

        {/* Sub-Navigation Tabs */}
        <div className="flex items-center space-x-1 border-t border-slate-800/80 pt-2 pb-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('fichas')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === 'fichas'
                ? `${currentCompany.badgeBg} ${currentCompany.badgeText} border ${currentCompany.badgeBorder}`
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
                ? `${currentCompany.badgeBg} ${currentCompany.badgeText} border ${currentCompany.badgeBorder}`
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
                ? `${currentCompany.badgeBg} ${currentCompany.badgeText} border ${currentCompany.badgeBorder}`
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
                ? `${currentCompany.badgeBg} ${currentCompany.badgeText} border ${currentCompany.badgeBorder}`
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Histórico de Importações</span>
          </button>

          {onOpenTutorial && (
            <button
              onClick={onOpenTutorial}
              className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-sky-300 hover:bg-slate-800/80 border border-transparent hover:border-slate-700 transition-all whitespace-nowrap"
              title="Ajuda e Tutorial da Plataforma"
            >
              <HelpCircle className="w-3.5 h-3.5 text-sky-400" />
              <span>Guia & Tutorial</span>
            </button>
          )}
        </div>

      </div>
    </header>
  );
};
