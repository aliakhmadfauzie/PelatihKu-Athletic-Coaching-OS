import React, { useState } from 'react';
import {
  CalendarClock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  MapPin,
  ArrowRight,
  ShieldAlert,
  User,
  MessageSquare,
  ExternalLink
} from 'lucide-react';
import { RescheduleRequest } from '../data/mockData';
import { UserRole } from '../services/authGatekeeperService';
import {
  canApproveReschedule,
  canRejectReschedule,
  canCancelReschedule
} from '../services/rescheduleMatrixService';

interface RescheduleApprovalBannerProps {
  request: RescheduleRequest;
  currentUserRole: UserRole;
  onApprove: (request: RescheduleRequest, note?: string) => void;
  onReject: (request: RescheduleRequest, reason: string) => void;
  onCancel: (request: RescheduleRequest) => void;
  onOpenReview?: (request: RescheduleRequest) => void;
  compact?: boolean;
}

export const RescheduleApprovalBanner: React.FC<RescheduleApprovalBannerProps> = ({
  request,
  currentUserRole,
  onApprove,
  onReject,
  onCancel,
  onOpenReview,
  compact = false
}) => {
  const [showRejectInput, setShowRejectInput] = useState<boolean>(false);
  const [rejectReason, setRejectReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const canApprove = canApproveReschedule(currentUserRole, request);
  const canReject = canRejectReschedule(currentUserRole, request);
  const canCancel = canCancelReschedule(currentUserRole, request);

  const handleConfirmApprove = () => {
    setIsSubmitting(true);
    onApprove(request, 'Disetujui sesuai matrix penjadwalan gym floor.');
    setIsSubmitting(false);
  };

  const handleConfirmReject = () => {
    if (!rejectReason.trim()) return;
    setIsSubmitting(true);
    onReject(request, rejectReason.trim());
    setIsSubmitting(false);
    setShowRejectInput(false);
  };

  return (
    <div
      className={`rounded-2xl border transition-all ${
        request.isLateRequest
          ? 'bg-[#1b1511] border-amber-500/30'
          : 'bg-[#111927] border-blue-500/30'
      } ${compact ? 'p-3.5' : 'p-4 sm:p-5'}`}
    >
      {/* Top Meta Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap border-b border-white/[0.08] pb-3">
        <div className="flex items-center gap-2">
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
              request.isLateRequest
                ? 'bg-amber-500/15 text-amber-400'
                : 'bg-blue-500/15 text-blue-400'
            }`}
          >
            <CalendarClock className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs sm:text-sm font-bold text-white">
                Permintaan Reschedule Sesi
              </h4>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">
                Menunggu Persetujuan
              </span>
            </div>
            <p className="text-[11px] text-[#bbcabf] flex items-center gap-1.5 mt-0.5">
              <User className="w-3 h-3 text-neutral-400" />
              <span>
                Diajukan oleh {request.requestedByName} ({request.requestedByRole.toUpperCase()})
              </span>
            </p>
          </div>
        </div>

        {/* Reschedule Matrix Lead Time Policy Badge */}
        <div className="flex items-center gap-1.5">
          {request.isLateRequest ? (
            <span
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30"
              title="Diajukan kurang dari 24 jam sebelum sesi"
            >
              <AlertTriangle className="w-3 h-3 text-amber-400" />
              <span>Matrix SOP: Mepet (&lt;24 Jam)</span>
            </span>
          ) : (
            <span
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
              title="Diajukan lebih dari 24 jam sebelum sesi"
            >
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>Matrix SOP: Standar (Bebas Kuota)</span>
            </span>
          )}
        </div>
      </div>

      {/* Schedule Comparison Grid */}
      <div className="py-3.5 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Original Schedule */}
        <div className="p-3 rounded-xl bg-[#0b101b] border border-white/[0.05]">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 block mb-1">
            Jadwal Semula
          </span>
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-neutral-300 line-through opacity-80">
              <Clock className="w-3.5 h-3.5 text-neutral-500" />
              <span>{request.originalDate} · {request.originalTime} WIB</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-neutral-400 line-through opacity-80">
              <MapPin className="w-3 h-3 text-neutral-500" />
              <span>{request.originalLocation}</span>
            </div>
          </div>
        </div>

        {/* Proposed Schedule */}
        <div className="p-3 rounded-xl bg-emerald-500/[0.08] border border-emerald-500/25">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
              Usulan Jadwal Baru
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-emerald-400 hidden sm:block" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-white">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              <span>{request.proposedDate} · {request.proposedTime} WIB</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-300/90 font-medium">
              <MapPin className="w-3 h-3 text-emerald-400" />
              <span>{request.proposedLocation}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Reason Box */}
      <div className="px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.05] text-xs text-neutral-300 flex items-start gap-2 mb-3">
        <MessageSquare className="w-3.5 h-3.5 text-neutral-400 mt-0.5 shrink-0" />
        <div>
          <span className="font-semibold text-white">Alasan: </span>
          <span>{request.reason}</span>
        </div>
      </div>

      {/* Rejection Form Input */}
      {showRejectInput && (
        <div className="p-3 mb-3 rounded-xl bg-rose-500/10 border border-rose-500/30 space-y-2">
          <label className="block text-xs font-semibold text-rose-300">
            Alasan Penolakan Reschedule (Akan dikirim ke Member):
          </label>
          <input
            type="text"
            required
            placeholder="Contoh: Slot jam 16:30 penuh, mohon pilih slot alternatif jam 18:30"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            className="w-full min-h-[44px] bg-[#070e1d] border border-white/[0.12] rounded-xl px-3 text-xs text-white focus:outline-none focus:border-rose-500"
          />
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowRejectInput(false)}
              className="min-h-[38px] px-3 py-1.5 rounded-lg bg-neutral-800 text-neutral-300 text-xs font-semibold"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={!rejectReason.trim() || isSubmitting}
              onClick={handleConfirmReject}
              className="min-h-[38px] px-3.5 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-400 text-white text-xs font-bold transition disabled:opacity-50"
            >
              Konfirmasi Tolak
            </button>
          </div>
        </div>
      )}

      {/* Actions Section based on Approval Matrix */}
      <div className="pt-2 border-t border-white/[0.08] flex items-center justify-between gap-2 flex-wrap">
        {canApprove ? (
          <>
            <div className="flex items-center gap-1.5 text-[11px] text-neutral-400">
              <ShieldAlert className="w-3.5 h-3.5 text-emerald-400" />
              <span>Otorisasi: {currentUserRole === 'coach' ? 'Head Coach' : 'Admin Operations'}</span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {onOpenReview && (
                <button
                  type="button"
                  onClick={() => onOpenReview(request)}
                  className="min-h-[44px] px-3 py-2 rounded-xl bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 text-blue-300 text-xs font-semibold flex items-center gap-1.5 transition active:scale-95"
                  title="Buka popup review permintaan lengkap"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
                  <span>Tinjau di Popup</span>
                </button>
              )}

              {canReject && !showRejectInput && (
                <button
                  type="button"
                  onClick={() => setShowRejectInput(true)}
                  disabled={isSubmitting}
                  className="min-h-[44px] px-3.5 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-1.5 transition active:scale-95"
                >
                  <XCircle className="w-3.5 h-3.5 text-rose-400" />
                  <span>Tolak Permintaan</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleConfirmApprove}
                disabled={isSubmitting}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 transition active:scale-95"
              >
                <CheckCircle2 className="w-4 h-4 text-slate-950" />
                <span>Setujui Jadwal Baru</span>
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="text-xs text-neutral-400 italic">
              Pengajuan Anda sedang ditinjau oleh Head Coach Panji atau Admin.
            </div>

            {canCancel && (
              <button
                type="button"
                onClick={() => onCancel(request)}
                className="min-h-[44px] px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold flex items-center gap-1.5 transition active:scale-95"
              >
                <XCircle className="w-3.5 h-3.5 text-neutral-400" />
                <span>Batalkan Pengajuan</span>
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};
