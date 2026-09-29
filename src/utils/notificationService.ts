import { DebtRecord, TemplateMensagem } from '../types';

export const DEFAULT_TEMPLATES: TemplateMensagem[] = [
  {
    id: 'tpl-1',
    nome: 'Cobrança Amigável (Lembrete Vencimento)',
    canal: 'whatsapp',
    tipo: 'lembrete_amigavel',
    conteudo: 'Olá, {cliente}! Tudo bem? Constatamos que a sua parcela com vencimento dia {dia_vencimento} ({mes_atraso}) está em aberto. Deseja que enviemos a 2ª via ou a chave PIX para quitação?',
  },
  {
    id: 'tpl-2',
    nome: 'Cobrança Firme (Atraso Acumulado)',
    canal: 'whatsapp',
    tipo: 'aviso_atraso',
    conteudo: 'Prezado(a) {cliente}, matrícula {matricula}. Identificamos débito pendente desde {mes_atraso} ({dias_atraso} dias). Solicitamos contato urgente para regularização e para evitar restrições em seu cadastro. Condições facilitadas disponíveis hoje.',
  },
  {
    id: 'tpl-3',
    nome: 'Lembrete de Acordo / Retorno Agendado',
    canal: 'whatsapp',
    tipo: 'acordo_confirmado',
    conteudo: 'Olá, {cliente}! Lembramos do seu acordo firmado agendado para {data_retorno}{valor_acordo}. Por gentileza, nos envie o comprovante de pagamento por aqui para darmos baixa em seu sistema. Obrigado!',
  },
  {
    id: 'tpl-4',
    nome: 'Notificação de Boleto Gerado',
    canal: 'whatsapp',
    tipo: 'boleto_gerado',
    conteudo: 'Olá {cliente}! Informamos que seu boleto foi gerado e registrado pela nossa central. {observacao}. Favor efetuar o pagamento até o vencimento para usufruir de seus benefícios com tranquilidade.',
  },
  {
    id: 'tpl-5',
    nome: 'SMS - Alerta de Pendência Financeira',
    canal: 'sms',
    tipo: 'notificacao_critica',
    conteudo: 'COBRANCA: {cliente}, regularize sua pendencia desde {mes_atraso}. Pague com desconto via PIX hoje. Responda ou ligue para nossa central.',
  }
];

export function formatMessage(templateStr: string, record: DebtRecord, daysOverdue: number): string {
  const valorStr = record.valorAcordo 
    ? ` no valor de R$ ${record.valorAcordo.toFixed(2).replace('.', ',')}` 
    : '';

  return templateStr
    .replace(/\{cliente\}/g, record.cliente)
    .replace(/\{matricula\}/g, record.matricula)
    .replace(/\{dia_vencimento\}/g, record.diaVencimento.toString())
    .replace(/\{mes_atraso\}/g, record.primeiroMesAtraso)
    .replace(/\{dias_atraso\}/g, daysOverdue.toString())
    .replace(/\{data_retorno\}/g, record.dataRetorno || 'a data combinada')
    .replace(/\{valor_acordo\}/g, valorStr)
    .replace(/\{observacao\}/g, record.informacao || '');
}

export function buildWhatsAppUrl(telefone: string, mensagem: string): string {
  const cleanPhone = telefone.replace(/\D/g, '');
  // Default to Brazil country code 55
  const fullPhone = cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone;
  return `https://api.whatsapp.com/send?phone=${fullPhone}&text=${encodeURIComponent(mensagem)}`;
}
