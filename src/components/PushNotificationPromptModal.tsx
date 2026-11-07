import React, { useState, useEffect } from 'react';
import {
  Bell,
  BellRing,
  BellOff,
  CheckCircle2,
  X,
  Smartphone,
  ShieldCheck,
  Sparkles,
  Volume2
} from 'lucide-react';

interface PushNotificationPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNotify: (msg: string) => void;
}

export const PushNotificationPromptModal: React.FC<PushNotificationPromptModalProps> = ({
  isOpen,
  onClose,
  onNotify
}) => {
  if (!isOpen) return null;

  const [permissionState, setPermissionState] = useState<NotificationPermission>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'default';
  });

  const [isSupported, setIsSupported] = useState<boolean>(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (!('Notification' in window)) {
        setIsSupported(false);
      } else {
        setPermissionState(Notification.permission);
      }
    }
  }, []);

  const handleRequestPermission = async () => {
    if (!('Notification' in window)) {
      onNotify('Browser ini tidak mendukung Web Notifications API.');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setPermissionState(permission);
      if (permission === 'granted') {
        onNotify('Izin notifikasi perangkat berhasil diaktifkan!');
        // Fire a test welcome notification
        if ('vibrate' in navigator) {
          navigator.vibrate([150, 80, 150]);
        }
        new Notification('PelatihKu PRO — Notifikasi Aktif', {
          body: 'Notifikasi sesi gym floor & persetujuan jadwal kini terhubung ke perangkat Anda.',
          icon: '/favicon.ico'
        });
      } else if (permission === 'denied') {
        onNotify('Izin notifikasi ditolak melalui pengaturan browser.');
      }
    } catch {
      onNotify('Gagal meminta izin notifikasi.');
    }
  };

  const handleSendTestNotification = () => {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      onNotify('Aktifkan izin notifikasi terlebih dahulu.');
      return;
    }

    if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 200]);
    }

    new Notification('PelatihKu PRO — Sesi Istirahat Selesai!', {
      body: 'Waktu istirahat set (90 detik) telah usai. Bersiap untuk Set #3 bersama Coach Panji!',
      icon: '/favicon.ico'
    });

    onNotify('Uji coba notifikasi terkirim ke layar perangkat!');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="push-modal-title"
    >
      <div className="relative w-full max-w-md bg-[#0f172a] border border-white/10 rounded-3xl p-5 sm:p-6 space-y-5 text-white shadow-2xl my-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <BellRing className="w-5 h-5" />
            </div>
            <div>
              <h2 id="push-modal-title" className="text-base font-bold text-white">
                Notifikasi Perangkat (PWA Push)
              </h2>
              <p className="text-xs text-neutral-400">
                Layar kunci &amp; audio getar di lantai gym
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup Modal"
            className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-neutral-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Status Card */}
        <div className="p-4 rounded-2xl bg-[#17223b] border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-400 font-mono">Status Izin Perangkat:</span>
            {permissionState === 'granted' ? (
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold font-mono flex items-center gap-1.5">
                <CheckCircle2 className="w-3 h-3" />
                <span>Aktif (Granted)</span>
              </span>
            ) : permissionState === 'denied' ? (
              <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[11px] font-bold font-mono flex items-center gap-1.5">
                <BellOff className="w-3 h-3" />
                <span>Diblokir (Denied)</span>
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[11px] font-bold font-mono">
                Belum Diaktifkan
              </span>
            )}
          </div>

          <p className="text-xs text-neutral-300 leading-relaxed">
            {permissionState === 'granted'
              ? 'Perangkat Anda telah terdaftar untuk menerima pemberitahuan otomatis jadwal sesi, persetujuan reschedule, dan pengingat istirahat set di lantai gym.'
              : permissionState === 'denied'
              ? 'Izin notifikasi diblokir di browser Anda. Untuk mengaktifkannya kembali, buka Pengaturan Situs di browser dan ubah izin Notifikasi ke "Izinkan".'
              : 'Aktifkan notifikasi browser agar Anda menerima peringatan jadwal sesi, persetujuan reschedule oleh Coach Panji, dan alarm istirahat set bahkan saat aplikasi berjalan di latar belakang.'}
          </p>
        </div>

        {/* Benefits List */}
        <div className="space-y-2 text-xs">
          <span className="font-semibold text-neutral-300 block">Fitur Notifikasi Aktif:</span>
          <div className="space-y-1.5 text-neutral-300">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Alarm istirahat set gym floor (Web Audio + Getar HP).</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Alert persetujuan atau penolakan jadwal reschedule instan.</span>
            </div>
            <div className="flex items-center gap-2">
              <Smartphone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Pengingat sesi PT 2 jam sebelum latihan dimulai.</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="border-t border-white/10 pt-4 flex flex-col sm:flex-row items-center justify-end gap-2.5">
          {permissionState === 'granted' ? (
            <button
              type="button"
              onClick={handleSendTestNotification}
              className="w-full sm:w-auto min-h-[46px] px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold flex items-center justify-center gap-2 transition"
            >
              <Volume2 className="w-4 h-4 text-emerald-400" />
              <span>Uji Coba Notifikasi Gym</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleRequestPermission}
              disabled={permissionState === 'denied' || !isSupported}
              className="w-full sm:w-auto min-h-[46px] px-5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 text-xs font-bold flex items-center justify-center gap-2 transition shadow-md shadow-emerald-500/20"
            >
              <BellRing className="w-4 h-4 stroke-[2.2]" />
              <span>Aktifkan Notifikasi Sekarang</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto min-h-[46px] px-4 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 text-xs font-semibold transition"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
