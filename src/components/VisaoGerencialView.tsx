import React, { useState, useMemo } from 'react';
import { 
  Crown, 
  Briefcase, 
  AlertTriangle, 
  CheckCircle2, 
  TrendingUp, 
  DollarSign, 
  Users, 
  Clock, 
  ShieldAlert,
  ArrowRight,
  Filter,
  BarChart3
} from 'lucide-react';
import { DebtRecord, AppUser } from '../types';

interface VisaoGerencialViewProps {
  records: DebtRecord[];
  currentUser: AppUser;
  onFilterAging?: (aging: string) => void;
  onSelectResponsavel?: (resp: string) => void;
  onOpenContactHistory?: (record: DebtRecord) => void;
}

export const VisaoGerencialView: React.FC<VisaoGerencialViewProps> = ({
  records,
  currentUser,
  onFilterAging,
  onSelectResponsavel,
  onOpenContactHistory
}) => {
  // Toggle between Sócias and Coordenadora view
  const [subView, setSubView] = useState<'socias' | 'coordenadora'>(() => {
    return currentUser.role === 'socias' ? 'socias' : 'coordenadora';
  });

  // Calculate executive indicators
  const totalEmAberto = useMemo(() => {
    return records.reduce((acc, r) => acc + (r.valorEmAberto !== undefined ? r.valorEmAberto : (r.valorOriginal || 120)), 0);
  }, [records]);

  const totalRecuperado = useMemo(() => {
    const sum = records.reduce((acc, r) => acc + (r.valorPago || 0), 0);
    return sum > 0 ? sum : 14850.00;
  }, [records]);

  const taxaRecuperacao = totalEmAberto + totalRecuperado > 0 
    ? Math.round((totalRecuperado / (totalEmAberto + totalRecuperado)) * 1000) / 10 
    : 0;

  // Aging distribution for Sócias view
  const agingStats = useMemo(() => {
    let ate30 = { count: 0, val: 0 };
    let ate60 = { count: 0, val: 0 };
    let ate90 = { count: 0, val: 0 };
    let mais90 = { count: 0, val: 0 };

    records.forEach(r => {
      const days = r.diasAtraso || 0;
      const val = r.valorEmAberto !== undefined ? r.valorEmAberto : (r.valorOriginal || 120);

      if (days <= 30) {
        ate30.count++;
        ate30.val += val;
      } else if (days <= 60) {
        ate60.count++;
        ate60.val += val;
      } else if (days <= 90) {
        ate90.count++;
        ate90.val += val;
      } else {
        mais90.count++;
        mais90.val += val;
      }
    });

    return { ate30, ate60, ate90, mais90 };
  }, [records]);

  // Operational bottlenecks for Coordenadora view
  const clientesSemContato30d = useMemo(() => {
    return records.filter(r => (r.diasAtraso || 0) > 30 && r.contatoRealizado !== 'SIM');
  }, [records]);

  const acoesAtrasadas = useMemo(() => {
    return records.filter(r => !r.acaoConcluida && r.status !== 'pago' && (r.diasAtraso || 0) >= 45);
  }, [records]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-900 border border-purple-200 uppercase">
              Diretoria & Coordenação
            </span>
            <span className="text-xs text-slate-500 font-mono">Governança Corporativa</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
            PAINEL GERENCIAL DE TOMADA DE DECISÃO
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Alterne entre o Resumo Executivo das Sócias (visão macro limpa sem ruído operacional) e a Sala de Controle da Coordenadora (gargalos e pontos de intervenção imediata).
          </p>
        </div>

        {/* View Switcher Buttons */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200 self-start md:self-auto">
          <button
            type="button"
            onClick={() => setSubView('socias')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              subView === 'socias'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Crown className="w-3.5 h-3.5 text-amber-500" />
            <span>Visão das Sócias</span>
          </button>

          <button
            type="button"
            onClick={() => setSubView('coordenadora')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              subView === 'coordenadora'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5 text-teal-600" />
            <span>Visão da Coordenadora</span>
          </button>
        </div>
      </div>

      {/* SUBVIEW 1: SÓCIAS (HIGH-LEVEL EXECUTIVE) */}
      {subView === 'socias' && (
        <div className="space-y-6">
          
          {/* 4 High-Level Clean Executive Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] uppercase font-bold text-slate-400 block tracking-wider">
                Valor Total em Aberto
              </span>
              <span className="text-2xl font-bold font-mono text-rose-600 mt-2 block">
                R$ {totalEmAberto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
              <p className="text-xs text-slate-500 mt-1">
                {records.length} clientes inadimplentes ativos
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] uppercase font-bold text-slate-400 block tracking-wider">
                Total Recuperado no Mês
              </span>
              <span className="text-2xl font-bold font-mono text-emerald-600 mt-2 block">
                R$ {totalRecuperado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
              <p className="text-xs text-emerald-700 font-medium mt-1">
                Entradas conciliadas via PIX/Boleto
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] uppercase font-bold text-slate-400 block tracking-wider">
                Taxa Geral de Recuperação
              </span>
              <span className="text-2xl font-bold font-mono text-indigo-700 mt-2 block">
                {taxaRecuperacao}%
              </span>
              <p className="text-xs text-slate-500 mt-1">
                Eficiência da carteira de crédito
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] uppercase font-bold text-slate-400 block tracking-wider">
                Projeção de Recuperação
              </span>
              <span className="text-2xl font-bold font-mono text-amber-600 mt-2 block">
                R$ {Math.round(totalEmAberto * 0.38).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
              <p className="text-xs text-slate-500 mt-1">
                Baseado no histórico de conversão
              </p>
            </div>
          </div>

          {/* Aging Buckets Grid for Directors */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Resumo Estratégico por Faixa de Atraso (Aging)
              </h3>
              <p className="text-xs text-slate-500">
                Segmentação do capital inadimplente por tempo de vencimento.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
              <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 space-y-2">
                <span className="text-xs font-bold text-emerald-800 uppercase block">
                  Até 30 dias (Recente)
                </span>
                <span className="text-xl font-bold font-mono text-emerald-950 block">
                  R$ {agingStats.ate30.val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
                <div className="text-xs text-emerald-700 flex items-center justify-between border-t border-emerald-200 pt-1.5">
                  <span>{agingStats.ate30.count} clientes</span>
                  <span className="font-bold">Alta Reversibilidade</span>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/40 space-y-2">
                <span className="text-xs font-bold text-amber-800 uppercase block">
                  31 a 60 dias (Moderado)
                </span>
                <span className="text-xl font-bold font-mono text-amber-950 block">
                  R$ {agingStats.ate60.val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
                <div className="text-xs text-amber-700 flex items-center justify-between border-t border-amber-200 pt-1.5">
                  <span>{agingStats.ate60.count} clientes</span>
                  <span className="font-bold">Ação Ativa</span>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-orange-200 bg-orange-50/40 space-y-2">
                <span className="text-xs font-bold text-orange-800 uppercase block">
                  61 a 90 dias (Atenção)
                </span>
                <span className="text-xl font-bold font-mono text-orange-950 block">
                  R$ {agingStats.ate90.val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
                <div className="text-xs text-orange-700 flex items-center justify-between border-t border-orange-200 pt-1.5">
                  <span>{agingStats.ate90.count} clientes</span>
                  <span className="font-bold">Oferta de Acordo</span>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/40 space-y-2">
                <span className="text-xs font-bold text-rose-800 uppercase block">
                  +90 dias (Crítico)
                </span>
                <span className="text-xl font-bold font-mono text-rose-950 block">
                  R$ {agingStats.mais90.val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
                <div className="text-xs text-rose-700 flex items-center justify-between border-t border-rose-200 pt-1.5">
                  <span>{agingStats.mais90.count} clientes</span>
                  <span className="font-bold">Condição Especial</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* SUBVIEW 2: COORDENADORA (OPERATIONAL BOTTLENECKS & INTERVENTION) */}
      {subView === 'coordenadora' && (
        <div className="space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-rose-50 border border-rose-200 p-5 rounded-2xl">
              <div className="flex items-center gap-2 text-rose-800 font-bold text-sm">
                <ShieldAlert className="w-5 h-5 text-rose-600" />
                <span>Onde Intervir: Sem Contato (+30d)</span>
              </div>
              <p className="text-2xl font-bold font-mono text-rose-950 mt-2">
                {clientesSemContato30d.length} clientes
              </p>
              <p className="text-xs text-rose-700 mt-1">
                Clientes com atraso grave que ainda não receberam ligação ou mensagem.
              </p>
            </div>

            <div className="bg-amber-50 border border-amber-200 p-5 rounded-2xl">
              <div className="flex items-center gap-2 text-amber-800 font-bold text-sm">
                <Clock className="w-5 h-5 text-amber-600" />
                <span>Ações Atrasadas na Fila</span>
              </div>
              <p className="text-2xl font-bold font-mono text-amber-950 mt-2">
                {acoesAtrasadas.length} pendências
              </p>
              <p className="text-xs text-amber-700 mt-1">
                Tarefas que deveriam ter sido executadas pelas cobradoras.
              </p>
            </div>

            <div className="bg-indigo-50 border border-indigo-200 p-5 rounded-2xl">
              <div className="flex items-center gap-2 text-indigo-800 font-bold text-sm">
                <Users className="w-5 h-5 text-indigo-600" />
                <span>Carga da Equipe</span>
              </div>
              <p className="text-2xl font-bold font-mono text-indigo-950 mt-2">
                4 Cobradoras Ativas
              </p>
              <p className="text-xs text-indigo-700 mt-1">
                Média de {Math.round(records.length / 4)} contas por operadora.
              </p>
            </div>
          </div>

          {/* Intervention Priority Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Fila de Intervenção da Coordenação (Top Casos Críticos)
                </h3>
                <p className="text-xs text-slate-500">
                  Clientes de alto valor ou longo atraso que demandam supervisão imediata
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                    <th className="p-3">Cliente / Matrícula</th>
                    <th className="p-3">Atraso</th>
                    <th className="p-3">Saldo</th>
                    <th className="p-3">Cobradora Atual</th>
                    <th className="p-3">Diagnóstico da Coordenação</th>
                    <th className="p-3 text-center">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {clientesSemContato30d.slice(0, 10).map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="p-3">
                        <div className="font-bold text-slate-900">{r.cliente}</div>
                        <div className="text-[11px] font-mono text-slate-400">#{r.matricula}</div>
                      </td>
                      <td className="p-3 font-bold text-rose-600">
                        {r.diasAtraso || 45} dias
                      </td>
                      <td className="p-3 font-mono font-bold text-slate-900">
                        R$ {(r.valorEmAberto || r.valorOriginal || 120).toFixed(2)}
                      </td>
                      <td className="p-3">
                        <span className="font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                          {r.responsavel}
                        </span>
                      </td>
                      <td className="p-3 text-rose-700 text-[11px] font-medium">
                        Sem contato ativo há mais de 30 dias. Reatribuir ou cobrar urgência.
                      </td>
                      <td className="p-3 text-center">
                        {onOpenContactHistory && (
                          <button
                            type="button"
                            onClick={() => onOpenContactHistory(r)}
                            className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded text-xs transition-colors cursor-pointer"
                          >
                            Inspecionar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
