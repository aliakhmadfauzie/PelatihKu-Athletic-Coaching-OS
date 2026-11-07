import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  Dumbbell,
  AlertTriangle,
  CheckCircle2,
  X,
  Layers,
  Sparkles,
  ChevronRight,
  UserCheck
} from 'lucide-react';
import { ClientProfile, ScheduledSlot } from '../data/mockData';

interface BatchRecurringScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  clients: ClientProfile[];
  initialClientId?: string;
  onSaveRecurringSessions: (
    clientId: string,
    newSlots: ScheduledSlot[],
    firstSessionAsNext: boolean
  ) => void;
  onNotify: (msg: string) => void;
}

type PeriodizationPattern = 'upper_lower' | 'ppl' | 'full_body' | 'fat_loss_metcon' | 'custom';

const DAYS_OF_WEEK = [
  { dayIndex: 1, label: 'Sen', full: 'Senin' },
  { dayIndex: 2, label: 'Sel', full: 'Selasa' },
  { dayIndex: 3, label: 'Rab', full: 'Rabu' },
  { dayIndex: 4, label: 'Kam', full: 'Kamis' },
  { dayIndex: 5, label: 'Jum', full: 'Jumat' },
  { dayIndex: 6, label: 'Sab', full: 'Sabtu' },
  { dayIndex: 0, label: 'Min', full: 'Minggu' }
];

const INDO_MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
];

function formatDateIndo(dateStr: string): string {
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parts[0];
      const monthIdx = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      return `${day} ${INDO_MONTHS_SHORT[monthIdx] || parts[1]} ${year}`;
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}

function addDays(d: Date, days: number): Date {
  const result = new Date(d);
  result.setDate(result.getDate() + days);
  return result;
}

function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export const BatchRecurringScheduleModal: React.FC<BatchRecurringScheduleModalProps> = ({
  isOpen,
  onClose,
  clients,
  initialClientId,
  onSaveRecurringSessions,
  onNotify
}) => {
  if (!isOpen) return null;

  // Selected client
  const [selectedClientId, setSelectedClientId] = useState<string>(
    initialClientId || (clients[0] ? clients[0].id : '')
  );

  const selectedClient = useMemo(
    () => clients.find((c) => c.id === selectedClientId) || clients[0],
    [clients, selectedClientId]
  );

  // Form states
  const remainingQuota = selectedClient
    ? Math.max(1, selectedClient.paketTotal - selectedClient.paketTerpakai)
    : 12;

  const [totalSessions, setTotalSessions] = useState<number>(remainingQuota);
  const [selectedDays, setSelectedDays] = useState<number[]>([2, 4]); // Default: Selasa & Kamis
  const [startDateStr, setStartDateStr] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1); // Start tomorrow
    return toDateKey(d);
  });
  const [timeStr, setTimeStr] = useState<string>('17:00');
  const [durationMinutes, setDurationMinutes] = useState<number>(75);
  const [location, setLocation] = useState<
    'Gym Utama Senayan' | 'SCBD District 8' | 'Private Studio Kemang'
  >('Gym Utama Senayan');
  const [pattern, setPattern] = useState<PeriodizationPattern>('upper_lower');
  const [customFocusText, setCustomFocusText] = useState<string>(
    'Functional Hypertrophy & Core Stability'
  );

  // Toggle Day selection
  const toggleDay = (dayIdx: number) => {
    if (selectedDays.includes(dayIdx)) {
      if (selectedDays.length === 1) {
        onNotify('Pilih minimal 1 hari jadwal sesi mingguan');
        return;
      }
      setSelectedDays(selectedDays.filter((d) => d !== dayIdx));
    } else {
      setSelectedDays([...selectedDays, dayIdx].sort((a, b) => a - b));
    }
  };

  // Helper to determine focus title based on pattern and session progression
  const getFocusForSession = (index: number): string => {
    switch (pattern) {
      case 'upper_lower':
        return index % 2 === 0
          ? 'Upper Body Strength & Hypertrophy'
          : 'Lower Body Strength & Posterior Chain';
      case 'ppl':
        if (index % 3 === 0) return 'Push — Chest, Shoulders & Triceps';
        if (index % 3 === 1) return 'Pull — Back, Lats & Biceps';
        return 'Legs — Quads, Hamstrings & Calves';
      case 'full_body':
        return `Full Body Athletic Power — Mesocycle Sesi #${index + 1}`;
      case 'fat_loss_metcon':
        return index % 2 === 0
          ? 'High-Density Resistance Training (Upper)'
          : 'Metabolic Conditioning & Lower Compound';
      case 'custom':
      default:
        return customFocusText.trim() || 'Personal Training Sesi Terfokus';
    }
  };

  // Generate Slots
  const generatedSlots = useMemo<ScheduledSlot[]>(() => {
    if (!selectedClient || selectedDays.length === 0 || totalSessions <= 0) return [];

    const slots: ScheduledSlot[] = [];
    let curDate = new Date(startDateStr);
    if (isNaN(curDate.getTime())) curDate = new Date();

    const startingSessionNum = selectedClient.paketTerpakai + 1;
    let count = 0;
    let safetyCounter = 0;

    while (count < totalSessions && safetyCounter < 365) {
      const dayOfWeek = curDate.getDay();
      if (selectedDays.includes(dayOfWeek)) {
        const slotDateKey = toDateKey(curDate);
        slots.push({
          id: `sched-${selectedClient.id}-batch-${count + 1}-${Date.now()}`,
          date: slotDateKey,
          time: timeStr,
          durationMinutes,
          location,
          focus: getFocusForSession(count),
          sessionNumber: Math.min(selectedClient.paketTotal, startingSessionNum + count),
          status: 'Terkonfirmasi',
          coachNotes: `Jadwal otomatis batch mesocycle oleh Coach Panji Akbar Syamsi.`
        });
        count++;
      }
      curDate = addDays(curDate, 1);
      safetyCounter++;
    }

    return slots;
  }, [
    selectedClient,
    selectedDays,
    totalSessions,
    startDateStr,
    timeStr,
    durationMinutes,
    location,
    pattern,
    customFocusText
  ]);

  // Conflict / Collision Detection against all other clients' scheduled sessions
  const conflicts = useMemo(() => {
    const list: { slotIndex: number; conflictingClientName: string; conflictingTime: string }[] = [];
    if (!selectedClient) return list;

    // Gather all existing slots from other clients
    const otherClientsSlots: { clientName: string; date: string; time: string; location: string }[] = [];
    clients.forEach((c) => {
      if (c.id === selectedClient.id) return;
      if (c.nextSession && c.nextSession.date && c.nextSession.time) {
        otherClientsSlots.push({
          clientName: c.nama_lengkap,
          date: c.nextSession.date,
          time: c.nextSession.time,
          location: c.nextSession.location
        });
      }
      if (c.scheduledSessions) {
        c.scheduledSessions.forEach((s) => {
          otherClientsSlots.push({
            clientName: c.nama_lengkap,
            date: s.date,
            time: s.time,
            location: s.location
          });
        });
      }
    });

    generatedSlots.forEach((slot, idx) => {
      const match = otherClientsSlots.find(
        (o) => o.date === slot.date && o.time === slot.time && o.location === slot.location
      );
      if (match) {
        list.push({
          slotIndex: idx,
          conflictingClientName: match.clientName,
          conflictingTime: match.time
        });
      }
    });

    return list;
  }, [clients, selectedClient, generatedSlots]);

  // Handle Save
  const handleConfirmSave = () => {
    if (!selectedClient || generatedSlots.length === 0) {
      onNotify('Tidak ada sesi yang dapat dijadwalkan.');
      return;
    }

    onSaveRecurringSessions(selectedClient.id, generatedSlots, true);
    onNotify(
      `Berhasil menjadwalkan ${generatedSlots.length} sesi berulang untuk ${selectedClient.nama_lengkap}!`
    );
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="batch-schedule-title"
    >
      <div className="relative w-full max-w-2xl bg-[#0f172a] border border-white/10 rounded-3xl p-5 sm:p-6 space-y-5 text-white shadow-2xl my-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 id="batch-schedule-title" className="text-base sm:text-lg font-bold text-white">
                Penjadwalan Paket Sesi Berulang
              </h2>
              <p className="text-xs text-neutral-400">
                Plot otomatis 12, 24, atau 36 sesi PT ke kalender dengan deteksi bentrok
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

        {/* Form Body */}
        <div className="space-y-4 max-h-[68vh] overflow-y-auto pr-1 no-scrollbar">
          {/* Member Selection */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
              Pilih Member Fitness Center
            </label>
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="w-full min-h-[46px] px-3.5 bg-[#172138] border border-white/10 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-emerald-400"
            >
              {clients.map((c) => {
                const sisa = Math.max(0, c.paketTotal - c.paketTerpakai);
                return (
                  <option key={c.id} value={c.id}>
                    {c.nama_lengkap} ({c.code}) — Paket: {c.paketTerpakai}/{c.paketTotal} Sesi (Sisa: {sisa} Sesi)
                  </option>
                );
              })}
            </select>
          </div>

          {/* Member Quota Summary Card */}
          {selectedClient && (
            <div className="p-3.5 rounded-2xl bg-[#141e33] border border-white/10 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold text-white ${selectedClient.avatarBg}`}
                >
                  {selectedClient.initials}
                </div>
                <div>
                  <span className="font-semibold text-white block">{selectedClient.nama_lengkap}</span>
                  <span className="text-[11px] text-neutral-400 font-mono">
                    Target: {selectedClient.target_utama} · {selectedClient.target_category}
                  </span>
                </div>
              </div>
              <div className="text-right font-mono">
                <span className="text-[10px] uppercase text-neutral-400 block">Sisa Kuota PT</span>
                <span className="text-emerald-400 font-bold text-sm">
                  {Math.max(0, selectedClient.paketTotal - selectedClient.paketTerpakai)} Sesi
                </span>
              </div>
            </div>
          )}

          {/* Configuration Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Total Sessions to Generate */}
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                Jumlah Sesi yang Dibuat
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={48}
                  value={totalSessions}
                  onChange={(e) => setTotalSessions(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-full min-h-[44px] px-3.5 bg-[#172138] border border-white/10 rounded-xl text-xs sm:text-sm font-mono text-emerald-400 focus:outline-none focus:border-emerald-400"
                />
                <button
                  type="button"
                  onClick={() =>
                    setTotalSessions(
                      Math.max(1, selectedClient.paketTotal - selectedClient.paketTerpakai)
                    )
                  }
                  className="min-h-[44px] px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-semibold text-neutral-300 whitespace-nowrap"
                  title="Gunakan sisa kuota paket member"
                >
                  Sisa Kuota
                </button>
              </div>
            </div>

            {/* Tanggal Mulai */}
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                Mulai Dari Tanggal
              </label>
              <input
                type="date"
                value={startDateStr}
                onChange={(e) => setStartDateStr(e.target.value)}
                className="w-full min-h-[44px] px-3.5 bg-[#172138] border border-white/10 rounded-xl text-xs sm:text-sm font-mono text-white focus:outline-none focus:border-emerald-400"
              />
            </div>

            {/* Jam Sesi */}
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                Jam Latihan (WIB)
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="time"
                  value={timeStr}
                  onChange={(e) => setTimeStr(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 bg-[#172138] border border-white/10 rounded-xl text-xs sm:text-sm font-mono text-white focus:outline-none focus:border-emerald-400"
                />
                {['07:00', '17:00', '19:00'].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setTimeStr(preset)}
                    className="min-h-[44px] px-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-[11px] font-mono text-neutral-300"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Durasi & Lokasi */}
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                Lokasi Lantai Gym
              </label>
              <select
                value={location}
                onChange={(e) =>
                  setLocation(
                    e.target.value as 'Gym Utama Senayan' | 'SCBD District 8' | 'Private Studio Kemang'
                  )
                }
                className="w-full min-h-[44px] px-3 bg-[#172138] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-400"
              >
                <option value="Gym Utama Senayan">Gym Utama Senayan</option>
                <option value="SCBD District 8">SCBD District 8</option>
                <option value="Private Studio Kemang">Private Studio Kemang</option>
              </select>
            </div>
          </div>

          {/* Hari Latihan Rutin (Multi-Select Pills) */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
              Hari Latihan Mingguan (Pilih Hari Rutin)
            </label>
            <div className="grid grid-cols-7 gap-1.5">
              {DAYS_OF_WEEK.map(({ dayIndex, label, full }) => {
                const isSelected = selectedDays.includes(dayIndex);
                return (
                  <button
                    key={dayIndex}
                    type="button"
                    onClick={() => toggleDay(dayIndex)}
                    className={`min-h-[44px] rounded-xl flex flex-col items-center justify-center p-1.5 transition-all text-xs font-bold ${
                      isSelected
                        ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                        : 'bg-[#172138] border border-white/10 text-neutral-400 hover:text-white'
                    }`}
                    title={full}
                  >
                    <span className="text-xs">{label}</span>
                    <span className="text-[9px] opacity-75 font-normal">{isSelected ? '✓' : ''}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Pola Periodisasi & Fokus Latihan */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
              Pola Pembagian Latihan (Split Mesocycle)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'upper_lower', label: 'Upper / Lower', desc: 'Rotasi Sesi Atas & Bawah' },
                { id: 'ppl', label: 'Push / Pull / Legs', desc: 'Klasik 3-Way Split' },
                { id: 'full_body', label: 'Full Body Athletic', desc: 'Compound Power' },
                { id: 'fat_loss_metcon', label: 'Metcon Fat Loss', desc: 'High Density' }
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPattern(p.id as PeriodizationPattern)}
                  className={`p-2.5 rounded-xl text-left border transition ${
                    pattern === p.id
                      ? 'bg-emerald-500/15 border-emerald-400 text-emerald-300'
                      : 'bg-[#172138] border-white/10 text-neutral-300 hover:border-white/20'
                  }`}
                >
                  <span className="text-xs font-bold block">{p.label}</span>
                  <span className="text-[10px] text-neutral-400 block">{p.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Collision Warning Banner if conflicts detected */}
          {conflicts.length > 0 && (
            <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-300 flex items-start gap-2.5 text-xs">
              <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
              <div>
                <span className="font-bold block">Peringatan Bentrok Jadwal ({conflicts.length} Sesi Terdeteksi)</span>
                <p className="text-[11px] text-amber-200 mt-0.5 leading-relaxed">
                  Terdapat sesi member lain di jam dan lokasi yang sama. Mohon tinjau slot bertanda oranye pada daftar pratinjau di bawah sebelum menyimpan.
                </p>
              </div>
            </div>
          )}

          {/* Preview Generated Slots */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-neutral-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>Pratinjau {generatedSlots.length} Sesi Terjadwal</span>
              </span>
              <span className="text-[11px] text-neutral-400 font-mono">
                Durasi: {durationMinutes} Menit / Sesi
              </span>
            </div>

            <div className="max-h-48 overflow-y-auto space-y-1.5 rounded-2xl bg-[#090f1d] border border-white/10 p-2.5 text-xs no-scrollbar">
              {generatedSlots.map((slot, idx) => {
                const hasConflict = conflicts.some((c) => c.slotIndex === idx);
                return (
                  <div
                    key={idx}
                    className={`p-2 rounded-xl flex items-center justify-between border transition ${
                      hasConflict
                        ? 'bg-amber-500/10 border-amber-500/40 text-amber-200'
                        : 'bg-white/[0.03] border-white/5 text-neutral-200 hover:border-white/15'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 shrink-0">
                        #{slot.sessionNumber}
                      </span>
                      <div className="truncate">
                        <span className="font-semibold text-white truncate block">
                          {slot.focus}
                        </span>
                        <span className="text-[10px] text-neutral-400">
                          {formatDateIndo(slot.date)} · {slot.time} WIB · {slot.location}
                        </span>
                      </div>
                    </div>
                    {hasConflict ? (
                      <span className="text-[10px] font-mono text-amber-400 font-bold shrink-0 ml-2">
                        Bentrok
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono text-emerald-400 shrink-0 ml-2">
                        Siap Diplot
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="border-t border-white/10 pt-4 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[48px] px-4 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 text-xs font-semibold transition"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleConfirmSave}
            disabled={generatedSlots.length === 0}
            className="min-h-[48px] px-5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 text-xs font-bold flex items-center gap-2 transition shadow-md shadow-emerald-500/20"
          >
            <CheckCircle2 className="w-4 h-4 stroke-[2.2]" />
            <span>Plot {generatedSlots.length} Sesi ke Kalender</span>
          </button>
        </div>
      </div>
    </div>
  );
};
