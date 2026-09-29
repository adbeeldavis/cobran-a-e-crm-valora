import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, 
  Users, 
  UserCheck, 
  Crown, 
  Plus, 
  Check, 
  Lock, 
  Key,
  Eye,
  EyeOff,
  ShieldAlert,
  Edit2,
  Clock,
  Bell,
  BellRing,
  Calendar,
  LogOut
} from 'lucide-react';
import { AppUser, DebtRecord } from '../types';
import { 
  getStoredUsers, 
  addNewOperator, 
  verifyUserPassword, 
  updateUserPassword,
  updateOperatorNotificationSchedule,
  getCurrentUser
} from '../utils/authService';
import { scheduleWorkdayStartAlert } from '../utils/reminderService';

interface UserAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AppUser;
  onSelectUser: (user: AppUser) => void;
  allRecords?: DebtRecord[];
  onShowToast: (message: string) => void;
  onReassignPortfolio?: (fromResp: string, toResp: string) => void;
  onLogout?: () => void;
}

export const UserAuthModal: React.FC<UserAuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSelectUser,
  allRecords = [],
  onShowToast,
  onReassignPortfolio,
  onLogout,
}) => {
  const [users, setUsers] = useState<AppUser[]>(() => getStoredUsers());
  const [activeTab, setActiveTab] = useState<'perfis' | 'gerenciar_senhas' | 'reatribuir_carteiras' | 'horarios_alertas'>('perfis');
  
  // State for adding new operator
  const [isAddingNew, setIsAddingNew] = useState<boolean>(false);
  const [newNome, setNewNome] = useState<string>('');
  const [newEmail, setNewEmail] = useState<string>('');
  const [newResponsavel, setNewResponsavel] = useState<string>('');
  const [newCargo, setNewCargo] = useState<string>('Operador(a) de Cobrança');
  const [newSenha, setNewSenha] = useState<string>('1234');
  const [newHorario, setNewHorario] = useState<string>('08:00');
  const [newNotificacaoAtiva, setNewNotificacaoAtiva] = useState<boolean>(true);

  // State for portfolio reassignment (Adm Master)
  const [fromResp, setFromResp] = useState<string>('ROSANA');
  const [toResp, setToResp] = useState<string>('ANA LUIZA');

  // State for password challenge when switching profile
  const [targetUserForLogin, setTargetUserForLogin] = useState<AppUser | null>(null);
  const [passwordAttempt, setPasswordAttempt] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // State for password editing by master
  const [editingPasswordUserId, setEditingPasswordUserId] = useState<string | null>(null);
  const [editPasswordValue, setEditPasswordValue] = useState<string>('');

  // State for editing notification schedules per operator
  const [userSchedules, setUserSchedules] = useState<Record<string, { horario: string; ativa: boolean }>>(() => {
    const map: Record<string, { horario: string; ativa: boolean }> = {};
    const initialUsers = getStoredUsers();
    for (const u of initialUsers) {
      map[u.id] = {
        horario: u.horarioNotificacao || '08:00',
        ativa: u.notificacaoDiariaAtiva !== false,
      };
    }
    return map;
  });

  // Keep schedules state synced with users
  useEffect(() => {
    setUserSchedules(prev => {
      const updated = { ...prev };
      for (const u of users) {
        if (!updated[u.id]) {
          updated[u.id] = {
            horario: u.horarioNotificacao || '08:00',
            ativa: u.notificacaoDiariaAtiva !== false,
          };
        }
      }
      return updated;
    });
  }, [users]);

  // Count clients per user/collector safely
  const clientCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    const safeList = Array.isArray(allRecords) ? allRecords : [];
    for (const rec of safeList) {
      const resp = (rec.responsavel || 'GERAL').toUpperCase().trim();
      counts[resp] = (counts[resp] || 0) + 1;
    }
    return counts;
  }, [allRecords]);

  // Unique list of active operators
  const activeOperatorList = useMemo(() => {
    const set = new Set<string>();
    ['ROSANA', 'ANA LUIZA', 'KEYLLA', 'FABIOLA', 'GERAL'].forEach(r => set.add(r));
    users.forEach(u => {
      if (u.responsavelAssociado) set.add(u.responsavelAssociado.toUpperCase().trim());
    });
    return Array.from(set).sort();
  }, [users]);

  if (!isOpen) return null;

  const isMaster = currentUser.role === 'adm_master' || currentUser.role === 'suporte';

  const handleInitiateSwitch = (user: AppUser) => {
    if (user.id === currentUser.id) return;
    setTargetUserForLogin(user);
    setPasswordAttempt('');
    setLoginError(null);
    setShowPassword(false);
  };

  const handleConfirmLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUserForLogin) return;

    const isValid = verifyUserPassword(targetUserForLogin.id, passwordAttempt);
    if (!isValid) {
      setLoginError('Senha incorreta! Verifique com o Administrador Master.');
      return;
    }

    onSelectUser(targetUserForLogin);
    onShowToast(`Autenticado com sucesso como ${targetUserForLogin.nome}!`);
    setTargetUserForLogin(null);
    onClose();
  };

  const handleCreateOperator = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNome.trim() || !newEmail.trim() || !newResponsavel.trim()) {
      onShowToast('Preencha nome, e-mail e identificação da cobradora.');
      return;
    }

    try {
      const created = addNewOperator({
        nome: newNome.trim(),
        email: newEmail.trim(),
        responsavelAssociado: newResponsavel.trim().toUpperCase(),
        cargo: newCargo.trim() || 'Operador(a) de Cobrança',
        senha: newSenha.trim() || '1234',
        horarioNotificacao: newHorario.trim() || '08:00',
        notificacaoDiariaAtiva: newNotificacaoAtiva,
      });

      // Schedule initial workday alert for the new operator
      scheduleWorkdayStartAlert(created, allRecords);

      setUsers(getStoredUsers());
      setIsAddingNew(false);
      setNewNome('');
      setNewEmail('');
      setNewResponsavel('');
      setNewSenha('1234');
      setNewHorario('08:00');
      onShowToast(`Operador(a) "${created.nome}" cadastrado com horário de alerta às ${created.horarioNotificacao || '08:00'}!`);
    } catch (err) {
      console.error(err);
      onShowToast('Erro ao cadastrar novo operador.');
    }
  };

  const handleSavePasswordChange = (userId: string) => {
    if (!editPasswordValue.trim()) {
      onShowToast('A senha não pode estar em branco.');
      return;
    }
    const success = updateUserPassword(userId, editPasswordValue.trim());
    if (success) {
      setUsers(getStoredUsers());
      setEditingPasswordUserId(null);
      setEditPasswordValue('');
      onShowToast('Senha do operador atualizada com sucesso pelo Master!');
    }
  };

  const handleSaveScheduleChange = (userId: string) => {
    const sched = userSchedules[userId] || { horario: '08:00', ativa: true };
    const success = updateOperatorNotificationSchedule(userId, sched.horario, sched.ativa);
    if (success) {
      const updatedUsers = getStoredUsers();
      setUsers(updatedUsers);
      const target = updatedUsers.find(u => u.id === userId);
      if (target) {
        // Schedule/refresh workday alert via reminderService
        scheduleWorkdayStartAlert(target, allRecords);
        onShowToast(`Horário de ${target.nome} salvo às ${sched.horario}! Alerta matinal agendado via reminderService.`);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto no-print">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in-95 my-8">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-700 text-white flex items-center justify-center shadow-xs">
              <Users className="w-5 h-5 text-blue-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  Configurações de Operadores &amp; Alertas
                </h2>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                  Valora Gestão &amp; Finanças
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Gerencie perfis, senhas e agendamento de alertas matinais no início do dia de trabalho via reminderService
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onLogout && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onLogout();
                }}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 text-slate-600 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Encerrar sessão e voltar à Tela Inicial de Login"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sair / Login</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Sub-Header Tabs */}
        <div className="px-6 py-3 border-b border-slate-200 bg-white flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <div className="flex items-center bg-slate-100 border border-slate-200 rounded-lg p-0.5 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab('perfis')}
                className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                  activeTab === 'perfis' ? 'bg-blue-700 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Alternar Perfil
              </button>

              {/* Horários de Notificação - Accessible to all */}
              <button
                type="button"
                onClick={() => setActiveTab('horarios_alertas')}
                className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeTab === 'horarios_alertas' ? 'bg-blue-700 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Horários de Alerta (Início do Dia)</span>
              </button>

              {isMaster && (
                <>
                  <button
                    type="button"
                    onClick={() => setActiveTab('gerenciar_senhas')}
                    className={`px-3 py-1.5 rounded-md flex items-center gap-1 transition-colors cursor-pointer ${
                      activeTab === 'gerenciar_senhas' ? 'bg-blue-700 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Key className="w-3.5 h-3.5" />
                    <span>Senhas (Master)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('reatribuir_carteiras')}
                    className={`px-3 py-1.5 rounded-md flex items-center gap-1 transition-colors cursor-pointer ${
                      activeTab === 'reatribuir_carteiras' ? 'bg-blue-700 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Reatribuir Leads</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {isMaster && activeTab === 'perfis' && !isAddingNew && (
            <button
              onClick={() => setIsAddingNew(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5 text-blue-200" />
              <span>+ Novo Operador</span>
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="p-6 max-h-[70vh] overflow-y-auto space-y-6">
          
          {/* TAB 1: PERFIS DE ACESSO */}
          {activeTab === 'perfis' && (
            <>
              {/* New Operator Form */}
              {isAddingNew && (
                <form onSubmit={handleCreateOperator} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Plus className="w-3.5 h-3.5 text-blue-700" />
                      <span>Cadastrar Novo Operador com Horário de Alerta</span>
                    </h3>
                    <button
                      type="button"
                      onClick={() => setIsAddingNew(false)}
                      className="text-xs text-slate-500 hover:text-slate-800"
                    >
                      Cancelar
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                    <div>
                      <label className="block text-slate-700 font-medium mb-1">Nome Completo:</label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: Mariana Oliveira"
                        value={newNome}
                        onChange={(e) => setNewNome(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-medium mb-1">E-mail Corporativo:</label>
                      <input
                        type="email"
                        required
                        placeholder="mariana.cobranca@empresa.com.br"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-medium mb-1">
                        Cobradora na Planilha (Responsável):
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: MARIANA"
                        value={newResponsavel}
                        onChange={(e) => setNewResponsavel(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono uppercase focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-medium mb-1 flex items-center gap-1">
                        <Key className="w-3.5 h-3.5 text-amber-600" />
                        <span>Senha Inicial do Operador:</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: 1234"
                        value={newSenha}
                        onChange={(e) => setNewSenha(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-medium mb-1 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-blue-700" />
                        <span>Horário de Notificação (Início do Dia):</span>
                      </label>
                      <input
                        type="time"
                        required
                        value={newHorario}
                        onChange={(e) => setNewHorario(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-bold"
                      />
                    </div>

                    <div className="flex items-end pb-2">
                      <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newNotificacaoAtiva}
                          onChange={(e) => setNewNotificacaoAtiva(e.target.checked)}
                          className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                        />
                        <span>Ativar alerta matinal diário via reminderService</span>
                      </label>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={() => setIsAddingNew(false)}
                      className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
                    >
                      Salvar Operador &amp; Agendar Alerta
                    </button>
                  </div>
                </form>
              )}

              {/* User Cards Grid */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Escolha o Perfil para Fazer Login com Senha:
                  </h3>
                  <span className="text-[11px] text-slate-500">
                    {users.length} operadores registrados
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {users.map((user) => {
                    const isSelected = currentUser.id === user.id;
                    const isAdm = user.role === 'adm_master';
                    const isSuporte = user.role === 'suporte';
                    const assignedCount = (isAdm || isSuporte)
                      ? allRecords.length 
                      : (clientCounts[(user.responsavelAssociado || '').toUpperCase()] || 0);

                    return (
                      <div
                        key={user.id}
                        className={`p-4 rounded-xl border transition-all relative flex flex-col justify-between ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50/40 ring-2 ring-blue-600/20 shadow-xs'
                            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60'
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-2.5">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-xl ${user.avatarColor} text-white flex items-center justify-center font-bold text-sm shadow-xs`}>
                                {isAdm ? <Crown className="w-5 h-5 text-amber-300" /> : isSuporte ? <ShieldAlert className="w-5 h-5 text-cyan-300" /> : user.nome.charAt(0)}
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <h4 className="text-xs font-bold text-slate-900">{user.nome}</h4>
                                  {isAdm && (
                                    <span className="p-0.5 rounded bg-amber-100 text-amber-800" title="Acesso Master">
                                      <Crown className="w-3 h-3 text-amber-600" />
                                    </span>
                                  )}
                                  {isSuporte && (
                                    <span className="p-0.5 rounded bg-slate-200 text-slate-800" title="Suporte Valora">
                                      <ShieldAlert className="w-3 h-3 text-slate-700" />
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-slate-500">{user.email}</p>
                              </div>
                            </div>

                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                              isAdm
                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                : isSuporte
                                ? 'bg-slate-800 text-white border border-slate-700'
                                : 'bg-blue-100 text-blue-900 border border-blue-300'
                            }`}>
                              {isAdm ? 'ADM MASTER' : isSuporte ? 'SUPORTE' : 'OPERADOR'}
                            </span>
                          </div>

                          <div className="bg-slate-50 rounded-lg p-2.5 text-xs space-y-1.5 mb-3 border border-slate-100">
                            <div className="flex justify-between items-center text-slate-600">
                              <span>Carteira Exclusiva:</span>
                              <strong className="text-slate-900">
                                {isAdm || isSuporte ? 'Todas as Cobradoras (Total)' : user.responsavelAssociado}
                              </strong>
                            </div>
                            <div className="flex justify-between items-center text-slate-600">
                              <span>Clientes sob Gestão:</span>
                              <strong className="text-blue-700">
                                {assignedCount} clientes
                              </strong>
                            </div>

                            {/* Workday notification time indicator */}
                            <div className="flex justify-between items-center text-slate-600 pt-1 border-t border-slate-200/60">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3 text-blue-700" />
                                <span>Alerta Início do Dia:</span>
                              </span>
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono font-bold text-blue-800 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                                  {user.horarioNotificacao || '08:00'}
                                </span>
                                <span className={`text-[10px] font-semibold ${user.notificacaoDiariaAtiva !== false ? 'text-emerald-700' : 'text-slate-400'}`}>
                                  {user.notificacaoDiariaAtiva !== false ? '● Ativo' : '○ Inativo'}
                                </span>
                              </div>
                            </div>

                            {isMaster && (
                              <div className="flex justify-between items-center pt-1 border-t border-slate-200/60 text-[11px]">
                                <span className="text-slate-500 flex items-center gap-1">
                                  <Lock className="w-3 h-3 text-amber-600" />
                                  <span>Senha atual:</span>
                                </span>
                                <span className="font-mono font-bold text-slate-800 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                                  {user.senha || (isAdm ? 'admin' : '1234')}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                          <span className="text-[11px] text-slate-500 flex items-center gap-1">
                            <Lock className="w-3 h-3 text-slate-400" />
                            <span>Requer senha</span>
                          </span>

                          {isSelected ? (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-md">
                              <Check className="w-3.5 h-3.5" />
                              <span>Sessão Atual</span>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleInitiateSwitch(user)}
                              className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              <span>Acessar</span>
                              <UserCheck className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* TAB 4: CONFIGURAÇÕES DE HORÁRIO DE NOTIFICAÇÃO (INÍCIO DO DIA) */}
          {activeTab === 'horarios_alertas' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-1.5">
                <div className="flex items-center gap-2">
                  <BellRing className="w-4 h-4 text-blue-700" />
                  <h3 className="text-xs font-bold text-blue-900 uppercase tracking-wider">
                    Agendamento de Alerta Matinal de Início do Expediente via reminderService
                  </h3>
                </div>
                <p className="text-xs text-blue-800">
                  Configure o horário exato em que o sistema agenda e dispara o alerta matinal específico para cada operador de cobrança. No início do dia, o sistema calcula o resumo das pendências da carteira (clientes em atraso, casos críticos &gt;45 dias e promessas de pagamento para o dia) e exibe o popup e a notificação sonora no navegador.
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  {isMaster ? 'Horários de Todos os Operadores da Equipe:' : 'Meu Horário de Início do Dia de Trabalho:'}
                </h4>

                <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden bg-white">
                  {users
                    .filter(u => isMaster || u.id === currentUser.id)
                    .map((user) => {
                      const sched = userSchedules[user.id] || { horario: user.horarioNotificacao || '08:00', ativa: user.notificacaoDiariaAtiva !== false };
                      const isCurrentUserItem = user.id === currentUser.id;

                      return (
                        <div key={user.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-xl ${user.avatarColor} text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs`}>
                              {user.role === 'adm_master' ? <Crown className="w-4 h-4 text-amber-300" /> : user.nome.charAt(0)}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h5 className="text-xs font-bold text-slate-900">{user.nome}</h5>
                                {isCurrentUserItem && (
                                  <span className="px-1.5 py-0.2 bg-blue-100 text-blue-800 text-[10px] font-bold rounded">
                                    Você
                                  </span>
                                )}
                                <span className="text-[10px] text-slate-500 font-mono">
                                  ({user.responsavelAssociado || 'Geral'})
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500">{user.cargo || 'Operador de Cobrança'}</p>
                            </div>
                          </div>

                          {/* Schedule Controls */}
                          <div className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                              <Clock className="w-4 h-4 text-blue-700 shrink-0" />
                              <label className="text-[11px] font-semibold text-slate-700">Horário:</label>
                              <input
                                type="time"
                                value={sched.horario}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setUserSchedules(prev => ({
                                    ...prev,
                                    [user.id]: { ...sched, horario: val }
                                  }));
                                }}
                                className="px-2 py-1 bg-white border border-slate-300 rounded font-mono font-bold text-xs text-blue-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                              />
                            </div>

                            {/* Presets */}
                            <div className="hidden md:flex items-center gap-1">
                              {['07:30', '08:00', '08:30', '09:00'].map((preset) => (
                                <button
                                  key={preset}
                                  type="button"
                                  onClick={() => {
                                    setUserSchedules(prev => ({
                                      ...prev,
                                      [user.id]: { ...sched, horario: preset }
                                    }));
                                  }}
                                  className={`px-2 py-1 rounded text-[10px] font-mono font-semibold transition-colors cursor-pointer ${
                                    sched.horario === preset
                                      ? 'bg-blue-700 text-white'
                                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                  }`}
                                >
                                  {preset}
                                </button>
                              ))}
                            </div>

                            {/* Active Toggle */}
                            <label className="flex items-center gap-1.5 text-xs text-slate-700 font-medium cursor-pointer">
                              <input
                                type="checkbox"
                                checked={sched.ativa}
                                onChange={(e) => {
                                  const val = e.target.checked;
                                  setUserSchedules(prev => ({
                                    ...prev,
                                    [user.id]: { ...sched, ativa: val }
                                  }));
                                }}
                                className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                              />
                              <span className="text-[11px]">{sched.ativa ? 'Ativo' : 'Pausado'}</span>
                            </label>

                            {/* Save Button */}
                            <button
                              type="button"
                              onClick={() => handleSaveScheduleChange(user.id)}
                              className="px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Salvar &amp; Agendar</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: GERENCIAMENTO DE SENHAS PELO MASTER */}
          {activeTab === 'gerenciar_senhas' && isMaster && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-amber-700" />
                  <h3 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                    Controle de Acesso Exclusivo do Usuário Master
                  </h3>
                </div>
                <p className="text-xs text-amber-800">
                  Como Administrador Master ou Suporte, você pode visualizar e alterar as senhas de acesso de qualquer operador de cobrança a qualquer momento.
                </p>
              </div>

              <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden bg-white">
                {users.map((user) => {
                  const isBeingEdited = editingPasswordUserId === user.id;

                  return (
                    <div key={user.id} className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg ${user.avatarColor} text-white flex items-center justify-center font-bold text-xs`}>
                          {user.role === 'adm_master' ? <Crown className="w-4 h-4 text-amber-300" /> : user.nome.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-bold text-slate-900">{user.nome}</h4>
                            <span className="text-[10px] text-slate-500 font-mono">({user.responsavelAssociado || 'Geral'})</span>
                          </div>
                          <p className="text-[11px] text-slate-500">{user.email}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {isBeingEdited ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              autoFocus
                              value={editPasswordValue}
                              onChange={(e) => setEditPasswordValue(e.target.value)}
                              placeholder="Nova senha..."
                              className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-hidden w-28"
                            />
                            <button
                              type="button"
                              onClick={() => handleSavePasswordChange(user.id)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg cursor-pointer"
                            >
                              Salvar
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingPasswordUserId(null);
                                setEditPasswordValue('');
                              }}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs rounded-lg cursor-pointer"
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5 font-mono text-xs bg-slate-100 px-2 py-1 rounded border border-slate-200">
                              <Lock className="w-3 h-3 text-slate-400" />
                              <span className="font-bold text-slate-800">{user.senha || '1234'}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingPasswordUserId(user.id);
                                setEditPasswordValue(user.senha || '1234');
                              }}
                              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                              title="Editar senha deste operador"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: REATRIBUIÇÃO DE CARTEIRAS (ADM MASTER) */}
          {activeTab === 'reatribuir_carteiras' && isMaster && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl space-y-1">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-700" />
                  <h3 className="text-xs font-bold text-indigo-900 uppercase tracking-wider">
                    Reatribuição em Massa de Clientes (Coluna Responsável)
                  </h3>
                </div>
                <p className="text-xs text-indigo-800">
                  Transfira toda a carteira de cobrança de uma operadora para outra com 1 clique. Todas as fichas, históricos de negociação e status serão preservados e transferidos.
                </p>
              </div>

              <div className="bg-white p-5 border border-slate-200 rounded-xl space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Transferir da Cobradora (Origem):
                    </label>
                    <select
                      value={fromResp}
                      onChange={(e) => setFromResp(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden cursor-pointer"
                    >
                      {activeOperatorList.map(op => (
                        <option key={op} value={op}>
                          {op} ({clientCounts[op] || 0} leads)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Para a Cobradora (Destino):
                    </label>
                    <select
                      value={toResp}
                      onChange={(e) => setToResp(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-indigo-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden cursor-pointer"
                    >
                      {activeOperatorList.map(op => (
                        <option key={op} value={op}>
                          {op} ({clientCounts[op] || 0} leads atuais)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {fromResp === toResp && (
                  <p className="text-xs text-amber-700 font-medium bg-amber-50 p-2 rounded-lg border border-amber-200">
                    ⚠️ A cobradora de origem e de destino são as mesmas. Selecione operadores distintos.
                  </p>
                )}

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
                  <span className="text-xs text-slate-500">
                    Total a transferir: <strong>{clientCounts[fromResp] || 0}</strong> clientes de <strong>{fromResp}</strong> para <strong>{toResp}</strong>
                  </span>
                  <button
                    type="button"
                    disabled={fromResp === toResp || (clientCounts[fromResp] || 0) === 0}
                    onClick={() => {
                      if (onReassignPortfolio) {
                        onReassignPortfolio(fromResp, toResp);
                        onShowToast(`Carteira de ${fromResp} (${clientCounts[fromResp]} clientes) transferida com sucesso para ${toResp}!`);
                      }
                    }}
                    className="px-4 py-2 bg-blue-700 hover:bg-blue-800 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:cursor-not-allowed"
                  >
                    Confirmar Reatribuição de Carteira
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-slate-400" />
            <span>Senhas protegidas e alertas agendados localmente na central de cobrança.</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>

      </div>

      {/* Password Challenge Dialog */}
      {targetUserForLogin && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-lg ${targetUserForLogin.avatarColor} text-white flex items-center justify-center font-bold text-xs`}>
                  {targetUserForLogin.role === 'adm_master' ? <Crown className="w-4 h-4 text-amber-300" /> : targetUserForLogin.nome.charAt(0)}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Autenticação Necessária</h4>
                  <p className="text-[11px] text-slate-500">Acessar como {targetUserForLogin.nome}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTargetUserForLogin(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Digite a senha do operador:
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoFocus
                    placeholder="Digite a senha..."
                    value={passwordAttempt}
                    onChange={(e) => {
                      setPasswordAttempt(e.target.value);
                      setLoginError(null);
                    }}
                    className="w-full pl-3 pr-10 py-2.5 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden shadow-2xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  (Senha padrão: <strong>1234</strong> para operadores ou <strong>admin</strong> para Master)
                </p>
              </div>

              {loginError && (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{loginError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setTargetUserForLogin(null)}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
                >
                  Acessar Perfil
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
