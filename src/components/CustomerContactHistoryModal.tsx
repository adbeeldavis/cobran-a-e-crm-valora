import React, { useState, useEffect } from 'react';
import { 
  X, 
  User, 
  Phone, 
  Mail, 
  MessageSquare, 
  Clock, 
  Calendar, 
  DollarSign, 
  Plus, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  Send, 
  ExternalLink,
  Trash2,
  Filter,
  History,
  Tag,
  Briefcase,
  ChevronRight,
  Printer,
  Sparkles,
  ShieldCheck,
  Copy,
  Lock,
  Crown,
  Download,
  RotateCcw
} from 'lucide-react';
import { 
  DebtRecord, 
  AppUser, 
  RegistroContato, 
  CanalContato, 
  TipoResultadoContato, 
  StatusCobranca,
  WhatsAppSession,
  ItemAuditoria
} from '../types';
import { calculateDaysOverdue, getAgingBucket } from '../utils/sheetParser';
import { buildDirectWhatsAppChatUrl, formatPhoneForDisplay } from '../utils/whatsappService';

interface CustomerContactHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: DebtRecord | null;
  currentUser: AppUser;
  waSession?: WhatsAppSession;
  onUpdateRecord: (updatedRecord: DebtRecord) => void;
  onShowToast: (message: string) => void;
}

export const CustomerContactHistoryModal: React.FC<CustomerContactHistoryModalProps> = ({
  isOpen,
  onClose,
  record,
  currentUser,
  waSession,
  onUpdateRecord,
  onShowToast,
}) => {
  const isAdmMaster = currentUser.role === 'adm_master' || currentUser.role === 'suporte';

  const [activeTab, setActiveTab] = useState<'novo_contato' | 'timeline' | 'dados' | 'auditoria'>('novo_contato');

  // New Contact Form State
  const [canal, setCanal] = useState<CanalContato>('whatsapp');
  const [tipoResultado, setTipoResultado] = useState<TipoResultadoContato>('cobranca_ativa');
  const [resumo, setResumo] = useState<string>('');
  const [detalhes, setDetalhes] = useState<string>('');
  const [novoStatus, setNovoStatus] = useState<StatusCobranca>(record?.status || 'pendente');
  const [valorPrometido, setValorPrometido] = useState<string>(record?.valorAcordo ? String(record.valorAcordo) : '');
  const [dataPromessa, setDataPromessa] = useState<string>('');
  const [dataRetornoAgendado, setDataRetornoAgendado] = useState<string>(record?.dataRetorno || '');
  const [sendWhatsAppSimultaneously, setSendWhatsAppSimultaneously] = useState<boolean>(true);
  const [waMessageText, setWaMessageText] = useState<string>(
    record ? `Olá ${record.cliente}, informamos sobre a pendência da matrícula #${record.matricula}. Favor responder para regularizarmos sua situação.` : ''
  );

  // AI Response Suggestion State
  interface AiSuggestion {
    sugestaoTexto: string;
    argumentoVenda: string;
    proximoPassoRecomendado: string;
    tomAbordagem: string;
    gatilhoPsicologico: string;
  }
  const [isLoadingAi, setIsLoadingAi] = useState<boolean>(false);
  const [aiSuggestion, setAiSuggestion] = useState<AiSuggestion | null>(null);
  const [showAiSuggestionBox, setShowAiSuggestionBox] = useState<boolean>(false);
  const [copiedText, setCopiedText] = useState<boolean>(false);

  // Editable customer data state
  const [editTelefone, setEditTelefone] = useState<string>(record?.telefone || '');
  const [editResponsavel, setEditResponsavel] = useState<string>(record?.responsavel || '');
  const [motivoReatribuicao, setMotivoReatribuicao] = useState<string>('');

  // Mandatory Activity Registration enforcement state
  const [hasCompletedActivity, setHasCompletedActivity] = useState<boolean>(false);
  const [showActivityBlockAlert, setShowActivityBlockAlert] = useState<boolean>(false);

  useEffect(() => {
    // When a customer record is opened or changed, block closure until full activity is registered
    setHasCompletedActivity(false);
    setShowActivityBlockAlert(false);
    setActiveTab('novo_contato');
  }, [record?.matricula]);

  const handleAttemptClose = () => {
    if (!hasCompletedActivity) {
      setShowActivityBlockAlert(true);
      setActiveTab('novo_contato');
      onShowToast('⚠️ Bloqueio de Operação: Este cliente foi aberto e só poderá ser fechado após o registro de atividade completa.');
      return;
    }
    onClose();
  };

  // Keyboard Escape listener
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleAttemptClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, hasCompletedActivity]);

  if (!isOpen || !record) return null;

  const days = calculateDaysOverdue(record.primeiroMesAtraso, record.diaVencimento);
  const bucket = getAgingBucket(days);
  const contactsList: RegistroContato[] = record.historicoContatos || [];
  
  // Existing Audit logs or initial baseline
  const auditLogsList: ItemAuditoria[] = record.logAuditoria && record.logAuditoria.length > 0 
    ? record.logAuditoria 
    : [
        {
          id: `baseline-${record.matricula}`,
          dataHora: record.dataImportacao || '2026-09-01 08:00',
          usuarioNome: 'Sistema Central',
          usuarioEmail: 'sistema@nossaoticaibirite.com.br',
          usuarioCargo: 'Importação Automática',
          tipoAcao: 'criacao',
          campoAlterado: 'Carga Inicial do Registro',
          valorAnterior: '-',
          valorNovo: `Status: ${record.status} | Cobradora: ${record.responsavel}`,
          motivo: 'Carga inicial consolidada da planilha'
        }
      ];

  // Request AI Suggestion from Gemini
  const handleFetchAiSuggestion = async () => {
    setIsLoadingAi(true);
    try {
      const res = await fetch('/api/gemini/suggest-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente: record.cliente,
          matricula: record.matricula,
          responsavel: record.responsavel,
          diasAtraso: days,
          status: novoStatus || record.status,
          canal,
          valorOriginal: record.valorOriginal,
          valorAcordo: valorPrometido ? parseFloat(valorPrometido) : record.valorAcordo,
          informacao: record.informacao,
          historicoContatos: record.historicoContatos || []
        })
      });

      const data = await res.json();
      if (data.suggestion) {
        setAiSuggestion(data.suggestion);
        setShowAiSuggestionBox(true);
        onShowToast('Sugestão de abordagem e argumento de venda gerados pelo Gemini!');
      } else {
        onShowToast('Não foi possível gerar a sugestão no momento.');
      }
    } catch (err) {
      console.error('Erro ao buscar sugestão IA:', err);
      onShowToast('Erro de conexão com o serviço Gemini.');
    } finally {
      setIsLoadingAi(false);
    }
  };

  // Apply AI Suggestion to Form
  const handleApplyAiSuggestion = () => {
    if (!aiSuggestion) return;
    setWaMessageText(aiSuggestion.sugestaoTexto);
    if (!resumo) {
      setResumo(`Argumento: ${aiSuggestion.argumentoVenda}`);
    }
    setDetalhes(prev => {
      const nota = `[Estratégia IA]: ${aiSuggestion.argumentoVenda} | Próximo passo: ${aiSuggestion.proximoPassoRecomendado}`;
      return prev ? `${prev}\n${nota}` : nota;
    });
    onShowToast('Texto e argumentos da IA inseridos no atendimento!');
  };

  // Copy text to clipboard
  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
    onShowToast('Texto copiado para a área de transferência!');
  };

  // Save Contact & Append Audit Log
  const handleSaveContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resumo.trim() || resumo.trim().length < 4) {
      onShowToast('Por favor, informe o resumo completo da tratativa de cobrança (mínimo de 4 caracteres).');
      return;
    }

    const now = new Date();
    const formattedDate = `${now.toLocaleDateString('pt-BR')} ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;

    const newContact: RegistroContato = {
      id: `contato-${Date.now()}`,
      dataHora: formattedDate,
      operadorNome: currentUser.nome,
      operadorId: currentUser.id,
      canal,
      tipoResultado,
      resumo: resumo.trim(),
      detalhes: detalhes.trim() || undefined,
      valorPrometido: valorPrometido ? parseFloat(valorPrometido) : undefined,
      dataPromessa: dataPromessa || undefined,
      dataRetornoAgendado: dataRetornoAgendado.trim() || undefined,
      novoStatus,
    };

    const updatedContacts = [newContact, ...contactsList];

    // Audit logs accumulation
    let updatedAuditLogs = [...(record.logAuditoria || [])];

    // 1. Did status change?
    if (novoStatus !== record.status) {
      const auditStatus: ItemAuditoria = {
        id: `audit-${Date.now()}-status`,
        dataHora: formattedDate,
        usuarioNome: currentUser.nome,
        usuarioEmail: currentUser.email,
        usuarioCargo: currentUser.cargo || (isAdmMaster ? 'Adm Master' : 'Operadora'),
        tipoAcao: 'mudanca_status',
        campoAlterado: 'Status da Cobrança',
        valorAnterior: record.status,
        valorNovo: novoStatus,
        motivo: `Alteração de status no atendimento via ${canal.toUpperCase()}: ${resumo.trim()}`
      };
      updatedAuditLogs = [auditStatus, ...updatedAuditLogs];
    }

    // 2. Add audit entry for the contact interaction
    const auditContato: ItemAuditoria = {
      id: `audit-${Date.now()}-contato`,
      dataHora: formattedDate,
      usuarioNome: currentUser.nome,
      usuarioEmail: currentUser.email,
      usuarioCargo: currentUser.cargo || (isAdmMaster ? 'Adm Master' : 'Operadora'),
      tipoAcao: 'registro_contato',
      campoAlterado: 'Registro de Atendimento',
      valorAnterior: '-',
      valorNovo: `${canal.toUpperCase()}: ${resumo.trim()}`,
      motivo: detalhes.trim() || undefined
    };
    updatedAuditLogs = [auditContato, ...updatedAuditLogs];

    // Compose updated summary note for sheet information
    const updatedInformacao = `[${now.toLocaleDateString('pt-BR')} ${currentUser.nome.split(' ')[0]} - ${canal.toUpperCase()}]: ${resumo.trim()}${
      record.informacao ? ` | ${record.informacao}` : ''
    }`;

    const updatedRecord: DebtRecord = {
      ...record,
      status: novoStatus,
      contatoRealizado: 'SIM',
      dataUltimoContato: now.toISOString().split('T')[0],
      dataRetorno: dataRetornoAgendado.trim() || record.dataRetorno,
      valorAcordo: valorPrometido ? parseFloat(valorPrometido) : record.valorAcordo,
      informacao: updatedInformacao,
      telefone: editTelefone.trim() || record.telefone,
      historicoContatos: updatedContacts,
      logAuditoria: updatedAuditLogs,
    };

    onUpdateRecord(updatedRecord);
    setHasCompletedActivity(true);
    setShowActivityBlockAlert(false);
    onShowToast(`Atividade completa registrada com sucesso na ficha de ${record.cliente}! Fechamento liberado.`);

    // If simultaneous WhatsApp is requested
    if (sendWhatsAppSimultaneously && canal === 'whatsapp') {
      const url = buildDirectWhatsAppChatUrl(editTelefone || record.telefone || '31999999999', waMessageText);
      window.open(url, '_blank');
    }

    // Reset form and transition to timeline
    setResumo('');
    setDetalhes('');
    setActiveTab('timeline');
  };

  // Reassign collector / Update master data with audit tracking
  const handleSaveMasterChanges = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmMaster) {
      onShowToast('Apenas o Adm Master ou Suporte podem reatribuir cobradoras.');
      return;
    }

    const now = new Date();
    const formattedDate = `${now.toLocaleDateString('pt-BR')} ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    let updatedAuditLogs = [...(record.logAuditoria || [])];

    let hasChange = false;

    // Check responsible change
    if (editResponsavel !== record.responsavel) {
      hasChange = true;
      const auditResp: ItemAuditoria = {
        id: `audit-${Date.now()}-resp`,
        dataHora: formattedDate,
        usuarioNome: currentUser.nome,
        usuarioEmail: currentUser.email,
        usuarioCargo: 'Adm Master',
        tipoAcao: 'mudanca_responsavel',
        campoAlterado: 'Cobradora Responsável',
        valorAnterior: record.responsavel,
        valorNovo: editResponsavel,
        motivo: motivoReatribuicao.trim() || 'Reatribuição de carteira pelo Adm Master'
      };
      updatedAuditLogs = [auditResp, ...updatedAuditLogs];
    }

    // Check phone change
    if (editTelefone.trim() && editTelefone.trim() !== (record.telefone || '').trim()) {
      hasChange = true;
      const auditPhone: ItemAuditoria = {
        id: `audit-${Date.now()}-phone`,
        dataHora: formattedDate,
        usuarioNome: currentUser.nome,
        usuarioEmail: currentUser.email,
        usuarioCargo: currentUser.cargo || 'Adm Master',
        tipoAcao: 'edicao_dados',
        campoAlterado: 'Telefone do Devedor',
        valorAnterior: record.telefone || 'Vazio',
        valorNovo: editTelefone.trim(),
        motivo: 'Atualização cadastral de número'
      };
      updatedAuditLogs = [auditPhone, ...updatedAuditLogs];
    }

    if (!hasChange) {
      onShowToast('Nenhuma alteração detectada.');
      return;
    }

    const updatedRecord: DebtRecord = {
      ...record,
      responsavel: editResponsavel,
      telefone: editTelefone.trim() || record.telefone,
      logAuditoria: updatedAuditLogs
    };

    onUpdateRecord(updatedRecord);
    setMotivoReatribuicao('');
    onShowToast('Alterações salvas e registradas no Log de Auditoria!');
    setActiveTab('auditoria');
  };

  // Export Audit Log
  const handleExportAuditLog = () => {
    const lines = [
      `=== LOG DE AUDITORIA - CLIENTE: ${record.cliente} (MATRÍCULA #${record.matricula}) ===`,
      `Gerado em: ${new Date().toLocaleString('pt-BR')}`,
      `Adm Master / Operador: ${currentUser.nome} (${currentUser.email})`,
      `---------------------------------------------------------------------------------`,
      ...auditLogsList.map((log, i) => {
        return [
          `[${i + 1}] Data/Hora: ${log.dataHora}`,
          `    Usuário: ${log.usuarioNome} (${log.usuarioEmail} - ${log.usuarioCargo})`,
          `    Ação: ${log.tipoAcao.toUpperCase()} | Campo: ${log.campoAlterado}`,
          `    De: "${log.valorAnterior}" ➔ Para: "${log.valorNovo}"`,
          log.motivo ? `    Motivo / Justificativa: ${log.motivo}` : null,
          `---------------------------------------------------------------------------------`
        ].filter(Boolean).join('\n');
      })
    ];

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Auditoria_${record.cliente.replace(/\s+/g, '_')}_${record.matricula}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    onShowToast('Log de auditoria exportado com sucesso!');
  };

  const handleDeleteContactEntry = (contactId: string) => {
    const updatedContacts = contactsList.filter(c => c.id !== contactId);
    const updatedRecord: DebtRecord = {
      ...record,
      historicoContatos: updatedContacts,
    };
    onUpdateRecord(updatedRecord);
    onShowToast('Registro de atendimento removido.');
  };

  const handleOpenWhatsAppChat = () => {
    const url = buildDirectWhatsAppChatUrl(record.telefone || '31999999999', waMessageText);
    window.open(url, '_blank');
  };

  const getCanalBadge = (c: CanalContato) => {
    switch (c) {
      case 'whatsapp':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300"><MessageSquare className="w-3 h-3" /> WhatsApp</span>;
      case 'telefone':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300"><Phone className="w-3 h-3" /> Ligação Telefônica</span>;
      case 'email':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-300"><Mail className="w-3 h-3" /> E-mail</span>;
      case 'presencial':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300"><User className="w-3 h-3" /> Reunião / Presencial</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-300"><FileText className="w-3 h-3" /> {c}</span>;
    }
  };

  const getResultadoBadge = (res: TipoResultadoContato) => {
    switch (res) {
      case 'promessa_pagamento':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">Promessa de Pagamento</span>;
      case 'acordo_parcelamento':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-300">Acordo Fechado</span>;
      case 'boleto_enviado':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800 border border-teal-300">Boleto Enviado</span>;
      case 'sem_contato':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300">Sem Contato / Não Atendeu</span>;
      case 'recusa_pagamento':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">Recusa de Pagamento</span>;
      case 'numero_invalido':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">Número Inválido</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300">Cobrança Ativa</span>;
    }
  };

  return (
    <div 
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleAttemptClose();
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto no-print"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in-95 my-6 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
              <User className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-slate-900">
                  {record.cliente}
                </h2>
                <span className="font-mono font-bold text-xs bg-slate-200 px-2 py-0.5 rounded text-slate-800">
                  #{record.matricula}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${bucket.color}`}>
                  {days} dias ({bucket.badge})
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                <span>Cobradora: <strong>{record.responsavel}</strong></span>
                <span>•</span>
                <span>Vencimento: <strong>Dia {record.diaVencimento}</strong> (Desde {record.primeiroMesAtraso})</span>
                <span>•</span>
                <span>{contactsList.length} atendimento(s) gravado(s)</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleOpenWhatsAppChat}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
              title="Iniciar conversa no WhatsApp com este cliente"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Abrir WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={handleAttemptClose}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                !hasCompletedActivity
                  ? 'text-amber-800 bg-amber-100 hover:bg-amber-200 border border-amber-300'
                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200/60'
              }`}
              title={
                !hasCompletedActivity
                  ? 'Fechamento bloqueado: Registre a atividade completa primeiro'
                  : 'Fechar ficha do cliente'
              }
            >
              {!hasCompletedActivity ? (
                <>
                  <Lock className="w-3.5 h-3.5 text-amber-700" />
                  <span className="text-[10px] font-bold text-amber-900 hidden sm:inline">Bloqueado</span>
                </>
              ) : (
                <X className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 border-b border-slate-200 bg-white flex items-center gap-4 text-xs font-semibold shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('novo_contato')}
            className={`py-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'novo_contato'
                ? 'border-emerald-600 text-emerald-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>Registrar Novo Contato</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('timeline')}
            className={`py-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'timeline'
                ? 'border-emerald-600 text-emerald-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Histórico de Atendimentos ({contactsList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('dados')}
            className={`py-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'dados'
                ? 'border-emerald-600 text-emerald-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Ficha &amp; Informações Cadastrais</span>
          </button>

          {/* TAB 4: AUDIT LOG TAB */}
          <button
            type="button"
            onClick={() => setActiveTab('auditoria')}
            className={`py-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'auditoria'
                ? 'border-indigo-600 text-indigo-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            <span>Log de Auditoria</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              activeTab === 'auditoria' ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-800'
            }`}>
              {auditLogsList.length}
            </span>
          </button>
        </div>

        {/* Status da Política Operacional: Bloqueio de Fechamento até Registro de Atividade Completa */}
        {!hasCompletedActivity ? (
          <div className="mx-6 mt-4 p-3.5 bg-amber-50/95 border border-amber-300 rounded-xl flex items-start gap-3 shadow-2xs animate-in fade-in shrink-0">
            <div className="p-2 bg-amber-100 text-amber-900 rounded-lg shrink-0 mt-0.5 border border-amber-200">
              <Lock className="w-4 h-4 text-amber-700 animate-pulse" />
            </div>
            <div className="flex-1 text-xs">
              <div className="font-bold text-amber-950 flex items-center gap-2 flex-wrap">
                <span>Ficha de Atendimento em Andamento</span>
                <span className="px-2 py-0.5 bg-amber-200 text-amber-950 font-extrabold rounded text-[10px] uppercase tracking-wide border border-amber-300">
                  Fechamento Bloqueado
                </span>
              </div>
              <p className="text-amber-900 mt-1 leading-relaxed">
                Pela política operacional do sistema, este cliente <strong>só poderá ser fechado após o registro de atividade completa</strong>. Selecione o canal utilizado, o resultado da ocorrência e informe o resumo do contato para concluir o atendimento.
              </p>
              {showActivityBlockAlert && (
                <div className="mt-2.5 p-2.5 bg-rose-50 border border-rose-300 rounded-lg text-rose-900 font-semibold text-[11px] flex items-center gap-2 animate-in fade-in">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Atenção: Fechamento impedido! É obrigatório registrar a atividade completa antes de fechar a ficha do cliente.</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="mx-6 mt-4 p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs animate-in fade-in shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 text-emerald-800 rounded-lg shrink-0 border border-emerald-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
              </div>
              <div className="text-xs">
                <div className="font-bold text-emerald-950 flex items-center gap-2">
                  <span>Atividade Completa Registrada!</span>
                  <span className="px-2 py-0.5 bg-emerald-200 text-emerald-900 font-extrabold rounded text-[10px] uppercase tracking-wide border border-emerald-300">
                    Fechamento Liberado
                  </span>
                </div>
                <p className="text-emerald-800 mt-0.5">
                  A ocorrência foi gravada com sucesso no histórico e na auditoria deste cliente.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold shadow-xs transition-colors shrink-0 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Concluir e Fechar Atendimento</span>
            </button>
          </div>
        )}

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">

          {/* TAB 1: NEW CONTACT ENTRY FORM */}
          {activeTab === 'novo_contato' && (
            <form onSubmit={handleSaveContact} className="space-y-4">
              
              <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-3.5 flex items-center justify-between text-xs text-emerald-950">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-emerald-700" />
                  <span>Atendimento registrado por: <strong>{currentUser.nome}</strong> ({currentUser.cargo || currentUser.role})</span>
                </div>
                <span className="text-[11px] text-emerald-800 bg-emerald-200/60 px-2 py-0.5 rounded font-mono">
                  Hoje: {new Date().toLocaleDateString('pt-BR')}
                </span>
              </div>

              {/* Sugestão de Resposta IA (Gemini) Card & Button */}
              <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-xl p-4 text-white border border-indigo-700/50 shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-amber-400/20 text-amber-300 flex items-center justify-center shrink-0 border border-amber-400/30">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>Sugestão de Resposta IA (Gemini)</span>
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-amber-400 text-slate-950 uppercase">
                          Inteligência de Cobrança
                        </span>
                      </h4>
                      <p className="text-[11px] text-indigo-200">
                        Analisa as últimas interações e recomenda o melhor argumento de venda para a próxima etapa da cobrança
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleFetchAiSuggestion}
                    disabled={isLoadingAi}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-amber-400 to-amber-300 hover:from-amber-300 hover:to-amber-200 text-slate-950 font-bold rounded-lg text-xs transition-all shadow-xs shrink-0 cursor-pointer disabled:opacity-50"
                  >
                    {isLoadingAi ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
                        <span>Analisando Histórico...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-slate-950" />
                        <span>Sugestão de Resposta IA</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Display AI Suggestion when present */}
                {aiSuggestion && showAiSuggestionBox && (
                  <div className="bg-slate-800/90 border border-indigo-500/40 rounded-lg p-3.5 space-y-3 text-xs animate-in fade-in">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                      <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-700">
                        <span className="text-slate-400 font-semibold block text-[10px] uppercase">🎯 Argumento de Venda Recomendado:</span>
                        <span className="text-amber-300 font-bold text-xs">{aiSuggestion.argumentoVenda}</span>
                      </div>
                      <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-700">
                        <span className="text-slate-400 font-semibold block text-[10px] uppercase">⚡ Próximo Passo Estratégico:</span>
                        <span className="text-emerald-400 font-bold text-xs">{aiSuggestion.proximoPassoRecomendado}</span>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] text-slate-300">
                        <span>Texto de Abordagem Sugerido (Tom: <strong>{aiSuggestion.tomAbordagem}</strong>):</span>
                        <span className="text-indigo-300 font-mono text-[10px]">Gatilho: {aiSuggestion.gatilhoPsicologico}</span>
                      </div>
                      <div className="p-3 bg-slate-950 rounded-lg border border-indigo-900 text-slate-100 font-sans leading-relaxed text-xs">
                        "{aiSuggestion.sugestaoTexto}"
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1 flex-wrap">
                      <button
                        type="button"
                        onClick={handleApplyAiSuggestion}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer shadow-xs"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Aplicar no Formulário &amp; WhatsApp</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCopyText(aiSuggestion.sugestaoTexto)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold rounded-lg text-xs transition-colors cursor-pointer"
                      >
                        {copiedText ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedText ? 'Texto Copiado!' : 'Copiar Texto'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowAiSuggestionBox(false)}
                        className="text-slate-400 hover:text-slate-200 text-xs ml-auto cursor-pointer"
                      >
                        Ocultar Sugestão
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 text-xs">
                
                {/* Canal Utilizado */}
                <div>
                  <label className="block text-slate-800 font-bold mb-1.5">
                    Canal Utilizado:
                  </label>
                  <select
                    value={canal}
                    onChange={(e) => setCanal(e.target.value as CanalContato)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  >
                    <option value="whatsapp">📱 WhatsApp</option>
                    <option value="telefone">📞 Ligação Telefônica</option>
                    <option value="email">✉️ E-mail</option>
                    <option value="presencial">🤝 Reunião / Presencial</option>
                    <option value="sms">💬 SMS</option>
                    <option value="outro">📋 Outro Canal</option>
                  </select>
                </div>

                {/* Resultado / Tipo de Contato */}
                <div>
                  <label className="block text-slate-800 font-bold mb-1.5">
                    Resultado da Ocorrência:
                  </label>
                  <select
                    value={tipoResultado}
                    onChange={(e) => setTipoResultado(e.target.value as TipoResultadoContato)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  >
                    <option value="cobranca_ativa">Cobrança Ativa (Aviso Geral)</option>
                    <option value="promessa_pagamento">Promessa de Pagamento</option>
                    <option value="acordo_parcelamento">Acordo Fechado / Parcelamento</option>
                    <option value="boleto_enviado">Boleto Emitido / Enviado</option>
                    <option value="sem_contato">Cliente Não Atendeu / Sem Contato</option>
                    <option value="recusa_pagamento">Recusa de Pagamento</option>
                    <option value="numero_invalido">Telefone Inválido</option>
                    <option value="renegociacao">Em Renegociação de Valores</option>
                    <option value="outro">Outro Registro</option>
                  </select>
                </div>

                {/* Atualizar Status do Cliente */}
                <div>
                  <label className="block text-slate-800 font-bold mb-1.5">
                    Atualizar Status da Cobrança:
                  </label>
                  <select
                    value={novoStatus}
                    onChange={(e) => setNovoStatus(e.target.value as StatusCobranca)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  >
                    <option value="pendente">Pendente de Contato</option>
                    <option value="em_negociacao">Em Negociação / Agendado</option>
                    <option value="acordo_fechado">Acordo Fechado</option>
                    <option value="boleto_gerado">Boleto Emitido (Fabiola)</option>
                    <option value="sem_contato">Sem Contato</option>
                    <option value="pago">Liquidado / Quitado</option>
                  </select>
                </div>

                {/* Resumo do Contato */}
                <div className="sm:col-span-2 lg:col-span-3">
                  <label className="block text-slate-800 font-bold mb-1.5">
                    Resumo do Contato (Visível na Planilha):
                  </label>
                  <input
                    type="text"
                    required
                    value={resumo}
                    onChange={(e) => setResumo(e.target.value)}
                    placeholder="Ex: Cliente atendeu, pediu desconto de juros e prometeu quitar na sexta"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>

                {/* Conditional Accord Fields */}
                {(tipoResultado === 'promessa_pagamento' || tipoResultado === 'acordo_parcelamento' || novoStatus === 'acordo_fechado') && (
                  <>
                    <div>
                      <label className="block text-slate-800 font-bold mb-1.5 flex items-center gap-1">
                        <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Valor Prometido / Acordo (R$):</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={valorPrometido}
                        onChange={(e) => setValorPrometido(e.target.value)}
                        placeholder="Ex: 150.00"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-800 font-bold mb-1.5 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Data da Promessa de Pagamento:</span>
                      </label>
                      <input
                        type="date"
                        value={dataPromessa}
                        onChange={(e) => setDataPromessa(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                      />
                    </div>
                  </>
                )}

                {/* Próximo Retorno Agendado */}
                <div>
                  <label className="block text-slate-800 font-bold mb-1.5 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    <span>Data de Retorno / Próximo Contato:</span>
                  </label>
                  <input
                    type="text"
                    value={dataRetornoAgendado}
                    onChange={(e) => setDataRetornoAgendado(e.target.value)}
                    placeholder="Ex: 24/09 ou 10/10/2025"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                  />
                </div>

                {/* Telefone do Cliente */}
                <div>
                  <label className="block text-slate-800 font-bold mb-1.5 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-blue-600" />
                    <span>Telefone de Contato do Cliente:</span>
                  </label>
                  <input
                    type="text"
                    value={editTelefone}
                    onChange={(e) => setEditTelefone(e.target.value)}
                    placeholder="(31) 98765-4321"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                  />
                </div>

                {/* Detalhes completados */}
                <div className="sm:col-span-2 lg:col-span-3">
                  <label className="block text-slate-800 font-bold mb-1.5">
                    Observações Detalhadas do Atendimento:
                  </label>
                  <textarea
                    rows={3}
                    value={detalhes}
                    onChange={(e) => setDetalhes(e.target.value)}
                    placeholder="Descreva o teor da conversa, justificativas do devedor, propostas de parcelamento ou acordos combinados..."
                    className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>

              </div>

              {/* Simultaneous WhatsApp Option */}
              {canal === 'whatsapp' && (
                <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-emerald-950">
                    <input
                      type="checkbox"
                      checked={sendWhatsAppSimultaneously}
                      onChange={(e) => setSendWhatsAppSimultaneously(e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Disparar mensagem no WhatsApp Web simultaneamente ao salvar</span>
                  </label>

                  {sendWhatsAppSimultaneously && (
                    <div className="pl-6">
                      <input
                        type="text"
                        value={waMessageText}
                        onChange={(e) => setWaMessageText(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs text-slate-800 focus:outline-hidden"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Submit Buttons */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={handleAttemptClose}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer flex items-center gap-1.5 ${
                    !hasCompletedActivity
                      ? 'bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                  title={!hasCompletedActivity ? 'Registro de atividade obrigatório antes de fechar' : 'Fechar ficha'}
                >
                  {!hasCompletedActivity && <Lock className="w-3.5 h-3.5 text-amber-700" />}
                  <span>{!hasCompletedActivity ? 'Fechar (Requer Atividade)' : 'Fechar'}</span>
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Salvar Registro de Atendimento</span>
                </button>
              </div>

            </form>
          )}

          {/* TAB 2: TIMELINE / HISTORY OF CONTACTS */}
          {activeTab === 'timeline' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Linha do Tempo de Atendimentos &amp; Cobranças
                  </h3>
                  <p className="text-xs text-slate-500">
                    Histórico cronológico de todas as tentativas e negociações registradas para este cliente
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab('novo_contato')}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Registrar Contato</span>
                </button>
              </div>

              {contactsList.length > 0 ? (
                <div className="relative pl-6 border-l-2 border-emerald-200 space-y-4 my-2">
                  {contactsList.map((contact, index) => (
                    <div 
                      key={contact.id || index}
                      className="relative bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2 group hover:bg-white hover:border-emerald-300 transition-all"
                    >
                      {/* Timeline dot */}
                      <span className="absolute -left-[31px] top-4 w-3.5 h-3.5 rounded-full bg-emerald-600 border-2 border-white shadow-xs" />

                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          {getCanalBadge(contact.canal)}
                          {getResultadoBadge(contact.tipoResultado)}
                          <span className="text-[11px] font-bold text-slate-800">
                            {contact.operadorNome}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-400 font-mono">
                            {contact.dataHora}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeleteContactEntry(contact.id)}
                            className="text-slate-300 hover:text-rose-600 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Excluir este registro"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <p className="text-xs font-medium text-slate-900 leading-relaxed">
                        {contact.resumo}
                      </p>

                      {contact.detalhes && (
                        <p className="text-[11px] text-slate-600 bg-white/80 p-2.5 rounded-lg border border-slate-200/80 leading-relaxed">
                          {contact.detalhes}
                        </p>
                      )}

                      {(contact.valorPrometido || contact.dataPromessa || contact.dataRetornoAgendado) && (
                        <div className="flex items-center gap-3 text-[11px] font-semibold pt-1 border-t border-slate-200/60 flex-wrap">
                          {contact.valorPrometido && (
                            <span className="text-emerald-700 flex items-center gap-1">
                              <DollarSign className="w-3 h-3" />
                              <span>Valor: R$ {contact.valorPrometido.toFixed(2)}</span>
                            </span>
                          )}
                          {contact.dataPromessa && (
                            <span className="text-indigo-700 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              <span>Promessa: {contact.dataPromessa}</span>
                            </span>
                          )}
                          {contact.dataRetornoAgendado && (
                            <span className="text-amber-800 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>Retorno: {contact.dataRetornoAgendado}</span>
                            </span>
                          )}
                        </div>
                      )}

                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 text-slate-500 space-y-3">
                  <History className="w-10 h-10 text-slate-300 mx-auto" />
                  <div>
                    <h4 className="font-bold text-slate-800 text-xs">Nenhum histórico de atendimento detalhado ainda</h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Informações existentes da planilha: <em>{record.informacao || 'Nenhuma anotação prévia.'}</em>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('novo_contato')}
                    className="inline-flex items-center gap-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar Primeiro Atendimento</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CUSTOMER SHEET RECORD DATA */}
          {activeTab === 'dados' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                    Dados de Cobrança da Planilha
                  </h4>
                  <div className="space-y-1.5 text-slate-600">
                    <div className="flex justify-between">
                      <span>Cliente:</span>
                      <strong className="text-slate-900">{record.cliente}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Matrícula:</span>
                      <strong className="font-mono text-slate-900">#{record.matricula}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Cobradora Responsável:</span>
                      <strong className="text-slate-900">{record.responsavel}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Aba de Origem:</span>
                      <strong className="text-slate-900">{record.abaOrigem || 'Geral'}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>1º Mês de Atraso:</span>
                      <strong className="text-rose-700">{record.primeiroMesAtraso}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Dia de Vencimento:</span>
                      <strong className="text-slate-900">Dia {record.diaVencimento}</strong>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                    Situação &amp; Status Operacional
                  </h4>
                  <div className="space-y-1.5 text-slate-600">
                    <div className="flex justify-between">
                      <span>Status da Cobrança:</span>
                      <strong className="text-slate-900 uppercase">{record.status.replace('_', ' ')}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Contato Realizado:</span>
                      <strong className="text-slate-900">{record.contatoRealizado}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Último Contato:</span>
                      <strong className="text-slate-900">{record.dataUltimoContato || 'Não registrado'}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Data de Retorno:</span>
                      <strong className="text-amber-800">{record.dataRetorno || 'Não agendado'}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Telefone Atual:</span>
                      <strong className="font-mono text-slate-900">{formatPhoneForDisplay(record.telefone)}</strong>
                    </div>
                  </div>
                </div>

                <div className="sm:col-span-2 p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                  <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                    Histórico &amp; Anotações Gerais da Planilha
                  </h4>
                  <p className="text-slate-700 leading-relaxed bg-white p-3 rounded-lg border border-slate-200 font-mono text-[11px]">
                    {record.informacao || '— Nenhuma observação prévia cadastrada —'}
                  </p>
                </div>

                {/* Adm Master / Suporte Reassignment & Master Edit Form */}
                {isAdmMaster && (
                  <form onSubmit={handleSaveMasterChanges} className="sm:col-span-2 p-4 bg-indigo-50/50 rounded-xl border border-indigo-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Crown className="w-4 h-4 text-amber-600" />
                        <h4 className="font-bold text-indigo-950 uppercase tracking-wider text-xs">
                          Reatribuição de Carteira &amp; Governança (Adm Master)
                        </h4>
                      </div>
                      <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded">
                        Registrado em Auditoria
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">
                          Reatribuir Cobradora Responsável:
                        </label>
                        <select
                          value={editResponsavel}
                          onChange={(e) => setEditResponsavel(e.target.value)}
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="ROSANA">ROSANA</option>
                          <option value="ANA LUIZA">ANA LUIZA</option>
                          <option value="KEYLLA">KEYLLA</option>
                          <option value="FABIOLA">FABIOLA</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">
                          Telefone Principal:
                        </label>
                        <input
                          type="text"
                          value={editTelefone}
                          onChange={(e) => setEditTelefone(e.target.value)}
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono text-slate-800 focus:ring-2 focus:ring-indigo-500"
                          placeholder="(31) 98765-4321"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-slate-700 font-semibold mb-1">
                          Motivo / Justificativa da Alteração (Salvo no Log de Auditoria):
                        </label>
                        <input
                          type="text"
                          value={motivoReatribuicao}
                          onChange={(e) => setMotivoReatribuicao(e.target.value)}
                          placeholder="Ex: Reatribuição de carteira por sobrecarga operacional ou solicitação da supervisão"
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="pt-2 flex justify-end">
                      <button
                        type="submit"
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-700 hover:bg-indigo-800 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-xs"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        <span>Salvar Alteração &amp; Registrar Auditoria</span>
                      </button>
                    </div>
                  </form>
                )}

              </div>
            </div>
          )}

          {/* TAB 4: AUDIT LOG TAB */}
          {activeTab === 'auditoria' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 text-white p-4 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-400/40 text-indigo-300 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-white">
                        Log de Auditoria &amp; Rastreabilidade Completa
                      </h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-slate-950 uppercase">
                        Adm Master
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-0.5">
                      Registro imutável de quem alterou o status, a cobradora responsável ou dados de contato, com data e hora
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleExportAuditLog}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white border border-slate-600 rounded-lg text-xs font-semibold transition-colors cursor-pointer shrink-0"
                >
                  <Download className="w-4 h-4 text-emerald-400" />
                  <span>Exportar Log (TXT)</span>
                </button>
              </div>

              {/* Audit Entries List */}
              <div className="space-y-3">
                {auditLogsList.map((log, index) => {
                  const isStatus = log.tipoAcao === 'mudanca_status';
                  const isResp = log.tipoAcao === 'mudanca_responsavel';
                  const isContato = log.tipoAcao === 'registro_contato';

                  return (
                    <div 
                      key={log.id || index}
                      className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 shadow-2xs transition-all space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            isStatus 
                              ? 'bg-purple-50 text-purple-800 border-purple-200'
                              : isResp
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : isContato
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-slate-100 text-slate-800 border-slate-200'
                          }`}>
                            {log.tipoAcao === 'mudanca_status' && 'Mudança de Status'}
                            {log.tipoAcao === 'mudanca_responsavel' && 'Reatribuição de Responsável'}
                            {log.tipoAcao === 'registro_contato' && 'Registro de Cobrança'}
                            {log.tipoAcao === 'edicao_dados' && 'Edição de Cadastro'}
                            {log.tipoAcao === 'reatribuicao' && 'Reatribuição'}
                            {log.tipoAcao === 'criacao' && 'Carga Inicial'}
                          </span>

                          <span className="text-xs font-bold text-slate-800">
                            {log.campoAlterado}
                          </span>
                        </div>

                        <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{log.dataHora}</span>
                        </span>
                      </div>

                      {/* Transition Comparison */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        <div>
                          <span className="text-[10px] font-semibold text-slate-400 uppercase block">Valor Anterior:</span>
                          <span className="text-slate-700 font-mono font-medium">{log.valorAnterior || '—'}</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-semibold text-slate-400 uppercase block">Valor Novo / Atualizado:</span>
                          <strong className="text-indigo-900 font-mono font-bold">{log.valorNovo}</strong>
                        </div>
                      </div>

                      {/* User Attribution & Motivo */}
                      <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100 flex-wrap gap-2">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>Alterado por: <strong className="text-slate-800">{log.usuarioNome}</strong> ({log.usuarioCargo})</span>
                          <span className="text-slate-400 font-mono text-[10px]">&lt;{log.usuarioEmail}&gt;</span>
                        </div>

                        {log.motivo && (
                          <div className="text-[11px] text-slate-600 italic">
                            Motivo: "{log.motivo}"
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500 flex items-center gap-2">
            <span>Sessão: <strong>{currentUser.nome}</strong> • {currentUser.role === 'adm_master' ? 'Visão Master' : `Carteira ${currentUser.responsavelAssociado}`}</span>
            {!hasCompletedActivity ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                <Lock className="w-3 h-3 text-amber-700 animate-pulse" /> Atividade Pendente
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Atividade Concluída
              </span>
            )}
          </div>

          {!hasCompletedActivity ? (
            <button
              type="button"
              onClick={handleAttemptClose}
              className="px-4 py-2 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
              title="A ficha só poderá ser fechada após o registro de atividade completa"
            >
              <Lock className="w-3.5 h-3.5 text-amber-700 animate-pulse" />
              <span>Fechar Ficha (Obrigatório registrar atividade)</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Concluir e Fechar Atendimento</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
