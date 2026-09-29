import React, { useState, useMemo } from 'react';
import { 
  CheckSquare, 
  Square, 
  Clock, 
  Phone, 
  MessageSquare, 
  Handshake, 
  DollarSign, 
  AlertTriangle, 
  Calendar, 
  UserCheck, 
  CheckCircle2, 
  ArrowRight,
  Filter
} from 'lucide-react';
import { DebtRecord, AppUser } from '../types';

interface MinhaRotinaViewProps {
  records: DebtRecord[];
  currentUser: AppUser;
  onOpenContactHistory: (record: DebtRecord) => void;
  onOpenNegociacao: (record: DebtRecord) => void;
  onOpenPagamento: (record: DebtRecord) => void;
  onDirectWhatsApp: (record: DebtRecord) => void;
  onToggleTaskComplete: (recordId: string, currentStatus: boolean) => void;
}

export const MinhaRotinaView: React.FC<MinhaRotinaViewProps> = ({
  records,
  currentUser,
  onOpenContactHistory,
  onOpenNegociacao,
  onOpenPagamento,
  onDirectWhatsApp,
  onToggleTaskComplete,
}) => {
  const [selectedAgent, setSelectedAgent] = useState<string>(() => {
    if (currentUser.role === 'cobranca' || currentUser.role === 'operador') {
      return (currentUser.responsavelAssociado || 'ROSANA').toUpperCase();
    }
    return 'TODOS';
  });

  const [routineFilter, setRoutineFilter] = useState<'todas' | 'pendentes' | 'concluidas'>('pendentes');

  // Filter records by agent
  const agentRecords = useMemo(() => {
    if (selectedAgent === 'TODOS') {
      return records;
    }
    return records.filter(r => (r.responsavel || '').toUpperCase().includes(selectedAgent));
  }, [records, selectedAgent]);

  // Classify daily routine tasks
  const routineTasks = useMemo(() => {
    const contatar: DebtRecord[] = [];
    const retornos: DebtRecord[] = [];
    const promessas: DebtRecord[] = [];
    const atrasadas: DebtRecord[] = [];

    agentRecords.forEach(r => {
      // Exclude already settled
      if (r.status === 'pago' || r.status === 'recuperado') return;

      const days = r.diasAtraso || 0;
      if (r.status === 'pagamento_prometido') {
        promessas.push(r);
      } else if (r.status === 'aguardando_retorno' || r.status === 'em_negociacao') {
        retornos.push(r);
      } else if (days >= 45 && r.contatoRealizado !== 'SIM') {
        atrasadas.push(r);
      } else {
        contatar.push(r);
      }
    });

    return { contatar, retornos, promessas, atrasadas };
  }, [agentRecords]);

  const allAgentTasks = useMemo(() => {
    let list = [
      ...routineTasks.promessas,
      ...routineTasks.retornos,
      ...routineTasks.atrasadas,
      ...routineTasks.contatar
    ];

    if (routineFilter === 'pendentes') {
      list = list.filter(r => !r.acaoConcluida);
    } else if (routineFilter === 'concluidas') {
      list = list.filter(r => r.acaoConcluida);
    }

    return list;
  }, [routineTasks, routineFilter]);

  const completedCount = agentRecords.filter(r => r.acaoConcluida).length;
  const pendingCount = agentRecords.filter(r => !r.acaoConcluida && r.status !== 'pago' && r.status !== 'recuperado').length;
  const totalRoutine = completedCount + pendingCount;
  const progressPercent = totalRoutine > 0 ? Math.round((completedCount / totalRoutine) * 100) : 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Header Section */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase">
                Painel do Operador
              </span>
              <span className="text-xs text-slate-500 font-mono">Quinta-feira, 17/09/2026</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
              MINHA ROTINA DIÁRIA DE COBRANÇA
            </h2>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              Checklist operacional e fila diária de execução. Complete as etapas diárias marcando os itens à medida que contata os clientes.
            </p>
          </div>

          {/* Agent Selector (if Adm / Coord) */}
          <div className="flex items-center gap-3">
            {currentUser.role !== 'cobranca' && currentUser.role !== 'operador' && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-medium">Operadora:</span>
                <select
                  value={selectedAgent}
                  onChange={(e) => setSelectedAgent(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="TODOS">Todas as Carteiras</option>
                  <option value="ANA LUIZA">Ana Luiza</option>
                  <option value="ROSANA">Rosana</option>
                  <option value="KEYLLA">Keylla</option>
                  <option value="FABIOLA">Fabiola</option>
                </select>
              </div>
            )}

            {/* Quick Completion Progress */}
            <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl min-w-[170px]">
              <div className="flex justify-between items-center text-xs font-bold text-slate-700 mb-1">
                <span>Progresso do Dia:</span>
                <span className="text-emerald-600 font-mono">{progressPercent}%</span>
              </div>
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block text-right font-medium">
                {completedCount} concluídas de {totalRoutine} tarefas
              </span>
            </div>
          </div>
        </div>

        {/* 4 Task Category KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-100">
          <div className="p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-200/80">
            <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wide flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
              <span>Promessas a Confirmar</span>
            </span>
            <p className="text-2xl font-bold font-mono text-emerald-950 mt-1">
              {routineTasks.promessas.length}
            </p>
            <p className="text-[10px] text-emerald-700 mt-0.5">Pagamento agendado para hoje</p>
          </div>

          <div className="p-3.5 bg-yellow-50/60 rounded-xl border border-yellow-200/80">
            <span className="text-[11px] font-bold text-yellow-800 uppercase tracking-wide flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-yellow-600" />
              <span>Retornos Agendados</span>
            </span>
            <p className="text-2xl font-bold font-mono text-yellow-950 mt-1">
              {routineTasks.retornos.length}
            </p>
            <p className="text-[10px] text-yellow-700 mt-0.5">Aguardando resposta do cliente</p>
          </div>

          <div className="p-3.5 bg-rose-50/60 rounded-xl border border-rose-200/80">
            <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wide flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
              <span>Ações Atrasadas</span>
            </span>
            <p className="text-2xl font-bold font-mono text-rose-950 mt-1">
              {routineTasks.atrasadas.length}
            </p>
            <p className="text-[10px] text-rose-700 mt-0.5">+45 dias sem contato</p>
          </div>

          <div className="p-3.5 bg-indigo-50/60 rounded-xl border border-indigo-200/80">
            <span className="text-[11px] font-bold text-indigo-800 uppercase tracking-wide flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-indigo-600" />
              <span>Novos Contatos</span>
            </span>
            <p className="text-2xl font-bold font-mono text-indigo-950 mt-1">
              {routineTasks.contatar.length}
            </p>
            <p className="text-[10px] text-indigo-700 mt-0.5">Cobranças ativas da fila</p>
          </div>
        </div>
      </div>

      {/* Routine Filter Selector */}
      <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-slate-200">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setRoutineFilter('pendentes')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              routineFilter === 'pendentes'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Pendentes ({pendingCount})
          </button>
          <button
            type="button"
            onClick={() => setRoutineFilter('concluidas')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              routineFilter === 'concluidas'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Concluídas ({completedCount})
          </button>
          <button
            type="button"
            onClick={() => setRoutineFilter('todas')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              routineFilter === 'todas'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Todas ({totalRoutine})
          </button>
        </div>

        <span className="text-xs text-slate-400 font-medium hidden sm:inline">
          Clique na caixa de seleção ☐ para marcar a ação como realizada hoje.
        </span>
      </div>

      {/* Interactive Checklist Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="divide-y divide-slate-100">
          {allAgentTasks.length === 0 ? (
            <div className="p-12 text-center text-slate-400 space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
              <p className="text-xs font-bold text-slate-700">Todas as tarefas desta lista estão em dia!</p>
            </div>
          ) : (
            allAgentTasks.map((rec) => {
              const isChecked = Boolean(rec.acaoConcluida);
              const days = rec.diasAtraso || 0;
              const valor = rec.valorEmAberto || rec.valorOriginal || 120;

              return (
                <div 
                  key={rec.id}
                  className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                    isChecked ? 'bg-emerald-50/20 opacity-75' : 'hover:bg-slate-50'
                  }`}
                >
                  {/* Left: Checkbox + Customer + Task info */}
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() => onToggleTaskComplete(rec.id, isChecked)}
                      className="mt-0.5 text-slate-400 hover:text-emerald-600 transition-colors cursor-pointer"
                      title={isChecked ? 'Desmarcar tarefa' : 'Marcar como concluída'}
                    >
                      {isChecked ? (
                        <CheckSquare className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <Square className="w-5 h-5 text-slate-300" />
                      )}
                    </button>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`font-bold text-sm text-slate-900 ${isChecked ? 'line-through text-slate-500' : ''}`}>
                          {rec.cliente}
                        </span>
                        <span className="text-xs font-mono font-bold text-slate-500">#{rec.matricula}</span>
                        
                        <span className={`px-2 py-0.2 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          rec.status === 'pagamento_prometido'
                            ? 'bg-emerald-100 text-emerald-800'
                            : rec.status === 'em_negociacao'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {rec.status === 'pagamento_prometido' ? 'Promessa' : rec.status === 'em_negociacao' ? 'Negociação' : 'Cobrança'}
                        </span>
                      </div>

                      <p className="text-xs font-medium text-slate-600 mt-0.5">
                        <strong>Tarefa:</strong> {rec.proximaAcao || 'Realizar contato ativo e cobrar retorno'}
                      </p>

                      <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1">
                        <span>Atraso: <strong className="text-rose-600">{days} dias</strong></span>
                        <span>•</span>
                        <span>Em aberto: <strong className="text-slate-700 font-mono">R$ {valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></span>
                        <span>•</span>
                        <span>Responsável: <strong className="text-slate-700">{rec.responsavel}</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Direct 1-Click Operations */}
                  <div className="flex items-center gap-2 sm:self-center shrink-0 pl-8 sm:pl-0">
                    <button
                      type="button"
                      onClick={() => onOpenContactHistory(rec)}
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Registrar Contato</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onOpenNegociacao(rec)}
                      className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Handshake className="w-3.5 h-3.5 text-blue-600" />
                      <span>Negociar</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onOpenPagamento(rec)}
                      className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                    >
                      <DollarSign className="w-3.5 h-3.5 text-emerald-200" />
                      <span>Dar Baixa</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

    </div>
  );
};
