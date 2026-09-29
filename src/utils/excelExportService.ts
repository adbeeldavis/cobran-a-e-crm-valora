import ExcelJS from 'exceljs';
import { DebtRecord } from '../types';
import { calculateDaysOverdue, getAgingBucket } from './sheetParser';
import { isDueInNextDays } from '../components/UnifiedSheetTable';

export interface XlsxExportOptions {
  filename?: string;
  sheetTitle?: string;
  filterDescription?: string;
}

/**
 * Exports the filtered UnifiedSheetTable records to a genuine styled .xlsx file
 * preserving status colors, due date priority highlights, and financial formatting.
 */
export async function exportUnifiedSheetToXlsx(
  records: DebtRecord[],
  options?: XlsxExportOptions
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Central de Cobrança Valora';
  workbook.lastModifiedBy = 'Valora Gestão e Finanças';
  workbook.created = new Date();
  workbook.modified = new Date();

  const worksheet = workbook.addWorksheet(options?.sheetTitle || 'Planilha Unificada', {
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1 }
  });

  // 1. Header Title Banner
  worksheet.mergeCells('A1:Q1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = 'VALORA GESTÃO E FINANÇAS — CENTRAL UNIFICADA DE COBRANÇA';
  titleCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E3A8A' } // Navy Blue
  };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  worksheet.getRow(1).height = 32;

  // 2. Export Metadata Sub-banner
  worksheet.mergeCells('A2:Q2');
  const subTitleCell = worksheet.getCell('A2');
  const now = new Date();
  const dateFormatted = now.toLocaleDateString('pt-BR');
  const timeFormatted = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  subTitleCell.value = `Exportação Gerada em: ${dateFormatted} às ${timeFormatted} | Total de Clientes Filtrados: ${records.length} | ${options?.filterDescription || 'Visualização Filtrada pelo Operador'}`;
  subTitleCell.font = { name: 'Calibri', size: 9, italic: true, color: { argb: 'FF475569' } };
  subTitleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF1F5F9' }
  };
  subTitleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  worksheet.getRow(2).height = 20;

  // Empty separator row
  worksheet.getRow(3).height = 10;

  // 3. Table Column Headers
  const headers = [
    { key: 'matricula', header: 'Matrícula', width: 14 },
    { key: 'cliente', header: 'Nome do Cliente', width: 34 },
    { key: 'telefone', header: 'Telefone / WhatsApp', width: 18 },
    { key: 'responsavel', header: 'Cobradora', width: 16 },
    { key: 'abaOrigem', header: 'Aba Origem', width: 18 },
    { key: 'diaVencimento', header: 'Dia Venc.', width: 12 },
    { key: 'prioridadeVencimento', header: 'Prioridade / Vencimento', width: 24 },
    { key: 'primeiroMesAtraso', header: '1º Mês Atraso', width: 15 },
    { key: 'diasAtraso', header: 'Dias Atraso', width: 13 },
    { key: 'agingFaixa', header: 'Faixa de Aging', width: 22 },
    { key: 'valorOriginal', header: 'Valor Original (R$)', width: 18 },
    { key: 'valorEmAberto', header: 'Valor em Aberto (R$)', width: 19 },
    { key: 'valorRecuperado', header: 'Valor Recuperado (R$)', width: 20 },
    { key: 'status', header: 'Status Cobrança', width: 20 },
    { key: 'dataUltimoContato', header: 'Último Contato', width: 16 },
    { key: 'dataRetorno', header: 'Retorno Agendado', width: 16 },
    { key: 'informacao', header: 'Observações / Acordo', width: 38 },
  ];

  const headerRow = worksheet.getRow(4);
  headerRow.height = 26;

  headers.forEach((col, idx) => {
    worksheet.getColumn(idx + 1).width = col.width;
    const cell = headerRow.getCell(idx + 1);
    cell.value = col.header;
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0F172A' } // Slate-900
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'medium', color: { argb: 'FF2563EB' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
    };
  });

  // Financial totals accumulator
  let totalOriginal = 0;
  let totalAberto = 0;
  let totalRecuperado = 0;

  // 4. Populate Data Rows
  let currentRowIndex = 5;

  records.forEach((record) => {
    const days = calculateDaysOverdue(record.primeiroMesAtraso || '', record.diaVencimento);
    const bucket = getAgingBucket(days);
    const orig = record.valorOriginal ?? 120;
    const pago = record.valorRecuperado || record.valorPago || 
      (record.status === 'pago' || record.status === 'recuperado' 
        ? orig 
        : (record.status === 'acordo_fechado' && record.valorAcordo ? record.valorAcordo : 0));
    const aberto = record.valorEmAberto !== undefined
      ? record.valorEmAberto
      : (record.status === 'pago' || record.status === 'recuperado' ? 0 : Math.max(0, orig - pago));

    totalOriginal += orig;
    totalAberto += aberto;
    totalRecuperado += pago;

    // Check due date priority (next 3 days)
    const dueCheck = isDueInNextDays(record.diaVencimento, 3);

    let prioridadeLabel = 'Normal';
    let prioridadeBg = 'FFF8FAFC'; // slate-50
    let prioridadeFg = 'FF475569'; // slate-600
    let isRowUpcoming = false;

    if (dueCheck.isUpcoming) {
      isRowUpcoming = true;
      if (dueCheck.daysRemaining === 0) {
        prioridadeLabel = '⚠️ VENCE HOJE (Urgente)';
        prioridadeBg = 'FFFEF08A'; // Yellow-200
        prioridadeFg = 'FF854D0E'; // Amber-900
      } else {
        prioridadeLabel = `⏰ Vence em ${dueCheck.daysRemaining} dia(s)`;
        prioridadeBg = 'FFFEF9C3'; // Yellow-100
        prioridadeFg = 'FF92400E'; // Amber-800
      }
    } else if (days > 180) {
      prioridadeLabel = '🚨 Crítico (+180d)';
      prioridadeBg = 'FFFFE4E6'; // Rose-100
      prioridadeFg = 'FF9F1239'; // Rose-800
    } else if (days > 60) {
      prioridadeLabel = '⚠️ Atenção (61-180d)';
      prioridadeBg = 'FFFFEDD5'; // Orange-100
      prioridadeFg = 'FF9A3412'; // Orange-800
    }

    // Status Styling
    let statusLabel = 'Pendente';
    let statusBg = 'FFFFE4E6'; // Rose-100
    let statusFg = 'FFBE123C'; // Rose-700

    switch (record.status) {
      case 'acordo_fechado':
        statusLabel = 'Acordo Fechado';
        statusBg = 'FFDCFCE7'; // Emerald-100
        statusFg = 'FF15803D'; // Emerald-700
        break;
      case 'pago':
      case 'recuperado':
        statusLabel = 'Liquidado / Pago';
        statusBg = 'FFBBF7D0'; // Green-200
        statusFg = 'FF166534'; // Green-800
        break;
      case 'em_negociacao':
        statusLabel = 'Em Negociação';
        statusBg = 'FFFEF3C7'; // Amber-100
        statusFg = 'FFB45309'; // Amber-700
        break;
      case 'boleto_gerado':
        statusLabel = 'Boleto Emitido';
        statusBg = 'FFDBEAFE'; // Blue-100
        statusFg = 'FF1D4ED8'; // Blue-700
        break;
      case 'sem_contato':
        statusLabel = 'Sem Contato';
        statusBg = 'FFF1F5F9'; // Slate-100
        statusFg = 'FF475569'; // Slate-600
        break;
      case 'cancelado':
        statusLabel = 'Cancelado';
        statusBg = 'FFFEE2E2'; // Red-100
        statusFg = 'FFB91C1C'; // Red-700
        break;
      default:
        statusLabel = 'Pendente';
        statusBg = 'FFFFE4E6';
        statusFg = 'FFBE123C';
        break;
    }

    const row = worksheet.getRow(currentRowIndex);
    row.height = 20;

    // Optional subtle background highlight for row if due in next 3 days
    const rowBaseBg = isRowUpcoming ? 'FFFFFBEB' : (currentRowIndex % 2 === 0 ? 'FFF8FAFC' : 'FFFFFFFF');

    const values = [
      record.matricula,
      record.cliente,
      record.telefone || '',
      record.responsavel || 'GERAL',
      record.abaOrigem || 'Geral',
      record.diaVencimento ?? '',
      prioridadeLabel,
      record.primeiroMesAtraso || '',
      days,
      bucket.label,
      orig,
      aberto,
      pago,
      statusLabel,
      record.dataUltimoContato || '',
      record.dataRetorno || '',
      record.informacao || ''
    ];

    values.forEach((val, colIdx) => {
      const cell = row.getCell(colIdx + 1);
      cell.value = val;
      cell.font = { name: 'Calibri', size: 9, color: { argb: 'FF1E293B' } };

      // Apply base fill
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: rowBaseBg }
      };

      // Alignment defaults
      if (colIdx === 0 || colIdx === 5 || colIdx === 7 || colIdx === 8 || colIdx === 14 || colIdx === 15) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      } else if (colIdx === 10 || colIdx === 11 || colIdx === 12) {
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
        cell.numFmt = 'R$ #,##0.00';
      } else {
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
      }

      // Border
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      };
    });

    // Special Styling: Due Date Cell (Column 6 & 7)
    const diaCell = row.getCell(6);
    if (isRowUpcoming) {
      diaCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: prioridadeFg } };
      diaCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: prioridadeBg } };
    }

    const prioridadeCell = row.getCell(7);
    prioridadeCell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: prioridadeFg } };
    prioridadeCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: prioridadeBg } };
    prioridadeCell.alignment = { vertical: 'middle', horizontal: 'center' };

    // Special Styling: Status Cell (Column 14)
    const statusCell = row.getCell(14);
    statusCell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: statusFg } };
    statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: statusBg } };
    statusCell.alignment = { vertical: 'middle', horizontal: 'center' };

    currentRowIndex++;
  });

  // 5. Consolidated Totals Row
  const totalRow = worksheet.getRow(currentRowIndex);
  totalRow.height = 24;

  worksheet.mergeCells(`A${currentRowIndex}:J${currentRowIndex}`);
  const totalLabelCell = totalRow.getCell(1);
  totalLabelCell.value = `TOTAL CONSOLIDADO (${records.length} REGISTROS)`;
  totalLabelCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF0F172A' } };
  totalLabelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
  totalLabelCell.alignment = { vertical: 'middle', horizontal: 'right' };

  // Original sum
  const origSumCell = totalRow.getCell(11);
  origSumCell.value = totalOriginal;
  origSumCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF0F172A' } };
  origSumCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
  origSumCell.numFmt = 'R$ #,##0.00';
  origSumCell.alignment = { vertical: 'middle', horizontal: 'right' };

  // Aberto sum
  const abertoSumCell = totalRow.getCell(12);
  abertoSumCell.value = totalAberto;
  abertoSumCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFBE123C' } };
  abertoSumCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE4E6' } };
  abertoSumCell.numFmt = 'R$ #,##0.00';
  abertoSumCell.alignment = { vertical: 'middle', horizontal: 'right' };

  // Recuperado sum
  const recSumCell = totalRow.getCell(13);
  recSumCell.value = totalRecuperado;
  recSumCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF15803D' } };
  recSumCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } };
  recSumCell.numFmt = 'R$ #,##0.00';
  recSumCell.alignment = { vertical: 'middle', horizontal: 'right' };

  // Remaining empty cells in total row
  for (let c = 14; c <= 17; c++) {
    const emptyCell = totalRow.getCell(c);
    emptyCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
  }

  // Border for total row
  for (let c = 1; c <= 17; c++) {
    const cell = totalRow.getCell(c);
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF94A3B8' } },
      bottom: { style: 'double', color: { argb: 'FF0F172A' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
    };
  }

  // 6. Generate Buffer & Trigger Browser Download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  const dateStr = now.toISOString().slice(0, 10);
  const timeStr = `${String(now.getHours()).padStart(2, '0')}h${String(now.getMinutes()).padStart(2, '0')}`;
  anchor.href = url;
  anchor.download = options?.filename || `cobranca_planilha_unificada_${dateStr}_${timeStr}.xlsx`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
