import { createClient } from '@supabase/supabase-js';
import { supabase, supabaseUrl, supabaseAnonKey } from './supabase';

export interface UserProfile {
  id: string;
  full_name: string;
  email?: string;
  role: 'super_admin' | 'admin' | 'extensionista' | 'viewer';
  level: number;
  created_at: string;
  updated_at: string;
}

/**
 * Busca o perfil do usuário autenticado.
 * Se a tabela profiles ainda não existir ou o perfil não estiver criado,
 * retorna um perfil padrão com level 10 (viewer) para evitar travamento.
 */
export const fetchMyProfile = async (): Promise<UserProfile | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (error || !data) {
      // Tabela pode não existir ainda ou profile não criado
      console.warn('Perfil não encontrado no Supabase, usando verificação de governança:', error?.message);
      const emailNorm = (user.email || '').toLowerCase().trim();
      const isKnownSuperAdmin = [
        'lucas_zinatto@hotmail.com',
        'lucas.zinatto@belloalimentos.com.br',
        'joao.moraes@belloalimentos.com.br'
      ].includes(emailNorm);

      return {
        id: user.id,
        full_name: user.user_metadata?.full_name || (isKnownSuperAdmin ? (emailNorm.includes('lucas') ? 'Lucas Zinatto' : 'João Vitor Moraes') : user.email?.split('@')[0]) || 'Usuário',
        email: user.email,
        role: isKnownSuperAdmin ? 'super_admin' : 'viewer',
        level: isKnownSuperAdmin ? ACCESS_LEVELS.SUPER_ADMIN : ACCESS_LEVELS.VIEWER,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
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
    // Também sincroniza com usuarios_sistema se a tabela existir
    try {
      const papelMap: Record<string, string> = {
        'super_admin': 'admin',
        'admin': 'Gestor Operacional',
        'extensionista': 'Extensionista',
        'viewer': 'Visualizador'
      };
      if (updates.role) {
        await supabase
          .from('usuarios_sistema')
          .update({ papel: papelMap[updates.role] || 'Visualizador' })
          .eq('id', profileId);
      }
    } catch (_) {}
    return false;
  }

  // Tenta manter usuarios_sistema sincronizado
  try {
    const papelMap: Record<string, string> = {
      'super_admin': 'admin',
      'admin': 'Gestor Operacional',
      'extensionista': 'Extensionista',
      'viewer': 'Visualizador'
    };
    if (updates.role) {
      await supabase
        .from('usuarios_sistema')
        .update({ papel: papelMap[updates.role] || 'Visualizador' })
        .eq('id', profileId);
    }
  } catch (_) {}

  return true;
};

/**
 * Lista todos os perfis cadastrados no sistema (gestão de usuários).
 * Busca em public.profiles e mescla com public.usuarios_sistema para integridade total.
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

    // Fallback: se profiles estiver vazio ou inacessível, busca em usuarios_sistema
    const { data: usData, error: usErr } = await supabase
      .from('usuarios_sistema')
      .select('*');

    if (!usErr && usData && usData.length > 0) {
      return usData.map(u => ({
        id: u.id,
        full_name: u.nome,
        email: u.email,
        role: (u.papel === 'admin' || u.papel === 'super_admin' || u.papel === 'Administrador')
          ? 'super_admin' 
          : (u.papel?.toLowerCase().includes('gestor') ? 'admin' : 'viewer'),
        level: (u.papel === 'admin' || u.papel === 'super_admin' || u.papel === 'Administrador')
          ? 100 
          : (u.papel?.toLowerCase().includes('gestor') ? 80 : 10),
        created_at: u.created_at || u.criado_em || new Date().toISOString(),
        updated_at: u.created_at || new Date().toISOString()
      }));
    }

    return [];
  } catch (err: any) {
    console.error('Erro ao listar perfis:', err?.message);
    return [];
  }
};

/**
 * Constantes de nível para uso nos componentes.
 * Evita magic numbers espalhados pelo código.
 */
export const ACCESS_LEVELS = {
  SUPER_ADMIN: 100,
  ADMIN: 80,
  EXTENSIONISTA: 50,
  VIEWER: 10
} as const;

/**
 * Verifica se o nível do usuário permite a ação.
 */
export const canAccess = (userLevel: number, requiredLevel: number): boolean => {
  return userLevel >= requiredLevel;
};

/**
 * Cria um novo usuário de forma silenciosa (sem deslogar o Admin atual).
 * Utiliza uma instância secundária do Supabase.
 */
export const createUserSilently = async (email: string, password: string, fullName: string, role: string, level: number) => {
  const tempClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    }
  });

  const { data, error } = await tempClient.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        force_password_change: true
      }
    }
  });

  if (error) {
    throw error;
  }

  if (data.user) {
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Insere ou atualiza o perfil em profiles
    await supabase
      .from('profiles')
      .upsert({
        id: data.user.id,
        full_name: fullName,
        email: email,
        role: role as any,
        level: level
      });

    // Também cadastra em usuarios_sistema
    const papelNome = role === 'super_admin' ? 'admin' : (role === 'admin' ? 'Gestor Operacional' : 'Visualizador');
    await supabase
      .from('usuarios_sistema')
      .upsert({
        id: data.user.id,
        nome: fullName,
        email: email,
        papel: papelNome,
        status: 'aprovado',
        criado_em: new Date().toISOString()
      });
  }

  return data;
};

export interface UserCompanyMembership {
  id?: string;
  user_id: string;
  usuario_id?: string;
  empresa_id: string;
  role: 'super_admin' | 'admin' | 'extensionista' | 'viewer';
  level: number;
  ativo: boolean;
}

/**
 * Busca os vínculos reais de empresas de um usuário no banco.
 * NÃO inventa vínculos mockados se não houver dados.
 */
export const fetchUserCompaniesMemberships = async (userId: string): Promise<UserCompanyMembership[]> => {
  try {
    const { data, error } = await supabase
      .from('usuarios_empresas')
      .select('*')
      .or(`user_id.eq.${userId},usuario_id.eq.${userId}`);

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
      console.error('Erro ao duplicar acesso do usuário:', error.message);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Falha ao duplicar acesso' };
  }
};

/**
 * Remove o acesso de um usuário a uma empresa específica.
 */
export const removeUserCompanyAccess = async (
  userId: string,
  companyId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('usuarios_empresas')
      .delete()
      .or(`user_id.eq.${userId},usuario_id.eq.${userId}`)
      .eq('empresa_id', companyId);

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Falha ao remover acesso' };
  }
};


