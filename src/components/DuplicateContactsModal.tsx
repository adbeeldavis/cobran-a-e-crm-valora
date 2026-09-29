import React, { useState, useMemo } from 'react';
import {
  X,
  Copy,
  Users,
  Phone,
  CreditCard,
  AlertTriangle,
  Merge,
  ArrowRight,
  CheckCircle,
  FileSpreadsheet,
  Search,
  MessageCircle,
  History,
  UserCheck,
  Filter,
  Check,
  ShieldAlert
} from 'lucide-react';
import { DebtRecord, AppUser } from '../types';
import { 
  analyzeDuplicates, 
  DuplicateGroup, 
  mergeDuplicateRecords, 
  reassignRecords,
  formatPhone 
} from '../utils/duplicateService';
import { calculateDaysOverdue } from '../utils/sheetParser';

interface DuplicateContactsModalProps {
  isOpen: boolean;
  onClose: () => void;
  records: DebtRecord[];
  currentUser: AppUser;
  onUpdateRecords: (updated: DebtRecord[]) => void;
  onOpenContactHistory?: (record: DebtRecord) => void;
  onDirectWhatsApp?: (record: DebtRecord) => void;
  onShowToast: (message: string) => void;
}

export const DuplicateContactsModal: React.FC<DuplicateContactsModalProps> = ({
  isOpen,
  onClose,
  records,
  currentUser,
  onUpdateRecords,
  onOpenContactHistory,
  onDirectWhatsApp,
  onShowToast,
}) => {
  const isAdm = currentUser.role === 'adm_master';

  // Analysis
  const analysis = useMemo(() => {
    return analyzeDuplicates(records);
  }, [records]);

  // Filters & State
  const [filterType, setFilterType] = useState<'todos' | 'telefone' | 'matricula' | 'cliente' | 'conflito_operador'>('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [mergingGroupId, setMergingGroupId] = useState<string | null>(null);
  const [selectedPrimaryId, setSelectedPrimaryId] = useState<string>('');
  const [reassigningGroupId, setReassigningGroupId] = useState<string | null>(null);
  const [targetOperator, setTargetOperator] = useState<string>('ROSANA');

  // List of available operators
  const availableOperators = useMemo(() => {
    const set = new Set<string>();
    ['ROSANA', 'ANA LUIZA', 'KEYLLA', 'FABIOLA', 'GERAL'].forEach(op => set.add(op));
    records.forEach(r => {
      if (r.responsavel) set.add(r.responsavel.trim().toUpperCase());
    });
    return Array.from(set).sort();
  }, [records]);

  // Filtered groups
  const filteredGroups = useMemo(() => {
    return analysis.groups.filter(group => {
      // Type filter
      if (filterType === 'telefone' && group.type !== 'telefone') return false;
      if (filterType === 'matricula' && group.type !== 'matricula') return false;
      if (filterType === 'cliente' && group.type !== 'cliente') return false;
      if (filterType === 'conflito_operador' && !group.hasDifferentResponsavel) return false;

      // Search term
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesLabel = group.label.toLowerCase().includes(query);
        const matchesClient = group.records.some(r => (r.cliente || '').toLowerCase().includes(query));
        const matchesMatricula = group.records.some(r => (r.matricula || '').toLowerCase().includes(query));
        const matchesPhone = group.records.some(r => (r.telefone || '').includes(query));
        const matchesResp = group.records.some(r => (r.responsavel || '').toLowerCase().includes(query));
        if (!matchesLabel && !matchesClient && !matchesMatricula && !matchesPhone && !matchesResp) {
          return false;
        }
      }

      return true;
    });
  }, [analysis.groups, filterType, searchTerm]);

  if (!isOpen) return null;

  // Handle start merge flow
  const handleStartMerge = (group: DuplicateGroup) => {
    setMergingGroupId(group.id);
    // Default primary to the first record or the one with most info/history
    const bestPrimary = [...group.records].sort((a, b) => {
      const histA = a.historicoContatos?.length || 0;
      const histB = b.historicoContatos?.length || 0;
      return histB - histA;
    })[0];
    setSelectedPrimaryId(bestPrimary.id);
  };

  // Handle confirm merge
  const handleConfirmMerge = (group: DuplicateGroup) => {
    if (!selectedPrimaryId) return;

    try {
      const secondaryIds = group.records.filter(r => r.id !== selectedPrimaryId).map(r => r.id);
      const { updatedRecords, mergedRecord } = mergeDuplicateRecords(
        selectedPrimaryId,
        secondaryIds,
        records,
        currentUser.nome
      );

      onUpdateRecords(updatedRecords);
      setMergingGroupId(null);
      onShowToast(`Contatos unificados com sucesso sob o cadastro de ${mergedRecord.cliente}!`);
    } catch (err: any) {
      onShowToast(`Erro ao mesclar contatos: ${err.message}`);
    }
  };

  // Handle reassign group leads
  const handleReassignGroup = (group: DuplicateGroup) => {
    if (!isAdm) {
      onShowToast('Apenas o Administrador Master pode reatribuir carteiras.');
      return;
    }
    const ids = group.records.map(r => r.id);
    const updated = reassignRecords(records, ids, targetOperator, currentUser.nome);
    onUpdateRecords(updated);
    setReassigningGroupId(null);
    onShowToast(`${ids.length} leads reatribuídos para ${targetOperator} com sucesso!`);
  };

  // Export duplicates report to CSV
  const handleExportDuplicatesCsv = () => {
    if (analysis.groups.length === 0) {
      onShowToast('Nenhuma duplicidade detectada para exportar.');
      return;
    }

    const headers = ['Tipo_Duplicidade', 'Chave_Duplicada', 'Matricula', 'Cliente', 'Telefone', 'Responsavel', 'Aba_Origem', 'Status', 'Dias_Atraso'];
    const rows: string[][] = [];

    analysis.groups.forEach(g => {
      g.records.forEach(r => {
        const days = calculateDaysOverdue(r.primeiroMesAtraso, r.diaVencimento);
        rows.push([
          g.type,
          `"${g.key}"`,
          `"${r.matricula || ''}"`,
          `"${(r.cliente || '').replace(/"/g, '""')}"`,
          `"${r.telefone || ''}"`,
          `"${r.responsavel || 'GERAL'}"`,
          `"${r.abaOrigem || 'Geral'}"`,
          `"${r.status || ''}"`,
          days.toString()
        ]);
      });
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `auditoria_duplicidades_contatos_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    onShowToast('Relatório de duplicidades exportado com sucesso!');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
      <div 
        id="modal-duplicate-contacts"
        className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Copy className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-tight">
                  Verificação & Auditoria de Duplicidade de Contatos
                </h2>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500 text-slate-950">
                  {analysis.groups.length} grupos detectados
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Evite contatos repetidos, cobranças duplicadas pelo mesmo número e conflitos de carteira entre operadores.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-export-dups-csv"
              type="button"
              onClick={handleExportDuplicatesCsv}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
              title="Baixar lista de duplicidades em CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Exportar CSV</span>
            </button>
            <button
              id="btn-close-duplicates-modal"
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Metric Cards Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50 border-b border-slate-200">
          <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span>Telefones Repetidos</span>
              <Phone className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-xl font-extrabold text-slate-900">{analysis.phoneDuplicateCount}</p>
            <p className="text-[10px] text-amber-700 font-medium">Números compartilhados</p>
          </div>

          <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span>Matrículas Repetidas</span>
              <CreditCard className="w-4 h-4 text-blue-500" />
            </div>
            <p className="text-xl font-extrabold text-slate-900">{analysis.matriculaDuplicateCount}</p>
            <p className="text-[10px] text-blue-700 font-medium">Contratos ou CPFs iguais</p>
          </div>

          <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span>Nomes Idênticos</span>
              <Users className="w-4 h-4 text-indigo-500" />
            </div>
            <p className="text-xl font-extrabold text-slate-900">{analysis.nameDuplicateCount}</p>
            <p className="text-[10px] text-indigo-700 font-medium">Multi-abas / cadastros</p>
          </div>

          <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span>Conflito de Cobradora</span>
              <ShieldAlert className="w-4 h-4 text-rose-500" />
            </div>
            <p className="text-xl font-extrabold text-slate-900">
              {analysis.groups.filter(g => g.hasDifferentResponsavel).length}
            </p>
            <p className="text-[10px] text-rose-700 font-medium">Em operadoras distintas</p>
          </div>
        </div>

        {/* Filter bar & Search */}
        <div className="p-4 bg-white border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 text-xs">
            <button
              type="button"
              onClick={() => setFilterType('todos')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap ${
                filterType === 'todos'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Todos ({analysis.groups.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('telefone')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap ${
                filterType === 'telefone'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
              }`}
            >
              Telefones Repetidos ({analysis.phoneDuplicateCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('conflito_operador')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap ${
                filterType === 'conflito_operador'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
              }`}
            >
              Conflito de Operador ({analysis.groups.filter(g => g.hasDifferentResponsavel).length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('matricula')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap ${
                filterType === 'matricula'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-blue-50 text-blue-800 hover:bg-blue-100'
              }`}
            >
              Matrículas ({analysis.matriculaDuplicateCount})
            </button>
          </div>

          {/* Search box */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar por cliente, telefone, matrícula..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-slate-900 bg-slate-50 focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-50/50">
          {filteredGroups.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 p-8 shadow-2xs">
              <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800">
                Nenhuma duplicidade encontrada neste filtro!
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                {searchTerm
                  ? 'Nenhum contato duplicado corresponde ao termo de busca digitado.'
                  : 'Sua base está limpa de contatos repetidos para este critério.'}
              </p>
            </div>
          ) : (
            filteredGroups.map(group => {
              const isMerging = mergingGroupId === group.id;
              const isReassigning = reassigningGroupId === group.id;

              return (
                <div
                  key={group.id}
                  className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden transition-all hover:border-slate-300"
                >
                  {/* Group Header */}
                  <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      {group.type === 'telefone' && (
                        <span className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                          <Phone className="w-4 h-4" />
                        </span>
                      )}
                      {group.type === 'matricula' && (
                        <span className="w-7 h-7 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center shrink-0">
                          <CreditCard className="w-4 h-4" />
                        </span>
                      )}
                      {group.type === 'cliente' && (
                        <span className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-800 flex items-center justify-center shrink-0">
                          <Users className="w-4 h-4" />
                        </span>
                      )}

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900">{group.label}</span>
                          {group.hasDifferentResponsavel && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 animate-pulse">
                              Cobradora Conflitante
                            </span>
                          )}
                          {group.hasDifferentClients && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                              Nomes Distintos
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500">
                          {group.records.length} clientes encontrados com este mesmo dado
                        </p>
                      </div>
                    </div>

                    {/* Quick Group Action Buttons */}
                    <div className="flex items-center gap-2">
                      {/* Reassign button for Adm Master */}
                      {isAdm && (
                        <button
                          type="button"
                          onClick={() => {
                            setReassigningGroupId(isReassigning ? null : group.id);
                            setMergingGroupId(null);
                          }}
                          className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                            isReassigning
                              ? 'bg-indigo-600 text-white border-indigo-700'
                              : 'bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-50'
                          }`}
                          title="Reatribuir todos os registros deste grupo para uma única cobradora"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>Reatribuir Leads</span>
                        </button>
                      )}

                      {/* Merge records button */}
                      <button
                        type="button"
                        onClick={() => {
                          if (isMerging) {
                            setMergingGroupId(null);
                          } else {
                            handleStartMerge(group);
                            setReassigningGroupId(null);
                          }
                        }}
                        className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                          isMerging
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                        title="Unificar e mesclar os contatos deste grupo em um único registro principal"
                      >
                        <Merge className="w-3.5 h-3.5" />
                        <span>{isMerging ? 'Cancelar Mesclagem' : 'Mesclar Contatos'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Reassign Panel for Adm Master */}
                  {isReassigning && isAdm && (
                    <div className="p-3 bg-indigo-50/70 border-b border-indigo-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2 text-indigo-900 font-medium">
                        <UserCheck className="w-4 h-4 text-indigo-600" />
                        <span>Reatribuir todos os <strong>{group.records.length}</strong> cadastros para:</span>
                        <select
                          value={targetOperator}
                          onChange={(e) => setTargetOperator(e.target.value)}
                          className="px-2 py-1 rounded-md border border-indigo-300 bg-white font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                        >
                          {availableOperators.map(op => (
                            <option key={op} value={op}>{op}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setReassigningGroupId(null)}
                          className="px-3 py-1 rounded-md border border-slate-300 text-slate-600 hover:bg-white cursor-pointer font-medium"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReassignGroup(group)}
                          className="px-3 py-1 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer shadow-xs"
                        >
                          Confirmar Reatribuição
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Merge Panel Selection */}
                  {isMerging && (
                    <div className="p-3 bg-amber-50/70 border-b border-amber-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2 text-amber-900 font-medium">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        <span>
                          Selecione abaixo qual registro será o <strong>Principal</strong>. O histórico e telefones adicionais serão agregados a ele.
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setMergingGroupId(null)}
                          className="px-3 py-1 rounded-md border border-slate-300 text-slate-600 hover:bg-white cursor-pointer font-medium"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleConfirmMerge(group)}
                          className="px-3 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer shadow-xs flex items-center gap-1.5"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Efetivar Mesclagem</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Records Table within the Group */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-200 text-slate-500 font-medium">
                          {isMerging && <th className="py-2.5 px-3 w-12 text-center">Principal</th>}
                          <th className="py-2.5 px-3">Cliente / Devedor</th>
                          <th className="py-2.5 px-3">Matrícula</th>
                          <th className="py-2.5 px-3">Telefone</th>
                          <th className="py-2.5 px-3">Cobradora (Responsável)</th>
                          <th className="py-2.5 px-3">Aba Origem</th>
                          <th className="py-2.5 px-3">Atraso</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {group.records.map((rec) => {
                          const isSelectedPrimary = selectedPrimaryId === rec.id;
                          const days = calculateDaysOverdue(rec.primeiroMesAtraso, rec.diaVencimento);

                          return (
                            <tr
                              key={rec.id}
                              className={`transition-colors ${
                                isMerging && isSelectedPrimary
                                  ? 'bg-emerald-50/70 font-medium'
                                  : 'hover:bg-slate-50/80'
                              }`}
                            >
                              {isMerging && (
                                <td className="py-2 px-3 text-center">
                                  <input
                                    type="radio"
                                    name={`primary-${group.id}`}
                                    checked={isSelectedPrimary}
                                    onChange={() => setSelectedPrimaryId(rec.id)}
                                    className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                  />
                                </td>
                              )}

                              <td className="py-2.5 px-3 font-semibold text-slate-900">
                                <span>{rec.cliente}</span>
                                {rec.informacao && (
                                  <span className="block text-[11px] text-slate-500 font-normal truncate max-w-xs" title={rec.informacao}>
                                    {rec.informacao}
                                  </span>
                                )}
                              </td>

                              <td className="py-2.5 px-3 font-mono text-slate-700">
                                {rec.matricula || '-'}
                              </td>

                              <td className="py-2.5 px-3 text-slate-800">
                                <span className="font-mono">{formatPhone(rec.telefone || '')}</span>
                              </td>

                              <td className="py-2.5 px-3">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                                  {rec.responsavel || 'GERAL'}
                                </span>
                              </td>

                              <td className="py-2.5 px-3 text-slate-600">
                                <span className="inline-block px-1.5 py-0.5 bg-slate-100 rounded text-[10px] font-medium text-slate-700">
                                  {rec.abaOrigem || 'Geral'}
                                </span>
                              </td>

                              <td className="py-2.5 px-3">
                                <span className={`text-[11px] font-semibold ${days > 180 ? 'text-rose-600' : 'text-slate-700'}`}>
                                  {days} dias ({rec.primeiroMesAtraso})
                                </span>
                              </td>

                              <td className="py-2.5 px-3">
                                <span className="text-[11px] text-slate-600 font-medium">
                                  {rec.status}
                                </span>
                              </td>

                              <td className="py-2.5 px-3 text-right">
                                <div className="inline-flex items-center gap-1">
                                  {onDirectWhatsApp && rec.telefone && (
                                    <button
                                      type="button"
                                      onClick={() => onDirectWhatsApp(rec)}
                                      className="p-1 rounded-md text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 transition-colors cursor-pointer"
                                      title="Enviar WhatsApp"
                                    >
                                      <MessageCircle className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  {onOpenContactHistory && (
                                    <button
                                      type="button"
                                      onClick={() => onOpenContactHistory(rec)}
                                      className="p-1 rounded-md text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 transition-colors cursor-pointer"
                                      title="Ver Dossiê / Histórico de Contatos"
                                    >
                                      <History className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>
            Dica: Mescle registros quando o cliente possuir dois cadastros duplicados, ou reatribua a um único operador para evitar abordagens concorrentes.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold shadow-xs transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
