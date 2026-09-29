import * as XLSX from 'xlsx';
import { DebtRecord, StatusCobranca, SheetInfo } from '../types';

/**
 * Parses raw CSV lines handling quoted fields correctly
 */
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Normalizes collector/agent names
 */
export function normalizeResponsavel(name: string): string {
  const cleaned = (name || '').trim().toUpperCase();
  if (cleaned.includes('ROSANA')) return 'ROSANA';
  if (cleaned.includes('ANA LUIZA') || cleaned.includes('AN ALUIZA')) return 'ANA LUIZA';
  if (cleaned.includes('KEYLLA')) return 'KEYLLA';
  if (cleaned.includes('FABIOLA') || cleaned.includes('FABÍOLA')) return 'FABIOLA';
  return 'GERAL';
}

/**
 * Extracts return or scheduled dates from text or extra columns
 */
function extractScheduledDate(info: string, extraCols: string[]): string | undefined {
  // Look in info like "AGENDADO PARA 04/09", "AGENDOU PARA DIA 15/09", "AGENDADO PARA DIA 04/09"
  const regexAgenda = /AGEND(?:ADO|OU)\s+PARA\s+(?:DIA\s+)?(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)/i;
  const match = info.match(regexAgenda);
  if (match) {
    return match[1];
  }

  // Look in extra columns for dates like DD/MM/YYYY
  for (const col of extraCols) {
    if (col && /\d{2}\/\d{2}\/\d{4}/.test(col)) {
      return col;
    }
    if (col && /^\d{2}\/\d{2}$/.test(col)) {
      return `${col}/2025`;
    }
  }

  return undefined;
}

/**
 * Extracts agreement value if mentioned, e.g. "ACORDO DE 85,00"
 */
function extractAgreementValue(info: string): number | undefined {
  const match = info.match(/ACORDO\s+DE\s+(\d+(?:[.,]\d{2})?)/i);
  if (match) {
    const val = match[1].replace(',', '.');
    return parseFloat(val);
  }
  return undefined;
}

/**
 * Generate simulated clean Brazilian phone numbers based on matricula for test dialing/WhatsApp
 */
function generateClientPhone(matricula: string): string {
  const cleanMat = matricula.replace(/\D/g, '').padEnd(5, '0');
  const ddd = '31'; // standard MG area code from context (Belo Horizonte/Betim region)
  const part1 = '9' + cleanMat.slice(-4);
  const part2 = String(parseInt(cleanMat, 10) * 7).slice(-4).padStart(4, '5');
  return `(${ddd}) ${part1}-${part2}`;
}

export function parseBillingCsv(
  csvContent: string, 
  defaultSheetName?: string, 
  idOffset: number = 0
): DebtRecord[] {
  const lines = csvContent.split(/\r?\n/);
  const records: DebtRecord[] = [];

  // Determine initial collector from sheet name if applicable
  let initialResponsavel = 'ROSANA';
  let initialAba = defaultSheetName || 'Geral';
  if (defaultSheetName) {
    const upperSheet = defaultSheetName.toUpperCase();
    if (upperSheet.includes('ROSANA')) initialResponsavel = 'ROSANA';
    else if (upperSheet.includes('ANA LUIZA') || upperSheet.includes('AN ALUIZA')) initialResponsavel = 'ANA LUIZA';
    else if (upperSheet.includes('KEYLLA')) initialResponsavel = 'KEYLLA';
    else if (upperSheet.includes('FABIOLA') || upperSheet.includes('FABÍOLA')) initialResponsavel = 'FABIOLA';
  }

  let currentResponsavel = initialResponsavel;
  let currentAba = initialAba;
  let currentMonthGroup = '09/26';
  let currentBatchDate = '02/09/2026';
  let idCounter = idOffset + 1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cols = parseCsvLine(line);
    const col0 = (cols[0] || '').trim();
    const col1 = (cols[1] || '').trim();
    const col2 = (cols[2] || '').trim();
    const col3 = (cols[3] || '').trim();
    const col4 = (cols[4] || '').trim();
    const extraCols = cols.slice(5);

    // Skip CSV header line
    if (col0.toLowerCase() === 'matricula' && col1.toLowerCase() === 'cliente') {
      continue;
    }

    // Check if this line is a date or collector section header
    const upperCol1 = col1.toUpperCase();
    if (!col0 && upperCol1) {
      if (upperCol1.includes('SETEMBRO') || upperCol1.includes('OUTUBRO') || upperCol1.includes('AGOSTO')) {
        currentBatchDate = upperCol1;
        continue;
      }
      if (
        upperCol1.includes('ROSANA') || 
        upperCol1.includes('ANA LUIZA') || 
        upperCol1.includes('AN ALUIZA') || 
        upperCol1.includes('KEYLLA') ||
        upperCol1.includes('FABIOLA')
      ) {
        currentResponsavel = normalizeResponsavel(upperCol1);
        if (!defaultSheetName) {
          currentAba = `Aba ${currentResponsavel}`;
        }
        continue;
      }
    }

    // Must have at least a client name or matricula
    if (!col0 && !col1) {
      continue;
    }

    // Track tab origin if not explicitly provided
    if (!defaultSheetName) {
      if (i < 40) {
        currentAba = 'Histórico 2025';
      } else if (col4.toUpperCase().includes('FABIOLA') || col4.toUpperCase().includes('BOLETO 2027')) {
        currentAba = 'Boletos (Fabiola)';
      } else {
        currentAba = `Aba ${currentResponsavel}`;
      }
    }

    const matricula = col0 || `TEMP-${idCounter}`;
    const clienteRaw = col1 || 'Cliente não identificado';

    // Parse additional details like (DN04/06/1979) or (J128)
    let cliente = clienteRaw;
    let detalheAdicional: string | undefined = undefined;
    const parenMatch = clienteRaw.match(/\((.*?)\)/);
    if (parenMatch) {
      detalheAdicional = parenMatch[1];
      cliente = clienteRaw.replace(/\(.*?\)/g, '').trim();
    }

    // Overdue month
    let mesAtraso = col2 || currentMonthGroup;
    if (mesAtraso.includes('dez/26')) {
      mesAtraso = '12/26';
    } else if (!mesAtraso) {
      mesAtraso = currentMonthGroup;
    } else if (/^\d{2}\/\d{2}$/.test(mesAtraso)) {
      currentMonthGroup = mesAtraso;
    }

    // Due day (extract digits from "DIA 10", "DIA 15", "DIA 20", "20", etc.)
    let diaVencimento = 20;
    const diaMatch = col3.match(/\d+/);
    if (diaMatch) {
      diaVencimento = parseInt(diaMatch[0], 10);
    }

    const informacao = col4;
    const dataRetorno = extractScheduledDate(informacao, extraCols);
    const valorAcordo = extractAgreementValue(informacao);

    // Contact and WhatsApp flags from extra columns
    const allExtras = extraCols.join(' ').toUpperCase();
    const contatoRealizado: 'SIM' | 'NÃO' | 'PENDENTE' = 
      allExtras.includes('NÃO') ? 'NÃO' : 
      allExtras.includes('OK') || informacao.toUpperCase().includes('ACORDO') ? 'SIM' : 'PENDENTE';

    const whatsappStatus: 'OK' | 'NÃO' | 'PENDENTE' = 
      informacao.toUpperCase().includes('SEM WPP') ? 'NÃO' :
      allExtras.includes('OK') ? 'OK' : 'PENDENTE';

    // Determine status
    let status: StatusCobranca = 'pendente';
    const infoUpper = informacao.toUpperCase();

    if (infoUpper.includes('ACORDO') || (allExtras.includes('OK') && dataRetorno)) {
      status = 'acordo_fechado';
    } else if (infoUpper.includes('AGEND') || dataRetorno) {
      status = 'em_negociacao';
    } else if (infoUpper.includes('BOLETO') && infoUpper.includes('GERADO')) {
      status = 'boleto_gerado';
    } else if (infoUpper.includes('SEM WPP') || contatoRealizado === 'NÃO') {
      status = 'sem_contato';
    }

    // If notes mention Fabiola and no other collector set
    let responsavelLinha = currentResponsavel;
    if (informacao.toUpperCase().includes('FABIOLA') && currentResponsavel === 'ROSANA' && i > 260) {
      responsavelLinha = 'FABIOLA';
    }

    // Estimate base parcel value (default R$ 120,00 if no agreement specified)
    const valorOriginal = valorAcordo ? valorAcordo : 120.00;

    // Generate guaranteed unique ID per record
    const sheetTag = defaultSheetName ? defaultSheetName.replace(/[^\w\d]/g, '').toLowerCase() : 'std';
    const cleanMat = matricula ? matricula.replace(/\D/g, '') : `${i}`;
    const uniqueRecordId = `rec-${sheetTag}-${cleanMat || i}-${idCounter++}-${Math.random().toString(36).substring(2, 6)}`;

    records.push({
      id: uniqueRecordId,
      matricula,
      cliente,
      detalheAdicional,
      responsavel: responsavelLinha,
      abaOrigem: defaultSheetName || currentAba,
      primeiroMesAtraso: mesAtraso,
      diaVencimento,
      informacao,
      contatoRealizado,
      whatsappStatus,
      status,
      dataRetorno,
      valorOriginal,
      valorAcordo,
      telefone: generateClientPhone(matricula),
      dataImportacao: currentBatchDate,
      notificacoes: [],
    });
  }

  return records;
}

/**
 * Parses an entire Excel workbook (.xlsx, .xls) reading ALL tabs/sheets
 */
export function parseExcelWorkbook(fileBuffer: ArrayBuffer | Uint8Array): {
  sheets: SheetInfo[];
  allRecords: DebtRecord[];
} {
  const workbook = XLSX.read(fileBuffer, { type: 'array' });
  const sheets: SheetInfo[] = [];
  const allRecords: DebtRecord[] = [];
  let globalIdCounter = 1;

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) continue;

    // Convert sheet to CSV representation
    const csvContent = XLSX.utils.sheet_to_csv(worksheet, { blankrows: false });
    if (!csvContent.trim()) {
      sheets.push({
        name: sheetName,
        recordCount: 0,
        records: [],
        selected: false,
      });
      continue;
    }

    const records = parseBillingCsv(csvContent, sheetName, globalIdCounter);
    globalIdCounter += records.length;

    sheets.push({
      name: sheetName,
      recordCount: records.length,
      records,
      selected: records.length > 0,
    });

    allRecords.push(...records);
  }

  return { sheets, allRecords };
}

/**
 * Calculates days overdue from "MM/YY" and day of month relative to today (Sept 15, 2026)
 */
export function calculateDaysOverdue(primeiroMesAtraso: string, diaVencimento: number): number {
  const parts = primeiroMesAtraso.split('/');
  if (parts.length !== 2) return 30;

  const month = parseInt(parts[0], 10);
  let year = parseInt(parts[1], 10);
  if (year < 100) year += 2000;

  const dueDate = new Date(year, month - 1, diaVencimento);
  const refDate = new Date(2026, 8, 15); // Sept 15, 2026

  const diffTime = refDate.getTime() - dueDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  return diffDays > 0 ? diffDays : 0;
}

/**
 * Classifies delinquency severity
 */
export function getAgingBucket(days: number): { label: string; color: string; badge: string } {
  if (days <= 30) {
    return { label: 'Recente (Até 30 dias)', color: 'text-emerald-700 bg-emerald-50 border-emerald-200', badge: 'Até 30d' };
  }
  if (days <= 60) {
    return { label: 'Moderado (31 a 60 dias)', color: 'text-amber-700 bg-amber-50 border-amber-200', badge: '31-60d' };
  }
  if (days <= 180) {
    return { label: 'Atenção (61 a 180 dias)', color: 'text-orange-700 bg-orange-50 border-orange-200', badge: '61-180d' };
  }
  return { label: 'Crítico (+180 dias)', color: 'text-rose-700 bg-rose-50 border-rose-200', badge: '+180d' };
}

/**
 * Calculates days elapsed without any registered contact with the customer
 */
export function calculateDaysWithoutContact(record: DebtRecord): { days: number; isOver30Days: boolean; label: string } {
  // If explicitly has dataUltimoContato
  if (record.dataUltimoContato) {
    const parts = record.dataUltimoContato.split('/');
    if (parts.length >= 2) {
      const d = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      let y = parts.length === 3 ? parseInt(parts[2], 10) : 2026;
      if (y < 100) y += 2000;
      const contactDate = new Date(y, m - 1, d);
      const refDate = new Date(2026, 8, 15);
      const diff = Math.floor((refDate.getTime() - contactDate.getTime()) / (1000 * 60 * 60 * 24));
      const days = Math.max(0, diff);
      return {
        days,
        isOver30Days: days > 30,
        label: days === 0 ? 'Contatado hoje' : `${days} dias sem contato`
      };
    }
  }

  // If notifications exist
  if (record.notificacoes && record.notificacoes.length > 0) {
    const lastNotif = record.notificacoes[record.notificacoes.length - 1];
    const parts = lastNotif.data.split('/');
    if (parts.length >= 2) {
      const d = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      let y = parts.length === 3 ? parseInt(parts[2], 10) : 2026;
      if (y < 100) y += 2000;
      const contactDate = new Date(y, m - 1, d);
      const refDate = new Date(2026, 8, 15);
      const diff = Math.floor((refDate.getTime() - contactDate.getTime()) / (1000 * 60 * 60 * 24));
      const days = Math.max(0, diff);
      return {
        days,
        isOver30Days: days > 30,
        label: days === 0 ? 'Notificado hoje' : `${days} dias sem contato`
      };
    }
  }

  // If already agreed or marked SIM without explicit date, it was contacted during initial batch
  const infoUpper = (record.informacao || '').toUpperCase();
  if (record.contatoRealizado === 'SIM' && !infoUpper.includes('NÃO ATENDE') && !infoUpper.includes('SEM WPP')) {
    return {
      days: 13,
      isOver30Days: false,
      label: 'Contatado há 13d'
    };
  }

  // If never contacted or marked NÃO / PENDENTE:
  const overdueDays = calculateDaysOverdue(record.primeiroMesAtraso, record.diaVencimento);
  const days = Math.max(overdueDays, 32);
  return {
    days,
    isOver30Days: true,
    label: `${days} dias sem contato`
  };
}
