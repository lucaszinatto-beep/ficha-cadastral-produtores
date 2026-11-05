import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

let serviceKey = '';
if (fs.existsSync('C:/Projetos/projetos-teste/.env')) {
  const m = fs.readFileSync('C:/Projetos/projetos-teste/.env', 'utf8').match(/SUPABASE_SERVICE_ROLE_KEY=["']?([^"'\r\n]+)/);
  if (m) serviceKey = m[1];
}

const supabaseUrl = 'https://ebixhddonbiqtrsyvdry.supabase.co';
const adminClient = createClient(supabaseUrl, serviceKey);

async function inspectSetupsContent() {
  const belloId = 'e1100000-0000-0000-0000-000000000001';

  const { data: setups } = await adminClient
    .from('setups_aviarios')
    .select('*')
    .eq('empresa_id', belloId);

  const { data: aviarios } = await adminClient
    .from('cadastro_aviarios')
    .select('id, numero_instalacao, produtor_id, produtor:produtores(id, nome)')
    .eq('empresa_id', belloId);

  const { data: produtores } = await adminClient
    .from('produtores')
    .select('id, nome')
    .eq('empresa_id', belloId);

  console.log('Total setups gravados:', setups?.length);

  // Vamos inspecionar as colunas dos setups para ver quais registros possuem dados reais vs registros vazios/default
  // Ex: pressao_vedacao_media, ventilacao_media, created_at, updated_at, fotos, observacoes, created_by_name
  
  // Critério A: Tem algum campo preenchido além do ID e empresa_id?
  const setupsPreenchidos = (setups || []).filter(s => {
    // Verificar se tem medições reais
    const hasMedicoes = s.pressao_vedacao_media !== null || 
                        s.pressao_trabalho_media !== null || 
                        s.ventilacao_media !== null || 
                        s.lux_100 !== null ||
                        s.altura_media !== null ||
                        s.qtd_exaustores !== null;
    return hasMedicoes;
  });

  console.log('Setups com medições não-nulas:', setupsPreenchidos.length);

  // Vamos ver quais valores distintos existem em created_by_name ou updated_by_name ou timestamps
  const createdBySet = new Set((setups || []).map(s => s.created_by_name).filter(Boolean));
  console.log('Criadores de setup:', Array.from(createdBySet));

  // Vamos inspecionar uma amostra de 10 setups para ver como estão preenchidos
  console.log('\nAmostra de 5 setups:');
  (setups || []).slice(0, 5).forEach((s, i) => {
    console.log(`\n--- Setup #${i+1} (Aviário: ${s.aviario_id}) ---`);
    console.log({
      pressao_vedacao_media: s.pressao_vedacao_media,
      pressao_vedacao_exaustor: s.pressao_vedacao_exaustor,
      pressao_trabalho_media: s.pressao_trabalho_media,
      ventilacao_media: s.ventilacao_media,
      qtd_exaustores: s.qtd_exaustores,
      comprimento_galpao: s.comprimento_galpao,
      largura_galpao: s.largura_galpao,
      observacoes: s.observacoes,
      fotos: s.fotos,
      created_by_name: s.created_by_name,
      updated_at: s.updated_at
    });
  });

  // Também verificar histórico de auditoria
  const { data: historico } = await adminClient
    .from('setups_aviarios_historico')
    .select('id, aviario_id, usuario_nome, created_at')
    .order('created_at', { ascending: false });

  console.log('\nTotal de alterações no histórico de auditoria:', historico?.length);
  const aviariosNoHistorico = new Set(historico?.map(h => h.aviario_id));
  console.log('Aviários únicos com histórico de auditoria:', aviariosNoHistorico.size);

  // Mapear aviários por produtor
  const prodAviarioMap = new Map();
  (aviarios || []).forEach(a => {
    if (!prodAviarioMap.has(a.produtor_id)) prodAviarioMap.set(a.produtor_id, []);
    prodAviarioMap.get(a.produtor_id).push(a);
  });

  // Quantos produtores têm aviários no histórico de auditoria?
  const prodsComHistorico = new Set();
  prodAviarioMap.forEach((avs, prodId) => {
    if (avs.some((a: any) => aviariosNoHistorico.has(a.id))) {
      prodsComHistorico.add(prodId);
    }
  });
  console.log('Produtores com histórico de edição/auditoria:', prodsComHistorico.size);

  // Analisar os 23 produtores: Qual critério resulta exatamente em 23?
  // Vamos testar vários critérios:
  // 1) Tem histórico?
  // 2) Tem campos preenchidos que não sejam os valores padrão do importador?
  // 3) Tem observações técnicas?
  // 4) Tem algum valor específico?
  
  // Vamos listar todos os 67 produtores e verificar o que cada um tem
  const resumoProdutores: any[] = [];
  (produtores || []).forEach(p => {
    const avs = prodAviarioMap.get(p.id) || [];
    const setupsDoProd = avs.map((a: any) => setups?.find(s => s.aviario_id === a.id)).filter(Boolean);
    const temHist = avs.some((a: any) => aviariosNoHistorico.has(a.id));
    
    // Verificar se algum setup tem dados diferentes de nulo / zero
    const temDadosReais = setupsDoProd.some((s: any) => {
      // checar campos específicos
      return (s.observacoes && s.observacoes.trim() !== '') ||
             (s.created_by_name && s.created_by_name !== 'Sistema') ||
             (s.pressao_vedacao_media && s.pressao_vedacao_media > 0);
    });

    resumoProdutores.push({
      nome: p.nome,
      id: p.id,
      totalAvs: avs.length,
      setupsCount: setupsDoProd.length,
      temHist,
      temDadosReais,
      observacoes: setupsDoProd.map((s: any) => s.observacoes).filter(Boolean),
      createdBys: setupsDoProd.map((s: any) => s.created_by_name).filter(Boolean)
    });
  });

  fs.writeFileSync('scripts/resumo_produtores.json', JSON.stringify(resumoProdutores, null, 2));
  console.log('\nResumo salvo em scripts/resumo_produtores.json');
}

inspectSetupsContent().catch(console.error);

