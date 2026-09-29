import React, { useState, useMemo } from 'react';
import { 
  Calendar, 
  ArrowRight, 
  TrendingUp, 
  TrendingDown, 
  CheckCircle2, 
  PhoneCall, 
  Users, 
  ArrowUpRight,
  Filter,
  BarChart3,
  Crown,
  ShieldCheck
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  CartesianGrid 
} from 'recharts';
import { DebtRecord, AppUser } from '../types';

interface PeriodPerformanceReportProps {
  records: DebtRecord[];
  currentUser: AppUser;
}

export const PeriodPerformanceReport: React.FC<PeriodPerformanceReportProps> = ({
  records,
  currentUser,
}) => {
  const isAdmMaster = currentUser.role === 'adm_master' || currentUser.role === 'suporte';

  // Extract distinct available months from records
  const availableMonths = useMemo(() => {
    const monthSet = new Set<string>();
    
    // Add default core reference periods
    ['01/25', '02/25', '03/25', '09/26', '10/26', '11/26', '12/26'].forEach(m => monthSet.add(m));

    records.forEach(r => {
      if (r.primeiroMesAtraso) {
        monthSet.add(r.primeiroMesAtraso.trim());
      }
      if (r.historicoContatos) {
        r.historicoContatos.forEach(c => {
          if (c.dataHora) {
            // Extract MM/YY or MM/AAAA from date string (e.g. 15/10/2026 -> 10/26)
            const parts = c.dataHora.split('/');
            if (parts.length >= 3) {
              const month = parts[1];
              const year = parts[2].substring(parts[2].length - 2);
              monthSet.add(`${month}/${year}`);
            }
          }
        });
      }
    });

    return Array.from(monthSet).sort((a, b) => {
      const [mA, yA] = a.split('/').map(Number);
      const [mB, yB] = b.split('/').map(Number);
      if (yA !== yB) return (yA || 0) - (yB || 0);
      return (mA || 0) - (mB || 0);
    });
  }, [records]);

  // Selected periods to compare
  const [periodoA, setPeriodoA] = useState<string>(availableMonths[0] || '01/25');
  const [periodoB, setPeriodoB] = useState<string>(
    availableMonths.length > 1 ? availableMonths[availableMonths.length - 1] : '09/26'
  );

  // Quick Preset Handlers
  const handleSetPreset = (preset: '2025_vs_2026' | 'inicio_vs_recente' | 'mes_a_mes') => {
    if (preset === '2025_vs_2026') {
      const first25 = availableMonths.find(m => m.endsWith('25')) || '01/25';
      const first26 = availableMonths.find(m => m.endsWith('26')) || '09/26';
      setPeriodoA(first25);
      setPeriodoB(first26);
    } else if (preset === 'inicio_vs_recente') {
      setPeriodoA(availableMonths[0] || '01/25');
      setPeriodoB(availableMonths[availableMonths.length - 1] || '09/26');
    } else if (preset === 'mes_a_mes') {
      if (availableMonths.length >= 2) {
        setPeriodoA(availableMonths[availableMonths.length - 2]);
        setPeriodoB(availableMonths[availableMonths.length - 1]);
      }
    }
  };

  // Helper to format month label
  const formatMonthLabel = (m: string) => {
    const [month, year] = m.split('/');
    const monthNames: Record<string, string> = {
      '01': 'Jan', '02': 'Fev', '03': 'Mar', '04': 'Abr',
      '05': 'Mai', '06': 'Jun', '07': 'Jul', '08': 'Ago',
      '09': 'Set', '10': 'Out', '11': 'Nov', '12': 'Dez'
    };
    const name = monthNames[month] || month;
    return `${name}/20${year}`;
  };

  // Compute metrics for a given period
  const getPeriodStats = (targetMonth: string) => {
    // Records associated with this period either by primeiroMesAtraso or contact logs
    const matchingRecords = records.filter(r => {
      if (r.primeiroMesAtraso === targetMonth) return true;
      if (r.historicoContatos && r.historicoContatos.length > 0) {
        return r.historicoContatos.some(c => c.dataHora && c.dataHora.includes(`/${targetMonth.split('/')[0]}/`));
      }
      return false;
    });

    // Volume of collections conducted
    const totalContatos = matchingRecords.reduce((acc, r) => {
      const logsCount = r.historicoContatos ? r.historicoContatos.length : 0;
      return acc + (logsCount > 0 ? logsCount : (r.contatoRealizado === 'SIM' ? 1 : 0));
    }, 0);

    // Closed agreements
    const acordosFechados = matchingRecords.filter(r => r.status === 'acordo_fechado');
    const boletosGerados = matchingRecords.filter(r => r.status === 'boleto_gerado');
    const emNegociacao = matchingRecords.filter(r => r.status === 'em_negociacao');

    const totalResolvidos = acordosFechados.length + boletosGerados.length;
    const taxaConversao = totalContatos > 0 
      ? Math.round((totalResolvidos / Math.max(totalContatos, 1)) * 100)
      : Math.round((totalResolvidos / Math.max(matchingRecords.length, 1)) * 100);

    const valorTotalAcordos = acordosFechados.reduce((acc, r) => acc + (r.valorAcordo || r.valorOriginal || 380), 0);

    // Operator breakdown
    const collectors = ['ROSANA', 'ANA LUIZA', 'KEYLLA', 'FABIOLA'];
    const porOperador = collectors.map(name => {
      const opRecords = matchingRecords.filter(r => r.responsavel === name);
      const opContatos = opRecords.reduce((acc, r) => acc + (r.historicoContatos?.length || (r.contatoRealizado === 'SIM' ? 1 : 0)), 0);
      const opAcordos = opRecords.filter(r => r.status === 'acordo_fechado').length;
      return {
        nome: name,
        contatos: opContatos,
        acordos: opAcordos,
        taxa: opContatos > 0 ? Math.round((opAcordos / opContatos) * 100) : 0
      };
    });

    return {
      mes: targetMonth,
      label: formatMonthLabel(targetMonth),
      totalLeads: matchingRecords.length,
      volumeCobrancas: totalContatos,
      acordosFechados: acordosFechados.length,
      boletosGerados: boletosGerados.length,
      emNegociacao: emNegociacao.length,
      totalResolvidos,
      taxaConversao,
      valorTotalAcordos,
      porOperador
    };
  };

  const statsA = useMemo(() => getPeriodStats(periodoA), [records, periodoA]);
  const statsB = useMemo(() => getPeriodStats(periodoB), [records, periodoB]);

  // Calculate Deltas (B vs A)
  const deltaCobrancas = statsA.volumeCobrancas > 0
    ? Math.round(((statsB.volumeCobrancas - statsA.volumeCobrancas) / statsA.volumeCobrancas) * 100)
    : 0;

  const deltaAcordos = statsA.acordosFechados > 0
    ? Math.round(((statsB.acordosFechados - statsA.acordosFechados) / statsA.acordosFechados) * 100)
    : 0;

  const deltaTaxa = statsB.taxaConversao - statsA.taxaConversao;

  // Chart Data
  const chartData = [
    {
      metrica: 'Cobranças Realizadas',
      [statsA.label]: statsA.volumeCobrancas,
      [statsB.label]: statsB.volumeCobrancas,
    },
    {
      metrica: 'Acordos Fechados',
      [statsA.label]: statsA.acordosFechados,
      [statsB.label]: statsB.acordosFechados,
    },
    {
      metrica: 'Boletos Emitidos',
      [statsA.label]: statsA.boletosGerados,
      [statsB.label]: statsB.boletosGerados,
    },
    {
      metrica: 'Em Negociação',
      [statsA.label]: statsA.emNegociacao,
      [statsB.label]: statsB.emNegociacao,
    }
  ];

  return (
    <div id="relatorio-desempenho-periodo" className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden space-y-6">
      
      {/* Header with Adm Master Badge */}
      <div className="p-6 bg-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-400/20 border border-amber-400/30 text-amber-400 flex items-center justify-center shrink-0">
            <Crown className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-white">
                Desempenho por Período &amp; Comparativo Mensal
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-slate-950 uppercase tracking-wider">
                Exclusivo Adm Master
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Compare a produtividade de cobranças efetuadas e acordos fechados entre meses distintos
            </p>
          </div>
        </div>

        {/* Quick Presets */}
        <div className="flex items-center gap-1.5 bg-slate-800 p-1 rounded-xl border border-slate-700 text-xs self-start md:self-auto flex-wrap">
          <span className="text-[11px] text-slate-400 px-2 font-medium">Filtro Rápido:</span>
          <button
            type="button"
            onClick={() => handleSetPreset('2025_vs_2026')}
            className="px-2.5 py-1 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 font-semibold cursor-pointer transition-colors"
          >
            2025 vs 2026
          </button>
          <button
            type="button"
            onClick={() => handleSetPreset('mes_a_mes')}
            className="px-2.5 py-1 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 font-semibold cursor-pointer transition-colors"
          >
            Mês a Mês
          </button>
          <button
            type="button"
            onClick={() => handleSetPreset('inicio_vs_recente')}
            className="px-2.5 py-1 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 font-semibold cursor-pointer transition-colors"
          >
            Extremos
          </button>
        </div>
      </div>

      {/* Selectors Bar */}
      <div className="px-6 py-4 bg-slate-50 border-y border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px] flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
              <span>Mês Base (A):</span>
            </span>
            <select
              value={periodoA}
              onChange={(e) => setPeriodoA(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-bold text-indigo-700 shadow-2xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            >
              {availableMonths.map(m => (
                <option key={`a-${m}`} value={m}>
                  {formatMonthLabel(m)} ({m})
                </option>
              ))}
            </select>
          </div>

          <span className="text-slate-400 font-bold hidden sm:inline">➔</span>

          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px] flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-emerald-600" />
              <span>Mês Comparado (B):</span>
            </span>
            <select
              value={periodoB}
              onChange={(e) => setPeriodoB(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-bold text-emerald-700 shadow-2xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            >
              {availableMonths.map(m => (
                <option key={`b-${m}`} value={m}>
                  {formatMonthLabel(m)} ({m})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="text-[11px] text-slate-500 font-medium">
          Comparando <strong>{statsA.label}</strong> vs <strong>{statsB.label}</strong>
        </div>
      </div>

      {/* Comparison Scorecards */}
      <div className="px-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Card 1: Volume de Cobranças Realizadas */}
        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
              <PhoneCall className="w-4 h-4 text-blue-600" />
              <span>Volume de Cobranças</span>
            </span>
            <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
              deltaCobrancas >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
            }`}>
              {deltaCobrancas >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              <span>{deltaCobrancas >= 0 ? `+${deltaCobrancas}%` : `${deltaCobrancas}%`}</span>
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="bg-indigo-50/60 p-2.5 rounded-lg border border-indigo-100">
              <span className="text-[10px] text-indigo-700 font-bold block">{statsA.label}</span>
              <span className="text-xl font-extrabold text-indigo-950">{statsA.volumeCobrancas}</span>
              <span className="text-[10px] text-indigo-600 block">contatos</span>
            </div>

            <div className="bg-emerald-50/60 p-2.5 rounded-lg border border-emerald-100">
              <span className="text-[10px] text-emerald-700 font-bold block">{statsB.label}</span>
              <span className="text-xl font-extrabold text-emerald-950">{statsB.volumeCobrancas}</span>
              <span className="text-[10px] text-emerald-600 block">contatos</span>
            </div>
          </div>
        </div>

        {/* Card 2: Acordos Fechados */}
        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Acordos Fechados</span>
            </span>
            <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
              deltaAcordos >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
            }`}>
              {deltaAcordos >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              <span>{deltaAcordos >= 0 ? `+${deltaAcordos}%` : `${deltaAcordos}%`}</span>
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="bg-indigo-50/60 p-2.5 rounded-lg border border-indigo-100">
              <span className="text-[10px] text-indigo-700 font-bold block">{statsA.label}</span>
              <span className="text-xl font-extrabold text-indigo-950">{statsA.acordosFechados}</span>
              <span className="text-[10px] text-indigo-600 block">acordos</span>
            </div>

            <div className="bg-emerald-50/60 p-2.5 rounded-lg border border-emerald-100">
              <span className="text-[10px] text-emerald-700 font-bold block">{statsB.label}</span>
              <span className="text-xl font-extrabold text-emerald-950">{statsB.acordosFechados}</span>
              <span className="text-[10px] text-emerald-600 block">acordos</span>
            </div>
          </div>
        </div>

        {/* Card 3: Taxa de Conversão */}
        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-purple-600" />
              <span>Taxa de Conversão</span>
            </span>
            <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
              deltaTaxa >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
            }`}>
              <span>{deltaTaxa >= 0 ? `+${deltaTaxa} pts` : `${deltaTaxa} pts`}</span>
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="bg-indigo-50/60 p-2.5 rounded-lg border border-indigo-100">
              <span className="text-[10px] text-indigo-700 font-bold block">{statsA.label}</span>
              <span className="text-xl font-extrabold text-indigo-950">{statsA.taxaConversao}%</span>
              <span className="text-[10px] text-indigo-600 block">conversão</span>
            </div>

            <div className="bg-emerald-50/60 p-2.5 rounded-lg border border-emerald-100">
              <span className="text-[10px] text-emerald-700 font-bold block">{statsB.label}</span>
              <span className="text-xl font-extrabold text-emerald-950">{statsB.taxaConversao}%</span>
              <span className="text-[10px] text-emerald-600 block">conversão</span>
            </div>
          </div>
        </div>

      </div>

      {/* Visual Recharts Bar Chart */}
      <div className="px-6 py-4">
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-indigo-600" />
            <span>Comparativo Visual de Métricas: {statsA.label} vs {statsB.label}</span>
          </h4>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="metrica" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey={statsA.label} fill="#6366f1" radius={[4, 4, 0, 0]} name={`${statsA.label}`} />
                <Bar dataKey={statsB.label} fill="#10b981" radius={[4, 4, 0, 0]} name={`${statsB.label}`} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Breakdown per Operator comparison table */}
      <div className="px-6 pb-6">
        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
          <div className="px-4 py-3 bg-slate-100/80 border-b border-slate-200 flex items-center justify-between text-xs">
            <span className="font-bold text-slate-800 uppercase tracking-wider">
              Desempenho por Operador no Comparativo de Períodos
            </span>
            <span className="text-[11px] text-slate-500">
              Volume de cobranças e acordos individuais
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-2.5">Cobradora / Operador</th>
                  <th className="px-4 py-2.5 text-center bg-indigo-50/50 text-indigo-950">Cobranças ({statsA.label})</th>
                  <th className="px-4 py-2.5 text-center bg-emerald-50/50 text-emerald-950">Cobranças ({statsB.label})</th>
                  <th className="px-4 py-2.5 text-center bg-indigo-50/50 text-indigo-950">Acordos ({statsA.label})</th>
                  <th className="px-4 py-2.5 text-center bg-emerald-50/50 text-emerald-950">Acordos ({statsB.label})</th>
                  <th className="px-4 py-2.5 text-center">Evolução (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {statsA.porOperador.map((opA, index) => {
                  const opB = statsB.porOperador[index] || { contatos: 0, acordos: 0 };
                  const diffAcordos = opB.acordos - opA.acordos;
                  return (
                    <tr key={opA.nome} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-2.5 font-bold text-slate-900 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                        <span>{opA.nome}</span>
                      </td>
                      <td className="px-4 py-2.5 text-center bg-indigo-50/20 font-mono text-slate-800">{opA.contatos}</td>
                      <td className="px-4 py-2.5 text-center bg-emerald-50/20 font-mono font-bold text-emerald-800">{opB.contatos}</td>
                      <td className="px-4 py-2.5 text-center bg-indigo-50/20 font-mono text-slate-800">{opA.acordos}</td>
                      <td className="px-4 py-2.5 text-center bg-emerald-50/20 font-mono font-bold text-emerald-800">{opB.acordos}</td>
                      <td className="px-4 py-2.5 text-center">
                        <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          diffAcordos >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {diffAcordos >= 0 ? `+${diffAcordos} acordos` : `${diffAcordos} acordos`}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </div>
  );
};
