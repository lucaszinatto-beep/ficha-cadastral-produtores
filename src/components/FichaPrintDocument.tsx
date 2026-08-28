import React from 'react';
import { Aviario, SetupAviario } from '../types/database';

interface FichaPrintDocumentProps {
  aviariosToPrint: Aviario[];
}

export const FichaPrintDocument: React.FC<FichaPrintDocumentProps> = ({ aviariosToPrint }) => {
  const formatNum = (val: number | null | undefined, unit: string = '') => {
    if (val === null || val === undefined || isNaN(Number(val))) return '-';
    return `${val} ${unit}`.trim();
  };

  const formatBool = (val: boolean | null | undefined) => {
    if (val === true) return 'SIM';
    if (val === false) return 'NÃO';
    return '-';
  };

  const todayStr = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  return (
    <div className="print-pages-wrapper bg-white text-slate-950 font-sans">
      {aviariosToPrint.map((aviario, index) => {
        const setup: Partial<SetupAviario> = aviario.setup || {};
        const isLast = index === aviariosToPrint.length - 1;

        return (
          <div
            key={aviario.id || index}
            className={`a4-clean-sheet ${!isLast ? 'page-break-always' : ''}`}
          >
            {/* 1. CABEÇALHO INSTITUCIONAL LIMPO (ECONOMIA DE TINTA) */}
            <div className="border border-slate-400 rounded p-2 mb-2 bg-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src="/Logo_Bello.png"
                  alt="Bello Alimentos"
                  className="h-9 w-auto object-contain"
                />
                <div className="border-l border-slate-300 pl-3">
                  <span className="text-[9px] font-bold text-sky-800 tracking-wider uppercase block">
                    Set Up Granja • Gestão de Frangos de Corte
                  </span>
                  <h1 className="text-sm font-black text-slate-900 uppercase tracking-tight leading-tight">
                    Ficha Técnica de Setup de Aviário
                  </h1>
                </div>
              </div>

              <div className="text-right text-[9px] text-slate-600 font-mono">
                <div>Data: <strong>{todayStr}</strong></div>
                <div>Documento Oficial • Bello Alimentos</div>
              </div>
            </div>

            {/* 2. IDENTIFICAÇÃO DO PRODUTOR E AVIÁRIO */}
            <div className="border border-slate-400 rounded p-2 mb-2 bg-slate-50/70 grid grid-cols-12 gap-2 text-xs">
              <div className="col-span-6 border-r border-slate-300 pr-2">
                <span className="text-[9px] font-bold text-slate-500 uppercase block">Produtor / Avicultor</span>
                <span className="text-xs font-black text-slate-950 uppercase block truncate">
                  {aviario.produtor?.nome || 'Não Informado'}
                </span>
                <span className="text-[9px] text-slate-600 block mt-0.5">
                  Município: <strong>{aviario.produtor?.municipio || 'Não informado'}</strong>
                </span>
              </div>

              <div className="col-span-3 border-r border-slate-300 px-2 text-center">
                <span className="text-[9px] font-bold text-slate-500 uppercase block">Instalação</span>
                <span className="text-sm font-black text-sky-900 font-mono block">
                  AVIÁRIO {aviario.numero_instalacao}
                </span>
                {aviario.nucleo && (
                  <span className="text-[9px] text-slate-600 block font-semibold">
                    Núcleo: {aviario.nucleo}
                  </span>
                )}
              </div>

              <div className="col-span-3 pl-2">
                <span className="text-[9px] font-bold text-slate-500 uppercase block">Extensionista / Técnico</span>
                <span className="text-xs font-bold text-slate-900 uppercase block truncate">
                  {aviario.tecnico?.nome || 'Não Vinculado'}
                </span>
                <span className="text-[9px] text-slate-600 block mt-0.5">
                  Unidade: <strong>{aviario.tecnico?.unidade || 'Bello Alimentos'}</strong>
                </span>
              </div>
            </div>

            {/* 3. GRADE TÉCNICA PRINCIPAL (2 COLUNAS COMPACTAS PARA A4) */}
            <div className="grid grid-cols-2 gap-2 text-[9.5px] leading-tight">
              
              {/* COLUNA ESQUERDA */}
              <div className="space-y-2">
                
                {/* Pressão de Vedação */}
                <div className="border border-slate-400 rounded overflow-hidden bg-white">
                  <div className="bg-slate-100 border-b border-slate-300 text-slate-900 font-bold px-2 py-0.5 uppercase text-[9px] flex justify-between items-center">
                    <span>Pressão Vedação</span>
                    <span className="text-[8.5px] font-normal text-slate-600">Pascal (Pa)</span>
                  </div>
                  <table className="w-full text-center border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[8.5px] font-bold text-slate-700">
                        <th className="py-0.5 px-1 border-r border-slate-200">Nº Exaustor</th>
                        <th className="py-0.5 px-1 border-r border-slate-200">Manômetro</th>
                        <th className="py-0.5 px-1 border-r border-slate-200">Painel</th>
                        <th className="py-0.5 px-1 bg-sky-50 text-sky-950 font-black">MÉDIA</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="font-mono text-[9px] font-semibold text-slate-900">
                        <td className="py-1 px-1 border-r border-slate-200">{formatNum(setup.pressao_vedacao_exaustor)}</td>
                        <td className="py-1 px-1 border-r border-slate-200">{formatNum(setup.pressao_vedacao_manometro)}</td>
                        <td className="py-1 px-1 border-r border-slate-200">{formatNum(setup.pressao_vedacao_painel)}</td>
                        <td className="py-1 px-1 bg-sky-50/70 font-black text-sky-950">{formatNum(setup.pressao_vedacao_media)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Ventilação Total (m/s) */}
                <div className="border border-slate-400 rounded overflow-hidden bg-white">
                  <div className="bg-slate-100 border-b border-slate-300 text-slate-900 font-bold px-2 py-0.5 uppercase text-[9px] flex justify-between items-center">
                    <span>Ventilação Total (m/s)</span>
                    <span className="text-[8.5px] font-bold text-slate-700">
                      Qtd Exaustores: <strong>{formatNum(setup.qtd_exaustores)}</strong>
                    </span>
                  </div>
                  <table className="w-full text-center border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[8.5px] font-bold text-slate-700">
                        <th className="py-0.5 px-1 border-r border-slate-200">Lat. Direita</th>
                        <th className="py-0.5 px-1 border-r border-slate-200">Meio</th>
                        <th className="py-0.5 px-1 border-r border-slate-200">Lat. Esquerda</th>
                        <th className="py-0.5 px-1 bg-amber-50 text-amber-950 font-black">MÉDIA VENTO</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="font-mono text-[9px] font-semibold text-slate-900">
                        <td className="py-1 px-1 border-r border-slate-200">{formatNum(setup.ventilacao_dir, 'm/s')}</td>
                        <td className="py-1 px-1 border-r border-slate-200">{formatNum(setup.ventilacao_meio, 'm/s')}</td>
                        <td className="py-1 px-1 border-r border-slate-200">{formatNum(setup.ventilacao_esq, 'm/s')}</td>
                        <td className="py-1 px-1 bg-amber-50/70 font-black text-amber-950">{formatNum(setup.ventilacao_media, 'm/s')}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Ventilação Entrada de Ar (m/s) */}
                <div className="border border-slate-400 rounded overflow-hidden bg-white">
                  <div className="bg-slate-100 border-b border-slate-300 text-slate-900 font-bold px-2 py-0.5 uppercase text-[9px] flex justify-between items-center">
                    <span>Ventilação Entrada de Ar (m/s)</span>
                    <span className="text-[8.5px] font-bold text-sky-900">
                      Média: <strong>{formatNum(setup.vent_ar_media, 'm/s')}</strong>
                    </span>
                  </div>
                  <table className="w-full text-center border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[8.5px] font-bold text-slate-700">
                        <th className="py-0.5 px-1 border-r border-slate-200 text-left pl-1.5">Lado</th>
                        <th className="py-0.5 px-1 border-r border-slate-200">Ponto 1 (Frente)</th>
                        <th className="py-0.5 px-1 border-r border-slate-200">Ponto 2 (Centro)</th>
                        <th className="py-0.5 px-1">Ponto 3 (Fundo)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-slate-200 font-mono text-[9px]">
                        <td className="py-0.5 px-1 border-r border-slate-200 text-left pl-1.5 font-sans font-bold text-slate-800 bg-slate-50">
                          Lado 01 (Fornos)
                        </td>
                        <td className="py-0.5 px-1 border-r border-slate-200">{formatNum(setup.vent_ar_l1_p1, 'm/s')}</td>
                        <td className="py-0.5 px-1 border-r border-slate-200">{formatNum(setup.vent_ar_l1_p2, 'm/s')}</td>
                        <td className="py-0.5 px-1">{formatNum(setup.vent_ar_l1_p3, 'm/s')}</td>
                      </tr>
                      <tr className="font-mono text-[9px]">
                        <td className="py-0.5 px-1 border-r border-slate-200 text-left pl-1.5 font-sans font-bold text-slate-800 bg-slate-50">
                          Lado 02
                        </td>
                        <td className="py-0.5 px-1 border-r border-slate-200">{formatNum(setup.vent_ar_l2_p1, 'm/s')}</td>
                        <td className="py-0.5 px-1 border-r border-slate-200">{formatNum(setup.vent_ar_l2_p2, 'm/s')}</td>
                        <td className="py-0.5 px-1">{formatNum(setup.vent_ar_l2_p3, 'm/s')}</td>
                      </tr>
                    </tbody>
                  </table>
                  {(setup.entrada_ar_direito || setup.entrada_ar_esquerdo) && (
                    <div className="p-1 bg-slate-50 border-t border-slate-200 grid grid-cols-2 text-[8.5px] text-slate-700">
                      <div>Entrada Dir: <strong>{setup.entrada_ar_direito || '-'}</strong></div>
                      <div>Entrada Esq: <strong>{setup.entrada_ar_esquerdo || '-'}</strong></div>
                    </div>
                  )}
                </div>

                {/* Recursos Hídricos (Vazão de Água) */}
                <div className="border border-slate-400 rounded overflow-hidden bg-white">
                  <div className="bg-slate-100 border-b border-slate-300 text-slate-900 font-bold px-2 py-0.5 uppercase text-[9px]">
                    Recursos Hídricos & Vazão de Água
                  </div>
                  <div className="grid grid-cols-2 divide-x divide-y divide-slate-200 text-[9px]">
                    <div className="p-1 flex justify-between items-center">
                      <span className="text-slate-600">Poço 1:</span>
                      <strong className="font-mono text-slate-950">{formatNum(setup.vazao_poco_1, 'L/h')}</strong>
                    </div>
                    <div className="p-1 flex justify-between items-center">
                      <span className="text-slate-600">Poço 2:</span>
                      <strong className="font-mono text-slate-950">{formatNum(setup.vazao_poco_2, 'L/h')}</strong>
                    </div>
                    <div className="p-1 flex justify-between items-center">
                      <span className="text-slate-600">Entrada Galpão:</span>
                      <strong className="font-mono text-slate-950">{formatNum(setup.entrada_agua_galpao, 'L/h')}</strong>
                    </div>
                    <div className="p-1 flex justify-between items-center">
                      <span className="text-slate-600">Armazenamento:</span>
                      <strong className="font-mono text-slate-950">{formatNum(setup.armazenamento_agua, 'L')}</strong>
                    </div>
                  </div>
                </div>

              </div>

              {/* COLUNA DIREITA */}
              <div className="space-y-2">
                
                {/* Pressão de Trabalho */}
                <div className="border border-slate-400 rounded overflow-hidden bg-white">
                  <div className="bg-slate-100 border-b border-slate-300 text-slate-900 font-bold px-2 py-0.5 uppercase text-[9px] flex justify-between items-center">
                    <span>Pressão de Trabalho</span>
                    <span className="text-[8.5px] font-normal text-slate-600">Pascal (Pa)</span>
                  </div>
                  <table className="w-full text-center border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[8.5px] font-bold text-slate-700">
                        <th className="py-0.5 px-1 border-r border-slate-200">Nº Exaustor</th>
                        <th className="py-0.5 px-1 border-r border-slate-200">Manômetro</th>
                        <th className="py-0.5 px-1 border-r border-slate-200">Painel</th>
                        <th className="py-0.5 px-1 bg-sky-50 text-sky-950 font-black">MÉDIA</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="font-mono text-[9px] font-semibold text-slate-900">
                        <td className="py-1 px-1 border-r border-slate-200">{formatNum(setup.pressao_trabalho_exaustor)}</td>
                        <td className="py-1 px-1 border-r border-slate-200">{formatNum(setup.pressao_trabalho_manometro)}</td>
                        <td className="py-1 px-1 border-r border-slate-200">{formatNum(setup.pressao_trabalho_painel)}</td>
                        <td className="py-1 px-1 bg-sky-50/70 font-black text-sky-950">{formatNum(setup.pressao_trabalho_media)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Iluminação & Placa Evaporativa */}
                <div className="grid grid-cols-2 gap-2">
                  {/* Iluminação */}
                  <div className="border border-slate-400 rounded overflow-hidden bg-white">
                    <div className="bg-slate-100 border-b border-slate-300 text-slate-900 font-bold px-1.5 py-0.5 uppercase text-[8.5px] flex justify-between">
                      <span>Iluminação</span>
                      <span className="text-sky-900">100%: {formatNum(setup.lux_100)}</span>
                    </div>
                    <div className="p-1 space-y-0.5 text-[8.5px]">
                      <div className="flex justify-between">
                        <span className="text-slate-600">Sob Lâmpada:</span>
                        <strong className="font-mono">{formatNum(setup.iluminacao_sob_lampada, 'lux')}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Lateral:</span>
                        <strong className="font-mono">{formatNum(setup.iluminacao_lateral, 'lux')}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Triângulo:</span>
                        <strong className="font-mono">{formatNum(setup.iluminacao_triangulo, 'lux')}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Placa Evaporativa */}
                  <div className="border border-slate-400 rounded overflow-hidden bg-white">
                    <div className="bg-slate-100 border-b border-slate-300 text-slate-900 font-bold px-1.5 py-0.5 uppercase text-[8.5px]">
                      Placa Evaporativa
                    </div>
                    <div className="p-1 space-y-0.5 text-[8.5px]">
                      <div className="flex justify-between">
                        <span className="text-slate-600">Tamanho:</span>
                        <strong className="font-mono">{formatNum(setup.tamanho_placa, 'm²')}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Tempo Molhar:</span>
                        <strong className="font-mono">{formatNum(setup.tempo_molhar_placa, 'min')}</strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Dimensões do Galpão & Alturas */}
                <div className="border border-slate-400 rounded overflow-hidden bg-white">
                  <div className="bg-slate-100 border-b border-slate-300 text-slate-900 font-bold px-2 py-0.5 uppercase text-[9px] flex justify-between">
                    <span>Dimensões & Alturas</span>
                    <span className="text-sky-900">
                      Área: <strong>{formatNum(aviario.area_m2 || (setup.comprimento_galpao && setup.largura_galpao ? setup.comprimento_galpao * setup.largura_galpao : null), 'm²')}</strong>
                    </span>
                  </div>
                  <table className="w-full text-center border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[8.5px] font-bold text-slate-700">
                        <th className="py-0.5 px-1 border-r border-slate-200">Frente</th>
                        <th className="py-0.5 px-1 border-r border-slate-200">Meio</th>
                        <th className="py-0.5 px-1 border-r border-slate-200">Fundo</th>
                        <th className="py-0.5 px-1 bg-slate-100 text-slate-950 font-bold">ALTURA MÉDIA</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="font-mono text-[9px] font-semibold text-slate-900 border-b border-slate-200">
                        <td className="py-0.5 px-1 border-r border-slate-200">{formatNum(setup.altura_frente, 'm')}</td>
                        <td className="py-0.5 px-1 border-r border-slate-200">{formatNum(setup.altura_meio, 'm')}</td>
                        <td className="py-0.5 px-1 border-r border-slate-200">{formatNum(setup.altura_fundo, 'm')}</td>
                        <td className="py-0.5 px-1 bg-slate-50 font-bold">{formatNum(setup.altura_media, 'm')}</td>
                      </tr>
                    </tbody>
                  </table>
                  <div className="p-1 bg-slate-50 grid grid-cols-2 text-[8.5px]">
                    <div className="flex justify-between pr-2 border-r border-slate-200">
                      <span className="text-slate-600">Comprimento:</span>
                      <strong className="font-mono">{formatNum(setup.comprimento_galpao, 'm')}</strong>
                    </div>
                    <div className="flex justify-between pl-2">
                      <span className="text-slate-600">Largura:</span>
                      <strong className="font-mono">{formatNum(setup.largura_galpao, 'm')}</strong>
                    </div>
                  </div>
                </div>

                {/* Painel de Alarmes */}
                <div className="border border-slate-400 rounded overflow-hidden bg-white">
                  <div className="bg-slate-100 border-b border-slate-300 text-slate-900 font-bold px-2 py-0.5 uppercase text-[9px]">
                    Status do Sistema de Alarmes
                  </div>
                  <table className="w-full text-center border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[8.5px] font-bold text-slate-700">
                        <th className="py-0.5 px-1.5 text-left border-r border-slate-200">Local</th>
                        <th className="py-0.5 px-1 border-r border-slate-200">Possui Alarme?</th>
                        <th className="py-0.5 px-1">Funcionando?</th>
                      </tr>
                    </thead>
                    <tbody className="text-[8.5px] divide-y divide-slate-200 font-semibold">
                      <tr>
                        <td className="py-0.5 px-1.5 text-left bg-slate-50 border-r border-slate-200">Alarme na Casa</td>
                        <td className="py-0.5 px-1 border-r border-slate-200 font-mono font-bold">{formatBool(setup.alarme_casa)}</td>
                        <td className="py-0.5 px-1 font-mono font-bold">{formatBool(setup.alarme_casa_func)}</td>
                      </tr>
                      <tr>
                        <td className="py-0.5 px-1.5 text-left bg-slate-50 border-r border-slate-200">Alarme no Aviário</td>
                        <td className="py-0.5 px-1 border-r border-slate-200 font-mono font-bold">{formatBool(setup.alarme_aviario)}</td>
                        <td className="py-0.5 px-1 font-mono font-bold">{formatBool(setup.alarme_aviario_func)}</td>
                      </tr>
                      <tr>
                        <td className="py-0.5 px-1.5 text-left bg-slate-50 border-r border-slate-200">Alarme nas Caixas Central</td>
                        <td className="py-0.5 px-1 border-r border-slate-200 font-mono font-bold">{formatBool(setup.alarme_caixas)}</td>
                        <td className="py-0.5 px-1 font-mono font-bold">{formatBool(setup.alarme_caixas_func)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

              </div>

            </div>

            {/* 4. OBSERVAÇÕES & ASSINATURAS */}
            <div className="mt-2 border border-slate-400 rounded p-1.5 bg-white text-[8.5px]">
              <div className="mb-1 text-slate-700">
                <strong>Observações Técnicas:</strong>{' '}
                <span>{setup.observacoes || 'Parâmetros de setup e ambiência verificados em conformidade com as diretrizes técnicas da Bello Alimentos.'}</span>
              </div>

              <div className="grid grid-cols-2 gap-8 pt-3 pb-0.5 text-center">
                <div className="border-t border-slate-900 pt-0.5">
                  <span className="font-bold text-slate-900 uppercase block">
                    {aviario.tecnico?.nome || 'Extensionista Técnico'}
                  </span>
                  <span className="text-[7.5px] text-slate-500 block">Extensionista / Técnico Responsável</span>
                </div>
                <div className="border-t border-slate-900 pt-0.5">
                  <span className="font-bold text-slate-900 uppercase block">
                    {aviario.produtor?.nome || 'Avicultor / Produtor'}
                  </span>
                  <span className="text-[7.5px] text-slate-500 block">Assinatura do Produtor / Responsável Granja</span>
                </div>
              </div>
            </div>

            {/* 5. RODAPÉ DO DOCUMENTO */}
            <div className="mt-1 pt-1 border-t border-slate-200 flex justify-between items-center text-[8px] text-slate-500 font-mono">
              <span>Bello Alimentos S.A. • Gestão de Ambiência e Setup</span>
              <span>Página {index + 1} de {aviariosToPrint.length} • 1 Aviário por Folha A4</span>
            </div>

          </div>
        );
      })}
    </div>
  );
};
