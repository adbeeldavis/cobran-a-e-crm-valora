import React, { useState, useEffect } from 'react';
import { 
  X, 
  Save, 
  Trash2, 
  Building2, 
  User, 
  Phone, 
  Mail, 
  DollarSign, 
  Calendar, 
  MapPin, 
  Briefcase, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Send, 
  MessageSquare, 
  Flame, 
  FileText, 
  PhoneCall, 
  Users, 
  TrendingUp, 
  Check 
} from 'lucide-react';
import { 
  CrmOportunidade, 
  CrmEtapaVenda, 
  CrmTemperatura, 
  CrmOrigemLead, 
  AppUser, 
  CrmAtividade 
} from '../types';
import { 
  CRM_ETAPAS_CONFIG, 
  SERVICOS_VALORA, 
  ORIGENS_LEAD_LABELS, 
  TEMPERATURA_LABELS 
} from '../utils/crmSalesService';

interface CrmDealModalProps {
  isOpen: boolean;
  onClose: () => void;
  deal: CrmOportunidade | null; // null = novo deal
  currentUser: AppUser;
  onSave: (dealData: any) => void;
  onDelete?: (dealId: string) => void;
  onAddActivity?: (dealId: string, activity: Omit<CrmAtividade, 'id' | 'data'>) => void;
  onShowToast: (msg: string) => void;
}

const AVAILABLE_RESPONSAVEIS = [
  'ROSANA',
  'ANA LUIZA',
  'KEYLLA',
  'FABIOLA',
  'PALOMA',
  'MARIANA',
  'GERAL'
];

export const CrmDealModal: React.FC<CrmDealModalProps> = ({
  isOpen,
  onClose,
  deal,
  currentUser,
  onSave,
  onDelete,
  onAddActivity,
  onShowToast
}) => {
  const [activeTab, setActiveTab] = useState<'dados' | 'servicos' | 'historico'>('dados');
  
  // Form fields
  const [titulo, setTitulo] = useState('');
  const [cliente, setCliente] = useState('');
  const [documento, setDocumento] = useState('');
  const [contatoNome, setContatoNome] = useState('');
  const [contatoCargo, setContatoCargo] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [cidadeUf, setCidadeUf] = useState('');
  const [valor, setValor] = useState<number>(0);
  const [valorMensal, setValorMensal] = useState<number>(0);
  const [etapa, setEtapa] = useState<CrmEtapaVenda>('prospeccao');
  const [probabilidade, setProbabilidade] = useState<number>(20);
  const [temperatura, setTemperatura] = useState<CrmTemperatura>('quente');
  const [origem, setOrigem] = useState<CrmOrigemLead>('indicacao');
  const [responsavel, setResponsavel] = useState('ROSANA');
  const [previsaoFechamento, setPrevisaoFechamento] = useState('');
  const [servicosInteresse, setServicosInteresse] = useState<string[]>([]);
  const [proximaAcao, setProximaAcao] = useState('');
  const [dataProximaAcao, setDataProximaAcao] = useState('');
  const [motivoPerda, setMotivoPerda] = useState('');
  const [observacoes, setObservacoes] = useState('');

  // New activity form
  const [novaAtividadeTipo, setNovaAtividadeTipo] = useState<CrmAtividade['tipo']>('ligacao');
  const [novaAtividadeDescricao, setNovaAtividadeDescricao] = useState('');

  // WhatsApp template selector
  const [showWaTemplates, setShowWaTemplates] = useState(false);

  useEffect(() => {
    if (deal) {
      setTitulo(deal.titulo || '');
      setCliente(deal.cliente || '');
      setDocumento(deal.documento || '');
      setContatoNome(deal.contatoNome || '');
      setContatoCargo(deal.contatoCargo || '');
      setTelefone(deal.telefone || '');
      setEmail(deal.email || '');
      setCidadeUf(deal.cidadeUf || '');
      setValor(deal.valor || 0);
      setValorMensal(deal.valorMensal || 0);
      setEtapa(deal.etapa || 'prospeccao');
      setProbabilidade(deal.probabilidade !== undefined ? deal.probabilidade : 20);
      setTemperatura(deal.temperatura || 'quente');
      setOrigem(deal.origem || 'indicacao');
      setResponsavel(deal.responsavel || currentUser.responsavelAssociado || 'ROSANA');
      setPrevisaoFechamento(deal.previsaoFechamento || '');
      setServicosInteresse(deal.servicosInteresse || []);
      setProximaAcao(deal.proximaAcao || '');
      setDataProximaAcao(deal.dataProximaAcao || '');
      setMotivoPerda(deal.motivoPerda || '');
      setObservacoes(deal.observacoes || '');
    } else {
      // Defaults for new deal
      const defaultResp = currentUser.responsavelAssociado || 'ROSANA';
      setTitulo('');
      setCliente('');
      setDocumento('');
      setContatoNome('');
      setContatoCargo('');
      setTelefone('');
      setEmail('');
      setCidadeUf('');
      setValor(15000);
      setValorMensal(1500);
      setEtapa('prospeccao');
      setProbabilidade(20);
      setTemperatura('quente');
      setOrigem('indicacao');
      setResponsavel(defaultResp);
      
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      setPrevisaoFechamento(futureDate.toISOString().slice(0, 10));
      
      const nextActionDate = new Date();
      nextActionDate.setDate(nextActionDate.getDate() + 3);
      setDataProximaAcao(nextActionDate.toISOString().slice(0, 10));
      
      setServicosInteresse(['Gestão Completa de Inadimplência', 'Recuperação Ativa de Ativos']);
      setProximaAcao('Realizar contato inicial e agendar reunião de diagnóstico');
      setMotivoPerda('');
      setObservacoes('');
      setActiveTab('dados');
    }
  }, [deal, currentUser, isOpen]);

  if (!isOpen) return null;

  const handleStageChange = (newStage: CrmEtapaVenda) => {
    setEtapa(newStage);
    const targetConfig = CRM_ETAPAS_CONFIG.find(c => c.id === newStage);
    if (targetConfig) {
      setProbabilidade(targetConfig.probabilidadePadrao);
    }
  };

  const toggleServico = (servico: string) => {
    if (servicosInteresse.includes(servico)) {
      setServicosInteresse(servicosInteresse.filter(s => s !== servico));
    } else {
      setServicosInteresse([...servicosInteresse, servico]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cliente.trim()) {
      alert('Por favor, informe o nome do cliente ou empresa.');
      return;
    }
    if (!titulo.trim()) {
      alert('Por favor, informe o título da oportunidade.');
      return;
    }

    const payload = {
      titulo: titulo.trim(),
      cliente: cliente.trim(),
      documento: documento.trim(),
      contatoNome: contatoNome.trim() || cliente.trim(),
      contatoCargo: contatoCargo.trim(),
      telefone: telefone.replace(/\D/g, ''),
      email: email.trim(),
      cidadeUf: cidadeUf.trim(),
      valor: Number(valor) || 0,
      valorMensal: Number(valorMensal) || 0,
      etapa,
      probabilidade: Number(probabilidade) || 0,
      temperatura,
      origem,
      responsavel,
      previsaoFechamento,
      servicosInteresse,
      proximaAcao: proximaAcao.trim(),
      dataProximaAcao,
      motivoPerda: etapa === 'perdido' ? motivoPerda.trim() : undefined,
      observacoes: observacoes.trim()
    };

    onSave(payload);
    onClose();
  };

  const handleAddActivitySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deal || !novaAtividadeDescricao.trim()) return;

    if (onAddActivity) {
      onAddActivity(deal.id, {
        autor: currentUser.nome || 'Vendedor',
        tipo: novaAtividadeTipo,
        descricao: novaAtividadeDescricao.trim()
      });
      setNovaAtividadeDescricao('');
      onShowToast('Atividade comercial registrada com sucesso!');
    }
  };

  const handleLaunchWhatsApp = (templateType: 'apresentacao' | 'proposta' | 'followup' | 'fechamento') => {
    const rawPhone = (telefone || '').replace(/\D/g, '');
    if (!rawPhone || rawPhone.length < 10) {
      alert('Por favor, informe um número de telefone/WhatsApp válido.');
      return;
    }

    const cleanedPhone = rawPhone.length === 11 || rawPhone.length === 10 ? `55${rawPhone}` : rawPhone;
    const nomeContato = contatoNome || cliente || 'Gestor(a)';
    const vendedorNome = currentUser.nome.split(' ')[0] || responsavel;

    let msg = '';
    if (templateType === 'apresentacao') {
      msg = `Olá ${nomeContato}, tudo bem? Aqui é ${vendedorNome} da *Valora Gestão & Recuperação de Ativos*. Gostaria de apresentar como ajudamos empresas a recuperar clientes inadimplentes e otimizar o fluxo de caixa com abordagem humanizada e alta eficiência. Teria 10 minutinhos para conversarmos hoje?`;
    } else if (templateType === 'proposta') {
      msg = `Olá ${nomeContato}! Conforme conversamos, elaborei nossa proposta comercial personalizada da Valora para a gestão e recuperação de carteira da *${cliente}*. Seguem os termos com foco em alta rentabilidade e remuneração pelo êxito. Podemos revisar juntos?`;
    } else if (templateType === 'followup') {
      msg = `Olá ${nomeContato}, bom dia! Passando para saber se você conseguiu avaliar a proposta da *Valora Gestão* que enviamos na semana passada. Ficou alguma dúvida sobre nosso fluxo de cobrança e prestação de contas?`;
    } else if (templateType === 'fechamento') {
      msg = `Olá ${nomeContato}! Estamos finalizando as minutas contratuais desta semana na *Valora*. Conseguimos manter as condições especiais que alinhamos para fecharmos o contrato hoje? Fico no seu aguardo!`;
    }

    const url = `https://wa.me/${cleanedPhone}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
    setShowWaTemplates(false);

    // Auto-log WhatsApp activity if editing existing deal
    if (deal && onAddActivity) {
      onAddActivity(deal.id, {
        autor: currentUser.nome || 'Vendedora',
        tipo: 'whatsapp',
        descricao: `Mensagem via WhatsApp enviada (${templateType}): "${msg.slice(0, 80)}..."`
      });
    }
    onShowToast(`WhatsApp aberto para ${contatoNome || cliente}!`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] my-auto">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold shadow-md shadow-blue-500/30">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
                {deal ? 'Editar Oportunidade de Venda' : 'Nova Oportunidade Comercial'}
                {deal && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${CRM_ETAPAS_CONFIG.find(e => e.id === deal.etapa)?.corBadge}`}>
                    {CRM_ETAPAS_CONFIG.find(e => e.id === deal.etapa)?.nome}
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-300">
                {deal ? `${deal.cliente} • Criado em ${new Date(deal.dataCriacao).toLocaleDateString('pt-BR')}` : 'Cadastre um novo lead ou proposta no funil comercial da Valora'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {deal && (
              <div className="relative">
                <button
                  type="button"
                  id="crm-modal-btn-whatsapp"
                  onClick={() => setShowWaTemplates(!showWaTemplates)}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
                  title="Abrir WhatsApp com templates de vendas"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </button>

                {showWaTemplates && (
                  <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 p-2 z-60 text-slate-800">
                    <span className="text-[10px] font-bold uppercase text-slate-400 px-2 block mb-1">
                      Mensagens Rápidas de Vendas
                    </span>
                    <button
                      type="button"
                      onClick={() => handleLaunchWhatsApp('apresentacao')}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs hover:bg-blue-50 hover:text-blue-700 transition-colors block"
                    >
                      🤝 1. Apresentação &amp; Diagnóstico
                    </button>
                    <button
                      type="button"
                      onClick={() => handleLaunchWhatsApp('proposta')}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs hover:bg-amber-50 hover:text-amber-700 transition-colors block"
                    >
                      📄 2. Envio de Proposta Comercial
                    </button>
                    <button
                      type="button"
                      onClick={() => handleLaunchWhatsApp('followup')}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs hover:bg-purple-50 hover:text-purple-700 transition-colors block"
                    >
                      ⏳ 3. Follow-up de Negociação
                    </button>
                    <button
                      type="button"
                      onClick={() => handleLaunchWhatsApp('fechamento')}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs hover:bg-emerald-50 hover:text-emerald-700 font-bold transition-colors block"
                    >
                      🎉 4. Fechamento de Contrato
                    </button>
                  </div>
                )}
              </div>
            )}

            <button
              type="button"
              id="crm-modal-btn-fechar"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Stage Fast Advance Bar (Kanban Pipeline Stepper) */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-2.5 overflow-x-auto shrink-0">
          <div className="flex items-center gap-1.5 min-w-[620px]">
            {CRM_ETAPAS_CONFIG.map((cfg) => {
              const isActive = etapa === cfg.id;
              return (
                <button
                  key={cfg.id}
                  type="button"
                  onClick={() => handleStageChange(cfg.id)}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 border ${
                    isActive 
                      ? 'bg-blue-600 text-white border-blue-700 shadow-xs' 
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  {isActive && <Check className="w-3 h-3 text-white" />}
                  <span>{cfg.nome}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Modal Tabs Header */}
        <div className="flex items-center px-6 border-b border-slate-200 bg-white gap-4 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('dados')}
            className={`py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'dados'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Dados da Oportunidade</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('servicos')}
            className={`py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'servicos'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>Serviços &amp; Proposta ({servicosInteresse.length})</span>
          </button>

          {deal && (
            <button
              type="button"
              onClick={() => setActiveTab('historico')}
              className={`py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                activeTab === 'historico'
                  ? 'border-blue-600 text-blue-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Histórico &amp; Interações ({(deal.historico || []).length})</span>
            </button>
          )}
        </div>

        {/* Scrollable Content Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'dados' && (
            <div className="space-y-5">
              {/* Etapa Warning or Won Celebration */}
              {etapa === 'ganho' && (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div className="text-xs">
                    <strong className="block font-bold">🎉 Venda Ganha / Contrato Fechado!</strong>
                    <span>Esta oportunidade entrará para o faturamento comercial e comissão da vendedora {responsavel}.</span>
                  </div>
                </div>
              )}

              {etapa === 'perdido' && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold">
                    <AlertCircle className="w-4 h-4 text-rose-600" />
                    <span>Oportunidade Perdida / Desqualificada</span>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-rose-800 mb-1">
                      Motivo da Perda (obrigatório para análise comercial):
                    </label>
                    <input
                      type="text"
                      value={motivoPerda}
                      onChange={e => setMotivoPerda(e.target.value)}
                      placeholder="Ex: Optou por concorrente X, equipe interna, sem orçamento no momento..."
                      className="w-full px-3 py-1.5 rounded-lg border border-rose-300 bg-white text-xs text-slate-800 focus:ring-2 focus:ring-rose-500"
                    />
                  </div>
                </div>
              )}

              {/* Linha 1: Título e Empresa */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Título da Oportunidade <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={titulo}
                    onChange={e => setTitulo(e.target.value)}
                    placeholder="Ex: Gestão de Inadimplência - Clínica Odonto"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Cliente / Nome Fantasia ou Razão Social <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={cliente}
                    onChange={e => setCliente(e.target.value)}
                    placeholder="Ex: OdontoMais Clínicas Ltda"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Linha 2: Contato, Cargo e Documento */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Pessoa de Contato
                  </label>
                  <div className="relative">
                    <User className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      value={contatoNome}
                      onChange={e => setContatoNome(e.target.value)}
                      placeholder="Nome do tomador de decisão"
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Cargo / Função
                  </label>
                  <input
                    type="text"
                    value={contatoCargo}
                    onChange={e => setContatoCargo(e.target.value)}
                    placeholder="Ex: Diretor Financeiro, Sócio"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    CNPJ ou CPF
                  </label>
                  <input
                    type="text"
                    value={documento}
                    onChange={e => setDocumento(e.target.value)}
                    placeholder="00.000.000/0001-00"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-600 focus:outline-hidden font-mono"
                  />
                </div>
              </div>

              {/* Linha 3: Telefone / WhatsApp, Email e Localização */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    WhatsApp / Telefone <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={telefone}
                      onChange={e => setTelefone(e.target.value)}
                      placeholder="31999998888"
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-600 focus:outline-hidden font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    E-mail Comercial
                  </label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="financeiro@empresa.com.br"
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Cidade / UF
                  </label>
                  <div className="relative">
                    <MapPin className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      value={cidadeUf}
                      onChange={e => setCidadeUf(e.target.value)}
                      placeholder="Belo Horizonte / MG"
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Linha 4: Valores e Probabilidade */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Valor do Negócio (R$)
                  </label>
                  <div className="relative">
                    <DollarSign className="w-3.5 h-3.5 absolute left-3 top-3 text-emerald-600" />
                    <input
                      type="number"
                      step="100"
                      min="0"
                      value={valor}
                      onChange={e => setValor(parseFloat(e.target.value) || 0)}
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 block">Valor total ou anual</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Mensalidade Recorrente (R$)
                  </label>
                  <div className="relative">
                    <DollarSign className="w-3.5 h-3.5 absolute left-3 top-3 text-blue-600" />
                    <input
                      type="number"
                      step="50"
                      min="0"
                      value={valorMensal}
                      onChange={e => setValorMensal(parseFloat(e.target.value) || 0)}
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 block">Fee fixo mensal (se houver)</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Probabilidade: {probabilidade}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={probabilidade}
                    onChange={e => setProbabilidade(parseInt(e.target.value, 10))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 mt-2"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                    <span>0%</span>
                    <span>50%</span>
                    <span>100%</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Previsão de Fechamento
                  </label>
                  <div className="relative">
                    <Calendar className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="date"
                      value={previsaoFechamento}
                      onChange={e => setPrevisaoFechamento(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Linha 5: Responsável, Origem e Temperatura */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Vendedora / Responsável
                  </label>
                  <select
                    value={responsavel}
                    onChange={e => setResponsavel(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-600 focus:outline-hidden bg-white"
                  >
                    {AVAILABLE_RESPONSAVEIS.map(resp => (
                      <option key={resp} value={resp}>{resp}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Origem do Lead
                  </label>
                  <select
                    value={origem}
                    onChange={e => setOrigem(e.target.value as CrmOrigemLead)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:ring-2 focus:ring-blue-600 focus:outline-hidden bg-white"
                  >
                    {Object.entries(ORIGENS_LEAD_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Temperatura do Negócio
                  </label>
                  <div className="flex items-center gap-2">
                    {(['quente', 'morno', 'frio'] as CrmTemperatura[]).map(temp => {
                      const isSelected = temperatura === temp;
                      const conf = TEMPERATURA_LABELS[temp];
                      return (
                        <button
                          key={temp}
                          type="button"
                          onClick={() => setTemperatura(temp)}
                          className={`flex-1 py-2 px-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1 ${
                            isSelected 
                              ? `${conf.bg} ${conf.text} ring-2 ring-blue-500` 
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <span>{conf.icon}</span>
                          <span className="capitalize">{temp}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Linha 6: Próxima Ação e Data */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-3.5 rounded-xl bg-blue-50/50 border border-blue-100">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-blue-900 mb-1">
                    Próxima Ação Comercial
                  </label>
                  <input
                    type="text"
                    value={proximaAcao}
                    onChange={e => setProximaAcao(e.target.value)}
                    placeholder="Ex: Enviar minuta contratual com percentual revisado"
                    className="w-full px-3 py-2 rounded-xl border border-blue-200 bg-white text-xs focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-blue-900 mb-1">
                    Data da Próxima Ação
                  </label>
                  <input
                    type="date"
                    value={dataProximaAcao}
                    onChange={e => setDataProximaAcao(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-blue-200 bg-white text-xs focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Observações */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Observações &amp; Notas de Negociação
                </label>
                <textarea
                  rows={3}
                  value={observacoes}
                  onChange={e => setObservacoes(e.target.value)}
                  placeholder="Informações adicionais sobre o volume da carteira, expectativas do cliente, concorrentes..."
                  className="w-full p-3 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-600 focus:outline-hidden resize-none"
                />
              </div>
            </div>
          )}

          {activeTab === 'servicos' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Serviços de Interesse da Valora</h3>
                <p className="text-xs text-slate-500">
                  Marque os módulos e soluções que estão sendo apresentados nesta oportunidade:
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {SERVICOS_VALORA.map(servico => {
                  const isChecked = servicosInteresse.includes(servico);
                  return (
                    <div
                      key={servico}
                      onClick={() => toggleServico(servico)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                        isChecked 
                          ? 'bg-blue-50/80 border-blue-300 shadow-2xs' 
                          : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-md flex items-center justify-center mt-0.5 border ${
                        isChecked ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 bg-white'
                      }`}>
                        {isChecked && <Check className="w-3.5 h-3.5" />}
                      </div>
                      <div>
                        <span className={`text-xs font-bold block ${isChecked ? 'text-blue-900' : 'text-slate-800'}`}>
                          {servico}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {servico.includes('Inadimplência') && 'Recuperação com régua multicanal e acionamentos massivos.'}
                          {servico.includes('Ativa') && 'Operação de discagem e atendimento humano especializado.'}
                          {servico.includes('Preventiva') && 'Avisos e boletos antes do vencimento para evitar atraso.'}
                          {servico.includes('BPO') && 'Terceirização da conciliação e faturamento do cliente.'}
                          {servico.includes('Auditoria') && 'Higienização e enriquecimento cadastral de devedores.'}
                          {servico.includes('Consultoria') && 'Desenvolvimento de políticas de concessão e limites.'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'historico' && deal && (
            <div className="space-y-6">
              {/* Add Activity Box */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-600" />
                  <span>Registrar Nova Interação / Contato</span>
                </span>

                <div className="flex flex-wrap items-center gap-2">
                  {[
                    { tipo: 'ligacao', label: 'Ligação', icon: PhoneCall },
                    { tipo: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
                    { tipo: 'reuniao', label: 'Reunião', icon: Users },
                    { tipo: 'proposta', label: 'Proposta', icon: FileText },
                    { tipo: 'nota', label: 'Nota Interna', icon: FileText }
                  ].map(act => {
                    const Icon = act.icon;
                    const isSelected = novaAtividadeTipo === act.tipo;
                    return (
                      <button
                        key={act.tipo}
                        type="button"
                        onClick={() => setNovaAtividadeTipo(act.tipo as any)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 border transition-all ${
                          isSelected 
                            ? 'bg-blue-600 text-white border-blue-600 shadow-2xs' 
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <Icon className="w-3 h-3" />
                        <span>{act.label}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={novaAtividadeDescricao}
                    onChange={e => setNovaAtividadeDescricao(e.target.value)}
                    placeholder="Descreva o que foi conversado ou alinhado com o cliente..."
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={handleAddActivitySubmit}
                    disabled={!novaAtividadeDescricao.trim()}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Registrar</span>
                  </button>
                </div>
              </div>

              {/* Activity Timeline List */}
              <div className="space-y-3">
                <span className="text-xs font-bold text-slate-700 block">
                  Linha do Tempo Comercial ({(deal.historico || []).length} registros)
                </span>

                {(deal.historico || []).length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center">
                    Nenhuma atividade registrada ainda nesta oportunidade.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {(deal.historico || []).map((item) => (
                      <div key={item.id} className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs text-xs flex items-start gap-3">
                        <div className={`p-2 rounded-lg shrink-0 ${
                          item.tipo === 'mudanca_etapa' ? 'bg-purple-100 text-purple-700' :
                          item.tipo === 'whatsapp' ? 'bg-emerald-100 text-emerald-700' :
                          item.tipo === 'ligacao' ? 'bg-blue-100 text-blue-700' :
                          item.tipo === 'proposta' ? 'bg-amber-100 text-amber-700' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {item.tipo === 'whatsapp' ? <MessageSquare className="w-3.5 h-3.5" /> :
                           item.tipo === 'ligacao' ? <PhoneCall className="w-3.5 h-3.5" /> :
                           item.tipo === 'reuniao' ? <Users className="w-3.5 h-3.5" /> :
                           item.tipo === 'proposta' ? <FileText className="w-3.5 h-3.5" /> :
                           item.tipo === 'mudanca_etapa' ? <TrendingUp className="w-3.5 h-3.5" /> :
                           <FileText className="w-3.5 h-3.5" />}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="font-bold text-slate-800">
                              {item.autor}
                              <span className="font-normal text-slate-400 text-[11px] ml-1.5 capitalize">
                                ({item.tipo.replace('_', ' ')})
                              </span>
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {new Date(item.data).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                            </span>
                          </div>
                          <p className="text-slate-600 text-[11px] whitespace-pre-wrap leading-relaxed">
                            {item.descricao}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Modal Footer */}
          <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div>
              {deal && onDelete && (
                <button
                  type="button"
                  id="crm-modal-btn-excluir"
                  onClick={() => {
                    if (confirm(`Deseja realmente remover a oportunidade "${deal.titulo}"?`)) {
                      onDelete(deal.id);
                      onClose();
                    }
                  }}
                  className="px-3.5 py-2 rounded-xl text-rose-600 hover:bg-rose-50 text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Excluir Oportunidade</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-all"
              >
                Cancelar
              </button>

              <button
                type="submit"
                id="crm-modal-btn-salvar"
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-md shadow-blue-500/20 active:scale-98"
              >
                <Save className="w-4 h-4" />
                <span>{deal ? 'Salvar Alterações' : 'Criar Oportunidade'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
