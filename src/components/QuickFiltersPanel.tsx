import React, { useMemo } from 'react';
import {
  Calendar,
  UserCheck,
  Handshake,
  AlertTriangle,
  Clock,
  Zap,
  RotateCcw,
  Sparkles,
  Layers,
  CheckCircle2
} from 'lucide-react';
import { DebtRecord, AppUser } from '../types';
import { calculateDaysOverdue } from '../utils/sheetParser';
import { parseReturnDateStatus } from '../utils/dateUtils';

export type QuickFilterPreset = 
  | 'todos'
  | 'vencendo_hoje'
  | 'minha_carteira'
  | 'acordos_ativos'
  | 'pendencia_retorno'
  | 'criticos';

interface QuickFiltersPanelProps {
  activePreset: QuickFilterPreset;
  onSelectPreset: (preset: QuickFilterPreset) => void;
  records: DebtRecord[];
  currentUser: AppUser;
  onResetAll?: () => void;
}

export const QuickFiltersPanel: React.FC<QuickFiltersPanelProps> = ({
  activePreset,
  onSelectPreset,
  records,
  currentUser,
  onResetAll
}) => {
  const currentDay = new Date().getDate();
  const userResp = (currentUser.responsavelAssociado || currentUser.nome || '').toUpperCase().trim();

  // Calculate live counts for each preset
  const counts = useMemo(() => {
    let vencendoHoje = 0;
    let minhaCarteira = 0;
    let acordosAtivos = 0;
    let pendenciaRetorno = 0;
    let retornoAtrasado = 0;
    let criticos = 0;

    records.forEach(r => {
      const isPaid = r.status === 'pago' || r.status === 'recuperado';

      // 1. Vencendo hoje
      if (Number(r.diaVencimento) === currentDay && !isPaid) {
        vencendoHoje++;
      }

      // 2. Minha carteira
      const recResp = (r.responsavel || '').toUpperCase().trim();
      if (userResp && (recResp === userResp || recResp.includes(userResp))) {
        minhaCarteira++;
      }

      // 3. Acordos ativos
      if (r.status === 'acordo_fechado' || r.status === 'em_negociacao' || r.status === 'boleto_gerado') {
        acordosAtivos++;
      }

      // 4. Pendência de retorno
      if (r.dataRetorno && r.dataRetorno.trim() && !isPaid) {
        pendenciaRetorno++;
        const status = parseReturnDateStatus(r.dataRetorno);
        if (status.isPast) {
          retornoAtrasado++;
        }
      }

      // 5. Casos críticos (> 45 dias)
      const days = calculateDaysOverdue(r.primeiroMesAtraso || '', r.diaVencimento);
      if (days > 45 && !isPaid) {
        criticos++;
      }
    });

    return {
      total: records.length,
      vencendoHoje,
      minhaCarteira,
      acordosAtivos,
      pendenciaRetorno,
      retornoAtrasado,
      criticos
    };
  }, [records, currentDay, userResp]);

  const presets = [
    {
      id: 'todos' as QuickFilterPreset,
      label: 'Todos os Clientes',
      shortLabel: 'Todos',
      count: counts.total,
      icon: Layers,
      color: 'slate',
      badgeColor: 'bg-slate-200 text-slate-800',
      activeClass: 'bg-slate-900 text-white shadow-sm border-slate-900',
      inactiveClass: 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200',
      description: 'Visualização completa da base sem restrição de filtros.'
    },
    {
      id: 'vencendo_hoje' as QuickFilterPreset,
      label: 'Vencendo Hoje',
      shortLabel: `Vence Hoje (Dia ${currentDay})`,
      count: counts.vencendoHoje,
      icon: Zap,
      color: 'amber',
      badgeColor: 'bg-amber-200 text-amber-950 font-black',
      activeClass: 'bg-amber-500 text-amber-950 font-black shadow-sm border-amber-600',
      inactiveClass: 'bg-amber-50/80 text-amber-900 hover:bg-amber-100 border-amber-300 font-semibold',
      description: 'Clientes cujo dia de vencimento coincide com a data de hoje para acionamento preventivo.'
    },
    {
      id: 'minha_carteira' as QuickFilterPreset,
      label: 'Minha Carteira',
      shortLabel: currentUser.role === 'adm_master' ? 'Minha Carteira' : `Carteira: ${currentUser.responsavelAssociado || currentUser.nome.split(' ')[0]}`,
      count: counts.minhaCarteira,
      icon: UserCheck,
      color: 'blue',
      badgeColor: 'bg-blue-200 text-blue-900',
      activeClass: 'bg-blue-700 text-white shadow-sm border-blue-800',
      inactiveClass: 'bg-blue-50 text-blue-900 hover:bg-blue-100 border-blue-200 font-semibold',
      description: `Clientes atribuídos diretamente a ${currentUser.responsavelAssociado || currentUser.nome}.`
    },
    {
      id: 'acordos_ativos' as QuickFilterPreset,
      label: 'Acordos Ativos',
      shortLabel: 'Acordos Ativos',
      count: counts.acordosAtivos,
      icon: Handshake,
      color: 'emerald',
      badgeColor: 'bg-emerald-200 text-emerald-950',
      activeClass: 'bg-emerald-700 text-white shadow-sm border-emerald-800',
      inactiveClass: 'bg-emerald-50 text-emerald-900 hover:bg-emerald-100 border-emerald-300 font-semibold',
      description: 'Negociações em andamento, termos firmados e boletos já emitidos.'
    },
    {
      id: 'pendencia_retorno' as QuickFilterPreset,
      label: 'Pendência de Retorno',
      shortLabel: 'Pendência de Retorno',
      count: counts.pendenciaRetorno,
      extraAlert: counts.retornoAtrasado > 0 ? `${counts.retornoAtrasado} atrasados` : undefined,
      icon: Calendar,
      color: 'rose',
      badgeColor: counts.retornoAtrasado > 0 ? 'bg-rose-500 text-white animate-pulse' : 'bg-rose-200 text-rose-900',
      activeClass: 'bg-rose-700 text-white shadow-sm border-rose-800',
      inactiveClass: 'bg-rose-50 text-rose-950 hover:bg-rose-100 border-rose-300 font-semibold',
      description: 'Clientes com data de retorno marcada na cobrança, priorizando retornos expirados.'
    },
    {
      id: 'criticos' as QuickFilterPreset,
      label: 'Críticos (>45 dias)',
      shortLabel: 'Críticos (>45d)',
      count: counts.criticos,
      icon: AlertTriangle,
      color: 'orange',
      badgeColor: 'bg-orange-200 text-orange-950',
      activeClass: 'bg-orange-600 text-white shadow-sm border-orange-700',
      inactiveClass: 'bg-orange-50 text-orange-900 hover:bg-orange-100 border-orange-300 font-semibold',
      description: 'Beneficiários com mais de 45 dias de inadimplência em aberto.'
    }
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs space-y-2.5 no-print">
      
      {/* Header do painel de filtros rápidos */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-md bg-blue-50 text-blue-700">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
              <span>Filtros Rápidos da Planilha</span>
              <span className="text-[10px] font-semibold text-slate-500 normal-case tracking-normal">
                (Acesso imediato com 1 clique)
              </span>
            </h4>
          </div>
        </div>

        {activePreset !== 'todos' && (
          <button
            type="button"
            onClick={() => {
              onSelectPreset('todos');
              if (onResetAll) onResetAll();
            }}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer self-start sm:self-auto"
            title="Remover filtro rápido e voltar à visão geral"
          >
            <RotateCcw className="w-3 h-3 text-slate-500" />
            <span>Limpar Filtro Rápido</span>
          </button>
        )}
      </div>

      {/* Barra de Botões / Pílulas Predefinidas */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {presets.map((p) => {
          const Icon = p.icon;
          const isActive = activePreset === p.id;
          return (
            <button
              key={p.id}
              type="button"
              id={`quick-filter-${p.id}`}
              onClick={() => onSelectPreset(p.id)}
              className={`px-3 py-2 rounded-xl text-xs flex items-center gap-2 transition-all shrink-0 border cursor-pointer ${
                isActive ? p.activeClass : p.inactiveClass
              }`}
              title={p.description}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : ''}`} />
              <span className="whitespace-nowrap font-bold">{p.shortLabel}</span>
              
              {/* Contador */}
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                isActive ? 'bg-white/25 text-white' : p.badgeColor
              }`}>
                {p.count}
              </span>

              {/* Tag de alerta extra para retornos atrasados */}
              {p.extraAlert && !isActive && (
                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-rose-600 text-white shadow-2xs">
                  {p.extraAlert}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Indicador de contexto do filtro ativo */}
      {activePreset !== 'todos' && (
        <div className="text-[11px] text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200/70 flex items-center justify-between gap-2 animate-in fade-in duration-150">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping"></span>
            <span>
              Exibindo visualização de <strong>{presets.find(p => p.id === activePreset)?.label}</strong>.
            </span>
            <span className="text-slate-500 hidden sm:inline">
              — {presets.find(p => p.id === activePreset)?.description}
            </span>
          </div>
          <span className="font-mono text-blue-700 font-bold shrink-0">
            {presets.find(p => p.id === activePreset)?.count} registros encontrados
          </span>
        </div>
      )}

    </div>
  );
};
