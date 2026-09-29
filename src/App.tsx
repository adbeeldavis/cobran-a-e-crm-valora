import React, { useState, useEffect, useMemo } from 'react';
import { 
  FileSpreadsheet, 
  BarChart3, 
  BellRing, 
  Upload, 
  Download, 
  CheckCircle2, 
  AlertTriangle,
  Layers,
  Sparkles,
  Search,
  PhoneCall,
  CheckSquare,
  LayoutDashboard,
  Users,
  Handshake,
  CreditCard,
  TrendingUp,
  Award,
  Building2,
  FileText
} from 'lucide-react';
import { DebtRecord, StatusCobranca, TemplateMensagem, AppUser, AlertaInterno } from './types';
import { RAW_CSV_DATA } from './data/rawCsvData';
import { ALL_SHEETS_EXTRACTED_CLIENTS } from './data/allSheetsExtractedClients';
import { getAllConsolidatedClients } from './data/allConsolidatedSource';
import { parseBillingCsv, calculateDaysOverdue } from './utils/sheetParser';
import { 
  getCurrentUser, 
  setCurrentUser as saveCurrentUserStorage, 
  filterRecordsForUser,
  isSessionAuthenticated,
  logoutUser
} from './utils/authService';
import { LoginScreen } from './components/LoginScreen';
import { 
  getStoredInternalAlerts, 
  autoCheckAndGenerate45DaysAlerts,
  sendDailyDueClientsAlert,
  checkStartupReminders,
  checkAndDispatchDueWebNotifications,
  scheduleWorkdayStartAlert
} from './utils/reminderService';
import { startDailyBackupScheduler } from './utils/dailyBackupScheduler';
import { playNotificationChime } from './utils/browserNotificationService';
import { Header } from './components/Header';
import { AppSidebar } from './components/AppSidebar';
import { OverviewDashboard } from './components/OverviewDashboard';
import { UnifiedSheetTable } from './components/UnifiedSheetTable';
import { OperatorPerformanceSummary } from './components/OperatorPerformanceSummary';
import { NotificationsCenterModal } from './components/NotificationsCenterModal';
import { ImportSheetModal } from './components/ImportSheetModal';
import { EditRecordModal } from './components/EditRecordModal';
import { ExportModal } from './components/ExportModal';
import { NewRecordModal } from './components/NewRecordModal';
import { BulkAddClientsCsvModal } from './components/BulkAddClientsCsvModal';
import { PendingCollectionTasks } from './components/PendingCollectionTasks';
import { GeminiRiskScoreModal } from './components/GeminiRiskScoreModal';
import { ScheduledRemindersModal } from './components/ScheduledRemindersModal';
import { StartupRemindersModal } from './components/StartupRemindersModal';
import { UserAuthModal } from './components/UserAuthModal';
import { WhatsAppConnectionModal } from './components/WhatsAppConnectionModal';
import { CustomerContactHistoryModal } from './components/CustomerContactHistoryModal';
import { DuplicateContactsModal } from './components/DuplicateContactsModal';
import { OperatorPerformanceComparisonPanel } from './components/OperatorPerformanceComparisonPanel';
import { RevenueRecoveryProjectionWidget } from './components/RevenueRecoveryProjectionWidget';
import { QuickFiltersPanel, QuickFilterPreset } from './components/QuickFiltersPanel';
import { reassignRecords } from './utils/duplicateService';
import { RiskScoreResult, WhatsAppSession, LembreteAgendado, HistoricoContato, NegociacaoRecord, PagamentoRecord, ItemAuditoria } from './types';
import { getWhatsAppSession } from './utils/whatsappService';
import { buildWhatsAppUrl, formatMessage, DEFAULT_TEMPLATES } from './utils/notificationService';
import { enrichDebtRecord } from './utils/cobrancaSeedHelper';
import { CobrancasDeHojeView } from './components/CobrancasDeHojeView';
import { MinhaRotinaView } from './components/MinhaRotinaView';
import { ClientesView } from './components/ClientesView';
import { NegociacoesView } from './components/NegociacoesView';
import { PagamentosView } from './components/PagamentosView';
import { RecuperacaoFinanceiraView } from './components/RecuperacaoFinanceiraView';
import { PerformanceCobrancaView } from './components/PerformanceCobrancaView';
import { VisaoGerencialView } from './components/VisaoGerencialView';
import { RelatoriosView } from './components/RelatoriosView';
import { FinanceiroView } from './components/FinanceiroView';
import { CrmSalesView } from './components/CrmSalesView';
import { RegistrarContatoModal } from './components/RegistrarContatoModal';
import { NovaNegociacaoModal } from './components/NovaNegociacaoModal';
import { RegistrarPagamentoModal } from './components/RegistrarPagamentoModal';
import {
  persistAllRecords,
  loadRecordsFromLocalStorage,
  loadRecordsFromIndexedDB,
  clearAllStoredRecords,
  cleanupLegacyStorageKeys,
  pruneOldAuditLogs,
  triggerCriticalBackup,
  restoreFromLatestBackup,
  getLatestBackupMetadata
} from './utils/storageService';

const NOTIFICATIONS_COUNT_KEY = 'valora_cobranca_notif_count_v3';

/**
 * Ensures every record in the array has a globally unique ID.
 * Automatically resolves any duplicate IDs (such as legacy rec-1, rec-2, etc. loaded from localStorage).
 */
function sanitizeUniqueRecords(recordList: DebtRecord[]): DebtRecord[] {
  const seenIds = new Set<string>();
  return recordList.map((rec, idx) => {
    let safeId = rec.id;
    if (!safeId || seenIds.has(safeId)) {
      const cleanMat = rec.matricula ? rec.matricula.replace(/\D/g, '') : 'row';
      safeId = `rec-${cleanMat}-${idx}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;
    }
    seenIds.add(safeId);
    return {
      ...rec,
      id: safeId,
    };
  });
}

export default function App() {
  // Main data state
  const [records, setRecords] = useState<DebtRecord[]>(() => {
    const base = parseBillingCsv(RAW_CSV_DATA);
    const consolidatedList = getAllConsolidatedClients();
    
    // Merge all data sources with deduplication
    const mapByUnique = new Map<string, DebtRecord>();
    
    // 1. First populate with base
    base.forEach(r => {
      const mat = (r.matricula || '').trim();
      const cli = (r.cliente || '').trim().toLowerCase();
      if (!cli) return;
      const key = `${mat}-${cli}`;
      mapByUnique.set(key, r);
    });

    // 2. Add or update with extracted clients
    ALL_SHEETS_EXTRACTED_CLIENTS.forEach(r => {
      const mat = (r.matricula || '').trim();
      const cli = (r.cliente || '').trim().toLowerCase();
      if (!cli) return;
      const key = `${mat}-${cli}`;
      if (!mapByUnique.has(key)) {
        mapByUnique.set(key, r);
      } else {
        const existing = mapByUnique.get(key)!;
        mapByUnique.set(key, {
          ...existing,
          telefone: existing.telefone || r.telefone,
          informacao: existing.informacao || r.informacao,
          abaOrigem: existing.abaOrigem || r.abaOrigem,
          responsavel: existing.responsavel || r.responsavel
        });
      }
    });

    // 3. Add or update with all consolidated sheets clients
    consolidatedList.forEach(r => {
      const mat = (r.matricula || '').trim();
      const cli = (r.cliente || '').trim().toLowerCase();
      if (!cli) return;
      const key = `${mat}-${cli}`;
      if (!mapByUnique.has(key)) {
        mapByUnique.set(key, r);
      } else {
        const existing = mapByUnique.get(key)!;
        mapByUnique.set(key, {
          ...existing,
          telefone: existing.telefone || r.telefone,
          informacao: existing.informacao || r.informacao,
          abaOrigem: existing.abaOrigem || r.abaOrigem,
          responsavel: existing.responsavel || r.responsavel
        });
      }
    });

    const defaultConsolidated = Array.from(mapByUnique.values());

    let initialRecords = defaultConsolidated;

    try {
      const saved = loadRecordsFromLocalStorage();
      if (saved && Array.isArray(saved) && saved.length > 0) {
        const savedKeys = new Set(
          saved
            .filter((r: DebtRecord) => r && r.cliente)
            .map((r: DebtRecord) => `${(r.matricula || '').trim()}-${(r.cliente || '').trim().toLowerCase()}`)
        );
        const missing = defaultConsolidated.filter(
          r => !savedKeys.has(`${(r.matricula || '').trim()}-${(r.cliente || '').trim().toLowerCase()}`)
        );
        initialRecords = [...saved, ...missing];
      }
    } catch (e) {
      console.warn('[Storage] Error loading initial saved records', e);
    }

    const sanitized = sanitizeUniqueRecords(initialRecords);
    return sanitized.map(r => enrichDebtRecord(r));
  });

  const [notificationsSentCount, setNotificationsSentCount] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(NOTIFICATIONS_COUNT_KEY);
      return saved ? parseInt(saved, 10) : 18;
    } catch {
      return 18;
    }
  });

  // User Authentication & RBAC state
  const [currentUser, setCurrentUser] = useState<AppUser>(() => getCurrentUser());
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => isSessionAuthenticated());
  const [isUserAuthOpen, setIsUserAuthOpen] = useState(false);
  const [isRemindersModalOpen, setIsRemindersModalOpen] = useState(false);
  const [internalAlerts, setInternalAlerts] = useState<AlertaInterno[]>(() => getStoredInternalAlerts());

  const handleLogout = () => {
    logoutUser();
    setIsAuthenticated(false);
    showToast('Sessão encerrada com sucesso. Faça login para continuar.');
  };

  // Active View Tab - Action Oriented (Default: Planilha Centralizada de Cobrança)
  const [activeTab, setActiveTab] = useState<'planilha' | 'financeiro' | 'crm' | 'relatorios'>('planilha');
  const [subTabRelatorios, setSubTabRelatorios] = useState<'relatorios_pdf' | 'dashboard_graficos' | 'comparativo_operadores'>('relatorios_pdf');

  // Sidebar navigation state (collapsible on desktop, drawer on mobile)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('valora_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Filters state
  const [selectedResponsavel, setSelectedResponsavel] = useState<string>('todos');
  const [selectedStatus, setSelectedStatus] = useState<string>('todos');
  const [selectedVencimento, setSelectedVencimento] = useState<string>('todos');
  const [selectedAba, setSelectedAba] = useState<string>('todos');
  const [quickFilterPreset, setQuickFilterPreset] = useState<QuickFilterPreset>('todos');

  // Operational Action Modals
  const [isRegistrarContatoOpen, setIsRegistrarContatoOpen] = useState(false);
  const [selectedRecordForAction, setSelectedRecordForAction] = useState<DebtRecord | null>(null);

  const [isNovaNegociacaoOpen, setIsNovaNegociacaoOpen] = useState(false);
  const [selectedRecordForNegociacao, setSelectedRecordForNegociacao] = useState<DebtRecord | null>(null);

  const [isRegistrarPagamentoOpen, setIsRegistrarPagamentoOpen] = useState(false);
  const [selectedRecordForPagamento, setSelectedRecordForPagamento] = useState<DebtRecord | null>(null);

  // Modals state
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isBulkCsvOpen, setIsBulkCsvOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isNewRecordOpen, setIsNewRecordOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<DebtRecord | null>(null);
  const [customerForContactHistory, setCustomerForContactHistory] = useState<DebtRecord | null>(null);
  const [waSession, setWaSession] = useState<WhatsAppSession>(() => getWhatsAppSession());
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [targetNotificationRecords, setTargetNotificationRecords] = useState<DebtRecord[]>([]);
  const [isRiskModalOpen, setIsRiskModalOpen] = useState(false);
  const [clientForRiskAnalysis, setClientForRiskAnalysis] = useState<DebtRecord | null>(null);
  const [isDuplicatesModalOpen, setIsDuplicatesModalOpen] = useState(false);
  const [startupReminders, setStartupReminders] = useState<LembreteAgendado[]>([]);
  const [isStartupRemindersOpen, setIsStartupRemindersOpen] = useState<boolean>(false);

  // Toast feedback state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Lead Reassignment Handlers (Adm Master)
  const handleBulkReassignLeads = (ids: string[], newResponsavel: string) => {
    if (currentUser.role !== 'adm_master') {
      showToast('Apenas o Administrador Master pode reatribuir leads.');
      return;
    }
    const updated = reassignRecords(records, ids, newResponsavel);
    setRecords(updated);
    showToast(`${ids.length} lead(s) reatribuído(s) com sucesso para ${newResponsavel}!`);
  };

  const handleReassignSingleLead = (id: string, newResponsavel: string) => {
    if (currentUser.role !== 'adm_master') {
      showToast('Apenas o Administrador Master pode reatribuir leads.');
      return;
    }
    const updated = reassignRecords(records, [id], newResponsavel);
    setRecords(updated);
    showToast(`Lead reatribuído com sucesso para ${newResponsavel}!`);
  };

  const handleReassignPortfolio = (fromResp: string, toResp: string) => {
    if (currentUser.role !== 'adm_master') {
      showToast('Apenas o Administrador Master pode reatribuir carteiras.');
      return;
    }
    const matchingIds = records
      .filter(r => (r.responsavel || 'GERAL').trim().toUpperCase() === fromResp.trim().toUpperCase())
      .map(r => r.id);
    
    if (matchingIds.length === 0) {
      showToast(`Nenhum cliente encontrado na carteira de ${fromResp}.`);
      return;
    }

    const updated = reassignRecords(records, matchingIds, toResp);
    setRecords(updated);
    showToast(`Carteira de ${fromResp} (${matchingIds.length} clientes) transferida para ${toResp}!`);
  };

  const handleSelectUser = (user: AppUser) => {
    setCurrentUser(user);
    saveCurrentUserStorage(user);
    if (user.role === 'operador') {
      setSelectedResponsavel(user.responsavelAssociado || 'todos');
    } else {
      setSelectedResponsavel('todos');
    }
  };

  // Filter records according to active user (RBAC)
  const userScopedRecords = useMemo(() => {
    return filterRecordsForUser(records, currentUser);
  }, [records, currentUser]);

  // Filter internal alerts according to active user
  const userScopedInternalAlerts = useMemo(() => {
    if (currentUser.role === 'adm_master') return internalAlerts;
    const userResp = (currentUser.responsavelAssociado || '').toUpperCase();
    return internalAlerts.filter(a => (a.responsavel || '').toUpperCase() === userResp);
  }, [internalAlerts, currentUser]);

  // Automatically check & generate alerts for clients with > 45 days of delinquency and daily due clients
  useEffect(() => {
    autoCheckAndGenerate45DaysAlerts(records);
    if (records.length > 0) {
      sendDailyDueClientsAlert(records, { currentUser, force: false });
    }
    setInternalAlerts(getStoredInternalAlerts());
  }, [records, currentUser]);

  // Check for startup reminders (recurrent or fixed date reminders due today/overdue with startup alert enabled)
  useEffect(() => {
    if (currentUser && records.length > 0) {
      scheduleWorkdayStartAlert(currentUser, records);
    }
    const due = checkStartupReminders(currentUser);
    if (due.length > 0) {
      setStartupReminders(due);
      setIsStartupRemindersOpen(true);
      playNotificationChime('alert');
    }
  }, [currentUser, records]);

  // Periodic Web Push check for due reminders and notifications (checks every 60s)
  useEffect(() => {
    checkAndDispatchDueWebNotifications(currentUser);
    const interval = setInterval(() => {
      checkAndDispatchDueWebNotifications(currentUser);
    }, 60000);
    return () => clearInterval(interval);
  }, [currentUser]);

  // Automated 08:00 Daily Critical Backup Scheduler
  useEffect(() => {
    if (records.length === 0) return;
    const stopScheduler = startDailyBackupScheduler(
      () => records,
      (meta) => {
        showToast(`💾 Snapshot Diário das 08:00 gravado com sucesso! ${meta.totalRegistros} registros protegidos.`);
      }
    );
    return () => stopScheduler();
  }, [records]);

  const handleOpenRiskModal = (record?: DebtRecord) => {
    setClientForRiskAnalysis(record || null);
    setIsRiskModalOpen(true);
  };

  const handleApplyRiskScores = (scores: Record<string, RiskScoreResult>) => {
    setRecords(prev => prev.map(r => {
      if (scores[r.id]) {
        return {
          ...r,
          scoreRisco: scores[r.id],
        };
      }
      return r;
    }));
    const count = Object.keys(scores).length;
    showToast(`${count} ${count === 1 ? 'score de risco aplicado' : 'scores de risco aplicados'} com sucesso via Gemini!`);
  };

  const handleMarkContactedToday = (recordId: string) => {
    const todayStr = new Date().toLocaleDateString('pt-BR');
    setRecords(prev => prev.map(r => {
      if (r.id === recordId) {
        return {
          ...r,
          contatoRealizado: 'SIM',
          dataUltimoContato: todayStr,
          status: r.status === 'sem_contato' || r.status === 'pendente' ? 'em_negociacao' : r.status,
          informacao: r.informacao 
            ? `${r.informacao} | [${todayStr}] Contato de cobrança realizado`
            : `[${todayStr}] Contato de cobrança realizado`,
        };
      }
      return r;
    }));
    showToast('Contato registrado com data de hoje!');
  };

  // Sync to local storage & IndexedDB safely
  useEffect(() => {
    persistAllRecords(records).catch(() => {});
  }, [records]);

  // Load from IndexedDB on initial mount if available & auto-prune audit logs older than 180 days
  useEffect(() => {
    cleanupLegacyStorageKeys();
    loadRecordsFromIndexedDB().then((dbRecords) => {
      if (dbRecords && Array.isArray(dbRecords) && dbRecords.length > 0) {
        setRecords(() => {
          const sanitized = sanitizeUniqueRecords(dbRecords);
          const enriched = sanitized.map(r => enrichDebtRecord(r));
          const { cleanedRecords, totalRemoved } = pruneOldAuditLogs(enriched, 180);
          if (totalRemoved > 0) {
            console.info(`[StorageService] ${totalRemoved} registros de auditoria antigos (>180 dias) foram limpos.`);
          }
          return cleanedRecords;
        });
      } else {
        // Prune initial state records as well
        setRecords(prev => {
          const { cleanedRecords, totalRemoved } = pruneOldAuditLogs(prev, 180);
          if (totalRemoved > 0) {
            console.info(`[StorageService] ${totalRemoved} registros de auditoria antigos (>180 dias) foram limpos.`);
          }
          return cleanedRecords;
        });
      }
    }).catch(err => {
      console.warn('[Storage] IndexedDB mount check:', err);
    });

    // Auto-create initial snapshot backup if none exists
    const latestMeta = getLatestBackupMetadata();
    if (!latestMeta && records.length > 0) {
      triggerCriticalBackup(records, 'Backup Inicial Automático do Sistema');
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(NOTIFICATIONS_COUNT_KEY, notificationsSentCount.toString());
    } catch (e) {
      console.warn('Failed to save notification count', e);
    }
  }, [notificationsSentCount]);

  // Critical counts on user-scoped records
  const criticalCount = useMemo(() => {
    return userScopedRecords.filter(r => calculateDaysOverdue(r.primeiroMesAtraso, r.diaVencimento) > 180).length;
  }, [userScopedRecords]);

  // Handlers
  const handleResetToDefault = () => {
    const latestBackup = getLatestBackupMetadata();
    const backupNotice = latestBackup 
      ? `\n\n(Dica: Há um backup automático salvo de ${latestBackup.dataHoraFormatada} com ${latestBackup.totalRegistros} registros).`
      : '';

    if (window.confirm(`Deseja restaurar os dados originais da planilha? Todas as alterações manuais serão reiniciadas.${backupNotice}`)) {
      // Salva snapshot de segurança antes do reset
      if (records.length > 0) {
        triggerCriticalBackup(records, 'Backup Pré-Restauração');
      }
      clearAllStoredRecords().catch(() => {});
      const fresh = parseBillingCsv(RAW_CSV_DATA);
      setRecords(sanitizeUniqueRecords(fresh));
      showToast('Planilha restaurada com sucesso! Backup de segurança gerado.');
    }
  };

  const handleImportSuccess = (newRecords: DebtRecord[], mode: 'replace' | 'append') => {
    const uniqueAbasCount = new Set(newRecords.map(r => r.abaOrigem).filter(Boolean)).size;
    const abasText = uniqueAbasCount > 1 ? ` (${uniqueAbasCount} abas da planilha reunidas)` : '';

    if (mode === 'replace') {
      const sanitized = sanitizeUniqueRecords(newRecords);
      setRecords(sanitized);
      setSelectedAba('todos');
      triggerCriticalBackup(sanitized, 'Importação de Planilha (Substituição Total)');
      showToast(`${newRecords.length} registros importados${abasText}! Base substituída com backup automático.`);
    } else {
      // Append without duplicating identical record (matricula + abaOrigem)
      const existingKeys = new Set(records.map(r => `${r.matricula}-${r.abaOrigem || ''}`));
      const filteredNew = newRecords.filter(r => !existingKeys.has(`${r.matricula}-${r.abaOrigem || ''}`));
      const updated = sanitizeUniqueRecords([...records, ...filteredNew]);
      setRecords(updated);
      triggerCriticalBackup(updated, 'Importação de Planilha (Incremento)');
      showToast(`${filteredNew.length} novos registros adicionados à central${abasText}! Backup automático gerado.`);
    }
  };

  const handleBulkAddSuccess = (
    newRecords: DebtRecord[],
    mode: 'merge' | 'append_only_new' | 'replace',
    summaryMessage: string
  ) => {
    if (mode === 'replace') {
      const sanitized = sanitizeUniqueRecords(newRecords);
      setRecords(sanitized);
      setSelectedAba('todos');
      triggerCriticalBackup(sanitized, 'Adição em Massa CSV (Substituição)');
    } else if (mode === 'append_only_new') {
      // Append only records whose matricula is not in current records
      const existingMats = new Set(records.map(r => (r.matricula || '').trim().toLowerCase()));
      const filtered = newRecords.filter(r => !existingMats.has((r.matricula || '').trim().toLowerCase()));
      const updated = sanitizeUniqueRecords([...filtered, ...records]);
      setRecords(updated);
      triggerCriticalBackup(updated, 'Adição em Massa CSV (Novos Registros)');
    } else {
      // Merge mode: update existing records with matched matricula, prepend new ones
      setRecords(prev => {
        const updateMap = new Map<string, DebtRecord>();
        newRecords.forEach(r => {
          const mat = (r.matricula || '').trim().toLowerCase();
          if (mat) updateMap.set(mat, r);
        });

        const updatedList = prev.map(existing => {
          const mat = (existing.matricula || '').trim().toLowerCase();
          if (mat && updateMap.has(mat)) {
            const incoming = updateMap.get(mat)!;
            updateMap.delete(mat);
            return {
              ...existing,
              cliente: incoming.cliente || existing.cliente,
              telefone: incoming.telefone || existing.telefone,
              responsavel: incoming.responsavel || existing.responsavel,
              diaVencimento: incoming.diaVencimento || existing.diaVencimento,
              primeiroMesAtraso: incoming.primeiroMesAtraso || existing.primeiroMesAtraso,
              valorOriginal: incoming.valorOriginal || existing.valorOriginal,
              valorAcordo: incoming.valorAcordo || existing.valorAcordo,
              status: incoming.status !== 'pendente' ? incoming.status : existing.status,
              informacao: incoming.informacao
                ? (existing.informacao ? `${existing.informacao} | ${incoming.informacao}` : incoming.informacao)
                : existing.informacao,
              dataRetorno: incoming.dataRetorno || existing.dataRetorno,
            };
          }
          return existing;
        });

        const brandNew = Array.from(updateMap.values());
        const finalized = sanitizeUniqueRecords([...brandNew, ...updatedList]);
        triggerCriticalBackup(finalized, 'Adição em Massa CSV (Mesclagem)');
        return finalized;
      });
    }
    showToast(`${summaryMessage} (Backup de segurança gerado)`);
  };

  // Action Handlers for Action-Oriented Modals
  const handleOpenRegistrarContato = (record?: DebtRecord) => {
    const target = record || userScopedRecords[0] || null;
    setSelectedRecordForAction(target);
    setIsRegistrarContatoOpen(true);
  };

  const handleOpenNovaNegociacao = (record?: DebtRecord) => {
    const target = record || userScopedRecords[0] || null;
    setSelectedRecordForNegociacao(target);
    setIsNovaNegociacaoOpen(true);
  };

  const handleOpenRegistrarPagamento = (record?: DebtRecord) => {
    const target = record || userScopedRecords[0] || null;
    setSelectedRecordForPagamento(target);
    setIsRegistrarPagamentoOpen(true);
  };

  const handleSaveModalContact = (recordId: string, contato: any, proximaAcao: string, dataProximaAcao: string) => {
    const now = new Date();
    const dateStr = now.toLocaleDateString('pt-BR');
    
    setRecords(prev => prev.map(r => {
      if (r.id === recordId) {
        const audit: ItemAuditoria = {
          id: `audit-${Date.now()}`,
          dataHora: `${dateStr} ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
          usuarioNome: currentUser.nome,
          usuarioEmail: currentUser.email,
          usuarioCargo: currentUser.cargo || (currentUser.role === 'adm_master' ? 'Adm Master' : 'Operadora'),
          tipoAcao: 'registro_contato',
          campoAlterado: 'Registro de Contato & Próxima Ação',
          valorAnterior: r.proximaAcao || 'Sem ação definida',
          valorNovo: `${proximaAcao} (${dataProximaAcao})`,
          motivo: contato.observacoes
        };

        const updatedHistory = r.historicoContatos ? [contato, ...r.historicoContatos] : [contato];

        return {
          ...r,
          contatoRealizado: 'SIM',
          dataUltimoContato: dateStr,
          proximaAcao,
          dataProximaAcao,
          status: r.status === 'sem_contato' || r.status === 'contato_a_realizar' ? 'em_negociacao' : r.status,
          historicoContatos: updatedHistory,
          logAuditoria: [audit, ...(r.logAuditoria || [])]
        };
      }
      return r;
    }));
    showToast(`Atendimento e próxima ação registrados com sucesso!`);
  };

  const handleSaveModalNegociacao = (recordId: string, neg: NegociacaoRecord) => {
    const now = new Date();
    const dateStr = now.toLocaleDateString('pt-BR');

    setRecords(prev => prev.map(r => {
      if (r.id === recordId) {
        const audit: ItemAuditoria = {
          id: `audit-${Date.now()}-neg`,
          dataHora: `${dateStr} ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
          usuarioNome: currentUser.nome,
          usuarioEmail: currentUser.email,
          usuarioCargo: currentUser.cargo || (currentUser.role === 'adm_master' ? 'Adm Master' : 'Operadora'),
          tipoAcao: 'mudanca_status',
          campoAlterado: 'Formalização de Acordo',
          valorAnterior: `Original: R$ ${r.valorOriginal || 0}`,
          valorNovo: `Negociado: R$ ${neg.valorNegociado} em ${neg.numeroParcelas}x`,
          motivo: neg.observacoes
        };

        return {
          ...r,
          valorAcordo: neg.valorNegociado,
          valorEmAberto: neg.valorNegociado,
          status: 'acordo_em_andamento',
          proximaAcao: `Acompanhar 1ª parcela (${neg.dataPrimeiroPagamento})`,
          dataProximaAcao: neg.dataPrimeiroPagamento,
          historicoNegociacoes: [neg, ...(r.historicoNegociacoes || [])],
          logAuditoria: [audit, ...(r.logAuditoria || [])]
        };
      }
      return r;
    }));
    showToast(`Acordo de R$ ${neg.valorNegociado.toFixed(2)} formalizado com sucesso!`);
  };

  const handleSaveModalPagamento = (recordId: string, pag: PagamentoRecord) => {
    const now = new Date();
    const dateStr = now.toLocaleDateString('pt-BR');

    setRecords(prev => prev.map(r => {
      if (r.id === recordId) {
        const curAberto = r.valorEmAberto !== undefined ? r.valorEmAberto : (r.valorOriginal || 120);
        const novoAberto = Math.max(0, curAberto - pag.valorPago);
        const novoPago = (r.valorPago || 0) + pag.valorPago;
        const novoStatus: StatusCobranca = novoAberto <= 0 ? 'pago' : 'acordo_em_andamento';

        const audit: ItemAuditoria = {
          id: `audit-${Date.now()}-pag`,
          dataHora: `${dateStr} ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
          usuarioNome: currentUser.nome,
          usuarioEmail: currentUser.email,
          usuarioCargo: currentUser.cargo || (currentUser.role === 'adm_master' ? 'Adm Master' : 'Operadora'),
          tipoAcao: 'mudanca_status',
          campoAlterado: 'Baixa de Pagamento',
          valorAnterior: `Em aberto: R$ ${curAberto}`,
          valorNovo: `Pago: R$ ${pag.valorPago} via ${pag.formaPagamento} (Restante: R$ ${novoAberto})`,
          motivo: pag.observacoes
        };

        return {
          ...r,
          valorEmAberto: novoAberto,
          valorPago: novoPago,
          valorRecuperado: novoPago,
          status: novoStatus,
          proximaAcao: novoAberto <= 0 ? 'Cliente regularizado e quitado' : 'Acompanhar próximo vencimento',
          historicoPagamentos: [pag, ...(r.historicoPagamentos || [])],
          logAuditoria: [audit, ...(r.logAuditoria || [])]
        };
      }
      return r;
    }));
    showToast(`Pagamento de R$ ${pag.valorPago.toFixed(2)} baixado com sucesso!`);
  };

  const handleQuickStatusChange = (id: string, newStatus: StatusCobranca) => {
    setRecords(prev => prev.map(r => {
      if (r.id === id) {
        return { ...r, status: newStatus };
      }
      return r;
    }));
    showToast('Status atualizado!');
  };

  const handleSaveEditedRecord = (updated: DebtRecord) => {
    setRecords(prev => prev.map(r => r.id === updated.id ? updated : r));
    showToast(`Cadastro de ${updated.cliente} atualizado!`);
  };

  const handleAddNewRecord = (newRec: DebtRecord) => {
    setRecords(prev => [newRec, ...prev]);
    showToast(`Cliente ${newRec.cliente} adicionado com sucesso!`);
  };

  const handleDirectWhatsApp = (record: DebtRecord) => {
    const days = calculateDaysOverdue(record.primeiroMesAtraso, record.diaVencimento);
    let template = DEFAULT_TEMPLATES[0].conteudo;

    if (record.status === 'acordo_fechado' || record.status === 'em_negociacao') {
      template = DEFAULT_TEMPLATES[2].conteudo;
    } else if (record.status === 'boleto_gerado') {
      template = DEFAULT_TEMPLATES[3].conteudo;
    } else if (days > 60) {
      template = DEFAULT_TEMPLATES[1].conteudo;
    }

    const message = formatMessage(template, record, days);
    const url = buildWhatsAppUrl(record.telefone || '31999999999', message);
    
    // Mark as contacted
    setRecords(prev => prev.map(r => {
      if (r.id === record.id) {
        return { ...r, whatsappStatus: 'OK', contatoRealizado: 'SIM' };
      }
      return r;
    }));
    setNotificationsSentCount(c => c + 1);

    window.open(url, '_blank');
    showToast(`WhatsApp aberto para ${record.cliente}! Notificação registrada.`);
  };

  const handleBulkNotify = (targetRecs: DebtRecord[]) => {
    setTargetNotificationRecords(targetRecs);
    setIsNotificationsOpen(true);
  };

  const handleDispatchNotifications = (targetAudience: DebtRecord[], template: TemplateMensagem) => {
    const targetIds = new Set(targetAudience.map(r => r.id));
    const now = new Date().toLocaleDateString('pt-BR');

    setRecords(prev => prev.map(r => {
      if (targetIds.has(r.id)) {
        return {
          ...r,
          whatsappStatus: 'OK',
          contatoRealizado: 'SIM',
          notificacoes: [
            ...r.notificacoes,
            {
              id: `notif-${Date.now()}-${r.id}`,
              data: now,
              canal: template.canal,
              tipo: template.tipo as any,
              mensagem: template.nome,
              status: 'enviada',
            }
          ]
        };
      }
      return r;
    }));

    setNotificationsSentCount(c => c + targetAudience.length);
    showToast(`${targetAudience.length} notificações de cobrança disparadas e registradas!`);
  };

  // If not authenticated, display the dedicated Initial Login Screen
  if (!isAuthenticated) {
    return (
      <>
        <LoginScreen
          onLoginSuccess={(user) => {
            handleSelectUser(user);
            setIsAuthenticated(true);
          }}
          onShowToast={showToast}
        />
        {toastMessage && (
          <div className="toast-notification no-print fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-lg border border-slate-700 flex items-center gap-2.5 text-xs font-medium animate-in fade-in slide-in-from-bottom-3">
            <BellRing className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-row font-sans">
      
      {/* Guia Lateral de Navegação (Sidebar) */}
      <AppSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        subTabRelatorios={subTabRelatorios}
        setSubTabRelatorios={setSubTabRelatorios}
        totalRecords={userScopedRecords.length}
        criticalCount={criticalCount}
        currentUser={currentUser}
        waSession={waSession}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={(collapsed) => {
          setIsSidebarCollapsed(prev => {
            const next = typeof collapsed === 'function' ? collapsed(prev) : collapsed;
            try { localStorage.setItem('valora_sidebar_collapsed', String(next)); } catch {}
            return next;
          });
        }}
        isMobileOpen={isMobileSidebarOpen}
        setIsMobileOpen={setIsMobileSidebarOpen}
        onOpenUserAuth={() => setIsUserAuthOpen(true)}
        onLogout={handleLogout}
        onOpenRiskModal={() => handleOpenRiskModal()}
        onOpenRemindersModal={() => setIsRemindersModalOpen(true)}
        onOpenNotifications={() => {
          setTargetNotificationRecords([]);
          setIsNotificationsOpen(true);
        }}
        onNewRecord={() => setIsNewRecordOpen(true)}
        onOpenBulkCsv={() => setIsBulkCsvOpen(true)}
        onOpenImport={() => setIsImportOpen(true)}
        onOpenExport={() => setIsExportOpen(true)}
        onOpenDuplicates={() => setIsDuplicatesModalOpen(true)}
        onOpenWhatsAppConnection={() => setIsWhatsAppModalOpen(true)}
        onResetToDefault={handleResetToDefault}
        onPrint={() => window.print()}
      />

      {/* Coluna Principal da Aplicação */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        {/* Top Main Navigation Header */}
        <Header
          totalRecords={userScopedRecords.length}
          criticalCount={criticalCount}
          notificationsSentCount={notificationsSentCount}
          currentUser={currentUser}
          waSession={waSession}
          onOpenUserAuth={() => setIsUserAuthOpen(true)}
          onLogout={handleLogout}
          onOpenRemindersModal={() => setIsRemindersModalOpen(true)}
          onOpenWhatsAppConnection={() => setIsWhatsAppModalOpen(true)}
          onOpenDuplicates={() => setIsDuplicatesModalOpen(true)}
          internalAlerts={userScopedInternalAlerts}
          onAlertsUpdated={() => setInternalAlerts(getStoredInternalAlerts())}
          records={userScopedRecords}
          onOpenImport={() => setIsImportOpen(true)}
          onOpenBulkCsv={() => setIsBulkCsvOpen(true)}
          onOpenExport={() => setIsExportOpen(true)}
          onOpenNotifications={() => {
            setTargetNotificationRecords([]);
            setIsNotificationsOpen(true);
          }}
          onNewRecord={() => setIsNewRecordOpen(true)}
          onResetToDefault={handleResetToDefault}
          onPrint={() => window.print()}
          onToggleMobileSidebar={() => setIsMobileSidebarOpen(prev => !prev)}
          activeTabTitle={
            activeTab === 'planilha' 
              ? 'Módulo Cobrança: Planilha Centralizada' 
              : activeTab === 'financeiro'
              ? 'Módulo Financeiro & Fluxo de Caixa'
              : activeTab === 'crm'
              ? 'Módulo CRM de Vendas & Pipeline Comercial'
              : 'Módulo Relatórios & Gráficos Gerenciais'
          }
          activeTabSubtitle={
            activeTab === 'planilha'
              ? `${userScopedRecords.length} clientes na visualização da sua carteira ativa`
              : activeTab === 'financeiro'
              ? 'Gestão de Contas a Receber, Contas a Pagar, Caixa e DRE Integrado'
              : activeTab === 'crm'
              ? 'Gestão de oportunidades comerciais, funil de vendas, follow-ups e novos contratos'
              : 'Indicadores financeiros consolidados, relatórios em PDF e gráficos de inadimplência'
          }
        />

        {/* Operator Scope Notification Banner */}
        {currentUser.role === 'operador' && (
          <div className="bg-blue-50 border-b border-blue-200 px-4 sm:px-8 py-2 text-xs text-blue-950 flex flex-wrap items-center justify-between gap-2 shadow-2xs no-print">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse"></span>
              <span>
                <strong>Sessão de Operadora Ativa: {currentUser.nome}</strong> • Visualizando exclusivamente os <strong>{userScopedRecords.length} clientes</strong> da sua carteira (<strong>{currentUser.responsavelAssociado}</strong>).
              </span>
            </div>
            <button
              onClick={() => setIsUserAuthOpen(true)}
              className="inline-flex items-center gap-1 font-bold text-blue-700 hover:text-blue-950 underline cursor-pointer text-xs"
            >
              <span>Trocar Operador / Acesso Adm Master</span>
            </button>
          </div>
        )}

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full space-y-6">
        
        {/* Print-only contextual section header */}
        <div className="print-only mb-4 pb-2 border-b border-slate-300 flex justify-between items-center text-xs text-slate-700">
          <span className="font-bold uppercase tracking-wider">
            Seção: {
              activeTab === 'planilha' 
                ? 'Módulo Cobrança: Planilha Centralizada' 
                : activeTab === 'financeiro'
                ? 'Módulo Financeiro & Fluxo de Caixa'
                : activeTab === 'crm'
                ? 'Módulo CRM de Vendas & Pipeline Comercial'
                : 'Módulo Relatórios & Indicadores de Inadimplência'
            }
          </span>
          <span>{userScopedRecords.length} clientes na visualização atual ({currentUser.role === 'adm_master' ? 'Acesso Global' : currentUser.responsavelAssociado})</span>
        </div>
        
        {/* Tab 1: Centralized Spreadsheet */}
        {activeTab === 'planilha' && (
          <div className="space-y-6 pb-28 sm:pb-24">
            
            {/* Painel de Filtros Rápidos (Abaixo da Barra de Navegação) */}
            <QuickFiltersPanel
              activePreset={quickFilterPreset}
              onSelectPreset={(preset) => {
                setQuickFilterPreset(preset);
                // Synchronize quick filter presets with existing filters when needed
                if (preset === 'minha_carteira') {
                  const resp = currentUser.responsavelAssociado || currentUser.nome.split(' ')[0].toUpperCase();
                  setSelectedResponsavel(resp);
                } else if (preset === 'todos') {
                  setSelectedResponsavel('todos');
                  setSelectedStatus('todos');
                  setSelectedVencimento('todos');
                }
              }}
              records={userScopedRecords}
              currentUser={currentUser}
              onResetAll={() => {
                setQuickFilterPreset('todos');
                setSelectedResponsavel('todos');
                setSelectedStatus('todos');
                setSelectedVencimento('todos');
              }}
            />

            {/* Sessão: Tarefas de Cobrança Pendentes (>30 dias sem contato) posicionada logo abaixo dos Filtros Rápidos */}
            <PendingCollectionTasks
              records={userScopedRecords}
              onDirectContact={handleDirectWhatsApp}
              onMarkContacted={handleMarkContactedToday}
              onAnalyzeRisk={handleOpenRiskModal}
              onOpenContactHistory={(rec) => setCustomerForContactHistory(rec)}
            />

            {/* Resumo de Performance das Operadoras em Tempo Real */}
            <OperatorPerformanceSummary
              records={records}
              selectedResponsavel={selectedResponsavel}
              onSelectResponsavel={setSelectedResponsavel}
              currentUser={currentUser}
              onAlertTriggered={(msg) => {
                showToast(msg);
                setInternalAlerts(getStoredInternalAlerts());
              }}
            />

            {/* Quick mini-summary bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div 
                onClick={() => { setSelectedStatus('todos'); setSelectedResponsavel('todos'); }}
                className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs hover:border-slate-300 cursor-pointer transition-colors"
              >
                <span className="text-[11px] font-bold uppercase text-slate-500 block">Total da Carteira</span>
                <span className="text-xl font-bold text-slate-900">{userScopedRecords.length}</span>
                <span className="text-[10px] text-slate-500 block">
                  {currentUser.role === 'adm_master' ? 'Todas as cobradoras' : `Cobradora ${currentUser.responsavelAssociado}`}
                </span>
              </div>

              <div 
                onClick={() => setSelectedStatus('acordo_fechado')}
                className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs hover:border-emerald-300 cursor-pointer transition-colors"
              >
                <span className="text-[11px] font-bold uppercase text-emerald-700 block">Acordos Firmados</span>
                <span className="text-xl font-bold text-emerald-700">
                  {userScopedRecords.filter(r => r.status === 'acordo_fechado').length}
                </span>
                <span className="text-[10px] text-emerald-600 block">Em regularização</span>
              </div>

              <div 
                onClick={() => setSelectedStatus('boleto_gerado')}
                className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs hover:border-blue-300 cursor-pointer transition-colors"
              >
                <span className="text-[11px] font-bold uppercase text-blue-700 block">Boletos Emitidos</span>
                <span className="text-xl font-bold text-blue-700">
                  {userScopedRecords.filter(r => r.status === 'boleto_gerado').length}
                </span>
                <span className="text-[10px] text-blue-600 block">Boleto 2026/2027</span>
              </div>

              <div 
                onClick={() => setSelectedStatus('critico')}
                className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs hover:border-rose-300 cursor-pointer transition-colors"
              >
                <span className="text-[11px] font-bold uppercase text-rose-700 block">Atrasos Críticos</span>
                <span className="text-xl font-bold text-rose-700">{criticalCount}</span>
                <span className="text-[10px] text-rose-600 block">+180 dias / 2025</span>
              </div>
            </div>

            {/* Widget de Projeção de Recuperação de Receita no Dashboard Principal */}
            <RevenueRecoveryProjectionWidget
              records={userScopedRecords}
              currentUser={currentUser}
              onFilterStatus={setSelectedStatus}
              onSelectResponsavel={setSelectedResponsavel}
            />

            {/* Interactive Unified Sheet Table */}
            <UnifiedSheetTable
              records={userScopedRecords}
              selectedResponsavel={selectedResponsavel}
              selectedStatus={selectedStatus}
              selectedVencimento={selectedVencimento}
              selectedAba={selectedAba}
              currentUser={currentUser}
              onSelectResponsavel={setSelectedResponsavel}
              onSelectStatus={setSelectedStatus}
              onSelectVencimento={setSelectedVencimento}
              onSelectAba={setSelectedAba}
              onEditRecord={(rec) => setEditingRecord(rec)}
              onOpenContactHistory={(rec) => setCustomerForContactHistory(rec)}
              onQuickStatusChange={handleQuickStatusChange}
              onDirectWhatsApp={handleDirectWhatsApp}
              onBulkNotify={handleBulkNotify}
              onAnalyzeWithGemini={handleOpenRiskModal}
              onOpenBulkCsv={() => setIsBulkCsvOpen(true)}
              onBulkReassign={handleBulkReassignLeads}
              onReassignSingle={handleReassignSingleLead}
              onOpenDuplicatesModal={() => setIsDuplicatesModalOpen(true)}
              onRegistrarPagamento={handleOpenRegistrarPagamento}
              onNovaNegociacao={handleOpenNovaNegociacao}
              quickFilterPreset={quickFilterPreset}
            />

          </div>
        )}

        {/* Tab 2: Módulo Financeiro & Controladoria */}
        {activeTab === 'financeiro' && (
          <FinanceiroView
            records={records}
            currentUser={currentUser}
            onShowToast={showToast}
            onGoToCobrança={() => setActiveTab('planilha')}
          />
        )}

        {/* Tab 3: Módulo CRM de Vendas & Pipeline Comercial */}
        {activeTab === 'crm' && (
          <CrmSalesView
            currentUser={currentUser}
            onShowToast={showToast}
          />
        )}

        {/* Tab 4: Real-time Delinquency Reports & Executive Summaries */}
        {activeTab === 'relatorios' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs no-print">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSubTabRelatorios('relatorios_pdf')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                    subTabRelatorios === 'relatorios_pdf'
                      ? 'bg-blue-700 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100'
                  }`}
                >
                  <FileText className="w-4 h-4 text-blue-200" />
                  <span>Resumo Gerencial em PDF &amp; Relatórios</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSubTabRelatorios('dashboard_graficos')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                    subTabRelatorios === 'dashboard_graficos'
                      ? 'bg-blue-700 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4 text-slate-500" />
                  <span>Dashboard Gráfico &amp; Indicadores</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSubTabRelatorios('comparativo_operadores')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                    subTabRelatorios === 'comparativo_operadores'
                      ? 'bg-blue-700 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100'
                  }`}
                >
                  <TrendingUp className="w-4 h-4 text-emerald-300" />
                  <span>Comparativo de Performance dos Operadores</span>
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                    subTabRelatorios === 'comparativo_operadores'
                      ? 'bg-emerald-400/20 text-emerald-200'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    Mês Atual
                  </span>
                </button>
              </div>

              <div className="text-xs text-slate-500 font-medium hidden lg:flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                <span>Relatórios oficiais para entrega gerencial • Valora Gestão &amp; Finanças</span>
              </div>
            </div>

            {subTabRelatorios === 'relatorios_pdf' ? (
              <RelatoriosView
                records={userScopedRecords}
                currentUser={currentUser}
                onSelectResponsavel={(resp) => {
                  setSelectedResponsavel(resp);
                  setActiveTab('planilha');
                }}
              />
            ) : subTabRelatorios === 'dashboard_graficos' ? (
              <OverviewDashboard
                records={userScopedRecords}
                currentUser={currentUser}
                onSelectResponsavel={(resp) => {
                  setSelectedResponsavel(resp);
                  setActiveTab('planilha');
                }}
                onFilterStatus={(st) => {
                  setSelectedStatus(st);
                  setActiveTab('planilha');
                }}
                onFilterVencimento={(dia) => {
                  setSelectedVencimento(dia);
                  setActiveTab('planilha');
                }}
                onSelectAba={(aba) => {
                  setSelectedAba(aba);
                  setActiveTab('planilha');
                }}
                onSelectClientForContact={(rec) => {
                  handleDirectWhatsApp(rec);
                }}
                onOpenRiskModal={handleOpenRiskModal}
              />
            ) : (
              <OperatorPerformanceComparisonPanel
                records={userScopedRecords}
                currentUser={currentUser}
                onSelectResponsavel={(resp) => {
                  setSelectedResponsavel(resp);
                  setActiveTab('planilha');
                }}
                onShowToast={showToast}
              />
            )}
          </div>
        )}

      </main>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="toast-notification no-print fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-lg border border-slate-700 flex items-center gap-2.5 text-xs font-medium animate-in fade-in slide-in-from-bottom-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Modals */}
      {isImportOpen && (
        <ImportSheetModal
          isOpen={isImportOpen}
          onClose={() => setIsImportOpen(false)}
          onImportSuccess={handleImportSuccess}
        />
      )}

      {isBulkCsvOpen && (
        <BulkAddClientsCsvModal
          isOpen={isBulkCsvOpen}
          onClose={() => setIsBulkCsvOpen(false)}
          existingRecords={records}
          onBulkAddSuccess={handleBulkAddSuccess}
        />
      )}

      {isExportOpen && (
        <ExportModal
          isOpen={isExportOpen}
          onClose={() => setIsExportOpen(false)}
          records={userScopedRecords}
        />
      )}

      {isNotificationsOpen && (
        <NotificationsCenterModal
          isOpen={isNotificationsOpen}
          onClose={() => setIsNotificationsOpen(false)}
          targetRecords={targetNotificationRecords}
          allRecords={userScopedRecords}
          onDispatchNotifications={handleDispatchNotifications}
        />
      )}

      {Boolean(editingRecord) && editingRecord && (
        <EditRecordModal
          isOpen={Boolean(editingRecord)}
          onClose={() => setEditingRecord(null)}
          record={editingRecord}
          onSave={handleSaveEditedRecord}
          onOpenContactHistory={(rec) => setCustomerForContactHistory(rec)}
        />
      )}

      {/* Customer Contact History Dossier Modal */}
      {Boolean(customerForContactHistory) && customerForContactHistory && (
        <CustomerContactHistoryModal
          isOpen={Boolean(customerForContactHistory)}
          onClose={() => setCustomerForContactHistory(null)}
          record={customerForContactHistory}
          currentUser={currentUser}
          waSession={waSession}
          onUpdateRecord={(updated) => {
            handleSaveEditedRecord(updated);
            setCustomerForContactHistory(updated);
          }}
          onShowToast={showToast}
        />
      )}

      {/* WhatsApp Web Connection via QR Code Modal */}
      {isWhatsAppModalOpen && (
        <WhatsAppConnectionModal
          isOpen={isWhatsAppModalOpen}
          onClose={() => setIsWhatsAppModalOpen(false)}
          currentUser={currentUser}
          onSessionChange={(newSession) => setWaSession(newSession)}
          onShowToast={showToast}
        />
      )}

      {isNewRecordOpen && (
        <NewRecordModal
          isOpen={isNewRecordOpen}
          onClose={() => setIsNewRecordOpen(false)}
          onAddRecord={handleAddNewRecord}
          onOpenBulkCsv={() => setIsBulkCsvOpen(true)}
        />
      )}

      {/* Gemini Risk Score Modal */}
      {isRiskModalOpen && (
        <GeminiRiskScoreModal
          isOpen={isRiskModalOpen}
          onClose={() => setIsRiskModalOpen(false)}
          records={userScopedRecords}
          initialSelectedRecord={clientForRiskAnalysis}
          onApplyScores={handleApplyRiskScores}
          onDirectContact={handleDirectWhatsApp}
        />
      )}

      {/* Nova Negociação Modal */}
      {isNovaNegociacaoOpen && selectedRecordForNegociacao && (
        <NovaNegociacaoModal
          isOpen={isNovaNegociacaoOpen}
          onClose={() => setIsNovaNegociacaoOpen(false)}
          record={selectedRecordForNegociacao}
          currentUser={currentUser}
          onSaveNegociacao={handleSaveModalNegociacao}
        />
      )}

      {/* Registrar Pagamento Modal */}
      {isRegistrarPagamentoOpen && selectedRecordForPagamento && (
        <RegistrarPagamentoModal
          isOpen={isRegistrarPagamentoOpen}
          onClose={() => setIsRegistrarPagamentoOpen(false)}
          record={selectedRecordForPagamento}
          currentUser={currentUser}
          onSavePagamento={handleSaveModalPagamento}
        />
      )}

      {/* Scheduled Reminders & Recurring Modal */}
      {isRemindersModalOpen && (
        <ScheduledRemindersModal
          isOpen={isRemindersModalOpen}
          onClose={() => setIsRemindersModalOpen(false)}
          records={userScopedRecords}
          currentUser={currentUser}
          onRecordUpdated={handleSaveEditedRecord}
          onShowToast={showToast}
        />
      )}

      {/* Startup Scheduled Reminders Pop-up */}
      {isStartupRemindersOpen && startupReminders.length > 0 && (
        <StartupRemindersModal
          isOpen={isStartupRemindersOpen}
          onClose={() => setIsStartupRemindersOpen(false)}
          currentUser={currentUser}
          records={userScopedRecords}
          reminders={startupReminders}
          onRemindersUpdated={() => {
            const updated = checkStartupReminders(currentUser);
            setStartupReminders(updated);
            if (updated.length === 0) {
              setIsStartupRemindersOpen(false);
            }
          }}
          onOpenManageReminders={() => {
            setIsStartupRemindersOpen(false);
            setIsRemindersModalOpen(true);
          }}
          onOpenAllReminders={() => {
            setIsStartupRemindersOpen(false);
            setIsRemindersModalOpen(true);
          }}
          onOpenClientDossier={(rec) => setCustomerForContactHistory(rec)}
          onShowToast={showToast}
        />
      )}

      {/* User Management & RBAC Modal */}
      {isUserAuthOpen && (
        <UserAuthModal
          isOpen={isUserAuthOpen}
          onClose={() => setIsUserAuthOpen(false)}
          currentUser={currentUser}
          onSelectUser={handleSelectUser}
          allRecords={records}
          onShowToast={showToast}
          onReassignPortfolio={handleReassignPortfolio}
          onLogout={handleLogout}
        />
      )}

      {/* Duplicate Contacts Management & Audit Modal */}
      {isDuplicatesModalOpen && (
        <DuplicateContactsModal
          isOpen={isDuplicatesModalOpen}
          onClose={() => setIsDuplicatesModalOpen(false)}
          records={records}
          onUpdateRecords={(newRecords) => {
            setRecords(newRecords);
            showToast('Registros de clientes atualizados com sucesso após resolução de duplicidades!');
          }}
          currentUser={currentUser}
          onShowToast={showToast}
        />
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span className="font-medium text-slate-700">Gestão de cobrança e inadimplência • Valora Gestão & Finanças</span>
          <span className="text-slate-400">Sessão: {currentUser.nome} ({currentUser.role === 'adm_master' ? 'Adm Master' : `Operador ${currentUser.responsavelAssociado}`})</span>
        </div>
      </footer>

      </div>

    </div>
  );
}
