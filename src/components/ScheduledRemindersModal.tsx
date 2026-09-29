import React, { useState, useMemo } from 'react';
import { 
  X, 
  Clock, 
  Calendar, 
  Mail, 
  Bell, 
  AlertTriangle, 
  CheckCircle2, 
  Send, 
  Trash2, 
  Play, 
  Users, 
  Filter,
  Info,
  Layers,
  Sparkles,
  ShieldAlert,
  RotateCw,
  PlusCircle,
  Volume2,
  VolumeX,
  ExternalLink,
  Check
} from 'lucide-react';
import { DebtRecord, LembreteAgendado, AlertaInterno, TipoCanalAlerta, AppUser, TipoRecorrenciaLembrete } from '../types';
import { 
  getClientesMaisDe45Dias, 
  getStoredScheduledReminders, 
  scheduleBulkRemindersFor45Days, 
  scheduleReminder,
  scheduleCustomRecurringReminder,
  completeReminder,
  postponeReminder,
  deleteScheduledReminder,
  executeDispatchReminder, 
  cancelScheduledReminder,
  getStoredInternalAlerts,
  markAlertAsRead,
  markAllAlertsAsRead,
  deleteAlert,
  generateDefaultReminderEmail
} from '../utils/reminderService';
import { 
  getBrowserNotificationPermission, 
  requestBrowserNotificationPermission, 
  isWebNotificationEnabled, 
  setWebNotificationEnabled, 
  sendBrowserNotification, 
  playNotificationChime,
  BrowserNotificationPermission
} from '../utils/browserNotificationService';
import { calculateDaysOverdue } from '../utils/sheetParser';

interface ScheduledRemindersModalProps {
  isOpen: boolean;
  onClose: () => void;
  records: DebtRecord[];
  currentUser: AppUser;
  onRecordUpdated?: (record: DebtRecord) => void;
  onShowToast: (message: string) => void;
}

export const ScheduledRemindersModal: React.FC<ScheduledRemindersModalProps> = ({
  isOpen,
  onClose,
  records,
  currentUser,
  onRecordUpdated,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<'recorrentes' | 'agendar' | 'agendados' | 'alertas'>('recorrentes');
  const [selectedCanal, setSelectedCanal] = useState<TipoCanalAlerta>('ambos');
  const [scheduledDate, setScheduledDate] = useState<string>(() => {
    const today = new Date();
    today.setDate(today.getDate() + 1);
    return today.toISOString().split('T')[0];
  });
  const [scheduledTime, setScheduledTime] = useState<string>('09:00');
  const [selectedClientId, setSelectedClientId] = useState<string>('todos');
  const [customSubject, setCustomSubject] = useState<string>('');
  const [customMessage, setCustomMessage] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Recurring / Fixed Date Reminder state
  const [recTitulo, setRecTitulo] = useState<string>('');
  const [recMensagem, setRecMensagem] = useState<string>('');
  const [recData, setRecData] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [recHorario, setRecHorario] = useState<string>('09:00');
  const [recResponsavel, setRecResponsavel] = useState<string>(() => 
    currentUser.role === 'operador' ? (currentUser.responsavelAssociado || 'GERAL') : 'GERAL'
  );
  const [recRecorrencia, setRecRecorrencia] = useState<TipoRecorrenciaLembrete>('nenhuma');
  const [recPrioridade, setRecPrioridade] = useState<'baixa' | 'media' | 'alta' | 'urgente'>('media');
  const [recExibirStartup, setRecExibirStartup] = useState<boolean>(true);
  const [recSelectedClientId, setRecSelectedClientId] = useState<string>('geral');

  // Web Push permissions state
  const [webPushPermission, setWebPushPermission] = useState<BrowserNotificationPermission>(() => getBrowserNotificationPermission());
  const [isPushEnabled, setIsPushEnabled] = useState<boolean>(() => isWebNotificationEnabled());

  // Reminders & alerts local state to reflect mutations
  const [reminders, setReminders] = useState<LembreteAgendado[]>(() => getStoredScheduledReminders());
  const [internalAlerts, setInternalAlerts] = useState<AlertaInterno[]>(() => getStoredInternalAlerts());

  // Eligible clients > 45 days
  const eligibleClients = useMemo(() => {
    return getClientesMaisDe45Dias(records);
  }, [records]);

  // Target records based on selection
  const targetRecords = useMemo(() => {
    if (selectedClientId === 'todos') {
      return eligibleClients.map(e => e.record);
    }
    const single = records.find(r => r.id === selectedClientId);
    return single ? [single] : [];
  }, [eligibleClients, records, selectedClientId]);

  // Default preview values based on first target or generic
  const previewSample = targetRecords[0] || eligibleClients[0]?.record;
  const sampleDays = previewSample ? calculateDaysOverdue(previewSample.primeiroMesAtraso, previewSample.diaVencimento) : 46;
  const sampleDefaults = previewSample 
    ? generateDefaultReminderEmail(previewSample.cliente, previewSample.matricula, sampleDays, previewSample.responsavel)
    : { assunto: '[AVISO] Regularização de Débito em Atraso', mensagem: 'Notificação automática do sistema financeiro.' };

  const currentSubject = customSubject.trim() || sampleDefaults.assunto;
  const currentBody = customMessage.trim() || sampleDefaults.mensagem;

  if (!isOpen) return null;

  const handleScheduleOrDispatchNow = (isInstantDispatch: boolean) => {
    if (targetRecords.length === 0) {
      onShowToast('Nenhum cliente com mais de 45 dias selecionado.');
      return;
    }

    setIsProcessing(true);

    setTimeout(() => {
      try {
        if (isInstantDispatch) {
          // Dispatch immediately
          let dispatchedCount = 0;
          for (const rec of targetRecords) {
            const dias = calculateDaysOverdue(rec.primeiroMesAtraso, rec.diaVencimento);
            const reminder = scheduleReminder({
              record: rec,
              tipoAlerta: selectedCanal,
              assunto: currentSubject,
              mensagem: currentBody,
              dataAgendada: new Date().toISOString().split('T')[0],
              horario: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
              criadoPor: currentUser.nome,
            });
            executeDispatchReminder(reminder, rec, onRecordUpdated);
            dispatchedCount++;
          }
          onShowToast(`Sucesso: ${dispatchedCount} lembrete(s) disparado(s) por ${selectedCanal.toUpperCase()}!`);
        } else {
          // Schedule for chosen date
          const created = scheduleBulkRemindersFor45Days({
            records: targetRecords,
            tipoAlerta: selectedCanal,
            dataAgendada: scheduledDate,
            horario: scheduledTime,
            criadoPor: currentUser.nome,
            assuntoCustomizado: customSubject.trim() || undefined,
            mensagemCustomizada: customMessage.trim() || undefined,
          });
          onShowToast(`Sucesso: ${created.length} lembrete(s) agendado(s) para ${scheduledDate} às ${scheduledTime}!`);
        }

        // Refresh lists
        setReminders(getStoredScheduledReminders());
        setInternalAlerts(getStoredInternalAlerts());
        setActiveTab(isInstantDispatch ? 'alertas' : 'agendados');
      } catch (err) {
        console.error(err);
        onShowToast('Erro ao processar agendamento de lembretes.');
      } finally {
        setIsProcessing(false);
      }
    }, 400);
  };

  const handleExecuteSingleReminderNow = (reminder: LembreteAgendado) => {
    const record = records.find(r => r.id === reminder.clienteId);
    executeDispatchReminder(reminder, record, onRecordUpdated);
    setReminders(getStoredScheduledReminders());
    setInternalAlerts(getStoredInternalAlerts());
    onShowToast(`Lembrete para "${reminder.clienteNome}" disparado com sucesso!`);
  };

  const handleCreateCustomReminder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recTitulo.trim() || !recMensagem.trim()) {
      onShowToast('Preencha o título/assunto e a mensagem do lembrete.');
      return;
    }

    const clientRecord = recSelectedClientId !== 'geral'
      ? records.find(r => r.id === recSelectedClientId)
      : undefined;

    const created = scheduleCustomRecurringReminder({
      titulo: recTitulo.trim(),
      mensagem: recMensagem.trim(),
      dataAgendada: recData,
      horario: recHorario,
      responsavel: recResponsavel,
      recorrencia: recRecorrencia,
      prioridade: recPrioridade,
      exibirNoStartup: recExibirStartup,
      clienteRecord: clientRecord,
      criadoPor: currentUser.nome,
    });

    setReminders(getStoredScheduledReminders());
    setRecTitulo('');
    setRecMensagem('');
    setRecSelectedClientId('geral');
    onShowToast(`Lembrete "${created.assunto}" agendado com sucesso!`);
    playNotificationChime('success');
    setActiveTab('agendados');
  };

  const handleCompleteReminder = (id: string) => {
    const { completed, nextScheduledDate } = completeReminder(id);
    setReminders(getStoredScheduledReminders());
    if (completed) {
      if (nextScheduledDate) {
        onShowToast(`Lembrete concluído! Próxima ocorrência: ${new Date(nextScheduledDate + 'T12:00:00').toLocaleDateString('pt-BR')}`);
      } else {
        onShowToast('Lembrete concluído com sucesso!');
      }
      playNotificationChime('success');
    }
  };

  const handlePostponeReminder = (id: string) => {
    const newDate = postponeReminder(id, 1);
    setReminders(getStoredScheduledReminders());
    onShowToast(`Lembrete adiado para amanhã (${new Date(newDate + 'T12:00:00').toLocaleDateString('pt-BR')})!`);
  };

  const handleDeleteReminder = (id: string) => {
    deleteScheduledReminder(id);
    setReminders(getStoredScheduledReminders());
    onShowToast('Lembrete removido com sucesso.');
  };

  const handleCancelReminder = (id: string) => {
    cancelScheduledReminder(id);
    setReminders(getStoredScheduledReminders());
    onShowToast('Lembrete agendado cancelado.');
  };

  const handleRequestPushPermission = async () => {
    const res = await requestBrowserNotificationPermission();
    setWebPushPermission(res);
    setIsPushEnabled(isWebNotificationEnabled());
    if (res === 'granted') {
      onShowToast('Notificações no navegador ativadas com sucesso!');
    } else {
      onShowToast('Permissão de notificações não concedida no navegador.');
    }
  };

  const handleTogglePushSetting = () => {
    const nextVal = !isPushEnabled;
    setIsPushEnabled(nextVal);
    setWebNotificationEnabled(nextVal);
    onShowToast(nextVal ? 'Notificações no navegador ativadas.' : 'Notificações no navegador silenciadas.');
  };

  const handleTestWebPushNotification = () => {
    playNotificationChime('alert');
    const sent = sendBrowserNotification('🔔 Central Valora Cobrança', {
      body: `Teste de notificação Web Push emitido com sucesso para ${currentUser.nome}!`,
      tag: 'valora-test-notif',
    });
    if (sent) {
      onShowToast('Notificação do navegador enviada com som!');
    } else {
      if (webPushPermission !== 'granted') {
        onShowToast('Permissão de notificação ainda não concedida. Clique em "Ativar Notificações".');
      } else {
        onShowToast('Notificações estão desativadas nas opções locais.');
      }
    }
  };

  const handleMarkAlertRead = (id: string) => {
    markAlertAsRead(id);
    setInternalAlerts(getStoredInternalAlerts());
  };

  const handleMarkAllAlertsRead = () => {
    markAllAlertsAsRead();
    setInternalAlerts(getStoredInternalAlerts());
    onShowToast('Todos os alertas internos foram marcados como lidos.');
  };

  const handleDeleteAlert = (id: string) => {
    deleteAlert(id);
    setInternalAlerts(getStoredInternalAlerts());
  };

  const unreadAlertsCount = internalAlerts.filter(a => !a.lido).length;
  const pendingRemindersCount = reminders.filter(r => r.status === 'pendente').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto no-print">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in-95 my-8">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-xs">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  Agendamento de Lembretes &amp; Alertas (&gt;45 dias)
                </h2>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-900 border border-amber-300">
                  Regra 45+ dias
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Disparo automatizado de e-mails de cobrança e alertas internos para inadimplência avançada
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-slate-200 bg-white px-6">
          <div className="flex space-x-6 text-xs font-semibold overflow-x-auto">
            
            <button
              onClick={() => setActiveTab('recorrentes')}
              className={`py-3 border-b-2 flex items-center gap-2 transition-colors cursor-pointer shrink-0 ${
                activeTab === 'recorrentes'
                  ? 'border-amber-600 text-amber-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <RotateCw className="w-4 h-4" />
              <span>Lembrete Fixo / Recorrente</span>
            </button>

            <button
              onClick={() => setActiveTab('agendar')}
              className={`py-3 border-b-2 flex items-center gap-2 transition-colors cursor-pointer shrink-0 ${
                activeTab === 'agendar'
                  ? 'border-amber-600 text-amber-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Disparo em Lote &gt;45d ({eligibleClients.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('agendados')}
              className={`py-3 border-b-2 flex items-center gap-2 transition-colors cursor-pointer shrink-0 ${
                activeTab === 'agendados'
                  ? 'border-amber-600 text-amber-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Fila de Lembretes</span>
              {pendingRemindersCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 text-amber-800 font-bold">
                  {pendingRemindersCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('alertas')}
              className={`py-3 border-b-2 flex items-center gap-2 transition-colors cursor-pointer shrink-0 ${
                activeTab === 'alertas'
                  ? 'border-amber-600 text-amber-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Bell className="w-4 h-4" />
              <span>Alertas &amp; Web Push</span>
              {unreadAlertsCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500 text-white font-bold animate-pulse">
                  {unreadAlertsCount} novos
                </span>
              )}
            </button>

          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 max-h-[75vh] overflow-y-auto space-y-6">
          
          {/* TAB 0: RECURRENT & FIXED REMINDERS FORM */}
          {activeTab === 'recorrentes' && (
            <div className="space-y-6">
              
              {/* Introduction Banner */}
              <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-indigo-100 rounded-lg text-indigo-700 shrink-0">
                    <RotateCw className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-indigo-950">
                      Lembretes Fixos para Data Específica &amp; Recorrência Automática
                    </h3>
                    <p className="text-xs text-indigo-800 mt-0.5">
                      Defina lembretes com data fixa ou repetição periódica. Quando o sistema for aberto na data agendada, um <strong>pop-up de aviso na abertura</strong> alertará o operador com notificação no navegador (Web Push).
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab('agendados')}
                  className="px-3 py-1.5 bg-white border border-indigo-200 text-indigo-900 rounded-lg text-xs font-bold shadow-2xs hover:bg-indigo-100 transition-colors shrink-0 cursor-pointer"
                >
                  Ver Fila ({pendingRemindersCount})
                </button>
              </div>

              {/* Form Card */}
              <form onSubmit={handleCreateCustomReminder} className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  
                  {/* Title */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Assunto / Título do Lembrete: <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={recTitulo}
                      onChange={(e) => setRecTitulo(e.target.value)}
                      placeholder="Ex: Ligar para confirmar pagamento de acordo, cobrar retorno do financeiro, etc."
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                    />
                  </div>

                  {/* Scheduled Date */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Data Específica / Início: <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={recData}
                      onChange={(e) => setRecData(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                    />
                  </div>

                  {/* Scheduled Time */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Horário Sugerido:
                    </label>
                    <input
                      type="time"
                      value={recHorario}
                      onChange={(e) => setRecHorario(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                    />
                  </div>

                  {/* Recurrence Type */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Frequência / Recorrência:
                    </label>
                    <select
                      value={recRecorrencia}
                      onChange={(e) => setRecRecorrencia(e.target.value as TipoRecorrenciaLembrete)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-hidden cursor-pointer"
                    >
                      <option value="nenhuma">Data Fixa (Única Vez na data indicada)</option>
                      <option value="diaria">Recorrente Diário (+1 dia a cada conclusão)</option>
                      <option value="semanal">Recorrente Semanal (+7 dias a cada conclusão)</option>
                      <option value="mensal">Recorrente Mensal (+1 mês a cada conclusão)</option>
                    </select>
                  </div>

                  {/* Priority */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Grau de Prioridade:
                    </label>
                    <select
                      value={recPrioridade}
                      onChange={(e) => setRecPrioridade(e.target.value as 'baixa' | 'media' | 'alta' | 'urgente')}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-hidden cursor-pointer"
                    >
                      <option value="baixa">Baixa Prioridade (Informativo)</option>
                      <option value="media">Média Prioridade (Rotina Regular)</option>
                      <option value="alta">Alta Prioridade (Atenção Requerida)</option>
                      <option value="urgente">Urgente (Crítico / Alerta Imediato)</option>
                    </select>
                  </div>

                  {/* Responsible Operator */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Cobradora Responsável:
                    </label>
                    <select
                      value={recResponsavel}
                      onChange={(e) => setRecResponsavel(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-hidden cursor-pointer font-medium"
                    >
                      <option value="GERAL">GERAL (Todas as Cobradoras)</option>
                      <option value="ROSANA">ROSANA</option>
                      <option value="ANA LUIZA">ANA LUIZA</option>
                      <option value="KEYLLA">KEYLLA</option>
                      <option value="FABIOLA">FABIOLA</option>
                      {currentUser.role === 'adm_master' && <option value="ADM MASTER">ADM MASTER</option>}
                    </select>
                  </div>

                  {/* Associate Client (Optional) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Vincular a um Cliente (Opcional):
                    </label>
                    <select
                      value={recSelectedClientId}
                      onChange={(e) => setRecSelectedClientId(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-hidden cursor-pointer"
                    >
                      <option value="geral">Sem cliente vinculado (Rotina Operacional Geral)</option>
                      {records.slice(0, 50).map(r => (
                        <option key={r.id} value={r.id}>
                          {r.cliente} (#{r.matricula} - {r.responsavel})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Message / Description */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Descrição Detalhada / Ação Requerida: <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={recMensagem}
                      onChange={(e) => setRecMensagem(e.target.value)}
                      placeholder="Descreva o que deve ser feito ao chegar esta data (ex: entrar em contato com o devedor, verificar comprovante anexado, acionar assessoria jurídica, etc.)."
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                    />
                  </div>

                  {/* Startup Alert Option */}
                  <div className="sm:col-span-2 p-3 bg-amber-50/70 border border-amber-200 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="recExibirStartup"
                        checked={recExibirStartup}
                        onChange={(e) => setRecExibirStartup(e.target.checked)}
                        className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500 cursor-pointer"
                      />
                      <label htmlFor="recExibirStartup" className="text-xs text-amber-950 font-semibold cursor-pointer">
                        Exibir pop-up de aviso quando o sistema for aberto nesta data
                      </label>
                    </div>
                    <span className="text-[11px] text-amber-800 font-medium hidden sm:inline">
                      Alertará o operador no login
                    </span>
                  </div>

                </div>

                {/* Form Submit */}
                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Agendar Lembrete</span>
                  </button>
                </div>
              </form>

            </div>
          )}
          
          {/* TAB 1: NEW SCHEDULING FORM */}
          {activeTab === 'agendar' && (
            <div className="space-y-6">
              
              {/* Summary of 45+ Days Rule */}
              <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-amber-100 rounded-lg text-amber-800 shrink-0">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-amber-950">
                      Critério de Inadimplência Avançada (&gt; 45 dias)
                    </h3>
                    <p className="text-xs text-amber-800 mt-0.5">
                      Encontramos <strong>{eligibleClients.length} clientes</strong> com atraso superior a 45 dias na sua visualização ({currentUser.role === 'adm_master' ? 'carteira global' : `carteira de ${currentUser.nome}`}).
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs bg-white px-3 py-1.5 rounded-lg border border-amber-200 font-bold text-amber-900 shadow-2xs">
                    {eligibleClients.length} clientes identificados
                  </span>
                </div>
              </div>

              {/* Form Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                
                {/* Left Column: Scope and Channels */}
                <div className="space-y-4">
                  
                  {/* Select Target Clients */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1.5">
                      Público-Alvo dos Lembretes:
                    </label>
                    <select
                      value={selectedClientId}
                      onChange={(e) => setSelectedClientId(e.target.value)}
                      className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                    >
                      <option value="todos">
                        Todos os clientes com mais de 45 dias ({eligibleClients.length} clientes)
                      </option>
                      <optgroup label="Cliente Específico com >45 dias:">
                        {eligibleClients.map(({ record, diasAtraso }) => (
                          <option key={record.id} value={record.id}>
                            #{record.matricula} - {record.cliente} ({diasAtraso} dias - {record.responsavel})
                          </option>
                        ))}
                      </optgroup>
                    </select>
                  </div>

                  {/* Channel Choice */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1.5">
                      Canal de Notificação:
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedCanal('email')}
                        className={`px-3 py-2.5 rounded-lg text-xs font-semibold border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                          selectedCanal === 'email'
                            ? 'bg-blue-50 border-blue-400 text-blue-800 shadow-2xs'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <Mail className="w-4 h-4 text-blue-600" />
                        <span>E-mail</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedCanal('alerta_interno')}
                        className={`px-3 py-2.5 rounded-lg text-xs font-semibold border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                          selectedCanal === 'alerta_interno'
                            ? 'bg-amber-50 border-amber-400 text-amber-800 shadow-2xs'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <Bell className="w-4 h-4 text-amber-600" />
                        <span>Alerta Interno</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedCanal('ambos')}
                        className={`px-3 py-2.5 rounded-lg text-xs font-semibold border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                          selectedCanal === 'ambos'
                            ? 'bg-emerald-50 border-emerald-400 text-emerald-800 shadow-2xs'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-1">
                          <Mail className="w-3.5 h-3.5 text-blue-600" />
                          <Bell className="w-3.5 h-3.5 text-amber-600" />
                        </div>
                        <span>Ambos</span>
                      </button>
                    </div>
                  </div>

                  {/* Date and Time Scheduling */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1.5">
                        Data do Agendamento:
                      </label>
                      <input
                        type="date"
                        value={scheduledDate}
                        onChange={(e) => setScheduledDate(e.target.value)}
                        className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1.5">
                        Horário de Disparo:
                      </label>
                      <input
                        type="time"
                        value={scheduledTime}
                        onChange={(e) => setScheduledTime(e.target.value)}
                        className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                      />
                    </div>
                  </div>

                  {/* Operator context note */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600">
                    <p className="flex items-center gap-1.5 font-medium text-slate-800">
                      <Users className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Criado por: <strong>{currentUser.nome}</strong> ({currentUser.cargo || currentUser.role})</span>
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Lembretes enviados registram histórico automático na ficha do cliente e alimentam a central de notificações.
                    </p>
                  </div>

                </div>

                {/* Right Column: Custom Message / Preview */}
                <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Modelo do Lembrete por E-mail & Alerta</span>
                      </span>
                      <span className="text-[10px] text-slate-400">Prévia Dinâmica</span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div>
                        <label className="block text-[11px] text-slate-500 font-medium mb-1">
                          Assunto do E-mail / Título do Alerta:
                        </label>
                        <input
                          type="text"
                          value={customSubject}
                          onChange={(e) => setCustomSubject(e.target.value)}
                          placeholder={sampleDefaults.assunto}
                          className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] text-slate-500 font-medium mb-1">
                          Corpo da Mensagem (tags automáticas como matrícula e dias são aplicadas):
                        </label>
                        <textarea
                          rows={6}
                          value={customMessage}
                          onChange={(e) => setCustomMessage(e.target.value)}
                          placeholder={sampleDefaults.mensagem}
                          className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-hidden font-mono text-[11px]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Actions buttons */}
                  <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-center gap-2">
                    <button
                      type="button"
                      disabled={isProcessing || targetRecords.length === 0}
                      onClick={() => handleScheduleOrDispatchNow(false)}
                      className="w-full sm:flex-1 py-2.5 px-4 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Clock className="w-4 h-4" />
                      <span>Agendar para {scheduledDate}</span>
                    </button>

                    <button
                      type="button"
                      disabled={isProcessing || targetRecords.length === 0}
                      onClick={() => handleScheduleOrDispatchNow(true)}
                      className="w-full sm:flex-1 py-2.5 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                      title="Disparar notificações e alertas agora mesmo"
                    >
                      <Send className="w-4 h-4 text-emerald-400" />
                      <span>Disparar Agora Imediato</span>
                    </button>
                  </div>

                </div>

              </div>

              {/* Table of Eligible Clients Preview */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">
                    Clientes Elegíveis com Mais de 45 Dias ({eligibleClients.length})
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Ordenado por maior atraso
                  </span>
                </div>

                <div className="max-h-56 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 text-[11px] uppercase font-semibold">
                      <tr>
                        <th className="p-2.5">Matrícula</th>
                        <th className="p-2.5">Cliente</th>
                        <th className="p-2.5">Cobradora</th>
                        <th className="p-2.5">Atraso</th>
                        <th className="p-2.5">Primeiro Mês</th>
                        <th className="p-2.5">Status Cobrança</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {eligibleClients.map(({ record, diasAtraso }, idx) => (
                        <tr key={`${record.id}-${idx}`} className="hover:bg-slate-50">
                          <td className="p-2.5 font-mono font-medium text-slate-800">
                            #{record.matricula}
                          </td>
                          <td className="p-2.5 font-medium text-slate-900">
                            {record.cliente}
                          </td>
                          <td className="p-2.5 text-slate-600">
                            {record.responsavel}
                          </td>
                          <td className="p-2.5">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                              {diasAtraso} dias
                            </span>
                          </td>
                          <td className="p-2.5 text-slate-600">
                            {record.primeiroMesAtraso}
                          </td>
                          <td className="p-2.5 text-slate-600 uppercase text-[11px]">
                            {record.status.replace('_', ' ')}
                          </td>
                        </tr>
                      ))}
                      {eligibleClients.length === 0 && (
                        <tr>
                          <td colSpan={6} className="p-6 text-center text-slate-500">
                            Nenhum cliente com mais de 45 dias de atraso encontrado nesta carteira.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: SCHEDULED REMINDERS QUEUE */}
          {activeTab === 'agendados' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Fila de Lembretes Agendados ({reminders.length})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Lembretes programados para disparo por e-mail ou alerta interno
                  </p>
                </div>

                <button
                  onClick={() => setActiveTab('agendar')}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  + Novo Agendamento
                </button>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="max-h-96 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 text-[11px] uppercase font-semibold">
                      <tr>
                        <th className="p-3">Cliente / Matrícula</th>
                        <th className="p-3">Cobradora</th>
                        <th className="p-3">Atraso</th>
                        <th className="p-3">Canal</th>
                        <th className="p-3">Data Agendada</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {reminders.map((rem) => {
                        const isRecurring = rem.recorrencia && rem.recorrencia !== 'nenhuma';
                        const isUrgent = rem.prioridade === 'urgente';
                        const isHigh = rem.prioridade === 'alta';

                        return (
                        <tr key={rem.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              {rem.prioridade && (
                                <span className={`w-2 h-2 rounded-full shrink-0 ${
                                  isUrgent ? 'bg-rose-500' : isHigh ? 'bg-amber-500' : 'bg-blue-500'
                                }`} title={`Prioridade: ${rem.prioridade}`} />
                              )}
                              <div>
                                <p className="font-semibold text-slate-900 flex items-center gap-1.5">
                                  <span>{rem.assunto || rem.clienteNome}</span>
                                  {isRecurring && (
                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                                      <RotateCw className="w-2.5 h-2.5" />
                                      <span>{rem.recorrencia}</span>
                                    </span>
                                  )}
                                </p>
                                <p className="text-[11px] text-slate-500 line-clamp-1">
                                  {rem.clienteNome !== rem.assunto ? `Cliente: ${rem.clienteNome} • ` : ''}{rem.mensagem}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="p-3 text-slate-600 font-medium">{rem.responsavel}</td>
                          <td className="p-3">
                            {rem.diasAtraso > 0 ? (
                              <span className="font-semibold text-rose-700">{rem.diasAtraso} dias</span>
                            ) : (
                              <span className="text-slate-400 text-[11px]">Rotina</span>
                            )}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-1">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                                {rem.tipoAlerta === 'email' ? 'E-mail' : rem.tipoAlerta === 'alerta_interno' ? 'Alerta Interno' : rem.tipoAlerta === 'web_push' ? 'Web Push' : 'E-mail + Alerta'}
                              </span>
                              {rem.exibirNoStartup !== false && (
                                <span className="p-0.5 bg-amber-100 text-amber-800 rounded text-[9px] font-bold" title="Exibe pop-up ao abrir o sistema">
                                  Pop-up
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-3 text-slate-700">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              <span className="font-mono">{rem.dataAgendada} às {rem.horario || '09:00'}</span>
                            </div>
                          </td>
                          <td className="p-3">
                            {rem.status === 'pendente' && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                Pendente
                              </span>
                            )}
                            {rem.status === 'disparado' && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                Concluído
                              </span>
                            )}
                            {rem.status === 'cancelado' && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-300">
                                Cancelado
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {rem.status === 'pendente' && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleCompleteReminder(rem.id)}
                                    className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white transition-colors border border-emerald-200 cursor-pointer"
                                    title={isRecurring ? "Concluir ocorrência e avançar para o próximo ciclo" : "Marcar como concluído"}
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handlePostponeReminder(rem.id)}
                                    className="p-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors border border-slate-200 cursor-pointer"
                                    title="Adiar lembrete para amanhã (+1 dia)"
                                  >
                                    <Clock className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleExecuteSingleReminderNow(rem)}
                                    className="p-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white transition-colors border border-indigo-200 cursor-pointer"
                                    title="Disparar este lembrete agora"
                                  >
                                    <Play className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                              <button
                                type="button"
                                onClick={() => handleDeleteReminder(rem.id)}
                                className="p-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-600 hover:text-white transition-colors border border-rose-200 cursor-pointer"
                                title="Excluir lembrete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                        );
                      })}
                      {reminders.length === 0 && (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-slate-500">
                            <p className="font-semibold text-slate-700">Nenhum lembrete na fila</p>
                            <p className="text-xs text-slate-500 mt-1">
                              Clique na aba "Novo Agendamento" para programar avisos para clientes com &gt; 45 dias.
                            </p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: INTERNAL ALERTS & WEB PUSH CENTER */}
          {activeTab === 'alertas' && (
            <div className="space-y-5">
              
              {/* Web Push Configuration Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 bg-blue-100 text-blue-700 rounded-xl shrink-0">
                      <Bell className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-slate-900">
                          Notificações do Navegador (Web Push &amp; Áudio)
                        </h4>
                        {webPushPermission === 'granted' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                            Ativo
                          </span>
                        ) : webPushPermission === 'denied' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                            Bloqueado no Navegador
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            Não Configurado
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Emite pop-ups nativos do sistema operacional e bipes de áudio quando novos lembretes e alertas vencem.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {webPushPermission !== 'granted' && (
                      <button
                        type="button"
                        onClick={handleRequestPushPermission}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-2xs transition-colors cursor-pointer"
                      >
                        Ativar Notificações
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleTestWebPushNotification}
                      className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold shadow-2xs transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Volume2 className="w-3.5 h-3.5 text-slate-500" />
                      <span>Testar Som &amp; Push</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleTogglePushSetting}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                        isPushEnabled
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                          : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                      }`}
                    >
                      {isPushEnabled ? 'Silenciar' : 'Habilitar'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Alertas Internos do Sistema ({internalAlerts.length})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Notificações automáticas de contas com atraso crítico (&gt; 45 dias)
                  </p>
                </div>

                {unreadAlertsCount > 0 && (
                  <button
                    onClick={handleMarkAllAlertsRead}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Marcar todos como lidos
                  </button>
                )}
              </div>

              <div className="space-y-2">
                {internalAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-3.5 rounded-xl border transition-all flex items-start justify-between gap-3 ${
                      alert.lido
                        ? 'bg-white border-slate-200 text-slate-700 opacity-80'
                        : 'bg-amber-50/70 border-amber-200 text-amber-950 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg shrink-0 ${
                        alert.prioridade === 'critica'
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        <AlertTriangle className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs">
                            {alert.clienteNome} (#{alert.matricula})
                          </span>
                          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                            alert.prioridade === 'critica'
                              ? 'bg-rose-600 text-white'
                              : 'bg-amber-200 text-amber-900'
                          }`}>
                            {alert.prioridade.toUpperCase()}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            Responsável: {alert.responsavel}
                          </span>
                        </div>
                        <p className="text-xs mt-1">
                          {alert.mensagem}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-1.5">
                          Gerado em: {new Date(alert.dataCriacao).toLocaleDateString('pt-BR')} às {new Date(alert.dataCriacao).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} • Canal: {alert.canalOrigem}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {!alert.lido && (
                        <button
                          onClick={() => handleMarkAlertRead(alert.id)}
                          className="px-2.5 py-1 rounded bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold transition-colors cursor-pointer"
                        >
                          Marcar lido
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteAlert(alert.id)}
                        className="p-1 rounded text-slate-400 hover:text-rose-600 transition-colors"
                        title="Remover alerta"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}

                {internalAlerts.length === 0 && (
                  <div className="p-8 text-center text-slate-500 border border-slate-200 rounded-xl bg-slate-50">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                    <p className="font-bold text-slate-700">Nenhum alerta interno pendente</p>
                    <p className="text-xs text-slate-500">
                      Todos os alertas de clientes com mais de 45 dias foram verificados ou nenhum novo caso foi registrado.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-slate-400" />
            <span>Sistema em conformidade com as diretrizes de cobrança & privacidade.</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 text-xs font-bold transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
