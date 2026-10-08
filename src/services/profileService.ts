import { supabase, supabaseUrl, supabaseAnonKey } from './supabase';
import { createClient } from '@supabase/supabase-js';

export interface UserProfile {
  id: string;
  email?: string;
  full_name: string;
  avatar_url?: string;
  role: 'super_admin' | 'admin' | 'extensionista' | 'viewer';
  level: number;
  created_at?: string;
  updated_at?: string;
}

export interface UserCompanyMembership {
  id?: string;
  user_id: string;
  usuario_id?: string;
  empresa_id: string;
  role: 'super_admin' | 'admin' | 'extensionista' | 'viewer';
  level: number;
  ativo: boolean;
  empresa_nome?: string;
}

export const ACCESS_LEVELS = {
  SUPER_ADMIN: 100,
  ADMIN: 80,
  EXTENSIONISTA: 50,
  VIEWER: 10,
};

/**
 * Retorna o perfil completo do usuário autenticado no momento.
 */
export const fetchCurrentUserProfile = async (): Promise<UserProfile | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (error) {
      console.warn('Erro ao buscar perfil via public.profiles:', error.message);
      return {
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuário',
        role: 'viewer',
        level: ACCESS_LEVELS.VIEWER
      };
    }

    if (!data) {
      return {
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuário',
        role: 'viewer',
        level: ACCESS_LEVELS.VIEWER
      };
    }

    return {
      ...data,
      email: data.email || user.email
    } as UserProfile;
  } catch (err) {
    console.error('Erro ao buscar perfil:', err);
    return null;
  }
};

export const fetchMyProfile = fetchCurrentUserProfile;

/**
 * Atualiza o perfil de um usuário (requer level >= 80 para alterar outros).
 */
export const updateProfile = async (
  profileId: string,
  updates: Partial<Pick<UserProfile, 'full_name' | 'role' | 'level'>>
): Promise<boolean> => {
  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', profileId);

  if (error) {
    console.error('Erro ao atualizar perfil:', error.message);
    return false;
  }
  return true;
};

/**
 * Lista usuários vinculados à empresa selecionada com isolamento multiempresa estrito.
 * Utiliza a RPC segura admin_get_company_users.
 */
export const fetchCompanyProfiles = async (companyId: string): Promise<UserProfile[]> => {
  try {
    const { data, error } = await supabase.rpc('admin_get_company_users', {
      p_empresa_id: companyId
    });

    if (!error && Array.isArray(data)) {
      return data.map((u: any) => ({
        id: u.id,
        email: u.email,
        full_name: u.full_name,
        avatar_url: u.avatar_url,
        role: u.company_role || 'viewer',
        level: u.company_level ?? 10,
        created_at: u.created_at,
        updated_at: u.updated_at
      }));
    }

    if (error) {
      console.warn('RPC admin_get_company_users indisponível ou erro:', error.message);
    }

    // Fallback via consulta direta com filtro restrito de empresa_id
    const { data: ueData, error: ueErr } = await supabase
      .from('usuarios_empresas')
      .select('user_id, role, level, ativo')
      .eq('empresa_id', companyId)
      .eq('ativo', true);

    if (ueErr || !ueData || ueData.length === 0) {
      return [];
    }

    const userIds = ueData.map((item: any) => item.user_id);
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('*')
      .in('id', userIds);

    const roleMap = new Map<string, { role: any; level: number }>(
      ueData.map((u: any) => [u.user_id, { role: u.role, level: u.level }])
    );

    return (profilesData || []).map((p: any) => {
      const local = roleMap.get(p.id);
      return {
        ...p,
        role: local?.role || p.role || 'viewer',
        level: local?.level ?? p.level ?? 10
      };
    });
  } catch (err: any) {
    console.error('Erro ao listar usuários da empresa:', err?.message);
    return [];
  }
};

/**
 * Lista todos os perfis globais (EXCLUSIVO para Super Admin).
 */
export const fetchAllProfiles = async (): Promise<UserProfile[]> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('level', { ascending: false });

    if (!error && data && data.length > 0) {
      return data as UserProfile[];
    }
    return [];
  } catch (err: any) {
    console.error('Erro ao listar todos os perfis:', err?.message);
    return [];
  }
};

/**
 * Verifica se um usuário possui o nível de acesso requerido.
 */
export const hasRequiredLevel = (userLevel: number | undefined, requiredLevel: number): boolean => {
  if (userLevel === undefined) return false;
  return userLevel >= requiredLevel;
};

/**
 * Cria ou vincula um novo usuário de forma silenciosa para a empresa selecionada.
 * Se o e-mail já existir, reaproveita a conta do usuário e cria somente o vínculo com a empresa.
 */
export const createUserForCompany = async (
  email: string,
  password: string,
  fullName: string,
  role: string,
  level: number,
  companyId: string
): Promise<{ success: boolean; user?: any; isExistingUser?: boolean; message?: string; error?: string }> => {
  try {
    const cleanEmail = email.toLowerCase().trim();

    // 1. Verificar se usuário com este e-mail já existe em profiles
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .ilike('email', cleanEmail)
      .maybeSingle();

    if (existingProfile) {
      // Usuário já existe! Apenas cria/atualiza o vínculo com esta empresa
      const { error: rpcErr } = await supabase.rpc('admin_set_user_company_access', {
        target_user_id: existingProfile.id,
        target_empresa_id: companyId,
        target_role: role,
        target_level: level
      });

      if (rpcErr) {
        // Fallback direto via upsert em usuarios_empresas
        const { error: upsertErr } = await supabase
          .from('usuarios_empresas')
          .upsert({
            user_id: existingProfile.id,
            empresa_id: companyId,
            role,
            level,
            ativo: true
          }, { onConflict: 'user_id,empresa_id' });

        if (upsertErr) {
          return { success: false, error: 'Falha ao vincular usuário existente: ' + upsertErr.message };
        }
      }

      return {
        success: true,
        user: existingProfile,
        isExistingUser: true,
        message: `O e-mail já existia no sistema e foi vinculado com sucesso a esta empresa!`
      };
    }

    // 2. Se não existe, cria a conta no Supabase Auth via cliente silencioso
    const tempClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    });

    const { data: signUpData, error: signUpErr } = await tempClient.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          full_name: fullName,
          force_password_change: true
        }
      }
    });

    if (signUpErr) {
      if (signUpErr.message?.toLowerCase().includes('already registered')) {
        return {
          success: false,
          error: 'Este e-mail já possui uma conta de autenticação. Por favor, solicite a um Super Admin o vínculo ou sincronização.'
        };
      }
      return { success: false, error: signUpErr.message };
    }

    const newUserId = signUpData.user?.id;
    if (!newUserId) {
      return { success: false, error: 'Não foi possível obter o identificador do novo usuário.' };
    }

    // Aguardar propagação
    await new Promise(resolve => setTimeout(resolve, 500));

    // 3. Cadastrar perfil em public.profiles
    await supabase.from('profiles').upsert({
      id: newUserId,
      full_name: fullName,
      email: cleanEmail,
      role: role as any,
      level: level
    });

    // 4. Vincular SOMENTE à empresa selecionada
    const { error: linkErr } = await supabase.from('usuarios_empresas').upsert({
      user_id: newUserId,
      empresa_id: companyId,
      role,
      level,
      ativo: true
    }, { onConflict: 'user_id,empresa_id' });

    if (linkErr) {
      console.warn('Erro ao criar vinculo em usuarios_empresas:', linkErr.message);
    }

    return {
      success: true,
      user: signUpData.user,
      isExistingUser: false,
      message: 'Usuário criado e vinculado à empresa com sucesso!'
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro inesperado ao criar usuário.' };
  }
};

/**
 * Busca os vínculos reais de empresas de um usuário no banco.
 */
export const fetchUserCompaniesMemberships = async (userId: string): Promise<UserCompanyMembership[]> => {
  try {
    const { data, error } = await supabase
      .from('usuarios_empresas')
      .select('*')
      .or(`user_id.eq.${userId},usuario_id.eq.${userId}`)
      .eq('ativo', true);

    if (error || !data) {
      return [];
    }
    return data as UserCompanyMembership[];
  } catch (err) {
    console.warn('Erro ao buscar vinculos de empresas:', err);
    return [];
  }
};

/**
 * Duplica ou vincula o acesso de um usuário para empresas específicas.
 */
export const duplicateUserAccess = async (
  userId: string,
  targetCompanyIds: string[],
  role: 'super_admin' | 'admin' | 'extensionista' | 'viewer',
  level: number
): Promise<{ success: boolean; error?: string }> => {
  try {
    for (const compId of targetCompanyIds) {
      await supabase.rpc('admin_set_user_company_access', {
        target_user_id: userId,
        target_empresa_id: compId,
        target_role: role,
        target_level: level
      });
    }

    const records = targetCompanyIds.map(empresaId => ({
      user_id: userId,
      usuario_id: userId,
      empresa_id: empresaId,
      role,
      level,
      ativo: true
    }));

    const { error } = await supabase
      .from('usuarios_empresas')
      .upsert(records, { onConflict: 'user_id,empresa_id' });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Falha ao duplicar acesso' };
  }
};

/**
 * Atualiza o cargo/permissão de um usuário para uma empresa específica.
 */
export const updateUserCompanyRole = async (
  userId: string,
  companyId: string,
  role: string,
  level: number
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { data, error } = await supabase.rpc('admin_set_user_company_access', {
      target_user_id: userId,
      target_empresa_id: companyId,
      target_role: role,
      target_level: level
    });

    if (!error && (data as any)?.success) {
      return { success: true };
    }

    // Fallback direto
    const { error: directErr } = await supabase
      .from('usuarios_empresas')
      .update({ role, level, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('empresa_id', companyId);

    if (directErr) {
      return { success: false, error: directErr.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Falha ao atualizar papel na empresa' };
  }
};

/**
 * Remove o acesso de um usuário EXCLUSIVAMENTE da empresa atual.
 * JAMAIS exclui conta do Auth, JAMAIS exclui perfil global, JAMAIS remove acessos de outras empresas.
 */
export const adminRemoveUserFromCompany = async (
  targetUserId: string,
  companyId: string,
  currentUserProfile?: UserProfile | null
): Promise<{ success: boolean; message?: string; error?: string }> => {
  try {
    if (currentUserProfile && currentUserProfile.id === targetUserId) {
      return { success: false, error: 'Não é permitido remover o próprio acesso da empresa.' };
    }

    // 1. Invoca a RPC segura admin_remove_user_from_company
    const { data: rpcData, error: rpcErr } = await supabase.rpc('admin_remove_user_from_company', {
      target_user_id: targetUserId,
      target_empresa_id: companyId
    });

    if (!rpcErr && rpcData) {
      if ((rpcData as any).success === false) {
        return { success: false, error: (rpcData as any).error || 'Falha ao remover acesso.' };
      }
      return { success: true, message: (rpcData as any).message || 'Acesso da empresa removido com sucesso.' };
    }

    // 2. Fallback via Edge Function isolada passando empresa_id
    try {
      const { data: edgeData, error: edgeErr } = await supabase.functions.invoke('admin-delete-user', {
        body: {
          target_user_id: targetUserId,
          empresa_id: companyId,
          is_global_delete: false
        }
      });

      if (!edgeErr && edgeData) {
        if (edgeData.error) return { success: false, error: edgeData.error };
        return { success: true, message: edgeData.message || 'Acesso da empresa removido com sucesso.' };
      }
    } catch (_) {}

    // 3. Fallback direto restrito estritamente a esta empresa
    const { error: delErr } = await supabase
      .from('usuarios_empresas')
      .delete()
      .eq('user_id', targetUserId)
      .eq('empresa_id', companyId);

    if (delErr) {
      return { success: false, error: 'Falha ao desvincular usuário: ' + delErr.message };
    }

    return { success: true, message: 'Acesso do usuário removido desta empresa com sucesso.' };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro inesperado ao remover acesso da empresa.' };
  }
};

/**
 * Exclui a conta do usuário globalmente (EXCLUSIVO PARA SUPER ADMIN).
 * Remove todos os vínculos, o perfil e a conta no Supabase Auth.
 */
export const adminDeleteUserGlobally = async (
  targetUserId: string,
  currentUserProfile?: UserProfile | null
): Promise<{ success: boolean; message?: string; error?: string }> => {
  try {
    if (currentUserProfile && currentUserProfile.id === targetUserId) {
      return { success: false, error: 'Não é permitido excluir a própria conta.' };
    }

    if (!currentUserProfile || (currentUserProfile.level < 100 && currentUserProfile.role !== 'super_admin')) {
      return { success: false, error: 'Apenas Super Administradores podem excluir contas globalmente.' };
    }

    // 1. Invoca RPC admin_delete_user_globally
    const { data: rpcData, error: rpcErr } = await supabase.rpc('admin_delete_user_globally', {
      target_user_id: targetUserId
    });

    if (!rpcErr && rpcData) {
      if ((rpcData as any).success === false) {
        return { success: false, error: (rpcData as any).error };
      }
      return { success: true, message: (rpcData as any).message || 'Conta global excluída com sucesso.' };
    }

    // 2. Invoca Edge Function admin-delete-user com is_global_delete: true
    const { data: edgeData, error: edgeErr } = await supabase.functions.invoke('admin-delete-user', {
      body: {
        target_user_id: targetUserId,
        is_global_delete: true
      }
    });

    if (!edgeErr && edgeData) {
      if (edgeData.error) return { success: false, error: edgeData.error };
      return { success: true, message: edgeData.message || 'Conta excluída globalmente.' };
    }

    return { success: false, error: rpcErr?.message || edgeErr?.message || 'Falha ao executar exclusão global.' };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro inesperado na exclusão global.' };
  }
};

/**
 * Altera/redefine a senha de um usuário via Edge Function segura ou Auth direto.
 * A senha pertence ao auth.users e é GLOBAL à conta.
 */
export const adminResetUserPassword = async (
  targetUserId: string,
  newPassword: string,
  currentUserProfile?: UserProfile | null
): Promise<{ success: boolean; message?: string; error?: string }> => {
  try {
    if (!newPassword || newPassword.length < 6) {
      return { success: false, error: 'A nova senha deve conter no mínimo 6 caracteres.' };
    }

    if (currentUserProfile && currentUserProfile.id === targetUserId) {
      const { error: ownErr } = await supabase.auth.updateUser({ password: newPassword });
      if (ownErr) return { success: false, error: ownErr.message };
      return { success: true, message: 'Senha alterada com sucesso.' };
    }

    // Edge Function segura 'admin-reset-password'
    try {
      const { data: edgeData, error: edgeErr } = await supabase.functions.invoke('admin-reset-password', {
        body: {
          target_user_id: targetUserId,
          new_password: newPassword
        }
      });

      if (!edgeErr && edgeData) {
        if (edgeData.error) return { success: false, error: edgeData.error };
        return { success: true, message: edgeData.message || 'Senha alterada com sucesso.' };
      }
    } catch (_) {}

    // Fallback via RPC segura no PostgreSQL
    const { data: rpcData, error: rpcErr } = await supabase.rpc('admin_reset_user_password', {
      target_user_id: targetUserId,
      new_password: newPassword
    });

    if (rpcErr) {
      return { success: false, error: rpcErr.message || 'Erro ao alterar senha do usuário.' };
    }

    return { success: true, message: (rpcData as any)?.message || 'Senha alterada com sucesso.' };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro inesperado ao alterar senha.' };
  }
};
