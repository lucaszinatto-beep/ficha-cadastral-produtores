import React from 'react';
import { CompanyThemeConfig, INITIAL_COMPANIES_LIST } from '../config/companies';
import { CompanyLogo } from './CompanyLogo';
import { ArrowRight, Lock, LogOut, ShieldCheck, User, Sparkles } from 'lucide-react';

interface CompanySelectorViewProps {
  userCompanies?: CompanyThemeConfig[];
  allCompanies?: CompanyThemeConfig[];
  isSuperAdmin?: boolean;
  userEmail?: string;
  onSelectCompany: (company: CompanyThemeConfig) => void;
  onLogout?: () => void;
  isPreLogin?: boolean;
}

export const CompanySelectorView: React.FC<CompanySelectorViewProps> = ({
  userCompanies = INITIAL_COMPANIES_LIST,
  allCompanies = INITIAL_COMPANIES_LIST,
  isSuperAdmin = false,
  userEmail,
  onSelectCompany,
  onLogout,
  isPreLogin = false
}) => {
  const authorizedIds = new Set(userCompanies.map(c => c.id));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between relative overflow-hidden font-sans selection:bg-sky-500 selection:text-white">
      {/* Background ambient lighting effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-900/50 via-slate-950 to-slate-950 pointer-events-none" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Navbar */}
      <header className="relative z-10 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold tracking-widest uppercase px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-400">
            Plataforma Multiempresas
          </span>
        </div>

        {/* User profile & Logout (apenas quando já autenticado) */}
        {!isPreLogin && (
          <div className="flex items-center gap-3">
            {userEmail && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300">
                <User className="w-3.5 h-3.5 text-sky-400" />
                <span className="font-medium truncate max-w-[180px]">{userEmail}</span>
                {isSuperAdmin && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    Super Admin
                  </span>
                )}
              </div>
            )}

            {onLogout && (
              <button
                onClick={onLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition-all cursor-pointer"
                title="Sair da Conta"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sair</span>
              </button>
            )}
          </div>
        )}

        {isPreLogin && (
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-300 text-[11px] font-medium">
              <Sparkles className="w-3 h-3 text-sky-400" />
              <span>Portal de Acesso</span>
            </span>
          </div>
        )}
      </header>

      {/* Main Selection Area */}
      <main className="relative z-10 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 flex flex-col items-center justify-center flex-1">
        {/* Header Titles */}
        <div className="text-center mb-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/80 border border-slate-800 text-slate-400 text-xs font-medium mb-1">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Ambiente Corporativo Seguro</span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
            SELECIONE A EMPRESA
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
            Escolha a empresa que deseja acessar
          </p>
        </div>

        {/* 4 Company Cards Grid (2x2 on desktop, 1 column on mobile) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full max-w-3xl">
          {allCompanies.map((company) => {
            // No modo pré-login, todos os 4 cards estão disponíveis para o usuário clicar e ir para o login da empresa
            const isAuthorized = isPreLogin || isSuperAdmin || authorizedIds.has(company.id);

            return (
              <button
                key={company.id}
                type="button"
                onClick={() => {
                  if (isAuthorized) onSelectCompany(company);
                }}
                disabled={!isAuthorized}
                className={`group relative text-left p-6 sm:p-7 rounded-3xl border transition-all duration-200 flex flex-col justify-between h-56 sm:h-60 overflow-hidden ${
                  isAuthorized
                    ? `bg-slate-900/90 hover:bg-slate-900 border-slate-800 hover:-translate-y-1 shadow-lg cursor-pointer ${company.cardBorderHover}`
                    : 'bg-slate-950/60 border-slate-900 opacity-50 cursor-not-allowed'
                }`}
                style={{
                  outline: 'none',
                }}
              >
                {/* Subtle top ambient glow based on company color */}
                <div
                  className="absolute top-0 right-0 w-36 h-36 rounded-full blur-3xl opacity-0 group-hover:opacity-20 transition-opacity pointer-events-none"
                  style={{ backgroundColor: company.cor_destaque }}
                />

                {/* Card Top: Logo Container Padronizado com Background Específico por Empresa */}
                <div className="flex items-start justify-between w-full">
                  <div 
                    className="w-40 sm:w-44 h-20 rounded-2xl p-2.5 flex items-center justify-center shadow-md border border-white/10 group-hover:shadow-lg transition-all overflow-hidden shrink-0"
                    style={{ backgroundColor: company.logoBoxBg || '#ffffff' }}
                  >
                    <CompanyLogo company={company} className="h-full w-full" />
                  </div>

                  {/* Status Badge */}
                  <div>
                    {isPreLogin ? (
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${company.badgeBg} ${company.badgeText} ${company.badgeBorder}`}>
                        Acessar Portal
                      </span>
                    ) : isAuthorized ? (
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${company.badgeBg} ${company.badgeText} ${company.badgeBorder}`}>
                        Autorizado
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-800 text-slate-500 border border-slate-700 flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5" />
                        Bloqueado
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Bottom: Name & Action Arrow */}
                <div className="flex items-center justify-between w-full pt-4 border-t border-slate-800/80">
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-white transition-colors">
                      {company.nome}
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Ficha Cadastral & Setup de Granjas
                    </p>
                  </div>

                  <div
                    className={`w-9 h-9 rounded-2xl flex items-center justify-center transition-all duration-200 ${
                      isAuthorized
                        ? 'bg-slate-800 text-slate-300 group-hover:text-white group-hover:scale-105'
                        : 'bg-slate-900 text-slate-600'
                    }`}
                    style={
                      isAuthorized
                        ? {
                            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                          }
                        : undefined
                    }
                  >
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-6 text-center text-xs text-slate-500 border-t border-slate-900">
        <p>Plataforma de Ambiência e Setup de Granjas • Multiempresa © 2026</p>
      </footer>
    </div>
  );
};
