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

export const KNOWN_SUPER_ADMIN_EMAILS = [
  'lucas_zinatto@hotmail.com',
  'lucas.zinatto@belloalimentos.com.br',
  'joao.moraes@belloalimentos.com.br'
];

/**
 * Retorna o perfil completo do usuário autenticado no momento.
 */
export const fetchCurrentUserProfile = async (): Promise<UserProfile | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const emailNormalized = (user.email || '').toLowerCase().trim();
    const isKnownSuper = KNOWN_SUPER_ADMIN_EMAILS.includes(emailNormalized);

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
        full_name: user.user_metadata?.full_name || (isKnownSuper ? 'Lucas Zinatto' : user.email?.split('@')[0]) || 'Usuário',
        role: isKnownSuper ? 'super_admin' : 'viewer',
        level: isKnownSuper ? ACCESS_LEVELS.SUPER_ADMIN : ACCESS_LEVELS.VIEWER
      };
    }

    if (!data) {
      return {
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || (isKnownSuper ? 'Lucas Zinatto' : user.email?.split('@')[0]) || 'Usuário',
        role: isKnownSuper ? 'super_admin' : 'viewer',
        level: isKnownSuper ? ACCESS_LEVELS.SUPER_ADMIN : ACCESS_LEVELS.VIEWER
      };
    }

    return {
      ...data,
      role: isKnownSuper ? 'super_admin' : (data.role || 'viewer'),
      level: isKnownSuper ? 100 : (data.level ?? 10),
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

export const CURRENT_PANEL_ID = 'ficha_cadastral';

/**
 * Lista usuários vinculados à empresa selecionada dentro do painel especificado.
 * Utiliza a RPC segura admin_get_panel_company_users.
 */
export const fetchCompanyProfiles = async (
  companyId: string,
  panelId: string = CURRENT_PANEL_ID
): Promise<UserProfile[]> => {
  try {
    const { data, error } = await supabase.rpc('admin_get_panel_company_users', {
      p_empresa_id: companyId,
      p_painel_id: panelId
    });

    if (!error && Array.isArray(data)) {
      return data.map((u: any) => ({
        id: u.user_id || u.id,
        email: u.email,
        full_name: u.nome || u.full_name,
        avatar_url: u.avatar_url,
        role: u.role || 'viewer',
        level: u.level ?? 10,
        created_at: u.created_at,
        updated_at: u.updated_at
      }));
    }

    if (error) {
      console.warn('RPC admin_get_panel_company_users indisponível ou erro:', error.message);
    }

    // Fallback via consulta direta com filtro restrito de empresa_id e painel_id
    const { data: uepData, error: uepErr } = await supabase
      .from('usuario_empresa_painel')
      .select('user_id, role, level, ativo')
      .eq('empresa_id', companyId)
      .eq('painel_id', panelId)
      .eq('ativo', true);

    if (uepErr || !uepData || uepData.length === 0) {
      return [];
    }

    const userIds = uepData.map((item: any) => item.user_id);
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('*')
      .in('id', userIds);

    const roleMap = new Map<string, { role: any; level: number }>(
      uepData.map((u: any) => [u.user_id, { role: u.role, level: u.level }])
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
    console.error('Erro ao listar usuários da empresa e painel:', err?.message);
    return [];
  }
};

/**
 * Lista todos os perfis globais (EXCLUSIVO para Super Admin).
 */
export const fetchAllProfiles = async (): Promise<UserProfile[]> => {
  try {
    // Buscar apenas os usuários que possuem vínculo com o painel ficha_cadastral
    const { data: uepData } = await supabase
      .from('usuario_empresa_painel')
      .select('user_id')
      .eq('painel_id', CURRENT_PANEL_ID);

    const { data: ueData } = await supabase
      .from('usuarios_empresas')
      .select('user_id');

    const allowedUserIds = new Set<string>([
      ...(uepData || []).map((u: any) => u.user_id),
      ...(ueData || []).map((u: any) => u.user_id)
    ]);

    // Sempre incluir conhecidos Super Admins
    const KNOWN_SUPER_ADMINS = [
      'lucas_zinatto@hotmail.com',
      'lucas.zinatto@belloalimentos.com.br',
      'joao.moraes@belloalimentos.com.br'
    ];

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('level', { ascending: false });

    if (!error && data && data.length > 0) {
      // Filtrar estritamente usuários pertencentes ao Ficha Cadastral
      return (data as UserProfile[]).filter(p => 
        allowedUserIds.has(p.id) || 
        (p.email && KNOWN_SUPER_ADMINS.includes(p.email.toLowerCase().trim())) ||
        p.role === 'super_admin' || 
        (p.level ?? 0) >= 100
      );
    }
    return [];
  } catch (err: any) {
    console.error('Erro ao listar perfis do painel:', err?.message);
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
 * Cria ou vincula um novo usuário de forma isolada para a empresa selecionada no painel Ficha Cadastral.
 * Se o e-mail já existir no Auth ou em profiles:
 * - Vincula o usuário ao painel ficha_cadastral e à empresa.
 * - Atualiza a senha no Auth para a senha informada pelo administrador.
 * - Não cria conta duplicada e preserva compatibilidade global.
 */
export const createUserForCompany = async (
  email: string,
  password: string,
  fullName: string,
  role: string,
  level: number,
  companyId: string,
  panelId: string = CURRENT_PANEL_ID
): Promise<{ success: boolean; user?: any; isExistingUser?: boolean; message?: string; error?: string }> => {
  try {
    const cleanEmail = email.toLowerCase().trim();

    // 1. Tentar criação/vínculo via Edge Function administrativa se disponível
    try {
      const { data: edgeData, error: edgeErr } = await supabase.functions.invoke('admin-create-user', {
        body: {
          email: cleanEmail,
          password,
          full_name: fullName,
          role,
          level,
          company_id: companyId,
          panel_id: panelId
        }
      });

      if (!edgeErr && edgeData && edgeData.success) {
        return {
          success: true,
          user: edgeData.user,
          isExistingUser: edgeData.isExistingUser,
          message: edgeData.message
        };
      }
    } catch (_) {
      // Prossegue para o fluxo direto
    }

    // 2. Verificar se usuário com este e-mail já existe em profiles
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .ilike('email', cleanEmail)
      .maybeSingle();

    if (existingProfile) {
      // Usuário já existe! Cria/atualiza o vínculo com este painel e esta empresa
      const { error: rpcErr } = await supabase.rpc('admin_set_user_panel_access', {
        target_user_id: existingProfile.id,
        target_empresa_id: companyId,
        target_painel_id: panelId,
        target_role: role,
        target_level: level
      });

      if (rpcErr) {
        // Fallback direto via upsert em usuario_empresa_painel
        const { error: upsertErr } = await supabase
          .from('usuario_empresa_painel')
          .upsert({
            user_id: existingProfile.id,
            empresa_id: companyId,
            painel_id: panelId,
            role,
            level,
            ativo: true,
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id,empresa_id,painel_id' });

        if (upsertErr) {
          return { success: false, error: 'Falha ao vincular usuário ao painel: ' + upsertErr.message };
        }
      }

      // Manter usuarios_empresas para compatibilidade retroativa
      try {
        await supabase
          .from('usuarios_empresas')
          .upsert({
            user_id: existingProfile.id,
            empresa_id: companyId,
            role,
            level,
            ativo: true
          }, { onConflict: 'user_id,empresa_id' });
      } catch (_) {}

      // Se o administrador digitou uma nova senha, atualiza no Supabase Auth
      let senhaAtualizada = false;
      if (password && password.length >= 6) {
        const passRes = await adminResetUserPassword(existingProfile.id, password);
        senhaAtualizada = passRes.success;
      }

      return {
        success: true,
        user: existingProfile,
        isExistingUser: true,
        message: senhaAtualizada
          ? `O e-mail já possuía cadastro no Supabase. O acesso ao painel Ficha Cadastral foi concedido e a senha foi atualizada com sucesso!`
          : `O e-mail já possuía cadastro no Supabase e foi vinculado com sucesso a esta empresa no painel Ficha Cadastral!`
      };
    }

    // 3. Se não existe em profiles, tenta registrar no Supabase Auth via cliente temporário
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

    // Se o Auth retornar que o e-mail já existe (criado em outro sistema ou anteriormente)
    if (signUpErr) {
      if (signUpErr.message?.toLowerCase().includes('already registered')) {
        // Obter o perfil ou vincular pelo email
        return {
          success: false,
          error: 'Este e-mail corporativo já possui conta no Supabase. O Super Admin pode gerenciar seus acessos diretamente.'
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

    // 4. Cadastrar perfil em public.profiles
    await supabase.from('profiles').upsert({
      id: newUserId,
      full_name: fullName,
      email: cleanEmail,
      role: role as any,
      level: level
    });

    // 5. Vincular SOMENTE à empresa selecionada no painel atual (ficha_cadastral)
    const { error: linkErr } = await supabase.from('usuario_empresa_painel').upsert({
      user_id: newUserId,
      empresa_id: companyId,
      painel_id: panelId,
      role,
      level,
      ativo: true
    }, { onConflict: 'user_id,empresa_id,painel_id' });

    if (linkErr) {
      console.warn('Erro ao criar vinculo em usuario_empresa_painel:', linkErr.message);
    }

    // Manter usuarios_empresas para compatibilidade retroativa
    try {
      await supabase.from('usuarios_empresas').upsert({
        user_id: newUserId,
        empresa_id: companyId,
        role,
        level,
        ativo: true
      }, { onConflict: 'user_id,empresa_id' });
    } catch (_) {}

    return {
      success: true,
      user: signUpData.user,
      isExistingUser: false,
      message: 'Novo usuário criado e vinculado ao painel Ficha Cadastral com sucesso!'
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro inesperado ao criar usuário.' };
  }
};

/**
 * Busca os vínculos reais de empresas de um usuário no painel específico.
 */
export const fetchUserCompaniesMemberships = async (
  userId: string,
  panelId: string = CURRENT_PANEL_ID
): Promise<UserCompanyMembership[]> => {
  try {
    const { data, error } = await supabase
      .from('usuario_empresa_painel')
      .select('*')
      .eq('user_id', userId)
      .eq('painel_id', panelId)
      .eq('ativo', true);

    if (!error && data && data.length > 0) {
      return data as UserCompanyMembership[];
    }

    // Fallback retroativo
    const { data: legacyData } = await supabase
      .from('usuarios_empresas')
      .select('*')
      .or(`user_id.eq.${userId},usuario_id.eq.${userId}`)
      .eq('ativo', true);

    return (legacyData || []) as UserCompanyMembership[];
  } catch (err) {
    console.warn('Erro ao buscar vinculos de empresas:', err);
    return [];
  }
};

/**
 * Duplica ou vincula o acesso de um usuário para empresas específicas dentro do painel atual.
 */
export const duplicateUserAccess = async (
  userId: string,
  targetCompanyIds: string[],
  role: 'super_admin' | 'admin' | 'extensionista' | 'viewer',
  level: number,
  panelId: string = CURRENT_PANEL_ID
): Promise<{ success: boolean; error?: string }> => {
  try {
    for (const compId of targetCompanyIds) {
      await supabase.rpc('admin_set_user_panel_access', {
        target_user_id: userId,
        target_empresa_id: compId,
        target_painel_id: panelId,
        target_role: role,
        target_level: level
      });
    }

    const records = targetCompanyIds.map(empresaId => ({
      user_id: userId,
      empresa_id: empresaId,
      painel_id: panelId,
      role,
      level,
      ativo: true
    }));

    const { error } = await supabase
      .from('usuario_empresa_painel')
      .upsert(records, { onConflict: 'user_id,empresa_id,painel_id' });

    if (error) {
      return { success: false, error: error.message };
    }

    // Compatibilidade retroativa em usuarios_empresas
    try {
      const legacyRecords = targetCompanyIds.map(empresaId => ({
        user_id: userId,
        usuario_id: userId,
        empresa_id: empresaId,
        role,
        level,
        ativo: true
      }));
      await supabase.from('usuarios_empresas').upsert(legacyRecords, { onConflict: 'user_id,empresa_id' });
    } catch (_) {}

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Falha ao duplicar acesso' };
  }
};

/**
 * Atualiza o cargo/permissão de um usuário para uma empresa específica dentro do painel atual.
 */
export const updateUserCompanyRole = async (
  userId: string,
  companyId: string,
  role: string,
  level: number,
  panelId: string = CURRENT_PANEL_ID
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { data, error } = await supabase.rpc('admin_set_user_panel_access', {
      target_user_id: userId,
      target_empresa_id: companyId,
      target_painel_id: panelId,
      target_role: role,
      target_level: level
    });

    if (!error && (data as any)?.success) {
      // Manter usuarios_empresas sincronizado para compatibilidade
      try {
        await supabase
          .from('usuarios_empresas')
          .upsert({ user_id: userId, empresa_id: companyId, role, level, ativo: true }, { onConflict: 'user_id,empresa_id' });
      } catch (_) {}
      return { success: true };
    }

    // Fallback direto
    const { error: directErr } = await supabase
      .from('usuario_empresa_painel')
      .upsert({
        user_id: userId,
        empresa_id: companyId,
        painel_id: panelId,
        role,
        level,
        ativo: true,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id,empresa_id,painel_id' });

    if (directErr) {
      return { success: false, error: directErr.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Falha ao atualizar papel no painel' };
  }
};

/**
 * Remove o acesso de um usuário EXCLUSIVAMENTE da empresa e painel atuais.
 * JAMAIS exclui conta do Auth, JAMAIS exclui perfil global, JAMAIS remove acessos de outros painéis ou empresas.
 */
export const adminRemoveUserFromCompany = async (
  targetUserId: string,
  companyId: string,
  currentUserProfile?: UserProfile | null,
  panelId: string = CURRENT_PANEL_ID
): Promise<{ success: boolean; message?: string; error?: string }> => {
  try {
    if (currentUserProfile && currentUserProfile.id === targetUserId) {
      return { success: false, error: 'Não é permitido remover o próprio acesso do painel.' };
    }

    // 1. Invoca a RPC segura admin_remove_user_from_panel
    const { data: rpcData, error: rpcErr } = await supabase.rpc('admin_remove_user_from_panel', {
      target_user_id: targetUserId,
      target_empresa_id: companyId,
      target_painel_id: panelId
    });

    if (!rpcErr && rpcData) {
      if ((rpcData as any).success === false) {
        return { success: false, error: (rpcData as any).error || 'Falha ao remover acesso do painel.' };
      }
      return { success: true, message: (rpcData as any).message || 'Acesso ao painel removido com sucesso.' };
    }

    // 2. Fallback direto restrito estritamente a este painel e empresa
    const { error: delErr } = await supabase
      .from('usuario_empresa_painel')
      .delete()
      .eq('user_id', targetUserId)
      .eq('empresa_id', companyId)
      .eq('painel_id', panelId);

    if (delErr) {
      return { success: false, error: 'Falha ao desvincular usuário do painel: ' + delErr.message };
    }

    return { success: true, message: 'Acesso do usuário removido deste painel com sucesso.' };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro inesperado ao remover acesso do painel.' };
  }
};

/**
 * Exclui a conta do usuário globalmente (EXCLUSIVO PARA SUPER ADMIN).
/**
 * Remove o acesso do usuário ao painel Ficha Cadastral (em todas as empresas).
 * PRESERVA estritamente a conta global em auth.users, profiles e outros sistemas como Central Frango Forte.
 */
export const adminDeleteUserGlobally = async (
  targetUserId: string,
  currentUserProfile?: UserProfile | null
): Promise<{ success: boolean; message?: string; error?: string }> => {
  try {
    if (currentUserProfile && currentUserProfile.id === targetUserId) {
      return { success: false, error: 'Não é permitido remover o próprio acesso do painel.' };
    }

    if (!currentUserProfile || (currentUserProfile.level < 100 && currentUserProfile.role !== 'super_admin')) {
      return { success: false, error: 'Apenas Super Administradores podem remover acessos globais do painel.' };
    }

    // 1. Invoca Edge Function segura admin-delete-user com is_global_delete: true
    try {
      const { data: edgeData, error: edgeErr } = await supabase.functions.invoke('admin-delete-user', {
        body: {
          target_user_id: targetUserId,
          is_global_delete: true,
          painel_id: 'ficha_cadastral'
        }
      });

      if (!edgeErr && edgeData && edgeData.success) {
        return { 
          success: true, 
          message: edgeData.message || 'Acesso ao painel Ficha Cadastral removido com sucesso. Conta no Auth preservada.' 
        };
      }
    } catch (_) {}

    // 2. Fallback direto seguro no banco de dados (REMOÇÃO EXCLUSIVA DO PAINEL FICHA CADASTRAL)
    // Remove todos os acessos do usuário ao painel ficha_cadastral
    const { error: delPanelErr } = await supabase
      .from('usuario_empresa_painel')
      .delete()
      .eq('user_id', targetUserId)
      .eq('painel_id', 'ficha_cadastral');

    if (delPanelErr) {
      return { success: false, error: 'Falha ao remover vínculos do painel: ' + delPanelErr.message };
    }

    // Verificar se o usuário possui outros painéis ativos (ex: central_frango_forte)
    const { data: otherPanels } = await supabase
      .from('usuario_empresa_painel')
      .select('empresa_id')
      .eq('user_id', targetUserId);

    const otherEmpresaIds = new Set((otherPanels || []).map(p => p.empresa_id));

    // Remover apenas os vínculos de empresas que pertenciam ao Ficha Cadastral e não têm outros painéis
    const { data: currentUE } = await supabase
      .from('usuarios_empresas')
      .select('empresa_id')
      .eq('user_id', targetUserId);

    if (currentUE && currentUE.length > 0) {
      for (const row of currentUE) {
        if (!otherEmpresaIds.has(row.empresa_id)) {
          await supabase
            .from('usuarios_empresas')
            .delete()
            .eq('user_id', targetUserId)
            .eq('empresa_id', row.empresa_id);
        }
      }
    }

    // Registrar auditoria
    try {
      await supabase.from('auditoria_usuarios').insert({
        acao: 'REMOCAO_PAINEL_FICHA_CADASTRAL',
        autor_id: currentUserProfile?.id,
        autor_nome: currentUserProfile?.full_name,
        autor_email: currentUserProfile?.email,
        alvo_id: targetUserId,
        detalhes: {
          timestamp: new Date().toISOString(),
          painel_id: 'ficha_cadastral',
          auth_users_preservado: true
        }
      });
    } catch (_) {}

    return { 
      success: true, 
      message: 'Acesso do usuário ao painel Ficha Cadastral removido com sucesso. A conta global no Auth e outros sistemas foram preservados.' 
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro inesperado ao remover acesso do painel.' };
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
