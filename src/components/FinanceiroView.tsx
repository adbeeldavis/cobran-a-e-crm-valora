import React, { useState, useMemo, useEffect } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  ArrowUpRight, 
  ArrowDownRight, 
  Plus, 
  Filter, 
  Calendar, 
  Search, 
  Download, 
  Printer, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  CreditCard, 
  Receipt, 
  Building, 
  Wallet, 
  Layers, 
  PieChart as PieChartIcon, 
  BarChart3, 
  X,
  FileSpreadsheet,
  HelpCircle,
  Eye,
  Trash2,
  Check,
  ArrowUpDown
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
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import * as XLSX from 'xlsx';
import { DebtRecord, AppUser, LancamentoFinanceiro, SubTabFinanceiro, StatusLancamentoFinanceiro, TipoLancamentoFinanceiro } from '../types';
import { 
  getLancamentosFinanceiros, 
  addLancamentoFinanceiro, 
  updateLancamentoFinanceiro, 
  deleteLancamentoFinanceiro, 
  computeFinanceiroMetrics 
} from '../utils/financeiroService';
import { GraficoComparativoMensal } from './GraficoComparativoMensal';
import { CardPerformanceCobrancaSemanal } from './CardPerformanceCobrancaSemanal';

interface FinanceiroViewProps {
  records: DebtRecord[];
  currentUser: AppUser;
  onShowToast?: (msg: string) => void;
  onGoToCobrança?: () => void;
}

export const FinanceiroView: React.FC<FinanceiroViewProps> = ({
  records,
  currentUser,
  onShowToast,
  onGoToCobrança
}) => {
  const [activeSubTab, setActiveSubTab] = useState<SubTabFinanceiro>('visao_geral');
  const [lancamentos, setLancamentos] = useState<LancamentoFinanceiro[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'receita' | 'despesa'>('todos');
  const [filtroStatus, setFiltroStatus] = useState<'todos' | StatusLancamentoFinanceiro>('todos');
  const [filtroCategoria, setFiltroCategoria] = useState<string>('todas');
  
  // Modal de novo lançamento
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTipo, setModalTipo] = useState<TipoLancamentoFinanceiro>('despesa');
  const [formDescricao, setFormDescricao] = useState('');
  const [formValor, setFormValor] = useState('');
  const [formCategoria, setFormCategoria] = useState('Infraestrutura & Software');
  const [formDataVencimento, setFormDataVencimento] = useState(new Date().toISOString().slice(0, 10));
  const [formStatus, setFormStatus] = useState<StatusLancamentoFinanceiro>('pendente');
  const [formFormaPagamento, setFormFormaPagamento] = useState<'PIX' | 'Boleto' | 'Cartão' | 'Transferência' | 'Dinheiro'>('PIX');
  const [formEntidade, setFormEntidade] = useState('');
  const [formObservacoes, setFormObservacoes] = useState('');

  // Load financial entries
  useEffect(() => {
    const data = getLancamentosFinanceiros(records);
    setLancamentos(data);
  }, [records]);

  // Compute metrics
  const metrics = useMemo(() => {
    return computeFinanceiroMetrics(lancamentos);
  }, [lancamentos]);

  // Filtered entries
  const filteredLancamentos = useMemo(() => {
    return lancamentos.filter(item => {
      // Subtab filter
      if (activeSubTab === 'contas_receber' && item.tipo !== 'receita') return false;
      if (activeSubTab === 'contas_pagar' && item.tipo !== 'despesa') return false;

      // Filter by type
      if (filtroTipo !== 'todos' && item.tipo !== filtroTipo) return false;

      // Filter by status
      if (filtroStatus !== 'todos' && item.status !== filtroStatus) return false;

      // Filter by category
      if (filtroCategoria !== 'todas' && item.categoria !== filtroCategoria) return false;

      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchDesc = item.descricao.toLowerCase().includes(term);
        const matchCat = item.categoria.toLowerCase().includes(term);
        const matchEnt = (item.entidade || '').toLowerCase().includes(term);
        return matchDesc || matchCat || matchEnt;
      }

      return true;
    });
  }, [lancamentos, activeSubTab, filtroTipo, filtroStatus, filtroCategoria, searchTerm]);

  // Categories list
  const categoriasUnicas = useMemo(() => {
    const cats = new Set<string>();
    lancamentos.forEach(l => cats.add(l.categoria));
    return Array.from(cats);
  }, [lancamentos]);

  // Chart data: Monthly Cash Flow projection
  const cashFlowChartData = useMemo(() => {
    return [
      { periodo: 'Semana 1', Receitas: 12400, Despesas: 2980, Saldo: 9420 },
      { periodo: 'Semana 2', Receitas: 18200, Despesas: 3450, Saldo: 14750 },
      { periodo: 'Semana 3 (Atual)', Receitas: Math.round(metrics.totalRecebidoMes * 0.4), Despesas: Math.round(metrics.totalPagoMes * 0.4), Saldo: Math.round((metrics.totalRecebidoMes - metrics.totalPagoMes) * 0.4) },
      { periodo: 'Semana 4 (Proj.)', Receitas: Math.round(metrics.totalReceberPendente * 0.6), Despesas: Math.round(metrics.totalPagarPendente * 0.7), Saldo: Math.round((metrics.totalReceberPendente * 0.6) - (metrics.totalPagarPendente * 0.7)) }
    ];
  }, [metrics]);

  // Chart data: Categories breakdown
  const categoryChartData = useMemo(() => {
    const despesasByCat: Record<string, number> = {};
    lancamentos.filter(l => l.tipo === 'despesa').forEach(l => {
      despesasByCat[l.categoria] = (despesasByCat[l.categoria] || 0) + l.valor;
    });

    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];
    return Object.entries(despesasByCat).map(([name, value], i) => ({
      name,
      value: Math.round(value),
      color: colors[i % colors.length]
    }));
  }, [lancamentos]);

  // Handle Create Entry
  const handleSaveLancamento = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(formValor.replace(',', '.'));
    if (!formDescricao.trim() || isNaN(val) || val <= 0) {
      if (onShowToast) onShowToast('Por favor, informe uma descrição e um valor válido.');
      return;
    }

    const updated = addLancamentoFinanceiro({
      tipo: modalTipo,
      descricao: formDescricao.trim(),
      categoria: formCategoria,
      valor: val,
      dataVencimento: formDataVencimento,
      dataPagamento: formStatus === 'pago' ? formDataVencimento : undefined,
      status: formStatus,
      formaPagamento: formFormaPagamento,
      entidade: formEntidade.trim() || undefined,
      origem: 'manual',
      observacoes: formObservacoes.trim() || undefined,
      criadoPor: currentUser.nome
    }, records);

    setLancamentos(updated);
    setIsModalOpen(false);

    // Reset form
    setFormDescricao('');
    setFormValor('');
    setFormEntidade('');
    setFormObservacoes('');

    if (onShowToast) {
      onShowToast(`${modalTipo === 'receita' ? 'Receita' : 'Despesa'} lançada com sucesso!`);
    }
  };

  // Quick Pay / Receive
  const handleQuickStatusChange = (id: string, newStatus: StatusLancamentoFinanceiro) => {
    const today = new Date().toISOString().slice(0, 10);
    const updated = updateLancamentoFinanceiro(id, {
      status: newStatus,
      dataPagamento: newStatus === 'pago' ? today : undefined
    }, records);
    setLancamentos(updated);
    if (onShowToast) {
      onShowToast(newStatus === 'pago' ? 'Lançamento baixado com sucesso!' : 'Status atualizado com sucesso.');
    }
  };

  // Delete entry
  const handleDelete = (id: string, descricao: string) => {
    if (confirm(`Deseja realmente excluir o lançamento "${descricao}"?`)) {
      const updated = deleteLancamentoFinanceiro(id, records);
      setLancamentos(updated);
      if (onShowToast) {
        onShowToast('Lançamento removido com sucesso.');
      }
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    const dataForExport = filteredLancamentos.map((item, idx) => ({
      'Nº': idx + 1,
      'Tipo': item.tipo.toUpperCase(),
      'Descrição': item.descricao,
      'Categoria': item.categoria,
      'Cliente / Fornecedor': item.entidade || '—',
      'Valor (R$)': item.valor.toFixed(2),
      'Vencimento': item.dataVencimento,
      'Pagamento': item.dataPagamento || '—',
      'Status': item.status.toUpperCase(),
      'Forma de Pagamento': item.formaPagamento || '—',
      'Origem': item.origem === 'cobranca' ? 'Módulo Cobrança (Auto)' : 'Manual',
      'Observações': item.observacoes || ''
    }));

    const ws = XLSX.utils.json_to_sheet(dataForExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Financeiro Valora');
    const filename = `Financeiro_Valora_${activeSubTab}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, filename);

    if (onShowToast) {
      onShowToast(`Extrato financeiro exportado: ${filename}`);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">

      {/* Top Module Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 md:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2.5 rounded-xl bg-emerald-700 text-white shadow-xs">
              <Wallet className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-slate-900 tracking-tight">
                  Módulo Financeiro &amp; Controladoria
                </h2>
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-extrabold uppercase rounded-md tracking-wider border border-emerald-200">
                  Integrado ao CRM
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Contas a Receber sincronizadas da Cobrança, Contas a Pagar, Fluxo de Caixa e Resultado Operacional da Valora Gestão &amp; Finanças.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5 no-print">
          <button
            type="button"
            onClick={() => {
              setModalTipo('receita');
              setIsModalOpen(true);
            }}
            className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nova Receita</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setModalTipo('despesa');
              setIsModalOpen(true);
            }}
            className="px-3.5 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nova Despesa</span>
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-slate-200 transition-colors cursor-pointer"
            title="Exportar dados para Excel"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Exportar</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-slate-200 transition-colors cursor-pointer"
            title="Imprimir extrato"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Imprimir</span>
          </button>
        </div>
      </div>

      {/* 4 Core Financial KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Saldo em Caixa */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Saldo em Conta &amp; Caixa
            </span>
            <span className="p-2 rounded-xl bg-blue-50 text-blue-700 border border-blue-100">
              <DollarSign className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-slate-900 block">
              R$ {metrics.saldoAtualCaixa.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-semibold mt-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Disponível para operações</span>
            </div>
          </div>
        </div>

        {/* Card 2: Contas a Receber */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Receitas Realizadas no Mês
            </span>
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100">
              <ArrowDownRight className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-emerald-700 block">
              R$ {metrics.totalRecebidoMes.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <div className="flex items-center justify-between text-xs text-slate-500 mt-1">
              <span>A receber:</span>
              <strong className="text-slate-800 font-mono">
                R$ {metrics.totalReceberPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </strong>
            </div>
          </div>
        </div>

        {/* Card 3: Contas a Pagar */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Despesas Pagas no Mês
            </span>
            <span className="p-2 rounded-xl bg-rose-50 text-rose-700 border border-rose-100">
              <ArrowUpRight className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-rose-700 block">
              R$ {metrics.totalPagoMes.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <div className="flex items-center justify-between text-xs text-slate-500 mt-1">
              <span>A pagar pendente:</span>
              <strong className="text-rose-800 font-mono">
                R$ {metrics.totalPagarPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </strong>
            </div>
          </div>
        </div>

        {/* Card 4: Resultado Operacional Líquido */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Resultado Líquido do Mês
            </span>
            <span className="p-2 rounded-xl bg-purple-50 text-purple-700 border border-purple-100">
              <Receipt className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <span className={`text-2xl font-black block ${metrics.resultadoLiquidoMes >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
              R$ {metrics.resultadoLiquidoMes.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <div className="flex items-center justify-between text-xs text-slate-500 mt-1">
              <span>Projetado c/ acordos:</span>
              <strong className="text-slate-900 font-mono">
                R$ {metrics.resultadoPrevistoMes.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* Integration Banner between Cobrança and Financeiro */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-2xl p-4 md:p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-300 border border-blue-400/30 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          </span>
          <div>
            <h4 className="text-sm font-extrabold text-white flex items-center gap-2">
              <span>Sincronização Ativa com Módulo de Cobrança</span>
              <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase rounded">
                Tempo Real
              </span>
            </h4>
            <p className="text-xs text-blue-200 mt-0.5">
              Todas as dívidas recuperadas pelas operadoras (Rosana, Ana Luiza, Keylla e Fabíola) e acordos fechados alimentam automaticamente o Contas a Receber.
            </p>
          </div>
        </div>

        {onGoToCobrança && (
          <button
            type="button"
            onClick={onGoToCobrança}
            className="px-4 py-2 bg-white text-slate-900 hover:bg-blue-50 font-bold text-xs rounded-xl transition-colors shrink-0 shadow-xs cursor-pointer flex items-center gap-1.5"
          >
            <span>Ver Planilha de Cobrança</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Navigation Sub-Tabs of Financial Module */}
      <div className="bg-white rounded-2xl border border-slate-200 p-2 shadow-xs flex flex-wrap items-center justify-between gap-2 no-print">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            id="subtab-visao-geral"
            onClick={() => setActiveSubTab('visao_geral')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeSubTab === 'visao_geral'
                ? 'bg-blue-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Visão Geral</span>
          </button>

          <button
            type="button"
            id="subtab-comparativo-mensal"
            onClick={() => setActiveSubTab('comparativo_mensal')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeSubTab === 'comparativo_mensal'
                ? 'bg-blue-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span>Comparativo Mensal (Pagar vs Receber)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('contas_receber')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeSubTab === 'contas_receber'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <ArrowDownRight className="w-3.5 h-3.5" />
            <span>Contas a Receber</span>
            <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 text-[10px] font-black rounded-md">
              {lancamentos.filter(l => l.tipo === 'receita').length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('contas_pagar')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeSubTab === 'contas_pagar'
                ? 'bg-rose-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Contas a Pagar</span>
            <span className="px-1.5 py-0.2 bg-rose-100 text-rose-800 text-[10px] font-black rounded-md">
              {lancamentos.filter(l => l.tipo === 'despesa').length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('extrato')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeSubTab === 'extrato'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Extrato Geral ({lancamentos.length})</span>
          </button>
        </div>

        {/* Global Search Bar */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por descrição, cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Subtab View 1: Visão Geral & Fluxo de Caixa */}
      {activeSubTab === 'visao_geral' && (
        <div className="space-y-6">
          {/* Card de Performance de Cobrança: Ticket Médio de Acordos & Taxa de Conversão Semanal */}
          <CardPerformanceCobrancaSemanal 
            records={records} 
            onGoToCobrança={onGoToCobrança} 
          />

          {/* Componente Visual: Gráfico de Barras Comparando Contas a Pagar vs Contas a Receber Mensalmente */}
          <GraficoComparativoMensal lancamentos={lancamentos} onShowToast={onShowToast} />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Chart: Cash Flow by Week / Month */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 md:p-6 shadow-xs lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-blue-700" />
                    <span>Fluxo de Caixa Semanal: Receitas vs Despesas</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Acompanhamento de entradas e saídas de caixa da Valora Gestão no mês atual
                  </p>
                </div>
              </div>

              <div className="h-64 sm:h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={cashFlowChartData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="periodo" tick={{ fontSize: 11, fill: '#475569' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
                      formatter={(val: any) => [`R$ ${Number(val).toLocaleString('pt-BR')}`]}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                    <Bar dataKey="Receitas" fill="#10b981" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="Despesas" fill="#ef4444" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="Saldo" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart: Despesas por Categoria */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 md:p-6 shadow-xs flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <PieChartIcon className="w-4 h-4 text-purple-700" />
                  <span>Distribuição de Custos</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Principais categorias de despesas operacionais
                </p>
              </div>

              <div className="h-48 w-full my-2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryChartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={70}
                      innerRadius={40}
                      paddingAngle={4}
                    >
                      {categoryChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(val: any) => [`R$ ${Number(val).toLocaleString('pt-BR')}`, 'Valor']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Legend List */}
              <div className="space-y-1 text-xs">
                {categoryChartData.slice(0, 4).map(c => (
                  <div key={c.name} className="flex items-center justify-between text-slate-600">
                    <div className="flex items-center gap-2 truncate">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: c.color }}></span>
                      <span className="truncate">{c.name}</span>
                    </div>
                    <strong className="font-mono text-slate-900 shrink-0">R$ {c.value.toLocaleString('pt-BR')}</strong>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Recent Financial Transactions Preview */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-700" />
                <span>Últimos Lançamentos Financeiros Registrados</span>
              </h3>
              <button
                type="button"
                onClick={() => setActiveSubTab('extrato')}
                className="text-xs font-bold text-blue-700 hover:text-blue-900 cursor-pointer"
              >
                Ver todos os {lancamentos.length} lançamentos →
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {lancamentos.slice(0, 6).map(item => (
                <div key={item.id} className="p-3.5 hover:bg-slate-50 transition-colors flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`p-2 rounded-xl shrink-0 ${
                      item.tipo === 'receita' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                    }`}>
                      {item.tipo === 'receita' ? <ArrowDownRight className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900 truncate">{item.descricao}</span>
                        <span className={`px-2 py-0.2 rounded text-[10px] font-extrabold uppercase ${
                          item.status === 'pago' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {item.status === 'pago' ? 'Liquidado' : 'Pendente'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                        <span>{item.categoria}</span>
                        <span>•</span>
                        <span>Venc: {item.dataVencimento}</span>
                        {item.entidade && (
                          <>
                            <span>•</span>
                            <span className="truncate">{item.entidade}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className={`text-sm font-black font-mono block ${
                      item.tipo === 'receita' ? 'text-emerald-700' : 'text-rose-700'
                    }`}>
                      {item.tipo === 'receita' ? '+' : '-'} R$ {item.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className="text-[10px] text-slate-400">{item.formaPagamento || 'PIX'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Subtab View 2: Comparativo Mensal Dedicado (Pagar vs Receber) */}
      {activeSubTab === 'comparativo_mensal' && (
        <div className="space-y-6">
          <GraficoComparativoMensal lancamentos={lancamentos} onShowToast={onShowToast} />
        </div>
      )}

      {/* Subtab View 3, 4, 5: Table View for Contas a Receber / Pagar / Extrato */}
      {(activeSubTab === 'contas_receber' || activeSubTab === 'contas_pagar' || activeSubTab === 'extrato') && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          {/* Table Header and Filters */}
          <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
                {activeSubTab === 'contas_receber' && 'Contas a Receber (Receitas & Acordos)'}
                {activeSubTab === 'contas_pagar' && 'Contas a Pagar (Custos & Fornecedores)'}
                {activeSubTab === 'extrato' && 'Extrato Geral Consolidado'}
              </span>
              <span className="px-2 py-0.5 bg-slate-200 text-slate-700 text-xs font-mono font-bold rounded-full">
                {filteredLancamentos.length} registros
              </span>
            </div>

            {/* Quick Filters */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <select
                value={filtroStatus}
                onChange={(e) => setFiltroStatus(e.target.value as any)}
                className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-bold text-slate-700 cursor-pointer"
              >
                <option value="todos">Todos os Status</option>
                <option value="pago">Liquidado / Pago</option>
                <option value="pendente">Pendente / Em Aberto</option>
                <option value="vencido">Vencido</option>
              </select>

              <select
                value={filtroCategoria}
                onChange={(e) => setFiltroCategoria(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-bold text-slate-700 cursor-pointer"
              >
                <option value="todas">Todas as Categorias</option>
                {categoriasUnicas.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                  <th className="p-3 w-10 text-center">Tipo</th>
                  <th className="p-3">Descrição do Lançamento</th>
                  <th className="p-3">Categoria</th>
                  <th className="p-3">Cliente / Fornecedor</th>
                  <th className="p-3 text-center">Vencimento</th>
                  <th className="p-3 text-center">Pagamento</th>
                  <th className="p-3 text-right">Valor (R$)</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-center no-print">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLancamentos.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Tipo Icon */}
                    <td className="p-3 text-center">
                      <span className={`p-1.5 rounded-lg inline-flex ${
                        item.tipo === 'receita' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`} title={item.tipo === 'receita' ? 'Receita' : 'Despesa'}>
                        {item.tipo === 'receita' ? <ArrowDownRight className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
                      </span>
                    </td>

                    {/* Descricao */}
                    <td className="p-3">
                      <div className="font-extrabold text-slate-900">{item.descricao}</div>
                      {item.observacoes && (
                        <span className="text-[10px] text-slate-400 block truncate max-w-xs">{item.observacoes}</span>
                      )}
                    </td>

                    {/* Categoria */}
                    <td className="p-3 text-slate-600 font-medium">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px]">
                        {item.categoria}
                      </span>
                    </td>

                    {/* Cliente / Fornecedor */}
                    <td className="p-3 text-slate-700 font-medium">
                      {item.entidade || '—'}
                    </td>

                    {/* Data Vencimento */}
                    <td className="p-3 text-center font-mono text-slate-600">
                      {item.dataVencimento}
                    </td>

                    {/* Data Pagamento */}
                    <td className="p-3 text-center font-mono text-slate-600">
                      {item.dataPagamento || '—'}
                    </td>

                    {/* Valor */}
                    <td className="p-3 text-right font-mono font-black text-sm">
                      <span className={item.tipo === 'receita' ? 'text-emerald-700' : 'text-rose-700'}>
                        {item.tipo === 'receita' ? '+' : '-'} R$ {item.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="p-3 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                        item.status === 'pago' 
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                          : item.status === 'vencido'
                          ? 'bg-rose-100 text-rose-800 border border-rose-300'
                          : 'bg-amber-100 text-amber-800 border border-amber-300'
                      }`}>
                        {item.status === 'pago' ? 'Liquidado' : item.status === 'vencido' ? 'Vencido' : 'Pendente'}
                      </span>
                    </td>

                    {/* Quick Action */}
                    <td className="p-3 text-center no-print">
                      <div className="flex items-center justify-center gap-1">
                        {item.status !== 'pago' ? (
                          <button
                            type="button"
                            onClick={() => handleQuickStatusChange(item.id, 'pago')}
                            className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white transition-colors cursor-pointer"
                            title="Marcar como pago/liquidado"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleQuickStatusChange(item.id, 'pendente')}
                            className="p-1.5 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-600 hover:text-white transition-colors cursor-pointer"
                            title="Voltar para pendente"
                          >
                            <Clock className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {item.origem !== 'cobranca' && (
                          <button
                            type="button"
                            onClick={() => handleDelete(item.id, item.descricao)}
                            className="p-1.5 rounded-lg bg-slate-50 text-slate-400 hover:bg-rose-600 hover:text-white transition-colors cursor-pointer"
                            title="Excluir lançamento manual"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredLancamentos.length === 0 && (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-400 text-xs">
                      Nenhum lançamento financeiro encontrado com os filtros atuais.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Novo Lançamento Financeiro */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 relative animate-in zoom-in-95 duration-150 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className={`p-2 rounded-xl ${modalTipo === 'receita' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                  <DollarSign className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Novo Lançamento Financeiro
                  </h3>
                  <p className="text-xs text-slate-500">
                    Registre uma receita ou despesa no caixa da Valora Gestão
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveLancamento} className="mt-4 space-y-4">
              {/* Tipo Selector */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Tipo de Movimentação</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setModalTipo('receita')}
                    className={`p-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      modalTipo === 'receita'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <ArrowDownRight className="w-4 h-4" />
                    <span>Receita / Entrada</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalTipo('despesa')}
                    className={`p-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      modalTipo === 'despesa'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <ArrowUpRight className="w-4 h-4" />
                    <span>Despesa / Saída</span>
                  </button>
                </div>
              </div>

              {/* Descrição */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Descrição *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Mensalidade Cliente, Z-API WhatsApp, Aluguel..."
                  value={formDescricao}
                  onChange={(e) => setFormDescricao(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Valor e Categoria */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Valor (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="0,00"
                    value={formValor}
                    onChange={(e) => setFormValor(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Categoria</label>
                  <select
                    value={formCategoria}
                    onChange={(e) => setFormCategoria(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    {modalTipo === 'receita' ? (
                      <>
                        <option value="Recuperação de Inadimplência">Recuperação de Inadimplência</option>
                        <option value="Acordos & Parcelamentos">Acordos &amp; Parcelamentos</option>
                        <option value="Honorários de Cobrança">Honorários de Cobrança</option>
                        <option value="Mensalidades">Mensalidades</option>
                        <option value="Outras Receitas">Outras Receitas</option>
                      </>
                    ) : (
                      <>
                        <option value="Tecnologia & Software">Tecnologia &amp; Software</option>
                        <option value="Telefonia & Mensageria">Telefonia &amp; Mensageria</option>
                        <option value="Infraestrutura & Espaço">Infraestrutura &amp; Espaço</option>
                        <option value="Serviços Jurídicos">Serviços Jurídicos</option>
                        <option value="Taxas Bancárias">Taxas Bancárias</option>
                        <option value="Folha de Pagamento">Folha de Pagamento</option>
                        <option value="Material de Consumo">Material de Consumo</option>
                        <option value="Outras Despesas">Outras Despesas</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              {/* Data Vencimento e Forma de Pagamento */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Data de Vencimento</label>
                  <input
                    type="date"
                    required
                    value={formDataVencimento}
                    onChange={(e) => setFormDataVencimento(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Forma de Pagamento</label>
                  <select
                    value={formFormaPagamento}
                    onChange={(e) => setFormFormaPagamento(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="PIX">PIX</option>
                    <option value="Boleto">Boleto</option>
                    <option value="Cartão">Cartão</option>
                    <option value="Transferência">Transferência Bancária</option>
                    <option value="Dinheiro">Dinheiro</option>
                  </select>
                </div>
              </div>

              {/* Entidade (Cliente ou Fornecedor) */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  {modalTipo === 'receita' ? 'Cliente Pagador' : 'Fornecedor / Beneficiário'}
                </label>
                <input
                  type="text"
                  placeholder="Nome da empresa ou pessoa física"
                  value={formEntidade}
                  onChange={(e) => setFormEntidade(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Status */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Situação Inicial</label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      checked={formStatus === 'pendente'}
                      onChange={() => setFormStatus('pendente')}
                      className="accent-blue-600"
                    />
                    <span>Pendente (Aguardando)</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      checked={formStatus === 'pago'}
                      onChange={() => setFormStatus('pago')}
                      className="accent-emerald-600"
                    />
                    <span>Já Liquidado / Pago Hoje</span>
                  </label>
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 text-xs font-bold text-white rounded-xl shadow-xs transition-colors cursor-pointer ${
                    modalTipo === 'receita' ? 'bg-emerald-700 hover:bg-emerald-800' : 'bg-rose-700 hover:bg-rose-800'
                  }`}
                >
                  Confirmar Lançamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
