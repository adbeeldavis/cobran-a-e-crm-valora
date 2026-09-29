import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  Download, 
  Printer, 
  CheckCircle2, 
  Users, 
  DollarSign, 
  FileText, 
  Sparkles, 
  Clock, 
  ShieldCheck, 
  RefreshCw,
  Award,
  ArrowRight,
  Filter
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  LineChart, 
  Line 
} from 'recharts';
import * as XLSX from 'xlsx';
import { DebtRecord, AppUser } from '../types';
import { computeWeeklyEfficiency, WeeklyEfficiencyComparison } from '../utils/weeklyEfficiencyService';
import { getDailyBackupStatus, checkAndExecuteDailyBackup, DailyBackupStatus } from '../utils/dailyBackupScheduler';

interface WeeklyEfficiencyReportProps {
  records: DebtRecord[];
  currentUser: AppUser;
  onSelectResponsavel?: (resp: string) => void;
  onAlertTriggered?: (msg: string) => void;
}

export const WeeklyEfficiencyReport: React.FC<WeeklyEfficiencyReportProps> = ({
  records,
  currentUser,
  onSelectResponsavel,
  onAlertTriggered
}) => {
  const [selectedOperator, setSelectedOperator] = useState<string>('todos');
  const [backupStatus, setBackupStatus] = useState<DailyBackupStatus>(() => getDailyBackupStatus());
  const [isTriggeringBackup, setIsTriggeringBackup] = useState<boolean>(false);

  // Filter records if operator is selected
  const filteredRecords = useMemo(() => {
    if (selectedOperator === 'todos') return records;
    return records.filter(r => (r.responsavel || '').toUpperCase().includes(selectedOperator.toUpperCase()));
  }, [records, selectedOperator]);

  // Compute weekly efficiency data
  const data: WeeklyEfficiencyComparison = useMemo(() => {
    return computeWeeklyEfficiency(filteredRecords);
  }, [filteredRecords]);

  // Prepare daily comparison chart data
  const chartDailyData = useMemo(() => {
    return data.semanaAtual.diasSemana.map((curDay, idx) => {
      const prevDay = data.semanaAnterior.diasSemana[idx] || { acordos: 0, valorRecuperado: 0, contatos: 0 };
      return {
        dia: curDay.diaNome,
        dataCur: curDay.data,
        acordosAtual: curDay.acordos,
        acordosAnterior: prevDay.acordos,
        valorAtual: curDay.valorRecuperado,
        valorAnterior: prevDay.valorRecuperado,
        contatosAtual: curDay.contatos,
        contatosAnterior: prevDay.contatos
      };
    });
  }, [data]);

  // Prepare operator comparison chart data
  const chartOperatorData = useMemo(() => {
    return data.semanaAtual.operadores.map(curOp => {
      const prevOp = data.semanaAnterior.operadores.find(o => o.nome === curOp.nome) || {
        acordos: 0,
        taxaRecuperacao: 0,
        valorRecuperado: 0
      };
      return {
        nome: curOp.nome,
        taxaAtual: curOp.taxaRecuperacao,
        taxaAnterior: prevOp.taxaRecuperacao,
        acordosAtual: curOp.acordos,
        acordosAnterior: prevOp.acordos,
        valorAtual: curOp.valorRecuperado,
        valorAnterior: prevOp.valorRecuperado
      };
    });
  }, [data]);

  // Export to Excel (.xlsx)
  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Resumo Comparativo
    const summaryRows = [
      { 'Métrica de Eficiência': 'Período', 'Semana Anterior': `${data.semanaAnterior.startDate} a ${data.semanaAnterior.endDate}`, 'Semana Atual': `${data.semanaAtual.startDate} a ${data.semanaAtual.endDate}`, 'Variação': 'Comparativo Semanal' },
      { 'Métrica de Eficiência': 'Taxa de Recuperação Total (%)', 'Semana Anterior': `${data.semanaAnterior.taxaRecuperacao}%`, 'Semana Atual': `${data.semanaAtual.taxaRecuperacao}%`, 'Variação': `${data.variacaoTaxaRecuperacao.pontosPercentuais > 0 ? '+' : ''}${data.variacaoTaxaRecuperacao.pontosPercentuais} p.p. (${data.variacaoTaxaRecuperacao.percentualRelativo}%)` },
      { 'Métrica de Eficiência': 'Total de Acordos Firmados', 'Semana Anterior': data.semanaAnterior.totalAcordos, 'Semana Atual': data.semanaAtual.totalAcordos, 'Variação': `${data.variacaoAcordos.absoluta > 0 ? '+' : ''}${data.variacaoAcordos.absoluta} acordos (${data.variacaoAcordos.percentual}%)` },
      { 'Métrica de Eficiência': 'Valor Total Recuperado (R$)', 'Semana Anterior': `R$ ${data.semanaAnterior.valorTotalRecuperado.toFixed(2)}`, 'Semana Atual': `R$ ${data.semanaAtual.valorTotalRecuperado.toFixed(2)}`, 'Variação': `R$ ${data.variacaoValorRecuperado.absoluta > 0 ? '+' : ''}${data.variacaoValorRecuperado.absoluta.toFixed(2)} (${data.variacaoValorRecuperado.percentual}%)` },
      { 'Métrica de Eficiência': 'Contatos Realizados', 'Semana Anterior': data.semanaAnterior.totalContatos, 'Semana Atual': data.semanaAtual.totalContatos, 'Variação': `${data.variacaoContatos.absoluta > 0 ? '+' : ''}${data.variacaoContatos.absoluta} contatos` },
      { 'Métrica de Eficiência': 'Taxa de Conversão por Contato (%)', 'Semana Anterior': `${data.semanaAnterior.taxaConversaoContatos}%`, 'Semana Atual': `${data.semanaAtual.taxaConversaoContatos}%`, 'Variação': `${(data.semanaAtual.taxaConversaoContatos - data.semanaAnterior.taxaConversaoContatos).toFixed(2)} p.p.` },
      { 'Métrica de Eficiência': 'Destaque Operacional', 'Semana Anterior': '-', 'Semana Atual': `${data.melhorOperadorSemana.nome} (+${data.melhorOperadorSemana.evolucaoAcordos} acordos)`, 'Variação': 'Líder em Eficiência' }
    ];

    const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumo Comparativo');

    // Sheet 2: Detalhamento por Operador
    const opRows = data.semanaAtual.operadores.map(curOp => {
      const prevOp = data.semanaAnterior.operadores.find(o => o.nome === curOp.nome) || { acordos: 0, valorRecuperado: 0, taxaRecuperacao: 0, contatos: 0 };
      return {
        'Operador': curOp.nome,
        'Acordos Sem. Anterior': prevOp.acordos,
        'Acordos Sem. Atual': curOp.acordos,
        'Variação Acordos': curOp.acordos - prevOp.acordos,
        'Taxa Recup. Anterior (%)': `${prevOp.taxaRecuperacao.toFixed(1)}%`,
        'Taxa Recup. Atual (%)': `${curOp.taxaRecuperacao.toFixed(1)}%`,
        'Variação Taxa (p.p.)': `${(curOp.taxaRecuperacao - prevOp.taxaRecuperacao).toFixed(1)} p.p.`,
        'Valor Recup. Anterior (R$)': prevOp.valorRecuperado,
        'Valor Recup. Atual (R$)': curOp.valorRecuperado,
        'Variação Valor (R$)': curOp.valorRecuperado - prevOp.valorRecuperado
      };
    });

    const wsOp = XLSX.utils.json_to_sheet(opRows);
    XLSX.utils.book_append_sheet(wb, wsOp, 'Operadores');

    // Sheet 3: Detalhamento Diário
    const dailyRows = data.semanaAtual.diasSemana.map((curDay, idx) => {
      const prevDay = data.semanaAnterior.diasSemana[idx] || { acordos: 0, valorRecuperado: 0, contatos: 0 };
      return {
        'Dia': curDay.diaNome,
        'Data Sem. Atual': curDay.data,
        'Acordos Sem. Anterior': prevDay.acordos,
        'Acordos Sem. Atual': curDay.acordos,
        'Valor Sem. Anterior (R$)': prevDay.valorRecuperado,
        'Valor Sem. Atual (R$)': curDay.valorRecuperado,
        'Contatos Sem. Anterior': prevDay.contatos,
        'Contatos Sem. Atual': curDay.contatos
      };
    });

    const wsDaily = XLSX.utils.json_to_sheet(dailyRows);
    XLSX.utils.book_append_sheet(wb, wsDaily, 'Evolução Diária');

    XLSX.writeFile(wb, `Relatorio_Semanal_Eficiencia_${data.semanaAtual.startDate.replace(/\//g, '-')}.xlsx`);
  };

  // Trigger manual 08:00 critical backup snapshot
  const handleForceSnapshot = async () => {
    setIsTriggeringBackup(true);
    try {
      const result = await checkAndExecuteDailyBackup(records, true);
      setBackupStatus(getDailyBackupStatus());
      if (result.executed) {
        if (onAlertTriggered) {
          onAlertTriggered(`💾 Snapshot Diário das 08:00 gravado com sucesso! ${result.meta?.totalRegistros} registros protegidos.`);
        }
      }
    } finally {
      setIsTriggeringBackup(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Top Banner & Control Bar */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-700 text-white uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              Relatório Semanal de Eficiência
            </span>
            <span className="text-xs text-slate-500 font-medium">
              Comparativo: Semana Atual ({data.semanaAtual.startDate} a {data.semanaAtual.endDate}) vs Semana Anterior ({data.semanaAnterior.startDate} a {data.semanaAnterior.endDate})
            </span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-1.5">
            Evolução Semanal da Recuperação &amp; Acordos
          </h2>
          <p className="text-xs text-slate-600 mt-1 max-w-3xl leading-relaxed">
            {data.analiseExecutiva}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <Filter className="w-3.5 h-3.5 text-slate-500 ml-2" />
            <select
              value={selectedOperator}
              onChange={(e) => setSelectedOperator(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 pr-2 py-1 focus:outline-none cursor-pointer"
            >
              <option value="todos">Todas as Cobradoras</option>
              <option value="ANA LUIZA">Ana Luiza</option>
              <option value="ROSANA">Rosana</option>
              <option value="KEYLLA">Keylla</option>
              <option value="FABIOLA">Fabíola</option>
            </select>
          </div>

          <button
            type="button"
            onClick={handleExportExcel}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
            title="Exportar dados comparativos para planilha Excel .xlsx"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar .XLSX</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 flex items-center gap-1.5 transition-all cursor-pointer no-print"
            title="Imprimir Resumo Semanal para Diretoria"
          >
            <Printer className="w-3.5 h-3.5 text-slate-600" />
            <span>Imprimir / PDF</span>
          </button>
        </div>
      </div>

      {/* Daily 08:00 Automated Critical Backup Banner Widget */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-4 rounded-2xl border border-blue-900/50 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-400/30 flex items-center justify-center shrink-0 text-blue-300">
            <Clock className="w-5 h-5 text-blue-300 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-blue-300 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Agendador Recorrente de Backup Crítico (08:00)
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Ativo • Diário Automático
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              {backupStatus.isTodayDone ? (
                <span>
                  ✅ Snapshot diário consolidado das 08:00 realizado com sucesso hoje ({backupStatus.lastBackupFormatted || 'Horário matutino'}). {backupStatus.lastBackupRecordsCount || records.length} registros preservados no histórico.
                </span>
              ) : (
                <span>
                  ⏰ Próxima execução automática agendada para: <strong className="text-white">{backupStatus.nextScheduledTime}</strong>. Salva snapshot de disaster-recovery independente de alterações manuais.
                </span>
              )}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleForceSnapshot}
          disabled={isTriggeringBackup}
          className="px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white border border-blue-400/40 flex items-center justify-center gap-1.5 transition-all shadow-xs shrink-0 cursor-pointer disabled:opacity-50"
          title="Executar snapshot consolidado de backup agora"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isTriggeringBackup ? 'animate-spin' : ''}`} />
          <span>{isTriggeringBackup ? 'Salvando...' : 'Snapshot Agora (08:00)'}</span>
        </button>
      </div>

      {/* 4 Core Comparative KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI 1: Taxa de Recuperação Total */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden group hover:border-blue-300 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Taxa de Recuperação Total
            </span>
            <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${
              data.variacaoTaxaRecuperacao.crescimento 
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                : 'bg-rose-50 text-rose-700 border border-rose-200'
            }`}>
              {data.variacaoTaxaRecuperacao.crescimento ? (
                <TrendingUp className="w-3.5 h-3.5" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5" />
              )}
              <span>
                {data.variacaoTaxaRecuperacao.pontosPercentuais > 0 ? '+' : ''}
                {data.variacaoTaxaRecuperacao.pontosPercentuais} p.p.
              </span>
            </div>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 tracking-tight">
              {data.semanaAtual.taxaRecuperacao}%
            </span>
            <span className="text-xs text-slate-400 line-through font-semibold">
              {data.semanaAnterior.taxaRecuperacao}%
            </span>
          </div>

          <p className="text-[11px] text-slate-500 mt-2">
            {data.variacaoTaxaRecuperacao.crescimento ? 'Evolução de' : 'Redução de'}{' '}
            <strong className={data.variacaoTaxaRecuperacao.crescimento ? 'text-emerald-700' : 'text-rose-700'}>
              {Math.abs(data.variacaoTaxaRecuperacao.percentualRelativo)}%
            </strong>{' '}
            em relação à semana anterior.
          </p>

          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
            <span>Sem. Anterior: {data.semanaAnterior.startDate}</span>
            <span>Sem. Atual: {data.semanaAtual.startDate}</span>
          </div>
        </div>

        {/* KPI 2: Número de Acordos Firmados */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden group hover:border-blue-300 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Acordos Firmados
            </span>
            <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${
              data.variacaoAcordos.crescimento 
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                : 'bg-rose-50 text-rose-700 border border-rose-200'
            }`}>
              {data.variacaoAcordos.crescimento ? (
                <TrendingUp className="w-3.5 h-3.5" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5" />
              )}
              <span>
                {data.variacaoAcordos.absoluta > 0 ? '+' : ''}
                {data.variacaoAcordos.absoluta} ({data.variacaoAcordos.percentual > 0 ? '+' : ''}{data.variacaoAcordos.percentual}%)
              </span>
            </div>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 tracking-tight">
              {data.semanaAtual.totalAcordos}
            </span>
            <span className="text-xs text-slate-400 line-through font-semibold">
              {data.semanaAnterior.totalAcordos}
            </span>
          </div>

          <p className="text-[11px] text-slate-500 mt-2">
            Total acumulado de propostas aceitas e boletos emitidos pelas cobradoras.
          </p>

          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
            <span>Boletos: {data.semanaAtual.boletosGerados}</span>
            <span>Conversão: {data.semanaAtual.taxaConversaoContatos}%</span>
          </div>
        </div>

        {/* KPI 3: Valor Total Recuperado (R$) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden group hover:border-blue-300 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Volume Financeiro Recuperado
            </span>
            <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${
              data.variacaoValorRecuperado.crescimento 
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                : 'bg-rose-50 text-rose-700 border border-rose-200'
            }`}>
              {data.variacaoValorRecuperado.crescimento ? (
                <TrendingUp className="w-3.5 h-3.5" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5" />
              )}
              <span>
                {data.variacaoValorRecuperado.percentual > 0 ? '+' : ''}
                {data.variacaoValorRecuperado.percentual}%
              </span>
            </div>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              R$ {data.semanaAtual.valorTotalRecuperado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>

          <p className="text-[11px] text-slate-500 mt-2">
            Variação líquida de{' '}
            <strong className={data.variacaoValorRecuperado.crescimento ? 'text-emerald-700' : 'text-rose-700'}>
              {data.variacaoValorRecuperado.absoluta > 0 ? '+R$ ' : '-R$ '}
              {Math.abs(data.variacaoValorRecuperado.absoluta).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </strong>{' '}
            vs semana anterior.
          </p>

          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
            <span>Anterior: R$ {data.semanaAnterior.valorTotalRecuperado.toLocaleString('pt-BR')}</span>
            <span>Atual: R$ {data.semanaAtual.valorTotalRecuperado.toLocaleString('pt-BR')}</span>
          </div>
        </div>

        {/* KPI 4: Melhor Operador Semanal */}
        <div className="bg-gradient-to-br from-blue-700 to-indigo-800 text-white p-5 rounded-2xl shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-blue-200 uppercase tracking-wider flex items-center gap-1">
              <Award className="w-3.5 h-3.5 text-amber-300" />
              Maior Ganho de Eficiência
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
              Destaque
            </span>
          </div>

          <div className="mt-1">
            <h3 className="text-2xl font-black tracking-tight text-white">
              {data.melhorOperadorSemana.nome}
            </h3>
            <div className="mt-2 flex items-center gap-3 text-xs text-blue-100">
              <div>
                <span className="text-blue-300 text-[10px] block">Acordos Fechados:</span>
                <strong className="text-white text-base">{data.melhorOperadorSemana.acordos}</strong>
              </div>
              <div className="border-l border-blue-500/50 pl-3">
                <span className="text-blue-300 text-[10px] block">Evolução:</span>
                <strong className="text-emerald-300 text-base">+{data.melhorOperadorSemana.evolucaoAcordos} acordos</strong>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-blue-500/40 text-[11px] text-blue-200 flex items-center justify-between">
            <span>Taxa Recup.: {data.melhorOperadorSemana.taxaRecuperacao.toFixed(1)}%</span>
            {onSelectResponsavel && (
              <button
                type="button"
                onClick={() => onSelectResponsavel(data.melhorOperadorSemana.nome)}
                className="underline hover:text-white flex items-center gap-0.5 text-[10px] cursor-pointer"
              >
                <span>Ver Carteira</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

      </div>

      {/* Visual Chart Comparison: Daily Acordos & Taxa de Recuperação */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Chart 1: Daily Comparison of Agreements (Semana Anterior vs Semana Atual) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <BarChart className="w-4 h-4 text-blue-700" />
                Acordos Firmados: Comparativo Dia a Dia
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Número de acordos fechados em cada dia da semana anterior vs atual
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-slate-500">
              Total: {data.semanaAtual.totalAcordos} vs {data.semanaAnterior.totalAcordos}
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartDailyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="dia" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                <Tooltip 
                  formatter={(value: any, name: any) => [
                    `${value} acordos`, 
                    name === 'acordosAtual' ? 'Semana Atual' : 'Semana Anterior'
                  ]}
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '11px' }}
                />
                <Legend 
                  verticalAlign="top" 
                  height={36} 
                  formatter={(value) => value === 'acordosAtual' ? 'Semana Atual' : 'Semana Anterior'}
                />
                <Bar dataKey="acordosAnterior" fill="#cbd5e1" radius={[4, 4, 0, 0]} name="acordosAnterior" />
                <Bar dataKey="acordosAtual" fill="#2563eb" radius={[4, 4, 0, 0]} name="acordosAtual" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Volume Financeiro Recuperado Dia a Dia */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                Volume Recuperado (R$): Semana Anterior vs Atual
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Valores liquidados e formalizados diariamente pelas operadoras
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-700">
              +{data.variacaoValorRecuperado.percentual}%
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartDailyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="dia" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis 
                  stroke="#64748b" 
                  fontSize={10} 
                  tickLine={false} 
                  tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} 
                />
                <Tooltip 
                  formatter={(value: any, name: any) => [
                    `R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 
                    name === 'valorAtual' ? 'Semana Atual' : 'Semana Anterior'
                  ]}
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '11px' }}
                />
                <Legend 
                  verticalAlign="top" 
                  height={36} 
                  formatter={(value) => value === 'valorAtual' ? 'Semana Atual (R$)' : 'Semana Anterior (R$)'}
                />
                <Bar dataKey="valorAnterior" fill="#94a3b8" radius={[4, 4, 0, 0]} name="valorAnterior" />
                <Bar dataKey="valorAtual" fill="#10b981" radius={[4, 4, 0, 0]} name="valorAtual" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Operator Comparative Breakdown Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-5 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-700" />
              Detalhamento Comparativo de Eficiência por Cobradora
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Balanço individual de acordos firmados, taxa de recuperação da carteira e variação semanal
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
            {data.semanaAtual.operadores.length} Cobradoras Analisadas
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                <th className="p-3.5">Cobradora Responsável</th>
                <th className="p-3.5 text-center">Acordos (Sem. Anterior)</th>
                <th className="p-3.5 text-center">Acordos (Sem. Atual)</th>
                <th className="p-3.5 text-center">Evolução Acordos</th>
                <th className="p-3.5 text-right">Taxa Recup. Anterior</th>
                <th className="p-3.5 text-right">Taxa Recup. Atual</th>
                <th className="p-3.5 text-right">Variação Taxa</th>
                <th className="p-3.5 text-right">Valor Sem. Atual (R$)</th>
                <th className="p-3.5 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {data.semanaAtual.operadores.map((curOp) => {
                const prevOp = data.semanaAnterior.operadores.find(o => o.nome === curOp.nome) || {
                  acordos: 0,
                  taxaRecuperacao: 0,
                  valorRecuperado: 0
                };
                const deltaAcordos = curOp.acordos - prevOp.acordos;
                const deltaTaxa = curOp.taxaRecuperacao - prevOp.taxaRecuperacao;
                const isLeader = curOp.nome === data.melhorOperadorSemana.nome;

                return (
                  <tr key={curOp.nome} className={`hover:bg-slate-50/80 transition-colors ${isLeader ? 'bg-blue-50/30' : ''}`}>
                    <td className="p-3.5 font-bold text-slate-900 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-800 font-black text-[10px] flex items-center justify-center">
                        {curOp.nome[0]}
                      </span>
                      <span>{curOp.nome}</span>
                      {isLeader && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-0.5">
                          <Award className="w-2.5 h-2.5 text-amber-600" />
                          Líder
                        </span>
                      )}
                    </td>

                    <td className="p-3.5 text-center font-semibold text-slate-500">
                      {prevOp.acordos}
                    </td>

                    <td className="p-3.5 text-center font-bold text-slate-900">
                      {curOp.acordos}
                    </td>

                    <td className="p-3.5 text-center">
                      <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        deltaAcordos > 0 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                          : deltaAcordos === 0 
                          ? 'bg-slate-50 text-slate-600' 
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {deltaAcordos > 0 ? `+${deltaAcordos}` : deltaAcordos}
                      </span>
                    </td>

                    <td className="p-3.5 text-right font-mono text-slate-500">
                      {prevOp.taxaRecuperacao.toFixed(1)}%
                    </td>

                    <td className="p-3.5 text-right font-mono font-bold text-blue-900">
                      {curOp.taxaRecuperacao.toFixed(1)}%
                    </td>

                    <td className="p-3.5 text-right">
                      <span className={`inline-flex items-center gap-0.5 font-mono text-xs font-bold ${
                        deltaTaxa >= 0 ? 'text-emerald-700' : 'text-rose-700'
                      }`}>
                        {deltaTaxa > 0 ? `+${deltaTaxa.toFixed(1)} p.p.` : `${deltaTaxa.toFixed(1)} p.p.`}
                      </span>
                    </td>

                    <td className="p-3.5 text-right font-mono font-bold text-slate-900">
                      R$ {curOp.valorRecuperado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>

                    <td className="p-3.5 text-center">
                      {onSelectResponsavel && (
                        <button
                          type="button"
                          onClick={() => onSelectResponsavel(curOp.nome)}
                          className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700 transition-colors border border-slate-200 cursor-pointer"
                        >
                          Ver Clientes
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
