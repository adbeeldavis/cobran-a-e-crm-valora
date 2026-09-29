export type StatusCobranca = 
  | 'em_atraso'
  | 'contato_a_realizar'
  | 'aguardando_retorno'
  | 'sem_retorno'
  | 'em_negociacao'
  | 'acordo_em_andamento'
  | 'pagamento_prometido'
  | 'pago'
  | 'recuperado'
  | 'inadimplencia_recorrente'
  // Legacy compatibility
  | 'pendente' 
  | 'acordo_fechado' 
  | 'boleto_gerado' 
  | 'sem_contato' 
  | 'cancelado';

export interface NegociacaoRecord {
  id: string;
  clienteId: string;
  matricula: string;
  clienteNome: string;
  dataCriacao: string;
  valorOriginal: number;
  descontoConcedido: number; // Porcentagem ou R$
  valorNegociado: number;
  numeroParcelas: number;
  valorParcela: number;
  dataPrimeiroPagamento: string;
  dataFinal?: string;
  responsavel: string;
  observacoes?: string;
  status: 
    | 'negociacao_iniciada' 
    | 'aguardando_confirmacao' 
    | 'acordo_realizado' 
    | 'pagamento_parcial' 
    | 'acordo_concluido' 
    | 'acordo_quebrado';
}

export interface PagamentoRecord {
  id: string;
  clienteId: string;
  matricula: string;
  clienteNome: string;
  dataPagamento: string;
  valorPago: number;
  formaPagamento: 'PIX' | 'Boleto' | 'Cartão de Crédito' | 'Cartão de Débito' | 'Dinheiro' | 'Transferência';
  valorRecuperado: number;
  responsavel: string;
  observacoes?: string;
}

export interface AlertaRegra {
  id: string;
  tipo: 
    | 'nova_cobranca' 
    | 'sem_contato' 
    | 'proxima_acao_vencida' 
    | 'prometido_hoje' 
    | 'prometido_nao_realizado' 
    | 'acordo_quebrado' 
    | 'atraso_recorrente' 
    | 'negociacao_sem_atualizacao';
  titulo: string;
  descricao: string;
  clienteNome: string;
  matricula: string;
  responsavel: string;
  severidade: 'urgente' | 'alta' | 'media' | 'informativa';
  dataIdentificacao: string;
}

export interface NotificacaoRegistro {
  id: string;
  data: string;
  canal: 'whatsapp' | 'sms' | 'email';
  tipo: 'lembrete_vencimento' | 'atraso_critico' | 'acordo_pendente' | 'boleto_disponivel';
  mensagem: string;
  status: 'enviada' | 'agendada';
}

export interface RiskScoreResult {
  id: string;
  matricula: string;
  cliente: string;
  score: number; // 0 to 100
  nivelRisco: 'BAIXO' | 'MÉDIO' | 'ALTO' | 'CRÍTICO';
  probabilidadeRecuperacao: 'ALTA' | 'MÉDIA' | 'BAIXA';
  percentualRecuperacao: number; // 0 to 100
  estrategiaSugerida: string;
  justificativa: string;
  dataAnalise: string;
}

export interface ItemAuditoria {
  id: string;
  dataHora: string;
  usuarioNome: string;
  usuarioEmail?: string;
  usuarioCargo?: string;
  tipoAcao: 'mudanca_status' | 'mudanca_responsavel' | 'edicao_dados' | 'registro_contato' | 'reatribuicao' | 'criacao';
  campoAlterado: string;
  valorAnterior: string;
  valorNovo: string;
  motivo?: string;
}

export interface DebtRecord {
  id: string;
  matricula: string;
  cliente: string;
  cpf?: string;
  telefone?: string;
  whatsapp?: string;
  email?: string;
  planoContratado?: string; // 'Cartão Todos Individual' | 'Cartão Todos Familiar' | 'Cartão Todos Mais' | 'Top Saúde'
  valorMensalidade?: number;
  detalheAdicional?: string;
  responsavel: string; // 'ROSANA' | 'ANA LUIZA' | 'KEYLLA' | 'FABIOLA' | 'GERAL'
  abaOrigem?: string; // e.g. 'Aba: ROSANA', 'Aba: ANA LUIZA', 'Aba: KEYLLA', 'Aba: BOLETOS', etc.
  primeiroMesAtraso: string; // e.g. '01/25', '09/26'
  diaVencimento: number; // 10, 15, 20
  informacao: string;
  contatoRealizado: 'SIM' | 'NÃO' | 'PENDENTE';
  whatsappStatus: 'OK' | 'NÃO' | 'PENDENTE';
  status: StatusCobranca;
  dataRetorno?: string;
  dataUltimoContato?: string;
  valorOriginal?: number;
  valorEmAberto?: number;
  valorPago?: number;
  valorRecuperado?: number;
  valorAcordo?: number;
  qtdParcelasVencidas?: number;
  dataPrimeiroVencimento?: string;
  dataUltimoVencimento?: string;
  diasAtraso?: number;
  proximaAcao?: string; // e.g. 'WhatsApp', 'Telefone', 'Negociar', 'Confirmar Pagamento'
  dataProximaAcao?: string; // YYYY-MM-DD
  prioridadeAcao?: 'urgente' | 'prioridade' | 'aguardando_retorno' | 'negociacao' | 'pagamento_prometido';
  acaoConcluida?: boolean;
  acaoConcluidaEm?: string;
  acaoConcluidaPor?: string;
  inadimplenteRecorrente?: boolean;
  dataImportacao?: string;
  notificacoes: NotificacaoRegistro[];
  scoreRisco?: RiskScoreResult;
  historicoContatos?: (RegistroContato | HistoricoContato)[];
  historicoNegociacoes?: NegociacaoRecord[];
  historicoPagamentos?: PagamentoRecord[];
  logAuditoria?: ItemAuditoria[];
}

export interface SheetInfo {
  name: string;
  recordCount: number;
  records: DebtRecord[];
  selected?: boolean;
}

export interface FilterOptions {
  busca: string;
  responsavel: string;
  abaOrigem?: string;
  status: string;
  diaVencimento: string;
  anoAtraso: string; // 'todos' | '2025' | '2026'
  somenteComAgendamento: boolean;
  somenteBoletoGerado: boolean;
  faixaAtraso?: string; // 'todos' | 'ate_30' | '31_60' | '61_90' | 'acima_90'
  periodo?: 'hoje' | 'esta_semana' | 'este_mes' | 'todos' | 'personalizado';
}

export interface TemplateMensagem {
  id: string;
  nome: string;
  canal: 'whatsapp' | 'sms' | 'email';
  tipo: 'lembrete_amigavel' | 'aviso_atraso' | 'notificacao_critica' | 'boleto_gerado' | 'acordo_confirmado';
  conteudo: string;
}

export type UserRole = 
  | 'administrador' 
  | 'socias' 
  | 'coordenadora' 
  | 'cobranca' 
  | 'adm_master' 
  | 'operador' 
  | 'suporte';

export interface AppUser {
  id: string;
  nome: string;
  email: string;
  role: UserRole;
  responsavelAssociado?: string; // e.g. 'ROSANA', 'ANA LUIZA', 'KEYLLA', 'FABIOLA', or null for adm_master / suporte
  avatarColor: string;
  cargo?: string;
  senha?: string; // Senha para controle de acesso do operador gerenciada pelo master
  horarioNotificacao?: string; // e.g. '08:00', '08:30' - Horário do alerta no início do dia de trabalho
  notificacaoDiariaAtiva?: boolean; // Se o alerta automático de início de expediente está ativo
}

export type CanalContato = 'whatsapp' | 'telefone' | 'email' | 'presencial' | 'sms' | 'outro';

export type TipoResultadoContato = 
  | 'cobranca_ativa' 
  | 'promessa_pagamento' 
  | 'acordo_parcelamento' 
  | 'boleto_enviado' 
  | 'sem_contato' 
  | 'recusa_pagamento' 
  | 'numero_invalido' 
  | 'renegociacao' 
  | 'outro';

export interface RegistroContato {
  id: string;
  dataHora: string;
  operadorNome: string;
  operadorId?: string;
  canal: CanalContato;
  tipoResultado: TipoResultadoContato;
  resumo: string;
  detalhes?: string;
  valorPrometido?: number;
  dataPromessa?: string;
  dataRetornoAgendado?: string;
  novoStatus?: StatusCobranca;
}

export interface HistoricoContato {
  id: string;
  data: string;
  horario: string;
  responsavel: string;
  canal: string;
  resultado: string;
  observacoes: string;
  proximaAcao?: string;
  dataProximaAcao?: string;
  dataHora?: string;
  operadorNome?: string;
  tipoResultado?: string;
  resumo?: string;
  detalhes?: string;
}

export interface WhatsAppSession {
  status: 'disconnected' | 'connecting' | 'connected';
  phoneNumber?: string;
  nomeInstancia?: string;
  conectadoEm?: string;
  qrCodePayload?: string;
}

export type TipoCanalAlerta = 'email' | 'alerta_interno' | 'ambos' | 'web_push';

export type TipoRecorrenciaLembrete = 'nenhuma' | 'diaria' | 'semanal' | 'mensal';

export interface LembreteAgendado {
  id: string;
  clienteId: string;
  matricula: string;
  clienteNome: string;
  responsavel: string;
  diasAtraso: number;
  tipoAlerta: TipoCanalAlerta;
  destinatarioEmail?: string;
  assunto: string;
  mensagem: string;
  dataAgendada: string; // YYYY-MM-DD
  horario?: string; // e.g. '09:00'
  status: 'pendente' | 'disparado' | 'cancelado';
  criadoEm: string;
  disparadoEm?: string;
  criadoPor: string;
  recorrencia?: TipoRecorrenciaLembrete;
  exibirNoStartup?: boolean;
  prioridade?: 'baixa' | 'media' | 'alta' | 'urgente';
  lembreteGeral?: boolean;
  concluidoEm?: string;
}

export interface AlertaInterno {
  id: string;
  clienteId: string;
  matricula: string;
  clienteNome: string;
  responsavel: string;
  diasAtraso: number;
  mensagem: string;
  prioridade: 'media' | 'alta' | 'critica';
  dataCriacao: string;
  lido: boolean;
  canalOrigem: 'sistema' | 'agendamento' | 'manual';
}

// Financial Module Types (Módulo Financeiro)
export type TipoLancamentoFinanceiro = 'receita' | 'despesa';

export type StatusLancamentoFinanceiro = 'pendente' | 'pago' | 'vencido' | 'cancelado';

export interface LancamentoFinanceiro {
  id: string;
  tipo: TipoLancamentoFinanceiro;
  descricao: string;
  categoria: string;
  valor: number;
  dataVencimento: string; // YYYY-MM-DD
  dataPagamento?: string; // YYYY-MM-DD
  status: StatusLancamentoFinanceiro;
  formaPagamento?: 'PIX' | 'Boleto' | 'Cartão' | 'Transferência' | 'Dinheiro';
  entidade?: string; // Cliente pagador ou Fornecedor
  origem: 'cobranca' | 'manual' | 'recorrente';
  referenciaId?: string; // Id da dívida ou acordo se originado da cobrança
  observacoes?: string;
  criadoPor?: string;
  criadoEm: string;
}

export type SubTabFinanceiro = 
  | 'visao_geral'
  | 'comparativo_mensal'
  | 'contas_receber'
  | 'contas_pagar'
  | 'fluxo_caixa'
  | 'extrato';

// CRM de Vendas Types (Pipeline Comercial e Gestão de Oportunidades)
export type CrmEtapaVenda = 
  | 'prospeccao'     // Prospecção & Novos Leads
  | 'qualificacao'   // Qualificação & Diagnóstico
  | 'proposta'       // Proposta Comercial Apresentada
  | 'negociacao'     // Negociação & Ajustes Finais
  | 'ganho'          // Venda Ganha / Contrato Fechado
  | 'perdido';       // Perdido / Desqualificado

export type CrmTemperatura = 'quente' | 'morno' | 'frio';

export type CrmOrigemLead = 
  | 'indicacao' 
  | 'whatsapp' 
  | 'inbound_site' 
  | 'prospeccao_ativa' 
  | 'parceria' 
  | 'evento_network' 
  | 'recorrente';

export interface CrmAtividade {
  id: string;
  data: string; // ISO string
  autor: string;
  tipo: 'ligacao' | 'whatsapp' | 'reuniao' | 'proposta' | 'email' | 'mudanca_etapa' | 'nota';
  descricao: string;
}

export interface CrmOportunidade {
  id: string;
  titulo: string;
  cliente: string;
  documento?: string; // CNPJ ou CPF
  contatoNome: string;
  contatoCargo?: string;
  telefone: string;
  email?: string;
  cidadeUf?: string;
  valor: number; // R$ valor estimado do negócio / honorários
  valorMensal?: number; // R$ se for contrato mensal recorrente
  etapa: CrmEtapaVenda;
  probabilidade: number; // 0 a 100%
  temperatura: CrmTemperatura;
  origem: CrmOrigemLead;
  responsavel: string; // Vendedor / Responsável
  previsaoFechamento: string; // YYYY-MM-DD
  servicosInteresse: string[]; // Serviços desejados
  proximaAcao?: string;
  dataProximaAcao?: string;
  motivoPerda?: string;
  observacoes?: string;
  dataCriacao: string; // ISO string
  dataAtualizacao: string; // ISO string
  historico: CrmAtividade[];
}

export type CrmSubTab = 'kanban' | 'lista' | 'metricas' | 'ranking';


