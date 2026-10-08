import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    // 1. Validar autorização do chamador
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autenticado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })

    const { data: { user: callerUser }, error: userErr } = await callerClient.auth.getUser()
    if (userErr || !callerUser) {
      return new Response(JSON.stringify({ error: 'Sessão inválida ou expirada' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const body = await req.json()
    const target_user_id = body.target_user_id
    const empresa_id = body.empresa_id || body.target_empresa_id
    const is_global_delete = Boolean(body.is_global_delete)

    if (!target_user_id) {
      return new Response(JSON.stringify({ error: 'target_user_id é obrigatório' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Não permitir auto-exclusão
    if (callerUser.id === target_user_id) {
      return new Response(JSON.stringify({ error: 'Não é permitido remover a própria conta ou acesso.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 2. Verificar nível de acesso do chamador
    const { data: callerProfile } = await callerClient
      .from('profiles')
      .select('id, level, role, full_name, email')
      .eq('id', callerUser.id)
      .maybeSingle()

    const KNOWN_SUPER_ADMINS = [
      'lucas_zinatto@hotmail.com',
      'lucas.zinatto@belloalimentos.com.br',
      'joao.moraes@belloalimentos.com.br'
    ]
    const callerEmail = (callerUser.email || '').toLowerCase().trim()
    const isSuper = KNOWN_SUPER_ADMINS.includes(callerEmail) || 
                    callerProfile?.role === 'super_admin' || 
                    (callerProfile?.level ?? 0) >= 100

    const callerLevel = isSuper ? 100 : (callerProfile?.level ?? 0)

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // =========================================================================
    // CASO A: REMOÇÃO DE ACESSO DE EMPRESA ESPECÍFICA (MODO PADRÃO SEGURO)
    // =========================================================================
    if (empresa_id && !is_global_delete) {
      // Validar se o chamador é admin da empresa solicitada (ou super admin)
      if (!isSuper) {
        const { data: callerMembership } = await adminClient
          .from('usuarios_empresas')
          .select('level, ativo')
          .eq('user_id', callerUser.id)
          .eq('empresa_id', empresa_id)
          .maybeSingle()

        if (!callerMembership || !callerMembership.ativo || (callerMembership.level ?? 0) < 80) {
          return new Response(JSON.stringify({ error: 'Você não tem permissão de administrador nesta empresa.' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }
      }

      // Validar nível do usuário alvo na empresa
      const { data: targetMembership } = await adminClient
        .from('usuarios_empresas')
        .select('level, role')
        .eq('user_id', target_user_id)
        .eq('empresa_id', empresa_id)
        .maybeSingle()

      if (!targetMembership) {
        return new Response(JSON.stringify({ error: 'Usuário não possui acesso ativo nesta empresa.' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      if (!isSuper && (targetMembership.level ?? 10) >= callerLevel) {
        return new Response(JSON.stringify({ error: 'Permissão insuficiente para remover usuário com nível igual ou superior.' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Obter nome da empresa para log
      const { data: companyData } = await adminClient
        .from('empresas')
        .select('nome')
        .eq('id', empresa_id)
        .maybeSingle()

      // REMOVER APENAS O VÍNCULO DESTA EMPRESA
      const { error: delLinkErr } = await adminClient
        .from('usuarios_empresas')
        .delete()
        .eq('user_id', target_user_id)
        .eq('empresa_id', empresa_id)

      if (delLinkErr) {
        return new Response(JSON.stringify({ error: 'Falha ao remover vínculo: ' + delLinkErr.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Registrar auditoria
      try {
        await adminClient.from('audit_user_access').insert({
          actor_user_id: callerUser.id,
          target_user_id: target_user_id,
          empresa_id: empresa_id,
          action: 'REVOKE_ACCESS',
          details: { empresa_nome: companyData?.nome, message: 'Acesso removido exclusivamente desta empresa' }
        })
      } catch (_) {}

      return new Response(JSON.stringify({ 
        success: true, 
        message: `Acesso do usuário à empresa ${companyData?.nome || ''} removido com sucesso.` 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // =========================================================================
    // CASO B: EXCLUSÃO GLOBAL DE CONTA (ESTRITAMENTE SUPER ADMIN)
    // =========================================================================
    if (!isSuper) {
      return new Response(JSON.stringify({ 
        error: 'Permissão negada: apenas Super Administradores podem excluir contas globalmente.' 
      }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Checar hierarquia do alvo
    const { data: targetProfile } = await adminClient
      .from('profiles')
      .select('id, level, role, full_name, email')
      .eq('id', target_user_id)
      .maybeSingle()

    // Registrar auditoria global
    try {
      await adminClient.from('audit_user_access').insert({
        actor_user_id: callerUser.id,
        target_user_id: target_user_id,
        empresa_id: null,
        action: 'GLOBAL_DELETE',
        details: { target_email: targetProfile?.email, message: 'Exclusão global da conta executada pelo Super Admin' }
      })
    } catch (_) {}

    // Excluir todos os vínculos de empresas
    await adminClient
      .from('usuarios_empresas')
      .delete()
      .or(`user_id.eq.${target_user_id},usuario_id.eq.${target_user_id}`)

    try {
      await adminClient.from('usuarios_sistema').delete().eq('id', target_user_id)
    } catch (_) {}

    await adminClient.from('profiles').delete().eq('id', target_user_id)

    // Excluir do Supabase Auth
    const { error: deleteAuthErr } = await adminClient.auth.admin.deleteUser(target_user_id)
    if (deleteAuthErr) {
      console.warn('Erro ao deletar de auth.users:', deleteAuthErr.message)
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Conta do usuário e todos os acessos globais foram excluídos com sucesso.' 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || 'Erro interno ao processar requisição' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
