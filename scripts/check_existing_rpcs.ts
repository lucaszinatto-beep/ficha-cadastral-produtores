import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

let serviceKey = '';
if (fs.existsSync('C:/Projetos/projetos-teste/.env')) {
  const m = fs.readFileSync('C:/Projetos/projetos-teste/.env', 'utf8').match(/SUPABASE_SERVICE_ROLE_KEY=["']?([^"'\r\n]+)/);
  if (m) serviceKey = m[1];
}

const client = createClient('https://ebixhddonbiqtrsyvdry.supabase.co', serviceKey);

async function listFunctions() {
  const { data, error } = await client
    .rpc('get_my_level_in_empresa', { target_empresa_id: 'e1100000-0000-0000-0000-000000000001' });
  console.log('get_my_level_in_empresa result:', { data, error });

  const { data: rpc2, error: err2 } = await client.rpc('is_super_admin');
  console.log('is_super_admin result:', { rpc2, err2 });

  const { data: rpc3, error: err3 } = await client.rpc('admin_set_user_panel_access', {
    target_user_id: 'e6068e8f-3edb-4038-a768-4c20e50d24df',
    target_empresa_id: 'e1100000-0000-0000-0000-000000000001',
    target_painel_id: 'ficha_cadastral',
    target_role: 'super_admin',
    target_level: 100
  });
  console.log('admin_set_user_panel_access result:', { rpc3, err3 });

  const { data: rpc4, error: err4 } = await client.rpc('admin_get_panel_company_users', {
    p_empresa_id: 'e1100000-0000-0000-0000-000000000001',
    p_painel_id: 'ficha_cadastral'
  });
  console.log('admin_get_panel_company_users result:', { rpc4, err4 });
}

listFunctions().catch(console.error);
