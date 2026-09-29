import { DebtRecord, StatusCobranca } from '../types';

export interface ParsedCsvClient {
  matricula: string;
  cliente: string;
  telefone?: string;
  diaVencimento: number;
  primeiroMesAtraso: string;
  responsavel: string;
  valorOriginal?: number;
  valorAcordo?: number;
  status: StatusCobranca;
  informacao?: string;
  dataRetorno?: string;
  abaOrigem?: string;
}

export interface BulkCsvParseResult {
  records: DebtRecord[];
  totalParsed: number;
  errors: string[];
  headersDetected: string[];
}

/**
 * Generates an exemplary CSV template content ready to download
 */
export function generateCsvTemplate(): string {
  return [
    'matricula;cliente;telefone;dia_vencimento;mes_atraso;valor;responsavel;status;informacao',
    '10245;MARIA APARECIDA DA SILVA;(31) 98877-6655;20;09/26;120,00;ROSANA;pendente;Primeiro contato agendado',
    '10246;JOAO CARLOS DE OLIVEIRA;(31) 99123-4567;10;08/26;150,00;ANA LUIZA;em_negociacao;Solicitou envio de boleto via WhatsApp',
    '10247;CARLOS EDUARDO PEREIRA;(31) 99888-1122;15;07/26;200,00;KEYLLA;acordo_fechado;Acordo firmado para pagar dia 25',
    '10248;TEREZA CRISTINA DOS SANTOS;(31) 98765-4321;20;09/26;120,00;ROSANA;boleto_gerado;Boleto emitido',
    '10249;ANTONIO MARCOS RIBEIRO;(31) 99222-3344;10;01/25;180,00;FABIOLA;critico;Atraso severo antigo'
  ].join('\r\n');
}

/**
 * Triggers browser download of the sample CSV template
 */
export function downloadCsvTemplate(): void {
  const content = generateCsvTemplate();
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', 'modelo_importacao_clientes_valora.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Detect delimiter: comma, semicolon, tab or pipe
 */
function detectDelimiter(firstLines: string[]): string {
  const counts: Record<string, number> = { ';': 0, ',': 0, '\t': 0, '|': 0 };
  for (const line of firstLines) {
    counts[';'] += (line.match(/;/g) || []).length;
    counts[','] += (line.match(/,/g) || []).length;
    counts['\t'] += (line.match(/\t/g) || []).length;
    counts['|'] += (line.match(/\|/g) || []).length;
  }
  let best = ';';
  let max = -1;
  for (const [delim, count] of Object.entries(counts)) {
    if (count > max) {
      max = count;
      best = delim;
    }
  }
  return max > 0 ? best : ';';
}

/**
 * Parse a CSV line with quotes support
 */
function splitCsvLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
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
function normalizeAgent(name: string, fallback: string): string {
  const cleaned = (name || '').trim().toUpperCase();
  if (cleaned.includes('ROSANA')) return 'ROSANA';
  if (cleaned.includes('ANA LUIZA') || cleaned.includes('AN ALUIZA') || cleaned.includes('ANALUIZA')) return 'ANA LUIZA';
  if (cleaned.includes('KEYLLA')) return 'KEYLLA';
  if (cleaned.includes('FABIOLA') || cleaned.includes('FABÍOLA')) return 'FABIOLA';
  if (cleaned.includes('GERAL')) return 'GERAL';
  return fallback;
}

/**
 * Normalizes phone numbers
 */
function cleanPhone(raw: string, matricula: string): string {
  if (!raw) {
    const cleanMat = matricula.replace(/\D/g, '').padEnd(4, '0').slice(-4);
    return `(31) 9${cleanMat}-0000`;
  }
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) 9${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  if (digits.length >= 8 && digits.length <= 9) {
    return `(31) ${digits.length === 9 ? digits.slice(0, 5) + '-' + digits.slice(5) : '9' + digits.slice(0, 4) + '-' + digits.slice(4)}`;
  }
  return raw;
}

/**
 * Parses status
 */
function parseStatus(raw: string): StatusCobranca {
  const s = (raw || '').toLowerCase().trim();
  if (s.includes('acordo') || s.includes('fechado') || s.includes('reativou') || s.includes('pago')) return 'acordo_fechado';
  if (s.includes('negoc') || s.includes('agend') || s.includes('interesse')) return 'em_negociacao';
  if (s.includes('boleto')) return 'boleto_gerado';
  if (s.includes('sem cont') || s.includes('sem wpp') || s.includes('deslig') || s.includes('caixa')) return 'sem_contato';
  if (s.includes('cancel') || s.includes('multa') || s.includes('judicial')) return 'cancelado';
  return 'pendente';
}

/**
 * Main parser for bulk client CSV spreadsheet
 */
export function parseBulkClientsCsv(
  csvContent: string,
  options: {
    defaultResponsavel?: string;
    defaultAba?: string;
    defaultVencimento?: number;
    defaultMesAtraso?: string;
  } = {}
): BulkCsvParseResult {
  const defaultResp = options.defaultResponsavel || 'ROSANA';
  const defaultAba = options.defaultAba || 'Importação CSV';
  const defaultVenc = options.defaultVencimento || 20;
  const defaultMes = options.defaultMesAtraso || '09/26';

  const rawLines = csvContent.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (rawLines.length === 0) {
    return { records: [], totalParsed: 0, errors: ['O arquivo CSV está vazio.'], headersDetected: [] };
  }

  const delimiter = detectDelimiter(rawLines.slice(0, 10));
  const errors: string[] = [];
  const records: DebtRecord[] = [];

  // Check if first row is a header
  const firstRowCols = splitCsvLine(rawLines[0], delimiter).map(c => c.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, ''));
  
  let hasHeader = false;
  let colIndexMap: {
    matricula?: number;
    cliente?: number;
    telefone?: number;
    vencimento?: number;
    mes?: number;
    valor?: number;
    responsavel?: number;
    status?: number;
    informacao?: number;
    dataRetorno?: number;
  } = {};

  const isHeaderCandidate = firstRowCols.some(col => 
    col.includes('matricula') || 
    col.includes('cliente') || 
    col.includes('nome') || 
    col.includes('telefone') || 
    col.includes('venc') || 
    col.includes('mes') ||
    col.includes('atraso') ||
    col.includes('status')
  );

  if (isHeaderCandidate) {
    hasHeader = true;
    firstRowCols.forEach((col, idx) => {
      if (col.includes('matricula') || col.includes('matr') || col === 'mat' || col === 'id') {
        colIndexMap.matricula = idx;
      } else if (col.includes('cliente') || col.includes('nome') || col.includes('razao')) {
        colIndexMap.cliente = idx;
      } else if (col.includes('telef') || col.includes('celular') || col.includes('wpp') || col.includes('whatsapp') || col.includes('contato')) {
        colIndexMap.telefone = idx;
      } else if (col.includes('venc') || col.includes('dia')) {
        colIndexMap.vencimento = idx;
      } else if (col.includes('mes') || col.includes('atraso') || col.includes('periodo')) {
        colIndexMap.mes = idx;
      } else if (col.includes('valor') || col.includes('debito') || col.includes('saldo')) {
        colIndexMap.valor = idx;
      } else if (col.includes('resp') || col.includes('cobrador') || col.includes('agente') || col.includes('carteira')) {
        colIndexMap.responsavel = idx;
      } else if (col.includes('status') || col.includes('situacao') || col.includes('etapa')) {
        colIndexMap.status = idx;
      } else if (col.includes('obs') || col.includes('info') || col.includes('historico') || col.includes('nota')) {
        colIndexMap.informacao = idx;
      } else if (col.includes('retorno') || col.includes('agend')) {
        colIndexMap.dataRetorno = idx;
      }
    });
  }

  const startLine = hasHeader ? 1 : 0;
  const nowStr = new Date().toLocaleDateString('pt-BR');
  let currentResp = defaultResp;

  for (let i = startLine; i < rawLines.length; i++) {
    const line = rawLines[i];
    if (!line) continue;

    const cols = splitCsvLine(line, delimiter);
    if (cols.length === 0 || cols.every(c => !c)) continue;

    let matricula = '';
    let cliente = '';
    let telefone = '';
    let diaVencimento = defaultVenc;
    let primeiroMesAtraso = defaultMes;
    let responsavel = currentResp;
    let status: StatusCobranca = 'pendente';
    let informacao = '';
    let dataRetorno: string | undefined = undefined;
    let valorOriginal = 120.00;
    let valorAcordo: number | undefined = undefined;

    if (hasHeader) {
      if (colIndexMap.matricula !== undefined && cols[colIndexMap.matricula]) {
        matricula = cols[colIndexMap.matricula].trim();
      }
      if (colIndexMap.cliente !== undefined && cols[colIndexMap.cliente]) {
        cliente = cols[colIndexMap.cliente].trim();
      }
      if (colIndexMap.telefone !== undefined && cols[colIndexMap.telefone]) {
        telefone = cols[colIndexMap.telefone].trim();
      }
      if (colIndexMap.vencimento !== undefined && cols[colIndexMap.vencimento]) {
        const v = cols[colIndexMap.vencimento].match(/\d+/);
        if (v) diaVencimento = parseInt(v[0], 10);
      }
      if (colIndexMap.mes !== undefined && cols[colIndexMap.mes]) {
        primeiroMesAtraso = cols[colIndexMap.mes].trim();
      }
      if (colIndexMap.responsavel !== undefined && cols[colIndexMap.responsavel]) {
        responsavel = normalizeAgent(cols[colIndexMap.responsavel], defaultResp);
      }
      if (colIndexMap.status !== undefined && cols[colIndexMap.status]) {
        status = parseStatus(cols[colIndexMap.status]);
      }
      if (colIndexMap.informacao !== undefined && cols[colIndexMap.informacao]) {
        informacao = cols[colIndexMap.informacao].trim();
      }
      if (colIndexMap.dataRetorno !== undefined && cols[colIndexMap.dataRetorno]) {
        dataRetorno = cols[colIndexMap.dataRetorno].trim();
      }
      if (colIndexMap.valor !== undefined && cols[colIndexMap.valor]) {
        const cleanVal = cols[colIndexMap.valor].replace(/[R$\s]/g, '').replace('.', '').replace(',', '.');
        const parsedVal = parseFloat(cleanVal);
        if (!isNaN(parsedVal) && parsedVal > 0) {
          valorOriginal = parsedVal;
          if (status === 'acordo_fechado') valorAcordo = parsedVal;
        }
      }
    } else {
      // Positional heuristic fallback
      // Check if line is a section header (e.g. ROSANA, ANA LUIZA)
      if (cols.length === 1 || (!cols[0] && cols[1])) {
        const singleVal = (cols[0] || cols[1] || '').toUpperCase();
        if (['ROSANA', 'ANA LUIZA', 'KEYLLA', 'FABIOLA', 'GERAL'].includes(singleVal)) {
          currentResp = singleVal;
          continue;
        }
      }

      // If col 0 looks like matricula
      if (/^\d+$/.test(cols[0])) {
        matricula = cols[0];
        cliente = cols[1] || `Cliente ${matricula}`;
        if (cols[2]) telefone = cols[2];
        if (cols[3]) {
          const d = cols[3].match(/\d+/);
          if (d) diaVencimento = parseInt(d[0], 10);
        }
        if (cols[4]) primeiroMesAtraso = cols[4];
        if (cols[5]) {
          const cleanVal = cols[5].replace(/[R$\s]/g, '').replace(',', '.');
          const p = parseFloat(cleanVal);
          if (!isNaN(p)) valorOriginal = p;
        }
        if (cols[6]) informacao = cols.slice(6).join(' | ');
      } else {
        // Col 0 is client name
        cliente = cols[0];
        matricula = cols[1] && /^\d+$/.test(cols[1]) ? cols[1] : `GEN-${i}`;
        if (cols[2]) telefone = cols[2];
        if (cols[3]) {
          const d = cols[3].match(/\d+/);
          if (d) diaVencimento = parseInt(d[0], 10);
        }
        if (cols[4]) primeiroMesAtraso = cols[4];
        if (cols[5]) informacao = cols.slice(5).join(' | ');
      }
    }

    // Sanitize client name and matricula
    if (!cliente && !matricula) continue;
    if (!cliente && matricula) cliente = `Cliente ${matricula}`;
    if (!matricula) matricula = `CLI-${Date.now()}-${i}`;

    // Clean details in client name if present e.g. "JOAO DA SILVA (DN 10/10/1980)"
    let detalheAdicional: string | undefined = undefined;
    const parenMatch = cliente.match(/\((.*?)\)/);
    if (parenMatch) {
      detalheAdicional = parenMatch[1];
      cliente = cliente.replace(/\(.*?\)/g, '').trim();
    }

    // Auto find phone if still empty
    if (!telefone) {
      for (const col of cols) {
        if (col && /(\(?\d{2}\)?\s*9?\d{4}[-\s]?\d{4})/.test(col)) {
          telefone = col;
          break;
        }
      }
    }

    // Auto extract dates from informacao if any
    if (!dataRetorno && informacao) {
      const match = informacao.match(/(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)/);
      if (match && informacao.toUpperCase().includes('AGEND')) {
        dataRetorno = match[1];
      }
    }

    // Contact and WhatsApp status
    const contatoRealizado = status === 'acordo_fechado' || status === 'em_negociacao' || Boolean(dataRetorno) ? 'SIM' : 'PENDENTE';
    const whatsappStatus = status === 'sem_contato' ? 'NÃO' : 'PENDENTE';

    records.push({
      id: `rec-bulk-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
      matricula: matricula.trim(),
      cliente: cliente.trim(),
      detalheAdicional,
      responsavel,
      abaOrigem: defaultAba,
      primeiroMesAtraso,
      diaVencimento: diaVencimento >= 1 && diaVencimento <= 31 ? diaVencimento : 20,
      informacao,
      contatoRealizado,
      whatsappStatus,
      status,
      dataRetorno,
      valorOriginal,
      valorAcordo,
      telefone: cleanPhone(telefone, matricula),
      dataImportacao: nowStr,
      notificacoes: [],
    });
  }

  return {
    records,
    totalParsed: records.length,
    errors,
    headersDetected: hasHeader ? firstRowCols : [],
  };
}
