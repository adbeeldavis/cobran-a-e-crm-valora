import React, { useState, useMemo } from 'react';
import { 
  Handshake, 
  Search, 
  Filter, 
  Plus, 
  DollarSign, 
  Calendar, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  XCircle, 
  FileText,
  Percent,
  UserCheck
} from 'lucide-react';
import { DebtRecord, NegociacaoRecord, AppUser } from '../types';

interface NegociacoesViewProps {
  records: DebtRecord[];
  currentUser: AppUser;
  onOpenNovaNegociacao: (record?: DebtRecord) => void;
  onUpdateNegociacaoStatus: (recordId: string, negociacaoId: string, newStatus: NegociacaoRecord['status']) => void;
  onOpenContactHistory: (record: DebtRecord) => void;
}

export const NegociacoesView: React.FC<NegociacoesViewProps> = ({
  records,
  currentUser,
  onOpenNovaNegociacao,
  onUpdateNegociacaoStatus,
  onOpenContactHistory
}) => {
  const [selectedStatus, setSelectedStatus] = useState<string>('todos');
  const [selectedResp, setSelectedResp] = useState<string>('todos');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Collect all negotiations across records
  const allNegociacoes = useMemo(() => {
    const list: { record: DebtRecord; neg: NegociacaoRecord }[] = [];
    records.forEach(r => {
      if (r.historicoNegociacoes && r.historicoNegociacoes.length > 0) {
        r.historicoNegociacoes.forEach(n => {
          list.push({ record: r, neg: n });
        });
      } else if (r.status === 'em_negociacao' || r.status === 'acordo_em_andamento') {
        // synthesize initial entry if not yet saved
        const valOriginal = r.valorOriginal || 120;
        const valNeg = r.valorAcordo || Math.round(valOriginal * 0.85);
        list.push({
          record: r,
          neg: {
            id: `neg-${r.id}`,
            clienteId: r.id,
            matricula: r.matricula,
            clienteNome: r.cliente,
            dataCriacao: '2026-09-15',
            valorOriginal: valOriginal,
            descontoConcedido: 15,
            valorNegociado: valNeg,
            numeroParcelas: 2,
            valorParcela: Math.round(valNeg / 2),
            dataPrimeiroPagamento: '2026-09-20',
            dataFinal: '2026-10-20',
            responsavel: r.responsavel,
            observacoes: r.informacao || 'Acordo em andamento via WhatsApp',
            status: r.status === 'acordo_em_andamento' ? 'acordo_realizado' : 'negociacao_iniciada'
          }
        });
      }
    });
    return list;
  }, [records]);

  // Filtered list
  const filteredNegociacoes = useMemo(() => {
    return allNegociacoes.filter(({ record, neg }) => {
      if (selectedStatus !== 'todos' && neg.status !== selectedStatus) {
        return false;
      }
      if (selectedResp !== 'todos' && !(neg.responsavel || '').toUpperCase().includes(selectedResp.toUpperCase())) {
        return false;
      }
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        return (
          neg.clienteNome.toLowerCase().includes(q) ||
          neg.matricula.toLowerCase().includes(q) ||
          (neg.observacoes && neg.observacoes.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [allNegociacoes, selectedStatus, selectedResp, searchTerm]);

  // Financial summary of agreements
  const totalNegociado = useMemo(() => {
    return allNegociacoes.reduce((acc, curr) => acc + curr.neg.valorNegociado, 0);
  }, [allNegociacoes]);

  const totalOriginal = useMemo(() => {
    return allNegociacoes.reduce((acc, curr) => acc + curr.neg.valorOriginal, 0);
  }, [allNegociacoes]);

  const acordosConcluidos = allNegociacoes.filter(n => n.neg.status === 'acordo_concluido' || n.neg.status === 'acordo_realizado').length;
  const acordosQuebrados = allNegociacoes.filter(n => n.neg.status === 'acordo_quebrado').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-900 border border-blue-200 uppercase">
              Módulo de Acordos & Conciliação
            </span>
            <span className="text-xs text-slate-500 font-mono">{filteredNegociacoes.length} negociações</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
            NEGOCIAÇÕES & ACORDOS FECHADOS
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Simulador e acompanhamento de propostas, descontos autorizados, prazos de parcelamento e confirmação de acordos.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onOpenNovaNegociacao()}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition-all shadow-xs cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>+ NOVA NEGOCIAÇÃO</span>
        </button>
      </div>

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Negociado</span>
          <span className="text-xl font-bold font-mono text-slate-900 mt-1 block">
            R$ {totalNegociado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
          <span className="text-[11px] text-slate-500">De R$ {totalOriginal.toLocaleString('pt-BR')} original</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-emerald-600 uppercase block">Acordos Ativos / Realizados</span>
          <span className="text-xl font-bold font-mono text-emerald-700 mt-1 block">
            {acordosConcluidos}
          </span>
          <span className="text-[11px] text-emerald-600">Em dia ou quitados</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-rose-600 uppercase block">Acordos Quebrados</span>
          <span className="text-xl font-bold font-mono text-rose-700 mt-1 block">
            {acordosQuebrados}
          </span>
          <span className="text-[11px] text-rose-600">Necessitam renegociação</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-blue-600 uppercase block">Desconto Médio</span>
          <span className="text-xl font-bold font-mono text-blue-700 mt-1 block">
            {totalOriginal > 0 ? Math.round(((totalOriginal - totalNegociado) / totalOriginal) * 100) : 15}%
          </span>
          <span className="text-[11px] text-slate-500">Política de incentivo PIX</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por cliente, matrícula..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="todos">Todos os Status de Acordo</option>
            <option value="negociacao_iniciada">Negociação iniciada</option>
            <option value="aguardando_confirmacao">Aguardando confirmação</option>
            <option value="acordo_realizado">Acordo realizado</option>
            <option value="pagamento_parcial">Pagamento parcial</option>
            <option value="acordo_concluido">Acordo concluído</option>
            <option value="acordo_quebrado">Acordo quebrado</option>
          </select>

          <select
            value={selectedResp}
            onChange={(e) => setSelectedResp(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="todos">Todas as Cobradoras</option>
            <option value="ANA LUIZA">Ana Luiza</option>
            <option value="ROSANA">Rosana</option>
            <option value="KEYLLA">Keylla</option>
            <option value="FABIOLA">Fabiola</option>
          </select>
        </div>
      </div>

      {/* Negotiations List */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                <th className="p-3">Cliente / Matrícula</th>
                <th className="p-3">Valor Original</th>
                <th className="p-3">Desconto (%)</th>
                <th className="p-3">Valor Negociado</th>
                <th className="p-3">Parcelas</th>
                <th className="p-3">1º Pagamento</th>
                <th className="p-3">Responsável</th>
                <th className="p-3">Status do Acordo</th>
                <th className="p-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredNegociacoes.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400">
                    Nenhuma negociação encontrada com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredNegociacoes.map(({ record, neg }) => {
                  return (
                    <tr key={neg.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3">
                        <button
                          type="button"
                          onClick={() => onOpenContactHistory(record)}
                          className="font-bold text-slate-900 hover:text-blue-600 transition-colors text-left"
                        >
                          {neg.clienteNome}
                        </button>
                        <div className="text-[11px] font-mono text-slate-400">#{neg.matricula}</div>
                      </td>

                      <td className="p-3 font-mono text-slate-500">
                        R$ {neg.valorOriginal.toFixed(2)}
                      </td>

                      <td className="p-3">
                        <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                          {neg.descontoConcedido}% OFF
                        </span>
                      </td>

                      <td className="p-3 font-mono font-bold text-blue-700">
                        R$ {neg.valorNegociado.toFixed(2)}
                      </td>

                      <td className="p-3">
                        {neg.numeroParcelas}x de R$ {neg.valorParcela.toFixed(2)}
                      </td>

                      <td className="p-3 font-mono text-slate-700">
                        {neg.dataPrimeiroPagamento}
                      </td>

                      <td className="p-3">
                        <span className="bg-slate-100 px-2 py-0.5 rounded font-semibold text-slate-800 text-[11px]">
                          {neg.responsavel}
                        </span>
                      </td>

                      <td className="p-3">
                        <select
                          value={neg.status}
                          onChange={(e) => onUpdateNegociacaoStatus(record.id, neg.id, e.target.value as NegociacaoRecord['status'])}
                          className={`px-2 py-1 rounded text-[11px] font-bold uppercase tracking-wider border cursor-pointer ${
                            neg.status === 'acordo_concluido' || neg.status === 'acordo_realizado'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : neg.status === 'acordo_quebrado'
                              ? 'bg-rose-50 text-rose-800 border-rose-300'
                              : neg.status === 'pagamento_parcial'
                              ? 'bg-yellow-50 text-yellow-800 border-yellow-300'
                              : 'bg-blue-50 text-blue-800 border-blue-300'
                          }`}
                        >
                          <option value="negociacao_iniciada">Negociação iniciada</option>
                          <option value="aguardando_confirmacao">Aguardando confirmação</option>
                          <option value="acordo_realizado">Acordo realizado</option>
                          <option value="pagamento_parcial">Pagamento parcial</option>
                          <option value="acordo_concluido">Acordo concluído</option>
                          <option value="acordo_quebrado">Acordo quebrado</option>
                        </select>
                      </td>

                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => onOpenContactHistory(record)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded text-xs transition-colors cursor-pointer"
                        >
                          Dossiê
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
