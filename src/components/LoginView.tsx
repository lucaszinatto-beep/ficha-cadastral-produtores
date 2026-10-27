import React, { useState, useEffect } from 'react';
import { Mail, Lock, Eye, EyeOff, ShieldCheck, Loader2, AlertCircle, Sparkles, CheckCircle2, ArrowLeft, MapPin } from 'lucide-react';
import { supabase } from '../services/supabase';
import { Session } from '@supabase/supabase-js';
import { CompanyThemeConfig, DEFAULT_COMPANY } from '../config/companies';
import { CompanyUnitConfig } from '../types/database';
import { CompanyLogo } from './CompanyLogo';

interface LoginViewProps {
  company?: CompanyThemeConfig;
  unit?: CompanyUnitConfig | null;
  onLoginSuccess?: (company?: CompanyThemeConfig, unit?: CompanyUnitConfig | null) => void;
  onBackToCompanySelect?: () => void;
  initialSession?: Session | null;
  isRecovering?: boolean;
}

export const LoginView: React.FC<LoginViewProps> = ({ 
  company,
  unit,
  onLoginSuccess, 
  onBackToCompanySelect,
  initialSession, 
  isRecovering 
}) => {
  const targetCompany = company || DEFAULT_COMPANY;
  const [view, setView] = useState<'login' | 'forgot_password' | 'force_update' | 'reset_password'>('login');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Define a view inicial baseada nas props
  useEffect(() => {
    if (isRecovering) {
      setView('reset_password');
    } else if (initialSession?.user?.user_metadata?.force_password_change) {
      setView('force_update');
    } else {
      setView('login');
    }
  }, [isRecovering, initialSession]);

  // Escuta evento de recuperação de senha pelo link no email
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, _session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setView('reset_password');
        setErrorMessage(null);
        setSuccessMessage(null);
      }
    });
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMessage('Por favor, informe seu e-mail e sua senha.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          setErrorMessage('E-mail ou senha inválidos. Verifique suas credenciais.');
        } else if (error.message.includes('Email not confirmed')) {
          setErrorMessage('Este e-mail está cadastrado, porém ainda não foi confirmado no Supabase. Solicite a confirmação ao administrador.');
        } else {
          setErrorMessage(error.message || 'Erro ao realizar login no Supabase.');
        }
        return;
      }

      if (data.session && data.user) {
        // REGRA DE SEGURANÇA E ISOLAMENTO POR PAINEL (FICHA CADASTRAL):
        // 1. Obter perfil do usuário em public.profiles pelo UUID autenticado
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, level')
          .eq('id', data.user.id)
          .maybeSingle();

        // 2. Determinar Super Admin a partir dos dados do banco ou e-mails de governança
        const userEmailNormalized = (data.user.email || '').toLowerCase().trim();
        const KNOWN_SUPER_ADMIN_EMAILS = [
          'lucas_zinatto@hotmail.com',
          'lucas.zinatto@belloalimentos.com.br',
          'joao.moraes@belloalimentos.com.br'
        ];
        const isKnownSuperAdmin = KNOWN_SUPER_ADMIN_EMAILS.includes(userEmailNormalized);
        const isSuperAdmin = isKnownSuperAdmin || profile?.role === 'super_admin' || (profile?.level ?? 0) >= 100;

        if (!isSuperAdmin) {
          // 3. Buscar todos os vínculos do usuário para o painel ficha_cadastral
          const { data: painelVinculosRaw } = await supabase
            .from('usuario_empresa_painel')
            .select('empresa_id, ativo, painel_id, unidade')
            .eq('user_id', data.user.id)
            .eq('painel_id', 'ficha_cadastral');

          // Fallback retroativo em usuarios_empresas caso usuario_empresa_painel ainda não esteja populado
          const { data: legadoVinculosRaw } = await supabase
            .from('usuarios_empresas')
            .select('empresa_id, ativo, unidade')
            .eq('user_id', data.user.id);

          const painelVinculos = (painelVinculosRaw || []) as Array<{ empresa_id: string; ativo: boolean; painel_id?: string; unidade?: string | null }>;
          const legadoVinculos = (legadoVinculosRaw || []) as Array<{ empresa_id: string; ativo: boolean; unidade?: string | null }>;

          const hasAnyPanelRecord = (painelVinculos && painelVinculos.length > 0) || (legadoVinculos && legadoVinculos.length > 0);

          if (!hasAnyPanelRecord) {
            // Caso A: Usuário existe no Supabase (ex: Central Frango Forte), mas não tem acesso ao Ficha Cadastral
            await supabase.auth.signOut();
            setErrorMessage('Usuário autenticado no Supabase, porém sem autorização de acesso ao painel Ficha Cadastral.');
            setIsLoading(false);
            return;
          }

          // Verificar status ativo no painel
          const anyActive = (painelVinculos || []).some(v => v.ativo) || (legadoVinculos || []).some(v => v.ativo);
          if (!anyActive) {
            // Caso B: Usuário desativado no painel
            await supabase.auth.signOut();
            setErrorMessage('Seu acesso ao painel Ficha Cadastral está desativado. Entre em contato com o administrador.');
            setIsLoading(false);
            return;
          }

          // Verificar autorização específica para a empresa selecionada
          const hasAccessToTargetCompany = 
            (painelVinculos || []).some(v => v.empresa_id === targetCompany.id && v.ativo) ||
            (legadoVinculos || []).some(v => v.empresa_id === targetCompany.id && v.ativo);

          if (!hasAccessToTargetCompany) {
            // Caso C: Usuário ativo na Ficha Cadastral, mas para outra empresa
            // Obter nomes das empresas autorizadas
            const allowedIds = new Set([
              ...(painelVinculos || []).filter(v => v.ativo).map(v => v.empresa_id),
              ...(legadoVinculos || []).filter(v => v.ativo).map(v => v.empresa_id)
            ]);

            const { data: allEmpresas } = await supabase.from('empresas').select('id, nome');
            const allowedNames = (allEmpresas || [])
              .filter(e => allowedIds.has(e.id))
              .map(e => e.nome);

            await supabase.auth.signOut();
            if (allowedNames.length > 0) {
              setErrorMessage(`Você não possui acesso à empresa ${targetCompany.nome}. Suas empresas autorizadas são: ${allowedNames.join(', ')}.`);
            } else {
              setErrorMessage(`Você não possui acesso à empresa ${targetCompany.nome} no painel Ficha Cadastral.`);
            }
            setIsLoading(false);
            return;
          }

          // 4. VERIFICAÇÃO DE UNIDADE ESPECÍFICA (Ex: Levo Alimentos Umuarama vs Capanema)
          if (unit) {
            const hasUnitAccess = 
              (painelVinculos || []).some(v => 
                v.empresa_id === targetCompany.id && 
                v.ativo && 
                (!v.unidade || v.unidade === unit.id)
              ) ||
              (legadoVinculos || []).some(v => 
                v.empresa_id === targetCompany.id && 
                v.ativo && 
                (!v.unidade || v.unidade === unit.id)
              );

            if (!hasUnitAccess) {
              const otherUnitsRaw = [
                ...(painelVinculos || []).filter(v => v.empresa_id === targetCompany.id && v.ativo && v.unidade).map(v => v.unidade),
                ...(legadoVinculos || []).filter(v => v.empresa_id === targetCompany.id && v.ativo && v.unidade).map(v => v.unidade)
              ];

              const friendlyUnits = otherUnitsRaw.map(u => {
                if (u === 'LEVO_UMUARAMA') return 'Umuarama';
                if (u === 'LEVO_CAPANEMA') return 'Capanema';
                return u;
              });

              await supabase.auth.signOut();
              if (friendlyUnits.length > 0) {
                setErrorMessage(`Você não possui acesso à unidade ${unit.nome} da ${targetCompany.nome}. Sua unidade autorizada é: ${friendlyUnits.join(', ')}.`);
              } else {
                setErrorMessage(`Você não possui acesso à unidade ${unit.nome} da ${targetCompany.nome}.`);
              }
              setIsLoading(false);
              return;
            }
          }
        }

        if (data.user?.user_metadata?.force_password_change) {
          setView('force_update');
        } else {
          if (onLoginSuccess) onLoginSuccess(targetCompany, unit);
        }
      }
    } catch (err: any) {
      console.error('Erro inesperado no login:', err);
      setErrorMessage('Falha na comunicação com o servidor de autenticação.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMessage('Por favor, informe seu e-mail.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: window.location.origin,
      });

      if (error) {
        setErrorMessage(error.message || 'Erro ao solicitar redefinição.');
      } else {
        setSuccessMessage('E-mail de redefinição de senha enviado. Verifique sua caixa de entrada.');
      }
    } catch (err: any) {
      setErrorMessage('Falha ao comunicar com servidor.');
    } finally {
      setIsLoading(false);
    }
  };

  const isUpdatingRef = React.useRef(false);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading || isUpdatingRef.current) return;

    if (newPassword.length < 6) {
      setErrorMessage('A senha deve possuir no mínimo 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage('A confirmação da senha não confere.');
      return;
    }
    if (password && newPassword === password) {
      setErrorMessage('Você precisa escolher uma senha diferente da senha temporária.');
      return;
    }

    isUpdatingRef.current = true;
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
        data: {
          force_password_change: false
        }
      });

      if (error) {
        const msg = (error.message || '').toLowerCase();
        if (msg.includes('different from the old password') || msg.includes('same password') || msg.includes('different')) {
          setErrorMessage('Você precisa escolher uma senha diferente da senha temporária.');
        } else if (msg.includes('least 6') || msg.includes('least')) {
          setErrorMessage('A senha deve possuir no mínimo 6 caracteres.');
        } else {
          setErrorMessage('Não foi possível atualizar a senha. Tente novamente.');
        }
        return;
      }

      if (view === 'reset_password') {
        setSuccessMessage('Senha redefinida com sucesso! Redirecionando...');
        setTimeout(() => {
          if (onLoginSuccess) onLoginSuccess(targetCompany, unit);
        }, 1200);
      } else {
        // force_update concluído com sucesso
        setSuccessMessage('Senha atualizada com sucesso! Acessando...');
        if (onLoginSuccess) onLoginSuccess(targetCompany, unit);
      }
    } catch (err: any) {
      console.error('Erro inesperado ao atualizar senha:', err);
      setErrorMessage('Não foi possível atualizar a senha. Tente novamente.');
    } finally {
      setIsLoading(false);
      isUpdatingRef.current = false;
    }
  };

  const resetState = () => {
    setView('login');
    setErrorMessage(null);
    setSuccessMessage(null);
    setNewPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col justify-center items-center p-4 selection:bg-sky-500 selection:text-white relative overflow-hidden">
      
      {/* Elementos Decorativos de Fundo */}
      <div 
        className="absolute -top-40 -left-40 w-96 h-96 rounded-full blur-3xl pointer-events-none opacity-20"
        style={{ backgroundColor: targetCompany.cor_primaria }}
      />
      <div 
        className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full blur-3xl pointer-events-none opacity-20"
        style={{ backgroundColor: targetCompany.cor_destaque }}
      />

      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl shadow-black/50 backdrop-blur-xl space-y-6 relative z-10 animate-scale-up">
        
        {/* Botão Voltar para Seleção de Empresa */}
        {onBackToCompanySelect && (
          <button
            type="button"
            onClick={() => {
              setErrorMessage(null);
              setSuccessMessage(null);
              onBackToCompanySelect();
            }}
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer group"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
            <span>← Voltar para seleção de empresa</span>
          </button>
        )}

        {/* Cabeçalho Dinâmico com Logo Oficial da Empresa */}
        <div className="flex flex-col items-center text-center space-y-3">
          <CompanyLogo
            company={targetCompany}
            variant="card"
            className="h-12 max-w-[190px] w-auto"
            containerClassName="rounded-2xl p-3 shadow-lg border border-slate-700/50 max-w-[220px] mx-auto overflow-hidden relative z-10 transition-all duration-500"
          />
          
          <div>
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-bold uppercase tracking-wider mb-1.5 ${targetCompany.badgeBg} ${targetCompany.badgeBorder} ${targetCompany.badgeText}`}>
              <Sparkles className="w-3 h-3" />
              <span>{unit ? `${targetCompany.nome} • ${unit.nome}` : targetCompany.nome}</span>
            </div>
            
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight uppercase leading-none mt-1">
              {unit ? `LOGIN — ${targetCompany.nome.toUpperCase()}` : `LOGIN — ${targetCompany.nome.toUpperCase()}`}
            </h1>

            {unit && (
              <div className="mt-2.5 inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs font-bold shadow-sm">
                <MapPin className="w-3.5 h-3.5 text-purple-400" />
                <span>Unidade: <strong className="text-white font-extrabold">{unit.nome}</strong></span>
              </div>
            )}

            <p className="text-xs text-slate-400 mt-2">
              {view === 'login' && (unit ? `Ambiente de acesso: Unidade ${unit.nome}` : "Acesso exclusivo para colaboradores e extensionistas")}
              {view === 'forgot_password' && "Informe seu e-mail para receber um link de redefinição"}
              {view === 'force_update' && "Primeiro acesso: Atualização de senha obrigatória"}
              {view === 'reset_password' && "Crie uma nova senha para sua conta"}
            </p>
          </div>
        </div>

        {/* Mensagens de Feedback */}
        {errorMessage && (
          <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex flex-col gap-2 animate-shake">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <span className="font-medium">{errorMessage}</span>
            </div>
            {onBackToCompanySelect && errorMessage.includes('não possui acesso') && (
              <button
                type="button"
                onClick={onBackToCompanySelect}
                className="mt-1 text-xs font-bold text-sky-400 hover:text-sky-300 underline self-start pl-6 cursor-pointer"
              >
                ← Voltar para seleção de empresa
              </button>
            )}
          </div>
        )}
        
        {successMessage && (
          <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-2.5 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Formulários dinâmicos baseados na view atual */}
        {view === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                E-mail de Acesso
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="seu.email@empresa.com.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-xs rounded-2xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Senha
                </label>
                <button
                  type="button"
                  onClick={() => setView('forgot_password')}
                  className="text-[11px] font-semibold text-sky-400 hover:text-sky-300 transition-colors"
                >
                  Esqueceu a senha?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  placeholder="Digite sua senha..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-11 py-2.5 text-xs rounded-2xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
                  title={showPassword ? 'Ocultar senha' : 'Visualizar senha'}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4 text-sky-400" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-xs font-bold text-white bg-gradient-to-r ${targetCompany.buttonGradient} ${targetCompany.buttonHoverGradient} border border-white/20 shadow-lg shadow-black/40 transition-all transform hover:-translate-y-0.5 active:translate-y-0 active:scale-95 disabled:opacity-50 mt-2 cursor-pointer`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Validando credenciais...</span>
                </>
              ) : (
                <span>ENTRAR NO SISTEMA</span>
              )}
            </button>
          </form>
        )}

        {view === 'forgot_password' && (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                E-mail Cadastrado
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  required
                  placeholder="seu.email@empresa.com.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-xs rounded-2xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-xs font-bold text-white bg-gradient-to-r ${targetCompany.buttonGradient} ${targetCompany.buttonHoverGradient} border border-white/20 shadow-lg transition-all transform hover:-translate-y-0.5 active:translate-y-0 active:scale-95 disabled:opacity-50 mt-2 cursor-pointer`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Enviando link...</span>
                </>
              ) : (
                <span>ENVIAR LINK DE REDEFINIÇÃO</span>
              )}
            </button>

            <button
              type="button"
              onClick={resetState}
              className="w-full flex items-center justify-center gap-2 py-3 text-xs font-bold text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>VOLTAR AO LOGIN</span>
            </button>
          </form>
        )}

        {(view === 'force_update' || view === 'reset_password') && (
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Nova Senha
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  placeholder="Mínimo de 6 caracteres"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pl-10 pr-11 py-2.5 text-xs rounded-2xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
                  tabIndex={-1}
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4 text-sky-400" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Confirmar Nova Senha
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  placeholder="Repita a nova senha"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-11 py-2.5 text-xs rounded-2xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4 text-sky-400" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-xs font-bold text-white bg-gradient-to-r ${targetCompany.buttonGradient} ${targetCompany.buttonHoverGradient} border border-white/20 shadow-lg transition-all transform hover:-translate-y-0.5 active:translate-y-0 active:scale-95 disabled:opacity-50 mt-2 cursor-pointer`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Atualizando...</span>
                </>
              ) : (
                <span>{view === 'force_update' ? 'SALVAR E ACESSAR SISTEMA' : 'REDEFINIR SENHA'}</span>
              )}
            </button>
          </form>
        )}

        {/* Rodapé Seguro */}
        <div className="pt-4 border-t border-slate-800/80 text-center space-y-2">
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Autenticação Segura via Supabase Auth</span>
          </div>
          <p className="text-[10px] text-slate-500 leading-relaxed">
            Usuários e permissões gerenciados por empresa. Cadastro público desabilitado.
          </p>
        </div>

      </div>

      {/* Assinatura Dinâmica da Empresa */}
      <footer className="mt-8 text-center text-xs text-slate-600">
        {targetCompany.nome} © 2026 • Gestão de Ambiência e Setup de Granjas
      </footer>

    </div>
  );
};
