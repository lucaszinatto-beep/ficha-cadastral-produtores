import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

let serviceKey = '';
if (fs.existsSync('C:/Projetos/projetos-teste/.env')) {
  const m = fs.readFileSync('C:/Projetos/projetos-teste/.env', 'utf8').match(/SUPABASE_SERVICE_ROLE_KEY=["']?([^"'\r\n]+)/);
  if (m) serviceKey = m[1];
}

const client = createClient('https://ebixhddonbiqtrsyvdry.supabase.co', serviceKey);

async function check() {
  const { data: tecs } = await client.from('tecnicos').select('id, nome, email, status, empresa_id');
  console.log('Técnicos cadastrados no Ficha Cadastral:', tecs);

  // Check RPC admin_reset_user_password signature in PostgreSQL
  const { data: rpcInfo, error: rpcErr } = await client.rpc('admin_reset_user_password', {
    target_user_id: '00000000-0000-0000-0000-000000000000',
    new_password: 'testpassword123'
  });
  console.log('Test RPC admin_reset_user_password:', { rpcInfo, rpcErr });
}

check().catch(console.error);
