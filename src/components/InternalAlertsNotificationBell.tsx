import React, { useState, useRef, useEffect } from 'react';
import { 
  Bell, 
  AlertTriangle, 
  Check, 
  ExternalLink, 
  Clock, 
  ShieldAlert,
  ChevronRight
} from 'lucide-react';
import { AlertaInterno, DebtRecord } from '../types';
import { markAlertAsRead, markAllAlertsAsRead } from '../utils/reminderService';

interface InternalAlertsNotificationBellProps {
  alerts: AlertaInterno[];
  onOpenRemindersModal: () => void;
  onSelectClient?: (record: DebtRecord) => void;
  records: DebtRecord[];
  onAlertsUpdated: () => void;
}

export const InternalAlertsNotificationBell: React.FC<InternalAlertsNotificationBellProps> = ({
  alerts,
  onOpenRemindersModal,
  onSelectClient,
  records,
  onAlertsUpdated,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadAlerts = alerts.filter(a => !a.lido);
  const unreadCount = unreadAlerts.length;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkRead = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    markAlertAsRead(id);
    onAlertsUpdated();
  };

  const handleMarkAllRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    markAllAlertsAsRead();
    onAlertsUpdated();
  };

  const handleAlertClick = (alert: AlertaInterno) => {
    markAlertAsRead(alert.id);
    onAlertsUpdated();
    const client = records.find(r => r.id === alert.clienteId);
    if (client && onSelectClient) {
      onSelectClient(client);
    } else {
      onOpenRemindersModal();
    }
    setIsOpen(false);
  };

  return (
    <div className="relative no-print" ref={dropdownRef}>
      
      {/* Trigger Button */}
      <button
        id="btn-internal-alerts-bell"
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer border ${
          unreadCount > 0 
            ? 'border-amber-300 bg-amber-50/60 text-amber-900' 
            : 'border-slate-200 bg-white'
        }`}
        title={`Alertas Internos (>45 dias): ${unreadCount} não lidos`}
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-rose-600 text-white rounded-full text-[10px] font-bold flex items-center justify-center shadow-xs animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
          
          {/* Header */}
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              <span className="text-xs font-bold text-slate-900">
                Alertas Internos (&gt; 45 dias)
              </span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                  {unreadCount} novos
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
              >
                Ler todos
              </button>
            )}
          </div>

          {/* List of Alerts */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {alerts.slice(0, 6).map((alert) => (
              <div
                key={alert.id}
                onClick={() => handleAlertClick(alert)}
                className={`p-3 text-xs transition-colors cursor-pointer hover:bg-slate-50 ${
                  !alert.lido ? 'bg-amber-50/40' : 'bg-white opacity-75'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    <span className={`w-2 h-2 rounded-full mt-1 shrink-0 ${
                      !alert.lido ? 'bg-rose-500' : 'bg-slate-300'
                    }`} />
                    <div>
                      <p className="font-bold text-slate-900">
                        {alert.clienteNome} <span className="font-mono text-slate-500 font-normal">#{alert.matricula}</span>
                      </p>
                      <p className="text-[11px] text-slate-600 line-clamp-2 mt-0.5">
                        {alert.mensagem}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-400">
                        <span className="font-semibold text-rose-700">{alert.diasAtraso} dias de atraso</span>
                        <span>•</span>
                        <span>{alert.responsavel}</span>
                      </div>
                    </div>
                  </div>

                  {!alert.lido && (
                    <button
                      type="button"
                      onClick={(e) => handleMarkRead(alert.id, e)}
                      className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-white rounded transition-colors shrink-0"
                      title="Marcar como lido"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}

            {alerts.length === 0 && (
              <div className="p-6 text-center text-slate-500 text-xs">
                <Clock className="w-6 h-6 text-slate-300 mx-auto mb-1.5" />
                <p className="font-semibold text-slate-700">Nenhum alerta interno</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Não há notificações ativas de inadimplência superior a 45 dias.
                </p>
              </div>
            )}
          </div>

          {/* Footer link to open modal */}
          <div className="p-2.5 bg-slate-50 border-t border-slate-200 text-center">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onOpenRemindersModal();
              }}
              className="w-full text-xs font-bold text-indigo-700 hover:text-indigo-900 py-1 flex items-center justify-center gap-1 cursor-pointer"
            >
              <span>Gerenciar Agendamentos & Todos os Alertas</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>
      )}

    </div>
  );
};
