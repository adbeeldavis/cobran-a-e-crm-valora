import React, { useState, useEffect, useCallback } from 'react';
import { 
  X, 
  QrCode, 
  Smartphone, 
  CheckCircle2, 
  RefreshCw, 
  PowerOff, 
  Send, 
  ShieldCheck, 
  ExternalLink,
  PhoneCall,
  Wifi,
  Sparkles,
  Info
} from 'lucide-react';
import { WhatsAppSession, AppUser } from '../types';
import { 
  getWhatsAppSession, 
  generateWhatsAppQrCode, 
  connectWhatsAppSession, 
  disconnectWhatsAppSession,
  formatPhoneForDisplay,
  buildDirectWhatsAppChatUrl 
} from '../utils/whatsappService';

interface WhatsAppConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AppUser;
  onSessionChange: (session: WhatsAppSession) => void;
  onShowToast: (message: string) => void;
}

export const WhatsAppConnectionModal: React.FC<WhatsAppConnectionModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSessionChange,
  onShowToast,
}) => {
  const [session, setSession] = useState<WhatsAppSession>(() => getWhatsAppSession());
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [isLoadingQr, setIsLoadingQr] = useState<boolean>(false);
  const [customPhone, setCustomPhone] = useState<string>('(31) 98452-1920');
  const [instanceName, setInstanceName] = useState<string>(
    currentUser.role === 'adm_master' ? 'Central Valora Cobrança Oficial' : `WhatsApp - ${currentUser.nome}`
  );
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [testPhoneNumber, setTestPhoneNumber] = useState<string>('31999999999');
  const [testMessage, setTestMessage] = useState<string>('Olá! Mensagem de teste da Valora Gestão & Cobrança.');

  const refreshQr = useCallback(async () => {
    setIsLoadingQr(true);
    try {
      const { qrDataUrl } = await generateWhatsAppQrCode();
      setQrCodeUrl(qrDataUrl);
    } catch (err) {
      console.error('Erro ao gerar QR Code:', err);
      onShowToast('Falha ao gerar QR Code do WhatsApp.');
    } finally {
      setIsLoadingQr(false);
    }
  }, [onShowToast]);

  useEffect(() => {
    if (!isOpen) return;
    if (session.status !== 'connected') {
      refreshQr();
      const interval = setInterval(refreshQr, 45000); // 45s QR refresh
      return () => clearInterval(interval);
    }
  }, [isOpen, session.status, refreshQr]);

  if (!isOpen) return null;

  const handleSimulateScan = () => {
    setIsConnecting(true);
    setTimeout(() => {
      const newSession = connectWhatsAppSession(customPhone, instanceName);
      setSession(newSession);
      onSessionChange(newSession);
      setIsConnecting(false);
      onShowToast(`WhatsApp conectado com sucesso ao número ${customPhone}!`);
    }, 1500);
  };

  const handleDisconnect = () => {
    const newSession = disconnectWhatsAppSession();
    setSession(newSession);
    onSessionChange(newSession);
    refreshQr();
    onShowToast('WhatsApp desconectado.');
  };

  const handleSendTestMessage = () => {
    const url = buildDirectWhatsAppChatUrl(testPhoneNumber, testMessage);
    window.open(url, '_blank');
    onShowToast('Conversa de teste aberta no WhatsApp Web!');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto no-print">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 my-8">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-emerald-700 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-xs border border-white/20">
              <Smartphone className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold">
                  Conexão WhatsApp Web via QR Code
                </h2>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                  session.status === 'connected'
                    ? 'bg-emerald-400/30 text-emerald-100 border border-emerald-300/40'
                    : 'bg-white/20 text-white border border-white/30'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${session.status === 'connected' ? 'bg-emerald-300 animate-pulse' : 'bg-amber-300'}`} />
                  <span>{session.status === 'connected' ? 'Conectado' : 'Aguardando Leitura'}</span>
                </span>
              </div>
              <p className="text-xs text-emerald-100/80">
                Conecte o WhatsApp corporativo para disparar mensagens e iniciar conversas diretas com clientes
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">

          {session.status === 'connected' ? (
            /* CONNECTED STATE */
            <div className="space-y-5 animate-in fade-in">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-emerald-950">
                      Instância Conectada &amp; Pronta para Conversas
                    </h3>
                    <span className="flex items-center gap-1 text-xs text-emerald-700 font-semibold">
                      <Wifi className="w-3.5 h-3.5" />
                      <span>Online</span>
                    </span>
                  </div>
                  <p className="text-xs text-emerald-800 mt-1">
                    Número pareado: <strong>{formatPhoneForDisplay(session.phoneNumber)}</strong>
                  </p>
                  <p className="text-[11px] text-emerald-700 mt-0.5">
                    Instância: {session.nomeInstancia || 'Valora Cobrança'} • Conectado em:{' '}
                    {session.conectadoEm ? new Date(session.conectadoEm).toLocaleString('pt-BR') : 'Hoje'}
                  </p>
                </div>
              </div>

              {/* Fast test trigger */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Send className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Testar Envio / Abrir Conversa Direta</span>
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Telefone do Destinatário:</label>
                    <input
                      type="text"
                      value={testPhoneNumber}
                      onChange={(e) => setTestPhoneNumber(e.target.value)}
                      placeholder="31999999999"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Mensagem Inicial:</label>
                    <input
                      type="text"
                      value={testMessage}
                      onChange={(e) => setTestMessage(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={handleSendTestMessage}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Iniciar Conversa no WhatsApp</span>
                  </button>
                </div>
              </div>

              {/* Disconnect button */}
              <div className="pt-2 flex items-center justify-between border-t border-slate-200">
                <p className="text-xs text-slate-500">
                  Para trocar de aparelho ou operador, desconecte a sessão atual.
                </p>
                <button
                  type="button"
                  onClick={handleDisconnect}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-rose-700 hover:text-white bg-rose-50 hover:bg-rose-600 border border-rose-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                >
                  <PowerOff className="w-3.5 h-3.5" />
                  <span>Desconectar WhatsApp</span>
                </button>
              </div>
            </div>
          ) : (
            /* QR CODE PAIRING STATE */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              
              {/* QR Code Container */}
              <div className="flex flex-col items-center justify-center p-6 bg-slate-50 border border-slate-200 rounded-2xl shadow-inner relative">
                {isLoadingQr ? (
                  <div className="w-[280px] h-[280px] flex flex-col items-center justify-center text-slate-400 gap-2">
                    <RefreshCw className="w-8 h-8 animate-spin text-emerald-600" />
                    <span className="text-xs font-medium">Gerando QR Code oficial...</span>
                  </div>
                ) : qrCodeUrl ? (
                  <div className="relative group">
                    <img 
                      src={qrCodeUrl} 
                      alt="WhatsApp Web QR Code" 
                      className="w-[240px] h-[240px] rounded-lg shadow-sm border border-slate-300"
                    />
                    <div className="absolute inset-0 bg-slate-900/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                  </div>
                ) : (
                  <div className="w-[240px] h-[240px] flex items-center justify-center text-slate-400">
                    Falha ao carregar QR Code
                  </div>
                )}

                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={refreshQr}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 bg-white px-2.5 py-1 rounded-md border border-slate-200 shadow-2xs cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 ${isLoadingQr ? 'animate-spin' : ''}`} />
                    <span>Atualizar QR Code</span>
                  </button>
                  <span className="text-[10px] text-slate-400">Atualiza automaticamente</span>
                </div>
              </div>

              {/* Instructions and Quick Connect */}
              <div className="space-y-4 text-xs text-slate-700">
                <div className="space-y-2.5">
                  <h3 className="text-sm font-bold text-slate-900">
                    Como conectar o WhatsApp:
                  </h3>
                  <ol className="space-y-2 text-slate-600 list-decimal list-inside pl-1">
                    <li className="leading-relaxed">
                      Abra o <strong>WhatsApp</strong> no celular da empresa ou operadora.
                    </li>
                    <li className="leading-relaxed">
                      Toque em <strong>Mais opções</strong> (⋮) ou <strong>Configurações</strong> e selecione <strong>Aparelhos conectados</strong>.
                    </li>
                    <li className="leading-relaxed">
                      Toque em <strong>Conectar um aparelho</strong> e aponte a câmera para o QR Code ao lado.
                    </li>
                  </ol>
                </div>

                {/* Instant Pairing Simulator */}
                <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-950 flex items-center gap-1.5 text-xs">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Pareamento Imediato do Número:</span>
                    </span>
                    <span className="text-[10px] font-medium bg-emerald-200/70 text-emerald-900 px-1.5 py-0.2 rounded">
                      Operador: {currentUser.nome.split(' ')[0]}
                    </span>
                  </div>

                  <div>
                    <label className="block text-[11px] text-emerald-900 font-medium mb-1">
                      Número do WhatsApp do Operador/Empresa:
                    </label>
                    <input
                      type="text"
                      value={customPhone}
                      onChange={(e) => setCustomPhone(e.target.value)}
                      placeholder="(31) 98888-7777"
                      className="w-full px-3 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs font-mono text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    />
                  </div>

                  <button
                    type="button"
                    disabled={isConnecting}
                    onClick={handleSimulateScan}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isConnecting ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Autenticando sessão...</span>
                      </>
                    ) : (
                      <>
                        <Smartphone className="w-3.5 h-3.5" />
                        <span>Conectar Este Número Agora</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Criptografia de ponta a ponta oficial do WhatsApp</span>
                </div>

              </div>

            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-slate-400" />
            <span>Permite aos operadores iniciar conversas com mensagens pré-formatadas.</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
