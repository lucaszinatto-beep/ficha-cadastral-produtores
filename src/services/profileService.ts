import { createClient } from '@supabase/supabase-js';
import { supabase, supabaseUrl, supabaseAnonKey } from './supabase';

export interface UserProfile {
  id: string;
  full_name: string;
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
      .single();

    if (error) {
      // Tabela pode não existir ainda ou profile não criado
      console.warn('Perfil não encontrado, usando padrão viewer:', error.message);
      return {
        id: user.id,
        full_name: user.email?.split('@')[0] || 'Usuário',
        role: 'viewer',
        level: 10,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    }

    return data as UserProfile;
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
    return false;
  }
  return true;
};

/**
 * Lista todos os perfis (para tela de gestão de usuários - somente admin).
 */
export const fetchAllProfiles = async (): Promise<UserProfile[]> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('level', { ascending: false });

  if (error) {
    console.error('Erro ao listar perfis:', error.message);
    return [];
  }
  return (data || []) as UserProfile[];
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
  // Cria um client isolado
  const tempClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    }
  });

  // Tenta criar o usuário
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

  // Se o trigger on_auth_user_created for executado, o profile já existe com level 10 e role viewer.
  // Vamos atualizar o nível se for diferente.
  if (data.user && (role !== 'viewer' || level !== 10)) {
    // Dá um tempinho pro trigger rodar
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ role, level })
      .eq('id', data.user.id);
      
    if (updateError) {
      console.warn('Erro ao atualizar nível do novo usuário:', updateError.message);
    }
  }

  return data;
};
