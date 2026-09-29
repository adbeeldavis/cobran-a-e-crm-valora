import React, { useState, useMemo } from 'react';
import { 
  AlertCircle, 
  Clock, 
  MessageSquare, 
  DollarSign, 
  Handshake, 
  CheckCircle2, 
  Calendar, 
  Search, 
  Filter, 
  ArrowUpRight, 
  User, 
  Phone,
  Flame,
  AlertTriangle,
  Send,
  Eye,
  Check
} from 'lucide-react';
import { DebtRecord, AppUser } from '../types';

interface CobrancasDeHojeViewProps {
  records: DebtRecord[];
  currentUser: AppUser;
  onOpenContactHistory: (record: DebtRecord) => void;
  onOpenNegociacao: (record: DebtRecord) => void;
  onOpenPagamento: (record: DebtRecord) => void;
  onDirectWhatsApp: (record: DebtRecord) => void;
  onMarkActionDone: (recordId: string) => void;
}

export const CobrancasDeHojeView: React.FC<CobrancasDeHojeViewProps> = ({
  records,
  currentUser,
  onOpenContactHistory,
  onOpenNegociacao,
  onOpenPagamento,
  onDirectWhatsApp,
  onMarkActionDone
}) => {
  const [selectedPrioridade, setSelectedPrioridade] = useState<string>('todos');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedResp, setSelectedResp] = useState<string>('todos');

  // Filter actions for today or pending
  const todayRecords = useMemo(() => {
    return records.filter(r => {
      // Exclude already paid
      if (r.status === 'pago' || r.status === 'recuperado') return false;

      // Filter by responsible if user is operator
      if (currentUser.role === 'cobranca' || currentUser.role === 'operador') {
        const userResp = (currentUser.responsavelAssociado || '').toUpperCase();
        if (userResp && !(r.responsavel || '').toUpperCase().includes(userResp)) {
          return false;
        }
      }

      return true;
    });
  }, [records, currentUser]);

  // Group by priority
  const categorized = useMemo(() => {
    const urgente: DebtRecord[] = [];
    const prioridade: DebtRecord[] = [];
    const aguardando: DebtRecord[] = [];
    const negociacao: DebtRecord[] = [];
    const prometido: DebtRecord[] = [];

    todayRecords.forEach(r => {
      const days = r.diasAtraso || 0;
      const val = r.valorEmAberto || r.valorOriginal || 0;

      if (r.status === 'pagamento_prometido') {
        prometido.push(r);
      } else if (r.status === 'em_negociacao' || r.status === 'acordo_em_andamento') {
        negociacao.push(r);
      } else if (r.status === 'aguardando_retorno') {
        aguardando.push(r);
      } else if (days >= 60 || val >= 300) {
        urgente.push(r);
      } else {
        prioridade.push(r);
      }
    });

    return { urgente, prioridade, aguardando, negociacao, prometido };
  }, [todayRecords]);

  // Filtered list according to tab & search
  const filteredList = useMemo(() => {
    let list = todayRecords;

    if (selectedPrioridade === 'urgente') list = categorized.urgente;
    else if (selectedPrioridade === 'prioridade') list = categorized.prioridade;
    else if (selectedPrioridade === 'aguardando') list = categorized.aguardando;
    else if (selectedPrioridade === 'negociacao') list = categorized.negociacao;
    else if (selectedPrioridade === 'prometido') list = categorized.prometido;

    if (selectedResp !== 'todos') {
      list = list.filter(r => (r.responsavel || '').toUpperCase().includes(selectedResp.toUpperCase()));
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(r => 
        (r.cliente || '').toLowerCase().includes(q) ||
        (r.matricula || '').toLowerCase().includes(q) ||
        (r.telefone ? r.telefone.includes(q) : false) ||
        (r.cpf ? r.cpf.includes(q) : false)
      );
    }

    return list;
  }, [todayRecords, categorized, selectedPrioridade, selectedResp, searchTerm]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-2xl border border-slate-800 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-400 text-slate-950 uppercase tracking-wide">
                Central de Ações do Dia
              </span>
              <span className="text-xs text-indigo-300 font-mono">17 de Setembro de 2026</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <span>COBRANÇAS DE HOJE</span>
              <span className="text-sm font-normal text-slate-400 font-sans">
                ({filteredList.length} clientes na fila prioritária)
              </span>
            </h2>
            <p className="text-xs text-indigo-200 max-w-2xl leading-relaxed">
              Clientes organizados por urgência e impacto de recuperação. Realize o contato imediato, registre o acordo ou dê baixa no pagamento direto pelo card.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="bg-slate-800/80 border border-slate-700 p-3 rounded-xl text-center min-w-[110px]">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Total em Aberto</span>
              <span className="text-lg font-bold text-rose-400 font-mono">
                R$ {filteredList.reduce((acc, r) => acc + (r.valorEmAberto || r.valorOriginal || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* Priority Filter Chips */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-6 mt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={() => setSelectedPrioridade('todos')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all text-left flex items-center justify-between cursor-pointer ${
              selectedPrioridade === 'todos'
                ? 'bg-white text-slate-950 shadow-sm'
                : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <span>Todas as Ações</span>
            <span className="text-[11px] font-mono px-1.5 py-0.2 rounded bg-slate-900/40 text-current font-bold">
              {todayRecords.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedPrioridade('urgente')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all text-left flex items-center justify-between cursor-pointer border ${
              selectedPrioridade === 'urgente'
                ? 'bg-rose-600 text-white border-rose-500 shadow-sm'
                : 'bg-rose-950/30 text-rose-300 border-rose-900/50 hover:bg-rose-950/50'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-rose-400" />
              <span>🔴 Urgente</span>
            </span>
            <span className="text-[11px] font-mono font-bold">
              {categorized.urgente.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedPrioridade('prioridade')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all text-left flex items-center justify-between cursor-pointer border ${
              selectedPrioridade === 'prioridade'
                ? 'bg-amber-600 text-white border-amber-500 shadow-sm'
                : 'bg-amber-950/30 text-amber-300 border-amber-900/50 hover:bg-amber-950/50'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span>🟠 Prioridade</span>
            </span>
            <span className="text-[11px] font-mono font-bold">
              {categorized.prioridade.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedPrioridade('aguardando')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all text-left flex items-center justify-between cursor-pointer border ${
              selectedPrioridade === 'aguardando'
                ? 'bg-yellow-500 text-slate-950 border-yellow-400 shadow-sm'
                : 'bg-yellow-950/30 text-yellow-300 border-yellow-900/50 hover:bg-yellow-950/50'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-yellow-400" />
              <span>🟡 Aguardando</span>
            </span>
            <span className="text-[11px] font-mono font-bold">
              {categorized.aguardando.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedPrioridade('negociacao')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all text-left flex items-center justify-between cursor-pointer border ${
              selectedPrioridade === 'negociacao'
                ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                : 'bg-blue-950/30 text-blue-300 border-blue-900/50 hover:bg-blue-950/50'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Handshake className="w-3.5 h-3.5 text-blue-400" />
              <span>🔵 Negociação</span>
            </span>
            <span className="text-[11px] font-mono font-bold">
              {categorized.negociacao.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedPrioridade('prometido')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all text-left flex items-center justify-between cursor-pointer border ${
              selectedPrioridade === 'prometido'
                ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                : 'bg-emerald-950/30 text-emerald-300 border-emerald-900/50 hover:bg-emerald-950/50'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
              <span>🟢 Prometido</span>
            </span>
            <span className="text-[11px] font-mono font-bold">
              {categorized.prometido.length}
            </span>
          </button>
        </div>
      </div>

      {/* Quick Search & Agent Filter Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nome, matrícula, CPF ou telefone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <span className="text-xs text-slate-500 font-medium">Cobradora:</span>
          <select
            value={selectedResp}
            onChange={(e) => setSelectedResp(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="todos">Todas as Cobradoras</option>
            <option value="ANA LUIZA">Ana Luiza</option>
            <option value="ROSANA">Rosana</option>
            <option value="KEYLLA">Keylla</option>
            <option value="FABIOLA">Fabiola</option>
          </select>
        </div>
      </div>

      {/* Action-Oriented Cards Grid */}
      {filteredList.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-slate-200 shadow-2xs space-y-3">
          <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">Nenhuma cobrança pendente nesta categoria para hoje</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Todas as ações programadas para o filtro selecionado foram concluídas ou não há clientes nesta fila no momento.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredList.map((rec) => {
            const days = rec.diasAtraso || 0;
            const valor = rec.valorEmAberto || rec.valorOriginal || 120;
            const isDone = rec.acaoConcluida;

            return (
              <div
                key={rec.id}
                className={`bg-white rounded-xl border transition-all hover:shadow-md flex flex-col justify-between overflow-hidden ${
                  isDone 
                    ? 'border-emerald-200 bg-emerald-50/20 opacity-80' 
                    : rec.status === 'pagamento_prometido'
                    ? 'border-emerald-300 ring-1 ring-emerald-200'
                    : days >= 60 || valor >= 300
                    ? 'border-rose-200'
                    : 'border-slate-200'
                }`}
              >
                {/* Card Header with Status Tag & Overdue */}
                <div className="p-4 border-b border-slate-100 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      rec.status === 'pagamento_prometido'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : rec.status === 'em_negociacao' || rec.status === 'acordo_em_andamento'
                        ? 'bg-blue-100 text-blue-800 border border-blue-300'
                        : rec.status === 'aguardando_retorno'
                        ? 'bg-yellow-100 text-yellow-800 border border-yellow-300'
                        : days >= 60
                        ? 'bg-rose-100 text-rose-800 border border-rose-300'
                        : 'bg-amber-100 text-amber-800 border border-amber-300'
                    }`}>
                      {rec.status === 'pagamento_prometido' && '🟢 Prometeu Pagamento'}
                      {rec.status === 'em_negociacao' && '🔵 Em Negociação'}
                      {rec.status === 'acordo_em_andamento' && '🔵 Acordo em Andamento'}
                      {rec.status === 'aguardando_retorno' && '🟡 Aguardando Retorno'}
                      {rec.status === 'contato_a_realizar' && '🟠 Contato a Realizar'}
                      {rec.status === 'sem_retorno' && '⚪ Sem Retorno'}
                      {rec.status === 'inadimplencia_recorrente' && '🔴 Inadimplência Recorrente'}
                      {rec.status === 'em_atraso' && '🔴 Em Atraso'}
                    </span>

                    <span className="text-[11px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100">
                      {days} dias de atraso
                    </span>
                  </div>

                  {/* Customer Identity */}
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm hover:text-indigo-600 transition-colors flex items-center justify-between">
                      <span className="truncate">{rec.cliente}</span>
                    </h3>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                      <span className="font-mono font-bold text-slate-700">#{rec.matricula}</span>
                      <span>•</span>
                      <span>{rec.planoContratado || 'Cartão Todos Saúde'}</span>
                    </div>
                  </div>
                </div>

                {/* Card Financial Details & Next Action */}
                <div className="p-4 space-y-3 bg-slate-50/40 text-xs">
                  <div className="flex items-center justify-between bg-white p-2 rounded-lg border border-slate-200/80">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Valor em Atraso:</span>
                      <span className="font-mono font-bold text-rose-700 text-sm">
                        R$ {valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Responsável:</span>
                      <span className="font-bold text-indigo-950 text-xs">
                        {rec.responsavel}
                      </span>
                    </div>
                  </div>

                  {/* Next Scheduled Action Box */}
                  <div className="p-2.5 rounded-lg bg-indigo-50/80 border border-indigo-200 text-indigo-950 space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-bold text-indigo-800 uppercase tracking-wider">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-indigo-600" />
                        <span>Próxima Ação:</span>
                      </span>
                      <span className="bg-indigo-200/60 px-1.5 py-0.2 rounded font-mono">
                        HOJE ({rec.dataProximaAcao || '17/09'})
                      </span>
                    </div>
                    <p className="font-semibold text-xs leading-snug">
                      {rec.proximaAcao || 'Realizar contato ativo e cobrar regularização'}
                    </p>
                  </div>

                  {/* Last Note / Contact Context */}
                  {rec.informacao && (
                    <p className="text-[11px] text-slate-500 italic line-clamp-2">
                      "{rec.informacao}"
                    </p>
                  )}
                </div>

                {/* Action Buttons: [REGISTRAR CONTATO] [NEGOCIAR] [REGISTRAR PAGAMENTO] */}
                <div className="p-3 border-t border-slate-100 bg-white grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => onOpenContactHistory(rec)}
                    className="px-2 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-lg text-[11px] flex items-center justify-center gap-1 transition-colors cursor-pointer"
                    title="Registrar contato e abrir linha do tempo"
                  >
                    <MessageSquare className="w-3 h-3 text-indigo-600 shrink-0" />
                    <span className="truncate">Contato</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onOpenNegociacao(rec)}
                    className="px-2 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 font-bold rounded-lg text-[11px] flex items-center justify-center gap-1 transition-colors cursor-pointer"
                    title="Módulo de negociação e parcelamento"
                  >
                    <Handshake className="w-3 h-3 text-blue-600 shrink-0" />
                    <span className="truncate">Negociar</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onOpenPagamento(rec)}
                    className="px-2 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[11px] flex items-center justify-center gap-1 transition-colors cursor-pointer shadow-2xs"
                    title="Registrar pagamento ou baixa"
                  >
                    <DollarSign className="w-3 h-3 text-emerald-200 shrink-0" />
                    <span className="truncate">Pagar</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
