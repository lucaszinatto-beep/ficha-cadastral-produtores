import ExcelJS from 'exceljs';

async function analyzeTblTxt() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile('Base set up.xlsx');

  const ws = wb.getWorksheet('Tbl_txt');
  const headers = ws.getRow(1).values;
  console.log('Headers:', headers);

  const rows = [];
  ws.eachRow((row, rNum) => {
    if (rNum > 1) {
      const v = row.values;
      rows.push({
        rowNum: rNum,
        avicultor: v[1],
        instalacao: v[2],
        extensionista: v[3],
        pressaoVedacao: v[4],
        pressaoTrabalho: v[5],
        velocidadeVento: v[6],
        qtdExaustores: v[7],
        allValues: v
      });
    }
  });

  console.log(`\nTotal de registros em Tbl_txt: ${rows.length}`);

  const todosProdutores = Array.from(new Set(rows.map(r => r.avicultor).filter(Boolean)));
  console.log(`Total de avicultores distintos em Tbl_txt: ${todosProdutores.length}`);

  // Verificar quais linhas têm algum dado técnico além de avicultor, instalacao, extensionista
  const linhasComDados = rows.filter(r => {
    // checar valores a partir do índice 4
    return r.allValues.slice(4).some(val => val !== null && val !== undefined && String(val).trim() !== '');
  });

  console.log(`\nTotal de linhas com dados técnicos preenchidos em Tbl_txt: ${linhasComDados.length}`);
  
  const produtoresComDados = Array.from(new Set(linhasComDados.map(r => r.avicultor)));
  console.log(`Total de produtores com dados técnicos preenchidos: ${produtoresComDados.length}`);
  console.log('Produtores com dados técnicos:', produtoresComDados);

  // Detalhes por produtor
  const produtorStats = {};
  rows.forEach(r => {
    if (!produtorStats[r.avicultor]) {
      produtorStats[r.avicultor] = {
        totalAvs: 0,
        avsComDados: 0,
        avsSemDados: 0,
        extensionistas: new Set(),
        instalacoesComDados: [],
        instalacoesSemDados: []
      };
    }
    const stat = produtorStats[r.avicultor];
    stat.totalAvs++;
    if (r.extensionista) stat.extensionistas.add(r.extensionista);

    const temDados = r.allValues.slice(4).some(val => val !== null && val !== undefined && String(val).trim() !== '');
    if (temDados) {
      stat.avsComDados++;
      stat.instalacoesComDados.push(r.instalacao);
    } else {
      stat.avsSemDados++;
      stat.instalacoesSemDados.push(r.instalacao);
    }
  });

  console.log('\n--- RESUMO DETALHADO POR PRODUTOR EM Tbl_txt ---');
  let prodsAoMenosUm = 0;
  let prodsTodos = 0;
  let prodsNenhum = 0;

  Object.entries(produtorStats).forEach(([prod, stat]) => {
    if (stat.avsComDados > 0) {
      prodsAoMenosUm++;
      if (stat.avsSemDados === 0) prodsTodos++;
      console.log(`[COM DADOS] ${prod}: ${stat.avsComDados}/${stat.totalAvs} aviários com dados (Avs: ${stat.instalacoesComDados.join(',')}) | Ext: ${Array.from(stat.extensionistas).join(', ')}`);
    } else {
      prodsNenhum++;
    }
  });

  console.log(`\nProdutores com pelo menos um aviário preenchido no Excel: ${prodsAoMenosUm}`);
  console.log(`Produtores com todos os aviários preenchidos no Excel: ${prodsTodos}`);
  console.log(`Produtores sem nenhum aviário preenchido no Excel: ${prodsNenhum}`);
}

analyzeTblTxt().catch(console.error);

