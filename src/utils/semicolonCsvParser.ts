import { DebtRecord, StatusCobranca } from '../types';

export function parseSemicolonCsv(csvContent: string): DebtRecord[] {
  const lines = csvContent.split('\n');
  const records: DebtRecord[] = [];
  let currentAgent = 'ANA LUIZA';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cols = line.split(';').map(c => c.trim().replace(/^"|"$/g, ''));
    const col0 = cols[0] || '';
    const col1 = cols[1] || '';
    const col2 = cols[2] || '';
    const col3 = cols[3] || '';
    const col4 = cols[4] || ''; // MATRICULA
    const col5 = cols[5] || ''; // CLIENTE

    // Check header
    if (col0.toLowerCase() === 'cliente' && (col4.toLowerCase().includes('mat') || col1.toLowerCase().includes('quant'))) {
      continue;
    }

    // Check if section header (agent name)
    const upper0 = col0.toUpperCase();
    if (['ANA LUIZA', 'FABRINE', 'KETLEY', 'KIARA', 'EDUARDA', 'KEYLLA', 'DANI'].includes(upper0)) {
      currentAgent = upper0;
      if (!col4 && !col5) continue;
    }

    // Extract matricula and client name
    let matricula = col4;
    let cliente = col5;

    // Fallbacks if columns shifted
    if (!matricula && /^\d+$/.test(col0)) {
      matricula = col0;
      cliente = col1 || cliente;
    }
    if (!cliente && col0 && isNaN(Number(col0)) && !['NOVO HORIZONTE', 'CLIENTE'].includes(col0)) {
      cliente = col0;
    }

    // If still no client or it's a section name without matricula
    if (!cliente || (!matricula && !cols[6] && !cols[7])) {
      continue;
    }

    if (!matricula) {
      matricula = `GEN-${records.length + 1}`;
    }

    // Find phone
    let telefone = cols[6] || cols[7] || '';
    if (!telefone.match(/\d{4}/)) {
      for (const col of cols) {
        if (col && /(\(?\d{2}\)?\s*9?\d{4}[-\s]?\d{4})/.test(col)) {
          telefone = col;
          break;
        }
      }
    }

    // Find due day
    let diaVencimento = 20;
    for (const col of cols) {
      const match = col.match(/dia\s*(\d{1,2})/i);
      if (match) {
        const val = parseInt(match[1], 10);
        if (val >= 1 && val <= 31) {
          diaVencimento = val;
          break;
        }
      }
    }

    // Find first month in delay
    let primeiroMesAtraso = cols[9] || '';
    if (!primeiroMesAtraso.match(/\d{1,2}[\/\-]\d{2,4}/)) {
      for (const col of [cols[6], cols[7], cols[8], cols[10]]) {
        if (col && /^\d{1,2}\/\d{2,4}$/.test(col)) {
          primeiroMesAtraso = col;
          break;
        }
      }
    }
    if (!primeiroMesAtraso) primeiroMesAtraso = '01/24';

    // Info & notes
    const informacao = cols[10] || cols[11] || cols[8] || '';

    // Sheet / Origin
    let abaOrigem = col3 || col2 || 'Dani - Geral';
    if (!abaOrigem.startsWith('Aba:') && !abaOrigem.startsWith('Dani')) {
      abaOrigem = `Aba: ${abaOrigem}`;
    }

    // Status
    let status: StatusCobranca = 'pendente';
    const allText = cols.join(' ').toLowerCase();
    if (allText.includes('cancelad') || allText.includes('multa')) {
      status = 'cancelado';
    } else if (allText.includes('reativ') || allText.includes('negociad') || allText.includes('acordo')) {
      status = 'em_negociacao';
    } else if (allText.includes('pago') || allText.includes('renovou')) {
      status = 'pago';
    }

    records.push({
      id: `cons-${matricula}-${i}`,
      matricula,
      cliente,
      responsavel: currentAgent,
      abaOrigem,
      primeiroMesAtraso,
      diaVencimento,
      telefone: telefone || undefined,
      informacao: informacao || undefined,
      contatoRealizado: telefone ? 'SIM' : 'PENDENTE',
      whatsappStatus: 'OK',
      status,
      notificacoes: []
    });
  }

  return records;
}
