import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DebtRecord, AppUser } from '../types';

interface MetricCollectorItem {
  resp: string;
  leads: number;
  aberto: number;
  pago: number;
  taxa: string;
}

interface PdfReportMetrics {
  totalCount: number;
  totalOriginal: number;
  totalAberto: number;
  totalPago: number;
  taxaRecuperacao: string;
  mediaDiasAtraso: number;
  criticos45: number;
  criticos90: number;
  acordosFormalizados: number;
  porResponsavel: MetricCollectorItem[];
}

export interface ExportPdfOptions {
  title: string;
  description?: string;
  reportType: string;
  currentUser: AppUser;
  records: DebtRecord[];
  metrics: PdfReportMetrics;
}

/**
 * Generates an executive, printable PDF financial summary using jsPDF and jspdf-autotable
 */
export function exportFinancialSummaryPdf({
  title,
  description,
  reportType,
  currentUser,
  records,
  metrics
}: ExportPdfOptions): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const primaryColor: [number, number, number] = [30, 58, 138]; // Deep corporate blue
  const accentColor: [number, number, number] = [16, 185, 129]; // Emerald recovery green
  const slateDark: [number, number, number] = [30, 41, 59];
  const slateMuted: [number, number, number] = [100, 116, 139];

  // 1. Top Header Banner
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, 210, 28, 'F');

  // Brand Name & Tagline
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text('VALORA GESTÃO & FINANÇAS', 14, 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(224, 231, 255);
  doc.text('Cartão de Todos & Ótica Ibirité • Recuperação de Carteira & Gestão de Inadimplência', 14, 18);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('RESUMO FINANCEIRO EXECUTIVO', 145, 12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(191, 219, 254);
  doc.text(`Emissão: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`, 145, 18);

  let currentY = 36;

  // 2. Report Title & Context Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.text(title, 14, currentY);

  currentY += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
  const subtitle = description || `Relatório consolidado de cobrança, posição de recebíveis e métricas operacionais por carteira.`;
  doc.text(subtitle, 14, currentY);

  currentY += 4;
  doc.setDrawColor(226, 232, 240);
  doc.line(14, currentY, 196, currentY);

  currentY += 6;

  // 3. User & Session Metadata Card
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, currentY, 182, 14, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.text('Emissor / Operador:', 18, currentY + 5.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`${currentUser.nome} (${currentUser.cargo || currentUser.role})`, 50, currentY + 5.5);

  doc.setFont('helvetica', 'bold');
  doc.text('Base Auditada:', 18, currentY + 10.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`${metrics.totalCount} clientes selecionados • Filtro: ${reportType.toUpperCase()}`, 50, currentY + 10.5);

  doc.setFont('helvetica', 'bold');
  doc.text('Ambiente:', 130, currentY + 5.5);
  doc.setFont('helvetica', 'normal');
  doc.text('Valora Cloud PRO 2026', 150, currentY + 5.5);

  doc.setFont('helvetica', 'bold');
  doc.text('Status Base:', 130, currentY + 10.5);
  doc.setFont('helvetica', 'normal');
  doc.text('Autenticado / Seguro', 150, currentY + 10.5);

  currentY += 19;

  // 4. Financial KPI Metric Boxes (4 columns)
  const cardWidth = 43;
  const cardHeight = 18;
  const cardGap = 3.3;

  interface KpiCard {
    label: string;
    value: string;
    bgColor: [number, number, number];
    borderColor: [number, number, number];
    textColor: [number, number, number];
  }

  const kpis: KpiCard[] = [
    {
      label: 'CARTEIRA TOTAL',
      value: metrics.totalOriginal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      bgColor: [239, 246, 255],
      borderColor: [191, 219, 254],
      textColor: [30, 58, 138]
    },
    {
      label: 'SALDO EM ABERTO',
      value: metrics.totalAberto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      bgColor: [254, 242, 242],
      borderColor: [254, 202, 202],
      textColor: [185, 28, 28]
    },
    {
      label: 'VALOR RECUPERADO',
      value: metrics.totalPago.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      bgColor: [236, 253, 245],
      borderColor: [167, 243, 208],
      textColor: [6, 95, 70]
    },
    {
      label: 'EFICIÊNCIA RECUPERAÇÃO',
      value: `${metrics.taxaRecuperacao}%`,
      bgColor: [240, 253, 250],
      borderColor: [153, 246, 228],
      textColor: [15, 118, 110]
    }
  ];

  kpis.forEach((kpi, idx) => {
    const x = 14 + idx * (cardWidth + cardGap);
    doc.setFillColor(kpi.bgColor[0], kpi.bgColor[1], kpi.bgColor[2]);
    doc.setDrawColor(kpi.borderColor[0], kpi.borderColor[1], kpi.borderColor[2]);
    doc.roundedRect(x, currentY, cardWidth, cardHeight, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
    doc.text(kpi.label, x + 3, currentY + 5.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(kpi.textColor[0], kpi.textColor[1], kpi.textColor[2]);
    doc.text(kpi.value, x + 3, currentY + 13.5);
  });

  currentY += cardHeight + 5;

  // Secondary metrics row (Dias Médios de Atraso, Acordos Formalizados, Inadimplência Crítica)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
  doc.text(
    `Média de Atraso: ${metrics.mediaDiasAtraso} dias  •  Acordos Formalizados: ${metrics.acordosFormalizados}  •  Críticos (>45d): ${metrics.criticos45}  •  Críticos (>90d): ${metrics.criticos90}`,
    14,
    currentY
  );

  currentY += 4;

  // 5. Section: Desempenho por Cobradora (autoTable)
  if (metrics.porResponsavel && metrics.porResponsavel.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
    doc.text('1. Desempenho e Eficiência por Carteira / Cobradora', 14, currentY + 4);

    const collectorTableRows = metrics.porResponsavel.map(item => [
      item.resp,
      item.leads.toString(),
      item.aberto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      item.pago.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      `${item.taxa}%`
    ]);

    autoTable(doc, {
      startY: currentY + 6,
      head: [['Cobradora / Carteira', 'Clientes', 'Saldo em Aberto', 'Total Recuperado', 'Taxa Recuperação']],
      body: collectorTableRows,
      theme: 'grid',
      headStyles: {
        fillColor: [30, 58, 138],
        textColor: [255, 255, 255],
        fontSize: 7.5,
        fontStyle: 'bold',
        halign: 'center'
      },
      styles: {
        fontSize: 7.5,
        cellPadding: 2,
        textColor: [51, 65, 85]
      },
      columnStyles: {
        0: { fontStyle: 'bold', halign: 'left' },
        1: { halign: 'center' },
        2: { halign: 'right', textColor: [185, 28, 28] },
        3: { halign: 'right', textColor: [6, 95, 70], fontStyle: 'bold' },
        4: { halign: 'center', fontStyle: 'bold' }
      },
      margin: { left: 14, right: 14 }
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;
  }

  // 6. Section: Relação de Clientes / Resumo da Carteira (Top 35 records to ensure great presentation)
  const previewRecords = records.slice(0, 35);
  if (previewRecords.length > 0) {
    if (currentY > 230) {
      doc.addPage();
      currentY = 18;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
    doc.text(`2. Detalhamento de Clientes da Carteira (${previewRecords.length} de ${records.length} exibidos)`, 14, currentY);

    const recordsTableRows = previewRecords.map(r => {
      const valorAberto = r.valorEmAberto !== undefined ? r.valorEmAberto : (r.valorOriginal || 120);
      const formattedStatus = r.status.replace(/_/g, ' ').toUpperCase();
      return [
        `#${r.matricula}`,
        r.cliente,
        r.responsavel || 'GERAL',
        r.diaVencimento ? `Dia ${r.diaVencimento}` : '—',
        `${r.diasAtraso || 0}d`,
        (r.valorOriginal || 120).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
        valorAberto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
        formattedStatus
      ];
    });

    autoTable(doc, {
      startY: currentY + 3,
      head: [['Matrícula', 'Cliente', 'Cobradora', 'Venc.', 'Atraso', 'Original', 'Em Aberto', 'Status']],
      body: recordsTableRows,
      theme: 'striped',
      headStyles: {
        fillColor: [51, 65, 85],
        textColor: [255, 255, 255],
        fontSize: 7,
        fontStyle: 'bold',
        halign: 'center'
      },
      styles: {
        fontSize: 6.8,
        cellPadding: 1.8,
        textColor: [51, 65, 85]
      },
      columnStyles: {
        0: { halign: 'center', fontStyle: 'bold' },
        1: { halign: 'left', fontStyle: 'bold' },
        2: { halign: 'center' },
        3: { halign: 'center' },
        4: { halign: 'center' },
        5: { halign: 'right' },
        6: { halign: 'right', fontStyle: 'bold', textColor: [185, 28, 28] },
        7: { halign: 'center' }
      },
      margin: { left: 14, right: 14 }
    });
  }

  // 7. Page numbering & Footer on all pages
  const pageCount = (doc as any).getNumberOfPages ? (doc as any).getNumberOfPages() : doc.internal.pages.length - 1;
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240);
    doc.line(14, 285, 196, 285);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
    doc.text('Valora Gestão & Finanças • Documento Gerencial Gerado via Sistema PRO 2026', 14, 289);
    doc.text(`Página ${i} de ${pageCount}`, 178, 289);
  }

  // 8. Trigger download
  const dateSlug = new Date().toISOString().slice(0, 10);
  const cleanReportType = reportType.toLowerCase().replace(/[^a-z0-9]/g, '_');
  doc.save(`Relatorio_Financeiro_Valora_${cleanReportType}_${dateSlug}.pdf`);
}
