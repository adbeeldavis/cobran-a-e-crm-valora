import React from 'react';
import { 
  FileSpreadsheet, 
  ShieldAlert, 
  Plus, 
  Clock, 
  Crown, 
  QrCode, 
  LogOut,
  Menu,
  Sparkles
} from 'lucide-react';
import { AppUser, AlertaInterno, DebtRecord, WhatsAppSession } from '../types';
import { InternalAlertsNotificationBell } from './InternalAlertsNotificationBell';

interface HeaderProps {
  totalRecords: number;
  criticalCount: number;
  notificationsSentCount: number;
  currentUser: AppUser;
  waSession?: WhatsAppSession;
  onOpenUserAuth: () => void;
  onLogout?: () => void;
  onOpenRemindersModal: () => void;
  onOpenWhatsAppConnection?: () => void;
  onOpenDuplicates?: () => void;
  internalAlerts: AlertaInterno[];
  onAlertsUpdated: () => void;
  records: DebtRecord[];
  onOpenImport: () => void;
  onOpenExport: () => void;
  onOpenNotifications: () => void;
  onOpenBulkCsv: () => void;
  onNewRecord: () => void;
  onResetToDefault: () => void;
  onPrint?: () => void;
  onToggleMobileSidebar?: () => void;
  activeTabTitle?: string;
  activeTabSubtitle?: string;
}

export const Header: React.FC<HeaderProps> = ({
  totalRecords,
  criticalCount,
  notificationsSentCount,
  currentUser,
  waSession,
  onOpenUserAuth,
  onLogout,
  onOpenRemindersModal,
  onOpenWhatsAppConnection,
  onOpenDuplicates,
  internalAlerts,
  onAlertsUpdated,
  records,
  onOpenImport,
  onOpenExport,
  onOpenNotifications,
  onOpenBulkCsv,
  onNewRecord,
  onResetToDefault,
  onPrint,
  onToggleMobileSidebar,
  activeTabTitle = 'Planilha Centralizada de Cobrança',
  activeTabSubtitle
}) => {
  const isAdm = currentUser.role === 'adm_master' || currentUser.role === 'suporte';

  return (
    <>
      {/* Print-only clean executive document banner */}
      <div className="print-only px-4 py-3 border-b-2 border-blue-900 bg-white mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-blue-950 uppercase tracking-tight">
              Gestão de cobrança e inadimplência
            </h1>
            <p className="text-xs text-slate-600">
              Relatório Gerencial Consolidado de Inadimplentes e Recuperação de Crédito
            </p>
          </div>
          <div className="text-right text-xs text-slate-600 space-y-0.5">
            <p><strong>Emissão:</strong> {new Date().toLocaleDateString('pt-BR')}</p>
            <p><strong>Operador / Emissor:</strong> {currentUser.nome} ({isAdm ? 'Adm Master' : currentUser.responsavelAssociado})</p>
            <p><strong>Total de Registros:</strong> {totalRecords} clientes na carteira ativa</p>
            <p><strong>Casos Críticos:</strong> {criticalCount} clientes</p>
          </div>
        </div>
      </div>

      <header id="main-header" className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-2.5 gap-4">
            
            {/* Left side: Hamburger button for mobile & View title */}
            <div className="flex items-center gap-3 min-w-0">
              {onToggleMobileSidebar && (
                <button
                  type="button"
                  id="btn-toggle-mobile-sidebar"
                  onClick={onToggleMobileSidebar}
                  className="md:hidden p-2 -ml-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                  title="Abrir menu de navegação lateral"
                >
                  <Menu className="w-5 h-5" />
                </button>
              )}

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-none truncate">
                    {activeTabTitle}
                  </h2>
                  <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 text-blue-800 border border-blue-200/80">
                    {isAdm ? 'Visão Geral (Todas Cobradoras)' : `Carteira ${currentUser.responsavelAssociado}`}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 hidden sm:block truncate mt-0.5">
                  {activeTabSubtitle || (isAdm 
                    ? `Consolidado de todas as operadoras • ${totalRecords} inadimplentes mapeados`
                    : `Cobradora responsável: ${currentUser.nome} • ${totalRecords} clientes na sua lista ativa`
                  )}
                </p>
              </div>
            </div>

            {/* Right side: Clean, focused controls & stats */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              
              {/* Quick Metrics Counters */}
              <div className="hidden lg:flex items-center gap-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 shadow-2xs">
                <div className="flex items-center gap-1.5 text-slate-700">
                  <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                  <span><strong>{totalRecords}</strong> {isAdm ? 'clientes' : 'meus clientes'}</span>
                </div>
                <div className="w-px h-3.5 bg-slate-200" />
                <div className="flex items-center gap-1.5 text-rose-700">
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
                  <span><strong>{criticalCount}</strong> críticos</span>
                </div>
              </div>

              {/* WhatsApp Web Status Indicator */}
              {onOpenWhatsAppConnection && (
                <button
                  id="btn-whatsapp-qr-connection"
                  type="button"
                  onClick={onOpenWhatsAppConnection}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold shadow-2xs transition-all cursor-pointer border ${
                    waSession?.status === 'connected'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                      : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                  title={waSession?.status === 'connected' ? `WhatsApp Conectado (${waSession.phoneNumber || 'Ativo'}). Clique para gerenciar` : 'Conectar WhatsApp via QR Code'}
                >
                  <span className={`w-2 h-2 rounded-full ${
                    waSession?.status === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                  }`} />
                  <QrCode className={`w-3.5 h-3.5 ${waSession?.status === 'connected' ? 'text-emerald-700' : 'text-slate-500'}`} />
                  <span className="hidden sm:inline">
                    {waSession?.status === 'connected' ? 'WhatsApp OK' : 'Conectar WhatsApp'}
                  </span>
                </button>
              )}

              {/* Internal Alerts Notification Bell */}
              <InternalAlertsNotificationBell
                alerts={internalAlerts}
                onOpenRemindersModal={onOpenRemindersModal}
                records={records}
                onAlertsUpdated={onAlertsUpdated}
              />

              {/* Primary Action: Novo Cliente */}
              <button
                id="btn-new-record"
                type="button"
                onClick={onNewRecord}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 active:scale-98 text-white shadow-xs hover:shadow-sm transition-all cursor-pointer"
                title="Adicionar novo registro de inadimplente"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Novo Cliente</span>
              </button>

              {/* Compact Operator Profile Badge */}
              <button
                id="btn-user-profile"
                type="button"
                onClick={onOpenUserAuth}
                className="inline-flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors shadow-2xs cursor-pointer text-left no-print"
                title="Clique para alternar operador ou gerenciar permissões"
              >
                <div className={`w-6 h-6 rounded-lg ${currentUser.avatarColor} text-white flex items-center justify-center font-bold text-xs shadow-xs`}>
                  {isAdm ? <Crown className="w-3.5 h-3.5 text-amber-300" /> : currentUser.nome.charAt(0)}
                </div>
                <div className="hidden xl:block leading-tight">
                  <p className="text-[11px] font-bold text-slate-800 truncate max-w-[100px]">{currentUser.nome.split(' ')[0]}</p>
                  <p className="text-[9px] text-slate-500 font-medium">
                    {isAdm ? 'Adm Master' : currentUser.responsavelAssociado}
                  </p>
                </div>
              </button>

              {/* Sair / Logout button */}
              {onLogout && (
                <button
                  id="btn-logout"
                  type="button"
                  onClick={onLogout}
                  className="p-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-700 text-slate-500 transition-colors shadow-2xs cursor-pointer text-xs no-print"
                  title="Encerrar sessão"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}

            </div>

          </div>
        </div>
      </header>
    </>
  );
};

