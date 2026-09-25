import { Patient } from '../types';

export interface AppNotification {
  id: string;
  type: 'intake_received' | 'session_reminder' | 'payment_received' | 'system';
  title: string;
  message: string;
  patientId?: string;
  patientName?: string;
  createdAt: string;
  read: boolean;
}

export interface SystemVersionInfo {
  version: string;
  buildId: string;
  releasedAt: string;
  notes: string;
}

const NOTIFICATIONS_STORAGE_KEY = 'clinica_ana_lima_notifications_v1';
const LAST_SEEN_VERSION_KEY = 'clinica_ana_lima_last_seen_version_v1';

// Sintetizador Web Audio API: toca um som suave ("chime" de 2 tons E5 -> B5)
export function playNotificationChime(): void {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();

    // Tom 1: E5 (659.25 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, ctx.currentTime);

    gain1.gain.setValueAtTime(0, ctx.currentTime);
    gain1.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.05);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);

    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.35);

    // Tom 2: B5 (987.77 Hz) - acorde de confirmação suave
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(987.77, ctx.currentTime + 0.12);

    gain2.gain.setValueAtTime(0, ctx.currentTime + 0.12);
    gain2.gain.linearRampToValueAtTime(0.22, ctx.currentTime + 0.16);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.65);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    osc2.start(ctx.currentTime + 0.12);
    osc2.stop(ctx.currentTime + 0.65);
  } catch (error) {
    console.warn('Web Audio indisponível ou aguardando interação do usuário:', error);
  }
}

// Aciona vibração física nativa do aparelho Android
export function triggerAndroidVibration(pattern: number[] = [200, 100, 200]): void {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(pattern);
    }
  } catch {
    // ignora em dispositivos sem motor de vibração
  }
}

// Atualiza a bolinha (Badge) nativa no ícone do aplicativo na tela inicial do Android / PC
export function updateAppIconBadge(unreadCount: number): void {
  try {
    if (typeof navigator !== 'undefined') {
      if (unreadCount > 0 && typeof (navigator as any).setAppBadge === 'function') {
        (navigator as any).setAppBadge(unreadCount).catch(() => {});
      } else if (unreadCount === 0 && typeof (navigator as any).clearAppBadge === 'function') {
        (navigator as any).clearAppBadge().catch(() => {});
      }
    }
  } catch {
    // ignora se o navegador não suportar Badging API
  }
}

// Solicita permissão para notificações nativas do navegador / celular Android
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (e) {
    console.warn('Erro ao solicitar permissão de notificações:', e);
    return 'denied';
  }
}

// Dispara notificação nativa do sistema operacional (Prioriza ServiceWorkerRegistration.showNotification para Android Heads-Up Banner)
export async function sendNativeNotification(options: {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  data?: any;
  actionTitle?: string;
  onClick?: () => void;
}): Promise<void> {
  if (typeof window === 'undefined' || !('Notification' in window)) return;

  triggerAndroidVibration([200, 100, 200]);

  if (Notification.permission !== 'granted') return;

  const iconUrl = options.icon || '/pwa-192x192.png?v=7';
  const notifTag = options.tag || `clinica-ana-lima-${Date.now()}`;

  // 1. Tenta via Service Worker (Obrigatório no Android Chrome/WebAPK para exibir Heads-Up Banner nativo e ações)
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg && typeof reg.showNotification === 'function') {
        await reg.showNotification(options.title, {
          body: options.body,
          icon: iconUrl,
          badge: iconUrl,
          tag: notifTag,
          renotify: true,
          vibrate: [200, 100, 200],
          data: options.data || {},
          actions: options.actionTitle
            ? [{ action: 'open', title: options.actionTitle }]
            : [{ action: 'open', title: '✨ Abrir no App' }]
        } as any);
        return;
      }
    } catch (swErr) {
      console.warn('Fallback para Notification constructor:', swErr);
    }
  }

  // 2. Fallback para Desktop (macOS / Windows)
  try {
    const notif = new Notification(options.title, {
      body: options.body,
      icon: iconUrl,
      badge: iconUrl,
      tag: notifTag,
      silent: false,
    });

    if (options.onClick) {
      notif.onclick = () => {
        window.focus();
        options.onClick!();
        notif.close();
      };
    }
  } catch (e) {
    console.warn('Falha ao emitir notificação nativa:', e);
  }
}

export const notificationService = {
  getNotifications(): AppNotification[] {
    try {
      const raw = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  saveNotifications(list: AppNotification[]): void {
    try {
      const trimmed = list.slice(0, 30);
      localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(trimmed));
      const unread = trimmed.filter(n => !n.read).length;
      updateAppIconBadge(unread);
    } catch (e) {
      console.warn('Erro ao salvar notificações locais:', e);
    }
  },

  notifyNewIntake(patient: Patient, onReviewClick?: () => void): AppNotification {
    playNotificationChime();

    sendNativeNotification({
      title: '✨ Novo Pré-Cadastro Recebido!',
      body: `${patient.name} acabou de preencher a ficha cadastral no consultório. Toque para conferir e agendar.`,
      tag: `intake-${patient.id}`,
      actionTitle: '📋 Conferir Ficha',
      data: { type: 'intake_received', patientId: patient.id },
      onClick: onReviewClick
    });

    const notif: AppNotification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type: 'intake_received',
      title: 'Novo Pré-Cadastro de Paciente',
      message: `${patient.name} preencheu a ficha de acolhimento. Modalidade: ${patient.preferredModality}.`,
      patientId: patient.id,
      patientName: patient.name,
      createdAt: new Date().toISOString(),
      read: false
    };

    const current = this.getNotifications();
    current.unshift(notif);
    this.saveNotifications(current);
    window.dispatchEvent(new CustomEvent('clinica-notifications-updated'));

    return notif;
  },

  notifySystemUpdate(versionInfo: SystemVersionInfo): AppNotification {
    playNotificationChime();

    sendNativeNotification({
      title: `✨ Sistema Atualizado (v${versionInfo.version})`,
      body: versionInfo.notes,
      tag: `system-update-${versionInfo.version}`,
      actionTitle: '✨ Ver Novidades',
      data: { type: 'system_update', version: versionInfo.version }
    });

    const notif: AppNotification = {
      id: `notif-update-${versionInfo.version}`,
      type: 'system',
      title: `Atualização Instalada (v${versionInfo.version})`,
      message: `${versionInfo.notes} (${versionInfo.releasedAt})`,
      createdAt: new Date().toISOString(),
      read: false
    };

    const current = this.getNotifications().filter(n => n.id !== notif.id);
    current.unshift(notif);
    this.saveNotifications(current);
    window.dispatchEvent(new CustomEvent('clinica-notifications-updated'));

    return notif;
  },

  getLastSeenVersion(): string | null {
    return localStorage.getItem(LAST_SEEN_VERSION_KEY);
  },

  setLastSeenVersion(version: string): void {
    localStorage.setItem(LAST_SEEN_VERSION_KEY, version);
  },

  markAsRead(id: string): void {
    const list = this.getNotifications().map(n => n.id === id ? { ...n, read: true } : n);
    this.saveNotifications(list);
    window.dispatchEvent(new CustomEvent('clinica-notifications-updated'));
  },

  markAllAsRead(): void {
    const list = this.getNotifications().map(n => ({ ...n, read: true }));
    this.saveNotifications(list);
    window.dispatchEvent(new CustomEvent('clinica-notifications-updated'));
  },

  getUnreadCount(): number {
    return this.getNotifications().filter(n => !n.read).length;
  }
};
