import React, { useState, useEffect } from 'react';
import { X, Shield, Plus, Loader2, UserPlus, Pencil, AlertCircle, Save } from 'lucide-react';
import { UserProfile, fetchAllProfiles, updateProfile, createUserSilently, ACCESS_LEVELS } from '../services/profileService';

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
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Formulário de novo usuário
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newRole, setNewRole] = useState('viewer');
  
  // Edição inline
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingRole, setEditingRole] = useState('viewer');

  const loadProfiles = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchAllProfiles();
      setProfiles(data);
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
    }
  }, [isOpen, currentUserLevel]);

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
    setIsLoading(true);
    setError(null);
    try {
      const selectedRole = ROLE_OPTIONS.find(r => r.value === newRole);
      if (!selectedRole) throw new Error("Cargo inválido");
      
      await createUserSilently(
        newEmail,
        newPassword,
        newFullName,
        selectedRole.value,
        selectedRole.level
      );
      
      setIsCreating(false);
      setNewEmail('');
      setNewPassword('');
      setNewFullName('');
      setNewRole('viewer');
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

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl shadow-sky-900/10 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
              <Shield className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Gestão de Usuários</h2>
              <p className="text-xs text-slate-400">Controle de acesso e hierarquia (RBAC)</p>
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
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
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
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    placeholder="joao@bello.com.br"
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
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    placeholder="******"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Cargo / Hierarquia</label>
                  <select
                    value={newRole}
                    onChange={e => setNewRole(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    {ROLE_OPTIONS.map(r => (
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
                    Criar Usuário
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-white">Usuários Cadastrados ({profiles.length})</h3>
                <button
                  onClick={() => setIsCreating(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600/10 hover:bg-sky-600/20 text-sky-400 font-semibold text-xs border border-sky-500/20 transition-all"
                >
                  <Plus className="w-4 h-4" /> Novo Usuário
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
                        <th className="p-4">Nome</th>
                        <th className="p-4">Cargo / Nível</th>
                        <th className="p-4">Data de Cadastro</th>
                        <th className="p-4 text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {profiles.map(profile => (
                        <tr key={profile.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="p-4">
                            <div className="font-bold text-white text-sm">{profile.full_name}</div>
                            <div className="text-xs text-slate-500 font-mono mt-0.5">{profile.id.substring(0, 8)}...</div>
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
                          <td className="p-4 text-xs text-slate-400">
                            {new Date(profile.created_at).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="p-4">
                            <div className="flex items-center justify-center gap-2">
                              {editingId === profile.id ? (
                                <>
                                  <button
                                    onClick={() => handleSaveEdit(profile.id)}
                                    className="p-1.5 rounded-lg text-emerald-400 bg-emerald-400/10 hover:bg-emerald-400/20 transition-colors"
                                    title="Salvar"
                                  >
                                    <Save className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => setEditingId(null)}
                                    className="p-1.5 rounded-lg text-slate-400 bg-slate-800 hover:bg-slate-700 transition-colors"
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
                                  className="p-1.5 rounded-lg text-sky-400 bg-sky-400/10 hover:bg-sky-400/20 transition-colors"
                                  title="Alterar Hierarquia"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
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
