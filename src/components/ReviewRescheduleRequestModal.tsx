import React, { useState } from 'react';
import {
  X,
  CalendarClock,
  Clock,
  MapPin,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  MessageCircle,
  Dumbbell,
  User,
  Calendar,
  Send,
  Sparkles,
  Info
} from 'lucide-react';
import { ClientProfile, RescheduleRequest } from '../data/mockData';
import { UserRole } from '../services/authGatekeeperService';
import {
  canApproveReschedule,
  canRejectReschedule,
  canCancelReschedule,
  evaluateReschedulePolicy
} from '../services/rescheduleMatrixService';

interface ReviewRescheduleRequestModalProps {
  client: ClientProfile;
  request: RescheduleRequest;
  currentUserRole: UserRole;
  currentUserDisplayName?: string;
  onClose: () => void;
  onApprove: (request: RescheduleRequest, note?: string) => void;
  onReject: (request: RescheduleRequest, reason: string) => void;
  onCancel: (request: RescheduleRequest) => void;
}

export const ReviewRescheduleRequestModal: React.FC<ReviewRescheduleRequestModalProps> = ({
  client,
  request,
  currentUserRole,
  currentUserDisplayName,
  onClose,
  onApprove,
  onReject,
  onCancel
}) => {
  const [decisionNote, setDecisionNote] = useState<string>('');
  const [isRejectMode, setIsRejectMode] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const canApprove = canApproveReschedule(currentUserRole, request);
  const canReject = canRejectReschedule(currentUserRole, request);
  const canCancel = canCancelReschedule(currentUserRole, request);

  const policy = evaluateReschedulePolicy(request.originalDate, request.originalTime);

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

  const handleApprove = () => {
    setIsSubmitting(true);
    onApprove(request, decisionNote.trim() || 'Disetujui sesuai ketersediaan slot gym floor.');
    setIsSubmitting(false);
    onClose();
  };

  const handleReject = () => {
    if (!decisionNote.trim()) {
      setIsRejectMode(true);
      return;
    }
    setIsSubmitting(true);
    onReject(request, decisionNote.trim());
    setIsSubmitting(false);
    onClose();
  };

  const handleCancel = () => {
    setIsSubmitting(true);
    onCancel(request);
    setIsSubmitting(false);
    onClose();
  };

  const remainingSessions = Math.max(0, client.paketTotal - client.paketTerpakai);

  return (
    <div className="fixed inset-0 z-50 bg-[#070e1d]/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-reschedule-title"
        className="w-full max-w-xl max-h-[92vh] bg-[#111726]/95 backdrop-blur-2xl border border-white/[0.12] rounded-t-3xl sm:rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.6)] flex flex-col overflow-hidden"
      >
        <div className="w-10 h-1 rounded-full bg-[#2e3545] mx-auto mt-3 sm:hidden" />

        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                request.isLateRequest
                  ? 'bg-amber-500/15 text-amber-400'
                  : 'bg-blue-500/15 text-blue-400'
              }`}
            >
              <CalendarClock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="review-reschedule-title" className="text-base font-bold text-white">
                  Tinjau Permintaan Reschedule Sesi
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  Pending Review
                </span>
              </div>
              <p className="text-xs text-[#bbcabf]">
                Matriks verifikasi jadwal &amp; kuota latihan lantai gym
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup popup tinjau reschedule"
            className="min-w-[44px] min-h-[44px] rounded-xl bg-[#232a3a] text-[#bbcabf] hover:text-white flex items-center justify-center transition active:scale-95"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Member Identity & Quota Context Card */}
          <div className="p-3.5 rounded-2xl bg-[#0b101b] border border-white/[0.06] flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className={`w-11 h-11 rounded-full bg-gradient-to-tr ${client.avatarBg || 'from-blue-500 to-indigo-600'} flex items-center justify-center text-sm font-bold text-white shrink-0 shadow-md`}>
                {client.initials}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white truncate">
                    {client.nama_lengkap}
                  </h3>
                  <span className="text-[10px] font-mono text-neutral-400 bg-white/[0.04] px-1.5 py-0.5 rounded">
                    {client.code}
                  </span>
                </div>
                <p className="text-xs text-[#bbcabf] flex items-center gap-2 mt-0.5">
                  <span className="text-emerald-400 font-semibold">
                    Sesi #{client.paketTerpakai + 1} dari {client.paketTotal} Sesi
                  </span>
                  <span className="text-neutral-600">•</span>
                  <span className="text-neutral-400">Sisa {remainingSessions} Sesi PT</span>
                </p>
              </div>
            </div>
          </div>

          {/* Schedule Comparison Grid: Before vs After */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-[#bbcabf]">
              <span>Perbandingan Jadwal Sesi PT</span>
              <span className="text-neutral-400 font-mono">Fokus: {client.nextSession?.focus || 'Sesi Personal Training'}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Original Schedule Card */}
              <div className="p-3.5 rounded-2xl bg-[#0b101b] border border-white/[0.06] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                    Jadwal Semula
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/20">
                    Akan Diganti
                  </span>
                </div>
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center gap-2 text-xs text-neutral-300 line-through opacity-75">
                    <Calendar className="w-3.5 h-3.5 text-neutral-500" />
                    <span>{request.originalDate}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-neutral-300 line-through opacity-75">
                    <Clock className="w-3.5 h-3.5 text-neutral-500" />
                    <span>{request.originalTime} WIB</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-neutral-400 line-through opacity-75">
                    <MapPin className="w-3.5 h-3.5 text-neutral-500" />
                    <span>{request.originalLocation}</span>
                  </div>
                </div>
              </div>

              {/* Proposed Schedule Card */}
              <div className="p-3.5 rounded-2xl bg-emerald-500/[0.07] border border-emerald-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                    Usulan Jadwal Baru
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Direkomendasikan
                  </span>
                </div>
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-white">
                    <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{request.proposedDate}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-bold text-white">
                    <Clock className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{request.proposedTime} WIB</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-emerald-300/90 font-medium">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{request.proposedLocation}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Reschedule Matrix Lead Time & SOP Evaluation */}
          <div
            className={`p-3.5 rounded-2xl border flex items-start gap-3 ${
              policy.isLate
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
            }`}
          >
            {policy.isLate ? (
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            )}
            <div className="text-xs space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-white">
                  Evaluasi SOP Matrix: {policy.policyTitle}
                </span>
                <span className="font-mono text-[10px] px-2 py-0.2 rounded-full bg-white/[0.08] text-white">
                  {policy.hoursUntilSession} Jam Menjelang Sesi
                </span>
              </div>
              <p className="text-[11px] opacity-90 leading-relaxed">
                {policy.policyDescription}
              </p>
              <div className="flex items-center gap-2 text-[10px] font-mono pt-0.5 text-neutral-300">
                <Sparkles className="w-3 h-3 text-emerald-400" />
                <span>Rekomendasi Pemulihan CNS: Optimal 48 Jam antar beban berat</span>
              </div>
            </div>
          </div>

          {/* Reason & Requester Card */}
          <div className="p-3.5 rounded-2xl bg-[#0b101b] border border-white/[0.06] space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-neutral-400">Alasan Penjadwalan Ulang:</span>
              <span className="font-mono text-[10px] text-neutral-500">
                Diajukan: {formatDateTime(request.requestedAt)}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05] text-xs font-medium text-white">
              “{request.reason}”
            </div>
            <div className="text-[11px] text-neutral-400 flex items-center gap-1.5 pt-0.5">
              <User className="w-3 h-3 text-neutral-500" />
              <span>
                Pemohon: <strong className="text-neutral-200">{request.requestedByName}</strong> ({request.requestedByRole.toUpperCase()})
              </span>
            </div>
          </div>

          {/* Decision Note Form (For Approver / Rejector) */}
          {(canApprove || canReject) && (
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[#bbcabf]">
                {isRejectMode ? 'Alasan Penolakan (Wajib Diisi):' : 'Catatan Persetujuan Coach / Supervisor (Opsional):'}
              </label>
              <textarea
                rows={2}
                placeholder={
                  isRejectMode
                    ? 'Contoh: Slot studio jam tersebut sudah penuh. Harap pilih slot alternatif jam 18:30 WIB.'
                    : 'Contoh: Disetujui. Harap datang 10 menit lebih awal untuk pemanasan mobilitas.'
                }
                value={decisionNote}
                onChange={(e) => setDecisionNote(e.target.value)}
                className={`w-full bg-[#070e1d] border rounded-xl p-3 text-xs text-white focus:outline-none transition ${
                  isRejectMode
                    ? 'border-rose-500/50 focus:border-rose-500'
                    : 'border-white/[0.12] focus:border-emerald-500'
                }`}
              />
            </div>
          )}
        </div>

        {/* Modal Decision Footer */}
        <div className="px-5 py-4 border-t border-white/[0.08] bg-[#0b101b] flex items-center justify-between gap-2.5 flex-wrap">
          {canApprove ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="min-h-[46px] px-4 rounded-xl bg-[#232a3a] text-[#bbcabf] hover:text-white text-xs font-semibold transition active:scale-95"
              >
                Tutup
              </button>

              <div className="flex items-center gap-2">
                {canReject && (
                  <button
                    type="button"
                    onClick={() => {
                      if (!isRejectMode) {
                        setIsRejectMode(true);
                      } else {
                        handleReject();
                      }
                    }}
                    disabled={isSubmitting || (isRejectMode && !decisionNote.trim())}
                    className="min-h-[46px] px-4 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-bold flex items-center gap-1.5 transition active:scale-95 disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4 text-rose-400" />
                    <span>{isRejectMode ? 'Konfirmasi Tolak' : 'Tolak Permintaan'}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={isSubmitting}
                  className="min-h-[46px] px-5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-slate-950 text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition active:scale-95 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4 text-slate-950" />
                  <span>Setujui Jadwal Baru</span>
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="text-xs text-neutral-400 italic">
                Permintaan Anda sedang dalam antrean review Coach Panji / Admin.
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="min-h-[46px] px-4 rounded-xl bg-[#232a3a] text-[#bbcabf] hover:text-white text-xs font-semibold"
                >
                  Tutup
                </button>

                {canCancel && (
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={isSubmitting}
                    className="min-h-[46px] px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-rose-300 border border-rose-500/20 text-xs font-semibold flex items-center gap-1.5 transition active:scale-95"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Batalkan Pengajuan</span>
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
