import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
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
    const target_painel_id = body.painel_id || 'ficha_cadastral'

    if (!target_user_id) {
      return new Response(JSON.stringify({ error: 'target_user_id é obrigatório' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Não permitir auto-exclusão
    if (callerUser.id === target_user_id) {
      return new Response(JSON.stringify({ error: 'Não é permitido remover o próprio acesso.' }), {
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
    // CASO A: REMOÇÃO DE ACESSO DE EMPRESA ESPECÍFICA NO PAINEL
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

      // REMOVER DO PAINEL ESPECÍFICO (usuario_empresa_painel)
      await adminClient
        .from('usuario_empresa_painel')
        .delete()
        .eq('user_id', target_user_id)
        .eq('empresa_id', empresa_id)
        .eq('painel_id', target_painel_id)

      // Se não houver outros painéis ativos para essa empresa, remover vínculo de usuarios_empresas
      const { data: remainingPanels } = await adminClient
        .from('usuario_empresa_painel')
        .select('id')
        .eq('user_id', target_user_id)
        .eq('empresa_id', empresa_id)

      if (!remainingPanels || remainingPanels.length === 0) {
        await adminClient
          .from('usuarios_empresas')
          .delete()
          .eq('user_id', target_user_id)
          .eq('empresa_id', empresa_id)
      }

      // Registrar auditoria
      try {
        await adminClient.from('audit_user_access').insert({
          actor_user_id: callerUser.id,
          target_user_id: target_user_id,
          empresa_id: empresa_id,
          action: 'REVOKE_PANEL_ACCESS',
          details: { 
            empresa_nome: companyData?.nome, 
            painel_id: target_painel_id,
            message: 'Acesso ao painel removido para esta empresa' 
          }
        })
      } catch (_) {}

      return new Response(JSON.stringify({ 
        success: true, 
        message: `Acesso do usuário ao painel na empresa ${companyData?.nome || ''} removido com sucesso.` 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // =========================================================================
    // CASO B: REMOÇÃO TOTAL DO PAINEL FICHA CADASTRAL (ISOLAMENTO LÓGICO SEGURO)
    // NUNCA EXCLUI auth.users OU usuarios_sistema OU profiles!
    // =========================================================================
    if (!isSuper) {
      return new Response(JSON.stringify({ 
        error: 'Permissão negada: apenas Super Administradores podem remover acessos completos do painel.' 
      }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Obter dados do usuário para auditoria
    const { data: targetProfile } = await adminClient
      .from('profiles')
      .select('id, level, role, full_name, email')
      .eq('id', target_user_id)
      .maybeSingle()

    // 1. Remover todos os vínculos deste usuário no painel ficha_cadastral
    const { error: delPanelErr } = await adminClient
      .from('usuario_empresa_painel')
      .delete()
      .eq('user_id', target_user_id)
      .eq('painel_id', 'ficha_cadastral')

    if (delPanelErr) {
      return new Response(JSON.stringify({ error: 'Erro ao desvincular do painel: ' + delPanelErr.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 2. Verificar se o usuário ainda possui vínculos em outros painéis (ex: central_frango_forte)
    const { data: otherPanels } = await adminClient
      .from('usuario_empresa_painel')
      .select('empresa_id, painel_id')
      .eq('user_id', target_user_id)

    const otherEmpresaIds = new Set((otherPanels || []).map(p => p.empresa_id))

    // 3. Remover de usuarios_empresas apenas para as empresas onde o usuário não tem outros painéis
    const { data: userCompanies } = await adminClient
      .from('usuarios_empresas')
      .select('empresa_id')
      .or(`user_id.eq.${target_user_id},usuario_id.eq.${target_user_id}`)

    if (userCompanies && userCompanies.length > 0) {
      for (const uc of userCompanies) {
        if (!otherEmpresaIds.has(uc.empresa_id)) {
          await adminClient
            .from('usuarios_empresas')
            .delete()
            .eq('empresa_id', uc.empresa_id)
            .or(`user_id.eq.${target_user_id},usuario_id.eq.${target_user_id}`)
        }
      }
    }

    // 4. REGISTRAR AUDITORIA SEGURA (PRESERVANDO auth.users E OUTROS SISTEMAS)
    try {
      await adminClient.from('auditoria_usuarios').insert({
        acao: 'REMOCAO_PAINEL_FICHA_CADASTRAL',
        autor_id: callerUser.id,
        autor_nome: callerProfile?.full_name || callerEmail,
        autor_email: callerEmail,
        alvo_id: target_user_id,
        alvo_nome: targetProfile?.full_name || 'Usuário',
        alvo_email: targetProfile?.email,
        detalhes: {
          timestamp: new Date().toISOString(),
          painel_id: 'ficha_cadastral',
          auth_users_preservado: true,
          message: 'Acesso ao painel Ficha Cadastral revogado; conta global do Auth preservada.'
        }
      })
    } catch (_) {}

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Acesso ao painel Ficha Cadastral removido com sucesso. A conta global no Auth foi preservada para manter o acesso a outros sistemas.' 
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
