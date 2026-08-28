import React, { useState, useEffect, useMemo } from 'react';
import { Header } from './components/Header';
import { CascadeFilterBar } from './components/CascadeFilterBar';
import { FichaSetupCard } from './components/FichaSetupCard';
import { ImportModal } from './components/ImportModal';
import { UserManagementModal } from './components/UserManagementModal';
import { ImportHistoryView } from './components/ImportHistoryView';
import { ProdutoresView } from './components/ProdutoresView';
import { TecnicosView } from './components/TecnicosView';
import { fetchProdutores, fetchAviarios, fetchTecnicos } from './services/dataService';
import { loadImportacoesHistory } from './services/importService';
import { fetchMyProfile, UserProfile, ACCESS_LEVELS } from './services/profileService';
import { Session } from '@supabase/supabase-js';
import { supabase } from './services/supabase';
import { LoginView } from './components/LoginView';
import { Produtor, Aviario, Tecnico, ImportacaoLog } from './types/database';
import { RefreshCw, ShieldCheck, Home, AlertCircle } from 'lucide-react';

export const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<'fichas' | 'produtores' | 'tecnicos' | 'historico'>('fichas');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isUserManagementOpen, setIsUserManagementOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Data States
  const [produtores, setProdutores] = useState<Produtor[]>([]);
  const [aviarios, setAviarios] = useState<Aviario[]>([]);
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);
  const [importLogs, setImportLogs] = useState<ImportacaoLog[]>([]);

  // Selection States for Cascading Filter
  const [selectedProdutorId, setSelectedProdutorId] = useState<string>('');
  const [selectedAviarioId, setSelectedAviarioId] = useState<string>('');

  const loadData = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [prodData, avData, tecData, logsData] = await Promise.all([
        fetchProdutores(),
        fetchAviarios(),
        fetchTecnicos(),
        loadImportacoesHistory()
      ]);

      setProdutores(prodData);
      setAviarios(avData);
      setTecnicos(tecData);
      setImportLogs(logsData);

      // Auto-seleciona o primeiro produtor e aviário caso nada esteja selecionado
      if (prodData.length > 0) {
        setSelectedProdutorId(prev => {
          const exists = prodData.some(p => p.id === prev);
          const activeProdId = exists && prev ? prev : prodData[0].id;
          
          // Ajusta aviário vinculado
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
      }
    } catch (err: any) {
      console.error('Erro ao carregar dados do Supabase:', err);
      setLoadError(err?.message || 'Falha ao conectar com o banco de dados Supabase.');
    } finally {
      setIsLoading(false);
    }
  };

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
        loadData();
        loadUserProfile();
      }
    });

    // 2. Escutar mudanças na autenticação (login, logout, refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setIsAuthChecking(false);
      if (session) {
        loadData();
        loadUserProfile();
      } else {
        setUserProfile(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Nível de acesso do usuário (fallback para viewer se profile não carregou)
  const userLevel = userProfile?.level ?? ACCESS_LEVELS.VIEWER;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUserProfile(null);
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

  // 1. Tela de Carregamento da Autenticação
  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center space-y-4">
        <RefreshCw className="w-8 h-8 text-sky-400 animate-spin" />
        <p className="text-xs font-semibold text-slate-400">Verificando sessão segura...</p>
      </div>
    );
  }

  // 2. Tela de Login se não estiver autenticado
  if (!session) {
    return <LoginView onLoginSuccess={() => loadData()} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-sky-500 selection:text-white">
      
      {/* Top Header com Logo Oficial, Busca e Perfil */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenImportModal={() => setIsImportModalOpen(true)}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        totalProdutores={produtores.length}
        totalAviarios={aviarios.length}
        userEmail={session.user.email}
        onLogout={handleLogout}
        onOpenUserManagement={() => setIsUserManagementOpen(true)}
        userLevel={userLevel}
        userRole={userProfile?.role}
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
              onClick={loadData}
              className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Tentar Novamente
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="py-24 text-center space-y-4">
            <RefreshCw className="w-10 h-10 text-sky-400 animate-spin mx-auto" />
            <p className="text-sm font-semibold text-slate-300">Carregando dados da Bello Alimentos...</p>
          </div>
        ) : produtores.length === 0 ? (
          /* Estado Vazio Limpo (Sem botões redundantes, usando apenas o do topo) */
          <div className="py-16 text-center space-y-3 max-w-xl mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-xl">
            <Home className="w-12 h-12 text-slate-600 mx-auto" />
            <h2 className="text-lg font-bold text-white">Nenhum produtor encontrado no banco de dados</h2>
            <p className="text-xs text-slate-400">
              Utilize o botão <strong className="text-sky-400">IMPORTAR BASE DE DADOS</strong> no topo da página para carregar os registros.
            </p>
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
                    onSetupUpdated={loadData}
                    userLevel={userLevel}
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
                onRefresh={loadData}
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
                onRefresh={loadData}
                userLevel={userLevel}
              />
            )}

            {/* VIEW 4: HISTÓRICO DE IMPORTAÇÕES */}
            {activeTab === 'historico' && (
              <ImportHistoryView
                logs={importLogs}
                isLoading={isLoading}
                onRefresh={loadData}
                onOpenImportModal={() => setIsImportModalOpen(true)}
              />
            )}

          </div>
        )}

      </main>

      {/* Rodapé com Indicador de Conexão */}
      <footer className="no-print bg-slate-900/80 border-t border-slate-800 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap items-center justify-between gap-2">
          <span>Bello Alimentos © 2026 • Ficha Cadastral e Setup de Granjas</span>
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Supabase Conectado ({produtores.length} produtores / {aviarios.length} aviários sincronizados)</span>
          </div>
        </div>
      </footer>

      {/* Modal de Importação */}
      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportSuccess={loadData}
        onViewHistory={() => {
          loadData();
          setActiveTab('historico');
        }}
      />

      {/* Modal de Gestão de Usuários */}
      <UserManagementModal
        isOpen={isUserManagementOpen}
        onClose={() => setIsUserManagementOpen(false)}
        currentUserLevel={userLevel}
      />

    </div>
  );
};

export default App;
