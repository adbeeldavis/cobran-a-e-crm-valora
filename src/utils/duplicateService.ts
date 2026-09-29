import { DebtRecord, RegistroContato, HistoricoContato } from '../types';

export interface DuplicateGroup {
  id: string;
  type: 'telefone' | 'matricula' | 'cliente';
  key: string;
  label: string;
  records: DebtRecord[];
  hasDifferentResponsavel: boolean;
  hasDifferentClients: boolean;
}

/**
 * Clean phone string to digits only.
 * Normalizes Brazilian numbers with or without country code 55.
 */
export function normalizePhone(rawPhone?: string): string {
  if (!rawPhone) return '';
  let digits = rawPhone.replace(/\D/g, '');
  if (digits.startsWith('55') && digits.length > 11) {
    digits = digits.slice(2);
  }
  return digits;
}

/**
 * Format phone number nicely for display.
 */
export function formatPhone(phone: string): string {
  const digits = normalizePhone(phone);
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  } else if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return phone || 'Sem Telefone';
}

/**
 * Scan an array of records and identify duplicates by phone, matricula, or client name.
 */
export function analyzeDuplicates(records: DebtRecord[]): {
  groups: DuplicateGroup[];
  phoneDuplicateCount: number;
  matriculaDuplicateCount: number;
  nameDuplicateCount: number;
  recordsWithDuplicatesIds: Set<string>;
  duplicateInfoByRecordId: Map<string, { types: ('telefone' | 'matricula' | 'cliente')[]; otherClients: string[] }>;
} {
  const safeRecords = Array.isArray(records) ? records : [];

  const phoneMap = new Map<string, DebtRecord[]>();
  const matriculaMap = new Map<string, DebtRecord[]>();
  const nameMap = new Map<string, DebtRecord[]>();

  for (const record of safeRecords) {
    // 1. Phone indexing
    const cleanPhone = normalizePhone(record.telefone);
    if (cleanPhone.length >= 8) {
      if (!phoneMap.has(cleanPhone)) phoneMap.set(cleanPhone, []);
      phoneMap.get(cleanPhone)!.push(record);
    }

    // 2. Matricula indexing
    const mat = (record.matricula || '').trim();
    if (mat && mat !== '-' && mat !== 'N/A' && mat.length >= 2) {
      const matKey = mat.toLowerCase();
      if (!matriculaMap.has(matKey)) matriculaMap.set(matKey, []);
      matriculaMap.get(matKey)!.push(record);
    }

    // 3. Normalized client name
    const normName = (record.cliente || '').trim().toLowerCase();
    if (normName && normName.length >= 3) {
      if (!nameMap.has(normName)) nameMap.set(normName, []);
      nameMap.get(normName)!.push(record);
    }
  }

  const groups: DuplicateGroup[] = [];
  const recordsWithDuplicatesIds = new Set<string>();
  const duplicateInfoByRecordId = new Map<string, { types: ('telefone' | 'matricula' | 'cliente')[]; otherClients: string[] }>();

  let phoneDuplicateCount = 0;
  let matriculaDuplicateCount = 0;
  let nameDuplicateCount = 0;

  // Process Phone duplicates
  for (const [phone, list] of phoneMap.entries()) {
    if (list.length > 1) {
      phoneDuplicateCount++;
      const uniqueClients = Array.from(new Set(list.map(r => (r.cliente || '').trim())));
      const uniqueResponsaveis = Array.from(new Set(list.map(r => (r.responsavel || 'GERAL').trim().toUpperCase())));

      list.forEach(r => recordsWithDuplicatesIds.add(r.id));

      groups.push({
        id: `dup-phone-${phone}`,
        type: 'telefone',
        key: phone,
        label: `Telefone Repetido: ${formatPhone(phone)} (${list.length} registros)`,
        records: list,
        hasDifferentResponsavel: uniqueResponsaveis.length > 1,
        hasDifferentClients: uniqueClients.length > 1,
      });

      list.forEach(r => {
        const existing = duplicateInfoByRecordId.get(r.id) || { types: [], otherClients: [] };
        if (!existing.types.includes('telefone')) existing.types.push('telefone');
        const others = uniqueClients.filter(c => c.toLowerCase() !== (r.cliente || '').toLowerCase());
        existing.otherClients = Array.from(new Set([...existing.otherClients, ...others]));
        duplicateInfoByRecordId.set(r.id, existing);
      });
    }
  }

  // Process Matricula duplicates
  for (const [matKey, list] of matriculaMap.entries()) {
    if (list.length > 1) {
      matriculaDuplicateCount++;
      const uniqueClients = Array.from(new Set(list.map(r => (r.cliente || '').trim())));
      const uniqueResponsaveis = Array.from(new Set(list.map(r => (r.responsavel || 'GERAL').trim().toUpperCase())));

      list.forEach(r => recordsWithDuplicatesIds.add(r.id));

      groups.push({
        id: `dup-mat-${matKey}`,
        type: 'matricula',
        key: matKey,
        label: `Matrícula Duplicada: ${list[0].matricula} (${list.length} registros)`,
        records: list,
        hasDifferentResponsavel: uniqueResponsaveis.length > 1,
        hasDifferentClients: uniqueClients.length > 1,
      });

      list.forEach(r => {
        const existing = duplicateInfoByRecordId.get(r.id) || { types: [], otherClients: [] };
        if (!existing.types.includes('matricula')) existing.types.push('matricula');
        const others = uniqueClients.filter(c => c.toLowerCase() !== (r.cliente || '').toLowerCase());
        existing.otherClients = Array.from(new Set([...existing.otherClients, ...others]));
        duplicateInfoByRecordId.set(r.id, existing);
      });
    }
  }

  // Process exact client name duplicates across different sheets/IDs
  for (const [nameKey, list] of nameMap.entries()) {
    if (list.length > 1) {
      nameDuplicateCount++;
      const uniqueResponsaveis = Array.from(new Set(list.map(r => (r.responsavel || 'GERAL').trim().toUpperCase())));

      list.forEach(r => recordsWithDuplicatesIds.add(r.id));

      // Avoid creating an identical group if already grouped by matricula
      const alreadyGroupedByMat = groups.some(g => g.type === 'matricula' && g.records.every(r => list.some(l => l.id === r.id)));
      if (!alreadyGroupedByMat) {
        groups.push({
          id: `dup-name-${nameKey}`,
          type: 'cliente',
          key: nameKey,
          label: `Nome Idêntico: ${list[0].cliente} (${list.length} contratos/registros)`,
          records: list,
          hasDifferentResponsavel: uniqueResponsaveis.length > 1,
          hasDifferentClients: false,
        });
      }

      list.forEach(r => {
        const existing = duplicateInfoByRecordId.get(r.id) || { types: [], otherClients: [] };
        if (!existing.types.includes('cliente')) existing.types.push('cliente');
        duplicateInfoByRecordId.set(r.id, existing);
      });
    }
  }

  return {
    groups,
    phoneDuplicateCount,
    matriculaDuplicateCount,
    nameDuplicateCount,
    recordsWithDuplicatesIds,
    duplicateInfoByRecordId,
  };
}

/**
 * Merges multiple duplicate records into one single primary record:
 * - Keeps primary record fields
 * - Merges contact histories
 * - Concatenates notes/observações and secondary phone numbers
 * - Removes secondary duplicate records from the dataset
 */
export function mergeDuplicateRecords(
  primaryId: string,
  secondaryIds: string[],
  allRecords: DebtRecord[],
  mergedByUserName: string = 'Adm Master'
): { updatedRecords: DebtRecord[]; mergedRecord: DebtRecord } {
  const safeRecords = [...allRecords];
  const primaryIndex = safeRecords.findIndex(r => r.id === primaryId);
  if (primaryIndex === -1) {
    throw new Error('Registro principal não encontrado');
  }

  const primary = { ...safeRecords[primaryIndex] };
  const secondaries = safeRecords.filter(r => secondaryIds.includes(r.id) && r.id !== primaryId);

  // Merge contact histories
  const mergedHistory: (RegistroContato | HistoricoContato)[] = [...(primary.historicoContatos || [])];
  
  // Collect alternative phone numbers
  const altPhones = new Set<string>();
  if (primary.telefone) altPhones.add(primary.telefone);

  // Collect notes
  const notesList: string[] = [];
  if (primary.informacao) notesList.push(`[Principal]: ${primary.informacao}`);

  secondaries.forEach(sec => {
    if (sec.telefone && sec.telefone !== primary.telefone) {
      altPhones.add(sec.telefone);
    }
    if (sec.informacao) {
      notesList.push(`[${sec.cliente} | Aba: ${sec.abaOrigem || 'Geral'}]: ${sec.informacao}`);
    }
    if (sec.detalheAdicional) {
      notesList.push(`[Detalhe]: ${sec.detalheAdicional}`);
    }
    if (Array.isArray(sec.historicoContatos)) {
      mergedHistory.push(...sec.historicoContatos);
    }
  });

  // Add system audit log in history
  const auditEntry: RegistroContato = {
    id: `merge-${Date.now()}`,
    dataHora: new Date().toISOString(),
    canal: 'outro',
    tipoResultado: 'outro',
    operadorNome: mergedByUserName,
    resumo: `Contatos unificados (${secondaries.length + 1} registros)`,
    detalhes: `Contatos unificados por ${mergedByUserName}. Registros secundários mesclados (${secondaries.map(s => s.cliente + ' - ' + s.matricula).join(', ')}).`,
  };
  mergedHistory.push(auditEntry);

  // Sort history chronologically descending
  mergedHistory.sort((a, b) => new Date(b.dataHora).getTime() - new Date(a.dataHora).getTime());

  // Construct combined phone display or extra details
  const allPhonesArray = Array.from(altPhones);
  const primaryPhone = primary.telefone || allPhonesArray[0] || '';
  const secondaryPhonesStr = allPhonesArray.filter(p => p !== primaryPhone).join(' / ');

  const updatedPrimary: DebtRecord = {
    ...primary,
    telefone: primaryPhone,
    informacao: notesList.join(' | '),
    detalheAdicional: secondaryPhonesStr 
      ? `Tel(s) Adicional(is): ${secondaryPhonesStr}${primary.detalheAdicional ? ' | ' + primary.detalheAdicional : ''}`
      : primary.detalheAdicional,
    historicoContatos: mergedHistory,
  };

  // Filter out the merged secondary records
  const secondaryIdSet = new Set(secondaryIds.filter(id => id !== primaryId));
  const newRecordsList = safeRecords
    .filter(r => !secondaryIdSet.has(r.id))
    .map(r => (r.id === primaryId ? updatedPrimary : r));

  return {
    updatedRecords: newRecordsList,
    mergedRecord: updatedPrimary,
  };
}

/**
 * Bulk reassigns a list of record IDs to a new responsable operator.
 */
export function reassignRecords(
  allRecords: DebtRecord[],
  recordIds: string[],
  newResponsavel: string,
  assignedByUserName: string = 'Adm Master'
): DebtRecord[] {
  const targetIds = new Set(recordIds);
  const now = new Date().toISOString();

  return allRecords.map(record => {
    if (!targetIds.has(record.id)) return record;

    const previousResp = record.responsavel || 'GERAL';
    const auditLog: RegistroContato = {
      id: `reassign-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      dataHora: now,
      canal: 'outro',
      tipoResultado: 'outro',
      operadorNome: assignedByUserName,
      resumo: `Lead reatribuído para ${newResponsavel}`,
      detalhes: `Lead reatribuído por ${assignedByUserName}: de [${previousResp}] para [${newResponsavel}].`,
    };

    const updatedHistory = [...(record.historicoContatos || []), auditLog];

    return {
      ...record,
      responsavel: newResponsavel,
      historicoContatos: updatedHistory,
    };
  });
}
