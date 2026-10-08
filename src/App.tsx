import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Header } from './components/Header';
import { CascadeFilterBar } from './components/CascadeFilterBar';
import { FichaSetupCard } from './components/FichaSetupCard';
import { ImportModal } from './components/ImportModal';
import { UserManagementModal } from './components/UserManagementModal';
import { ImportHistoryView } from './components/ImportHistoryView';
import { ProdutoresView } from './components/ProdutoresView';
import { TecnicosView } from './components/TecnicosView';
import { TutorialModal } from './components/TutorialModal';
import { CompanySelectorView } from './components/CompanySelectorView';
import { CompanyProvider, useCompany } from './context/CompanyContext';
import { CompanyThemeConfig, DEFAULT_COMPANY } from './config/companies';
import { fetchProdutores, fetchAviarios, fetchTecnicos } from './services/dataService';
import { loadImportacoesHistory } from './services/importService';
import { fetchMyProfile, UserProfile, ACCESS_LEVELS } from './services/profileService';
import { Session } from '@supabase/supabase-js';
import { supabase } from './services/supabase';
import { LoginView } from './components/LoginView';
import { Produtor, Aviario, Tecnico, ImportacaoLog } from './types/database';
import { RefreshCw, ShieldCheck, Home, AlertCircle, BookOpen } from 'lucide-react';

/**
 * Conteúdo Principal da Aplicação consumindo o CompanyContext (Pós-Autenticação)
 */
const AppMain: React.FC<{
  session: Session;
  userProfile: UserProfile | null;
  onLogout: () => void;
}> = ({ session, userProfile, onLogout }) => {
  const { 
    currentCompany, 
    userCompanies, 
    allCompanies, 
    isSuperAdmin, 
    switchCompany 
  } = useCompany();

  // Controla se o seletor de empresa está aberto dentro do painel autenticado
  const [isSelectorViewActive, setIsSelectorViewActive] = useState<boolean>(false);

  const [activeTab, setActiveTab] = useState<'fichas' | 'produtores' | 'tecnicos' | 'historico'>('fichas');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isUserManagementOpen, setIsUserManagementOpen] = useState(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Data States escopados por empresa
  const [produtores, setProdutores] = useState<Produtor[]>([]);
  const [aviarios, setAviarios] = useState<Aviario[]>([]);
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);
  const [importLogs, setImportLogs] = useState<ImportacaoLog[]>([]);

  // Selection States for Cascading Filter
  const [selectedProdutorId, setSelectedProdutorId] = useState<string>('');
  const [selectedAviarioId, setSelectedAviarioId] = useState<string>('');

  const loadData = useCallback(async (companyId?: string) => {
    const targetCompanyId = companyId || currentCompany.id;
    setIsLoading(true);
    setLoadError(null);
    try {
      const [prodData, avData, tecData, logsData] = await Promise.all([
        fetchProdutores(targetCompanyId),
        fetchAviarios(targetCompanyId),
        fetchTecnicos(targetCompanyId),
        loadImportacoesHistory(targetCompanyId)
      ]);

      setProdutores(prodData);
      setAviarios(avData);
      setTecnicos(tecData);
      setImportLogs(logsData);

      // Auto-seleciona o primeiro produtor e aviário da empresa ativa caso necessário
      if (prodData.length > 0) {
        setSelectedProdutorId(prev => {
          const exists = prodData.some(p => p.id === prev);
          const activeProdId = exists && prev ? prev : prodData[0].id;
          
          const relatedAviarios = avData.filter(a => a.produtor_id === activeProdId);
          if (relatedAviarios.length > 0) {
            setSelectedAviarioId(prevAv => {
              const avExists = relatedAviarios.some(a => a.id === prevAv);
              return avExists && prevAv ? prevAv : relatedAviarios[0].id;
            });
          } else {
            setSelectedAviarioId('');
          }

          return activeProdId;
        });
      } else {
        setSelectedProdutorId('');
        setSelectedAviarioId('');
      }
    } catch (err: any) {
      console.error('Erro ao carregar dados do Supabase:', err);
      setLoadError(err?.message || 'Falha ao conectar com o banco de dados Supabase.');
    } finally {
      setIsLoading(false);
    }
  }, [currentCompany.id]);

  // Recarrega os dados sempre que a empresa ativa for alterada ou o seletor for fechado
  useEffect(() => {
    if (!isSelectorViewActive && currentCompany?.id) {
      loadData(currentCompany.id);
    }
  }, [currentCompany?.id, isSelectorViewActive, loadData]);

  // Nível de acesso do usuário (Super Admin sempre tem acesso total)
  const userLevel = isSuperAdmin ? ACCESS_LEVELS.SUPER_ADMIN : (userProfile?.level ?? ACCESS_LEVELS.VIEWER);

  // Manipulador de Seleção de Empresa no CompanySelectorView dentro do painel
  const handleSelectCompany = (company: CompanyThemeConfig) => {
    switchCompany(company.id);
    sessionStorage.setItem('company_selected_session', 'true');
    setIsSelectorViewActive(false);
  };

  // Aviários filtrados do produtor selecionado
  const aviariosOfSelectedProdutor = useMemo(() => {
    if (!selectedProdutorId) return [];
    return aviarios.filter(a => a.produtor_id === selectedProdutorId);
  }, [aviarios, selectedProdutorId]);

  // Manipulador de Seleção de Produtor
  const handleSelectProdutor = (produtorId: string) => {
    setSelectedProdutorId(produtorId);
    const avs = aviarios.filter(a => a.produtor_id === produtorId);
    if (avs.length > 0) {
      setSelectedAviarioId(avs[0].id);
    } else {
      setSelectedAviarioId('');
    }
  };

  // Navegar de outras visões para o Setup do Aviário
  const handleSelectProdutorAndAviario = (produtorId: string, aviarioId?: string) => {
    setSelectedProdutorId(produtorId);
    if (aviarioId) {
      setSelectedAviarioId(aviarioId);
    } else {
      const avs = aviarios.filter(a => a.produtor_id === produtorId);
      if (avs.length > 0) setSelectedAviarioId(avs[0].id);
    }
    setActiveTab('fichas');
  };

  // Aviário ativo para a Ficha
  const currentAviario = useMemo(() => {
    if (!selectedAviarioId) return null;
    return aviarios.find(a => a.id === selectedAviarioId) || null;
  }, [aviarios, selectedAviarioId]);

  // Produtores filtrados por busca global
  const filteredProdutores = useMemo(() => {
    if (!searchQuery.trim()) return produtores;
    const q = searchQuery.toLowerCase();
    return produtores.filter(p => p.nome.toLowerCase().includes(q));
  }, [produtores, searchQuery]);

  // Se o usuário solicitou trocar de empresa através do Header, exibe o seletor com as empresas autorizadas
  if (isSelectorViewActive) {
    return (
      <CompanySelectorView
        userCompanies={userCompanies}
        allCompanies={allCompanies}
        isSuperAdmin={isSuperAdmin}
        userEmail={session.user.email}
        onSelectCompany={handleSelectCompany}
        onLogout={onLogout}
        isPreLogin={false}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-sky-500 selection:text-white">
      
      {/* Top Header com Logo Oficial da Empresa Ativa, Switcher, Busca e Perfil */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenImportModal={() => setIsImportModalOpen(true)}
        onOpenTutorial={() => setIsTutorialOpen(true)}
        onOpenCompanySelector={() => setIsSelectorViewActive(true)}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        totalProdutores={produtores.length}
        totalAviarios={aviarios.length}
        userEmail={session.user.email}
        onLogout={onLogout}
        onOpenUserManagement={() => setIsUserManagementOpen(true)}
        userLevel={userLevel}
        userRole={isSuperAdmin ? 'super_admin' : userProfile?.role}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Banner de Erro de Conexão se houver */}
        {loadError && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs flex items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              <div>
                <p className="font-bold text-rose-200">Erro na Conexão com Supabase</p>
                <p>{loadError}</p>
              </div>
            </div>
            <button
              onClick={() => loadData(currentCompany.id)}
              className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Tentar Novamente
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="py-24 text-center space-y-4">
            <RefreshCw className="w-10 h-10 text-sky-400 animate-spin mx-auto" />
            <p className="text-sm font-semibold text-slate-300">
              Carregando dados da {currentCompany.nome}...
            </p>
          </div>
        ) : produtores.length === 0 ? (
          /* Estado Vazio Limpo Escopado à Empresa Ativa */
          <div className="py-16 text-center space-y-3 max-w-xl mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-xl">
            <Home className="w-12 h-12 text-slate-600 mx-auto" />
            <h2 className="text-lg font-bold text-white">Nenhum produtor cadastrado em {currentCompany.nome}</h2>
            <p className="text-xs text-slate-400">
              Utilize o botão <strong className="text-sky-400">IMPORTAR BASE DE DADOS</strong> no topo da página ou cadastre novos produtores na aba <strong className="text-slate-200">Produtores</strong>.
            </p>
            <div className="pt-2 flex items-center justify-center gap-3">
              <button
                onClick={() => setIsTutorialOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-400 hover:text-sky-300 border border-slate-700 text-xs font-semibold transition-all shadow-sm cursor-pointer"
              >
                <BookOpen className="w-4 h-4" />
                <span>Ver Tutorial da Plataforma</span>
              </button>
            </div>
          </div>
        ) : (
          /* Visões Principais do Sistema */
          <div>
            
            {/* VIEW 1: FICHAS DE SETUP */}
            {activeTab === 'fichas' && (
              <div className="space-y-6">
                {/* Filtro em Cascata: Produtor -> Extensionista -> Aviários -> Setup */}
                <CascadeFilterBar
                  produtores={filteredProdutores}
                  selectedProdutorId={selectedProdutorId}
                  onSelectProdutor={handleSelectProdutor}
                  aviariosOfProdutor={aviariosOfSelectedProdutor}
                  selectedAviarioId={selectedAviarioId}
                  onSelectAviario={setSelectedAviarioId}
                  searchFilter={searchQuery}
                  setSearchFilter={setSearchQuery}
                />

                {/* Ficha Técnica de Setup baseada no PDF oficial */}
                {currentAviario ? (
                  <FichaSetupCard
                    aviario={currentAviario}
                    allTecnicos={tecnicos}
                    allAviariosOfProdutor={aviariosOfSelectedProdutor}
                    onSetupUpdated={() => loadData(currentCompany.id)}
                    userProfile={userProfile}
                  />
                ) : (
                  <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center text-slate-400 space-y-3">
                    <Home className="w-10 h-10 text-slate-600 mx-auto" />
                    <p className="text-sm font-semibold">Nenhum aviário selecionado.</p>
                    <p className="text-xs text-slate-500">Selecione um aviário no filtro acima para visualizar a Ficha Técnica.</p>
                  </div>
                )}
              </div>
            )}

            {/* VIEW 2: PRODUTORES */}
            {activeTab === 'produtores' && (
              <ProdutoresView
                produtores={produtores}
                aviarios={aviarios}
                tecnicos={tecnicos}
                onSelectProdutorAndAviario={handleSelectProdutorAndAviario}
                onRefresh={() => loadData(currentCompany.id)}
                userLevel={userLevel}
              />
            )}

            {/* VIEW 3: TÉCNICOS / EXTENSIONISTAS */}
            {activeTab === 'tecnicos' && (
              <TecnicosView
                tecnicos={tecnicos}
                aviarios={aviarios}
                produtores={produtores}
                onSelectProdutorAndAviario={handleSelectProdutorAndAviario}
                onRefresh={() => loadData(currentCompany.id)}
                userLevel={userLevel}
              />
            )}

            {/* VIEW 4: HISTÓRICO DE IMPORTAÇÕES */}
            {activeTab === 'historico' && (
              <ImportHistoryView
                logs={importLogs}
                isLoading={isLoading}
                onRefresh={() => loadData(currentCompany.id)}
                onOpenImportModal={() => setIsImportModalOpen(true)}
              />
            )}

          </div>
        )}

      </main>

      {/* Rodapé Dinâmico com Indicador da Empresa Ativa */}
      <footer className="no-print bg-slate-900/80 border-t border-slate-800 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap items-center justify-between gap-2">
          <span>{currentCompany.nome} © 2026 • Ficha Cadastral e Setup de Granjas</span>
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Supabase Conectado ({produtores.length} produtores / {aviarios.length} aviários sincronizados)</span>
          </div>
        </div>
      </footer>

      {/* Modal de Importação com Escopo da Empresa Ativa */}
      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportSuccess={() => loadData(currentCompany.id)}
        onViewHistory={() => {
          loadData(currentCompany.id);
          setActiveTab('historico');
        }}
      />

      {/* Modal de Gestão de Usuários e Vínculos Multiempresa */}
      <UserManagementModal
        isOpen={isUserManagementOpen}
        onClose={() => setIsUserManagementOpen(false)}
        currentUserLevel={userLevel}
        currentUserProfile={userProfile}
      />

      {/* Modal de Tutorial Interativo & Guia da Plataforma */}
      <TutorialModal
        isOpen={isTutorialOpen}
        onClose={() => setIsTutorialOpen(false)}
        onNavigateTab={(tab) => {
          setActiveTab(tab);
          setIsTutorialOpen(false);
        }}
      />

    </div>
  );
};

/**
 * Componente Raiz: Gerencia o Fluxo de Entrada Pré-Login, Seleção de Empresa e Autenticação
 */
export const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [showSplash, setShowSplash] = useState(false);
  const [isRecoveringPassword, setIsRecoveringPassword] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // Empresa selecionada antes do login pelo usuário
  const [selectedCompanyForLogin, setSelectedCompanyForLogin] = useState<CompanyThemeConfig | null>(null);

  const loadUserProfile = async () => {
    const profile = await fetchMyProfile();
    setUserProfile(profile);
  };

  useEffect(() => {
    // 1. Obter sessão atual salva
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsAuthChecking(false);
      if (session) {
        loadUserProfile();
      }
    });

    // 2. Escutar mudanças na autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, currentSession) => {
      setSession(currentSession);
      setIsAuthChecking(false);
      if (currentSession) {
        if (event === 'PASSWORD_RECOVERY') {
          setIsRecoveringPassword(true);
        }
        if (event === 'SIGNED_IN' && !currentSession.user?.user_metadata?.force_password_change) {
          setShowSplash(true);
          setTimeout(() => setShowSplash(false), 1500);
        }
        loadUserProfile();
      } else {
        setUserProfile(null);
        setSelectedCompanyForLogin(null);
        sessionStorage.removeItem('company_selected_session');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    sessionStorage.removeItem('company_selected_session');
    setSelectedCompanyForLogin(null);
    setSession(null);
    setUserProfile(null);
  };

  // 1. Tela de Carregamento da Autenticação
  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center space-y-4">
        <RefreshCw className="w-8 h-8 text-sky-400 animate-spin" />
        <p className="text-xs font-semibold text-slate-400">Verificando sessão segura...</p>
      </div>
    );
  }

  // 2. FLUXO PRÉ-LOGIN:
  // Se o usuário NÃO está autenticado (ou precisa atualizar senha/recuperar):
  const forcePasswordChange = session?.user?.user_metadata?.force_password_change === true;
  
  if (!session || forcePasswordChange || isRecoveringPassword) {
    // 2.1 Se ainda não selecionou a empresa, exibe obrigatoriamente a tela "SELECIONE A EMPRESA"
    if (!selectedCompanyForLogin && !isRecoveringPassword && !forcePasswordChange) {
      return (
        <CompanySelectorView
          isPreLogin={true}
          onSelectCompany={(company) => {
            setSelectedCompanyForLogin(company);
            localStorage.setItem('active_company_id', company.id);
          }}
        />
      );
    }

    // 2.2 Após selecionar a empresa, abre a tela de LOGIN DA EMPRESA ESCOLHIDA
    return (
      <LoginView 
        company={selectedCompanyForLogin || DEFAULT_COMPANY}
        onBackToCompanySelect={() => setSelectedCompanyForLogin(null)}
        onLoginSuccess={() => {
          setIsRecoveringPassword(false);
          loadUserProfile();
        }} 
        initialSession={session} 
        isRecovering={isRecoveringPassword}
      />
    );
  }

  // 3. Splash de Transição (Pós-login)
  if (showSplash) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center relative overflow-hidden z-[100]">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950"></div>
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-sky-500/20 rounded-full blur-3xl"></div>
        
        <div className="bg-white rounded-3xl p-6 shadow-[0_0_80px_rgba(56,189,248,0.8)] border border-sky-400 z-10 animate-logo-transition">
          <img
            src={selectedCompanyForLogin?.logo_path || '/logos/bello.png'}
            alt="Portal de Acesso"
            className="h-20 w-auto object-contain"
          />
        </div>
      </div>
    );
  }

  // 4. Usuário Autenticado: Entra no Painel da Empresa Ativa
  return (
    <CompanyProvider userProfile={userProfile}>
      <AppMain
        session={session}
        userProfile={userProfile}
        onLogout={handleLogout}
      />
    </CompanyProvider>
  );
};

export default App;
