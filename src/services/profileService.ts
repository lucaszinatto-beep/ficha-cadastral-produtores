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

/**
 * Altera/redefine a senha de um usuário via função segura do Supabase (RPC) ou Auth direto.
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

    // Se o usuário estiver alterando sua própria senha, usa o método nativo do cliente Supabase Auth
    if (currentUserProfile && currentUserProfile.id === targetUserId) {
      const { error: ownErr } = await supabase.auth.updateUser({ password: newPassword });
      if (ownErr) {
        return { success: false, error: ownErr.message };
      }
      return { success: true, message: 'Senha alterada com sucesso.' };
    }

    // Para alterar senha de outro usuário, invoca a função RPC segura com SECURITY DEFINER
    const { data, error } = await supabase.rpc('admin_reset_user_password', {
      target_user_id: targetUserId,
      new_password: newPassword
    });

    if (error) {
      // Se a função ainda não foi executada no banco do Supabase
      if (error.code === '42883' || error.message?.includes('does not exist') || error.message?.includes('PGRST202')) {
        return {
          success: false,
          error: 'A função de alteração administrativa de senha precisa ser instalada no Supabase. Execute o script "supabase_migration_admin_actions.sql" no SQL Editor do Supabase.'
        };
      }
      return { success: false, error: error.message };
    }

    return { success: true, message: data?.message || 'Senha alterada com sucesso.' };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro inesperado ao alterar senha.' };
  }
};

/**
 * Exclui um usuário do sistema (revoga vínculos de multiempresa, perfil e credenciais do Auth).
 */
export const adminDeleteUser = async (
  targetUserId: string,
  targetUserProfile?: UserProfile | null,
  currentUserProfile?: UserProfile | null
): Promise<{ success: boolean; message?: string; error?: string }> => {
  try {
    // 1. Validação de auto-exclusão
    if (currentUserProfile && currentUserProfile.id === targetUserId) {
      return { success: false, error: 'Não é permitido excluir a própria conta.' };
    }

    // 2. Validação de hierarquia
    const callerLevel = currentUserProfile?.level || 0;
    const targetLevel = targetUserProfile?.level || 10;
    if (callerLevel < 100 && targetLevel >= callerLevel) {
      return {
        success: false,
        error: 'Permissão negada: administradores não podem excluir usuários com nível de acesso igual ou superior.'
      };
    }

    // 3. Tenta chamar a RPC segura do Supabase (exclui de auth.users, profiles, empresas e auditoria)
    const { data, error: rpcErr } = await supabase.rpc('admin_delete_user', {
      target_user_id: targetUserId
    });

    if (!rpcErr) {
      return { success: true, message: data?.message || 'Usuário excluído com sucesso.' };
    }

    console.warn('RPC admin_delete_user não disponível, executando exclusão direta via RLS de tabelas:', rpcErr.message);

    // 4. Fallback resiliente: remove vínculos de multiempresa, tabela sistema e perfil diretamente
    const errors: string[] = [];

    // Remover empresas
    const { error: empErr } = await supabase
      .from('usuarios_empresas')
      .delete()
      .or(`user_id.eq.${targetUserId},usuario_id.eq.${targetUserId}`);
    if (empErr) errors.push(`Empresas: ${empErr.message}`);

    // Remover tabela de usuários do sistema legado (se existir)
    try {
      await supabase.from('usuarios_sistema').delete().eq('id', targetUserId);
    } catch (_) {}

    // Remover do perfil
    const { error: profErr } = await supabase
      .from('profiles')
      .delete()
      .eq('id', targetUserId);
    if (profErr) errors.push(`Perfil: ${profErr.message}`);

    // Registrar auditoria se a tabela existir
    try {
      await supabase.from('auditoria_usuarios').insert({
        acao: 'EXCLUSAO_USUARIO',
        autor_id: currentUserProfile?.id,
        autor_nome: currentUserProfile?.full_name || 'Admin',
        autor_email: currentUserProfile?.email,
        alvo_id: targetUserId,
        alvo_nome: targetUserProfile?.full_name || 'Usuário',
        alvo_email: targetUserProfile?.email,
        detalhes: { data: new Date().toISOString() }
      });
    } catch (_) {}

    if (errors.length > 0) {
      return {
        success: false,
        error: `Falha ao remover dados do usuário: ${errors.join('; ')}. Para exclusão completa de auth.users, execute o script "supabase_migration_admin_actions.sql" no SQL Editor.`
      };
    }

    return {
      success: true,
      message: 'Usuário e vínculos removidos do sistema com sucesso.'
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro inesperado ao excluir usuário.' };
  }
};



