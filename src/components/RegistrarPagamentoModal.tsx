import React, { useState, useEffect } from 'react';
import { X, DollarSign, Calendar, CreditCard, CheckCircle2, QrCode } from 'lucide-react';
import { DebtRecord, AppUser, PagamentoRecord } from '../types';

interface RegistrarPagamentoModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: DebtRecord | null;
  currentUser: AppUser;
  onSavePagamento: (recordId: string, pagamento: PagamentoRecord) => void;
}

export const RegistrarPagamentoModal: React.FC<RegistrarPagamentoModalProps> = ({
  isOpen,
  onClose,
  record,
  currentUser,
  onSavePagamento
}) => {
  const defaultVal = record && record.valorEmAberto !== undefined && record.valorEmAberto > 0
    ? record.valorEmAberto
    : (record?.valorOriginal || 120);

  const [valorPago, setValorPago] = useState(defaultVal);
  const [formaPagamento, setFormaPagamento] = useState<PagamentoRecord['formaPagamento']>('PIX');
  const [dataPagamento, setDataPagamento] = useState('2026-09-17');
  const [observacoes, setObservacoes] = useState('Pagamento realizado e confirmado via comprovante.');

  useEffect(() => {
    if (record) {
      setValorPago(record.valorEmAberto !== undefined && record.valorEmAberto > 0 ? record.valorEmAberto : (record.valorOriginal || 120));
    }
  }, [record]);

  if (!isOpen || !record) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const novoPag: PagamentoRecord = {
      id: `pag-${Date.now()}`,
      clienteId: record.id,
      matricula: record.matricula,
      clienteNome: record.cliente,
      dataPagamento,
      valorPago,
      formaPagamento,
      valorRecuperado: valorPago,
      responsavel: currentUser.nome,
      observacoes
    };

    onSavePagamento(record.id, novoPag);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95">
        
        {/* Header */}
        <div className="bg-emerald-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">Registrar Pagamento / Baixa</h3>
              <p className="text-xs text-emerald-200">
                Cliente: <strong>{record.cliente}</strong> (#{record.matricula})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-emerald-300 hover:text-white hover:bg-emerald-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Valor Recebido (R$)</label>
              <input
                type="number"
                step="0.01"
                value={valorPago}
                onChange={(e) => setValorPago(parseFloat(e.target.value) || 0)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold text-emerald-700 text-base focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Data do Pagamento</label>
              <input
                type="date"
                value={dataPagamento}
                onChange={(e) => setDataPagamento(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Forma de Pagamento</label>
            <select
              value={formaPagamento}
              onChange={(e) => setFormaPagamento(e.target.value as any)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500"
            >
              <option value="PIX">PIX (Liquidação Imediata)</option>
              <option value="Boleto">Boleto Bancário</option>
              <option value="Cartão de Crédito">Cartão de Crédito</option>
              <option value="Cartão de Débito">Cartão de Débito</option>
              <option value="Dinheiro">Dinheiro em Espécie</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Observações / Comprovante</label>
            <textarea
              rows={2}
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center gap-2 transition-colors cursor-pointer shadow-xs"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Confirmar Baixa e Recuperação</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
