import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// ==============================================================================
// SCRIPT DE AUDITORIA DE USUÁRIOS: PAINEL FICHA CADASTRAL (SOMENTE LEITURA)
// ==============================================================================

function getCredentials() {
  const envPath = path.resolve(process.cwd(), '.env');
  const envVars: Record<string, string> = {};
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        let val = (match[2] || '').trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        envVars[match[1]] = val;
      }
    }
  }

  let serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || envVars.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey && fs.existsSync('C:/Projetos/projetos-teste/.env')) {
    const sMatch = fs.readFileSync('C:/Projetos/projetos-teste/.env', 'utf8').match(/SUPABASE_SERVICE_ROLE_KEY=["']?([^"'\r\n]+)/);
    if (sMatch) serviceKey = sMatch[1];
  }

  const url = process.env.VITE_SUPABASE_URL || envVars.VITE_SUPABASE_URL || 'https://ebixhddonbiqtrsyvdry.supabase.co';
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY || envVars.VITE_SUPABASE_ANON_KEY || '';

  return { url, anonKey, serviceKey };
}

async function runFichaCadastralAudit() {
  console.log('================================================================================');
  console.log('📋 AUDITORIA INDIVIDUALIZADA DE USUÁRIOS — PAINEL FICHA CADASTRAL');
  console.log('Modo: SOMENTE LEITURA');
  console.log('================================================================================\n');

  const { url, serviceKey, anonKey } = getCredentials();
  const client = createClient(url, serviceKey || anonKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  // 1. Obter Auth Users
  let authUsers: any[] = [];
  if (serviceKey) {
    const { data, error } = await client.auth.admin.listUsers({ perPage: 1000 });
    if (!error && data) {
      authUsers = data.users || [];
    }
  }

  // 2. Obter Tabelas
  const { data: profiles } = await client.from('profiles').select('*');
  const { data: empresas } = await client.from('empresas').select('*');
  const { data: usuariosEmpresas } = await client.from('usuarios_empresas').select('*');
  const { data: usuarioEmpresaPainel } = await client.from('usuario_empresa_painel').select('*');
  const { data: usuariosSistema } = await client.from('usuarios_sistema').select('*');

  const empMap = new Map((empresas || []).map(e => [e.id, e.nome]));
  const profMap = new Map((profiles || []).map(p => [p.id, p]));
  const usMap = new Map((usuariosSistema || []).map(u => [u.id, u]));

  console.log(`Total de contas em auth.users: ${authUsers.length}`);
  console.log(`Total de perfis em public.profiles: ${profiles?.length || 0}`);
  console.log(`Total de empresas cadastradas: ${empresas?.length || 0}\n`);

  for (const user of authUsers) {
    const email = user.email || '(sem email)';
    const authId = user.id;
    const profile = profMap.get(authId);
    
    // Vínculos em usuarios_empresas
    const userUE = (usuariosEmpresas || []).filter(ue => (ue.user_id === authId || ue.usuario_id === authId));
    
    // Vínculos em usuario_empresa_painel
    const userUEP = (usuarioEmpresaPainel || []).filter(uep => uep.user_id === authId);

    // Identificar se pertence a outro sistema (ex: Central Frango Forte)
    const inCentralSistema = usMap.has(authId) || (usuariosSistema || []).some(us => us.email?.toLowerCase().trim() === email.toLowerCase().trim());
    const hasCentralPanel = userUEP.some(uep => uep.painel_id === 'central_frango_forte');
    const hasFichaPanel = userUEP.some(uep => uep.painel_id === 'ficha_cadastral');

    // Determinar empresas
    const empresasNomesUE = userUE.map(ue => empMap.get(ue.empresa_id) || ue.empresa_id).join(', ') || 'Nenhuma';
    const empresasNomesUEP = userUEP.map(uep => `${empMap.get(uep.empresa_id) || uep.empresa_id} [${uep.painel_id}]`).join(', ') || 'Nenhum';

    // Status no Ficha Cadastral
    const isAtivoFicha = userUE.some(ue => ue.ativo) || userUEP.some(uep => uep.ativo && uep.painel_id === 'ficha_cadastral');
    
    let statusAcessoFicha = 'BLOQUEADO';
    let conflito = 'Nenhum';

    if (profile?.role === 'super_admin' || (profile?.level ?? 0) >= 100) {
      statusAcessoFicha = 'OK (SUPER ADMIN - ACESSO TOTAL)';
    } else if (hasFichaPanel && isAtivoFicha) {
      statusAcessoFicha = 'OK (ACESSO LIBERADO)';
    } else if (hasCentralPanel && !hasFichaPanel) {
      statusAcessoFicha = 'BLOQUEADO NO LOGIN (painel_id incorreto: central_frango_forte)';
      conflito = '🚨 Vínculo gravado com painel_id de outro sistema! Usuário não consegue logar nem aparece na lista da Ficha.';
    } else if (!hasFichaPanel && !hasCentralPanel && userUE.length > 0) {
      statusAcessoFicha = 'ACESSO LEGADO (Apenas em usuarios_empresas)';
      conflito = '⚠️ Falta vínculo explícito em usuario_empresa_painel com painel_id = ficha_cadastral.';
    } else {
      statusAcessoFicha = 'SEM ACESSO AO FICHA CADASTRAL';
    }

    console.log('--------------------------------------------------------------------------------');
    console.log(`EMAIL:            ${email}`);
    console.log(`AUTH USER ID:     ${authId}`);
    console.log(`EMAIL CONFIRMADO: ${Boolean(user.email_confirmed_at) ? 'SIM' : 'NÃO (BLOQUEIA LOGIN COM SENHA!)'}`);
    console.log(`PROFILE:          ${profile ? `OK (Cargo: ${profile.role}, Nível: ${profile.level}, Nome: ${profile.full_name || profile.nome || 'N/A'})` : 'INEXISTENTE'}`);
    console.log(`USUARIO_EMPRESA:  ${userUE.length > 0 ? `OK (${userUE.length} vínculos: ${empresasNomesUE})` : 'NENHUM'}`);
    console.log(`PAINEL(IS):       ${userUEP.length > 0 ? empresasNomesUEP : 'NENHUM'}`);
    console.log(`STATUS NO PAINEL: ${isAtivoFicha ? 'ATIVO' : 'INATIVO'}`);
    console.log(`ACESSO FICHA:     ${statusAcessoFicha}`);
    if (inCentralSistema) {
      console.log(`OUTROS SISTEMAS:  Central Frango Forte (presente em usuarios_sistema)`);
    }
    if (conflito !== 'Nenhum') {
      console.log(`POSSÍVEL CONFLITO:${conflito}`);
    }
  }

  console.log('--------------------------------------------------------------------------------\n');
}

runFichaCadastralAudit().catch(console.error);
