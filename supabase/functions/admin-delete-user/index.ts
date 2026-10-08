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

    const { target_user_id } = await req.json()
    if (!target_user_id) {
      return new Response(JSON.stringify({ error: 'target_user_id é obrigatório' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Não permitir que um usuário exclua a própria conta
    if (callerUser.id === target_user_id) {
      return new Response(JSON.stringify({ error: 'Não é permitido excluir a própria conta' }), {
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

    if (callerLevel < 80) {
      return new Response(JSON.stringify({ error: 'Permissão negada: nível insuficiente para excluir usuários' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 3. Cliente administrativo com service_role
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Checar hierarquia do usuário alvo
    const { data: targetProfile } = await adminClient
      .from('profiles')
      .select('id, level, role, full_name, email')
      .eq('id', target_user_id)
      .maybeSingle()

    const targetLevel = targetProfile?.level ?? 10

    if (callerLevel < 100 && targetLevel >= callerLevel) {
      return new Response(JSON.stringify({ error: 'Permissão negada: administradores não podem excluir usuários de nível igual ou superior' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 4. Registrar auditoria antes da exclusão
    try {
      await adminClient.from('auditoria_usuarios').insert({
        acao: 'EXCLUSAO_USUARIO',
        autor_id: callerUser.id,
        autor_nome: callerProfile?.full_name || callerEmail,
        autor_email: callerEmail,
        alvo_id: target_user_id,
        alvo_nome: targetProfile?.full_name,
        alvo_email: targetProfile?.email,
        detalhes: { timestamp: new Date().toISOString() }
      })
    } catch (_) {}

    // 5. Excluir dados relacionados
    await adminClient
      .from('usuarios_empresas')
      .delete()
      .or(`user_id.eq.${target_user_id},usuario_id.eq.${target_user_id}`)

    try {
      await adminClient.from('usuarios_sistema').delete().eq('id', target_user_id)
    } catch (_) {}

    await adminClient.from('profiles').delete().eq('id', target_user_id)

    // 6. Excluir do Supabase Auth
    const { error: deleteAuthErr } = await adminClient.auth.admin.deleteUser(target_user_id)
    if (deleteAuthErr) {
      console.warn('Erro ao deletar de auth.users:', deleteAuthErr.message)
    }

    return new Response(JSON.stringify({ success: true, message: 'Usuário excluído com sucesso.' }), {
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
