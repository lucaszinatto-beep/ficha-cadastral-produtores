import React, { useState } from 'react';
import { Printer, X, FileText, Layers } from 'lucide-react';
import { Aviario } from '../types/database';
import { FichaPrintDocument } from './FichaPrintDocument';
import { executeIsolatedPrint } from '../services/printService';

interface PrintSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAviario: Aviario;
  allAviariosOfProdutor: Aviario[];
}

export const PrintSetupModal: React.FC<PrintSetupModalProps> = ({
  isOpen,
  onClose,
  currentAviario,
  allAviariosOfProdutor
}) => {
  const [printMode, setPrintMode] = useState<'single' | 'all'>('all');

  if (!isOpen) return null;

  const totalAviarios = allAviariosOfProdutor.length > 0 ? allAviariosOfProdutor.length : 1;

  // Determina a lista final de aviários que serão impressos
  const aviariosToPrint = printMode === 'single'
    ? [currentAviario]
    : (allAviariosOfProdutor.length > 0 ? allAviariosOfProdutor : [currentAviario]);

  const handleExecutePrint = () => {
    executeIsolatedPrint(aviariosToPrint);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in no-print">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-4xl max-h-[94vh] shadow-2xl flex flex-col overflow-hidden animate-scale-up">
        
        {/* Header Modal */}
        <div className="px-6 py-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-sky-500/10 text-sky-400 border border-sky-500/20 shadow-inner">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Impressão Oficial & Exportação PDF (A4 Retrato)
              </h3>
              <p className="text-xs text-slate-400">
                Padrão oficial Bello Alimentos • 1 Aviário por Folha A4
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Seleção de Modo (2 Cards Iguais à Imagem) */}
        <div className="p-5 border-b border-slate-800 bg-slate-950/40">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Card 1: Imprimir Aviário Selecionado */}
            <div
              onClick={() => setPrintMode('single')}
              className={`cursor-pointer rounded-2xl p-4 border transition-all flex flex-col justify-between ${
                printMode === 'single'
                  ? 'bg-sky-500/10 border-sky-500 text-white shadow-lg shadow-sky-950/40 ring-1 ring-sky-400'
                  : 'bg-slate-900/90 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className={`p-2 rounded-xl border ${printMode === 'single' ? 'bg-sky-500 text-white border-sky-400' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                  <FileText className="w-4 h-4" />
                </div>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-300 font-mono font-bold">
                  1 Página A4
                </span>
              </div>
              <div>
                <h4 className="font-bold text-xs text-white">Imprimir Aviário Selecionado</h4>
                <p className="text-[11px] text-slate-400 mt-1">
                  Gera a ficha técnica do <strong>Aviário {currentAviario.numero_instalacao}</strong> ({currentAviario.produtor?.nome || 'Produtor'}).
                </p>
              </div>
            </div>

            {/* Card 2: Todos os Aviários do Produtor */}
            <div
              onClick={() => setPrintMode('all')}
              className={`cursor-pointer rounded-2xl p-4 border transition-all flex flex-col justify-between ${
                printMode === 'all'
                  ? 'bg-blue-600/15 border-blue-500 text-white shadow-lg shadow-blue-950/40 ring-1 ring-blue-400'
                  : 'bg-slate-900/90 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className={`p-2 rounded-xl border ${printMode === 'all' ? 'bg-blue-600 text-white border-blue-400' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                  <Layers className="w-4 h-4" />
                </div>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-mono font-bold">
                  {totalAviarios} {totalAviarios === 1 ? 'Página A4' : 'Páginas A4'}
                </span>
              </div>
              <div>
                <h4 className="font-bold text-xs text-white">Todos os Aviários do Produtor</h4>
                <p className="text-[11px] text-slate-400 mt-1">
                  Gera todas as fichas deste produtor (1 aviário por folha A4 com quebra de página automática).
                </p>
              </div>
            </div>

          </div>
        </div>

        {/* Pré-visualização A4 no Modal */}
        <div className="flex-1 overflow-y-auto p-5 bg-slate-950 flex flex-col items-center">
          <div className="text-xs text-slate-300 mb-3 flex items-center justify-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>Pré-visualização do Documento A4 Retrato ({aviariosToPrint.length} {aviariosToPrint.length === 1 ? 'folha' : 'folhas'}):</span>
          </div>

          {/* Folha A4 em Fundo Branco Limpo */}
          <div className="w-full max-w-[620px] bg-white text-slate-950 rounded-xl shadow-2xl p-4 border border-slate-300 overflow-hidden transform scale-[0.98] origin-top transition-transform">
            <FichaPrintDocument aviariosToPrint={aviariosToPrint.slice(0, 1)} />
            {aviariosToPrint.length > 1 && (
              <div className="mt-4 pt-3 border-t-2 border-dashed border-slate-400 text-center text-xs font-bold text-slate-500">
                + Mais {aviariosToPrint.length - 1} aviários serão gerados nas páginas seguintes (1 por folha A4).
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-900 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <span>💡 Dica: No diálogo de impressão, selecione destino <strong>"Salvar como PDF"</strong> ou sua impressora.</span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleExecutePrint}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 text-white font-bold text-xs shadow-lg shadow-blue-600/30 border border-sky-400/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Printer className="w-4 h-4" />
              <span>Gerar PDF / Imprimir ({aviariosToPrint.length} {aviariosToPrint.length === 1 ? 'Página' : 'Páginas'})</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
