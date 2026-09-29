import React, { useState, useMemo } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Mail, 
  User, 
  ArrowRight, 
  Eye, 
  EyeOff, 
  Sparkles, 
  KeyRound, 
  CheckCircle2, 
  AlertCircle, 
  Crown, 
  PhoneCall, 
  Briefcase,
  Building2
} from 'lucide-react';
import { AppUser } from '../types';
import { getStoredUsers, verifyUserPassword, setCurrentUser, setSessionAuthenticated } from '../utils/authService';

interface LoginScreenProps {
  onLoginSuccess: (user: AppUser) => void;
  onShowToast?: (msg: string) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onLoginSuccess,
  onShowToast
}) => {
  const users = useMemo(() => getStoredUsers(), []);
  
  const [loginMode, setLoginMode] = useState<'perfil' | 'credenciais'>('perfil');
  const [selectedUserId, setSelectedUserId] = useState<string>(users[0]?.id || 'user-adm');
  const [emailInput, setEmailInput] = useState<string>('');
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Selected user object when in 'perfil' mode
  const currentSelectedUser = useMemo(() => {
    return users.find(u => u.id === selectedUserId) || users[0];
  }, [users, selectedUserId]);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    let targetUser: AppUser | undefined;

    if (loginMode === 'perfil') {
      targetUser = currentSelectedUser;
    } else {
      const cleanEmail = emailInput.trim().toLowerCase();
      if (!cleanEmail) {
        setErrorMessage('Informe seu e-mail corporativo para prosseguir.');
        return;
      }
      targetUser = users.find(u => u.email.toLowerCase() === cleanEmail);
      if (!targetUser) {
        setErrorMessage('Nenhum usuário cadastrado com este e-mail. Verifique a digitação ou utilize a seleção de perfil.');
        return;
      }
    }

    if (!targetUser) {
      setErrorMessage('Usuário não localizado no sistema.');
      return;
    }

    if (!passwordInput.trim()) {
      setErrorMessage('Informe a senha de acesso.');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      const isValid = verifyUserPassword(targetUser!.id, passwordInput);
      if (!isValid) {
        setIsLoading(false);
        const expectedHint = (targetUser!.role === 'adm_master' || targetUser!.role === 'administrador' || targetUser!.role === 'socias' || targetUser!.role === 'coordenadora' || targetUser!.role === 'suporte') ? 'admin' : '1234';
        setErrorMessage(`Senha incorreta para ${targetUser!.nome}. (Dica: senha padrão é "${expectedHint}")`);
        return;
      }

      // Valid credentials
      setCurrentUser(targetUser!);
      setSessionAuthenticated(rememberMe);
      setIsLoading(false);

      if (onShowToast) {
        onShowToast(`Bem-vindo(a), ${targetUser!.nome}! Acesso autenticado com sucesso.`);
      }
      onLoginSuccess(targetUser!);
    }, 300);
  };

  // Quick 1-Click login shortcut for testing & fast switching
  const handleQuickLogin = (user: AppUser) => {
    setIsLoading(true);
    setErrorMessage(null);
    setSelectedUserId(user.id);
    const expectedPassword = user.senha || (
      user.role === 'adm_master' || 
      user.role === 'administrador' || 
      user.role === 'socias' || 
      user.role === 'coordenadora' || 
      user.role === 'suporte' 
        ? 'admin' 
        : '1234'
    );
    setPasswordInput(expectedPassword);

    setTimeout(() => {
      setCurrentUser(user);
      setSessionAuthenticated(true);
      setIsLoading(false);
      if (onShowToast) {
        onShowToast(`Autenticado como ${user.nome} (${user.cargo || user.role}).`);
      }
      onLoginSuccess(user);
    }, 250);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 flex flex-col justify-between p-4 sm:p-6 lg:p-8 text-slate-100 font-sans selection:bg-blue-600 selection:text-white">
      
      {/* Top Header Bar */}
      <header className="w-full max-w-6xl mx-auto flex items-center justify-between pb-6 border-b border-slate-700/60">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black shadow-lg shadow-blue-600/30 text-base">
            V
          </div>
          <div>
            <h1 className="text-base font-black tracking-tight text-white flex items-center gap-2">
              <span>VALORA GESTÃO &amp; FINANÇAS</span>
              <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                PRO 2026
              </span>
            </h1>
            <p className="text-xs text-slate-400 font-medium">
              Cartão de Todos &amp; Ótica Ibirité • Recuperação de Carteira
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-800/80 px-3 py-1.5 rounded-full border border-slate-700">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span className="hidden sm:inline">Portal Corporativo Seguro</span>
          <span className="sm:hidden">Seguro</span>
        </div>
      </header>

      {/* Main Login Card Section */}
      <main className="w-full max-w-5xl mx-auto my-auto py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        
        {/* Left Info Column (Brand & Context) */}
        <div className="lg:col-span-5 space-y-6 text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-300 border border-blue-500/20">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>Sistema Central de Cobrança</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">
            Gestão Estratégica da Inadimplência
          </h2>

          <p className="text-sm text-slate-300 leading-relaxed">
            Plataforma unificada para negociação de débitos, emissão de boletos, registro de contatos e acompanhamento em tempo real da carteira de cobrança.
          </p>

          <div className="space-y-3 pt-2">
            <div className="flex items-start gap-3 text-xs text-slate-300">
              <div className="w-5 h-5 rounded-md bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
              <span>Controle de acessos com visualização restrita por cobradora ou acesso total da diretoria.</span>
            </div>
            <div className="flex items-start gap-3 text-xs text-slate-300">
              <div className="w-5 h-5 rounded-md bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
              <span>Alertas matinais automáticos e rotina consolidada de backup às 08:00.</span>
            </div>
            <div className="flex items-start gap-3 text-xs text-slate-300">
              <div className="w-5 h-5 rounded-md bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0 mt-0.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
              <span>Relatórios comparativos de eficiência semanal com exportação em Excel e PDF.</span>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Login Card */}
        <div className="lg:col-span-7 bg-white text-slate-900 rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200">
          
          <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100">
            <div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">
                Entrar no Sistema
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Selecione seu perfil ou digite suas credenciais
              </p>
            </div>
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600">
              <button
                type="button"
                onClick={() => { setLoginMode('perfil'); setErrorMessage(null); }}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  loginMode === 'perfil' ? 'bg-white text-blue-900 shadow-xs' : 'hover:text-slate-900'
                }`}
              >
                Por Perfil
              </button>
              <button
                type="button"
                onClick={() => { setLoginMode('credenciais'); setErrorMessage(null); }}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  loginMode === 'credenciais' ? 'bg-white text-blue-900 shadow-xs' : 'hover:text-slate-900'
                }`}
              >
                Por E-mail
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            
            {loginMode === 'perfil' ? (
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Selecione o Operador / Perfil
                </label>
                <div className="relative">
                  <select
                    value={selectedUserId}
                    onChange={(e) => {
                      setSelectedUserId(e.target.value);
                      setPasswordInput('');
                      setErrorMessage(null);
                    }}
                    className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
                  >
                    <optgroup label="🛡️ Gestão &amp; Diretoria">
                      {users.filter(u => u.role !== 'cobranca').map(u => (
                        <option key={u.id} value={u.id}>
                          {u.nome} ({u.cargo || u.role})
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="📞 Equipe de Cobrança">
                      {users.filter(u => u.role === 'cobranca').map(u => (
                        <option key={u.id} value={u.id}>
                          {u.nome} - Carteira: {u.responsavelAssociado || u.nome}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                {/* Selected Profile Preview Badge */}
                <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl ${currentSelectedUser.avatarColor} text-white flex items-center justify-center font-bold text-sm shadow-xs`}>
                      {currentSelectedUser.role === 'adm_master' || currentSelectedUser.role === 'administrador' ? (
                        <Crown className="w-4 h-4 text-amber-300" />
                      ) : (
                        currentSelectedUser.nome.charAt(0)
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 leading-tight">
                        {currentSelectedUser.nome}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {currentSelectedUser.email}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200 uppercase tracking-wider">
                    {currentSelectedUser.role === 'cobranca' ? `Cobradora ${currentSelectedUser.responsavelAssociado}` : 'Diretoria / Gestão'}
                  </span>
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  E-mail Corporativo
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="ex: palomasouza@nossaoticaibirite.com.br"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    required
                  />
                </div>
              </div>
            )}

            {/* Password Input */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-slate-500" />
                  <span>Senha de Acesso</span>
                </label>
                <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                  Padrão: {loginMode === 'perfil' && (currentSelectedUser.role === 'adm_master' || currentSelectedUser.role === 'administrador' || currentSelectedUser.role === 'socias' || currentSelectedUser.role === 'coordenadora' || currentSelectedUser.role === 'suporte') ? 'admin' : '1234'}
                </span>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Digite sua senha..."
                  className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 tracking-wider"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  title={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me & Hints */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 text-xs text-slate-600 font-medium cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                />
                <span>Lembrar meu acesso neste dispositivo</span>
              </label>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="font-medium">{errorMessage}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl text-xs font-bold bg-blue-700 hover:bg-blue-800 text-white flex items-center justify-center gap-2 shadow-md shadow-blue-700/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <span>Autenticando...</span>
              ) : (
                <>
                  <span>Entrar no Sistema</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick 1-Click Access Section */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <KeyRound className="w-3 h-3 text-amber-500" />
                Acesso Rápido com 1-Clique (Atalho de Login)
              </span>
              <span className="text-[10px] text-slate-400">
                Preenche senha automaticamente
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {users.map(u => {
                const isOp = u.role === 'cobranca';
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => handleQuickLogin(u)}
                    className="p-2 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 transition-all text-left group cursor-pointer"
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className={`w-5 h-5 rounded-md ${u.avatarColor} text-white flex items-center justify-center font-bold text-[9px]`}>
                        {u.nome[0]}
                      </div>
                      <span className="text-[11px] font-bold text-slate-900 truncate group-hover:text-blue-700">
                        {u.nome.split(' ')[0]}
                      </span>
                    </div>
                    <span className="text-[9px] text-slate-500 font-medium block truncate">
                      {isOp ? `Cob. ${u.responsavelAssociado}` : (u.role === 'administrador' ? 'Admin' : u.role === 'socias' ? 'Sócias' : 'Gestão')}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

        </div>

      </main>

      {/* Footer */}
      <footer className="w-full max-w-6xl mx-auto pt-6 border-t border-slate-700/60 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400 text-center sm:text-left">
        <p>
          &copy; {new Date().getFullYear()} Valora Gestão &amp; Finanças • Cartão de Todos &amp; Ótica Ibirité. Todos os direitos reservados.
        </p>
        <p className="flex items-center gap-2">
          <span>Ambiente Seguro</span>
          <span>•</span>
          <span>Controle RBAC Ativo</span>
        </p>
      </footer>

    </div>
  );
};
