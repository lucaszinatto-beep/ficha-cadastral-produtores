import React, { useState } from 'react';
import { CompanyThemeConfig, INITIAL_COMPANIES_LIST, DEFAULT_COMPANY, LEVO_UNITS } from '../config/companies';
import { CompanyUnitConfig } from '../types/database';
import { CompanyLogo } from './CompanyLogo';
import { ArrowRight, ArrowLeft, Lock, LogOut, ShieldCheck, User, Sparkles, MapPin, CheckCircle2 } from 'lucide-react';

interface CompanySelectorViewProps {
  userCompanies?: CompanyThemeConfig[];
  allCompanies?: CompanyThemeConfig[];
  isSuperAdmin?: boolean;
  userEmail?: string;
  onSelectCompany: (company: CompanyThemeConfig, unit?: CompanyUnitConfig | null) => void;
  onLogout?: () => void;
  isPreLogin?: boolean;
  initialViewingCompany?: CompanyThemeConfig | null;
}

export const CompanySelectorView: React.FC<CompanySelectorViewProps> = ({
  userCompanies = INITIAL_COMPANIES_LIST,
  allCompanies = INITIAL_COMPANIES_LIST,
  isSuperAdmin = false,
  userEmail,
  onSelectCompany,
  onLogout,
  isPreLogin = false,
  initialViewingCompany = null
}) => {
  const authorizedIds = new Set(userCompanies.map(c => c.id));
  
  // Empresa selecionada inicialmente (prioriza localStorage ou primeira disponível)
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(() => {
    const saved = localStorage.getItem('active_company_id');
    if (saved && allCompanies.some(c => c.id === saved)) return saved;
    return allCompanies[0]?.id || DEFAULT_COMPANY.id;
  });

  // Estado que controla se o submenu de unidades de uma empresa específica (Levo Alimentos) está aberto
  const [viewingUnitsForCompany, setViewingUnitsForCompany] = useState<CompanyThemeConfig | null>(initialViewingCompany);

  const activeSelectedCompany = allCompanies.find(c => c.id === selectedCompanyId) || allCompanies[0] || DEFAULT_COMPANY;

  // Renderiza o submenu de unidades da Levo Alimentos
  if (viewingUnitsForCompany && viewingUnitsForCompany.slug === 'levo') {
    const levoCompany = viewingUnitsForCompany;
    const units = levoCompany.units && levoCompany.units.length > 0 ? levoCompany.units : LEVO_UNITS;

    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between relative overflow-hidden font-sans selection:bg-purple-500 selection:text-white animate-fade-in">
        {/* Background ambient lighting effects específico para Levo (Purple Glow) */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/50 via-slate-950 to-slate-950 pointer-events-none" />
        <div className="absolute top-0 left-1/3 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-fuchsia-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Navbar */}
        <header className="relative z-10 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setViewingUnitsForCompany(null)}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-all text-xs font-semibold cursor-pointer group"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform text-purple-400" />
            <span>← VOLTAR PARA EMPRESAS</span>
          </button>

          {!isPreLogin && (
            <div className="flex items-center gap-3">
              {userEmail && (
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300">
                  <User className="w-3.5 h-3.5 text-purple-400" />
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
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-purple-300 text-[11px] font-medium">
                <Sparkles className="w-3 h-3 text-purple-400" />
                <span>Levo Alimentos • Seleção de Unidade</span>
              </span>
            </div>
          )}
        </header>

        {/* Main Unit Selection Area */}
        <main className="relative z-10 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 flex flex-col items-center justify-center flex-1">
          {/* Header Titles */}
          <div className="text-center mb-10 space-y-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-purple-950/40 border border-purple-500/30 text-purple-300 text-xs font-semibold mb-1 shadow-sm">
              <MapPin className="w-4 h-4 text-purple-400" />
              <span>Levo Alimentos</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
              SELECIONE A UNIDADE
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
              Escolha a unidade da Levo Alimentos que deseja acessar
            </p>
          </div>

          {/* Cards das 2 Unidades: UMUARAMA e CAPANEMA */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl">
            {units.map((unit) => {
              return (
                <div
                  key={unit.id}
                  className="group relative text-left p-6 sm:p-7 rounded-3xl border border-slate-800 bg-slate-900/90 hover:bg-slate-900 hover:border-purple-500/60 transition-all duration-300 flex flex-col justify-between shadow-xl shadow-black/40 hover:-translate-y-1 hover:shadow-purple-500/10 overflow-hidden"
                >
                  {/* Subtle top ambient glow */}
                  <div
                    className="absolute top-0 right-0 w-36 h-36 rounded-full blur-3xl opacity-0 group-hover:opacity-20 transition-opacity pointer-events-none bg-purple-500"
                  />

                  <div className="flex items-start justify-between w-full">
                    <CompanyLogo
                      company={levoCompany}
                      variant="card"
                      className="h-full w-full"
                      containerClassName="w-36 sm:w-40 h-16 rounded-2xl p-2.5 border border-white/10 shrink-0"
                    />

                    <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border bg-purple-500/10 text-purple-300 border-purple-500/20">
                      Unidade Ativa
                    </span>
                  </div>

                  {/* Card Middle: Unit Details */}
                  <div className="my-5 space-y-1.5">
                    <div className="text-[11px] font-semibold text-purple-400 tracking-wider uppercase">
                      Levo Alimentos — {unit.nome}
                    </div>
                    <h3 className="text-lg sm:text-xl font-black text-white group-hover:text-purple-200 transition-colors">
                      {unit.nome.toUpperCase()}
                    </h3>
                    <div className="pt-1 text-xs text-slate-400 space-y-0.5">
                      <p><span className="text-slate-500">Nome:</span> <strong className="text-slate-300">Levo Alimentos</strong></p>
                      <p><span className="text-slate-500">Unidade:</span> <strong className="text-purple-300">{unit.nome}</strong></p>
                      <p><span className="text-slate-500">Código interno:</span> <code className="text-[10px] px-1.5 py-0.5 rounded bg-slate-950 text-slate-400 font-mono">{unit.id}</code></p>
                    </div>
                  </div>

                  {/* Card Bottom: Button SELECIONAR */}
                  <div className="pt-4 border-t border-slate-800/80">
                    <button
                      type="button"
                      onClick={() => onSelectCompany(levoCompany, unit)}
                      className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl font-bold text-xs sm:text-sm text-white bg-gradient-to-r from-purple-700 via-fuchsia-700 to-purple-800 hover:from-purple-600 hover:to-fuchsia-600 border border-white/20 shadow-lg shadow-black/30 transition-all transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4 text-purple-300" />
                      <span>SELECIONAR</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Botão Inferior de Retorno ← VOLTAR */}
          <div className="mt-8">
            <button
              type="button"
              onClick={() => setViewingUnitsForCompany(null)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-slate-900/90 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-bold text-slate-300 hover:text-white transition-all shadow-md cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-purple-400" />
              <span>← VOLTAR</span>
            </button>
          </div>
        </main>

        {/* Footer */}
        <footer className="relative z-10 py-6 text-center text-xs text-slate-500 border-t border-slate-900">
          <p>Levo Alimentos • Gestão Integrada por Unidade © 2026</p>
        </footer>
      </div>
    );
  }

  // Visualização Padrão: 4 Empresas
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
            const isAuthorized = isPreLogin || isSuperAdmin || authorizedIds.has(company.id);
            const isSelected = isPreLogin && selectedCompanyId === company.id;
            const isLevo = company.slug === 'levo';

            return (
              <button
                key={company.id}
                type="button"
                onClick={() => {
                  if (!isAuthorized) return;
                  if (isLevo) {
                    // REGRA OBRIGATÓRIA: Clicar em Levo Alimentos NÃO abre login imediatamente,
                    // abre o submenu de seleção de unidade!
                    setSelectedCompanyId(company.id);
                    setViewingUnitsForCompany(company);
                    return;
                  }

                  if (isPreLogin) {
                    if (selectedCompanyId === company.id) {
                      onSelectCompany(company, null);
                    } else {
                      setSelectedCompanyId(company.id);
                    }
                  } else {
                    onSelectCompany(company, null);
                  }
                }}
                disabled={!isAuthorized}
                className={`group relative text-left p-6 sm:p-7 rounded-3xl border transition-all duration-200 flex flex-col justify-between h-56 sm:h-60 overflow-hidden ${
                  isSelected
                    ? `bg-slate-900 border-sky-400 ring-2 ring-sky-500/40 -translate-y-1 shadow-xl shadow-sky-500/10 cursor-pointer ${company.cardBorderHover}`
                    : isAuthorized
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
                  <CompanyLogo
                    company={company}
                    variant="card"
                    className="h-full w-full"
                    containerClassName="w-40 sm:w-44 h-20 rounded-2xl p-2.5 border border-white/10 group-hover:shadow-lg transition-all shrink-0"
                  />

                  {/* Status Badge */}
                  <div>
                    {isLevo ? (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border bg-purple-500/10 text-purple-300 border-purple-500/20 flex items-center gap-1">
                        <MapPin className="w-2.5 h-2.5 text-purple-400" />
                        2 Unidades
                      </span>
                    ) : isPreLogin ? (
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${isSelected ? 'bg-sky-500/20 text-sky-300 border-sky-400/40 shadow-sm' : `${company.badgeBg} ${company.badgeText} ${company.badgeBorder}`}`}>
                        {isSelected ? 'Selecionada' : 'Selecionar'}
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
                      {isLevo ? 'Umuarama e Capanema' : 'Ficha Cadastral & Setup de Granjas'}
                    </p>
                  </div>

                  <div
                    className={`w-9 h-9 rounded-2xl flex items-center justify-center transition-all duration-200 ${
                      isSelected
                        ? 'bg-sky-500 text-white scale-105 shadow-md shadow-sky-500/30'
                        : isAuthorized
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

        {/* Assinatura do Criador — Marca Oficial Lucas Zinatto */}
        <div className="mt-8 mb-4 flex flex-col items-center justify-center text-center select-none animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/80 border border-slate-800/80 backdrop-blur-md shadow-sm transition-all hover:border-slate-700/80 group">
            <span className="text-[10px] sm:text-[11px] uppercase tracking-widest text-slate-500 font-semibold group-hover:text-slate-400 transition-colors">
              Criado por
            </span>
            <span className="h-3 w-px bg-slate-700/60" />
            <span className="text-xs sm:text-[13px] font-bold tracking-wide text-slate-200 group-hover:text-white transition-colors">
              Lucas Zinatto
            </span>
          </div>
        </div>

        {/* Botão de Acesso ao Login (Visível no fluxo inicial pré-login) */}
        {isPreLogin && (
          <div className="w-full flex justify-center pb-2 animate-fade-in">
            <button
              type="button"
              onClick={() => {
                if (activeSelectedCompany.slug === 'levo') {
                  setViewingUnitsForCompany(activeSelectedCompany);
                } else {
                  onSelectCompany(activeSelectedCompany, null);
                }
              }}
              className={`w-full sm:w-auto min-w-[280px] max-w-md flex items-center justify-center gap-3 px-8 py-3.5 rounded-2xl font-bold text-xs sm:text-sm text-white bg-gradient-to-r ${activeSelectedCompany.buttonGradient} ${activeSelectedCompany.buttonHoverGradient} shadow-xl shadow-black/40 border border-white/20 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer`}
            >
              <span>
                {activeSelectedCompany.slug === 'levo'
                  ? 'SELECIONAR UNIDADE — LEVO ALIMENTOS'
                  : `ACESSAR LOGIN — ${activeSelectedCompany.nome.toUpperCase()}`}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-6 text-center text-xs text-slate-500 border-t border-slate-900">
        <p>Plataforma de Ambiência e Setup de Granjas • Multiempresa © 2026</p>
      </footer>
    </div>
  );
};
