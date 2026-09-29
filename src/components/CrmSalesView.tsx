import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Download, 
  Filter, 
  Briefcase, 
  DollarSign, 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  Phone, 
  MessageSquare, 
  Calendar, 
  Flame, 
  BarChart3, 
  Layers, 
  List, 
  Award, 
  ArrowRight, 
  Building2, 
  User, 
  Eye, 
  Edit3, 
  Sparkles, 
  RotateCcw, 
  AlertCircle,
  ArrowUpRight,
  PieChart as PieChartIcon
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  Cell, 
  PieChart, 
  Pie, 
  Legend 
} from 'recharts';
import { 
  CrmOportunidade, 
  CrmEtapaVenda, 
  CrmTemperatura, 
  CrmSubTab, 
  AppUser 
} from '../types';
import { 
  getStoredCrmDeals, 
  saveCrmDeals, 
  createCrmDeal, 
  updateCrmDeal, 
  updateCrmDealStage, 
  addCrmActivity, 
  deleteCrmDeal, 
  resetCrmDealsToDefault, 
  computeCrmMetrics, 
  exportCrmDealsToExcel, 
  CRM_ETAPAS_CONFIG, 
  TEMPERATURA_LABELS, 
  ORIGENS_LEAD_LABELS 
} from '../utils/crmSalesService';
import { CrmDealModal } from './CrmDealModal';

interface CrmSalesViewProps {
  currentUser: AppUser;
  onShowToast: (msg: string) => void;
}

export const CrmSalesView: React.FC<CrmSalesViewProps> = ({
  currentUser,
  onShowToast
}) => {
  // Deals state
  const [deals, setDeals] = useState<CrmOportunidade[]>(() => getStoredCrmDeals());
  
  // Navigation subtabs
  const [activeSubTab, setActiveSubTab] = useState<CrmSubTab>('kanban');

  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedResponsavel, setSelectedResponsavel] = useState<string>('todos');
  const [selectedEtapa, setSelectedEtapa] = useState<string>('todos');
  const [selectedTemperatura, setSelectedTemperatura] = useState<string>('todos');

  // Deal Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDealForEdit, setSelectedDealForEdit] = useState<CrmOportunidade | null>(null);

  // Filtered deals
  const filteredDeals = useMemo(() => {
    return deals.filter(deal => {
      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchTitle = (deal.titulo || '').toLowerCase().includes(term);
        const matchClient = (deal.cliente || '').toLowerCase().includes(term);
        const matchContact = (deal.contatoNome || '').toLowerCase().includes(term);
        const matchCity = (deal.cidadeUf || '').toLowerCase().includes(term);
        if (!matchTitle && !matchClient && !matchContact && !matchCity) {
          return false;
        }
      }

      // Responsavel filter
      if (selectedResponsavel !== 'todos') {
        const resp = (deal.responsavel || '').trim().toUpperCase();
        if (resp !== selectedResponsavel.toUpperCase()) {
          return false;
        }
      }

      // Etapa filter
      if (selectedEtapa !== 'todos' && deal.etapa !== selectedEtapa) {
        return false;
      }

      // Temperatura filter
      if (selectedTemperatura !== 'todos' && deal.temperatura !== selectedTemperatura) {
        return false;
      }

      return true;
    });
  }, [deals, searchTerm, selectedResponsavel, selectedEtapa, selectedTemperatura]);

  // Metrics computation
  const metrics = useMemo(() => {
    return computeCrmMetrics(deals);
  }, [deals]);

  // Unique sellers
  const uniqueSellers = useMemo(() => {
    const set = new Set<string>();
    deals.forEach(d => {
      if (d.responsavel) set.add(d.responsavel.trim().toUpperCase());
    });
    return Array.from(set).sort();
  }, [deals]);

  // Deal Handlers
  const handleOpenNewDeal = () => {
    setSelectedDealForEdit(null);
    setIsModalOpen(true);
  };

  const handleOpenEditDeal = (deal: CrmOportunidade) => {
    setSelectedDealForEdit(deal);
    setIsModalOpen(true);
  };

  const handleSaveDeal = (dealData: any) => {
    if (selectedDealForEdit) {
      updateCrmDeal(selectedDealForEdit.id, dealData, currentUser.nome);
      onShowToast(`Oportunidade "${dealData.titulo}" atualizada!`);
    } else {
      createCrmDeal(dealData, currentUser.nome);
      onShowToast(`Nova oportunidade comercial criada com sucesso!`);
    }
    setDeals(getStoredCrmDeals());
  };

  const handleDeleteDeal = (id: string) => {
    deleteCrmDeal(id);
    setDeals(getStoredCrmDeals());
    onShowToast('Oportunidade excluída.');
  };

  const handleAddActivity = (dealId: string, act: any) => {
    addCrmActivity(dealId, act);
    setDeals(getStoredCrmDeals());
  };

  const handleQuickAdvanceStage = (deal: CrmOportunidade, e: React.MouseEvent) => {
    e.stopPropagation();
    const stages: CrmEtapaVenda[] = ['prospeccao', 'qualificacao', 'proposta', 'negociacao', 'ganho'];
    const curIdx = stages.indexOf(deal.etapa);
    if (curIdx >= 0 && curIdx < stages.length - 1) {
      const nextStage = stages[curIdx + 1];
      updateCrmDealStage(deal.id, nextStage, currentUser.nome);
      setDeals(getStoredCrmDeals());
      const nextName = CRM_ETAPAS_CONFIG.find(c => c.id === nextStage)?.nome;
      onShowToast(`Oportunidade avançada para "${nextName}"!`);
    }
  };

  const handleQuickDirectWhatsApp = (deal: CrmOportunidade, e: React.MouseEvent) => {
    e.stopPropagation();
    const raw = (deal.telefone || '').replace(/\D/g, '');
    if (!raw || raw.length < 10) {
      onShowToast('Telefone inválido para WhatsApp.');
      return;
    }
    const phone = raw.length === 11 || raw.length === 10 ? `55${raw}` : raw;
    const nome = deal.contatoNome || deal.cliente;
    const vendedor = currentUser.nome.split(' ')[0] || deal.responsavel;
    const msg = `Olá ${nome}, tudo bem? Aqui é ${vendedor} da *Valora Gestão & Cobrança*. Gostaria de dar seguimento ao alinhamento sobre a gestão da carteira da *${deal.cliente}*. Podemos falar rapidamente?`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
    
    addCrmActivity(deal.id, {
      autor: currentUser.nome,
      tipo: 'whatsapp',
      descricao: `Acionamento rápido via WhatsApp por ${currentUser.nome}.`
    });
    setDeals(getStoredCrmDeals());
    onShowToast(`WhatsApp aberto para ${nome}!`);
  };

  const handleExportExcel = () => {
    try {
      exportCrmDealsToExcel(filteredDeals);
      onShowToast('Planilha de CRM exportada com sucesso!');
    } catch (err) {
      onShowToast('Erro ao exportar planilha de CRM.');
    }
  };

  const handleResetSeed = () => {
    if (confirm('Deseja restaurar as oportunidades de teste padrão do CRM comercial? Suas alterações serão substituídas.')) {
      resetCrmDealsToDefault();
      setDeals(getStoredCrmDeals());
      onShowToast('Dados de demonstração do CRM restaurados!');
    }
  };

  // Chart Data: Pipeline by Stage
  const chartDataStage = useMemo(() => {
    return CRM_ETAPAS_CONFIG.map(cfg => {
      const stat = metrics.contagemPorEtapa[cfg.id] || { qtd: 0, valor: 0 };
      return {
        nome: cfg.nome,
        valor: stat.valor,
        qtd: stat.qtd,
        id: cfg.id
      };
    });
  }, [metrics]);

  // Chart Data: Lead Sources
  const chartDataSources = useMemo(() => {
    const map = new Map<string, number>();
    deals.forEach(d => {
      const src = ORIGENS_LEAD_LABELS[d.origem] || d.origem;
      map.set(src, (map.get(src) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [deals]);

  const PIE_COLORS = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b'];

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      
      {/* 1. Header & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-indigo-800 text-white flex items-center justify-center shadow-lg shadow-blue-600/20 shrink-0">
            <Briefcase className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                CRM de Vendas &amp; Pipeline Comercial
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-blue-100 text-blue-800 border border-blue-200">
                Funil Ativo
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Gestão de leads, propostas comerciais, negociações e fechamento de contratos de recuperação
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            id="crm-btn-reset-seed"
            onClick={handleResetSeed}
            className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors border border-slate-200 flex items-center gap-1.5"
            title="Recarregar dados de exemplo"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Exemplos</span>
          </button>

          <button
            type="button"
            id="crm-btn-exportar-excel"
            onClick={handleExportExcel}
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors flex items-center gap-2 border border-slate-200"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>Exportar Excel</span>
          </button>

          <button
            type="button"
            id="crm-btn-novo-deal"
            onClick={handleOpenNewDeal}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 active:scale-98 transition-all shadow-md shadow-blue-500/25 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Oportunidade</span>
          </button>
        </div>
      </div>

      {/* 2. Executive KPI Cards Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        
        {/* KPI 1: Pipeline em Negociação */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">
              Pipeline Ativo
            </span>
            <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <DollarSign className="w-4 h-4" />
            </span>
          </div>
          <div className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
            R$ {metrics.valorTotalPipeline.toLocaleString('pt-BR')}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1 font-medium">
            <span className="font-bold text-blue-600">{metrics.oportunidadesAtivas}</span> oportunidades em curso
          </div>
        </div>

        {/* KPI 2: Pipeline Ponderado */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">
              Ponderado (Probab.)
            </span>
            <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="text-lg sm:text-xl font-extrabold text-indigo-700 tracking-tight">
            R$ {metrics.valorPonderadoPipeline.toLocaleString('pt-BR')}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Previsão ponderada de receita
          </div>
        </div>

        {/* KPI 3: Vendas Ganhas */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">
              Vendas Ganhas
            </span>
            <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <div className="text-lg sm:text-xl font-extrabold text-emerald-700 tracking-tight">
            R$ {metrics.valorTotalGanho.toLocaleString('pt-BR')}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1 font-medium">
            <span className="font-bold text-emerald-600">{metrics.totalVendasGanhas}</span> contratos assinados
          </div>
        </div>

        {/* KPI 4: Taxa de Conversão */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">
              Taxa de Conversão
            </span>
            <span className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
              <Sparkles className="w-4 h-4" />
            </span>
          </div>
          <div className="text-lg sm:text-xl font-extrabold text-amber-700 tracking-tight">
            {metrics.taxaConversao}%
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Ganhos vs. Perdidos ({metrics.totalVendasGanhas} / {metrics.totalVendasGanhas + metrics.totalVendasPerdidas})
          </div>
        </div>

        {/* KPI 5: Ticket Médio Ganho */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs col-span-2 sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">
              Ticket Médio Fechado
            </span>
            <span className="p-1.5 rounded-lg bg-purple-50 text-purple-600">
              <Award className="w-4 h-4" />
            </span>
          </div>
          <div className="text-lg sm:text-xl font-extrabold text-purple-700 tracking-tight">
            R$ {metrics.ticketMedioGanho.toLocaleString('pt-BR')}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Média por contrato ganho
          </div>
        </div>
      </div>

      {/* 3. Subtabs Bar & Interactive Filters */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        
        {/* Subtabs Selector */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            id="crm-subtab-kanban"
            onClick={() => setActiveSubTab('kanban')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeSubTab === 'kanban'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Funil de Vendas (Kanban)</span>
          </button>

          <button
            type="button"
            id="crm-subtab-lista"
            onClick={() => setActiveSubTab('lista')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeSubTab === 'lista'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            <span>Lista / Tabela ({filteredDeals.length})</span>
          </button>

          <button
            type="button"
            id="crm-subtab-metricas"
            onClick={() => setActiveSubTab('metricas')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeSubTab === 'metricas'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Indicadores &amp; Gráficos</span>
          </button>

          <button
            type="button"
            id="crm-subtab-ranking"
            onClick={() => setActiveSubTab('ranking')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeSubTab === 'ranking'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>Ranking Comercial</span>
          </button>
        </div>

        {/* Search and Dropdowns Filter */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Search box */}
          <div className="relative flex-1 md:w-56">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar cliente, título..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
            />
          </div>

          {/* Vendedora Filter */}
          <select
            value={selectedResponsavel}
            onChange={e => setSelectedResponsavel(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-700 bg-white focus:outline-hidden"
          >
            <option value="todos">Vendedoras (Todas)</option>
            {uniqueSellers.map(seller => (
              <option key={seller} value={seller}>{seller}</option>
            ))}
          </select>

          {/* Temperatura Filter */}
          <select
            value={selectedTemperatura}
            onChange={e => setSelectedTemperatura(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-700 bg-white focus:outline-hidden"
          >
            <option value="todos">Temperatura (Todas)</option>
            <option value="quente">🔥 Quente</option>
            <option value="morno">⚡ Morno</option>
            <option value="frio">❄️ Frio</option>
          </select>
        </div>
      </div>

      {/* 4. SUBTAB VIEW 1: KANBAN BOARD */}
      {activeSubTab === 'kanban' && (
        <div className="overflow-x-auto pb-4">
          <div className="flex items-start gap-4 min-w-[1240px]">
            {CRM_ETAPAS_CONFIG.map(etapaCfg => {
              const stageDeals = filteredDeals.filter(d => d.etapa === etapaCfg.id);
              const stageTotalValue = stageDeals.reduce((acc, curr) => acc + (Number(curr.valor) || 0), 0);

              return (
                <div 
                  key={etapaCfg.id}
                  className="flex-1 min-w-[270px] max-w-[320px] flex flex-col bg-slate-100/70 rounded-2xl border border-slate-200 shadow-2xs overflow-hidden"
                >
                  {/* Column Header */}
                  <div className={`p-3.5 border-b border-slate-200 bg-white flex items-center justify-between`}>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-xs text-slate-900">{etapaCfg.nome}</span>
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {stageDeals.length}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 block truncate">
                        {etapaCfg.descricao}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[11px] font-extrabold text-slate-800 block">
                        R$ {stageTotalValue.toLocaleString('pt-BR')}
                      </span>
                      <span className="text-[9px] text-slate-400 font-medium">
                        {etapaCfg.probabilidadePadrao}% probab.
                      </span>
                    </div>
                  </div>

                  {/* Deals List in Column */}
                  <div className="p-2.5 space-y-2.5 flex-1 overflow-y-auto max-h-[640px]">
                    {stageDeals.length === 0 ? (
                      <div className="py-8 text-center text-slate-400 text-xs border-2 border-dashed border-slate-200 rounded-xl">
                        Nenhuma oportunidade nesta etapa
                      </div>
                    ) : (
                      stageDeals.map(deal => {
                        const tempConf = TEMPERATURA_LABELS[deal.temperatura] || TEMPERATURA_LABELS.morno;
                        return (
                          <div
                            key={deal.id}
                            id={`deal-card-${deal.id}`}
                            onClick={() => handleOpenEditDeal(deal)}
                            className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-blue-400 transition-all cursor-pointer group space-y-2.5"
                          >
                            {/* Card Top: Tags & Temperature */}
                            <div className="flex items-center justify-between gap-1.5">
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border flex items-center gap-1 ${tempConf.bg} ${tempConf.text}`}>
                                <span>{tempConf.icon}</span>
                                <span className="capitalize">{deal.temperatura}</span>
                              </span>

                              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                                {deal.responsavel}
                              </span>
                            </div>

                            {/* Card Title & Client */}
                            <div>
                              <h4 className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2 leading-snug">
                                {deal.titulo}
                              </h4>
                              <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-1 truncate">
                                <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                                <span className="truncate font-medium">{deal.cliente}</span>
                              </div>
                            </div>

                            {/* Value & Forecast */}
                            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                              <div>
                                <span className="text-xs font-extrabold text-emerald-700 block">
                                  R$ {Number(deal.valor || 0).toLocaleString('pt-BR')}
                                </span>
                                {deal.valorMensal ? (
                                  <span className="text-[10px] text-slate-400 font-medium">
                                    + R$ {deal.valorMensal}/mês
                                  </span>
                                ) : null}
                              </div>

                              {deal.previsaoFechamento && (
                                <div className="text-right text-[10px] text-slate-400 flex items-center gap-1">
                                  <Calendar className="w-3 h-3 text-slate-400" />
                                  <span>{new Date(deal.previsaoFechamento).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</span>
                                </div>
                              )}
                            </div>

                            {/* Next Action Box */}
                            {deal.proximaAcao && (
                              <div className="p-2 rounded-lg bg-blue-50/60 border border-blue-100/80 text-[10px] text-blue-900 flex items-start gap-1.5">
                                <Clock className="w-3 h-3 text-blue-600 shrink-0 mt-0.5" />
                                <span className="line-clamp-1 font-medium">{deal.proximaAcao}</span>
                              </div>
                            )}

                            {/* Card Quick Actions: WhatsApp and Advance */}
                            <div className="pt-1 flex items-center justify-between gap-1">
                              <button
                                type="button"
                                onClick={(e) => handleQuickDirectWhatsApp(deal, e)}
                                className="p-1.5 rounded-lg text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors flex items-center gap-1 text-[11px] font-bold"
                                title="Falar via WhatsApp"
                              >
                                <MessageSquare className="w-3 h-3 text-emerald-600" />
                                <span>WhatsApp</span>
                              </button>

                              {etapaCfg.id !== 'ganho' && etapaCfg.id !== 'perdido' && (
                                <button
                                  type="button"
                                  onClick={(e) => handleQuickAdvanceStage(deal, e)}
                                  className="p-1.5 rounded-lg text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors flex items-center gap-1 text-[11px] font-bold"
                                  title="Avançar para próxima etapa do funil"
                                >
                                  <span>Avançar</span>
                                  <ArrowRight className="w-3 h-3 text-blue-600" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. SUBTAB VIEW 2: TABLE / LIST VIEW */}
      {activeSubTab === 'lista' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3">Oportunidade / Cliente</th>
                  <th className="px-4 py-3">Contato &amp; Telefone</th>
                  <th className="px-4 py-3">Etapa do Funil</th>
                  <th className="px-4 py-3">Valor Estimado</th>
                  <th className="px-4 py-3">Probab.</th>
                  <th className="px-4 py-3">Temperatura</th>
                  <th className="px-4 py-3">Responsável</th>
                  <th className="px-4 py-3">Próxima Ação</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredDeals.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400">
                      Nenhuma oportunidade encontrada com os filtros aplicados.
                    </td>
                  </tr>
                ) : (
                  filteredDeals.map(deal => {
                    const etapaCfg = CRM_ETAPAS_CONFIG.find(e => e.id === deal.etapa);
                    const tempConf = TEMPERATURA_LABELS[deal.temperatura] || TEMPERATURA_LABELS.morno;

                    return (
                      <tr 
                        key={deal.id} 
                        onClick={() => handleOpenEditDeal(deal)}
                        className="hover:bg-slate-50 transition-colors cursor-pointer group"
                      >
                        {/* Oportunidade / Cliente */}
                        <td className="px-4 py-3 max-w-[220px]">
                          <span className="font-bold text-slate-900 block group-hover:text-blue-600 transition-colors truncate">
                            {deal.titulo}
                          </span>
                          <span className="text-[11px] text-slate-500 block truncate font-medium">
                            {deal.cliente} {deal.cidadeUf ? `• ${deal.cidadeUf}` : ''}
                          </span>
                        </td>

                        {/* Contato & Telefone */}
                        <td className="px-4 py-3">
                          <span className="font-semibold text-slate-800 block">
                            {deal.contatoNome || '-'}
                          </span>
                          <span className="text-[11px] text-slate-500 font-mono">
                            {deal.telefone}
                          </span>
                        </td>

                        {/* Etapa */}
                        <td className="px-4 py-3">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border inline-block ${etapaCfg?.corBadge || 'bg-slate-100 text-slate-700'}`}>
                            {etapaCfg?.nome || deal.etapa}
                          </span>
                        </td>

                        {/* Valor */}
                        <td className="px-4 py-3 font-extrabold text-slate-900">
                          R$ {Number(deal.valor || 0).toLocaleString('pt-BR')}
                          {deal.valorMensal ? (
                            <span className="block text-[10px] text-slate-400 font-medium">
                              (R$ {deal.valorMensal}/mês)
                            </span>
                          ) : null}
                        </td>

                        {/* Probabilidade */}
                        <td className="px-4 py-3 font-bold text-slate-700">
                          {deal.probabilidade}%
                        </td>

                        {/* Temperatura */}
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border inline-flex items-center gap-1 ${tempConf.bg} ${tempConf.text}`}>
                            <span>{tempConf.icon}</span>
                            <span className="capitalize">{deal.temperatura}</span>
                          </span>
                        </td>

                        {/* Responsável */}
                        <td className="px-4 py-3 font-bold text-slate-700">
                          {deal.responsavel}
                        </td>

                        {/* Próxima Ação */}
                        <td className="px-4 py-3 max-w-[200px]">
                          <span className="text-[11px] text-slate-700 line-clamp-1 block">
                            {deal.proximaAcao || 'Sem ação cadastrada'}
                          </span>
                          {deal.dataProximaAcao && (
                            <span className="text-[10px] text-slate-400 block font-medium">
                              Para: {new Date(deal.dataProximaAcao).toLocaleDateString('pt-BR')}
                            </span>
                          )}
                        </td>

                        {/* Ações */}
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={(e) => handleQuickDirectWhatsApp(deal, e)}
                              className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors"
                              title="Abrir WhatsApp"
                            >
                              <MessageSquare className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenEditDeal(deal)}
                              className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
                              title="Editar Oportunidade"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. SUBTAB VIEW 3: CHARTS & ANALYTICS */}
      {activeSubTab === 'metricas' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Chart 1: Volume Financeiro por Etapa do Funil */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Volume Financeiro no Funil (R$)</h3>
                  <p className="text-xs text-slate-500">Valor consolidado por estágio de negociação</p>
                </div>
                <span className="p-2 rounded-xl bg-blue-50 text-blue-600">
                  <BarChart3 className="w-4 h-4" />
                </span>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartDataStage} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="nome" tick={{ fontSize: 10, fill: '#64748b' }} interval={0} angle={-15} textAnchor="end" />
                    <YAxis tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(val) => `R$ ${(val/1000).toFixed(0)}k`} />
                    <Tooltip 
                      formatter={(val: any) => [`R$ ${Number(val).toLocaleString('pt-BR')}`, 'Valor Total']}
                      labelStyle={{ fontWeight: 'bold', color: '#1e293b' }}
                      contentStyle={{ borderRadius: '0.75rem', border: '1px solid #cbd5e1' }}
                    />
                    <Bar dataKey="valor" radius={[6, 6, 0, 0]}>
                      {chartDataStage.map((entry) => (
                        <Cell 
                          key={`cell-${entry.id}`} 
                          fill={
                            entry.id === 'ganho' ? '#10b981' :
                            entry.id === 'perdido' ? '#f43f5e' :
                            entry.id === 'negociacao' ? '#8b5cf6' :
                            entry.id === 'proposta' ? '#f59e0b' : '#3b82f6'
                          } 
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Origem dos Leads Comerciais */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Origem dos Leads Comerciais</h3>
                  <p className="text-xs text-slate-500">De onde vêm os novos clientes e oportunidades</p>
                </div>
                <span className="p-2 rounded-xl bg-purple-50 text-purple-600">
                  <PieChartIcon className="w-4 h-4" />
                </span>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartDataSources}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      innerRadius={45}
                      paddingAngle={4}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      labelLine={false}
                    >
                      {chartDataSources.map((_, index) => (
                        <Cell key={`pie-cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(val: any) => [`${val} leads`, 'Quantidade']}
                      contentStyle={{ borderRadius: '0.75rem', border: '1px solid #cbd5e1' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Breakdown by Stage summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {CRM_ETAPAS_CONFIG.map(cfg => {
              const stat = metrics.contagemPorEtapa[cfg.id] || { qtd: 0, valor: 0 };
              return (
                <div key={cfg.id} className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block truncate">
                    {cfg.nome}
                  </span>
                  <div className="text-sm font-extrabold text-slate-900 mt-1">
                    R$ {stat.valor.toLocaleString('pt-BR')}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {stat.qtd} oportunidade{stat.qtd !== 1 ? 's' : ''}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 7. SUBTAB VIEW 4: SELLER LEADERBOARD (RANKING COMERCIAL) */}
      {activeSubTab === 'ranking' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Ranking de Performance Comercial da Equipe
              </h2>
              <p className="text-xs text-slate-500">
                Desempenho de vendas, conversão de contratos e valor em negociação por responsável
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-amber-700" />
                <span>Ciclo Comercial 2026</span>
              </span>
            </div>
          </div>

          {/* Leaderboard Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3">Posição &amp; Vendedora</th>
                  <th className="px-4 py-3">Total de Oportunidades</th>
                  <th className="px-4 py-3">Contratos Ganhos</th>
                  <th className="px-4 py-3">Valor Ganho (R$)</th>
                  <th className="px-4 py-3">Em Negociação Ativa (R$)</th>
                  <th className="px-4 py-3">Taxa de Fechamento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {metrics.rankingVendedoras.map((vendedora, index) => {
                  const isTop1 = index === 0;
                  const isTop2 = index === 1;
                  const isTop3 = index === 2;

                  return (
                    <tr key={vendedora.nome} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3.5 flex items-center gap-3">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                          isTop1 ? 'bg-amber-400 text-amber-950 shadow-xs' :
                          isTop2 ? 'bg-slate-300 text-slate-900' :
                          isTop3 ? 'bg-amber-700 text-amber-100' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {index + 1}º
                        </span>
                        <div>
                          <span className="font-bold text-slate-900 text-xs block">
                            {vendedora.nome}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            Equipe Comercial Valora
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 font-bold text-slate-700">
                        {vendedora.totalDeals} oportunidades
                      </td>

                      <td className="px-4 py-3.5 font-extrabold text-emerald-700">
                        {vendedora.dealsGanhos} fechamento{vendedora.dealsGanhos !== 1 ? 's' : ''}
                      </td>

                      <td className="px-4 py-3.5 font-extrabold text-slate-900 text-sm">
                        R$ {vendedora.valorGanho.toLocaleString('pt-BR')}
                      </td>

                      <td className="px-4 py-3.5 font-bold text-blue-700">
                        R$ {vendedora.valorEmNegociacao.toLocaleString('pt-BR')}
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-slate-200 h-2 rounded-full overflow-hidden">
                            <div 
                              className="bg-blue-600 h-full rounded-full"
                              style={{ width: `${Math.min(100, vendedora.taxaConversao)}%` }}
                            />
                          </div>
                          <span className="font-bold text-slate-800 text-xs">
                            {vendedora.taxaConversao}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Deal Create / Edit Modal */}
      <CrmDealModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        deal={selectedDealForEdit}
        currentUser={currentUser}
        onSave={handleSaveDeal}
        onDelete={handleDeleteDeal}
        onAddActivity={handleAddActivity}
        onShowToast={onShowToast}
      />
    </div>
  );
};
