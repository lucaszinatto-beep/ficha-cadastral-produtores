import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, ShieldCheck, Loader2, AlertCircle, Sparkles } from 'lucide-react';
import { supabase } from '../services/supabase';

interface LoginViewProps {
  onLoginSuccess?: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMessage('Por favor, informe seu e-mail e sua senha.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          setErrorMessage('E-mail ou senha incorretos. Verifique suas credenciais.');
        } else if (error.message.includes('Email not confirmed')) {
          setErrorMessage('E-mail cadastrado mas ainda não confirmado no Supabase.');
        } else {
          setErrorMessage(error.message || 'Erro ao realizar login no Supabase.');
        }
        return;
      }

      if (data.session) {
        if (onLoginSuccess) onLoginSuccess();
      }
    } catch (err: any) {
      console.error('Erro inesperado no login:', err);
      setErrorMessage('Falha na comunicação com o servidor de autenticação.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col justify-center items-center p-4 selection:bg-sky-500 selection:text-white relative overflow-hidden">
      
      {/* Elementos Decorativos de Fundo */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl shadow-black/50 backdrop-blur-xl space-y-6 relative z-10 animate-scale-up">
        
        {/* Cabeçalho com Logo Oficial Bello */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="bg-white rounded-2xl p-3 shadow-[0_0_30px_rgba(56,189,248,0.5)] border border-sky-400/50 flex items-center justify-center animate-pulse relative z-10 transition-all duration-700">
            <img
              src="/Logo_Bello.png"
              alt="Bello Alimentos"
              className="h-12 w-auto object-contain"
            />
          </div>
          
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-[11px] font-bold uppercase tracking-wider mb-1">
              <Sparkles className="w-3 h-3 text-sky-400" />
              <span>Acesso Restrito</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight uppercase leading-none mt-2">
              Setup <span className="text-sky-400">Granja</span>
            </h1>
            <p className="text-xs text-slate-400 mt-2">
              Acesso exclusivo para colaboradores e extensionistas
            </p>
          </div>
        </div>

        {/* Mensagem de Erro */}
        {errorMessage && (
          <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5 animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Formulário de Login */}
        <form onSubmit={handleLogin} className="space-y-4">
          
          {/* Campo E-mail */}
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
                placeholder="seu.email@belloalimentos.com.br"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-xs rounded-2xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          {/* Campo Senha com Olho para Visualizar */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Senha
            </label>
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
              {/* Botão de Olho para Visualizar / Ocultar Senha */}
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
                title={showPassword ? 'Ocultar senha' : 'Visualizar senha'}
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4 text-sky-400" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Botão de Entrar */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 via-sky-600 to-blue-700 hover:from-blue-500 hover:to-sky-500 border border-sky-400/40 shadow-lg shadow-sky-600/30 hover:shadow-sky-600/50 transition-all transform hover:-translate-y-0.5 active:translate-y-0 active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Autenticando no Supabase...</span>
              </>
            ) : (
              <span>ENTRAR NO SISTEMA</span>
            )}
          </button>
        </form>

        {/* Rodapé Seguro (Sem opção de autocadastro) */}
        <div className="pt-4 border-t border-slate-800/80 text-center space-y-2">
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Autenticação Segura via Supabase Auth</span>
          </div>
          <p className="text-[10px] text-slate-500 leading-relaxed">
            Usuários e permissões são gerenciados diretamente pelo administrador do sistema. Cadastro público desabilitado.
          </p>
        </div>

      </div>

      {/* Assinatura Bello Alimentos */}
      <footer className="mt-8 text-center text-xs text-slate-600">
        Bello Alimentos © 2026 • Gestão de Ambiência e Setup de Granjas
      </footer>

    </div>
  );
};
