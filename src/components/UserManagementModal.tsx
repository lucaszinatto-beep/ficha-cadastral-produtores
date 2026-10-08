import React, { useState, useEffect } from 'react';
import { 
  X, 
  Shield, 
  Plus, 
  Loader2, 
  UserPlus, 
  Pencil, 
  AlertCircle, 
  Save, 
  Copy, 
  Check, 
  CheckSquare, 
  Square,
  Info,
  KeyRound,
  Trash2,
  Eye,
  EyeOff,
  AlertTriangle
} from 'lucide-react';
import { 
  UserProfile, 
  fetchAllProfiles, 
  updateProfile, 
  createUserSilently, 
  fetchUserCompaniesMemberships, 
  duplicateUserAccess, 
  removeUserCompanyAccess,
  adminResetUserPassword,
  adminDeleteUser,
  ACCESS_LEVELS 
} from '../services/profileService';
import { useCompany } from '../context/CompanyContext';
import { supabase } from '../services/supabase';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserLevel: number;
  currentUserProfile?: UserProfile | null;
}

const ROLE_OPTIONS = [
  { value: 'viewer', label: 'Visualizador', level: ACCESS_LEVELS.VIEWER },
  { value: 'extensionista', label: 'Extensionista', level: ACCESS_LEVELS.EXTENSIONISTA },
  { value: 'admin', label: 'Administrador', level: ACCESS_LEVELS.ADMIN },
  { value: 'super_admin', label: 'Super Admin', level: ACCESS_LEVELS.SUPER_ADMIN },
];

export const UserManagementModal: React.FC<UserManagementModalProps> = ({
  isOpen,
  onClose,
  currentUserLevel,
  currentUserProfile
}) => {
  const { currentCompany, refreshUserCompanies, allCompanies } = useCompany();
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [membershipsMap, setMembershipsMap] = useState<Record<string, string[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Usuário autenticado ativo para validação de auto-exclusão
  const [currentUserId, setCurrentUserId] = useState<string | null>(currentUserProfile?.id || null);

  useEffect(() => {
    if (currentUserProfile?.id) {
      setCurrentUserId(currentUserProfile.id);
    } else {
      supabase.auth.getUser().then(({ data }) => {
        if (data.user) setCurrentUserId(data.user.id);
      });
    }
  }, [currentUserProfile]);

  // Filtro por empresa
  const [companyFilter, setCompanyFilter] = useState<string>('all');

  // Formulário de novo usuário
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newRole, setNewRole] = useState('viewer');
  const [newCompanyIds, setNewCompanyIds] = useState<string[]>([currentCompany.id]);
  
  // Edição inline de role global
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingRole, setEditingRole] = useState('viewer');

  // Modal / Sub-tela: Duplicar Acesso para Outra Empresa
  const [duplicatingUser, setDuplicatingUser] = useState<UserProfile | null>(null);
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<string[]>([]);
  const [duplicateRole, setDuplicateRole] = useState('viewer');
  const [isSavingDuplication, setIsSavingDuplication] = useState(false);

  // Modal: Alterar Senha do Usuário
  const [passwordModalUser, setPasswordModalUser] = useState<UserProfile | null>(null);
  const [modalNewPassword, setModalNewPassword] = useState('');
  const [modalConfirmPassword, setModalConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordModalError, setPasswordModalError] = useState<string | null>(null);

  // Modal: Excluir Usuário
  const [deleteModalUser, setDeleteModalUser] = useState<UserProfile | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);
  const [deleteModalError, setDeleteModalError] = useState<string | null>(null);

  // Regras de Segurança e Hierarquia
  const canManageUser = (targetProfile: UserProfile): boolean => {
    if (currentUserLevel >= ACCESS_LEVELS.SUPER_ADMIN) return true;
    if (currentUserId && targetProfile.id === currentUserId) return true;
    return targetProfile.level < currentUserLevel;
  };

  const canDeleteUser = (targetProfile: UserProfile): boolean => {
    if (currentUserId && targetProfile.id === currentUserId) return false;
    if (currentUserLevel >= ACCESS_LEVELS.SUPER_ADMIN) return true;
    if (currentUserLevel >= ACCESS_LEVELS.ADMIN) {
      return targetProfile.level < currentUserLevel;
    }
    return false;
  };

  const getDeleteTooltip = (targetProfile: UserProfile): string => {
    if (currentUserId && targetProfile.id === currentUserId) {
      return 'Não é permitido excluir a própria conta';
    }
    if (!canDeleteUser(targetProfile)) {
      return 'Permissão insuficiente para excluir este usuário';
    }
    return 'Excluir usuário';
  };

  const handleOpenPasswordModal = (profile: UserProfile) => {
    setPasswordModalUser(profile);
    setModalNewPassword('');
    setModalConfirmPassword('');
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setPasswordModalError(null);
  };

  const handleClosePasswordModal = () => {
    setPasswordModalUser(null);
    setModalNewPassword('');
    setModalConfirmPassword('');
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setPasswordModalError(null);
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordModalUser) return;

    if (!modalNewPassword) {
      setPasswordModalError('Senha obrigatória.');
      return;
    }
    if (!modalConfirmPassword) {
      setPasswordModalError('Confirmação obrigatória.');
      return;
    }
    if (modalNewPassword.length < 6) {
      setPasswordModalError('A senha deve conter no mínimo 6 caracteres.');
      return;
    }
    if (modalNewPassword !== modalConfirmPassword) {
      setPasswordModalError('As duas senhas devem ser iguais.');
      return;
    }

    setIsSavingPassword(true);
    setPasswordModalError(null);
    try {
      const res = await adminResetUserPassword(
        passwordModalUser.id,
        modalNewPassword,
        currentUserProfile || (currentUserId ? { id: currentUserId, level: currentUserLevel } as any : null)
      );

      if (!res.success) {
        throw new Error(res.error || 'Erro ao alterar senha.');
      }

      setSuccessMsg('Senha alterada com sucesso.');
      handleClosePasswordModal();
    } catch (err: any) {
      setPasswordModalError(err.message || 'Erro ao alterar senha.');
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleOpenDeleteModal = (profile: UserProfile) => {
    setDeleteModalUser(profile);
    setDeleteModalError(null);
  };

  const handleCloseDeleteModal = () => {
    setDeleteModalUser(null);
    setDeleteModalError(null);
  };

  const handleConfirmDelete = async () => {
    if (!deleteModalUser) return;
    setIsDeletingUser(true);
    setDeleteModalError(null);
    try {
      const res = await adminDeleteUser(
        deleteModalUser.id,
        deleteModalUser,
        currentUserProfile || (currentUserId ? { id: currentUserId, level: currentUserLevel } as any : null)
      );

      if (!res.success) {
        throw new Error(res.error || 'Erro ao excluir usuário.');
      }

      setSuccessMsg(`Usuário ${deleteModalUser.full_name} excluído com sucesso.`);
      handleCloseDeleteModal();
      await loadProfiles();
      await refreshUserCompanies();
    } catch (err: any) {
      setDeleteModalError(err.message || 'Erro ao excluir usuário.');
    } finally {
      setIsDeletingUser(false);
    }
  };

  const loadProfiles = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchAllProfiles();
      setProfiles(data);

      // Carregar os vínculos reais de empresas de cada perfil no Supabase
      const map: Record<string, string[]> = {};
      await Promise.all(
        data.map(async (p) => {
          const mems = await fetchUserCompaniesMemberships(p.id);
          map[p.id] = mems.map(m => m.empresa_id);
        })
      );
      setMembershipsMap(map);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar usuários');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && currentUserLevel >= 80) {
      loadProfiles();
      setIsCreating(false);
      setDuplicatingUser(null);
      setPasswordModalUser(null);
      setDeleteModalUser(null);
      setSuccessMsg(null);
      setNewCompanyIds([currentCompany.id]);
    }
  }, [isOpen, currentUserLevel, currentCompany.id]);

  if (!isOpen) return null;

  if (currentUserLevel < 80) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
        <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md shadow-2xl p-6 text-center">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Acesso Negado</h2>
          <p className="text-slate-400 mb-6 text-sm">Apenas administradores podem acessar a gestão de usuários.</p>
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold"
          >
            Fechar
          </button>
        </div>
      </div>
    );
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newCompanyIds.length === 0 && newRole !== 'super_admin') {
      setError('Selecione ao menos uma empresa para autorizar o usuário.');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const selectedRole = ROLE_OPTIONS.find(r => r.value === newRole);
      if (!selectedRole) throw new Error("Cargo inválido");
      
      const created = await createUserSilently(
        newEmail,
        newPassword,
        newFullName,
        selectedRole.value,
        selectedRole.level
      );

      // Vincula às empresas selecionadas no formulário
      if (created?.user && newCompanyIds.length > 0) {
        await duplicateUserAccess(
          created.user.id,
          newCompanyIds,
          selectedRole.value as any,
          selectedRole.level
        );
      }
      
      setIsCreating(false);
      setNewEmail('');
      setNewPassword('');
      setNewFullName('');
      setNewRole('viewer');
      setNewCompanyIds([currentCompany.id]);
      setSuccessMsg('Usuário criado com sucesso e vinculado à(s) empresa(s) selecionada(s)!');
      await loadProfiles();
    } catch (err: any) {
      setError(err.message || 'Erro ao criar usuário. O e-mail pode já estar em uso.');
      setIsLoading(false);
    }
  };

  const handleSaveEdit = async (profileId: string) => {
    setIsLoading(true);
    try {
      const selectedRole = ROLE_OPTIONS.find(r => r.value === editingRole);
      if (selectedRole) {
        await updateProfile(profileId, { role: selectedRole.value as any, level: selectedRole.level });
        await loadProfiles();
      }
      setEditingId(null);
    } catch (err: any) {
      setError(err.message || 'Erro ao atualizar perfil.');
      setIsLoading(false);
    }
  };

  const handleOpenDuplicate = (profile: UserProfile) => {
    setDuplicatingUser(profile);
    const existing = membershipsMap[profile.id] || [currentCompany.id];
    setSelectedCompanyIds(existing);
    setDuplicateRole(profile.role || 'viewer');
    setError(null);
    setSuccessMsg(null);
  };

  const handleToggleCompany = (companyId: string) => {
    setSelectedCompanyIds(prev => 
      prev.includes(companyId) ? prev.filter(id => id !== companyId) : [...prev, companyId]
    );
  };

  const handleConfirmDuplication = async () => {
    if (!duplicatingUser) return;
    setIsSavingDuplication(true);
    setError(null);
    try {
      const selectedRole = ROLE_OPTIONS.find(r => r.value === duplicateRole) || ROLE_OPTIONS[0];

      // Identifica empresas a adicionar e a remover
      const oldList = membershipsMap[duplicatingUser.id] || [];
      const toAdd = selectedCompanyIds.filter(id => !oldList.includes(id));
      const toRemove = oldList.filter(id => !selectedCompanyIds.includes(id));

      if (toAdd.length > 0) {
        const res = await duplicateUserAccess(
          duplicatingUser.id,
          toAdd,
          selectedRole.value as any,
          selectedRole.level
        );
        if (!res.success) throw new Error(res.error);
      }

      for (const compId of toRemove) {
        await removeUserCompanyAccess(duplicatingUser.id, compId);
      }

      setSuccessMsg(`Acessos do usuário ${duplicatingUser.full_name} atualizados com sucesso!`);
      setDuplicatingUser(null);
      await loadProfiles();
      await refreshUserCompanies();
    } catch (err: any) {
      setError(err.message || 'Erro ao duplicar acessos do usuário');
    } finally {
      setIsSavingDuplication(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden font-sans">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
              <Shield className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Gestão de Usuários & Empresas</h2>
              <p className="text-xs text-slate-400">Controle de acesso, hierarquia e vinculação multiempresa</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-3 text-rose-400 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {successMsg && (
            <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3 text-emerald-400 text-sm">
              <Check className="w-5 h-5 shrink-0" />
              <p>{successMsg}</p>
            </div>
          )}

          {/* SUB-TELA 1: NOVO USUÁRIO */}
          {isCreating ? (
            <div className="max-w-md mx-auto">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-sky-400" />
                Novo Usuário
              </h3>
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Nome Completo</label>
                  <input
                    type="text"
                    required
                    value={newFullName}
                    onChange={e => setNewFullName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm"
                    placeholder="João da Silva"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">E-mail</label>
                  <input
                    type="email"
                    required
                    value={newEmail}
                    onChange={e => setNewEmail(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm"
                    placeholder="joao@empresa.com.br"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Senha (Mín 6 caracteres)</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm"
                    placeholder="******"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Cargo na Empresa</label>
                  <select
                    value={newRole}
                    onChange={e => setNewRole(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm"
                  >
                    {ROLE_OPTIONS.map(r => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Empresas Autorizadas
                  </label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    {allCompanies.map((c) => {
                      const isChecked = newCompanyIds.includes(c.id);
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setNewCompanyIds(prev =>
                              prev.includes(c.id) ? prev.filter(id => id !== c.id) : [...prev, c.id]
                            );
                          }}
                          className={`p-2.5 rounded-xl border text-xs font-medium text-left flex items-center justify-between transition-all cursor-pointer ${
                            isChecked
                              ? 'bg-sky-950/60 border-sky-500 text-sky-200 shadow-sm'
                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                          }`}
                        >
                          <span className="truncate">{c.nome}</span>
                          {isChecked ? <CheckSquare className="w-4 h-4 text-sky-400 shrink-0 ml-1" /> : <Square className="w-4 h-4 text-slate-600 shrink-0 ml-1" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
                
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsCreating(false)}
                    className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-sm shadow-lg shadow-sky-600/30 transition-all disabled:opacity-50 flex justify-center items-center gap-2"
                  >
                    {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                    Criar Usuário
                  </button>
                </div>
              </form>
            </div>
          ) : duplicatingUser ? (
            /* SUB-TELA 2: GERENCIAR EMPRESAS / DUPLICAR ACESSO */
            <div className="max-w-xl mx-auto space-y-6 animate-in fade-in duration-150">
              <div className="p-4 rounded-2xl bg-sky-950/40 border border-sky-500/30 flex items-start gap-3">
                <Info className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
                <div className="text-xs text-sky-200 space-y-1">
                  <p className="font-bold">Gerenciamento de Empresas / Duplicação de Acesso</p>
                  <p>
                    Marque ou desmarque as empresas autorizadas para este usuário.
                    <strong className="text-white block mt-1">Nenhum dado operacional (produtores, aviários ou fichas) será excluído ou duplicado.</strong>
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-base font-bold text-white">
                  Empresas de: <span className="text-sky-400">{duplicatingUser.full_name}</span>
                </h3>
                {duplicatingUser.email && (
                  <p className="text-xs text-slate-400 mt-0.5">{duplicatingUser.email}</p>
                )}
                <p className="text-xs text-slate-500 mt-1">Marque as empresas que este usuário pode acessar:</p>
              </div>

              {/* Checkboxes das Empresas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {allCompanies.map((comp) => {
                  const isChecked = selectedCompanyIds.includes(comp.id);
                  return (
                    <button
                      key={comp.id}
                      type="button"
                      onClick={() => handleToggleCompany(comp.id)}
                      className={`p-4 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                        isChecked 
                          ? 'bg-slate-800/90 border-sky-500/60 shadow-md text-white' 
                          : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-white p-1 flex items-center justify-center shrink-0">
                          <img src={comp.logo_path} alt={comp.nome} className="max-h-full max-w-full object-contain" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white">{comp.nome}</p>
                          <p className="text-[10px] text-slate-400">{comp.slug.toUpperCase()}</p>
                        </div>
                      </div>

                      {isChecked ? (
                        <CheckSquare className="w-5 h-5 text-sky-400 shrink-0" />
                      ) : (
                        <Square className="w-5 h-5 text-slate-600 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Cargo nas Novas Empresas</label>
                <select
                  value={duplicateRole}
                  onChange={e => setDuplicateRole(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm"
                >
                  {ROLE_OPTIONS.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDuplicatingUser(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDuplication}
                  disabled={isSavingDuplication || selectedCompanyIds.length === 0}
                  className="flex-1 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-sm shadow-lg shadow-sky-600/30 transition-all disabled:opacity-50 flex justify-center items-center gap-2"
                >
                  {isSavingDuplication && <Loader2 className="w-4 h-4 animate-spin" />}
                  Confirmar Acessos
                </button>
              </div>
            </div>
          ) : (
            <div>
              {/* Header da Listagem */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <div>
                  <h3 className="text-lg font-bold text-white">
                    Usuários Cadastrados ({profiles.length})
                  </h3>
                  <p className="text-xs text-slate-400">
                    Controle de níveis, cargos e vinculação multiempresa
                  </p>
                </div>
                <button
                  onClick={() => {
                    setIsCreating(true);
                    setNewCompanyIds([currentCompany.id]);
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600/10 hover:bg-sky-600/20 text-sky-400 font-semibold text-xs border border-sky-500/20 transition-all cursor-pointer self-start sm:self-auto"
                >
                  <Plus className="w-4 h-4" /> Novo Usuário
                </button>
              </div>

              {/* Barra de Filtro por Empresa */}
              <div className="flex flex-wrap items-center gap-2 mb-4 p-2 bg-slate-950/60 border border-slate-800 rounded-2xl">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider pl-2 pr-1">
                  Filtrar:
                </span>
                <button
                  type="button"
                  onClick={() => setCompanyFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    companyFilter === 'all'
                      ? 'bg-sky-600 text-white shadow-sm'
                      : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  Todas ({profiles.length})
                </button>
                {allCompanies.map(c => {
                  const count = profiles.filter(p => {
                    const isSuper = p.role === 'super_admin' || p.level >= 100;
                    const ids = membershipsMap[p.id] || [];
                    return isSuper || ids.includes(c.id);
                  }).length;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCompanyFilter(c.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        companyFilter === c.id
                          ? 'bg-sky-600 text-white shadow-sm'
                          : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      {c.nome} ({count})
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setCompanyFilter('none')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    companyFilter === 'none'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  Sem Empresa (
                  {
                    profiles.filter(p => {
                      const isSuper = p.role === 'super_admin' || p.level >= 100;
                      const ids = membershipsMap[p.id] || [];
                      return !isSuper && ids.length === 0;
                    }).length
                  }
                  )
                </button>
              </div>

              {isLoading && profiles.length === 0 ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 text-sky-400 animate-spin" />
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/50">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-950/50 border-b border-slate-800 text-xs text-slate-400 font-semibold uppercase tracking-wider">
                        <th className="p-4">Nome & E-mail</th>
                        <th className="p-4">Cargo / Nível</th>
                        <th className="p-4">Empresas Autorizadas</th>
                        <th className="p-4 text-center min-w-[270px]">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {profiles
                        .filter(profile => {
                          if (companyFilter === 'all') return true;
                          const isSuper = profile.role === 'super_admin' || profile.level >= 100;
                          const userCompIds = membershipsMap[profile.id] || [];
                          if (companyFilter === 'none') {
                            return !isSuper && userCompIds.length === 0;
                          }
                          return isSuper || userCompIds.includes(companyFilter);
                        })
                        .map(profile => {
                          const userCompIds = membershipsMap[profile.id] || [];
                          const userComps = allCompanies.filter(c => 
                            profile.role === 'super_admin' || profile.level >= 100 || userCompIds.includes(c.id)
                          );

                          return (
                            <tr key={profile.id} className="hover:bg-slate-800/30 transition-colors">
                              <td className="p-4">
                                <div className="font-bold text-white text-sm">{profile.full_name}</div>
                                {profile.email && (
                                  <div className="text-xs text-sky-400 font-medium mt-0.5">{profile.email}</div>
                                )}
                                <div className="text-[10px] text-slate-500 font-mono mt-0.5">{profile.id.substring(0, 8)}...</div>
                              </td>
                              <td className="p-4">
                                {editingId === profile.id ? (
                                  <select
                                    value={editingRole}
                                    onChange={e => setEditingRole(e.target.value)}
                                    className="px-3 py-1.5 rounded-lg bg-slate-950 border border-sky-500 text-white text-xs focus:outline-none"
                                  >
                                    {ROLE_OPTIONS.map(r => (
                                      <option key={r.value} value={r.value}>{r.label}</option>
                                    ))}
                                  </select>
                                ) : (
                                  <div>
                                    <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border border-slate-700 bg-slate-800 text-slate-300">
                                      {ROLE_OPTIONS.find(r => r.value === profile.role)?.label || profile.role}
                                    </span>
                                    <div className="text-[10px] text-slate-500 mt-1 pl-1">Level: {profile.level}</div>
                                  </div>
                                )}
                              </td>
                              <td className="p-4">
                                <div className="flex flex-wrap gap-1.5 max-w-xs">
                                  {profile.role === 'super_admin' || profile.level >= 100 ? (
                                    <>
                                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                        Todas as Empresas (Super Admin)
                                      </span>
                                      {userComps.map(c => (
                                        <span 
                                          key={c.id} 
                                          className={`text-[9px] font-medium px-2 py-0.5 rounded-full border ${c.badgeBg} ${c.badgeText} ${c.badgeBorder}`}
                                        >
                                          {c.nome}
                                        </span>
                                      ))}
                                    </>
                                  ) : userComps.length > 0 ? (
                                    userComps.map(c => (
                                      <span 
                                        key={c.id} 
                                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${c.badgeBg} ${c.badgeText} ${c.badgeBorder}`}
                                      >
                                        {c.nome}
                                      </span>
                                    ))
                                  ) : (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                      Sem empresa vinculada
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="p-4">
                                <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                  {/* 1. Botão Gerenciar Empresas / Duplicar Acesso */}
                                  <button
                                    onClick={() => handleOpenDuplicate(profile)}
                                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-sky-400 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 transition-all cursor-pointer shadow-sm"
                                    title="Gerenciar e duplicar empresas autorizadas"
                                  >
                                    <Copy className="w-3.5 h-3.5 shrink-0" />
                                    <span className="hidden sm:inline">Gerenciar Empresas</span>
                                  </button>

                                  {/* 2. Botão Alterar Senha */}
                                  <button
                                    onClick={() => handleOpenPasswordModal(profile)}
                                    disabled={!canManageUser(profile)}
                                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all shadow-sm ${
                                      canManageUser(profile)
                                        ? 'text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20 border-cyan-500/30 hover:border-cyan-500/50 cursor-pointer'
                                        : 'text-slate-600 bg-slate-900 border-slate-800 opacity-40 cursor-not-allowed'
                                    }`}
                                    title={canManageUser(profile) ? 'Alterar senha' : 'Permissão insuficiente para alterar senha'}
                                  >
                                    <KeyRound className="w-3.5 h-3.5 shrink-0" />
                                    <span className="hidden lg:inline">Alterar Senha</span>
                                  </button>

                                  {/* 3. Botão Editar Usuário */}
                                  {editingId === profile.id ? (
                                    <>
                                      <button
                                        onClick={() => handleSaveEdit(profile.id)}
                                        className="p-1.5 rounded-xl text-emerald-400 bg-emerald-400/10 hover:bg-emerald-400/20 border border-emerald-500/30 transition-colors cursor-pointer shadow-sm"
                                        title="Salvar alteração de cargo"
                                      >
                                        <Save className="w-4 h-4" />
                                      </button>
                                      <button
                                        onClick={() => setEditingId(null)}
                                        className="p-1.5 rounded-xl text-slate-400 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors cursor-pointer"
                                        title="Cancelar"
                                      >
                                        <X className="w-4 h-4" />
                                      </button>
                                    </>
                                  ) : (
                                    <button
                                      onClick={() => {
                                        if (!canManageUser(profile)) return;
                                        setEditingId(profile.id);
                                        setEditingRole(profile.role);
                                      }}
                                      disabled={!canManageUser(profile)}
                                      className={`p-1.5 rounded-xl border transition-colors shadow-sm ${
                                        canManageUser(profile)
                                          ? 'text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border-slate-700 cursor-pointer'
                                          : 'text-slate-600 bg-slate-900 border-slate-800 opacity-40 cursor-not-allowed'
                                      }`}
                                      title={canManageUser(profile) ? 'Editar usuário' : 'Permissão insuficiente para editar usuário'}
                                    >
                                      <Pencil className="w-4 h-4" />
                                    </button>
                                  )}

                                  {/* 4. Botão Excluir Usuário */}
                                  <button
                                    onClick={() => handleOpenDeleteModal(profile)}
                                    disabled={!canDeleteUser(profile)}
                                    className={`p-1.5 rounded-xl border transition-colors shadow-sm ${
                                      canDeleteUser(profile)
                                        ? 'text-rose-400 hover:text-rose-200 bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/20 hover:border-rose-500/40 cursor-pointer'
                                        : 'text-slate-600 bg-slate-900 border-slate-800 opacity-30 cursor-not-allowed'
                                    }`}
                                    title={getDeleteTooltip(profile)}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* MODAL SECUNDÁRIO: ALTERAR SENHA */}
        {passwordModalUser && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
            <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-md shadow-2xl p-6 overflow-hidden">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                    <KeyRound className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Alterar senha do usuário</h3>
                    <p className="text-xs text-slate-400">Defina uma nova senha de acesso</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleClosePasswordModal}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  title="Fechar"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Informações do Usuário */}
              <div className="my-4 p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800">
                <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-1">Usuário</div>
                <div className="text-sm font-bold text-white">{passwordModalUser.full_name}</div>
                {passwordModalUser.email && (
                  <div className="text-xs text-cyan-400 font-medium mt-0.5">{passwordModalUser.email}</div>
                )}
              </div>

              {passwordModalError && (
                <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2.5 text-rose-400 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <p>{passwordModalError}</p>
                </div>
              )}

              <form onSubmit={handleSavePassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nova senha
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={modalNewPassword}
                      onChange={e => setModalNewPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      className="w-full px-4 py-2.5 pr-10 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                      title={showNewPassword ? 'Ocultar senha' : 'Ver senha'}
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Confirmar nova senha
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={modalConfirmPassword}
                      onChange={e => setModalConfirmPassword(e.target.value)}
                      placeholder="Repita a nova senha"
                      className="w-full px-4 py-2.5 pr-10 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                      title={showConfirmPassword ? 'Ocultar senha' : 'Ver senha'}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex gap-3 pt-3">
                  <button
                    type="button"
                    onClick={handleClosePasswordModal}
                    className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingPassword}
                    className="flex-1 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-sm shadow-lg shadow-cyan-600/30 transition-all disabled:opacity-50 flex justify-center items-center gap-2"
                  >
                    {isSavingPassword && <Loader2 className="w-4 h-4 animate-spin" />}
                    Salvar nova senha
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL SECUNDÁRIO: EXCLUIR USUÁRIO */}
        {deleteModalUser && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4 animate-in fade-in duration-150">
            <div className="bg-slate-900 border border-rose-500/30 rounded-3xl w-full max-w-md shadow-2xl p-6 overflow-hidden">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6" />
              </div>

              <h3 className="text-xl font-bold text-white text-center mb-1">
                Excluir usuário?
              </h3>
              <p className="text-xs text-slate-400 text-center mb-4">
                Confirme a exclusão definitiva do perfil selecionado
              </p>

              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2 mb-4">
                <p className="text-xs text-slate-300">
                  Você está prestes a excluir o usuário <span className="font-bold text-white">{deleteModalUser.full_name}</span>
                </p>
                {deleteModalUser.email && (
                  <p className="text-xs text-sky-400 font-medium">
                    E-mail: <span className="underline">{deleteModalUser.email}</span>
                  </p>
                )}
                <div className="pt-2 border-t border-slate-800/80 text-[11px] text-amber-300/90 flex items-start gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-400" />
                  <span>Esta ação removerá o acesso do usuário ao sistema e às empresas autorizadas.</span>
                </div>
                <p className="text-[11px] font-semibold text-rose-400">
                  Esta operação não poderá ser desfeita.
                </p>
              </div>

              {deleteModalError && (
                <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2.5 text-rose-400 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <p>{deleteModalError}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleCloseDeleteModal}
                  disabled={isDeletingUser}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={isDeletingUser}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm shadow-lg shadow-rose-600/30 transition-all disabled:opacity-50 flex justify-center items-center gap-2"
                >
                  {isDeletingUser && <Loader2 className="w-4 h-4 animate-spin" />}
                  Excluir usuário
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

