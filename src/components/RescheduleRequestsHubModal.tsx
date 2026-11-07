import React, { useState, useMemo } from 'react';
import {
  X,
  CalendarClock,
  Clock,
  MapPin,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  Filter,
  User,
  Calendar,
  ArrowRight,
  ShieldAlert,
  RotateCcw,
  Lock
} from 'lucide-react';
import { ClientProfile, RescheduleRequest } from '../data/mockData';
import { UserRole } from '../services/authGatekeeperService';

interface RescheduleRequestsHubModalProps {
  currentUserRole: UserRole;
  currentClientId?: string;
  clients: ClientProfile[];
  onClose: () => void;
  onReviewRequest?: (clientId: string, request: RescheduleRequest) => void;
  onCancelRequest?: (request: RescheduleRequest) => void;
}

type FilterStatus = 'all' | 'pending' | 'approved' | 'rejected' | 'cancelled';

export const RescheduleRequestsHubModal: React.FC<RescheduleRequestsHubModalProps> = ({
  currentUserRole,
  currentClientId,
  clients,
  onClose,
  onReviewRequest,
  onCancelRequest
}) => {
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const isClient = currentUserRole === 'client';

  // 1. Compile all requests across clients
  const allRequests = useMemo(() => {
    const list: Array<{ client: ClientProfile; request: RescheduleRequest }> = [];
    const seenRequestIds = new Set<string>();

    const targetClients = isClient && currentClientId
      ? clients.filter((c) => c.id === currentClientId)
      : clients;

    targetClients.forEach((c) => {
      // Pending request (strictly filter only active 'pending' status)
      if (
        c.pendingReschedule &&
        c.pendingReschedule.status === 'pending' &&
        !seenRequestIds.has(c.pendingReschedule.id)
      ) {
        seenRequestIds.add(c.pendingReschedule.id);
        list.push({ client: c, request: c.pendingReschedule });
      }

      // Historical requests
      if (c.rescheduleHistory && c.rescheduleHistory.length > 0) {
        c.rescheduleHistory.forEach((h) => {
          if (!seenRequestIds.has(h.id)) {
            seenRequestIds.add(h.id);
            list.push({ client: c, request: h });
          }
        });
      }
    });

    // Sort by requestedAt descending (newest first)
    return list.sort(
      (a, b) =>
        new Date(b.request.requestedAt).getTime() - new Date(a.request.requestedAt).getTime()
    );
  }, [clients, isClient, currentClientId]);

  // 2. Metrics calculation
  const metrics = useMemo(() => {
    let pending = 0;
    let approved = 0;
    let rejected = 0;
    let cancelled = 0;

    allRequests.forEach(({ request }) => {
      if (request.status === 'pending') pending++;
      else if (request.status === 'approved') approved++;
      else if (request.status === 'rejected') rejected++;
      else if (request.status === 'cancelled') cancelled++;
    });

    return { total: allRequests.length, pending, approved, rejected, cancelled };
  }, [allRequests]);

  // 3. Filter and search
  const filteredRequests = useMemo(() => {
    return allRequests.filter(({ client, request }) => {
      // Status filter
      if (filterStatus !== 'all' && request.status !== filterStatus) {
        return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const clientName = client.nama_lengkap.toLowerCase();
        const clientPhone = (client.telepon || '').toLowerCase();
        const reason = (request.reason || '').toLowerCase();
        const decisionNote = (request.decisionNote || '').toLowerCase();

        return (
          clientName.includes(query) ||
          clientPhone.includes(query) ||
          reason.includes(query) ||
          decisionNote.includes(query)
        );
      }

      return true;
    });
  }, [allRequests, filterStatus, searchQuery]);

  const formatDateTime = (isoDate: string) => {
    try {
      const d = new Date(isoDate);
      if (isNaN(d.getTime())) return isoDate;
      const dateStr = new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
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

  const getStatusBadge = (status: RescheduleRequest['status'], isLate?: boolean) => {
    switch (status) {
      case 'pending':
        return (
          <div className="flex items-center gap-1.5">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              Menunggu Review
            </span>
            {isLate && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-rose-500/15 text-rose-300 border border-rose-500/30">
                Mepet &lt;24h
              </span>
            )}
          </div>
        );
      case 'approved':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            Disetujui
          </span>
        );
      case 'rejected':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30 flex items-center gap-1">
            <XCircle className="w-3 h-3 text-rose-400" />
            Ditolak
          </span>
        );
      case 'cancelled':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-800 text-neutral-400 border border-neutral-700 flex items-center gap-1">
            <RotateCcw className="w-3 h-3 text-neutral-400" />
            Dibatalkan
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#070e1d]/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="reschedule-hub-title"
        className="w-full max-w-2xl max-h-[92vh] bg-[#111726]/95 backdrop-blur-2xl border border-white/[0.12] rounded-t-3xl sm:rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.6)] flex flex-col overflow-hidden"
      >
        <div className="w-10 h-1 rounded-full bg-[#2e3545] mx-auto mt-3 sm:hidden" />

        {/* Header */}
        <div className="px-5 py-4 border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0">
              <CalendarClock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="reschedule-hub-title" className="text-base font-bold text-white">
                  {isClient ? 'Riwayat Pengajuan Reschedule Sesi' : 'Daftar Pengajuan Reschedule Sesi PT'}
                </h2>
                {metrics.pending > 0 && !isClient && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {metrics.pending} Butuh Keputusan
                  </span>
                )}
              </div>
              <p className="text-xs text-[#bbcabf]">
                {isClient
                  ? 'Pantau status persetujuan jadwal latihan baru Anda'
                  : 'Manajemen persetujuan pergantian jadwal & kuota sesi Member'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup daftar reschedule"
            className="min-w-[44px] min-h-[44px] rounded-xl bg-[#232a3a] text-[#bbcabf] hover:text-white flex items-center justify-center transition active:scale-95"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Metrics Overview Bar */}
        <div className="px-5 py-3 bg-[#0b101b] border-b border-white/[0.06] grid grid-cols-4 gap-2">
          <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05] text-center">
            <span className="text-[10px] uppercase font-bold text-neutral-400 block">Total</span>
            <span className="text-sm font-bold text-white font-mono">{metrics.total}</span>
          </div>

          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
            <span className="text-[10px] uppercase font-bold text-amber-300 block">Review</span>
            <span className="text-sm font-bold text-amber-400 font-mono">{metrics.pending}</span>
          </div>

          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
            <span className="text-[10px] uppercase font-bold text-emerald-300 block">Disetujui</span>
            <span className="text-sm font-bold text-emerald-400 font-mono">{metrics.approved}</span>
          </div>

          <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-center">
            <span className="text-[10px] uppercase font-bold text-rose-300 block">Ditolak</span>
            <span className="text-sm font-bold text-rose-400 font-mono">{metrics.rejected}</span>
          </div>
        </div>

        {/* Filter Tabs & Search */}
        <div className="px-5 py-3 border-b border-white/[0.06] space-y-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {[
              { id: 'all', label: `Semua (${metrics.total})` },
              { id: 'pending', label: `Menunggu (${metrics.pending})` },
              { id: 'approved', label: `Disetujui (${metrics.approved})` },
              { id: 'rejected', label: `Ditolak (${metrics.rejected})` },
              { id: 'cancelled', label: `Dibatalkan (${metrics.cancelled})` }
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterStatus(tab.id as FilterStatus)}
                className={`min-h-[38px] px-3 rounded-xl text-xs font-semibold whitespace-nowrap transition active:scale-95 ${
                  filterStatus === tab.id
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                    : 'bg-[#0b101b] text-neutral-400 border border-white/[0.05] hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {!isClient && (
            <div className="relative">
              <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari nama member, telepon, atau alasan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full min-h-[44px] bg-[#070e1d] border border-white/[0.08] rounded-xl pl-10 pr-3.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500/60"
              />
            </div>
          )}
        </div>

        {/* Requests List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredRequests.length === 0 ? (
            <div className="text-center py-16 px-4">
              <CalendarClock className="w-10 h-10 text-neutral-600 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-semibold text-neutral-300">
                Tidak Ada Pengajuan Reschedule
              </p>
              <p className="text-xs text-neutral-500 mt-1 max-w-md mx-auto">
                {filterStatus !== 'all'
                  ? `Tidak ada pengajuan dengan status "${filterStatus}".`
                  : isClient
                  ? 'Anda belum pernah mengajukan pergantian jadwal sesi latihan.'
                  : 'Belum ada pengajuan pergantian jadwal dari Member Fitness Center.'}
              </p>
            </div>
          ) : (
            filteredRequests.map(({ client, request }) => (
              <div
                key={request.id}
                className={`p-4 rounded-2xl border transition-all space-y-3 ${
                  request.status === 'pending'
                    ? 'bg-[#121c2e] border-amber-500/30 shadow-md shadow-amber-950/20 ring-1 ring-amber-500/20'
                    : 'bg-[#0b101b] border-white/[0.06] text-neutral-300'
                }`}
              >
                {/* Header: Member Identity & Status Badge */}
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-full bg-gradient-to-tr ${
                        client.avatarBg || 'from-blue-500 to-indigo-600'
                      } flex items-center justify-center text-xs font-bold text-white shrink-0`}
                    >
                      {client.initials}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white truncate">
                          {client.nama_lengkap}
                        </span>
                        <span className="text-[10px] font-mono text-neutral-400 bg-white/[0.04] px-1.5 py-0.2 rounded">
                          {client.code}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-neutral-500 block">
                        Diajukan: {formatDateTime(request.requestedAt)}
                      </span>
                    </div>
                  </div>

                  <div>{getStatusBadge(request.status, request.isLateRequest)}</div>
                </div>

                {/* Schedule Comparison Box */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 rounded-xl bg-black/20 border border-white/[0.04]">
                  {/* Original */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
                      Jadwal Semula
                    </span>
                    <div className="flex items-center gap-1.5 text-xs text-neutral-400 line-through">
                      <Calendar className="w-3.5 h-3.5 text-neutral-500" />
                      <span>{request.originalDate} · {request.originalTime} WIB</span>
                    </div>
                    <span className="text-[11px] text-neutral-500 truncate block">
                      {request.originalLocation}
                    </span>
                  </div>

                  {/* Proposed */}
                  <div className="space-y-1 sm:border-l sm:border-white/[0.06] sm:pl-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">
                      Usulan Jadwal Baru
                    </span>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-300">
                      <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{request.proposedDate} · {request.proposedTime} WIB</span>
                    </div>
                    <span className="text-[11px] text-emerald-400/90 truncate block">
                      {request.proposedLocation}
                    </span>
                  </div>
                </div>

                {/* Reason */}
                <div className="text-xs space-y-1">
                  <span className="text-[11px] font-semibold text-neutral-400">Alasan:</span>
                  <p className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04] text-xs text-white italic">
                    “{request.reason}”
                  </p>
                </div>

                {/* Decision Info (if decided) */}
                {request.decidedAt && (
                  <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04] text-xs space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-neutral-400">
                      <span>
                        Diverifikasi oleh: <strong className="text-neutral-200">{request.decidedByName}</strong>
                      </span>
                      <span className="font-mono">{formatDateTime(request.decidedAt)}</span>
                    </div>
                    {request.decisionNote && (
                      <p className="text-[11px] text-[#bbcabf] pt-0.5">
                        Catatan: “{request.decisionNote}”
                      </p>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="pt-1 flex items-center justify-end gap-2">
                  {request.status === 'pending' && !isClient && onReviewRequest && (
                    <button
                      type="button"
                      onClick={() => {
                        onReviewRequest(client.id, request);
                        onClose();
                      }}
                      className="min-h-[44px] px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow-md transition active:scale-95"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-slate-950" />
                      <span>Tinjau &amp; Putuskan</span>
                    </button>
                  )}

                  {request.status === 'pending' && isClient && onCancelRequest && (
                    <button
                      type="button"
                      onClick={() => onCancelRequest(request)}
                      className="min-h-[44px] px-4 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-1.5 transition active:scale-95"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Batalkan Pengajuan Ini</span>
                    </button>
                  )}

                  {request.status !== 'pending' && (
                    <button
                      type="button"
                      disabled
                      className="min-h-[44px] px-3.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-neutral-500 text-xs font-mono font-medium flex items-center gap-1.5 cursor-not-allowed shadow-none"
                    >
                      <Lock className="w-3.5 h-3.5 text-neutral-500" />
                      <span>Sudah Diproses ({request.status.toUpperCase()})</span>
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-white/[0.08] bg-[#0b101b] flex items-center justify-between">
          <span className="text-xs text-neutral-400">
            Menampilkan {filteredRequests.length} dari {allRequests.length} pengajuan
          </span>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-4 rounded-xl bg-[#232a3a] text-[#bbcabf] hover:text-white text-xs font-semibold transition active:scale-95"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
