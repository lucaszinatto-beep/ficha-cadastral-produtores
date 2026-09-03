import React, { useState } from 'react';
import { 
  X, History, RotateCcw, Clock, User, 
  ChevronDown, ChevronUp, AlertTriangle, Sparkles, ShieldCheck
} from 'lucide-react';
import { SetupHistorico, Aviario } from '../types/database';
import { SETUP_FIELD_LABELS } from '../services/dataService';

interface FichaHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  aviario: Aviario;
  historico: SetupHistorico[];
  isLoading: boolean;
  onRestoreVersion: (versao: SetupHistorico) => Promise<void>;
  canEdit: boolean;
}

export const FichaHistoryModal: React.FC<FichaHistoryModalProps> = ({
  isOpen,
  onClose,
  aviario,
  historico,
  isLoading,
  onRestoreVersion,
  canEdit
}) => {
  const [expandedVersionId, setExpandedVersionId] = useState<string | null>(null);
  const [versionToRestore, setVersionToRestore] = useState<SetupHistorico | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  if (!isOpen) return null;

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return isoString;
    }
  };

  const formatValue = (val: any) => {
    if (val === null || val === undefined || val === '') return <span className="text-slate-500 italic">Vazio</span>;
    if (val === true) return <span className="text-emerald-400 font-bold">SIM</span>;
    if (val === false) return <span className="text-rose-400 font-bold">NÃO</span>;
    return <span className="font-mono text-white">{String(val)}</span>;
  };

  const handleConfirmRestore = async () => {
    if (!versionToRestore) return;
    setIsRestoring(true);
    try {
      await onRestoreVersion(versionToRestore);
      setVersionToRestore(null);
      onClose();
    } catch (err: any) {
      alert(`Falha ao restaurar versão: ${err?.message || 'Erro desconhecido'}`);
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Header do Modal */}
        <div className="p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white">Histórico & Auditoria da Ficha</h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-300 font-mono font-bold border border-sky-500/30">
                  {historico.length} {historico.length === 1 ? 'registro' : 'versões'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Produtor: <strong className="text-white uppercase">{aviario.produtor?.nome}</strong> • Aviário: <strong className="text-sky-300 font-mono">{aviario.numero_instalacao}</strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800/80 hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo com Linha do Tempo de Versões */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          
          {/* Informação explicativa */}
          <div className="bg-sky-950/30 border border-sky-500/20 rounded-2xl p-3.5 flex items-start gap-3 text-xs text-sky-200">
            <ShieldCheck className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sky-100">Registro de Auditoria Permanente</p>
              <p className="text-sky-300/80 text-[11px] mt-0.5">
                Cada cadastro ou alteração de dados registra automaticamente a data, hora, usuário responsável e o detalhamento das modificações. Você pode navegar pelo histórico e restaurar qualquer versão anterior.
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="py-16 text-center text-slate-400 space-y-3">
              <Clock className="w-8 h-8 animate-spin mx-auto text-sky-400" />
              <p className="text-xs font-semibold">Carregando linha do tempo de auditoria...</p>
            </div>
          ) : historico.length === 0 ? (
            <div className="py-16 text-center text-slate-400 space-y-3 bg-slate-950/40 rounded-2xl border border-slate-800">
              <History className="w-10 h-10 text-slate-600 mx-auto" />
              <h3 className="text-sm font-bold text-white">Nenhum histórico registrado ainda</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Assim que a ficha for salva ou qualquer alteração for realizada neste aviário, o histórico completo com usuário e data/hora aparecerá aqui.
              </p>
            </div>
          ) : (
            <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-800">
              {historico.map((item, index) => {
                const isFirstEver = item.versao === 1 || item.tipo_acao === 'CRIACAO';
                const isLatest = index === 0;
                const isExpanded = expandedVersionId === item.id;
                
                return (
                  <div key={item.id} className="relative group">
                    
                    {/* Marcador na Linha do Tempo */}
                    <div className={`absolute -left-6 sm:-left-8 top-3 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                      isLatest 
                        ? 'bg-sky-500 border-white ring-4 ring-sky-500/20 text-white' 
                        : isFirstEver 
                        ? 'bg-emerald-500 border-white ring-4 ring-emerald-500/20 text-white' 
                        : 'bg-slate-800 border-slate-600 text-slate-300'
                    }`}>
                      {isFirstEver ? (
                        <Sparkles className="w-3 h-3" />
                      ) : (
                        <span className="text-[10px] font-mono font-black">{item.versao}</span>
                      )}
                    </div>

                    {/* Card da Versão */}
                    <div className={`rounded-2xl border transition-all p-4 sm:p-5 ${
                      isLatest 
                        ? 'bg-slate-900/90 border-sky-500/40 shadow-lg shadow-sky-500/5' 
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}>
                      
                      {/* Topo do Card */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800/80">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-mono font-black text-white px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700">
                            Versão {item.versao}
                          </span>

                          {/* Tipo de Ação */}
                          {item.tipo_acao === 'CRIACAO' ? (
                            <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                              <Sparkles className="w-3 h-3" /> Cadastro Inicial
                            </span>
                          ) : item.tipo_acao === 'RESTAURACAO' ? (
                            <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                              <RotateCcw className="w-3 h-3" /> Restauração
                            </span>
                          ) : (
                            <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-sky-500/10 text-sky-300 border border-sky-500/30">
                              Ajuste Técnico
                            </span>
                          )}

                          {isLatest && (
                            <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded bg-sky-500 text-white tracking-wider">
                              Atual
                            </span>
                          )}

                          {isFirstEver && !isLatest && (
                            <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 tracking-wider">
                              ⭐ Primeiro Cadastro
                            </span>
                          )}
                        </div>

                        {/* Botão de Restaurar */}
                        {canEdit && !isLatest && (
                          <button
                            type="button"
                            onClick={() => setVersionToRestore(item)}
                            className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 hover:text-amber-200 border border-amber-500/30 transition-all flex items-center gap-1.5 self-start sm:self-center active:scale-95"
                          >
                            <RotateCcw className="w-3.5 h-3.5" /> Restaurar esta Versão
                          </button>
                        )}
                      </div>

                      {/* Metadados de Autoria (Quem e Quando) */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 my-3 text-xs">
                        <div className="flex items-center gap-2 text-slate-300">
                          <User className="w-3.5 h-3.5 text-sky-400" />
                          <span className="text-slate-400">Gravado por:</span>
                          <strong className="text-white">{item.usuario_nome}</strong>
                        </div>
                        <div className="flex items-center gap-2 text-slate-300">
                          <Clock className="w-3.5 h-3.5 text-sky-400" />
                          <span className="text-slate-400">Data e Hora:</span>
                          <strong className="text-white font-mono">{formatDate(item.created_at)}</strong>
                        </div>
                      </div>

                      {/* Resumo Textual */}
                      {item.resumo_alteracoes && (
                        <p className="text-xs text-slate-300 bg-slate-900/90 border border-slate-800/80 rounded-xl p-2.5">
                          {item.resumo_alteracoes}
                        </p>
                      )}

                      {/* Botão de Expandir Alterações Detalhadas */}
                      {item.alteracoes && item.alteracoes.length > 0 && (
                        <div className="mt-3">
                          <button
                            type="button"
                            onClick={() => setExpandedVersionId(isExpanded ? null : item.id)}
                            className="text-xs text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1 transition-colors"
                          >
                            {isExpanded ? (
                              <>
                                <ChevronUp className="w-3.5 h-3.5" /> Ocultar detalhamento de campos ({item.alteracoes.length})
                              </>
                            ) : (
                              <>
                                <ChevronDown className="w-3.5 h-3.5" /> Ver campos gravados/ajustados ({item.alteracoes.length})
                              </>
                            )}
                          </button>

                          {/* Detalhamento Expandido */}
                          {isExpanded && (
                            <div className="mt-3 overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                              <table className="w-full text-left text-xs">
                                <thead>
                                  <tr className="border-b border-slate-800 text-[10px] text-slate-400 uppercase">
                                    <th className="py-1.5 px-2">Parâmetro / Campo</th>
                                    {item.tipo_acao !== 'CRIACAO' && (
                                      <th className="py-1.5 px-2">Valor Anterior</th>
                                    )}
                                    <th className="py-1.5 px-2">
                                      {item.tipo_acao === 'CRIACAO' ? 'Valor Cadastrado' : 'Novo Valor Ajustado'}
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-850">
                                  {item.alteracoes.map((alt, altIdx) => (
                                    <tr key={altIdx} className="hover:bg-slate-900/50">
                                      <td className="py-2 px-2 font-medium text-slate-300">
                                        {alt.label || SETUP_FIELD_LABELS[alt.campo] || alt.campo}
                                      </td>
                                      {item.tipo_acao !== 'CRIACAO' && (
                                        <td className="py-2 px-2 text-slate-400">
                                          {formatValue(alt.valor_anterior)}
                                        </td>
                                      )}
                                      <td className="py-2 px-2 text-sky-300 font-semibold">
                                        {formatValue(alt.valor_novo)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      )}

                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>

        {/* Footer do Modal */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between shrink-0">
          <p className="text-[11px] text-slate-500">
            Total de revisões auditadas: <strong className="text-slate-300">{historico.length}</strong>
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-all"
          >
            Fechar
          </button>
        </div>

      </div>

      {/* MODAL DE CONFIRMAÇÃO DE RESTAURAÇÃO */}
      {versionToRestore && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border-2 border-amber-500/50 rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-amber-400">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-black text-white">Confirmar Restauração</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Você está prestes a restaurar a Ficha Técnica para a <strong className="text-amber-300">Versão {versionToRestore.versao}</strong>, gravada originalmente por <strong className="text-white">{versionToRestore.usuario_nome}</strong> em <strong className="text-white font-mono">{formatDate(versionToRestore.created_at)}</strong>.
            </p>

            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200">
              Os dados atuais da Ficha Técnica serão redefinidos com os valores desta versão anterior e uma nova revisão de auditoria será gerada registrando essa restauração.
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setVersionToRestore(null)}
                disabled={isRestoring}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmRestore}
                disabled={isRestoring}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 transition-all shadow-lg shadow-amber-600/20 flex items-center gap-2 active:scale-95"
              >
                <RotateCcw className="w-4 h-4" />
                {isRestoring ? 'Restaurando...' : 'Sim, Restaurar Dados'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
