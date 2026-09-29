import { DebtRecord, LembreteAgendado, AlertaInterno, TipoCanalAlerta, NotificacaoRegistro, TipoRecorrenciaLembrete, AppUser } from '../types';
import { calculateDaysOverdue } from './sheetParser';
import { 
  sendBrowserNotification, 
  hasReminderBeenNotifiedThisSession, 
  markReminderNotifiedThisSession 
} from './browserNotificationService';

const STORAGE_REMINDERS_KEY = 'valora_scheduled_reminders_v1';
const STORAGE_ALERTS_KEY = 'valora_internal_alerts_v1';

export function getClientesMaisDe45Dias(records: DebtRecord[]): Array<{
  record: DebtRecord;
  diasAtraso: number;
}> {
  return records
    .map(record => ({
      record,
      diasAtraso: calculateDaysOverdue(record.primeiroMesAtraso, record.diaVencimento),
    }))
    .filter(item => item.diasAtraso > 45)
    .sort((a, b) => b.diasAtraso - a.diasAtraso);
}

const MAX_INTERNAL_ALERTS = 60;
const MAX_SCHEDULED_REMINDERS = 80;

function cleanOldStorageKeys(): void {
  try {
    if (typeof localStorage === 'undefined') return;
    const obsolete = [
      'valora_cobranca_central_records_v1',
      'valora_cobranca_central_records_v2',
      'valora_cobranca_central_records_temp',
      'valora_cobranca_backup_records'
    ];
    obsolete.forEach(k => {
      try { localStorage.removeItem(k); } catch (_) {}
    });
  } catch (_) {}
}

function compactAlert(alert: AlertaInterno): AlertaInterno {
  return {
    ...alert,
    mensagem: typeof alert.mensagem === 'string' && alert.mensagem.length > 350
      ? alert.mensagem.slice(0, 350) + '...'
      : alert.mensagem
  };
}

export function getStoredScheduledReminders(): LembreteAgendado[] {
  try {
    if (typeof localStorage === 'undefined') return [];
    const saved = localStorage.getItem(STORAGE_REMINDERS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        if (parsed.length > MAX_SCHEDULED_REMINDERS) {
          const pruned = parsed.slice(0, MAX_SCHEDULED_REMINDERS);
          saveScheduledReminders(pruned);
          return pruned;
        }
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Aviso ao ler lembretes agendados:', e);
  }
  return [];
}

export function saveScheduledReminders(reminders: LembreteAgendado[]): void {
  try {
    if (typeof localStorage === 'undefined') return;
    // Deduplicate by ID
    const seen = new Set<string>();
    const unique: LembreteAgendado[] = [];
    for (const r of reminders) {
      if (!seen.has(r.id)) {
        seen.add(r.id);
        unique.push(r);
      }
    }
    const capped = unique.slice(0, MAX_SCHEDULED_REMINDERS);
    try {
      localStorage.setItem(STORAGE_REMINDERS_KEY, JSON.stringify(capped));
    } catch (quotaErr) {
      cleanOldStorageKeys();
      // Keep only pending reminders
      const onlyPending = capped.filter(r => r.status === 'pendente').slice(0, 30);
      try {
        localStorage.setItem(STORAGE_REMINDERS_KEY, JSON.stringify(onlyPending));
      } catch (_) {
        // Safe fallback - keep last 10
        try {
          localStorage.setItem(STORAGE_REMINDERS_KEY, JSON.stringify(onlyPending.slice(0, 10)));
        } catch (_) {}
      }
    }
  } catch (e) {
    console.warn('Aviso ao salvar lembretes agendados:', e);
  }
}

export function getStoredInternalAlerts(): AlertaInterno[] {
  try {
    if (typeof localStorage === 'undefined') return [];
    const saved = localStorage.getItem(STORAGE_ALERTS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        // If storage was bloated in a prior version, self-heal immediately
        if (parsed.length > MAX_INTERNAL_ALERTS) {
          const healed = parsed
            .map(compactAlert)
            .sort((a, b) => (a.lido === b.lido ? 0 : a.lido ? 1 : -1))
            .slice(0, MAX_INTERNAL_ALERTS);
          saveInternalAlerts(healed);
          return healed;
        }
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Aviso ao ler alertas internos:', e);
  }
  return [];
}

export function saveInternalAlerts(alerts: AlertaInterno[]): void {
  try {
    if (typeof localStorage === 'undefined') return;
    
    // Deduplicate by ID
    const seen = new Set<string>();
    const unique: AlertaInterno[] = [];
    for (const a of alerts) {
      if (a && a.id && !seen.has(a.id)) {
        seen.add(a.id);
        unique.push(compactAlert(a));
      }
    }

    // Prioritize unread alerts, then newest alerts, bounded to MAX_INTERNAL_ALERTS
    const unread = unique.filter(a => !a.lido);
    const read = unique.filter(a => a.lido);
    const capped = [...unread, ...read].slice(0, MAX_INTERNAL_ALERTS);

    try {
      localStorage.setItem(STORAGE_ALERTS_KEY, JSON.stringify(capped));
    } catch (quotaErr) {
      cleanOldStorageKeys();
      // Attempt 1: Keep unread only + compact messages
      const emergencyAlerts = unread.slice(0, 25).map(a => ({
        ...a,
        mensagem: typeof a.mensagem === 'string' ? a.mensagem.slice(0, 140) : ''
      }));

      try {
        localStorage.setItem(STORAGE_ALERTS_KEY, JSON.stringify(emergencyAlerts));
      } catch (err2) {
        // Attempt 2: Minimal fallback - keep top 10 unread
        try {
          const minimal = emergencyAlerts.slice(0, 10);
          localStorage.setItem(STORAGE_ALERTS_KEY, JSON.stringify(minimal));
        } catch (_) {
          // If completely full, clear the alert key to prevent app-wide breakage
          try {
            localStorage.removeItem(STORAGE_ALERTS_KEY);
          } catch (_) {}
        }
      }
    }
  } catch (e) {
    console.warn('Aviso ao salvar alertas internos:', e);
  }
}

export function generateDefaultReminderEmail(
  clienteNome: string,
  matricula: string,
  diasAtraso: number,
  responsavel: string
): { assunto: string; mensagem: string } {
  const assunto = `[AVISO URGENTE] Regularização de Débito em Atraso (${diasAtraso} dias) - Matrícula #${matricula}`;
  const mensagem = `Prezado(a) ${clienteNome},

Identificamos em nosso sistema financeiro que sua conta vinculada à matrícula #${matricula} apresenta pendência financeira com ${diasAtraso} dias de atraso.

Solicitamos que entre em contato imediatamente com nossa equipe de cobrança para regularização do débito ou formalização de acordo facilitado sem encargos adicionais.

• Matrícula: #${matricula}
• Responsável pela Cobrança: ${responsavel}
• Tempo de Inadimplência: ${diasAtraso} dias

Caso o pagamento já tenha sido realizado, por favor desconsidere este aviso e envie o comprovante para conferência.

Atenciosamente,
Central de Cobrança & Gestão de Crédito
Valora Gestão e Finanças`;

  return { assunto, mensagem };
}

export function scheduleReminder(data: {
  record: DebtRecord;
  tipoAlerta: TipoCanalAlerta;
  destinatarioEmail?: string;
  assunto?: string;
  mensagem?: string;
  dataAgendada: string;
  horario?: string;
  criadoPor: string;
}): LembreteAgendado {
  const diasAtraso = calculateDaysOverdue(data.record.primeiroMesAtraso, data.record.diaVencimento);
  const defaults = generateDefaultReminderEmail(
    data.record.cliente,
    data.record.matricula,
    diasAtraso,
    data.record.responsavel
  );

  const novoLembrete: LembreteAgendado = {
    id: `lembrete-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    clienteId: data.record.id,
    matricula: data.record.matricula,
    clienteNome: data.record.cliente,
    responsavel: data.record.responsavel,
    diasAtraso,
    tipoAlerta: data.tipoAlerta,
    destinatarioEmail: data.destinatarioEmail || (data.record.telefone ? `${data.record.matricula}@notificacao.com.br` : 'cliente@email.com'),
    assunto: data.assunto || defaults.assunto,
    mensagem: data.mensagem || defaults.mensagem,
    dataAgendada: data.dataAgendada,
    horario: data.horario || '09:00',
    status: 'pendente',
    criadoEm: new Date().toISOString(),
    criadoPor: data.criadoPor,
  };

  const listaAtual = getStoredScheduledReminders();
  const atualizada = [novoLembrete, ...listaAtual];
  saveScheduledReminders(atualizada);

  return novoLembrete;
}

export function scheduleBulkRemindersFor45Days(params: {
  records: DebtRecord[];
  tipoAlerta: TipoCanalAlerta;
  dataAgendada: string;
  horario?: string;
  criadoPor: string;
  assuntoCustomizado?: string;
  mensagemCustomizada?: string;
}): LembreteAgendado[] {
  const eligible = getClientesMaisDe45Dias(params.records);
  const existingReminders = getStoredScheduledReminders();
  const created: LembreteAgendado[] = [];

  for (const { record, diasAtraso } of eligible) {
    const defaults = generateDefaultReminderEmail(
      record.cliente,
      record.matricula,
      diasAtraso,
      record.responsavel
    );

    const novoLembrete: LembreteAgendado = {
      id: `lembrete-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      clienteId: record.id,
      matricula: record.matricula,
      clienteNome: record.cliente,
      responsavel: record.responsavel,
      diasAtraso,
      tipoAlerta: params.tipoAlerta,
      destinatarioEmail: `${record.matricula.toLowerCase()}@notificacao.com.br`,
      assunto: params.assuntoCustomizado || defaults.assunto,
      mensagem: params.mensagemCustomizada || defaults.mensagem,
      dataAgendada: params.dataAgendada,
      horario: params.horario || '09:00',
      status: 'pendente',
      criadoEm: new Date().toISOString(),
      criadoPor: params.criadoPor,
    };
    created.push(novoLembrete);
  }

  saveScheduledReminders([...created, ...existingReminders]);
  return created;
}

export function executeDispatchReminder(
  reminder: LembreteAgendado,
  record?: DebtRecord,
  onRecordUpdated?: (updatedRecord: DebtRecord) => void
): { success: boolean; internalAlertCreated: boolean } {
  let internalAlertCreated = false;

  // 1. If canal includes internal alert or ambos, generate internal alert
  if (reminder.tipoAlerta === 'alerta_interno' || reminder.tipoAlerta === 'ambos') {
    const prioridade = reminder.diasAtraso > 90 ? 'critica' : 'alta';
    const alerts = getStoredInternalAlerts();
    const newAlert: AlertaInterno = {
      id: `alerta-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      clienteId: reminder.clienteId,
      matricula: reminder.matricula,
      clienteNome: reminder.clienteNome,
      responsavel: reminder.responsavel,
      diasAtraso: reminder.diasAtraso,
      mensagem: `[ALERTA DE INADIMPLÊNCIA ${reminder.diasAtraso} DIAS] ${reminder.clienteNome} (#${reminder.matricula}) sob cobradora ${reminder.responsavel}. Ação de cobrança requerida imediatamente.`,
      prioridade,
      dataCriacao: new Date().toISOString(),
      lido: false,
      canalOrigem: 'agendamento',
    };
    saveInternalAlerts([newAlert, ...alerts]);
    internalAlertCreated = true;
  }

  // 2. Mark reminder as dispatched in storage
  const reminders = getStoredScheduledReminders();
  const updatedReminders = reminders.map(r => {
    if (r.id === reminder.id) {
      return {
        ...r,
        status: 'disparado' as const,
        disparadoEm: new Date().toISOString(),
      };
    }
    return r;
  });
  saveScheduledReminders(updatedReminders);

  // 3. Update record notifications log if record passed
  if (record && onRecordUpdated) {
    const canalFormatado = reminder.tipoAlerta === 'email' ? 'email' : 'whatsapp';
    const novaNotif: NotificacaoRegistro = {
      id: `notif-${Date.now()}`,
      data: new Date().toLocaleDateString('pt-BR'),
      canal: canalFormatado,
      tipo: 'atraso_critico',
      mensagem: `[Lembrete >45 dias: ${reminder.tipoAlerta.toUpperCase()}] ${reminder.assunto}`,
      status: 'enviada',
    };
    onRecordUpdated({
      ...record,
      notificacoes: [novaNotif, ...(record.notificacoes || [])],
      contatoRealizado: 'SIM',
      dataUltimoContato: new Date().toLocaleDateString('pt-BR'),
    });
  }

  return { success: true, internalAlertCreated };
}

export function cancelScheduledReminder(reminderId: string): void {
  const reminders = getStoredScheduledReminders();
  const updated = reminders.map(r => {
    if (r.id === reminderId) {
      return { ...r, status: 'cancelado' as const };
    }
    return r;
  });
  saveScheduledReminders(updated);
}

export function markAlertAsRead(alertId: string): void {
  const alerts = getStoredInternalAlerts();
  const updated = alerts.map(a => a.id === alertId ? { ...a, lido: true } : a);
  saveInternalAlerts(updated);
}

export function markAllAlertsAsRead(): void {
  const alerts = getStoredInternalAlerts();
  const updated = alerts.map(a => ({ ...a, lido: true }));
  saveInternalAlerts(updated);
}

export function deleteAlert(alertId: string): void {
  const alerts = getStoredInternalAlerts();
  const updated = alerts.filter(a => a.id !== alertId);
  saveInternalAlerts(updated);
}

export function deleteScheduledReminder(reminderId: string): void {
  const reminders = getStoredScheduledReminders();
  const updated = reminders.filter(r => r.id !== reminderId);
  saveScheduledReminders(updated);
}

/**
 * Creates a scheduled reminder with fixed specific date or recurring interval.
 * Supports operator targeting and startup popup alerts.
 */
export function scheduleCustomRecurringReminder(params: {
  titulo: string;
  mensagem: string;
  dataAgendada: string; // YYYY-MM-DD
  horario?: string; // HH:MM
  responsavel: string; // e.g. 'ROSANA' | 'ANA LUIZA' | 'GERAL'
  recorrencia?: TipoRecorrenciaLembrete;
  prioridade?: 'baixa' | 'media' | 'alta' | 'urgente';
  exibirNoStartup?: boolean;
  clienteRecord?: DebtRecord;
  criadoPor: string;
  tipoAlerta?: TipoCanalAlerta;
}): LembreteAgendado {
  const diasAtraso = params.clienteRecord
    ? calculateDaysOverdue(params.clienteRecord.primeiroMesAtraso, params.clienteRecord.diaVencimento)
    : 0;

  const novoLembrete: LembreteAgendado = {
    id: `lembrete-rec-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    clienteId: params.clienteRecord ? params.clienteRecord.id : 'geral',
    matricula: params.clienteRecord ? params.clienteRecord.matricula : 'S/N',
    clienteNome: params.clienteRecord ? params.clienteRecord.cliente : (params.titulo || 'Lembrete Geral'),
    responsavel: params.responsavel || 'GERAL',
    diasAtraso,
    tipoAlerta: params.tipoAlerta || 'ambos',
    assunto: params.titulo || 'Lembrete Agendado de Cobrança',
    mensagem: params.mensagem,
    dataAgendada: params.dataAgendada,
    horario: params.horario || '09:00',
    status: 'pendente',
    criadoEm: new Date().toISOString(),
    criadoPor: params.criadoPor,
    recorrencia: params.recorrencia || 'nenhuma',
    exibirNoStartup: params.exibirNoStartup !== false,
    prioridade: params.prioridade || 'media',
    lembreteGeral: !params.clienteRecord,
  };

  const listaAtual = getStoredScheduledReminders();
  saveScheduledReminders([novoLembrete, ...listaAtual]);

  return novoLembrete;
}

/**
 * Calculates the next occurrence date for recurring reminders.
 */
function calculateNextRecurrenceDate(currentDateStr: string, recurrence: TipoRecorrenciaLembrete): string {
  const date = new Date(currentDateStr + 'T12:00:00');
  if (isNaN(date.getTime())) {
    const today = new Date();
    today.setDate(today.getDate() + 1);
    return today.toISOString().split('T')[0];
  }

  if (recurrence === 'diaria') {
    date.setDate(date.getDate() + 1);
  } else if (recurrence === 'semanal') {
    date.setDate(date.getDate() + 7);
  } else if (recurrence === 'mensal') {
    date.setMonth(date.getMonth() + 1);
  }
  return date.toISOString().split('T')[0];
}

/**
 * Marks a reminder as completed.
 * If the reminder has recurrence, advances its scheduled date to the next cycle.
 */
export function completeReminder(reminderId: string): { completed: boolean; nextScheduledDate?: string } {
  const reminders = getStoredScheduledReminders();
  let nextDate: string | undefined;

  const updated = reminders.map(r => {
    if (r.id !== reminderId) return r;

    if (r.recorrencia && r.recorrencia !== 'nenhuma') {
      nextDate = calculateNextRecurrenceDate(r.dataAgendada, r.recorrencia);
      return {
        ...r,
        dataAgendada: nextDate,
        status: 'pendente' as const,
        concluidoEm: new Date().toISOString(),
      };
    }

    return {
      ...r,
      status: 'disparado' as const,
      concluidoEm: new Date().toISOString(),
    };
  });

  saveScheduledReminders(updated);
  return { completed: true, nextScheduledDate: nextDate };
}

/**
 * Postpones a reminder by N days.
 */
export function postponeReminder(reminderId: string, daysToAdd: number = 1): string {
  const reminders = getStoredScheduledReminders();
  let newDateStr = '';

  const updated = reminders.map(r => {
    if (r.id !== reminderId) return r;

    const base = new Date(r.dataAgendada + 'T12:00:00');
    if (isNaN(base.getTime())) {
      const today = new Date();
      today.setDate(today.getDate() + daysToAdd);
      newDateStr = today.toISOString().split('T')[0];
    } else {
      base.setDate(base.getDate() + daysToAdd);
      newDateStr = base.toISOString().split('T')[0];
    }

    return {
      ...r,
      dataAgendada: newDateStr,
      status: 'pendente' as const,
    };
  });

  saveScheduledReminders(updated);
  return newDateStr;
}

/**
 * Schedules or refreshes a specific morning workday alert for an operator
 * based on their configured notification time (horarioNotificacao).
 */
export function scheduleWorkdayStartAlert(
  user: AppUser,
  records: DebtRecord[]
): LembreteAgendado | null {
  if (!user || user.notificacaoDiariaAtiva === false) return null;

  const horario = user.horarioNotificacao || '08:00';
  const todayStr = new Date().toISOString().split('T')[0];
  const reminderId = `alerta-expediente-${user.id}-${todayStr}`;

  // Filter operator records
  const isGlobal = user.role === 'adm_master' || user.role === 'suporte' || user.role === 'administrador' || user.role === 'socias' || user.role === 'coordenadora';
  const userResp = (user.responsavelAssociado || '').toUpperCase().trim();
  const operatorRecords = records.filter(r => {
    if (isGlobal) return true;
    const recResp = (r.responsavel || '').toUpperCase().trim();
    return recResp === userResp || recResp.includes(userResp);
  });

  const pendentes = operatorRecords.filter(r => r.status !== 'pago' && r.status !== 'recuperado');
  const atrasoMais45 = pendentes.filter(r => (r.diasAtraso || 0) > 45);
  const agendamentosHoje = operatorRecords.filter(r => 
    r.dataProximaAcao === todayStr || 
    r.dataRetorno === todayStr || 
    r.status === 'pagamento_prometido'
  );

  const carteiraNome = isGlobal ? 'Geral de Cobrança' : (user.responsavelAssociado || user.nome);
  const mensagem = `Olá, ${user.nome}! Início do seu dia de trabalho (${horario}).
Você possui ${pendentes.length} clientes com pendências na carteira (${carteiraNome}).
• ${atrasoMais45.length} casos críticos em atraso (>45 dias)
• ${agendamentosHoje.length} agendamentos ou promessas para hoje
Tenha um excelente expediente e bons acionamentos!`;

  const assunto = `[Início do Dia - ${horario}] Alerta de Expediente (${carteiraNome})`;

  const allReminders = getStoredScheduledReminders();
  const existingIdx = allReminders.findIndex(r => r.id === reminderId);

  const reminderObj: LembreteAgendado = {
    id: reminderId,
    clienteId: 'expediente',
    matricula: 'INICIO-DIA',
    clienteNome: `Início de Expediente - ${user.nome}`,
    responsavel: user.responsavelAssociado || 'GERAL',
    diasAtraso: 0,
    tipoAlerta: 'ambos',
    assunto,
    mensagem,
    dataAgendada: todayStr,
    horario,
    status: 'pendente',
    criadoEm: new Date().toISOString(),
    criadoPor: `Sistema Valora (Horário do Operador: ${horario})`,
    recorrencia: 'diaria',
    exibirNoStartup: true,
    prioridade: 'alta',
    lembreteGeral: true,
  };

  if (existingIdx >= 0) {
    allReminders[existingIdx] = {
      ...allReminders[existingIdx],
      horario,
      assunto,
      mensagem,
    };
    saveScheduledReminders(allReminders);
    return allReminders[existingIdx];
  } else {
    saveScheduledReminders([reminderObj, ...allReminders]);
    
    // Also create an unread internal alert
    const currentAlerts = getStoredInternalAlerts();
    const alertAlreadyExists = currentAlerts.some(a => a.id === `alerta-int-${reminderId}`);
    if (!alertAlreadyExists) {
      const internalAlert: AlertaInterno = {
        id: `alerta-int-${reminderId}`,
        clienteId: 'expediente',
        matricula: 'INICIO-DIA',
        clienteNome: `Início de Expediente - ${user.nome}`,
        responsavel: user.responsavelAssociado || 'GERAL',
        diasAtraso: 0,
        mensagem: `Alerta Matinal (${horario}): ${pendentes.length} clientes pendentes na carteira (${carteiraNome}).`,
        prioridade: 'alta',
        dataCriacao: new Date().toISOString(),
        lido: false,
        canalOrigem: 'sistema',
      };
      saveInternalAlerts([internalAlert, ...currentAlerts]);
    }
    
    return reminderObj;
  }
}

/**
 * Returns reminders that should be displayed in the startup popup for the logged user.
 * Looks for reminders scheduled for today or earlier (overdue) that are still pending.
 */
export function getRemindersForStartup(currentUser: AppUser): LembreteAgendado[] {
  const allReminders = getStoredScheduledReminders();
  const todayStr = new Date().toISOString().split('T')[0];

  return allReminders.filter(r => {
    if (r.status !== 'pendente') return false;
    if (r.exibirNoStartup === false) return false;

    // Filter by user role/responsavel
    if (currentUser.role === 'operador' || currentUser.role === 'cobranca') {
      const userResp = (currentUser.responsavelAssociado || '').toUpperCase();
      const remResp = (r.responsavel || '').toUpperCase();
      if (remResp !== 'GERAL' && remResp !== 'TODOS' && remResp !== userResp && !remResp.includes(userResp)) {
        return false;
      }
    }

    // Past due from previous days
    if (r.dataAgendada < todayStr) return true;

    // Due today - check scheduled time if present
    if (r.dataAgendada === todayStr) {
      if (!r.horario) return true;
      const now = new Date();
      const currentHours = String(now.getHours()).padStart(2, '0');
      const currentMinutes = String(now.getMinutes()).padStart(2, '0');
      const currentTime = `${currentHours}:${currentMinutes}`;
      return currentTime >= r.horario;
    }

    return false;
  });
}

/**
 * Alias for getRemindersForStartup
 */
export const checkStartupReminders = getRemindersForStartup;

/**
 * Checks for due reminders and dispatches Web Push Browser Notifications
 * with audio chimes to alert the operator.
 */
export function checkAndDispatchDueWebNotifications(
  currentUser: AppUser
): number {
  const dueReminders = getRemindersForStartup(currentUser);
  let dispatchedCount = 0;

  for (const reminder of dueReminders) {
    if (!hasReminderBeenNotifiedThisSession(reminder.id)) {
      const priorityLabel = reminder.prioridade ? `[${reminder.prioridade.toUpperCase()}] ` : '';
      const subject = `${priorityLabel}Lembrete Valora: ${reminder.assunto}`;
      const body = reminder.mensagem 
        ? `${reminder.clienteNome ? reminder.clienteNome + ': ' : ''}${reminder.mensagem.slice(0, 140)}`
        : `Lembrete agendado para hoje sob responsabilidade de ${reminder.responsavel}.`;

      const sent = sendBrowserNotification(subject, {
        body,
        tag: `reminder-${reminder.id}`,
        requireInteraction: reminder.prioridade === 'urgente' || reminder.prioridade === 'alta',
        chimeType: reminder.prioridade === 'urgente' ? 'urgent' : 'alert',
      });

      if (sent) {
        markReminderNotifiedThisSession(reminder.id);
        dispatchedCount++;
      }
    }
  }

  return dispatchedCount;
}

export function autoCheckAndGenerate45DaysAlerts(records: DebtRecord[]): number {
  if (!records || records.length === 0) return 0;
  
  const eligible = getClientesMaisDe45Dias(records);
  if (eligible.length === 0) return 0;

  const currentAlerts = getStoredInternalAlerts();
  const now = Date.now();
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
  const todayStr = new Date().toISOString().split('T')[0];

  // Check which client IDs were alerted in the last 7 days (read or unread)
  const recentAlertedClientIds = new Set(
    currentAlerts
      .filter(a => {
        if (!a.dataCriacao) return true;
        const alertTime = new Date(a.dataCriacao).getTime();
        return !isNaN(alertTime) && (now - alertTime) < SEVEN_DAYS_MS;
      })
      .map(a => a.clienteId)
  );

  const newAlerts: AlertaInterno[] = [];

  // 1. Consolidated portfolio alert for today if there are overdue clients
  const consolidatedAlertId = `alerta-resumo-inadimplencia-${todayStr}`;
  const hasConsolidatedToday = currentAlerts.some(a => a.id === consolidatedAlertId);

  if (!hasConsolidatedToday && eligible.length >= 3) {
    const totalAberto = eligible.reduce((acc, curr) => acc + (curr.record.valorEmAberto ?? curr.record.valorOriginal ?? 0), 0);
    newAlerts.push({
      id: consolidatedAlertId,
      clienteId: 'resumo-inadimplencia-45d',
      matricula: 'RESUMO',
      clienteNome: `Carteira Crítica (${eligible.length} clientes > 45 dias)`,
      responsavel: 'GERAL',
      diasAtraso: eligible[0]?.diasAtraso || 45,
      mensagem: `Identificados ${eligible.length} clientes com atraso superior a 45 dias (${totalAberto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} em aberto). Priorize negociação e acionamentos preventivos.`,
      prioridade: 'alta',
      dataCriacao: new Date().toISOString(),
      lido: false,
      canalOrigem: 'sistema',
    });
  }

  // 2. Add individual alerts for at most 5 most critical clients that haven't been alerted recently
  const unalertedCritical = eligible
    .filter(item => !recentAlertedClientIds.has(item.record.id))
    .slice(0, 5);

  for (const { record, diasAtraso } of unalertedCritical) {
    newAlerts.push({
      id: `alerta-auto-${Date.now()}-${record.id.slice(0, 8)}`,
      clienteId: record.id,
      matricula: record.matricula,
      clienteNome: record.cliente,
      responsavel: record.responsavel,
      diasAtraso,
      mensagem: `Atraso de ${diasAtraso} dias detectado para ${record.cliente} (#${record.matricula}). Responsável: ${record.responsavel}.`,
      prioridade: diasAtraso > 90 ? 'critica' : 'alta',
      dataCriacao: new Date().toISOString(),
      lido: false,
      canalOrigem: 'sistema',
    });
  }

  if (newAlerts.length > 0) {
    saveInternalAlerts([...newAlerts, ...currentAlerts]);
  }

  return newAlerts.length;
}

export interface DailyDueAlertResult {
  success: boolean;
  dueCount: number;
  alertCreated: boolean;
  alert?: AlertaInterno;
  message: string;
  clients: DebtRecord[];
  targetDay: number;
}

/**
 * Sends a daily internal alert in the system listing exclusively the clients
 * whose due date is on the current date (dia corrente), facilitating the operator's daily workload.
 */
export function sendDailyDueClientsAlert(
  records: DebtRecord[],
  options?: {
    force?: boolean;
    specificDay?: number;
    currentUser?: AppUser;
  }
): DailyDueAlertResult {
  const now = new Date();
  const currentDay = options?.specificDay ?? now.getDate();
  const todayDateStr = now.toISOString().split('T')[0];
  const dateFormatted = now.toLocaleDateString('pt-BR');

  // Filter clients with due date on the current day who have active debt
  const dueClients = records.filter(r => {
    const matchesDay = Number(r.diaVencimento) === currentDay;
    const isPending = r.status !== 'pago' && r.status !== 'recuperado' && r.status !== 'cancelado';
    
    if (options?.currentUser && (options.currentUser.role === 'operador' || options.currentUser.role === 'cobranca')) {
      const userResp = (options.currentUser.responsavelAssociado || '').toUpperCase().trim();
      const recResp = (r.responsavel || '').toUpperCase().trim();
      const matchesResp = recResp === userResp || recResp.includes(userResp);
      return matchesDay && isPending && matchesResp;
    }
    
    return matchesDay && isPending;
  });

  const dueCount = dueClients.length;
  const alertId = `alerta-diario-vencimento-${todayDateStr}-dia${currentDay}${options?.currentUser ? '-' + options.currentUser.id : ''}`;

  const currentAlerts = getStoredInternalAlerts();
  const alreadyExists = currentAlerts.some(a => a.id === alertId);

  if (alreadyExists && !options?.force) {
    const existing = currentAlerts.find(a => a.id === alertId);
    return {
      success: true,
      dueCount,
      alertCreated: false,
      alert: existing,
      message: `Alerta diário de vencimentos do dia ${currentDay} já registrado hoje.`,
      clients: dueClients,
      targetDay: currentDay,
    };
  }

  // Format client summary list (preview up to 6 clients to avoid exceeding storage quota)
  let clientListText = '';
  if (dueCount > 0) {
    const preview = dueClients.slice(0, 6);
    clientListText = preview.map((c, i) => {
      const valor = (c.valorEmAberto ?? c.valorOriginal ?? 120).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      return `${i + 1}. ${c.cliente} (#${c.matricula}) — ${valor} [${c.responsavel || 'GERAL'}]`;
    }).join('\n');

    if (dueClients.length > 6) {
      clientListText += `\n... e mais ${dueClients.length - 6} cliente(s) com vencimento hoje.`;
    }
  }

  const roleText = options?.currentUser?.role === 'operador' 
    ? `Carteira de ${options.currentUser.responsavelAssociado || options.currentUser.nome}` 
    : 'Central Geral de Cobrança';

  const alertMessage = dueCount > 0
    ? `📅 [VENCIMENTOS DE HOJE (${dateFormatted})] ${dueCount} cliente(s) no Dia ${currentDay} (${roleText}):\n${clientListText}\n⚡ Priorize o contato preventivo hoje.`
    : `📅 [VENCIMENTOS DE HOJE (${dateFormatted})] Nenhum débito vencendo hoje para ${roleText}.`;

  const newAlert: AlertaInterno = {
    id: options?.force ? `${alertId}-${Date.now()}` : alertId,
    clienteId: dueClients.length === 1 ? dueClients[0].id : 'vencimentos-hoje',
    matricula: dueClients.length === 1 ? dueClients[0].matricula : 'HOJE',
    clienteNome: `Vencimentos de Hoje (${dueCount} clientes - Dia ${currentDay})`,
    responsavel: options?.currentUser?.responsavelAssociado || 'GERAL',
    diasAtraso: 0,
    mensagem: alertMessage,
    prioridade: dueCount > 0 ? 'alta' : 'media',
    dataCriacao: new Date().toISOString(),
    lido: false,
    canalOrigem: 'sistema',
  };

  const updatedAlerts = alreadyExists
    ? [newAlert, ...currentAlerts.filter(a => a.id !== alertId)]
    : [newAlert, ...currentAlerts];

  saveInternalAlerts(updatedAlerts);

  if (dueCount > 0) {
    sendBrowserNotification(`Alerta Diário: ${dueCount} clientes vencem hoje!`, {
      body: `Dia ${currentDay}: organize seus contatos prioritários com ${dueClients[0].cliente}${dueCount > 1 ? ` e outros ${dueCount - 1}` : ''}.`,
      tag: `daily-due-${todayDateStr}`,
      chimeType: 'alert'
    });
  }

  return {
    success: true,
    dueCount,
    alertCreated: true,
    alert: newAlert,
    message: dueCount > 0 
      ? `Alerta interno disparado! ${dueCount} cliente(s) com vencimento hoje listado(s) para organização do expediente.`
      : `Alerta interno gerado: Nenhum cliente com vencimento para o dia ${currentDay}.`,
    clients: dueClients,
    targetDay: currentDay
  };
}

