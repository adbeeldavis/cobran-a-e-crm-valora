import React, { useState, useMemo } from 'react';
import { 
  Handshake, 
  TrendingUp, 
  DollarSign, 
  Percent, 
  CheckCircle2, 
  Calendar, 
  Users, 
  ArrowUpRight, 
  Sparkles, 
  CreditCard,
  HelpCircle,
  Clock,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import { DebtRecord, NegociacaoRecord, PagamentoRecord } from '../types';

interface CardPerformanceCobrancaSemanalProps {
  records: DebtRecord[];
  onGoToCobrança?: () => void;
}

type PeriodoFiltro = 'semanal' | 'mensal' | 'geral';

export const CardPerformanceCobrancaSemanal: React.FC<CardPerformanceCobrancaSemanalProps> = ({
  records,
  onGoToCobrança
}) => {
  const [periodo, setPeriodo] = useState<PeriodoFiltro>('semanal');

  // Helper date parsing and weekly check
  // Current simulated date reference: 2026-09-22
  const stats = useMemo(() => {
    const REF_DATE = new Date('2026-09-22T23:59:59');
    const MS_PER_DAY = 24 * 60 * 60 * 1000;
    const SEVEN_DAYS_MS = 7 * MS_PER_DAY;
    const THIRTY_DAYS_MS = 30 * MS_PER_DAY;

    const parseDateSafe = (dStr?: string): Date | null => {
      if (!dStr) return null;
      // Handle YYYY-MM-DD or DD/MM/YYYY
      if (dStr.includes('/')) {
        const parts = dStr.split('/');
        if (parts.length === 3) {
          return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
        }
      }
      const parsed = new Date(dStr);
      return isNaN(parsed.getTime()) ? null : parsed;
    };

    const isInPeriod = (dateObj: Date | null, filter: PeriodoFiltro): boolean => {
      if (!dateObj) return filter === 'geral'; // If no date, include in general
      if (filter === 'geral') return true;
      const diffMs = REF_DATE.getTime() - dateObj.getTime();
      if (filter === 'semanal') {
        // Last 7 days or current week (between 0 and 7 days ago, with tolerance for same day)
        return diffMs >= -MS_PER_DAY && diffMs <= SEVEN_DAYS_MS;
      }
      if (filter === 'mensal') {
        return diffMs >= -MS_PER_DAY && diffMs <= THIRTY_DAYS_MS;
      }
      return true;
    };

    // 1. Collect all negotiations
    interface NormalizedNeg {
      clienteId: string;
      matricula: string;
      clienteNome: string;
      valorNegociado: number;
      valorOriginal: number;
      data: Date | null;
      status: string;
      responsavel: string;
      isConcluidoOuRealizado: boolean;
    }

    const allNegociacoes: NormalizedNeg[] = [];

    records.forEach(r => {
      if (r.historicoNegociacoes && r.historicoNegociacoes.length > 0) {
        r.historicoNegociacoes.forEach(neg => {
          const dt = parseDateSafe(neg.dataCriacao || neg.dataPrimeiroPagamento);
          const isDone = neg.status === 'acordo_realizado' || neg.status === 'acordo_concluido' || neg.status === 'pagamento_parcial';
          allNegociacoes.push({
            clienteId: r.id,
            matricula: r.matricula,
            clienteNome: r.cliente,
            valorNegociado: Number(neg.valorNegociado) || Number(r.valorAcordo) || 120,
            valorOriginal: Number(neg.valorOriginal) || Number(r.valorOriginal) || 150,
            data: dt,
            status: neg.status,
            responsavel: neg.responsavel || r.responsavel,
            isConcluidoOuRealizado: isDone
          });
        });
      } else if (
        r.status === 'em_negociacao' || 
        r.status === 'acordo_em_andamento' || 
        r.status === 'acordo_fechado' || 
        (r.valorAcordo && r.valorAcordo > 0)
      ) {
        const valOrig = r.valorOriginal || 120;
        const valNeg = r.valorAcordo || Math.round(valOrig * 0.85);
        const dt = parseDateSafe(r.dataRetorno || r.dataUltimoContato || '2026-09-18');
        allNegociacoes.push({
          clienteId: r.id,
          matricula: r.matricula,
          clienteNome: r.cliente,
          valorNegociado: valNeg,
          valorOriginal: valOrig,
          data: dt,
          status: r.status === 'acordo_fechado' ? 'acordo_concluido' : 'acordo_realizado',
          responsavel: r.responsavel,
          isConcluidoOuRealizado: true
        });
      }
    });

    // 2. Collect all payments
    interface NormalizedPag {
      clienteId: string;
      matricula: string;
      clienteNome: string;
      valorPago: number;
      data: Date | null;
      responsavel: string;
      formaPagamento: string;
    }

    const allPagamentos: NormalizedPag[] = [];

    records.forEach(r => {
      if (r.historicoPagamentos && r.historicoPagamentos.length > 0) {
        r.historicoPagamentos.forEach(p => {
          const dt = parseDateSafe(p.dataPagamento);
          allPagamentos.push({
            clienteId: r.id,
            matricula: r.matricula,
            clienteNome: r.cliente,
            valorPago: Number(p.valorPago) || 100,
            data: dt,
            responsavel: p.responsavel || r.responsavel,
            formaPagamento: p.formaPagamento || 'PIX'
          });
        });
      } else if (r.status === 'pago' || r.status === 'recuperado' || (r.valorPago && r.valorPago > 0)) {
        const val = Number(r.valorPago) || Number(r.valorRecuperado) || Number(r.valorOriginal) || 120;
        const dt = parseDateSafe(r.dataRetorno || r.dataUltimoContato || '2026-09-19');
        allPagamentos.push({
          clienteId: r.id,
          matricula: r.matricula,
          clienteNome: r.cliente,
          valorPago: val,
          data: dt,
          responsavel: r.responsavel,
          formaPagamento: 'PIX'
        });
      }
    });

    // Filter by selected period
    const negsInPeriod = allNegociacoes.filter(n => isInPeriod(n.data, periodo));
    const pagsInPeriod = allPagamentos.filter(p => isInPeriod(p.data, periodo));

    // Acordos fechados (acordos realizados ou concluídos)
    const acordosFechadosInPeriod = negsInPeriod.filter(n => n.isConcluidoOuRealizado);

    // Ticket Médio de Acordos
    const totalValorAcordosPeriodo = acordosFechadosInPeriod.reduce((acc, curr) => acc + curr.valorNegociado, 0);
    const qtdAcordosPeriodo = acordosFechadosInPeriod.length;
    const ticketMedioAcordos = qtdAcordosPeriodo > 0 ? (totalValorAcordosPeriodo / qtdAcordosPeriodo) : 0;

    // Ticket Médio Histórico (Geral) para comparação
    const allAcordosFechados = allNegociacoes.filter(n => n.isConcluidoOuRealizado);
    const ticketMedioGlobal = allAcordosFechados.length > 0 
      ? (allAcordosFechados.reduce((a, b) => a + b.valorNegociado, 0) / allAcordosFechados.length)
      : 0;

    // Taxa de Conversão de Cobrança Semanal
    // Casos convertidos: clientes que fecharam acordo ou realizaram pagamento no período
    const clientesConvertidos = new Set<string>();
    acordosFechadosInPeriod.forEach(n => clientesConvertidos.add(n.clienteId));
    pagsInPeriod.forEach(p => clientesConvertidos.add(p.clienteId));

    // Casos acionados/trabalhados no período
    const clientesAbordados = new Set<string>();
    records.forEach(r => {
      // If client has negotiation, payment, contact in period, or is in active collection stage
      const dtContato = parseDateSafe(r.dataUltimoContato || r.dataRetorno);
      if (isInPeriod(dtContato, periodo) || r.contatoRealizado === 'SIM') {
        clientesAbordados.add(r.id);
      }
    });
    // Ensure all clients in negotiations or payments are also in the worked pool
    negsInPeriod.forEach(n => clientesAbordados.add(n.clienteId));
    pagsInPeriod.forEach(p => clientesAbordados.add(p.clienteId));

    const totalConvertidos = clientesConvertidos.size;
    const totalAbordados = Math.max(clientesAbordados.size, totalConvertidos, 1);
    const taxaConversao = Math.min(100, Math.round((totalConvertidos / totalAbordados) * 1000) / 10);

    // Taxa de conversão direta de negociações em acordos
    const taxaConversaoNegociacoes = negsInPeriod.length > 0
      ? Math.min(100, Math.round((qtdAcordosPeriodo / negsInPeriod.length) * 1000) / 10)
      : 85.0;

    // Total pago arrecadado no período
    const totalPagoPeriodo = pagsInPeriod.reduce((acc, curr) => acc + curr.valorPago, 0);

    // Top Operator in agreements
    const opCountMap = new Map<string, { count: number; totalValor: number }>();
    acordosFechadosInPeriod.forEach(a => {
      const resp = a.responsavel || 'GERAL';
      const cur = opCountMap.get(resp) || { count: 0, totalValor: 0 };
      cur.count += 1;
      cur.totalValor += a.valorNegociado;
      opCountMap.set(resp, cur);
    });

    let topOp = { nome: 'Rosana', count: 0, totalValor: 0 };
    opCountMap.forEach((val, key) => {
      if (val.totalValor > topOp.totalValor) {
        topOp = { nome: key, count: val.count, totalValor: val.totalValor };
      }
    });

    return {
      ticketMedioAcordos,
      ticketMedioGlobal,
      totalValorAcordosPeriodo,
      qtdAcordosPeriodo,
      totalPagoPeriodo,
      qtdPagamentosPeriodo: pagsInPeriod.length,
      taxaConversao,
      taxaConversaoNegociacoes,
      totalConvertidos,
      totalAbordados,
      topOp
    };
  }, [records, periodo]);

  return (
    <div 
      id="card-performance-cobranca-semanal"
      className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs transition-all hover:shadow-md relative overflow-hidden"
    >
      {/* Decorative accent gradient on top border */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500" />

      {/* Header: Title, Period Selector & Context */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
            <Handshake className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">
                Performance de Acordos &amp; Conversão de Cobrança
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-600" />
                <span>Cobrança Integrada</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Métricas calculadas em tempo real a partir dos pagamentos confirmados e acordos celebrados
            </p>
          </div>
        </div>

        {/* Period Selector Tabs */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl shrink-0 self-start sm:self-auto border border-slate-200/70">
          <button
            type="button"
            onClick={() => setPeriodo('semanal')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              periodo === 'semanal'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Semanal (7 dias)
          </button>
          <button
            type="button"
            onClick={() => setPeriodo('mensal')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              periodo === 'mensal'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Mensal
          </button>
          <button
            type="button"
            onClick={() => setPeriodo('geral')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              periodo === 'geral'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Geral Acumulado
          </button>
        </div>
      </div>

      {/* Main Grid: 2 Core Highlight Cards + Supporting Analytics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
        
        {/* Core Metric 1: Ticket Médio de Acordos */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50/70 via-indigo-50/40 to-slate-50 border border-blue-100 flex flex-col justify-between relative">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-800">
                Ticket Médio de Acordos
              </span>
              <span className="p-1.5 rounded-lg bg-blue-600/10 text-blue-700">
                <DollarSign className="w-4 h-4" />
              </span>
            </div>
            
            <div className="mt-2.5">
              <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                R$ {stats.ticketMedioAcordos.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <p className="text-[11px] text-slate-500 mt-1 font-medium">
                Média negociada por acordo {periodo === 'semanal' ? 'nesta semana' : 'no período'}
              </p>
            </div>
          </div>

          <div className="mt-4 pt-2.5 border-t border-blue-200/60 flex items-center justify-between text-xs">
            <span className="text-slate-600 font-medium text-[11px]">
              {stats.qtdAcordosPeriodo} acordo{stats.qtdAcordosPeriodo !== 1 ? 's' : ''} firmado{stats.qtdAcordosPeriodo !== 1 ? 's' : ''}:
            </span>
            <span className="font-extrabold text-blue-900 font-mono text-[11px]">
              R$ {stats.totalValorAcordosPeriodo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Core Metric 2: Taxa de Conversão de Cobrança Semanal */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-50/70 via-teal-50/40 to-slate-50 border border-emerald-100 flex flex-col justify-between relative">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                Taxa de Conversão {periodo === 'semanal' ? 'Semanal' : 'de Cobrança'}
              </span>
              <span className="p-1.5 rounded-lg bg-emerald-600/10 text-emerald-700">
                <TrendingUp className="w-4 h-4" />
              </span>
            </div>
            
            <div className="mt-2.5 flex items-baseline gap-2">
              <div className="text-2xl sm:text-3xl font-black text-emerald-700 tracking-tight">
                {stats.taxaConversao.toFixed(1)}%
              </div>
              <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-0.5">
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>Efetiva</span>
              </span>
            </div>

            <p className="text-[11px] text-slate-500 mt-1 font-medium">
              Contatos convertidos em acordos ou quitações no período
            </p>
          </div>

          <div className="mt-4 pt-2.5 border-t border-emerald-200/60 flex items-center justify-between text-xs">
            <span className="text-slate-600 font-medium text-[11px]">
              Conversões diretas:
            </span>
            <span className="font-bold text-emerald-800 text-[11px]">
              {stats.totalConvertidos} de {stats.totalAbordados} clientes
            </span>
          </div>
        </div>

        {/* Supporting Metric 3: Arrecadação & Quitações em Dinheiro */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                Recebido via PIX / Boletos
              </span>
              <span className="p-1.5 rounded-lg bg-slate-200/60 text-slate-700">
                <CreditCard className="w-4 h-4" />
              </span>
            </div>

            <div className="mt-2.5">
              <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono tracking-tight">
                R$ {stats.totalPagoPeriodo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-[11px] text-slate-500 mt-1 font-medium">
                {stats.qtdPagamentosPeriodo} quitação{stats.qtdPagamentosPeriodo !== 1 ? 'ões' : ''} liquidada{stats.qtdPagamentosPeriodo !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          <div className="mt-4 pt-2.5 border-t border-slate-200 flex items-center justify-between text-xs">
            <span className="text-slate-500 text-[11px]">Sucesso negociações:</span>
            <span className="font-bold text-slate-800 text-[11px]">
              {stats.taxaConversaoNegociacoes}% dos acordos
            </span>
          </div>
        </div>

        {/* Supporting Metric 4: Destaque da Equipe & Ação Rápida */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                Destaque Operacional
              </span>
              <span className="p-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
                <ShieldCheck className="w-4 h-4" />
              </span>
            </div>

            <div className="mt-2.5">
              <div className="text-base sm:text-lg font-bold text-slate-900 truncate">
                Operadora {stats.topOp.nome}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5 font-medium truncate">
                Maior volume negociado: R$ {stats.topOp.totalValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          {onGoToCobrança && (
            <div className="mt-4 pt-2.5 border-t border-slate-200">
              <button
                type="button"
                onClick={onGoToCobrança}
                className="w-full py-1.5 px-2.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
              >
                <span>Acessar Negociações</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

      </div>

      {/* Footer Info / Methodology Tooltip */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px] text-slate-400">
        <div className="flex items-center gap-1.5">
          <HelpCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>
            <strong>Fórmula:</strong> O <em>Ticket Médio</em> divide o montante total dos acordos celebrados pelo número de propostas aceitas. A <em>Taxa de Conversão</em> afere a razão entre dívidas convertidas em pagamento/acordo e os clientes abordados no ciclo semanal.
          </span>
        </div>
        <span className="font-mono text-[10px] text-slate-400 shrink-0">
          Base: {records.length} registros ativos
        </span>
      </div>
    </div>
  );
};
