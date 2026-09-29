import { DebtRecord, NegociacaoRecord, PagamentoRecord, AlertaRegra } from '../types';
import { calculateDaysOverdue } from './sheetParser';

/**
 * Standard Brazilian Plans for Cartão Todos Saúde
 */
export const PLANOS_CARTAO_TODOS = [
  'Cartão Todos Individual',
  'Cartão Todos Familiar',
  'Cartão Todos Mais Odonto',
  'Cartão Todos Top Saúde Master'
];

/**
 * Standard Collectors / Responsáveis
 */
export const RESPONSAVEIS_LIST = [
  'ANA LUIZA',
  'ROSANA',
  'KEYLLA',
  'FABIOLA'
];

/**
 * Generates deterministic CPF based on matricula/id
 */
export function generateClientCpf(seed: string): string {
  const digits = (seed.replace(/\D/g, '') + '12345678901').slice(0, 11);
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
}

/**
 * Generates clean client email
 */
export function generateClientEmail(clientName: string): string {
  const clean = clientName.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '.').replace(/\.+/g, '.')
    .replace(/^\.|\.$/g, '');
  return `${clean.split('.').slice(0, 2).join('.')}@gmail.com`;
}

/**
 * Calculates current days overdue based on reference date (2026-09-17)
 */
export function calculateRecordDaysOverdue(record: DebtRecord): number {
  if (record.diasAtraso !== undefined && record.diasAtraso > 0) {
    return record.diasAtraso;
  }
  return calculateDaysOverdue(record.primeiroMesAtraso || '09/26', record.diaVencimento || 15);
}

/**
 * Enriches records with Cartão Todos Saúde debt controls & actions
 */
export function enrichDebtRecord(record: DebtRecord, index: number = 0): DebtRecord {
  const days = calculateRecordDaysOverdue(record);
  const cleanMat = record.matricula || `CT-${index + 1000}`;
  const cpf = record.cpf || generateClientCpf(cleanMat + index);
  const email = record.email || generateClientEmail(record.cliente);
  const plano = record.planoContratado || PLANOS_CARTAO_TODOS[index % PLANOS_CARTAO_TODOS.length] || 'Cartão Todos Individual';
  const mensalidade = record.valorMensalidade || (plano.includes('Familiar') ? 59.70 : plano.includes('Mais') ? 89.90 : 39.90);
  
  // Parcelas vencidas calculated from days
  const parcelasVencidas = record.qtdParcelasVencidas || Math.max(1, Math.min(12, Math.ceil(days / 30)));
  const valorOriginal = record.valorOriginal || (parcelasVencidas * mensalidade);
  
  // Status mapping
  const rawStatus = (record.status as string) || 'em_atraso';
  let status = record.status;
  if (rawStatus === 'pendente') status = 'contato_a_realizar';
  if (rawStatus === 'acordo_fechado') status = 'acordo_em_andamento';
  if (rawStatus === 'sem_contato') status = 'sem_retorno';
  if (rawStatus === 'cancelado') status = 'inadimplencia_recorrente';

  // Value in open vs recovered
  const valorPago = record.valorPago || (status === 'pago' || status === 'recuperado' ? valorOriginal : 0);
  const valorEmAberto = record.valorEmAberto !== undefined 
    ? record.valorEmAberto 
    : (status === 'pago' || status === 'recuperado' ? 0 : Math.max(0, valorOriginal - valorPago));
  const valorRecuperado = record.valorRecuperado || valorPago;

  // Next action setup (Orientado à Ação)
  let proximaAcao = record.proximaAcao;
  let dataProximaAcao = record.dataProximaAcao;
  let prioridadeAcao = record.prioridadeAcao;

  if (!proximaAcao || !dataProximaAcao) {
    if (status === 'pagamento_prometido') {
      proximaAcao = 'Confirmar recebimento do PIX/Boleto';
      dataProximaAcao = '2026-09-17'; // HOJE
      prioridadeAcao = 'pagamento_prometido';
    } else if (status === 'em_negociacao' || status === 'acordo_em_andamento') {
      proximaAcao = 'Enviar link de acordo e colher confirmação';
      dataProximaAcao = '2026-09-17';
      prioridadeAcao = 'negociacao';
    } else if (status === 'aguardando_retorno') {
      proximaAcao = 'Cobrança Ativa (Cobrança Receptiva / Retorno)';
      dataProximaAcao = '2026-09-17';
      prioridadeAcao = 'aguardando_retorno';
    } else if (days >= 60 || valorEmAberto > 500) {
      proximaAcao = 'Ligação Urgente & WhatsApp de Aviso Crítico';
      dataProximaAcao = '2026-09-17';
      prioridadeAcao = 'urgente';
    } else {
      proximaAcao = 'Envio de lembrete amigável via WhatsApp';
      dataProximaAcao = '2026-09-17';
      prioridadeAcao = 'prioridade';
    }
  }

  // Pre-seed negotiation if status is agreement
  let historicoNegociacoes = record.historicoNegociacoes || [];
  if (historicoNegociacoes.length === 0 && (status === 'acordo_em_andamento' || status === 'em_negociacao')) {
    const negStatus = status === 'acordo_em_andamento' ? 'acordo_realizado' : 'negociacao_iniciada';
    historicoNegociacoes = [
      {
        id: `neg-${record.id}`,
        clienteId: record.id,
        matricula: record.matricula,
        clienteNome: record.cliente,
        dataCriacao: '2026-09-15',
        valorOriginal: valorOriginal,
        descontoConcedido: 15,
        valorNegociado: Math.round(valorOriginal * 0.85),
        numeroParcelas: 2,
        valorParcela: Math.round((valorOriginal * 0.85) / 2),
        dataPrimeiroPagamento: '2026-09-20',
        dataFinal: '2026-10-20',
        responsavel: record.responsavel,
        observacoes: 'Acordo com 15% de desconto via PIX',
        status: negStatus
      }
    ];
  }

  // Pre-seed payment if status is paid
  let historicoPagamentos = record.historicoPagamentos || [];
  if (historicoPagamentos.length === 0 && (status === 'pago' || status === 'recuperado')) {
    historicoPagamentos = [
      {
        id: `pag-${record.id}`,
        clienteId: record.id,
        matricula: record.matricula,
        clienteNome: record.cliente,
        dataPagamento: '2026-09-16',
        valorPago: valorOriginal,
        formaPagamento: 'PIX',
        valorRecuperado: valorOriginal,
        responsavel: record.responsavel,
        observacoes: 'Pagamento integral confirmado via PIX'
      }
    ];
  }

  return {
    ...record,
    cpf,
    email,
    planoContratado: plano,
    valorMensalidade: mensalidade,
    qtdParcelasVencidas: parcelasVencidas,
    valorOriginal,
    valorEmAberto,
    valorPago,
    valorRecuperado,
    diasAtraso: days,
    status,
    proximaAcao,
    dataProximaAcao,
    prioridadeAcao,
    acaoConcluida: record.acaoConcluida || false,
    historicoNegociacoes,
    historicoPagamentos
  };
}

/**
 * Generate intelligent alerts from the database according to Item 13 rules
 */
export function generateSystemAlerts(records: DebtRecord[]): AlertaRegra[] {
  const alerts: AlertaRegra[] = [];
  const todayStr = '2026-09-17';

  records.forEach(r => {
    const days = calculateRecordDaysOverdue(r);

    // 1. Nova cobrança vencida
    if (days >= 1 && days <= 5 && r.contatoRealizado !== 'SIM') {
      alerts.push({
        id: `alert-nova-${r.id}`,
        tipo: 'nova_cobranca',
        titulo: 'Nova mensalidade vencida',
        descricao: `Mensalidade venceu há ${days} dias sem contato inicial.`,
        clienteNome: r.cliente,
        matricula: r.matricula,
        responsavel: r.responsavel,
        severidade: 'media',
        dataIdentificacao: todayStr
      });
    }

    // 2. Cliente sem contato prolongado
    if (days > 30 && r.contatoRealizado !== 'SIM') {
      alerts.push({
        id: `alert-semcontato-${r.id}`,
        tipo: 'sem_contato',
        titulo: 'Cliente sem contato (+30 dias)',
        descricao: `${r.cliente} está com ${days} dias de atraso e nenhum contato registrado.`,
        clienteNome: r.cliente,
        matricula: r.matricula,
        responsavel: r.responsavel,
        severidade: 'alta',
        dataIdentificacao: todayStr
      });
    }

    // 3. Próxima ação vencida
    if (r.dataProximaAcao && r.dataProximaAcao < todayStr && !r.acaoConcluida) {
      alerts.push({
        id: `alert-acaovencida-${r.id}`,
        tipo: 'proxima_acao_vencida',
        titulo: 'Ação de cobrança atrasada',
        descricao: `Ação "${r.proximaAcao}" estava prevista para ${r.dataProximaAcao}.`,
        clienteNome: r.cliente,
        matricula: r.matricula,
        responsavel: r.responsavel,
        severidade: 'urgente',
        dataIdentificacao: todayStr
      });
    }

    // 4. Pagamento prometido para hoje
    if (r.status === 'pagamento_prometido' && r.dataProximaAcao === todayStr) {
      alerts.push({
        id: `alert-prometidohoje-${r.id}`,
        tipo: 'prometido_hoje',
        titulo: 'Promessa de pagamento para hoje',
        descricao: `Cliente prometeu pagar hoje. Cobrança de confirmação recomendada.`,
        clienteNome: r.cliente,
        matricula: r.matricula,
        responsavel: r.responsavel,
        severidade: 'urgente',
        dataIdentificacao: todayStr
      });
    }

    // 5. Inadimplência recorrente
    if (r.inadimplenteRecorrente || days > 180) {
      alerts.push({
        id: `alert-recorrente-${r.id}`,
        tipo: 'atraso_recorrente',
        titulo: 'Inadimplência recorrente',
        descricao: `Cliente com histórico crônico de atraso (>180 dias). Propor condição especial.`,
        clienteNome: r.cliente,
        matricula: r.matricula,
        responsavel: r.responsavel,
        severidade: 'alta',
        dataIdentificacao: todayStr
      });
    }
  });

  return alerts.slice(0, 25);
}
