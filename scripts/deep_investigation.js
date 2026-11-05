import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

let serviceKey = '';
if (fs.existsSync('C:/Projetos/projetos-teste/.env')) {
  const m = fs.readFileSync('C:/Projetos/projetos-teste/.env', 'utf8').match(/SUPABASE_SERVICE_ROLE_KEY=["']?([^"'\r\n]+)/);
  if (m) serviceKey = m[1];
}

const supabaseUrl = 'https://ebixhddonbiqtrsyvdry.supabase.co';
const adminClient = createClient(supabaseUrl, serviceKey);

async function deepInvestigation() {
  console.log('=== INVESTIGAÇÃO PROFUNDA DE TODOS OS REGISTROS ===');

  // 1. Todas as empresas
  const { data: empresas } = await adminClient.from('empresas').select('*');
  console.log('Empresas:', empresas);

  // 2. Todos os setups em setups_aviarios (sem filtro de empresa)
  const { data: allSetups } = await adminClient.from('setups_aviarios').select('*');
  console.log(`Total geral de setups_aviarios: ${allSetups?.length}`);

  // 3. Todos os aviários
  const { data: allAviarios } = await adminClient.from('cadastro_aviarios').select('*, produtor:produtores(*), tecnico:tecnicos(*)');
  console.log(`Total geral de cadastro_aviarios: ${allAviarios?.length}`);

  // 4. Todos os produtores
  const { data: allProdutores } = await adminClient.from('produtores').select('*');
  console.log(`Total geral de produtores: ${allProdutores?.length}`);

  // Produtores por empresa
  const prodsPorEmpresa = {};
  allProdutores?.forEach(p => {
    prodsPorEmpresa[p.empresa_id] = (prodsPorEmpresa[p.empresa_id] || 0) + 1;
  });
  console.log('Produtores por empresa_id:', prodsPorEmpresa);

  // Aviarios por empresa
  const avsPorEmpresa = {};
  allAviarios?.forEach(a => {
    avsPorEmpresa[a.empresa_id] = (avsPorEmpresa[a.empresa_id] || 0) + 1;
  });
  console.log('Aviários por empresa_id:', avsPorEmpresa);

  // Setups por empresa
  const setupsPorEmpresa = {};
  allSetups?.forEach(s => {
    setupsPorEmpresa[s.empresa_id] = (setupsPorEmpresa[s.empresa_id] || 0) + 1;
  });
  console.log('Setups por empresa_id:', setupsPorEmpresa);

  // 5. Analisar campos não-nulos em setups_aviarios
  // Quais colunas existem na tabela setups_aviarios?
  if (allSetups && allSetups.length > 0) {
    const keys = Object.keys(allSetups[0]);
    console.log('\nTodas as chaves de setups_aviarios:', keys);

    // Para cada setup, quantas colunas não-nulas ele tem (desconsiderando id, aviario_id, created_at, updated_at, empresa_id, unidade)?
    const ignoreCols = new Set(['id', 'aviario_id', 'created_at', 'updated_at', 'empresa_id', 'unidade']);
    const dataCols = keys.filter(k => !ignoreCols.has(k));

    const setupsComAlgumDado = [];
    allSetups.forEach(s => {
      const nonNullFields = {};
      dataCols.forEach(c => {
        if (s[c] !== null && s[c] !== undefined && s[c] !== '' && s[c] !== false && s[c] !== 0) {
          nonNullFields[c] = s[c];
        }
      });
      if (Object.keys(nonNullFields).length > 0) {
        const av = allAviarios?.find(a => a.id === s.aviario_id);
        setupsComAlgumDado.push({
          setupId: s.id,
          aviarioId: s.aviario_id,
          numeroInstalacao: av?.numero_instalacao,
          produtorNome: av?.produtor?.nome,
          produtorId: av?.produtor_id,
          tecnicoNome: av?.tecnico?.nome,
          camposPreenchidosCount: Object.keys(nonNullFields).length,
          campos: nonNullFields,
          updated_at: s.updated_at
        });
      }
    });

    console.log(`\nSetups com algum campo preenchido (não nulo/não zero/não falso): ${setupsComAlgumDado.length}`);
    const prodsComSetupNaoNulo = new Set(setupsComAlgumDado.map(s => s.produtorNome));
    console.log(`Produtores com setups não-nulos: ${prodsComSetupNaoNulo.size}`);
    console.log(Array.from(prodsComSetupNaoNulo));

    // E se considerarmos booleanos como alarme_casa: false etc? Quantos foram modificados após a data inicial?
    const initialDate = '2026-08-28';
    const setupsModificadosDepois = allSetups.filter(s => {
      return s.updated_at && !s.updated_at.startsWith(initialDate);
    });
    console.log(`\nSetups com updated_at após 2026-08-28: ${setupsModificadosDepois.length}`);
    const prodsModificadosDepois = new Set();
    setupsModificadosDepois.forEach(s => {
      const av = allAviarios?.find(a => a.id === s.aviario_id);
      if (av?.produtor?.nome) prodsModificadosDepois.add(av.produtor.nome);
    });
    console.log(`Produtores desses setups modificados após 2026-08-28 (${prodsModificadosDepois.size}):`, Array.from(prodsModificadosDepois));
  }

  // 6. Verificar técnicos e contagem de produtores por técnico
  const prodsPorTecnico = {};
  allAviarios?.forEach(a => {
    const tecNome = a.tecnico?.nome || 'Sem Técnico';
    if (!prodsPorTecnico[tecNome]) prodsPorTecnico[tecNome] = new Set();
    if (a.produtor?.nome) prodsPorTecnico[tecNome].add(a.produtor.nome);
  });
  console.log('\nProdutores atendidos por cada técnico:');
  Object.entries(prodsPorTecnico).forEach(([tec, prods]) => {
    console.log(`- ${tec}: ${prods.size} produtores`);
  });

  // 7. Verificar se existe alguma outra tabela ou arquivo ou dado
  // Ex: importacoes
  const { data: importacoes } = await adminClient.from('importacoes').select('*');
  console.log('\nHistórico de Importações:', importacoes);
}

deepInvestigation().catch(console.error);

