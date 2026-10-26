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

async function check() {
  const { url, serviceKey } = getCredentials();
  const supabase = createClient(url, serviceKey!);

  // Consultar pg_policies
  const { data, error } = await supabase.rpc('get_policies_for_table', { table_name: 'tecnicos' });
  if (error) {
    // tentar sql direto se rpc não existir
    console.log('RPC get_policies_for_table não existe:', error.message);
  } else {
    console.log('Policies em tecnicos:', data);
  }

  // Verificar se o técnico Bruno faganello existe
  const { data: tecExist } = await supabase.from('tecnicos').select('*').ilike('nome', '%bruno%');
  console.log('Técnico Bruno no banco:', tecExist);
}

check().catch(console.error);
