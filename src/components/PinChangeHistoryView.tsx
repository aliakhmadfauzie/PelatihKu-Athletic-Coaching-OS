import React, { useState, useEffect, useCallback } from 'react';
import { History, ShieldCheck, UserCheck, KeyRound, Clock, RefreshCw, Database } from 'lucide-react';
import { PinChangeLogEntry } from '../data/mockData';
import {
  fetchClientPinHistoryFromFirestore,
  subscribeToClientPinHistory
} from '../services/firestoreService';

export interface PinChangeHistoryViewProps {
  clientId?: string;
  history?: PinChangeLogEntry[];
  compact?: boolean;
  onRefresh?: () => void;
}

export const PinChangeHistoryView: React.FC<PinChangeHistoryViewProps> = ({
  clientId,
  history: initialHistory = [],
  compact = false,
  onRefresh
}) => {
  const [logList, setLogList] = useState<PinChangeLogEntry[]>(initialHistory);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isLiveConnected, setIsLiveConnected] = useState<boolean>(false);

  // Sync with prop changes if initialHistory updates
  useEffect(() => {
    if (initialHistory && initialHistory.length > 0) {
      setLogList(initialHistory);
    }
  }, [initialHistory]);

  // Real-time Firestore subscription if clientId is provided
  useEffect(() => {
    if (!clientId) return;

    let isMounted = true;
    setIsLoading(true);

    const unsubscribe = subscribeToClientPinHistory(
      clientId,
      (remoteHistory) => {
        if (!isMounted) return;
        if (remoteHistory && remoteHistory.length > 0) {
          setLogList(remoteHistory);
        } else if (initialHistory && initialHistory.length > 0) {
          setLogList(initialHistory);
        }
        setIsLoading(false);
        setIsLiveConnected(true);
      },
      (err) => {
        if (!isMounted) return;
        console.warn('[PinChangeHistoryView] Firestore subscription error:', err);
        setIsLoading(false);
        setIsLiveConnected(false);
      }
    );

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [clientId, initialHistory]);

  const handleManualRefresh = useCallback(async () => {
    if (onRefresh) {
      onRefresh();
    }
    if (!clientId) return;
    try {
      setIsLoading(true);
      const remote = await fetchClientPinHistoryFromFirestore(clientId);
      if (remote && remote.length > 0) {
        setLogList(remote);
        setIsLiveConnected(true);
      }
    } catch (e) {
      console.warn('[PinChangeHistoryView] Refresh error:', e);
    } finally {
      setIsLoading(false);
    }
  }, [clientId, onRefresh]);

  const formatDateTime = (isoDate: string) => {
    try {
      const d = new Date(isoDate);
      if (isNaN(d.getTime())) return isoDate;
      const dateStr = new Intl.DateTimeFormat('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }).format(d);
      const timeStr = new Intl.DateTimeFormat('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).format(d).replace(/\./g, ':');
      return `${dateStr} · ${timeStr} WIB`;
    } catch {
      return isoDate;
    }
  };

  const getRoleBadge = (role: 'client' | 'coach' | 'admin') => {
    switch (role) {
      case 'client':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-300">
            <UserCheck className="w-3 h-3 text-blue-400" />
            Member
          </span>
        );
      case 'coach':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            Coach
          </span>
        );
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300">
            <ShieldCheck className="w-3 h-3 text-amber-400" />
            Admin
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className={`space-y-3 ${compact ? '' : 'bg-[#141b2b] border border-white/[0.08] rounded-2xl p-4 sm:p-5'}`}>
      <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-blue-400" />
          <h4 className="text-xs sm:text-sm font-bold text-white">
            Riwayat Perubahan PIN Akses
          </h4>
        </div>
        <div className="flex items-center gap-2">
          {clientId && (
            <span
              className={`inline-flex items-center gap-1 text-[9px] font-mono px-2 py-0.5 rounded-full border ${
                isLiveConnected
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-white/[0.04] border-white/[0.06] text-neutral-400'
              }`}
              title={isLiveConnected ? 'Terhubung langsung ke Cloud Firestore' : 'Menggunakan cache lokal'}
            >
              <Database className="w-2.5 h-2.5" />
              <span>{isLiveConnected ? 'Cloud Live' : 'Lokal'}</span>
            </span>
          )}
          <span className="text-[10px] font-mono text-neutral-400 bg-white/[0.04] px-2 py-0.5 rounded border border-white/[0.06]">
            {logList.length} Catatan
          </span>
          {clientId && (
            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={isLoading}
              title="Sinkronisasi ulang riwayat PIN dari Cloud Database"
              className="min-h-[44px] min-w-[44px] p-2 flex items-center justify-center rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-neutral-400 hover:text-white transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-400' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {logList.length === 0 ? (
        <div className="text-center py-4 px-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
          <KeyRound className="w-6 h-6 text-neutral-500 mx-auto mb-1.5 opacity-60" />
          <p className="text-xs text-neutral-400">Belum ada riwayat pembaruan PIN.</p>
          <p className="text-[10px] text-neutral-500 mt-0.5">
            Akun masih menggunakan kredensial awal pendaftaran.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
          {logList.map((item, idx) => (
            <div
              key={item.id || `pin-log-${idx}`}
              className="p-3 rounded-xl bg-[#0b101b] border border-white/[0.05] hover:border-white/[0.1] transition-colors flex flex-col gap-1.5"
            >
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  {getRoleBadge(item.changedByRole)}
                  {item.changedByName && (
                    <span className="text-xs font-semibold text-white truncate max-w-[150px]">
                      {item.changedByName}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 text-[10px] font-mono text-neutral-400">
                  <Clock className="w-3 h-3 text-neutral-500" />
                  <span>{formatDateTime(item.changedAt)}</span>
                </div>
              </div>

              {item.note && (
                <p className="text-[11px] text-neutral-300 leading-relaxed pl-0.5">
                  {item.note}
                </p>
              )}

              <div className="flex items-center justify-between pt-1 border-t border-white/[0.04] text-[10px] text-neutral-400">
                <span className="text-emerald-400/90 flex items-center gap-1 font-medium">
                  <ShieldCheck className="w-3 h-3" /> Status: Terverifikasi
                </span>
                <span className="font-mono text-[9px] text-neutral-500">
                  REF: #{item.id.slice(-8)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
