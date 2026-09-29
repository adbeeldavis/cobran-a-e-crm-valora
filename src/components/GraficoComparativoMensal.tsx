import React, { useState, useMemo } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  ArrowDownRight, 
  ArrowUpRight, 
  Calendar, 
  Download, 
  Printer, 
  CheckCircle2, 
  AlertTriangle,
  Info,
  DollarSign,
  Layers,
  ArrowUpDown,
  Filter
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ReferenceLine 
} from 'recharts';
import * as XLSX from 'xlsx';
import { LancamentoFinanceiro } from '../types';
import { computeComparativoMensal, ComparativoMensalItem } from '../utils/financeiroService';

interface GraficoComparativoMensalProps {
  lancamentos: LancamentoFinanceiro[];
  onShowToast?: (msg: string) => void;
  className?: string;
}

type PeriodoFiltro = 'ano_2026' | 'ultimos_6' | 'segundo_semestre' | 'primeiro_semestre';
type TipoVisao = 'barras_duplas' | 'com_saldo';
type StatusFiltro = 'todos' | 'quitados' | 'pendentes';

export const GraficoComparativoMensal: React.FC<GraficoComparativoMensalProps> = ({
  lancamentos,
  onShowToast,
  className = ''
}) => {
  const [periodo, setPeriodo] = useState<PeriodoFiltro>('ano_2026');
  const [tipoVisao, setTipoVisao] = useState<TipoVisao>('barras_duplas');
  const [statusFiltro, setStatusFiltro] = useState<StatusFiltro>('todos');
  const [selectedMonthKey, setSelectedMonthKey] = useState<string | null>(null);

  // Raw computed monthly comparative data (12 months of 2026)
  const fullMonthlyData = useMemo(() => {
    return computeComparativoMensal(lancamentos);
  }, [lancamentos]);

  // Filtered by selected period
  const filteredData = useMemo(() => {
    let list: ComparativoMensalItem[] = [];

    switch (periodo) {
      case 'ultimos_6':
        // Apr to Sep 2026 (months 4 to 9)
        list = fullMonthlyData.filter(m => m.mesNumero >= 4 && m.mesNumero <= 9);
        break;
      case 'segundo_semestre':
        // Jul to Dec 2026 (months 7 to 12)
        list = fullMonthlyData.filter(m => m.mesNumero >= 7);
        break;
      case 'primeiro_semestre':
        // Jan to Jun 2026 (months 1 to 6)
        list = fullMonthlyData.filter(m => m.mesNumero <= 6);
        break;
      case 'ano_2026':
      default:
        list = fullMonthlyData;
        break;
    }

    return list;
  }, [fullMonthlyData, periodo]);

  // Prepare chart-ready data points respecting the status filter (Todos, Quitados, Pendentes)
  const chartData = useMemo(() => {
    return filteredData.map(item => {
      let valorReceber = item.contasReceber;
      let valorPagar = item.contasPagar;

      if (statusFiltro === 'quitados') {
        valorReceber = item.receitasRealizadas;
        valorPagar = item.despesasPagas;
      } else if (statusFiltro === 'pendentes') {
        valorReceber = item.receitasPendentes;
        valorPagar = item.despesasPendentes;
      }

      const saldo = valorReceber - valorPagar;

      return {
        ...item,
        'Contas a Receber': Math.round(valorReceber),
        'Contas a Pagar': Math.round(valorPagar),
        'Saldo Líquido': Math.round(saldo)
      };
    });
  }, [filteredData, statusFiltro]);

  // Consolidated aggregates for the selected view
  const aggregates = useMemo(() => {
    let totalReceber = 0;
    let totalPagar = 0;
    let totalSaldo = 0;

    chartData.forEach(item => {
      totalReceber += item['Contas a Receber'];
      totalPagar += item['Contas a Pagar'];
      totalSaldo += item['Saldo Líquido'];
    });

    const taxaMediaCobertura = totalPagar > 0 ? Math.round((totalReceber / totalPagar) * 100) : 100;
    const mediaMensalReceber = chartData.length > 0 ? Math.round(totalReceber / chartData.length) : 0;
    const mediaMensalPagar = chartData.length > 0 ? Math.round(totalPagar / chartData.length) : 0;

    return {
      totalReceber,
      totalPagar,
      totalSaldo,
      taxaMediaCobertura,
      mediaMensalReceber,
      mediaMensalPagar
    };
  }, [chartData]);

  // Export to Excel
  const handleExportExcel = () => {
    try {
      const rows = chartData.map(item => ({
        'Mês / Ano': item.mesRotulo,
        'Nome do Mês': item.mesNome,
        'Contas a Receber (R$)': item['Contas a Receber'],
        'Receitas Realizadas (R$)': item.receitasRealizadas,
        'Receitas Pendentes (R$)': item.receitasPendentes,
        'Contas a Pagar (R$)': item['Contas a Pagar'],
        'Despesas Pagas (R$)': item.despesasPagas,
        'Despesas Pendentes (R$)': item.despesasPendentes,
        'Saldo Líquido (R$)': item['Saldo Líquido'],
        'Taxa de Cobertura (%)': `${item.taxaCobertura}%`,
        'Resultado': item.statusSaldo === 'superavit' ? 'Superávit' : item.statusSaldo === 'deficit' ? 'Déficit' : 'Equilíbrio'
      }));

      // Add summary row
      rows.push({
        'Mês / Ano': 'TOTAL CONSOLIDADO',
        'Nome do Mês': `Período (${chartData.length} meses)`,
        'Contas a Receber (R$)': aggregates.totalReceber,
        'Receitas Realizadas (R$)': chartData.reduce((acc, c) => acc + c.receitasRealizadas, 0),
        'Receitas Pendentes (R$)': chartData.reduce((acc, c) => acc + c.receitasPendentes, 0),
        'Contas a Pagar (R$)': aggregates.totalPagar,
        'Despesas Pagas (R$)': chartData.reduce((acc, c) => acc + c.despesasPagas, 0),
        'Despesas Pendentes (R$)': chartData.reduce((acc, c) => acc + c.despesasPendentes, 0),
        'Saldo Líquido (R$)': aggregates.totalSaldo,
        'Taxa de Cobertura (%)': `${aggregates.taxaMediaCobertura}%`,
        'Resultado': aggregates.totalSaldo >= 0 ? 'Superavitário' : 'Deficitário'
      });

      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Comparativo Pagar vs Receber');
      XLSX.writeFile(workbook, `Valora_Comparativo_Pagar_vs_Receber_${new Date().toISOString().slice(0, 10)}.xlsx`);

      if (onShowToast) {
        onShowToast('Planilha de comparativo mensal exportada com sucesso!');
      }
    } catch (err) {
      console.error('Erro ao exportar comparativo:', err);
      if (onShowToast) onShowToast('Erro ao exportar comparativo para Excel.');
    }
  };

  // Custom chart tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    const dataItem: any = payload[0]?.payload;
    if (!dataItem) return null;

    const isCurrent = dataItem.isCurrentMonth;
    const recVal = dataItem['Contas a Receber'] || 0;
    const pagVal = dataItem['Contas a Pagar'] || 0;
    const saldoVal = dataItem['Saldo Líquido'] || (recVal - pagVal);
    const cobertura = pagVal > 0 ? Math.round((recVal / pagVal) * 100) : 100;

    return (
      <div className="bg-slate-950 text-white p-3.5 rounded-xl shadow-xl border border-slate-800 text-xs min-w-[240px]">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-2">
          <div className="flex items-center gap-1.5 font-black text-slate-100 text-sm">
            <Calendar className="w-3.5 h-3.5 text-blue-400" />
            <span>{dataItem.mesNome} de {dataItem.ano}</span>
          </div>
          {isCurrent && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/30 text-blue-300 border border-blue-400/40">
              Mês Vigente
            </span>
          )}
        </div>

        <div className="space-y-1.5 font-sans">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 shrink-0"></span>
              <span>Contas a Receber:</span>
            </div>
            <strong className="font-mono text-emerald-300">
              R$ {recVal.toLocaleString('pt-BR')}
            </strong>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-rose-400 font-semibold">
              <span className="w-2.5 h-2.5 rounded-sm bg-rose-500 shrink-0"></span>
              <span>Contas a Pagar:</span>
            </div>
            <strong className="font-mono text-rose-300">
              R$ {pagVal.toLocaleString('pt-BR')}
            </strong>
          </div>

          <div className="pt-2 border-t border-slate-800 flex items-center justify-between font-bold">
            <div className="flex items-center gap-1.5 text-slate-300">
              <DollarSign className="w-3.5 h-3.5 text-slate-400" />
              <span>Saldo Operacional:</span>
            </div>
            <span className={`font-mono ${saldoVal >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {saldoVal >= 0 ? '+' : ''} R$ {saldoVal.toLocaleString('pt-BR')}
            </span>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
            <span>Índice de Cobertura:</span>
            <span className="font-mono font-semibold text-blue-300">{cobertura}% das despesas</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div id="componente-comparativo-mensal" className={`bg-white rounded-2xl border border-slate-200 p-5 md:p-6 shadow-xs ${className}`}>
      
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-50 text-blue-700 border border-blue-100">
              <BarChart3 className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <span>Comparativo Mensal: Contas a Pagar vs Contas a Receber</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Evolução mensal comparativa de receitas realizadas/previstas e compromissos operacionais a pagar
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons & Filter Selectors */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Period selector */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              type="button"
              id="filtro-periodo-ano"
              onClick={() => setPeriodo('ano_2026')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                periodo === 'ano_2026' ? 'bg-white text-slate-900 font-bold shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Ano 2026
            </button>
            <button
              type="button"
              id="filtro-periodo-6m"
              onClick={() => setPeriodo('ultimos_6')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                periodo === 'ultimos_6' ? 'bg-white text-slate-900 font-bold shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Últimos 6 Meses
            </button>
            <button
              type="button"
              id="filtro-periodo-2sem"
              onClick={() => setPeriodo('segundo_semestre')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                periodo === 'segundo_semestre' ? 'bg-white text-slate-900 font-bold shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              2º Semestre
            </button>
          </div>

          {/* View mode toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              type="button"
              id="toggle-visao-duplas"
              onClick={() => setTipoVisao('barras_duplas')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                tipoVisao === 'barras_duplas' ? 'bg-white text-slate-900 font-bold shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Comparar apenas Pagar vs Receber"
            >
              Pagar vs Receber
            </button>
            <button
              type="button"
              id="toggle-visao-saldo"
              onClick={() => setTipoVisao('com_saldo')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                tipoVisao === 'com_saldo' ? 'bg-white text-slate-900 font-bold shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Exibir também a barra de Saldo Líquido"
            >
              + Saldo Líquido
            </button>
          </div>

          {/* Status filter (Todos vs Realizados vs Pendentes) */}
          <select
            id="filtro-status-comparativo"
            value={statusFiltro}
            onChange={(e) => setStatusFiltro(e.target.value as StatusFiltro)}
            className="bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="todos">Total Previsto</option>
            <option value="quitados">Apenas Realizado</option>
            <option value="pendentes">Apenas Pendente</option>
          </select>

          {/* Export to Excel */}
          <button
            type="button"
            id="btn-export-comparativo-excel"
            onClick={handleExportExcel}
            className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Exportar comparativo para Excel"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Excel</span>
          </button>
        </div>
      </div>

      {/* 4 Summary KPI Badges for the selected period */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 my-4">
        {/* KPI 1: Contas a Receber */}
        <div className="bg-emerald-50/60 rounded-xl border border-emerald-100 p-3.5">
          <div className="flex items-center justify-between text-xs font-bold text-emerald-800">
            <span className="uppercase tracking-wider">Contas a Receber</span>
            <ArrowDownRight className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-1.5">
            <span className="text-lg sm:text-xl font-black text-emerald-800 block">
              R$ {aggregates.totalReceber.toLocaleString('pt-BR')}
            </span>
            <span className="text-[11px] text-emerald-700 font-medium">
              Média: R$ {aggregates.mediaMensalReceber.toLocaleString('pt-BR')}/mês
            </span>
          </div>
        </div>

        {/* KPI 2: Contas a Pagar */}
        <div className="bg-rose-50/60 rounded-xl border border-rose-100 p-3.5">
          <div className="flex items-center justify-between text-xs font-bold text-rose-800">
            <span className="uppercase tracking-wider">Contas a Pagar</span>
            <ArrowUpRight className="w-4 h-4 text-rose-600" />
          </div>
          <div className="mt-1.5">
            <span className="text-lg sm:text-xl font-black text-rose-800 block">
              R$ {aggregates.totalPagar.toLocaleString('pt-BR')}
            </span>
            <span className="text-[11px] text-rose-700 font-medium">
              Média: R$ {aggregates.mediaMensalPagar.toLocaleString('pt-BR')}/mês
            </span>
          </div>
        </div>

        {/* KPI 3: Saldo Operacional Líquido */}
        <div className="bg-blue-50/60 rounded-xl border border-blue-100 p-3.5">
          <div className="flex items-center justify-between text-xs font-bold text-blue-800">
            <span className="uppercase tracking-wider">Saldo do Período</span>
            <DollarSign className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-1.5">
            <span className={`text-lg sm:text-xl font-black block ${aggregates.totalSaldo >= 0 ? 'text-blue-900' : 'text-rose-700'}`}>
              {aggregates.totalSaldo >= 0 ? '+' : ''} R$ {aggregates.totalSaldo.toLocaleString('pt-BR')}
            </span>
            <span className="text-[11px] text-blue-700 font-medium">
              {aggregates.totalSaldo >= 0 ? 'Resultado Superavitário' : 'Resultado Deficitário'}
            </span>
          </div>
        </div>

        {/* KPI 4: Taxa de Cobertura */}
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-3.5">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700">
            <span className="uppercase tracking-wider">Índice de Cobertura</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-1.5">
            <span className="text-lg sm:text-xl font-black text-slate-900 block">
              {aggregates.taxaMediaCobertura}%
            </span>
            <span className="text-[11px] text-slate-500 font-medium">
              {aggregates.taxaMediaCobertura >= 100 ? 'Receitas cobrem despesas' : 'Atenção ao fluxo de caixa'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Bar Chart Container */}
      <div className="my-2 pt-2">
        <div className="h-72 sm:h-80 w-full" id="container-grafico-barras-mensal">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={chartData} 
              margin={{ top: 15, right: 15, left: -5, bottom: 5 }}
              onClick={(e: any) => {
                if (e && e.activePayload && e.activePayload[0]) {
                  setSelectedMonthKey(e.activePayload[0].payload.mesKey);
                }
              }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="mesRotulo" 
                tick={{ fontSize: 11, fill: '#475569', fontWeight: 600 }} 
                axisLine={{ stroke: '#cbd5e1' }}
                tickLine={false} 
              />
              <YAxis 
                tick={{ fontSize: 11, fill: '#64748b' }} 
                axisLine={false} 
                tickLine={false} 
                tickFormatter={(val) => `R$ ${(val / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                verticalAlign="top"
                align="right"
                wrapperStyle={{ fontSize: '11px', paddingBottom: '12px' }}
                iconType="circle"
              />
              
              {/* Reference line for break-even */}
              {tipoVisao === 'com_saldo' && (
                <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" />
              )}

              {/* Bar 1: Contas a Receber (Verde Esmeralda) */}
              <Bar 
                dataKey="Contas a Receber" 
                fill="#10b981" 
                radius={[5, 5, 0, 0]} 
                maxBarSize={38}
              />

              {/* Bar 2: Contas a Pagar (Vermelho Coral / Rosa) */}
              <Bar 
                dataKey="Contas a Pagar" 
                fill="#ef4444" 
                radius={[5, 5, 0, 0]} 
                maxBarSize={38}
              />

              {/* Optional Bar 3: Saldo Líquido */}
              {tipoVisao === 'com_saldo' && (
                <Bar 
                  dataKey="Saldo Líquido" 
                  fill="#3b82f6" 
                  radius={[5, 5, 0, 0]} 
                  maxBarSize={34}
                />
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Monthly Breakdown Micro-Cards Grid */}
      <div className="mt-5 pt-4 border-t border-slate-100">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-blue-700" />
            <span>Detalhamento Mês a Mês ({chartData.length} meses)</span>
          </h4>
          <span className="text-[11px] text-slate-500">
            Clique em qualquer mês para destacar
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
          {chartData.map((item) => {
            const isSelected = selectedMonthKey === item.mesKey;
            const isCurrent = item.isCurrentMonth;
            const rec = item['Contas a Receber'];
            const pag = item['Contas a Pagar'];
            const saldo = item['Saldo Líquido'];

            return (
              <button
                type="button"
                key={item.mesKey}
                onClick={() => setSelectedMonthKey(isSelected ? null : item.mesKey)}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  isSelected 
                    ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20 shadow-xs' 
                    : isCurrent 
                    ? 'border-blue-300 bg-blue-50/30 hover:border-blue-400' 
                    : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/70 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-extrabold text-xs text-slate-900">
                    {item.mesRotulo}
                  </span>
                  {isCurrent ? (
                    <span className="px-1 py-0.2 rounded text-[9px] font-black bg-blue-600 text-white uppercase">
                      Atual
                    </span>
                  ) : (
                    <span className={`px-1 py-0.2 rounded text-[9px] font-bold ${
                      saldo >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {saldo >= 0 ? 'Superávit' : 'Déficit'}
                    </span>
                  )}
                </div>

                <div className="space-y-1 text-[11px] font-mono">
                  <div className="flex items-center justify-between text-emerald-700">
                    <span className="text-[10px] text-slate-500 font-sans">Rec:</span>
                    <strong>R$ {(rec / 1000).toFixed(1)}k</strong>
                  </div>
                  <div className="flex items-center justify-between text-rose-700">
                    <span className="text-[10px] text-slate-500 font-sans">Pag:</span>
                    <strong>R$ {(pag / 1000).toFixed(1)}k</strong>
                  </div>
                  <div className="pt-1 border-t border-slate-200/80 flex items-center justify-between font-bold">
                    <span className="text-[10px] text-slate-600 font-sans">Saldo:</span>
                    <span className={saldo >= 0 ? 'text-blue-700' : 'text-rose-700'}>
                      {saldo >= 0 ? '+' : ''}{(saldo / 1000).toFixed(1)}k
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Month Detail Modal / Banner */}
      {selectedMonthKey && (() => {
        const item = chartData.find(m => m.mesKey === selectedMonthKey);
        if (!item) return null;

        return (
          <div className="mt-4 p-4 rounded-xl bg-blue-50/80 border border-blue-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="p-2 rounded-lg bg-blue-600 text-white">
                <Calendar className="w-4 h-4" />
              </span>
              <div>
                <h5 className="text-xs font-black text-blue-950 uppercase tracking-wide">
                  Detalhes do Mês: {item.mesNome} de {item.ano} {item.isCurrentMonth && '(Mês Corrente)'}
                </h5>
                <p className="text-xs text-blue-800 mt-0.5">
                  Receitas Realizadas: <strong>R$ {item.receitasRealizadas.toLocaleString('pt-BR')}</strong> • 
                  A Receber: <strong>R$ {item.receitasPendentes.toLocaleString('pt-BR')}</strong> • 
                  Despesas Pagas: <strong>R$ {item.despesasPagas.toLocaleString('pt-BR')}</strong> • 
                  A Pagar: <strong>R$ {item.despesasPendentes.toLocaleString('pt-BR')}</strong>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={() => setSelectedMonthKey(null)}
                className="px-2.5 py-1 text-xs text-blue-700 hover:text-blue-900 font-bold bg-white border border-blue-200 rounded-lg cursor-pointer"
              >
                Fechar Detalhes
              </button>
            </div>
          </div>
        );
      })()}

      {/* Explanatory Integration Footer */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-500">
        <div className="flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span>
            Os dados de <strong>Contas a Receber</strong> são integrados em tempo real às recuperações de crédito das operadoras.
          </span>
        </div>
        <div className="flex items-center gap-3 font-semibold text-slate-600">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500"></span> Contas a Receber
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-rose-500"></span> Contas a Pagar
          </span>
          {tipoVisao === 'com_saldo' && (
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-blue-500"></span> Saldo Líquido
            </span>
          )}
        </div>
      </div>

    </div>
  );
};
