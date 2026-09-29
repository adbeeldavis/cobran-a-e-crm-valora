import React, { useState, useMemo } from 'react';
import { 
  X, 
  Upload, 
  FileSpreadsheet, 
  AlertCircle, 
  CheckCircle2, 
  Layers,
  FileCheck,
  Info,
  SlidersHorizontal,
  Sparkles,
  RotateCcw,
  ArrowRight,
  Eye,
  Check
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { DebtRecord, SheetInfo } from '../types';
import { 
  ColumnMapping, 
  TARGET_FIELDS, 
  autoDetectColumnMapping, 
  applyMappingToRows, 
  getSampleValuesForColumn 
} from '../utils/columnMappingHelper';

interface ImportSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (newRecords: DebtRecord[], mode: 'replace' | 'append') => void;
}

interface RawSheetData {
  name: string;
  headers: string[];
  rows: Record<string, any>[];
}

export const ImportSheetModal: React.FC<ImportSheetModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess,
}) => {
  const [rawText, setRawText] = useState('');
  const [importMode, setImportMode] = useState<'replace' | 'append'>('append');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [activeViewMode, setActiveViewMode] = useState<'mapping' | 'sheets' | 'preview'>('mapping');
  
  // Raw parsed sheets and data
  const [rawSheets, setRawSheets] = useState<RawSheetData[]>([]);
  const [availableHeaders, setAvailableHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    cliente: '',
    matricula: '',
    telefone: '',
    cpf: '',
    email: '',
    valorOriginal: '',
    diaVencimento: '',
    primeiroMesAtraso: '',
    responsavel: '',
    informacao: '',
    status: '',
    dataRetorno: '',
  });

  // Selected sheets
  const [selectedSheetNames, setSelectedSheetNames] = useState<Set<string>>(new Set());
  const [previewActiveTab, setPreviewActiveTab] = useState<string>('todos');
  const [isProcessing, setIsProcessing] = useState(false);

  // Helper to parse CSV text into grid
  const parseCsvToRows = (csvContent: string): { headers: string[]; rows: Record<string, any>[] } => {
    const lines = csvContent.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return { headers: [], rows: [] };

    const splitLine = (line: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      const delimiter = line.includes('\t') && !line.includes(',') ? '\t' : (line.includes(';') && !line.includes(',') ? ';' : ',');

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === delimiter && !inQuotes) {
          result.push(current.trim().replace(/^"|"$/g, ''));
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim().replace(/^"|"$/g, ''));
      return result;
    };

    const headerLine = splitLine(lines[0]);
    const headers = headerLine.map((h, i) => h.trim() || `Coluna ${i + 1}`);

    const rows: Record<string, any>[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = splitLine(lines[i]);
      if (!cols.some(c => c && c.trim())) continue;
      const rowObj: Record<string, any> = {};
      headers.forEach((h, colIdx) => {
        rowObj[h] = cols[colIdx] || '';
      });
      rows.push(rowObj);
    }

    return { headers, rows };
  };

  // Set up data after parsing sheets
  const setupImportData = (parsedSheets: RawSheetData[]) => {
    if (parsedSheets.length === 0 || parsedSheets.every(s => s.rows.length === 0)) {
      setErrorMsg('Nenhum registro foi detectado no arquivo ou texto fornecido.');
      setRawSheets([]);
      setAvailableHeaders([]);
      setIsProcessing(false);
      return;
    }

    // Collect distinct column headers
    const allHeadersSet = new Set<string>();
    parsedSheets.forEach(s => s.headers.forEach(h => allHeadersSet.add(h)));
    const headers = Array.from(allHeadersSet);

    const autoMap = autoDetectColumnMapping(headers);

    setRawSheets(parsedSheets);
    setAvailableHeaders(headers);
    setColumnMapping(autoMap);
    setSelectedSheetNames(new Set(parsedSheets.filter(s => s.rows.length > 0).map(s => s.name)));
    setPreviewActiveTab('todos');
    setActiveViewMode('mapping');
    setErrorMsg(null);
    setIsProcessing(false);
  };

  // Handle pasted text
  const handleProcessText = () => {
    if (!rawText.trim()) {
      setErrorMsg('Cole o conteúdo da planilha ou CSV para processar.');
      return;
    }

    try {
      setIsProcessing(true);
      const { headers, rows } = parseCsvToRows(rawText);
      if (rows.length === 0) {
        setErrorMsg('Nenhuma linha de dados válida detectada no texto.');
        setIsProcessing(false);
        return;
      }

      const sheet: RawSheetData = {
        name: 'Dados Colados',
        headers,
        rows
      };

      setupImportData([sheet]);
    } catch (err) {
      setErrorMsg('Erro ao processar o texto colado. Verifique a formatação.');
      setIsProcessing(false);
    }
  };

  // Handle file upload (.xlsx, .xls, .csv, .ods)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setErrorMsg(null);
    setIsProcessing(true);

    const isExcel = /\.xlsx$|\.xls$|\.ods$/i.test(file.name);

    if (isExcel) {
      try {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const buffer = event.target?.result as ArrayBuffer;
            const workbook = XLSX.read(buffer, { type: 'array' });
            const sheetsData: RawSheetData[] = [];

            for (const sheetName of workbook.SheetNames) {
              const ws = workbook.Sheets[sheetName];
              if (!ws) continue;

              const rawGrid: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
              if (!rawGrid || rawGrid.length === 0) continue;

              // Detect header row
              let headerRowIndex = 0;
              for (let r = 0; r < Math.min(rawGrid.length, 10); r++) {
                const row = rawGrid[r];
                if (row && row.some(cell => typeof cell === 'string' && cell.trim().length > 0)) {
                  headerRowIndex = r;
                  break;
                }
              }

              const rawHeaders = rawGrid[headerRowIndex] || [];
              const headers = rawHeaders.map((h, i) => {
                const str = String(h ?? '').trim();
                return str ? str : `Coluna ${i + 1}`;
              });

              const rows: Record<string, any>[] = [];
              for (let r = headerRowIndex + 1; r < rawGrid.length; r++) {
                const rowArr = rawGrid[r];
                if (!rowArr || !rowArr.some(c => c !== undefined && c !== null && String(c).trim() !== '')) continue;
                const rowObj: Record<string, any> = {};
                headers.forEach((header, colIdx) => {
                  rowObj[header] = rowArr[colIdx] ?? '';
                });
                rows.push(rowObj);
              }

              sheetsData.push({
                name: sheetName,
                headers,
                rows,
              });
            }

            setupImportData(sheetsData);
          } catch (err) {
            console.error(err);
            setErrorMsg('Falha ao ler o arquivo Excel. Verifique se o arquivo não está corrompido.');
            setIsProcessing(false);
          }
        };
        reader.readAsArrayBuffer(file);
      } catch (err) {
        setErrorMsg('Erro ao carregar o arquivo Excel.');
        setIsProcessing(false);
      }
    } else {
      // CSV or text
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const content = event.target?.result as string;
          setRawText(content);
          const { headers, rows } = parseCsvToRows(content);
          setupImportData([{
            name: file.name.replace(/\.[^/.]+$/, ""),
            headers,
            rows
          }]);
        } catch (err) {
          setErrorMsg('Erro ao ler arquivo CSV.');
          setIsProcessing(false);
        }
      };
      reader.readAsText(file);
    }
  };

  // Toggle single tab selection
  const toggleSheetSelection = (name: string) => {
    setSelectedSheetNames(prev => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  // Select/deselect all tabs
  const handleSelectAllSheets = () => {
    if (selectedSheetNames.size === rawSheets.length) {
      setSelectedSheetNames(new Set());
    } else {
      setSelectedSheetNames(new Set(rawSheets.map(s => s.name)));
    }
  };

  // Re-run auto mapping heuristic
  const handleResetAutoMapping = () => {
    const autoMap = autoDetectColumnMapping(availableHeaders);
    setColumnMapping(autoMap);
  };

  // Update a single mapping target
  const handleMappingChange = (targetKey: keyof ColumnMapping, sourceCol: string) => {
    setColumnMapping(prev => ({
      ...prev,
      [targetKey]: sourceCol
    }));
  };

  // Combine rows from all sheets for sample lookup
  const allRawRowsSample = useMemo(() => {
    return rawSheets.flatMap(s => s.rows).slice(0, 20);
  }, [rawSheets]);

  // Compute processed DebtRecord results based on columnMapping and selected sheets
  const computedRecords = useMemo(() => {
    const records: DebtRecord[] = [];
    let offset = 0;

    rawSheets
      .filter(sheet => selectedSheetNames.has(sheet.name))
      .forEach(sheet => {
        const sheetRecords = applyMappingToRows(sheet.rows, columnMapping, sheet.name, offset);
        offset += sheetRecords.length;
        records.push(...sheetRecords);
      });

    return records;
  }, [rawSheets, selectedSheetNames, columnMapping]);

  // Preview records
  const previewList = useMemo(() => {
    if (previewActiveTab === 'todos') {
      return computedRecords;
    }
    const targetSheet = rawSheets.find(s => s.name === previewActiveTab);
    if (!targetSheet) return [];
    return applyMappingToRows(targetSheet.rows, columnMapping, targetSheet.name, 0);
  }, [computedRecords, previewActiveTab, rawSheets, columnMapping]);

  // Number of mapped fields
  const mappedCount = useMemo(() => {
    return Object.values(columnMapping).filter(Boolean).length;
  }, [columnMapping]);

  if (!isOpen) return null;

  const handleConfirmImport = () => {
    if (computedRecords.length === 0) {
      setErrorMsg('Nenhum registro para importar. Verifique se o nome do cliente está mapeado e se há abas selecionadas.');
      return;
    }
    onImportSuccess(computedRecords, importMode);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in-95 my-6 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  Importação com Mapeamento de Colunas
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800">
                  Multi-Abas &amp; De/Para
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Importe planilhas Excel ou CSV e mapeie dinamicamente os cabeçalhos para os dados de cobrança.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs when file is loaded */}
        {rawSheets.length > 0 && (
          <div className="flex border-b border-slate-200 bg-slate-100/70 px-6 pt-2 shrink-0">
            <button
              type="button"
              onClick={() => setActiveViewMode('mapping')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
                activeViewMode === 'mapping'
                  ? 'border-indigo-600 text-indigo-700 bg-white rounded-t-lg'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Mapeamento de Colunas ({mappedCount}/{TARGET_FIELDS.length})</span>
              {columnMapping.cliente ? (
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              )}
            </button>

            {rawSheets.length > 1 && (
              <button
                type="button"
                onClick={() => setActiveViewMode('sheets')}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
                  activeViewMode === 'sheets'
                    ? 'border-indigo-600 text-indigo-700 bg-white rounded-t-lg'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Abas da Planilha ({selectedSheetNames.size}/{rawSheets.length})</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setActiveViewMode('preview')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
                activeViewMode === 'preview'
                  ? 'border-indigo-600 text-indigo-700 bg-white rounded-t-lg'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Prévia dos Dados ({computedRecords.length})</span>
            </button>
          </div>
        )}

        {/* Body Content */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          
          {/* File Upload Area */}
          <div className="border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-xl p-4 text-center bg-slate-50/60 transition-colors">
            <Upload className="w-6 h-6 text-indigo-500 mx-auto mb-1.5" />
            <p className="text-xs font-semibold text-slate-800">
              {fileName ? `Arquivo carregado: ${fileName}` : 'Arraste ou escolha sua planilha Excel (.xlsx, .xls) ou CSV'}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Suporta qualquer formato de planilha; você poderá mapear os cabeçalhos logo abaixo
            </p>
            <label className="mt-2.5 inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs cursor-pointer transition-colors">
              <FileSpreadsheet className="w-4 h-4" />
              <span>{rawSheets.length > 0 ? 'Trocar Planilha' : 'Escolher Planilha (.xlsx, .xls, .csv)'}</span>
              <input 
                type="file" 
                accept=".xlsx,.xls,.csv,.txt,.ods" 
                onChange={handleFileUpload} 
                className="hidden" 
              />
            </label>
          </div>

          {/* Direct Paste fallback if no file is chosen yet */}
          {rawSheets.length === 0 && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Ou cole o conteúdo da tabela ou CSV aqui:
                </label>
                <button
                  onClick={handleProcessText}
                  disabled={!rawText.trim() || isProcessing}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:underline disabled:opacity-50 cursor-pointer"
                >
                  {isProcessing ? 'Processando...' : 'Carregar e Mapear Colunas'}
                </button>
              </div>
              <textarea
                rows={4}
                value={rawText}
                onChange={(e) => {
                  setRawText(e.target.value);
                  setErrorMsg(null);
                }}
                placeholder="Cole aqui linhas da planilha (incluindo linha de cabeçalho)..."
                className="w-full p-3 font-mono text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white leading-relaxed"
              />
            </div>
          )}

          {/* TAB 1: DYNAMIC COLUMN MAPPING INTERFACE */}
          {rawSheets.length > 0 && activeViewMode === 'mapping' && (
            <div className="space-y-4 animate-in fade-in">
              {/* Header and tools */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <div>
                    <h3 className="text-xs font-bold text-indigo-950">
                      Mapeamento Dinâmico de Colunas
                    </h3>
                    <p className="text-[11px] text-indigo-700">
                      Combine cada coluna da sua planilha com os campos da Valora (ex: associar &quot;Phone&quot; a &quot;Telefone&quot;).
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleResetAutoMapping}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-indigo-200 text-indigo-700 rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                  title="Reexecutar reconhecimento automático inteligente de colunas"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Auto-detectar Colunas</span>
                </button>
              </div>

              {/* Mapping Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {TARGET_FIELDS.map((field) => {
                  const currentSelectedHeader = columnMapping[field.key] || '';
                  const sampleValues = currentSelectedHeader 
                    ? getSampleValuesForColumn(allRawRowsSample, currentSelectedHeader) 
                    : [];

                  return (
                    <div 
                      key={field.key}
                      className={`p-3.5 rounded-xl border transition-all ${
                        currentSelectedHeader
                          ? 'bg-white border-slate-200 shadow-2xs'
                          : field.required
                          ? 'bg-amber-50/40 border-amber-300'
                          : 'bg-slate-50/60 border-slate-200 opacity-80'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-800">
                              {field.label}
                            </span>
                            {field.required ? (
                              <span className="px-1.5 py-0.2 text-[9px] font-bold bg-rose-100 text-rose-700 rounded border border-rose-200">
                                Obrigatório
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.2 text-[9px] font-medium bg-slate-100 text-slate-600 rounded">
                                Opcional
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            {field.description}
                          </p>
                        </div>

                        {currentSelectedHeader && (
                          <span className="p-1 rounded-full bg-emerald-100 text-emerald-700 shrink-0" title="Mapeado">
                            <Check className="w-3 h-3" />
                          </span>
                        )}
                      </div>

                      {/* Dropdown to select imported column header */}
                      <div className="mt-2">
                        <select
                          value={currentSelectedHeader}
                          onChange={(e) => handleMappingChange(field.key, e.target.value)}
                          className={`w-full text-xs rounded-lg px-2.5 py-1.5 border font-semibold transition-colors ${
                            currentSelectedHeader
                              ? 'bg-indigo-50/40 border-indigo-300 text-indigo-950 focus:ring-2 focus:ring-indigo-500'
                              : 'bg-white border-slate-300 text-slate-600 focus:ring-2 focus:ring-indigo-500'
                          }`}
                        >
                          <option value="">-- Não mapear / Ignorar --</option>
                          {availableHeaders.map((header) => (
                            <option key={header} value={header}>
                              Coluna: {header}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Sample values preview */}
                      {currentSelectedHeader && sampleValues.length > 0 && (
                        <div className="mt-2 text-[10px] text-slate-500 flex items-center gap-1 overflow-hidden">
                          <span className="text-slate-400 shrink-0 font-medium">Exemplos:</span>
                          <span className="truncate font-mono text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                            {sampleValues.join(', ')}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: MULTI-SHEET SELECTION */}
          {rawSheets.length > 0 && activeViewMode === 'sheets' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-bold text-slate-800">
                    Abas Identificadas na Planilha ({rawSheets.length} abas)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleSelectAllSheets}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                >
                  {selectedSheetNames.size === rawSheets.length ? 'Desmarcar Todas' : 'Selecionar Todas'}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {rawSheets.map(sheet => {
                  const isChecked = selectedSheetNames.has(sheet.name);
                  return (
                    <div 
                      key={sheet.name}
                      onClick={() => toggleSheetSelection(sheet.name)}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex items-center justify-between gap-2 ${
                        isChecked 
                          ? 'bg-indigo-50/70 border-indigo-300 text-indigo-900 shadow-2xs' 
                          : 'bg-white border-slate-200 text-slate-600 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}} 
                          className="rounded text-indigo-600 focus:ring-indigo-500 shrink-0"
                        />
                        <div className="truncate">
                          <span className="text-xs font-bold block truncate" title={sheet.name}>
                            {sheet.name}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {sheet.rows.length} linhas
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: LIVE PREVIEW OF RESULTS */}
          {rawSheets.length > 0 && activeViewMode === 'preview' && (
            <div className="space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-slate-500" />
                  <span className="text-xs font-bold text-slate-800">
                    Prévia dos Registros com Mapeamento Aplicado:
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    ({previewList.length} clientes prontos)
                  </span>
                </div>

                {/* Sub-tab filter if multiple sheets */}
                {rawSheets.length > 1 && (
                  <div className="flex items-center gap-1 overflow-x-auto max-w-xs">
                    <button
                      type="button"
                      onClick={() => setPreviewActiveTab('todos')}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                        previewActiveTab === 'todos'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Todas as Abas
                    </button>
                    {rawSheets.map(s => (
                      <button
                        key={s.name}
                        type="button"
                        onClick={() => setPreviewActiveTab(s.name)}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold truncate max-w-[90px] cursor-pointer ${
                          previewActiveTab === s.name
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                        title={s.name}
                      >
                        {s.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Table preview */}
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                <div className="overflow-x-auto max-h-56">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 text-slate-700 font-semibold text-[11px] border-b border-slate-200">
                      <tr>
                        <th className="p-2.5">Matrícula</th>
                        <th className="p-2.5">Cliente</th>
                        <th className="p-2.5">Telefone</th>
                        <th className="p-2.5">Cobradora</th>
                        <th className="p-2.5">Valor (R$)</th>
                        <th className="p-2.5">Vencimento</th>
                        <th className="p-2.5">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                      {previewList.slice(0, 10).map((rec, i) => (
                        <tr key={i} className="hover:bg-slate-50/80">
                          <td className="p-2.5 font-bold text-slate-800">#{rec.matricula}</td>
                          <td className="p-2.5 font-sans font-semibold text-slate-900">{rec.cliente}</td>
                          <td className="p-2.5 text-slate-600">{rec.telefone || '—'}</td>
                          <td className="p-2.5">
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                              {rec.responsavel}
                            </span>
                          </td>
                          <td className="p-2.5 font-bold text-slate-900">
                            {(rec.valorOriginal ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </td>
                          <td className="p-2.5 text-slate-600">
                            {rec.primeiroMesAtraso} (D{rec.diaVencimento})
                          </td>
                          <td className="p-2.5">
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-slate-100 text-slate-700">
                              {rec.status.replace('_', ' ')}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {previewList.length === 0 && (
                        <tr>
                          <td colSpan={7} className="p-6 text-center text-slate-400 italic">
                            Nenhum registro a exibir nesta seleção.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {previewList.length > 10 && (
                  <div className="p-2 bg-slate-50 border-t border-slate-200 text-center text-[10px] text-slate-500 font-medium">
                    + {previewList.length - 10} outros registros prontos para unificação
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Mode Selector */}
          {rawSheets.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-medium text-slate-700 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <span className="text-slate-600 font-semibold">Modo de unificação no banco de dados:</span>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="importMode"
                    value="append"
                    checked={importMode === 'append'}
                    onChange={() => setImportMode('append')}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Adicionar / Mesclar com existentes</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="importMode"
                    value="replace"
                    checked={importMode === 'replace'}
                    onChange={() => setImportMode('replace')}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Substituir base atual</span>
                </label>
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            Cancelar
          </button>

          <div className="flex items-center gap-2">
            {rawSheets.length > 0 ? (
              <button
                onClick={handleConfirmImport}
                disabled={computedRecords.length === 0}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs disabled:opacity-50 transition-colors cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  Confirmar e Importar {computedRecords.length} Registros Mapeados
                </span>
              </button>
            ) : (
              <button
                onClick={handleProcessText}
                disabled={!rawText.trim() || isProcessing}
                className="px-5 py-2.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs disabled:opacity-50 transition-colors cursor-pointer"
              >
                {isProcessing ? 'Processando...' : 'Carregar e Mapear Colunas'}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
