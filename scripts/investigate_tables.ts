import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

let serviceKey = '';
if (fs.existsSync('C:/Projetos/projetos-teste/.env')) {
  const m = fs.readFileSync('C:/Projetos/projetos-teste/.env', 'utf8').match(/SUPABASE_SERVICE_ROLE_KEY=["']?([^"'\r\n]+)/);
  if (m) serviceKey = m[1];
}

const supabaseUrl = 'https://ebixhddonbiqtrsyvdry.supabase.co';
const adminClient = createClient(supabaseUrl, serviceKey);

async function investigateEverything() {
  console.log('=== INVESTIGAÇÃO COMPLETA DE TABELAS E DADOS ===\n');

  // 1. Todas as empresas em 'empresas'
  const { data: empresas } = await adminClient.from('empresas').select('*');
  console.log('Empresas no banco:', empresas?.map(e => ({ id: e.id, nome: e.nome, slug: e.slug })));

  // 2. Setups_aviarios SEM FILTRO de empresa_id
  const { data: allSetupsNoFilter } = await adminClient.from('setups_aviarios').select('id, aviario_id, empresa_id, pressao_vedacao_media, ventilacao_media, updated_at');
  console.log(`Total geral em setups_aviarios (sem filtro): ${allSetupsNoFilter?.length}`);
  
  // Agrupar setups por empresa_id
  const setupsByEmpresa = new Map();
  allSetupsNoFilter?.forEach(s => {
    const emp = s.empresa_id || 'SEM_EMPRESA_ID';
    setupsByEmpresa.set(emp, (setupsByEmpresa.get(emp) || 0) + 1);
  });
  console.log('Setups por empresa_id:', Object.fromEntries(setupsByEmpresa));

  // 3. Verificar colunas de cadastro_aviarios
  const { data: sampleAviarios } = await adminClient.from('cadastro_aviarios').select('*').limit(5);
  console.log('\nColunas de cadastro_aviarios:', Object.keys(sampleAviarios?.[0] || {}));
  console.log('Amostra de 1 aviário:', sampleAviarios?.[0]);

  // Verificar aviários com campos técnicos em cadastro_aviarios se houver
  const { data: allAviarios } = await adminClient.from('cadastro_aviarios').select('*');
  console.log(`Total de aviários no banco (sem filtro): ${allAviarios?.length}`);
  const aviariosByEmpresa = new Map();
  allAviarios?.forEach(a => {
    const emp = a.empresa_id || 'SEM_EMPRESA_ID';
    aviariosByEmpresa.set(emp, (aviariosByEmpresa.get(emp) || 0) + 1);
  });
  console.log('Aviários por empresa_id:', Object.fromEntries(aviariosByEmpresa));

  // 4. Verificar se existe alguma outra tabela relacionada a setup ou ficha
  // Vamos consultar tabelas via information_schema
  const { data: tables, error: tErr } = await adminClient.rpc('get_my_level_in_empresa', { target_empresa_id: 'e1100000-0000-0000-0000-000000000001' });

  // Vamos tentar dar select em possíveis tabelas:
  const possibleTables = [
    'fichas',
    'fichas_tecnicas',
    'fichas_setup',
    'setup',
    'setups',
    'setups_produtores',
    'importacoes',
    'importacoes_itens',
    'historico_importacoes'
  ];

  for (const t of possibleTables) {
    const { data, error } = await adminClient.from(t).select('id').limit(1);
    if (!error) {
      const { count } = await adminClient.from(t).select('*', { count: 'exact', head: true });
      console.log(`TABELA ENCONTRADA: "${t}" com ${count} registros!`);
    }
  }

  // 5. Verificar em importacoes
  const { data: importacoes } = await adminClient.from('importacoes').select('*').order('created_at', { ascending: false }).limit(5);
  console.log('\nÚltimas importações:', importacoes?.map(i => ({
    id: i.id,
    arquivo: i.nome_arquivo || i.arquivo_nome,
    tipo: i.tipo,
    empresa_id: i.empresa_id,
    linhas_processadas: i.linhas_processadas,
    created_at: i.created_at
  })));

  // 6. Verificar se algum produtor tem flag ou campo em 'produtores'
  const { data: sampleProdutores } = await adminClient.from('produtores').select('*').limit(5);
  console.log('\nColunas de produtores:', Object.keys(sampleProdutores?.[0] || {}));
}

investigateEverything().catch(console.error);

