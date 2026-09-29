import React, { useMemo, useState } from 'react';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip, 
  Legend 
} from 'recharts';
import { PieChart as PieIcon, CheckCircle2, Clock, FileText, AlertCircle, Check, DollarSign } from 'lucide-react';
import { DebtRecord, StatusCobranca } from '../types';

interface StatusDistributionPieChartProps {
  records: DebtRecord[];
  onFilterStatus?: (status: string) => void;
}

interface StatusConfig {
  label: string;
  color: string;
  bgLight: string;
  borderColor: string;
  textColor: string;
  description: string;
}

const STATUS_CONFIGS: Record<string, StatusConfig> = {
  acordo_fechado: {
    label: 'Acordo Fechado',
    color: '#10b981', // Emerald 500
    bgLight: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    textColor: 'text-emerald-800',
    description: 'Termo de acordo firmado e em cumprimento',
  },
  boleto_gerado: {
    label: 'Boleto Emitido',
    color: '#3b82f6', // Blue 500
    bgLight: 'bg-blue-50',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-800',
    description: 'Boletos gerados prontos para envio ou quitação',
  },
  em_negociacao: {
    label: 'Em Negociação',
    color: '#f59e0b', // Amber 500
    bgLight: 'bg-amber-50',
    borderColor: 'border-amber-200',
    textColor: 'text-amber-800',
    description: 'Contato realizado aguardando contraproposta/data',
  },
  pendente: {
    label: 'Pendente / Em Aberto',
    color: '#f43f5e', // Rose 500
    bgLight: 'bg-rose-50',
    borderColor: 'border-rose-200',
    textColor: 'text-rose-800',
    description: 'Ainda sem negociação iniciada ou em triagem',
  },
  sem_contato: {
    label: 'Sem Contato / WPP',
    color: '#64748b', // Slate 500
    bgLight: 'bg-slate-50',
    borderColor: 'border-slate-200',
    textColor: 'text-slate-800',
    description: 'Tentativas frustradas ou telefone inválido',
  },
  pago: {
    label: 'Liquidado / Pago',
    color: '#059669', // Emerald 600
    bgLight: 'bg-green-50',
    borderColor: 'border-green-200',
    textColor: 'text-green-800',
    description: 'Débito 100% quitado e finalizado',
  },
  cancelado: {
    label: 'Cancelado',
    color: '#94a3b8', // Slate 400
    bgLight: 'bg-slate-50',
    borderColor: 'border-slate-200',
    textColor: 'text-slate-600',
    description: 'Registro baixado ou cancelado por contestação',
  },
  em_atraso: {
    label: 'Em Atraso',
    color: '#e11d48', // Rose 600
    bgLight: 'bg-rose-50',
    borderColor: 'border-rose-200',
    textColor: 'text-rose-800',
    description: 'Cobrança vencida aguardando contato',
  },
  contato_a_realizar: {
    label: 'Contato a Realizar',
    color: '#8b5cf6', // Violet 500
    bgLight: 'bg-purple-50',
    borderColor: 'border-purple-200',
    textColor: 'text-purple-800',
    description: 'Fila de contatos prioritários para o dia',
  },
  acordo_em_andamento: {
    label: 'Acordo em Andamento',
    color: '#0ea5e9', // Sky 500
    bgLight: 'bg-sky-50',
    borderColor: 'border-sky-200',
    textColor: 'text-sky-800',
    description: 'Parcelas do acordo sendo quitadas',
  },
  pagamento_prometido: {
    label: 'Promessa de Pagamento',
    color: '#14b8a6', // Teal 500
    bgLight: 'bg-teal-50',
    borderColor: 'border-teal-200',
    textColor: 'text-teal-800',
    description: 'Cliente confirmou data para pagamento',
  },
  sem_retorno: {
    label: 'Aguardando Retorno',
    color: '#a855f7', // Purple 500
    bgLight: 'bg-purple-50',
    borderColor: 'border-purple-200',
    textColor: 'text-purple-800',
    description: 'Mensagem enviada aguardando resposta',
  },
  recuperado: {
    label: 'Recuperado',
    color: '#16a34a', // Green 600
    bgLight: 'bg-green-50',
    borderColor: 'border-green-200',
    textColor: 'text-green-800',
    description: 'Recuperação com retenção de cliente',
  },
  inadimplencia_recorrente: {
    label: 'Inadimplência Recorrente',
    color: '#dc2626', // Red 600
    bgLight: 'bg-red-50',
    borderColor: 'border-red-200',
    textColor: 'text-red-800',
    description: 'Cliente com reincidência de atrasos',
  },
};

export const StatusDistributionPieChart: React.FC<StatusDistributionPieChartProps> = ({
  records,
  onFilterStatus,
}) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  // Aggregated data for Pie Chart
  const { chartData, totalRecords, totalValorCalculado, taxaResolucao } = useMemo(() => {
    const counts: Record<string, { count: number; totalValor: number }> = {
      acordo_fechado: { count: 0, totalValor: 0 },
      boleto_gerado: { count: 0, totalValor: 0 },
      em_negociacao: { count: 0, totalValor: 0 },
      pendente: { count: 0, totalValor: 0 },
      sem_contato: { count: 0, totalValor: 0 },
      pago: { count: 0, totalValor: 0 },
      cancelado: { count: 0, totalValor: 0 },
    };

    let grandTotalValor = 0;

    records.forEach((r) => {
      const statusKey = r.status && STATUS_CONFIGS[r.status] ? r.status : 'pendente';
      if (!counts[statusKey]) {
        counts[statusKey] = { count: 0, totalValor: 0 };
      }
      const valor = r.valorAcordo || r.valorOriginal || 120.0;
      counts[statusKey].count += 1;
      counts[statusKey].totalValor += valor;
      grandTotalValor += valor;
    });

    const total = records.length || 1;

    // Filter out categories with 0 items so pie doesn't draw zero slices
    const data = Object.keys(counts)
      .map((key) => {
        const item = counts[key];
        const cfg = STATUS_CONFIGS[key] || STATUS_CONFIGS.pendente;
        const percentage = Math.round((item.count / total) * 1000) / 10;
        return {
          status: key,
          name: cfg.label,
          value: item.count,
          percentage,
          totalValor: item.totalValor,
          color: cfg.color,
          config: cfg,
        };
      })
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value);

    const resolvidos = ((counts.acordo_fechado?.count || 0) + (counts.boleto_gerado?.count || 0) + (counts.pago?.count || 0));
    const taxa = Math.round((resolvidos / total) * 100);

    return {
      chartData: data,
      totalRecords: records.length,
      totalValorCalculado: grandTotalValor,
      taxaResolucao: taxa,
    };
  }, [records]);

  // Custom Tooltip component
  const renderCustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900/95 text-white p-3 rounded-xl shadow-xl border border-slate-700 text-xs backdrop-blur-xs min-w-[200px]">
          <div className="flex items-center gap-2 mb-1.5">
            <span
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: data.color }}
            />
            <span className="font-bold text-sm">{data.name}</span>
          </div>
          <div className="space-y-1 text-slate-300 font-sans">
            <div className="flex justify-between">
              <span>Clientes:</span>
              <strong className="text-white font-mono">{data.value}</strong>
            </div>
            <div className="flex justify-between">
              <span>Participação:</span>
              <strong className="text-amber-400 font-mono">{data.percentage}%</strong>
            </div>
            <div className="flex justify-between">
              <span>Volume Estimado:</span>
              <strong className="text-emerald-400 font-mono">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.totalValor)}
              </strong>
            </div>
          </div>
          {onFilterStatus && (
            <div className="mt-2 pt-1.5 border-t border-slate-700 text-[10px] text-slate-400 text-center">
              Clique para filtrar na planilha
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div 
      id="status-distribution-pie-chart"
      className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4 break-inside-avoid"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <PieIcon className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">
                Distribuição dos Clientes por Status de Cobrança
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                {totalRecords} clientes
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Proporção da carteira em acordos firmados, boletos, negociações ativas e pendências
            </p>
          </div>
        </div>

        {/* Quick KPI badge */}
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200/80 rounded-lg px-3 py-1.5 self-start sm:self-auto">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <div className="text-xs">
            <span className="text-emerald-800 font-semibold">{taxaResolucao}%</span>
            <span className="text-emerald-700 ml-1">resolvidos / emitidos</span>
          </div>
        </div>
      </div>

      {/* Main Chart + Legend Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        
        {/* Pie Chart Canvas (Recharts) */}
        <div className="lg:col-span-6 relative flex items-center justify-center min-h-[260px]">
          <div className="w-full h-64 sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip content={renderCustomTooltip} />
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={95}
                  paddingAngle={2.5}
                  dataKey="value"
                  nameKey="name"
                  animationDuration={800}
                  onClick={(entry: any) => {
                    const targetStatus = entry?.payload?.status || entry?.status;
                    if (onFilterStatus && targetStatus) {
                      onFilterStatus(targetStatus);
                    }
                  }}
                  cursor={onFilterStatus ? 'pointer' : 'default'}
                >
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`pie-cell-${entry.status}-${index}`} 
                      fill={entry.color} 
                      stroke="#ffffff"
                      strokeWidth={2}
                      className="hover:opacity-85 transition-opacity"
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Centered Donut Summary Label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {totalRecords}
            </span>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Clientes
            </span>
          </div>
        </div>

        {/* Rich Interactive Legend / Breakdown List */}
        <div className="lg:col-span-6 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 pb-1 border-b border-slate-100">
            <span>Status</span>
            <div className="flex items-center gap-6">
              <span>Qtd</span>
              <span className="w-12 text-right">Part. %</span>
            </div>
          </div>

          <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
            {chartData.map((item) => {
              return (
                <div
                  key={`legend-${item.status}`}
                  onClick={() => onFilterStatus && onFilterStatus(item.status)}
                  className={`flex items-center justify-between p-2 rounded-lg border transition-all text-xs ${
                    onFilterStatus 
                      ? 'hover:bg-slate-50 hover:border-slate-300 cursor-pointer' 
                      : ''
                  } ${item.config.bgLight} ${item.config.borderColor}`}
                  title={onFilterStatus ? `Clique para filtrar por "${item.name}" na planilha` : undefined}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span 
                      className="w-3 h-3 rounded-full shrink-0 shadow-2xs" 
                      style={{ backgroundColor: item.color }} 
                    />
                    <span className={`font-semibold truncate ${item.config.textColor}`}>
                      {item.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-6 shrink-0">
                    <span className="font-bold text-slate-800 font-mono">
                      {item.value}
                    </span>
                    <span className="w-12 text-right font-mono font-bold text-slate-600 bg-white/70 px-1.5 py-0.5 rounded text-[11px]">
                      {item.percentage}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick summary footer */}
          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
            <span className="flex items-center gap-1 text-slate-600">
              <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
              <span>Volume Total: <strong>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValorCalculado)}</strong></span>
            </span>
            {onFilterStatus && (
              <span className="text-[11px] text-indigo-600 font-medium">
                Dica: clique em uma fatia para filtrar a planilha
              </span>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
