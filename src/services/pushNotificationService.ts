import { RescheduleRequest } from '../data/mockData';

export type PushNotificationType =
  | 'reschedule_request'
  | 'reschedule_approved'
  | 'reschedule_rejected'
  | 'reschedule_cancelled'
  | 'session_reminder'
  | 'system_alert';

export interface PushNotificationItem {
  id: string;
  type: PushNotificationType;
  title: string;
  body: string;
  timestamp: string;
  read: boolean;
  targetRole?: 'all' | 'coach' | 'admin' | 'client';
  targetClientId?: string;
  actionUrl?: string;
  priority?: 'high' | 'normal' | 'low';
  metadata?: Record<string, any>;
}

const STORAGE_KEY = 'pelatihku_push_notifications_v2';
const listeners: Set<(notifications: PushNotificationItem[]) => void> = new Set();

/**
 * In-memory store initialized with persistent local storage or defaults.
 */
let inMemoryNotifications: PushNotificationItem[] = [];

// Initialize store from localStorage if available
function initStore(): void {
  try {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          inMemoryNotifications = parsed;
          return;
        }
      }
    }
  } catch {
    // Ignore storage errors
  }

  // Initial seed alerts for demonstration & immediate review experience
  const defaultInitialNotifs: PushNotificationItem[] = [
    {
      id: 'notif-reschedule-k02-mock',
      type: 'reschedule_request',
      title: 'Pengajuan Reschedule Sesi PT — Siti Rahmawati',
      body: 'Siti Rahmawati mengajukan pindah ke 2026-11-07 (10:00 WIB) di SCBD District 8. Alasan: "Jadwal Bentrok — Meeting dadakan di kantor pusat SCBD".',
      timestamp: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
      read: false,
      targetRole: 'coach',
      targetClientId: 'k-02',
      priority: 'high',
      actionUrl: '/?reviewReschedule=k-02',
      metadata: {
        requestId: 'rsch-k02-mock-1',
        clientId: 'k-02',
        request: {
          id: 'rsch-k02-mock-1',
          clientId: 'k-02',
          clientName: 'Siti Rahmawati',
          clientPhone: '6281234567802',
          originalDate: '2026-11-05',
          originalTime: '17:30',
          originalLocation: 'SCBD District 8',
          proposedDate: '2026-11-07',
          proposedTime: '10:00',
          proposedLocation: 'SCBD District 8',
          reason: 'Jadwal Bentrok — Meeting dadakan di kantor pusat SCBD',
          requestedAt: '2026-11-05T08:30:00.000Z',
          requestedByRole: 'client',
          requestedByName: 'Siti Rahmawati',
          status: 'pending',
          isLateRequest: false,
          hoursLeadTime: 33.0
        }
      }
    },
    {
      id: 'notif-init-1',
      type: 'system_alert',
      title: 'PelatihKu Athletic OS Aktif',
      body: 'Sistem notifikasi push & offline PWA siap memantau jadwal lantai gym.',
      timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
      read: false,
      priority: 'normal'
    }
  ];

  try {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // If saved list has no reschedule request, merge the default reschedule alert
          const hasRescheduleAlert = parsed.some((n: PushNotificationItem) => n.type === 'reschedule_request');
          if (!hasRescheduleAlert) {
            inMemoryNotifications = [defaultInitialNotifs[0], ...parsed];
          } else {
            inMemoryNotifications = parsed;
          }
          return;
        }
      }
    }
  } catch {
    // Ignore storage errors
  }

  inMemoryNotifications = defaultInitialNotifs;
}

initStore();

function persistStore(): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(inMemoryNotifications.slice(0, 50)));
    }
  } catch {
    // Ignore storage quota errors
  }
  notifyListeners();
}

function notifyListeners(): void {
  listeners.forEach((fn) => {
    try {
      fn([...inMemoryNotifications]);
    } catch (err) {
      console.warn('[PushNotificationService] Listener error:', err);
    }
  });
}

/**
 * Checks if Web Push / Notification API is supported by the current browser.
 */
export function isPushNotificationSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'Notification' in window;
}

/**
 * Returns current Notification permission state.
 */
export function getPushPermissionState(): NotificationPermission | 'unsupported' {
  if (!isPushNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

/**
 * Requests browser permission to show system push notifications.
 */
export async function requestPushNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!isPushNotificationSupported()) return 'unsupported';
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (err) {
    console.warn('[PushNotificationService] Failed to request permission:', err);
    return Notification.permission;
  }
}

/**
 * Generates an acoustic feedback chime via Web Audio API for high-urgency gym floor notifications.
 */
export function playNotificationSound(): void {
  try {
    if (typeof window === 'undefined') return;
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    // Arpeggiated two-tone pleasant chime (587.33 Hz D5 -> 880 Hz A5)
    osc.frequency.setValueAtTime(587.33, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12);

    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch {
    // Ignore autoplay or audio context restriction
  }
}

/**
 * Dispatches a push notification both locally in-app and to the system tray (via Web Push / Notification API).
 */
export async function dispatchPushNotification(
  item: Omit<PushNotificationItem, 'id' | 'timestamp' | 'read'>
): Promise<PushNotificationItem> {
  const newNotif: PushNotificationItem = {
    ...item,
    id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toISOString(),
    read: false
  };

  // 1. Add to local store
  inMemoryNotifications = [newNotif, ...inMemoryNotifications];
  persistStore();

  // 2. Play acoustic chime & mobile haptic vibration
  playNotificationSound();
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate([150, 50, 150]);
    } catch {
      // Ignore vibration error
    }
  }

  // 3. Trigger native System Notification if permission granted
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    try {
      // Try ServiceWorker registration first for rich PWA notification
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        if (registration && registration.showNotification) {
          await registration.showNotification(newNotif.title, {
            body: newNotif.body,
            icon: '/icons/icon-192.svg',
            badge: '/icons/icon-192.svg',
            tag: newNotif.type,
            data: { url: newNotif.actionUrl || '/' }
          });
          return newNotif;
        }
      }

      // Fallback to standard Window Notification
      new Notification(newNotif.title, {
        body: newNotif.body,
        icon: '/icons/icon-192.svg',
        tag: newNotif.type
      });
    } catch (err) {
      console.warn('[PushNotificationService] Failed to display system notification:', err);
    }
  }

  return newNotif;
}

/**
 * Pre-built notification trigger: Member requests reschedule
 */
export async function notifyRescheduleRequested(request: RescheduleRequest): Promise<PushNotificationItem> {
  const lateBadge = request.isLateRequest ? ' ⚠️ [Mepet <24 Jam]' : '';
  return dispatchPushNotification({
    type: 'reschedule_request',
    title: `Pengajuan Reschedule Sesi PT${lateBadge}`,
    body: `${request.clientName} mengajukan pindah ke ${request.proposedDate} (${request.proposedTime} WIB) di ${request.proposedLocation}. Alasan: "${request.reason}".`,
    targetRole: 'coach',
    targetClientId: request.clientId,
    priority: request.isLateRequest ? 'high' : 'normal',
    actionUrl: `/?reviewReschedule=${request.clientId}`,
    metadata: { requestId: request.id, clientId: request.clientId, request }
  });
}

/**
 * Pre-built notification trigger: Coach or Admin approves reschedule
 */
export async function notifyRescheduleApproved(
  request: RescheduleRequest,
  approverName: string
): Promise<PushNotificationItem> {
  return dispatchPushNotification({
    type: 'reschedule_approved',
    title: 'Jadwal Sesi PT Disetujui ✅',
    body: `Sesi latihan Anda resmi dipindahkan ke ${request.proposedDate} jam ${request.proposedTime} WIB di ${request.proposedLocation} oleh ${approverName}.`,
    targetRole: 'client',
    targetClientId: request.clientId,
    priority: 'high',
    metadata: { requestId: request.id, clientId: request.clientId }
  });
}

/**
 * Pre-built notification trigger: Coach or Admin rejects reschedule
 */
export async function notifyRescheduleRejected(
  request: RescheduleRequest,
  rejectorName: string,
  reason: string
): Promise<PushNotificationItem> {
  return dispatchPushNotification({
    type: 'reschedule_rejected',
    title: 'Permintaan Reschedule Ditolak ⚠️',
    body: `Pengajuan ganti jadwal ditolak oleh ${rejectorName}. Catatan: "${reason}". Sesi tetap sesuai jadwal awal (${request.originalDate} ${request.originalTime} WIB).`,
    targetRole: 'client',
    targetClientId: request.clientId,
    priority: 'normal',
    metadata: { requestId: request.id, clientId: request.clientId }
  });
}

/**
 * Pre-built notification trigger: Cancellation
 */
export async function notifyRescheduleCancelled(request: RescheduleRequest): Promise<PushNotificationItem> {
  return dispatchPushNotification({
    type: 'reschedule_cancelled',
    title: 'Pengajuan Reschedule Dibatalkan ℹ️',
    body: `Permintaan pindah jadwal sesi ${request.clientName} telah dibatalkan oleh pemohon.`,
    targetRole: 'coach',
    targetClientId: request.clientId,
    priority: 'low'
  });
}

/**
 * Test push notification dispatcher
 */
export async function dispatchTestPushNotification(role: string = 'User'): Promise<PushNotificationItem> {
  return dispatchPushNotification({
    type: 'system_alert',
    title: 'Uji Coba Push Notification PelatihKu PRO 🔔',
    body: `Notifikasi audio & visual berhasil diterima di perangkat Anda (${role}). Siap digunakan di lantai gym!`,
    priority: 'normal'
  });
}

/**
 * Subscribes to changes in push notifications.
 */
export function subscribeToPushNotifications(
  callback: (notifications: PushNotificationItem[]) => void
): () => void {
  listeners.add(callback);
  callback([...inMemoryNotifications]);
  return () => {
    listeners.delete(callback);
  };
}

export function getPushNotifications(): PushNotificationItem[] {
  return [...inMemoryNotifications];
}

/**
 * Filters notification items based on the viewer's role and identity.
 * - Coach only sees notifications targeted to 'coach' or 'all' (never 'client' alone).
 * - Admin sees 'admin', 'coach', and 'all'.
 * - Client sees 'client' (matching targetClientId if present) or 'all'.
 */
export function filterNotificationsForUser(
  notifications: PushNotificationItem[],
  role: 'coach' | 'admin' | 'client' | string,
  clientId?: string
): PushNotificationItem[] {
  return notifications.filter((notif) => {
    // If notif is for everyone or no specific role, show to all
    if (!notif.targetRole || notif.targetRole === 'all') {
      return true;
    }

    if (role === 'admin') {
      // Admin sees admin and coach notifications, plus general system alerts
      return notif.targetRole === 'admin' || notif.targetRole === 'coach';
    }

    if (role === 'coach') {
      // Coach ONLY sees notifications meant for coach!
      return notif.targetRole === 'coach';
    }

    if (role === 'client') {
      // Client only sees notifications meant for client
      if (notif.targetRole !== 'client') {
        return false;
      }
      // If a specific clientId is targeted, ensure it matches this client
      if (notif.targetClientId && clientId) {
        return notif.targetClientId === clientId;
      }
      return true;
    }

    return false;
  });
}

export function markPushNotificationAsRead(id: string): void {
  inMemoryNotifications = inMemoryNotifications.map((n) => (n.id === id ? { ...n, read: true } : n));
  persistStore();
}

export function markMultiplePushNotificationsAsRead(ids: string[]): void {
  const idSet = new Set(ids);
  inMemoryNotifications = inMemoryNotifications.map((n) => (idSet.has(n.id) ? { ...n, read: true } : n));
  persistStore();
}

export function markAllPushNotificationsAsRead(): void {
  inMemoryNotifications = inMemoryNotifications.map((n) => ({ ...n, read: true }));
  persistStore();
}

export function clearAllPushNotifications(): void {
  inMemoryNotifications = [];
  persistStore();
}
