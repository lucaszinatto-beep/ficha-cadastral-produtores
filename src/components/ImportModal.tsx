import React, { useState, useRef } from 'react';
import { 
  UploadCloud, FileSpreadsheet, CheckCircle2, AlertTriangle, XCircle, 
  ArrowRight, Download, RefreshCw, X, ShieldCheck, Database, FileText
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { parseExcelFile, executeImport } from '../services/importService';
import { ImportPreviewSummary, ImportacaoLog } from '../types/database';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: () => void;
  onViewHistory: () => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess,
  onViewHistory
}) => {
  const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'completed'>('upload');
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [sheets, setSheets] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [previewSummary, setPreviewSummary] = useState<ImportPreviewSummary | null>(null);
  const [filterPreviewStatus, setFilterPreviewStatus] = useState<'all' | 'valid' | 'errors'>('all');
  const [isParsing, setIsParsing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Import Execution State
  const [importProgress, setImportProgress] = useState<{
    stage: string;
    percent: number;
    message: string;
    stats: any;
  }>({
    stage: 'preparando',
    percent: 0,
    message: 'Iniciando importação...',
    stats: null
  });
  const [importResult, setImportResult] = useState<ImportacaoLog | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = async (selectedFile: File) => {
    if (!selectedFile.name.match(/\.(xlsx|xls)$/i)) {
      setErrorMessage('Por favor, selecione um arquivo válido no formato Excel (.xlsx ou .xls).');
      return;
    }

    setErrorMessage(null);
    setFile(selectedFile);
    setIsParsing(true);

    try {
      const { sheets: detectedSheets, activeSheet, previewSummary: summary } = await parseExcelFile(selectedFile);
      setSheets(detectedSheets);
      setSelectedSheet(activeSheet);
      setPreviewSummary(summary);
      setStep('preview');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Falha ao ler a planilha Excel.');
    } finally {
      setIsParsing(false);
    }
  };

  const handleSheetChange = async (newSheet: string) => {
    if (!file) return;
    setSelectedSheet(newSheet);
    setIsParsing(true);
    try {
      const { previewSummary: summary } = await parseExcelFile(file, newSheet);
      setPreviewSummary(summary);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Falha ao carregar a aba selecionada.');
    } finally {
      setIsParsing(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleStartImport = async () => {
    if (!previewSummary || !file) return;

    setStep('importing');
    setImportProgress({
      stage: 'produtores',
      percent: 5,
      message: 'Iniciando processamento seguro sem duplicidade...',
      stats: null
    });

    try {
      const result = await executeImport(
        previewSummary.allRows,
        file.name,
        selectedSheet,
        'Lucas Zinatto (Admin)',
        (progress) => {
          setImportProgress(progress);
        }
      );

      setImportResult(result);
      setStep('completed');
      
      // Trigger festive confetti
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });

      onImportSuccess();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Erro durante o processo de importação.');
      setStep('preview');
    }
  };

  const handleDownloadErrorReport = () => {
    if (!previewSummary && !importResult) return;
    
    let errorsList: any[] = [];
    if (importResult?.erros_json) {
      errorsList = importResult.erros_json;
    } else if (previewSummary) {
      errorsList = previewSummary.allRows
        .filter(r => !r.isValid)
        .map(r => ({
          linha: r.linha,
          produtor: r.avicultorRaw,
          instalacao: r.instalacaoRaw,
          erro: r.erros.join('; ')
        }));
    }

    if (errorsList.length === 0) {
      alert('Não há erros registrados nesta importação.');
      return;
    }

    const csvRows = [
      ['Linha', 'Produtor', 'Instalacao', 'Erro'].join(';')
    ];

    errorsList.forEach(e => {
      csvRows.push([e.linha, `"${e.produtor || ''}"`, `"${e.instalacao || ''}"`, `"${e.erro || ''}"`].join(';'));
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `relatorio_erros_importacao_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleReset = () => {
    setFile(null);
    setSheets([]);
    setSelectedSheet('');
    setPreviewSummary(null);
    setStep('upload');
    setErrorMessage(null);
    setImportResult(null);
  };

  const filteredPreviewRows = (previewSummary?.allRows || []).filter(row => {
    if (filterPreviewStatus === 'valid') return row.isValid;
    if (filterPreviewStatus === 'errors') return !row.isValid;
    return true;
  }).slice(0, 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden my-8">
        
        {/* Header Modal */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400">
              <UploadCloud className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                Importar Base de Dados
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-normal">
                  Upsert Inteligente
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Importe uma planilha Excel para cadastrar ou atualizar produtores, aviários, técnicos e dados de setup.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={step === 'importing'}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          
          {/* Error Banner */}
          {errorMessage && (
            <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-rose-200">Atenção na Importação</p>
                <p>{errorMessage}</p>
              </div>
              <button onClick={() => setErrorMessage(null)} className="text-rose-400 hover:text-rose-200">
                ✕
              </button>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 1: UPLOAD                                                            */}
          {/* ========================================================================= */}
          {step === 'upload' && (
            <div>
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`relative flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-3xl transition-all ${
                  isDragging
                    ? 'border-sky-400 bg-sky-500/10 scale-[0.99]'
                    : 'border-slate-700 hover:border-slate-600 bg-slate-800/30 hover:bg-slate-800/50'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
                  accept=".xlsx, .xls"
                  className="hidden"
                />

                <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-blue-600 to-sky-400 flex items-center justify-center text-white shadow-xl shadow-sky-500/20 mb-5">
                  <UploadCloud className="w-10 h-10 animate-pulse" />
                </div>

                <h3 className="text-lg font-bold text-white mb-1">
                  Arraste a planilha Excel aqui
                </h3>
                <p className="text-xs text-slate-400 mb-6 text-center max-w-sm">
                  ou selecione o arquivo local do seu computador para iniciar a leitura automática.
                </p>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isParsing}
                  className="px-6 py-3 rounded-2xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-500 hover:to-sky-500 shadow-lg shadow-sky-600/30 transition-all transform hover:-translate-y-0.5 active:scale-95 flex items-center gap-2"
                >
                  {isParsing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Analisando arquivo...</span>
                    </>
                  ) : (
                    <>
                      <FileSpreadsheet className="w-4 h-4" />
                      <span>[ SELECIONAR ARQUIVO ]</span>
                    </>
                  )}
                </button>

                <div className="mt-6 flex items-center gap-2 text-[11px] text-slate-500">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Arquivos permitidos: <strong>.xlsx</strong> e <strong>.xls</strong> • Detecção automática da aba <strong>Tbl_txt</strong></span>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 2: PREVIEW & VALIDATION                                              */}
          {/* ========================================================================= */}
          {step === 'preview' && previewSummary && (
            <div className="space-y-6">
              
              {/* File & Sheet Metadata Bar */}
              <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">ARQUIVO:</span>
                      <span className="text-xs font-bold text-white">{file?.name}</span>
                      <span className="text-[10px] text-slate-500">
                        ({file ? (file.size / 1024 / 1024).toFixed(2) : 0} MB)
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-[11px] text-slate-400">
                      <span>DATA: <strong>{new Date().toLocaleDateString('pt-BR')}</strong></span>
                      <span>TOTAL DE LINHAS: <strong className="text-sky-400">{previewSummary.totalLinhas}</strong></span>
                    </div>
                  </div>
                </div>

                {/* Sheet Selector */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-semibold">ABA DE DADOS:</span>
                  <select
                    value={selectedSheet}
                    onChange={(e) => handleSheetChange(e.target.value)}
                    className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
                  >
                    {sheets.map(s => (
                      <option key={s} value={s}>
                        {s} {s.toLowerCase() === 'tbl_txt' ? '★ (Recomendada)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Dynamic Resumo Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                
                {/* 👨‍🌾 PRODUTORES */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-950/60 to-slate-900 border border-blue-500/30 text-center relative overflow-hidden shadow-lg">
                  <div className="text-2xl mb-1">👨‍🌾</div>
                  <div className="text-2xl font-black text-white tracking-tight">
                    {previewSummary.produtoresUnicos}
                  </div>
                  <div className="text-[11px] font-semibold text-blue-300 uppercase tracking-wider mt-0.5">
                    PRODUTORES
                  </div>
                  <div className="text-[10px] text-slate-400">Identificados</div>
                </div>

                {/* 🏠 AVIÁRIOS */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-sky-950/60 to-slate-900 border border-sky-500/30 text-center relative overflow-hidden shadow-lg">
                  <div className="text-2xl mb-1">🏠</div>
                  <div className="text-2xl font-black text-white tracking-tight">
                    {previewSummary.aviariosUnicos}
                  </div>
                  <div className="text-[11px] font-semibold text-sky-300 uppercase tracking-wider mt-0.5">
                    AVIÁRIOS
                  </div>
                  <div className="text-[10px] text-slate-400">Identificados</div>
                </div>

                {/* 👷 TÉCNICOS */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-950/60 to-slate-900 border border-amber-500/30 text-center relative overflow-hidden shadow-lg">
                  <div className="text-2xl mb-1">👷</div>
                  <div className="text-2xl font-black text-white tracking-tight">
                    {previewSummary.tecnicosUnicos}
                  </div>
                  <div className="text-[11px] font-semibold text-amber-300 uppercase tracking-wider mt-0.5">
                    TÉCNICOS
                  </div>
                  <div className="text-[10px] text-slate-400">Identificados</div>
                </div>

                {/* ⚠️ PENDÊNCIAS / ERROS */}
                <div className={`p-4 rounded-2xl border text-center relative overflow-hidden shadow-lg ${
                  previewSummary.linhasComErro > 0
                    ? 'bg-rose-950/50 border-rose-500/40'
                    : 'bg-emerald-950/50 border-emerald-500/40'
                }`}>
                  <div className="text-2xl mb-1">{previewSummary.linhasComErro > 0 ? '⚠️' : '✓'}</div>
                  <div className={`text-2xl font-black tracking-tight ${
                    previewSummary.linhasComErro > 0 ? 'text-rose-400' : 'text-emerald-400'
                  }`}>
                    {previewSummary.linhasComErro}
                  </div>
                  <div className={`text-[11px] font-semibold uppercase tracking-wider mt-0.5 ${
                    previewSummary.linhasComErro > 0 ? 'text-rose-300' : 'text-emerald-300'
                  }`}>
                    {previewSummary.linhasComErro > 0 ? 'PENDÊNCIAS' : 'TUDO PRONTO'}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {previewSummary.linhasComErro > 0 ? 'Registros c/ Erro' : '100% Válido'}
                  </div>
                </div>

              </div>

              {/* Preview Table Controls */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-semibold">Filtrar Prévia:</span>
                  <div className="flex rounded-xl bg-slate-800 p-1 border border-slate-700">
                    <button
                      onClick={() => setFilterPreviewStatus('all')}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                        filterPreviewStatus === 'all' ? 'bg-sky-500 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Todos ({previewSummary.totalLinhas})
                    </button>
                    <button
                      onClick={() => setFilterPreviewStatus('valid')}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                        filterPreviewStatus === 'valid' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Válidos ({previewSummary.linhasValidas})
                    </button>
                    {previewSummary.linhasComErro > 0 && (
                      <button
                        onClick={() => setFilterPreviewStatus('errors')}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                          filterPreviewStatus === 'errors' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Erros ({previewSummary.linhasComErro})
                      </button>
                    )}
                  </div>
                </div>

                <span className="text-slate-500 text-[11px]">
                  Mostrando primeiras {filteredPreviewRows.length} linhas
                </span>
              </div>

              {/* Data Grid Preview */}
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 overflow-hidden max-h-72 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 bg-slate-900 text-slate-300 border-b border-slate-800 text-[11px] uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">Linha</th>
                      <th className="py-2.5 px-3">Produtor (Avicultor)</th>
                      <th className="py-2.5 px-3">Instalação</th>
                      <th className="py-2.5 px-3">Técnico (Extensionista)</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {filteredPreviewRows.map((row) => (
                      <tr key={row.linha} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-2 px-3 text-slate-500 font-mono text-[11px]">#{row.linha}</td>
                        <td className="py-2 px-3 font-medium text-white">
                          {row.avicultorClean || <span className="text-rose-400 italic">Vazio</span>}
                        </td>
                        <td className="py-2 px-3">
                          <span className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-sky-400 font-bold font-mono">
                            {row.instalacaoClean || '--'}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-slate-400">
                          {row.extensionistaClean || <span className="text-slate-600 italic">Não inf.</span>}
                        </td>
                        <td className="py-2 px-3">
                          {row.isValid ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold">
                              <CheckCircle2 className="w-3 h-3" /> Pronto
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-semibold" title={row.erros.join(', ')}>
                              <XCircle className="w-3 h-3" /> {row.erros[0]}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Action Buttons: Cancelar / Confirmar */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition-all"
                >
                  [ CANCELAR / TROCAR ARQUIVO ]
                </button>

                <button
                  type="button"
                  onClick={handleStartImport}
                  disabled={previewSummary.linhasValidas === 0}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 via-sky-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 shadow-lg shadow-sky-600/30 transition-all transform hover:-translate-y-0.5 active:scale-95 flex items-center gap-2"
                >
                  <Database className="w-4 h-4" />
                  <span>[ CONFIRMAR IMPORTAÇÃO ]</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 3: REAL-TIME IMPORT PROGRESS                                         */}
          {/* ========================================================================= */}
          {step === 'importing' && (
            <div className="py-12 px-6 text-center space-y-6">
              
              <div className="w-16 h-16 rounded-2xl bg-sky-500/10 border border-sky-500/30 text-sky-400 flex items-center justify-center mx-auto animate-pulse">
                <RefreshCw className="w-8 h-8 animate-spin" />
              </div>

              <div>
                <h3 className="text-xl font-black text-white">
                  Importando dados com Upsert Seguro...
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  {importProgress.message}
                </p>
              </div>

              {/* Animated Progress Bar */}
              <div className="max-w-md mx-auto space-y-2">
                <div className="w-full bg-slate-800 rounded-full h-3.5 p-0.5 border border-slate-700/80 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-blue-500 via-sky-400 to-emerald-400 h-full rounded-full transition-all duration-300 ease-out shadow-lg shadow-sky-500/50"
                    style={{ width: `${importProgress.percent}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] font-mono text-slate-400">
                  <span>PROGRESSO</span>
                  <span className="font-bold text-sky-400">{importProgress.percent}%</span>
                </div>
              </div>

              {/* Progress Checklist Indicators */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-w-xl mx-auto pt-4 text-xs">
                <div className={`p-2.5 rounded-xl border flex items-center gap-2 justify-center ${
                  importProgress.percent >= 25 ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-slate-800/40 border-slate-700 text-slate-500'
                }`}>
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Técnicos</span>
                </div>
                <div className={`p-2.5 rounded-xl border flex items-center gap-2 justify-center ${
                  importProgress.percent >= 50 ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-slate-800/40 border-slate-700 text-slate-500'
                }`}>
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Produtores</span>
                </div>
                <div className={`p-2.5 rounded-xl border flex items-center gap-2 justify-center ${
                  importProgress.percent >= 75 ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-slate-800/40 border-slate-700 text-slate-500'
                }`}>
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Aviários</span>
                </div>
                <div className={`p-2.5 rounded-xl border flex items-center gap-2 justify-center ${
                  importProgress.percent >= 95 ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-slate-800/40 border-slate-700 text-slate-500'
                }`}>
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Setups</span>
                </div>
              </div>

            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 4: COMPLETED SUMMARY                                                 */}
          {/* ========================================================================= */}
          {step === 'completed' && importResult && (
            <div className="space-y-6">
              
              <div className="text-center space-y-2">
                <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/20">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-black text-white">
                  IMPORTAÇÃO CONCLUÍDA COM SUCESSO!
                </h3>
                <p className="text-xs text-slate-400">
                  Todos os dados foram processados e integrados sem duplicidade no Supabase.
                </p>
              </div>

              {/* Detailed Breakdown Card */}
              <div className="p-5 rounded-2xl bg-slate-800/70 border border-slate-700 divide-y divide-slate-700/60 text-xs">
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pb-4 text-center">
                  <div>
                    <div className="text-lg font-black text-sky-400">
                      {importResult.produtores_criados} <span className="text-xs text-slate-400 font-normal">/ {importResult.produtores_atualizados}</span>
                    </div>
                    <div className="text-[11px] text-slate-300">Produtores (Criados / Atualizados)</div>
                  </div>

                  <div>
                    <div className="text-lg font-black text-sky-400">
                      {importResult.aviarios_criados} <span className="text-xs text-slate-400 font-normal">/ {importResult.aviarios_atualizados}</span>
                    </div>
                    <div className="text-[11px] text-slate-300">Aviários (Criados / Atualizados)</div>
                  </div>

                  <div>
                    <div className="text-lg font-black text-amber-400">
                      {importResult.tecnicos_criados} <span className="text-xs text-slate-400 font-normal">/ {importResult.tecnicos_atualizados}</span>
                    </div>
                    <div className="text-[11px] text-slate-300">Técnicos (Criados / Atualizados)</div>
                  </div>

                  <div>
                    <div className="text-lg font-black text-emerald-400">
                      {importResult.setups_criados} <span className="text-xs text-slate-400 font-normal">/ {importResult.setups_atualizados}</span>
                    </div>
                    <div className="text-[11px] text-slate-300">Setups (Criados / Atualizados)</div>
                  </div>
                </div>

                <div className="pt-3 flex flex-wrap items-center justify-between text-[11px] text-slate-400">
                  <span>Total de Registros Analisados: <strong className="text-white">{importResult.total_registros}</strong></span>
                  <span>Registros com Erro: <strong className={importResult.registros_com_erro > 0 ? 'text-rose-400' : 'text-emerald-400'}>{importResult.registros_com_erro}</strong></span>
                  <span>Arquivo: <strong className="text-sky-300">{importResult.nome_arquivo}</strong> ({importResult.aba_origem})</span>
                </div>

              </div>

              {/* Completion Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                
                <div className="flex items-center gap-2">
                  {importResult.registros_com_erro > 0 && (
                    <button
                      type="button"
                      onClick={handleDownloadErrorReport}
                      className="px-4 py-2.5 rounded-xl text-xs font-bold text-rose-300 bg-rose-950/60 hover:bg-rose-900/80 border border-rose-500/40 transition-all flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      <span>[ BAIXAR RELATÓRIO DE ERROS ]</span>
                    </button>
                  )}
                  
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onViewHistory();
                    }}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4 text-sky-400" />
                    <span>[ VER RELATÓRIO / HISTÓRICO ]</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-500 hover:to-sky-500 shadow-lg shadow-sky-600/30 transition-all transform hover:-translate-y-0.5 active:scale-95"
                >
                  [ CONCLUIR E VISUALIZAR DADOS ]
                </button>

              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
};
