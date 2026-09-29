import React, { useState } from 'react';
import { 
  X, 
  Save, 
  MessageSquare, 
  Clock, 
  Calendar, 
  DollarSign, 
  User, 
  Phone, 
  CheckCircle2, 
  FileText,
  Send
} from 'lucide-react';
import { DebtRecord, StatusCobranca } from '../types';
import { calculateDaysOverdue, getAgingBucket } from '../utils/sheetParser';
import { buildWhatsAppUrl, formatMessage, DEFAULT_TEMPLATES } from '../utils/notificationService';

interface EditRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: DebtRecord | null;
  onSave: (updatedRecord: DebtRecord) => void;
  onOpenContactHistory?: (record: DebtRecord) => void;
}

export const EditRecordModal: React.FC<EditRecordModalProps> = ({
  isOpen,
  onClose,
  record,
  onSave,
  onOpenContactHistory,
}) => {
  if (!isOpen || !record) return null;

  const [cliente, setCliente] = useState(record.cliente);
  const [matricula, setMatricula] = useState(record.matricula);
  const [responsavel, setResponsavel] = useState(record.responsavel);
  const [primeiroMesAtraso, setPrimeiroMesAtraso] = useState(record.primeiroMesAtraso);
  const [diaVencimento, setDiaVencimento] = useState(record.diaVencimento);
  const [status, setStatus] = useState<StatusCobranca>(record.status);
  const [informacao, setInformacao] = useState(record.informacao || '');
  const [dataRetorno, setDataRetorno] = useState(record.dataRetorno || '');
  const [valorAcordo, setValorAcordo] = useState(record.valorAcordo ? record.valorAcordo.toString() : '');
  const [telefone, setTelefone] = useState(record.telefone || '');

  const days = calculateDaysOverdue(primeiroMesAtraso, diaVencimento);
  const bucket = getAgingBucket(days);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: DebtRecord = {
      ...record,
      cliente,
      matricula,
      responsavel,
      primeiroMesAtraso,
      diaVencimento: Number(diaVencimento),
      status,
      informacao,
      dataRetorno: dataRetorno.trim() || undefined,
      valorAcordo: valorAcordo ? parseFloat(valorAcordo) : undefined,
      telefone,
    };
    onSave(updated);
    onClose();
  };

  const handleOpenWhatsApp = () => {
    const defaultTemplate = status === 'acordo_fechado' || status === 'em_negociacao'
      ? DEFAULT_TEMPLATES[2].conteudo
      : status === 'boleto_gerado'
      ? DEFAULT_TEMPLATES[3].conteudo
      : days > 60
      ? DEFAULT_TEMPLATES[1].conteudo
      : DEFAULT_TEMPLATES[0].conteudo;

    const msg = formatMessage(defaultTemplate, record, days);
    const url = buildWhatsAppUrl(telefone || '31999999999', msg);
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
              <User className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Ficha de Cobrança do Devedor
              </h2>
              <p className="text-xs text-slate-500">
                Matrícula #{matricula} • {bucket.label}
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

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 space-y-4">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Cliente */}
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Nome do Cliente:
              </label>
              <input
                type="text"
                value={cliente}
                onChange={(e) => setCliente(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            {/* Matrícula */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Matrícula:
              </label>
              <input
                type="text"
                value={matricula}
                onChange={(e) => setMatricula(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            {/* Cobradora Responsavel */}
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

            {/* Primeiro Mes Atraso */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                1º Mês de Atraso (MM/AA):
              </label>
              <input
                type="text"
                value={primeiroMesAtraso}
                onChange={(e) => setPrimeiroMesAtraso(e.target.value)}
                placeholder="Ex: 01/25, 08/26"
                required
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            {/* Dia de Vencimento */}
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

            {/* Status da Cobrança */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Status da Cobrança:
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as StatusCobranca)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-medium"
              >
                <option value="pendente">Pendente de Contato</option>
                <option value="em_negociacao">Em Negociação / Agendado</option>
                <option value="acordo_fechado">Acordo Fechado</option>
                <option value="boleto_gerado">Boleto Emitido (Fabiola)</option>
                <option value="sem_contato">Sem Contato / Sem WhatsApp</option>
                <option value="pago">Liquidado / Quitado</option>
              </select>
            </div>

            {/* Telefone / WhatsApp */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Telefone / WhatsApp:
              </label>
              <input
                type="text"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="(31) 99999-9999"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            {/* Data de Retorno / Agendamento */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Data Retorno / Acordo:
              </label>
              <input
                type="text"
                value={dataRetorno}
                onChange={(e) => setDataRetorno(e.target.value)}
                placeholder="Ex: 04/09, 22/10/2025"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            {/* Valor do Acordo */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Valor Negociado / Acordo (R$):
              </label>
              <input
                type="number"
                step="0.01"
                value={valorAcordo}
                onChange={(e) => setValorAcordo(e.target.value)}
                placeholder="85.00"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            {/* Informações / Observações */}
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Histórico de Cobrança / Informações da Planilha:
              </label>
              <textarea
                rows={3}
                value={informacao}
                onChange={(e) => setInformacao(e.target.value)}
                placeholder="Anotações de ligações, acordos, boletos gerados..."
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

          </div>

          {/* Action footer */}
          <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleOpenWhatsApp}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-300 transition-colors cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Abrir WhatsApp</span>
              </button>

              {onOpenContactHistory && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenContactHistory(record);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-300 transition-colors cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Prontuário de Atendimentos</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs transition-colors"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Salvar Alterações</span>
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};
