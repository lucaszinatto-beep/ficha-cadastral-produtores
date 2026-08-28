import { Aviario, SetupAviario } from '../types/database';

function formatNum(val: number | null | undefined, unit: string = ''): string {
  if (val === null || val === undefined || isNaN(Number(val))) return '-';
  return `${val} ${unit}`.trim();
}

function formatBool(val: boolean | null | undefined): string {
  if (val === true) return 'SIM';
  if (val === false) return 'NÃO';
  return '-';
}

/**
 * Gera o documento HTML completo e limpo para impressão oficial A4 Retrato
 */
export function generateFichaHtml(aviarios: Aviario[]): string {
  const todayStr = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  const pagesHtml = aviarios.map((aviario, index) => {
    const setup: Partial<SetupAviario> = aviario.setup || {};
    const isLast = index === aviarios.length - 1;

    return `
      <div class="a4-page ${!isLast ? 'page-break' : ''}">
        
        <!-- CABEÇALHO -->
        <div class="header-box">
          <div class="header-left">
            <img src="/Logo_Bello.png" alt="Bello Alimentos" class="logo-img" />
            <div class="header-title">
              <span class="sub-badge">Set Up Granja • Gestão de Frangos de Corte</span>
              <h1 class="main-title">Ficha Técnica de Setup de Aviário</h1>
            </div>
          </div>
          <div class="header-right">
            <div>Data: <strong>${todayStr}</strong></div>
            <div>Documento Oficial • Bello Alimentos</div>
          </div>
        </div>

        <!-- IDENTIFICAÇÃO DO PRODUTOR E AVIÁRIO -->
        <div class="info-box">
          <div class="info-col info-col-6">
            <span class="info-label">Produtor / Avicultor</span>
            <span class="info-value-main">${aviario.produtor?.nome || 'Não Informado'}</span>
            <span class="info-sub">Município: <strong>${aviario.produtor?.municipio || 'Não informado'}</strong></span>
          </div>
          <div class="info-col info-col-3 text-center">
            <span class="info-label">Instalação</span>
            <span class="info-value-highlight">AVIÁRIO ${aviario.numero_instalacao}</span>
            ${aviario.nucleo ? `<span class="info-sub font-bold">Núcleo: ${aviario.nucleo}</span>` : ''}
          </div>
          <div class="info-col info-col-3">
            <span class="info-label">Extensionista / Técnico</span>
            <span class="info-value-tech">${aviario.tecnico?.nome || 'Não Vinculado'}</span>
            <span class="info-sub">Unidade: <strong>${aviario.tecnico?.unidade || 'Bello Alimentos'}</strong></span>
          </div>
        </div>

        <!-- GRADE TÉCNICA PRINCIPAL (2 COLUNAS) -->
        <div class="grid-2col">
          
          <!-- COLUNA ESQUERDA -->
          <div class="col">
            
            <!-- 1. Pressão de Vedação -->
            <div class="card-section">
              <div class="card-header">
                <span>Pressão Vedação</span>
                <span class="unit-tag">Pascal (Pa)</span>
              </div>
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Nº Exaustor</th>
                    <th>Manômetro</th>
                    <th>Painel</th>
                    <th class="th-highlight">MÉDIA</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>${formatNum(setup.pressao_vedacao_exaustor)}</td>
                    <td>${formatNum(setup.pressao_vedacao_manometro)}</td>
                    <td>${formatNum(setup.pressao_vedacao_painel)}</td>
                    <td class="td-highlight font-bold">${formatNum(setup.pressao_vedacao_media)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- 2. Ventilação Total -->
            <div class="card-section">
              <div class="card-header">
                <span>Ventilação Total (m/s)</span>
                <span class="unit-tag">Qtd Exaustores: <strong>${formatNum(setup.qtd_exaustores)}</strong></span>
              </div>
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Lat. Direita</th>
                    <th>Meio</th>
                    <th>Lat. Esquerda</th>
                    <th class="th-highlight-amber">MÉDIA VENTO</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>${formatNum(setup.ventilacao_dir, 'm/s')}</td>
                    <td>${formatNum(setup.ventilacao_meio, 'm/s')}</td>
                    <td>${formatNum(setup.ventilacao_esq, 'm/s')}</td>
                    <td class="td-highlight-amber font-bold">${formatNum(setup.ventilacao_media, 'm/s')}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- 3. Ventilação Entrada de Ar -->
            <div class="card-section">
              <div class="card-header">
                <span>Ventilação Entrada de Ar (m/s)</span>
                <span class="unit-tag">Média: <strong>${formatNum(setup.vent_ar_media, 'm/s')}</strong></span>
              </div>
              <table class="data-table">
                <thead>
                  <tr>
                    <th style="text-align: left; padding-left: 6px;">Lado</th>
                    <th>Ponto 1 (Frente)</th>
                    <th>Ponto 2 (Centro)</th>
                    <th>Ponto 3 (Fundo)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style="text-align: left; padding-left: 6px; font-weight: bold; background: #f8fafc;">Lado 01 (Fornos)</td>
                    <td>${formatNum(setup.vent_ar_l1_p1, 'm/s')}</td>
                    <td>${formatNum(setup.vent_ar_l1_p2, 'm/s')}</td>
                    <td>${formatNum(setup.vent_ar_l1_p3, 'm/s')}</td>
                  </tr>
                  <tr>
                    <td style="text-align: left; padding-left: 6px; font-weight: bold; background: #f8fafc;">Lado 02</td>
                    <td>${formatNum(setup.vent_ar_l2_p1, 'm/s')}</td>
                    <td>${formatNum(setup.vent_ar_l2_p2, 'm/s')}</td>
                    <td>${formatNum(setup.vent_ar_l2_p3, 'm/s')}</td>
                  </tr>
                </tbody>
              </table>
              ${(setup.entrada_ar_direito || setup.entrada_ar_esquerdo) ? `
                <div class="extra-row">
                  <div>Entrada Dir: <strong>${setup.entrada_ar_direito || '-'}</strong></div>
                  <div>Entrada Esq: <strong>${setup.entrada_ar_esquerdo || '-'}</strong></div>
                </div>
              ` : ''}
            </div>

            <!-- 4. Recursos Hídricos -->
            <div class="card-section">
              <div class="card-header">
                <span>Recursos Hídricos & Vazão de Água</span>
              </div>
              <div class="grid-2x2">
                <div class="grid-cell"><span class="lbl">Poço 1:</span> <strong>${formatNum(setup.vazao_poco_1, 'L/h')}</strong></div>
                <div class="grid-cell"><span class="lbl">Poço 2:</span> <strong>${formatNum(setup.vazao_poco_2, 'L/h')}</strong></div>
                <div class="grid-cell"><span class="lbl">Entrada Galpão:</span> <strong>${formatNum(setup.entrada_agua_galpao, 'L/h')}</strong></div>
                <div class="grid-cell"><span class="lbl">Armazenamento:</span> <strong>${formatNum(setup.armazenamento_agua, 'L')}</strong></div>
              </div>
            </div>

          </div>

          <!-- COLUNA DIREITA -->
          <div class="col">
            
            <!-- 1. Pressão de Trabalho -->
            <div class="card-section">
              <div class="card-header">
                <span>Pressão de Trabalho</span>
                <span class="unit-tag">Pascal (Pa)</span>
              </div>
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Nº Exaustor</th>
                    <th>Manômetro</th>
                    <th>Painel</th>
                    <th class="th-highlight">MÉDIA</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>${formatNum(setup.pressao_trabalho_exaustor)}</td>
                    <td>${formatNum(setup.pressao_trabalho_manometro)}</td>
                    <td>${formatNum(setup.pressao_trabalho_painel)}</td>
                    <td class="td-highlight font-bold">${formatNum(setup.pressao_trabalho_media)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- 2. Iluminação & Placa Evaporativa -->
            <div class="grid-sub-2">
              <div class="card-section">
                <div class="card-header">
                  <span>Iluminação</span>
                  <span class="unit-tag">100%: ${formatNum(setup.lux_100)}</span>
                </div>
                <div class="mini-rows">
                  <div class="mini-row"><span class="lbl">Sob Lâmpada:</span> <strong>${formatNum(setup.iluminacao_sob_lampada, 'lux')}</strong></div>
                  <div class="mini-row"><span class="lbl">Lateral:</span> <strong>${formatNum(setup.iluminacao_lateral, 'lux')}</strong></div>
                  <div class="mini-row"><span class="lbl">Triângulo:</span> <strong>${formatNum(setup.iluminacao_triangulo, 'lux')}</strong></div>
                </div>
              </div>

              <div class="card-section">
                <div class="card-header">
                  <span>Placa Evaporativa</span>
                </div>
                <div class="mini-rows">
                  <div class="mini-row"><span class="lbl">Tamanho:</span> <strong>${formatNum(setup.tamanho_placa, 'm²')}</strong></div>
                  <div class="mini-row"><span class="lbl">Tempo Molhar:</span> <strong>${formatNum(setup.tempo_molhar_placa, 'min')}</strong></div>
                </div>
              </div>
            </div>

            <!-- 3. Dimensões do Galpão & Alturas -->
            <div class="card-section">
              <div class="card-header">
                <span>Dimensões & Alturas</span>
                <span class="unit-tag">Área: <strong>${formatNum(aviario.area_m2 || (setup.comprimento_galpao && setup.largura_galpao ? setup.comprimento_galpao * setup.largura_galpao : null), 'm²')}</strong></span>
              </div>
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Frente</th>
                    <th>Meio</th>
                    <th>Fundo</th>
                    <th style="background: #e2e8f0; color: #0f172a; font-weight: bold;">ALTURA MÉDIA</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>${formatNum(setup.altura_frente, 'm')}</td>
                    <td>${formatNum(setup.altura_meio, 'm')}</td>
                    <td>${formatNum(setup.altura_fundo, 'm')}</td>
                    <td style="background: #f1f5f9; font-weight: bold; color: #0284c7;">${formatNum(setup.altura_media, 'm')}</td>
                  </tr>
                </tbody>
              </table>
              <div class="extra-row">
                <div>Comprimento: <strong>${formatNum(setup.comprimento_galpao, 'm')}</strong></div>
                <div>Largura: <strong>${formatNum(setup.largura_galpao, 'm')}</strong></div>
              </div>
            </div>

            <!-- 4. Painel de Alarmes -->
            <div class="card-section">
              <div class="card-header">
                <span>Status do Sistema de Alarmes</span>
              </div>
              <table class="data-table">
                <thead>
                  <tr>
                    <th style="text-align: left; padding-left: 6px;">Local</th>
                    <th>Possui Alarme?</th>
                    <th>Funcionando?</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style="text-align: left; padding-left: 6px; background: #f8fafc;">Alarme na Casa</td>
                    <td class="font-bold">${formatBool(setup.alarme_casa)}</td>
                    <td class="font-bold">${formatBool(setup.alarme_casa_func)}</td>
                  </tr>
                  <tr>
                    <td style="text-align: left; padding-left: 6px; background: #f8fafc;">Alarme no Aviário</td>
                    <td class="font-bold">${formatBool(setup.alarme_aviario)}</td>
                    <td class="font-bold">${formatBool(setup.alarme_aviario_func)}</td>
                  </tr>
                  <tr>
                    <td style="text-align: left; padding-left: 6px; background: #f8fafc;">Alarme nas Caixas Central</td>
                    <td class="font-bold">${formatBool(setup.alarme_caixas)}</td>
                    <td class="font-bold">${formatBool(setup.alarme_caixas_func)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

          </div>

        </div>

        <!-- 4. OBSERVAÇÕES & ASSINATURAS -->
        <div class="obs-box">
          <div class="obs-text">
            <strong>Observações Técnicas:</strong> ${setup.observacoes || 'Parâmetros de setup e ambiência verificados em conformidade com as diretrizes técnicas da Bello Alimentos.'}
          </div>
          <div class="signatures-grid">
            <div class="signature-line">
              <span class="sig-name">${aviario.tecnico?.nome || 'Extensionista Técnico'}</span>
              <span class="sig-role">Extensionista / Técnico Responsável</span>
            </div>
            <div class="signature-line">
              <span class="sig-name">${aviario.produtor?.nome || 'Avicultor / Produtor'}</span>
              <span class="sig-role">Assinatura do Produtor / Responsável Granja</span>
            </div>
          </div>
        </div>

        <!-- 5. RODAPÉ -->
        <div class="footer-row">
          <span>Bello Alimentos S.A. • Gestão de Ambiência e Setup</span>
          <span>Página ${index + 1} de ${aviarios.length} • 1 Aviário por Folha A4</span>
        </div>

      </div>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Ficha Técnica de Setup • Bello Alimentos</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 6mm 8mm;
        }

        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }

        body {
          background-color: #ffffff !important;
          background: #ffffff !important;
          color: #0f172a !important;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          font-size: 9.5px;
          line-height: 1.25;
          padding: 0;
          margin: 0;
        }

        .a4-page {
          background: #ffffff !important;
          width: 100%;
          max-width: 194mm;
          margin: 0 auto;
          padding: 2mm 0;
          page-break-inside: avoid;
          break-inside: avoid;
        }

        .page-break {
          page-break-after: always;
          break-after: page;
        }

        /* HEADER */
        .header-box {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border: 1px solid #94a3b8;
          border-radius: 6px;
          padding: 6px 10px;
          margin-bottom: 6px;
          background: #ffffff;
        }
        .header-left {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .logo-img {
          height: 36px;
          width: auto;
          object-contain: contain;
        }
        .header-title {
          border-left: 1px solid #cbd5e1;
          padding-left: 10px;
        }
        .sub-badge {
          display: block;
          font-size: 8.5px;
          font-weight: bold;
          color: #0284c7;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .main-title {
          font-size: 13px;
          font-weight: 900;
          color: #0f172a;
          text-transform: uppercase;
          letter-spacing: -0.2px;
        }
        .header-right {
          text-align: right;
          font-size: 8.5px;
          color: #475569;
          font-family: monospace;
        }

        /* INFO BOX */
        .info-box {
          display: flex;
          border: 1px solid #94a3b8;
          border-radius: 6px;
          padding: 6px 8px;
          margin-bottom: 6px;
          background: #f8fafc;
        }
        .info-col {
          display: flex;
          flex-direction: column;
        }
        .info-col-6 { width: 50%; border-right: 1px solid #cbd5e1; padding-right: 8px; }
        .info-col-3 { width: 25%; padding: 0 8px; }
        .info-col-3:not(:last-child) { border-right: 1px solid #cbd5e1; }
        .info-label {
          font-size: 8px;
          font-weight: bold;
          color: #64748b;
          text-transform: uppercase;
        }
        .info-value-main {
          font-size: 11.5px;
          font-weight: 900;
          color: #0f172a;
          text-transform: uppercase;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .info-value-highlight {
          font-size: 12px;
          font-weight: 900;
          color: #0369a1;
          font-family: monospace;
        }
        .info-value-tech {
          font-size: 10px;
          font-weight: bold;
          color: #0f172a;
          text-transform: uppercase;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .info-sub {
          font-size: 8px;
          color: #475569;
          margin-top: 1px;
        }

        /* GRID 2 COLUMNS */
        .grid-2col {
          display: flex;
          gap: 6px;
        }
        .col {
          width: 50%;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        /* CARD SECTIONS */
        .card-section {
          border: 1px solid #94a3b8;
          border-radius: 5px;
          overflow: hidden;
          background: #ffffff;
        }
        .card-header {
          background: #f1f5f9;
          border-bottom: 1px solid #cbd5e1;
          padding: 3px 6px;
          font-size: 8.5px;
          font-weight: bold;
          color: #0f172a;
          text-transform: uppercase;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .unit-tag {
          font-size: 8px;
          font-weight: normal;
          color: #475569;
        }

        /* TABLES */
        .data-table {
          width: 100%;
          border-collapse: collapse;
          text-align: center;
          font-size: 8.5px;
        }
        .data-table th {
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
          border-right: 1px solid #e2e8f0;
          padding: 2.5px 3px;
          font-weight: bold;
          color: #334155;
        }
        .data-table th:last-child {
          border-right: none;
        }
        .data-table td {
          border-bottom: 1px solid #e2e8f0;
          border-right: 1px solid #e2e8f0;
          padding: 2.5px 3px;
          font-family: monospace;
          color: #0f172a;
        }
        .data-table td:last-child {
          border-right: none;
        }
        .data-table tbody tr:last-child td {
          border-bottom: none;
        }
        .th-highlight {
          background: #e0f2fe !important;
          color: #0369a1 !important;
        }
        .td-highlight {
          background: #f0f9ff !important;
          color: #0284c7 !important;
        }
        .th-highlight-amber {
          background: #fef3c7 !important;
          color: #92400e !important;
        }
        .td-highlight-amber {
          background: #fffbeb !important;
          color: #b45309 !important;
        }
        .font-bold {
          font-weight: bold;
        }

        .extra-row {
          display: flex;
          justify-content: space-between;
          background: #f8fafc;
          border-top: 1px solid #e2e8f0;
          padding: 2.5px 6px;
          font-size: 8px;
          color: #334155;
        }

        .grid-2x2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          font-size: 8.5px;
        }
        .grid-cell {
          padding: 3px 6px;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
        }
        .grid-cell:nth-child(odd) {
          border-right: 1px solid #e2e8f0;
        }
        .grid-cell:nth-last-child(-n+2) {
          border-bottom: none;
        }

        .grid-sub-2 {
          display: flex;
          gap: 6px;
        }
        .grid-sub-2 .card-section {
          width: 50%;
        }
        .mini-rows {
          padding: 3px 6px;
          display: flex;
          flex-direction: column;
          gap: 1.5px;
          font-size: 8px;
        }
        .mini-row {
          display: flex;
          justify-content: space-between;
        }
        .lbl {
          color: #64748b;
        }

        /* OBS & SIGNATURES */
        .obs-box {
          border: 1px solid #94a3b8;
          border-radius: 5px;
          padding: 5px 8px;
          margin-top: 6px;
          background: #ffffff;
        }
        .obs-text {
          font-size: 8px;
          color: #334155;
          margin-bottom: 10px;
        }
        .signatures-grid {
          display: flex;
          justify-content: space-around;
          gap: 20px;
          text-align: center;
          padding-top: 4px;
        }
        .signature-line {
          width: 45%;
          border-top: 1px solid #0f172a;
          padding-top: 2px;
        }
        .sig-name {
          display: block;
          font-size: 8.5px;
          font-weight: bold;
          color: #0f172a;
          text-transform: uppercase;
        }
        .sig-role {
          display: block;
          font-size: 7.5px;
          color: #64748b;
        }

        /* FOOTER */
        .footer-row {
          display: flex;
          justify-content: space-between;
          border-top: 1px solid #cbd5e1;
          margin-top: 4px;
          padding-top: 2px;
          font-size: 7.5px;
          color: #64748b;
          font-family: monospace;
        }
      </style>
    </head>
    <body>
      ${pagesHtml}
    </body>
    </html>
  `;
}

/**
 * Dispara a impressão limpa e isolada usando um iframe oculto
 * Garante 100% de fundo branco, sem interferência do tema escuro do site!
 */
export function executeIsolatedPrint(aviarios: Aviario[]): void {
  if (!aviarios || aviarios.length === 0) return;

  // Cria iframe oculto
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.visibility = 'hidden';

  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    document.body.removeChild(iframe);
    window.print();
    return;
  }

  const htmlContent = generateFichaHtml(aviarios);
  doc.open();
  doc.write(htmlContent);
  doc.close();

  // Aguarda carregamento de imagens e renderização antes de imprimir
  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (e) {
      console.error('Erro ao acionar impressão isolada:', e);
      window.print();
    } finally {
      // Remove o iframe após a janela de impressão ser fechada
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 2000);
    }
  }, 350);
}
