import React, { useState, useEffect, useRef } from 'react';
import { 
  Printer, Edit3, Save, RotateCcw, Check, Sparkles, 
  Wind, Gauge, Droplets, Bell, Ruler, Sun, Fan, Smartphone, History,
  Sliders, Camera, UploadCloud, Trash2, ZoomIn, 
  AlertCircle, FileText, AlertTriangle
} from 'lucide-react';
import { Aviario, SetupAviario, Tecnico, SetupHistorico, SetupFoto } from '../types/database';
import { 
  saveSetupData, updateAviarioTecnico, fetchSetupHistorico, restoreSetupVersion,
  deleteSetupHistoricoItem, clearAllSetupHistorico, applyDefaultSetupValues,
  getAviarioFotos, validateSetupFields
} from '../services/dataService';

import { CompanyLogo } from './CompanyLogo';
import { useCompany } from '../context/CompanyContext';
import { PrintSetupModal } from './PrintSetupModal';
import { FichaHistoryModal } from './FichaHistoryModal';

import { UserProfile } from '../services/profileService';

/**
 * Utilitário para compactação de fotos no cliente via HTML5 Canvas
 * Mantém excelente nitidez visual e reduz arquivos de 5-10MB para ~150KB
 */
async function compressImageFile(file: File, maxWidth = 1280, maxHeight = 1280, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

interface FichaSetupCardProps {
  aviario: Aviario;
  allTecnicos: Tecnico[];
  allAviariosOfProdutor?: Aviario[];
  onSetupUpdated: () => void;
  userProfile?: UserProfile | null;
}

export const FichaSetupCard: React.FC<FichaSetupCardProps> = ({
  aviario,
  allTecnicos,
  allAviariosOfProdutor = [],
  onSetupUpdated,
  userProfile = null
}) => {
  const { currentCompany, currentUnit } = useCompany();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isConfirmingDefault, setIsConfirmingDefault] = useState(false);
  const [isApplyingDefault, setIsApplyingDefault] = useState(false);
  const [historicoList, setHistoricoList] = useState<SetupHistorico[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [selectedTecnicoId, setSelectedTecnicoId] = useState<string>(aviario.tecnico_id || '');
  const [formData, setFormData] = useState<Partial<SetupAviario>>({});
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Estados de Evidências Fotográficas e Validação
  const [fotos, setFotos] = useState<SetupFoto[]>([]);
  const [isProcessingPhotos, setIsProcessingPhotos] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [previewPhoto, setPreviewPhoto] = useState<SetupFoto | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadHistoricoData = async () => {
    if (!aviario.id) return;
    setIsLoadingHistory(true);
    try {
      const list = await fetchSetupHistorico(aviario.id);
      setHistoricoList(list);
    } catch (err) {
      console.warn('Erro ao carregar histórico:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    setFormData(aviario.setup || {});
    setSelectedTecnicoId(aviario.tecnico_id || '');
    setFotos(getAviarioFotos(aviario.id, aviario.setup));
    setValidationError(null);
    setIsEditing(false);
    loadHistoricoData();
  }, [aviario]);

  const handleFieldChange = (field: keyof SetupAviario, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    // Limpa mensagem de erro ao alterar campo
    if (validationError) setValidationError(null);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessingPhotos(true);
    setValidationError(null);
    try {
      const newFotos: SetupFoto[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith('image/')) continue;
        const compressedBase64 = await compressImageFile(file);
        newFotos.push({
          id: `foto_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          url: compressedBase64,
          nome: file.name,
          tamanho: file.size,
          created_at: new Date().toISOString()
        });
      }
      setFotos(prev => [...prev, ...newFotos]);
    } catch (err: any) {
      console.error('Erro ao processar imagem:', err);
      setValidationError('Erro ao carregar imagem: ' + (err?.message || 'Arquivo inválido'));
    } finally {
      setIsProcessingPhotos(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemovePhoto = (photoId: string) => {
    setFotos(prev => prev.filter(f => f.id !== photoId));
  };

  const handleSave = async () => {
    setValidationError(null);

    // Validação 1: Pelo menos uma foto deve existir (Regra de Negócio Obrigatória)
    if (!fotos || fotos.length === 0) {
      setValidationError('É obrigatório anexar pelo menos uma foto do setup.');
      return;
    }

    // Validação 2: Campos obrigatórios do setup preenchidos
    const validation = validateSetupFields(formData);
    if (!validation.isValid) {
      setValidationError(`Preencha todos os campos obrigatórios antes de salvar: ${validation.missingFields.join(', ')}.`);
      return;
    }

    setIsSaving(true);
    try {
      if (selectedTecnicoId !== aviario.tecnico_id) {
        await updateAviarioTecnico(aviario.id, selectedTecnicoId || null);
      }
      await saveSetupData(
        aviario.id, 
        {
          ...formData,
          fotos
        }, 
        userProfile, 
        undefined, 
        undefined, 
        currentCompany.id,
        currentCompany.slug === 'levo' ? currentUnit?.id : null
      );
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      setIsEditing(false);
      await loadHistoricoData();
      onSetupUpdated();
    } catch (err: any) {
      setValidationError(err?.message || 'Falha ao salvar dados.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRestoreVersion = async (versionItem: SetupHistorico) => {
    await restoreSetupVersion(aviario.id, versionItem, userProfile);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
    setIsEditing(false);
    await loadHistoricoData();
    onSetupUpdated();
  };

  const handleDeleteHistoryItem = async (historyId: string) => {
    await deleteSetupHistoricoItem(historyId, aviario.id);
    await loadHistoricoData();
  };

  const handleClearAllHistory = async () => {
    await clearAllSetupHistorico(aviario.id);
    await loadHistoricoData();
  };

  const handleApplyDefaultValues = async () => {
    setIsApplyingDefault(true);
    try {
      const updated = await applyDefaultSetupValues(
        aviario.id, 
        userProfile, 
        currentCompany.id, 
        currentCompany.nome,
        currentCompany.slug === 'levo' ? currentUnit?.id : null
      );
      setFormData(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      setIsConfirmingDefault(false);
      setIsEditing(false);
      await loadHistoricoData();
      onSetupUpdated();
    } catch (err: any) {
      alert(`Erro ao atribuir valores padrão: ${err?.message || 'Falha ao salvar'}`);
    } finally {
      setIsApplyingDefault(false);
    }
  };

  const setup = isEditing ? formData : (aviario.setup || {});

  // Helper otimizado para mobile (touch targets maiores)
  const renderCell = (field: keyof SetupAviario, unit: string = '', placeholder: string = '-') => {
    const val = (setup as any)[field];
    if (isEditing) {
      return (
        <input
          type="number"
          step="any"
          value={val !== undefined && val !== null ? val : ''}
          onChange={(e) => handleFieldChange(field, e.target.value === '' ? null : parseFloat(e.target.value))}
          placeholder={placeholder}
          className="w-full min-h-[40px] md:min-h-[32px] bg-slate-900 border border-sky-500/50 rounded-lg md:rounded px-2 md:px-1.5 text-sm md:text-xs text-white font-mono text-center focus:outline-none focus:ring-2 focus:ring-sky-400/50 transition-all"
        />
      );
    }
    return (
      <span className="font-mono text-sm md:text-xs font-semibold text-slate-100 min-h-[24px] flex items-center justify-center md:justify-end">
        {val !== undefined && val !== null ? `${val} ${unit}`.trim() : <span className="text-slate-600 font-normal">-</span>}
      </span>
    );
  };

  const renderBooleanBadge = (field: keyof SetupAviario) => {
    const val = (setup as any)[field];
    if (isEditing) {
      return (
        <button
          type="button"
          onClick={() => handleFieldChange(field, val === true ? false : val === false ? null : true)}
          className={`w-full md:w-auto min-h-[40px] md:min-h-[28px] px-3 py-1 rounded-lg md:rounded text-xs md:text-[11px] font-bold border transition-all active:scale-95 ${
            val === true
              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
              : val === false
              ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
              : 'bg-slate-800 text-slate-400 border-slate-700'
          }`}
        >
          {val === true ? 'SIM' : val === false ? 'NÃO' : 'NÃO INF.'}
        </button>
      );
    }

    if (val === true) {
      return (
        <span className="inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-lg text-[10px] md:text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
          <Check className="w-3 h-3" /> SIM
        </span>
      );
    }
    if (val === false) {
      return (
        <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-lg text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
          NÃO
        </span>
      );
    }
    return <span className="text-slate-600 text-xs">-</span>;
  };

  const isSuperOrAdmin = userProfile?.role === 'super_admin' || userProfile?.role === 'admin';
  const isOwnerExtensionist = userProfile?.role === 'extensionista' && 
                              aviario.tecnico?.nome?.trim().toLowerCase() === userProfile.full_name?.trim().toLowerCase();
  const canEdit = isSuperOrAdmin || isOwnerExtensionist;

  const formatHeaderDate = (isoString?: string | null) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '';
    }
  };

  const primeiroRegistro = historicoList.find(h => h.versao === 1) || (historicoList.length > 0 ? historicoList[historicoList.length - 1] : null);
  const ultimoRegistro = historicoList.length > 0 ? historicoList[0] : null;

  return (
    <div className="w-full max-w-7xl mx-auto bg-slate-900 border border-slate-700/80 rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-2xl space-y-6 relative overflow-hidden">
      
      {/* ========================================================================= */}
      {/* ACTION HEADER (Otimizado para mobile: empilha verticalmente)              */}
      {/* ========================================================================= */}
      <div className="no-print flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs px-2.5 py-1.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20 font-bold uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> Ficha Técnica
          </span>
          {saveSuccess && (
            <span className="text-xs px-2.5 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1 animate-pulse">
              <Check className="w-3.5 h-3.5" /> Salvo!
            </span>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {isEditing ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setFormData(aviario.setup || {});
                  setFotos(getAviarioFotos(aviario.id, aviario.setup));
                  setValidationError(null);
                  setIsEditing(false);
                }}
                disabled={isSaving}
                className="min-h-[44px] px-4 rounded-xl text-sm font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-all flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" /> Cancelar
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="min-h-[44px] px-4 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                <Save className="w-4 h-4" /> {isSaving ? 'Salvando...' : 'Salvar'}
              </button>
            </>
          ) : (
            <>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="min-h-[44px] px-4 rounded-xl text-sm font-semibold text-sky-300 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 transition-all flex items-center justify-center gap-2"
                >
                  <Edit3 className="w-4 h-4" /> Editar
                </button>
              )}
              {isSuperOrAdmin && (
                <button
                  type="button"
                  onClick={() => setIsConfirmingDefault(true)}
                  className="min-h-[44px] px-3.5 rounded-xl text-sm font-semibold text-emerald-300 hover:text-white bg-emerald-500/10 hover:bg-emerald-600/80 border border-emerald-500/30 hover:border-emerald-400 transition-all flex items-center justify-center gap-1.5 active:scale-95 shadow-sm"
                  title="Atribuir Parâmetros Técnicos Padrão Bello Alimentos"
                >
                  <Sliders className="w-4 h-4 text-emerald-400" />
                  <span>Atribuir Padrão</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsHistoryModalOpen(true)}
                className="min-h-[44px] px-4 rounded-xl text-sm font-semibold text-sky-200 bg-slate-800 hover:bg-sky-600 hover:text-white border border-slate-700 hover:border-sky-500/50 shadow-sm transition-all flex items-center justify-center gap-2 active:scale-95"
                title="Histórico de Auditoria & Versões Anteriores"
              >
                <History className="w-4 h-4 text-sky-400" />
                <span>Auditoria</span>
                {historicoList.length > 0 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 font-bold font-mono border border-sky-500/30">
                    {historicoList.length}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setIsPrintModalOpen(true)}
                className="min-h-[44px] px-4 rounded-xl text-sm font-semibold text-slate-200 bg-slate-800 hover:bg-sky-600 hover:text-white border border-slate-700 hover:border-sky-500/50 shadow-sm transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                <Printer className="w-4 h-4 text-sky-400" /> PDF
              </button>
            </>
          )}
        </div>
      </div>

      {/* Banner de Erro de Validação */}
      {validationError && (
        <div className="p-4 rounded-2xl bg-rose-950/80 border border-rose-500/60 text-rose-200 text-xs flex items-center justify-between gap-3 shadow-xl animate-fade-in">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <div>
              <p className="font-bold text-rose-100">Não foi possível salvar o setup</p>
              <p className="text-[11px] text-rose-300 mt-0.5">{validationError}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setValidationError(null)}
            className="text-rose-400 hover:text-white p-1 text-xs font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CABEÇALHO DO LAUDO (Responsivo: Logo vai para o topo no mobile)           */}
      {/* ========================================================================= */}
      <div className="border-2 border-slate-700/80 rounded-2xl p-4 md:p-5 bg-slate-950/70 relative">
        <div className="flex flex-col md:grid md:grid-cols-12 gap-4 items-start md:items-center">
          
          <div className="md:col-span-8 space-y-3 w-full">
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
              <span className="text-[10px] md:text-xs font-black text-sky-400 tracking-wider">PRODUTOR:</span>
              <span className="text-base md:text-lg font-black text-white tracking-wide uppercase break-words">
                {aviario.produtor?.nome || 'Não informado'}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row flex-wrap gap-3 md:gap-6 text-xs md:text-sm text-slate-300">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-500 text-[10px] md:text-xs">AVIÁRIO:</span>
                <span className="px-2.5 py-1 rounded-lg bg-sky-500/20 border border-sky-500/40 text-sky-300 font-mono font-bold text-sm md:text-base">
                  {aviario.numero_instalacao}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                <span className="font-bold text-slate-500 text-[10px] md:text-xs">TÉCNICO:</span>
                {isEditing ? (
                  <select
                    value={selectedTecnicoId}
                    onChange={(e) => setSelectedTecnicoId(e.target.value)}
                    className="w-full sm:w-auto bg-slate-900 border border-sky-500/50 rounded-lg px-3 py-2 text-sm text-sky-300 font-semibold focus:ring-2 focus:ring-sky-500/30 outline-none"
                  >
                    <option value="">-- Selecione --</option>
                    {allTecnicos.map(t => (
                      <option key={t.id} value={t.id}>{t.nome}</option>
                    ))}
                  </select>
                ) : (
                  <span className="font-semibold text-amber-300 flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5 md:hidden" />
                    {aviario.tecnico?.nome || 'Não vinculado'}
                  </span>
                )}
              </div>
            </div>

            {/* Informações de Auditoria: Criador e Última Alteração */}
            {(primeiroRegistro || setup.created_by_name || setup.created_at) && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-3 border-t border-slate-800/80 text-[11px]">
                <div className="flex items-center gap-1.5 text-slate-400">
                  <span className="text-slate-500 font-bold text-[10px] uppercase">1º Cadastro:</span>
                  <span className="text-emerald-400 font-semibold">
                    {primeiroRegistro?.usuario_nome || setup.created_by_name || 'Bello Alimentos'}
                  </span>
                  {(primeiroRegistro?.created_at || setup.created_at) && (
                    <span className="text-slate-500 font-mono text-[10px]">
                      em {formatHeaderDate(primeiroRegistro?.created_at || setup.created_at)}
                    </span>
                  )}
                </div>

                {((ultimoRegistro && ultimoRegistro.versao > 1) || (setup.updated_by_name && setup.updated_by_name !== (primeiroRegistro?.usuario_nome || setup.created_by_name))) && (
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <span className="text-slate-500 font-bold text-[10px] uppercase">• Último Ajuste:</span>
                    <span className="text-sky-300 font-semibold">
                      {ultimoRegistro ? `${ultimoRegistro.usuario_nome} (v${ultimoRegistro.versao})` : setup.updated_by_name}
                    </span>
                    {(ultimoRegistro?.created_at || setup.updated_at) && (
                      <span className="text-slate-500 font-mono text-[10px]">
                        em {formatHeaderDate(ultimoRegistro?.created_at || setup.updated_at)}
                      </span>
                    )}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setIsHistoryModalOpen(true)}
                  className="text-sky-400 hover:text-sky-300 underline font-semibold flex items-center gap-1 ml-auto text-[11px]"
                >
                  <History className="w-3 h-3" /> Ver histórico ({historicoList.length})
                </button>
              </div>
            )}
          </div>

          <div className="md:col-span-4 flex justify-start md:justify-end items-center w-full mt-2 md:mt-0 pt-3 md:pt-0 border-t md:border-t-0 border-slate-800">
            <div className="flex flex-col items-end">
              <CompanyLogo
                company={currentCompany}
                variant="card"
                className="h-9 w-auto"
                containerClassName="h-12 w-auto min-w-[90px] max-w-[150px] px-2.5 py-1 shadow-lg shadow-black/20 border transition-all"
                withBorder
              />
              <div className="text-[9px] md:text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1.5">
                {currentCompany.nome} • Setup
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ========================================================================= */}
      {/* GRADE DE SETUP TÉCNICO (Grid responsivo: 1 col mobile, 2 col desktop)     */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        
        {/* COLUNA ESQUERDA */}
        <div className="space-y-4 md:space-y-6">
          
          {/* 1. PRESSÃO VEDAÇÃO & TRABALHO */}
          <div className="border border-slate-700/80 rounded-2xl overflow-hidden bg-slate-950/40">
            <div className="flex flex-col md:grid md:grid-cols-2 md:divide-x md:divide-slate-700/80">
              
              {/* Pressão Vedação */}
              <div className="p-4 md:p-3 border-b md:border-b-0 border-slate-800">
                <div className="flex items-center gap-1.5 text-xs font-black text-sky-400 uppercase tracking-wider mb-3 md:mb-2">
                  <Gauge className="w-3.5 h-3.5" /> Vedação
                </div>
                <div className="space-y-2 md:space-y-1.5 text-xs">
                  <div className="flex justify-between items-center text-slate-400">
                    <span>Nº EXAUSTOR:</span> {renderCell('pressao_vedacao_exaustor')}
                  </div>
                  <div className="flex justify-between items-center text-slate-400">
                    <span>MANÔMETRO:</span> {renderCell('pressao_vedacao_manometro')}
                  </div>
                  <div className="flex justify-between items-center text-slate-400">
                    <span>PAINEL:</span> {renderCell('pressao_vedacao_painel')}
                  </div>
                  <div className="flex justify-between items-center text-sky-300 font-bold pt-2 md:pt-1 border-t border-slate-800/80">
                    <span>MÉDIA:</span> {renderCell('pressao_vedacao_media')}
                  </div>
                </div>
              </div>

              {/* Pressão de Trabalho */}
              <div className="p-4 md:p-3">
                <div className="flex items-center gap-1.5 text-xs font-black text-sky-400 uppercase tracking-wider mb-3 md:mb-2">
                  <Gauge className="w-3.5 h-3.5" /> Trabalho
                </div>
                <div className="space-y-2 md:space-y-1.5 text-xs">
                  <div className="flex justify-between items-center text-slate-400">
                    <span>Nº EXAUSTOR:</span> {renderCell('pressao_trabalho_exaustor')}
                  </div>
                  <div className="flex justify-between items-center text-slate-400">
                    <span>MANÔMETRO:</span> {renderCell('pressao_trabalho_manometro')}
                  </div>
                  <div className="flex justify-between items-center text-slate-400">
                    <span>PAINEL:</span> {renderCell('pressao_trabalho_painel')}
                  </div>
                  <div className="flex justify-between items-center text-sky-300 font-bold pt-2 md:pt-1 border-t border-slate-800/80">
                    <span>MÉDIA:</span> {renderCell('pressao_trabalho_media')}
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* 2. VENTILAÇÃO TOTAL */}
          <div className="border border-slate-700/80 rounded-2xl p-4 bg-slate-950/40 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2">
              <div className="flex items-center gap-1.5 text-xs font-black text-sky-400 uppercase tracking-wider">
                <Wind className="w-3.5 h-3.5" /> Ventilação Total
              </div>
              <div className="flex items-center gap-2 text-xs bg-slate-900/80 px-2 py-1 rounded-lg border border-slate-800 w-fit">
                <span className="text-slate-400">QTD. EXAUSTORES:</span>
                {renderCell('qtd_exaustores', 'un')}
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-center text-xs">
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="block text-[10px] text-slate-500 mb-1">LATERAL DIR.</span>
                {renderCell('ventilacao_dir', 'm/s')}
              </div>
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="block text-[10px] text-slate-500 mb-1">MEIO</span>
                {renderCell('ventilacao_meio', 'm/s')}
              </div>
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="block text-[10px] text-slate-500 mb-1">LATERAL ESQ.</span>
                {renderCell('ventilacao_esq', 'm/s')}
              </div>
            </div>

            <div className="flex justify-between items-center text-xs text-sky-300 font-bold pt-1">
              <span>MÉDIA DE VENTO:</span>
              {renderCell('ventilacao_media', 'm/s')}
            </div>
          </div>

          {/* 3. VENTILAÇÃO ENTRADA DE AR */}
          <div className="border border-slate-700/80 rounded-2xl p-4 bg-slate-950/40 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-black text-sky-400 uppercase tracking-wider border-b border-slate-800 pb-2">
              <Fan className="w-3.5 h-3.5" /> Entrada de Ar
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {['Lado 01 (Fornos)', 'Lado 02'].map((lado, idx) => {
                const prefix = idx === 0 ? 'l1' : 'l2';
                const colorClass = idx === 0 ? 'text-amber-400' : 'text-sky-400';
                return (
                  <div key={lado} className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                    <span className={`block font-bold ${colorClass} text-[11px] border-b border-slate-800 pb-1`}>
                      {lado}
                    </span>
                    {['Frente', 'Centro', 'Fundo'].map((ponto, pIdx) => (
                      <div key={ponto} className="flex justify-between items-center text-slate-400">
                        <span>P{pIdx + 1} {ponto}:</span>
                        {renderCell(`vent_ar_${prefix}_p${pIdx + 1}` as keyof SetupAviario, 'm/s')}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between items-center text-xs text-sky-300 font-bold pt-1">
              <span>MÉDIA ENTRADA:</span>
              {renderCell('vent_ar_media', 'm/s')}
            </div>
          </div>

          {/* 4. RECURSOS HÍDRICOS */}
          <div className="border border-slate-700/80 rounded-2xl p-4 bg-slate-950/40 space-y-3 text-xs">
            <div className="flex items-center gap-1.5 text-xs font-black text-sky-400 uppercase tracking-wider border-b border-slate-800 pb-2">
              <Droplets className="w-3.5 h-3.5" /> Água & Armazenamento
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                { label: 'POÇO 1', field: 'vazao_poco_1', unit: 'L/h' },
                { label: 'POÇO 2', field: 'vazao_poco_2', unit: 'L/h' },
                { label: 'ENTRADA GALPÃO', field: 'entrada_agua_galpao', unit: 'L/h' },
                { label: 'ARMAZENAMENTO', field: 'armazenamento_agua', unit: 'L' }
              ].map(item => (
                <div key={item.field} className="flex justify-between items-center text-slate-400 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                  <span className="font-medium">{item.label}:</span>
                  {renderCell(item.field as keyof SetupAviario, item.unit)}
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* COLUNA DIREITA */}
        <div className="space-y-4 md:space-y-6">
          
          {/* 5. ILUMINAÇÃO / LUX */}
          <div className="border border-slate-700/80 rounded-2xl p-4 bg-slate-950/40 space-y-3 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2">
              <div className="flex items-center gap-1.5 text-xs font-black text-sky-400 uppercase tracking-wider">
                <Sun className="w-3.5 h-3.5" /> Iluminação
              </div>
              <div className="flex items-center gap-2 bg-slate-900/80 px-2 py-1 rounded-lg border border-slate-800 w-fit">
                <span className="text-slate-400">LUX 100%:</span>
                {renderCell('lux_100', 'lux')}
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-center">
              {[
                { label: 'SOB LÂMPADA', field: 'iluminacao_sob_lampada' },
                { label: 'LATERAL', field: 'iluminacao_lateral' },
                { label: 'TRIÂNGULO', field: 'iluminacao_triangulo' }
              ].map(item => (
                <div key={item.field} className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                  <span className="block text-[10px] text-slate-500 mb-1">{item.label}</span>
                  {renderCell(item.field as keyof SetupAviario, 'lux')}
                </div>
              ))}
            </div>
          </div>

          {/* 6. PLACA EVAPORATIVA */}
          <div className="border border-slate-700/80 rounded-2xl p-4 bg-slate-950/40 space-y-3 text-xs">
            <div className="flex items-center gap-1.5 text-xs font-black text-sky-400 uppercase tracking-wider border-b border-slate-800 pb-2">
              <Sparkles className="w-3.5 h-3.5" /> Placa Evaporativa
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="flex justify-between items-center text-slate-400 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <span>TAMANHO:</span>
                {renderCell('tamanho_placa', 'm²')}
              </div>
              <div className="flex justify-between items-center text-slate-400 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <span>TEMPO P/ MOLHAR:</span>
                {renderCell('tempo_molhar_placa', 'min')}
              </div>
            </div>
          </div>

          {/* 7. DIMENSÕES DO GALPÃO */}
          <div className="border border-slate-700/80 rounded-2xl p-4 bg-slate-950/40 space-y-3 text-xs">
            <div className="flex items-center gap-1.5 text-xs font-black text-sky-400 uppercase tracking-wider border-b border-slate-800 pb-2">
              <Ruler className="w-3.5 h-3.5" /> Dimensões
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="flex justify-between items-center text-slate-400 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <span>COMPRIMENTO:</span>
                {renderCell('comprimento_galpao', 'm')}
              </div>
              <div className="flex justify-between items-center text-slate-400 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <span>LARGURA:</span>
                {renderCell('largura_galpao', 'm')}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
              <span className="block font-bold text-sky-300 text-[11px] uppercase">Altura do Galpão</span>
              <div className="grid grid-cols-3 gap-2 text-center">
                {['Frente', 'Meio', 'Fundo'].map((local) => {
                  const field = `altura_${local.toLowerCase()}` as keyof SetupAviario;
                  return (
                    <div key={local} className="p-2 rounded-lg bg-slate-950/50 border border-slate-800/50">
                      <span className="block text-[10px] text-slate-500 mb-1">{local}</span>
                      {renderCell(field, 'm')}
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between items-center text-sky-300 font-bold pt-2 border-t border-slate-800">
                <span>MÉDIA:</span>
                {renderCell('altura_media', 'm')}
              </div>
            </div>
          </div>

          {/* 8. ALARMES (Transformado de Tabela para Cards Responsivos) */}
          <div className="border border-slate-700/80 rounded-2xl p-4 bg-slate-950/40 space-y-3 text-xs">
            <div className="flex items-center gap-1.5 text-xs font-black text-sky-400 uppercase tracking-wider border-b border-slate-800 pb-2">
              <Bell className="w-3.5 h-3.5" /> Painel de Alarmes
            </div>

            <div className="space-y-3">
              {/* Cabeçalho (Apenas Desktop) */}
              <div className="hidden md:grid grid-cols-12 gap-2 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-800 pb-2 px-2">
                <div className="col-span-4">Tipo de Alarme</div>
                <div className="col-span-4 text-center">Possui</div>
                <div className="col-span-4 text-center">Funcionando</div>
              </div>

              {/* Linhas de Alarme (Cards no Mobile, Linhas no Desktop) */}
              {[
                { label: 'ALARME NA CASA', field: 'alarme_casa', funcField: 'alarme_casa_func' },
                { label: 'ALARME NO AVIÁRIO', field: 'alarme_aviario', funcField: 'alarme_aviario_func' },
                { label: 'ALARME CAIXAS CENTRAL', field: 'alarme_caixas', funcField: 'alarme_caixas_func' }
              ].map((alarm, idx) => (
                <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-2 items-center p-3 md:p-2 rounded-xl md:rounded-none bg-slate-900/60 md:bg-transparent border border-slate-800 md:border-0">
                  <div className="col-span-12 md:col-span-4 font-bold text-white md:py-1.5 flex items-center gap-2">
                    <Bell className="w-3 h-3 text-slate-500 md:hidden" />
                    {alarm.label}
                  </div>
                  <div className="col-span-6 md:col-span-4 flex flex-col md:flex-row justify-between md:justify-center items-center gap-1">
                    <span className="md:hidden text-[10px] text-slate-500 uppercase font-bold">Possui:</span>
                    {renderBooleanBadge(alarm.field as keyof SetupAviario)}
                  </div>
                  <div className="col-span-6 md:col-span-4 flex flex-col md:flex-row justify-between md:justify-center items-center gap-1">
                    <span className="md:hidden text-[10px] text-slate-500 uppercase font-bold">Funcionando:</span>
                    {renderBooleanBadge(alarm.funcField as keyof SetupAviario)}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* ========================================================================= */}
      {/* 9. OBSERVAÇÕES DO SETUP (Campo Multilinha Conforme Item 8 do Escopo)       */}
      {/* ========================================================================= */}
      <div className="border border-slate-700/80 rounded-2xl p-4 bg-slate-950/40 space-y-2">
        <div className="flex items-center gap-1.5 text-xs font-black text-sky-400 uppercase tracking-wider">
          <FileText className="w-3.5 h-3.5" /> Observações do Setup
        </div>

        {isEditing ? (
          <div className="space-y-1">
            <textarea
              value={formData.observacoes || ''}
              onChange={(e) => handleFieldChange('observacoes', e.target.value)}
              placeholder="Digite aqui as observações técnicas sobre o setup do aviário..."
              rows={3}
              className="w-full bg-slate-900 border border-sky-500/50 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-400/50 transition-all font-sans resize-y"
            />
            <span className="text-[10px] text-slate-500 block text-right">
              Esta observação será impressa na Ficha Técnica e mantida nas futuras revisões.
            </span>
          </div>
        ) : (
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300 min-h-[50px] whitespace-pre-wrap leading-relaxed">
            {setup.observacoes ? (
              setup.observacoes
            ) : (
              <span className="text-slate-500 italic">Nenhuma observação técnica registrada.</span>
            )}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 10. EVIDÊNCIAS FOTOGRÁFICAS DO SETUP (Conforme Itens 5 e 6 do Escopo)      */}
      {/* ========================================================================= */}
      <div className="border border-slate-700/80 rounded-2xl p-4 bg-slate-950/40 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs font-black text-sky-400 uppercase tracking-wider">
              <Camera className="w-3.5 h-3.5" /> Evidências Fotográficas do Setup
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-rose-500/10 text-rose-300 border border-rose-500/20">
              Obrigatória
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-slate-400">
              {fotos.length} {fotos.length === 1 ? 'foto vinculada' : 'fotos vinculadas'}
            </span>
            {fotos.length === 0 && (
              <span className="text-[10px] text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                Pendente de Foto
              </span>
            )}
          </div>
        </div>

        {/* MODO EDIÇÃO: BOTÃO DE UPLOAD E CONTROLE */}
        {isEditing && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoUpload}
                className="hidden"
                id="setup-photo-input"
              />
              <label
                htmlFor="setup-photo-input"
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md active:scale-95 ${
                  isProcessingPhotos
                    ? 'bg-slate-800 text-slate-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white'
                }`}
              >
                <UploadCloud className="w-4 h-4" />
                <span>{isProcessingPhotos ? 'Processando Imagens...' : '+ Anexar Fotos do Dispositivo'}</span>
              </label>

              <span className="text-[11px] text-slate-400">
                Selecione uma ou mais fotos do setup (galpão, placas, painel, exaustores).
              </span>
            </div>

            {fotos.length === 0 && (
              <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                <span>É obrigatório anexar pelo menos uma foto para salvar este setup.</span>
              </div>
            )}
          </div>
        )}

        {/* GRADE DE MINIATURAS DAS FOTOS */}
        {fotos.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-xs italic bg-slate-900/50 rounded-xl border border-slate-800/80">
            Nenhuma evidência fotográfica anexada para este aviário.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 pt-1">
            {fotos.map((foto, idx) => (
              <div
                key={foto.id || idx}
                className="group relative rounded-xl overflow-hidden border border-slate-700 bg-slate-900 aspect-video shadow-md hover:border-sky-400 transition-all flex flex-col justify-end"
              >
                <img
                  src={foto.url}
                  alt={foto.nome || `Evidência ${idx + 1}`}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                  loading="lazy"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />

                {/* Botões de Ação na Miniatura */}
                <div className="relative z-10 p-2 flex items-center justify-between gap-1">
                  <span className="text-[10px] text-white font-bold truncate drop-shadow">
                    {foto.nome || `Foto ${idx + 1}`}
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setPreviewPhoto(foto)}
                      className="p-1 rounded bg-black/60 hover:bg-sky-600 text-white transition-all cursor-pointer"
                      title="Ampliar Foto"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>

                    {isEditing && (
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(foto.id)}
                        className="p-1 rounded bg-rose-600/80 hover:bg-rose-500 text-white transition-all cursor-pointer"
                        title="Remover Imagem"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL DE VISUALIZAÇÃO AMPLIADA DA FOTO */}
      {previewPhoto && (
        <div 
          onClick={() => setPreviewPhoto(null)}
          className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in cursor-zoom-out"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl flex flex-col"
          >
            <div className="p-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <span className="text-xs font-bold text-white truncate">
                {previewPhoto.nome || 'Evidência Fotográfica do Setup'}
              </span>
              <button
                type="button"
                onClick={() => setPreviewPhoto(null)}
                className="text-slate-400 hover:text-white p-1 text-xs"
              >
                ✕
              </button>
            </div>
            <div className="p-2 bg-black flex items-center justify-center overflow-auto max-h-[80vh]">
              <img
                src={previewPhoto.url}
                alt={previewPhoto.nome || 'Foto'}
                className="max-w-full max-h-[75vh] object-contain rounded"
              />
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE IMPRESSÃO */}
      <PrintSetupModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        currentAviario={aviario}
        allAviariosOfProdutor={allAviariosOfProdutor.length > 0 ? allAviariosOfProdutor : [aviario]}
      />

      {/* MODAL DE HISTÓRICO & AUDITORIA */}
      <FichaHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        aviario={aviario}
        historico={historicoList}
        isLoading={isLoadingHistory}
        onRestoreVersion={handleRestoreVersion}
        onDeleteVersion={handleDeleteHistoryItem}
        onClearAllHistory={handleClearAllHistory}
        isSuperOrAdmin={isSuperOrAdmin}
      />

      {/* MODAL DE CONFIRMAÇÃO DE ATRIBUIÇÃO DE PADRÃO */}
      {isConfirmingDefault && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-slate-900 border-2 border-emerald-500/50 rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-emerald-400">
              <Sliders className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-black text-white">Atribuir Parâmetros Padrão</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Você está prestes a aplicar os <strong>Parâmetros Padrão Recomendados da {currentCompany.nome}</strong> para o aviário <strong className="text-sky-300 font-mono">{aviario.numero_instalacao}</strong> do produtor <strong className="text-white uppercase">{aviario.produtor?.nome}</strong>.
            </p>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1.5 text-slate-300 font-mono">
              <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider font-sans mb-1">
                Valores Técnicos de Referência que serão aplicados:
              </div>
              <div>• Vedação: 15 Pa | Trabalho: 25 Pa</div>
              <div>• Ventilação: 6 exaustores | 2.5 m/s</div>
              <div>• Entrada de Ar: 4.0 m/s (P1, P2, P3)</div>
              <div>• Iluminação: Lux 100% (25 lux)</div>
              <div>• Placa: 1.80m | Tempo: 1.5 min</div>
              <div>• Galpão: 150m x 14m x 2.80m</div>
              <div>• Alarmes: Todos ativos e funcionando</div>
            </div>

            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300">
              Esta ação substituirá os parâmetros atuais da ficha e salvará um novo registro de auditoria. (Permitido apenas para Super Admin e Administrador).
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmingDefault(false)}
                disabled={isApplyingDefault}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleApplyDefaultValues}
                disabled={isApplyingDefault}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 transition-all shadow-lg shadow-emerald-600/20 flex items-center gap-2 active:scale-95"
              >
                <Check className="w-4 h-4" />
                {isApplyingDefault ? 'Aplicando Padrão...' : 'Confirmar e Atribuir'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};