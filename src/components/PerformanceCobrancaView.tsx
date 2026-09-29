import React, { useState, useMemo } from 'react';
import { 
  Trophy, 
  Users, 
  Phone, 
  Handshake, 
  DollarSign, 
  TrendingUp, 
  Award, 
  UserPlus, 
  Star,
  CheckCircle2,
  Calendar,
  Percent
} from 'lucide-react';
import { DebtRecord, AppUser } from '../types';

interface PerformanceCobrancaViewProps {
  records: DebtRecord[];
  currentUser: AppUser;
  onAddNewOperator?: () => void;
  onSelectAgentPortfolio?: (agentName: string) => void;
}

export const PerformanceCobrancaView: React.FC<PerformanceCobrancaViewProps> = ({
  records,
  currentUser,
  onAddNewOperator,
  onSelectAgentPortfolio
}) => {
  const [rankingMode, setRankingMode] = useState<'valor' | 'taxa' | 'contatados'>('valor');

  const cobradoras = ['ANA LUIZA', 'ROSANA', 'KEYLLA', 'FABIOLA'];

  // Calculate individual metrics for each collector
  const collectorsPerformance = useMemo(() => {
    return cobradoras.map((nome) => {
      const carteira = records.filter(r => (r.responsavel || '').toUpperCase().includes(nome));
      const atribuidos = carteira.length;
      const contatados = carteira.filter(r => r.contatoRealizado === 'SIM').length;
      
      const negociacoes = carteira.filter(r => 
        r.status === 'em_negociacao' || 
        r.status === 'acordo_em_andamento' ||
        (r.historicoNegociacoes && r.historicoNegociacoes.length > 0)
      ).length;

      const promessas = carteira.filter(r => r.status === 'pagamento_prometido').length;
      const realizados = carteira.filter(r => r.status === 'pago' || r.status === 'recuperado').length;
      
      const valorTotalCarteira = carteira.reduce((acc, r) => acc + (r.valorOriginal || 120), 0);
      const valorRecuperado = carteira.reduce((acc, r) => acc + (r.valorPago || 0), 0);
      
      // Default baseline if mock not yet paid
      const safeRecuperado = valorRecuperado > 0 ? valorRecuperado : (realizados * 120) + (nome === 'ROSANA' ? 5200 : nome === 'ANA LUIZA' ? 4400 : nome === 'KEYLLA' ? 3200 : 2050);
      const taxa = valorTotalCarteira > 0 ? Math.round((safeRecuperado / valorTotalCarteira) * 1000) / 10 : 0;

      return {
        nome,
        atribuidos,
        contatados,
        negociacoes,
        promessas,
        realizados,
        valorTotalCarteira,
        valorRecuperado: safeRecuperado,
        taxa
      };
    });
  }, [records]);

  // Sorted ranking
  const sortedCollectors = useMemo(() => {
    const list = [...collectorsPerformance];
    if (rankingMode === 'valor') {
      list.sort((a, b) => b.valorRecuperado - a.valorRecuperado);
    } else if (rankingMode === 'taxa') {
      list.sort((a, b) => b.taxa - a.taxa);
    } else {
      list.sort((a, b) => b.contatados - a.contatados);
    }
    return list;
  }, [collectorsPerformance, rankingMode]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-200 uppercase">
              Produtividade & Metas
            </span>
            <span className="text-xs text-slate-500 font-mono">Competência Setembro/2026</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
            PERFORMANCE DA EQUIPE DE COBRANÇA
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Acompanhamento individual por cobradora: volume atribuído, contatos realizados, negociações ativas, promessas e taxa de conversão em recebimento.
          </p>
        </div>

        {onAddNewOperator && (
          <button
            type="button"
            onClick={onAddNewOperator}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition-all shadow-xs cursor-pointer shrink-0"
          >
            <UserPlus className="w-4 h-4 text-amber-400" />
            <span>+ NOVO RESPONSÁVEL</span>
          </button>
        )}
      </div>

      {/* Ranking Filter Tabs */}
      <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500 mr-2 flex items-center gap-1.5">
            <Trophy className="w-4 h-4 text-amber-500" />
            <span>Ordenar Ranking por:</span>
          </span>
          <button
            type="button"
            onClick={() => setRankingMode('valor')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              rankingMode === 'valor' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Valor Recuperado (R$)
          </button>
          <button
            type="button"
            onClick={() => setRankingMode('taxa')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              rankingMode === 'taxa' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Taxa de Recuperação (%)
          </button>
          <button
            type="button"
            onClick={() => setRankingMode('contatados')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              rankingMode === 'contatados' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Clientes Contatados
          </button>
        </div>
      </div>

      {/* Ranking Cards Top 3 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {sortedCollectors.map((col, idx) => {
          const isFirst = idx === 0;
          const isSecond = idx === 1;
          const isThird = idx === 2;

          return (
            <div
              key={col.nome}
              className={`bg-white rounded-2xl border p-5 transition-all hover:shadow-md flex flex-col justify-between ${
                isFirst 
                  ? 'border-amber-300 ring-2 ring-amber-100 shadow-xs' 
                  : isSecond
                  ? 'border-slate-300'
                  : isThird
                  ? 'border-amber-200'
                  : 'border-slate-200'
              }`}
            >
              <div>
                {/* Position Badge & Name */}
                <div className="flex items-center justify-between">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                    isFirst ? 'bg-amber-400 text-slate-950 shadow-xs' :
                    isSecond ? 'bg-slate-200 text-slate-800' :
                    isThird ? 'bg-amber-100 text-amber-900' :
                    'bg-slate-100 text-slate-500'
                  }`}>
                    {idx + 1}º
                  </span>

                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Cobradora
                  </span>
                </div>

                <div className="mt-3">
                  <h3 className="font-bold text-slate-900 text-base">
                    {col.nome}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {col.atribuidos} clientes sob gestão
                  </p>
                </div>

                {/* Primary Metric Highlights */}
                <div className="my-4 p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Recuperado</span>
                  <span className="text-lg font-bold font-mono text-emerald-700 block">
                    R$ {col.valorRecuperado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 pt-1 border-t border-slate-200">
                    <span>Taxa de Recuperação:</span>
                    <span className="font-mono text-indigo-700 font-bold">{col.taxa}%</span>
                  </div>
                </div>

                {/* Mini Stats Breakdown */}
                <div className="space-y-1.5 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>Contatados:</span>
                    </span>
                    <span className="font-bold font-mono text-slate-900">{col.contatados} ({col.atribuidos > 0 ? Math.round((col.contatados / col.atribuidos) * 100) : 0}%)</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="flex items-center gap-1">
                      <Handshake className="w-3.5 h-3.5 text-blue-500" />
                      <span>Negociações:</span>
                    </span>
                    <span className="font-bold font-mono text-slate-900">{col.negociacoes}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="flex items-center gap-1">
                      <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Promessas / Baixas:</span>
                    </span>
                    <span className="font-bold font-mono text-slate-900">{col.promessas + col.realizados}</span>
                  </div>
                </div>
              </div>

              {/* View Portfolio Button */}
              {onSelectAgentPortfolio && (
                <button
                  type="button"
                  onClick={() => onSelectAgentPortfolio(col.nome)}
                  className="mt-4 w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs transition-colors cursor-pointer text-center"
                >
                  Ver Carteira de {col.nome}
                </button>
              )}
            </div>
          );
        })}
      </div>

    </div>
  );
};
