import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  X, 
  AlertTriangle, 
  CheckCircle2, 
  TrendingDown, 
  TrendingUp, 
  Send, 
  Copy, 
  RefreshCw,
  Layers,
  ArrowRight,
  ShieldAlert,
  Percent
} from 'lucide-react';
import { DebtRecord, RiskScoreResult } from '../types';
import { calculateDaysOverdue } from '../utils/sheetParser';

interface GeminiRiskScoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedClient: DebtRecord | null;
  allRecords: DebtRecord[];
  onApplyScores: (scores: Record<string, RiskScoreResult>) => void;
  onSendWhatsApp: (record: DebtRecord, customMsg?: string) => void;
}

export const GeminiRiskScoreModal: React.FC<GeminiRiskScoreModalProps> = ({
  isOpen,
  onClose,
  selectedClient,
  allRecords,
  onApplyScores,
  onSendWhatsApp,
}) => {
  const [analysisMode, setAnalysisMode] = useState<'single' | 'batch'>(selectedClient ? 'single' : 'batch');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<RiskScoreResult[]>([]);
  const [activeResultIndex, setActiveResultIndex] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [sourceNote, setSourceNote] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Sync mode if selectedClient changes
  useEffect(() => {
    if (selectedClient) {
      setAnalysisMode('single');
      // If already has score, pre-populate
      if (selectedClient.scoreRisco) {
        setResults([selectedClient.scoreRisco]);
        setActiveResultIndex(0);
      } else {
        // Auto analyze single client
        runAnalysis([selectedClient]);
      }
    } else {
      setAnalysisMode('batch');
    }
  }, [selectedClient, isOpen]);

  if (!isOpen) return null;

  async function runAnalysis(targetClients: DebtRecord[]) {
    setIsAnalyzing(true);
    setErrorMsg(null);

    const payloadClients = targetClients.map(c => ({
      id: c.id,
      matricula: c.matricula,
      cliente: c.cliente,
      responsavel: c.responsavel,
      primeiroMesAtraso: c.primeiroMesAtraso,
      diaVencimento: c.diaVencimento,
      diasAtraso: calculateDaysOverdue(c.primeiroMesAtraso, c.diaVencimento),
      informacao: c.informacao,
      valorOriginal: c.valorOriginal || 120,
      valorAcordo: c.valorAcordo,
      status: c.status,
    }));

    try {
      const response = await fetch('/api/gemini/analyze-risk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ clients: payloadClients }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro na comunicação com a API de IA.');
      }

      if (data.results && Array.isArray(data.results)) {
        setResults(data.results);
        setActiveResultIndex(0);
        setSourceNote(data.note || (data.source === 'gemini-3.8-flash' ? 'Análise gerada pelo modelo Gemini 3.8 Flash' : null));
      }
    } catch (err: any) {
      console.error('Error running risk score analysis:', err);
      setErrorMsg(err.message || 'Não foi possível completar a análise de risco.');
    } finally {
      setIsAnalyzing(false);
    }
  }

  // Handle batch run for top priority / overdue
  const handleRunBatchTop15 = () => {
    const topOverdue = [...allRecords]
      .filter(r => r.status !== 'pago')
      .sort((a, b) => calculateDaysOverdue(b.primeiroMesAtraso, b.diaVencimento) - calculateDaysOverdue(a.primeiroMesAtraso, a.diaVencimento))
      .slice(0, 15);

    setAnalysisMode('batch');
    runAnalysis(topOverdue);
  };

  const handleApplyAll = () => {
    const map: Record<string, RiskScoreResult> = {};
    results.forEach(res => {
      map[res.id] = res;
    });
    onApplyScores(map);
    onClose();
  };

  const currentResult = results[activeResultIndex] || null;
  const currentRecord = currentResult ? allRecords.find(r => r.id === currentResult.id) : null;

  const getRiskColor = (nivel: string) => {
    switch (nivel) {
      case 'CRÍTICO':
        return { badge: 'bg-rose-100 text-rose-800 border-rose-300', text: 'text-rose-700', bar: 'bg-rose-600' };
      case 'ALTO':
        return { badge: 'bg-orange-100 text-orange-800 border-orange-300', text: 'text-orange-700', bar: 'bg-orange-500' };
      case 'MÉDIO':
        return { badge: 'bg-amber-100 text-amber-800 border-amber-300', text: 'text-amber-700', bar: 'bg-amber-500' };
      default:
        return { badge: 'bg-emerald-100 text-emerald-800 border-emerald-300', text: 'text-emerald-700', bar: 'bg-emerald-600' };
    }
  };

  const copyStrategy = () => {
    if (currentResult) {
      navigator.clipboard.writeText(currentResult.estrategiaSugerida);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden my-6">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/30 border border-indigo-400/40 flex items-center justify-center text-amber-300 shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold">
                  Score de Risco & Análise Preditiva de Cobrança
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  Gemini AI
                </span>
              </div>
              <p className="text-xs text-indigo-200 mt-0.5">
                Classificação preditiva do risco de inadimplência e probabilidade de recuperação
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-indigo-200 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sub-header controls */}
        <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (selectedClient) {
                  setAnalysisMode('single');
                  runAnalysis([selectedClient]);
                }
              }}
              disabled={!selectedClient}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                analysisMode === 'single'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 disabled:opacity-50'
              }`}
            >
              Cliente Atual {selectedClient ? `(${selectedClient.cliente.split(' ')[0]})` : ''}
            </button>

            <button
              onClick={handleRunBatchTop15}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                analysisMode === 'batch'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              Analisar Lote Prioritário (Top 15 mais atrasados)
            </button>
          </div>

          {sourceNote && (
            <span className="text-[11px] text-indigo-600 font-medium bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
              {sourceNote}
            </span>
          )}
        </div>

        {/* Main Content Area */}
        <div className="p-6 space-y-5">
          
          {/* Loading state */}
          {isAnalyzing && (
            <div className="py-12 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
              <p className="text-sm font-bold text-slate-800">
                O Gemini está analisando os registros de inadimplência...
              </p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Cruzando histórico de contato, tempo de atraso, dias de vencimento e probabilidade estatística de recuperação.
              </p>
            </div>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold">Falha na análise</strong>
                <span>{errorMsg}</span>
              </div>
            </div>
          )}

          {/* If we have results */}
          {!isAnalyzing && currentResult && (
            <div className="space-y-5">
              
              {/* Batch list switcher if multiple */}
              {results.length > 1 && (
                <div>
                  <label className="text-[11px] font-bold uppercase text-slate-500 block mb-1.5">
                    Clientes Analisados ({results.length}):
                  </label>
                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                    {results.map((item, idx) => {
                      const colors = getRiskColor(item.nivelRisco);
                      const isSel = idx === activeResultIndex;

                      return (
                        <button
                          key={`${item.id}-${idx}`}
                          onClick={() => setActiveResultIndex(idx)}
                          className={`px-3 py-2 rounded-xl text-left border transition-all shrink-0 min-w-[170px] ${
                            isSel 
                              ? 'bg-indigo-50/70 border-indigo-500 shadow-2xs' 
                              : 'bg-white border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="font-mono text-[10px] text-slate-500 font-semibold">{item.matricula}</span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${colors.badge}`}>
                              {item.nivelRisco}
                            </span>
                          </div>
                          <p className="text-xs font-bold text-slate-900 truncate" title={item.cliente}>
                            {item.cliente}
                          </p>
                          <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500">
                            <span>Score: <strong>{item.score}/100</strong></span>
                            <span>Recup: <strong className="text-emerald-700">{item.percentualRecuperacao}%</strong></span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Detailed Card for Active Client */}
              {(() => {
                const colors = getRiskColor(currentResult.nivelRisco);
                return (
                  <div className="bg-slate-50/70 rounded-xl border border-slate-200 p-5 space-y-4">
                    
                    {/* Client header & gauges */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                            {currentResult.matricula}
                          </span>
                          <h4 className="text-base font-extrabold text-slate-900">
                            {currentResult.cliente}
                          </h4>
                        </div>
                        {currentRecord && (
                          <p className="text-xs text-slate-500 mt-1">
                            Responsável: <strong>{currentRecord.responsavel}</strong> • Vencimento: <strong>Dia {currentRecord.diaVencimento}</strong> ({currentRecord.primeiroMesAtraso}) • Atraso: <strong className="text-rose-600">{calculateDaysOverdue(currentRecord.primeiroMesAtraso, currentRecord.diaVencimento)} dias</strong>
                          </p>
                        )}
                      </div>

                      {/* Score badges */}
                      <div className="flex items-center gap-3 shrink-0">
                        {/* Score gauge box */}
                        <div className="bg-white p-3 rounded-xl border border-slate-200 text-center min-w-[110px] shadow-2xs">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">
                            Score de Risco
                          </span>
                          <div className="flex items-baseline justify-center gap-0.5 mt-0.5">
                            <span className={`text-2xl font-black ${colors.text}`}>
                              {currentResult.score}
                            </span>
                            <span className="text-xs text-slate-400 font-semibold">/100</span>
                          </div>
                          <span className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${colors.badge}`}>
                            {currentResult.nivelRisco}
                          </span>
                        </div>

                        {/* Recovery Probability box */}
                        <div className="bg-white p-3 rounded-xl border border-slate-200 text-center min-w-[125px] shadow-2xs">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">
                            Probabilidade
                          </span>
                          <div className="flex items-baseline justify-center gap-0.5 mt-0.5">
                            <span className="text-2xl font-black text-emerald-700">
                              {currentResult.percentualRecuperacao}%
                            </span>
                          </div>
                          <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                            Recuperação {currentResult.probabilidadeRecuperacao}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Visual Risk Gauge Meter */}
                    <div>
                      <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                        <span className="text-slate-600">Nível de Risco de Perda:</span>
                        <span className={`font-bold ${colors.text}`}>
                          {currentResult.nivelRisco} ({currentResult.score}% de probabilidade de default)
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden flex">
                        <div 
                          className={`${colors.bar} h-full transition-all duration-500`}
                          style={{ width: `${currentResult.score}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                        <span>0 (Excelente)</span>
                        <span>50 (Moderado)</span>
                        <span>100 (Crítico / Perda)</span>
                      </div>
                    </div>

                    {/* AI Recommended Strategy */}
                    <div className="bg-indigo-50/70 p-4 rounded-xl border border-indigo-200/80 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                          Estratégia Recomendada pela IA:
                        </span>
                        <button
                          onClick={copyStrategy}
                          className="text-[11px] font-semibold text-indigo-700 hover:text-indigo-900 flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-indigo-200 shadow-2xs"
                        >
                          <Copy className="w-3 h-3" />
                          <span>{copied ? 'Copiado!' : 'Copiar'}</span>
                        </button>
                      </div>
                      <p className="text-xs font-medium text-indigo-950 leading-relaxed">
                        {currentResult.estrategiaSugerida}
                      </p>
                    </div>

                    {/* AI Reasoning */}
                    <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-xs space-y-1">
                      <span className="font-bold text-slate-700 block">
                        Justificativa Analítica:
                      </span>
                      <p className="text-slate-600 leading-relaxed">
                        {currentResult.justificativa}
                      </p>
                    </div>

                    {/* Quick action bar for this client */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                      <span className="text-[11px] text-slate-400">
                        Análise realizada em: {currentResult.dataAnalise}
                      </span>

                      <div className="flex items-center gap-2">
                        {currentRecord && (
                          <button
                            onClick={() => {
                              onSendWhatsApp(currentRecord, currentResult.estrategiaSugerida);
                              onClose();
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition-colors"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>Cobrar via WhatsApp com IA</span>
                          </button>
                        )}
                      </div>
                    </div>

                  </div>
                );
              })()}

            </div>
          )}

          {/* Empty state if not analyzing and no results */}
          {!isAnalyzing && results.length === 0 && !errorMsg && (
            <div className="py-8 text-center space-y-2">
              <Sparkles className="w-8 h-8 text-indigo-400 mx-auto" />
              <p className="text-sm font-semibold text-slate-700">
                Nenhuma análise executada ainda.
              </p>
              <p className="text-xs text-slate-500">
                Clique nos botões superiores para rodar o modelo preditivo Gemini.
              </p>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="bg-slate-100 px-6 py-4 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-200 transition-colors"
          >
            Fechar
          </button>

          {results.length > 0 && (
            <button
              onClick={handleApplyAll}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Salvar Score(s) na Planilha ({results.length})</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
