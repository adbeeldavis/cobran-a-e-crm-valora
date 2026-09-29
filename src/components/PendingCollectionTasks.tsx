import React, { useState, useMemo } from 'react';
import { 
  Clock, 
  AlertCircle, 
  Send, 
  CheckCircle2, 
  UserX, 
  Sparkles, 
  Filter, 
  ChevronRight,
  PhoneCall,
  Calendar,
  Layers,
  Search,
  History
} from 'lucide-react';
import { DebtRecord } from '../types';
import { calculateDaysWithoutContact, calculateDaysOverdue } from '../utils/sheetParser';

interface PendingCollectionTasksProps {
  records: DebtRecord[];
  onDirectWhatsApp?: (record: DebtRecord) => void;
  onDirectContact?: (record: DebtRecord) => void;
  onMarkContactedToday?: (id: string) => void;
  onMarkContacted?: (id: string) => void;
  onAnalyzeClientWithGemini?: (record: DebtRecord) => void;
  onAnalyzeRisk?: (record: DebtRecord) => void;
  onBulkNotify?: (records: DebtRecord[]) => void;
  onEditRecord?: (record: DebtRecord) => void;
  onOpenContactHistory?: (record: DebtRecord) => void;
}

export const PendingCollectionTasks: React.FC<PendingCollectionTasksProps> = ({
  records,
  onDirectWhatsApp,
  onDirectContact,
  onMarkContactedToday,
  onMarkContacted,
  onAnalyzeClientWithGemini,
  onAnalyzeRisk,
  onBulkNotify,
  onEditRecord,
  onOpenContactHistory,
}) => {
  const handleWhatsApp = onDirectWhatsApp || onDirectContact;
  const handleContacted = onMarkContactedToday || onMarkContacted;
  const handleRisk = onAnalyzeClientWithGemini || onAnalyzeRisk;
  const [selectedCollector, setSelectedCollector] = useState<string>('todos');
  const [minDaysFilter, setMinDaysFilter] = useState<number>(30);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  // Filter clients who have not received contact in > 30 days
  const pendingTasks = useMemo(() => {
    return records
      .map(r => {
        const contactInfo = calculateDaysWithoutContact(r);
        const overdueDays = calculateDaysOverdue(r.primeiroMesAtraso, r.diaVencimento);
        return {
          record: r,
          daysWithoutContact: contactInfo.days,
          isOver30Days: contactInfo.isOver30Days,
          contactLabel: contactInfo.label,
          overdueDays,
        };
      })
      .filter(item => {
        // Exclude accounts already fully settled
        if (item.record.status === 'pago') return false;

        // Must be >= minDaysFilter (default 30 days)
        if (item.daysWithoutContact < minDaysFilter) return false;

        // Collector filter
        if (selectedCollector !== 'todos' && item.record.responsavel !== selectedCollector) {
          return false;
        }

        // Search filter
        if (searchTerm.trim()) {
          const term = searchTerm.toLowerCase();
          const matchClient = (item.record.cliente || '').toLowerCase().includes(term);
          const matchMat = (item.record.matricula || '').toLowerCase().includes(term);
          const matchInfo = (item.record.informacao || '').toLowerCase().includes(term);
          if (!matchClient && !matchMat && !matchInfo) return false;
        }

        return true;
      })
      .sort((a, b) => b.daysWithoutContact - a.daysWithoutContact); // most urgent first
  }, [records, selectedCollector, minDaysFilter, searchTerm]);

  // Overall counts for badges
  const totalOver30 = useMemo(() => {
    return records.filter(r => r.status !== 'pago' && calculateDaysWithoutContact(r).days > 30).length;
  }, [records]);

  const totalOver60 = useMemo(() => {
    return records.filter(r => r.status !== 'pago' && calculateDaysWithoutContact(r).days > 60).length;
  }, [records]);

  return (
    <div id="pending-collection-tasks" className="bg-white rounded-xl border border-rose-200/80 shadow-xs overflow-hidden">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-rose-50 via-amber-50/40 to-white px-5 py-4 border-b border-rose-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-xs">
              <UserX className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  Tarefas de Cobrança Pendentes
                </h2>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                  {totalOver30} clientes sem contato há +30d
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Clientes em atraso sem acionamento recente. Priorize o contato para evitar perda da dívida.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onBulkNotify(pendingTasks.map(t => t.record))}
              disabled={pendingTasks.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-50 transition-colors shadow-2xs"
              title="Disparar notificações em lote para todos os pendentes filtrados"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Cobrança em Lote ({pendingTasks.length})</span>
            </button>

            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-white/80 border border-slate-200 transition-colors"
            >
              {isExpanded ? 'Recolher' : 'Expandir'}
            </button>
          </div>

        </div>

        {/* Filters Row */}
        {isExpanded && (
          <div className="mt-4 pt-3 border-t border-rose-100/60 flex flex-wrap items-center gap-2.5 text-xs">
            
            {/* Search input */}
            <div className="relative min-w-[200px] flex-1">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por cliente, matrícula..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
            </div>

            {/* Days threshold filter */}
            <div className="flex items-center bg-white rounded-lg border border-slate-200 p-0.5">
              <button
                onClick={() => setMinDaysFilter(30)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  minDaysFilter === 30 ? 'bg-rose-600 text-white font-bold' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                +30 dias ({totalOver30})
              </button>
              <button
                onClick={() => setMinDaysFilter(60)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  minDaysFilter === 60 ? 'bg-rose-600 text-white font-bold' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                +60 dias ({totalOver60})
              </button>
            </div>

            {/* Collector Filter */}
            <select
              value={selectedCollector}
              onChange={(e) => setSelectedCollector(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-rose-500"
            >
              <option value="todos">Todas as cobradoras</option>
              <option value="ROSANA">Rosana</option>
              <option value="ANA LUIZA">Ana Luiza</option>
              <option value="KEYLLA">Keylla</option>
            </select>

            <span className="text-slate-500 text-[11px] ml-auto">
              Exibindo <span className="font-bold text-slate-800">{pendingTasks.length}</span> tarefas
            </span>

          </div>
        )}

      </div>

      {/* Task Cards List */}
      {isExpanded && (
        <div className="divide-y divide-slate-100 max-h-[380px] overflow-y-auto">
          {pendingTasks.length > 0 ? (
            pendingTasks.map(({ record, daysWithoutContact, overdueDays }, index) => {
              const isCrit = daysWithoutContact > 90 || overdueDays > 180;
              const hasAiScore = Boolean(record.scoreRisco);

              return (
                <div 
                  key={`${record.id}-${index}`}
                  className="p-3.5 sm:px-5 hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  
                  {/* Left: Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[11px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                        {record.matricula}
                      </span>
                      <h4 
                        onClick={() => onOpenContactHistory ? onOpenContactHistory(record) : onEditRecord?.(record)}
                        className="text-xs sm:text-sm font-bold text-slate-900 truncate hover:text-emerald-700 hover:underline cursor-pointer" 
                        title={`Clique para abrir prontuário de atendimentos de ${record.cliente}`}
                      >
                        {record.cliente}
                      </h4>

                      {record.historicoContatos && record.historicoContatos.length > 0 && (
                        <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-100/70 px-1.5 py-0.5 rounded border border-emerald-300">
                          {record.historicoContatos.length} contato(s)
                        </span>
                      )}

                      {/* Days without contact badge */}
                      <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        isCrit 
                          ? 'bg-rose-100 text-rose-800 border border-rose-200' 
                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}>
                        <Clock className="w-3 h-3" />
                        {daysWithoutContact} dias sem contato
                      </span>

                      {/* AI Risk Score badge if calculated */}
                      {hasAiScore && (
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          record.scoreRisco?.nivelRisco === 'CRÍTICO' ? 'bg-rose-600 text-white' :
                          record.scoreRisco?.nivelRisco === 'ALTO' ? 'bg-orange-500 text-white' :
                          record.scoreRisco?.nivelRisco === 'MÉDIO' ? 'bg-amber-500 text-white' :
                          'bg-emerald-600 text-white'
                        }`}>
                          <Sparkles className="w-2.5 h-2.5" />
                          Risco {record.scoreRisco?.nivelRisco} ({record.scoreRisco?.score}/100)
                        </span>
                      )}

                      <span className="text-[11px] text-slate-500 font-medium">
                        Resp: <span className="font-semibold text-slate-700">{record.responsavel}</span>
                      </span>
                    </div>

                    {/* Subline: Delay info and spreadsheet note */}
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
                      <span>
                        Venc: <strong className="text-slate-800">Dia {record.diaVencimento}</strong> ({record.primeiroMesAtraso})
                      </span>
                      <span className="text-slate-300">•</span>
                      <span>
                        Atraso acumulado: <strong className="text-rose-600">{overdueDays} dias</strong>
                      </span>
                      <span className="text-slate-300">•</span>
                      <span>
                        Valor: <strong className="text-slate-800">R$ {(record.valorAcordo || record.valorOriginal || 120).toFixed(2)}</strong>
                      </span>
                      {record.informacao && (
                        <>
                          <span className="text-slate-300">•</span>
                          <span className="text-slate-500 italic truncate max-w-xs" title={record.informacao}>
                            "{record.informacao}"
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Right: Quick Actions */}
                  <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                    
                    {/* Atendimento & Histórico */}
                    <button
                      onClick={() => onOpenContactHistory ? onOpenContactHistory(record) : onEditRecord?.(record)}
                      className="p-1.5 sm:px-2 sm:py-1 rounded-lg text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 flex items-center gap-1 transition-colors cursor-pointer"
                      title="Registrar atendimento e ver histórico"
                    >
                      <History className="w-3.5 h-3.5 text-blue-600" />
                      <span className="hidden sm:inline">Histórico</span>
                    </button>

                    {/* Gemini AI Risk Analysis */}
                    {handleRisk && (
                      <button
                        onClick={() => handleRisk(record)}
                        className="p-1.5 sm:px-2 sm:py-1 rounded-lg text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 flex items-center gap-1 transition-colors cursor-pointer"
                        title="Calcular Score de Risco e Estratégia com IA Gemini"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                        <span className="hidden sm:inline">Score IA</span>
                      </button>
                    )}

                    {/* Mark contacted today */}
                    {handleContacted && (
                      <button
                        onClick={() => handleContacted(record.id)}
                        className="p-1.5 sm:px-2 sm:py-1 rounded-lg text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 flex items-center gap-1 transition-colors cursor-pointer"
                        title="Marcar que entrou em contato hoje"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="hidden sm:inline">Contatado Hoje</span>
                      </button>
                    )}

                    {/* Direct WhatsApp Call */}
                    {handleWhatsApp && (
                      <button
                        onClick={() => handleWhatsApp(record)}
                        className="p-1.5 sm:px-2.5 sm:py-1 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                        title="Cobrar agora via WhatsApp"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Cobrar</span>
                      </button>
                    )}

                  </div>

                </div>
              );
            })
          ) : (
            <div className="p-8 text-center text-slate-500">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-800">
                Nenhum cliente pendente com os filtros selecionados!
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Todos os devedores foram acionados recentemente ou regularizados.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Footer helper */}
      {isExpanded && pendingTasks.length > 0 && (
        <div className="bg-slate-50 px-5 py-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <span>
            💡 <strong>Dica operacional:</strong> Contatos via WhatsApp realizados nos dias 10 e 20 aumentam a taxa de resposta em 42%.
          </span>
          <span className="text-slate-400">
            Fila organizada por tempo de inatividade
          </span>
        </div>
      )}

    </div>
  );
};
