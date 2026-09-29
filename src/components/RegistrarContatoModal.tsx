import React, { useState } from 'react';
import { X, MessageSquare, Phone, Mail, Send, Calendar, Clock, CheckCircle2 } from 'lucide-react';
import { DebtRecord, AppUser, HistoricoContato } from '../types';

interface RegistrarContatoModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: DebtRecord | null;
  currentUser: AppUser;
  onSaveContact: (recordId: string, contato: HistoricoContato, proximaAcao: string, dataProximaAcao: string) => void;
}

export const RegistrarContatoModal: React.FC<RegistrarContatoModalProps> = ({
  isOpen,
  onClose,
  record,
  currentUser,
  onSaveContact
}) => {
  const [canal, setCanal] = useState<'whatsapp' | 'ligacao' | 'sms' | 'email'>('whatsapp');
  const [resultado, setResultado] = useState<'sucesso' | 'nao_atende' | 'mensagem_enviada' | 'recusou' | 'sem_contato'>('mensagem_enviada');
  const [observacoes, setObservacoes] = useState('');
  const [proximaAcao, setProximaAcao] = useState('Cobrar retorno do cliente amanhã');
  const [dataProximaAcao, setDataProximaAcao] = useState('2026-09-18');

  if (!isOpen || !record) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const novoContato: HistoricoContato = {
      id: `cont-${Date.now()}`,
      data: '17/09/2026',
      horario: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      responsavel: currentUser.nome,
      canal,
      resultado,
      observacoes: observacoes.trim() || 'Contato de cobrança registrado pelo operador.',
      proximaAcao: proximaAcao.trim(),
      dataProximaAcao
    };

    onSaveContact(record.id, novoContato, proximaAcao, dataProximaAcao);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">Registrar Ação de Cobrança</h3>
              <p className="text-xs text-slate-300">
                Cliente: <strong>{record.cliente}</strong> (#{record.matricula})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          
          {/* Canal & Resultado */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Canal de Contato</label>
              <select
                value={canal}
                onChange={(e) => setCanal(e.target.value as any)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500"
              >
                <option value="whatsapp">WhatsApp</option>
                <option value="ligacao">Ligação Telefônica</option>
                <option value="sms">SMS</option>
                <option value="email">E-mail</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Resultado do Contato</label>
              <select
                value={resultado}
                onChange={(e) => setResultado(e.target.value as any)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500"
              >
                <option value="sucesso">Contato Efetivo / Negociou</option>
                <option value="mensagem_enviada">Mensagem Enviada</option>
                <option value="nao_atende">Chamou e Não Atendeu</option>
                <option value="recusou">Recusou Negociação</option>
                <option value="sem_contato">Número Inválido / Sem Contato</option>
              </select>
            </div>
          </div>

          {/* Observações */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">Observações do Acionamento</label>
            <textarea
              rows={3}
              placeholder="Descreva o que o cliente respondeu, motivos do atraso ou detalhes do acordo..."
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Próxima Ação & Data */}
          <div className="p-3.5 bg-indigo-50/60 rounded-xl border border-indigo-200 space-y-3">
            <span className="font-bold text-indigo-900 block uppercase tracking-wider text-[10px]">
              Agendamento da Próxima Ação (Orientado à Ação)
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Próxima Ação</label>
                <input
                  type="text"
                  value={proximaAcao}
                  onChange={(e) => setProximaAcao(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Data da Próxima Ação</label>
                <input
                  type="date"
                  value={dataProximaAcao}
                  onChange={(e) => setDataProximaAcao(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
            </div>
          </div>

          {/* Buttons */}
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
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center gap-2 transition-colors cursor-pointer shadow-xs"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Salvar Contato</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
