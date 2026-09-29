/**
 * Browser Web Notification (Web Push) & Audio Alert Service
 * Handles requesting permissions, dispatching desktop browser notifications,
 * and playing gentle audio chimes when reminders become due.
 */

export type BrowserNotificationPermission = 'granted' | 'denied' | 'default' | 'unsupported';

const NOTIFICATIONS_ENABLED_KEY = 'valora_web_notifications_enabled_v1';
const NOTIFIED_REMINDERS_SESSION_KEY = 'valora_notified_reminders_session_v1';

/**
 * Check if the browser supports the Web Notification API.
 */
export function isBrowserNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/**
 * Get current browser notification permission status.
 */
export function getBrowserNotificationPermission(): BrowserNotificationPermission {
  if (!isBrowserNotificationSupported()) {
    return 'unsupported';
  }
  return Notification.permission as BrowserNotificationPermission;
}

/**
 * Check if notifications are enabled in local app settings.
 */
export function isWebNotificationEnabled(): boolean {
  try {
    const saved = localStorage.getItem(NOTIFICATIONS_ENABLED_KEY);
    return saved !== null ? saved === 'true' : true;
  } catch {
    return true;
  }
}

/**
 * Set web notification toggle setting.
 */
export function setWebNotificationEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(NOTIFICATIONS_ENABLED_KEY, enabled ? 'true' : 'false');
  } catch (e) {
    console.error('Erro ao salvar preferência de notificação:', e);
  }
}

/**
 * Request notification permission from the user browser.
 */
export async function requestBrowserNotificationPermission(): Promise<BrowserNotificationPermission> {
  if (!isBrowserNotificationSupported()) {
    return 'unsupported';
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      setWebNotificationEnabled(true);
      // Play confirmation chime
      playNotificationChime('success');
      // Show sample test notification
      sendBrowserNotification('Notificações Ativadas!', {
        body: 'A Central de Cobrança Valora irá alertar você sempre que um novo lembrete agendado vencer.',
        tag: 'valora-welcome',
      });
    }
    return permission as BrowserNotificationPermission;
  } catch (err) {
    console.error('Erro ao solicitar permissão de notificação:', err);
    return 'denied';
  }
}

/**
 * Play a pleasant synthesized audio notification chime using Web Audio API.
 * Completely offline and requires no external audio assets.
 */
export function playNotificationChime(type: 'alert' | 'success' | 'urgent' = 'alert'): void {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'urgent') {
      // Two-tone urgent chime (880Hz -> 1174Hz)
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.setValueAtTime(1174.66, now + 0.12);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc.start(now);
      osc.stop(now + 0.45);
    } else if (type === 'success') {
      // Pleasant rising major third chime (523Hz -> 659Hz -> 784Hz)
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.setValueAtTime(659.25, now + 0.1);
      osc.frequency.setValueAtTime(783.99, now + 0.2);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      osc.start(now);
      osc.stop(now + 0.5);
    } else {
      // Standard gentle chime (587Hz -> 880Hz)
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now);
      osc.frequency.setValueAtTime(880, now + 0.09);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc.start(now);
      osc.stop(now + 0.4);
    }
  } catch {
    // Graceful fallback if Web Audio is blocked or not available
  }
}

/**
 * Dispatches a native browser notification if permissions are granted and setting is active.
 */
export function sendBrowserNotification(
  title: string,
  options?: NotificationOptions & { playAudio?: boolean; chimeType?: 'alert' | 'success' | 'urgent' }
): boolean {
  if (!isBrowserNotificationSupported() || !isWebNotificationEnabled()) {
    return false;
  }

  if (Notification.permission !== 'granted') {
    return false;
  }

  try {
    if (options?.playAudio !== false) {
      playNotificationChime(options?.chimeType || 'alert');
    }

    const notif = new Notification(title, {
      body: options?.body,
      icon: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23059669"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2zm-2 1H8v-6c0-2.48 1.51-4.5 4-4.5s4 2.02 4 4.5v6z"/></svg>',
      tag: options?.tag || `valora-notif-${Date.now()}`,
      requireInteraction: options?.requireInteraction || false,
      ...options,
    });

    notif.onclick = () => {
      window.focus();
      notif.close();
    };

    return true;
  } catch (err) {
    console.error('Erro ao disparar notificação do navegador:', err);
    return false;
  }
}

/**
 * Tracks which reminders have already sent a browser notification during this session
 * to avoid spamming the user on every tab reload.
 */
export function hasReminderBeenNotifiedThisSession(reminderId: string): boolean {
  try {
    const raw = sessionStorage.getItem(NOTIFIED_REMINDERS_SESSION_KEY);
    if (!raw) return false;
    const set = new Set<string>(JSON.parse(raw));
    return set.has(reminderId);
  } catch {
    return false;
  }
}

export function markReminderNotifiedThisSession(reminderId: string): void {
  try {
    const raw = sessionStorage.getItem(NOTIFIED_REMINDERS_SESSION_KEY);
    const list: string[] = raw ? JSON.parse(raw) : [];
    if (!list.includes(reminderId)) {
      list.push(reminderId);
      sessionStorage.setItem(NOTIFIED_REMINDERS_SESSION_KEY, JSON.stringify(list));
    }
  } catch (e) {
    console.error(e);
  }
}
