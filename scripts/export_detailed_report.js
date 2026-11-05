import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

let serviceKey = '';
if (fs.existsSync('C:/Projetos/projetos-teste/.env')) {
  const m = fs.readFileSync('C:/Projetos/projetos-teste/.env', 'utf8').match(/SUPABASE_SERVICE_ROLE_KEY=["']?([^"'\r\n]+)/);
  if (m) serviceKey = m[1];
}

const supabaseUrl = 'https://ebixhddonbiqtrsyvdry.supabase.co';
const adminClient = createClient(supabaseUrl, serviceKey);

async function exportFullDetailedReport() {
  const belloId = 'e1100000-0000-0000-0000-000000000001';

  const { data: prods } = await adminClient.from('produtores').select('*').eq('empresa_id', belloId).order('nome');
  const { data: avs } = await adminClient.from('cadastro_aviarios').select('*, tecnico:tecnicos(*)').eq('empresa_id', belloId).order('numero_instalacao');
  const { data: setups } = await adminClient.from('setups_aviarios').select('*').eq('empresa_id', belloId);

  const setupsMap = new Map(setups?.map(s => [s.aviario_id, s]));

  // Identificar se tem dados reais
  function hasRealData(setup) {
    if (!setup) return false;
    return setup.pressao_vedacao_media !== null ||
           setup.pressao_trabalho_media !== null ||
           setup.ventilacao_media !== null ||
           setup.qtd_exaustores !== null;
  }

  const result = [];

  prods?.forEach(p => {
    const prodAvs = avs?.filter(a => a.produtor_id === p.id) || [];
    const avsComDados = prodAvs.filter(a => hasRealData(setupsMap.get(a.id)));
    const avsSemDados = prodAvs.filter(a => !hasRealData(setupsMap.get(a.id)));

    result.push({
      id: p.id,
      nome: p.nome,
      totalAviarios: prodAvs.length,
      aviariosComDadosCount: avsComDados.length,
      aviariosSemDadosCount: avsSemDados.length,
      status: avsComDados.length === prodAvs.length && prodAvs.length > 0 ? '100% PREENCHIDO' : (avsComDados.length > 0 ? 'PARCIALMENTE PREENCHIDO' : 'SEM SETUP'),
      aviariosComDados: avsComDados.map(a => ({
        instalacao: a.numero_instalacao,
        tecnico: a.tecnico?.nome,
        updated_at: setupsMap.get(a.id)?.updated_at,
        pressao_vedacao: setupsMap.get(a.id)?.pressao_vedacao_media,
        pressao_trabalho: setupsMap.get(a.id)?.pressao_trabalho_media,
        ventilacao: setupsMap.get(a.id)?.ventilacao_media,
        exaustores: setupsMap.get(a.id)?.qtd_exaustores
      })),
      aviariosSemDados: avsSemDados.map(a => ({
        instalacao: a.numero_instalacao,
        tecnico: a.tecnico?.nome
      }))
    });
  });

  fs.writeFileSync('scripts/relatorio_detalhado.json', JSON.stringify(result, null, 2));

  console.log('Relatório detalhado gerado com sucesso!');
  const comDados = result.filter(r => r.aviariosComDadosCount > 0);
  console.log('Produtores com dados reais no banco:', JSON.stringify(comDados, null, 2));
}

exportFullDetailedReport().catch(console.error);

