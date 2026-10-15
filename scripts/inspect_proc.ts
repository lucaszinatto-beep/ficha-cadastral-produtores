import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

let serviceKey = '';
if (fs.existsSync('C:/Projetos/projetos-teste/.env')) {
  const m = fs.readFileSync('C:/Projetos/projetos-teste/.env', 'utf8').match(/SUPABASE_SERVICE_ROLE_KEY=["']?([^"'\r\n]+)/);
  if (m) serviceKey = m[1];
}

const client = createClient('https://ebixhddonbiqtrsyvdry.supabase.co', serviceKey);

async function inspectProcs() {
  const { data, error } = await client.from('pg_proc').select('proname').limit(5);
  console.log('Direct pg_proc check:', { data, error });
}

inspectProcs().catch(console.error);
