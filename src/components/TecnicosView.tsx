import React, { useState } from 'react';
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
  Loader2
} from 'lucide-react';
import { Tecnico, Aviario, Produtor } from '../types/database';
import { createTecnico, updateTecnico, deleteTecnico } from '../services/dataService';

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
  onSelectProdutorAndAviario,
  onRefresh,
  userLevel = 10
}) => {
  const [filter, setFilter] = useState('');
  
  // Modal de Cadastro / Edição
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingTecnico, setEditingTecnico] = useState<Tecnico | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    unidade: 'Bello Alimentos',
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

  const handleOpenCreateModal = () => {
    setEditingTecnico(null);
    setFormData({
      nome: '',
      unidade: 'Bello Alimentos',
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
      unidade: tecnico.unidade || 'Bello Alimentos',
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
          email: formData.email.trim() || null
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
                className="bg-slate-900 border border-slate-800 hover:border-amber-500/50 rounded-2xl p-5 shadow-lg transition-all hover:-translate-y-0.5 group flex flex-col justify-between"
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
                          onClick={() => handleOpenEditModal(tecnico)}
                          title="Editar Extensionista"
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-sky-600/30 text-slate-400 hover:text-sky-300 border border-slate-700/60 hover:border-sky-500/40 transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Botão Excluir (Level >= 80) */}
                      {userLevel >= 80 && (
                        <button
                          onClick={() => setDeletingTecnico(tecnico)}
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

    </div>
  );
};
