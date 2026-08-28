import React, { useState, useEffect } from 'react';
import { 
  Printer, Edit3, Save, RotateCcw, Check, Sparkles, 
  Wind, Gauge, Droplets, Bell, Ruler, Sun, Fan, Smartphone
} from 'lucide-react';
import { Aviario, SetupAviario, Tecnico } from '../types/database';
import { saveSetupData, updateAviarioTecnico } from '../services/dataService';
import { BelloLogo } from './BelloLogo';  
import { PrintSetupModal } from './PrintSetupModal';

interface FichaSetupCardProps {
  aviario: Aviario;
  allTecnicos: Tecnico[];
  allAviariosOfProdutor?: Aviario[];
  onSetupUpdated: () => void;
  userLevel?: number;
}

export const FichaSetupCard: React.FC<FichaSetupCardProps> = ({
  aviario,
  allTecnicos,
  allAviariosOfProdutor = [],
  onSetupUpdated,
  userLevel = 10
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [selectedTecnicoId, setSelectedTecnicoId] = useState<string>(aviario.tecnico_id || '');
  const [formData, setFormData] = useState<Partial<SetupAviario>>({});
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    setFormData(aviario.setup || {});
    setSelectedTecnicoId(aviario.tecnico_id || '');
    setIsEditing(false);
  }, [aviario]);

  const handleFieldChange = (field: keyof SetupAviario, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (selectedTecnicoId !== aviario.tecnico_id) {
        await updateAviarioTecnico(aviario.id, selectedTecnicoId || null);
      }
      await saveSetupData(aviario.id, formData);
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      setIsEditing(false);
      onSetupUpdated();
    } catch (err: any) {
      alert(`Erro ao salvar dados: ${err?.message || 'Falha na conexão'}`);
    } finally {
      setIsSaving(false);
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
              {userLevel >= 50 && (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="min-h-[44px] px-4 rounded-xl text-sm font-semibold text-sky-300 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 transition-all flex items-center justify-center gap-2"
                >
                  <Edit3 className="w-4 h-4" /> Editar
                </button>
              )}
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
          </div>

          <div className="md:col-span-4 flex justify-start md:justify-end items-center w-full mt-2 md:mt-0 pt-3 md:pt-0 border-t md:border-t-0 border-slate-800">
            <div className="flex flex-col items-end">
              <div className="h-10 md:h-12 bg-white rounded-xl px-3 py-1.5 flex items-center shadow-md border border-white/20">
                <BelloLogo className="h-8 md:h-9" />
              </div>
              <div className="text-[9px] md:text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1.5">
                Gestão de Frangos de Corte
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
                {['Frente', 'Meio', 'Fundo'].map((local, idx) => {
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

      {/* MODAL DE IMPRESSÃO */}
      <PrintSetupModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        currentAviario={aviario}
        allAviariosOfProdutor={allAviariosOfProdutor.length > 0 ? allAviariosOfProdutor : [aviario]}
      />

    </div>
  );
};