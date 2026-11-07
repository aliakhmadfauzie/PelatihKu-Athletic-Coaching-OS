import React, { useState, useEffect } from 'react';
import {
  X,
  Bell,
  CheckCheck,
  Trash2,
  CalendarClock,
  CheckCircle2,
  AlertTriangle,
  Info,
  Volume2,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import {
  PushNotificationItem,
  getPushNotifications,
  subscribeToPushNotifications,
  filterNotificationsForUser,
  markPushNotificationAsRead,
  markAllPushNotificationsAsRead,
  markMultiplePushNotificationsAsRead,
  clearAllPushNotifications,
  getPushPermissionState,
  requestPushNotificationPermission,
  dispatchTestPushNotification
} from '../services/pushNotificationService';
import { UserRole } from '../services/authGatekeeperService';
import { RescheduleRequest } from '../data/mockData';

interface NotificationCenterModalProps {
  currentUserRole: UserRole;
  currentClientId?: string;
  onClose: () => void;
  onSelectClient?: (clientId: string) => void;
  onReviewRequest?: (clientId: string, request?: RescheduleRequest) => void;
}

export const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({
  currentUserRole,
  currentClientId,
  onClose,
  onSelectClient,
  onReviewRequest
}) => {
  const [notifications, setNotifications] = useState<PushNotificationItem[]>(getPushNotifications());
  const [permissionState, setPermissionState] = useState<NotificationPermission | 'unsupported'>(
    getPushPermissionState()
  );
  const [isTesting, setIsTesting] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = subscribeToPushNotifications((list) => {
      setNotifications(list);
    });
    return () => unsubscribe();
  }, []);

  // Filter notifications strictly for the active user identity/role
  const displayedNotifications = filterNotificationsForUser(
    notifications,
    currentUserRole,
    currentClientId
  );

  const handleRequestPermission = async () => {
    const res = await requestPushNotificationPermission();
    setPermissionState(res);
  };

  const handleTestPush = async () => {
    setIsTesting(true);
    await dispatchTestPushNotification(currentUserRole.toUpperCase());
    setTimeout(() => setIsTesting(false), 600);
  };

  const formatRelativeTime = (isoString: string): string => {
    try {
      const diffMs = Date.now() - new Date(isoString).getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'Baru saja';
      if (diffMins < 60) return `${diffMins} mnt lalu`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours} jam lalu`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays} hari lalu`;
    } catch {
      return '';
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'reschedule_request':
        return <CalendarClock className="w-4 h-4 text-amber-400" />;
      case 'reschedule_approved':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case 'reschedule_rejected':
        return <AlertTriangle className="w-4 h-4 text-rose-400" />;
      case 'reschedule_cancelled':
        return <Info className="w-4 h-4 text-neutral-400" />;
      default:
        return <Bell className="w-4 h-4 text-blue-400" />;
    }
  };

  const unreadCount = displayedNotifications.filter((n) => !n.read).length;

  const handleNotificationClick = (notif: PushNotificationItem) => {
    // Automatically tag as read immediately
    if (!notif.read) {
      markPushNotificationAsRead(notif.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
      );
    }

    if (notif.type === 'reschedule_request' && onReviewRequest) {
      onReviewRequest(
        notif.targetClientId || notif.metadata?.clientId || 'k-02',
        notif.metadata?.request
      );
      onClose();
      return;
    }
    if (notif.targetClientId && onSelectClient) {
      onSelectClient(notif.targetClientId);
      onClose();
    }
  };

  const handleMarkAllVisibleAsRead = () => {
    const unreadIds = displayedNotifications.filter((n) => !n.read).map((n) => n.id);
    if (unreadIds.length > 0) {
      markMultiplePushNotificationsAsRead(unreadIds);
      setNotifications((prev) =>
        prev.map((n) => (unreadIds.includes(n.id) ? { ...n, read: true } : n))
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#070e1d]/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-lg max-h-[90vh] bg-[#111726]/95 backdrop-blur-2xl border border-white/[0.12] rounded-t-3xl sm:rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.6)] flex flex-col overflow-hidden"
      >
        <div className="w-10 h-1 rounded-full bg-[#2e3545] mx-auto mt-3 sm:hidden" />

        {/* Header */}
        <div className="px-5 py-4 border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center shrink-0">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-white">
                  Pusat Notifikasi Push
                </h2>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    {unreadCount} Baru
                  </span>
                )}
              </div>
              <p className="text-xs text-[#bbcabf]">
                Notifikasi instan lantai gym &amp; pembaruan jadwal
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup pusat notifikasi"
            className="min-w-[44px] min-h-[44px] rounded-xl bg-[#232a3a] text-[#bbcabf] hover:text-white flex items-center justify-center transition active:scale-95"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Push Notification System Status & Permission Bar */}
        <div className="px-5 py-3 bg-[#0b101b] border-b border-white/[0.06] flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-xs">
            <Volume2 className="w-4 h-4 text-emerald-400" />
            <span className="text-neutral-300">Status Push Web:</span>
            <span
              className={`font-semibold px-2 py-0.5 rounded-full text-[10px] border ${
                permissionState === 'granted'
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                  : permissionState === 'denied'
                  ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                  : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
              }`}
            >
              {permissionState === 'granted'
                ? 'Aktif (Granted)'
                : permissionState === 'denied'
                ? 'Diblokir Browser'
                : 'Belum Diaktifkan'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {permissionState !== 'granted' && permissionState !== 'unsupported' && (
              <button
                type="button"
                onClick={handleRequestPermission}
                className="min-h-[44px] px-3.5 py-2 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 text-blue-300 text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition active:scale-95"
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span>Aktifkan Push</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleTestPush}
              disabled={isTesting}
              className="min-h-[44px] px-3.5 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition active:scale-95 disabled:opacity-50"
            >
              <Bell className={`w-3.5 h-3.5 shrink-0 ${isTesting ? 'animate-bounce text-emerald-400' : ''}`} />
              <span>Tes Push</span>
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 divide-y divide-white/[0.04]">
          {displayedNotifications.length === 0 ? (
            <div className="text-center py-12 px-4">
              <Bell className="w-8 h-8 text-neutral-600 mx-auto mb-2 opacity-50" />
              <p className="text-sm font-semibold text-neutral-300">Kotak Notifikasi Kosong</p>
              <p className="text-xs text-neutral-500 mt-1">
                Semua pembaruan reschedule dan pengingat sesi akan muncul di sini.
              </p>
            </div>
          ) : (
            displayedNotifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex gap-3 relative ${
                  notif.read
                    ? 'bg-[#0b101b]/60 border-white/[0.04] text-neutral-400 opacity-75 hover:opacity-100 hover:border-white/[0.08]'
                    : 'bg-[#121c2e] border-emerald-500/40 border-l-4 border-l-emerald-400 text-white shadow-md shadow-emerald-950/30 ring-1 ring-emerald-500/20 hover:border-emerald-500/60'
                }`}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                  notif.read ? 'bg-white/[0.04] text-neutral-400' : 'bg-emerald-500/15 text-emerald-300'
                }`}>
                  {getNotificationIcon(notif.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 truncate">
                      {!notif.read && (
                        <span className="w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-emerald-500/30 shrink-0" />
                      )}
                      <h4 className={`text-xs sm:text-sm truncate ${notif.read ? 'font-medium text-neutral-300' : 'font-bold text-white'}`}>
                        {notif.title}
                      </h4>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {!notif.read ? (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          Baru
                        </span>
                      ) : (
                        <span className="text-[10px] text-neutral-500 flex items-center gap-0.5 font-mono">
                          <CheckCheck className="w-3 h-3 text-neutral-500" />
                          <span>Dibaca</span>
                        </span>
                      )}
                      <span className="text-[10px] font-mono text-neutral-500">
                        {formatRelativeTime(notif.timestamp)}
                      </span>
                    </div>
                  </div>

                  <p className={`text-[11px] mt-1.5 leading-relaxed ${notif.read ? 'text-[#8b9890]' : 'text-[#d1ded5]'}`}>
                    {notif.body}
                  </p>

                  <div className="mt-2.5 flex items-center gap-2 flex-wrap">
                    {notif.type === 'reschedule_request' && onReviewRequest && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleNotificationClick(notif);
                        }}
                        className="min-h-[44px] px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500/20 to-emerald-400/20 hover:from-emerald-500/30 hover:to-emerald-400/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition active:scale-95 shadow-sm"
                      >
                        <CalendarClock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>Tinjau Permintaan (Review Popup)</span>
                      </button>
                    )}

                    {notif.targetClientId && notif.type !== 'reschedule_request' && (
                      <div className="flex items-center gap-1 text-[10px] text-blue-400 font-semibold hover:underline">
                        <ExternalLink className="w-3 h-3" />
                        <span>Buka Profil Member</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3 border-t border-white/[0.08] bg-[#0b101b] flex items-center justify-between">
          <button
            type="button"
            onClick={handleMarkAllVisibleAsRead}
            disabled={unreadCount === 0}
            className="min-h-[44px] px-3 py-1.5 rounded-xl text-xs font-semibold text-neutral-300 hover:text-white flex items-center gap-1.5 transition disabled:opacity-40"
          >
            <CheckCheck className="w-3.5 h-3.5 text-blue-400" />
            <span>Tandai Semua Dibaca</span>
          </button>

          <button
            type="button"
            onClick={clearAllPushNotifications}
            disabled={displayedNotifications.length === 0}
            className="min-h-[44px] px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-400/80 hover:text-rose-400 flex items-center gap-1.5 transition disabled:opacity-40"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Bersihkan</span>
          </button>
        </div>
      </div>
    </div>
  );
};
