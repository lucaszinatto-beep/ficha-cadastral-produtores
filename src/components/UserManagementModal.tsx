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
  Info
} from 'lucide-react';
import { 
  UserProfile, 
  fetchAllProfiles, 
  updateProfile, 
  createUserSilently, 
  fetchUserCompaniesMemberships, 
  duplicateUserAccess, 
  removeUserCompanyAccess,
  ACCESS_LEVELS 
} from '../services/profileService';
import { useCompany } from '../context/CompanyContext';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserLevel: number;
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
  currentUserLevel
}) => {
  const { currentCompany, refreshUserCompanies, allCompanies } = useCompany();
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [membershipsMap, setMembershipsMap] = useState<Record<string, string[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

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
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden font-sans">
        
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
                        <th className="p-4 text-center">Ações</th>
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
                                <div className="flex items-center justify-center gap-2">
                                  {/* Botão Gerenciar Empresas / Duplicar Acesso */}
                                  <button
                                    onClick={() => handleOpenDuplicate(profile)}
                                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-sky-400 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 transition-all cursor-pointer"
                                    title="Gerenciar e duplicar empresas autorizadas"
                                  >
                                    <Copy className="w-3.5 h-3.5" />
                                    <span>Gerenciar Empresas</span>
                                  </button>

                                  {editingId === profile.id ? (
                                    <>
                                      <button
                                        onClick={() => handleSaveEdit(profile.id)}
                                        className="p-1.5 rounded-lg text-emerald-400 bg-emerald-400/10 hover:bg-emerald-400/20 transition-colors cursor-pointer"
                                        title="Salvar"
                                      >
                                        <Save className="w-4 h-4" />
                                      </button>
                                      <button
                                        onClick={() => setEditingId(null)}
                                        className="p-1.5 rounded-lg text-slate-400 bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
                                        title="Cancelar"
                                      >
                                        <X className="w-4 h-4" />
                                      </button>
                                    </>
                                  ) : (
                                    <button
                                      onClick={() => {
                                        setEditingId(profile.id);
                                        setEditingRole(profile.role);
                                      }}
                                      className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
                                      title="Alterar Cargo"
                                    >
                                      <Pencil className="w-4 h-4" />
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
      </div>
    </div>
  );
};

