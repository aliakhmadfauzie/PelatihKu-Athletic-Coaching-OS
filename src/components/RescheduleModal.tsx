import React, { useState, useMemo } from 'react';
import {
  X,
  CalendarClock,
  MapPin,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Send,
  Calendar,
  Dumbbell
} from 'lucide-react';
import { ClientProfile } from '../data/mockData';
import { UserRole } from '../services/authGatekeeperService';
import { evaluateReschedulePolicy } from '../services/rescheduleMatrixService';

export interface UpcomingSessionOption {
  id: string;
  date: string;
  time: string;
  location: 'Gym Utama Senayan' | 'SCBD District 8' | 'Private Studio Kemang';
  focus: string;
  sessionNumber?: number;
}

interface RescheduleModalProps {
  client: ClientProfile;
  currentUserRole?: UserRole;
  onClose: () => void;
  onConfirmReschedule: (payload: {
    date: string;
    time: string;
    location: 'Gym Utama Senayan' | 'SCBD District 8' | 'Private Studio Kemang';
    reason: string;
    originalDate?: string;
    originalTime?: string;
    originalLocation?: 'Gym Utama Senayan' | 'SCBD District 8' | 'Private Studio Kemang';
    originalFocus?: string;
    sessionId?: string;
  }) => void;
}

const REASONS = ['Lembur Kerja', 'Recovery/Sakit', 'Jadwal Bentrok', 'Dinas Luar Kota'];
const RECOMMENDED_SLOTS = [
  { time: '07:00', tag: 'Pagi Segar' },
  { time: '10:00', tag: 'Off-Peak' },
  { time: '16:30', tag: 'Saran Recovery', recommended: true },
  { time: '18:30', tag: 'Selepas Kerja' }
];
const LOCATIONS: ('Gym Utama Senayan' | 'SCBD District 8' | 'Private Studio Kemang')[] = [
  'Gym Utama Senayan',
  'SCBD District 8',
  'Private Studio Kemang'
];

export const RescheduleModal: React.FC<RescheduleModalProps> = ({
  client,
  currentUserRole = 'coach',
  onClose,
  onConfirmReschedule
}) => {
  // 1. Gather all upcoming scheduled sessions for this client (multi-schedule support)
  const upcomingSessions = useMemo<UpcomingSessionOption[]>(() => {
    const list: UpcomingSessionOption[] = [];
    const seenKeys = new Set<string>();

    // Add primary nextSession
    if (client.nextSession?.date) {
      const key = `${client.nextSession.date}_${client.nextSession.time}`;
      seenKeys.add(key);
      list.push({
        id: 'next-session-primary',
        date: client.nextSession.date,
        time: client.nextSession.time,
        location: client.nextSession.location,
        focus: client.nextSession.focus || 'Sesi Personal Training',
        sessionNumber: client.paketTerpakai + 1
      });
    }

    // Add any additional upcoming sessions from scheduledSessions
    if (client.scheduledSessions && client.scheduledSessions.length > 0) {
      client.scheduledSessions.forEach((slot) => {
        const key = `${slot.date}_${slot.time}`;
        if (!seenKeys.has(key) && slot.status !== 'Selesai') {
          seenKeys.add(key);
          list.push({
            id: slot.id,
            date: slot.date,
            time: slot.time,
            location: slot.location,
            focus: slot.focus || 'Sesi Personal Training',
            sessionNumber: slot.sessionNumber
          });
        }
      });
    }

    return list.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
  }, [client]);

  const [selectedSessionId, setSelectedSessionId] = useState<string>(
    upcomingSessions[0]?.id || 'next-session-primary'
  );

  const currentSessionToReschedule = useMemo(() => {
    return upcomingSessions.find((s) => s.id === selectedSessionId) || upcomingSessions[0];
  }, [upcomingSessions, selectedSessionId]);

  const [reason, setReason] = useState<string>('Lembur Kerja');
  const [selectedDate, setSelectedDate] = useState<string>('2026-11-07');
  const [selectedTime, setSelectedTime] = useState<string>('16:30');
  const [location, setLocation] = useState<
    'Gym Utama Senayan' | 'SCBD District 8' | 'Private Studio Kemang'
  >(currentSessionToReschedule?.location || 'Gym Utama Senayan');

  // Evaluate lead-time against commercial fitness center SOP dynamically for the chosen session
  const policy = useMemo(() => {
    if (!currentSessionToReschedule) {
      return evaluateReschedulePolicy(client.nextSession.date, client.nextSession.time);
    }
    return evaluateReschedulePolicy(
      currentSessionToReschedule.date,
      currentSessionToReschedule.time
    );
  }, [client.nextSession.date, client.nextSession.time, currentSessionToReschedule]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirmReschedule({
      date: selectedDate,
      time: selectedTime,
      location,
      reason,
      originalDate: currentSessionToReschedule?.date || client.nextSession.date,
      originalTime: currentSessionToReschedule?.time || client.nextSession.time,
      originalLocation: currentSessionToReschedule?.location || client.nextSession.location,
      originalFocus: currentSessionToReschedule?.focus || client.nextSession.focus,
      sessionId: currentSessionToReschedule?.id
    });
  };

  const isClient = currentUserRole === 'client';

  return (
    <div className="fixed inset-0 z-50 bg-[#070e1d]/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-lg max-h-[92vh] bg-[#111726]/95 backdrop-blur-2xl border border-white/[0.12] rounded-t-3xl sm:rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.6)] flex flex-col overflow-hidden"
      >
        <div className="w-10 h-1 rounded-full bg-[#2e3545] mx-auto mt-3 sm:hidden" />

        {/* Header */}
        <div className="px-5 py-4 border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#ffb95f]/15 text-[#ffb95f] flex items-center justify-center shrink-0">
              <CalendarClock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">
                {isClient ? 'Ajukan Reschedule Sesi' : 'Reschedule Sesi Latihan'}
              </h2>
              <p className="text-xs text-[#bbcabf]">
                {client.nama_lengkap} · Sesi PT #{currentSessionToReschedule?.sessionNumber || client.paketTerpakai + 1}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup modal reschedule"
            className="min-w-[44px] min-h-[44px] rounded-xl bg-[#232a3a] text-[#bbcabf] hover:text-white flex items-center justify-center transition active:scale-95"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Multi-Schedule Selector (When Member has multiple scheduled dates) */}
          {upcomingSessions.length > 1 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-[#bbcabf]">
                <span>Pilih Sesi yang Ingin Dijadwalkan Ulang:</span>
                <span className="font-mono text-[10px] text-emerald-400">
                  {upcomingSessions.length} Jadwal Mendatang
                </span>
              </div>

              <div className="space-y-2">
                {upcomingSessions.map((session) => {
                  const isSelected = session.id === selectedSessionId;
                  return (
                    <button
                      key={session.id}
                      type="button"
                      onClick={() => {
                        setSelectedSessionId(session.id);
                        setLocation(session.location);
                      }}
                      className={`w-full min-h-[50px] p-3 rounded-2xl border flex items-center justify-between gap-3 text-left transition-all ${
                        isSelected
                          ? 'bg-emerald-500/15 border-emerald-500/50 text-white shadow-md shadow-emerald-950/30 ring-1 ring-emerald-500/30'
                          : 'bg-[#0b101b] border-white/[0.06] text-neutral-300 hover:border-white/[0.12]'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                            isSelected
                              ? 'border-emerald-400 bg-emerald-400'
                              : 'border-neutral-500'
                          }`}
                        >
                          {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                              {session.date} · {session.time} WIB
                            </span>
                            {session.sessionNumber && (
                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white/[0.06] text-neutral-400">
                                Sesi #{session.sessionNumber}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-[#bbcabf] truncate mt-0.5">
                            {session.focus} · {session.location}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Policy Evaluation Notice */}
          <div
            className={`p-3 rounded-xl border flex items-start gap-2.5 ${
              policy.isLate
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
            }`}
          >
            {policy.isLate ? (
              <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
            )}
            <div className="text-xs">
              <span className="font-bold block">
                {policy.policyTitle} ({policy.hoursUntilSession} jam menjelang sesi)
              </span>
              <p className="text-[11px] opacity-90 mt-0.5 leading-relaxed">
                {policy.policyDescription}
              </p>
            </div>
          </div>

          {/* 1. Alasan Penjadwalan Ulang */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-[#bbcabf]">
              Alasan Penjadwalan Ulang
            </label>
            <div className="grid grid-cols-2 gap-2">
              {REASONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setReason(r)}
                  className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-semibold border text-left transition-colors ${
                    reason === r
                      ? 'bg-[#10b981]/15 border-[#4edea3] text-[#4edea3]'
                      : 'bg-[#191f2f] border-white/[0.08] text-[#bbcabf] hover:text-white'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Tanggal Kalender Baru */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-[#bbcabf]">
              Pilih Tanggal Sesi Baru
            </label>
            <input
              type="date"
              required
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full min-h-[44px] bg-[#070e1d] border border-white/[0.12] rounded-xl px-3.5 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#10b981]"
            />
          </div>

          {/* 3. Slot Waktu & Saran Recovery */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[#bbcabf]">Slot Waktu Tersedia</span>
              <span className="text-[#4edea3] font-mono">Optimal CNS Recovery 48 Jam</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {RECOMMENDED_SLOTS.map((slot) => (
                <button
                  key={slot.time}
                  type="button"
                  onClick={() => setSelectedTime(slot.time)}
                  className={`min-h-[48px] p-2.5 rounded-xl border flex items-center justify-between transition-colors ${
                    selectedTime === slot.time
                      ? 'bg-[#10b981] text-[#002113] border-[#4edea3] font-semibold'
                      : 'bg-[#191f2f] border-white/[0.08] text-white hover:bg-[#232a3a]'
                  }`}
                >
                  <span className="flex items-center gap-1.5 font-mono text-xs font-bold">
                    <Clock className="w-3.5 h-3.5" />
                    {slot.time} WIB
                  </span>
                  <span
                    className={`text-[10px] font-sans ${
                      selectedTime === slot.time
                        ? 'text-[#002113] font-bold'
                        : slot.recommended
                        ? 'text-[#4edea3]'
                        : 'text-[#86948a]'
                    }`}
                  >
                    {slot.tag}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* 4. Zonasi Lokasi Gym */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-[#bbcabf]">
              Zonasi Lokasi Gym
            </label>
            <div className="space-y-2">
              {LOCATIONS.map((loc) => (
                <button
                  key={loc}
                  type="button"
                  onClick={() => setLocation(loc)}
                  className={`w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border flex items-center justify-between text-xs transition-colors ${
                    location === loc
                      ? 'bg-[#10b981]/15 border-[#4edea3] text-white font-semibold'
                      : 'bg-[#191f2f] border-white/[0.08] text-[#bbcabf] hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[#4edea3]" />
                    <span>{loc}</span>
                  </span>
                  <span className="font-mono text-[11px] text-[#86948a]">
                    {loc === 'Gym Utama Senayan'
                      ? 'S&C Rack Lengkap'
                      : loc === 'SCBD District 8'
                      ? 'Executive Pod'
                      : 'Private Studio'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-white/[0.08] bg-[#0b101b] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-4 rounded-xl bg-[#232a3a] text-[#bbcabf] hover:text-white text-xs font-semibold transition active:scale-95"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="min-h-[44px] px-6 rounded-xl bg-[#10b981] hover:bg-[#4edea3] text-[#002113] text-xs font-bold flex items-center gap-2 shadow-lg shadow-[#10b981]/20 transition active:scale-95"
          >
            <Send className="w-4 h-4" />
            <span>{isClient ? 'Kirim Pengajuan Reschedule' : 'Konfirmasi Pindah Sesi'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
