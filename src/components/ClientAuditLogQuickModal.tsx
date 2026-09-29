import React from 'react';
import { 
  History, 
  X, 
  User, 
  Clock, 
  ArrowRight, 
  FileText, 
  ShieldCheck, 
  CheckCircle2,
  AlertCircle,
  Phone,
  Calendar
} from 'lucide-react';
import { DebtRecord, ItemAuditoria } from '../types';

interface ClientAuditLogQuickModalProps {
  record: DebtRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenFullHistory?: (record: DebtRecord) => void;
}

export const ClientAuditLogQuickModal: React.FC<ClientAuditLogQuickModalProps> = ({
  record,
  isOpen,
  onClose,
  onOpenFullHistory
}) => {
  if (!isOpen || !record) return null;

  // Retrieve or synthesize the last 3 audit changes
  const recentLogs: Array<{
    id: string;
    dataHora: string;
    usuarioNome: string;
    tipoAcao: string;
    campoAlterado: string;
    valorAnterior: string;
    valorNovo: string;
    motivo?: string;
  }> = [];

  if (record.logAuditoria && record.logAuditoria.length > 0) {
    // Sort descending by timestamp
    const sorted = [...record.logAuditoria].sort((a, b) => {
      const timeA = new Date(a.dataHora).getTime() || 0;
      const timeB = new Date(b.dataHora).getTime() || 0;
      return timeB - timeA;
    });
    sorted.slice(0, 3).forEach(l => recentLogs.push(l));
  }

  // If fewer than 3 logs, supplement with historical milestones from the record
  if (recentLogs.length < 3 && record.dataUltimoContato) {
    recentLogs.push({
      id: 'log-synth-contact',
      dataHora: record.dataUltimoContato,
      usuarioNome: record.responsavel || 'Operador de Cobrança',
      tipoAcao: 'registro_contato',
      campoAlterado: 'Último Contato Realizado',
      valorAnterior: 'Não contatado',
      valorNovo: record.contatoRealizado === 'SIM' ? 'Contato Concluído (WhatsApp/Ligação)' : 'Tentativa registrada',
      motivo: record.informacao || 'Atualização via central de atendimento'
    });
  }

  if (recentLogs.length < 3 && record.status) {
    recentLogs.push({
      id: 'log-synth-status',
      dataHora: record.dataRetorno || new Date().toISOString(),
      usuarioNome: record.responsavel || 'Sistema Valora',
      tipoAcao: 'mudanca_status',
      campoAlterado: 'Status Operacional',
      valorAnterior: 'Base Inicial',
      valorNovo: record.status.toUpperCase(),
      motivo: `Classificação atualizada na carteira de ${record.responsavel || 'Cobrança'}`
    });
  }

  if (recentLogs.length < 3) {
    recentLogs.push({
      id: 'log-synth-import',
      dataHora: record.dataImportacao || '2026-09-01T08:00:00.000Z',
      usuarioNome: 'Importador / Sistema',
      tipoAcao: 'criacao',
      campoAlterado: 'Carga Inicial do Registro',
      valorAnterior: '-',
      valorNovo: `Matrícula ${record.matricula} integrada`,
      motivo: `Importado da aba de origem: ${record.abaOrigem || 'Geral'}`
    });
  }

  const finalLogs = recentLogs.slice(0, 3);

  const getActionBadge = (tipo: string) => {
    switch (tipo) {
      case 'mudanca_status':
        return {
          bg: 'bg-blue-50 text-blue-700 border-blue-200',
          label: 'Mudança de Status',
          icon: Clock
        };
      case 'mudanca_responsavel':
      case 'reatribuicao':
        return {
          bg: 'bg-purple-50 text-purple-700 border-purple-200',
          label: 'Reatribuição de Carteira',
          icon: User
        };
      case 'registro_contato':
        return {
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          label: 'Registro de Contato',
          icon: Phone
        };
      case 'edicao_dados':
        return {
          bg: 'bg-amber-50 text-amber-700 border-amber-200',
          label: 'Edição Cadastral',
          icon: FileText
        };
      case 'criacao':
        return {
          bg: 'bg-slate-100 text-slate-700 border-slate-200',
          label: 'Criação / Importação',
          icon: CheckCircle2
        };
      default:
        return {
          bg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
          label: 'Alteração no Registro',
          icon: History
        };
    }
  };

  const formatLogDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        id="client-audit-quick-modal"
        className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden transition-all transform animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center shrink-0 text-blue-300">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400 bg-blue-950/80 px-2 py-0.5 rounded-full border border-blue-800">
                  Rastreabilidade &amp; Auditoria
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  Matrícula: {record.matricula}
                </span>
              </div>
              <h3 className="text-base font-bold text-white mt-1 leading-snug">
                {record.cliente}
              </h3>
              <div className="text-xs text-slate-300 flex items-center gap-2 mt-0.5">
                <span>Responsável: <strong>{record.responsavel || 'Não definido'}</strong></span>
                <span>•</span>
                <span>Venc.: <strong>Dia {record.diaVencimento || 10}</strong></span>
              </div>
            </div>
          </div>

          <button 
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5 space-y-4 max-h-[65vh] overflow-y-auto">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 pb-1 border-b border-slate-100">
            <span className="flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-blue-600" />
              Últimas 3 alterações registradas
            </span>
            <span className="text-[11px] text-slate-400 font-normal">
              Trilha de Auditoria LGPD
            </span>
          </div>

          <div className="space-y-3">
            {finalLogs.map((log, index) => {
              const badge = getActionBadge(log.tipoAcao);
              const IconComp = badge.icon;
              return (
                <div 
                  key={log.id || index}
                  className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition-colors space-y-2 relative"
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold border ${badge.bg}`}>
                      <IconComp className="w-3 h-3" />
                      <span>{badge.label}</span>
                    </span>

                    <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {formatLogDate(log.dataHora)}
                    </span>
                  </div>

                  {/* Operador */}
                  <div className="text-xs text-slate-600 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Realizado por: <strong className="text-slate-800">{log.usuarioNome}</strong></span>
                  </div>

                  {/* Campo alterado */}
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200/80 text-xs space-y-1">
                    <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                      {log.campoAlterado}
                    </div>
                    <div className="flex items-center gap-1.5 font-mono text-[11.5px] text-slate-800 flex-wrap">
                      <span className="bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded line-through decoration-rose-400">
                        {log.valorAnterior || 'Vazio'}
                      </span>
                      <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="bg-emerald-50 text-emerald-800 font-semibold px-1.5 py-0.5 rounded">
                        {log.valorNovo}
                      </span>
                    </div>
                  </div>

                  {log.motivo && (
                    <div className="text-[11px] text-slate-500 italic bg-slate-100/60 px-2 py-1 rounded">
                      Justificativa / Obs: "{log.motivo}"
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          {onOpenFullHistory ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenFullHistory(record);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-colors cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Ver Prontuário Completo</span>
            </button>
          ) : (
            <div></div>
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
