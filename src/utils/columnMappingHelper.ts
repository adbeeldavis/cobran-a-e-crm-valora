import { DebtRecord, StatusCobranca } from '../types';
import { normalizeResponsavel, calculateDaysOverdue } from './sheetParser';

export interface ColumnMapping {
  cliente: string;
  matricula: string;
  telefone: string;
  cpf: string;
  email: string;
  valorOriginal: string;
  diaVencimento: string;
  primeiroMesAtraso: string;
  responsavel: string;
  informacao: string;
  status: string;
  dataRetorno: string;
  planoContratado?: string;
}

export interface TargetFieldDef {
  key: keyof ColumnMapping;
  label: string;
  required?: boolean;
  description: string;
  examples: string;
}

export const TARGET_FIELDS: TargetFieldDef[] = [
  { 
    key: 'cliente', 
    label: 'Nome do Cliente', 
    required: true, 
    description: 'Nome completo ou identificação do titular', 
    examples: 'Cliente, Nome, Titular, Razão Social, Customer, Paciente' 
  },
  { 
    key: 'matricula', 
    label: 'Matrícula / Contrato', 
    description: 'Código do contrato ou número de matrícula', 
    examples: 'Matrícula, Contrato, Código, ID, Registration' 
  },
  { 
    key: 'telefone', 
    label: 'Telefone / WhatsApp', 
    description: 'Contato telefônico para chamadas e mensagens', 
    examples: 'Telefone, Celular, Phone, WhatsApp, Fone, Mobile, Tel' 
  },
  { 
    key: 'cpf', 
    label: 'CPF / Documento', 
    description: 'Documento de identificação fiscal do titular', 
    examples: 'CPF, Documento, Doc, CNPJ' 
  },
  { 
    key: 'email', 
    label: 'E-mail', 
    description: 'Endereço eletrônico para envio de faturas e boletos', 
    examples: 'Email, E-mail, Correio Eletrônico' 
  },
  { 
    key: 'valorOriginal', 
    label: 'Valor da Dívida (R$)', 
    description: 'Valor total em débito ou saldo devedor em aberto', 
    examples: 'Valor, Saldo Devedor, Total, Valor Original, Valor Em Aberto, Debt' 
  },
  { 
    key: 'diaVencimento', 
    label: 'Dia do Vencimento', 
    description: 'Dia do mês acordado para pagamento (Ex: 10, 15, 20)', 
    examples: 'Vencimento, Dia, Dia Venc, Due Day' 
  },
  { 
    key: 'primeiroMesAtraso', 
    label: 'Mês / Data de Atraso', 
    description: 'Mês inicial do débito (Ex: 01/25, 09/26 ou data)', 
    examples: 'Atraso Desde, Mês Atraso, Período, Data Vencimento' 
  },
  { 
    key: 'responsavel', 
    label: 'Cobradora / Operador', 
    description: 'Operador ou cobradora responsável pelo cliente', 
    examples: 'Cobradora, Responsável, Operador, Agent, Collector' 
  },
  { 
    key: 'informacao', 
    label: 'Observações / Histórico', 
    description: 'Anotações da cobrança, histórico e recados', 
    examples: 'Informações, Observações, Histórico, Detalhes, Notas' 
  },
  { 
    key: 'status', 
    label: 'Status da Cobrança', 
    description: 'Situação atual da cobrança (acordo, pendente, liquidado)', 
    examples: 'Status, Situação, Estado' 
  },
  { 
    key: 'dataRetorno', 
    label: 'Data de Retorno', 
    description: 'Data agendada para retorno ou cobrança posterior', 
    examples: 'Retorno, Agendamento, Data Retorno, Callback' 
  },
];

/**
 * Normalizes text for header matching (removes accents, lowercase, removes non-alphanumeric)
 */
function cleanHeader(header: string): string {
  return (header || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Auto-detects the best matching imported column for each target field
 */
export function autoDetectColumnMapping(availableHeaders: string[]): ColumnMapping {
  const mapping: ColumnMapping = {
    cliente: '',
    matricula: '',
    telefone: '',
    cpf: '',
    email: '',
    valorOriginal: '',
    diaVencimento: '',
    primeiroMesAtraso: '',
    responsavel: '',
    informacao: '',
    status: '',
    dataRetorno: '',
  };

  const cleanMap = new Map<string, string>();
  availableHeaders.forEach(h => {
    cleanMap.set(cleanHeader(h), h);
  });

  const findMatch = (patterns: string[]): string => {
    for (const pattern of patterns) {
      // Exact cleaned match
      const cleanedP = cleanHeader(pattern);
      if (cleanMap.has(cleanedP)) {
        return cleanMap.get(cleanedP)!;
      }
      // Partial match
      for (const [cleanH, originalH] of cleanMap.entries()) {
        if (cleanH.includes(cleanedP) || cleanedP.includes(cleanH)) {
          return originalH;
        }
      }
    }
    return '';
  };

  mapping.cliente = findMatch(['cliente', 'nome', 'customer', 'titular', 'paciente', 'razaosocial', 'name']);
  mapping.matricula = findMatch(['matricula', 'mat', 'contrato', 'id', 'codigo', 'cod', 'registration']);
  mapping.telefone = findMatch(['telefone', 'phone', 'celular', 'cel', 'fone', 'whatsapp', 'wpp', 'mobile', 'tel']);
  mapping.cpf = findMatch(['cpf', 'documento', 'doc', 'cnpj']);
  mapping.email = findMatch(['email', 'mail', 'correio']);
  mapping.valorOriginal = findMatch(['valor', 'total', 'saldo', 'aberto', 'amount', 'divida', 'valororiginal']);
  mapping.diaVencimento = findMatch(['diavencimento', 'diavenc', 'dia', 'vencimento', 'dueday']);
  mapping.primeiroMesAtraso = findMatch(['atrasodesde', 'primeiromesatraso', 'mesatraso', 'mes', 'periodo', 'overdue']);
  mapping.responsavel = findMatch(['responsavel', 'cobradora', 'operador', 'agente', 'collector']);
  mapping.informacao = findMatch(['informacao', 'observacao', 'obs', 'detalhes', 'historico', 'notas', 'notes']);
  mapping.status = findMatch(['status', 'situacao', 'estado']);
  mapping.dataRetorno = findMatch(['dataretorno', 'retorno', 'agendamento', 'agenda']);

  return mapping;
}

/**
 * Extracts sample values from raw rows for a specific column header
 */
export function getSampleValuesForColumn(rows: Record<string, any>[], columnKey: string, maxSamples: number = 3): string[] {
  if (!columnKey) return [];
  const samples: string[] = [];
  for (const row of rows) {
    const val = row[columnKey];
    if (val !== undefined && val !== null && String(val).trim() !== '') {
      const strVal = String(val).trim();
      if (!samples.includes(strVal)) {
        samples.push(strVal);
        if (samples.length >= maxSamples) break;
      }
    }
  }
  return samples;
}

/**
 * Parse monetary values like "R$ 1.500,50", "150.00", "120,00" into a safe number
 */
export function parseCurrencyValue(raw: any): number {
  if (typeof raw === 'number') return isNaN(raw) ? 0 : raw;
  if (!raw) return 0;
  const str = String(raw).trim();
  const cleaned = str.replace(/[R$\s]/g, '');
  // Format with Brazilian decimal comma e.g. 1.250,50 or 1250,50
  if (cleaned.includes(',')) {
    const withoutThousands = cleaned.replace(/\./g, '').replace(',', '.');
    const parsed = parseFloat(withoutThousands);
    return isNaN(parsed) ? 0 : parsed;
  }
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Applies dynamic column mapping onto raw data rows to produce robust DebtRecord objects
 */
export function applyMappingToRows(
  rows: Record<string, any>[],
  mapping: ColumnMapping,
  sheetName: string = 'Importada',
  idOffset: number = 0
): DebtRecord[] {
  const records: DebtRecord[] = [];
  let idCounter = idOffset + 1;

  rows.forEach((row, idx) => {
    // Client name is essential
    const rawClient = mapping.cliente ? String(row[mapping.cliente] || '').trim() : '';
    const rawMatricula = mapping.matricula ? String(row[mapping.matricula] || '').trim() : '';

    if (!rawClient && !rawMatricula) {
      return; // Skip empty rows
    }

    const matricula = rawMatricula || `CT-${idCounter + 1000}`;
    const cliente = rawClient || `Cliente #${matricula}`;

    // Phone
    let telefone = mapping.telefone ? String(row[mapping.telefone] || '').trim() : '';
    if (!telefone) {
      // Generate clean simulated phone if not mapped
      const cleanMat = matricula.replace(/\D/g, '').padEnd(5, '0');
      telefone = `(31) 9${cleanMat.slice(-4)}-${String(parseInt(cleanMat, 10) * 7).slice(-4).padStart(4, '5')}`;
    }

    // CPF
    const cpf = mapping.cpf ? String(row[mapping.cpf] || '').trim() : undefined;
    
    // Email
    const email = mapping.email ? String(row[mapping.email] || '').trim() : undefined;

    // Financial values
    const valorOriginal = mapping.valorOriginal ? parseCurrencyValue(row[mapping.valorOriginal]) : 150.00;

    // Due day
    let diaVencimento = 20;
    if (mapping.diaVencimento) {
      const rawDia = String(row[mapping.diaVencimento] || '');
      const match = rawDia.match(/\d+/);
      if (match) {
        const d = parseInt(match[0], 10);
        if (d >= 1 && d <= 31) diaVencimento = d;
      }
    }

    // Overdue month
    let primeiroMesAtraso = '09/26';
    if (mapping.primeiroMesAtraso) {
      const rawMes = String(row[mapping.primeiroMesAtraso] || '').trim();
      if (rawMes) {
        if (/^\d{1,2}\/\d{2,4}$/.test(rawMes)) {
          primeiroMesAtraso = rawMes.slice(-2).length === 2 ? rawMes : rawMes.slice(-5);
        } else {
          primeiroMesAtraso = rawMes;
        }
      }
    }

    // Responsável
    let responsavel = 'ROSANA';
    if (mapping.responsavel) {
      const rawResp = String(row[mapping.responsavel] || '').trim();
      if (rawResp) responsavel = normalizeResponsavel(rawResp);
    } else if (sheetName) {
      responsavel = normalizeResponsavel(sheetName);
    }

    // Informação / Observação
    const informacao = mapping.informacao ? String(row[mapping.informacao] || '').trim() : '';

    // Data retorno
    const dataRetorno = mapping.dataRetorno ? String(row[mapping.dataRetorno] || '').trim() || undefined : undefined;

    // Status
    let status: StatusCobranca = 'pendente';
    if (mapping.status) {
      const rawStatus = String(row[mapping.status] || '').toLowerCase();
      if (rawStatus.includes('acordo') || rawStatus.includes('fechado')) status = 'acordo_fechado';
      else if (rawStatus.includes('negoc') || rawStatus.includes('agend')) status = 'em_negociacao';
      else if (rawStatus.includes('boleto')) status = 'boleto_gerado';
      else if (rawStatus.includes('pago') || rawStatus.includes('liquid')) status = 'pago';
      else if (rawStatus.includes('sem contato') || rawStatus.includes('wpp')) status = 'sem_contato';
      else if (rawStatus.includes('cancel')) status = 'cancelado';
    } else {
      const infoUpper = informacao.toUpperCase();
      if (infoUpper.includes('ACORDO')) status = 'acordo_fechado';
      else if (infoUpper.includes('AGEND') || dataRetorno) status = 'em_negociacao';
      else if (infoUpper.includes('BOLETO')) status = 'boleto_gerado';
      else if (infoUpper.includes('SEM WPP')) status = 'sem_contato';
    }

    const daysOverdue = calculateDaysOverdue(primeiroMesAtraso, diaVencimento);
    const qtdParcelasVencidas = Math.max(1, Math.min(12, Math.ceil(daysOverdue / 30)));

    records.push({
      id: `imp-${Date.now()}-${idCounter++}`,
      matricula,
      cliente,
      cpf,
      telefone,
      whatsapp: telefone,
      email,
      planoContratado: 'Cartão Todos Individual',
      valorMensalidade: 39.90,
      responsavel,
      abaOrigem: sheetName,
      primeiroMesAtraso,
      diaVencimento,
      informacao,
      contatoRealizado: informacao.toUpperCase().includes('ACORDO') ? 'SIM' : 'PENDENTE',
      whatsappStatus: 'PENDENTE',
      status,
      dataRetorno,
      valorOriginal,
      valorEmAberto: valorOriginal,
      qtdParcelasVencidas,
      dataImportacao: '17/09/2026',
      notificacoes: [],
    });
  });

  return records;
}
