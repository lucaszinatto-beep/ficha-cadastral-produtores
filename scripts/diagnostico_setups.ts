import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

// Obter service key para ler sem restrição de RLS, e também testar com anon key
let serviceKey = '';
if (fs.existsSync('C:/Projetos/projetos-teste/.env')) {
  const m = fs.readFileSync('C:/Projetos/projetos-teste/.env', 'utf8').match(/SUPABASE_SERVICE_ROLE_KEY=["']?([^"'\r\n]+)/);
  if (m) serviceKey = m[1];
}

const supabaseUrl = 'https://ebixhddonbiqtrsyvdry.supabase.co';
const anonKey = 'sb_publishable_Fgi4B-Ad1liJpTku0WD8DA_2eb5OXsC';

const adminClient = createClient(supabaseUrl, serviceKey);
const anonClient = createClient(supabaseUrl, anonKey);

async function runDiagnosis() {
  const belloId = 'e1100000-0000-0000-0000-000000000001';

  console.log('=== INICIANDO DIAGNÓSTICO DOS DADOS REAIS DO SUPABASE (BELLO ALIMENTOS) ===\n');

  // 1. Buscar Produtores
  const { data: produtores, error: pErr } = await adminClient
    .from('produtores')
    .select('id, nome, codigo_avicultor, municipio, telefone, empresa_id')
    .eq('empresa_id', belloId)
    .order('nome');

  if (pErr) console.error('Erro produtores:', pErr);
  console.log(`Total de Produtores cadastrados na Bello: ${produtores?.length || 0}`);

  // 2. Buscar Aviários
  const { data: aviarios, error: aErr } = await adminClient
    .from('cadastro_aviarios')
    .select('id, produtor_id, numero_instalacao, tecnico_id, empresa_id')
    .eq('empresa_id', belloId)
    .order('numero_instalacao');

  if (aErr) console.error('Erro aviarios:', aErr);
  console.log(`Total de Aviários cadastrados na Bello: ${aviarios?.length || 0}`);

  // 3. Buscar Técnicos
  const { data: tecnicos } = await adminClient
    .from('tecnicos')
    .select('id, nome, empresa_id')
    .eq('empresa_id', belloId);
  const tecnicosMap = new Map((tecnicos || []).map(t => [t.id, t.nome]));

  // 4. Buscar Setups em setups_aviarios (com service role)
  const { data: setupsAdmin, error: sErr } = await adminClient
    .from('setups_aviarios')
    .select('*')
    .eq('empresa_id', belloId);

  // 4b. Buscar Setups com anonClient para verificar se RLS bloqueia
  const { data: setupsAnon, error: sAnonErr } = await anonClient
    .from('setups_aviarios')
    .select('*')
    .eq('empresa_id', belloId);

  console.log(`Setups encontrados via Admin Client (Service Role): ${setupsAdmin?.length || 0}`);
  console.log(`Setups encontrados via Anon Client (Frontend): ${setupsAnon?.length || 0}`, sAnonErr ? `(Erro RLS: ${sAnonErr.message})` : '');

  // Mapear setups por aviario_id
  const setupsMap = new Map();
  (setupsAdmin || []).forEach(s => {
    setupsMap.set(s.aviario_id, s);
  });

  // Mapear aviários por produtor
  const produtorAviarios = new Map<string, any[]>();
  (aviarios || []).forEach(a => {
    if (!produtorAviarios.has(a.produtor_id)) produtorAviarios.set(a.produtor_id, []);
    produtorAviarios.get(a.produtor_id)!.push(a);
  });

  // Análise detalhada por produtor
  let produtoresComAoMenosUmSetup = 0;
  let produtoresComTodosSetups = 0;
  let produtoresSemNenhumSetup = 0;

  const listaProdutoresComSetup: any[] = [];
  const listaProdutoresSemSetup: any[] = [];

  (produtores || []).forEach(p => {
    const avs = produtorAviarios.get(p.id) || [];
    const avsComSetup = avs.filter(a => setupsMap.has(a.id));
    const avsSemSetup = avs.filter(a => !setupsMap.has(a.id));

    const temAlgum = avsComSetup.length > 0;
    const temTodos = avs.length > 0 && avsSemSetup.length === 0;

    if (temAlgum) {
      produtoresComAoMenosUmSetup++;
      listaProdutoresComSetup.push({
        id: p.id,
        nome: p.nome,
        totalAviarios: avs.length,
        aviariosComSetup: avsComSetup.map(a => ({
          id: a.id,
          numero: a.numero_instalacao,
          tecnico: tecnicosMap.get(a.tecnico_id) || 'Sem Técnico',
          setupId: setupsMap.get(a.id)?.id,
          temFotos: Boolean(setupsMap.get(a.id)?.fotos && setupsMap.get(a.id)?.fotos.length > 0),
          qtdFotos: Array.isArray(setupsMap.get(a.id)?.fotos) ? setupsMap.get(a.id)?.fotos.length : 0,
          pressaoVedacao: setupsMap.get(a.id)?.pressao_vedacao_media ?? setupsMap.get(a.id)?.pressao_vedacao_exaustor,
          ventilacao: setupsMap.get(a.id)?.ventilacao_media ?? setupsMap.get(a.id)?.ventilacao_dir,
          observacoes: setupsMap.get(a.id)?.observacoes
        })),
        aviariosSemSetup: avsSemSetup.map(a => ({
          id: a.id,
          numero: a.numero_instalacao,
          tecnico: tecnicosMap.get(a.tecnico_id) || 'Sem Técnico'
        })),
        statusCompleto: temTodos
      });
    } else {
      produtoresSemNenhumSetup++;
      listaProdutoresSemSetup.push({
        id: p.id,
        nome: p.nome,
        totalAviarios: avs.length
      });
    }

    if (temTodos) {
      produtoresComTodosSetups++;
    }
  });

  const totalAviariosComSetup = setupsAdmin?.length || 0;
  const totalAviariosPendentes = (aviarios?.length || 0) - totalAviariosComSetup;

  console.log('\n--- RESULTADOS GERAIS ---');
  console.log(`1. Produtores com pelo menos um aviário com ficha técnica cadastrada: ${produtoresComAoMenosUmSetup}`);
  console.log(`2. Produtores com TODOS os aviários com ficha técnica cadastrada: ${produtoresComTodosSetups}`);
  console.log(`3. Produtores sem NENHUM setup cadastrado: ${produtoresSemNenhumSetup}`);
  console.log(`4. Total de aviários com ficha técnica cadastrada: ${totalAviariosComSetup}`);
  console.log(`5. Total de aviários pendentes: ${totalAviariosPendentes}`);

  console.log(`\n--- LISTA DOS ${listaProdutoresComSetup.length} PRODUTORES QUE POSSUEM SETUP ---`);
  listaProdutoresComSetup.forEach((item, idx) => {
    const avsSetupStr = item.aviariosComSetup.map((a: any) => `Av.${a.numero} (Téc: ${a.tecnico}, Fotos: ${a.qtdFotos})`).join(', ');
    const avsPendStr = item.aviariosSemSetup.length > 0 
      ? ` | PENDENTES: ${item.aviariosSemSetup.map((a: any) => `Av.${a.numero}`).join(', ')}` 
      : ' (100% dos aviários cadastrados)';
    console.log(`${idx + 1}. ${item.nome} [Total: ${item.totalAviarios} avs] -> Concluídos: ${avsSetupStr}${avsPendStr}`);
  });

  // Salvar diagnóstico completo em arquivo JSON para análise
  fs.writeFileSync('scripts/diagnostico_resultado.json', JSON.stringify({
    totalProdutores: produtores?.length,
    totalAviarios: aviarios?.length,
    produtoresComAoMenosUmSetup,
    produtoresComTodosSetups,
    produtoresSemNenhumSetup,
    totalAviariosComSetup,
    totalAviariosPendentes,
    listaProdutoresComSetup,
    setupsAnonCount: setupsAnon?.length,
    setupsAdminCount: setupsAdmin?.length
  }, null, 2));

  console.log('\nDiagnóstico salvo em scripts/diagnostico_resultado.json');
}

runDiagnosis().catch(console.error);

