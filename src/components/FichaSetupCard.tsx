import React, { useState, useEffect } from 'react';
import { 
  Printer, Edit3, Save, RotateCcw, Check, Sparkles, 
  Wind, Gauge, Droplets, Bell, Ruler, Sun, Fan
} from 'lucide-react';
import { Aviario, SetupAviario, Tecnico } from '../types/database';
import { saveSetupData, updateAviarioTecnico } from '../services/dataService';

interface FichaSetupCardProps {
  aviario: Aviario;
  allTecnicos: Tecnico[];
  onSetupUpdated: () => void;
}

export const FichaSetupCard: React.FC<FichaSetupCardProps> = ({
  aviario,
  allTecnicos,
  onSetupUpdated
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
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
      // 1. Atualizar Tecnico se mudou
      if (selectedTecnicoId !== aviario.tecnico_id) {
        await updateAviarioTecnico(aviario.id, selectedTecnicoId || null);
      }

      // 2. Salvar Setup
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

  const handlePrint = () => {
    window.print();
  };

  const setup = isEditing ? formData : (aviario.setup || {});

  // Helper para renderizar valor ou input
  const renderCell = (
    field: keyof SetupAviario,
    unit: string = '',
    placeholder: string = '-'
  ) => {
    const val = (setup as any)[field];
    if (isEditing) {
      return (
        <input
          type="number"
          step="any"
          value={val !== undefined && val !== null ? val : ''}
          onChange={(e) => handleFieldChange(field, e.target.value === '' ? null : parseFloat(e.target.value))}
          placeholder={placeholder}
          className="w-full bg-slate-900 border border-sky-500/50 rounded px-1.5 py-0.5 text-xs text-white font-mono text-center focus:outline-none focus:ring-1 focus:ring-sky-400"
        />
      );
    }
    return (
      <span className="font-mono text-xs font-semibold text-slate-100">
        {val !== undefined && val !== null ? `${val} ${unit}`.trim() : <span className="text-slate-500 font-normal">-</span>}
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
          className={`px-2 py-0.5 rounded text-[11px] font-bold border transition-all ${
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
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
          <Check className="w-3 h-3" /> SIM
        </span>
      );
    }
    if (val === false) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
          NÃO
        </span>
      );
    }
    return <span className="text-slate-500 text-xs">-</span>;
  };

  return (
    <div className="setup-sheet-container bg-slate-900 border border-slate-700/80 rounded-3xl p-6 shadow-2xl space-y-6 relative overflow-hidden">
      
      {/* Action Header & Tools (no-print) */}
      <div className="no-print flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="text-xs px-2.5 py-1 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20 font-bold uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> Ficha Técnica Oficial
          </span>
          {saveSuccess && (
            <span className="text-xs px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1 animate-fade-in">
              <Check className="w-3.5 h-3.5" /> Alterações salvas no banco!
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setFormData(aviario.setup || {});
                  setIsEditing(false);
                }}
                disabled={isSaving}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition-all flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Cancelar
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-lg shadow-emerald-600/30 transition-all flex items-center gap-1.5 active:scale-95"
              >
                <Save className="w-3.5 h-3.5" /> {isSaving ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-sky-300 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 transition-all flex items-center gap-1.5"
              >
                <Edit3 className="w-3.5 h-3.5" /> Editar Ficha
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 hover:text-white border border-slate-700 transition-all flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5 text-slate-400" /> Imprimir / PDF
              </button>
            </>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* CABEÇALHO DO LAUDO / FICHA (IDÊNTICO AO LAYOUT BELLO PDF)                 */}
      {/* ========================================================================= */}
      <div className="border-2 border-slate-700 rounded-2xl p-4 bg-slate-950/70 relative">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          
          {/* Produtor & Aviário */}
          <div className="md:col-span-8 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-black text-sky-400 tracking-wider">PRODUTOR:</span>
              <span className="text-base font-black text-white tracking-wide uppercase">
                {aviario.produtor?.nome || 'Não informado'}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-6 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <span className="font-black text-sky-400">AVIÁRIO:</span>
                <span className="px-2.5 py-0.5 rounded-lg bg-sky-500/20 border border-sky-500/40 text-sky-300 font-mono font-bold text-sm">
                  {aviario.numero_instalacao}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-400">EXTENSIONISTA / TÉCNICO:</span>
                {isEditing ? (
                  <select
                    value={selectedTecnicoId}
                    onChange={(e) => setSelectedTecnicoId(e.target.value)}
                    className="bg-slate-900 border border-sky-500 rounded px-2 py-0.5 text-xs text-sky-300 font-semibold"
                  >
                    <option value="">-- Selecione o Técnico --</option>
                    {allTecnicos.map(t => (
                      <option key={t.id} value={t.id}>{t.nome}</option>
                    ))}
                  </select>
                ) : (
                  <span className="font-semibold text-amber-300">
                    {aviario.tecnico?.nome || 'Não vinculado'}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Logo Bello Alimentos */}
          <div className="md:col-span-4 flex justify-start md:justify-end items-center">
            <div className="text-right">
              <div className="text-xl font-black text-white tracking-tight flex items-center justify-end gap-1">
                BELLO <span className="text-sky-400">ALIMENTOS</span>
              </div>
              <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest">
                Gestão de Frangos de Corte
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ========================================================================= */}
      {/* GRADE DE SETUP TÉCNICO (ESTRUTURA DO PDF OFICIAL)                         */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* COLUNA ESQUERDA */}
        <div className="space-y-6">
          
          {/* 1. PRESSÃO VEDAÇÃO & PRESSÃO DE TRABALHO */}
          <div className="border border-slate-700/80 rounded-2xl overflow-hidden bg-slate-950/40">
            <div className="grid grid-cols-2 divide-x divide-slate-700/80">
              
              {/* Pressão Vedação */}
              <div className="p-3">
                <div className="flex items-center gap-1.5 text-xs font-black text-sky-400 uppercase tracking-wider mb-2 border-b border-slate-800 pb-1">
                  <Gauge className="w-3.5 h-3.5" /> PRESSÃO VEDAÇÃO
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between items-center text-slate-400">
                    <span>Nº EXAUSTOR:</span>
                    {renderCell('pressao_vedacao_exaustor')}
                  </div>
                  <div className="flex justify-between items-center text-slate-400">
                    <span>MANÔMETRO:</span>
                    {renderCell('pressao_vedacao_manometro')}
                  </div>
                  <div className="flex justify-between items-center text-slate-400">
                    <span>PAINEL CONTROLADOR:</span>
                    {renderCell('pressao_vedacao_painel')}
                  </div>
                  <div className="flex justify-between items-center text-sky-300 font-bold pt-1 border-t border-slate-800/80">
                    <span>MÉDIA:</span>
                    {renderCell('pressao_vedacao_media')}
                  </div>
                </div>
              </div>

              {/* Pressão de Trabalho */}
              <div className="p-3">
                <div className="flex items-center gap-1.5 text-xs font-black text-sky-400 uppercase tracking-wider mb-2 border-b border-slate-800 pb-1">
                  <Gauge className="w-3.5 h-3.5" /> PRESSÃO DE TRABALHO
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between items-center text-slate-400">
                    <span>Nº EXAUSTOR:</span>
                    {renderCell('pressao_trabalho_exaustor')}
                  </div>
                  <div className="flex justify-between items-center text-slate-400">
                    <span>MANÔMETRO:</span>
                    {renderCell('pressao_trabalho_manometro')}
                  </div>
                  <div className="flex justify-between items-center text-slate-400">
                    <span>PAINEL CONTROLADOR:</span>
                    {renderCell('pressao_trabalho_painel')}
                  </div>
                  <div className="flex justify-between items-center text-sky-300 font-bold pt-1 border-t border-slate-800/80">
                    <span>MÉDIA:</span>
                    {renderCell('pressao_trabalho_media')}
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* 2. VENTILAÇÃO TOTAL (m/s) & QUANTIDADE DE EXAUSTORES */}
          <div className="border border-slate-700/80 rounded-2xl p-4 bg-slate-950/40 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
              <div className="flex items-center gap-1.5 text-xs font-black text-sky-400 uppercase tracking-wider">
                <Wind className="w-3.5 h-3.5" /> VENTILAÇÃO TOTAL (m/s)
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400">QTD. EXAUSTORES:</span>
                {renderCell('qtd_exaustores', 'un')}
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="block text-[10px] text-slate-400">LATERAL DIREITA</span>
                {renderCell('ventilacao_dir', 'm/s')}
              </div>
              <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="block text-[10px] text-slate-400">MEIO</span>
                {renderCell('ventilacao_meio', 'm/s')}
              </div>
              <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="block text-[10px] text-slate-400">LATERAL ESQUERDA</span>
                {renderCell('ventilacao_esq', 'm/s')}
              </div>
            </div>

            <div className="flex justify-between items-center text-xs text-sky-300 font-bold pt-1">
              <span>MÉDIA DE VENTO:</span>
              {renderCell('ventilacao_media', 'm/s')}
            </div>
          </div>

          {/* 3. VENTILAÇÃO ENTRADA DE AR (m/s) */}
          <div className="border border-slate-700/80 rounded-2xl p-4 bg-slate-950/40 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-black text-sky-400 uppercase tracking-wider border-b border-slate-800 pb-1.5">
              <Fan className="w-3.5 h-3.5" /> VENTILAÇÃO ENTRADA DE AR (m/s)
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              {/* Lado 01 Fornos */}
              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
                <span className="block font-bold text-amber-400 text-[11px] border-b border-slate-800 pb-0.5">
                  LADO 01 (FORNOS)
                </span>
                <div className="flex justify-between items-center text-slate-400">
                  <span>PONTO 01 FRENTE:</span>
                  {renderCell('vent_ar_l1_p1', 'm/s')}
                </div>
                <div className="flex justify-between items-center text-slate-400">
                  <span>PONTO 02 CENTRO:</span>
                  {renderCell('vent_ar_l1_p2', 'm/s')}
                </div>
                <div className="flex justify-between items-center text-slate-400">
                  <span>PONTO 03 FUNDO:</span>
                  {renderCell('vent_ar_l1_p3', 'm/s')}
                </div>
              </div>

              {/* Lado 02 */}
              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
                <span className="block font-bold text-sky-400 text-[11px] border-b border-slate-800 pb-0.5">
                  LADO 02
                </span>
                <div className="flex justify-between items-center text-slate-400">
                  <span>PONTO 01 FRENTE:</span>
                  {renderCell('vent_ar_l2_p1', 'm/s')}
                </div>
                <div className="flex justify-between items-center text-slate-400">
                  <span>PONTO 02 CENTRO:</span>
                  {renderCell('vent_ar_l2_p2', 'm/s')}
                </div>
                <div className="flex justify-between items-center text-slate-400">
                  <span>PONTO 03 FUNDO:</span>
                  {renderCell('vent_ar_l2_p3', 'm/s')}
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center text-xs text-sky-300 font-bold pt-1">
              <span>MÉDIA ENTRADA DE AR:</span>
              {renderCell('vent_ar_media', 'm/s')}
            </div>
          </div>

          {/* 4. RECURSOS HÍDRICOS (VAZÃO DE ÁGUA) */}
          <div className="border border-slate-700/80 rounded-2xl p-4 bg-slate-950/40 space-y-2 text-xs">
            <div className="flex items-center gap-1.5 text-xs font-black text-sky-400 uppercase tracking-wider border-b border-slate-800 pb-1.5">
              <Droplets className="w-3.5 h-3.5" /> VAZÃO DE ÁGUA & ARMAZENAMENTO
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex justify-between items-center text-slate-400 p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                <span>POÇO 1:</span>
                {renderCell('vazao_poco_1', 'L/h')}
              </div>
              <div className="flex justify-between items-center text-slate-400 p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                <span>POÇO 2:</span>
                {renderCell('vazao_poco_2', 'L/h')}
              </div>
              <div className="flex justify-between items-center text-slate-400 p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                <span>ENTRADA GALPÃO:</span>
                {renderCell('entrada_agua_galpao', 'L/h')}
              </div>
              <div className="flex justify-between items-center text-slate-400 p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                <span>ARMAZENAMENTO:</span>
                {renderCell('armazenamento_agua', 'L')}
              </div>
            </div>
          </div>

        </div>

        {/* COLUNA DIREITA */}
        <div className="space-y-6">
          
          {/* 5. ILUMINAÇÃO / LUX */}
          <div className="border border-slate-700/80 rounded-2xl p-4 bg-slate-950/40 space-y-3 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
              <div className="flex items-center gap-1.5 text-xs font-black text-sky-400 uppercase tracking-wider">
                <Sun className="w-3.5 h-3.5" /> ILUMINAÇÃO / LUX
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-400">LUX 100%:</span>
                {renderCell('lux_100', 'lux')}
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="block text-[10px] text-slate-400">SOB LÂMPADA</span>
                {renderCell('iluminacao_sob_lampada', 'lux')}
              </div>
              <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="block text-[10px] text-slate-400">LATERAL</span>
                {renderCell('iluminacao_lateral', 'lux')}
              </div>
              <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="block text-[10px] text-slate-400">TRIÂNGULO</span>
                {renderCell('iluminacao_triangulo', 'lux')}
              </div>
            </div>
          </div>

          {/* 6. PLACA EVAPORATIVA */}
          <div className="border border-slate-700/80 rounded-2xl p-4 bg-slate-950/40 space-y-2 text-xs">
            <div className="flex items-center gap-1.5 text-xs font-black text-sky-400 uppercase tracking-wider border-b border-slate-800 pb-1.5">
              <Sparkles className="w-3.5 h-3.5" /> PLACA EVAPORATIVA
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex justify-between items-center text-slate-400 p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                <span>TAMANHO DE PLACA:</span>
                {renderCell('tamanho_placa', 'm²')}
              </div>
              <div className="flex justify-between items-center text-slate-400 p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                <span>TEMPO P/ MOLHAR:</span>
                {renderCell('tempo_molhar_placa', 'min')}
              </div>
            </div>
          </div>

          {/* 7. DIMENSÕES DO GALPÃO */}
          <div className="border border-slate-700/80 rounded-2xl p-4 bg-slate-950/40 space-y-3 text-xs">
            <div className="flex items-center gap-1.5 text-xs font-black text-sky-400 uppercase tracking-wider border-b border-slate-800 pb-1.5">
              <Ruler className="w-3.5 h-3.5" /> DIMENSÕES DO GALPÃO & ALTURA
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="flex justify-between items-center text-slate-400 p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                <span>COMPRIMENTO:</span>
                {renderCell('comprimento_galpao', 'm')}
              </div>
              <div className="flex justify-between items-center text-slate-400 p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                <span>LARGURA:</span>
                {renderCell('largura_galpao', 'm')}
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
              <span className="block font-bold text-sky-300 text-[11px]">ALTURA DO GALPÃO:</span>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <span className="block text-[10px] text-slate-400">FRENTE</span>
                  {renderCell('altura_frente', 'm')}
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400">MEIO</span>
                  {renderCell('altura_meio', 'm')}
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400">FUNDO</span>
                  {renderCell('altura_fundo', 'm')}
                </div>
              </div>
              <div className="flex justify-between items-center text-sky-300 font-bold pt-1 border-t border-slate-800">
                <span>MÉDIA:</span>
                {renderCell('altura_media', 'm')}
              </div>
            </div>
          </div>

          {/* 8. ALARMES (ESTRUTURA DO PDF) */}
          <div className="border border-slate-700/80 rounded-2xl p-4 bg-slate-950/40 space-y-3 text-xs">
            <div className="flex items-center gap-1.5 text-xs font-black text-sky-400 uppercase tracking-wider border-b border-slate-800 pb-1.5">
              <Bell className="w-3.5 h-3.5" /> PAINEL DE ALARMES
            </div>

            <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-900/60">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-slate-400 text-[10px] uppercase font-bold border-b border-slate-800">
                  <tr>
                    <th className="py-2 px-3">TIPO DE ALARME</th>
                    <th className="py-2 px-3 text-center">POSSUI ALARME</th>
                    <th className="py-2 px-3 text-center">EM FUNCIONAMENTO</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  <tr>
                    <td className="py-2 px-3 font-medium text-white">ALARME NA CASA</td>
                    <td className="py-2 px-3 text-center">{renderBooleanBadge('alarme_casa')}</td>
                    <td className="py-2 px-3 text-center">{renderBooleanBadge('alarme_casa_func')}</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-medium text-white">ALARME NO AVIÁRIO</td>
                    <td className="py-2 px-3 text-center">{renderBooleanBadge('alarme_aviario')}</td>
                    <td className="py-2 px-3 text-center">{renderBooleanBadge('alarme_aviario_func')}</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-medium text-white">ALARME NAS CAIXAS CENTRAL</td>
                    <td className="py-2 px-3 text-center">{renderBooleanBadge('alarme_caixas')}</td>
                    <td className="py-2 px-3 text-center">{renderBooleanBadge('alarme_caixas_func')}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
