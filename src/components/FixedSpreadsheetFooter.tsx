import React, { useMemo } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle2, 
  Filter, 
  Layers, 
  X, 
  Users,
  Search,
  Sparkles
} from 'lucide-react';

interface FixedSpreadsheetFooterProps {
  totalFilteredRecords: number;
  totalAllRecords: number;
  totalValorEmAberto: number;
  totalValorRecuperado: number;
  activeAba?: string;
  activeResponsavel?: string;
  activeStatus?: string;
  activeVencimento?: string;
  searchTerm?: string;
  selectedCount?: number;
  onClearFilters?: () => void;
}

export const FixedSpreadsheetFooter: React.FC<FixedSpreadsheetFooterProps> = ({
  totalFilteredRecords,
  totalAllRecords,
  totalValorEmAberto,
  totalValorRecuperado,
  activeAba = 'todos',
  activeResponsavel = 'todos',
  activeStatus = 'todos',
  activeVencimento = 'todos',
  searchTerm = '',
  selectedCount = 0,
  onClearFilters,
}) => {
  // Calculate recovery rate for the current filtered slice
  const recoveryRate = useMemo(() => {
    const total = totalValorEmAberto + totalValorRecuperado;
    if (total <= 0) return '0.0';
    return ((totalValorRecuperado / total) * 100).toFixed(1);
  }, [totalValorEmAberto, totalValorRecuperado]);

  // Check if any filter is active
  const hasActiveFilters = useMemo(() => {
    return (
      (activeAba && activeAba !== 'todos') ||
      (activeResponsavel && activeResponsavel !== 'todos') ||
      (activeStatus && activeStatus !== 'todos') ||
      (activeVencimento && activeVencimento !== 'todos') ||
      Boolean(searchTerm && searchTerm.trim().length > 0)
    );
  }, [activeAba, activeResponsavel, activeStatus, activeVencimento, searchTerm]);

  return (
    <div 
      id="fixed-spreadsheet-footer"
      className="fixed bottom-0 left-0 right-0 z-30 bg-slate-900/95 backdrop-blur-md border-t border-slate-700/80 shadow-[0_-8px_25px_rgba(0,0,0,0.25)] text-white no-print transition-all duration-300"
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3 flex flex-col md:flex-row items-center justify-between gap-3">
        
        {/* Left Section: Active Filter Status & Record Counts */}
        <div className="flex items-center gap-2.5 flex-wrap justify-center md:justify-start w-full md:w-auto">
          <div className="flex items-center gap-2 bg-slate-800/90 border border-slate-700 px-3 py-1.5 rounded-xl text-xs shadow-inner">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
            <span className="text-slate-300">
              Filtro Atual: <strong className="text-white font-mono">{totalFilteredRecords}</strong> de <strong className="text-slate-400 font-mono">{totalAllRecords}</strong> clientes
            </span>
          </div>

          {/* Active Filter Chips */}
          {hasActiveFilters && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {activeAba && activeAba !== 'todos' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-medium bg-blue-900/60 text-blue-200 border border-blue-700/60">
                  <Layers className="w-3 h-3" />
                  <span>{activeAba}</span>
                </span>
              )}

              {activeResponsavel && activeResponsavel !== 'todos' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-medium bg-indigo-900/60 text-indigo-200 border border-indigo-700/60">
                  <Users className="w-3 h-3" />
                  <span>{activeResponsavel}</span>
                </span>
              )}

              {searchTerm && searchTerm.trim() && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-medium bg-slate-800 text-amber-300 border border-amber-500/40 truncate max-w-[150px]">
                  <Search className="w-3 h-3" />
                  <span className="truncate">"{searchTerm}"</span>
                </span>
              )}

              {activeStatus && activeStatus !== 'todos' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-medium bg-slate-800 text-cyan-200 border border-cyan-700/60">
                  <Filter className="w-3 h-3" />
                  <span>{activeStatus}</span>
                </span>
              )}

              {onClearFilters && (
                <button
                  type="button"
                  onClick={onClearFilters}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold text-rose-300 hover:text-white bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 transition-colors cursor-pointer"
                  title="Limpar todos os filtros da tabela"
                >
                  <X className="w-3 h-3" />
                  <span>Limpar</span>
                </button>
              )}
            </div>
          )}

          {selectedCount > 0 && (
            <span className="text-[11px] font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded-lg border border-amber-700/60">
              {selectedCount} selecionado(s)
            </span>
          )}
        </div>

        {/* Right Section: Real-time Dynamic Financial Metrics */}
        <div className="flex items-center justify-center md:justify-end gap-3 sm:gap-5 flex-wrap w-full md:w-auto">
          
          {/* Card 1: Valor Total em Aberto */}
          <div className="flex items-center gap-2.5 bg-slate-800/80 border border-amber-500/30 px-3.5 py-1.5 rounded-xl shadow-inner">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <AlertCircle className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-amber-300/90">
                Valor Total em Aberto
              </div>
              <div className="text-sm sm:text-base font-extrabold text-white font-mono tracking-tight leading-none mt-0.5">
                {totalValorEmAberto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </div>
            </div>
          </div>

          {/* Card 2: Valor Total Recuperado */}
          <div className="flex items-center gap-2.5 bg-slate-800/80 border border-emerald-500/30 px-3.5 py-1.5 rounded-xl shadow-inner">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-300/90 flex items-center gap-1.5">
                <span>Valor Total Recuperado</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-700/60 font-semibold font-mono">
                  {recoveryRate}%
                </span>
              </div>
              <div className="text-sm sm:text-base font-extrabold text-emerald-400 font-mono tracking-tight leading-none mt-0.5">
                {totalValorRecuperado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
