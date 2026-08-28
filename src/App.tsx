import React, { useState, useEffect, useMemo } from 'react';
import { Header } from './components/Header';
import { CascadeFilterBar } from './components/CascadeFilterBar';
import { FichaSetupCard } from './components/FichaSetupCard';
import { ImportModal } from './components/ImportModal';
import { ImportHistoryView } from './components/ImportHistoryView';
import { ProdutoresView } from './components/ProdutoresView';
import { TecnicosView } from './components/TecnicosView';
import { fetchProdutores, fetchAviarios, fetchTecnicos } from './services/dataService';
import { loadImportacoesHistory } from './services/importService';
import { Produtor, Aviario, Tecnico, ImportacaoLog } from './types/database';
import { UploadCloud, RefreshCw, ShieldCheck, Home } from 'lucide-react';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'fichas' | 'produtores' | 'tecnicos' | 'historico'>('fichas');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
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

      // Auto-select first producer if not set
      if (prodData.length > 0 && !selectedProdutorId) {
        setSelectedProdutorId(prodData[0].id);
        const avs = avData.filter(a => a.produtor_id === prodData[0].id);
        if (avs.length > 0) {
          setSelectedAviarioId(avs[0].id);
        }
      }
    } catch (err) {
      console.error('Erro ao carregar dados do Supabase:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered Aviaries of Selected Producer
  const aviariosOfSelectedProdutor = useMemo(() => {
    if (!selectedProdutorId) return [];
    return aviarios.filter(a => a.produtor_id === selectedProdutorId);
  }, [aviarios, selectedProdutorId]);

  // Handle Producer Selection
  const handleSelectProdutor = (produtorId: string) => {
    setSelectedProdutorId(produtorId);
    const avs = aviarios.filter(a => a.produtor_id === produtorId);
    if (avs.length > 0) {
      setSelectedAviarioId(avs[0].id);
    } else {
      setSelectedAviarioId('');
    }
  };

  // Jump from other views to Setup
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

  // Find Active Selected Aviary Object
  const currentAviario = useMemo(() => {
    if (!selectedAviarioId) return null;
    return aviarios.find(a => a.id === selectedAviarioId) || null;
  }, [aviarios, selectedAviarioId]);

  // Filtered Producers based on Search
  const filteredProdutores = useMemo(() => {
    if (!searchQuery.trim()) return produtores;
    const q = searchQuery.toLowerCase();
    return produtores.filter(p => p.nome.toLowerCase().includes(q));
  }, [produtores, searchQuery]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-sky-500 selection:text-white">
      
      {/* Top Header Navigation */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenImportModal={() => setIsImportModalOpen(true)}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        totalProdutores={produtores.length}
        totalAviarios={aviarios.length}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {isLoading ? (
          <div className="py-24 text-center space-y-4">
            <RefreshCw className="w-10 h-10 text-sky-400 animate-spin mx-auto" />
            <p className="text-sm font-semibold text-slate-300">Carregando dados da Bello Alimentos...</p>
          </div>
        ) : produtores.length === 0 ? (
          /* Empty Database State - Call to Import */
          <div className="py-16 text-center space-y-6 max-w-2xl mx-auto bg-slate-900/80 border border-slate-800 rounded-3xl p-10 shadow-2xl">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-blue-600 via-sky-500 to-amber-400 flex items-center justify-center text-white mx-auto shadow-xl shadow-sky-500/20">
              <UploadCloud className="w-10 h-10 animate-bounce" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-white tracking-tight">
                Nenhum produtor cadastrado no sistema
              </h2>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Faça a carga inicial importando a planilha <strong>Base set up.xlsx</strong> com a aba <strong>Tbl_txt</strong> para cadastrar automaticamente produtores, aviários, técnicos e setups.
              </p>
            </div>

            <button
              onClick={() => setIsImportModalOpen(true)}
              className="px-8 py-3.5 rounded-2xl text-xs font-black text-white bg-gradient-to-r from-blue-600 via-sky-600 to-blue-700 hover:from-blue-500 hover:to-sky-500 shadow-xl shadow-sky-600/40 transition-all transform hover:-translate-y-0.5 active:scale-95 flex items-center gap-3 mx-auto"
            >
              <UploadCloud className="w-5 h-5" />
              <span>[ ⬆ IMPORTAR BASE DE DADOS AGORA ]</span>
            </button>
          </div>
        ) : (
          /* Main Views */
          <div>
            
            {/* VIEW 1: FICHAS DE SETUP */}
            {activeTab === 'fichas' && (
              <div className="space-y-6">
                {/* Cascade Filter Bar: Produtor -> Aviário -> Setup */}
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

                {/* Setup Sheet Component */}
                {currentAviario ? (
                  <FichaSetupCard
                    aviario={currentAviario}
                    allTecnicos={tecnicos}
                    onSetupUpdated={loadData}
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
                onSelectProdutorAndAviario={handleSelectProdutorAndAviario}
              />
            )}

            {/* VIEW 3: TÉCNICOS */}
            {activeTab === 'tecnicos' && (
              <TecnicosView
                tecnicos={tecnicos}
                aviarios={aviarios}
                produtores={produtores}
                onSelectProdutorAndAviario={handleSelectProdutorAndAviario}
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

      {/* Footer */}
      <footer className="no-print bg-slate-900/60 border-t border-slate-800/80 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap items-center justify-between gap-2">
          <span>Bello Alimentos © 2026 • Sistema de Ficha Cadastral e Setup de Granjas</span>
          <div className="flex items-center gap-1 text-[11px] text-emerald-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Supabase Cloud Conectado (Upsert Seguro Ativo)</span>
          </div>
        </div>
      </footer>

      {/* Import Modal */}
      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportSuccess={loadData}
        onViewHistory={() => {
          loadData();
          setActiveTab('historico');
        }}
      />

    </div>
  );
};
export default App;
