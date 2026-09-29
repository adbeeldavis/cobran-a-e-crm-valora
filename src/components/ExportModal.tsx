import React, { useState } from 'react';
import { 
  X, 
  Download, 
  Copy, 
  Check, 
  FileText, 
  Printer, 
  Table, 
  TrendingDown,
  CheckCircle2
} from 'lucide-react';
import { DebtRecord } from '../types';
import { calculateDaysOverdue } from '../utils/sheetParser';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  records: DebtRecord[];
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  records,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // Generate Executive Summary
  const total = records.length;
  const acordos = records.filter(r => r.status === 'acordo_fechado').length;
  const negociando = records.filter(r => r.status === 'em_negociacao').length;
  const boletos = records.filter(r => r.status === 'boleto_gerado').length;
  const criticos = records.filter(r => calculateDaysOverdue(r.primeiroMesAtraso, r.diaVencimento) > 180).length;

  const rosanaCount = records.filter(r => r.responsavel === 'ROSANA').length;
  const anaCount = records.filter(r => r.responsavel === 'ANA LUIZA').length;
  const keyllaCount = records.filter(r => r.responsavel === 'KEYLLA').length;

  const summaryText = `RELATÓRIO DE INADIMPLÊNCIA & COBRANÇA
Data de Emissão: ${new Date().toLocaleDateString('pt-BR')}

1. PANORAMA GERAL DA CARTEIRA
- Total de Devedores Ativos: ${total}
- Acordos Firmados: ${acordos}
- Clientes com Retorno Agendado / Em Negociação: ${negociando}
- Boletos 2026/2027 Emitidos: ${boletos}
- Inadimplência Crítica (+180 dias / Casos de 2025): ${criticos} (${Math.round((criticos / (total || 1)) * 100)}%)

2. DISTRIBUIÇÃO POR COBRADORA RESPONSÁVEL
- Rosana: ${rosanaCount} clientes
- Ana Luiza: ${anaCount} clientes
- Keylla: ${keyllaCount} clientes

3. TAXA DE RESOLUÇÃO
- Efetividade de Regularização (Acordos + Boletos + Agendamentos): ${Math.round(((acordos + boletos + negociando) / (total || 1)) * 100)}%

Relatório gerado automaticamente pela Central de Cobrança.`;

  const handleDownloadCsv = () => {
    const headers = [
      'Matricula',
      'Cliente',
      'Cobradora',
      'Primeiro_Mes_Atraso',
      'Dia_Vencimento',
      'Dias_Atraso',
      'Status_Cobranca',
      'Data_Retorno',
      'Valor_Acordo',
      'Informacoes'
    ];

    const rows = records.map(r => [
      `"${r.matricula}"`,
      `"${r.cliente.replace(/"/g, '""')}"`,
      `"${r.responsavel}"`,
      `"${r.primeiroMesAtraso}"`,
      r.diaVencimento,
      calculateDaysOverdue(r.primeiroMesAtraso, r.diaVencimento),
      `"${r.status}"`,
      `"${r.dataRetorno || ''}"`,
      r.valorAcordo || '',
      `"${(r.informacao || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [
      headers.join(';'),
      ...rows.map(e => e.join(';'))
    ].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `relatorio_inadimplencia_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopySummary = () => {
    navigator.clipboard.writeText(summaryText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
              <Download className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Exportar Relatório Consolidado de Inadimplência
              </h2>
              <p className="text-xs text-slate-500">
                Baixe a planilha unificada ou copie o resumo executivo em tempo real
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          
          {/* Action cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            
            {/* Download CSV */}
            <button
              onClick={handleDownloadCsv}
              className="p-4 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/40 text-left transition-all group"
            >
              <div className="flex items-center gap-2 mb-2 text-emerald-700">
                <Table className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <span className="font-bold text-sm">Baixar Planilha CSV</span>
              </div>
              <p className="text-xs text-slate-600">
                Exporta todos os {records.length} registros organizados com dias de atraso, status e cobradora.
              </p>
            </button>

            {/* Print */}
            <button
              onClick={handlePrint}
              className="p-4 rounded-xl border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/40 text-left transition-all group"
            >
              <div className="flex items-center gap-2 mb-2 text-indigo-700">
                <Printer className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <span className="font-bold text-sm">Imprimir / Salvar PDF</span>
              </div>
              <p className="text-xs text-slate-600">
                Gera a visualização pronta para impressão ou exportação em PDF pelo navegador.
              </p>
            </button>

          </div>

          {/* Executive Summary text area */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Resumo Executivo para Gerência / Diretoria:
              </label>
              <button
                onClick={handleCopySummary}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                <span>{copied ? 'Copiado!' : 'Copiar Texto'}</span>
              </button>
            </div>

            <textarea
              readOnly
              rows={8}
              value={summaryText}
              className="w-full p-3 font-mono text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-hidden leading-relaxed"
            />
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white shadow-xs transition-colors"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
