import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  Percent, 
  Target, 
  Users, 
  ArrowUpRight, 
  Sparkles,
  HelpCircle,
  Sliders,
  CheckCircle2
} from 'lucide-react';
import { DebtRecord, AppUser } from '../types';

interface RevenueRecoveryProjectionWidgetProps {
  records: DebtRecord[];
  currentUser: AppUser;
  onFilterStatus?: (status: string) => void;
  onSelectResponsavel?: (resp: string) => void;
}

export const RevenueRecoveryProjectionWidget: React.FC<RevenueRecoveryProjectionWidgetProps> = ({
  records,
  currentUser,
  onFilterStatus,
  onSelectResponsavel
}) => {
  // Scenario modifier: Conservative (0.85x), Realist (1.0x), Optimistic (1.15x)
  const [cenario, setCenario] = useState<'conservador' | 'realista' | 'otimista'>('realista');

  // Format BRL Currency
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  // Compute metrics per collector/operator
  const {
    totalRecuperadoJa,
    totalEmNegociacao,
    totalProjetadoEsperado,
    projecaoPorOperador,
    taxaMediaGeral
  } = useMemo(() => {
    // Distinct collectors
    const dynamicCollectors = Array.from(new Set(records.map(r => r.responsavel).filter(Boolean)));
    const collectors = dynamicCollectors.length > 0 ? dynamicCollectors : ['ROSANA', 'ANA LUIZA', 'KEYLLA', 'FABIOLA'];

    let somaRecuperadoJa = 0;
    let somaEmAndamento = 0;
    let somaProjetadoGeral = 0;

    const multiplier = cenario === 'conservador' ? 0.85 : cenario === 'otimista' ? 1.15 : 1.0;

    const operadores = collectors.map(name => {
      const collRecords = records.filter(r => r.responsavel === name);
      const totalClientes = collRecords.length;

      // Closed agreements
      const fechados = collRecords.filter(r => r.status === 'acordo_fechado');
      const boletos = collRecords.filter(r => r.status === 'boleto_gerado');
      
      // In-progress agreements
      const emAndamento = collRecords.filter(r => 
        r.status === 'em_negociacao' || 
        r.status === 'sem_contato' ||
        (r.dataRetorno && r.status !== 'acordo_fechado')
      );

      // Historical success rate based on successful resolutions over contacted clients
      const contatados = collRecords.filter(r => r.contatoRealizado === 'SIM' || (r.historicoContatos && r.historicoContatos.length > 0));
      const baseCalculo = contatados.length > 0 ? contatados.length : totalClientes;
      
      // Historical conversion rate (between 25% and 85%)
      const taxaBruta = baseCalculo > 0 
        ? ((fechados.length + (boletos.length * 0.7)) / baseCalculo) 
        : 0.35;
      const taxaHistorica = Math.min(Math.max(taxaBruta, 0.20), 0.90);

      // Financial values (fallback to average debt of R$ 380,00 if not filled)
      const valorFechados = fechados.reduce((acc, r) => acc + (r.valorAcordo || r.valorOriginal || 380), 0);
      const valorAndamento = emAndamento.reduce((acc, r) => acc + (r.valorAcordo || r.valorOriginal || 380), 0);

      // Expected recovery calculation: (Ongoing Agreements * Historical Rate * Scenario Multiplier)
      const taxaAjustada = Math.min(taxaHistorica * multiplier, 0.98);
      const valorEsperadoRecuperacao = valorAndamento * taxaAjustada;

      somaRecuperadoJa += valorFechados;
      somaEmAndamento += valorAndamento;
      somaProjetadoGeral += valorEsperadoRecuperacao;

      return {
        nome: name,
        totalClientes,
        qtdFechados: fechados.length,
        qtdAndamento: emAndamento.length,
        valorFechados,
        valorAndamento,
        taxaHistorica: Math.round(taxaHistorica * 100),
        taxaAjustada: Math.round(taxaAjustada * 100),
        valorEsperado: valorEsperadoRecuperacao,
        totalEstimado: valorFechados + valorEsperadoRecuperacao
      };
    });

    const taxaGeral = somaEmAndamento > 0 
      ? Math.round((somaProjetadoGeral / somaEmAndamento) * 100) 
      : 50;

    return {
      totalRecuperadoJa: somaRecuperadoJa,
      totalEmNegociacao: somaEmAndamento,
      totalProjetadoEsperado: somaRecuperadoJa + somaProjetadoGeral,
      projecaoPorOperador: operadores,
      taxaMediaGeral: taxaGeral
    };
  }, [records, cenario]);

  return (
    <div id="widget-projecao-recuperacao" className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden transition-all">
      {/* Widget Header */}
      <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-400 flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-white">
                Projeção de Recuperação de Receita
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500 text-slate-950 uppercase tracking-wider">
                Inteligência Analítica
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Cálculo baseado na taxa histórica de sucesso individual dos operadores e nos acordos em andamento
            </p>
          </div>
        </div>

        {/* Scenario Selector */}
        <div className="flex items-center gap-1.5 bg-slate-800/80 p-1 rounded-xl border border-slate-700 text-xs shrink-0 self-start md:self-auto">
          <span className="text-[11px] text-slate-400 px-2 font-medium flex items-center gap-1">
            <Sliders className="w-3 h-3 text-indigo-400" />
            <span>Cenário:</span>
          </span>
          <button
            type="button"
            onClick={() => setCenario('conservador')}
            className={`px-2.5 py-1 rounded-lg transition-all font-semibold cursor-pointer ${
              cenario === 'conservador'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Conservador (-15%)
          </button>
          <button
            type="button"
            onClick={() => setCenario('realista')}
            className={`px-2.5 py-1 rounded-lg transition-all font-semibold cursor-pointer ${
              cenario === 'realista'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Realista (Histórico)
          </button>
          <button
            type="button"
            onClick={() => setCenario('otimista')}
            className={`px-2.5 py-1 rounded-lg transition-all font-semibold cursor-pointer ${
              cenario === 'otimista'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Otimista (+15%)
          </button>
        </div>
      </div>

      {/* Main KPI Bar */}
      <div className="p-6 border-b border-slate-200 bg-slate-50/70">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          
          {/* Total Recuperado Já Confirmado */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 text-xs">
              <span className="font-semibold uppercase tracking-wider">Acordos Fechados (Garantido)</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="mt-2 text-2xl font-bold text-emerald-700">
              {formatCurrency(totalRecuperadoJa)}
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              Volume formalizado em processo de pagamento
            </p>
          </div>

          {/* Em Negociação / Carteira Ativa */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 text-xs">
              <span className="font-semibold uppercase tracking-wider">Em Negociação / Andamento</span>
              <Users className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="mt-2 text-2xl font-bold text-indigo-900">
              {formatCurrency(totalEmNegociacao)}
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              Taxa média histórica da equipe: <strong className="text-indigo-700">{taxaMediaGeral}%</strong>
            </p>
          </div>

          {/* Projeção Total de Recuperação Esperada */}
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-4 rounded-xl border border-emerald-300 shadow-2xs">
            <div className="flex items-center justify-between text-emerald-900 text-xs">
              <span className="font-bold uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>Receita Total Projetada</span>
              </span>
              <ArrowUpRight className="w-4 h-4 text-emerald-700" />
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-emerald-800">
              {formatCurrency(totalProjetadoEsperado)}
            </div>
            <p className="mt-1 text-[11px] text-emerald-700 font-medium">
              Acordos já firmados + projeção probabilística dos operadores
            </p>
          </div>

        </div>
      </div>

      {/* Operator Breakdown Table / Cards */}
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Desempenho &amp; Capacidade de Recuperação por Operador
            </h4>
            <p className="text-xs text-slate-500">
              Taxa de sucesso calibrada com base no histórico de conversão e acordos sob custódia
            </p>
          </div>

          <span className="text-[11px] text-slate-500 font-mono">
            {projecaoPorOperador.length} operadores avaliados
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {projecaoPorOperador.map(op => {
            const progressWidth = `${Math.min(op.taxaAjustada, 100)}%`;
            return (
              <div 
                key={op.nome} 
                className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs transition-all space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h5 className="text-xs font-bold text-slate-900">{op.nome}</h5>
                    <p className="text-[11px] text-slate-500">{op.totalClientes} clientes na carteira</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    op.taxaAjustada >= 50 
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                      : 'bg-amber-100 text-amber-800 border border-amber-300'
                  }`}>
                    {op.taxaAjustada}% sucesso
                  </span>
                </div>

                {/* Progress bar of success rate */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>Efetividade Histórica</span>
                    <strong className="text-slate-800">{op.taxaAjustada}%</strong>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
                      style={{ width: progressWidth }}
                    />
                  </div>
                </div>

                {/* Numbers */}
                <div className="pt-2 border-t border-slate-100 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Em Andamento ({op.qtdAndamento}):</span>
                    <strong className="text-slate-800">{formatCurrency(op.valorAndamento)}</strong>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Acordos Fechados ({op.qtdFechados}):</span>
                    <strong className="text-emerald-700">{formatCurrency(op.valorFechados)}</strong>
                  </div>
                  <div className="flex justify-between items-baseline pt-1 border-t border-dashed border-slate-200">
                    <span className="font-bold text-slate-700 text-[11px]">Recuperação Prevista:</span>
                    <strong className="text-emerald-700 font-bold text-sm">
                      {formatCurrency(op.valorEsperado)}
                    </strong>
                  </div>
                </div>

                {onSelectResponsavel && (
                  <button
                    type="button"
                    onClick={() => onSelectResponsavel(op.nome)}
                    className="w-full text-center py-1.5 px-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg text-[11px] font-semibold border border-slate-200 transition-colors cursor-pointer"
                  >
                    Ver Leads de {op.nome}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
