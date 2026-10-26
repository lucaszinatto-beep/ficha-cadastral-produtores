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

async function dumpLists() {
  const { url, serviceKey } = getCredentials();
  const supabase = createClient(url, serviceKey!);

  const { data: tecnicos } = await supabase.from('tecnicos').select('nome').order('nome');
  const { data: produtores } = await supabase.from('produtores').select('nome').order('nome');
  const { data: aviarios } = await supabase.from('cadastro_aviarios').select('numero_instalacao').order('numero_instalacao');

  const uniqueInstalacoes = Array.from(new Set((aviarios || []).map(a => a.numero_instalacao).filter(Boolean)));
  // sort naturally
  uniqueInstalacoes.sort((a, b) => {
    const na = parseInt(a, 10);
    const nb = parseInt(b, 10);
    if (!isNaN(na) && !isNaN(nb)) return na - nb;
    return a.localeCompare(b);
  });

  fs.writeFileSync('scripts/db_lists.json', JSON.stringify({
    tecnicos: (tecnicos || []).map(t => t.nome),
    produtores: (produtores || []).map(p => p.nome),
    instalacoes: uniqueInstalacoes
  }, null, 2));

  console.log('Total técnicos:', tecnicos?.length);
  console.log('Total produtores:', produtores?.length);
  console.log('Total instalações únicas:', uniqueInstalacoes.length);
}

dumpLists().catch(console.error);
