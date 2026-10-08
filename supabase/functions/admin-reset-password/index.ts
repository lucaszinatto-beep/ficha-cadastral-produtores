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
      return new Response(JSON.stringify({ error: 'Permissão negada: nível insuficiente para alterar senhas' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { target_user_id, new_password } = await req.json()

    if (!target_user_id || !new_password) {
      return new Response(JSON.stringify({ error: 'target_user_id e new_password são obrigatórios' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (new_password.length < 6) {
      return new Response(JSON.stringify({ error: 'A nova senha deve ter no mínimo 6 caracteres' }), {
        status: 400,
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
      .select('id, level, role')
      .eq('id', target_user_id)
      .maybeSingle()

    const targetLevel = targetProfile?.level ?? 10

    if (callerLevel < 100 && targetLevel >= callerLevel && callerUser.id !== target_user_id) {
      return new Response(JSON.stringify({ error: 'Permissão negada: você não pode alterar a senha de usuários com nível igual ou superior ao seu' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 4. Alteração real da senha no Supabase Auth
    const { data: updatedUser, error: updateErr } = await adminClient.auth.admin.updateUserById(
      target_user_id,
      { password: new_password }
    )

    if (updateErr) {
      return new Response(JSON.stringify({ error: updateErr.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 5. Registrar auditoria se a tabela existir
    try {
      await adminClient.from('auditoria_usuarios').insert({
        acao: 'ALTERACAO_SENHA',
        autor_id: callerUser.id,
        autor_nome: callerProfile?.full_name || callerEmail,
        autor_email: callerEmail,
        alvo_id: target_user_id,
        detalhes: { timestamp: new Date().toISOString() }
      })
    } catch (_) {}

    return new Response(JSON.stringify({ success: true, message: 'Senha alterada com sucesso.' }), {
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
