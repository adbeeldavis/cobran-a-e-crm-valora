import React, { useMemo, useState } from 'react';
import { 
  TrendingUp, 
  Award, 
  Percent, 
  DollarSign, 
  Users, 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp, 
  Bell, 
  Sparkles, 
  Filter, 
  Calendar,
  AlertCircle
} from 'lucide-react';
import { DebtRecord, AppUser } from '../types';
import { sendDailyDueClientsAlert } from '../utils/reminderService';

interface OperatorPerformanceSummaryProps {
  records: DebtRecord[];
  selectedResponsavel: string;
  onSelectResponsavel: (responsavel: string) => void;
  currentUser?: AppUser;
  onAlertTriggered?: (msg: string) => void;
}

interface OperatorStats {
  nome: string;
  totalClientes: number;
  totalCarteira: number;
  totalRecuperado: number;
  totalAberto: number;
  taxaRecuperacao: number;
  clientesRegularizados: number;
  taxaResolucaoClientes: number;
  corBadge: string;
  iniciais: string;
}

export const OperatorPerformanceSummary: React.FC<OperatorPerformanceSummaryProps> = ({
  records,
  selectedResponsavel,
  onSelectResponsavel,
  currentUser,
  onAlertTriggered,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [isSendingAlert, setIsSendingAlert] = useState<boolean>(false);

  // Calculate real-time recovery metrics grouped by operator
  const { operators, totals } = useMemo(() => {
    const operatorMap = new Map<string, {
      totalClientes: number;
      totalCarteira: number;
      totalRecuperado: number;
      totalAberto: number;
      clientesRegularizados: number;
    }>();

    let globalCarteira = 0;
    let globalRecuperado = 0;
    let globalAberto = 0;
    let globalRegularizados = 0;

    records.forEach(r => {
      const resp = (r.responsavel || 'GERAL').trim().toUpperCase();
      const orig = r.valorOriginal ?? 120;
      const pago = r.valorRecuperado || r.valorPago || 
        (r.status === 'pago' || r.status === 'recuperado' 
          ? orig 
          : (r.status === 'acordo_fechado' && r.valorAcordo ? r.valorAcordo : 0));
      const aberto = r.valorEmAberto !== undefined
        ? r.valorEmAberto
        : (r.status === 'pago' || r.status === 'recuperado' ? 0 : Math.max(0, orig - pago));

      const isRegularizado = r.status === 'pago' || r.status === 'recuperado' || r.status === 'acordo_fechado' || r.status === 'boleto_gerado';

      globalCarteira += orig;
      globalRecuperado += pago;
      globalAberto += aberto;
      if (isRegularizado) globalRegularizados++;

      const current = operatorMap.get(resp) || {
        totalClientes: 0,
        totalCarteira: 0,
        totalRecuperado: 0,
        totalAberto: 0,
        clientesRegularizados: 0
      };

      current.totalClientes += 1;
      current.totalCarteira += orig;
      current.totalRecuperado += pago;
      current.totalAberto += aberto;
      if (isRegularizado) current.clientesRegularizados += 1;

      operatorMap.set(resp, current);
    });

    const getColors = (name: string): { badge: string; iniciais: string } => {
      switch (name) {
        case 'ROSANA':
          return { badge: 'bg-purple-100 text-purple-800 border-purple-300', iniciais: 'RO' };
        case 'ANA LUIZA':
          return { badge: 'bg-pink-100 text-pink-800 border-pink-300', iniciais: 'AL' };
        case 'KEYLLA':
          return { badge: 'bg-cyan-100 text-cyan-800 border-cyan-300', iniciais: 'KE' };
        case 'FABIOLA':
          return { badge: 'bg-teal-100 text-teal-800 border-teal-300', iniciais: 'FA' };
        default:
          return { badge: 'bg-slate-100 text-slate-800 border-slate-300', iniciais: 'GE' };
      }
    };

    const opList: OperatorStats[] = Array.from(operatorMap.entries()).map(([nome, data]) => {
      const taxaRecuperacao = data.totalCarteira > 0 ? (data.totalRecuperado / data.totalCarteira) * 100 : 0;
      const taxaResolucaoClientes = data.totalClientes > 0 ? (data.clientesRegularizados / data.totalClientes) * 100 : 0;
      const { badge, iniciais } = getColors(nome);

      return {
        nome,
        totalClientes: data.totalClientes,
        totalCarteira: data.totalCarteira,
        totalRecuperado: data.totalRecuperado,
        totalAberto: data.totalAberto,
        taxaRecuperacao,
        clientesRegularizados: data.clientesRegularizados,
        taxaResolucaoClientes,
        corBadge: badge,
        iniciais
      };
    });

    // Sort operators by recovery rate descending
    opList.sort((a, b) => b.taxaRecuperacao - a.taxaRecuperacao);

    const taxaGlobal = globalCarteira > 0 ? (globalRecuperado / globalCarteira) * 100 : 0;

    return {
      operators: opList,
      totals: {
        totalClientes: records.length,
        totalCarteira: globalCarteira,
        totalRecuperado: globalRecuperado,
        totalAberto: globalAberto,
        taxaGlobal,
        clientesRegularizados: globalRegularizados
      }
    };
  }, [records]);

  // Handler to trigger daily due date internal alert
  const handleTriggerDailyDueAlert = () => {
    setIsSendingAlert(true);
    try {
      const result = sendDailyDueClientsAlert(records, {
        force: true,
        currentUser
      });

      if (onAlertTriggered) {
        onAlertTriggered(result.message);
      }
    } catch (err) {
      console.error('Erro ao disparar alerta diário:', err);
    } finally {
      setTimeout(() => setIsSendingAlert(false), 600);
    }
  };

  const getRankBadge = (index: number) => {
    switch (index) {
      case 0:
        return <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 shadow-2xs">🥇 1º Lugar</span>;
      case 1:
        return <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-300">🥈 2º Lugar</span>;
      case 2:
        return <span className="text-xs font-bold text-amber-800 bg-amber-50/70 px-2 py-0.5 rounded-md border border-amber-300">🥉 3º Lugar</span>;
      default:
        return <span className="text-[11px] font-semibold text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded">{index + 1}º</span>;
    }
  };

  return (
    <section 
      id="resumo-performance-operadores" 
      aria-label="Resumo de Performance das Operadoras em Tempo Real"
      className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden transition-all no-print"
    >
      {/* Top Header & Actions Bar */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400">
              <TrendingUp className="w-4 h-4" />
            </div>
            <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
              Resumo de Performance dos Operadores
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Tempo Real
            </span>
          </div>
          <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
            Taxa de recuperação calculada a partir do <strong>valor total recuperado / acordado</strong> versus o <strong>total em carteira</strong> atribuído a cada operador.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap self-start md:self-center">
          {/* Botão para Disparar Alerta Diário de Vencimentos */}
          <button
            type="button"
            id="btn-disparar-alerta-diario-vencimentos"
            onClick={handleTriggerDailyDueAlert}
            disabled={isSendingAlert}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 rounded-lg text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50"
            title="Disparar alerta interno no sistema listando apenas os clientes com vencimento na data de hoje"
          >
            <Bell className={`w-3.5 h-3.5 ${isSendingAlert ? 'animate-spin' : ''}`} />
            <span>Alerta Vencimentos de Hoje</span>
          </button>

          {/* Toggle Expand / Collapse */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 transition-colors cursor-pointer"
            title={isExpanded ? 'Recolher resumo de performance' : 'Expandir resumo de performance'}
            aria-expanded={isExpanded}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Global Performance Ribbon */}
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div>
          <span className="text-[11px] text-slate-500 font-medium block">Taxa Global de Recuperação</span>
          <span className="text-base sm:text-lg font-black text-emerald-700 flex items-center gap-1">
            {totals.taxaGlobal.toFixed(1)}%
            <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
              Total Geral
            </span>
          </span>
        </div>

        <div>
          <span className="text-[11px] text-slate-500 font-medium block">Total em Carteira</span>
          <span className="text-sm sm:text-base font-bold text-slate-900">
            {totals.totalCarteira.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </span>
        </div>

        <div>
          <span className="text-[11px] text-slate-500 font-medium block">Total Recuperado / Acordado</span>
          <span className="text-sm sm:text-base font-bold text-emerald-700">
            {totals.totalRecuperado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </span>
        </div>

        <div>
          <span className="text-[11px] text-slate-500 font-medium block">Total Pendente em Aberto</span>
          <span className="text-sm sm:text-base font-bold text-rose-700">
            {totals.totalAberto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </span>
        </div>
      </div>

      {/* Operator Cards Grid */}
      {isExpanded && (
        <div className="p-4 sm:p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
            {operators.map((op, index) => {
              const isSelected = selectedResponsavel === op.nome;

              // Color gradient for progress bar
              let progressBarColor = 'bg-blue-600';
              let percentageColor = 'text-blue-700';

              if (op.taxaRecuperacao >= 25) {
                progressBarColor = 'bg-emerald-600';
                percentageColor = 'text-emerald-700';
              } else if (op.taxaRecuperacao >= 15) {
                progressBarColor = 'bg-indigo-600';
                percentageColor = 'text-indigo-700';
              } else if (op.taxaRecuperacao >= 8) {
                progressBarColor = 'bg-blue-600';
                percentageColor = 'text-blue-700';
              } else {
                progressBarColor = 'bg-amber-600';
                percentageColor = 'text-amber-700';
              }

              return (
                <div
                  key={op.nome}
                  id={`card-operator-performance-${op.nome.toLowerCase().replace(/\s+/g, '-')}`}
                  onClick={() => onSelectResponsavel(isSelected ? 'todos' : op.nome)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer select-none flex flex-col justify-between ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50/50 shadow-sm ring-2 ring-blue-500/20'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70 shadow-2xs'
                  }`}
                >
                  {/* Card Header: Avatar, Name, Rank */}
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shadow-2xs border ${op.corBadge}`}>
                          {op.iniciais}
                        </div>
                        <div>
                          <h3 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
                            {op.nome}
                            {isSelected && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-600 text-white">
                                Ativo
                              </span>
                            )}
                          </h3>
                          <span className="text-[11px] text-slate-500">
                            {op.totalClientes} clientes na carteira
                          </span>
                        </div>
                      </div>

                      {getRankBadge(index)}
                    </div>

                    {/* Big Recovery Percentage */}
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 mb-3">
                      <div className="flex items-baseline justify-between mb-1.5">
                        <span className="text-[11px] font-semibold text-slate-600 flex items-center gap-1">
                          <Percent className="w-3 h-3 text-slate-400" />
                          Taxa de Recuperação:
                        </span>
                        <span className={`text-xl sm:text-2xl font-black ${percentageColor}`}>
                          {op.taxaRecuperacao.toFixed(1)}%
                        </span>
                      </div>

                      {/* Visual Progress Bar */}
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${progressBarColor} transition-all duration-500`}
                          style={{ width: `${Math.min(100, Math.max(2, op.taxaRecuperacao))}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Financial Breakdown Grid */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs">
                    <div className="flex justify-between items-center text-slate-600">
                      <span className="text-[11px]">Recuperado / Acordo:</span>
                      <strong className="text-emerald-700 font-semibold">
                        {op.totalRecuperado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </strong>
                    </div>

                    <div className="flex justify-between items-center text-slate-600">
                      <span className="text-[11px]">Total em Carteira:</span>
                      <span className="text-slate-800 font-medium">
                        {op.totalCarteira.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-slate-600">
                      <span className="text-[11px]">Pendente em Aberto:</span>
                      <span className="text-rose-700 font-medium">
                        {op.totalAberto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-slate-500 pt-1 text-[10px]">
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        {op.clientesRegularizados} regularizados
                      </span>
                      <span>
                        {op.taxaResolucaoClientes.toFixed(0)}% dos clientes
                      </span>
                    </div>
                  </div>

                  {/* Quick Action footer */}
                  <div className="mt-3 pt-2 text-center">
                    <span className={`text-[11px] font-bold block py-1 rounded transition-colors ${
                      isSelected ? 'text-blue-700 bg-blue-100/60' : 'text-slate-500 group-hover:text-blue-600'
                    }`}>
                      {isSelected ? '✓ Filtrando esta Cobradora (Clique p/ limpar)' : 'Filtrar na Planilha →'}
                    </span>
                  </div>

                </div>
              );
            })}
          </div>

          {/* Helper Filter Note */}
          {selectedResponsavel !== 'todos' && (
            <div className="mt-4 p-2.5 bg-blue-50/80 border border-blue-200 rounded-xl flex items-center justify-between text-xs text-blue-900">
              <span className="flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-blue-600" />
                Filtro de Cobradora Ativo: <strong>{selectedResponsavel}</strong>. Exibindo apenas clientes desta carteira na planilha abaixo.
              </span>
              <button
                type="button"
                onClick={() => onSelectResponsavel('todos')}
                className="font-bold underline hover:text-blue-950 cursor-pointer text-xs"
              >
                Limpar Filtro e Exibir Todos
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
};
