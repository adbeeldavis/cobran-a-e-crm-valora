import { CrmOportunidade, CrmEtapaVenda, CrmAtividade, CrmTemperatura, CrmOrigemLead } from '../types';
import * as XLSX from 'xlsx';

const CRM_STORAGE_KEY = 'valora_crm_sales_v1';

export const CRM_ETAPAS_CONFIG: Array<{
  id: CrmEtapaVenda;
  nome: string;
  descricao: string;
  probabilidadePadrao: number;
  corHeader: string;
  corBadge: string;
  corBorda: string;
}> = [
  {
    id: 'prospeccao',
    nome: 'Prospecção',
    descricao: 'Novos leads e contato inicial',
    probabilidadePadrao: 20,
    corHeader: 'bg-slate-100 text-slate-800 border-slate-300',
    corBadge: 'bg-slate-100 text-slate-700 border-slate-200',
    corBorda: 'border-slate-300'
  },
  {
    id: 'qualificacao',
    nome: 'Qualificação',
    descricao: 'Diagnóstico e levantamento de carteira',
    probabilidadePadrao: 40,
    corHeader: 'bg-blue-50 text-blue-800 border-blue-200',
    corBadge: 'bg-blue-100 text-blue-800 border-blue-200',
    corBorda: 'border-blue-300'
  },
  {
    id: 'proposta',
    nome: 'Proposta Comercial',
    descricao: 'Apresentação de valores e honorários',
    probabilidadePadrao: 60,
    corHeader: 'bg-amber-50 text-amber-800 border-amber-200',
    corBadge: 'bg-amber-100 text-amber-800 border-amber-200',
    corBorda: 'border-amber-300'
  },
  {
    id: 'negociacao',
    nome: 'Negociação & Fechamento',
    descricao: 'Ajustes contratuais e minutas',
    probabilidadePadrao: 80,
    corHeader: 'bg-purple-50 text-purple-800 border-purple-200',
    corBadge: 'bg-purple-100 text-purple-800 border-purple-200',
    corBorda: 'border-purple-300'
  },
  {
    id: 'ganho',
    nome: 'Venda Ganha',
    descricao: 'Contrato assinado & onboarding',
    probabilidadePadrao: 100,
    corHeader: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    corBadge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    corBorda: 'border-emerald-400'
  },
  {
    id: 'perdido',
    nome: 'Perdido / Desqualificado',
    descricao: 'Sem aderência ou recusado',
    probabilidadePadrao: 0,
    corHeader: 'bg-rose-50 text-rose-800 border-rose-200',
    corBadge: 'bg-rose-100 text-rose-800 border-rose-200',
    corBorda: 'border-rose-300'
  }
];

export const SERVICOS_VALORA = [
  'Gestão Completa de Inadimplência',
  'Recuperação Ativa de Ativos',
  'Cobrança Preventiva (Pré-Vencimento)',
  'BPO Financeiro & Contas a Receber',
  'Auditoria e Saneamento de Carteira',
  'Consultoria de Crédito & Cobrança'
];

export const ORIGENS_LEAD_LABELS: Record<CrmOrigemLead, string> = {
  indicacao: 'Indicação de Cliente',
  whatsapp: 'WhatsApp Direto',
  inbound_site: 'Site / Landing Page',
  prospeccao_ativa: 'Prospecção Ativa (Outbound)',
  parceria: 'Parceiro Comercial / Contábil',
  evento_network: 'Networking / Evento',
  recorrente: 'Cliente Recorrente / Expansão'
};

export const TEMPERATURA_LABELS: Record<CrmTemperatura, { label: string; bg: string; text: string; icon: string }> = {
  quente: { label: 'Quente (Alta Prioridade)', bg: 'bg-rose-100', text: 'text-rose-700 border-rose-200', icon: '🔥' },
  morno: { label: 'Morno (Acompanhar)', bg: 'bg-amber-100', text: 'text-amber-800 border-amber-200', icon: '⚡' },
  frio: { label: 'Frio (Longo Prazo)', bg: 'bg-blue-100', text: 'text-blue-800 border-blue-200', icon: '❄️' }
};

const DEFAULT_CRM_DEALS: CrmOportunidade[] = [
  {
    id: 'deal-001',
    titulo: 'Recuperação de Carteira - Rede OdontoMais',
    cliente: 'Rede OdontoMais Clínicas Ltda',
    documento: '28.910.443/0001-92',
    contatoNome: 'Dr. Roberto Meirelles',
    contatoCargo: 'Diretor Financeiro',
    telefone: '31998765432',
    email: 'financeiro@odontomaisclinicas.com.br',
    cidadeUf: 'Belo Horizonte / MG',
    valor: 48000,
    valorMensal: 3500,
    etapa: 'negociacao',
    probabilidade: 80,
    temperatura: 'quente',
    origem: 'indicacao',
    responsavel: 'ROSANA',
    previsaoFechamento: '2026-09-30',
    servicosInteresse: ['Recuperação Ativa de Ativos', 'Gestão Completa de Inadimplência'],
    proximaAcao: 'Enviar minuta revisada com cláusula de comissão sobre êxito',
    dataProximaAcao: '2026-09-24',
    observacoes: 'Cliente possui carteira de R$ 380 mil em atraso há mais de 90 dias. Excelente fit para nosso modelo de cobrança extrajudicial.',
    dataCriacao: '2026-09-02T10:30:00.000Z',
    dataAtualizacao: '2026-09-20T14:15:00.000Z',
    historico: [
      {
        id: 'act-001-1',
        data: '2026-09-02T10:30:00.000Z',
        autor: 'ROSANA',
        tipo: 'ligacao',
        descricao: 'Primeiro contato por indicação do Dr. Marcelo. Apresentado portfólio da Valora.'
      },
      {
        id: 'act-001-2',
        data: '2026-09-10T16:00:00.000Z',
        autor: 'ROSANA',
        tipo: 'proposta',
        descricao: 'Apresentação da proposta comercial formal (18% de comissão sobre recuperação).'
      },
      {
        id: 'act-001-3',
        data: '2026-09-18T11:20:00.000Z',
        autor: 'ROSANA',
        tipo: 'mudanca_etapa',
        descricao: 'Avançado para Negociação. Cliente aprovou percentual de honorários.'
      }
    ]
  },
  {
    id: 'deal-002',
    titulo: 'Gestão de Inadimplência - Colégio & Faculdade Horizonte',
    cliente: 'Instituto Educacional Horizonte',
    documento: '14.234.908/0001-15',
    contatoNome: 'Patrícia Alvarenga',
    contatoCargo: 'Gerente Administrativa',
    telefone: '31988223344',
    email: 'patricia@colegiohorizonte.edu.br',
    cidadeUf: 'Betim / MG',
    valor: 36000,
    valorMensal: 2800,
    etapa: 'proposta',
    probabilidade: 60,
    temperatura: 'quente',
    origem: 'whatsapp',
    responsavel: 'ANA LUIZA',
    previsaoFechamento: '2026-10-05',
    servicosInteresse: ['Cobrança Preventiva (Pré-Vencimento)', 'Gestão Completa de Inadimplência'],
    proximaAcao: 'Reunião online com conselho pedagógico e diretoria financeira',
    dataProximaAcao: '2026-09-25',
    observacoes: 'Foco na cobrança humanizada para reter alunos e manter matrículas 2027 abertas.',
    dataCriacao: '2026-09-05T09:00:00.000Z',
    dataAtualizacao: '2026-09-19T17:00:00.000Z',
    historico: [
      {
        id: 'act-002-1',
        data: '2026-09-05T09:00:00.000Z',
        autor: 'ANA LUIZA',
        tipo: 'whatsapp',
        descricao: 'Lead chamou no WhatsApp da Valora solicitando tabela de recuperação escolar.'
      },
      {
        id: 'act-002-2',
        data: '2026-09-14T14:30:00.000Z',
        autor: 'ANA LUIZA',
        tipo: 'reuniao',
        descricao: 'Reunião de diagnóstico: mais de 120 mensalidades pendentes no ano letivo.'
      }
    ]
  },
  {
    id: 'deal-003',
    titulo: 'BPO Financeiro e Recuperação - Hospital São Lucas',
    cliente: 'Hospital & Maternidade São Lucas',
    documento: '04.555.666/0001-88',
    contatoNome: 'Eduardo Guimarães',
    contatoCargo: 'Diretor Geral',
    telefone: '31991234567',
    email: 'diretoria@hospitalsaolucas.com.br',
    cidadeUf: 'Contagem / MG',
    valor: 75000,
    valorMensal: 6000,
    etapa: 'ganho',
    probabilidade: 100,
    temperatura: 'quente',
    origem: 'parceria',
    responsavel: 'KEYLLA',
    previsaoFechamento: '2026-09-15',
    servicosInteresse: ['Recuperação Ativa de Ativos', 'BPO Financeiro & Contas a Receber'],
    proximaAcao: 'Onboarding operacional e recebimento do primeiro lote da base',
    dataProximaAcao: '2026-09-23',
    observacoes: 'Contrato fechado por 12 meses renováveis! Fee fixo + percentual de êxito.',
    dataCriacao: '2026-08-10T14:00:00.000Z',
    dataAtualizacao: '2026-09-15T18:00:00.000Z',
    historico: [
      {
        id: 'act-003-1',
        data: '2026-09-15T18:00:00.000Z',
        autor: 'KEYLLA',
        tipo: 'mudanca_etapa',
        descricao: '🎉 Contrato assinado! Venda Ganha no valor total de R$ 75.000.'
      }
    ]
  },
  {
    id: 'deal-004',
    titulo: 'Saneamento de Carteira - Distribuidora Brasil Peças',
    cliente: 'Brasil Auto Peças & Distribuição',
    documento: '33.123.456/0001-09',
    contatoNome: 'Marcos Vinícius',
    contatoCargo: 'Sócio Proprietário',
    telefone: '31987651234',
    email: 'marcos@brasilpecas.com.br',
    cidadeUf: 'Ibirité / MG',
    valor: 24000,
    valorMensal: 1900,
    etapa: 'qualificacao',
    probabilidade: 40,
    temperatura: 'morno',
    origem: 'prospeccao_ativa',
    responsavel: 'FABIOLA',
    previsaoFechamento: '2026-10-15',
    servicosInteresse: ['Auditoria e Saneamento de Carteira', 'Recuperação Ativa de Ativos'],
    proximaAcao: 'Solicitar amostra do relatório de títulos vencidos para auditoria prévia',
    dataProximaAcao: '2026-09-26',
    observacoes: 'Distribuidora com duplicatas frias e inadimplência de oficinas mecânicas.',
    dataCriacao: '2026-09-11T11:00:00.000Z',
    dataAtualizacao: '2026-09-17T15:30:00.000Z',
    historico: [
      {
        id: 'act-004-1',
        data: '2026-09-11T11:00:00.000Z',
        autor: 'FABIOLA',
        tipo: 'ligacao',
        descricao: 'Prospecção fria via telefone. Falei com Marcos, que aceitou receber apresentação.'
      }
    ]
  },
  {
    id: 'deal-005',
    titulo: 'Cobrança Preventiva - Rede Farmácias Central',
    cliente: 'Central Farma Comércio Varejista',
    documento: '09.876.543/0001-21',
    contatoNome: 'Luciana Bastos',
    contatoCargo: 'Supervisora Financeira',
    telefone: '31994445566',
    email: 'financeiro@centralfarma.com.br',
    cidadeUf: 'Belo Horizonte / MG',
    valor: 52000,
    valorMensal: 4200,
    etapa: 'ganho',
    probabilidade: 100,
    temperatura: 'quente',
    origem: 'recorrente',
    responsavel: 'ROSANA',
    previsaoFechamento: '2026-09-08',
    servicosInteresse: ['Cobrança Preventiva (Pré-Vencimento)', 'Gestão Completa de Inadimplência'],
    proximaAcao: 'Acompanhar relatório da 1ª quinzena de disparos preventivos',
    dataProximaAcao: '2026-09-28',
    observacoes: 'Expansão de contrato existente para novas 8 filiais da rede.',
    dataCriacao: '2026-08-25T10:00:00.000Z',
    dataAtualizacao: '2026-09-08T16:00:00.000Z',
    historico: [
      {
        id: 'act-005-1',
        data: '2026-09-08T16:00:00.000Z',
        autor: 'ROSANA',
        tipo: 'mudanca_etapa',
        descricao: 'Contrato de expansão assinado e ativado com sucesso.'
      }
    ]
  },
  {
    id: 'deal-006',
    titulo: 'Prospecção Ativa - Rede de Academias FitPower',
    cliente: 'FitPower Centro de Treinamento',
    documento: '19.456.789/0001-33',
    contatoNome: 'Carlos Menezes',
    contatoCargo: 'Gerente Operacional',
    telefone: '31983332211',
    email: 'carlos@fitpoweracademia.com.br',
    cidadeUf: 'Nova Lima / MG',
    valor: 16500,
    valorMensal: 1400,
    etapa: 'prospeccao',
    probabilidade: 20,
    temperatura: 'morno',
    origem: 'inbound_site',
    responsavel: 'ANA LUIZA',
    previsaoFechamento: '2026-10-30',
    servicosInteresse: ['Cobrança Preventiva (Pré-Vencimento)'],
    proximaAcao: 'Agendar call de demonstração do sistema e régua de cobrança',
    dataProximaAcao: '2026-09-25',
    observacoes: 'Preenchimento de formulário de contato no site da Valora.',
    dataCriacao: '2026-09-18T08:45:00.000Z',
    dataAtualizacao: '2026-09-18T08:45:00.000Z',
    historico: [
      {
        id: 'act-006-1',
        data: '2026-09-18T08:45:00.000Z',
        autor: 'SISTEMA',
        tipo: 'nota',
        descricao: 'Lead recebido via formulário do site.'
      }
    ]
  },
  {
    id: 'deal-007',
    titulo: 'Recuperação de Mensalidades - Associação Médica Vale',
    cliente: 'Associação dos Profissionais da Saúde do Vale',
    documento: '01.222.333/0001-44',
    contatoNome: 'Dra. Camila Nogueira',
    contatoCargo: 'Presidente',
    telefone: '31997778899',
    email: 'presidencia@associacaovale.org.br',
    cidadeUf: 'Ipatinga / MG',
    valor: 29000,
    valorMensal: 2400,
    etapa: 'negociacao',
    probabilidade: 80,
    temperatura: 'quente',
    origem: 'evento_network',
    responsavel: 'PALOMA',
    previsaoFechamento: '2026-09-29',
    servicosInteresse: ['Gestão Completa de Inadimplência', 'Consultoria de Crédito & Cobrança'],
    proximaAcao: 'Formalizar proposta com envio de contrato digital para assinatura',
    dataProximaAcao: '2026-09-24',
    observacoes: 'Contrato estratégico para associação com mais de 800 associados.',
    dataCriacao: '2026-09-01T15:00:00.000Z',
    dataAtualizacao: '2026-09-20T10:00:00.000Z',
    historico: [
      {
        id: 'act-007-1',
        data: '2026-09-20T10:00:00.000Z',
        autor: 'PALOMA',
        tipo: 'reuniao',
        descricao: 'Reunião de alinhamento com conselho diretor. Parecer 100% favorável.'
      }
    ]
  },
  {
    id: 'deal-008',
    titulo: 'Consultoria de Crédito - Grupo Alimentos União',
    cliente: 'União Atacadista de Alimentos',
    documento: '11.333.444/0001-55',
    contatoNome: 'Sérgio Antunes',
    contatoCargo: 'Gerente Financeiro',
    telefone: '31986665544',
    email: 'sergio@uniaofoods.com.br',
    cidadeUf: 'Sete Lagoas / MG',
    valor: 18000,
    valorMensal: 1500,
    etapa: 'perdido',
    probabilidade: 0,
    temperatura: 'frio',
    origem: 'prospeccao_ativa',
    responsavel: 'KEYLLA',
    previsaoFechamento: '2026-09-10',
    servicosInteresse: ['Consultoria de Crédito & Cobrança'],
    motivoPerda: 'Decidiu estruturar cobrança interna com contratação de equipe própria.',
    observacoes: 'Manter no radar para follow-up daqui a 6 meses.',
    dataCriacao: '2026-08-15T11:00:00.000Z',
    dataAtualizacao: '2026-09-12T14:00:00.000Z',
    historico: [
      {
        id: 'act-008-1',
        data: '2026-09-12T14:00:00.000Z',
        autor: 'KEYLLA',
        tipo: 'mudanca_etapa',
        descricao: 'Perdido: Cliente optou por equipe própria temporariamente.'
      }
    ]
  },
  {
    id: 'deal-009',
    titulo: 'BPO e Cobrança - Imobiliária Prime Imóveis',
    cliente: 'Prime Imóveis & Locações',
    documento: '22.444.555/0001-66',
    contatoNome: 'Rodrigo Fontes',
    contatoCargo: 'Diretor Comercial',
    telefone: '31995554433',
    email: 'rodrigo@primeimoveismg.com.br',
    cidadeUf: 'Belo Horizonte / MG',
    valor: 31000,
    valorMensal: 2600,
    etapa: 'proposta',
    probabilidade: 60,
    temperatura: 'morno',
    origem: 'indicacao',
    responsavel: 'FABIOLA',
    previsaoFechamento: '2026-10-10',
    servicosInteresse: ['BPO Financeiro & Contas a Receber', 'Recuperação Ativa de Ativos'],
    proximaAcao: 'Follow-up sobre proposta enviada na semana anterior',
    dataProximaAcao: '2026-09-25',
    observacoes: 'Recuperação de taxas condominiais e aluguéis atrasados de inquilinos desocupados.',
    dataCriacao: '2026-09-08T13:30:00.000Z',
    dataAtualizacao: '2026-09-16T11:00:00.000Z',
    historico: [
      {
        id: 'act-009-1',
        data: '2026-09-16T11:00:00.000Z',
        autor: 'FABIOLA',
        tipo: 'proposta',
        descricao: 'Proposta comercial enviada por e-mail e WhatsApp.'
      }
    ]
  }
];

export function getStoredCrmDeals(): CrmOportunidade[] {
  try {
    if (typeof localStorage === 'undefined') return DEFAULT_CRM_DEALS;
    const raw = localStorage.getItem(CRM_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(CRM_STORAGE_KEY, JSON.stringify(DEFAULT_CRM_DEALS));
      return DEFAULT_CRM_DEALS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return DEFAULT_CRM_DEALS;
  } catch (err) {
    console.warn('[CRM Storage] Error reading deals, using default seed', err);
    return DEFAULT_CRM_DEALS;
  }
}

export function saveCrmDeals(deals: CrmOportunidade[]): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(CRM_STORAGE_KEY, JSON.stringify(deals));
  } catch (err) {
    console.error('[CRM Storage] Error saving deals to localStorage', err);
  }
}

export function createCrmDeal(
  dealData: Omit<CrmOportunidade, 'id' | 'dataCriacao' | 'dataAtualizacao' | 'historico'>,
  authorName = 'Vendedor'
): CrmOportunidade {
  const current = getStoredCrmDeals();
  const now = new Date().toISOString();
  
  const newDeal: CrmOportunidade = {
    ...dealData,
    id: `deal-${Date.now()}`,
    dataCriacao: now,
    dataAtualizacao: now,
    historico: [
      {
        id: `act-init-${Date.now()}`,
        data: now,
        autor: authorName,
        tipo: 'nota',
        descricao: `Oportunidade de venda criada por ${authorName} com valor de R$ ${dealData.valor.toLocaleString('pt-BR')}.`
      }
    ]
  };

  const updated = [newDeal, ...current];
  saveCrmDeals(updated);
  return newDeal;
}

export function updateCrmDeal(
  id: string,
  updates: Partial<CrmOportunidade>,
  authorName = 'Vendedor'
): CrmOportunidade | null {
  const current = getStoredCrmDeals();
  let updatedItem: CrmOportunidade | null = null;
  const now = new Date().toISOString();

  const updatedList = current.map(item => {
    if (item.id === id) {
      let extraHistory: CrmAtividade[] = [];
      if (updates.etapa && updates.etapa !== item.etapa) {
        extraHistory.push({
          id: `act-stage-${Date.now()}`,
          data: now,
          autor: authorName,
          tipo: 'mudanca_etapa',
          descricao: `Etapa alterada de "${item.etapa}" para "${updates.etapa}".`
        });
      }

      updatedItem = {
        ...item,
        ...updates,
        dataAtualizacao: now,
        historico: [...extraHistory, ...item.historico]
      };
      return updatedItem;
    }
    return item;
  });

  if (updatedItem) {
    saveCrmDeals(updatedList);
  }
  return updatedItem;
}

export function updateCrmDealStage(
  id: string,
  newStage: CrmEtapaVenda,
  authorName = 'Vendedor',
  motivoPerda?: string
): CrmOportunidade | null {
  const current = getStoredCrmDeals();
  let updatedItem: CrmOportunidade | null = null;
  const now = new Date().toISOString();

  const targetConfig = CRM_ETAPAS_CONFIG.find(e => e.id === newStage);
  const newProb = targetConfig ? targetConfig.probabilidadePadrao : 50;

  const updatedList = current.map(item => {
    if (item.id === id) {
      const isWon = newStage === 'ganho';
      const isLost = newStage === 'perdido';

      const logDesc = isWon 
        ? `🎉 Contrato Fechado! Venda Ganha no valor de R$ ${item.valor.toLocaleString('pt-BR')}.`
        : isLost 
        ? `Perdido/Desqualificado. Motivo: ${motivoPerda || 'Sem motivo informado'}.`
        : `Etapa avançada para ${targetConfig?.nome || newStage}.`;

      updatedItem = {
        ...item,
        etapa: newStage,
        probabilidade: newProb,
        motivoPerda: isLost ? (motivoPerda || item.motivoPerda) : undefined,
        dataAtualizacao: now,
        historico: [
          {
            id: `act-stage-${Date.now()}`,
            data: now,
            autor: authorName,
            tipo: 'mudanca_etapa',
            descricao: logDesc
          },
          ...item.historico
        ]
      };
      return updatedItem;
    }
    return item;
  });

  if (updatedItem) {
    saveCrmDeals(updatedList);
  }
  return updatedItem;
}

export function addCrmActivity(
  dealId: string,
  activity: Omit<CrmAtividade, 'id' | 'data'>
): CrmOportunidade | null {
  const current = getStoredCrmDeals();
  let updatedItem: CrmOportunidade | null = null;
  const now = new Date().toISOString();

  const newActivity: CrmAtividade = {
    ...activity,
    id: `act-${Date.now()}`,
    data: now
  };

  const updatedList = current.map(item => {
    if (item.id === dealId) {
      updatedItem = {
        ...item,
        dataAtualizacao: now,
        historico: [newActivity, ...item.historico]
      };
      return updatedItem;
    }
    return item;
  });

  if (updatedItem) {
    saveCrmDeals(updatedList);
  }
  return updatedItem;
}

export function deleteCrmDeal(id: string): boolean {
  const current = getStoredCrmDeals();
  const filtered = current.filter(d => d.id !== id);
  if (filtered.length !== current.length) {
    saveCrmDeals(filtered);
    return true;
  }
  return false;
}

export function resetCrmDealsToDefault(): CrmOportunidade[] {
  saveCrmDeals(DEFAULT_CRM_DEALS);
  return DEFAULT_CRM_DEALS;
}

export interface CrmMetrics {
  totalOportunidades: number;
  oportunidadesAtivas: number;
  valorTotalPipeline: number;
  valorPonderadoPipeline: number;
  totalVendasGanhas: number;
  valorTotalGanho: number;
  totalVendasPerdidas: number;
  taxaConversao: number; // %
  ticketMedioGeral: number;
  ticketMedioGanho: number;
  contagemPorEtapa: Record<CrmEtapaVenda, { qtd: number; valor: number }>;
  rankingVendedoras: Array<{
    nome: string;
    totalDeals: number;
    dealsGanhos: number;
    valorGanho: number;
    valorEmNegociacao: number;
    taxaConversao: number;
  }>;
}

export function computeCrmMetrics(deals: CrmOportunidade[]): CrmMetrics {
  let valorTotalPipeline = 0;
  let valorPonderadoPipeline = 0;
  let totalVendasGanhas = 0;
  let valorTotalGanho = 0;
  let totalVendasPerdidas = 0;
  let oportunidadesAtivas = 0;

  const contagemPorEtapa: Record<CrmEtapaVenda, { qtd: number; valor: number }> = {
    prospeccao: { qtd: 0, valor: 0 },
    qualificacao: { qtd: 0, valor: 0 },
    proposta: { qtd: 0, valor: 0 },
    negociacao: { qtd: 0, valor: 0 },
    ganho: { qtd: 0, valor: 0 },
    perdido: { qtd: 0, valor: 0 }
  };

  const vendedorasMap = new Map<string, {
    totalDeals: number;
    dealsGanhos: number;
    valorGanho: number;
    valorEmNegociacao: number;
  }>();

  deals.forEach(deal => {
    const val = Number(deal.valor) || 0;
    const prob = Number(deal.probabilidade) || 0;
    const etapa = deal.etapa || 'prospeccao';

    // Etapa breakdown
    if (contagemPorEtapa[etapa]) {
      contagemPorEtapa[etapa].qtd += 1;
      contagemPorEtapa[etapa].valor += val;
    }

    if (etapa === 'ganho') {
      totalVendasGanhas += 1;
      valorTotalGanho += val;
    } else if (etapa === 'perdido') {
      totalVendasPerdidas += 1;
    } else {
      // Em andamento
      oportunidadesAtivas += 1;
      valorTotalPipeline += val;
      valorPonderadoPipeline += val * (prob / 100);
    }

    // Leaderboard tracking
    const resp = (deal.responsavel || 'GERAL').trim().toUpperCase();
    if (!vendedorasMap.has(resp)) {
      vendedorasMap.set(resp, {
        totalDeals: 0,
        dealsGanhos: 0,
        valorGanho: 0,
        valorEmNegociacao: 0
      });
    }
    const stat = vendedorasMap.get(resp)!;
    stat.totalDeals += 1;
    if (etapa === 'ganho') {
      stat.dealsGanhos += 1;
      stat.valorGanho += val;
    } else if (etapa !== 'perdido') {
      stat.valorEmNegociacao += val;
    }
  });

  const finalizados = totalVendasGanhas + totalVendasPerdidas;
  const taxaConversao = finalizados > 0 ? Math.round((totalVendasGanhas / finalizados) * 100) : 0;
  const ticketMedioGeral = deals.length > 0 ? Math.round((valorTotalPipeline + valorTotalGanho) / deals.length) : 0;
  const ticketMedioGanho = totalVendasGanhas > 0 ? Math.round(valorTotalGanho / totalVendasGanhas) : 0;

  const rankingVendedoras = Array.from(vendedorasMap.entries())
    .map(([nome, s]) => ({
      nome,
      totalDeals: s.totalDeals,
      dealsGanhos: s.dealsGanhos,
      valorGanho: s.valorGanho,
      valorEmNegociacao: s.valorEmNegociacao,
      taxaConversao: s.totalDeals > 0 ? Math.round((s.dealsGanhos / s.totalDeals) * 100) : 0
    }))
    .sort((a, b) => b.valorGanho - a.valorGanho || b.dealsGanhos - a.dealsGanhos);

  return {
    totalOportunidades: deals.length,
    oportunidadesAtivas,
    valorTotalPipeline,
    valorPonderadoPipeline: Math.round(valorPonderadoPipeline),
    totalVendasGanhas,
    valorTotalGanho,
    totalVendasPerdidas,
    taxaConversao,
    ticketMedioGeral,
    ticketMedioGanho,
    contagemPorEtapa,
    rankingVendedoras
  };
}

export function exportCrmDealsToExcel(deals: CrmOportunidade[]): void {
  try {
    const rows = deals.map((d, index) => ({
      'Nº': index + 1,
      'Título da Oportunidade': d.titulo,
      'Empresa / Cliente': d.cliente,
      'CNPJ / CPF': d.documento || 'Não informado',
      'Pessoa de Contato': d.contatoNome,
      'Cargo': d.contatoCargo || '-',
      'Telefone': d.telefone,
      'E-mail': d.email || '-',
      'Cidade / UF': d.cidadeUf || '-',
      'Valor Estimado (R$)': d.valor,
      'Valor Mensal (R$)': d.valorMensal || 0,
      'Etapa': CRM_ETAPAS_CONFIG.find(e => e.id === d.etapa)?.nome || d.etapa,
      'Probabilidade (%)': `${d.probabilidade}%`,
      'Temperatura': TEMPERATURA_LABELS[d.temperatura]?.label || d.temperatura,
      'Origem do Lead': ORIGENS_LEAD_LABELS[d.origem] || d.origem,
      'Responsável': d.responsavel,
      'Previsão de Fechamento': d.previsaoFechamento,
      'Serviços de Interesse': (d.servicosInteresse || []).join(', '),
      'Próxima Ação': d.proximaAcao || '-',
      'Data Próxima Ação': d.dataProximaAcao || '-',
      'Motivo da Perda': d.motivoPerda || '-',
      'Observações': d.observacoes || '-',
      'Data de Criação': new Date(d.dataCriacao).toLocaleDateString('pt-BR'),
      'Última Atualização': new Date(d.dataAtualizacao).toLocaleDateString('pt-BR')
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Pipeline de Vendas Valora');
    XLSX.writeFile(workbook, `Valora_CRM_Vendas_${new Date().toISOString().slice(0, 10)}.xlsx`);
  } catch (err) {
    console.error('Erro ao exportar CRM para Excel:', err);
    throw err;
  }
}
