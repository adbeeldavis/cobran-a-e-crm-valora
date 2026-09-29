import { DebtRecord, LancamentoFinanceiro } from '../types';

const STORAGE_KEY = 'valora_lancamentos_financeiros_v1';

// Seed expenses for Valora Gestão & Finanças
const SEED_DESPESAS: Omit<LancamentoFinanceiro, 'id'>[] = [
  {
    tipo: 'despesa',
    descricao: 'Infraestrutura Cloud & Servidores API',
    categoria: 'Tecnologia & Software',
    valor: 480.00,
    dataVencimento: '2026-09-05',
    dataPagamento: '2026-09-05',
    status: 'pago',
    formaPagamento: 'Cartão',
    entidade: 'Google Cloud Platform',
    origem: 'recorrente',
    observacoes: 'Hospedagem segura e processamento do sistema',
    criadoEm: '2026-09-01'
  },
  {
    tipo: 'despesa',
    descricao: 'API WhatsApp Empresarial Z-API (Disparos Ativos)',
    categoria: 'Telefonia & Mensageria',
    valor: 299.90,
    dataVencimento: '2026-09-10',
    dataPagamento: '2026-09-09',
    status: 'pago',
    formaPagamento: 'PIX',
    entidade: 'Z-API Servicos Digitais',
    origem: 'recorrente',
    observacoes: 'Linhas ativas das operadoras Rosana, Ana Luiza, Keylla e Fabíola',
    criadoEm: '2026-09-01'
  },
  {
    tipo: 'despesa',
    descricao: 'Telefonia VoIP & Discador PABX Virtual',
    categoria: 'Telefonia & Mensageria',
    valor: 350.00,
    dataVencimento: '2026-09-15',
    dataPagamento: '2026-09-15',
    status: 'pago',
    formaPagamento: 'Boleto',
    entidade: 'Telecom Ibirité Soluções',
    origem: 'recorrente',
    observacoes: 'Tarifas e canais de ligação para acionamentos',
    criadoEm: '2026-09-01'
  },
  {
    tipo: 'despesa',
    descricao: 'Aluguel & Condomínio Sala Operacional',
    categoria: 'Infraestrutura & Espaço',
    valor: 1850.00,
    dataVencimento: '2026-09-20',
    dataPagamento: '2026-09-19',
    status: 'pago',
    formaPagamento: 'Transferência',
    entidade: 'Centro Comercial Ibirité',
    origem: 'recorrente',
    observacoes: 'Central de atendimento e operações',
    criadoEm: '2026-09-01'
  },
  {
    tipo: 'despesa',
    descricao: 'Assessoria Jurídica e Notificações Extrajudiciais',
    categoria: 'Serviços Jurídicos',
    valor: 1200.00,
    dataVencimento: '2026-09-25',
    status: 'pendente',
    formaPagamento: 'PIX',
    entidade: 'Dra. Ana Maria & Associados',
    origem: 'recorrente',
    observacoes: 'Emissão de notificações cartorárias e validação de acordos',
    criadoEm: '2026-09-01'
  },
  {
    tipo: 'despesa',
    descricao: 'Tarifas Bancárias e Gateway de Boletos / PIX',
    categoria: 'Taxas Bancárias',
    valor: 185.40,
    dataVencimento: '2026-09-28',
    status: 'pendente',
    formaPagamento: 'Boleto',
    entidade: 'Banco Inter / Asaas Pagamentos',
    origem: 'recorrente',
    observacoes: 'Tarifas por boletos e liquidação de PIX emitidos',
    criadoEm: '2026-09-01'
  },
  {
    tipo: 'despesa',
    descricao: 'Material de Escritório e Suprimentos de TI',
    categoria: 'Material de Consumo',
    valor: 240.00,
    dataVencimento: '2026-09-30',
    status: 'pendente',
    formaPagamento: 'Cartão',
    entidade: 'Papelaria & Informática Central',
    origem: 'manual',
    observacoes: 'Headsets operadoras e suprimentos',
    criadoEm: '2026-09-10'
  }
];

/**
 * Derives dynamic revenue entries from collection records so that
 * any recovered debt or closed agreement appears in Contas a Receber / Receitas.
 */
export function deriveReceitasFromCobrança(records: DebtRecord[]): LancamentoFinanceiro[] {
  const receitas: LancamentoFinanceiro[] = [];

  records.forEach((r, idx) => {
    const orig = r.valorOriginal || 120;
    const pago = r.valorRecuperado || r.valorPago || 
      (r.status === 'pago' || r.status === 'recuperado' ? orig : 0);

    // If paid/recovered, create a completed revenue entry
    if (pago > 0) {
      receitas.push({
        id: `rec-paga-${r.id || idx}`,
        tipo: 'receita',
        descricao: `Recuperação de Cobrança - Matr. #${r.matricula}`,
        categoria: 'Recuperação de Inadimplência',
        valor: pago,
        dataVencimento: r.dataRetorno || r.dataUltimoContato || '2026-09-15',
        dataPagamento: r.dataRetorno || r.dataUltimoContato || '2026-09-15',
        status: 'pago',
        formaPagamento: 'PIX',
        entidade: r.cliente,
        origem: 'cobranca',
        referenciaId: r.id,
        observacoes: `Operador(a): ${r.responsavel} • Status: Quitado`,
        criadoEm: '2026-09-01'
      });
    } else if (r.status === 'acordo_fechado' || r.status === 'boleto_gerado') {
      // Pending revenue from agreement or issued ticket
      const valAcordo = r.valorAcordo || orig;
      receitas.push({
        id: `rec-acordo-${r.id || idx}`,
        tipo: 'receita',
        descricao: `Acordo Fechado - Matr. #${r.matricula}`,
        categoria: 'Acordos & Parcelamentos',
        valor: valAcordo,
        dataVencimento: r.dataRetorno || '2026-09-25',
        status: 'pendente',
        formaPagamento: 'Boleto',
        entidade: r.cliente,
        origem: 'cobranca',
        referenciaId: r.id,
        observacoes: `Operador(a): ${r.responsavel} • Aguardando compensação`,
        criadoEm: '2026-09-05'
      });
    }
  });

  return receitas;
}

/**
 * Load all financial entries (user-stored manual entries + seed expenses + synchronized collection revenue)
 */
export function getLancamentosFinanceiros(records: DebtRecord[]): LancamentoFinanceiro[] {
  let manualEntries: LancamentoFinanceiro[] = [];

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      manualEntries = JSON.parse(raw);
    } else {
      // Initialize with seed expenses
      manualEntries = SEED_DESPESAS.map((d, i) => ({
        ...d,
        id: `seed-desp-${i + 1}`
      }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(manualEntries));
    }
  } catch (e) {
    console.error('Erro ao ler lançamentos do localStorage', e);
  }

  // Combine with live synchronized collection revenues
  const cobrancaReceitas = deriveReceitasFromCobrança(records);

  return [...manualEntries, ...cobrancaReceitas];
}

/**
 * Save manual financial entries
 */
export function saveManualLancamentos(entries: LancamentoFinanceiro[]): void {
  // Only save entries that are not auto-derived from collection
  const onlyManualAndExpenses = entries.filter(e => e.origem !== 'cobranca');
  localStorage.setItem(STORAGE_KEY, JSON.stringify(onlyManualAndExpenses));
}

/**
 * Add a new manual financial entry (revenue or expense)
 */
export function addLancamentoFinanceiro(
  novo: Omit<LancamentoFinanceiro, 'id' | 'criadoEm'>,
  records: DebtRecord[]
): LancamentoFinanceiro[] {
  const current = getLancamentosFinanceiros(records);
  const item: LancamentoFinanceiro = {
    ...novo,
    id: `lanc-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    criadoEm: new Date().toISOString().slice(0, 10)
  };

  const updated = [item, ...current];
  saveManualLancamentos(updated);
  return updated;
}

/**
 * Update an existing financial entry
 */
export function updateLancamentoFinanceiro(
  id: string,
  updates: Partial<LancamentoFinanceiro>,
  records: DebtRecord[]
): LancamentoFinanceiro[] {
  const current = getLancamentosFinanceiros(records);
  const updated = current.map(item => {
    if (item.id === id) {
      return { ...item, ...updates };
    }
    return item;
  });

  saveManualLancamentos(updated);
  return updated;
}

/**
 * Delete an entry
 */
export function deleteLancamentoFinanceiro(
  id: string,
  records: DebtRecord[]
): LancamentoFinanceiro[] {
  const current = getLancamentosFinanceiros(records);
  const updated = current.filter(item => item.id !== id);
  saveManualLancamentos(updated);
  return updated;
}

/**
 * Calculate executive financial indicators
 */
export interface FinanceiroMetrics {
  saldoAtualCaixa: number;
  totalRecebidoMes: number;
  totalReceberPendente: number;
  totalPagoMes: number;
  totalPagarPendente: number;
  resultadoLiquidoMes: number; // Recebido - Pago
  resultadoPrevistoMes: number; // (Recebido + A Receber) - (Pago + A Pagar)
  quantidadeReceitas: number;
  quantidadeDespesas: number;
}

export function computeFinanceiroMetrics(entries: LancamentoFinanceiro[]): FinanceiroMetrics {
  let totalRecebidoMes = 0;
  let totalReceberPendente = 0;
  let totalPagoMes = 0;
  let totalPagarPendente = 0;
  let quantidadeReceitas = 0;
  let quantidadeDespesas = 0;

  entries.forEach(e => {
    if (e.tipo === 'receita') {
      quantidadeReceitas++;
      if (e.status === 'pago') {
        totalRecebidoMes += e.valor;
      } else if (e.status === 'pendente') {
        totalReceberPendente += e.valor;
      }
    } else if (e.tipo === 'despesa') {
      quantidadeDespesas++;
      if (e.status === 'pago') {
        totalPagoMes += e.valor;
      } else if (e.status === 'pendente' || e.status === 'vencido') {
        totalPagarPendente += e.valor;
      }
    }
  });

  const saldoAtualCaixa = Math.max(0, totalRecebidoMes - totalPagoMes + 15400); // Base de saldo em conta + resultado
  const resultadoLiquidoMes = totalRecebidoMes - totalPagoMes;
  const resultadoPrevistoMes = (totalRecebidoMes + totalReceberPendente) - (totalPagoMes + totalPagarPendente);

  return {
    saldoAtualCaixa,
    totalRecebidoMes,
    totalReceberPendente,
    totalPagoMes,
    totalPagarPendente,
    resultadoLiquidoMes,
    resultadoPrevistoMes,
    quantidadeReceitas,
    quantidadeDespesas
  };
}

export interface ComparativoMensalItem {
  mesKey: string;           // "2026-01", "2026-02", ...
  mesRotulo: string;        // "Jan/26", "Fev/26", ...
  mesNome: string;          // "Janeiro", "Fevereiro", ...
  ano: number;
  mesNumero: number;        // 1 to 12
  contasReceber: number;    // Total a receber (receitas realizadas + a receber)
  receitasRealizadas: number; // Já recebido
  receitasPendentes: number;  // A receber pendente
  contasPagar: number;      // Total a pagar (despesas pagas + a pagar)
  despesasPagas: number;    // Já pago
  despesasPendentes: number;// A pagar pendente
  saldoLiquido: number;     // contasReceber - contasPagar
  saldoRealizado: number;   // receitasRealizadas - despesasPagas
  taxaCobertura: number;    // (contasReceber / (contasPagar || 1)) * 100
  statusSaldo: 'superavit' | 'deficit' | 'neutro';
  isCurrentMonth: boolean;
  totalLancamentos: number;
}

const MESES_CONFIG_2026 = [
  { num: 1, nome: 'Janeiro', rotulo: 'Jan/26', key: '2026-01', baseRec: 16800, baseDesp: 4500 },
  { num: 2, nome: 'Fevereiro', rotulo: 'Fev/26', key: '2026-02', baseRec: 15400, baseDesp: 4650 },
  { num: 3, nome: 'Março', rotulo: 'Mar/26', key: '2026-03', baseRec: 18200, baseDesp: 4720 },
  { num: 4, nome: 'Abril', rotulo: 'Abr/26', key: '2026-04', baseRec: 17900, baseDesp: 4550 },
  { num: 5, nome: 'Maio', rotulo: 'Mai/26', key: '2026-05', baseRec: 19100, baseDesp: 4680 },
  { num: 6, nome: 'Junho', rotulo: 'Jun/26', key: '2026-06', baseRec: 21300, baseDesp: 4890 },
  { num: 7, nome: 'Julho', rotulo: 'Jul/26', key: '2026-07', baseRec: 20500, baseDesp: 4750 },
  { num: 8, nome: 'Agosto', rotulo: 'Ago/26', key: '2026-08', baseRec: 22800, baseDesp: 4920 },
  { num: 9, nome: 'Setembro', rotulo: 'Set/26', key: '2026-09', baseRec: 0, baseDesp: 0 },
  { num: 10, nome: 'Outubro', rotulo: 'Out/26', key: '2026-10', baseRec: 19500, baseDesp: 4600 },
  { num: 11, nome: 'Novembro', rotulo: 'Nov/26', key: '2026-11', baseRec: 20800, baseDesp: 5100 },
  { num: 12, nome: 'Dezembro', rotulo: 'Dez/26', key: '2026-12', baseRec: 24500, baseDesp: 5800 },
];

/**
 * Computes monthly comparative data between Contas a Pagar and Contas a Receber
 */
export function computeComparativoMensal(entries: LancamentoFinanceiro[]): ComparativoMensalItem[] {
  const currentMonthKey = '2026-09';

  return MESES_CONFIG_2026.map(mes => {
    let recReal = 0;
    let recPend = 0;
    let despPagas = 0;
    let despPend = 0;
    let totalLanc = 0;

    // Filter actual entries matching this month
    entries.forEach(e => {
      const dateStr = e.dataVencimento || e.dataPagamento || e.criadoEm || '';
      if (dateStr.startsWith(mes.key)) {
        totalLanc++;
        if (e.tipo === 'receita') {
          if (e.status === 'pago') {
            recReal += e.valor;
          } else {
            recPend += e.valor;
          }
        } else if (e.tipo === 'despesa') {
          if (e.status === 'pago') {
            despPagas += e.valor;
          } else {
            despPend += e.valor;
          }
        }
      }
    });

    const isCurrent = mes.key === currentMonthKey;

    // For current month (September), use 100% live system entries
    // For other months, combine live entries with the operational baseline so historical and projected views are complete
    const totalReceber = isCurrent
      ? recReal + recPend
      : (recReal + recPend > 0 ? recReal + recPend : mes.baseRec);

    const totalPagar = isCurrent
      ? despPagas + despPend
      : (despPagas + despPend > 0 ? despPagas + despPend : mes.baseDesp);

    const finalRecReal = isCurrent ? recReal : (recReal > 0 ? recReal : Math.round(totalReceber * 0.95));
    const finalRecPend = isCurrent ? recPend : (recPend > 0 ? recPend : Math.round(totalReceber * 0.05));
    const finalDespPagas = isCurrent ? despPagas : (despPagas > 0 ? despPagas : Math.round(totalPagar * 0.9));
    const finalDespPend = isCurrent ? despPend : (despPend > 0 ? despPend : Math.round(totalPagar * 0.1));

    const saldoLiquido = Math.round((totalReceber - totalPagar) * 100) / 100;
    const saldoRealizado = Math.round((finalRecReal - finalDespPagas) * 100) / 100;
    const taxaCobertura = totalPagar > 0 ? Math.round((totalReceber / totalPagar) * 100) : 100;

    return {
      mesKey: mes.key,
      mesRotulo: mes.rotulo,
      mesNome: mes.nome,
      ano: 2026,
      mesNumero: mes.num,
      contasReceber: Math.round(totalReceber),
      receitasRealizadas: Math.round(finalRecReal),
      receitasPendentes: Math.round(finalRecPend),
      contasPagar: Math.round(totalPagar),
      despesasPagas: Math.round(finalDespPagas),
      despesasPendentes: Math.round(finalDespPend),
      saldoLiquido,
      saldoRealizado,
      taxaCobertura,
      statusSaldo: saldoLiquido > 0 ? 'superavit' : saldoLiquido < 0 ? 'deficit' : 'neutro',
      isCurrentMonth: isCurrent,
      totalLancamentos: totalLanc
    };
  });
}

