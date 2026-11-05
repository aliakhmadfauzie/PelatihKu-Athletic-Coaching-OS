import React, { useState } from 'react';
import {
  X,
  CalendarClock,
  MapPin,
  Clock,
  MessageCircle,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { ClientProfile } from '../data/mockData';

interface RescheduleModalProps {
  client: ClientProfile;
  onClose: () => void;
  onConfirmReschedule: (payload: {
    date: string;
    time: string;
    location: 'Gym Utama Senayan' | 'SCBD District 8' | 'Private Studio Kemang';
    reason: string;
    sendWaNotification: boolean;
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
  onClose,
  onConfirmReschedule
}) => {
  const [reason, setReason] = useState<string>('Lembur Kerja');
  const [selectedDate, setSelectedDate] = useState<string>('2026-11-07');
  const [selectedTime, setSelectedTime] = useState<string>('16:30');
  const [location, setLocation] = useState<
    'Gym Utama Senayan' | 'SCBD District 8' | 'Private Studio Kemang'
  >(client.nextSession?.location || 'Gym Utama Senayan');
  const [sendWaNotification, setSendWaNotification] = useState<boolean>(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirmReschedule({
      date: selectedDate,
      time: selectedTime,
      location,
      reason,
      sendWaNotification
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#070e1d]/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-lg max-h-[92vh] bg-[#141b2b] border border-white/[0.12] rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden"
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
                Reschedule Sesi Latihan
              </h2>
              <p className="text-xs text-[#bbcabf]">
                {client.nama_lengkap} · Sesi #{client.paketTerpakai + 1} ({client.nextSession.focus})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup modal reschedule"
            className="min-w-[44px] min-h-[44px] rounded-xl bg-[#232a3a] text-[#bbcabf] hover:text-white flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-5">
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

          {/* 2. Tanggal Kalender */}
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
                      : 'Private 1-on-1'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* 5. Opsi Kirim Undangan Kalender WhatsApp */}
          <label className="p-3.5 rounded-xl bg-[#191f2f] border border-white/[0.08] flex items-center justify-between gap-3 cursor-pointer">
            <div className="flex items-center gap-2.5">
              <MessageCircle className="w-4 h-4 text-[#4edea3] shrink-0" />
              <div className="text-xs">
                <p className="font-semibold text-white">
                  Kirim Link Kalender via WhatsApp Terenkripsi
                </p>
                <p className="text-[#86948a]">
                  Otomatis kirim pembaruan jadwal ke nomor {client.telepon}
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={sendWaNotification}
              onChange={(e) => setSendWaNotification(e.target.checked)}
              className="w-5 h-5 accent-[#10b981] rounded"
            />
          </label>

          {/* Footer Buttons */}
          <div className="pt-2 border-t border-white/[0.08] flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[48px] px-4 py-2.5 rounded-xl bg-[#232a3a] text-[#bbcabf] hover:text-white text-xs font-semibold"
            >
              Batal
            </button>
            <button
              type="submit"
              className="flex-1 min-h-[48px] px-4 py-2.5 rounded-xl bg-[#10b981] hover:bg-[#4edea3] text-[#002113] text-sm font-semibold flex items-center justify-center gap-2 transition-transform active:scale-[0.98]"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Konfirmasi Jadwal Baru</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
