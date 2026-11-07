import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, CloudCheck, AlertCircle } from 'lucide-react';

interface OfflineSyncBadgeProps {
  className?: string;
  onShowDetail?: () => void;
}

export const OfflineSyncBadge: React.FC<OfflineSyncBadgeProps> = ({
  className = '',
  onShowDetail
}) => {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [showTooltip, setShowTooltip] = useState<boolean>(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      <button
        type="button"
        onClick={() => {
          if (onShowDetail) {
            onShowDetail();
          } else {
            setShowTooltip(!showTooltip);
          }
        }}
        aria-label={isOnline ? 'Status: Terhubung ke Cloud Firestore' : 'Status: Mode Offline Aktif'}
        className={`min-h-[28px] px-2 py-0.5 rounded-full text-[10px] font-medium font-mono flex items-center gap-1.5 transition-all select-none ${
          isOnline
            ? 'bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 text-emerald-400'
            : 'bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/35 text-amber-300 shadow-sm animate-pulse'
        }`}
        title={isOnline ? 'Koneksi Cloud Firestore Terhubung' : 'Offline: Cache Multi-Tab Aktif'}
      >
        {isOnline ? (
          <>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <Wifi className="w-3 h-3 text-emerald-400" />
            <span className="hidden sm:inline">Online</span>
          </>
        ) : (
          <>
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <WifiOff className="w-3 h-3 text-amber-300" />
            <span>Offline · Cache Aktif</span>
          </>
        )}
      </button>

      {/* Floating Info Tooltip */}
      {showTooltip && (
        <div className="absolute top-full mt-2 right-0 z-50 w-64 p-3 rounded-2xl bg-[#0e1626] border border-white/10 shadow-2xl text-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="font-bold text-white flex items-center gap-1.5">
              {isOnline ? (
                <>
                  <CloudCheck className="w-4 h-4 text-emerald-400" />
                  <span>Cloud Synced</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4 text-amber-400" />
                  <span>Lantai Gym Offline</span>
                </>
              )}
            </span>
            <button
              type="button"
              onClick={() => setShowTooltip(false)}
              className="text-neutral-400 hover:text-white text-xs px-1"
            >
              ✕
            </button>
          </div>
          <p className="text-[11px] text-neutral-300 leading-relaxed font-sans">
            {isOnline
              ? 'Terhubung dengan database Cloud Firestore. Semua logging sesi dan data member tersinkron secara real-time.'
              : 'Koneksi internet terputus. Multi-tab offline cache aktif — Anda tetap dapat mencatat sesi, input metrik, dan melihat jadwal di lantai gym. Data otomatis tersinkron saat kembali online.'}
          </p>
        </div>
      )}
    </div>
  );
};
