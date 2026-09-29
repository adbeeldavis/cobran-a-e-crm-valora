import React, { useState } from 'react';
import { X, Plus, UserPlus, FileSpreadsheet } from 'lucide-react';
import { DebtRecord, StatusCobranca } from '../types';

interface NewRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddRecord: (record: DebtRecord) => void;
  onOpenBulkCsv?: () => void;
}

export const NewRecordModal: React.FC<NewRecordModalProps> = ({
  isOpen,
  onClose,
  onAddRecord,
  onOpenBulkCsv,
}) => {
  const [cliente, setCliente] = useState('');
  const [matricula, setMatricula] = useState('');
  const [responsavel, setResponsavel] = useState('ROSANA');
  const [primeiroMesAtraso, setPrimeiroMesAtraso] = useState('09/26');
  const [diaVencimento, setDiaVencimento] = useState(20);
  const [status, setStatus] = useState<StatusCobranca>('pendente');
  const [informacao, setInformacao] = useState('');
  const [dataRetorno, setDataRetorno] = useState('');
  const [telefone, setTelefone] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cliente.trim() || !matricula.trim()) return;

    const newRec: DebtRecord = {
      id: `rec-${Date.now()}`,
      matricula: matricula.trim(),
      cliente: cliente.trim(),
      responsavel,
      primeiroMesAtraso: primeiroMesAtraso.trim(),
      diaVencimento,
      informacao: informacao.trim(),
      contatoRealizado: 'PENDENTE',
      whatsappStatus: 'PENDENTE',
      status,
      dataRetorno: dataRetorno.trim() || undefined,
      telefone: telefone.trim() || `(31) 9${matricula.padStart(4, '0')}-0000`,
      dataImportacao: new Date().toLocaleDateString('pt-BR'),
      notificacoes: [],
    };

    onAddRecord(newRec);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Cadastrar Novo Inadimplente
              </h2>
              <p className="text-xs text-slate-500">
                Adicione uma nova conta em aberto à central de cobrança
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick shortcut to bulk CSV import */}
        {onOpenBulkCsv && (
          <div className="px-6 py-2.5 bg-indigo-50/90 border-b border-indigo-100 flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5 text-indigo-950 font-medium">
              <FileSpreadsheet className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>Precisa cadastrar vários clientes de uma vez?</span>
            </div>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenBulkCsv();
              }}
              className="font-bold text-indigo-700 hover:text-indigo-900 underline hover:no-underline flex items-center gap-1"
            >
              <span>Adicionar em Massa (CSV) &rarr;</span>
            </button>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Nome do Cliente: *
              </label>
              <input
                type="text"
                value={cliente}
                onChange={(e) => setCliente(e.target.value)}
                placeholder="Nome completo do cliente"
                required
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Matrícula: *
              </label>
              <input
                type="text"
                value={matricula}
                onChange={(e) => setMatricula(e.target.value)}
                placeholder="Ex: 19850"
                required
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Cobradora Responsável:
              </label>
              <select
                value={responsavel}
                onChange={(e) => setResponsavel(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              >
                <option value="ROSANA">Rosana</option>
                <option value="ANA LUIZA">Ana Luiza</option>
                <option value="KEYLLA">Keylla</option>
                <option value="GERAL">Geral</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Mês de Atraso (MM/AA): *
              </label>
              <input
                type="text"
                value={primeiroMesAtraso}
                onChange={(e) => setPrimeiroMesAtraso(e.target.value)}
                placeholder="09/26"
                required
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Dia de Vencimento:
              </label>
              <select
                value={diaVencimento}
                onChange={(e) => setDiaVencimento(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              >
                <option value={10}>Dia 10</option>
                <option value={15}>Dia 15</option>
                <option value={20}>Dia 20</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Telefone / WhatsApp:
              </label>
              <input
                type="text"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="(31) 98765-4321"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Status Inicial:
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as StatusCobranca)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-medium"
              >
                <option value="pendente">Pendente</option>
                <option value="em_negociacao">Em Negociação</option>
                <option value="acordo_fechado">Acordo Fechado</option>
                <option value="boleto_gerado">Boleto Gerado</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Informações / Observações:
              </label>
              <textarea
                rows={2}
                value={informacao}
                onChange={(e) => setInformacao(e.target.value)}
                placeholder="Observações de contato, histórico, etc."
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

          </div>

          {/* Footer */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Adicionar à Planilha</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
