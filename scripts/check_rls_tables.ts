import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

let supabaseUrl = 'https://ebixhddonbiqtrsyvdry.supabase.co';
let serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceKey && fs.existsSync('C:/Projetos/projetos-teste/.env')) {
  const content = fs.readFileSync('C:/Projetos/projetos-teste/.env', 'utf8');
  const match = content.match(/SUPABASE_SERVICE_ROLE_KEY=["']?([^"'\r\n]+)/);
  if (match) serviceKey = match[1];
}

const client = createClient(supabaseUrl, serviceKey!);

async function checkRLS() {
  // Query pg_tables and pg_policies via RPC or postgres query
  // We can query pg_catalog using postgres connection or test policies
  console.log('--- TESTING POLICIES AND SCHEMAS ---');
  
  // Test reading tables with anon client vs admin client
  const anonKey = 'sb_publishable_Fgi4B-Ad1liJpTku0WD8DA_2eb5OXsC';
  const anonClient = createClient(supabaseUrl, anonKey);

  const tables = [
    'profiles',
    'usuarios_sistema',
    'usuarios_empresas',
    'usuario_empresa_painel',
    'empresas',
    'produtores',
    'cadastro_aviarios',
    'tecnicos',
    'setups_aviarios',
    'auditoria_usuarios'
  ];

  for (const t of tables) {
    const { data: aData, error: aErr } = await anonClient.from(t).select('*').limit(1);
    const { data: sData, error: sErr } = await client.from(t).select('*').limit(1);
    console.log(`Tabela: ${t}`);
    console.log(`  - Anon: ${aErr ? 'BLOCKED/ERROR (' + aErr.message + ')' : 'ALLOWED (' + (aData?.length || 0) + ' rows)'}`);
    console.log(`  - Admin: ${sErr ? 'ERROR (' + sErr.message + ')' : 'ALLOWED (' + (sData?.length || 0) + ' rows)'}`);
  }
}

checkRLS().catch(console.error);
