import React from 'react';
import {
  FileSpreadsheet,
  BarChart3,
  Sparkles,
  Clock,
  BellRing,
  Plus,
  Upload,
  Download,
  Users,
  Copy,
  Printer,
  RefreshCw,
  LogOut,
  ChevronLeft,
  ChevronRight,
  X,
  QrCode,
  FileText,
  LayoutDashboard,
  TrendingUp,
  Crown,
  Layers,
  ArrowRightLeft,
  Wallet,
  Target
} from 'lucide-react';
import { AppUser, WhatsAppSession } from '../types';

interface AppSidebarProps {
  activeTab: 'planilha' | 'financeiro' | 'crm' | 'relatorios';
  setActiveTab: (tab: 'planilha' | 'financeiro' | 'crm' | 'relatorios') => void;
  subTabRelatorios: 'relatorios_pdf' | 'dashboard_graficos' | 'comparativo_operadores';
  setSubTabRelatorios: (subTab: 'relatorios_pdf' | 'dashboard_graficos' | 'comparativo_operadores') => void;
  totalRecords: number;
  criticalCount: number;
  currentUser: AppUser;
  waSession?: WhatsAppSession;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean | ((prev: boolean) => boolean)) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
  onOpenUserAuth: () => void;
  onLogout: () => void;
  onOpenRiskModal: () => void;
  onOpenRemindersModal: () => void;
  onOpenNotifications: () => void;
  onNewRecord: () => void;
  onOpenBulkCsv: () => void;
  onOpenImport: () => void;
  onOpenExport: () => void;
  onOpenDuplicates: () => void;
  onOpenWhatsAppConnection: () => void;
  onResetToDefault: () => void;
  onPrint: () => void;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  activeTab,
  setActiveTab,
  subTabRelatorios,
  setSubTabRelatorios,
  totalRecords,
  criticalCount,
  currentUser,
  waSession,
  isCollapsed,
  setIsCollapsed,
  isMobileOpen,
  setIsMobileOpen,
  onOpenUserAuth,
  onLogout,
  onOpenRiskModal,
  onOpenRemindersModal,
  onOpenNotifications,
  onNewRecord,
  onOpenBulkCsv,
  onOpenImport,
  onOpenExport,
  onOpenDuplicates,
  onOpenWhatsAppConnection,
  onResetToDefault,
  onPrint,
}) => {
  const isAdm = currentUser.role === 'adm_master' || currentUser.role === 'suporte';

  const handleSelectTab = (tab: 'planilha' | 'financeiro' | 'crm' | 'relatorios') => {
    setActiveTab(tab);
    setIsMobileOpen(false);
  };

  const handleSelectSubReport = (sub: 'relatorios_pdf' | 'dashboard_graficos' | 'comparativo_operadores') => {
    setActiveTab('relatorios');
    setSubTabRelatorios(sub);
    setIsMobileOpen(false);
  };

  const handleTriggerAction = (action: () => void) => {
    action();
    setIsMobileOpen(false);
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-slate-900 text-slate-200 select-none">
      {/* Sidebar Header: Logo & Branding */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
            <FileSpreadsheet className="w-5 h-5 text-white" />
          </div>
          {(!isCollapsed || isMobileOpen) && (
            <div className="min-w-0 transition-opacity duration-200">
              <h1 className="text-sm font-bold text-white tracking-tight leading-snug truncate">
                Valora Cobrança
              </h1>
              <p className="text-[10px] text-slate-400 font-medium truncate">
                Gestão &amp; Inadimplência
              </p>
            </div>
          )}
        </div>

        {/* Mobile close button */}
        <button
          type="button"
          onClick={() => setIsMobileOpen(false)}
          className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title="Fechar menu lateral"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Desktop collapse toggle */}
        <button
          type="button"
          onClick={() => setIsCollapsed(prev => !prev)}
          className="hidden md:flex p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
          title={isCollapsed ? 'Expandir barra lateral' : 'Recolher barra lateral'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation Scrollable Body */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
        
        {/* Quick Action: New Record Button */}
        <div>
          <button
            type="button"
            id="sidebar-btn-novo-cliente"
            onClick={() => handleTriggerAction(onNewRecord)}
            className={`w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl font-bold text-xs text-white bg-blue-600 hover:bg-blue-500 active:scale-98 shadow-sm transition-all cursor-pointer ${
              isCollapsed && !isMobileOpen ? 'px-0' : ''
            }`}
            title="Adicionar Novo Cliente Inadimplente"
          >
            <Plus className="w-4 h-4 shrink-0" />
            {(!isCollapsed || isMobileOpen) && <span>Novo Cliente</span>}
          </button>
        </div>

        {/* Group 1: Módulos Principais */}
        <div className="space-y-1">
          {(!isCollapsed || isMobileOpen) && (
            <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Navegação Principal
            </span>
          )}

          {/* Planilha Centralizada */}
          <button
            type="button"
            id="sidebar-nav-planilha"
            onClick={() => handleSelectTab('planilha')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'planilha'
                ? 'bg-blue-600/90 text-white shadow-xs font-bold'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
            } ${isCollapsed && !isMobileOpen ? 'justify-center px-0' : ''}`}
            title={`Planilha Centralizada (${totalRecords} clientes)`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <FileSpreadsheet className={`w-4 h-4 shrink-0 ${activeTab === 'planilha' ? 'text-white' : 'text-blue-400'}`} />
              {(!isCollapsed || isMobileOpen) && <span className="truncate">Planilha de Cobrança</span>}
            </div>
            {(!isCollapsed || isMobileOpen) && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === 'planilha' ? 'bg-blue-800 text-blue-100' : 'bg-slate-800 text-slate-300'
              }`}>
                {totalRecords}
              </span>
            )}
          </button>

          {/* Módulo Financeiro */}
          <button
            type="button"
            id="sidebar-nav-financeiro"
            onClick={() => handleSelectTab('financeiro')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'financeiro'
                ? 'bg-emerald-600 text-white shadow-xs font-bold'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
            } ${isCollapsed && !isMobileOpen ? 'justify-center px-0' : ''}`}
            title="Módulo Financeiro & Caixa"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Wallet className={`w-4 h-4 shrink-0 ${activeTab === 'financeiro' ? 'text-white' : 'text-emerald-400'}`} />
              {(!isCollapsed || isMobileOpen) && <span className="truncate">Módulo Financeiro</span>}
            </div>
            {(!isCollapsed || isMobileOpen) && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-900/60 text-emerald-200 border border-emerald-700/50">
                Caixa
              </span>
            )}
          </button>

          {/* Módulo CRM de Vendas */}
          <button
            type="button"
            id="sidebar-nav-crm"
            onClick={() => handleSelectTab('crm')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'crm'
                ? 'bg-indigo-600 text-white shadow-xs font-bold'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
            } ${isCollapsed && !isMobileOpen ? 'justify-center px-0' : ''}`}
            title="CRM de Vendas & Pipeline Comercial"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Target className={`w-4 h-4 shrink-0 ${activeTab === 'crm' ? 'text-white' : 'text-indigo-400'}`} />
              {(!isCollapsed || isMobileOpen) && <span className="truncate">CRM de Vendas</span>}
            </div>
            {(!isCollapsed || isMobileOpen) && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-900/60 text-indigo-200 border border-indigo-700/50">
                Pipeline
              </span>
            )}
          </button>

          {/* Relatórios & Gráficos */}
          <div className="space-y-1">
            <button
              type="button"
              id="sidebar-nav-relatorios"
              onClick={() => handleSelectTab('relatorios')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'relatorios'
                  ? 'bg-blue-600/90 text-white shadow-xs font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
              } ${isCollapsed && !isMobileOpen ? 'justify-center px-0' : ''}`}
              title="Relatórios Executivos & Gráficos"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <BarChart3 className={`w-4 h-4 shrink-0 ${activeTab === 'relatorios' ? 'text-white' : 'text-purple-400'}`} />
                {(!isCollapsed || isMobileOpen) && <span className="truncate">Relatórios &amp; Gráficos</span>}
              </div>
              {(!isCollapsed || isMobileOpen) && (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-900/60 text-purple-200 border border-purple-700/50">
                  PDF
                </span>
              )}
            </button>

            {/* Sub-items for Relatórios when expanded and active */}
            {activeTab === 'relatorios' && (!isCollapsed || isMobileOpen) && (
              <div className="pl-6 pr-1 py-1 space-y-1 border-l-2 border-slate-700 ml-4 my-1">
                <button
                  type="button"
                  onClick={() => handleSelectSubReport('relatorios_pdf')}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] font-medium flex items-center gap-2 transition-colors cursor-pointer ${
                    subTabRelatorios === 'relatorios_pdf'
                      ? 'text-white bg-slate-800 font-bold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 text-blue-400" />
                  <span>Resumos em PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectSubReport('dashboard_graficos')}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] font-medium flex items-center gap-2 transition-colors cursor-pointer ${
                    subTabRelatorios === 'dashboard_graficos'
                      ? 'text-white bg-slate-800 font-bold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <LayoutDashboard className="w-3.5 h-3.5 text-purple-400" />
                  <span>Dashboard Gráfico</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectSubReport('comparativo_operadores')}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] font-medium flex items-center justify-between gap-1 transition-colors cursor-pointer ${
                    subTabRelatorios === 'comparativo_operadores'
                      ? 'text-white bg-slate-800 font-bold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="truncate">Comparativo Operadores</span>
                  </div>
                  <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 text-[9px] font-extrabold rounded uppercase tracking-wider shrink-0">
                    Novo
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Group 2: Inteligência & Acompanhamento */}
        <div className="space-y-1">
          {(!isCollapsed || isMobileOpen) && (
            <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Inteligência &amp; Avisos
            </span>
          )}

          {/* AI Risk Score (Gemini) */}
          <button
            type="button"
            id="sidebar-btn-risk-gemini"
            onClick={() => handleTriggerAction(onOpenRiskModal)}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800/80 transition-all cursor-pointer ${
              isCollapsed && !isMobileOpen ? 'justify-center px-0' : ''
            }`}
            title="Score de Risco IA (Gemini)"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              {(!isCollapsed || isMobileOpen) && <span className="truncate">Score de Risco IA</span>}
            </div>
            {(!isCollapsed || isMobileOpen) && (
              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Gemini
              </span>
            )}
          </button>

          {/* Scheduled Reminders (>45 days) */}
          <button
            type="button"
            id="sidebar-btn-reminders-45d"
            onClick={() => handleTriggerAction(onOpenRemindersModal)}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800/80 transition-all cursor-pointer ${
              isCollapsed && !isMobileOpen ? 'justify-center px-0' : ''
            }`}
            title="Lembretes & Alertas Agendados (>45 dias)"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Clock className="w-4 h-4 text-cyan-400 shrink-0" />
              {(!isCollapsed || isMobileOpen) && <span className="truncate">Lembretes (&gt;45 dias)</span>}
            </div>
            {(!isCollapsed || isMobileOpen) && criticalCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                {criticalCount} críticos
              </span>
            )}
          </button>

          {/* Bulk WhatsApp Notifications */}
          <button
            type="button"
            id="sidebar-btn-disparo-lote"
            onClick={() => handleTriggerAction(onOpenNotifications)}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800/80 transition-all cursor-pointer ${
              isCollapsed && !isMobileOpen ? 'justify-center px-0' : ''
            }`}
            title="Disparo em Lote pelo WhatsApp"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <BellRing className="w-4 h-4 text-emerald-400 shrink-0" />
              {(!isCollapsed || isMobileOpen) && <span className="truncate">Disparo em Lote</span>}
            </div>
          </button>
        </div>

        {/* Group 3: Ferramentas & Operação */}
        <div className="space-y-1">
          {(!isCollapsed || isMobileOpen) && (
            <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Operações &amp; Arquivos
            </span>
          )}

          {/* Bulk CSV Import */}
          <button
            type="button"
            id="sidebar-btn-bulk-csv"
            onClick={() => handleTriggerAction(onOpenBulkCsv)}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/80 transition-all cursor-pointer ${
              isCollapsed && !isMobileOpen ? 'justify-center px-0' : ''
            }`}
            title="Adicionar Clientes em Massa (CSV)"
          >
            <Users className="w-4 h-4 text-blue-400 shrink-0" />
            {(!isCollapsed || isMobileOpen) && <span className="truncate">Adicionar em Massa (CSV)</span>}
          </button>

          {/* Read Sheets (Import Excel) - for Adm */}
          {isAdm && (
            <button
              type="button"
              id="sidebar-btn-import-sheets"
              onClick={() => handleTriggerAction(onOpenImport)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/80 transition-all cursor-pointer ${
                isCollapsed && !isMobileOpen ? 'justify-center px-0' : ''
              }`}
              title="Ler Abas da Planilha Excel (.xlsx)"
            >
              <Upload className="w-4 h-4 text-emerald-400 shrink-0" />
              {(!isCollapsed || isMobileOpen) && <span className="truncate">Ler Abas da Planilha</span>}
            </button>
          )}

          {/* Export Sheet */}
          <button
            type="button"
            id="sidebar-btn-export-sheet"
            onClick={() => handleTriggerAction(onOpenExport)}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/80 transition-all cursor-pointer ${
              isCollapsed && !isMobileOpen ? 'justify-center px-0' : ''
            }`}
            title="Exportar Planilha Consolidada (Excel / CSV)"
          >
            <Download className="w-4 h-4 text-indigo-400 shrink-0" />
            {(!isCollapsed || isMobileOpen) && <span className="truncate">Exportar Planilha</span>}
          </button>

          {/* Duplicates Audit */}
          <button
            type="button"
            id="sidebar-btn-duplicates"
            onClick={() => handleTriggerAction(onOpenDuplicates)}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/80 transition-all cursor-pointer ${
              isCollapsed && !isMobileOpen ? 'justify-center px-0' : ''
            }`}
            title="Auditoria de Duplicidades"
          >
            <Copy className="w-4 h-4 text-amber-400 shrink-0" />
            {(!isCollapsed || isMobileOpen) && <span className="truncate">Auditar Duplicidades</span>}
          </button>

          {/* Print */}
          <button
            type="button"
            id="sidebar-btn-print"
            onClick={() => handleTriggerAction(onPrint)}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/80 transition-all cursor-pointer ${
              isCollapsed && !isMobileOpen ? 'justify-center px-0' : ''
            }`}
            title="Imprimir Relatório / Salvar em PDF"
          >
            <Printer className="w-4 h-4 text-slate-400 shrink-0" />
            {(!isCollapsed || isMobileOpen) && <span className="truncate">Imprimir Relatório</span>}
          </button>

          {/* Reset to Default (Admin) */}
          {isAdm && (
            <button
              type="button"
              id="sidebar-btn-reset-default"
              onClick={() => handleTriggerAction(onResetToDefault)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-rose-300 hover:bg-rose-950/30 transition-all cursor-pointer ${
                isCollapsed && !isMobileOpen ? 'justify-center px-0' : ''
              }`}
              title="Restaurar dados originais da planilha"
            >
              <RefreshCw className="w-4 h-4 text-slate-400 shrink-0" />
              {(!isCollapsed || isMobileOpen) && <span className="truncate">Restaurar Padrão</span>}
            </button>
          )}
        </div>

      </div>

      {/* Sidebar Footer: WhatsApp Status & User Session Profile */}
      <div className="p-3 border-t border-slate-800 space-y-2 bg-slate-950/60 shrink-0">
        
        {/* WhatsApp Web Status Indicator */}
        <button
          type="button"
          id="sidebar-btn-whatsapp-status"
          onClick={() => handleTriggerAction(onOpenWhatsAppConnection)}
          className={`w-full flex items-center justify-between p-2 rounded-xl text-xs transition-all cursor-pointer border ${
            waSession?.status === 'connected'
              ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300 hover:bg-emerald-900/50'
              : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800 hover:text-white'
          } ${isCollapsed && !isMobileOpen ? 'justify-center p-2' : ''}`}
          title={waSession?.status === 'connected' ? `WhatsApp Conectado (${waSession.phoneNumber || 'Ativo'})` : 'Conectar WhatsApp via QR Code'}
        >
          <div className="flex items-center gap-2 min-w-0">
            <QrCode className={`w-4 h-4 shrink-0 ${waSession?.status === 'connected' ? 'text-emerald-400' : 'text-slate-400'}`} />
            {(!isCollapsed || isMobileOpen) && (
              <div className="truncate text-left leading-tight">
                <span className="font-semibold block truncate">WhatsApp</span>
                <span className="text-[10px] text-slate-400 block truncate">
                  {waSession?.status === 'connected' ? 'Sessão Ativa' : 'Desconectado'}
                </span>
              </div>
            )}
          </div>
          {(!isCollapsed || isMobileOpen) && (
            <span className={`w-2 h-2 rounded-full shrink-0 ${
              waSession?.status === 'connected' ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
            }`} />
          )}
        </button>

        {/* Current Operator Profile Card */}
        <div className={`flex items-center justify-between p-2 rounded-xl bg-slate-800/80 border border-slate-700/70 text-xs ${
          isCollapsed && !isMobileOpen ? 'justify-center p-1.5' : ''
        }`}>
          <div className="flex items-center gap-2 min-w-0">
            <div className={`w-7 h-7 rounded-lg ${currentUser.avatarColor} text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0`}>
              {isAdm ? <Crown className="w-3.5 h-3.5 text-amber-300" /> : currentUser.nome.charAt(0)}
            </div>
            {(!isCollapsed || isMobileOpen) && (
              <div className="min-w-0 leading-tight">
                <p className="font-bold text-white truncate max-w-[110px]">{currentUser.nome.split(' ')[0]}</p>
                <p className="text-[10px] text-slate-400 truncate">
                  {currentUser.role === 'adm_master' ? 'Adm Master' : currentUser.role === 'suporte' ? 'Suporte' : `Op. ${currentUser.responsavelAssociado}`}
                </p>
              </div>
            )}
          </div>

          {(!isCollapsed || isMobileOpen) && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                id="sidebar-btn-trocar-operador"
                onClick={() => handleTriggerAction(onOpenUserAuth)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                title="Trocar operador ou acessar Adm"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                id="sidebar-btn-logout"
                onClick={() => handleTriggerAction(onLogout)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-700 transition-colors"
                title="Sair da sessão"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        id="app-desktop-sidebar"
        className={`hidden md:block sticky top-0 h-screen shrink-0 transition-all duration-300 z-40 border-r border-slate-800 shadow-xl no-print ${
          isCollapsed ? 'w-18' : 'w-64'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Backdrop & Sidebar */}
      {isMobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex no-print">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={() => setIsMobileOpen(false)}
          />
          {/* Drawer Body */}
          <div className="relative w-72 max-w-[85vw] h-full shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
