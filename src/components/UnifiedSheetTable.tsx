import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  MessageSquare, 
  Edit3, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Check, 
  Phone,
  ChevronDown,
  ChevronUp,
  Calendar,
  Layers,
  Send,
  Sparkles,
  ArrowUpDown,
  X,
  Users,
  History,
  PhoneCall,
  Copy,
  UserCheck,
  AlertTriangle,
  Download,
  Zap,
  HelpCircle,
  Info,
  ShieldCheck,
  FileSpreadsheet,
  DollarSign,
  Handshake,
  TrendingUp
} from 'lucide-react';
import { DebtRecord, StatusCobranca, AppUser } from '../types';
import { calculateDaysOverdue, getAgingBucket, calculateDaysWithoutContact } from '../utils/sheetParser';
import { analyzeDuplicates } from '../utils/duplicateService';
import { exportUnifiedSheetToXlsx } from '../utils/excelExportService';
import { parseReturnDateStatus } from '../utils/dateUtils';
import { QuickFilterPreset } from './QuickFiltersPanel';
import { FixedSpreadsheetFooter } from './FixedSpreadsheetFooter';
import { ClientAuditLogQuickModal } from './ClientAuditLogQuickModal';

/**
 * Calculates if a given diaVencimento is due within the next N days (default 3 days)
 * relative to the system date context (2026-09-17) or current runtime date.
 */
export function isDueInNextDays(
  diaVencimento: number | undefined,
  daysAhead: number = 3
): { isUpcoming: boolean; daysRemaining: number } {
  if (!diaVencimento || isNaN(diaVencimento)) {
    return { isUpcoming: false, daysRemaining: -1 };
  }

  // Check both official system context date (17/09/2026) and runtime date
  const testDates = [
    new Date(2026, 8, 17), // 17 de Setembro de 2026
    new Date()
  ];

  for (const now of testDates) {
    const currentDay = now.getDate();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const midnightNow = new Date(currentYear, currentMonth, currentDay).getTime();
    const dueThisMonth = new Date(currentYear, currentMonth, diaVencimento).getTime();
    const dueNextMonth = new Date(currentYear, currentMonth + 1, diaVencimento).getTime();

    const diffThis = Math.round((dueThisMonth - midnightNow) / (1000 * 60 * 60 * 24));
    const diffNext = Math.round((dueNextMonth - midnightNow) / (1000 * 60 * 60 * 24));

    if (diffThis >= 0 && diffThis <= daysAhead) {
      return { isUpcoming: true, daysRemaining: diffThis };
    }
    if (diffNext >= 0 && diffNext <= daysAhead) {
      return { isUpcoming: true, daysRemaining: diffNext };
    }
  }

  return { isUpcoming: false, daysRemaining: -1 };
}

/**
 * Accessible, informative tooltip explaining the exact consolidation impact of each filter
 */
export const FilterTooltip: React.FC<{ title: string; content: string }> = ({ title, content }) => {
  const [show, setShow] = useState(false);

  return (
    <div className="relative inline-flex items-center ml-1 group">
      <button
        type="button"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onFocus={() => setShow(true)}
        onBlur={() => setShow(false)}
        onClick={(e) => {
          e.stopPropagation();
          setShow(prev => !prev);
        }}
        className="text-slate-400 hover:text-blue-600 focus:text-blue-600 focus:outline-hidden p-0.5 rounded cursor-help transition-colors"
        aria-label={`Ajuda: ${title}`}
        title={`${title}: ${content}`}
      >
        <HelpCircle className="w-3.5 h-3.5" />
      </button>

      {show && (
        <div 
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-slate-900 text-white text-[11px] rounded-xl shadow-2xl z-50 pointer-events-none transition-all leading-snug border border-slate-700 animate-in fade-in zoom-in-95 duration-100"
          style={{ minWidth: '220px', maxWidth: '280px' }}
        >
          <div className="font-bold text-blue-300 mb-1 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span>{title}</span>
          </div>
          <div className="text-slate-200">
            {content}
          </div>
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900"></div>
        </div>
      )}
    </div>
  );
};

export type UnifiedSortField = 
  | 'matricula' 
  | 'cliente' 
  | 'responsavel' 
  | 'dias' 
  | 'diaVencimento' 
  | 'valorOriginal' 
  | 'dataUltimoContato' 
  | 'status';

interface UnifiedSheetTableProps {
  records: DebtRecord[];
  selectedResponsavel: string;
  selectedStatus: string;
  selectedVencimento: string;
  selectedAba?: string;
  currentUser?: AppUser;
  onSelectResponsavel: (resp: string) => void;
  onSelectStatus: (status: string) => void;
  onSelectVencimento: (venc: string) => void;
  onSelectAba?: (aba: string) => void;
  onEditRecord: (record: DebtRecord) => void;
  onOpenContactHistory?: (record: DebtRecord) => void;
  onQuickStatusChange: (id: string, newStatus: StatusCobranca) => void;
  onDirectWhatsApp: (record: DebtRecord) => void;
  onBulkNotify: (selectedRecords: DebtRecord[]) => void;
  onAnalyzeWithGemini?: (record: DebtRecord) => void;
  onOpenBulkCsv?: () => void;
  onBulkReassign?: (ids: string[], newResponsavel: string) => void;
  onReassignSingle?: (id: string, newResponsavel: string) => void;
  onOpenDuplicatesModal?: () => void;
  onRegistrarPagamento?: (record: DebtRecord) => void;
  onNovaNegociacao?: (record: DebtRecord) => void;
  quickFilterPreset?: QuickFilterPreset;
}

export const UnifiedSheetTable: React.FC<UnifiedSheetTableProps> = ({
  records,
  selectedResponsavel,
  selectedStatus,
  selectedVencimento,
  selectedAba = 'todos',
  currentUser,
  onSelectResponsavel,
  onSelectStatus,
  onSelectVencimento,
  onSelectAba,
  onEditRecord,
  onOpenContactHistory,
  onQuickStatusChange,
  onDirectWhatsApp,
  onBulkNotify,
  onAnalyzeWithGemini,
  onOpenBulkCsv,
  onBulkReassign,
  onReassignSingle,
  onOpenDuplicatesModal,
  onRegistrarPagamento,
  onNovaNegociacao,
  quickFilterPreset = 'todos',
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [clientNameFilter, setClientNameFilter] = useState('');
  const [filterAging, setFilterAging] = useState<string>('todos'); // 'todos' | '2025' | '2026' | 'critico'
  const [onlyScheduled, setOnlyScheduled] = useState(false);
  const [onlyDuplicates, setOnlyDuplicates] = useState(false);
  const [dateStartFilter, setDateStartFilter] = useState('');
  const [dateEndFilter, setDateEndFilter] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const pageSize = 25;
  const [reassignTarget, setReassignTarget] = useState<string>('ROSANA');
  const [selectedAuditRecord, setSelectedAuditRecord] = useState<DebtRecord | null>(null);
  const [isExportingXlsx, setIsExportingXlsx] = useState<boolean>(false);

  // Analyze duplicates in current records
  const duplicatesAnalysis = useMemo(() => {
    return analyzeDuplicates(records);
  }, [records]);

  // List of available operators
  const availableOperatorsList = useMemo(() => {
    const set = new Set<string>();
    ['ROSANA', 'ANA LUIZA', 'KEYLLA', 'FABIOLA', 'GERAL'].forEach(r => set.add(r));
    records.forEach(r => {
      if (r.responsavel) set.add(r.responsavel.trim().toUpperCase());
    });
    return Array.from(set).sort();
  }, [records]);

  // Distinct tabs from all records
  const availableAbas = useMemo(() => {
    const set = new Set<string>();
    records.forEach(r => {
      if (r.abaOrigem) set.add(r.abaOrigem);
    });
    return Array.from(set).sort();
  }, [records]);

  // Sorting
  const [sortField, setSortField] = useState<UnifiedSortField>('dias');
  const [sortAsc, setSortAsc] = useState(false);

  const handleSort = (field: UnifiedSortField) => {
    if (sortField === field) {
      setSortAsc(prev => !prev);
    } else {
      setSortField(field);
      // For financial values, days overdue, and dates, descending first is natural
      if (field === 'valorOriginal' || field === 'dias' || field === 'dataUltimoContato') {
        setSortAsc(false);
      } else {
        setSortAsc(true);
      }
    }
    setPage(1);
  };

  // Helper to get normalized last contact date (YYYY-MM-DD)
  const getRecordLastContactDate = (r: DebtRecord): string | null => {
    if (r.historicoContatos && r.historicoContatos.length > 0) {
      const latest = r.historicoContatos[0]?.dataHora;
      if (latest && typeof latest === 'string') return latest.slice(0, 10);
    }
    const lastDate = r.dataUltimoContato;
    if (lastDate && typeof lastDate === 'string') {
      if (lastDate.includes('-')) {
        return lastDate.slice(0, 10);
      }
      if (lastDate.includes('/')) {
        const parts = lastDate.split('/');
        if (parts.length === 3) {
          return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
      }
    }
    return null;
  };

  // Filter logic
  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      // Aba filter
      if (selectedAba && selectedAba !== 'todos') {
        if ((r.abaOrigem || 'Geral') !== selectedAba) return false;
      }

      // Duplicates filter
      if (onlyDuplicates) {
        if (!duplicatesAnalysis.recordsWithDuplicatesIds.has(r.id)) return false;
      }

      // Last contact date range filter
      if (dateStartFilter || dateEndFilter) {
        const contactDate = getRecordLastContactDate(r);
        if (!contactDate) return false;
        if (dateStartFilter && contactDate < dateStartFilter) return false;
        if (dateEndFilter && contactDate > dateEndFilter) return false;
      }

      // Search by Client Name from Header Input in Real Time
      if (clientNameFilter && clientNameFilter.trim()) {
        const clientLower = clientNameFilter.trim().toLowerCase();
        if (!(r.cliente || '').toLowerCase().includes(clientLower)) {
          return false;
        }
      }

      // Search
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesClient = (r.cliente || '').toLowerCase().includes(searchLower);
        const matchesMatricula = (r.matricula || '').toLowerCase().includes(searchLower);
        const matchesInfo = (r.informacao || '').toLowerCase().includes(searchLower);
        const matchesDetail = r.detalheAdicional?.toLowerCase().includes(searchLower) || false;
        const matchesAba = r.abaOrigem?.toLowerCase().includes(searchLower) || false;
        const matchesPhone = (r.telefone || '').includes(searchLower);
        if (!matchesClient && !matchesMatricula && !matchesInfo && !matchesDetail && !matchesAba && !matchesPhone) {
          return false;
        }
      }

      // Quick Filter Preset filter (Filtros Rápidos)
      if (quickFilterPreset && quickFilterPreset !== 'todos') {
        const isPaid = r.status === 'pago' || r.status === 'recuperado';
        if (quickFilterPreset === 'vencendo_hoje') {
          const currentDay = new Date().getDate();
          if (Number(r.diaVencimento) !== currentDay || isPaid) return false;
        } else if (quickFilterPreset === 'minha_carteira') {
          const userResp = (currentUser?.responsavelAssociado || currentUser?.nome || '').toUpperCase().trim();
          const recResp = (r.responsavel || '').toUpperCase().trim();
          if (!userResp) return true;
          if (!recResp.includes(userResp) && !userResp.includes(recResp)) return false;
        } else if (quickFilterPreset === 'acordos_ativos') {
          if (r.status !== 'acordo_fechado' && r.status !== 'em_negociacao' && r.status !== 'boleto_gerado') return false;
        } else if (quickFilterPreset === 'pendencia_retorno') {
          if (!r.dataRetorno || !r.dataRetorno.trim() || isPaid) return false;
        } else if (quickFilterPreset === 'criticos') {
          const days = calculateDaysOverdue(r.primeiroMesAtraso || '', r.diaVencimento);
          if (days <= 45 || isPaid) return false;
        }
      }

      // Responsavel
      if (selectedResponsavel !== 'todos') {
        if (r.responsavel !== selectedResponsavel) return false;
      }

      // Status
      if (selectedStatus !== 'todos') {
        if (selectedStatus === 'critico') {
          const days = calculateDaysOverdue(r.primeiroMesAtraso || '', r.diaVencimento);
          if (days <= 180) return false;
        } else if (r.status !== selectedStatus) {
          return false;
        }
      }

      // Vencimento
      if (selectedVencimento !== 'todos') {
        if (r.diaVencimento?.toString() !== selectedVencimento) return false;
      }

      // Aging
      if (filterAging === '2025') {
        if (!(r.primeiroMesAtraso || '').includes('/25')) return false;
      } else if (filterAging === '2026') {
        if (!(r.primeiroMesAtraso || '').includes('/26')) return false;
      } else if (filterAging === 'critico') {
        const days = calculateDaysOverdue(r.primeiroMesAtraso || '', r.diaVencimento);
        if (days <= 180) return false;
      }

      // Only scheduled
      if (onlyScheduled) {
        if (!r.dataRetorno && !(r.informacao && r.informacao.toUpperCase().includes('AGEND'))) return false;
      }

      return true;
    }).sort((a, b) => {
      let comparison = 0;
      if (sortField === 'cliente') {
        comparison = (a.cliente || '').localeCompare(b.cliente || '', 'pt-BR', { sensitivity: 'base' });
      } else if (sortField === 'matricula') {
        comparison = (a.matricula || '').localeCompare(b.matricula || '', undefined, { numeric: true });
      } else if (sortField === 'responsavel') {
        comparison = (a.responsavel || '').localeCompare(b.responsavel || '', 'pt-BR');
      } else if (sortField === 'diaVencimento') {
        comparison = (a.diaVencimento || 0) - (b.diaVencimento || 0);
      } else if (sortField === 'dias') {
        const daysA = calculateDaysOverdue(a.primeiroMesAtraso || '', a.diaVencimento || 0);
        const daysB = calculateDaysOverdue(b.primeiroMesAtraso || '', b.diaVencimento || 0);
        comparison = daysA - daysB;
      } else if (sortField === 'valorOriginal') {
        const valA = a.valorOriginal ?? a.valorEmAberto ?? 0;
        const valB = b.valorOriginal ?? b.valorEmAberto ?? 0;
        comparison = valA - valB;
      } else if (sortField === 'dataUltimoContato') {
        const dateA = getRecordLastContactDate(a) || '';
        const dateB = getRecordLastContactDate(b) || '';
        if (!dateA && !dateB) comparison = 0;
        else if (!dateA) comparison = -1;
        else if (!dateB) comparison = 1;
        else comparison = dateA.localeCompare(dateB);
      } else if (sortField === 'status') {
        comparison = (a.status || '').localeCompare(b.status || '');
      }
      return sortAsc ? comparison : -comparison;
    });
  }, [
    records, 
    searchTerm, 
    clientNameFilter,
    selectedResponsavel, 
    selectedStatus, 
    selectedVencimento, 
    selectedAba, 
    filterAging, 
    onlyScheduled, 
    onlyDuplicates, 
    dateStartFilter, 
    dateEndFilter, 
    sortField, 
    sortAsc, 
    duplicatesAnalysis
  ]);

  // Calculate records with upcoming due dates in next 3 days
  const upcomingDueRecordsCount = useMemo(() => {
    return filteredRecords.filter(r => isDueInNextDays(r.diaVencimento, 3).isUpcoming).length;
  }, [filteredRecords]);

  // Paginated records
  const totalPages = Math.ceil(filteredRecords.length / pageSize) || 1;
  const currentPageRecords = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, page, pageSize]);

  // Handle select all on current view
  const allCurrentSelected = currentPageRecords.length > 0 && currentPageRecords.every(r => selectedIds.has(r.id));

  const toggleSelectAllCurrent = () => {
    const next = new Set(selectedIds);
    if (allCurrentSelected) {
      currentPageRecords.forEach(r => next.delete(r.id));
    } else {
      currentPageRecords.forEach(r => next.add(r.id));
    }
    setSelectedIds(next);
  };

  const toggleSelectRow = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  // Dynamic real-time financial totals calculation for the current filtered records slice
  const dynamicFinancialTotals = useMemo(() => {
    let totalValorEmAberto = 0;
    let totalValorRecuperado = 0;

    for (const r of filteredRecords) {
      const orig = r.valorOriginal ?? 120;
      const pago = r.valorRecuperado || r.valorPago || (r.status === 'pago' || r.status === 'recuperado' ? orig : 0);
      const aberto = r.valorEmAberto !== undefined 
        ? r.valorEmAberto 
        : (r.status === 'pago' || r.status === 'recuperado' ? 0 : Math.max(0, orig - pago));

      totalValorEmAberto += aberto;
      totalValorRecuperado += pago;
    }

    return { totalValorEmAberto, totalValorRecuperado };
  }, [filteredRecords]);

  // Taxa de Conversão de Acordos: Calcula automaticamente a porcentagem de clientes que migraram de 'pendente' para 'acordo_fechado' na visão atual
  const agreementConversionMetrics = useMemo(() => {
    const totalInView = filteredRecords.length;
    if (totalInView === 0) {
      return {
        totalInView: 0,
        totalAcordos: 0,
        totalPendentes: 0,
        baseElegivel: 0,
        taxa: 0,
        taxaTotalView: 0,
        valorTotalAcordos: 0,
      };
    }

    // Clientes na visão atual que fecharam acordo (status acordo_fechado ou transição registrada no log)
    const acordosRecords = filteredRecords.filter(r => {
      if (r.status === 'acordo_fechado') return true;
      const hasConvertedAudit = r.logAuditoria?.some(item => 
        (item.tipoAcao === 'mudanca_status' || item.campoAlterado?.toLowerCase().includes('status') || item.campoAlterado?.toLowerCase().includes('acordo')) &&
        (item.valorNovo === 'acordo_fechado' || item.valorNovo?.toLowerCase().includes('acordo'))
      );
      return Boolean(hasConvertedAudit);
    });

    const totalAcordos = acordosRecords.length;

    // Clientes que continuam com status pendente/em atraso
    const totalPendentes = filteredRecords.filter(r => 
      r.status === 'pendente' || r.status === 'em_atraso' || r.status === 'contato_a_realizar'
    ).length;

    // Base elegível da migração (aqueles que foram convertidos em acordo + aqueles que ainda estão pendentes)
    const baseElegivel = totalAcordos + totalPendentes;

    // Taxa de conversão sobre a base elegível de pendentes/acordos (ou fallback sobre o total da visão)
    const taxa = baseElegivel > 0 
      ? (totalAcordos / baseElegivel) * 100 
      : (totalAcordos / totalInView) * 100;

    const taxaTotalView = (totalAcordos / totalInView) * 100;

    const valorTotalAcordos = acordosRecords.reduce((sum, r) => {
      return sum + (r.valorAcordo || r.valorOriginal || 120);
    }, 0);

    return {
      totalInView,
      totalAcordos,
      totalPendentes,
      baseElegivel,
      taxa,
      taxaTotalView,
      valorTotalAcordos,
    };
  }, [filteredRecords]);

  // Clears all search & filter criteria back to default
  const handleClearAllFilters = () => {
    setSearchTerm('');
    setClientNameFilter('');
    setFilterAging('todos');
    setOnlyScheduled(false);
    setOnlyDuplicates(false);
    setDateStartFilter('');
    setDateEndFilter('');
    onSelectResponsavel('todos');
    onSelectStatus('todos');
    onSelectVencimento('todos');
    if (onSelectAba) onSelectAba('todos');
    setPage(1);
  };

  // Export only currently filtered records to a formatted CSV file
  const handleExportFilteredCsv = () => {
    if (filteredRecords.length === 0) {
      alert('Nenhum registro encontrado para exportar com os filtros atuais.');
      return;
    }

    const headers = [
      'Matrícula',
      'Nome do Cliente',
      'Telefone',
      'Cobradora / Responsável',
      'Aba de Origem',
      'Primeiro Mês de Atraso',
      'Dia de Vencimento',
      'Dias em Atraso',
      'Faixa Aging',
      'Valor Original (R$)',
      'Valor em Aberto (R$)',
      'Valor Recuperado (R$)',
      'Status da Cobrança',
      'Último Contato',
      'Data de Retorno',
      'Informações & Histórico',
      'Detalhes Adicionais'
    ];

    const escapeCsvCell = (value: string | number | null | undefined): string => {
      if (value === null || value === undefined) return '""';
      const str = String(value).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = filteredRecords.map(r => {
      const days = calculateDaysOverdue(r.primeiroMesAtraso || '', r.diaVencimento);
      const bucket = getAgingBucket(days);
      const orig = r.valorOriginal ?? 120;
      const pago = r.valorRecuperado || r.valorPago || (r.status === 'pago' || r.status === 'recuperado' ? orig : 0);
      const aberto = r.valorEmAberto !== undefined 
        ? r.valorEmAberto 
        : (r.status === 'pago' || r.status === 'recuperado' ? 0 : Math.max(0, orig - pago));
      
      const lastContact = r.dataUltimoContato || 
        (r.historicoContatos && r.historicoContatos.length > 0 
          ? r.historicoContatos[r.historicoContatos.length - 1].dataHora 
          : '');

      return [
        escapeCsvCell(r.matricula),
        escapeCsvCell(r.cliente),
        escapeCsvCell(r.telefone || ''),
        escapeCsvCell(r.responsavel || 'GERAL'),
        escapeCsvCell(r.abaOrigem || 'Geral'),
        escapeCsvCell(r.primeiroMesAtraso || ''),
        escapeCsvCell(r.diaVencimento ?? ''),
        escapeCsvCell(days),
        escapeCsvCell(bucket.label),
        escapeCsvCell(orig.toFixed(2).replace('.', ',')),
        escapeCsvCell(aberto.toFixed(2).replace('.', ',')),
        escapeCsvCell(pago.toFixed(2).replace('.', ',')),
        escapeCsvCell(r.status || 'pendente'),
        escapeCsvCell(lastContact),
        escapeCsvCell(r.dataRetorno || ''),
        escapeCsvCell(r.informacao || ''),
        escapeCsvCell(r.detalheAdicional || '')
      ].join(';');
    });

    // UTF-8 BOM so Excel opens properly in Portuguese
    const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const timeStr = `${String(now.getHours()).padStart(2, '0')}h${String(now.getMinutes()).padStart(2, '0')}`;
    link.href = url;
    link.download = `cobranca_export_filtro_${dateStr}_${timeStr}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportFilteredXlsx = async () => {
    if (filteredRecords.length === 0) {
      alert('Nenhum registro selecionado ou filtrado para exportar.');
      return;
    }
    setIsExportingXlsx(true);
    try {
      const activeFiltersDesc = [
        selectedResponsavel !== 'todos' ? `Cobradora: ${selectedResponsavel}` : null,
        selectedStatus !== 'todos' ? `Status: ${selectedStatus}` : null,
        selectedVencimento !== 'todos' ? `Vencimento: Dia ${selectedVencimento}` : null,
        filterAging !== 'todos' ? `Aging: ${filterAging}` : null,
        searchTerm ? `Busca: "${searchTerm}"` : null
      ].filter(Boolean).join(' | ');

      await exportUnifiedSheetToXlsx(filteredRecords, {
        filterDescription: activeFiltersDesc || 'Todos os registros filtrados na tabela',
      });
    } catch (err) {
      console.error('Erro ao exportar planilha XLSX:', err);
      alert('Ocorreu um erro ao gerar a planilha Excel. Tente novamente.');
    } finally {
      setIsExportingXlsx(false);
    }
  };

  const handleBulkNotifyAction = () => {
    const selectedRecords = records.filter(r => selectedIds.has(r.id));
    if (selectedRecords.length > 0) {
      onBulkNotify(selectedRecords);
    }
  };

  const getResponsavelBadgeClass = (resp: string) => {
    switch (resp) {
      case 'ROSANA':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'ANA LUIZA':
        return 'bg-pink-50 text-pink-700 border-pink-200';
      case 'KEYLLA':
        return 'bg-cyan-50 text-cyan-800 border-cyan-200';
      case 'FABIOLA':
        return 'bg-teal-50 text-teal-800 border-teal-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getStatusBadge = (status: StatusCobranca) => {
    switch (status) {
      case 'acordo_fechado':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle className="w-3 h-3 text-emerald-600" />
            Acordo Fechado
          </span>
        );
      case 'em_negociacao':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
            <Clock className="w-3 h-3 text-amber-600" />
            Em Negociação
          </span>
        );
      case 'boleto_gerado':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-300">
            <Check className="w-3 h-3 text-blue-600" />
            Boleto Emitido
          </span>
        );
      case 'sem_contato':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-300">
            <AlertCircle className="w-3 h-3 text-slate-500" />
            Sem Contato / WPP
          </span>
        );
      case 'pago':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 border border-green-300">
            <CheckCircle className="w-3 h-3 text-green-600" />
            Liquidado
          </span>
        );
      case 'cancelado':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200">
            <AlertCircle className="w-3 h-3 text-red-600" />
            Cancelado / Multa
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <Clock className="w-3 h-3 text-rose-500" />
            Pendente
          </span>
        );
    }
  };

  const renderSortHeader = (field: UnifiedSortField, label: string, extraClasses = '') => {
    const isActive = sortField === field;
    return (
      <th 
        id={`th-sort-${field}`}
        className={`p-3 select-none transition-colors border-b border-slate-200 bg-slate-50 sticky top-0 z-10 ${extraClasses} ${
          isActive ? 'bg-blue-50/90 text-blue-950 font-bold border-b-2 border-blue-600' : 'text-slate-700'
        }`}
      >
        <div 
          onClick={() => handleSort(field)}
          className="flex items-center gap-1.5 whitespace-nowrap cursor-pointer hover:text-blue-900 group"
          title={`Clique para ordenar por ${label} (${isActive ? (sortAsc ? 'ordem decrescente' : 'ordem crescente') : 'clique para ordenar'})`}
        >
          <span>{label}</span>
          {isActive ? (
            <span className="inline-flex items-center text-blue-700 bg-blue-100 rounded p-0.5 shadow-2xs">
              {sortAsc ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </span>
          ) : (
            <ArrowUpDown className="w-3 h-3 text-slate-400 group-hover:text-slate-600 transition-colors opacity-60 group-hover:opacity-100" />
          )}
        </div>

        {/* Campo de busca por texto dentro do cabeçalho para filtrar em tempo real pelo nome do cliente */}
        {field === 'cliente' && (
          <div 
            className="mt-1.5 flex items-center gap-1 no-print min-w-[150px]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative flex-1">
              <Search className="w-3 h-3 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="header-client-search-input"
                name="headerClientSearchInput"
                type="text"
                placeholder="Buscar cliente..."
                value={clientNameFilter}
                onChange={(e) => {
                  setClientNameFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-6 pr-5 py-1 text-[11px] font-normal normal-case text-slate-800 bg-white border border-slate-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-slate-400 shadow-2xs transition-all"
                title="Filtrar registros exibidos na tabela em tempo real pelo nome do cliente"
              />
              {clientNameFilter && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setClientNameFilter('');
                    setPage(1);
                  }}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-0.5 rounded cursor-pointer"
                  title="Limpar busca de cliente"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
            <FilterTooltip
              title="Filtro de Coluna: Cliente"
              content="Pesquisa direta pelo nome nesta coluna. Impacto: isola registros específicos preservando os demais filtros ativos da tela."
            />
          </div>
        )}
      </th>
    );
  };

  return (
    <div id="unified-sheet-container" className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
      
      {/* Widget 'Taxa de Conversão de Acordos' no topo da UnifiedSheetTable */}
      <div 
        id="widget-taxa-conversao-acordos" 
        className="px-4 py-2.5 bg-slate-50/90 border-b border-slate-200 no-print flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
      >
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-300/70 shadow-2xs">
              <TrendingUp className="w-4 h-4 text-emerald-700" />
            </span>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-800 text-xs sm:text-sm">Taxa de Conversão de Acordos</span>
                <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-100/80 border border-emerald-300/80 px-1.5 py-0.2 rounded-full">
                  Visão Atual
                </span>
                <FilterTooltip
                  title="Taxa de Conversão de Acordos"
                  content={`Calcula automaticamente a porcentagem de clientes que migraram de 'Pendente' para 'Acordo Fechado' considerando os filtros atuais (${agreementConversionMetrics.totalAcordos} acordos de ${agreementConversionMetrics.baseElegivel} clientes na base pendente/acordo, representando ${agreementConversionMetrics.taxaTotalView.toFixed(1)}% do total listado).`}
                />
              </div>
              <p className="text-[11px] text-slate-500">
                Migração de clientes de <span className="font-semibold text-slate-700">pendente</span> para <span className="font-semibold text-emerald-700">acordo fechado</span> na filtragem ativa
              </p>
            </div>
          </div>

          {/* Metric Value & Mini Progress Bar */}
          <div className="flex items-center gap-3 pl-0 sm:pl-3 sm:border-l sm:border-slate-200">
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-extrabold text-emerald-700 tracking-tight">
                {agreementConversionMetrics.taxa.toFixed(1)}%
              </span>
              <span className="text-[11px] text-slate-500 font-medium">conversão</span>
            </div>

            {/* Visual Mini Progress Bar */}
            <div className="hidden sm:flex flex-col gap-1 w-24 sm:w-28" title={`Taxa de conversão: ${agreementConversionMetrics.taxa.toFixed(1)}%`}>
              <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-emerald-600 h-full rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(0, agreementConversionMetrics.taxa))}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Quantitive Breakdown Badges */}
        <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
          <span 
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200/80 font-medium"
            title="Quantidade de clientes na visão que fecharam acordo"
          >
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
            <span><strong>{agreementConversionMetrics.totalAcordos}</strong> {agreementConversionMetrics.totalAcordos === 1 ? 'acordo fechado' : 'acordos fechados'}</span>
            {agreementConversionMetrics.valorTotalAcordos > 0 && (
              <span className="text-emerald-700 font-bold ml-0.5 hidden lg:inline">
                ({agreementConversionMetrics.valorTotalAcordos.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })})
              </span>
            )}
          </span>

          <span 
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-900 border border-amber-200/80 font-medium"
            title="Quantidade de clientes que continuam com pendência na visão atual"
          >
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span><strong>{agreementConversionMetrics.totalPendentes}</strong> {agreementConversionMetrics.totalPendentes === 1 ? 'pendente' : 'pendentes'}</span>
          </span>

          <span 
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 font-medium"
            title="Total de clientes listados nos filtros ativos"
          >
            <span>Base total: <strong>{agreementConversionMetrics.totalInView}</strong></span>
          </span>
        </div>
      </div>

      {/* Top Filter & Action Bar */}
      <div className="p-4 border-b border-slate-200 space-y-3 bg-slate-50/50 no-print">
        
        {/* Real-Time Filter Text Input Field (Client Name or Registration Number) */}
        <div className="space-y-1.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <label 
              htmlFor="filter-client-or-matricula-input" 
              className="text-xs font-semibold text-slate-700 flex items-center gap-1"
            >
              <Search className="w-3.5 h-3.5 text-blue-600" />
              <span>Filtrar em Tempo Real (Cliente ou Matrícula)</span>
              <FilterTooltip
                title="Filtro Geral (Cliente ou Matrícula)"
                content="Filtra a base em tempo real conforme a digitação. Impacto: recalcula a lista visível e os indicadores consolidados para coincidir com o termo digitado."
              />
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {onOpenBulkCsv && (
                <button
                  type="button"
                  id="btn-table-bulk-add-csv"
                  onClick={onOpenBulkCsv}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 hover:text-blue-900 border border-blue-200 rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                  title="Adicionar clientes em massa via planilha CSV"
                >
                  <Users className="w-3.5 h-3.5 text-blue-600" />
                  <span>+ Adicionar em Massa (CSV)</span>
                </button>
              )}

              {/* Botão Exportar .XLSX Real com Cores e Formatação */}
              <button
                type="button"
                id="btn-exportar-xlsx"
                onClick={handleExportFilteredXlsx}
                disabled={isExportingXlsx}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-60"
                title="Exportar a planilha filtrada diretamente para um arquivo .xlsx real com cores de status e prioridades de vencimento preservadas"
              >
                <FileSpreadsheet className={`w-3.5 h-3.5 ${isExportingXlsx ? 'animate-spin' : ''}`} />
                <span>{isExportingXlsx ? 'Gerando .XLSX...' : 'Exportar .XLSX'}</span>
              </button>

              {/* Botão Exportar CSV */}
              <button
                type="button"
                id="btn-exportar-filtro"
                onClick={handleExportFilteredCsv}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                title="Exportar dados atualmente filtrados na tabela em arquivo CSV simples"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>CSV</span>
              </button>

              <span className="text-[11px] font-medium text-slate-600 bg-white border border-slate-200 px-2.5 py-0.5 rounded-full shadow-2xs">
                <strong>{filteredRecords.length}</strong> {filteredRecords.length === 1 ? 'cliente listado' : 'clientes listados'}
                {(searchTerm.trim() || clientNameFilter.trim()) && (
                  <span className="text-blue-700 ml-1 font-semibold">(de {records.length} total)</span>
                )}
              </span>
            </div>
          </div>

          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="filter-client-or-matricula-input"
              name="filterClientOrMatricula"
              data-testid="search-input"
              type="text"
              placeholder="Filtrar por nome do cliente ou número de matrícula..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-24 py-2.5 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-slate-400 shadow-2xs"
            />
            {searchTerm && (
              <button
                id="clear-search-button"
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setPage(1);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-md transition-colors font-medium border border-slate-200"
                title="Limpar filtro"
              >
                <X className="w-3.5 h-3.5" />
                <span>Limpar</span>
              </button>
            )}
          </div>
        </div>

        {/* Secondary Quick Filter Selects */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/80">
          <div className="flex flex-wrap items-center gap-2">
            {/* Responsavel Filter */}
            {currentUser?.role === 'operador' ? (
              <div className="flex items-center gap-1.5 text-xs bg-blue-50 text-blue-950 border border-blue-200 px-2.5 py-1 rounded-lg">
                <span className="font-semibold text-blue-800">Sua Carteira:</span>
                <span className="font-bold">{currentUser.responsavelAssociado}</span>
                <span className="text-[10px] text-blue-700">({currentUser.nome.split(' ')[0]})</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-xs">
                <label htmlFor="select-responsavel" className="text-slate-500 font-medium flex items-center">
                  Cobradora:
                  <FilterTooltip
                    title="Filtro por Cobradora (Responsável)"
                    content="Segmenta os devedores pela cobradora atribuída. Impacto: consolida métricas e filas de atendimento exclusivas da profissional selecionada."
                  />
                </label>
                <select
                  id="select-responsavel"
                  value={selectedResponsavel}
                  onChange={(e) => {
                    onSelectResponsavel(e.target.value);
                    setPage(1);
                  }}
                  className="py-1.5 px-2.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                >
                  <option value="todos">Todas as Cobradoras</option>
                  <option value="ROSANA">Rosana</option>
                  <option value="ANA LUIZA">Ana Luiza</option>
                  <option value="KEYLLA">Keylla</option>
                  <option value="FABIOLA">Fabíola</option>
                  <option value="GERAL">Geral</option>
                </select>
              </div>
            )}

            {/* Aba da Planilha Filter */}
            {availableAbas.length > 0 && onSelectAba && (
              <div className="flex items-center gap-1 text-xs">
                <label htmlFor="select-aba" className="text-slate-500 font-medium flex items-center">
                  Aba:
                  <FilterTooltip
                    title="Filtro por Aba de Origem"
                    content="Filtra os dados pela aba de origem na importação. Impacto: permite analisar os lotes mantendo a integridade da segmentação do arquivo original."
                  />
                </label>
                <select
                  id="select-aba"
                  value={selectedAba}
                  onChange={(e) => {
                    onSelectAba(e.target.value);
                    setPage(1);
                  }}
                  className="py-1.5 px-2.5 bg-blue-50/60 border border-blue-200 rounded-lg text-xs font-semibold text-blue-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                >
                  <option value="todos">Todas as Abas ({records.length})</option>
                  {availableAbas.map(aba => (
                    <option key={aba} value={aba}>
                      {aba} ({records.filter(r => (r.abaOrigem || 'Geral') === aba).length})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Status Filter */}
            <div className="flex items-center gap-1 text-xs">
              <label htmlFor="select-status" className="text-slate-500 font-medium flex items-center">
                Status:
                <FilterTooltip
                  title="Filtro por Status de Cobrança"
                  content="Segmenta a carteira pelo estágio atual (Pendente, Negociação, Acordo, Boleto Emitido, etc.). Impacto: atualiza os indicadores consolidados e direciona a prioridade imediata do operador."
                />
              </label>
              <select
                id="select-status"
                value={selectedStatus}
                onChange={(e) => {
                  onSelectStatus(e.target.value);
                  setPage(1);
                }}
                className="py-1.5 px-2.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              >
                <option value="todos">Todos os Status</option>
                <option value="pendente">Pendente</option>
                <option value="em_negociacao">Em Negociação</option>
                <option value="acordo_fechado">Acordo Fechado</option>
                <option value="boleto_gerado">Boleto Emitido</option>
                <option value="sem_contato">Sem Contato</option>
                <option value="cancelado">Cancelado / Multa</option>
                <option value="critico">Atraso Crítico (+180d)</option>
              </select>
            </div>

            {/* Dia de Vencimento */}
            <div className="flex items-center gap-1 text-xs">
              <label htmlFor="select-vencimento" className="text-slate-500 font-medium flex items-center">
                Venc.:
                <FilterTooltip
                  title="Filtro por Dia de Vencimento"
                  content="Filtra pelos dias de corte do plano (10, 15 ou 20). Impacto: alinha a atuação do operador às datas de corte contratual e identifica prazos imediatos."
                />
              </label>
              <select
                id="select-vencimento"
                value={selectedVencimento}
                onChange={(e) => {
                  onSelectVencimento(e.target.value);
                  setPage(1);
                }}
                className="py-1.5 px-2.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              >
                <option value="todos">Todos os Dias</option>
                <option value="10">Dia 10</option>
                <option value="15">Dia 15</option>
                <option value="20">Dia 20</option>
              </select>
            </div>

            {/* Aging Filter */}
            <div className="flex items-center gap-1 text-xs">
              <label htmlFor="select-aging" className="text-slate-500 font-medium flex items-center">
                Ano:
                <FilterTooltip
                  title="Filtro por Antiguidade (Aging)"
                  content="Separa débitos de 2025 (antigos), 2026 (recentes) e Críticos (+180 dias). Impacto: diferencia dívidas de rápida negociação daquelas que exigem medidas judiciais ou acordos extraordinários."
                />
              </label>
              <select
                id="select-aging"
                value={filterAging}
                onChange={(e) => {
                  setFilterAging(e.target.value);
                  setPage(1);
                }}
                className="py-1.5 px-2.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              >
                <option value="todos">Todos os Anos</option>
                <option value="2025">2025 (Antigos)</option>
                <option value="2026">2026 (Recentes)</option>
                <option value="critico">Severo (+180d)</option>
              </select>
            </div>

            {/* Toggle Only Scheduled */}
            <div className="inline-flex items-center">
              <button
                id="btn-toggle-scheduled"
                onClick={() => {
                  setOnlyScheduled(!onlyScheduled);
                  setPage(1);
                }}
                className={`py-1.5 px-2.5 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1 cursor-pointer ${
                  onlyScheduled 
                    ? 'bg-blue-100 text-blue-900 border-blue-300' 
                    : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                }`}
              >
                <Calendar className="w-3 h-3" />
                <span>Com Agendamento</span>
              </button>
              <FilterTooltip
                title="Filtro de Agendamentos"
                content="Exibe apenas clientes com retornos ou promessas de pagamento programadas. Impacto: prioriza a fila nos compromissos ativos do operador."
              />
            </div>

            {/* Toggle Only Duplicates */}
            <div className="inline-flex items-center">
              <button
                id="btn-toggle-duplicates"
                type="button"
                onClick={() => {
                  setOnlyDuplicates(!onlyDuplicates);
                  setPage(1);
                }}
                className={`py-1.5 px-2.5 rounded-lg text-xs font-bold border transition-colors flex items-center gap-1 cursor-pointer ${
                  onlyDuplicates
                    ? 'bg-amber-500 text-white border-amber-600 shadow-2xs'
                    : duplicatesAnalysis.totalDuplicateRecords > 0
                      ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
                      : 'bg-white text-slate-500 border-slate-300 hover:bg-slate-50'
                }`}
                title="Filtrar registros que possuem número de telefone, matrícula ou nome duplicado"
              >
                <Copy className="w-3 h-3" />
                <span>Duplicidades ({duplicatesAnalysis.totalDuplicateRecords})</span>
              </button>
              <FilterTooltip
                title="Filtro de Duplicidades"
                content="Isola registros com telefone, matrícula ou nome duplicado na base. Impacto: evita contatos redundantes por operadoras diferentes e elimina conflitos de carteira."
              />
            </div>

            {/* Open Duplicate Audit Modal Button */}
            {onOpenDuplicatesModal && (
              <button
                id="btn-open-duplicates-modal"
                type="button"
                onClick={onOpenDuplicatesModal}
                className="py-1.5 px-2.5 rounded-lg text-xs font-semibold bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 transition-colors flex items-center gap-1 cursor-pointer"
                title="Auditar, mesclar e gerenciar clientes duplicados"
              >
                <Users className="w-3 h-3 text-blue-700" />
                <span>Auditar Duplicidades</span>
              </button>
            )}
          </div>

          {/* Date Range for Last Contact (Data Inicial & Data Final) */}
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 text-xs">
            <span className="text-slate-600 font-semibold flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              <span>Último Contato:</span>
              <FilterTooltip
                title="Filtro por Período de Último Contato"
                content="Filtra a base pelo intervalo em que o cliente foi acionado. Impacto: detecta clientes esquecidos ou sem acompanhamento há mais de 30 dias para aplicação da régua preventiva."
              />
            </span>
            <div className="flex items-center gap-1">
              <label htmlFor="filter-date-start" className="text-slate-400 text-[11px]">De:</label>
              <input
                id="filter-date-start"
                type="date"
                value={dateStartFilter}
                onChange={(e) => {
                  setDateStartFilter(e.target.value);
                  setPage(1);
                }}
                className="py-1 px-2 bg-white border border-slate-300 rounded-md text-xs text-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>
            <div className="flex items-center gap-1">
              <label htmlFor="filter-date-end" className="text-slate-400 text-[11px]">Até:</label>
              <input
                id="filter-date-end"
                type="date"
                value={dateEndFilter}
                onChange={(e) => {
                  setDateEndFilter(e.target.value);
                  setPage(1);
                }}
                className="py-1 px-2 bg-white border border-slate-300 rounded-md text-xs text-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>
            {(dateStartFilter || dateEndFilter) && (
              <button
                type="button"
                onClick={() => {
                  setDateStartFilter('');
                  setDateEndFilter('');
                  setPage(1);
                }}
                className="text-[11px] text-slate-500 hover:text-slate-800 underline px-1 cursor-pointer"
              >
                Limpar datas
              </button>
            )}

            {/* Current Active Sort Indicator */}
            <div className="ml-auto flex items-center gap-1.5 text-xs text-slate-600 bg-white border border-slate-200 px-2.5 py-1 rounded-lg shadow-2xs">
              <span className="text-slate-400 text-[11px]">Ordenação:</span>
              <span className="font-bold text-slate-800 text-xs">
                {sortField === 'matricula' && 'Matrícula'}
                {sortField === 'cliente' && 'Cliente'}
                {sortField === 'responsavel' && 'Cobradora'}
                {sortField === 'dias' && 'Atraso Desde'}
                {sortField === 'diaVencimento' && 'Vencimento'}
                {sortField === 'valorOriginal' && 'Valor (R$)'}
                {sortField === 'status' && 'Status'}
                {sortField === 'dataUltimoContato' && 'Último Contato'}
              </span>
              <button
                type="button"
                onClick={() => setSortAsc(!sortAsc)}
                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-[11px] font-semibold text-indigo-700 cursor-pointer transition-colors"
                title="Alternar entre ordem crescente e decrescente"
              >
                {sortAsc ? (
                  <>
                    <ChevronUp className="w-3 h-3" />
                    <span>Crescente (A-Z)</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3 h-3" />
                    <span>Decrescente (Z-A)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Active Selection Banner */}
        {selectedIds.size > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-xs animate-in fade-in">
            <span className="text-blue-950 font-medium">
              <strong>{selectedIds.size}</strong> cliente(s) selecionado(s)
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {/* Adm Master Bulk Lead Reassignment */}
              {currentUser?.role === 'adm_master' && onBulkReassign && (
                <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-md border border-blue-200 shadow-2xs">
                  <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                  <span className="text-blue-950 font-semibold">Reatribuir para:</span>
                  <select
                    value={reassignTarget}
                    onChange={(e) => setReassignTarget(e.target.value)}
                    className="text-xs bg-slate-50 border border-slate-300 rounded px-1.5 py-0.5 font-bold text-slate-800"
                  >
                    {availableOperatorsList.map(op => (
                      <option key={op} value={op}>{op}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      onBulkReassign(Array.from(selectedIds), reassignTarget);
                      setSelectedIds(new Set());
                    }}
                    className="px-2.5 py-0.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold shadow-xs cursor-pointer transition-colors"
                  >
                    Reatribuir Leads
                  </button>
                </div>
              )}

              <button
                onClick={handleBulkNotifyAction}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-medium shadow-xs transition-colors cursor-pointer"
              >
                <Send className="w-3 h-3" />
                <span>Disparar Notificações em Massa</span>
              </button>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="text-slate-500 hover:text-slate-700 px-2 py-1 cursor-pointer"
              >
                Limpar seleção
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Operator Prioritization Banner: Highlights upcoming due dates in next 3 days */}
      {upcomingDueRecordsCount > 0 && (
        <div className="mx-4 mt-2 mb-1 px-3.5 py-2 bg-amber-50/95 border border-amber-300 rounded-xl flex items-center justify-between gap-3 text-xs text-amber-950 shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
            </span>
            <span className="font-bold flex items-center gap-1 text-amber-900">
              <Zap className="w-3.5 h-3.5 text-amber-600 fill-amber-600" />
              Priorização do Operador:
            </span>
            <span>
              <strong>{upcomingDueRecordsCount}</strong> {upcomingDueRecordsCount === 1 ? 'cliente com vencimento' : 'clientes com vencimento'} nos próximos 3 dias com destaque condicional em amarelo na tabela.
            </span>
          </div>
          <span className="text-[11px] font-bold text-amber-900 bg-amber-200/90 px-2.5 py-0.5 rounded-md border border-amber-400 shadow-2xs hidden sm:inline">
            Ação Imediata da Operadora
          </span>
        </div>
      )}

      {/* Main Table */}
      <div className="overflow-x-auto px-1 py-1.5">
        <table className="w-full text-left text-xs text-slate-600 border-separate border-spacing-0">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 uppercase font-semibold text-[11px] tracking-wider sticky top-0 z-10">
            <tr>
              <th className="p-3 w-10 text-center no-print border-b border-slate-200 bg-slate-50 sticky top-0 z-10">
                <input
                  type="checkbox"
                  checked={allCurrentSelected}
                  onChange={toggleSelectAllCurrent}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
              </th>
              {renderSortHeader('matricula', 'Matrícula')}
              {renderSortHeader('cliente', 'Cliente')}
              {renderSortHeader('responsavel', 'Cobradora')}
              {renderSortHeader('dias', 'Atraso Desde')}
              {renderSortHeader('diaVencimento', 'Venc.')}
              {renderSortHeader('valorOriginal', 'Valor (R$)')}
              {renderSortHeader('status', 'Status')}
              {renderSortHeader('dataUltimoContato', 'Últ. Contato')}
              <th className="p-3 border-b border-slate-200 bg-slate-50 sticky top-0 z-10">Informações & Histórico</th>
              <th className="p-3 text-center min-w-[320px] no-print border-b border-slate-200 bg-slate-50 sticky top-0 z-10">Ações Rápidas (Pagamento / Negociação)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100/70">
            {currentPageRecords.map((record, index) => {
              const days = calculateDaysOverdue(record.primeiroMesAtraso || '', record.diaVencimento);
              const bucket = getAgingBucket(days);
              const isSelected = selectedIds.has(record.id);
              const dueInfo = isDueInNextDays(record.diaVencimento, 3);
              const isDueUpcoming = dueInfo.isUpcoming;

              return (
                <tr 
                  key={`${record.id}-${index}`}
                  className={`group transition-all duration-200 ease-out origin-center hover:scale-[1.006] hover:z-20 hover:relative hover:shadow-lg cursor-pointer ${
                    isDueUpcoming
                      ? isSelected 
                        ? 'bg-amber-100/95 ring-2 ring-amber-400 border-l-4 border-l-amber-500 shadow-xs' 
                        : 'bg-amber-50/90 hover:bg-amber-100/90 border-l-4 border-l-amber-500 shadow-2xs'
                      : isSelected 
                        ? 'bg-blue-50/60 shadow-xs hover:bg-blue-50/80' 
                        : 'bg-white hover:bg-blue-50/80'
                  }`}
                >
                  <td className="p-3 text-center no-print border-b border-slate-100 transition-colors group-hover:border-blue-200/50 first:rounded-l-lg">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelectRow(record.id)}
                      className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                  </td>
                  
                  {/* Matrícula */}
                  <td className="p-3 font-mono font-medium text-slate-800 whitespace-nowrap border-b border-slate-100 transition-colors group-hover:border-blue-200/50">
                    #{record.matricula}
                  </td>

                  {/* Cliente - Clique abre o componente de Log de Auditoria */}
                  <td className="p-3 border-b border-slate-100 transition-colors group-hover:border-blue-200/50">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setSelectedAuditRecord(record)}
                        className="font-semibold text-slate-900 hover:text-blue-700 hover:underline cursor-pointer text-left inline-flex items-center gap-1 group/auditbtn"
                        title="Clique para abrir o log de auditoria com as últimas 3 alterações realizadas neste registro"
                      >
                        <span>{record.cliente}</span>
                        <History className="w-3 h-3 text-slate-400 group-hover/auditbtn:text-blue-600 opacity-0 group-hover/auditbtn:opacity-100 transition-opacity" />
                      </button>

                      {/* Duplicate badge indicator */}
                      {duplicatesAnalysis.recordsWithDuplicatesIds.has(record.id) && (
                        <button
                          type="button"
                          onClick={() => onOpenDuplicatesModal && onOpenDuplicatesModal()}
                          className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200 cursor-pointer transition-colors"
                          title={(() => {
                            const info = duplicatesAnalysis.duplicateInfoByRecordId.get(record.id);
                            return `Duplicidade detectada em: ${info?.types.join(', ')}. Compartilhado com: ${info?.otherClients.join(', ') || 'outro cadastro'}. Clique para abrir auditoria.`;
                          })()}
                        >
                          <Copy className="w-2.5 h-2.5 text-amber-700" />
                          <span>Duplicado ({duplicatesAnalysis.duplicateInfoByRecordId.get(record.id)?.types.join('/')})</span>
                        </button>
                      )}

                      {record.historicoContatos && record.historicoContatos.length > 0 && (
                        <span className="text-[9px] font-semibold text-emerald-800 bg-emerald-100/70 px-1.5 py-0.2 rounded border border-emerald-300">
                          {record.historicoContatos.length} contato(s)
                        </span>
                      )}
                      {record.scoreRisco && (
                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold border ${
                          record.scoreRisco.nivelRisco === 'CRÍTICO' ? 'bg-rose-100 text-rose-800 border-rose-200' :
                          record.scoreRisco.nivelRisco === 'ALTO' ? 'bg-orange-100 text-orange-800 border-orange-200' :
                          record.scoreRisco.nivelRisco === 'MÉDIO' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                          'bg-emerald-100 text-emerald-800 border-emerald-200'
                        }`} title={`Score IA: ${record.scoreRisco.score}/100 • ${record.scoreRisco.estrategiaSugerida}`}>
                          IA: {record.scoreRisco.nivelRisco} ({record.scoreRisco.score})
                        </span>
                      )}

                      {/* Indicador Visual de Pendência de Retorno (Ícone de Calendário - Vermelho se Atrasado) */}
                      {record.dataRetorno && (() => {
                        const retStatus = parseReturnDateStatus(record.dataRetorno);
                        return (
                          <span
                            className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-bold border transition-colors ${
                              retStatus.isPast
                                ? 'bg-rose-100 text-rose-800 border-rose-300 ring-1 ring-rose-200'
                                : retStatus.isToday
                                ? 'bg-amber-100 text-amber-900 border-amber-300 ring-1 ring-amber-200'
                                : 'bg-blue-50 text-blue-800 border-blue-200'
                            }`}
                            title={retStatus.tooltipText}
                          >
                            <Calendar
                              className={`w-2.5 h-2.5 shrink-0 ${
                                retStatus.isPast
                                  ? 'text-rose-600 animate-pulse'
                                  : retStatus.isToday
                                  ? 'text-amber-600'
                                  : 'text-blue-600'
                              }`}
                            />
                            <span>
                              {retStatus.isPast
                                ? `Retorno Atrasado (${record.dataRetorno})`
                                : retStatus.isToday
                                ? `Retorno Hoje (${record.dataRetorno})`
                                : `Retorno: ${record.dataRetorno}`}
                            </span>
                          </span>
                        );
                      })()}
                    </div>

                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {record.telefone && (
                        <span className="text-[10px] text-slate-500 font-mono inline-flex items-center gap-0.5">
                          <Phone className="w-2.5 h-2.5 text-slate-400" />
                          <span>{record.telefone}</span>
                        </span>
                      )}
                      {record.detalheAdicional && (
                        <span className="text-[10px] text-slate-500 font-mono">
                          {record.detalheAdicional}
                        </span>
                      )}
                      {(() => {
                        const cInfo = calculateDaysWithoutContact(record);
                        if (cInfo.isOver30Days && record.status !== 'pago') {
                          return (
                            <span className="text-[9px] font-medium text-rose-600 bg-rose-50 px-1 rounded border border-rose-100">
                              {cInfo.days}d sem contato
                            </span>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </td>

                  {/* Responsavel & Aba de Origem */}
                  <td className="p-3 whitespace-nowrap border-b border-slate-100 transition-colors group-hover:border-blue-200/50">
                    {currentUser?.role === 'adm_master' && onReassignSingle ? (
                      <select
                        value={record.responsavel || 'GERAL'}
                        onChange={(e) => onReassignSingle(record.id, e.target.value)}
                        className={`px-2 py-0.5 rounded text-[11px] font-bold border cursor-pointer ${getResponsavelBadgeClass(record.responsavel)} shadow-2xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden`}
                        title="Adm Master: Selecione para reatribuir este lead imediatamente"
                      >
                        {availableOperatorsList.map(op => (
                          <option key={op} value={op}>{op}</option>
                        ))}
                      </select>
                    ) : (
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${getResponsavelBadgeClass(record.responsavel)}`}>
                        {record.responsavel}
                      </span>
                    )}
                    {record.abaOrigem && (
                      <span 
                        className="text-[9px] text-slate-500 font-medium block mt-0.5 truncate max-w-[120px]" 
                        title={`Aba de origem na planilha: ${record.abaOrigem}`}
                      >
                        Aba: {record.abaOrigem}
                      </span>
                    )}
                  </td>

                  {/* Atraso Desde & Gravidade */}
                  <td className="p-3 whitespace-nowrap border-b border-slate-100 transition-colors group-hover:border-blue-200/50">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-800">
                        {record.primeiroMesAtraso}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${bucket.color}`}>
                        {days}d ({bucket.badge})
                      </span>
                    </div>
                  </td>

                  {/* Dia Vencimento com Destaque Condicional */}
                  <td className="p-3 whitespace-nowrap border-b border-slate-100 transition-colors group-hover:border-blue-200/50">
                    <div className="flex items-center gap-1.5">
                      <span className={`font-semibold ${isDueUpcoming ? 'text-amber-950 font-bold' : 'text-slate-800'}`}>
                        Dia {record.diaVencimento}
                      </span>
                      {isDueUpcoming && (
                        <span 
                          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-200 text-amber-950 border border-amber-400 shadow-2xs animate-pulse"
                          title={`Vencimento próximo (${dueInfo.daysRemaining === 0 ? 'Hoje!' : `em ${dueInfo.daysRemaining} dia(s)`}) - Prioridade de ação imediata`}
                        >
                          <Zap className="w-2.5 h-2.5 text-amber-700 fill-amber-700" />
                          <span>{dueInfo.daysRemaining === 0 ? 'Hoje!' : `${dueInfo.daysRemaining}d`}</span>
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Valor Original / Em Aberto */}
                  <td className="p-3 whitespace-nowrap border-b border-slate-100 transition-colors group-hover:border-blue-200/50">
                    <div className="font-bold text-slate-900 font-mono text-[12px]">
                      {(record.valorOriginal ?? record.valorEmAberto ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </div>
                    {record.qtdParcelasVencidas && record.qtdParcelasVencidas > 0 ? (
                      <span className="text-[10px] text-slate-500 font-medium block">
                        {record.qtdParcelasVencidas}x parcela(s)
                      </span>
                    ) : null}
                  </td>

                  {/* Status */}
                  <td className="p-3 whitespace-nowrap border-b border-slate-100 transition-colors group-hover:border-blue-200/50">
                    <div className="flex items-center gap-1">
                      {getStatusBadge(record.status)}
                    </div>
                  </td>

                  {/* Último Contato */}
                  <td className="p-3 whitespace-nowrap border-b border-slate-100 transition-colors group-hover:border-blue-200/50">
                    {(() => {
                      const contactDate = getRecordLastContactDate(record);
                      const cInfo = calculateDaysWithoutContact(record);
                      if (!contactDate) {
                        return <span className="text-[10px] text-slate-400 italic">— Sem registro —</span>;
                      }
                      const formatted = contactDate.includes('-')
                        ? contactDate.split('-').reverse().join('/')
                        : contactDate;
                      return (
                        <div>
                          <span className="text-xs font-semibold text-slate-800 block font-mono">
                            {formatted}
                          </span>
                          {cInfo.days > 0 && (
                            <span className={`text-[9px] font-medium px-1.5 py-0.2 rounded inline-block mt-0.5 ${
                              cInfo.isOver30Days 
                                ? 'bg-rose-100 text-rose-800 border border-rose-200' 
                                : 'bg-slate-100 text-slate-600'
                            }`}>
                              {cInfo.days}d atrás
                            </span>
                          )}
                        </div>
                      );
                    })()}
                  </td>

                  {/* Informações & Agendamento */}
                  <td className="p-3 max-w-xs border-b border-slate-100 transition-colors group-hover:border-blue-200/50">
                    {record.informacao ? (
                      <div className="text-slate-700 text-[11px] leading-relaxed">
                        {record.informacao}
                      </div>
                    ) : (
                      <span className="text-slate-400 italic text-[11px]">— Sem observações —</span>
                    )}

                    {record.dataRetorno && (() => {
                      const retStatus = parseReturnDateStatus(record.dataRetorno);
                      return (
                        <div
                          className={`mt-1.5 flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-md border inline-flex transition-all shadow-2xs ${
                            retStatus.isPast
                              ? 'bg-rose-100 text-rose-800 border-rose-300 ring-1 ring-rose-200'
                              : retStatus.isToday
                              ? 'bg-amber-100 text-amber-900 border-amber-300 ring-1 ring-amber-200'
                              : 'bg-blue-50 text-blue-800 border-blue-200'
                          }`}
                          title={retStatus.tooltipText}
                        >
                          <Calendar
                            className={`w-3.5 h-3.5 shrink-0 ${
                              retStatus.isPast
                                ? 'text-rose-600 animate-pulse'
                                : retStatus.isToday
                                ? 'text-amber-600'
                                : 'text-blue-600'
                            }`}
                          />
                          <span>
                            {retStatus.isPast
                              ? `⚠️ Retorno Atrasado: ${record.dataRetorno}`
                              : retStatus.isToday
                              ? `⏰ Retorno Hoje: ${record.dataRetorno}`
                              : `📅 Retorno: ${record.dataRetorno}`}
                          </span>
                        </div>
                      );
                    })()}
                  </td>

                  {/* Quick Actions Column */}
                  <td className="p-2.5 text-center whitespace-nowrap no-print border-b border-slate-100 transition-colors group-hover:border-blue-200/50 last:rounded-r-lg">
                    <div className="flex items-center justify-center gap-1.5 flex-wrap">
                      
                      {/* Atalho Principal 1: Registrar Pagamento */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRegistrarPagamento ? onRegistrarPagamento(record) : onEditRecord(record);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-[11px] shadow-2xs hover:shadow-xs transition-all cursor-pointer"
                        title={`Registrar pagamento imediato para ${record.cliente}`}
                      >
                        <DollarSign className="w-3.5 h-3.5" />
                        <span>Registrar Pagamento</span>
                      </button>

                      {/* Atalho Principal 2: Nova Negociação */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onNovaNegociacao ? onNovaNegociacao(record) : onEditRecord(record);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 active:scale-95 text-white font-bold text-[11px] shadow-2xs hover:shadow-xs transition-all cursor-pointer"
                        title={`Abrir proposta e formalizar nova negociação de acordo para ${record.cliente}`}
                      >
                        <Handshake className="w-3.5 h-3.5" />
                        <span>Nova Negociação</span>
                      </button>

                      {/* Divisória Vertical */}
                      <div className="h-5 w-px bg-slate-200 mx-0.5 hidden sm:block" />

                      {/* Gemini AI Risk Analysis */}
                      {onAnalyzeWithGemini && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onAnalyzeWithGemini(record);
                          }}
                          className="p-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white transition-colors border border-indigo-200 cursor-pointer"
                          title="Analisar Score de Risco com IA Gemini"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Atendimento & Contatos */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenContactHistory ? onOpenContactHistory(record) : onEditRecord(record);
                        }}
                        className="p-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white transition-colors border border-blue-200 cursor-pointer"
                        title="Abrir tela de contatos e registrar ocorrência"
                      >
                        <History className="w-3.5 h-3.5" />
                      </button>

                      {/* WhatsApp trigger */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDirectWhatsApp(record);
                        }}
                        className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white transition-colors border border-emerald-200 cursor-pointer"
                        title="Enviar notificação no WhatsApp"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                      </button>

                      {/* Edit card */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditRecord(record);
                        }}
                        className="p-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors border border-slate-200 cursor-pointer"
                        title="Editar cadastro e histórico"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                    </div>
                  </td>
                </tr>
              );
            })}

            {currentPageRecords.length === 0 && (
              <tr>
                <td colSpan={11} className="p-8 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Filter className="w-8 h-8 text-slate-300" />
                    <p className="font-semibold text-slate-700">Nenhum cliente encontrado</p>
                    <p className="text-xs text-slate-500">
                      {searchTerm.trim() || clientNameFilter.trim()
                        ? `Não há clientes correspondentes à pesquisa realizada.`
                        : 'Tente ajustar os filtros de cobradora, aba ou data de vencimento.'}
                    </p>
                    {(searchTerm.trim() || clientNameFilter.trim()) && (
                      <button
                        id="empty-clear-search-btn"
                        type="button"
                        onClick={() => {
                          setSearchTerm('');
                          setClientNameFilter('');
                          setPage(1);
                        }}
                        className="mt-2 text-xs font-semibold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                      >
                        Limpar busca
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination & Summary footer */}
      <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-600 gap-2">
        <div>
          Mostrando <strong>{currentPageRecords.length}</strong> de <strong>{filteredRecords.length}</strong> inadimplentes filtrados (Total cadastrado: {records.length})
        </div>

        <div className="flex items-center gap-1">
          <button
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
            className="px-2.5 py-1 rounded bg-white border border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
          >
            Anterior
          </button>
          <span className="px-2 font-medium">
            Página {page} de {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
            className="px-2.5 py-1 rounded bg-white border border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
          >
            Próxima
          </button>
        </div>
      </div>

      {/* Fixed Dynamic Footer for Planilha Centralizada */}
      <FixedSpreadsheetFooter
        totalFilteredRecords={filteredRecords.length}
        totalAllRecords={records.length}
        totalValorEmAberto={dynamicFinancialTotals.totalValorEmAberto}
        totalValorRecuperado={dynamicFinancialTotals.totalValorRecuperado}
        activeAba={selectedAba}
        activeResponsavel={selectedResponsavel}
        activeStatus={selectedStatus}
        activeVencimento={selectedVencimento}
        searchTerm={searchTerm ? (clientNameFilter ? `${searchTerm} + ${clientNameFilter}` : searchTerm) : clientNameFilter}
        selectedCount={selectedIds.size}
        onClearFilters={handleClearAllFilters}
      />

      {/* Componente Modal de Log de Auditoria Rápido (últimas 3 alterações) */}
      {selectedAuditRecord && (
        <ClientAuditLogQuickModal
          record={selectedAuditRecord}
          isOpen={!!selectedAuditRecord}
          onClose={() => setSelectedAuditRecord(null)}
          onOpenFullHistory={(rec) => {
            setSelectedAuditRecord(null);
            if (onOpenContactHistory) {
              onOpenContactHistory(rec);
            } else {
              onEditRecord(rec);
            }
          }}
        />
      )}

    </div>
  );
};
