import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

function getCredentials() {
  const envFile = fs.readFileSync('.env', 'utf8');
  const env: Record<string, string> = {};
  envFile.split('\n').forEach(line => {
    const [k, ...v] = line.split('=');
    if (k && v.length) env[k.trim()] = v.join('=').trim().replace(/^['"]|['"]$/g, '');
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

async function audit() {
  const { url, serviceKey } = getCredentials();
  const supabase = createClient(url, serviceKey!);

  console.log('=== AUDITORIA COMPLETA DE ESTRUTURA DO BANCO ===');
  
  // 1. Listar Empresas cadastradas
  const { data: empresas, error: empErr } = await supabase.from('empresas').select('*');
  console.log('\n--- EMPRESAS CADASTRADAS ---');
  if (empErr) console.error('Erro empresas:', empErr);
  else console.table(empresas?.map(e => ({ id: e.id, nome: e.nome, slug: e.slug })));

  // 2. Colunas e Tipos de cada tabela principal
  const tables = ['produtores', 'tecnicos', 'cadastro_aviarios', 'setups_aviarios', 'importacoes'];
  
  for (const table of tables) {
    console.log(`\n--- TABELA: ${table} ---`);
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (error) {
      console.error(`Erro ao consultar ${table}:`, error.message);
      continue;
    }
    if (data && data.length > 0) {
      console.log('Colunas existentes:', Object.keys(data[0]));
      console.log('Exemplo de registro:', JSON.stringify(data[0], null, 2));
    } else {
      console.log('Tabela vazia ou sem retorno no limit 1.');
    }

    // Contagem por empresa_id
    const { data: allRows } = await supabase.from(table).select('empresa_id');
    const counts: Record<string, number> = {};
    (allRows || []).forEach((r: any) => {
      const eid = r.empresa_id || 'NULL/SEM_EMPRESA';
      counts[eid] = (counts[eid] || 0) + 1;
    });
    console.log(`Contagem de ${table} por empresa_id:`, counts);
  }
}

audit().catch(console.error);
