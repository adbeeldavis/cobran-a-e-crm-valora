import { DebtRecord } from '../types';
import { triggerCriticalBackup, BackupMetadata } from './storageService';
import { sendBrowserNotification } from './browserNotificationService';

const KEY_LAST_DAILY_BACKUP_DATE = 'valora_last_daily_backup_date';
const KEY_LAST_DAILY_BACKUP_INFO = 'valora_last_daily_backup_info';

export interface DailyBackupStatus {
  lastBackupDate: string | null;
  lastBackupFormatted: string | null;
  lastBackupRecordsCount: number | null;
  lastBackupMotivo: string | null;
  nextScheduledTime: string;
  isTodayDone: boolean;
}

/**
 * Returns information about the last and next scheduled 08:00 daily backups.
 */
export function getDailyBackupStatus(): DailyBackupStatus {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const lastDate = typeof localStorage !== 'undefined' ? localStorage.getItem(KEY_LAST_DAILY_BACKUP_DATE) : null;
  const isTodayDone = lastDate === todayStr;

  let lastInfo: any = null;
  if (typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem(KEY_LAST_DAILY_BACKUP_INFO);
      if (raw) lastInfo = JSON.parse(raw);
    } catch (_) {}
  }

  // Calculate next 08:00 AM target
  const nextTarget = new Date(now);
  nextTarget.setHours(8, 0, 0, 0);

  let nextScheduledTime = 'Hoje às 08:00';
  if (now.getTime() >= nextTarget.getTime() || isTodayDone) {
    // Target is tomorrow at 08:00
    nextScheduledTime = 'Amanhã às 08:00';
  }

  return {
    lastBackupDate: lastDate,
    lastBackupFormatted: lastInfo?.dataHoraFormatada || null,
    lastBackupRecordsCount: lastInfo?.totalRegistros || null,
    lastBackupMotivo: lastInfo?.motivo || null,
    nextScheduledTime,
    isTodayDone
  };
}

/**
 * Checks and triggers the daily 08:00 backup if due, or forces execution if requested.
 */
export async function checkAndExecuteDailyBackup(
  records: DebtRecord[],
  force: boolean = false
): Promise<{ executed: boolean; meta: BackupMetadata | null; reason: string }> {
  if (!records || records.length === 0) {
    return { executed: false, meta: null, reason: 'Sem registros disponíveis para snapshot.' };
  }

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const lastDate = typeof localStorage !== 'undefined' ? localStorage.getItem(KEY_LAST_DAILY_BACKUP_DATE) : null;
  const currentHour = now.getHours();

  // If already executed today and not forced, skip
  if (!force && lastDate === todayStr) {
    return { 
      executed: false, 
      meta: null, 
      reason: `Snapshot consolidado das 08:00 já foi realizado hoje (${todayStr}).` 
    };
  }

  // If before 08:00 and not forced, wait
  if (!force && currentHour < 8) {
    return { 
      executed: false, 
      meta: null, 
      reason: `Horário atual (${currentHour}h) anterior ao agendamento diário das 08:00.` 
    };
  }

  // Execute the critical backup snapshot
  const reasonText = force
    ? `Snapshot Consolidado Manual das 08:00 (${now.toLocaleDateString('pt-BR')})`
    : `Snapshot Consolidado Automático Recorrente das 08:00 (${now.toLocaleDateString('pt-BR')})`;

  try {
    const meta = await triggerCriticalBackup(records, reasonText);
    
    if (meta) {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(KEY_LAST_DAILY_BACKUP_DATE, todayStr);
        localStorage.setItem(KEY_LAST_DAILY_BACKUP_INFO, JSON.stringify(meta));
      }

      // Notify user via browser notification
      sendBrowserNotification('Snapshot Diário Consolidado (08:00)', {
        body: `Backup automático de ${records.length} registros salvo com sucesso às ${meta.dataHoraFormatada}.`,
        tag: `daily-backup-${todayStr}`,
        chimeType: 'success'
      });

      return {
        executed: true,
        meta,
        reason: 'Backup consolidado diário das 08:00 concluído com sucesso.'
      };
    }
  } catch (error) {
    console.error('[dailyBackupScheduler] Erro ao executar backup diário:', error);
    return { executed: false, meta: null, reason: 'Falha ao gravar snapshot no armazenamento.' };
  }

  return { executed: false, meta: null, reason: 'Backup não retornou metadados válidos.' };
}

/**
 * Starts the continuous daily scheduler for 08:00 backup.
 * Runs an immediate check on startup, and polls every 30 seconds to catch the 08:00 mark.
 */
export function startDailyBackupScheduler(
  getRecords: () => DebtRecord[],
  onBackupExecuted?: (meta: BackupMetadata) => void
): () => void {
  // 1. Initial check
  const performCheck = async () => {
    try {
      const records = getRecords();
      if (records && records.length > 0) {
        const res = await checkAndExecuteDailyBackup(records, false);
        if (res.executed && res.meta && onBackupExecuted) {
          onBackupExecuted(res.meta);
        }
      }
    } catch (e) {
      console.warn('[dailyBackupScheduler] Erro no ciclo do agendador:', e);
    }
  };

  // Run initial check with a short delay after DOM settles
  const initTimer = setTimeout(performCheck, 2000);

  // Poll every 30 seconds to check if 08:00 has arrived
  const intervalId = setInterval(performCheck, 30000);

  return () => {
    clearTimeout(initTimer);
    clearInterval(intervalId);
  };
}
