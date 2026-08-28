import React, { useState } from 'react';
import { History, FileSpreadsheet, Download, RefreshCw, Layers } from 'lucide-react';
import { ImportacaoLog } from '../types/database';

interface ImportHistoryViewProps {
  logs: ImportacaoLog[];
  isLoading: boolean;
  onRefresh: () => void;
  onOpenImportModal: () => void;
}

export const ImportHistoryView: React.FC<ImportHistoryViewProps> = ({
  logs,
  isLoading,
  onRefresh,
  onOpenImportModal
}) => {
  const [selectedLog, setSelectedLog] = useState<ImportacaoLog | null>(null);

  const handleDownloadLogErrors = (log: ImportacaoLog) => {
    if (!log.erros_json || log.erros_json.length === 0) {
      alert('Esta importação não possui registros de erro.');
      return;
    }

    const csvRows = [
      ['Linha', 'Produtor', 'Instalacao', 'Erro'].join(';')
    ];

    log.erros_json.forEach(e => {
      csvRows.push([e.linha, `"${e.produtor || ''}"`, `"${e.instalacao || ''}"`, `"${e.erro || ''}"`].join(';'));
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `erros_${log.nome_arquivo}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      
      {/* View Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 border border-slate-700/80 rounded-3xl p-6 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <History className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Histórico de Importações</h2>
            <p className="text-xs text-slate-400">
              Auditoria de todos os uploads e atualizações de bases de dados efetuadas no sistema.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all"
            title="Recarregar histórico"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          
          <button
            onClick={onOpenImportModal}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-500 hover:to-sky-500 shadow-lg shadow-sky-600/30 transition-all flex items-center gap-2"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Nova Importação</span>
          </button>
        </div>
      </div>

      {/* Tabela do Histórico */}
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl overflow-hidden shadow-xl">
        {logs.length === 0 ? (
          <div className="py-16 text-center text-slate-400 space-y-3">
            <Layers className="w-12 h-12 text-slate-600 mx-auto" />
            <p className="text-sm font-semibold">Nenhuma importação registrada até o momento.</p>
            <p className="text-xs text-slate-500">Clique em "Nova Importação" para importar a primeira planilha Excel.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-950/80 text-slate-400 text-[11px] uppercase tracking-wider font-bold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">DATA & HORA</th>
                  <th className="py-3 px-4">ARQUIVO</th>
                  <th className="py-3 px-4">ABA</th>
                  <th className="py-3 px-4 text-center">REGISTROS</th>
                  <th className="py-3 px-4 text-center">PRODUTORES</th>
                  <th className="py-3 px-4 text-center">AVIÁRIOS</th>
                  <th className="py-3 px-4 text-center">TÉCNICOS</th>
                  <th className="py-3 px-4 text-center">STATUS</th>
                  <th className="py-3 px-4 text-right">AÇÕES</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {logs.map((log) => {
                  const dateStr = new Date(log.created_at).toLocaleString('pt-BR');
                  const hasErrors = log.registros_com_erro > 0;

                  return (
                    <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                        {dateStr}
                      </td>
                      <td className="py-3 px-4 font-bold text-white whitespace-nowrap">
                        {log.nome_arquivo}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 font-mono font-semibold text-[10px]">
                          {log.aba_origem}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-bold font-mono">
                        {log.total_registros}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="text-emerald-400 font-bold">+{log.produtores_criados}</span>
                        <span className="text-slate-500"> / </span>
                        <span className="text-sky-400">{log.produtores_atualizados}</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="text-emerald-400 font-bold">+{log.aviarios_criados}</span>
                        <span className="text-slate-500"> / </span>
                        <span className="text-sky-400">{log.aviarios_atualizados}</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="text-emerald-400 font-bold">+{log.tecnicos_criados}</span>
                        <span className="text-slate-500"> / </span>
                        <span className="text-sky-400">{log.tecnicos_atualizados}</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {hasErrors ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px] font-bold">
                            {log.registros_com_erro} erros
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                            ✓ Concluído
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {hasErrors && (
                            <button
                              onClick={() => handleDownloadLogErrors(log)}
                              className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-all"
                              title="Baixar CSV de erros"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => setSelectedLog(log)}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-400 hover:text-white border border-slate-700 font-semibold text-[11px] transition-all"
                          >
                            Detalhes
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Detalhes do Log Selecionado */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-sky-400" />
                Relatório de Importação: {selectedLog.nome_arquivo}
              </h3>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-400 block text-[11px]">Produtores</span>
                <span className="text-emerald-400 font-bold">Criados: {selectedLog.produtores_criados}</span>
                <span className="text-sky-400 block">Atualizados: {selectedLog.produtores_atualizados}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-400 block text-[11px]">Aviários</span>
                <span className="text-emerald-400 font-bold">Criados: {selectedLog.aviarios_criados}</span>
                <span className="text-sky-400 block">Atualizados: {selectedLog.aviarios_atualizados}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-400 block text-[11px]">Técnicos</span>
                <span className="text-emerald-400 font-bold">Criados: {selectedLog.tecnicos_criados}</span>
                <span className="text-sky-400 block">Atualizados: {selectedLog.tecnicos_atualizados}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-400 block text-[11px]">Setups</span>
                <span className="text-emerald-400 font-bold">Criados: {selectedLog.setups_criados}</span>
                <span className="text-sky-400 block">Atualizados: {selectedLog.setups_atualizados}</span>
              </div>
            </div>

            {selectedLog.erros_json && selectedLog.erros_json.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-bold text-rose-400">Erros Identificados ({selectedLog.erros_json.length}):</span>
                <div className="max-h-40 overflow-y-auto rounded-xl bg-slate-950 border border-slate-800 p-2 text-[11px] space-y-1 font-mono text-slate-300">
                  {selectedLog.erros_json.map((err, idx) => (
                    <div key={idx} className="border-b border-slate-900 pb-1">
                      Linha {err.linha}: {err.produtor} ({err.instalacao}) - {err.erro}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-slate-800 hover:bg-slate-700"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
