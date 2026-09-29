import React, { useMemo, useState } from 'react';
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
import {
  TrendingUp,
  Award,
  Users,
  CheckCircle2,
  PhoneCall,
  Sparkles,
  Lightbulb,
  ArrowUpRight,
  Info
} from 'lucide-react';
import { DebtRecord, AppUser } from '../types';

interface OperatorConversionRateWidgetProps {
  records: DebtRecord[];
  currentUser?: AppUser;
  onSelectOperator?: (operator: string) => void;
}

interface OperatorConversionData {
  nome: string;
  totalLeads: number;
  contatosRealizados: number;
  acordosFirmados: number;
  emNegociacao: number;
  taxaConversao: number; // (acordos / contatos) * 100
  taxaConversaoTotal: number; // (acordos / totalLeads) * 100
  valorRecuperado: number;
  ticketMedio: number;
  destaqueMelhorPratica: string;
}

export const OperatorConversionRateWidget: React.FC<OperatorConversionRateWidgetProps> = ({
  records,
  currentUser,
  onSelectOperator
}) => {
  const [selectedMetric, setSelectedMetric] = useState<'taxa' | 'absoluto'>('absoluto');

  // Compute conversion metrics per operator
  const operatorsData = useMemo<OperatorConversionData[]>(() => {
    const listOperators = ['ROSANA', 'ANA LUIZA', 'KEYLLA', 'FABIOLA'];
    
    // Add any other operators present in records
    const extraOps = new Set<string>();
    records.forEach(r => {
      const resp = (r.responsavel || '').trim().toUpperCase();
      if (resp && resp !== 'GERAL' && !listOperators.includes(resp)) {
        extraOps.add(resp);
      }
    });

    const allOps = [...listOperators, ...Array.from(extraOps)];

    // Best practice tips associated with operational methods
    const bestPracticesCatalog: Record<string, string> = {
      'ROSANA': 'Abordagem consultiva com envio imediato de chave PIX com desconto nas primeiras 24h de contato.',
      'ANA LUIZA': 'Agilidade no retorno de ligações e renegociação em parcelas curtas com alto índice de cumprimento.',
      'KEYLLA': 'Excelente recuperação preventiva com envio de boletos antecipados antes do vencimento crítico.',
      'FABIOLA': 'Constância no contato via WhatsApp corporativo e acompanhamento pontual de datas de retorno.',
    };

    return allOps.map(op => {
      const opRecords = records.filter(r => (r.responsavel || '').toUpperCase().includes(op));
      const totalLeads = opRecords.length;

      // Calculate contacts made: explicit contacts in history or marked as SIM or has interaction
      const contatosRealizados = opRecords.filter(r => 
        (r.historicoContatos && r.historicoContatos.length > 0) ||
        r.contatoRealizado === 'SIM' ||
        r.status === 'em_negociacao' ||
        r.status === 'acordo_fechado' ||
        r.status === 'boleto_gerado' ||
        r.status === 'pago' ||
        Boolean(r.dataRetorno)
      ).length;

      // Calculate agreements closed
      const acordosFirmados = opRecords.filter(r => 
        r.status === 'acordo_fechado' || 
        r.status === 'boleto_gerado' || 
        r.status === 'pago' || 
        r.status === 'recuperado'
      ).length;

      const emNegociacao = opRecords.filter(r => r.status === 'em_negociacao').length;

      const valorRecuperado = opRecords.reduce((sum, r) => {
        if (r.status === 'acordo_fechado' || r.status === 'pago' || r.status === 'boleto_gerado') {
          return sum + (r.valorAcordo || r.valorPago || r.valorOriginal || 120);
        }
        return sum;
      }, 0);

      // Conversion rate calculation: agreements / contacts (fallback to total leads if 0)
      const baseContatos = contatosRealizados > 0 ? contatosRealizados : totalLeads;
      const taxaConversao = baseContatos > 0 
        ? Math.round((acordosFirmados / baseContatos) * 100) 
        : 0;

      const taxaConversaoTotal = totalLeads > 0 
        ? Math.round((acordosFirmados / totalLeads) * 100) 
        : 0;

      const ticketMedio = acordosFirmados > 0 ? Math.round(valorRecuperado / acordosFirmados) : 0;

      const destaqueMelhorPratica = bestPracticesCatalog[op] || 
        'Persistência multicanal com uso de mensagens personalizadas no WhatsApp.';

      return {
        nome: op,
        totalLeads,
        contatosRealizados,
        acordosFirmados,
        emNegociacao,
        taxaConversao,
        taxaConversaoTotal,
        valorRecuperado,
        ticketMedio,
        destaqueMelhorPratica
      };
    }).sort((a, b) => b.taxaConversao - a.taxaConversao);
  }, [records]);

  // Top performer
  const topPerformer = operatorsData[0];

  // Overall totals
  const totalContatosGeral = operatorsData.reduce((acc, o) => acc + o.contatosRealizados, 0);
  const totalAcordosGeral = operatorsData.reduce((acc, o) => acc + o.acordosFirmados, 0);
  const taxaGeral = totalContatosGeral > 0 
    ? Math.round((totalAcordosGeral / totalContatosGeral) * 100) 
    : 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
      
      {/* Header do Widget */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-blue-100 text-blue-800">
              <TrendingUp className="w-5 h-5 text-blue-700" />
            </span>
            <div>
              <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                <span>Taxa de Conversão por Operador</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  Melhores Práticas
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Comparativo direto entre <strong>contatos acionados</strong> e <strong>acordos formalizados</strong> por cobradora.
              </p>
            </div>
          </div>
        </div>

        {/* Alternador de Modo de Visualização */}
        <div className="flex items-center gap-2 self-start sm:self-auto bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
          <button
            type="button"
            onClick={() => setSelectedMetric('absoluto')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              selectedMetric === 'absoluto'
                ? 'bg-white text-blue-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Contatos vs Acordos
          </button>
          <button
            type="button"
            onClick={() => setSelectedMetric('taxa')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              selectedMetric === 'taxa'
                ? 'bg-white text-blue-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Taxa % de Eficácia
          </button>
        </div>
      </div>

      {/* Destaque da Melhor Prática (Top Performer Banner) */}
      {topPerformer && (
        <div className="bg-gradient-to-r from-amber-50 via-emerald-50 to-blue-50 border border-emerald-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Award className="w-5 h-5 text-amber-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                  Líder de Conversão • {topPerformer.nome}
                </span>
                <span className="text-xs font-bold text-emerald-700">
                  {topPerformer.taxaConversao}% de conversão
                </span>
              </div>
              <p className="text-xs text-slate-700 mt-1">
                <strong>Melhor Prática Identificada:</strong> {topPerformer.destaqueMelhorPratica}
              </p>
              <div className="flex items-center gap-3 text-[11px] text-slate-600 mt-1 font-mono">
                <span>Contatos: <strong>{topPerformer.contatosRealizados}</strong></span>
                <span>•</span>
                <span>Acordos: <strong className="text-emerald-700">{topPerformer.acordosFirmados}</strong></span>
                <span>•</span>
                <span>Recuperado: <strong className="text-emerald-800">R$ {topPerformer.valorRecuperado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></span>
              </div>
            </div>
          </div>

          <div className="text-right shrink-0 bg-white/80 p-3 rounded-lg border border-emerald-100">
            <span className="text-[10px] text-slate-500 font-bold uppercase block">Média da Equipe</span>
            <span className="text-lg font-black text-blue-700 font-mono">{taxaGeral}%</span>
            <span className="text-[10px] text-slate-500 block">{totalAcordosGeral} acordos de {totalContatosGeral} contatos</span>
          </div>
        </div>
      )}

      {/* Gráfico de Barras: Contatos Realizados vs Acordos Firmados */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-600">
          <span className="font-semibold text-slate-700 flex items-center gap-1.5">
            <PhoneCall className="w-3.5 h-3.5 text-blue-600" />
            <span>Distribuição de Contatos e Acordos Firmados por Operadora</span>
          </span>
          <span className="text-[11px] text-slate-400">Clique na coluna para filtrar na planilha</span>
        </div>

        <div className="h-64 sm:h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            {selectedMetric === 'absoluto' ? (
              <BarChart
                data={operatorsData}
                margin={{ top: 10, right: 20, left: 0, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="nome" 
                  tick={{ fontSize: 11, fontWeight: 600, fill: '#334155' }}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tickLine={false}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload as OperatorConversionData;
                      return (
                        <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl text-xs space-y-1.5 border border-slate-700 min-w-[200px]">
                          <div className="font-black text-sm text-blue-300 border-b border-slate-700 pb-1">
                            {data.nome}
                          </div>
                          <div className="flex justify-between items-center text-slate-300">
                            <span>Contatos Realizados:</span>
                            <span className="font-bold text-white font-mono">{data.contatosRealizados}</span>
                          </div>
                          <div className="flex justify-between items-center text-emerald-400">
                            <span>Acordos Firmados:</span>
                            <span className="font-bold text-emerald-300 font-mono">{data.acordosFirmados}</span>
                          </div>
                          <div className="flex justify-between items-center text-amber-300">
                            <span>Em Negociação:</span>
                            <span className="font-bold text-amber-200 font-mono">{data.emNegociacao}</span>
                          </div>
                          <div className="border-t border-slate-700 pt-1 flex justify-between items-center text-blue-300 font-bold">
                            <span>Taxa de Conversão:</span>
                            <span className="font-mono text-sm">{data.taxaConversao}%</span>
                          </div>
                          <div className="text-[10px] text-emerald-300 font-mono">
                            Valor Recuperado: R$ {data.valorRecuperado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend 
                  verticalAlign="top" 
                  height={36}
                  iconType="circle"
                  wrapperStyle={{ fontSize: '11px', fontWeight: 600 }}
                />
                <Bar 
                  dataKey="contatosRealizados" 
                  name="Contatos Realizados" 
                  fill="#3b82f6" 
                  radius={[6, 6, 0, 0]} 
                  cursor="pointer"
                  onClick={(entry) => onSelectOperator && onSelectOperator(entry.nome)}
                />
                <Bar 
                  dataKey="acordosFirmados" 
                  name="Acordos Firmados" 
                  fill="#10b981" 
                  radius={[6, 6, 0, 0]} 
                  cursor="pointer"
                  onClick={(entry) => onSelectOperator && onSelectOperator(entry.nome)}
                />
              </BarChart>
            ) : (
              <BarChart
                data={operatorsData}
                margin={{ top: 10, right: 20, left: 0, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="nome" 
                  tick={{ fontSize: 11, fontWeight: 600, fill: '#334155' }}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tickLine={false}
                />
                <YAxis 
                  unit="%" 
                  domain={[0, 100]}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(val: any) => [`${val}%`, 'Taxa de Conversão']}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                />
                <Legend 
                  verticalAlign="top" 
                  height={36}
                  iconType="circle"
                  wrapperStyle={{ fontSize: '11px', fontWeight: 600 }}
                />
                <Bar 
                  dataKey="taxaConversao" 
                  name="Taxa de Conversão (%)" 
                  fill="#059669" 
                  radius={[6, 6, 0, 0]}
                  cursor="pointer"
                  onClick={(entry) => onSelectOperator && onSelectOperator(entry.nome)}
                >
                  {operatorsData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.taxaConversao >= 50 ? '#059669' : entry.taxaConversao >= 35 ? '#2563eb' : '#d97706'} 
                    />
                  ))}
                </Bar>
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Grid de Cards com Melhores Práticas & Métricas Detalhadas por Operador */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
        {operatorsData.map((op, idx) => {
          const isTop = idx === 0;
          return (
            <div
              key={op.nome}
              onClick={() => onSelectOperator && onSelectOperator(op.nome)}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer hover:shadow-sm ${
                isTop 
                  ? 'bg-emerald-50/40 border-emerald-300 ring-1 ring-emerald-200' 
                  : 'bg-slate-50/70 border-slate-200 hover:border-blue-300'
              }`}
              title="Clique para filtrar a carteira desta operadora na planilha"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${
                    isTop ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-white'
                  }`}>
                    {idx + 1}º
                  </span>
                  <span className="font-bold text-xs text-slate-900">{op.nome}</span>
                </div>
                <span className={`text-xs font-black px-2 py-0.5 rounded-full ${
                  op.taxaConversao >= 45 
                    ? 'bg-emerald-100 text-emerald-800' 
                    : op.taxaConversao >= 30 
                    ? 'bg-blue-100 text-blue-800' 
                    : 'bg-amber-100 text-amber-800'
                }`}>
                  {op.taxaConversao}%
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-2.5">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    op.taxaConversao >= 45 ? 'bg-emerald-500' : op.taxaConversao >= 30 ? 'bg-blue-500' : 'bg-amber-500'
                  }`}
                  style={{ width: `${Math.min(op.taxaConversao, 100)}%` }}
                />
              </div>

              {/* Statistics row */}
              <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-600 mt-2.5 pt-2 border-t border-slate-200/70">
                <div>
                  <span className="text-slate-400 block">Contatos:</span>
                  <strong className="text-slate-800 font-mono">{op.contatosRealizados}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block">Acordos:</span>
                  <strong className="text-emerald-700 font-mono">{op.acordosFirmados}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block">Em Negoc.:</span>
                  <strong className="text-amber-700 font-mono">{op.emNegociacao}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block">Recuperado:</span>
                  <strong className="text-slate-900 font-mono">
                    R$ {(op.valorRecuperado / 1000).toFixed(1)}k
                  </strong>
                </div>
              </div>

              {/* Destaque de prática */}
              <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-start gap-1 text-[10px] text-slate-600 leading-tight">
                <Lightbulb className="w-3 h-3 text-amber-500 shrink-0 mt-0.5" />
                <span className="italic line-clamp-2">{op.destaqueMelhorPratica}</span>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};
