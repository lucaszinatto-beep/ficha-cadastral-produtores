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
      return new Response(JSON.stringify({ error: 'Permissão negada: nível insuficiente para cadastrar usuários.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const body = await req.json()
    const rawEmail = body.email
    const password = body.password
    const fullName = body.full_name || ''
    const role = body.role || 'viewer'
    const level = Number(body.level || 10)
    const companyId = body.company_id
    const panelId = body.panel_id || 'ficha_cadastral'

    if (!rawEmail || !password || !companyId) {
      return new Response(JSON.stringify({ error: 'email, password e company_id são obrigatórios.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (password.length < 6) {
      return new Response(JSON.stringify({ error: 'A senha deve conter no mínimo 6 caracteres.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const cleanEmail = rawEmail.toLowerCase().trim()

    // 2. Cliente administrativo seguro com Service Role
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // PASSO 1: Verificar se o email já existe no Supabase Auth
    const { data: listData } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 })
    const existingAuthUser = (listData?.users || []).find(
      (u: any) => (u.email || '').toLowerCase().trim() === cleanEmail
    )

    let userId: string
    let isExistingUser = false

    if (!existingAuthUser) {
      // PASSO 2: Criar novo usuário no Auth com confirmação automática de e-mail
      const { data: createData, error: createErr } = await adminClient.auth.admin.createUser({
        email: cleanEmail,
        password: password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          force_password_change: true
        }
      })

      if (createErr || !createData.user) {
        return new Response(JSON.stringify({ error: 'Falha ao criar usuário no Auth: ' + (createErr?.message || 'Erro desconhecido') }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      userId = createData.user.id
    } else {
      // Usuário já existe no Auth
      userId = existingAuthUser.id
      isExistingUser = true

      // Atualiza a senha no Auth se foi solicitada na criação administrativa
      if (password) {
        const { error: passErr } = await adminClient.auth.admin.updateUserById(userId, {
          password: password,
          email_confirm: true
        })
        if (passErr) {
          console.warn('Aviso: erro ao atualizar senha do usuário existente no Auth:', passErr.message)
        }
      }
    }

    // PASSO 3: Criar / atualizar profile
    const { error: profErr } = await adminClient.from('profiles').upsert({
      id: userId,
      full_name: fullName,
      email: cleanEmail,
      role: role,
      level: level,
      updated_at: new Date().toISOString()
    })

    if (profErr) {
      return new Response(JSON.stringify({ error: 'Falha ao salvar perfil do usuário: ' + profErr.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // PASSO 4 & 5: Associar empresa e painel (usuario_empresa_painel com painel_id = 'ficha_cadastral' e ativo = true)
    const { error: panelErr } = await adminClient.from('usuario_empresa_painel').upsert({
      user_id: userId,
      empresa_id: companyId,
      painel_id: panelId,
      role: role,
      level: level,
      ativo: true,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id,empresa_id,painel_id' })

    if (panelErr) {
      return new Response(JSON.stringify({ error: 'Falha ao vincular usuário ao painel: ' + panelErr.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Manter usuarios_empresas para compatibilidade
    await adminClient.from('usuarios_empresas').upsert({
      user_id: userId,
      empresa_id: companyId,
      role: role,
      level: level,
      ativo: true,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id,empresa_id' })

    // Registrar auditoria
    try {
      await adminClient.from('auditoria_usuarios').insert({
        acao: isExistingUser ? 'VINCULO_PAINEL_EXISTENTE' : 'CRIACAO_USUARIO_PAINEL',
        autor_id: callerUser.id,
        autor_nome: callerProfile?.full_name || callerEmail,
        autor_email: callerEmail,
        alvo_id: userId,
        alvo_nome: fullName,
        alvo_email: cleanEmail,
        detalhes: {
          empresa_id: companyId,
          painel_id: panelId,
          cargo: role,
          nivel: level,
          novo_usuario: !isExistingUser,
          timestamp: new Date().toISOString()
        }
      })
    } catch (_) {}

    return new Response(JSON.stringify({
      success: true,
      isExistingUser,
      user: {
        id: userId,
        email: cleanEmail,
        full_name: fullName,
        role: role,
        level: level
      },
      message: isExistingUser
        ? 'Este usuário já possuía conta no Supabase. O acesso ao painel Ficha Cadastral foi vinculado e a senha atualizada com sucesso!'
        : 'Usuário cadastrado com sucesso no Ficha Cadastral!'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || 'Erro interno ao processar criação de usuário' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
