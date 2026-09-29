/**
 * Utilitários para tratamento e análise de datas de retorno e agendamento de cobrança
 */

export interface ReturnDateStatusInfo {
  hasReturnDate: boolean;
  isPast: boolean;
  isToday: boolean;
  isFuture: boolean;
  daysDifference: number; // < 0 se atrasado/passado, 0 se hoje, > 0 se futuro
  formattedText: string;
  badgeLabel: string;
  tooltipText: string;
}

/**
 * Analisa uma string de dataRetorno (suporta DD/MM, DD/MM/AAAA, AAAA-MM-DD)
 * e determina se a data já passou (vermelho), é hoje (alerta) ou futura.
 */
export function parseReturnDateStatus(dataRetorno?: string): ReturnDateStatusInfo {
  if (!dataRetorno || !dataRetorno.trim()) {
    return {
      hasReturnDate: false,
      isPast: false,
      isToday: false,
      isFuture: false,
      daysDifference: 0,
      formattedText: '',
      badgeLabel: '',
      tooltipText: ''
    };
  }

  const raw = dataRetorno.trim();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let targetDate: Date | null = null;

  // Padrão 1: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    const parts = raw.slice(0, 10).split('-').map(Number);
    targetDate = new Date(parts[0], parts[1] - 1, parts[2]);
  }
  // Padrão 2: DD/MM/YYYY
  else if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(raw)) {
    const parts = raw.slice(0, 10).split('/').map(Number);
    targetDate = new Date(parts[2], parts[1] - 1, parts[0]);
  }
  // Padrão 3: DD/MM (ex: 04/09, 25/10)
  else if (/^\d{1,2}\/\d{1,2}/.test(raw)) {
    const parts = raw.slice(0, 5).split('/').map(Number);
    targetDate = new Date(today.getFullYear(), parts[1] - 1, parts[0]);
  } else {
    const parsed = Date.parse(raw);
    if (!isNaN(parsed)) {
      const d = new Date(parsed);
      targetDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    }
  }

  if (!targetDate || isNaN(targetDate.getTime())) {
    return {
      hasReturnDate: true,
      isPast: false,
      isToday: false,
      isFuture: true,
      daysDifference: 0,
      formattedText: raw,
      badgeLabel: `Retorno: ${raw}`,
      tooltipText: `Retorno agendado para: ${raw}`
    };
  }

  targetDate.setHours(0, 0, 0, 0);
  const diffTime = targetDate.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  const isToday = diffDays === 0;
  const isPast = diffDays < 0;
  const isFuture = diffDays > 0;

  let badgeLabel = '';
  let tooltipText = '';

  if (isToday) {
    badgeLabel = `Retorno Hoje (${raw})`;
    tooltipText = `⏰ Retorno agendado para HOJE (${raw})! Prioridade de acionamento imediato.`;
  } else if (isPast) {
    const absDays = Math.abs(diffDays);
    badgeLabel = `Retorno Atrasado (${raw})`;
    tooltipText = `⚠️ PENDÊNCIA DE RETORNO ATRASADA! Data combinada era ${raw} (${absDays} dia${absDays > 1 ? 's' : ''} em atraso). O cliente deve ser contatado com urgência!`;
  } else {
    badgeLabel = `Retorno: ${raw}`;
    tooltipText = `📅 Retorno agendado para ${raw} (em ${diffDays} dia${diffDays > 1 ? 's' : ''}).`;
  }

  return {
    hasReturnDate: true,
    isPast,
    isToday,
    isFuture,
    daysDifference: diffDays,
    formattedText: raw,
    badgeLabel,
    tooltipText
  };
}
