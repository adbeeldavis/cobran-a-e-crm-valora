import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  Plus, 
  CreditCard, 
  Phone, 
  Mail, 
  Calendar, 
  DollarSign, 
  AlertCircle, 
  ArrowUpDown,
  FileText,
  Clock,
  Eye,
  Edit2
} from 'lucide-react';
import { DebtRecord, AppUser } from '../types';

interface ClientesViewProps {
  records: DebtRecord[];
  currentUser: AppUser;
  onOpenNewRecord: () => void;
  onEditRecord: (record: DebtRecord) => void;
  onOpenContactHistory: (record: DebtRecord) => void;
  onOpenNegociacao: (record: DebtRecord) => void;
  onOpenPagamento: (record: DebtRecord) => void;
}

export const ClientesView: React.FC<ClientesViewProps> = ({
  records,
  currentUser,
  onOpenNewRecord,
  onEditRecord,
  onOpenContactHistory,
  onOpenNegociacao,
  onOpenPagamento
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedResp, setSelectedResp] = useState('todos');
  const [selectedPlan, setSelectedPlan] = useState('todos');
  const [selectedAging, setSelectedAging] = useState('todos');
  const [selectedRecordForDetail, setSelectedRecordForDetail] = useState<DebtRecord | null>(null);

  // Filter clients
  const filteredClients = useMemo(() => {
    return records.filter(r => {
      // Role check
      if (currentUser.role === 'cobranca' || currentUser.role === 'operador') {
        const userResp = (currentUser.responsavelAssociado || '').toUpperCase();
        if (userResp && !(r.responsavel || '').toUpperCase().includes(userResp)) {
          return false;
        }
      }

      if (selectedResp !== 'todos' && !(r.responsavel || '').toUpperCase().includes(selectedResp.toUpperCase())) {
        return false;
      }

      if (selectedPlan !== 'todos' && !(r.planoContratado || '').toLowerCase().includes(selectedPlan.toLowerCase())) {
        return false;
      }

      const days = r.diasAtraso || 0;
      if (selectedAging === 'ate30' && days > 30) return false;
      if (selectedAging === '31a60' && (days <= 30 || days > 60)) return false;
      if (selectedAging === '61a90' && (days <= 60 || days > 90)) return false;
      if (selectedAging === 'mais90' && days <= 90) return false;

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        return (
          (r.cliente || '').toLowerCase().includes(q) ||
          (r.matricula || '').toLowerCase().includes(q) ||
          (r.cpf ? r.cpf.includes(q) : false) ||
          (r.telefone ? r.telefone.includes(q) : false) ||
          (r.email ? r.email.toLowerCase().includes(q) : false)
        );
      }

      return true;
    });
  }, [records, currentUser, selectedResp, selectedPlan, selectedAging, searchTerm]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-900 border border-indigo-200 uppercase">
              Base de Beneficiários
            </span>
            <span className="text-xs text-slate-500 font-mono">{filteredClients.length} cadastros localizados</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
            CADASTRO DO CLIENTE & CONTROLE DA DÍVIDA
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Visão cadastral individual completa, contrato, plano do Cartão Todos, dados de contato e controle detalhado do saldo em aberto com cálculo de dias de atraso.
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenNewRecord}
          className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition-all shadow-xs cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4 text-emerald-400" />
          <span>+ NOVO CADASTRO</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por Nome, CPF, Matrícula..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <select
            value={selectedResp}
            onChange={(e) => setSelectedResp(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="todos">Todos os Responsáveis</option>
            <option value="ANA LUIZA">Ana Luiza</option>
            <option value="ROSANA">Rosana</option>
            <option value="KEYLLA">Keylla</option>
            <option value="FABIOLA">Fabiola</option>
          </select>
        </div>

        <div>
          <select
            value={selectedPlan}
            onChange={(e) => setSelectedPlan(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="todos">Todos os Planos</option>
            <option value="Individual">Cartão Todos Individual</option>
            <option value="Familiar">Cartão Todos Familiar</option>
            <option value="Mais Odonto">Cartão Todos Mais Odonto</option>
            <option value="Top Saúde">Cartão Todos Top Saúde Master</option>
          </select>
        </div>

        <div>
          <select
            value={selectedAging}
            onChange={(e) => setSelectedAging(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="todos">Todas as Faixas de Atraso</option>
            <option value="ate30">Até 30 dias</option>
            <option value="31a60">31 a 60 dias</option>
            <option value="61a90">61 a 90 dias</option>
            <option value="mais90">Mais de 90 dias</option>
          </select>
        </div>
      </div>

      {/* Clients Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                <th className="p-3">Matrícula / Cliente</th>
                <th className="p-3">CPF & Contatos</th>
                <th className="p-3">Plano & Mensalidade</th>
                <th className="p-3">Vencimento & Atraso</th>
                <th className="p-3 text-right">Saldo em Aberto</th>
                <th className="p-3">Responsável</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-center">Ações Rápidas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredClients.slice(0, 50).map((r) => {
                const days = r.diasAtraso || 0;
                const saldo = r.valorEmAberto !== undefined ? r.valorEmAberto : (r.valorOriginal || 120);

                return (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Matricula & Cliente */}
                    <td className="p-3">
                      <div className="font-bold text-slate-900 text-xs">
                        {r.cliente}
                      </div>
                      <div className="text-[11px] font-mono text-slate-500">
                        #{r.matricula}
                      </div>
                    </td>

                    {/* CPF & Contatos */}
                    <td className="p-3 space-y-0.5">
                      <div className="font-mono text-slate-700 font-semibold">
                        {r.cpf || '000.000.000-00'}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{r.telefone || 'Sem telefone'}</span>
                      </div>
                    </td>

                    {/* Plano & Mensalidade */}
                    <td className="p-3">
                      <div className="font-semibold text-slate-800">
                        {r.planoContratado || 'Cartão Todos Familiar'}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        Mensalidade: R$ {(r.valorMensalidade || 59.70).toFixed(2)}
                      </div>
                    </td>

                    {/* Vencimento & Atraso */}
                    <td className="p-3">
                      <div className="font-semibold text-slate-800">
                        Dia {r.diaVencimento} ({r.primeiroMesAtraso || '09/26'})
                      </div>
                      <div className={`text-[11px] font-bold ${
                        days > 60 ? 'text-rose-600' : days > 30 ? 'text-amber-600' : 'text-emerald-600'
                      }`}>
                        {days} dias de atraso ({r.qtdParcelasVencidas || 1} parc.)
                      </div>
                    </td>

                    {/* Saldo em Aberto */}
                    <td className="p-3 text-right">
                      <div className="font-mono font-bold text-slate-900 text-xs">
                        R$ {saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                      {r.valorPago && r.valorPago > 0 && (
                        <div className="text-[10px] text-emerald-600 font-mono font-bold">
                          Pago: R$ {r.valorPago.toFixed(2)}
                        </div>
                      )}
                    </td>

                    {/* Responsável */}
                    <td className="p-3">
                      <span className="font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                        {r.responsavel}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        r.status === 'pago' || r.status === 'recuperado'
                          ? 'bg-emerald-100 text-emerald-800'
                          : r.status === 'pagamento_prometido'
                          ? 'bg-teal-100 text-teal-800'
                          : r.status === 'em_negociacao' || r.status === 'acordo_em_andamento'
                          ? 'bg-blue-100 text-blue-800'
                          : days > 60
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {r.status.replace(/_/g, ' ')}
                      </span>
                    </td>

                    {/* Ações Rápidas */}
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => onOpenContactHistory(r)}
                          className="p-1.5 hover:bg-slate-100 rounded text-indigo-600 transition-colors"
                          title="Ficha completa & Histórico de Contatos"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onEditRecord(r)}
                          className="p-1.5 hover:bg-slate-100 rounded text-slate-600 transition-colors"
                          title="Editar cadastro do cliente"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
