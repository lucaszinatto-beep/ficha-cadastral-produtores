import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// ==============================================================================
// SCRIPT DE REPARAÇÃO DE USUÁRIOS: PAINEL FICHA CADASTRAL
// Seguro, idempotente, sem exclusões.
// Execução controlada via flag: --confirm-repair
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
  return { url, serviceKey };
}

async function runRepair() {
  const args = process.argv.slice(2);
  const isExecutionConfirmed = args.includes('--confirm-repair');

  console.log('================================================================================');
  console.log('🔧 SCRIPT DE REPARAÇÃO DE VÍNCULOS E ACESSO — FICHA CADASTRAL');
  console.log(`Modo: ${isExecutionConfirmed ? '⚠️ EXECUÇÃO ATIVA (--confirm-repair fornecido)' : '🔍 DRY-RUN / SIMULAÇÃO (Nenhuma alteração no banco)'}`);
  console.log('================================================================================\n');

  const { url, serviceKey } = getCredentials();
  if (!serviceKey) {
    console.error('❌ Chave administrativa (Service Role) não encontrada para auditoria.');
    process.exit(1);
  }

  const client = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  // Carregar dados
  const { data: authData } = await client.auth.admin.listUsers({ perPage: 1000 });
  const authUsers = authData?.users || [];
  const { data: profiles } = await client.from('profiles').select('*');
  const { data: usuarioEmpresaPainel } = await client.from('usuario_empresa_painel').select('*');
  const { data: usuariosEmpresas } = await client.from('usuarios_empresas').select('*');
  const { data: empresas } = await client.from('empresas').select('*');

  const belloEmpresaId = 'e1100000-0000-0000-0000-000000000001';

  console.log('[1] DIAGNÓSTICO DOS USUÁRIOS E PROPOSTAS DE CORREÇÃO:\n');

  const proposedActions: Array<{
    userId: string;
    email: string;
    action: string;
    reason: string;
    apply: () => Promise<void>;
  }> = [];

  // 1. Verificar João Vitor (joao.moraes@belloalimentos.com.br) - Email confirmado
  const joao = authUsers.find(u => u.email?.toLowerCase().trim() === 'joao.moraes@belloalimentos.com.br');
  if (joao && !joao.email_confirmed_at) {
    proposedActions.push({
      userId: joao.id,
      email: joao.email,
      action: 'CONFIRMAR_EMAIL_AUTH',
      reason: 'Usuário administrador está com email_confirmed_at = null, bloqueando login por senha.',
      apply: async () => {
        const { error } = await client.auth.admin.updateUserById(joao.id, { email_confirm: true });
        if (error) throw new Error(`Falha ao confirmar email de João: ${error.message}`);
        console.log(`  ✅ [${joao.email}] Email confirmado no Supabase Auth.`);
      }
    });
  }

  // 2. Verificar Extensionistas da Bello Alimentos com painel_id incorreto ('central_frango_forte')
  const extensionistasEmails = [
    'rosmir.mallmann@belloalimentos.com.br',
    'jailton.fonseca@belloalimentos.com.br',
    'raul.gameiro@belloalimentos.com.br',
    'edson.block@belloalimentos.com.br'
  ];

  for (const extEmail of extensionistasEmails) {
    const extUser = authUsers.find(u => u.email?.toLowerCase().trim() === extEmail);
    if (!extUser) continue;

    // Vínculos atuais
    const uepWrong = (usuarioEmpresaPainel || []).filter(uep => uep.user_id === extUser.id && uep.painel_id === 'central_frango_forte');
    const uepFicha = (usuarioEmpresaPainel || []).filter(uep => uep.user_id === extUser.id && uep.painel_id === 'ficha_cadastral');

    if (uepWrong.length > 0 && uepFicha.length === 0) {
      proposedActions.push({
        userId: extUser.id,
        email: extUser.email,
        action: 'CORRIGIR_PAINEL_ID_PARA_FICHA_CADASTRAL',
        reason: 'Usuário é extensionista da Bello Alimentos mas foi gravado em usuario_empresa_painel com painel_id = central_frango_forte. Não pertence ao Central.',
        apply: async () => {
          // Atualiza o registro em usuario_empresa_painel para ficha_cadastral
          for (const row of uepWrong) {
            const { error: updErr } = await client
              .from('usuario_empresa_painel')
              .update({
                painel_id: 'ficha_cadastral',
                ativo: true,
                updated_at: new Date().toISOString()
              })
              .eq('id', row.id);
            if (updErr) throw new Error(`Erro ao atualizar usuario_empresa_painel para ${extEmail}: ${updErr.message}`);
          }
          console.log(`  ✅ [${extEmail}] painel_id corrigido para 'ficha_cadastral' (ativo: true).`);
        }
      });
    }

    // Garantir vínculo em usuarios_empresas para Bello Alimentos
    const hasUeBello = (usuariosEmpresas || []).some(ue => (ue.user_id === extUser.id || ue.usuario_id === extUser.id) && ue.empresa_id === belloEmpresaId);
    if (!hasUeBello) {
      proposedActions.push({
        userId: extUser.id,
        email: extUser.email,
        action: 'CRIAR_VINCULO_USUARIOS_EMPRESAS',
        reason: 'Garantir vínculo na empresa Bello Alimentos para compatibilidade retroativa.',
        apply: async () => {
          const { error: insErr } = await client
            .from('usuarios_empresas')
            .upsert({
              user_id: extUser.id,
              empresa_id: belloEmpresaId,
              role: 'extensionista',
              level: 50,
              ativo: true
            }, { onConflict: 'user_id,empresa_id' });
          if (insErr) throw new Error(`Erro ao criar usuarios_empresas para ${extEmail}: ${insErr.message}`);
          console.log(`  ✅ [${extEmail}] Vínculo criado na tabela usuarios_empresas.`);
        }
      });
    }
  }

  // Exibir resumo das ações
  console.log(`Total de ações corretivas mapeadas: ${proposedActions.length}\n`);
  for (let i = 0; i < proposedActions.length; i++) {
    const act = proposedActions[i];
    console.log(`${i + 1}. [${act.action}] Usuário: ${act.email} (${act.userId})`);
    console.log(`   Motivo: ${act.reason}`);
  }

  if (!isExecutionConfirmed) {
    console.log('\n================================================================================');
    console.log('ℹ️ MODO SIMULAÇÃO CONCLUÍDO.');
    console.log('Para aplicar essas correções de forma segura e sem deleções, execute:');
    console.log('node --experimental-strip-types scripts/repair_ficha_cadastral_users.ts --confirm-repair');
    console.log('================================================================================');
    return;
  }

  // Executar correções
  console.log('\n[2] EXECUTANDO CORREÇÕES AUTORIZADAS...');
  for (const act of proposedActions) {
    await act.apply();
  }

  console.log('\n================================================================================');
  console.log('🎉 REPARAÇÃO CONCLUÍDA COM SUCESSO! Todos os vínculos foram restabelecidos.');
  console.log('================================================================================');
}

runRepair().catch(console.error);
