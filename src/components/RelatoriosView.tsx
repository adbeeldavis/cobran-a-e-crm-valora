import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  Download, 
  Printer, 
  Search, 
  Calendar, 
  DollarSign, 
  CheckCircle2, 
  AlertTriangle,
  Users,
  Handshake,
  Clock,
  ArrowUpDown,
  Building,
  ShieldCheck,
  TrendingUp,
  Award,
  Layers,
  FileCheck2,
  FileSpreadsheet,
  ArrowUpRight
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { DebtRecord, AppUser } from '../types';
import { exportFinancialSummaryPdf } from '../utils/pdfExportService';
import { OperatorConversionRateWidget } from './OperatorConversionRateWidget';
import { WeeklyEfficiencyReport } from './WeeklyEfficiencyReport';
import { OperatorPerformanceComparisonPanel } from './OperatorPerformanceComparisonPanel';

interface RelatoriosViewProps {
  records: DebtRecord[];
  currentUser: AppUser;
  onSelectResponsavel?: (resp: string) => void;
}

type ReportType = 
  | 'inadimplencia'
  | 'recuperacao'
  | 'comparativo_operadores'
  | 'eficiencia_semanal'
  | 'cobrancas_realizadas'
  | 'negociacoes'
  | 'pagamentos'
  | 'performance_responsavel'
  | 'clientes_recorrentes'
  | 'clientes_sem_retorno';

export const RelatoriosView: React.FC<RelatoriosViewProps> = ({
  records,
  currentUser,
  onSelectResponsavel
}) => {
  const [selectedReport, setSelectedReport] = useState<ReportType>('inadimplencia');
  const [selectedPeriodo, setSelectedPeriodo] = useState<string>('mes_atual');
  const [selectedResp, setSelectedResp] = useState<string>('todos');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [viewMode, setViewMode] = useState<'resumo_gerencia' | 'tabela'>('resumo_gerencia');

  // Generate data based on selected report
  const reportData = useMemo(() => {
    let list = records;

    // Filter by collector
    if (selectedResp !== 'todos') {
      list = list.filter(r => (r.responsavel || '').toUpperCase().includes(selectedResp.toUpperCase()));
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(r => 
        (r.cliente || '').toLowerCase().includes(q) || 
        (r.matricula || '').toLowerCase().includes(q)
      );
    }

    switch (selectedReport) {
      case 'inadimplencia':
        return list.filter(r => r.status !== 'pago' && r.status !== 'recuperado');
      case 'recuperacao':
        return list.filter(r => r.status === 'pago' || r.status === 'recuperado' || (r.valorPago && r.valorPago > 0));
      case 'cobrancas_realizadas':
        return list.filter(r => r.contatoRealizado === 'SIM');
      case 'negociacoes':
        return list.filter(r => r.status === 'em_negociacao' || r.status === 'acordo_em_andamento' || (r.historicoNegociacoes && r.historicoNegociacoes.length > 0));
      case 'pagamentos':
        return list.filter(r => r.valorPago && r.valorPago > 0);
      case 'performance_responsavel':
        return list;
      case 'clientes_recorrentes':
        return list.filter(r => r.inadimplenteRecorrente || (r.diasAtraso || 0) > 120);
      case 'clientes_sem_retorno':
        return list.filter(r => r.status === 'sem_retorno' || r.status === 'aguardando_retorno');
      default:
        return list;
    }
  }, [records, selectedReport, selectedResp, searchTerm]);

  // Executive Management Metrics Calculation
  const metrics = useMemo(() => {
    const totalCount = reportData.length;
    const totalOriginal = reportData.reduce((acc, r) => acc + (r.valorOriginal || 120), 0);
    const totalAberto = reportData.reduce((acc, r) => acc + (r.valorEmAberto !== undefined ? r.valorEmAberto : (r.valorOriginal || 120)), 0);
    const totalPago = reportData.reduce((acc, r) => acc + (r.valorPago || 0), 0);
    const taxaRecuperacao = totalOriginal > 0 ? ((totalPago / totalOriginal) * 100).toFixed(1) : '0.0';
    const mediaDiasAtraso = totalCount > 0 ? Math.round(reportData.reduce((acc, r) => acc + (r.diasAtraso || 0), 0) / totalCount) : 0;
    const criticos45 = reportData.filter(r => (r.diasAtraso || 0) > 45).length;
    const criticos90 = reportData.filter(r => (r.diasAtraso || 0) > 90).length;
    const contatosRealizados = reportData.filter(r => r.contatoRealizado === 'SIM').length;
    const taxaContato = totalCount > 0 ? ((contatosRealizados / totalCount) * 100).toFixed(1) : '0.0';
    const acordosFormalizados = reportData.filter(r => 
      r.status === 'em_negociacao' || 
      r.status === 'acordo_em_andamento' || 
      r.status === 'acordo_fechado' || 
      r.status === 'pagamento_prometido'
    ).length;

    // Breakdown by Responsible Collector
    const porResponsavelMap: Record<string, { leads: number; aberto: number; pago: number; contatados: number; acordos: number }> = {};
    for (const r of reportData) {
      const resp = (r.responsavel || 'GERAL').toUpperCase().trim();
      if (!porResponsavelMap[resp]) {
        porResponsavelMap[resp] = { leads: 0, aberto: 0, pago: 0, contatados: 0, acordos: 0 };
      }
      porResponsavelMap[resp].leads += 1;
      porResponsavelMap[resp].aberto += (r.valorEmAberto !== undefined ? r.valorEmAberto : (r.valorOriginal || 120));
      porResponsavelMap[resp].pago += (r.valorPago || 0);
      if (r.contatoRealizado === 'SIM') porResponsavelMap[resp].contatados += 1;
      if (r.status === 'em_negociacao' || r.status === 'acordo_em_andamento' || r.status === 'acordo_fechado' || r.status === 'pagamento_prometido') {
        porResponsavelMap[resp].acordos += 1;
      }
    }

    const performanceLista = Object.entries(porResponsavelMap)
      .map(([nome, dados]) => ({
        nome,
        leads: dados.leads,
        aberto: dados.aberto,
        pago: dados.pago,
        contatados: dados.contatados,
        acordos: dados.acordos,
        eficacia: dados.aberto + dados.pago > 0 ? ((dados.pago / (dados.aberto + dados.pago)) * 100).toFixed(1) : '0.0'
      }))
      .sort((a, b) => b.aberto - a.aberto);

    // Breakdown by Aging (Faixa de atraso)
    const faixas = {
      ate30: { qtd: 0, valor: 0 },
      de31a60: { qtd: 0, valor: 0 },
      de61a90: { qtd: 0, valor: 0 },
      mais90: { qtd: 0, valor: 0 },
    };

    for (const r of reportData) {
      const dias = r.diasAtraso || 0;
      const v = (r.valorEmAberto !== undefined ? r.valorEmAberto : (r.valorOriginal || 120));
      if (dias <= 30) {
        faixas.ate30.qtd += 1;
        faixas.ate30.valor += v;
      } else if (dias <= 60) {
        faixas.de31a60.qtd += 1;
        faixas.de31a60.valor += v;
      } else if (dias <= 90) {
        faixas.de61a90.qtd += 1;
        faixas.de61a90.valor += v;
      } else {
        faixas.mais90.qtd += 1;
        faixas.mais90.valor += v;
      }
    }

    // Top priority debtors for management review
    const topDevedores = [...reportData]
      .sort((a, b) => {
        const vA = a.valorEmAberto !== undefined ? a.valorEmAberto : (a.valorOriginal || 120);
        const vB = b.valorEmAberto !== undefined ? b.valorEmAberto : (b.valorOriginal || 120);
        return vB - vA;
      })
      .slice(0, 15);

    return {
      totalCount,
      totalOriginal,
      totalAberto,
      totalPago,
      taxaRecuperacao,
      mediaDiasAtraso,
      criticos45,
      criticos90,
      contatosRealizados,
      taxaContato,
      acordosFormalizados,
      performanceLista,
      faixas,
      topDevedores,
    };
  }, [reportData]);

  // Generate Executive Summary PDF via window.print focused on the report area
  const handleGeneratePdfSummary = () => {
    const originalTitle = document.title;
    const now = new Date();
    const dataFormatada = now.toLocaleDateString('pt-BR').replace(/\//g, '-');
    const nomeRelatorioLimpo = selectedReport.toUpperCase();
    
    // Set print document title for clean PDF filename
    document.title = `Resumo_Executivo_Gerencia_${nomeRelatorioLimpo}_${dataFormatada}`;
    
    // Add focus print class to body
    document.body.classList.add('print-focus-report-summary');
    
    // Set viewMode to summary to make sure it's on DOM
    setViewMode('resumo_gerencia');

    setTimeout(() => {
      window.print();
      
      const handleAfterPrint = () => {
        document.body.classList.remove('print-focus-report-summary');
        document.title = originalTitle;
        window.removeEventListener('afterprint', handleAfterPrint);
      };
      
      window.addEventListener('afterprint', handleAfterPrint);
      // Fallback in case browser does not trigger afterprint
      setTimeout(() => {
        document.body.classList.remove('print-focus-report-summary');
        document.title = originalTitle;
      }, 3000);
    }, 150);
  };

  // Export formatted printable PDF summary using jsPDF & jspdf-autotable
  const handleExportRelatorioPdf = () => {
    const porResponsavelList = metrics.performanceLista.map(p => ({
      resp: p.nome,
      leads: p.leads,
      aberto: p.aberto,
      pago: p.pago,
      taxa: p.eficacia
    }));

    exportFinancialSummaryPdf({
      title: reportTitles[selectedReport]?.title || 'Resumo Financeiro e Gerencial de Cobrança',
      description: reportTitles[selectedReport]?.desc,
      reportType: selectedReport,
      currentUser,
      records: reportData,
      metrics: {
        totalCount: metrics.totalCount,
        totalOriginal: metrics.totalOriginal,
        totalAberto: metrics.totalAberto,
        totalPago: metrics.totalPago,
        taxaRecuperacao: metrics.taxaRecuperacao,
        mediaDiasAtraso: metrics.mediaDiasAtraso,
        criticos45: metrics.criticos45,
        criticos90: metrics.criticos90,
        acordosFormalizados: metrics.acordosFormalizados,
        porResponsavel: porResponsavelList
      }
    });
  };

  // Export to Excel / CSV
  const handleExport = (format: 'xlsx' | 'csv') => {
    const exportRows = reportData.map(r => ({
      'Matrícula': r.matricula,
      'Cliente': r.cliente,
      'CPF': r.cpf || '000.000.000-00',
      'Telefone': r.telefone || '',
      'Plano': r.planoContratado || 'Cartão Todos Familiar',
      'Valor Original': r.valorOriginal || 120,
      'Valor em Aberto': r.valorEmAberto !== undefined ? r.valorEmAberto : 120,
      'Valor Pago': r.valorPago || 0,
      'Dias de Atraso': r.diasAtraso || 0,
      'Responsável': r.responsavel,
      'Status': r.status
    }));

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Relatório');

    if (format === 'xlsx') {
      XLSX.writeFile(wb, `Relatorio_${selectedReport}_Valora_Gestao.xlsx`);
    } else {
      XLSX.writeFile(wb, `Relatorio_${selectedReport}_Valora_Gestao.csv`, { bookType: 'csv' });
    }
  };

  const reportTitles: Record<ReportType, { title: string; desc: string }> = {
    comparativo_operadores: {
      title: '🏆 Comparativo de Performance dos Operadores',
      desc: 'Taxa de recuperação, volume de contatos e acordos firmados no mês atual com ranking e gráficos.'
    },
    eficiencia_semanal: {
      title: '⚡ Relatório Semanal de Eficiência',
      desc: 'Comparativo da taxa de recuperação total e acordos firmados entre a semana atual e a semana anterior.'
    },
    inadimplencia: {
      title: '1. Relatório de Inadimplência Geral',
      desc: 'Beneficiários com mensalidades vencidas e saldo devedor pendente em aberto.'
    },
    recuperacao: {
      title: '2. Relatório de Recuperação Financeira',
      desc: 'Valores recuperados, recebidos e títulos quitados acumulados no período.'
    },
    cobrancas_realizadas: {
      title: '3. Relatório de Cobranças Realizadas',
      desc: 'Histórico de acionamentos ativos efetuados pelas operadoras via WhatsApp e fone.'
    },
    negociacoes: {
      title: '4. Relatório de Negociações & Acordos',
      desc: 'Propostas emitidas, parcelamentos ativos e acordos firmados com clientes.'
    },
    pagamentos: {
      title: '5. Relatório de Pagamentos e Quitações',
      desc: 'Extrato de lançamentos financeiros baixados (PIX, Boletos e Cartão).'
    },
    performance_responsavel: {
      title: '6. Relatório de Performance por Responsável',
      desc: 'Balanço comparativo de volume, taxa de contato e conversão por cobradora.'
    },
    clientes_recorrentes: {
      title: '7. Relatório de Clientes Recorrentes em Atraso',
      desc: 'Beneficiários com histórico de reincidência de inadimplência superior a 120 dias.'
    },
    clientes_sem_retorno: {
      title: '8. Relatório de Clientes Sem Retorno',
      desc: 'Contatos acionados sem resposta nas tentativas de negociação para reacionamento.'
    }
  };

  const dataAtualFormatada = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-700 text-white uppercase tracking-wider">
              Central de Auditoria & Relatórios
            </span>
            <span className="text-xs text-slate-500 font-mono">{reportData.length} registros selecionados</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
            {reportTitles[selectedReport].title}
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            {reportTitles[selectedReport].desc}
          </p>
        </div>

        {/* Action & Export Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Botão Oficial Solicitado: Exportar Relatório PDF via jsPDF */}
          <button
            type="button"
            id="btn-exportar-relatorio-pdf"
            onClick={handleExportRelatorioPdf}
            className="px-4 py-2.5 bg-rose-700 hover:bg-rose-800 active:scale-95 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer shadow-sm hover:shadow-md ring-2 ring-rose-300/50"
            title="Gera e faz download de uma versão formatada e imprimível em PDF do resumo financeiro atual utilizando a biblioteca jsPDF"
          >
            <Download className="w-4 h-4 text-rose-200" />
            <span>Exportar Relatório PDF</span>
          </button>

          {/* Managerial PDF Summary (Print/Browser Preview) */}
          <button
            type="button"
            id="btn-gerar-resumo-pdf"
            onClick={handleGeneratePdfSummary}
            className="px-3.5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs hover:shadow-sm"
            title="Gera um resumo executivo condensado e estruturado em formato PDF para entrega à gerência"
          >
            <FileCheck2 className="w-4 h-4 text-blue-200" />
            <span>Resumo Gerencial</span>
          </button>

          <button
            type="button"
            onClick={() => handleExport('xlsx')}
            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            title="Exportar dados para planilha Excel"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
            <span>Excel (.xlsx)</span>
          </button>

          <button
            type="button"
            onClick={() => handleExport('csv')}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Exportar para arquivo CSV"
          >
            <FileText className="w-4 h-4 text-slate-300" />
            <span>CSV</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200"
            title="Imprimir relatório completo atual"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>Imprimir</span>
          </button>
        </div>
      </div>

      {/* 8 Report Type Selector Pills */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs no-print">
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(reportTitles) as ReportType[]).map((key) => {
            const active = selectedReport === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedReport(key)}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer text-left ${
                  active
                    ? 'bg-blue-700 text-white shadow-xs'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {reportTitles[key].title}
              </button>
            );
          })}
        </div>
      </div>

      {/* Report Content: Operator Comparison, Weekly Efficiency Report or Standard Executive/Table View */}
      {selectedReport === 'comparativo_operadores' ? (
        <OperatorPerformanceComparisonPanel
          records={records}
          currentUser={currentUser}
          onSelectResponsavel={onSelectResponsavel}
        />
      ) : selectedReport === 'eficiencia_semanal' ? (
        <WeeklyEfficiencyReport
          records={records}
          currentUser={currentUser}
          onSelectResponsavel={onSelectResponsavel}
        />
      ) : (
        <>
          {/* Filter and View Mode Switcher */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 no-print">
            {/* Toggle Mode: Resumo Gerência vs Tabela Detalhada */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setViewMode('resumo_gerencia')}
                className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'resumo_gerencia'
                    ? 'bg-white text-blue-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileCheck2 className="w-3.5 h-3.5 text-blue-700" />
                <span>Resumo Executivo para Gerência</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('tabela')}
                className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'tabela'
                    ? 'bg-white text-blue-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-slate-500" />
                <span>Tabela Detalhada ({reportData.length})</span>
              </button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filtrar por cliente ou matrícula..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <select
                value={selectedPeriodo}
                onChange={(e) => setSelectedPeriodo(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 cursor-pointer"
              >
                <option value="mes_atual">Mês Atual (Setembro/2026)</option>
                <option value="mes_anterior">Mês Anterior (Agosto/2026)</option>
                <option value="trimestre">Último Trimestre</option>
                <option value="ano">Ano 2026 Consolidado</option>
              </select>

              <select
                value={selectedResp}
                onChange={(e) => setSelectedResp(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 cursor-pointer"
              >
                <option value="todos">Todos os Responsáveis</option>
                <option value="ANA LUIZA">Ana Luiza</option>
                <option value="ROSANA">Rosana</option>
                <option value="KEYLLA">Keylla</option>
                <option value="FABIOLA">Fabíola</option>
              </select>
            </div>
          </div>

      {/* ========================================================================= */}
      {/* SECTION 1: RESUMO EXECUTIVO PARA GERÊNCIA (FOCADO PARA PDF & IMPRESSÃO)  */}
      {/* ========================================================================= */}
      <div 
        id="relatorio-executivo-gerencia" 
        className={`bg-white rounded-2xl border border-slate-200 p-6 md:p-8 space-y-6 shadow-xs ${
          viewMode !== 'resumo_gerencia' ? 'hidden print:block' : 'block'
        }`}
      >
        {/* Cabeçalho Oficial do Documento para Gerência */}
        <div className="border-b-2 border-slate-900 pb-5">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-blue-700 text-white flex items-center justify-center font-black text-sm">
                  V
                </span>
                <div>
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight uppercase">
                    Valora Gestão & Finanças
                  </h1>
                  <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                    Gestão de Cobrança e Inadimplência • Cartão de Todos Saúde
                  </p>
                </div>
              </div>
              <h2 className="text-lg font-bold text-blue-900 mt-3 flex items-center gap-2">
                <FileCheck2 className="w-5 h-5 text-blue-700 shrink-0" />
                <span>RESUMO EXECUTIVO DE COBRANÇA PARA GERÊNCIA & DIRETORIA</span>
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Tipo: <strong className="text-slate-900">{reportTitles[selectedReport].title}</strong> — {reportTitles[selectedReport].desc}
              </p>
            </div>

            {/* Metadados do Relatório */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-right text-xs space-y-1 shrink-0">
              <div>
                <span className="text-slate-500">Emissão:</span>{' '}
                <strong className="text-slate-900 font-mono">{dataAtualFormatada}</strong>
              </div>
              <div>
                <span className="text-slate-500">Período:</span>{' '}
                <strong className="text-slate-900">
                  {selectedPeriodo === 'mes_atual' ? 'Mês Vigente (Set/2026)' : selectedPeriodo === 'mes_anterior' ? 'Mês Anterior (Ago/2026)' : 'Consolidado'}
                </strong>
              </div>
              <div>
                <span className="text-slate-500">Carteira:</span>{' '}
                <strong className="text-blue-700">{selectedResp === 'todos' ? 'Geral (Todas as Cobradoras)' : selectedResp}</strong>
              </div>
              <div>
                <span className="text-slate-500">Emissor:</span>{' '}
                <strong className="text-slate-900">{currentUser.nome} ({currentUser.cargo || 'Cobrança'})</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Grade de Indicadores Chave de Gestão (KPIs Executivos) */}
        <div>
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-blue-700" />
            <span>1. Indicadores Chave de Performance (KPIs Executivos)</span>
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Total Analisado</span>
              <span className="text-xl font-bold text-slate-900 block mt-0.5">{metrics.totalCount}</span>
              <span className="text-[10px] text-slate-500 block">beneficiários</span>
            </div>

            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl">
              <span className="text-[10px] font-bold text-rose-700 uppercase block">Saldo em Aberto</span>
              <span className="text-xl font-bold text-rose-800 block mt-0.5 font-mono">
                R$ {metrics.totalAberto.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] text-rose-600 block">volume pendente</span>
            </div>

            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
              <span className="text-[10px] font-bold text-emerald-700 uppercase block">Total Recuperado</span>
              <span className="text-xl font-bold text-emerald-800 block mt-0.5 font-mono">
                R$ {metrics.totalPago.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] text-emerald-600 block">baixado/recebido</span>
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
              <span className="text-[10px] font-bold text-blue-700 uppercase block">Taxa de Conversão</span>
              <span className="text-xl font-bold text-blue-800 block mt-0.5">{metrics.taxaRecuperacao}%</span>
              <span className="text-[10px] text-blue-600 block">efetividade financeira</span>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <span className="text-[10px] font-bold text-amber-800 uppercase block">Casos Críticos</span>
              <span className="text-xl font-bold text-amber-900 block mt-0.5">{metrics.criticos45}</span>
              <span className="text-[10px] text-amber-700 block">+45 dias ({metrics.criticos90} &gt;90d)</span>
            </div>

            <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl">
              <span className="text-[10px] font-bold text-indigo-700 uppercase block">Acordos / Negoc.</span>
              <span className="text-xl font-bold text-indigo-900 block mt-0.5">{metrics.acordosFormalizados}</span>
              <span className="text-[10px] text-indigo-600 block">em andamento</span>
            </div>
          </div>
        </div>

        {/* Seção 1.1: Banner de Acesso Rápido ao Painel Comparativo de Performance */}
        {selectedReport === 'performance_responsavel' && (
          <div className="no-print p-4 rounded-2xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs border border-blue-800/50">
            <div className="flex items-center gap-3">
              <span className="p-2.5 rounded-xl bg-blue-500/20 text-blue-300 border border-blue-400/30 shrink-0">
                <TrendingUp className="w-5 h-5 text-emerald-300" />
              </span>
              <div>
                <h4 className="font-extrabold text-sm text-white flex items-center gap-2">
                  <span>Painel Comparativo de Performance entre os Operadores</span>
                  <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300 text-[10px] uppercase font-black rounded border border-emerald-500/30">
                    Mês Atual
                  </span>
                </h4>
                <p className="text-xs text-blue-200 mt-0.5">
                  Visualização detalhada com Taxa de Recuperação, Volume de Contatos, Acordos Firmados no mês, pódios de líderes e exportação Excel.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelectedReport('comparativo_operadores')}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl transition-colors shrink-0 shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <span>Abrir Comparativo Completo</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Seção 1.2: Widget de Taxa de Conversão por Operador (Gráfico de Barras e Melhores Práticas) */}
        <div className="no-print">
          <OperatorConversionRateWidget
            records={records}
            currentUser={currentUser}
            onSelectOperator={(op) => {
              setSelectedResp(op);
              if (onSelectResponsavel) onSelectResponsavel(op);
            }}
          />
        </div>

        {/* Seção 2: Tabelas Resumo Gerenciais (Performance por Cobradora e Faixa de Atraso) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 break-inside-avoid">
          {/* Tabela Comparativa de Cobradoras */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-100 px-3.5 py-2 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-blue-700" />
                <span>2. Balanço Comparativo por Cobradora</span>
              </span>
              <span className="text-[10px] font-semibold text-slate-500">{metrics.performanceLista.length} responsáveis</span>
            </div>
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                  <th className="p-2.5">Responsável</th>
                  <th className="p-2.5 text-center">Leads</th>
                  <th className="p-2.5 text-right">Em Aberto</th>
                  <th className="p-2.5 text-right">Recuperado</th>
                  <th className="p-2.5 text-center">Eficácia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {metrics.performanceLista.map((op) => (
                  <tr key={op.nome} className="hover:bg-slate-50/60">
                    <td className="p-2.5 font-bold text-slate-900">{op.nome}</td>
                    <td className="p-2.5 text-center font-mono text-slate-700">{op.leads}</td>
                    <td className="p-2.5 text-right font-mono text-rose-700">
                      R$ {op.aberto.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="p-2.5 text-right font-mono text-emerald-700 font-semibold">
                      R$ {op.pago.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="p-2.5 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                        {op.eficacia}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Tabela de Distribuição por Faixa de Atraso (Aging) */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-100 px-3.5 py-2 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-700" />
                <span>3. Matriz de Aging (Faixas de Atraso)</span>
              </span>
              <span className="text-[10px] font-semibold text-slate-500">Média: {metrics.mediaDiasAtraso} dias</span>
            </div>
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                  <th className="p-2.5">Faixa de Atraso</th>
                  <th className="p-2.5 text-center">Qtd. Clientes</th>
                  <th className="p-2.5 text-right">Saldo Devedor</th>
                  <th className="p-2.5 text-center">Participação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="p-2.5 font-medium text-slate-800">Até 30 dias (Recente)</td>
                  <td className="p-2.5 text-center font-mono">{metrics.faixas.ate30.qtd}</td>
                  <td className="p-2.5 text-right font-mono text-slate-800">
                    R$ {metrics.faixas.ate30.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="p-2.5 text-center font-semibold text-slate-600">
                    {metrics.totalAberto > 0 ? ((metrics.faixas.ate30.valor / metrics.totalAberto) * 100).toFixed(1) : '0'}%
                  </td>
                </tr>
                <tr>
                  <td className="p-2.5 font-medium text-slate-800">31 a 60 dias (Atenção)</td>
                  <td className="p-2.5 text-center font-mono">{metrics.faixas.de31a60.qtd}</td>
                  <td className="p-2.5 text-right font-mono text-amber-700">
                    R$ {metrics.faixas.de31a60.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="p-2.5 text-center font-semibold text-slate-600">
                    {metrics.totalAberto > 0 ? ((metrics.faixas.de31a60.valor / metrics.totalAberto) * 100).toFixed(1) : '0'}%
                  </td>
                </tr>
                <tr>
                  <td className="p-2.5 font-medium text-slate-800">61 a 90 dias (Grave)</td>
                  <td className="p-2.5 text-center font-mono">{metrics.faixas.de61a90.qtd}</td>
                  <td className="p-2.5 text-right font-mono text-orange-700 font-semibold">
                    R$ {metrics.faixas.de61a90.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="p-2.5 text-center font-semibold text-slate-600">
                    {metrics.totalAberto > 0 ? ((metrics.faixas.de61a90.valor / metrics.totalAberto) * 100).toFixed(1) : '0'}%
                  </td>
                </tr>
                <tr className="bg-rose-50/40">
                  <td className="p-2.5 font-bold text-rose-800">Acima de 90 dias (Crítico)</td>
                  <td className="p-2.5 text-center font-mono font-bold text-rose-800">{metrics.faixas.mais90.qtd}</td>
                  <td className="p-2.5 text-right font-mono text-rose-800 font-bold">
                    R$ {metrics.faixas.mais90.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="p-2.5 text-center font-bold text-rose-700">
                    {metrics.totalAberto > 0 ? ((metrics.faixas.mais90.valor / metrics.totalAberto) * 100).toFixed(1) : '0'}%
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Seção 3: Principais Devedores Prioritários para Deliberação da Gerência */}
        <div className="border border-slate-200 rounded-xl overflow-hidden break-inside-avoid">
          <div className="bg-slate-100 px-3.5 py-2 border-b border-slate-200 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
              <span>4. Casos Prioritários para Deliberação da Gerência (Top Maiores Saldos)</span>
            </span>
            <span className="text-[10px] text-slate-500 font-medium">15 maiores exposições de crédito</span>
          </div>
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                <th className="p-2">Matrícula</th>
                <th className="p-2">Beneficiário</th>
                <th className="p-2">Plano</th>
                <th className="p-2 text-right">Saldo Aberto</th>
                <th className="p-2 text-center">Atraso</th>
                <th className="p-2">Cobradora</th>
                <th className="p-2">Status Cobrança</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {metrics.topDevedores.map((r) => {
                const aberto = r.valorEmAberto !== undefined ? r.valorEmAberto : (r.valorOriginal || 120);
                return (
                  <tr key={r.id} className="hover:bg-slate-50/60">
                    <td className="p-2 font-mono text-slate-600">#{r.matricula}</td>
                    <td className="p-2 font-bold text-slate-900">{r.cliente}</td>
                    <td className="p-2 text-slate-600">{r.planoContratado || 'Cartão Todos'}</td>
                    <td className="p-2 text-right font-mono font-bold text-rose-700">
                      R$ {aberto.toFixed(2)}
                    </td>
                    <td className="p-2 text-center font-semibold text-slate-700">{r.diasAtraso || 0} dias</td>
                    <td className="p-2 font-medium text-slate-800">{r.responsavel}</td>
                    <td className="p-2">
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-slate-100 text-slate-800">
                        {r.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Seção 4: Bloco de Protocolo, Parecer e Assinatura da Gerência */}
        <div className="border border-slate-300 rounded-xl p-4 bg-slate-50/60 space-y-4 break-inside-avoid">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-blue-700" />
              <span>5. Protocolo de Entrega &amp; Parecer Gerencial</span>
            </span>
            <span className="text-[10px] text-slate-500">Valora Gestão &amp; Finanças</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="bg-white p-3 rounded-lg border border-slate-200">
              <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Deliberação da Gerência:</p>
              <div className="space-y-1.5 text-slate-700 font-medium">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="rounded text-blue-600" />
                  <span>( ) Aprovado para Acionamento Normal</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="rounded text-blue-600" />
                  <span>( ) Conceder Desconto Especial (Até 20%)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="rounded text-blue-600" />
                  <span>( ) Encaminhar para Notificação Extrajudicial</span>
                </label>
              </div>
            </div>

            <div className="bg-white p-3 rounded-lg border border-slate-200 flex flex-col justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Responsável pela Emissão:</p>
                <p className="font-bold text-slate-900">{currentUser.nome}</p>
                <p className="text-[11px] text-slate-500">{currentUser.cargo || 'Cobrança / Valora'}</p>
              </div>
              <div className="pt-4 border-t border-slate-200 mt-2">
                <span className="block text-[9px] text-slate-400">Assinatura do Emissor:</span>
                <div className="border-b border-dashed border-slate-400 h-6"></div>
              </div>
            </div>

            <div className="bg-white p-3 rounded-lg border border-slate-200 flex flex-col justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Visto da Gerência / Diretoria:</p>
                <p className="font-bold text-slate-900">Coordenação &amp; Diretoria Financeira</p>
                <p className="text-[11px] text-slate-500">Data de Recebimento: ____/____/________</p>
              </div>
              <div className="pt-4 border-t border-slate-200 mt-2">
                <span className="block text-[9px] text-slate-400">Visto / Assinatura do Gestor:</span>
                <div className="border-b border-dashed border-slate-400 h-6"></div>
              </div>
            </div>
          </div>

          <p className="text-[10px] text-slate-400 text-center">
            Este relatório foi gerado automaticamente pelo Sistema de Gestão de Cobrança e Inadimplência • Valora Gestão &amp; Finanças para controle executivo e tomada de decisão estratégica.
          </p>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* SECTION 2: TABELA DETALHADA DE CLIENTES                                   */}
      {/* ========================================================================= */}
      <div 
        className={`bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs hide-on-summary-print ${
          viewMode !== 'tabela' ? 'hidden print:block' : 'block'
        }`}
      >
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Listagem Completa de Beneficiários Selecionados
            </span>
            <span className="text-xs font-mono text-slate-500">({reportData.length} registros)</span>
          </div>
          <span className="text-[11px] text-slate-500">
            Exibindo os primeiros 150 registros na tela
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                <th className="p-3">Matrícula</th>
                <th className="p-3">Cliente</th>
                <th className="p-3">Plano</th>
                <th className="p-3 text-right">Valor Original</th>
                <th className="p-3 text-right">Em Aberto</th>
                <th className="p-3 text-right">Valor Pago</th>
                <th className="p-3">Atraso</th>
                <th className="p-3">Responsável</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {reportData.slice(0, 150).map((r) => {
                const days = r.diasAtraso || 0;
                return (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3 font-mono text-slate-500">#{r.matricula}</td>
                    <td className="p-3 font-bold text-slate-900">{r.cliente}</td>
                    <td className="p-3 text-slate-600">{r.planoContratado || 'Cartão Todos Familiar'}</td>
                    <td className="p-3 font-mono text-right text-slate-600">R$ {(r.valorOriginal || 120).toFixed(2)}</td>
                    <td className="p-3 font-mono font-bold text-right text-rose-700">R$ {(r.valorEmAberto !== undefined ? r.valorEmAberto : (r.valorOriginal || 120)).toFixed(2)}</td>
                    <td className="p-3 font-mono font-bold text-right text-emerald-700">R$ {(r.valorPago || 0).toFixed(2)}</td>
                    <td className="p-3 font-semibold text-slate-700">{days} dias</td>
                    <td className="p-3 font-semibold text-slate-800">{r.responsavel}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-800">
                        {r.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )}

    </div>
  );
};
