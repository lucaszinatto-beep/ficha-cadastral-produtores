import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

let serviceKey = '';
if (fs.existsSync('C:/Projetos/projetos-teste/.env')) {
  const m = fs.readFileSync('C:/Projetos/projetos-teste/.env', 'utf8').match(/SUPABASE_SERVICE_ROLE_KEY=["']?([^"'\r\n]+)/);
  if (m) serviceKey = m[1];
}

const supabaseUrl = 'https://ebixhddonbiqtrsyvdry.supabase.co';
const adminClient = createClient(supabaseUrl, serviceKey);

async function inspectAllColumns() {
  const belloId = 'e1100000-0000-0000-0000-000000000001';

  // 1. Obter estrutura de 1 linha completa
  const { data: allSetups } = await adminClient
    .from('setups_aviarios')
    .select('*')
    .eq('empresa_id', belloId);

  if (!allSetups || allSetups.length === 0) {
    console.log('Nenhum setup encontrado');
    return;
  }

  const sample = allSetups[0];
  const columns = Object.keys(sample);
  console.log('Colunas de setups_aviarios:', columns);

  // 2. Para cada linha, contar quantos campos não são nulos (excluindo id, aviario_id, empresa_id, created_at, updated_at)
  const ignoredCols = new Set(['id', 'aviario_id', 'empresa_id', 'created_at', 'updated_at', 'created_by_id', 'created_by_name', 'updated_by_id', 'updated_by_name']);
  const dataCols = columns.filter(c => !ignoredCols.has(c));
  console.log('Colunas de dados técnicos:', dataCols);

  const setupsWithData = allSetups.map(s => {
    let filledCount = 0;
    const filledFields: string[] = [];
    dataCols.forEach(col => {
      const val = (s as any)[col];
      if (val !== null && val !== undefined && val !== '') {
        filledCount++;
        filledFields.push(`${col}=${val}`);
      }
    });
    return {
      id: s.id,
      aviario_id: s.aviario_id,
      filledCount,
      filledFields,
      updated_at: s.updated_at
    };
  });

  const filledSetups = setupsWithData.filter(s => s.filledCount > 0);
  console.log(`\nTotal de setups com pelo menos 1 campo de dados preenchido: ${filledSetups.length} de ${allSetups.length}`);

  // Agrupar por quantidade de campos preenchidos
  const countsMap = new Map<number, number>();
  setupsWithData.forEach(s => {
    countsMap.set(s.filledCount, (countsMap.get(s.filledCount) || 0) + 1);
  });
  console.log('\nDistribuição de campos preenchidos:', Array.from(countsMap.entries()).sort((a,b) => b[0] - a[0]));

  // Buscar aviários e produtores para mapear
  const { data: aviarios } = await adminClient
    .from('cadastro_aviarios')
    .select('id, numero_instalacao, produtor_id, produtor:produtores(id, nome)')
    .eq('empresa_id', belloId);

  const avMap = new Map((aviarios || []).map(a => [a.id, a]));

  console.log('\n--- DETALHES DOS SETUPS COM DADOS PREENCHIDOS ---');
  const produtoresComSetupSet = new Set<string>();
  filledSetups.forEach((s, idx) => {
    const av: any = avMap.get(s.aviario_id);
    const prodNome = av?.produtor?.nome || 'Desconhecido';
    if (av?.produtor_id) produtoresComSetupSet.add(av.produtor_id);
    console.log(`${idx + 1}. Produtor: ${prodNome} | Aviário: ${av?.numero_instalacao} | Campos (${s.filledCount}): ${s.filledFields.slice(0, 5).join(', ')}...`);
  });

  console.log(`\nTotal de Produtores únicos com setups preenchidos: ${produtoresComSetupSet.size}`);

  // E quais outras tabelas existem no Supabase? Ex: tem outra tabela de fichas ou aviarios?
  // Vamos verificar todas as tabelas
  const { data: tables } = await adminClient.rpc('get_my_level_in_empresa', { target_empresa_id: belloId });
}

inspectAllColumns().catch(console.error);

