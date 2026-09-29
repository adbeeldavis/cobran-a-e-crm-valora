import React, { useState, useMemo, useRef } from 'react';
import {
  X,
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertTriangle,
  Users,
  Search,
  Check,
  HelpCircle,
  FileText,
  Trash2,
  Layers,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { DebtRecord } from '../types';
import { parseBulkClientsCsv, downloadCsvTemplate } from '../utils/bulkCsvParser';

interface BulkAddClientsCsvModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingRecords: DebtRecord[];
  onBulkAddSuccess: (
    newRecords: DebtRecord[],
    mode: 'merge' | 'append_only_new' | 'replace',
    summaryMessage: string
  ) => void;
}

export const BulkAddClientsCsvModal: React.FC<BulkAddClientsCsvModalProps> = ({
  isOpen,
  onClose,
  existingRecords,
  onBulkAddSuccess,
}) => {
  const [inputMode, setInputMode] = useState<'upload' | 'paste'>('upload');
  const [csvText, setCsvText] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Default configuration
  const [defaultResponsavel, setDefaultResponsavel] = useState('ROSANA');
  const [defaultAba, setDefaultAba] = useState('Lote CSV Clientes');
  const [defaultVencimento, setDefaultVencimento] = useState(20);
  const [defaultMesAtraso, setDefaultMesAtraso] = useState('09/26');
  
  // Insertion Strategy
  const [insertionStrategy, setInsertionStrategy] = useState<'merge' | 'append_only_new' | 'replace'>('merge');

  // Preview and search inside preview
  const [previewFilter, setPreviewFilter] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Parse result memoized
  const parseResult = useMemo(() => {
    if (!csvText.trim()) {
      return null;
    }
    try {
      const res = parseBulkClientsCsv(csvText, {
        defaultResponsavel,
        defaultAba,
        defaultVencimento,
        defaultMesAtraso,
      });
      return res;
    } catch (e: any) {
      return { records: [], totalParsed: 0, errors: [e?.message || 'Falha ao processar CSV'], headersDetected: [] };
    }
  }, [csvText, defaultResponsavel, defaultAba, defaultVencimento, defaultMesAtraso]);

  // Existing records map for duplicate checking
  const existingMatriculasMap = useMemo(() => {
    const map = new Map<string, DebtRecord>();
    existingRecords.forEach(r => {
      const mat = (r.matricula || '').trim().toLowerCase();
      if (mat) map.set(mat, r);
    });
    return map;
  }, [existingRecords]);

  // Analyze preview records
  const stats = useMemo(() => {
    if (!parseResult || parseResult.records.length === 0) {
      return { total: 0, alreadyExisting: 0, strictlyNew: 0 };
    }
    let alreadyExisting = 0;
    parseResult.records.forEach(r => {
      const mat = (r.matricula || '').trim().toLowerCase();
      if (existingMatriculasMap.has(mat)) {
        alreadyExisting++;
      }
    });
    return {
      total: parseResult.records.length,
      alreadyExisting,
      strictlyNew: parseResult.records.length - alreadyExisting,
    };
  }, [parseResult, existingMatriculasMap]);

  // Filtered preview list
  const filteredPreview = useMemo(() => {
    if (!parseResult || !parseResult.records) return [];
    if (!previewFilter.trim()) return parseResult.records.slice(0, 100);
    const q = previewFilter.toLowerCase();
    return parseResult.records
      .filter(r => 
        (r.cliente || '').toLowerCase().includes(q) || 
        (r.matricula || '').toLowerCase().includes(q) ||
        (r.telefone || '').includes(q) ||
        (r.responsavel || '').toLowerCase().includes(q) ||
        (r.status || '').toLowerCase().includes(q)
      )
      .slice(0, 100);
  }, [parseResult, previewFilter]);

  if (!isOpen) return null;

  // Handle file reading
  const processFile = (file: File) => {
    if (!file) return;
    setUploadedFileName(file.name);
    setErrorMessage(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (!content || !content.trim()) {
        setErrorMessage('O arquivo carregado está em branco.');
        return;
      }
      setCsvText(content);
    };
    reader.onerror = () => {
      setErrorMessage('Erro ao ler o arquivo selecionado.');
    };
    reader.readAsText(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleClear = () => {
    setCsvText('');
    setUploadedFileName(null);
    setErrorMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleLoadSample = () => {
    const sample = [
      'matricula;cliente;telefone;dia_vencimento;mes_atraso;valor;responsavel;status;informacao',
      '20101;MARIA DO CARMO SILVA;(31) 98765-1122;20;09/26;135,00;ROSANA;pendente;Primeiro contato de cobrança',
      '20102;CARLOS ALBERTO DIAS;(31) 99123-8877;10;08/26;190,00;ANA LUIZA;em_negociacao;Acordou retorno no dia 20',
      '20103;FERNANDO SANTOS LIMA;(31) 98444-2233;15;07/26;120,00;KEYLLA;acordo_fechado;Parcelamento em 2x aceito',
      '20104;JULIANA PEREIRA ROCHA;(31) 99876-5544;20;09/26;140,00;ROSANA;boleto_gerado;Boleto enviado pelo WhatsApp',
      '20105;PAULO ROBERTO MOREIRA;(31) 99321-7788;10;01/25;210,00;FABIOLA;critico;Atraso com mais de 180 dias'
    ].join('\n');
    setCsvText(sample);
    setUploadedFileName('exemplo_clientes_teste.csv');
    setErrorMessage(null);
  };

  const handleConfirmAdd = () => {
    if (!parseResult || parseResult.records.length === 0) {
      setErrorMessage('Nenhum cliente válido foi identificado na planilha CSV.');
      return;
    }

    let recordsToPass = parseResult.records;
    let summaryMsg = '';

    if (insertionStrategy === 'append_only_new') {
      recordsToPass = parseResult.records.filter(
        r => !existingMatriculasMap.has((r.matricula || '').trim().toLowerCase())
      );
      summaryMsg = `${recordsToPass.length} novos clientes adicionados em massa com sucesso via CSV!`;
    } else if (insertionStrategy === 'merge') {
      summaryMsg = `${recordsToPass.length} clientes processados em massa via CSV (${stats.strictlyNew} novos e ${stats.alreadyExisting} atualizados).`;
    } else {
      summaryMsg = `Base de dados substituída com sucesso por ${recordsToPass.length} clientes da planilha CSV.`;
    }

    onBulkAddSuccess(recordsToPass, insertionStrategy, summaryMsg);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div 
        id="bulk-add-clients-csv-modal"
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in-95 my-6 flex flex-col max-h-[92vh]"
      >
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-800 text-white flex items-center justify-center shadow-xs">
              <Users className="w-5 h-5 text-indigo-100" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  Adição de Clientes em Massa via Planilha CSV
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                  Importação Rápida
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Cadastre dezenas ou centenas de inadimplentes de uma vez carregando um arquivo .CSV ou colando dados
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
            title="Fechar janela"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1 text-slate-800 text-xs">
          
          {/* Top Quick Guide & Download Template */}
          <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-indigo-950">
                  Formato flexível aceito: vírgula (,), ponto-e-vírgula (;) ou colunas copiadas do Excel
                </p>
                <p className="text-[11px] text-indigo-800/80 mt-0.5">
                  Colunas reconhecidas: <strong>matrícula</strong>, <strong>cliente</strong>, <strong>telefone</strong>, <strong>vencimento</strong>, <strong>mês de atraso</strong>, <strong>valor</strong>, <strong>cobradora</strong> e <strong>status</strong>.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
              <button
                type="button"
                id="btn-download-csv-template"
                onClick={downloadCsvTemplate}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-indigo-300 hover:bg-indigo-100 text-indigo-900 font-semibold shadow-2xs transition-colors"
                title="Baixar planilha modelo com colunas preenchidas"
              >
                <Download className="w-3.5 h-3.5 text-indigo-600" />
                <span>Baixar Modelo CSV</span>
              </button>
              <button
                type="button"
                onClick={handleLoadSample}
                className="px-2.5 py-1.5 rounded-lg text-indigo-700 hover:text-indigo-900 hover:bg-indigo-100/70 font-medium transition-colors"
                title="Testar com dados de exemplo"
              >
                Carregar Exemplo
              </button>
            </div>
          </div>

          {/* Mode Switcher */}
          <div className="flex border-b border-slate-200 gap-4">
            <button
              type="button"
              onClick={() => setInputMode('upload')}
              className={`pb-2.5 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
                inputMode === 'upload'
                  ? 'border-indigo-600 text-indigo-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Carregar Arquivo CSV (.csv, .txt, .tsv)</span>
            </button>
            <button
              type="button"
              onClick={() => setInputMode('paste')}
              className={`pb-2.5 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
                inputMode === 'paste'
                  ? 'border-indigo-600 text-indigo-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Colar Texto ou Tabela Copiada</span>
            </button>
          </div>

          {/* Input Method 1: Upload */}
          {inputMode === 'upload' && (
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-6 text-center transition-all ${
                dragActive
                  ? 'border-indigo-500 bg-indigo-50/60 scale-[0.99]'
                  : 'border-slate-300 hover:border-indigo-400 bg-slate-50/50'
              }`}
            >
              <Upload className="w-8 h-8 text-indigo-500 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-800">
                {uploadedFileName ? (
                  <span className="text-indigo-700">Arquivo carregado: {uploadedFileName}</span>
                ) : (
                  'Arraste e solte seu arquivo CSV aqui, ou clique para selecionar'
                )}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Suporta planilhas CSV exportadas do Excel, Google Sheets, ERP ou CRM
              </p>
              
              <div className="mt-4 flex items-center justify-center gap-3">
                <input
                  ref={fileInputRef}
                  id="csv-file-input"
                  type="file"
                  accept=".csv,.txt,.tsv"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
                <label
                  htmlFor="csv-file-input"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-xs cursor-pointer transition-colors"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Selecionar Arquivo .CSV</span>
                </label>

                {csvText && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 rounded-lg transition-colors font-medium"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Limpar</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Input Method 2: Paste */}
          {inputMode === 'paste' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700">
                  Cole o conteúdo da planilha CSV ou linhas copiadas:
                </label>
                {csvText && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="text-xs text-rose-600 hover:underline flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Limpar texto</span>
                  </button>
                )}
              </div>
              <textarea
                rows={5}
                value={csvText}
                onChange={(e) => {
                  setCsvText(e.target.value);
                  setUploadedFileName(null);
                  setErrorMessage(null);
                }}
                placeholder="Exemplo de colagem direta:&#10;matricula;cliente;telefone;dia_vencimento;mes_atraso;valor;responsavel&#10;19201;MARIA DAS GRACAS;(31) 98765-4321;20;09/26;120,00;ROSANA&#10;19202;JOSE CARLOS PEREIRA;(31) 99123-4567;10;08/26;150,00;ANA LUIZA"
                className="w-full font-mono text-[11px] p-3 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>
          )}

          {/* Configuration for defaults when CSV does not specify them */}
          <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-4 space-y-3">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-slate-500" />
              <span>Configurações Padrão de Importação</span>
            </h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Cobradora Padrão:
                </label>
                <select
                  value={defaultResponsavel}
                  onChange={(e) => setDefaultResponsavel(e.target.value)}
                  className="w-full py-1.5 px-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-medium"
                >
                  <option value="ROSANA">Rosana</option>
                  <option value="ANA LUIZA">Ana Luiza</option>
                  <option value="KEYLLA">Keylla</option>
                  <option value="FABIOLA">Fabíola</option>
                  <option value="GERAL">Geral</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Identificação do Lote / Aba:
                </label>
                <input
                  type="text"
                  value={defaultAba}
                  onChange={(e) => setDefaultAba(e.target.value)}
                  placeholder="Ex: Lote CSV Setembro"
                  className="w-full py-1.5 px-2.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Vencimento Padrão:
                </label>
                <select
                  value={defaultVencimento}
                  onChange={(e) => setDefaultVencimento(Number(e.target.value))}
                  className="w-full py-1.5 px-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-medium"
                >
                  <option value={10}>Dia 10</option>
                  <option value={15}>Dia 15</option>
                  <option value={20}>Dia 20</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Mês de Atraso Padrão:
                </label>
                <input
                  type="text"
                  value={defaultMesAtraso}
                  onChange={(e) => setDefaultMesAtraso(e.target.value)}
                  placeholder="09/26"
                  className="w-full py-1.5 px-2.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>
            </div>

            {/* Insertion Strategy */}
            <div className="pt-2 border-t border-slate-200">
              <label className="text-[11px] font-semibold text-slate-700 block mb-1.5">
                Regra de Inclusão e Duplicados:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <label className={`flex items-start gap-2 p-2 rounded-lg border cursor-pointer transition-all ${
                  insertionStrategy === 'merge' ? 'bg-indigo-50 border-indigo-300' : 'bg-white border-slate-200 hover:bg-slate-50'
                }`}>
                  <input
                    type="radio"
                    name="insertionStrategy"
                    value="merge"
                    checked={insertionStrategy === 'merge'}
                    onChange={() => setInsertionStrategy('merge')}
                    className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div>
                    <span className="font-semibold block text-slate-900">Mesclar e Atualizar (Recomendado)</span>
                    <span className="text-[10px] text-slate-500">Adiciona clientes novos e atualiza dados se a matrícula já existir.</span>
                  </div>
                </label>

                <label className={`flex items-start gap-2 p-2 rounded-lg border cursor-pointer transition-all ${
                  insertionStrategy === 'append_only_new' ? 'bg-indigo-50 border-indigo-300' : 'bg-white border-slate-200 hover:bg-slate-50'
                }`}>
                  <input
                    type="radio"
                    name="insertionStrategy"
                    value="append_only_new"
                    checked={insertionStrategy === 'append_only_new'}
                    onChange={() => setInsertionStrategy('append_only_new')}
                    className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div>
                    <span className="font-semibold block text-slate-900">Apenas Novos Clientes</span>
                    <span className="text-[10px] text-slate-500">Ignora matrículas que já estão cadastradas na central.</span>
                  </div>
                </label>

                <label className={`flex items-start gap-2 p-2 rounded-lg border cursor-pointer transition-all ${
                  insertionStrategy === 'replace' ? 'bg-rose-50 border-rose-300' : 'bg-white border-slate-200 hover:bg-slate-50'
                }`}>
                  <input
                    type="radio"
                    name="insertionStrategy"
                    value="replace"
                    checked={insertionStrategy === 'replace'}
                    onChange={() => setInsertionStrategy('replace')}
                    className="mt-0.5 text-rose-600 focus:ring-rose-500"
                  />
                  <div>
                    <span className="font-semibold block text-rose-900">Substituir Base Completa</span>
                    <span className="text-[10px] text-rose-700">Substitui todos os clientes da central por este lote CSV.</span>
                  </div>
                </label>
              </div>
            </div>

          </div>

          {/* Error message */}
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-800 font-medium">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Preview Section */}
          {parseResult && parseResult.records.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-900">
                    Pré-visualização dos Clientes Identificados
                  </span>
                  <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-bold text-xs border border-emerald-200">
                    {stats.total} {stats.total === 1 ? 'cliente detectado' : 'clientes detectados'}
                  </span>
                  {stats.alreadyExisting > 0 && (
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full font-medium text-[11px] border border-amber-200">
                      {stats.alreadyExisting} já cadastrado(s)
                    </span>
                  )}
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={previewFilter}
                    onChange={(e) => setPreviewFilter(e.target.value)}
                    placeholder="Buscar no preview..."
                    className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Preview Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-56 overflow-y-auto bg-white shadow-2xs">
                <table className="w-full text-left text-[11px] border-collapse">
                  <thead className="bg-slate-100 text-slate-700 font-semibold sticky top-0 border-b border-slate-200">
                    <tr>
                      <th className="p-2 w-20">Matrícula</th>
                      <th className="p-2">Cliente</th>
                      <th className="p-2">Telefone</th>
                      <th className="p-2 text-center w-16">Venc.</th>
                      <th className="p-2 text-center w-16">Atraso</th>
                      <th className="p-2 w-24">Cobradora</th>
                      <th className="p-2 text-right w-20">Valor</th>
                      <th className="p-2 w-24">Status</th>
                      <th className="p-2">Observações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredPreview.map((rec, idx) => {
                      const isExisting = existingMatriculasMap.has((rec.matricula || '').trim().toLowerCase());
                      return (
                        <tr key={`${rec.id}-${idx}`} className={`hover:bg-slate-50/80 ${isExisting ? 'bg-amber-50/30' : ''}`}>
                          <td className="p-2 font-mono font-semibold text-slate-700 flex items-center gap-1">
                            <span>{rec.matricula}</span>
                            {isExisting && (
                              <span className="text-[9px] px-1 bg-amber-100 text-amber-800 rounded font-medium" title="Já existe na base atual">
                                Existente
                              </span>
                            )}
                          </td>
                          <td className="p-2 font-medium text-slate-900">{rec.cliente}</td>
                          <td className="p-2 text-slate-600">{rec.telefone || '-'}</td>
                          <td className="p-2 text-center text-slate-600">Dia {rec.diaVencimento}</td>
                          <td className="p-2 text-center font-mono text-slate-600">{rec.primeiroMesAtraso}</td>
                          <td className="p-2 text-slate-700 font-medium">{rec.responsavel}</td>
                          <td className="p-2 text-right font-medium text-slate-900">
                            R$ {(rec.valorOriginal || 120).toFixed(2).replace('.', ',')}
                          </td>
                          <td className="p-2">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                              rec.status === 'acordo_fechado' ? 'bg-emerald-100 text-emerald-800' :
                              rec.status === 'em_negociacao' ? 'bg-amber-100 text-amber-800' :
                              rec.status === 'boleto_gerado' ? 'bg-blue-100 text-blue-800' :
                              rec.status === 'sem_contato' ? 'bg-slate-200 text-slate-700' :
                              'bg-rose-50 text-rose-700'
                            }`}>
                              {rec.status}
                            </span>
                          </td>
                          <td className="p-2 text-slate-500 max-w-[150px] truncate" title={rec.informacao}>
                            {rec.informacao || '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="text-[10px] text-slate-400 text-right">
                Mostrando até 100 registros na pré-visualização. Todos os {stats.total} serão adicionados ao confirmar.
              </p>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-600">
            {stats.total > 0 ? (
              <span>
                Pronto para cadastrar <strong>{stats.total}</strong> clientes em massa
                {stats.alreadyExisting > 0 && ` (${stats.alreadyExisting} existentes)`}
              </span>
            ) : (
              <span>Nenhum cliente carregado ainda.</span>
            )}
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              id="btn-confirm-bulk-csv-add"
              onClick={handleConfirmAdd}
              disabled={!parseResult || parseResult.records.length === 0}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:pointer-events-none rounded-lg shadow-sm transition-all"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                Cadastrar {stats.total > 0 ? stats.total : ''} Clientes em Massa
              </span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
