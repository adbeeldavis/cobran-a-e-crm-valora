import React, { useState } from 'react';
import { 
  X, 
  Send, 
  Copy, 
  Check, 
  MessageSquare, 
  Smartphone, 
  Mail, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle,
  Bot
} from 'lucide-react';
import { DebtRecord, TemplateMensagem } from '../types';
import { DEFAULT_TEMPLATES, formatMessage, buildWhatsAppUrl } from '../utils/notificationService';
import { calculateDaysOverdue } from '../utils/sheetParser';

interface NotificationsCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetRecords: DebtRecord[];
  allRecords: DebtRecord[];
  onDispatchNotifications: (records: DebtRecord[], template: TemplateMensagem) => void;
}

export const NotificationsCenterModal: React.FC<NotificationsCenterModalProps> = ({
  isOpen,
  onClose,
  targetRecords,
  allRecords,
  onDispatchNotifications,
}) => {
  const [templates, setTemplates] = useState<TemplateMensagem[]>(DEFAULT_TEMPLATES);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(DEFAULT_TEMPLATES[0].id);
  const [copied, setCopied] = useState(false);
  const [dispatchStatus, setDispatchStatus] = useState<'idle' | 'sending' | 'success'>('idle');
  const [activeAudience, setActiveAudience] = useState<'selected' | 'dia10' | 'dia15' | 'dia20' | 'criticos' | 'boletos'>('selected');

  if (!isOpen) return null;

  // Determine audience list
  let audienceList: DebtRecord[] = [];
  if (activeAudience === 'selected') {
    audienceList = targetRecords.length > 0 ? targetRecords : allRecords.slice(0, 10);
  } else if (activeAudience === 'dia10') {
    audienceList = allRecords.filter(r => r.diaVencimento === 10);
  } else if (activeAudience === 'dia15') {
    audienceList = allRecords.filter(r => r.diaVencimento === 15);
  } else if (activeAudience === 'dia20') {
    audienceList = allRecords.filter(r => r.diaVencimento === 20);
  } else if (activeAudience === 'criticos') {
    audienceList = allRecords.filter(r => calculateDaysOverdue(r.primeiroMesAtraso, r.diaVencimento) > 180);
  } else if (activeAudience === 'boletos') {
    audienceList = allRecords.filter(r => r.status === 'boleto_gerado');
  }

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId) || templates[0];
  const sampleRecord = audienceList[0] || allRecords[0];
  const sampleDays = sampleRecord ? calculateDaysOverdue(sampleRecord.primeiroMesAtraso, sampleRecord.diaVencimento) : 30;
  const previewText = sampleRecord ? formatMessage(selectedTemplate.conteudo, sampleRecord, sampleDays) : '';

  const handleCopyPreview = () => {
    navigator.clipboard.writeText(previewText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExecuteDispatch = () => {
    setDispatchStatus('sending');
    setTimeout(() => {
      onDispatchNotifications(audienceList, selectedTemplate);
      setDispatchStatus('success');
      setTimeout(() => {
        setDispatchStatus('idle');
        onClose();
      }, 1500);
    }, 800);
  };

  const handleOpenIndividualWhatsApp = (record: DebtRecord) => {
    const days = calculateDaysOverdue(record.primeiroMesAtraso, record.diaVencimento);
    const msg = formatMessage(selectedTemplate.conteudo, record, days);
    const url = buildWhatsAppUrl(record.telefone || '31999999999', msg);
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Central de Automação & Notificações de Cobrança
              </h2>
              <p className="text-xs text-slate-500">
                Dispare lembretes via WhatsApp, SMS ou gere mensagens personalizadas em lote
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

        {/* Modal Content */}
        <div className="p-6 space-y-6">
          
          {/* Target Audience Selector */}
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
              1. Selecione o Público Alvo do Disparo:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <button
                onClick={() => setActiveAudience('selected')}
                className={`p-2.5 rounded-lg text-xs font-medium border text-left transition-all ${
                  activeAudience === 'selected' 
                    ? 'bg-emerald-50 text-emerald-900 border-emerald-500 ring-2 ring-emerald-500/20' 
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span className="font-bold block">Selecionados na Planilha</span>
                <span className="text-[11px] text-slate-500">({targetRecords.length > 0 ? targetRecords.length : '10 recentes'} clientes)</span>
              </button>

              <button
                onClick={() => setActiveAudience('dia10')}
                className={`p-2.5 rounded-lg text-xs font-medium border text-left transition-all ${
                  activeAudience === 'dia10' 
                    ? 'bg-emerald-50 text-emerald-900 border-emerald-500 ring-2 ring-emerald-500/20' 
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span className="font-bold block">Vencimento Dia 10</span>
                <span className="text-[11px] text-slate-500">({allRecords.filter(r => r.diaVencimento === 10).length} clientes)</span>
              </button>

              <button
                onClick={() => setActiveAudience('dia15')}
                className={`p-2.5 rounded-lg text-xs font-medium border text-left transition-all ${
                  activeAudience === 'dia15' 
                    ? 'bg-emerald-50 text-emerald-900 border-emerald-500 ring-2 ring-emerald-500/20' 
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span className="font-bold block">Vencimento Dia 15</span>
                <span className="text-[11px] text-slate-500">({allRecords.filter(r => r.diaVencimento === 15).length} clientes)</span>
              </button>

              <button
                onClick={() => setActiveAudience('dia20')}
                className={`p-2.5 rounded-lg text-xs font-medium border text-left transition-all ${
                  activeAudience === 'dia20' 
                    ? 'bg-emerald-50 text-emerald-900 border-emerald-500 ring-2 ring-emerald-500/20' 
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span className="font-bold block">Vencimento Dia 20</span>
                <span className="text-[11px] text-slate-500">({allRecords.filter(r => r.diaVencimento === 20).length} clientes)</span>
              </button>

              <button
                onClick={() => setActiveAudience('criticos')}
                className={`p-2.5 rounded-lg text-xs font-medium border text-left transition-all ${
                  activeAudience === 'criticos' 
                    ? 'bg-rose-50 text-rose-900 border-rose-500 ring-2 ring-rose-500/20' 
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span className="font-bold block text-rose-800">Atraso Crítico (+180d)</span>
                <span className="text-[11px] text-slate-500">({allRecords.filter(r => calculateDaysOverdue(r.primeiroMesAtraso, r.diaVencimento) > 180).length} clientes)</span>
              </button>

              <button
                onClick={() => setActiveAudience('boletos')}
                className={`p-2.5 rounded-lg text-xs font-medium border text-left transition-all ${
                  activeAudience === 'boletos' 
                    ? 'bg-blue-50 text-blue-900 border-blue-500 ring-2 ring-blue-500/20' 
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span className="font-bold block text-blue-800">Boletos Emitidos</span>
                <span className="text-[11px] text-slate-500">({allRecords.filter(r => r.status === 'boleto_gerado').length} clientes)</span>
              </button>
            </div>
          </div>

          {/* Modelos de Notificação */}
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
              2. Escolha o Modelo de Régua de Cobrança:
            </label>
            <div className="space-y-2">
              {templates.map(tpl => (
                <div
                  key={tpl.id}
                  onClick={() => setSelectedTemplateId(tpl.id)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedTemplateId === tpl.id
                      ? 'bg-indigo-50/70 border-indigo-500 ring-1 ring-indigo-500'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      {tpl.canal === 'whatsapp' ? (
                        <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Mail className="w-3.5 h-3.5 text-indigo-600" />
                      )}
                      <span className="text-xs font-bold text-slate-900">{tpl.nome}</span>
                    </div>
                    <span className="text-[10px] uppercase font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                      {tpl.canal}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-2">
                    {tpl.conteudo}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Live Dynamic Preview */}
          <div className="p-4 rounded-xl bg-slate-900 text-white space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-emerald-400 font-semibold">
                <Sparkles className="w-4 h-4" />
                <span>Pré-visualização Dinâmica (Exemplo: {sampleRecord?.cliente || 'Cliente'})</span>
              </div>
              <button
                onClick={handleCopyPreview}
                className="inline-flex items-center gap-1 text-xs text-slate-300 hover:text-white bg-slate-800 px-2.5 py-1 rounded-md transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copiado!' : 'Copiar Texto'}</span>
              </button>
            </div>

            <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 text-xs font-mono text-slate-200 leading-relaxed whitespace-pre-wrap">
              {previewText}
            </div>

            <p className="text-[11px] text-slate-400">
              Variáveis automáticas são substituídas individualmente para cada cliente com os dados da planilha unificada.
            </p>
          </div>

          {/* Preview of Top Recipients */}
          <div>
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Fila de Destinatários ({audienceList.length} clientes selecionados):
            </h4>
            <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100 text-xs">
              {audienceList.slice(0, 15).map((r, idx) => (
                <div key={`${r.id}-${idx}`} className="p-2 flex items-center justify-between hover:bg-slate-50">
                  <div>
                    <span className="font-semibold text-slate-800">{r.cliente}</span>
                    <span className="text-slate-400 ml-2 font-mono">#{r.matricula}</span>
                    <span className="text-slate-500 ml-2">({r.responsavel})</span>
                  </div>
                  <button
                    onClick={() => handleOpenIndividualWhatsApp(r)}
                    className="text-emerald-700 hover:text-emerald-800 font-medium text-[11px] flex items-center gap-1 hover:underline"
                  >
                    Abrir WhatsApp
                  </button>
                </div>
              ))}
              {audienceList.length > 15 && (
                <div className="p-2 text-center text-slate-400 text-[11px] bg-slate-50">
                  + {audienceList.length - 15} outros clientes na lista de disparo
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-200 transition-colors"
          >
            Cancelar
          </button>

          <button
            disabled={dispatchStatus === 'sending' || audienceList.length === 0}
            onClick={handleExecuteDispatch}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs disabled:opacity-50 transition-colors"
          >
            {dispatchStatus === 'sending' ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Processando fila de {audienceList.length} mensagens...</span>
              </>
            ) : dispatchStatus === 'success' ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-white" />
                <span>Disparado com Sucesso!</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Confirmar e Disparar Notificações ({audienceList.length})</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
