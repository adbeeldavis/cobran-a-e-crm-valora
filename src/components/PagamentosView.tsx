import React, { useState, useMemo } from 'react';
import { 
  DollarSign, 
  Search, 
  Filter, 
  Plus, 
  Calendar, 
  CreditCard, 
  CheckCircle2, 
  QrCode, 
  FileSpreadsheet, 
  ArrowUpRight,
  TrendingUp,
  Download
} from 'lucide-react';
import { DebtRecord, PagamentoRecord, AppUser } from '../types';

interface PagamentosViewProps {
  records: DebtRecord[];
  currentUser: AppUser;
  onOpenRegistrarPagamento: (record?: DebtRecord) => void;
  onOpenContactHistory: (record: DebtRecord) => void;
}

export const PagamentosView: React.FC<PagamentosViewProps> = ({
  records,
  currentUser,
  onOpenRegistrarPagamento,
  onOpenContactHistory
}) => {
  const [selectedForma, setSelectedForma] = useState<string>('todos');
  const [selectedResp, setSelectedResp] = useState<string>('todos');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Collect all payments
  const allPagamentos = useMemo(() => {
    const list: { record: DebtRecord; pag: PagamentoRecord }[] = [];
    records.forEach(r => {
      if (r.historicoPagamentos && r.historicoPagamentos.length > 0) {
        r.historicoPagamentos.forEach(p => {
          list.push({ record: r, pag: p });
        });
      } else if (r.status === 'pago' || r.status === 'recuperado') {
        const val = r.valorPago || r.valorOriginal || 120;
        list.push({
          record: r,
          pag: {
            id: `pag-${r.id}`,
            clienteId: r.id,
            matricula: r.matricula,
            clienteNome: r.cliente,
            dataPagamento: '2026-09-16',
            valorPago: val,
            formaPagamento: 'PIX',
            valorRecuperado: val,
            responsavel: r.responsavel,
            observacoes: 'Quitação confirmada via PIX'
          }
        });
      }
    });
    return list;
  }, [records]);

  // Filtered payments
  const filteredPagamentos = useMemo(() => {
    return allPagamentos.filter(({ record, pag }) => {
      if (selectedForma !== 'todos' && pag.formaPagamento !== selectedForma) {
        return false;
      }
      if (selectedResp !== 'todos' && !(pag.responsavel || '').toUpperCase().includes(selectedResp.toUpperCase())) {
        return false;
      }
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        return (
          pag.clienteNome.toLowerCase().includes(q) ||
          pag.matricula.toLowerCase().includes(q) ||
          (pag.observacoes && pag.observacoes.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [allPagamentos, selectedForma, selectedResp, searchTerm]);

  // Totals
  const totalRecuperado = useMemo(() => {
    return allPagamentos.reduce((acc, curr) => acc + curr.pag.valorPago, 0);
  }, [allPagamentos]);

  const pixCount = allPagamentos.filter(p => p.pag.formaPagamento === 'PIX').length;
  const boletoCount = allPagamentos.filter(p => p.pag.formaPagamento === 'Boleto').length;
  const cartaoCount = allPagamentos.filter(p => (p.pag.formaPagamento || '').includes('Cartão')).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-200 uppercase">
              Caixa & Entradas de Cobrança
            </span>
            <span className="text-xs text-slate-500 font-mono">{filteredPagamentos.length} lançamentos</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
            REGISTRO E EXTRATO DE PAGAMENTOS
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Histórico contábil das baixas realizadas pela equipe, rateio por meio de pagamento (PIX, Boleto, Cartão) e impacto em tempo real na recuperação.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onOpenRegistrarPagamento()}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition-all shadow-xs cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>+ REGISTRAR PAGAMENTO</span>
        </button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Recuperado</span>
          <span className="text-xl font-bold font-mono text-emerald-700 mt-1 block">
            R$ {totalRecuperado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
          <span className="text-[11px] text-slate-500">{allPagamentos.length} recebimentos computados</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase block">Recebido via PIX</span>
          <span className="text-xl font-bold font-mono text-slate-900 mt-1 block">
            {pixCount} ({allPagamentos.length > 0 ? Math.round((pixCount / allPagamentos.length) * 100) : 0}%)
          </span>
          <span className="text-[11px] text-emerald-600 font-medium">Liquidação instantânea</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase block">Recebido via Boleto</span>
          <span className="text-xl font-bold font-mono text-slate-900 mt-1 block">
            {boletoCount} ({allPagamentos.length > 0 ? Math.round((boletoCount / allPagamentos.length) * 100) : 0}%)
          </span>
          <span className="text-[11px] text-slate-500">Compensação bancária</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase block">Recebido via Cartão</span>
          <span className="text-xl font-bold font-mono text-slate-900 mt-1 block">
            {cartaoCount} ({allPagamentos.length > 0 ? Math.round((cartaoCount / allPagamentos.length) * 100) : 0}%)
          </span>
          <span className="text-[11px] text-slate-500">Crédito & Débito</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por cliente, matrícula ou recibo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedForma}
            onChange={(e) => setSelectedForma(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
          >
            <option value="todos">Todas as Formas de Pagamento</option>
            <option value="PIX">PIX</option>
            <option value="Boleto">Boleto Bancário</option>
            <option value="Cartão de Crédito">Cartão de Crédito</option>
            <option value="Cartão de Débito">Cartão de Débito</option>
            <option value="Dinheiro">Dinheiro</option>
          </select>

          <select
            value={selectedResp}
            onChange={(e) => setSelectedResp(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
          >
            <option value="todos">Todas as Cobradoras</option>
            <option value="ANA LUIZA">Ana Luiza</option>
            <option value="ROSANA">Rosana</option>
            <option value="KEYLLA">Keylla</option>
            <option value="FABIOLA">Fabiola</option>
          </select>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                <th className="p-3">Data do Pagamento</th>
                <th className="p-3">Cliente / Matrícula</th>
                <th className="p-3">Forma de Pagamento</th>
                <th className="p-3 font-mono text-right">Valor Pago</th>
                <th className="p-3 font-mono text-right">Valor Recuperado</th>
                <th className="p-3">Operadora</th>
                <th className="p-3">Observações</th>
                <th className="p-3 text-center">Recibo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPagamentos.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    Nenhum pagamento encontrado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredPagamentos.map(({ record, pag }) => {
                  return (
                    <tr key={pag.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 font-mono font-semibold text-slate-700">
                        {pag.dataPagamento}
                      </td>

                      <td className="p-3">
                        <button
                          type="button"
                          onClick={() => onOpenContactHistory(record)}
                          className="font-bold text-slate-900 hover:text-emerald-600 transition-colors text-left"
                        >
                          {pag.clienteNome}
                        </button>
                        <div className="text-[11px] font-mono text-slate-400">#{pag.matricula}</div>
                      </td>

                      <td className="p-3">
                        <span className="inline-flex items-center gap-1 font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                          {pag.formaPagamento === 'PIX' && <QrCode className="w-3 h-3 text-emerald-600" />}
                          {(pag.formaPagamento || '').includes('Cartão') && <CreditCard className="w-3 h-3 text-indigo-600" />}
                          <span>{pag.formaPagamento}</span>
                        </span>
                      </td>

                      <td className="p-3 font-mono font-bold text-emerald-700 text-right">
                        R$ {pag.valorPago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>

                      <td className="p-3 font-mono font-bold text-slate-900 text-right">
                        R$ {(pag.valorRecuperado || pag.valorPago).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>

                      <td className="p-3 font-semibold text-slate-800">
                        {pag.responsavel}
                      </td>

                      <td className="p-3 text-slate-500 italic max-w-xs truncate">
                        {pag.observacoes || 'Sem observações'}
                      </td>

                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => onOpenContactHistory(record)}
                          className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded font-bold text-[11px] transition-colors cursor-pointer"
                        >
                          Ver
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
