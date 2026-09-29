import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Clock, 
  Calendar, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  RotateCw, 
  X, 
  Volume2, 
  VolumeX, 
  Send, 
  ShieldCheck, 
  Sparkles,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { LembreteAgendado, AppUser, DebtRecord } from '../types';
import { 
  completeReminder, 
  postponeReminder, 
  getRemindersForStartup 
} from '../utils/reminderService';
import { 
  getBrowserNotificationPermission, 
  requestBrowserNotificationPermission, 
  isWebNotificationEnabled, 
  setWebNotificationEnabled, 
  playNotificationChime,
  BrowserNotificationPermission
} from '../utils/browserNotificationService';

interface StartupRemindersModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AppUser;
  records?: DebtRecord[];
  reminders?: LembreteAgendado[];
  onRemindersUpdated?: () => void;
  onOpenManageReminders?: () => void;
  onOpenAllReminders?: () => void;
  onOpenClientDossier?: (record: DebtRecord) => void;
  onShowToast: (msg: string) => void;
}

export const StartupRemindersModal: React.FC<StartupRemindersModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  records = [],
  reminders: initialReminders,
  onRemindersUpdated,
  onOpenManageReminders,
  onOpenAllReminders,
  onOpenClientDossier,
  onShowToast,
}) => {
  const [reminders, setReminders] = useState<LembreteAgendado[]>(() => initialReminders || []);
  const [permission, setPermission] = useState<BrowserNotificationPermission>('default');
  const [isAudioEnabled, setIsAudioEnabled] = useState<boolean>(true);

  // Refresh reminders list
  const refreshList = () => {
    const list = getRemindersForStartup(currentUser);
    setReminders(list);
    if (onRemindersUpdated) {
      onRemindersUpdated();
    }
  };

  useEffect(() => {
    if (isOpen) {
      refreshList();
      setPermission(getBrowserNotificationPermission());
      // Play a soft attention chime when the startup popup opens
      playNotificationChime('alert');
    }
  }, [isOpen, currentUser]);

  if (!isOpen || reminders.length === 0) return null;

  const handleRequestPush = async () => {
    const result = await requestBrowserNotificationPermission();
    setPermission(result);
    if (result === 'granted') {
      onShowToast('Notificações no navegador ativadas com sucesso!');
    } else if (result === 'denied') {
      onShowToast('Permissão de notificações bloqueada no seu navegador.');
    }
  };

  const handleComplete = (reminderId: string) => {
    const { completed, nextScheduledDate } = completeReminder(reminderId);
    if (completed) {
      if (nextScheduledDate) {
        onShowToast(`Lembrete concluído! Próxima ocorrência agendada para ${new Date(nextScheduledDate + 'T12:00:00').toLocaleDateString('pt-BR')}.`);
      } else {
        onShowToast('Lembrete concluído com sucesso!');
      }
      playNotificationChime('success');
      refreshList();
    }
  };

  const handlePostpone = (reminderId: string) => {
    const newDate = postponeReminder(reminderId, 1);
    onShowToast(`Lembrete adiado para amanhã (${new Date(newDate + 'T12:00:00').toLocaleDateString('pt-BR')}).`);
    refreshList();
  };

  const handleViewClient = (clienteId: string) => {
    const client = records.find(r => r.id === clienteId);
    if (client && onOpenClientDossier) {
      onClose();
      onOpenClientDossier(client);
    } else {
      onShowToast('Cadastro do cliente não encontrado.');
    }
  };

  const todayFormatted = new Date().toLocaleDateString('pt-BR', { 
    weekday: 'long', 
    day: '2-digit', 
    month: 'long', 
    year: 'numeric' 
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 overflow-y-auto no-print">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 my-8">
        
        {/* Top Attention Header */}
        <div className="bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800 text-white p-6 relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white hover:bg-white/10 p-2 rounded-full transition-colors cursor-pointer"
            title="Fechar aviso e acessar o sistema"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center shrink-0 backdrop-blur-xs shadow-inner">
              <Clock className="w-6 h-6 text-amber-200 animate-pulse" />
            </div>
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[11px] font-bold tracking-wide uppercase mb-1">
                <Sparkles className="w-3 h-3 text-amber-300" />
                <span>Aviso de Abertura do Sistema</span>
              </div>
              <h2 className="text-xl font-bold tracking-tight">
                Lembretes & Tarefas Agendadas para Hoje
              </h2>
              <p className="text-xs text-amber-100 capitalize mt-0.5">
                {todayFormatted} • Operador: <strong>{currentUser.nome}</strong> ({currentUser.role === 'adm_master' ? 'Visão Master' : currentUser.responsavelAssociado})
              </p>
            </div>
          </div>
        </div>

        {/* Web Push Banner (If not yet granted) */}
        {permission !== 'granted' && (
          <div className="bg-indigo-50 border-b border-indigo-200 px-6 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-indigo-950">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-indigo-100 text-indigo-700 shrink-0">
                <Bell className="w-4 h-4 animate-bounce" />
              </div>
              <div>
                <p className="font-bold text-indigo-900">Ativar Notificações no Navegador (Web Push)</p>
                <p className="text-indigo-700 text-[11px]">
                  Receba alertas com som no seu desktop sempre que um lembrete vencer.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleRequestPush}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-colors shrink-0 cursor-pointer"
            >
              Ativar Notificações
            </button>
          </div>
        )}

        {/* Reminders List Body */}
        <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold px-1">
            <span>
              Você possui <strong>{reminders.length} lembrete(s)</strong> programado(s) para hoje ou pendente(s):
            </span>
            <span className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
              Ação Requerida
            </span>
          </div>

          <div className="space-y-3">
            {reminders.map((reminder) => {
              const isUrgent = reminder.prioridade === 'urgente';
              const isHigh = reminder.prioridade === 'alta';
              const isRecurring = reminder.recorrencia && reminder.recorrencia !== 'nenhuma';

              return (
                <div 
                  key={reminder.id}
                  className={`p-4 rounded-xl border transition-all ${
                    isUrgent
                      ? 'bg-rose-50/70 border-rose-300 shadow-xs'
                      : isHigh
                      ? 'bg-amber-50/70 border-amber-300 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 flex-1">
                      
                      {/* Badges line */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {reminder.prioridade && (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                            isUrgent ? 'bg-rose-100 text-rose-800 border border-rose-300' :
                            isHigh ? 'bg-amber-100 text-amber-900 border border-amber-300' :
                            'bg-blue-100 text-blue-800 border border-blue-200'
                          }`}>
                            {reminder.prioridade}
                          </span>
                        )}

                        {isRecurring ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                            <RotateCw className="w-2.5 h-2.5" />
                            <span>Recorrente ({reminder.recorrencia})</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                            Data Fixa
                          </span>
                        )}

                        <span className="text-[11px] font-semibold text-slate-500 font-mono">
                          {reminder.horario || '09:00'}
                        </span>

                        <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          Cobradora: {reminder.responsavel}
                        </span>
                      </div>

                      {/* Title & Description */}
                      <h3 className="font-bold text-slate-900 text-sm pt-1">
                        {reminder.assunto}
                      </h3>

                      {reminder.clienteNome && reminder.clienteNome !== reminder.assunto && (
                        <p className="text-xs font-semibold text-indigo-700 flex items-center gap-1">
                          <span>Cliente: {reminder.clienteNome}</span>
                          {reminder.matricula && reminder.matricula !== 'S/N' && (
                            <span className="font-mono text-slate-500 font-normal">
                              (Matrícula #{reminder.matricula})
                            </span>
                          )}
                        </p>
                      )}

                      <p className="text-xs text-slate-700 leading-relaxed bg-white/70 p-2.5 rounded-lg border border-slate-200/80 mt-1">
                        {reminder.mensagem}
                      </p>

                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="mt-3 pt-3 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1 text-[11px] text-slate-500">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>Agendado para: <strong>{new Date(reminder.dataAgendada + 'T12:00:00').toLocaleDateString('pt-BR')}</strong></span>
                    </div>

                    <div className="flex items-center gap-2">
                      {reminder.clienteId && reminder.clienteId !== 'geral' && (
                        <button
                          type="button"
                          onClick={() => handleViewClient(reminder.clienteId)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-semibold border border-indigo-200 transition-colors cursor-pointer"
                          title="Abrir ficha e contatos do cliente"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Ver Ficha</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handlePostpone(reminder.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-semibold border border-slate-200 transition-colors cursor-pointer"
                        title="Adiar lembrete para amanhã"
                      >
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span>Adiar (+1d)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleComplete(reminder.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-2xs transition-colors cursor-pointer"
                        title={isRecurring ? "Concluir ocorrência e avançar para o próximo ciclo" : "Marcar lembrete como concluído"}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Concluir</span>
                      </button>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              onClose();
              if (onOpenManageReminders) onOpenManageReminders();
              else if (onOpenAllReminders) onOpenAllReminders();
            }}
            className="text-xs font-semibold text-amber-800 hover:text-amber-950 underline flex items-center gap-1 cursor-pointer"
          >
            <span>Gerenciar e Criar Novos Lembretes</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
          >
            Entendido, Acessar Sistema
          </button>
        </div>

      </div>
    </div>
  );
};
