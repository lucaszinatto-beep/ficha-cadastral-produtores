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

async function dumpUsersData() {
  const { data: authData } = await client.auth.admin.listUsers({ perPage: 100 });
  const { data: profiles } = await client.from('profiles').select('*');
  const { data: ue } = await client.from('usuarios_empresas').select('*');
  const { data: uep } = await client.from('usuario_empresa_painel').select('*');
  const { data: us } = await client.from('usuarios_sistema').select('*');
  const { data: emp } = await client.from('empresas').select('id, nome, slug');

  console.log('=== USERS IN AUTH.USERS ===');
  for (const u of authData?.users || []) {
    console.log(`ID: ${u.id}`);
    console.log(`  Email: ${u.email}`);
    console.log(`  Confirmed: ${Boolean(u.email_confirmed_at)}`);
    console.log(`  Created: ${u.created_at}`);
    console.log(`  Metadata:`, u.user_metadata);
  }

  console.log('\n=== PROFILES ===');
  console.log(JSON.stringify(profiles, null, 2));

  console.log('\n=== USUARIOS_SISTEMA ===');
  console.log(JSON.stringify(us, null, 2));

  console.log('\n=== USUARIOS_EMPRESAS ===');
  console.log(JSON.stringify(ue, null, 2));

  console.log('\n=== USUARIO_EMPRESA_PAINEL ===');
  console.log(JSON.stringify(uep, null, 2));
}

dumpUsersData().catch(console.error);
