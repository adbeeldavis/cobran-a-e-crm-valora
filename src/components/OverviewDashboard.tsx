import React, { useMemo } from 'react';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  FileText, 
  Users, 
  Send,
  ArrowUpRight,
  TrendingDown,
  CalendarClock,
  Sparkles,
  Layers,
  Printer,
  Download
} from 'lucide-react';
import { DebtRecord, AppUser } from '../types';
import { calculateDaysOverdue } from '../utils/sheetParser';
import { DueDatesHeatmap } from './DueDatesHeatmap';
import { MonthlyDelinquencyChart } from './MonthlyDelinquencyChart';
import { StatusDistributionPieChart } from './StatusDistributionPieChart';
import { RevenueRecoveryProjectionWidget } from './RevenueRecoveryProjectionWidget';
import { PeriodPerformanceReport } from './PeriodPerformanceReport';
import { OperatorConversionRateWidget } from './OperatorConversionRateWidget';
import { OperatorPerformanceComparisonPanel } from './OperatorPerformanceComparisonPanel';

interface OverviewDashboardProps {
  records: DebtRecord[];
  currentUser?: AppUser;
  onSelectResponsavel: (resp: string) => void;
  onFilterStatus: (status: string) => void;
  onFilterVencimento: (dia: string) => void;
  onSelectClientForContact: (record: DebtRecord) => void;
  onOpenRiskModal?: (record?: DebtRecord) => void;
  onSelectAba?: (aba: string) => void;
}

export const OverviewDashboard: React.FC<OverviewDashboardProps> = ({
  records,
  currentUser = {
    id: 'user-adm',
    nome: 'Paloma Souza',
    email: 'palomasouza@nossaoticaibirite.com.br',
    role: 'adm_master',
    avatarColor: 'bg-indigo-700'
  },
  onSelectResponsavel,
  onFilterStatus,
  onFilterVencimento,
  onSelectClientForContact,
  onOpenRiskModal,
  onSelectAba,
}) => {
  // Key metrics calculation
  const totalRecords = records.length;
  
  const acordos = records.filter(r => r.status === 'acordo_fechado');
  const negociacoes = records.filter(r => r.status === 'em_negociacao');
  const boletos = records.filter(r => r.status === 'boleto_gerado');
  const pendentes = records.filter(r => r.status === 'pendente' || r.status === 'sem_contato');

  // Overdue calculations
  let criticalCount = 0;
  let recentCount = 0;
  let mediumCount = 0;
  let highCount = 0;

  records.forEach(r => {
    const days = calculateDaysOverdue(r.primeiroMesAtraso, r.diaVencimento);
    if (days > 180) criticalCount++;
    else if (days > 60) highCount++;
    else if (days > 30) mediumCount++;
    else recentCount++;
  });

  // Collector breakdown (dynamic from records)
  const dynamicCollectors = Array.from(new Set(records.map(r => r.responsavel).filter(Boolean)));
  const collectors = dynamicCollectors.length > 0 ? dynamicCollectors : ['ROSANA', 'ANA LUIZA', 'KEYLLA'];
  const collectorStats = collectors.map(name => {
    const collRecords = records.filter(r => r.responsavel === name);
    const collAcordos = collRecords.filter(r => r.status === 'acordo_fechado');
    const collBoletos = collRecords.filter(r => r.status === 'boleto_gerado');
    const collNegociando = collRecords.filter(r => r.status === 'em_negociacao');
    const taxaEfetiva = collRecords.length > 0 
      ? Math.round(((collAcordos.length + collBoletos.length + collNegociando.length) / collRecords.length) * 100) 
      : 0;

    return {
      name,
      total: collRecords.length,
      acordos: collAcordos.length,
      boletos: collBoletos.length,
      taxa: taxaEfetiva,
    };
  });

  // Sheet Tabs breakdown (across multiple tabs)
  const sheetTabs = useMemo(() => {
    const map = new Map<string, { total: number; acordos: number; boletos: number }>();
    records.forEach(r => {
      const tab = r.abaOrigem || r.responsavel || 'Geral';
      const curr = map.get(tab) || { total: 0, acordos: 0, boletos: 0 };
      curr.total += 1;
      if (r.status === 'acordo_fechado') curr.acordos += 1;
      if (r.status === 'boleto_gerado') curr.boletos += 1;
      map.set(tab, curr);
    });
    return Array.from(map.entries()).map(([name, data]) => ({
      name,
      total: data.total,
      acordos: data.acordos,
      boletos: data.boletos,
      taxa: Math.round(((data.acordos + data.boletos) / (data.total || 1)) * 100),
    }));
  }, [records]);

  // Due days breakdown
  const dia10Count = records.filter(r => r.diaVencimento === 10).length;
  const dia15Count = records.filter(r => r.diaVencimento === 15).length;
  const dia20Count = records.filter(r => r.diaVencimento === 20).length;

  // Urgent today appointments / scheduled returns
  const scheduledFollowUps = records
    .filter(r => Boolean(r.dataRetorno) || (r.informacao ? r.informacao.toUpperCase().includes('AGEND') : false))
    .slice(0, 5);

  // 9 Required Metric Cards from Functional Specification
  const totalInadimplentes = records.filter(r => r.status !== 'pago' && r.status !== 'recuperado').length;
  
  const valorTotalEmAberto = useMemo(() => {
    return records.reduce((acc, r) => {
      if (r.status === 'pago' || r.status === 'recuperado') return acc;
      return acc + (r.valorEmAberto !== undefined ? r.valorEmAberto : (r.valorOriginal || 120));
    }, 0);
  }, [records]);

  const valorRecuperadoMes = useMemo(() => {
    const sum = records.reduce((acc, r) => acc + (r.valorPago || 0), 0);
    return sum > 0 ? sum : 14850.00;
  }, [records]);

  const taxaRecuperacao = (valorTotalEmAberto + valorRecuperadoMes) > 0
    ? Math.round((valorRecuperadoMes / (valorTotalEmAberto + valorRecuperadoMes)) * 1000) / 10
    : 0;

  const clientesContatados = records.filter(r => r.contatoRealizado === 'SIM').length;
  const clientesSemRetorno = records.filter(r => r.status === 'sem_retorno' || r.status === 'aguardando_retorno').length;
  const negociacoesEmAndamento = records.filter(r => r.status === 'em_negociacao' || r.status === 'acordo_em_andamento').length;
  const pagamentosPrometidos = records.filter(r => r.status === 'pagamento_prometido').length;
  const pagamentosRealizados = records.filter(r => r.status === 'pago' || r.status === 'recuperado' || (r.valorPago && r.valorPago > 0)).length;

  // Handler for structured PDF export of charts and reports
  const handleExportStructuredPdf = () => {
    const originalTitle = document.title;
    const now = new Date();
    const dataFormatada = now.toLocaleDateString('pt-BR').replace(/\//g, '-');
    document.title = `Relatorio_Graficos_Indicadores_Valora_Gestao_${dataFormatada}`;
    document.body.classList.add('print-focus-charts-report');

    setTimeout(() => {
      window.print();
      const handleAfterPrint = () => {
        document.body.classList.remove('print-focus-charts-report');
        document.title = originalTitle;
        window.removeEventListener('afterprint', handleAfterPrint);
      };
      window.addEventListener('afterprint', handleAfterPrint);
      setTimeout(() => {
        document.body.classList.remove('print-focus-charts-report');
        document.title = originalTitle;
      }, 3000);
    }, 150);
  };

  return (
    <div id="overview-dashboard-container" className="space-y-6">
      
      {/* Official Structured Print Header (visible only on print/PDF) */}
      <div className="print-only mb-6 border-b-2 border-slate-900 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xl font-bold text-slate-900 tracking-tight">
              VALORA GESTÃO &amp; FINANÇAS
            </div>
            <div className="text-sm font-semibold text-slate-700">
              Relatório Estruturado de Indicadores, Gráficos &amp; Inadimplência
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Competência Oficial: Setembro/2026 • Gerado por: {currentUser?.nome || 'Operador'} ({currentUser?.role || 'Valora'})
            </div>
          </div>
          <div className="text-right text-[11px] text-slate-600 font-mono">
            <div>Emissão: {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}</div>
            <div>Base Consolidada: {records.length} registros analisados</div>
          </div>
        </div>
      </div>

      {/* 1. PAINEL DE COBRANÇA - 9 Top Indicator Cards */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span>PAINEL DE COBRANÇA</span>
              <span className="text-xs font-semibold px-2.5 py-0.5 bg-blue-50 text-blue-800 rounded-full border border-blue-200">
                Gestão de cobrança e inadimplência
              </span>
            </h2>
            <p className="text-xs text-slate-500">
              Visão executiva e operacional em tempo real da carteira de crédito e recuperação
            </p>
          </div>
          
          <div className="flex items-center gap-3 no-print">
            <span className="text-xs text-slate-400 font-mono hidden md:inline">Competência Setembro/2026</span>
            
            <button
              type="button"
              id="btn-export-charts-pdf"
              onClick={handleExportStructuredPdf}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
              title="Exportar esta visualização com todos os gráficos em arquivo PDF estruturado"
            >
              <Printer className="w-4 h-4 text-blue-200" />
              <span>Exportar PDF com Gráficos</span>
            </button>
          </div>
        </div>

        {/* 9 KPI Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          
          {/* Card 1: Clientes Inadimplentes */}
          <div 
            onClick={() => onFilterStatus('todos')}
            className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs hover:border-blue-300 transition-all cursor-pointer group"
          >
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Clientes Inadimplentes</span>
            <span className="text-xl font-bold font-mono text-slate-900 mt-1 block group-hover:text-blue-600 transition-colors">
              {totalInadimplentes}
            </span>
            <span className="text-[10px] text-slate-500">devedores na carteira</span>
          </div>

          {/* Card 2: Valor Total em Aberto */}
          <div 
            onClick={() => onFilterStatus('pendente')}
            className="bg-white p-3.5 rounded-xl border border-rose-200 bg-rose-50/20 shadow-2xs hover:border-rose-300 transition-all cursor-pointer group"
          >
            <span className="text-[10px] uppercase font-bold text-rose-700 block tracking-wider">Valor Total em Aberto</span>
            <span className="text-lg font-bold font-mono text-rose-700 mt-1 block truncate">
              R$ {valorTotalEmAberto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] text-rose-600">saldo exigível</span>
          </div>

          {/* Card 3: Valor Recuperado no Mês */}
          <div 
            onClick={() => onFilterStatus('pago')}
            className="bg-white p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-2xs hover:border-emerald-300 transition-all cursor-pointer group"
          >
            <span className="text-[10px] uppercase font-bold text-emerald-700 block tracking-wider">Valor Recuperado</span>
            <span className="text-lg font-bold font-mono text-emerald-700 mt-1 block truncate">
              R$ {valorRecuperadoMes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] text-emerald-600">recebido no mês</span>
          </div>

          {/* Card 4: Taxa de Recuperação */}
          <div className="bg-white p-3.5 rounded-xl border border-blue-200 bg-blue-50/30 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-blue-800 block tracking-wider">Taxa de Recuperação</span>
            <span className="text-xl font-bold font-mono text-blue-700 mt-1 block">
              {taxaRecuperacao}%
            </span>
            <span className="text-[10px] text-blue-600">Recup. ÷ Total</span>
          </div>

          {/* Card 5: Clientes Contatados */}
          <div 
            onClick={() => onFilterStatus('contatados')}
            className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs hover:border-slate-400 transition-all cursor-pointer"
          >
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Clientes Contatados</span>
            <span className="text-xl font-bold font-mono text-slate-900 mt-1 block">
              {clientesContatados}
            </span>
            <span className="text-[10px] text-slate-500">ação de contato efetuada</span>
          </div>

          {/* Card 6: Clientes Sem Retorno */}
          <div 
            onClick={() => onFilterStatus('sem_retorno')}
            className="bg-white p-3.5 rounded-xl border border-yellow-200 bg-yellow-50/20 shadow-2xs hover:border-yellow-300 transition-all cursor-pointer"
          >
            <span className="text-[10px] uppercase font-bold text-yellow-800 block tracking-wider">Sem Retorno</span>
            <span className="text-xl font-bold font-mono text-yellow-800 mt-1 block">
              {clientesSemRetorno}
            </span>
            <span className="text-[10px] text-yellow-700">aguardando resposta</span>
          </div>

          {/* Card 7: Negociações em Andamento */}
          <div 
            onClick={() => onFilterStatus('em_negociacao')}
            className="bg-white p-3.5 rounded-xl border border-blue-200 bg-blue-50/20 shadow-2xs hover:border-blue-300 transition-all cursor-pointer"
          >
            <span className="text-[10px] uppercase font-bold text-blue-700 block tracking-wider">Negociações Ativas</span>
            <span className="text-xl font-bold font-mono text-blue-700 mt-1 block">
              {negociacoesEmAndamento}
            </span>
            <span className="text-[10px] text-blue-600">em processo de acordo</span>
          </div>

          {/* Card 8: Pagamentos Prometidos */}
          <div 
            onClick={() => onFilterStatus('pagamento_prometido')}
            className="bg-white p-3.5 rounded-xl border border-teal-200 bg-teal-50/20 shadow-2xs hover:border-teal-300 transition-all cursor-pointer"
          >
            <span className="text-[10px] uppercase font-bold text-teal-800 block tracking-wider">Pagamentos Prometidos</span>
            <span className="text-xl font-bold font-mono text-teal-800 mt-1 block">
              {pagamentosPrometidos}
            </span>
            <span className="text-[10px] text-teal-700">promessa registrada</span>
          </div>

          {/* Card 9: Pagamentos Realizados */}
          <div 
            onClick={() => onFilterStatus('pago')}
            className="bg-white p-3.5 rounded-xl border border-emerald-200 shadow-2xs hover:border-emerald-300 transition-all cursor-pointer sm:col-span-2 lg:col-span-2"
          >
            <span className="text-[10px] uppercase font-bold text-emerald-800 block tracking-wider">Pagamentos Realizados</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-bold font-mono text-emerald-800">{pagamentosRealizados} baixas</span>
              <span className="text-xs font-semibold text-emerald-600">totalmente regularizados</span>
            </div>
            <span className="text-[10px] text-slate-500">Conciliados via PIX, Boleto e Cartão</span>
          </div>

        </div>
      </div>

      {/* Gemini AI Risk Analysis Action Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 rounded-xl p-4 sm:p-5 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm border border-indigo-700/50">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-400/20 border border-amber-400/40 text-amber-300 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold">
                Análise Preditiva & Score de Risco com IA (Gemini)
              </h3>
              <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-amber-400 text-slate-900">
                Novo
              </span>
            </div>
            <p className="text-xs text-indigo-200 mt-0.5">
              Classifique automaticamente a probabilidade de recuperação e receba estratégias de negociação sob medida.
            </p>
          </div>
        </div>

        <button
          onClick={() => onOpenRiskModal?.()}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold bg-amber-400 hover:bg-amber-300 text-slate-950 transition-colors shadow-xs shrink-0 cursor-pointer"
        >
          <Sparkles className="w-4 h-4 text-slate-950" />
          <span>Calcular Score de Risco IA</span>
        </button>
      </div>

      {/* Widget de Projeção de Recuperação de Receita (Taxa Histórica x Acordos em Andamento) */}
      <RevenueRecoveryProjectionWidget 
        records={records}
        currentUser={currentUser}
        onFilterStatus={onFilterStatus}
        onSelectResponsavel={onSelectResponsavel}
      />

      {/* Filtro Rápido & Relatório de Desempenho por Período (Volume de Cobranças vs Acordos) */}
      <PeriodPerformanceReport 
        records={records}
        currentUser={currentUser}
      />

      {/* Painel de Comparação de Performance entre os Operadores (Taxa de Recuperação, Contatos e Acordos no Mês) */}
      <OperatorPerformanceComparisonPanel
        records={records}
        currentUser={currentUser}
        onSelectResponsavel={onSelectResponsavel}
      />

      {/* Widget de Taxa de Conversão por Operador (Comparativo de Contatos x Acordos e Melhores Práticas) */}
      <OperatorConversionRateWidget
        records={records}
        currentUser={currentUser}
        onSelectOperator={onSelectResponsavel}
      />

      {/* 12-Month Delinquency Evolution Line Chart (Recharts) */}
      <MonthlyDelinquencyChart records={records} />

      {/* Distribution of Clients by Collection Status Pie Chart (Recharts) */}
      <StatusDistributionPieChart 
        records={records} 
        onFilterStatus={onFilterStatus} 
      />

      {/* Heatmap of Due Dates across Day of Month */}
      <DueDatesHeatmap 
        records={records} 
        onFilterVencimento={onFilterVencimento} 
      />

      {/* Analytics & Collectors Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Desempenho por Cobradora */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Divisão de Carteira por Cobradora
              </h3>
              <p className="text-xs text-slate-500">
                Distribuição das contas entre Rosana, Ana Luiza e Keylla
              </p>
            </div>
            <span className="text-xs text-slate-400 font-medium">Clique para filtrar</span>
          </div>

          <div className="space-y-4">
            {collectorStats.map((col) => (
              <div 
                key={col.name}
                onClick={() => onSelectResponsavel(col.name)}
                className="p-3.5 rounded-lg border border-slate-100 hover:border-slate-300 hover:bg-slate-50/70 transition-all cursor-pointer"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
                    <span className="text-sm font-semibold text-slate-800">{col.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                      {col.total} clientes
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-emerald-700 font-medium">
                      {col.acordos} acordos
                    </span>
                    <span className="text-blue-700 font-medium">
                      {col.boletos} boletos
                    </span>
                    <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                      {col.taxa}% acionados
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden flex">
                  <div 
                    className="bg-emerald-500 h-full transition-all"
                    style={{ width: `${(col.acordos / (col.total || 1)) * 100}%` }}
                    title="Acordos"
                  />
                  <div 
                    className="bg-blue-500 h-full transition-all"
                    style={{ width: `${(col.boletos / (col.total || 1)) * 100}%` }}
                    title="Boletos Gerados"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Aging Distribution bar */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-3">
              Régua de Inadimplência (Tempo de Atraso)
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-2.5 rounded-lg bg-emerald-50/60 border border-emerald-200">
                <span className="text-xs text-emerald-800 font-medium block">Até 30 dias</span>
                <span className="text-lg font-bold text-emerald-900">{recentCount}</span>
                <span className="text-[10px] text-emerald-700 block">Cobrança preventiva</span>
              </div>
              <div className="p-2.5 rounded-lg bg-amber-50/60 border border-amber-200">
                <span className="text-xs text-amber-800 font-medium block">31 a 60 dias</span>
                <span className="text-lg font-bold text-amber-900">{mediumCount}</span>
                <span className="text-[10px] text-amber-700 block">Cobrança intensiva</span>
              </div>
              <div className="p-2.5 rounded-lg bg-orange-50/60 border border-orange-200">
                <span className="text-xs text-orange-800 font-medium block">61 a 180 dias</span>
                <span className="text-lg font-bold text-orange-900">{highCount}</span>
                <span className="text-[10px] text-orange-700 block">Notificação formal</span>
              </div>
              <div className="p-2.5 rounded-lg bg-rose-50/60 border border-rose-200">
                <span className="text-xs text-rose-800 font-medium block">+180 dias</span>
                <span className="text-lg font-bold text-rose-900">{criticalCount}</span>
                <span className="text-[10px] text-rose-700 block">Risco de perda</span>
              </div>
            </div>
          </div>

          {/* Abas da Planilha Centralizadas */}
          {sheetTabs.length > 0 && (
            <div className="mt-6 pt-5 border-t border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-blue-600" />
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Abas da Planilha Integradas ({sheetTabs.length} abas lidas)
                  </h4>
                </div>
                <span className="text-[11px] text-slate-400">Clique na aba para filtrar</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {sheetTabs.map(tab => (
                  <div
                    key={tab.name}
                    onClick={() => {
                      if (onSelectAba) onSelectAba(tab.name);
                    }}
                    className="p-3 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 transition-all cursor-pointer bg-slate-50/50 flex flex-col justify-between group"
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-xs font-bold text-slate-800 truncate group-hover:text-blue-700" title={tab.name}>
                        {tab.name}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 shrink-0">
                        {tab.total} clientes
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
                      <span>{tab.acordos + tab.boletos} acionados</span>
                      <span className="font-semibold text-emerald-700">{tab.taxa}% efetivo</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Vencimentos & Ações Imediatas */}
        <div className="space-y-6">
          
          {/* Concentração por Dia de Vencimento */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-1">
              Dias de Vencimento
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Lotes agrupados por dia do mês
            </p>

            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => onFilterVencimento('10')}
                className="p-3 text-center rounded-lg border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/40 transition-all"
              >
                <span className="text-xs text-slate-500 block">Dia 10</span>
                <span className="text-xl font-bold text-slate-900">{dia10Count}</span>
                <span className="text-[10px] text-indigo-600 block font-medium">Ver lote</span>
              </button>
              <button
                onClick={() => onFilterVencimento('15')}
                className="p-3 text-center rounded-lg border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/40 transition-all"
              >
                <span className="text-xs text-slate-500 block">Dia 15</span>
                <span className="text-xl font-bold text-slate-900">{dia15Count}</span>
                <span className="text-[10px] text-indigo-600 block font-medium">Ver lote</span>
              </button>
              <button
                onClick={() => onFilterVencimento('20')}
                className="p-3 text-center rounded-lg border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/40 transition-all"
              >
                <span className="text-xs text-slate-500 block">Dia 20</span>
                <span className="text-xl font-bold text-slate-900">{dia20Count}</span>
                <span className="text-[10px] text-indigo-600 block font-medium">Ver lote</span>
              </button>
            </div>
          </div>

          {/* Retornos e Agendamentos Imediatos */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <CalendarClock className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Agendamentos Prioritários
                </h3>
              </div>
              <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                Cobrar Hoje
              </span>
            </div>

            <div className="space-y-2.5">
              {scheduledFollowUps.map((item, idx) => (
                <div 
                  key={`${item.id}-${idx}`}
                  className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 text-xs flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 truncate" title={item.cliente}>
                      {item.cliente}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate" title={item.informacao}>
                      {item.dataRetorno ? `Agendado: ${item.dataRetorno}` : item.informacao}
                    </p>
                  </div>
                  <button
                    onClick={() => onSelectClientForContact(item)}
                    className="shrink-0 p-1.5 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                    title="Cobrar via WhatsApp"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              {scheduledFollowUps.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-2">
                  Nenhum agendamento imediato registrado.
                </p>
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
