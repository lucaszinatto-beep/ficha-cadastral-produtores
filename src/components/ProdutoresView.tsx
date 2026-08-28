import React, { useState } from 'react';
import {
  Users,
  Search,
  Home,
  ArrowUpRight,
  MapPin,
  Plus,
  Pencil,
  Trash2,
  Phone,
  Mail,
  X,
  Check,
  AlertTriangle,
  Loader2,
  PlusCircle,
  Hash
} from 'lucide-react';
import { Produtor, Aviario, Tecnico } from '../types/database';
import {
  createProdutor,
  updateProdutor,
  deleteProdutor,
  createAviario
} from '../services/dataService';

interface ProdutoresViewProps {
  produtores: Produtor[];
  aviarios: Aviario[];
  tecnicos?: Tecnico[];
  onSelectProdutorAndAviario: (produtorId: string, aviarioId?: string) => void;
  onRefresh?: () => Promise<void> | void;
  userLevel?: number;
}

export const ProdutoresView: React.FC<ProdutoresViewProps> = ({
  produtores,
  aviarios,
  tecnicos = [],
  onSelectProdutorAndAviario,
  onRefresh,
  userLevel = 10
}) => {
  const [filter, setFilter] = useState('');

  // Modal de Produtor (Cadastro / Edição)
  const [isProdutorModalOpen, setIsProdutorModalOpen] = useState(false);
  const [editingProdutor, setEditingProdutor] = useState<Produtor | null>(null);
  const [produtorForm, setProdutorForm] = useState({
    nome: '',
    municipio: '',
    codigo_avicultor: '',
    telefone: '',
    email: '',
    aviariosInput: '' // Ex: "1, 2, 3" para criar múltiplos de uma vez
  });
  const [produtorError, setProdutorError] = useState<string | null>(null);
  const [isSavingProdutor, setIsSavingProdutor] = useState(false);

  // Modal de Adicionar Aviário a Produtor Existente
  const [isAddAviarioModalOpen, setIsAddAviarioModalOpen] = useState(false);
  const [targetProdutorForAviario, setTargetProdutorForAviario] = useState<Produtor | null>(null);
  const [newAviarioNumero, setNewAviarioNumero] = useState('');
  const [newAviarioTecnicoId, setNewAviarioTecnicoId] = useState('');
  const [aviarioError, setAviarioError] = useState<string | null>(null);
  const [isSavingAviario, setIsSavingAviario] = useState(false);

  // Modal de Exclusão de Produtor
  const [deletingProdutor, setDeletingProdutor] = useState<Produtor | null>(null);
  const [isDeletingProdutor, setIsDeletingProdutor] = useState(false);
  const [deleteProdutorError, setDeleteProdutorError] = useState<string | null>(null);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Abrir modal de criação de produtor
  const handleOpenCreateProdutor = () => {
    setEditingProdutor(null);
    setProdutorForm({
      nome: '',
      municipio: '',
      codigo_avicultor: '',
      telefone: '',
      email: '',
      aviariosInput: '1'
    });
    setProdutorError(null);
    setIsProdutorModalOpen(true);
  };

  // Abrir modal de edição de produtor
  const handleOpenEditProdutor = (produtor: Produtor) => {
    setEditingProdutor(produtor);
    setProdutorForm({
      nome: produtor.nome || '',
      municipio: produtor.municipio || '',
      codigo_avicultor: produtor.codigo_avicultor || '',
      telefone: produtor.telefone || '',
      email: produtor.email || '',
      aviariosInput: ''
    });
    setProdutorError(null);
    setIsProdutorModalOpen(true);
  };

  // Salvar Produtor (Criar ou Atualizar)
  const handleSaveProdutor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!produtorForm.nome.trim()) {
      setProdutorError('O nome do produtor é obrigatório.');
      return;
    }

    setIsSavingProdutor(true);
    setProdutorError(null);

    try {
      if (editingProdutor) {
        await updateProdutor(editingProdutor.id, {
          nome: produtorForm.nome.trim(),
          municipio: produtorForm.municipio.trim() || null,
          codigo_avicultor: produtorForm.codigo_avicultor.trim() || null,
          telefone: produtorForm.telefone.trim() || null,
          email: produtorForm.email.trim() || null
        });
        showToast(`Produtor "${produtorForm.nome.trim()}" atualizado com sucesso!`);
      } else {
        // Parse dos aviários iniciais digitados (ex: "1, 2, 3")
        const initialAviarios = produtorForm.aviariosInput
          ? produtorForm.aviariosInput
              .split(',')
              .map(s => s.trim())
              .filter(Boolean)
              .map(numero => ({ numero }))
          : [{ numero: '1' }];

        await createProdutor({
          nome: produtorForm.nome.trim(),
          municipio: produtorForm.municipio.trim() || null,
          codigo_avicultor: produtorForm.codigo_avicultor.trim() || null,
          telefone: produtorForm.telefone.trim() || null,
          email: produtorForm.email.trim() || null,
          aviariosIniciais: initialAviarios
        });
        showToast(`Produtor "${produtorForm.nome.trim()}" cadastrado com sucesso!`);
      }

      setIsProdutorModalOpen(false);
      if (onRefresh) await onRefresh();
    } catch (err: any) {
      console.error('Erro ao salvar produtor:', err);
      setProdutorError(err?.message || 'Erro ao processar dados no banco Supabase.');
    } finally {
      setIsSavingProdutor(false);
    }
  };

  // Salvar Novo Aviário para Produtor
  const handleSaveNewAviario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetProdutorForAviario) return;
    if (!newAviarioNumero.trim()) {
      setAviarioError('Informe o número ou identificação da instalação/aviário.');
      return;
    }

    setIsSavingAviario(true);
    setAviarioError(null);

    try {
      await createAviario(
        targetProdutorForAviario.id,
        newAviarioNumero.trim(),
        newAviarioTecnicoId || null
      );
      showToast(`Aviário ${newAviarioNumero.trim()} cadastrado para ${targetProdutorForAviario.nome}!`);
      setIsAddAviarioModalOpen(false);
      setNewAviarioNumero('');
      setNewAviarioTecnicoId('');
      if (onRefresh) await onRefresh();
    } catch (err: any) {
      console.error('Erro ao criar aviário:', err);
      setAviarioError(err?.message || 'Erro ao salvar aviário no banco.');
    } finally {
      setIsSavingAviario(false);
    }
  };

  // Excluir Produtor
  const handleDeleteProdutor = async () => {
    if (!deletingProdutor) return;

    setIsDeletingProdutor(true);
    setDeleteProdutorError(null);

    try {
      await deleteProdutor(deletingProdutor.id);
      showToast(`Produtor "${deletingProdutor.nome}" removido com sucesso.`);
      setDeletingProdutor(null);
      if (onRefresh) await onRefresh();
    } catch (err: any) {
      console.error('Erro ao excluir produtor:', err);
      setDeleteProdutorError(err?.message || 'Erro ao excluir produtor.');
    } finally {
      setIsDeletingProdutor(false);
    }
  };

  const filteredProdutores = produtores.filter(p => 
    p.nome.toLowerCase().includes(filter.toLowerCase()) ||
    (p.municipio && p.municipio.toLowerCase().includes(filter.toLowerCase())) ||
    (p.codigo_avicultor && p.codigo_avicultor.toLowerCase().includes(filter.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 animate-bounce">
          <Check className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header & Ações Globais */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 border border-slate-700/80 rounded-3xl p-6 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-sky-500/10 text-sky-400 border border-sky-500/20 shadow-inner">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Produtores Cadastrados ({produtores.length})
            </h2>
            <p className="text-xs text-slate-400">
              Listagem consolidada de todos os produtores, municípios e aviários vinculados.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Campo de Busca */}
          <div className="w-full sm:w-64 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Buscar por nome ou município..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          {/* Botão Cadastrar Novo Produtor (Level >= 50) */}
          {userLevel >= 50 && (
            <button
              onClick={handleOpenCreateProdutor}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 text-white font-semibold text-xs shadow-lg shadow-blue-600/30 border border-sky-400/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              <span>Cadastrar Produtor</span>
            </button>
          )}
        </div>
      </div>

      {/* Grid de Produtores */}
      {filteredProdutores.length === 0 ? (
        <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-12 text-center text-slate-400">
          <Users className="w-12 h-12 mx-auto text-slate-600 mb-3" />
          <p className="text-base font-semibold text-slate-300">Nenhum produtor encontrado</p>
          <p className="text-xs text-slate-500 mt-1">
            {filter ? 'Tente ajustar sua busca ou cadastre um novo.' : 'Cadastre o primeiro produtor usando o botão acima.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProdutores.map((produtor) => {
            const aviariosDoProdutor = aviarios.filter(a => a.produtor_id === produtor.id);
            
            return (
              <div
                key={produtor.id}
                className="bg-slate-900 border border-slate-800 hover:border-sky-500/50 rounded-2xl p-5 shadow-lg transition-all hover:-translate-y-0.5 group flex flex-col justify-between"
              >
                <div>
                  {/* Top do Card: Nome, Município e Ações */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex-1 truncate">
                      <h3 className="text-sm font-bold text-white group-hover:text-sky-300 transition-colors uppercase tracking-tight truncate" title={produtor.nome}>
                        {produtor.nome}
                      </h3>
                      
                      <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-slate-400">
                        {produtor.municipio ? (
                          <span className="flex items-center gap-1 text-sky-400 font-medium">
                            <MapPin className="w-3 h-3 shrink-0" /> {produtor.municipio}
                          </span>
                        ) : (
                          <span className="text-slate-500 italic">Local não informado</span>
                        )}

                        {produtor.codigo_avicultor && (
                          <span className="bg-slate-950 px-1.5 py-0.2 rounded border border-slate-800 font-mono text-[10px] text-slate-400">
                            Cód: {produtor.codigo_avicultor}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {/* Botão Editar Produtor (Level >= 50) */}
                      {userLevel >= 50 && (
                        <button
                          onClick={() => handleOpenEditProdutor(produtor)}
                          title="Editar Produtor"
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-sky-600/30 text-slate-400 hover:text-sky-300 border border-slate-700/60 transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Botão Excluir Produtor (Level >= 80) */}
                      {userLevel >= 80 && (
                        <button
                          onClick={() => setDeletingProdutor(produtor)}
                          title="Excluir Produtor"
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-600/30 text-slate-400 hover:text-rose-300 border border-slate-700/60 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Contatos se houver */}
                  {(produtor.telefone || produtor.email) && (
                    <div className="flex flex-wrap gap-2 mb-3 text-[11px] text-slate-400">
                      {produtor.telefone && (
                        <span className="flex items-center gap-1 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                          <Phone className="w-2.5 h-2.5 text-sky-400" /> {produtor.telefone}
                        </span>
                      )}
                      {produtor.email && (
                        <span className="flex items-center gap-1 bg-slate-950 px-2 py-0.5 rounded border border-slate-800 truncate max-w-[150px]">
                          <Mail className="w-2.5 h-2.5 text-amber-400" /> {produtor.email}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Badges de Aviários & Botão + Aviário */}
                  <div className="space-y-2 pt-2 border-t border-slate-800">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        Instalações ({aviariosDoProdutor.length}):
                      </span>
                      
                      {/* Botão Adicionar Aviário */}
                      <button
                        onClick={() => {
                          setTargetProdutorForAviario(produtor);
                          setNewAviarioNumero('');
                          setNewAviarioTecnicoId('');
                          setAviarioError(null);
                          setIsAddAviarioModalOpen(true);
                        }}
                        className="text-[10px] text-sky-400 hover:text-sky-300 font-bold flex items-center gap-1 hover:underline"
                      >
                        <PlusCircle className="w-3 h-3" />
                        <span>+ Novo Aviário</span>
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                      {aviariosDoProdutor.length === 0 ? (
                        <span className="text-xs text-slate-500 italic">Nenhum aviário vinculado.</span>
                      ) : (
                        aviariosDoProdutor.map(aviario => (
                          <button
                            key={aviario.id}
                            onClick={() => onSelectProdutorAndAviario(produtor.id, aviario.id)}
                            className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-sky-600 hover:text-white border border-slate-800 text-slate-300 text-xs font-mono font-bold transition-all flex items-center gap-1"
                            title={aviario.tecnico?.nome ? `Extensionista: ${aviario.tecnico.nome}` : undefined}
                          >
                            <Home className="w-3 h-3 text-sky-400" />
                            <span>{aviario.numero_instalacao}</span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer do Card com Atalho */}
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex justify-between items-center text-xs">
                  <span className="text-slate-500 text-[11px]">
                    {aviariosDoProdutor.length} {aviariosDoProdutor.length === 1 ? 'aviário ativo' : 'aviários ativos'}
                  </span>
                  <button
                    onClick={() => onSelectProdutorAndAviario(produtor.id, aviariosDoProdutor[0]?.id)}
                    className="font-bold text-sky-400 hover:text-sky-300 flex items-center gap-1 group-hover:underline"
                  >
                    <span>Abrir Ficha de Setup</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DE CADASTRO / EDIÇÃO DE PRODUTOR                                    */}
      {/* ========================================================================= */}
      {isProdutorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-scale-up">
            
            {/* Header Modal */}
            <div className="px-6 py-4 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-500/10 text-sky-400 border border-sky-500/20">
                  {editingProdutor ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </div>
                <h3 className="text-base font-bold text-white">
                  {editingProdutor ? 'Editar Produtor' : 'Cadastrar Novo Produtor'}
                </h3>
              </div>
              <button
                onClick={() => setIsProdutorModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Formulário */}
            <form onSubmit={handleSaveProdutor} className="p-6 space-y-4">
              {produtorError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{produtorError}</span>
                </div>
              )}

              {/* Nome do Produtor */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nome Completo do Produtor / Avicultor <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: ROBERTO CARLOS MIOTTO FERREIRA"
                  value={produtorForm.nome}
                  onChange={(e) => setProdutorForm({ ...produtorForm, nome: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 uppercase"
                />
              </div>

              {/* Município / Localidade & Código */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Município / Local
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Itaquiraí - MS"
                    value={produtorForm.municipio}
                    onChange={(e) => setProdutorForm({ ...produtorForm, municipio: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Código do Avicultor
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 10450"
                    value={produtorForm.codigo_avicultor}
                    onChange={(e) => setProdutorForm({ ...produtorForm, codigo_avicultor: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono"
                  />
                </div>
              </div>

              {/* Telefone & E-mail */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Telefone / WhatsApp
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: (67) 99999-0000"
                    value={produtorForm.telefone}
                    onChange={(e) => setProdutorForm({ ...produtorForm, telefone: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    E-mail
                  </label>
                  <input
                    type="email"
                    placeholder="Ex: produtor@email.com"
                    value={produtorForm.email}
                    onChange={(e) => setProdutorForm({ ...produtorForm, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              {/* Aviários Iniciais (Apenas na Criação) */}
              {!editingProdutor && (
                <div className="pt-2 border-t border-slate-800">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Aviários / Instalações Iniciais (separados por vírgula)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 1, 2, 3, 4"
                    value={produtorForm.aviariosInput}
                    onChange={(e) => setProdutorForm({ ...produtorForm, aviariosInput: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Cria automaticamente as instalações iniciais para o produtor. Você também pode adicionar mais a qualquer momento.
                  </span>
                </div>
              )}

              {/* Ações do Modal */}
              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsProdutorModalOpen(false)}
                  disabled={isSavingProdutor}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingProdutor}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 text-white font-semibold text-xs shadow-lg shadow-blue-600/30 border border-sky-400/30 transition-all disabled:opacity-50"
                >
                  {isSavingProdutor ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>{editingProdutor ? 'Atualizar Produtor' : 'Cadastrar Produtor'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DE ADICIONAR NOVO AVIÁRIO A UM PRODUTOR                             */}
      {/* ========================================================================= */}
      {isAddAviarioModalOpen && targetProdutorForAviario && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md shadow-2xl p-6 space-y-4 animate-scale-up">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
                  <Home className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Cadastrar Novo Aviário</h3>
                  <p className="text-xs text-slate-400">Produtor: {targetProdutorForAviario.nome}</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddAviarioModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNewAviario} className="space-y-4">
              {aviarioError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{aviarioError}</span>
                </div>
              )}

              {/* Número / Identificação da Instalação */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Número / Identificação da Instalação <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <Hash className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    required
                    placeholder="Ex: 5 ou Galpão 05"
                    value={newAviarioNumero}
                    onChange={(e) => setNewAviarioNumero(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono font-bold"
                  />
                </div>
              </div>

              {/* Extensionista / Técnico Responsável */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Extensionista / Técnico Responsável
                </label>
                <select
                  value={newAviarioTecnicoId}
                  onChange={(e) => setNewAviarioTecnicoId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  <option value="">-- Selecionar Extensionista (Opcional) --</option>
                  {tecnicos.map(t => (
                    <option key={t.id} value={t.id}>{t.nome}</option>
                  ))}
                </select>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddAviarioModalOpen(false)}
                  disabled={isSavingAviario}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingAviario}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 text-white font-semibold text-xs shadow-lg shadow-blue-600/30 border border-sky-400/30 transition-all disabled:opacity-50"
                >
                  {isSavingAviario ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Salvar Aviário</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO DE PRODUTOR                              */}
      {/* ========================================================================= */}
      {deletingProdutor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md shadow-2xl p-6 space-y-4 animate-scale-up">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Excluir Produtor</h3>
                <p className="text-xs text-slate-400">Ação irreversível no banco de dados.</p>
              </div>
            </div>

            <p className="text-xs text-slate-300">
              Deseja realmente remover o produtor <strong className="text-white uppercase">{deletingProdutor.nome}</strong>?
            </p>

            {aviarios.filter(a => a.produtor_id === deletingProdutor.id).length > 0 && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                ⚠️ Este produtor possui <strong>{aviarios.filter(a => a.produtor_id === deletingProdutor.id).length} aviários</strong> cadastrados. Todos os aviários e fichas de setup associadas a ele também serão excluídos.
              </div>
            )}

            {deleteProdutorError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                {deleteProdutorError}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingProdutor(null)}
                disabled={isDeletingProdutor}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteProdutor}
                disabled={isDeletingProdutor}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs shadow-lg shadow-rose-600/30 border border-rose-400/30 transition-all disabled:opacity-50"
              >
                {isDeletingProdutor ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Excluindo...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirmar Exclusão</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
