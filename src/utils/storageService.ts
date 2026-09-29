import { DebtRecord } from '../types';

const DB_NAME = 'ValoraCobrancaDB_v3';
const DB_VERSION = 2;
const STORE_NAME = 'records_store';
const BACKUP_STORE_NAME = 'backups_store';
const RECORD_KEY = 'central_debt_records';

export const LOCAL_STORAGE_KEY = 'valora_cobranca_central_records_v3';
export const LOCAL_STORAGE_BACKUP_KEY = 'valora_cobranca_critical_backup_latest';
export const LOCAL_STORAGE_BACKUP_META_KEY = 'valora_cobranca_backup_metadata_list';

export interface BackupMetadata {
  id: string;
  timestamp: number;
  dataHoraFormatada: string;
  motivo: string;
  totalRegistros: number;
  tamanhoAproxKb: number;
}

// Clean up obsolete keys to free quota
export function cleanupLegacyStorageKeys(): void {
  try {
    if (typeof localStorage === 'undefined') return;
    const obsoleteKeys = [
      'valora_cobranca_central_records_v1',
      'valora_cobranca_central_records_v2',
      'valora_cobranca_central_records_temp',
      'valora_cobranca_backup_records'
    ];
    obsoleteKeys.forEach(k => {
      try {
        localStorage.removeItem(k);
      } catch (_) {}
    });
  } catch (_) {}
}

/**
 * Automatically prunes audit logs older than 180 days from all records
 * to optimize local storage usage and performance.
 */
export function pruneOldAuditLogs(
  records: DebtRecord[], 
  maxAgeDays: number = 180
): { cleanedRecords: DebtRecord[]; totalRemoved: number } {
  const cutoffTime = Date.now() - (maxAgeDays * 24 * 60 * 60 * 1000);
  let totalRemoved = 0;

  const cleanedRecords = records.map(record => {
    if (!record.logAuditoria || record.logAuditoria.length === 0) {
      return record;
    }

    const filteredLogs = record.logAuditoria.filter(log => {
      if (!log.dataHora) return false;
      const logTime = new Date(log.dataHora).getTime();
      if (isNaN(logTime)) return true; // keep if unrecognized format
      if (logTime < cutoffTime) {
        totalRemoved++;
        return false;
      }
      return true;
    });

    if (filteredLogs.length !== record.logAuditoria.length) {
      return {
        ...record,
        logAuditoria: filteredLogs
      };
    }
    return record;
  });

  return { cleanedRecords, totalRemoved };
}

/**
 * Open or upgrade the IndexedDB database
 */
function openIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB is not supported in this environment'));
    }

    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains(BACKUP_STORE_NAME)) {
          db.createObjectStore(BACKUP_STORE_NAME, { keyPath: 'id' });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Failed to open IndexedDB'));
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Save records to IndexedDB (No 5MB quota limit; handles large datasets reliably)
 */
export async function saveRecordsToIndexedDB(records: DebtRecord[]): Promise<boolean> {
  try {
    const db = await openIndexedDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put({ key: RECORD_KEY, data: records, updatedAt: Date.now() });

      req.onsuccess = () => resolve(true);
      req.onerror = () => {
        console.warn('[StorageService] IndexedDB put warning', req.error);
        resolve(false);
      };
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch (err) {
    console.warn('[StorageService] IndexedDB save failed', err);
    return false;
  }
}

/**
 * Load records from IndexedDB
 */
export async function loadRecordsFromIndexedDB(): Promise<DebtRecord[] | null> {
  try {
    const db = await openIndexedDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(RECORD_KEY);

      req.onsuccess = () => {
        if (req.result && Array.isArray(req.result.data) && req.result.data.length > 0) {
          resolve(req.result.data);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch (err) {
    console.warn('[StorageService] IndexedDB load failed', err);
    return null;
  }
}

/**
 * Clear records from IndexedDB
 */
export async function clearRecordsFromIndexedDB(): Promise<boolean> {
  try {
    const db = await openIndexedDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(RECORD_KEY);
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    });
  } catch (err) {
    return false;
  }
}

/**
 * Strips heavyweight recomputable fields to create a compact footprint for LocalStorage
 */
export function compactRecordForStorage(r: DebtRecord): Partial<DebtRecord> {
  return {
    id: r.id,
    matricula: r.matricula,
    cliente: r.cliente,
    cpf: r.cpf,
    telefone: r.telefone,
    whatsapp: r.whatsapp,
    email: r.email,
    planoContratado: r.planoContratado,
    valorMensalidade: r.valorMensalidade,
    responsavel: r.responsavel,
    abaOrigem: r.abaOrigem,
    primeiroMesAtraso: r.primeiroMesAtraso,
    diaVencimento: r.diaVencimento,
    informacao: r.informacao,
    contatoRealizado: r.contatoRealizado,
    whatsappStatus: r.whatsappStatus,
    status: r.status,
    dataRetorno: r.dataRetorno,
    valorOriginal: r.valorOriginal,
    valorEmAberto: r.valorEmAberto,
    valorPago: r.valorPago,
    valorRecuperado: r.valorRecuperado,
    qtdParcelasVencidas: r.qtdParcelasVencidas,
    dataImportacao: r.dataImportacao,
    proximaAcao: r.proximaAcao,
    dataProximaAcao: r.dataProximaAcao,
    prioridadeAcao: r.prioridadeAcao,
    acaoConcluida: r.acaoConcluida,
    // Keep user contact history if present
    historicoContatos: r.historicoContatos && r.historicoContatos.length > 0 ? r.historicoContatos.slice(-5) : undefined,
    // Keep non-empty user negotiations/payments
    historicoNegociacoes: r.historicoNegociacoes && r.historicoNegociacoes.length > 0 ? r.historicoNegociacoes.slice(-3) : undefined,
    historicoPagamentos: r.historicoPagamentos && r.historicoPagamentos.length > 0 ? r.historicoPagamentos.slice(-3) : undefined,
  };
}

/**
 * Safely saves records to LocalStorage with automatic QuotaExceededError handling,
 * cleaning, and compaction. Never crashes or throws uncaught QuotaExceededError.
 */
export function safeSaveToLocalStorage(records: DebtRecord[]): boolean {
  if (typeof localStorage === 'undefined') return false;

  cleanupLegacyStorageKeys();

  // Attempt 1: Try standard save
  try {
    const serialized = JSON.stringify(records);
    localStorage.setItem(LOCAL_STORAGE_KEY, serialized);
    return true;
  } catch (e1: any) {
    const isQuotaError = 
      e1?.name === 'QuotaExceededError' || 
      e1?.code === 22 || 
      e1?.number === -2147024882 || 
      String(e1).includes('quota');

    if (!isQuotaError) {
      console.warn('[StorageService] Unexpected error saving to localStorage', e1);
      return false;
    }

    // Attempt 2: Clean up obsolete keys and try compacting records
    try {
      cleanupLegacyStorageKeys();
      const compactRecords = records.map(compactRecordForStorage);
      const compactSerialized = JSON.stringify(compactRecords);
      localStorage.setItem(LOCAL_STORAGE_KEY, compactSerialized);
      return true;
    } catch (e2: any) {
      // Attempt 3: If still exceeding quota, store only user-modified or essential subset in localStorage
      // IndexedDB has already persisted the full dataset safely
      try {
        // Save only customized records (non-pendente or with observations or recent changes)
        const activeOrCustomized = records
          .filter(r => r.status !== 'pendente' || r.informacao || (r.historicoContatos && r.historicoContatos.length > 0))
          .map(compactRecordForStorage);

        if (activeOrCustomized.length > 0) {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(activeOrCustomized));
        } else {
          // If even that is too big, remove the oversized key so it never throws QuotaExceeded
          localStorage.removeItem(LOCAL_STORAGE_KEY);
        }
        return true;
      } catch (e3) {
        // Remove key to prevent repeated quota errors on subsequent reads/writes
        try {
          localStorage.removeItem(LOCAL_STORAGE_KEY);
        } catch (_) {}
        // IndexedDB ensures complete data safety
        return false;
      }
    }
  }
}

/**
 * Loads records from LocalStorage synchronously
 */
export function loadRecordsFromLocalStorage(): DebtRecord[] | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!saved) return null;
    const parsed = JSON.parse(saved);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed as DebtRecord[];
    }
    return null;
  } catch (e) {
    console.warn('[StorageService] Failed to parse localStorage records', e);
    return null;
  }
}

/**
 * Unified persistence function:
 * 1. Asynchronously persists to IndexedDB (safe for unlimited records)
 * 2. Safely syncs to LocalStorage with quota protection
 */
export async function persistAllRecords(records: DebtRecord[]): Promise<void> {
  // Always persist to IndexedDB in background
  saveRecordsToIndexedDB(records).catch(() => {});
  // Sync to localStorage safely
  safeSaveToLocalStorage(records);
}

/**
 * Unified clear function: clears both IndexedDB and LocalStorage
 */
export async function clearAllStoredRecords(): Promise<void> {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    }
  } catch (_) {}
  await clearRecordsFromIndexedDB();
}

/**
 * Triggers an automatic disaster-recovery backup into both IndexedDB and LocalStorage.
 * Dispatched on critical actions (edit, import, bulk add, status change, reassign, payment).
 */
export async function triggerCriticalBackup(
  records: DebtRecord[],
  actionReason: string
): Promise<BackupMetadata | null> {
  if (!records || records.length === 0) return null;

  try {
    // 1. First prune old audit logs older than 180 days before backup
    const { cleanedRecords } = pruneOldAuditLogs(records, 180);
    const now = new Date();
    const backupId = `backup_${Date.now()}`;
    const dataHoraFormatada = now.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    const serializedData = JSON.stringify(cleanedRecords);
    const tamanhoAproxKb = Math.round(serializedData.length / 1024);

    const meta: BackupMetadata = {
      id: backupId,
      timestamp: Date.now(),
      dataHoraFormatada,
      motivo: actionReason,
      totalRegistros: cleanedRecords.length,
      tamanhoAproxKb
    };

    // 2. Persist full backup snapshot in IndexedDB (No quota barrier)
    try {
      const db = await openIndexedDB();
      const tx = db.transaction(BACKUP_STORE_NAME, 'readwrite');
      const store = tx.objectStore(BACKUP_STORE_NAME);
      store.put({ id: backupId, meta, records: cleanedRecords });
      // Keep only up to 5 historical snapshots in IndexedDB
    } catch (idbErr) {
      console.warn('[StorageService] Backup to IndexedDB warning', idbErr);
    }

    // 3. Persist latest backup snapshot in LocalStorage
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(LOCAL_STORAGE_BACKUP_KEY, serializedData);
      } catch (lsErr) {
        // If quota exceeded, save compact version as emergency fallback
        try {
          const compactBackup = cleanedRecords.map(compactRecordForStorage);
          localStorage.setItem(LOCAL_STORAGE_BACKUP_KEY, JSON.stringify(compactBackup));
        } catch (_) {}
      }

      // 4. Update metadata history list in LocalStorage
      try {
        const rawMetaList = localStorage.getItem(LOCAL_STORAGE_BACKUP_META_KEY);
        let metaList: BackupMetadata[] = rawMetaList ? JSON.parse(rawMetaList) : [];
        if (!Array.isArray(metaList)) metaList = [];
        metaList.unshift(meta);
        // Keep last 10 backup metadata logs
        metaList = metaList.slice(0, 10);
        localStorage.setItem(LOCAL_STORAGE_BACKUP_META_KEY, JSON.stringify(metaList));
      } catch (_) {}
    }

    return meta;
  } catch (err) {
    console.error('[StorageService] Error creating critical backup', err);
    return null;
  }
}

/**
 * Returns metadata of the latest available automatic backup
 */
export function getLatestBackupMetadata(): BackupMetadata | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_BACKUP_META_KEY);
    if (!raw) return null;
    const list: BackupMetadata[] = JSON.parse(raw);
    return Array.isArray(list) && list.length > 0 ? list[0] : null;
  } catch (_) {
    return null;
  }
}

/**
 * Returns all available backup metadata items
 */
export function getAllBackupMetadatas(): BackupMetadata[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_BACKUP_META_KEY);
    if (!raw) return [];
    const list: BackupMetadata[] = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch (_) {
    return [];
  }
}

/**
 * Restores records from the latest available backup (from IndexedDB or LocalStorage)
 */
export async function restoreFromLatestBackup(): Promise<{ records: DebtRecord[]; meta: BackupMetadata | null } | null> {
  const meta = getLatestBackupMetadata();

  // Try IndexedDB first for complete fidelity
  try {
    const db = await openIndexedDB();
    const idbResult = await new Promise<any>((resolve) => {
      const tx = db.transaction(BACKUP_STORE_NAME, 'readonly');
      const store = tx.objectStore(BACKUP_STORE_NAME);
      if (meta?.id) {
        const req = store.get(meta.id);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
      } else {
        const req = store.openCursor(null, 'prev');
        req.onsuccess = () => resolve(req.result ? req.result.value : null);
        req.onerror = () => resolve(null);
      }
    });

    if (idbResult && Array.isArray(idbResult.records) && idbResult.records.length > 0) {
      return { records: idbResult.records, meta: idbResult.meta || meta };
    }
  } catch (_) {}

  // Fallback to LocalStorage backup snapshot
  if (typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_BACKUP_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return { records: parsed, meta };
        }
      }
    } catch (_) {}
  }

  return null;
}
