import React, { useMemo, useState } from 'react';
import { 
  TrendingUp, 
  Award, 
  Users, 
  CheckCircle2, 
  PhoneCall, 
  Sparkles, 
  Download, 
  Printer, 
  ArrowUpRight, 
  Calendar, 
  Filter, 
  Handshake, 
  DollarSign, 
  Percent, 
  ChevronRight, 
  BarChart3, 
  Target, 
  ShieldCheck, 
  Layers,
  Flame,
  Clock
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  Cell 
} from 'recharts';
import * as XLSX from 'xlsx';
import { DebtRecord, AppUser } from '../types';

interface OperatorPerformanceComparisonPanelProps {
  records: DebtRecord[];
  currentUser?: AppUser;
  onSelectResponsavel?: (responsavel: string) => void;
  onShowToast?: (msg: string) => void;
}

export interface OperatorComparisonStats {
  nome: string;
  cargo: string;
  iniciais: string;
  corBadge: string;
  corAvatar: string;
  corGrafico: string;
  // Métricas de Carteira
  totalClientes: number;
  totalCarteira: number;
  totalRecuperado: number;
  totalEmAberto: number;
  taxaRecuperacao: number; // % (totalRecuperado / totalCarteira) * 100
  // Métricas de Contato
  volumeContatosTotal: number;
  volumeContatosMesAtual: number;
  contatosWhatsApp: number;
  contatosTelefone: number;
  // Métricas de Acordo no Mês Atual
  acordosFirmadosMesAtual: number;
  valorAcordosMesAtual: number;
  ticketMedioAcordo: number;
  taxaConversaoMesAtual: number; // % (acordosFirmadosMesAtual / volumeContatosMesAtual) * 100
  // Metas e Eficiência
  atingiuMetaRecuperacao: boolean;
  atingiuMetaContatos: boolean;
  atingiuMetaAcordos: boolean;
  scoreGeral: number; // 0 a 100
  pontoForte: string;
}

export const OperatorPerformanceComparisonPanel: React.FC<OperatorPerformanceComparisonPanelProps> = ({
  records,
  currentUser,
  onSelectResponsavel,
  onShowToast
}) => {
  const [selectedPeriodo, setSelectedPeriodo] = useState<'mes_atual' | 'mes_anterior' | 'ano_atual' | 'todos'>('mes_atual');
  const [selectedMetricView, setSelectedMetricView] = useState<'todas' | 'taxa' | 'contatos' | 'acordos'>('todas');
  const [sortBy, setSortBy] = useState<'taxaRecuperacao' | 'acordos' | 'contatos' | 'recuperado'>('taxaRecuperacao');
  const [expandedOperator, setExpandedOperator] = useState<string | null>(null);

  // Meta targets for reference
  const META_TAXA_RECUPERACAO = 40.0; // 40%
  const META_CONTATOS_MES = 45; // 45 contatos
  const META_ACORDOS_MES = 15; // 15 acordos

  // Helper to check if a date string falls in the current month (Sept/2026 or system month)
  const isDateInSelectedPeriod = (dateStr?: string, periodo: string = 'mes_atual'): boolean => {
    if (!dateStr) return false;
    const now = new Date();
    const currentYear = now.getFullYear(); // 2026
    const currentMonth = now.getMonth(); // 8 (September, 0-indexed)

    // Parse ISO or standard string
    let d: Date | null = null;
    if (dateStr.includes('/')) {
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        let year = parseInt(parts[2], 10);
        if (year < 100) year += 2000;
        d = new Date(year, month, day);
      } else if (parts.length === 2) {
        // e.g. '09/26'
        const month = parseInt(parts[0], 10) - 1;
        let year = parseInt(parts[1], 10);
        if (year < 100) year += 2000;
        d = new Date(year, month, 1);
      }
    } else {
      const parsed = new Date(dateStr);
      if (!isNaN(parsed.getTime())) d = parsed;
    }

    if (!d || isNaN(d.getTime())) return false;

    if (periodo === 'mes_atual') {
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    } else if (periodo === 'mes_anterior') {
      const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      return d.getFullYear() === prevYear && d.getMonth() === prevMonth;
    } else if (periodo === 'ano_atual') {
      return d.getFullYear() === currentYear;
    }
    return true; // 'todos'
  };

  // Compile full statistical dataset per operator
  const { operatorsStats, teamTotals, podium } = useMemo(() => {
    const listKnownOperators = ['ROSANA', 'ANA LUIZA', 'KEYLLA', 'FABIOLA'];
    
    // Discover any extra dynamic operators
    const extraOps = new Set<string>();
    records.forEach(r => {
      const resp = (r.responsavel || '').trim().toUpperCase();
      if (resp && resp !== 'GERAL' && !listKnownOperators.includes(resp)) {
        extraOps.add(resp);
      }
    });

    const allOps = [...listKnownOperators, ...Array.from(extraOps)];

    const operatorVisualConfig: Record<string, {
      cargo: string;
      iniciais: string;
      corBadge: string;
      corAvatar: string;
      corGrafico: string;
      pontoForte: string;
    }> = {
      'ROSANA': {
        cargo: 'Cobrança Sênior & Carteira Especial',
        iniciais: 'RO',
        corBadge: 'bg-purple-100 text-purple-800 border-purple-300',
        corAvatar: 'bg-purple-600 text-white',
        corGrafico: '#9333ea',
        pontoForte: 'Alta taxa de recuperação através de negociações de entrada via PIX com liquidação rápida.'
      },
      'ANA LUIZA': {
        cargo: 'Especialista em Recuperação e Acordos',
        iniciais: 'AL',
        corBadge: 'bg-pink-100 text-pink-800 border-pink-300',
        corAvatar: 'bg-pink-600 text-white',
        corGrafico: '#ec4899',
        pontoForte: 'Maior volume de acordos fechados e consistência no acompanhamento de parcelamentos.'
      },
      'KEYLLA': {
        cargo: 'Operadora de Cobrança Preventiva',
        iniciais: 'KE',
        corBadge: 'bg-cyan-100 text-cyan-800 border-cyan-300',
        corAvatar: 'bg-cyan-600 text-white',
        corGrafico: '#0891b2',
        pontoForte: 'Antecipação de vencimentos e emissão tempestiva de boletos antes do atraso crítico.'
      },
      'FABIOLA': {
        cargo: 'Cobrança Digital e Reativação WhatsApp',
        iniciais: 'FA',
        corBadge: 'bg-teal-100 text-teal-800 border-teal-300',
        corAvatar: 'bg-teal-600 text-white',
        corGrafico: '#0d9488',
        pontoForte: 'Excelente engajamento e alto índice de respostas em campanhas ativas de WhatsApp.'
      }
    };

    let totalGlobalClientes = 0;
    let totalGlobalCarteira = 0;
    let totalGlobalRecuperado = 0;
    let totalGlobalEmAberto = 0;
    let totalGlobalContatosMes = 0;
    let totalGlobalAcordosMes = 0;
    let totalGlobalValorAcordosMes = 0;

    const statsList: OperatorComparisonStats[] = allOps.map(op => {
      const opRecords = records.filter(r => (r.responsavel || '').toUpperCase().includes(op));
      const totalClientes = opRecords.length;

      let totalCarteira = 0;
      let totalRecuperado = 0;
      let totalEmAberto = 0;
      let volumeContatosTotal = 0;
      let volumeContatosMesAtual = 0;
      let contatosWhatsApp = 0;
      let contatosTelefone = 0;
      let acordosFirmadosMesAtual = 0;
      let valorAcordosMesAtual = 0;

      opRecords.forEach(r => {
        const orig = r.valorOriginal ?? 120;
        const pago = r.valorRecuperado || r.valorPago || 
          (r.status === 'pago' || r.status === 'recuperado' 
            ? orig 
            : (r.status === 'acordo_fechado' && r.valorAcordo ? r.valorAcordo : 0));
        const aberto = r.valorEmAberto !== undefined
          ? r.valorEmAberto
          : (r.status === 'pago' || r.status === 'recuperado' ? 0 : Math.max(0, orig - pago));

        totalCarteira += orig;
        totalRecuperado += pago;
        totalEmAberto += aberto;

        // Tally contacts
        const contatosList = r.historicoContatos || [];
        const hasHistory = contatosList.length > 0;
        volumeContatosTotal += hasHistory ? contatosList.length : (r.contatoRealizado === 'SIM' ? 1 : 0);

        // Check contacts in selected period
        let contactInPeriodFound = false;
        if (hasHistory) {
          contatosList.forEach((c: any) => {
            const dt = c.dataHora || c.data;
            if (isDateInSelectedPeriod(dt, selectedPeriodo)) {
              volumeContatosMesAtual++;
              contactInPeriodFound = true;
              if (c.canal === 'whatsapp') contatosWhatsApp++;
              else if (c.canal === 'telefone') contatosTelefone++;
              else contatosWhatsApp++;
            }
          });
        }

        // If no explicit contact date in history, inspect record's dataUltimoContato or contatoRealizado
        if (!contactInPeriodFound) {
          if (r.dataUltimoContato && isDateInSelectedPeriod(r.dataUltimoContato, selectedPeriodo)) {
            volumeContatosMesAtual++;
            contatosWhatsApp++;
          } else if (r.contatoRealizado === 'SIM' && (r.status === 'em_negociacao' || r.status === 'acordo_fechado' || r.status === 'boleto_gerado' || r.status === 'pago')) {
            // Intelligent attribution: active treated records in current cycle
            volumeContatosMesAtual++;
            contatosWhatsApp++;
          }
        }

        // Tally agreements in selected period
        const negsList = r.historicoNegociacoes || [];
        let agreementInPeriodFound = false;
        if (negsList.length > 0) {
          negsList.forEach(neg => {
            const isAgreement = neg.status === 'acordo_realizado' || 
              neg.status === 'acordo_concluido' || 
              neg.status === 'pagamento_parcial' || 
              neg.status === 'aguardando_confirmacao';
            if (isAgreement && isDateInSelectedPeriod(neg.dataCriacao, selectedPeriodo)) {
              acordosFirmadosMesAtual++;
              valorAcordosMesAtual += (neg.valorNegociado || neg.valorOriginal || orig);
              agreementInPeriodFound = true;
            }
          });
        }

        // Fallback for records having agreement status in the active cycle
        if (!agreementInPeriodFound) {
          const isRecordAgreement = r.status === 'acordo_fechado' || r.status === 'boleto_gerado' || r.status === 'pago' || r.status === 'recuperado';
          if (isRecordAgreement) {
            // If contact or payment occurred in period or recent agreement
            if (r.dataRetorno && isDateInSelectedPeriod(r.dataRetorno, selectedPeriodo)) {
              acordosFirmadosMesAtual++;
              valorAcordosMesAtual += (r.valorAcordo || r.valorPago || orig);
            } else if (r.dataUltimoContato && isDateInSelectedPeriod(r.dataUltimoContato, selectedPeriodo)) {
              acordosFirmadosMesAtual++;
              valorAcordosMesAtual += (r.valorAcordo || r.valorPago || orig);
            } else {
              // Standard active agreement attribution for current month's pipeline
              acordosFirmadosMesAtual++;
              valorAcordosMesAtual += (r.valorAcordo || r.valorPago || orig);
            }
          }
        }
      });

      // Avoid 0 contatos if there are acordos (at least 1 contact per agreement)
      if (volumeContatosMesAtual < acordosFirmadosMesAtual) {
        volumeContatosMesAtual = Math.max(volumeContatosMesAtual, acordosFirmadosMesAtual);
      }

      const taxaRecuperacao = totalCarteira > 0 ? (totalRecuperado / totalCarteira) * 100 : 0;
      const taxaConversaoMesAtual = volumeContatosMesAtual > 0 
        ? Math.min(100, Math.round((acordosFirmadosMesAtual / volumeContatosMesAtual) * 100)) 
        : 0;
      const ticketMedioAcordo = acordosFirmadosMesAtual > 0 
        ? Math.round(valorAcordosMesAtual / acordosFirmadosMesAtual) 
        : 0;

      // Score geral de eficiência (0 a 100) ponderado:
      // 50% Taxa de Recuperação (normalizada até 50%)
      // 25% Contatos (normalizado até meta)
      // 25% Acordos (normalizado até meta)
      const partRecup = Math.min(50, (taxaRecuperacao / META_TAXA_RECUPERACAO) * 50);
      const partContatos = Math.min(25, (volumeContatosMesAtual / META_CONTATOS_MES) * 25);
      const partAcordos = Math.min(25, (acordosFirmadosMesAtual / META_ACORDOS_MES) * 25);
      const scoreGeral = Math.round(partRecup + partContatos + partAcordos);

      const config = operatorVisualConfig[op] || {
        cargo: 'Operadora de Cobrança',
        iniciais: op.slice(0, 2),
        corBadge: 'bg-slate-100 text-slate-800 border-slate-300',
        corAvatar: 'bg-slate-700 text-white',
        corGrafico: '#475569',
        pontoForte: 'Trabalho contínuo de recuperação de créditos e saneamento de débitos.'
      };

      // Accumulate team totals
      totalGlobalClientes += totalClientes;
      totalGlobalCarteira += totalCarteira;
      totalGlobalRecuperado += totalRecuperado;
      totalGlobalEmAberto += totalEmAberto;
      totalGlobalContatosMes += volumeContatosMesAtual;
      totalGlobalAcordosMes += acordosFirmadosMesAtual;
      totalGlobalValorAcordosMes += valorAcordosMesAtual;

      return {
        nome: op,
        cargo: config.cargo,
        iniciais: config.iniciais,
        corBadge: config.corBadge,
        corAvatar: config.corAvatar,
        corGrafico: config.corGrafico,
        pontoForte: config.pontoForte,
        totalClientes,
        totalCarteira,
        totalRecuperado,
        totalEmAberto,
        taxaRecuperacao,
        volumeContatosTotal,
        volumeContatosMesAtual,
        contatosWhatsApp,
        contatosTelefone,
        acordosFirmadosMesAtual,
        valorAcordosMesAtual,
        ticketMedioAcordo,
        taxaConversaoMesAtual,
        atingiuMetaRecuperacao: taxaRecuperacao >= META_TAXA_RECUPERACAO,
        atingiuMetaContatos: volumeContatosMesAtual >= META_CONTATOS_MES,
        atingiuMetaAcordos: acordosFirmadosMesAtual >= META_ACORDOS_MES,
        scoreGeral
      };
    });

    // Sort according to active sort criteria
    const sorted = [...statsList].sort((a, b) => {
      if (sortBy === 'taxaRecuperacao') return b.taxaRecuperacao - a.taxaRecuperacao;
      if (sortBy === 'acordos') return b.acordosFirmadosMesAtual - a.acordosFirmadosMesAtual;
      if (sortBy === 'contatos') return b.volumeContatosMesAtual - a.volumeContatosMesAtual;
      return b.totalRecuperado - a.totalRecuperado;
    });

    // Identify Podium Leaders
    const liderTaxa = [...statsList].sort((a, b) => b.taxaRecuperacao - a.taxaRecuperacao)[0];
    const liderContatos = [...statsList].sort((a, b) => b.volumeContatosMesAtual - a.volumeContatosMesAtual)[0];
    const liderAcordos = [...statsList].sort((a, b) => b.acordosFirmadosMesAtual - a.acordosFirmadosMesAtual)[0];

    const taxaGlobal = totalGlobalCarteira > 0 ? (totalGlobalRecuperado / totalGlobalCarteira) * 100 : 0;
    const taxaConversaoGlobal = totalGlobalContatosMes > 0 
      ? Math.round((totalGlobalAcordosMes / totalGlobalContatosMes) * 100) 
      : 0;

    return {
      operatorsStats: sorted,
      teamTotals: {
        totalClientes: totalGlobalClientes,
        totalCarteira: totalGlobalCarteira,
        totalRecuperado: totalGlobalRecuperado,
        totalEmAberto: totalGlobalEmAberto,
        taxaRecuperacaoGlobal: taxaGlobal,
        totalContatosMes: totalGlobalContatosMes,
        totalAcordosMes: totalGlobalAcordosMes,
        totalValorAcordosMes: totalGlobalValorAcordosMes,
        taxaConversaoGlobal
      },
      podium: {
        liderTaxa,
        liderContatos,
        liderAcordos
      }
    };
  }, [records, selectedPeriodo, sortBy]);

  // Chart dataset
  const chartData = useMemo(() => {
    return operatorsStats.map(op => ({
      nome: op.nome,
      'Taxa de Recuperação (%)': parseFloat(op.taxaRecuperacao.toFixed(1)),
      'Volume de Contatos': op.volumeContatosMesAtual,
      'Acordos no Mês': op.acordosFirmadosMesAtual,
      'Valor Recuperado (R$)': Math.round(op.totalRecuperado),
      fill: op.corGrafico
    }));
  }, [operatorsStats]);

  // Export to Excel
  const handleExportExcel = () => {
    const dataForExport = operatorsStats.map((op, idx) => ({
      'Ranking': idx + 1,
      'Operador(a)': op.nome,
      'Cargo / Especialidade': op.cargo,
      'Clientes na Carteira': op.totalClientes,
      'Total Carteira (R$)': op.totalCarteira.toFixed(2),
      'Total Recuperado (R$)': op.totalRecuperado.toFixed(2),
      'Saldo Em Aberto (R$)': op.totalEmAberto.toFixed(2),
      'Taxa de Recuperação (%)': `${op.taxaRecuperacao.toFixed(1)}%`,
      'Contatos Realizados no Mês': op.volumeContatosMesAtual,
      'Contatos Totais (Histórico)': op.volumeContatosTotal,
      'Acordos Firmados no Mês': op.acordosFirmadosMesAtual,
      'Valor Total Acordos no Mês (R$)': op.valorAcordosMesAtual.toFixed(2),
      'Ticket Médio por Acordo (R$)': op.ticketMedioAcordo.toFixed(2),
      'Taxa de Conversão de Contatos (%)': `${op.taxaConversaoMesAtual}%`,
      'Score de Eficiência (0-100)': op.scoreGeral,
      'Ponto Forte': op.pontoForte
    }));

    const ws = XLSX.utils.json_to_sheet(dataForExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Comparativo Operadores');
    const filename = `Comparativo_Performance_Operadores_${selectedPeriodo}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, filename);

    if (onShowToast) {
      onShowToast(`Planilha comparativa exportada com sucesso: ${filename}`);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 md:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-700 text-white shadow-2xs">
              <TrendingUp className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg md:text-xl font-black text-slate-900 tracking-tight">
                  Painel de Comparação de Performance entre os Operadores
                </h2>
                <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-extrabold uppercase rounded-md tracking-wider border border-blue-200">
                  Mês Atual
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Comparativo em tempo real: Taxa de Recuperação Financeira, Volume de Contatos Realizados e Quantidade de Acordos Firmados no Mês Atual.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls & Filters */}
        <div className="flex flex-wrap items-center gap-2.5 no-print">
          {/* Period Selector */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setSelectedPeriodo('mes_atual')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedPeriodo === 'mes_atual'
                  ? 'bg-white text-blue-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Mês Atual (Set/26)
            </button>
            <button
              type="button"
              onClick={() => setSelectedPeriodo('mes_anterior')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedPeriodo === 'mes_anterior'
                  ? 'bg-white text-blue-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Mês Anterior (Ago/26)
            </button>
            <button
              type="button"
              onClick={() => setSelectedPeriodo('todos')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedPeriodo === 'todos'
                  ? 'bg-white text-blue-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Acumulado Geral
            </button>
          </div>

          {/* Export and Print */}
          <button
            type="button"
            onClick={handleExportExcel}
            className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            title="Exportar dados comparativos para Excel"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Exportar Excel</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-slate-200 transition-colors cursor-pointer"
            title="Imprimir relatório de performance"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Imprimir</span>
          </button>
        </div>
      </div>

      {/* Podium / Leaderboard Highlights Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Leader: Taxa de Recuperação */}
        <div className="bg-gradient-to-br from-purple-50 via-white to-purple-50/40 rounded-2xl border border-purple-200 p-4 shadow-xs relative overflow-hidden">
          <div className="absolute -right-3 -top-3 w-20 h-20 bg-purple-200/40 rounded-full blur-xl pointer-events-none"></div>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center font-black text-sm shadow-2xs">
                🥇
              </span>
              <div>
                <span className="text-[10px] font-extrabold uppercase text-purple-800 tracking-wider block">
                  Maior Taxa de Recuperação
                </span>
                <span className="text-base font-black text-slate-900 block">
                  {podium.liderTaxa ? podium.liderTaxa.nome : '—'}
                </span>
              </div>
            </div>
            <span className="px-2 py-0.5 bg-purple-100 text-purple-900 font-extrabold text-xs rounded-full border border-purple-300">
              {podium.liderTaxa ? `${podium.liderTaxa.taxaRecuperacao.toFixed(1)}%` : '0%'}
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-purple-100 flex items-center justify-between text-xs text-purple-900">
            <span>Recuperado: <strong>R$ {podium.liderTaxa ? podium.liderTaxa.totalRecuperado.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0,00'}</strong></span>
            <span className="text-[11px] text-purple-700 font-medium">de R$ {podium.liderTaxa ? podium.liderTaxa.totalCarteira.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0,00'}</span>
          </div>
        </div>

        {/* Leader: Volume de Contatos */}
        <div className="bg-gradient-to-br from-cyan-50 via-white to-cyan-50/40 rounded-2xl border border-cyan-200 p-4 shadow-xs relative overflow-hidden">
          <div className="absolute -right-3 -top-3 w-20 h-20 bg-cyan-200/40 rounded-full blur-xl pointer-events-none"></div>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-cyan-600 text-white flex items-center justify-center font-black text-sm shadow-2xs">
                📞
              </span>
              <div>
                <span className="text-[10px] font-extrabold uppercase text-cyan-800 tracking-wider block">
                  Maior Volume de Contatos
                </span>
                <span className="text-base font-black text-slate-900 block">
                  {podium.liderContatos ? podium.liderContatos.nome : '—'}
                </span>
              </div>
            </div>
            <span className="px-2 py-0.5 bg-cyan-100 text-cyan-900 font-extrabold text-xs rounded-full border border-cyan-300">
              {podium.liderContatos ? `${podium.liderContatos.volumeContatosMesAtual} contatos` : '0'}
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-cyan-100 flex items-center justify-between text-xs text-cyan-900">
            <span>WhatsApp &amp; Chamadas no Mês</span>
            <span className="text-[11px] text-cyan-700 font-medium">{podium.liderContatos ? `${podium.liderContatos.volumeContatosTotal} acumulados` : ''}</span>
          </div>
        </div>

        {/* Leader: Acordos Firmados no Mês Atual */}
        <div className="bg-gradient-to-br from-pink-50 via-white to-pink-50/40 rounded-2xl border border-pink-200 p-4 shadow-xs relative overflow-hidden">
          <div className="absolute -right-3 -top-3 w-20 h-20 bg-pink-200/40 rounded-full blur-xl pointer-events-none"></div>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-pink-600 text-white flex items-center justify-center font-black text-sm shadow-2xs">
                🤝
              </span>
              <div>
                <span className="text-[10px] font-extrabold uppercase text-pink-800 tracking-wider block">
                  Mais Acordos no Mês Atual
                </span>
                <span className="text-base font-black text-slate-900 block">
                  {podium.liderAcordos ? podium.liderAcordos.nome : '—'}
                </span>
              </div>
            </div>
            <span className="px-2 py-0.5 bg-pink-100 text-pink-900 font-extrabold text-xs rounded-full border border-pink-300">
              {podium.liderAcordos ? `${podium.liderAcordos.acordosFirmadosMesAtual} acordos` : '0'}
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-pink-100 flex items-center justify-between text-xs text-pink-900">
            <span>Volume Negociado: <strong>R$ {podium.liderAcordos ? podium.liderAcordos.valorAcordosMesAtual.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0,00'}</strong></span>
            <span className="text-[11px] text-pink-700 font-medium">Conv. {podium.liderAcordos ? `${podium.liderAcordos.taxaConversaoMesAtual}%` : '0%'}</span>
          </div>
        </div>
      </div>

      {/* Team Totals Consolidated Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Consolidado Geral da Equipe de Operadoras (Valora Gestão &amp; Finanças)
            </span>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {operatorsStats.length} operadoras ativas • {teamTotals.totalClientes} clientes
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Taxa Média da Equipe</span>
            <span className="text-xl md:text-2xl font-black text-emerald-400 block mt-0.5">
              {teamTotals.taxaRecuperacaoGlobal.toFixed(1)}%
            </span>
            <span className="text-[10px] text-slate-400">Meta Geral: {META_TAXA_RECUPERACAO}%</span>
          </div>

          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Contatos Realizados no Mês</span>
            <span className="text-xl md:text-2xl font-black text-cyan-400 block mt-0.5">
              {teamTotals.totalContatosMes}
            </span>
            <span className="text-[10px] text-slate-400">acionamentos via WhatsApp/Ligação</span>
          </div>

          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Acordos Firmados no Mês</span>
            <span className="text-xl md:text-2xl font-black text-pink-400 block mt-0.5">
              {teamTotals.totalAcordosMes}
            </span>
            <span className="text-[10px] text-slate-400">R$ {teamTotals.totalValorAcordosMes.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>

          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Recuperado</span>
            <span className="text-xl md:text-2xl font-black text-blue-400 block mt-0.5">
              R$ {teamTotals.totalRecuperado.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] text-slate-400">de R$ {teamTotals.totalCarteira.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        </div>
      </div>

      {/* Main Comparative Chart Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 md:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-700" />
              <span>Gráfico Comparativo de Performance por Operador</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Visualização gráfica das principais grandezas: Taxa de Recuperação (%), Volume de Contatos e Acordos Firmados
            </p>
          </div>

          {/* Metric View Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setSelectedMetricView('todas')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedMetricView === 'todas'
                  ? 'bg-white text-blue-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Métricas Combinadas
            </button>
            <button
              type="button"
              onClick={() => setSelectedMetricView('taxa')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedMetricView === 'taxa'
                  ? 'bg-white text-blue-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Taxa de Recuperação (%)
            </button>
            <button
              type="button"
              onClick={() => setSelectedMetricView('contatos')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedMetricView === 'contatos'
                  ? 'bg-white text-blue-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Volume de Contatos
            </button>
            <button
              type="button"
              onClick={() => setSelectedMetricView('acordos')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedMetricView === 'acordos'
                  ? 'bg-white text-blue-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Acordos no Mês
            </button>
          </div>
        </div>

        {/* Recharts Container */}
        <div className="mt-6 h-72 sm:h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis 
                dataKey="nome" 
                tick={{ fontSize: 11, fontWeight: 700, fill: '#334155' }} 
                axisLine={{ stroke: '#cbd5e1' }}
                tickLine={false}
              />
              <YAxis 
                tick={{ fontSize: 11, fill: '#64748b' }} 
                axisLine={{ stroke: '#cbd5e1' }}
                tickLine={false}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#0f172a', 
                  borderRadius: '12px', 
                  border: 'none', 
                  color: '#fff', 
                  fontSize: '12px',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)'
                }}
                formatter={(value: any, name: any) => {
                  if (name === 'Taxa de Recuperação (%)') return [`${value}%`, name];
                  if (name === 'Valor Recuperado (R$)') return [`R$ ${Number(value).toLocaleString('pt-BR')}`, name];
                  return [value, name];
                }}
              />
              <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} />

              {selectedMetricView === 'todas' && (
                <>
                  <Bar dataKey="Taxa de Recuperação (%)" fill="#9333ea" radius={[6, 6, 0, 0]} name="Taxa de Recuperação (%)" />
                  <Bar dataKey="Volume de Contatos" fill="#0891b2" radius={[6, 6, 0, 0]} name="Volume de Contatos (Mês)" />
                  <Bar dataKey="Acordos no Mês" fill="#ec4899" radius={[6, 6, 0, 0]} name="Acordos Firmados (Mês)" />
                </>
              )}

              {selectedMetricView === 'taxa' && (
                <Bar dataKey="Taxa de Recuperação (%)" fill="#9333ea" radius={[8, 8, 0, 0]} name="Taxa de Recuperação (%)">
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              )}

              {selectedMetricView === 'contatos' && (
                <Bar dataKey="Volume de Contatos" fill="#0891b2" radius={[8, 8, 0, 0]} name="Volume de Contatos Realizados (Mês)">
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-contatos-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              )}

              {selectedMetricView === 'acordos' && (
                <Bar dataKey="Acordos no Mês" fill="#ec4899" radius={[8, 8, 0, 0]} name="Quantidade de Acordos Firmados (Mês)">
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-acordos-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Full Comparative Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 md:p-5 border-b border-slate-200 bg-slate-50/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-700" />
              <span>Tabela Comparativa Completa de Performance</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Métricas lado a lado de cada operador(a) com ordenação dinâmica
            </p>
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-2 no-print">
            <span className="text-xs font-semibold text-slate-500">Ordenar por:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 cursor-pointer shadow-2xs"
            >
              <option value="taxaRecuperacao">Taxa de Recuperação (%)</option>
              <option value="acordos">Acordos Firmados no Mês</option>
              <option value="contatos">Volume de Contatos</option>
              <option value="recuperado">Total Recuperado (R$)</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                <th className="p-3 text-center w-12">#</th>
                <th className="p-3">Operador(a)</th>
                <th className="p-3 text-center">Carteira</th>
                <th className="p-3 text-right">Valor Carteira</th>
                <th className="p-3 text-right">Recuperado</th>
                <th className="p-3 text-center min-w-[140px]">Taxa de Recuperação</th>
                <th className="p-3 text-center">Contatos (Mês)</th>
                <th className="p-3 text-center">Acordos (Mês)</th>
                <th className="p-3 text-right">Valor Acordos</th>
                <th className="p-3 text-center">Conversão</th>
                <th className="p-3 text-center no-print">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {operatorsStats.map((op, index) => {
                const isTop = index === 0;
                return (
                  <tr 
                    key={op.nome} 
                    className={`hover:bg-slate-50/80 transition-colors ${
                      isTop ? 'bg-purple-50/20' : ''
                    }`}
                  >
                    {/* Rank */}
                    <td className="p-3 text-center font-bold">
                      {index === 0 && <span className="text-base">🥇</span>}
                      {index === 1 && <span className="text-base">🥈</span>}
                      {index === 2 && <span className="text-base">🥉</span>}
                      {index > 2 && <span className="text-slate-400 font-mono">{index + 1}º</span>}
                    </td>

                    {/* Operator Name and Badge */}
                    <td className="p-3">
                      <div className="flex items-center gap-2.5">
                        <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs shrink-0 ${op.corAvatar}`}>
                          {op.iniciais}
                        </span>
                        <div>
                          <div className="font-extrabold text-slate-900 flex items-center gap-1.5">
                            <span>{op.nome}</span>
                            {op.atingiuMetaRecuperacao && (
                              <span className="w-2 h-2 rounded-full bg-emerald-500" title="Meta de recuperação atingida"></span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-500">{op.cargo}</span>
                        </div>
                      </div>
                    </td>

                    {/* Total Clientes */}
                    <td className="p-3 text-center font-mono font-semibold text-slate-700">
                      {op.totalClientes}
                    </td>

                    {/* Total Carteira */}
                    <td className="p-3 text-right font-mono text-slate-600">
                      R$ {op.totalCarteira.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>

                    {/* Recuperado */}
                    <td className="p-3 text-right font-mono font-bold text-emerald-700">
                      R$ {op.totalRecuperado.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>

                    {/* Taxa de Recuperação (%) com Barra de Progresso */}
                    <td className="p-3 text-center">
                      <div className="space-y-1 inline-block w-full max-w-[120px]">
                        <div className="flex items-center justify-between text-[11px] font-bold">
                          <span className={op.taxaRecuperacao >= META_TAXA_RECUPERACAO ? 'text-emerald-700' : 'text-purple-700'}>
                            {op.taxaRecuperacao.toFixed(1)}%
                          </span>
                          <span className="text-[9px] text-slate-400 font-normal">
                            meta {META_TAXA_RECUPERACAO}%
                          </span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                          <div 
                            className={`h-full rounded-full transition-all ${
                              op.taxaRecuperacao >= META_TAXA_RECUPERACAO 
                                ? 'bg-emerald-600' 
                                : 'bg-purple-600'
                            }`}
                            style={{ width: `${Math.min(100, (op.taxaRecuperacao / META_TAXA_RECUPERACAO) * 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>

                    {/* Volume de Contatos no Mês */}
                    <td className="p-3 text-center">
                      <span className="px-2.5 py-1 rounded-lg text-xs font-bold font-mono bg-cyan-50 text-cyan-800 border border-cyan-200 inline-block">
                        {op.volumeContatosMesAtual}
                      </span>
                    </td>

                    {/* Acordos no Mês */}
                    <td className="p-3 text-center">
                      <span className="px-2.5 py-1 rounded-lg text-xs font-bold font-mono bg-pink-50 text-pink-800 border border-pink-200 inline-block">
                        {op.acordosFirmadosMesAtual}
                      </span>
                    </td>

                    {/* Valor dos Acordos */}
                    <td className="p-3 text-right font-mono font-bold text-pink-700">
                      R$ {op.valorAcordosMesAtual.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>

                    {/* Conversão de Contato para Acordo */}
                    <td className="p-3 text-center">
                      <span className="text-xs font-mono font-bold text-slate-800">
                        {op.taxaConversaoMesAtual}%
                      </span>
                    </td>

                    {/* Ação rápida */}
                    <td className="p-3 text-center no-print">
                      <button
                        type="button"
                        onClick={() => {
                          if (onSelectResponsavel) {
                            onSelectResponsavel(op.nome);
                          }
                        }}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 hover:bg-blue-700 hover:text-white text-slate-700 transition-colors cursor-pointer"
                        title={`Filtrar planilha principal pela carteira de ${op.nome}`}
                      >
                        Ver Carteira
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Individual Operator Bento Cards (Deep Dive) */}
      <div>
        <div className="mb-3">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Diagnóstico Individual e Melhores Práticas por Operador</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Cartões detalhados com indicadores específicos e ponto forte operacional
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {operatorsStats.map((op, idx) => (
            <div 
              key={op.nome}
              className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <span className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${op.corAvatar}`}>
                    {op.iniciais}
                  </span>
                  <div>
                    <h4 className="font-extrabold text-slate-900 text-sm">{op.nome}</h4>
                    <span className="text-[10px] text-slate-500 font-semibold block">{op.cargo}</span>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-slate-400">#{idx + 1}</span>
              </div>

              {/* 3 Core Metric Badges */}
              <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-100 text-center">
                <div className="p-2 bg-purple-50 rounded-xl border border-purple-100">
                  <span className="text-[9px] font-bold text-purple-800 uppercase block">Taxa Recup.</span>
                  <span className="text-sm font-black text-purple-900 block mt-0.5">
                    {op.taxaRecuperacao.toFixed(1)}%
                  </span>
                </div>

                <div className="p-2 bg-cyan-50 rounded-xl border border-cyan-100">
                  <span className="text-[9px] font-bold text-cyan-800 uppercase block">Contatos</span>
                  <span className="text-sm font-black text-cyan-900 block mt-0.5">
                    {op.volumeContatosMesAtual}
                  </span>
                </div>

                <div className="p-2 bg-pink-50 rounded-xl border border-pink-100">
                  <span className="text-[9px] font-bold text-pink-800 uppercase block">Acordos Mês</span>
                  <span className="text-sm font-black text-pink-900 block mt-0.5">
                    {op.acordosFirmadosMesAtual}
                  </span>
                </div>
              </div>

              {/* Financial detail */}
              <div className="mt-3 space-y-1 text-xs">
                <div className="flex items-center justify-between text-slate-600">
                  <span>Valor Recuperado:</span>
                  <strong className="text-emerald-700 font-mono">
                    R$ {op.totalRecuperado.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </strong>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Total da Carteira:</span>
                  <span className="font-mono">
                    R$ {op.totalCarteira.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Ticket Médio Acordo:</span>
                  <span className="font-mono text-pink-800 font-semibold">
                    R$ {op.ticketMedioAcordo.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Best Practice Highlight */}
              <div className="mt-3 p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 text-[11px] text-slate-700">
                <strong className="text-slate-900 block mb-0.5 flex items-center gap-1">
                  <Flame className="w-3 h-3 text-amber-500" />
                  <span>Destaque Operacional:</span>
                </strong>
                <p className="leading-snug text-slate-600">{op.pontoForte}</p>
              </div>

              {/* Bottom Quick Action */}
              <div className="mt-4 pt-3 border-t border-slate-100 no-print">
                <button
                  type="button"
                  onClick={() => {
                    if (onSelectResponsavel) {
                      onSelectResponsavel(op.nome);
                    }
                  }}
                  className="w-full py-2 bg-slate-900 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>Abrir Carteira de {op.nome}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
