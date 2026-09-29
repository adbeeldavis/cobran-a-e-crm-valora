import React, { useState, useEffect } from 'react';
import { X, Handshake, DollarSign, Calendar, Percent, CheckCircle2 } from 'lucide-react';
import { DebtRecord, AppUser, NegociacaoRecord } from '../types';

interface NovaNegociacaoModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: DebtRecord | null;
  currentUser: AppUser;
  onSaveNegociacao: (recordId: string, negociacao: NegociacaoRecord) => void;
}

export const NovaNegociacaoModal: React.FC<NovaNegociacaoModalProps> = ({
  isOpen,
  onClose,
  record,
  currentUser,
  onSaveNegociacao
}) => {
  const initialVal = record ? (record.valorEmAberto !== undefined ? record.valorEmAberto : (record.valorOriginal || 120)) : 120;
  const [valorOriginal, setValorOriginal] = useState(initialVal);
  const [desconto, setDesconto] = useState(15);
  const [parcelas, setParcelas] = useState(2);
  const [dataPrimeiroPagamento, setDataPrimeiroPagamento] = useState('2026-09-20');
  const [observacoes, setObservacoes] = useState('Proposta com condição especial via PIX/Cartão Todos');

  useEffect(() => {
    if (record) {
      setValorOriginal(record.valorEmAberto !== undefined ? record.valorEmAberto : (record.valorOriginal || 120));
    }
  }, [record]);

  if (!isOpen || !record) return null;

  // Calculations
  const valorComDesconto = Math.round(valorOriginal * (1 - desconto / 100));
  const valorParcela = parcelas > 0 ? Math.round((valorComDesconto / parcelas) * 100) / 100 : valorComDesconto;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const novaNeg: NegociacaoRecord = {
      id: `neg-${Date.now()}`,
      clienteId: record.id,
      matricula: record.matricula,
      clienteNome: record.cliente,
      dataCriacao: '2026-09-17',
      valorOriginal,
      descontoConcedido: desconto,
      valorNegociado: valorComDesconto,
      numeroParcelas: parcelas,
      valorParcela,
      dataPrimeiroPagamento,
      responsavel: currentUser.nome,
      observacoes,
      status: 'acordo_realizado'
    };

    onSaveNegociacao(record.id, novaNeg);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95">
        
        {/* Header */}
        <div className="bg-blue-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-700 flex items-center justify-center text-white">
              <Handshake className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">Nova Negociação / Acordo</h3>
              <p className="text-xs text-blue-200">
                Cliente: <strong>{record.cliente}</strong> (#{record.matricula})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-blue-300 hover:text-white hover:bg-blue-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Valor Original (R$)</label>
              <input
                type="number"
                step="0.01"
                value={valorOriginal}
                onChange={(e) => setValorOriginal(parseFloat(e.target.value) || 0)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold text-slate-900 focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Desconto Concedido (%)</label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={desconto}
                  onChange={(e) => setDesconto(parseInt(e.target.value, 10) || 0)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold text-emerald-700 focus:ring-2 focus:ring-blue-500"
                  required
                />
                <Percent className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>
          </div>

          {/* Computed Negotiation Preview */}
          <div className="p-4 bg-blue-50/80 rounded-xl border border-blue-200 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-blue-950">
              <span>Valor Negociado com Desconto:</span>
              <span className="font-mono text-base text-blue-700">R$ {valorComDesconto.toFixed(2)}</span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-blue-200/80">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Número de Parcelas</label>
                <select
                  value={parcelas}
                  onChange={(e) => setParcelas(parseInt(e.target.value, 10))}
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg font-bold text-slate-800"
                >
                  <option value={1}>1x (À vista no PIX)</option>
                  <option value={2}>2x de R$ {(valorComDesconto / 2).toFixed(2)}</option>
                  <option value={3}>3x de R$ {(valorComDesconto / 3).toFixed(2)}</option>
                  <option value={4}>4x de R$ {(valorComDesconto / 4).toFixed(2)}</option>
                  <option value={6}>6x de R$ {(valorComDesconto / 6).toFixed(2)}</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">1º Vencimento</label>
                <input
                  type="date"
                  value={dataPrimeiroPagamento}
                  onChange={(e) => setDataPrimeiroPagamento(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg font-semibold text-slate-800"
                  required
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Observações do Acordo</label>
            <textarea
              rows={2}
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:ring-2 focus:ring-blue-500"
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
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center gap-2 transition-colors cursor-pointer shadow-xs"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Formalizar Acordo</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
