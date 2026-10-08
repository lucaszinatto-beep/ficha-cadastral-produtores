import React, { useState, useEffect } from 'react';
import { 
  Users, 
  X, 
  UserPlus, 
  Shield, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  Pencil, 
  Save, 
  Building2, 
  Copy, 
  CheckSquare, 
  Square, 
  Info,
  KeyRound,
  Eye,
  EyeOff,
  UserMinus,
  AlertTriangle,
  ShieldAlert
} from 'lucide-react';
import { 
  UserProfile, 
  ACCESS_LEVELS, 
  updateUserCompanyRole,
  fetchCompanyProfiles,
  fetchAllProfiles, 
  createUserForCompany, 
  duplicateUserAccess, 
  fetchUserCompaniesMemberships,
  adminResetUserPassword,
  adminRemoveUserFromCompany,
  adminDeleteUserGlobally
} from '../services/profileService';
import { supabase } from '../services/supabase';
import { useCompany } from '../context/CompanyContext';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserLevel: number;
  currentUserProfile?: UserProfile | null;
}

const ROLE_OPTIONS = [
  { value: 'viewer', label: 'Visualizador (Apenas Leitura)', level: ACCESS_LEVELS.VIEWER },
  { value: 'extensionista', label: 'Extensionista (Edição de Fichas)', level: ACCESS_LEVELS.EXTENSIONISTA },
  { value: 'admin', label: 'Gestor Operacional / Admin', level: ACCESS_LEVELS.ADMIN },
  { value: 'super_admin', label: 'Super Admin (Acesso Total)', level: ACCESS_LEVELS.SUPER_ADMIN },
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
      supabase.auth.getUser().then(({ data }: { data: any }) => {
        if (data?.user) setCurrentUserId(data.user.id);
      });
    }
  }, [currentUserProfile]);

  // Modo de visualização para Super Admin: 'company' (padrão) ou 'all'
  const isSuperAdmin = currentUserLevel >= ACCESS_LEVELS.SUPER_ADMIN;
  const [viewScope, setViewScope] = useState<'company' | 'all'>('company');

  // Formulário de novo usuário
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newRole, setNewRole] = useState('viewer');
  
  // Edição inline de role
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingRole, setEditingRole] = useState('viewer');

  // Modal: Gerenciar Empresas / Duplicar Acesso
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

  // Modal: Remover Acesso da Empresa
  const [removeAccessUser, setRemoveAccessUser] = useState<UserProfile | null>(null);
  const [isRemovingAccess, setIsRemovingAccess] = useState(false);
  const [removeAccessError, setRemoveAccessError] = useState<string | null>(null);

  // Modal: Excluir Conta Global (Exclusivo Super Admin)
  const [globalDeleteUser, setGlobalDeleteUser] = useState<UserProfile | null>(null);
  const [isDeletingGlobal, setIsDeletingGlobal] = useState(false);
  const [globalDeleteConfirmText, setGlobalDeleteConfirmText] = useState('');
  const [globalDeleteError, setGlobalDeleteError] = useState<string | null>(null);

  // Regras de Segurança e Hierarquia
  const canManageUser = (targetProfile: UserProfile): boolean => {
    if (isSuperAdmin) return true;
    if (currentUserId && targetProfile.id === currentUserId) return true;
    return targetProfile.level < currentUserLevel;
  };

  const canRemoveAccess = (targetProfile: UserProfile): boolean => {
    if (currentUserId && targetProfile.id === currentUserId) return false;
    if (isSuperAdmin) return true;
    return targetProfile.level < currentUserLevel;
  };

  // Carregar dados de usuários
  const loadProfiles = async () => {
    setIsLoading(true);
    setError(null);
    try {
      let data: UserProfile[] = [];

      if (isSuperAdmin && viewScope === 'all') {
        data = await fetchAllProfiles();
      } else {
        data = await fetchCompanyProfiles(currentCompany.id);
      }

      setProfiles(data);

      // Carregar os vínculos de empresas de cada perfil
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
      setRemoveAccessUser(null);
      setGlobalDeleteUser(null);
      setSuccessMsg(null);
    }
  }, [isOpen, currentUserLevel, currentCompany.id, viewScope]);

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

  // =========================================================================
  // HANDLERS DE AÇÕES
  // =========================================================================

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const selectedRole = ROLE_OPTIONS.find(r => r.value === newRole);
      if (!selectedRole) throw new Error("Cargo inválido selecionado.");
      
      const res = await createUserForCompany(
        newEmail,
        newPassword,
        newFullName,
        selectedRole.value,
        selectedRole.level,
        currentCompany.id
      );

      if (!res.success) {
        throw new Error(res.error || 'Erro ao criar usuário.');
      }
      
      setIsCreating(false);
      setNewEmail('');
      setNewPassword('');
      setNewFullName('');
      setNewRole('viewer');
      setSuccessMsg(res.message || `Usuário vinculado com sucesso à empresa ${currentCompany.nome}!`);
      await loadProfiles();
      await refreshUserCompanies();
    } catch (err: any) {
      setError(err.message || 'Erro ao cadastrar usuário.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveEdit = async (profileId: string) => {
    setIsLoading(true);
    try {
      const selectedRole = ROLE_OPTIONS.find(r => r.value === editingRole);
      if (selectedRole) {
        const res = await updateUserCompanyRole(profileId, currentCompany.id, selectedRole.value, selectedRole.level);
        if (!res.success) throw new Error(res.error || 'Erro ao atualizar papel do usuário.');
        setSuccessMsg(`Cargo do usuário atualizado na empresa ${currentCompany.nome}.`);
        await loadProfiles();
      }
      setEditingId(null);
    } catch (err: any) {
      setError(err.message || 'Erro ao atualizar perfil.');
    } finally {
      setIsLoading(false);
    }
  };

  // Alterar Senha
  const handleOpenPasswordModal = (profile: UserProfile) => {
    setPasswordModalUser(profile);
    setModalNewPassword('');
    setModalConfirmPassword('');
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setPasswordModalError(null);
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordModalUser) return;

    if (!modalNewPassword || modalNewPassword.length < 6) {
      setPasswordModalError('A senha deve conter no mínimo 6 caracteres.');
      return;
    }
    if (modalNewPassword !== modalConfirmPassword) {
      setPasswordModalError('As duas senhas não coincidem.');
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

      setSuccessMsg(`Senha de ${passwordModalUser.full_name} atualizada com sucesso.`);
      setPasswordModalUser(null);
    } catch (err: any) {
      setPasswordModalError(err.message || 'Erro ao alterar senha.');
    } finally {
      setIsSavingPassword(false);
    }
  };

  // Remover Acesso da Empresa
  const handleOpenRemoveAccess = (profile: UserProfile) => {
    setRemoveAccessUser(profile);
    setRemoveAccessError(null);
  };

  const handleConfirmRemoveAccess = async () => {
    if (!removeAccessUser) return;
    setIsRemovingAccess(true);
    setRemoveAccessError(null);
    try {
      const res = await adminRemoveUserFromCompany(
        removeAccessUser.id,
        currentCompany.id,
        currentUserProfile || (currentUserId ? { id: currentUserId, level: currentUserLevel } as any : null)
      );

      if (!res.success) {
        throw new Error(res.error || 'Erro ao remover acesso da empresa.');
      }

      setSuccessMsg(`Acesso de ${removeAccessUser.full_name} removido da empresa ${currentCompany.nome} com sucesso.`);
      setRemoveAccessUser(null);
      await loadProfiles();
      await refreshUserCompanies();
    } catch (err: any) {
      setRemoveAccessError(err.message || 'Erro ao remover acesso.');
    } finally {
      setIsRemovingAccess(false);
    }
  };

  // Excluir Conta Globalmente (Super Admin)
  const handleOpenGlobalDelete = (profile: UserProfile) => {
    setGlobalDeleteUser(profile);
    setGlobalDeleteConfirmText('');
    setGlobalDeleteError(null);
  };

  const handleConfirmGlobalDelete = async () => {
    if (!globalDeleteUser) return;
    if (globalDeleteConfirmText !== 'EXCLUIR') {
      setGlobalDeleteError('Digite EXCLUIR para confirmar a exclusão definitiva.');
      return;
    }

    setIsDeletingGlobal(true);
    setGlobalDeleteError(null);
    try {
      const res = await adminDeleteUserGlobally(
        globalDeleteUser.id,
        currentUserProfile || (currentUserId ? { id: currentUserId, level: currentUserLevel } as any : null)
      );

      if (!res.success) {
        throw new Error(res.error || 'Erro ao excluir conta global.');
      }

      setSuccessMsg(`Conta global de ${globalDeleteUser.full_name} excluída definitivamente.`);
      setGlobalDeleteUser(null);
      await loadProfiles();
      await refreshUserCompanies();
    } catch (err: any) {
      setGlobalDeleteError(err.message || 'Erro ao excluir conta global.');
    } finally {
      setIsDeletingGlobal(false);
    }
  };

  // Gerenciar / Duplicar Empresas
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
      const res = await duplicateUserAccess(
        duplicatingUser.id,
        selectedCompanyIds,
        selectedRole.value as any,
        selectedRole.level
      );

      if (!res.success) {
        throw new Error(res.error || 'Erro ao atualizar empresas.');
      }

      setSuccessMsg(`Acessos por empresa atualizados para ${duplicatingUser.full_name}!`);
      setDuplicatingUser(null);
      await loadProfiles();
      await refreshUserCompanies();
    } catch (err: any) {
      setError(err.message || 'Falha ao atualizar empresas autorizadas.');
    } finally {
      setIsSavingDuplication(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-5xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* HEADER */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white">Gestão de Usuários & Acessos</h2>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  Isolamento por Empresa Ativo
                </span>
              </div>
              
              {/* Badge Contextual da Empresa Atual */}
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-slate-400">Painel Ativo:</span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-bold bg-sky-950 border border-sky-500/40 text-sky-300">
                  <Building2 className="w-3.5 h-3.5 text-sky-400" />
                  {currentCompany.nome}
                </span>
              </div>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* FEEDBACK MENSAGENS */}
        {error && (
          <div className="mx-6 mt-4 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between text-rose-400 text-xs">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} className="p-1 hover:text-white"><X className="w-4 h-4" /></button>
          </div>
        )}

        {successMsg && (
          <div className="mx-6 mt-4 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-emerald-400 text-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg(null)} className="p-1 hover:text-white"><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* CONTEÚDO PRINCIPAL */}
        <div className="p-6 overflow-y-auto flex-1">
          {isCreating ? (
            /* SUB-TELA: CADASTRO DE NOVO USUÁRIO */
            <div className="max-w-xl mx-auto space-y-4 animate-in fade-in duration-150">
              <div className="p-4 rounded-2xl bg-sky-950/40 border border-sky-500/30 flex items-start gap-3">
                <Info className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
                <div className="text-xs text-sky-200 space-y-1">
                  <p className="font-bold">Cadastro com Isolamento Multiempresa</p>
                  <p>
                    O usuário será vinculado <strong>exclusivamente</strong> à empresa ativa (<span className="text-white underline">{currentCompany.nome}</span>).
                  </p>
                  <p className="text-slate-400">
                    Se o e-mail já existir no sistema, ele <strong>não será duplicado</strong>: apenas o acesso a esta empresa será criado.
                  </p>
                </div>
              </div>

              <form onSubmit={handleCreateUser} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Nome Completo</label>
                  <input
                    type="text"
                    required
                    value={newFullName}
                    onChange={e => setNewFullName(e.target.value)}
                    placeholder="Ex: Maria da Silva"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">E-mail Institucional</label>
                  <input
                    type="email"
                    required
                    value={newEmail}
                    onChange={e => setNewEmail(e.target.value)}
                    placeholder="usuario@empresa.com.br"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Senha Provisória</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    * Caso o e-mail já exista no sistema, a senha atual do usuário será preservada.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Cargo nesta Empresa</label>
                  <select
                    value={newRole}
                    onChange={e => setNewRole(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm"
                  >
                    {ROLE_OPTIONS
                      .filter(r => isSuperAdmin || r.level < currentUserLevel)
                      .map(r => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                  </select>
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
                    Vincular à {currentCompany.nome}
                  </button>
                </div>
              </form>
            </div>
          ) : duplicatingUser ? (
            /* SUB-TELA: GERENCIAR EMPRESAS / DUPLICAR ACESSO */
            <div className="max-w-xl mx-auto space-y-6 animate-in fade-in duration-150">
              <div className="p-4 rounded-2xl bg-sky-950/40 border border-sky-500/30 flex items-start gap-3">
                <Info className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
                <div className="text-xs text-sky-200 space-y-1">
                  <p className="font-bold">Gerenciamento de Empresas / Duplicação de Vínculo</p>
                  <p>
                    Marque ou desmarque as empresas autorizadas para este usuário.
                    <strong className="text-white block mt-1">Cada empresa possui seu próprio vínculo e permissão independente.</strong>
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
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {allCompanies.map((comp: any) => {
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
                <label className="block text-xs font-semibold text-slate-400 mb-1">Cargo a Atribuir nas Empresas Selecionadas</label>
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
                  disabled={isSavingDuplication}
                  className="flex-1 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-sm shadow-lg shadow-sky-600/30 transition-all disabled:opacity-50 flex justify-center items-center gap-2"
                >
                  {isSavingDuplication && <Loader2 className="w-4 h-4 animate-spin" />}
                  Salvar Vínculos de Empresa
                </button>
              </div>
            </div>
          ) : (
            /* LISTAGEM DE USUÁRIOS */
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    Usuários da Empresa:
                    <span className="text-sky-400">{currentCompany.nome}</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Apenas os usuários autorizados a operar nesta empresa estão listados abaixo.
                  </p>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  {/* Alternador de Escopo para Super Admin */}
                  {isSuperAdmin && (
                    <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800 text-xs">
                      <button
                        onClick={() => setViewScope('company')}
                        className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                          viewScope === 'company' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Apenas {currentCompany.slug.toUpperCase()}
                      </button>
                      <button
                        onClick={() => setViewScope('all')}
                        className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                          viewScope === 'all' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Todas as Empresas
                      </button>
                    </div>
                  )}

                  <button
                    onClick={() => setIsCreating(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-lg shadow-sky-600/20 transition-all cursor-pointer shrink-0"
                  >
                    <UserPlus className="w-4 h-4" />
                    Novo Usuário
                  </button>
                </div>
              </div>

              {isLoading && profiles.length === 0 ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 text-sky-400 animate-spin" />
                </div>
              ) : profiles.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-slate-800 rounded-2xl bg-slate-950/40">
                  <Building2 className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-300">Nenhum usuário vinculado a esta empresa.</p>
                  <p className="text-xs text-slate-500 mt-1">Clique em "Novo Usuário" para autorizar alguém nesta empresa.</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/50">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-950/50 border-b border-slate-800 text-xs text-slate-400 font-semibold uppercase tracking-wider">
                        <th className="p-4">Usuário</th>
                        <th className="p-4">Cargo na Empresa</th>
                        <th className="p-4">Empresas Autorizadas</th>
                        <th className="p-4 text-center min-w-[280px]">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {profiles.map(profile => {
                        const userCompIds = membershipsMap[profile.id] || [];
                        const userComps = allCompanies.filter((c: any) => 
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
                                  {ROLE_OPTIONS
                                    .filter(r => isSuperAdmin || r.level < currentUserLevel)
                                    .map(r => (
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
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                    Todas as Empresas (Super Admin)
                                  </span>
                                ) : userComps.length > 0 ? (
                                  userComps.map((c: any) => (
                                    <span 
                                      key={c.id} 
                                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${c.badgeBg} ${c.badgeText} ${c.badgeBorder}`}
                                    >
                                      {c.nome}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                    Sem empresas vinculadas
                                  </span>
                                )}
                              </div>
                            </td>

                            <td className="p-4">
                              <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                {/* 1. Botão Gerenciar Empresas */}
                                <button
                                  onClick={() => handleOpenDuplicate(profile)}
                                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-sky-400 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 transition-all cursor-pointer shadow-sm"
                                  title="Gerenciar e duplicar empresas autorizadas"
                                >
                                  <Copy className="w-3.5 h-3.5 shrink-0" />
                                  <span className="hidden sm:inline">Empresas</span>
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
                                  title={canManageUser(profile) ? 'Alterar senha (global da conta)' : 'Permissão insuficiente'}
                                >
                                  <KeyRound className="w-3.5 h-3.5 shrink-0" />
                                  <span className="hidden lg:inline">Senha</span>
                                </button>

                                {/* 3. Botão Editar Cargo */}
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
                                    title={canManageUser(profile) ? 'Editar cargo nesta empresa' : 'Permissão insuficiente'}
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </button>
                                )}

                                {/* 4. Botão REMOVER ACESSO DA EMPRESA (Isolamento Estrito) */}
                                <button
                                  onClick={() => handleOpenRemoveAccess(profile)}
                                  disabled={!canRemoveAccess(profile)}
                                  className={`flex items-center gap-1 px-2 py-1.5 rounded-xl border text-xs font-semibold transition-all shadow-sm ${
                                    canRemoveAccess(profile)
                                      ? 'text-amber-400 hover:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30 cursor-pointer'
                                      : 'text-slate-600 bg-slate-900 border-slate-800 opacity-30 cursor-not-allowed'
                                  }`}
                                  title={`Remover acesso apenas da empresa ${currentCompany.nome}`}
                                >
                                  <UserMinus className="w-3.5 h-3.5" />
                                  <span className="hidden sm:inline">Remover Acesso</span>
                                </button>

                                {/* 5. Botão EXCLUIR CONTA GLOBAL (Exclusivo Super Admin) */}
                                {isSuperAdmin && currentUserId !== profile.id && (
                                  <button
                                    onClick={() => handleOpenGlobalDelete(profile)}
                                    className="p-1.5 rounded-xl text-rose-400 hover:text-rose-200 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition-all cursor-pointer shadow-sm"
                                    title="Excluir conta globalmente (Super Admin)"
                                  >
                                    <ShieldAlert className="w-3.5 h-3.5" />
                                  </button>
                                )}
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
                    <h3 className="text-base font-bold text-white">Alterar Senha do Usuário</h3>
                    <p className="text-xs text-slate-400">Credencial Global de Autenticação</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPasswordModalUser(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="my-4 p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800">
                <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-1">Usuário</div>
                <div className="text-sm font-bold text-white">{passwordModalUser.full_name}</div>
                {passwordModalUser.email && (
                  <div className="text-xs text-cyan-400 font-medium mt-0.5">{passwordModalUser.email}</div>
                )}
                <div className="mt-2 text-[10px] text-slate-400">
                  * A senha é global da conta e não altera empresas, permissões ou acessos.
                </div>
              </div>

              {passwordModalError && (
                <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2.5 text-rose-400 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <p>{passwordModalError}</p>
                </div>
              )}

              <form onSubmit={handleSavePassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Nova Senha</label>
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
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Confirmar Nova Senha</label>
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
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setPasswordModalUser(null)}
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
                    Salvar Nova Senha
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL SECUNDÁRIO: REMOVER ACESSO DA EMPRESA (ISOLAMENTO SEGURO) */}
        {removeAccessUser && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4 animate-in fade-in duration-150">
            <div className="bg-slate-900 border border-amber-500/30 rounded-3xl w-full max-w-md shadow-2xl p-6 overflow-hidden">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-4">
                <UserMinus className="w-6 h-6" />
              </div>

              <h3 className="text-xl font-bold text-white text-center mb-1">
                Remover Acesso da Empresa?
              </h3>
              <p className="text-xs text-slate-400 text-center mb-4">
                Empresa Atual: <span className="text-amber-400 font-bold">{currentCompany.nome}</span>
              </p>

              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2 mb-4">
                <p className="text-xs text-slate-300">
                  Você está prestes a revogar o acesso de <span className="font-bold text-white">{removeAccessUser.full_name}</span>.
                </p>
                {removeAccessUser.email && (
                  <p className="text-xs text-sky-400 font-medium">
                    E-mail: <span className="underline">{removeAccessUser.email}</span>
                  </p>
                )}
                
                <div className="pt-2 border-t border-slate-800/80 text-[11px] text-emerald-300/90 flex items-start gap-1.5">
                  <Shield className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-400" />
                  <span>
                    <strong>Proteção Ativa:</strong> Esta ação remove <u>somente o acesso à empresa {currentCompany.nome}</u>. 
                    A conta de autenticação e os acessos a outras empresas permanecerão intactos.
                  </span>
                </div>
              </div>

              {removeAccessError && (
                <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2.5 text-rose-400 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <p>{removeAccessError}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setRemoveAccessUser(null)}
                  disabled={isRemovingAccess}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRemoveAccess}
                  disabled={isRemovingAccess}
                  className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-sm shadow-lg shadow-amber-600/30 transition-all disabled:opacity-50 flex justify-center items-center gap-2"
                >
                  {isRemovingAccess && <Loader2 className="w-4 h-4 animate-spin" />}
                  Remover Acesso
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL SECUNDÁRIO: EXCLUIR CONTA GLOBAL (EXCLUSIVO SUPER ADMIN) */}
        {globalDeleteUser && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/90 backdrop-blur-sm p-4 animate-in fade-in duration-150">
            <div className="bg-slate-900 border border-rose-600/50 rounded-3xl w-full max-w-md shadow-2xl p-6 overflow-hidden">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-4">
                <ShieldAlert className="w-6 h-6" />
              </div>

              <h3 className="text-xl font-bold text-white text-center mb-1">
                Excluir Conta Global Definitivamente?
              </h3>
              <p className="text-xs text-rose-400 text-center font-bold mb-4">
                AÇÃO EXCLUSIVA DE SUPER ADMINISTRAÇÃO
              </p>

              <div className="p-4 rounded-2xl bg-slate-950/90 border border-rose-500/30 space-y-2 mb-4">
                <p className="text-xs text-slate-300">
                  Usuário: <span className="font-bold text-white">{globalDeleteUser.full_name}</span>
                </p>
                {globalDeleteUser.email && (
                  <p className="text-xs text-sky-400 font-mono">{globalDeleteUser.email}</p>
                )}
                <div className="pt-2 border-t border-slate-800 text-[11px] text-rose-300 flex items-start gap-1.5">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
                  <span>
                    Isso excluirá a conta de autenticação (Auth.users), o perfil e os vínculos em <strong>TODAS</strong> as empresas do sistema.
                  </span>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Digite <span className="text-rose-400 font-bold">EXCLUIR</span> para confirmar:
                </label>
                <input
                  type="text"
                  value={globalDeleteConfirmText}
                  onChange={e => setGlobalDeleteConfirmText(e.target.value)}
                  placeholder="EXCLUIR"
                  className="w-full px-4 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-center text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              {globalDeleteError && (
                <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2.5 text-rose-400 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <p>{globalDeleteError}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setGlobalDeleteUser(null)}
                  disabled={isDeletingGlobal}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmGlobalDelete}
                  disabled={isDeletingGlobal || globalDeleteConfirmText !== 'EXCLUIR'}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm shadow-lg shadow-rose-600/30 transition-all disabled:opacity-40 flex justify-center items-center gap-2"
                >
                  {isDeletingGlobal && <Loader2 className="w-4 h-4 animate-spin" />}
                  Excluir Globalmente
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
