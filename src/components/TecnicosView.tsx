import React, { useState, useMemo } from 'react';
import {
  UserCheck,
  Search,
  Home,
  Plus,
  Pencil,
  Trash2,
  Phone,
  Mail,
  Building,
  X,
  Check,
  AlertTriangle,
  Loader2,
  Users,
  ArrowRightLeft,
  ArrowRight
} from 'lucide-react';
import { Tecnico, Aviario, Produtor } from '../types/database';
import { createTecnico, updateTecnico, deleteTecnico, updateProdutorTecnico, checkAviarioSetupStatus } from '../services/dataService';
import { useCompany } from '../context/CompanyContext';

interface TecnicosViewProps {
  tecnicos: Tecnico[];
  aviarios: Aviario[];
  produtores: Produtor[];
  onSelectProdutorAndAviario: (produtorId: string, aviarioId?: string) => void;
  onRefresh?: () => Promise<void> | void;
  userLevel?: number;
}

export const TecnicosView: React.FC<TecnicosViewProps> = ({
  tecnicos,
  aviarios,
  produtores,
  onSelectProdutorAndAviario,
  onRefresh,
  userLevel = 10
}) => {
  const { currentCompany, currentUnit } = useCompany();
  const [filter, setFilter] = useState('');
  
  const defaultUnidade = currentCompany.slug === 'levo' && currentUnit ? currentUnit.id : currentCompany.nome;

  // Modal de Detalhamento de Produtores do Extensionista
  const [selectedTecnicoForDetail, setSelectedTecnicoForDetail] = useState<Tecnico | null>(null);
  const [searchProdutorTerm, setSearchProdutorTerm] = useState('');

  // Modal de Transferência de Produtor
  const [transferringProdutor, setTransferringProdutor] = useState<Produtor | null>(null);
  const [transferringAviarios, setTransferringAviarios] = useState<Aviario[]>([]);
  const [targetTecnicoId, setTargetTecnicoId] = useState<string>('');
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);

  // Modal de Cadastro / Edição
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingTecnico, setEditingTecnico] = useState<Tecnico | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    unidade: defaultUnidade,
    telefone: '',
    email: '',
    status: 'Ativo'
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Modal de Exclusão
  const [deletingTecnico, setDeletingTecnico] = useState<Tecnico | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Mensagem temporária de sucesso
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleOpenDetailModal = (tecnico: Tecnico) => {
    setSelectedTecnicoForDetail(tecnico);
    setSearchProdutorTerm('');
  };

  const handleOpenTransferModal = (produtor: Produtor, produtorAviarios: Aviario[], e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setTransferringProdutor(produtor);
    setTransferringAviarios(produtorAviarios);
    setTargetTecnicoId('');
    setTransferError(null);
  };

  const handleConfirmTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferringProdutor || !targetTecnicoId || !selectedTecnicoForDetail) {
      setTransferError('Selecione o novo extensionista responsável.');
      return;
    }

    setIsTransferring(true);
    setTransferError(null);

    try {
      const res = await updateProdutorTecnico(
        transferringProdutor.id,
        targetTecnicoId,
        currentCompany.id,
        'Usuário Painel'
      );

      const novoTec = tecnicos.find(t => t.id === targetTecnicoId);
      showToast(`Produtor "${transferringProdutor.nome}" transferido com sucesso para ${novoTec?.nome || 'o novo técnico'} (${res.aviariosAfetados} aviários)!`);
      
      setTransferringProdutor(null);
      setTransferringAviarios([]);
      setTargetTecnicoId('');

      if (onRefresh) {
        await onRefresh();
      }
    } catch (err: any) {
      console.error('Erro ao transferir produtor:', err);
      setTransferError(err?.message || 'Erro ao processar transferência no Supabase.');
    } finally {
      setIsTransferring(false);
    }
  };

  // Agrupamento de produtores atendidos pelo técnico selecionado no modal
  const detailProdutores = useMemo(() => {
    if (!selectedTecnicoForDetail) return [];
    
    const map = new Map<string, { produtor: Produtor; produtorAviarios: Aviario[]; setupsConcluidos: number }>();

    aviarios
      .filter(a => a.tecnico_id === selectedTecnicoForDetail.id)
      .forEach(a => {
        if (!a.produtor_id) return;
        if (!map.has(a.produtor_id)) {
          const prodObj = produtores.find(p => p.id === a.produtor_id) || a.produtor || ({ id: a.produtor_id, nome: 'Produtor Sem Nome' } as Produtor);
          map.set(a.produtor_id, {
            produtor: prodObj,
            produtorAviarios: [],
            setupsConcluidos: 0
          });
        }
        const item = map.get(a.produtor_id)!;
        item.produtorAviarios.push(a);
        const st = checkAviarioSetupStatus(a);
        if (st.isConcluido) {
          item.setupsConcluidos++;
        }
      });

    return Array.from(map.values()).sort((a, b) => a.produtor.nome.localeCompare(b.produtor.nome));
  }, [selectedTecnicoForDetail, aviarios, produtores]);

  const detailTotalAviarios = useMemo(() => {
    return detailProdutores.reduce((acc, curr) => acc + curr.produtorAviarios.length, 0);
  }, [detailProdutores]);

  const filteredDetailProdutores = useMemo(() => {
    if (!searchProdutorTerm.trim()) return detailProdutores;
    const q = searchProdutorTerm.toLowerCase().trim();
    return detailProdutores.filter(({ produtor, produtorAviarios }) => {
      const matchNome = produtor.nome.toLowerCase().includes(q);
      const matchMun = (produtor.municipio || '').toLowerCase().includes(q);
      const matchAv = produtorAviarios.some(av => av.numero_instalacao.toLowerCase().includes(q));
      return matchNome || matchMun || matchAv;
    });
  }, [detailProdutores, searchProdutorTerm]);

  const handleOpenCreateModal = () => {
    setEditingTecnico(null);
    setFormData({
      nome: '',
      unidade: defaultUnidade,
      telefone: '',
      email: '',
      status: 'Ativo'
    });
    setFormError(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (tecnico: Tecnico) => {
    setEditingTecnico(tecnico);
    setFormData({
      nome: tecnico.nome || '',
      unidade: tecnico.unidade || defaultUnidade,
      telefone: tecnico.telefone || '',
      email: tecnico.email || '',
      status: tecnico.status || 'Ativo'
    });
    setFormError(null);
    setIsFormModalOpen(true);
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome.trim()) {
      setFormError('Por favor, informe o nome do extensionista.');
      return;
    }

    setIsSaving(true);
    setFormError(null);

    try {
      if (editingTecnico) {
        await updateTecnico(editingTecnico.id, {
          nome: formData.nome.trim(),
          unidade: formData.unidade.trim(),
          telefone: formData.telefone.trim() || null,
          email: formData.email.trim() || null,
          status: formData.status
        });
        showToast(`Extensionista "${formData.nome.trim()}" atualizado com sucesso!`);
      } else {
        await createTecnico({
          nome: formData.nome.trim(),
          unidade: formData.unidade.trim(),
          telefone: formData.telefone.trim() || null,
          email: formData.email.trim() || null,
          empresa_id: currentCompany.id
        });
        showToast(`Extensionista "${formData.nome.trim()}" cadastrado com sucesso!`);
      }

      setIsFormModalOpen(false);
      if (onRefresh) await onRefresh();
    } catch (err: any) {
      console.error('Erro ao salvar extensionista:', err);
      setFormError(err?.message || 'Erro ao processar dados no banco Supabase.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingTecnico) return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      await deleteTecnico(deletingTecnico.id);
      showToast(`Extensionista "${deletingTecnico.nome}" excluído com sucesso.`);
      setDeletingTecnico(null);
      if (onRefresh) await onRefresh();
    } catch (err: any) {
      console.error('Erro ao excluir extensionista:', err);
      setDeleteError(err?.message || 'Erro ao excluir o registro.');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredTecnicos = tecnicos.filter(t =>
    t.nome.toLowerCase().includes(filter.toLowerCase()) ||
    (t.unidade && t.unidade.toLowerCase().includes(filter.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 animate-bounce">
          <Check className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header & Ações */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 border border-slate-700/80 rounded-3xl p-6 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-inner">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Extensionistas & Técnicos ({tecnicos.length})
            </h2>
            <p className="text-xs text-slate-400">
              Equipe técnica responsável pelo acompanhamento dos lotes e granjas Bello Alimentos.
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
              placeholder="Buscar por nome ou unidade..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          {/* Botão Cadastrar Novo Extensionista (Level >= 50) */}
          {userLevel >= 50 && (
            <button
              onClick={handleOpenCreateModal}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 text-white font-semibold text-xs shadow-lg shadow-blue-600/30 border border-sky-400/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              <span>Cadastrar Extensionista</span>
            </button>
          )}
        </div>
      </div>

      {/* Grid de Técnicos */}
      {filteredTecnicos.length === 0 ? (
        <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-12 text-center text-slate-400">
          <UserCheck className="w-12 h-12 mx-auto text-slate-600 mb-3" />
          <p className="text-base font-semibold text-slate-300">Nenhum extensionista encontrado</p>
          <p className="text-xs text-slate-500 mt-1">
            {filter ? 'Tente ajustar sua busca ou cadastre um novo.' : 'Cadastre o primeiro extensionista usando o botão acima.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTecnicos.map((tecnico) => {
            const aviariosDoTecnico = aviarios.filter(a => a.tecnico_id === tecnico.id);
            const produtoresAtendidos = new Set(aviariosDoTecnico.map(a => a.produtor_id));

            return (
              <div
                key={tecnico.id}
                onClick={() => handleOpenDetailModal(tecnico)}
                className="bg-slate-900 border border-slate-800 hover:border-amber-500/80 hover:bg-slate-900/90 rounded-2xl p-5 shadow-lg transition-all hover:-translate-y-0.5 group flex flex-col justify-between cursor-pointer"
                title={`Clique para ver os produtores vinculados a ${tecnico.nome}`}
              >
                <div>
                  {/* Top do Card: Nome, Unidade e Ações */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <h3 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors uppercase tracking-tight">
                        {tecnico.nome}
                      </h3>
                      <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-400">
                        <Building className="w-3 h-3 text-slate-500" />
                        <span>{tecnico.unidade || 'Bello Alimentos'}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {/* Botão Editar (Level >= 50) */}
                      {userLevel >= 50 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditModal(tecnico);
                          }}
                          title="Editar Extensionista"
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-sky-600/30 text-slate-400 hover:text-sky-300 border border-slate-700/60 hover:border-sky-500/40 transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Botão Excluir (Level >= 80) */}
                      {userLevel >= 80 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingTecnico(tecnico);
                          }}
                          title="Excluir Extensionista"
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-600/30 text-slate-400 hover:text-rose-300 border border-slate-700/60 hover:border-rose-500/40 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Contatos (se houver) */}
                  {(tecnico.telefone || tecnico.email) && (
                    <div className="flex flex-wrap gap-2 mb-3 pt-1 text-[11px] text-slate-400">
                      {tecnico.telefone && (
                        <div className="flex items-center gap-1 bg-slate-950 px-2 py-0.5 rounded-md border border-slate-800">
                          <Phone className="w-2.5 h-2.5 text-sky-400" />
                          <span>{tecnico.telefone}</span>
                        </div>
                      )}
                      {tecnico.email && (
                        <div className="flex items-center gap-1 bg-slate-950 px-2 py-0.5 rounded-md border border-slate-800">
                          <Mail className="w-2.5 h-2.5 text-amber-400" />
                          <span className="truncate max-w-[140px]" title={tecnico.email}>{tecnico.email}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Métricas e Aviários */}
                <div className="space-y-2 pt-3 border-t border-slate-800 text-xs text-slate-300">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Aviários Vinculados:</span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-[10px] font-bold text-amber-400">
                      {aviariosDoTecnico.length} {aviariosDoTecnico.length === 1 ? 'aviário' : 'aviários'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
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
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectProdutorAndAviario(a.produtor_id, a.id);
                            }}
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

                  {/* Botão de Ação do Card para Detalhes */}
                  <div className="pt-3 mt-1 border-t border-slate-800/80 flex items-center justify-between text-xs text-amber-400 group-hover:text-amber-300 font-semibold transition-colors">
                    <span className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" />
                      <span>Ver {produtoresAtendidos.size} {produtoresAtendidos.size === 1 ? 'produtor' : 'produtores'} vinculados</span>
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DE CADASTRO / EDIÇÃO DE EXTENSIONISTA                               */}
      {/* ========================================================================= */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-scale-up">
            
            {/* Header Modal */}
            <div className="px-6 py-4 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-500/10 text-sky-400 border border-sky-500/20">
                  {editingTecnico ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </div>
                <h3 className="text-base font-bold text-white">
                  {editingTecnico ? 'Editar Extensionista' : 'Cadastrar Extensionista'}
                </h3>
              </div>
              <button
                onClick={() => setIsFormModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Formulário */}
            <form onSubmit={handleSaveForm} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Nome */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nome Completo <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: BRUNO FAGANELLO"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 uppercase"
                />
              </div>

              {/* Unidade */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Unidade / Polo
                </label>
                <input
                  type="text"
                  placeholder="Ex: Bello Alimentos"
                  value={formData.unidade}
                  onChange={(e) => setFormData({ ...formData, unidade: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
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
                    value={formData.telefone}
                    onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    E-mail
                  </label>
                  <input
                    type="email"
                    placeholder="Ex: tecnico@bello.com.br"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              {/* Ações do Modal */}
              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  disabled={isSaving}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 text-white font-semibold text-xs shadow-lg shadow-blue-600/30 border border-sky-400/30 transition-all disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>{editingTecnico ? 'Atualizar' : 'Salvar Extensionista'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO                                          */}
      {/* ========================================================================= */}
      {deletingTecnico && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md shadow-2xl p-6 space-y-4 animate-scale-up">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Excluir Extensionista</h3>
                <p className="text-xs text-slate-400">Ação irreversível no banco de dados.</p>
              </div>
            </div>

            <p className="text-xs text-slate-300">
              Deseja realmente remover o extensionista <strong className="text-white uppercase">{deletingTecnico.nome}</strong>?
            </p>

            {aviarios.filter(a => a.tecnico_id === deletingTecnico.id).length > 0 && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
                ⚠️ Este técnico possui <strong>{aviarios.filter(a => a.tecnico_id === deletingTecnico.id).length} aviários</strong> vinculados. Ao excluir, esses aviários continuarão cadastrados mas ficarão sem técnico atribuído.
              </div>
            )}

            {deleteError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                {deleteError}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingTecnico(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs shadow-lg shadow-rose-600/30 border border-rose-400/30 transition-all disabled:opacity-50"
              >
                {isDeleting ? (
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

      {/* ========================================================================= */}
      {/* MODAL: RELAÇÃO COMPLETA DE PRODUTORES VINCULADOS AO EXTENSIONISTA          */}
      {/* ========================================================================= */}
      {selectedTecnicoForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-950/85 backdrop-blur-md animate-fade-in no-print">
          <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-4xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden animate-scale-up">
            
            {/* Header do Modal */}
            <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-inner">
                  <UserCheck className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-white uppercase tracking-tight">
                      {selectedTecnicoForDetail.nome}
                    </h3>
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
                      {selectedTecnicoForDetail.unidade || currentCompany.nome}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Relação completa de produtores e aviários atendidos por este extensionista
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedTecnicoForDetail(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 border border-transparent hover:border-slate-700 transition-colors"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Barra de Busca e Métricas */}
            <div className="p-5 border-b border-slate-800 bg-slate-950/40 flex flex-wrap items-center justify-between gap-3">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchProdutorTerm}
                  onChange={(e) => setSearchProdutorTerm(e.target.value)}
                  placeholder="Pesquisar produtor por nome ou município..."
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="px-3 py-1.5 rounded-xl bg-slate-800/90 border border-slate-700 text-slate-300 font-mono">
                  Produtores: <strong className="text-white">{detailProdutores.length}</strong>
                </span>
                <span className="px-3 py-1.5 rounded-xl bg-slate-800/90 border border-slate-700 text-slate-300 font-mono">
                  Aviários: <strong className="text-amber-400">{detailTotalAviarios}</strong>
                </span>
              </div>
            </div>

            {/* Lista de Produtores */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {filteredDetailProdutores.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs">
                  <Users className="w-10 h-10 mx-auto mb-2 text-slate-600 opacity-60" />
                  <p className="font-semibold text-slate-400">Nenhum produtor encontrado com os critérios de busca.</p>
                </div>
              ) : (
                filteredDetailProdutores.map(({ produtor, produtorAviarios, setupsConcluidos }) => (
                  <div
                    key={produtor.id}
                    className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-white tracking-tight">
                          {produtor.nome}
                        </span>
                        {produtor.municipio && (
                          <span className="text-[11px] text-slate-400 px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
                            {produtor.municipio}
                          </span>
                        )}
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 font-mono">
                          {produtorAviarios.length} {produtorAviarios.length === 1 ? 'aviário' : 'aviários'}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border font-mono ${
                          setupsConcluidos === produtorAviarios.length && produtorAviarios.length > 0
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                            : setupsConcluidos > 0
                            ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                            : 'bg-slate-800 border-slate-700 text-slate-400'
                        }`}>
                          {setupsConcluidos}/{produtorAviarios.length} setups
                        </span>
                      </div>

                      {/* Lista de aviários */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Aviários:</span>
                        {produtorAviarios.map(av => (
                          <button
                            key={av.id}
                            type="button"
                            onClick={() => {
                              onSelectProdutorAndAviario(produtor.id, av.id);
                              setSelectedTecnicoForDetail(null);
                            }}
                            title="Abrir Ficha deste Aviário"
                            className="px-2 py-0.5 rounded-md bg-slate-900 hover:bg-amber-600 hover:text-white border border-slate-800 text-[11px] font-mono text-slate-300 transition-colors flex items-center gap-1"
                          >
                            <Home className="w-2.5 h-2.5 text-slate-500" />
                            <span>Inst. {av.numero_instalacao}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Botão Transferir Extensionista */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => handleOpenTransferModal(produtor, produtorAviarios, e)}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:border-amber-400/50 text-xs font-semibold shadow-sm transition-all active:scale-95 whitespace-nowrap cursor-pointer"
                        title="Alterar extensionista responsável por todos os aviários deste produtor"
                      >
                        <ArrowRightLeft className="w-3.5 h-3.5" />
                        <span>Alterar Extensionista</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer do Modal */}
            <div className="px-6 py-4 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span className="text-[11px]">
                ℹ️ A alteração do extensionista atualiza automaticamente todos os aviários do produtor sem perder fichas ou fotos.
              </span>
              <button
                type="button"
                onClick={() => setSelectedTecnicoForDetail(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs transition-colors"
              >
                Fechar
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: TRANSFERÊNCIA DE EXTENSIONISTA DE UM PRODUTOR                       */}
      {/* ========================================================================= */}
      {transferringProdutor && selectedTecnicoForDetail && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in no-print">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md shadow-2xl p-6 space-y-4 animate-scale-up">
            
            <div className="flex items-center gap-3 text-amber-400">
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                <ArrowRightLeft className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Transferir Produtor</h3>
                <p className="text-xs text-slate-400">Alterar extensionista responsável</p>
              </div>
            </div>

            <div className="space-y-3 py-2 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <div className="text-slate-400 text-[11px]">Produtor:</div>
                <div className="text-sm font-bold text-white">{transferringProdutor.nome}</div>
                <div className="text-[11px] text-slate-400">
                  Total de aviários a transferir: <strong className="text-amber-400 font-mono">{transferringAviarios.length}</strong>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <div className="text-slate-400 text-[11px]">Extensionista Atual:</div>
                <div className="text-sm font-bold text-rose-300">{selectedTecnicoForDetail.nome}</div>
              </div>

              <form onSubmit={handleConfirmTransfer} className="space-y-4 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Novo Extensionista Responsável *
                  </label>
                  <select
                    value={targetTecnicoId}
                    onChange={(e) => setTargetTecnicoId(e.target.value)}
                    className="w-full px-3 py-2.5 text-xs rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    required
                  >
                    <option value="">Selecione o novo extensionista...</option>
                    {tecnicos
                      .filter(t => t.id !== selectedTecnicoForDetail.id && t.status !== 'Inativo')
                      .map(t => (
                        <option key={t.id} value={t.id}>
                          {t.nome} ({t.unidade || currentCompany.nome})
                        </option>
                      ))}
                  </select>
                </div>

                <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-300 text-[11.5px] leading-relaxed">
                  🛡️ <strong>Segurança e Preservação:</strong> Todos os <strong>{transferringAviarios.length} aviários</strong> deste produtor serão transferidos para o novo extensionista. Fichas técnicas, fotos anexadas, medições e históricos serão integralmente preservados.
                </div>

                {transferError && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                    {transferError}
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setTransferringProdutor(null);
                      setTransferringAviarios([]);
                      setTargetTecnicoId('');
                    }}
                    disabled={isTransferring}
                    className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    disabled={isTransferring || !targetTecnicoId}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-semibold text-xs shadow-lg shadow-amber-600/30 border border-amber-400/30 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {isTransferring ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Transferindo...</span>
                      </>
                    ) : (
                      <>
                        <ArrowRightLeft className="w-3.5 h-3.5" />
                        <span>Confirmar Transferência</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
