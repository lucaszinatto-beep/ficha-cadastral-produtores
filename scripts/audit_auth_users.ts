import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// ==============================================================================
// SCRIPT DE AUDITORIA DE USUÁRIOS E AUTENTICAÇÃO SUPABASE (SOMENTE LEITURA)
// Projeto: PAINEL FICHA CADASTRAL — BELLO ALIMENTOS
// ==============================================================================

interface AuditResult {
  timestamp: string;
  supabaseProject: {
    url: string;
    projectRef: string;
    environment: string;
    serviceRoleConfigured: boolean;
  };
  sharedProjectsDetected: Array<{
    name: string;
    path: string;
    supabaseUrl: string;
    sharesSameSupabase: boolean;
  }>;
  counts: {
    authUsers: number;
    profiles: number;
    usuariosSistema: number;
    usuariosEmpresas: number;
    usuarioEmpresaPainel: number;
    empresas: number;
  };
  inconsistencies: {
    authWithoutProfiles: any[];
    profilesWithoutAuth: any[];
    authWithoutUsuariosSistema: any[];
    usuariosSistemaWithoutAuth: any[];
    usuariosEmpresasOrphans: any[];
    duplicateEmails: any[];
    usersCrossProjectSharing: any[];
  };
}

// 1. Carregar variáveis
function loadEnv() {
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

  // Verificar se há chave de serviço no ambiente ou projeto irmão para auditoria administrativa profunda
  let serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || envVars.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey && fs.existsSync('C:/Projetos/projetos-teste/.env')) {
    const siblingEnv = fs.readFileSync('C:/Projetos/projetos-teste/.env', 'utf8');
    const sMatch = siblingEnv.match(/SUPABASE_SERVICE_ROLE_KEY=["']?([^"'\r\n]+)/);
    if (sMatch) serviceKey = sMatch[1];
  }

  const url = process.env.VITE_SUPABASE_URL || envVars.VITE_SUPABASE_URL || 'https://ebixhddonbiqtrsyvdry.supabase.co';
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY || envVars.VITE_SUPABASE_ANON_KEY || '';

  return { url, anonKey, serviceKey };
}

async function runAudit() {
  console.log('================================================================================');
  console.log('🔍 INICIANDO AUDITORIA COMPLETA DE AUTENTICAÇÃO E ISOLAMENTO SUPABASE');
  console.log('Modo: ESTRITAMENTE SOMENTE LEITURA (Nenhuma alteração nem exclusão permitida)');
  console.log('================================================================================\n');

  const { url, anonKey, serviceKey } = loadEnv();
  const urlMatch = url.match(/https:\/\/([a-z0-9]+)\.supabase\.co/i);
  const projectRef = urlMatch ? urlMatch[1] : 'desconhecido';

  console.log(`[1] PROJETO SUPABASE IDENTIFICADO:`);
  console.log(`  - URL: ${url}`);
  console.log(`  - Project ID / Ref: ${projectRef}`);
  console.log(`  - Anon Key configurada: ${anonKey ? 'SIM (' + anonKey.slice(0, 15) + '...)' : 'NÃO'}`);
  console.log(`  - Service Role Key disponível para auditoria: ${serviceKey ? 'SIM (chave protegida)' : 'NÃO'}`);

  // 2. Verificar outros projetos locais que compartilham o mesmo Supabase
  const candidateProjects = [
    { name: 'Central Frango Forte', dir: 'C:/Projetos/projetos-teste' },
    { name: 'Projeto APPFinanças', dir: 'C:/Projetos/Projeto_APPFinanças' },
    { name: 'IAcampo', dir: 'C:/Projetos/IAcampo' },
    { name: 'Custo Suíno', dir: 'C:/Projetos/Custo Suíno' }
  ];

  console.log(`\n[2] INVESTIGAÇÃO DE PROJETOS COMPARTILHADOS NO AMBIENTE:`);
  const sharedProjects: any[] = [];
  for (const proj of candidateProjects) {
    const envFile = path.join(proj.dir, '.env');
    if (fs.existsSync(envFile)) {
      const content = fs.readFileSync(envFile, 'utf8');
      const uMatch = content.match(/SUPABASE_URL=["']?([^"'\r\n]+)/i) || content.match(/VITE_SUPABASE_URL=["']?([^"'\r\n]+)/i);
      const projUrl = uMatch ? uMatch[1] : 'não especificada';
      const isShared = projUrl.includes(projectRef);
      console.log(`  - ${proj.name}:`);
      console.log(`      Diretório: ${proj.dir}`);
      console.log(`      URL Supabase: ${projUrl}`);
      console.log(`      COMPARTILHA O MESMO SUPABASE? ${isShared ? '🚨 SIM! (RISCO CRÍTICO DE INTERFERÊNCIA)' : 'NÃO'}`);
      sharedProjects.push({ name: proj.name, path: proj.dir, supabaseUrl: projUrl, sharesSameSupabase: isShared });
    } else {
      console.log(`  - ${proj.name}: sem arquivo .env detectado`);
    }
  }

  // 3. Conexão ao Supabase
  const client = createClient(url, serviceKey || anonKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  // 4. Auditoria de auth.users
  let authUsers: any[] = [];
  if (serviceKey) {
    const { data, error } = await client.auth.admin.listUsers({ perPage: 1000 });
    if (error) {
      console.error(`  [ERRO] Falha ao listar auth.users: ${error.message}`);
    } else {
      authUsers = data.users || [];
    }
  }

  // 5. Tabelas do Banco de Dados
  const { data: profiles, error: errProfiles } = await client.from('profiles').select('*');
  const { data: usuariosSistema, error: errUS } = await client.from('usuarios_sistema').select('*');
  const { data: usuariosEmpresas, error: errUE } = await client.from('usuarios_empresas').select('*');
  const { data: usuarioEmpresaPainel, error: errUEP } = await client.from('usuario_empresa_painel').select('*');
  const { data: empresas, error: errEmp } = await client.from('empresas').select('*');

  console.log(`\n[3] CONTAGEM DE REGISTROS NA BASE DE DADOS (${projectRef}):`);
  console.log(`  - auth.users (Supabase Auth Global): ${authUsers.length}`);
  console.log(`  - public.profiles: ${profiles ? profiles.length : 'Erro: ' + errProfiles?.message}`);
  console.log(`  - public.usuarios_sistema (tabela da Central Frango Forte): ${usuariosSistema ? usuariosSistema.length : 'Erro: ' + errUS?.message}`);
  console.log(`  - public.usuarios_empresas (multiempresa Ficha Cadastral): ${usuariosEmpresas ? usuariosEmpresas.length : 'Erro: ' + errUE?.message}`);
  console.log(`  - public.usuario_empresa_painel (painéis Ficha Cadastral): ${usuarioEmpresaPainel ? usuarioEmpresaPainel.length : 'Erro/Inexistente: ' + errUEP?.message}`);
  console.log(`  - public.empresas: ${empresas ? empresas.length : 'Erro: ' + errEmp?.message}`);

  // 6. Análise de Inconsistências e Cruzamento de Dados
  console.log(`\n[4] DIAGNÓSTICO DETALHADO DE INCONSISTÊNCIAS E USUÁRIOS:`);

  const authMap = new Map<string, any>(authUsers.map(u => [u.id, u]));
  const authEmailMap = new Map<string, any>(authUsers.map(u => [(u.email || '').toLowerCase().trim(), u]));
  const profMap = new Map<string, any>((profiles || []).map(p => [p.id, p]));
  const profEmailMap = new Map<string, any>((profiles || []).map(p => [(p.email || '').toLowerCase().trim(), p]));
  const usMap = new Map<string, any>((usuariosSistema || []).map(u => [u.id, u]));
  const usEmailMap = new Map<string, any>((usuariosSistema || []).map(u => [(u.email || '').toLowerCase().trim(), u]));

  // A) auth.users sem usuarios_sistema
  const authWithoutUS = authUsers.filter(u => !usMap.has(u.id) && !usEmailMap.has((u.email || '').toLowerCase().trim()));
  console.log(`\n  A) Usuários no auth.users que NÃO existem em usuarios_sistema (${authWithoutUS.length}):`);
  authWithoutUS.forEach(u => console.log(`     - [${u.id}] ${u.email}`));

  // B) usuarios_sistema sem auth.users
  const usWithoutAuth = (usuariosSistema || []).filter(u => !authMap.has(u.id) && !authEmailMap.has((u.email || '').toLowerCase().trim()));
  console.log(`\n  B) Usuários em usuarios_sistema que NÃO possuem conta no auth.users (${usWithoutAuth.length}):`);
  usWithoutAuth.forEach(u => console.log(`     - [${u.id}] ${u.email} (${u.nome}) - papel: ${u.papel}`));

  // C) profiles sem auth.users
  const profWithoutAuth = (profiles || []).filter(p => !authMap.has(p.id));
  console.log(`\n  C) Perfis em profiles sem auth.users correspondente (${profWithoutAuth.length}):`);
  profWithoutAuth.forEach(p => console.log(`     - [${p.id}] ${p.email || p.full_name}`));

  // D) auth.users sem profiles
  const authWithoutProf = authUsers.filter(u => !profMap.has(u.id));
  console.log(`\n  D) Usuários em auth.users sem registro em profiles (${authWithoutProf.length}):`);
  authWithoutProf.forEach(u => console.log(`     - [${u.id}] ${u.email}`));

  // E) Vínculos em usuarios_empresas sem usuário correspondente
  const ueOrphans = (usuariosEmpresas || []).filter(ue => {
    const uid = ue.user_id || ue.usuario_id;
    return !authMap.has(uid) && !profMap.has(uid);
  });
  console.log(`\n  E) Vínculos em usuarios_empresas órfãos (sem user no Auth ou Profile) (${ueOrphans.length}):`);
  ueOrphans.forEach(ue => console.log(`     - user_id: ${ue.user_id || ue.usuario_id}, empresa_id: ${ue.empresa_id}`));

  // F) Usuários compartilhados entre Central Frango Forte e Ficha Cadastral
  console.log(`\n  F) Cruzamento de Usuários (Central Frango Forte vs Ficha Cadastral):`);
  for (const u of authUsers) {
    const inUS = usMap.has(u.id) || usEmailMap.has((u.email || '').toLowerCase().trim());
    const inProfiles = profMap.has(u.id);
    const inUE = (usuariosEmpresas || []).some(ue => (ue.user_id === u.id || ue.usuario_id === u.id));
    const inUEP = (usuarioEmpresaPainel || []).some(uep => uep.user_id === u.id);

    console.log(`     - ${u.email} (UUID: ${u.id}):`);
    console.log(`         • Está em usuarios_sistema (Central Frango Forte): ${inUS ? 'SIM' : 'NÃO'}`);
    console.log(`         • Está em profiles: ${inProfiles ? 'SIM' : 'NÃO'}`);
    console.log(`         • Possui empresas em usuarios_empresas (Ficha Cadastral): ${inUE ? 'SIM' : 'NÃO'}`);
    console.log(`         • Possui painel em usuario_empresa_painel: ${inUEP ? 'SIM' : 'NÃO'}`);
  }

  console.log('\n================================================================================');
  console.log('✅ AUDITORIA CONCLUÍDA COM SUCESSO (SOMENTE LEITURA).');
  console.log('================================================================================');
}

runAudit().catch(err => {
  console.error('Falha na execução da auditoria:', err);
  process.exit(1);
});
