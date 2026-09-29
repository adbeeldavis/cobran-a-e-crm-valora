import { DebtRecord, StatusCobranca } from '../types';

export function parseFlexibleLine(cols: string[], index: number, sheetName: string, defaultResponsavel: string): DebtRecord | null {
  const col0 = (cols[0] || '').trim();
  const col1 = (cols[1] || '').trim();
  const col2 = (cols[2] || '').trim();
  const col3 = (cols[3] || '').trim();
  const col4 = (cols[4] || '').trim();
  const col5 = (cols[5] || '').trim();
  const col6 = (cols[6] || '').trim();
  const col7 = (cols[7] || '').trim();

  // If header row
  const lower0 = col0.toLowerCase();
  const lower1 = col1.toLowerCase();
  if (lower0 === 'matricula' || lower0 === 'mat' || (lower0 === '' && lower1 === 'cliente')) {
    return null;
  }

  // Check section headers
  if (!col0 && col1) {
    return null; // Section header handled separately
  }

  // Must have at least a client or matricula
  if (!col0 && !col1) return null;

  let matricula = col0;
  let clienteRaw = col1;

  // Sometimes matricula is in col1 if col0 is empty
  if (!matricula && col1 && /^\d+$/.test(col1)) {
    matricula = col1;
    clienteRaw = col2 || 'Cliente não informado';
  } else if (!clienteRaw && col0 && !/^\d+$/.test(col0)) {
    clienteRaw = col0;
    matricula = `TEMP-${index}`;
  } else if (!matricula) {
    matricula = `M-${index}`;
  }

  // Find telephone
  let telefone: string | undefined = undefined;
  for (const c of [col2, col3, col4, col5, col6]) {
    if (c && /(\(?\d{2}\)?\s*9?\d{4}[-\s]?\d{4})/.test(c)) {
      telefone = c;
      break;
    }
  }

  // Find due day
  let diaVencimento = 20;
  for (const c of cols) {
    const dMatch = c.match(/dia\s*(\d{1,2})/i) || c.match(/^(\d{1,2})$/);
    if (dMatch) {
      const val = parseInt(dMatch[1], 10);
      if (val >= 1 && val <= 31) {
        diaVencimento = val;
        break;
      }
    }
  }

  // Find month/year of overdue
  let mesAtraso = '09/26';
  for (const c of cols) {
    const mMatch = c.match(/(\d{2}\/\d{2,4})/);
    if (mMatch) {
      const mStr = mMatch[1];
      if (mStr.length === 5) {
        mesAtraso = mStr; // '01/25', '08/26'
        break;
      } else if (mStr.length === 7) {
        mesAtraso = mStr.substring(0, 2) + '/' + mStr.substring(5, 7);
        break;
      }
    }
  }

  // Notes and status
  const allText = cols.join(' | ');
  let status: StatusCobranca = 'pendente';
  const upperText = allText.toUpperCase();

  if (upperText.includes('REATIVOU') || upperText.includes('PAGO') || upperText.includes('PAGOU')) {
    status = 'acordo_fechado';
  } else if (upperText.includes('BOLETO 2027') || upperText.includes('BOLETO 2026') || upperText.includes('BOLETO GERADO')) {
    status = 'boleto_gerado';
  } else if (upperText.includes('CANCELADO') || upperText.includes('FALECEU') || upperText.includes('MULTA')) {
    status = 'cancelado';
  } else if (upperText.includes('AGENDADO') || upperText.includes('AGENDOU') || upperText.includes('INTERESSE')) {
    status = 'em_negociacao';
  } else if (upperText.includes('SEM CNTT') || upperText.includes('SEM WPP') || upperText.includes('NÃO ATENDEU') || upperText.includes('DESLIGOU')) {
    status = 'sem_contato';
  }

  // Details in parentheses
  let cliente = clienteRaw;
  let detalheAdicional: string | undefined = undefined;
  const parenMatch = clienteRaw.match(/\((.*?)\)/);
  if (parenMatch) {
    detalheAdicional = parenMatch[1];
    cliente = clienteRaw.replace(/\(.*?\)/g, '').trim();
  }

  return {
    id: `rec-flex-${matricula || 'item'}-${index}-${Math.random().toString(36).substring(2, 7)}`,
    matricula,
    cliente,
    detalheAdicional,
    responsavel: defaultResponsavel,
    abaOrigem: sheetName,
    primeiroMesAtraso: mesAtraso,
    diaVencimento,
    informacao: col4 || col3 || col2 || '',
    contatoRealizado: upperText.includes('OK') || upperText.includes('SIM') ? 'SIM' : 'PENDENTE',
    whatsappStatus: upperText.includes('SEM WPP') || upperText.includes('NÃO TEM WHAT') ? 'NÃO' : 'OK',
    status,
    telefone,
    valorOriginal: 120.00,
    notificacoes: [],
  };
}
