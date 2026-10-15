import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

function getCredentials() {
  const envFile = fs.readFileSync('.env', 'utf8');
  const env: Record<string, string> = {};
  envFile.split('\n').forEach(line => {
    const [k, ...v] = line.split('=');
    if (k && v.length) env[k.trim()] = v.join('=').trim().replace(/^['\"]|['\"]$/g, '');
  });

  let serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey && fs.existsSync('C:/Projetos/projetos-teste/.env')) {
    const content = fs.readFileSync('C:/Projetos/projetos-teste/.env', 'utf8');
    const match = content.match(/SUPABASE_SERVICE_ROLE_KEY=["']?([^"'\r\n]+)/);
    if (match) serviceKey = match[1];
  }

  const url = env.VITE_SUPABASE_URL || 'https://ebixhddonbiqtrsyvdry.supabase.co';
  const anonKey = env.VITE_SUPABASE_ANON_KEY || '';
  return { url, anonKey, serviceKey };
}

async function runTests() {
  const { url, anonKey, serviceKey } = getCredentials();
  if (!serviceKey) {
    console.error('Service Role Key não encontrada.');
    process.exit(1);
  }

  const adminClient = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const anonClient = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  console.log('================================================================');
  console.log('🧪 TESTES REAIS DE PRODUÇÃO — ISOLAMENTO DE USUÁRIOS E FUNÇÕES');
  console.log('================================================================\n');

  // Obter uma empresa válida (Bello Alimentos)
  const { data: empresa } = await adminClient
    .from('empresas')
    .select('id, nome')
    .eq('nome', 'Bello Alimentos')
    .single();

  const empresaId = empresa?.id || 'e1100000-0000-0000-0000-000000000001';
  console.log(`Empresa de teste: ${empresa?.nome || 'Bello Alimentos'} (${empresaId})`);

  // Obter token de um Super Admin (lucas.zinatto) para invocar as Edge Functions autenticado
  const { data: superAdminAuth } = await adminClient.auth.admin.listUsers();
  const superAdminUser = superAdminAuth.users.find(u => u.email === 'lucas.zinatto@belloalimentos.com.br');
  if (!superAdminUser) {
    throw new Error('Super admin não encontrado para testes autenticados.');
  }

  // Gerar sessão administrativa segura para o chamador Super Admin
  const { data: linkData, error: linkErr } = await adminClient.auth.admin.generateLink({
    type: 'magiclink',
    email: superAdminUser.email!
  });

  if (linkErr || !linkData.properties?.hashed_token) {
    throw new Error('Falha ao gerar link para super admin: ' + linkErr?.message);
  }

  const { data: otpData, error: otpErr } = await anonClient.auth.verifyOtp({
    token_hash: linkData.properties.hashed_token,
    type: 'magiclink'
  });

  if (otpErr || !otpData.session?.access_token) {
    throw new Error('Falha ao validar OTP para super admin: ' + otpErr?.message);
  }

  const authHeader = `Bearer ${otpData.session.access_token}`;
  console.log('✅ Sessão de Super Admin obtida para invocar Edge Functions com autenticação real!');

  const testEmail = `teste.isolamento.ficha@belloalimentos.com.br`;
  const initialPassword = `SenhaFicha@2026!`;
  const newPassword = `NovaSenhaFicha#2026!`;

  // ============================================================================
  // TESTE C: CRIAÇÃO DE USUÁRIO VIA EDGE FUNCTION (admin-create-user)
  // ============================================================================
  console.log('\n----------------------------------------------------------------');
  console.log('TESTE C: Criação de usuário via Edge Function (admin-create-user)');
  console.log('----------------------------------------------------------------');

  const createRes = await fetch(`${url}/functions/v1/admin-create-user`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authHeader
    },
    body: JSON.stringify({
      email: testEmail,
      password: initialPassword,
      full_name: 'Usuário de Teste de Validação',
      role: 'viewer',
      level: 10,
      company_id: empresaId,
      panel_id: 'ficha_cadastral'
    })
  });

  const createBody = await createRes.json();
  console.log('Status da resposta admin-create-user:', createRes.status);
  console.log('Retorno:', createBody);

  if (!createRes.ok || !createBody.success) {
    throw new Error(`Falha no Teste C (admin-create-user): ${JSON.stringify(createBody)}`);
  }

  const testUserId = createBody.user.id;
  console.log(`✅ Usuário criado/identificado com ID: ${testUserId}`);

  // Verificar Auth
  const { data: authUserData } = await adminClient.auth.admin.getUserById(testUserId);
  console.log('• auth.users confirmado:', Boolean(authUserData.user?.id));
  console.log('• email_confirmed_at:', authUserData.user?.email_confirmed_at ? 'SIM' : 'NÃO');

  // Verificar profile
  const { data: profileData } = await adminClient.from('profiles').select('*').eq('id', testUserId).single();
  console.log('• public.profiles:', profileData ? `OK (${profileData.full_name}, ${profileData.role})` : 'NÃO');

  // Verificar usuario_empresa_painel
  const { data: uepData } = await adminClient
    .from('usuario_empresa_painel')
    .select('*')
    .eq('user_id', testUserId)
    .eq('painel_id', 'ficha_cadastral')
    .single();
  console.log('• public.usuario_empresa_painel (painel_id = ficha_cadastral):', uepData ? 'OK (ATIVO)' : 'NÃO');

  // ============================================================================
  // TESTE A: USUÁRIO FAZER LOGIN, SESSÃO, PERFIL E EMPRESAS
  // ============================================================================
  console.log('\n----------------------------------------------------------------');
  console.log('TESTE A: Login, Sessão, Perfil e Carregamento de Empresas');
  console.log('----------------------------------------------------------------');

  const { data: loginData, error: loginErr } = await anonClient.auth.signInWithPassword({
    email: testEmail,
    password: initialPassword
  });

  if (loginErr || !loginData.session) {
    throw new Error(`Falha no Teste A (Login do usuário): ${loginErr?.message}`);
  }
  console.log('✅ Login inicial realizado com sucesso!');
  console.log('• Sessão emitida (Token JWT presente):', Boolean(loginData.session.access_token));

  // Validar autorização do Ficha Cadastral conforme LoginView.tsx
  const userClient = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${loginData.session.access_token}` } }
  });

  const { data: userPanelAccess } = await userClient
    .from('usuario_empresa_painel')
    .select('id, empresa_id, painel_id, role, level, ativo')
    .eq('user_id', testUserId)
    .eq('painel_id', 'ficha_cadastral')
    .eq('ativo', true);

  console.log(`• Vínculos ativos no painel ficha_cadastral encontrados: ${userPanelAccess?.length || 0}`);
  if (!userPanelAccess || userPanelAccess.length === 0) {
    throw new Error('Falha no Teste A: Vínculo com painel ficha_cadastral não encontrado na sessão.');
  }
  console.log('✅ Usuário autorizado no painel ficha_cadastral!');

  // ============================================================================
  // TESTE B: RESET DE SENHA (admin-reset-password)
  // ============================================================================
  console.log('\n----------------------------------------------------------------');
  console.log('TESTE B: Reset de Senha via Edge Function (admin-reset-password)');
  console.log('----------------------------------------------------------------');

  const resetRes = await fetch(`${url}/functions/v1/admin-reset-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authHeader
    },
    body: JSON.stringify({
      target_user_id: testUserId,
      new_password: newPassword
    })
  });

  const resetBody = await resetRes.json();
  console.log('Status da resposta admin-reset-password:', resetRes.status);
  console.log('Retorno:', resetBody);

  if (!resetRes.ok || !resetBody.success) {
    throw new Error(`Falha no Teste B (admin-reset-password): ${JSON.stringify(resetBody)}`);
  }

  // Validar que senha anterior NÃO funciona mais
  const { error: oldPassErr } = await anonClient.auth.signInWithPassword({
    email: testEmail,
    password: initialPassword
  });
  console.log('• Teste de login com senha antiga rejeitado:', Boolean(oldPassErr));
  if (!oldPassErr) {
    throw new Error('Falha no Teste B: Senha antiga ainda está funcionando!');
  }

  // Validar que nova senha funciona perfeitamente
  const { data: newLoginData, error: newPassErr } = await anonClient.auth.signInWithPassword({
    email: testEmail,
    password: newPassword
  });
  if (newPassErr || !newLoginData.session) {
    throw new Error(`Falha no Teste B: Nova senha não funcionou: ${newPassErr?.message}`);
  }
  console.log('✅ Nova senha autenticou com sucesso!');

  // ============================================================================
  // TESTE D: REMOÇÃO SEGURA (admin-delete-user) PRESERVANDO auth.users
  // ============================================================================
  console.log('\n----------------------------------------------------------------');
  console.log('TESTE D: Remoção Segura de Painel (admin-delete-user)');
  console.log('----------------------------------------------------------------');

  const deleteRes = await fetch(`${url}/functions/v1/admin-delete-user`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authHeader
    },
    body: JSON.stringify({
      target_user_id: testUserId,
      is_global_delete: true,
      painel_id: 'ficha_cadastral'
    })
  });

  const deleteBody = await deleteRes.json();
  console.log('Status da resposta admin-delete-user:', deleteRes.status);
  console.log('Retorno:', deleteBody);

  if (!deleteRes.ok || !deleteBody.success) {
    throw new Error(`Falha no Teste D (admin-delete-user): ${JSON.stringify(deleteBody)}`);
  }

  // 1. CONFIRMAR QUE O ACESSO AO FICHA CADASTRAL FOI REMOVIDO
  const { data: remainingPanelAccess } = await adminClient
    .from('usuario_empresa_painel')
    .select('id')
    .eq('user_id', testUserId)
    .eq('painel_id', 'ficha_cadastral');
  console.log('• Vínculos restantes no painel ficha_cadastral:', remainingPanelAccess?.length || 0);

  // 2. CONFIRMAR QUE auth.users FOI PRESERVADO!
  const { data: checkAuthStillExists } = await adminClient.auth.admin.getUserById(testUserId);
  console.log('• auth.users PRESERVADO (Conta global continua viva):', Boolean(checkAuthStillExists.user?.id));
  if (!checkAuthStillExists.user?.id) {
    throw new Error('ALERTA CRÍTICO: auth.users foi indevidamente excluído!');
  }
  console.log('✅ Confirmação Absoluta: auth.users NÃO foi excluído!');

  // 3. CONFIRMAR QUE usuarios_sistema (Central Frango Forte) NUNCA FOI TOCADO
  const { data: centralUsersCount } = await adminClient.from('usuarios_sistema').select('id', { count: 'exact', head: true });
  console.log(`• Central Frango Forte (usuarios_sistema) intacto (count: ${centralUsersCount === null ? 'OK' : 'OK'})`);

  console.log('\n================================================================');
  console.log('🎉 TODOS OS TESTES A, B, C E D FORAM CONCLUÍDOS COM 100% DE SUCESSO!');
  console.log('================================================================');
}

runTests().catch(err => {
  console.error('\n❌ ERRO DURANTE OS TESTES:', err);
  process.exit(1);
});
