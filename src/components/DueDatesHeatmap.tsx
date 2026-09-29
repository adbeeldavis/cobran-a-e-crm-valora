import React, { useState, useMemo } from 'react';
import { 
  Flame, 
  Calendar, 
  Users, 
  AlertTriangle, 
  TrendingUp, 
  Info,
  ChevronRight,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { DebtRecord } from '../types';

interface DueDatesHeatmapProps {
  records: DebtRecord[];
  onFilterVencimento: (dia: string) => void;
}

export const DueDatesHeatmap: React.FC<DueDatesHeatmapProps> = ({
  records,
  onFilterVencimento,
}) => {
  const [selectedDay, setSelectedDay] = useState<number | null>(20);

  // Group accounts by day of month (1-31)
  const dayStats = useMemo(() => {
    const stats: Record<number, { count: number; totalValue: number; rosana: number; anaLuiza: number; keylla: number; outros: number }> = {};
    
    for (let d = 1; d <= 31; d++) {
      stats[d] = { count: 0, totalValue: 0, rosana: 0, anaLuiza: 0, keylla: 0, outros: 0 };
    }

    records.forEach(r => {
      const d = r.diaVencimento;
      if (d >= 1 && d <= 31) {
        stats[d].count += 1;
        stats[d].totalValue += (r.valorAcordo || r.valorOriginal || 120);
        if (r.responsavel === 'ROSANA') stats[d].rosana += 1;
        else if (r.responsavel === 'ANA LUIZA') stats[d].anaLuiza += 1;
        else if (r.responsavel === 'KEYLLA') stats[d].keylla += 1;
        else stats[d].outros += 1;
      }
    });

    return stats;
  }, [records]);

  // Find max count for scaling heat
  const maxCount = useMemo(() => {
    let max = 1;
    for (let d = 1; d <= 31; d++) {
      if (dayStats[d].count > max) max = dayStats[d].count;
    }
    return max;
  }, [dayStats]);

  // Identify peak days
  const peakDays = useMemo(() => {
    return Array.from({ length: 31 }, (_, i) => i + 1)
      .map(day => ({ day, ...dayStats[day] }))
      .filter(item => item.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
  }, [dayStats]);

  // Heat color helper
  const getHeatClass = (count: number) => {
    if (count === 0) {
      return 'bg-slate-50 text-slate-400 border-slate-100 hover:bg-slate-100';
    }
    const ratio = count / maxCount;
    if (ratio >= 0.8) {
      return 'bg-rose-600 text-white font-bold border-rose-700 shadow-xs hover:bg-rose-700';
    }
    if (ratio >= 0.45) {
      return 'bg-amber-500 text-white font-bold border-amber-600 shadow-xs hover:bg-amber-600';
    }
    if (ratio >= 0.2) {
      return 'bg-indigo-100 text-indigo-950 font-semibold border-indigo-200 hover:bg-indigo-200';
    }
    return 'bg-indigo-50 text-indigo-800 font-medium border-indigo-100 hover:bg-indigo-100';
  };

  const selectedData = selectedDay ? dayStats[selectedDay] : null;

  return (
    <div id="heatmap-vencimentos" className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
      
      {/* Title & Peak Indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
            <Flame className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              Mapa de Calor: Concentração de Vencimentos
            </h3>
            <p className="text-xs text-slate-500">
              Distribuição dos vencimentos ao longo dos dias do mês e identificação de picos operacionais
            </p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-2 text-[11px] text-slate-600">
          <span className="font-medium">Intensidade:</span>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-slate-100 border border-slate-200" title="Sem vencimentos" />
            <span className="w-3 h-3 rounded bg-indigo-100 border border-indigo-200" title="Baixa demanda" />
            <span className="w-3 h-3 rounded bg-indigo-300 border border-indigo-400" title="Demanda média" />
            <span className="w-3 h-3 rounded bg-amber-400 border border-amber-500" title="Alta demanda" />
            <span className="w-3 h-3 rounded bg-rose-600" title="Pico Crítico" />
          </div>
        </div>
      </div>

      {/* Heatmap 31-day Grid */}
      <div className="grid grid-cols-7 sm:grid-cols-11 md:grid-cols-16 gap-1.5 sm:gap-2">
        {Array.from({ length: 31 }, (_, i) => i + 1).map(day => {
          const data = dayStats[day];
          const isSelected = selectedDay === day;
          const heatClass = getHeatClass(data.count);

          return (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`p-2 rounded-lg border text-center transition-all flex flex-col items-center justify-center min-h-[58px] relative ${heatClass} ${
                isSelected ? 'ring-2 ring-indigo-500 ring-offset-2 scale-105 z-10' : ''
              }`}
              title={`Dia ${day}: ${data.count} devedores`}
            >
              <span className="text-[11px] block leading-none opacity-90">
                D{day}
              </span>
              <span className="text-sm sm:text-base font-extrabold mt-1 leading-none">
                {data.count}
              </span>
              {data.count > 0 && (
                <span className="text-[9px] block opacity-80 mt-0.5">
                  {data.count === 1 ? 'caso' : 'casos'}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Operational Peak Insights & Selected Day Deep Dive */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pt-2">
        
        {/* Top 3 Operational Peaks */}
        <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200/80 space-y-2 lg:col-span-1">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
            <TrendingUp className="w-4 h-4 text-rose-600" />
            <span>Picos de Demanda Operacional</span>
          </div>

          <div className="space-y-2 pt-1">
            {peakDays.map((peak, idx) => (
              <div 
                key={peak.day}
                onClick={() => setSelectedDay(peak.day)}
                className="flex items-center justify-between p-2 rounded-md bg-white border border-slate-200 hover:border-indigo-400 cursor-pointer transition-colors text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    idx === 0 ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {idx + 1}º
                  </span>
                  <span className="font-bold text-slate-900">Dia {peak.day}</span>
                  <span className="text-[10px] text-slate-500">
                    ({Math.round((peak.count / (records.length || 1)) * 100)}% da carteira)
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-extrabold text-slate-900 block">{peak.count} clientes</span>
                  <span className="text-[10px] text-emerald-700 font-medium">R$ {peak.totalValue.toFixed(0)}</span>
                </div>
              </div>
            ))}
          </div>

          <p className="text-[11px] text-slate-500 pt-1 leading-relaxed">
            ⚡ <strong>Ação recomendada:</strong> Programar disparos automáticos de WhatsApp 48 horas antes do Dia 20 para desafogar o atendimento telefônico.
          </p>
        </div>

        {/* Selected Day Breakdown */}
        <div className="bg-indigo-50/50 p-3.5 rounded-lg border border-indigo-100 lg:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-indigo-900">
                  Detalhamento Operacional: Dia {selectedDay} de cada mês
                </span>
                {selectedData && selectedData.count >= 50 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                    Pico Máximo
                  </span>
                )}
              </div>

              {selectedDay && selectedData && selectedData.count > 0 && (
                <button
                  onClick={() => onFilterVencimento(selectedDay.toString())}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 hover:text-indigo-900 bg-white px-2.5 py-1 rounded-md border border-indigo-200 shadow-2xs hover:bg-indigo-50 transition-colors"
                >
                  <span>Ver estes {selectedData.count} clientes na planilha</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>

            {selectedData && selectedData.count > 0 ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="p-2 bg-white rounded border border-indigo-100 text-center">
                    <span className="text-[10px] text-slate-500 uppercase block font-semibold">Total devedores</span>
                    <span className="text-lg font-bold text-indigo-900">{selectedData.count}</span>
                  </div>
                  <div className="p-2 bg-white rounded border border-indigo-100 text-center">
                    <span className="text-[10px] text-slate-500 uppercase block font-semibold">Volume Estimado</span>
                    <span className="text-lg font-bold text-emerald-700">R$ {selectedData.totalValue.toFixed(2)}</span>
                  </div>
                  <div className="p-2 bg-white rounded border border-indigo-100 text-center">
                    <span className="text-[10px] text-slate-500 uppercase block font-semibold">Capacidade Necessária</span>
                    <span className="text-lg font-bold text-amber-700">
                      {selectedData.count > 60 ? '3 Cobradoras' : selectedData.count > 20 ? '2 Cobradoras' : '1 Cobradora'}
                    </span>
                  </div>
                  <div className="p-2 bg-white rounded border border-indigo-100 text-center">
                    <span className="text-[10px] text-slate-500 uppercase block font-semibold">Risco de Gargalo</span>
                    <span className={`text-lg font-bold ${selectedData.count > 60 ? 'text-rose-600' : 'text-slate-700'}`}>
                      {selectedData.count > 60 ? 'Alto' : selectedData.count > 20 ? 'Médio' : 'Baixo'}
                    </span>
                  </div>
                </div>

                {/* Collector workload on this day */}
                <div className="bg-white p-2.5 rounded border border-indigo-100 text-xs">
                  <span className="font-semibold text-slate-700 block mb-1.5">
                    Divisão de Contas por Cobradora no Dia {selectedDay}:
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="flex items-center justify-between p-1.5 rounded bg-slate-50">
                      <span className="font-medium text-slate-600">Rosana:</span>
                      <span className="font-bold text-slate-900">{selectedData.rosana} clientes</span>
                    </div>
                    <div className="flex items-center justify-between p-1.5 rounded bg-slate-50">
                      <span className="font-medium text-slate-600">Ana Luiza:</span>
                      <span className="font-bold text-slate-900">{selectedData.anaLuiza} clientes</span>
                    </div>
                    <div className="flex items-center justify-between p-1.5 rounded bg-slate-50">
                      <span className="font-medium text-slate-600">Keylla:</span>
                      <span className="font-bold text-slate-900">{selectedData.keylla} clientes</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-white rounded border border-indigo-100 text-center text-xs text-slate-500">
                Nenhum título com vencimento fixado no dia {selectedDay}.
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
