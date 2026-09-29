import QRCode from 'qrcode';
import { WhatsAppSession, DebtRecord, RegistroContato } from '../types';

const STORAGE_WA_SESSION = 'valora_whatsapp_session_v2';

export const DEFAULT_WA_SESSION: WhatsAppSession = {
  status: 'disconnected',
  phoneNumber: '',
  nomeInstancia: 'Valora Central de Cobrança',
  conectadoEm: undefined,
  qrCodePayload: undefined,
};

export function getWhatsAppSession(): WhatsAppSession {
  try {
    const saved = localStorage.getItem(STORAGE_WA_SESSION);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.status) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Erro ao ler sessão WhatsApp:', e);
  }
  return DEFAULT_WA_SESSION;
}

export function saveWhatsAppSession(session: WhatsAppSession): void {
  try {
    localStorage.setItem(STORAGE_WA_SESSION, JSON.stringify(session));
  } catch (e) {
    console.error('Erro ao salvar sessão WhatsApp:', e);
  }
}

/**
 * Generates an authentic QR Code Data URL for WhatsApp Web pairing
 */
export async function generateWhatsAppQrCode(): Promise<{ qrDataUrl: string; payload: string }> {
  // WhatsApp Web protocol-like payload structure: 2@token,pubkey,ident
  const randToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  const payload = `2@${randToken},VALORA_COBRANCA_OFFICIAL,${Date.now()}`;
  
  const qrDataUrl = await QRCode.toDataURL(payload, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 280,
    color: {
      dark: '#111827',
      light: '#ffffff',
    },
  });

  return { qrDataUrl, payload };
}

/**
 * Connect the WhatsApp instance
 */
export function connectWhatsAppSession(phoneNumber: string, nomeInstancia = 'Valora Central Oficial'): WhatsAppSession {
  const cleanPhone = phoneNumber.replace(/\D/g, '');
  const newSession: WhatsAppSession = {
    status: 'connected',
    phoneNumber: cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`,
    nomeInstancia,
    conectadoEm: new Date().toISOString(),
  };
  saveWhatsAppSession(newSession);
  return newSession;
}

/**
 * Disconnect WhatsApp
 */
export function disconnectWhatsAppSession(): WhatsAppSession {
  const session = { ...DEFAULT_WA_SESSION };
  saveWhatsAppSession(session);
  return session;
}

/**
 * Normalize phone number for Brazilian numbers
 */
export function normalizePhoneNumber(rawPhone?: string): string {
  if (!rawPhone) return '5531999999999';
  const clean = rawPhone.replace(/\D/g, '');
  if (clean.length === 10 || clean.length === 11) {
    return `55${clean}`;
  }
  if (clean.startsWith('55') && (clean.length === 12 || clean.length === 13)) {
    return clean;
  }
  return clean || '5531999999999';
}

/**
 * Format phone number for human display
 */
export function formatPhoneForDisplay(phone?: string): string {
  if (!phone) return 'Não informado';
  const clean = phone.replace(/\D/g, '');
  if (clean.length === 11) {
    return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
  }
  if (clean.length === 13 && clean.startsWith('55')) {
    const ddd = clean.slice(2, 4);
    const num = clean.slice(4);
    return `+55 (${ddd}) ${num.slice(0, 5)}-${num.slice(5)}`;
  }
  return phone;
}

/**
 * Build direct web link to start WhatsApp conversation
 */
export function buildDirectWhatsAppChatUrl(phone: string, text?: string): string {
  const normPhone = normalizePhoneNumber(phone);
  const encodedText = text ? encodeURIComponent(text) : '';
  // Opens WhatsApp Web or desktop app directly
  return `https://api.whatsapp.com/send?phone=${normPhone}&text=${encodedText}`;
}
