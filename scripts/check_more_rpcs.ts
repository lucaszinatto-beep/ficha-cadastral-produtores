import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

let serviceKey = '';
if (fs.existsSync('C:/Projetos/projetos-teste/.env')) {
  const m = fs.readFileSync('C:/Projetos/projetos-teste/.env', 'utf8').match(/SUPABASE_SERVICE_ROLE_KEY=["']?([^"'\r\n]+)/);
  if (m) serviceKey = m[1];
}

const client = createClient('https://ebixhddonbiqtrsyvdry.supabase.co', serviceKey);

async function listMoreFunctions() {
  const { data: rpc1, error: err1 } = await client.rpc('admin_remove_user_from_panel', {
    target_user_id: 'e6068e8f-3edb-4038-a768-4c20e50d24df',
    target_empresa_id: 'e1100000-0000-0000-0000-000000000001',
    target_painel_id: 'ficha_cadastral'
  });
  console.log('admin_remove_user_from_panel result:', { rpc1, err1 });

  const { data: rpc2, error: err2 } = await client.rpc('admin_reset_user_password', {
    target_user_id: 'e6068e8f-3edb-4038-a768-4c20e50d24df',
    new_password: 'test'
  });
  console.log('admin_reset_user_password result:', { rpc2, err2 });

  const { data: rpc3, error: err3 } = await client.rpc('admin_delete_user', {
    target_user_id: 'e6068e8f-3edb-4038-a768-4c20e50d24df'
  });
  console.log('admin_delete_user result:', { rpc3, err3 });
}

listMoreFunctions().catch(console.error);
