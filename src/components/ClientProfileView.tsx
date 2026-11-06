import React, { useState } from 'react';
import {
  User,
  ShieldCheck,
  Lock,
  Eye,
  EyeOff,
  Dumbbell,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  LogOut,
  Calendar,
  Phone,
  Sparkles,
  ArrowLeft,
  Flame,
  Award,
  CalendarClock
} from 'lucide-react';
import { ClientProfile, CoachProfileData, PinChangeLogEntry, GymMasterSettings } from '../data/mockData';
import {
  getClientPin,
  setClientPin,
  mustChangeClientPin,
  validateNewPin,
  logoutGatekeeper
} from '../services/authGatekeeperService';
import { updateClientPinInFirestore } from '../services/firestoreService';
import { PinChangeHistoryView } from './PinChangeHistoryView';

export interface ClientProfileViewProps {
  client: ClientProfile;
  coach: CoachProfileData;
  gymSettings?: GymMasterSettings;
  onNotify?: (msg: string) => void;
  onBackToDashboard?: () => void;
  onLogoutConfirmed?: () => void;
  onOpenRescheduleHistory?: () => void;
  onOpenRescheduleModal?: () => void;
}

export const ClientProfileView: React.FC<ClientProfileViewProps> = ({
  client,
  coach,
  gymSettings,
  onNotify,
  onBackToDashboard,
  onLogoutConfirmed,
  onOpenRescheduleHistory,
  onOpenRescheduleModal
}) => {
  // PIN Form States
  const [currentPinInput, setCurrentPinInput] = useState('');
  const [newPinInput, setNewPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');
  const [showCurrentPin, setShowCurrentPin] = useState(false);
  const [showNewPin, setShowNewPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal confirm logout
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Dynamic PIN States
  const [mustChange, setMustChange] = useState<boolean>(() =>
    mustChangeClientPin(client.id)
  );
  const currentExpectedPin = getClientPin(client.id, client.telepon);

  const remainingSessions = Math.max(0, client.paketTotal - client.paketTerpakai);
  const quotaPct = Math.min(100, Math.round((client.paketTerpakai / client.paketTotal) * 100));

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    const cleanCurrent = currentPinInput.replace(/\D/g, '');
    const cleanNew = newPinInput.replace(/\D/g, '');
    const cleanConfirm = confirmPinInput.replace(/\D/g, '');

    // 1. Verify current PIN
    if (cleanCurrent !== currentExpectedPin) {
      setFormError('PIN saat ini tidak cocok! Periksa kembali PIN Anda.');
      return;
    }

    // 2. Validate new PIN invariants
    const validation = validateNewPin(cleanNew, cleanConfirm, currentExpectedPin);
    if (!validation.valid) {
      setFormError(validation.error || 'PIN baru tidak valid.');
      return;
    }

    const logEntry: PinChangeLogEntry = {
      id: `pin-log-${Date.now()}`,
      changedAt: new Date().toISOString(),
      changedByRole: 'client',
      changedByName: client.nama_lengkap,
      note: 'PIN diperbarui mandiri oleh member melalui formulir profil.'
    };

    setIsSubmitting(true);
    updateClientPinInFirestore(client.id, cleanNew, logEntry)
      .then((dbSuccess) => {
        setIsSubmitting(false);
        if (!dbSuccess) {
          setFormError('Koneksi terputus: Gagal memperbarui PIN ke Cloud Firestore. Silakan periksa jaringan dan coba lagi.');
          onNotify?.('Gagal memperbarui PIN ke database.');
          return;
        }
        setClientPin(client.id, cleanNew, logEntry);
        setMustChange(false);
        setCurrentPinInput('');
        setNewPinInput('');
        setConfirmPinInput('');
        const msg = 'PIN Keamanan berhasil diperbarui ke database Firestore!';
        setFormSuccess(msg);
        onNotify?.(msg);
      })
      .catch((err) => {
        setIsSubmitting(false);
        console.warn('[ClientProfile] PIN update error:', err);
        setFormError('Terjadi kesalahan sistem saat menyimpan PIN ke server. Pembaruan dibatalkan.');
        onNotify?.('Gagal menyimpan PIN baru ke database.');
      });
  };

  const handleLogout = () => {
    logoutGatekeeper();
    setShowLogoutModal(false);
    onLogoutConfirmed?.();
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Back to Dashboard Navigation */}
      {onBackToDashboard && (
        <button
          type="button"
          onClick={onBackToDashboard}
          className="min-h-[40px] text-xs font-semibold text-emerald-400 hover:underline flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Kembali ke Dashboard Latihan</span>
        </button>
      )}

      {/* Fitness Center Dynamic Header Banner */}
      {gymSettings && (
        <div className="bg-[#111726]/85 backdrop-blur-xl border border-white/[0.08] rounded-3xl p-4 flex items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0 shadow-sm">
              <Dumbbell className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div className="min-w-0 truncate">
              <h2 className="text-xs font-bold text-white tracking-tight truncate">{gymSettings.gymName}</h2>
              <p className="text-[11px] text-neutral-400 truncate">{gymSettings.primaryAddress} · {gymSettings.operatingHours}</p>
            </div>
          </div>
          <a
            href={`https://wa.me/${gymSettings.contactWhatsApp}?text=${encodeURIComponent(
              `Halo Layanan ${gymSettings.gymName}, saya ${client.nama_lengkap} ingin bertanya mengenai jadwal latihan PT saya.`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-[38px] px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 shrink-0"
          >
            <Phone className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Kontak Gym</span>
          </a>
        </div>
      )}

      {/* Member Header Card */}
      <div className="bg-[#111726]/85 backdrop-blur-xl border border-white/[0.08] rounded-3xl p-5 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-44 h-44 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-emerald-400 p-[2px] shadow-lg shadow-blue-500/20 shrink-0">
              <div className="w-full h-full rounded-2xl bg-slate-900 flex items-center justify-center text-lg font-bold text-white">
                {client.initials || 'BS'}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base font-bold text-white tracking-tight">
                  {client.nama_lengkap}
                </h1>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-300 font-semibold">
                  {client.code}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-medium">
                  {client.status}
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-1 flex items-center gap-2 flex-wrap">
                <span>{client.pekerjaan}</span>
                <span>•</span>
                <span>{client.usia} Tahun ({client.gender})</span>
                <span>•</span>
                <span className="font-mono text-neutral-300">{client.telepon}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-[11px] text-neutral-400 bg-white/[0.04] px-2.5 py-1 rounded-lg border border-white/[0.06]">
              Fase: <strong className="text-white">{client.phase}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Package & Coach Status Card */}
      <div className="bg-[#111827] border border-white/[0.08] rounded-2xl p-4 sm:p-5 shadow-lg space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-white">
            <Dumbbell className="w-4 h-4 text-emerald-400" />
            <span>Paket Personal Training &amp; Pelatih Pendamping</span>
          </div>
          <span className="text-xs font-mono font-bold text-amber-400">
            Sisa {remainingSessions} dari {client.paketTotal} Sesi
          </span>
        </div>

        {/* Quota Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-[11px] text-neutral-400 font-medium">
            <span>Sesi Selesai: {client.paketTerpakai} Sesi</span>
            <span className="font-mono text-emerald-400 font-semibold">{quotaPct}% Terpakai</span>
          </div>
          <div className="w-full h-2 rounded-full bg-black/40 border border-white/[0.06] overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-500"
              style={{ width: `${quotaPct}%` }}
            />
          </div>
        </div>

        {/* Coach Lead Profile Snippet */}
        <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-between text-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">
              {coach.initials || 'PAS'}
            </div>
            <div className="truncate">
              <span className="text-[10px] text-neutral-400 block">Lead Coach &amp; Master Trainer:</span>
              <span className="font-semibold text-white truncate">{coach.name || 'Coach Panji Akbar Syamsi'}</span>
            </div>
          </div>
          <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 shrink-0">
            PABSI / KEMENPORA
          </span>
        </div>
      </div>

      {/* Reschedule Sesi & Riwayat Tracking Card */}
      <div className="bg-[#111827] border border-white/[0.08] rounded-2xl p-5 shadow-xl space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <CalendarClock className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Status &amp; Riwayat Reschedule Sesi</h2>
              <p className="text-[11px] text-neutral-400">Pantau permohonan pergantian jadwal sesi PT Anda</p>
            </div>
          </div>
          {client.pendingReschedule && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
              1 Pending Review
            </span>
          )}
        </div>

        {client.pendingReschedule ? (
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-amber-300">Pengajuan Sedang Ditinjau:</span>
              <span className="font-mono text-[10px] text-neutral-400">
                Diajukan {client.pendingReschedule.requestedAt.split('T')[0]}
              </span>
            </div>
            <p className="text-xs text-white">
              Pindah ke <strong className="text-emerald-400">{client.pendingReschedule.proposedDate} ({client.pendingReschedule.proposedTime} WIB)</strong> di {client.pendingReschedule.proposedLocation}
            </p>
            <p className="text-[11px] text-neutral-300 italic">
              Alasan: “{client.pendingReschedule.reason}”
            </p>
          </div>
        ) : (
          <p className="text-xs text-neutral-400">
            Jadwal sesi berikutnya: <strong className="text-white">{client.nextSession?.date || '-'} ({client.nextSession?.time || '-'} WIB)</strong> di {client.nextSession?.location || 'Gym Utama'}
          </p>
        )}

        <div className="flex items-center gap-2 pt-1 flex-wrap">
          {onOpenRescheduleHistory && (
            <button
              type="button"
              onClick={onOpenRescheduleHistory}
              className="min-h-[42px] px-3.5 rounded-xl bg-[#1f293d] hover:bg-[#28354f] text-white border border-white/[0.08] text-xs font-semibold flex items-center gap-1.5 transition active:scale-95"
            >
              <CalendarClock className="w-4 h-4 text-amber-400" />
              <span>Lihat Riwayat Semua Pengajuan</span>
            </button>
          )}
          {onOpenRescheduleModal && !client.pendingReschedule && (
            <button
              type="button"
              onClick={onOpenRescheduleModal}
              className="min-h-[42px] px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition active:scale-95 shadow-md shadow-emerald-500/20"
            >
              <span>+ Ajukan Ganti Jadwal</span>
            </button>
          )}
        </div>
      </div>

      {/* Security & PIN Management Card (CORE FEATURE) */}
      <div className="bg-[#111827] border border-white/[0.08] rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Keamanan Akun &amp; PIN Akses</h2>
              <p className="text-[11px] text-neutral-400">Atur PIN 6–8 digit untuk masuk ke portal atlet</p>
            </div>
          </div>

          {mustChange ? (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 animate-pulse">
              ⚠️ PIN Bawaan Telepon
            </span>
          ) : (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> PIN Pribadi Aktif
            </span>
          )}
        </div>

        {/* Informational Callout */}
        {mustChange ? (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex items-start gap-3 text-xs text-amber-200">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-amber-300 block">PIN Anda Masih Menggunakan Nomor Telepon:</span>
              <p className="text-[11px] leading-relaxed text-amber-200/90">
                Saat didaftarkan oleh pelatih, PIN awal Anda otomatis dibuat dari 8 digit terakhir nomor telepon (<span className="font-mono font-bold text-white">{currentExpectedPin}</span>). Demi keamanan dan privasi, silakan buat PIN pribadi baru di bawah ini.
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 flex items-center gap-3 text-xs text-emerald-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <p className="text-[11px]">
              PIN pribadi Anda aktif dan terverifikasi. Anda dapat memperbaruinya kapan saja melalui formulir di bawah.
            </p>
          </div>
        )}

        {/* Change PIN Form */}
        <form onSubmit={handlePinSubmit} className="space-y-3.5 pt-1">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {formSuccess && (
            <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{formSuccess}</span>
            </div>
          )}

          {/* 1. PIN Saat Ini */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-neutral-300 font-medium">
                PIN Saat Ini ({currentExpectedPin.length} Digit)
              </label>
              {mustChange && (
                <span className="text-[10px] text-amber-400 font-mono">
                  Default: {currentExpectedPin}
                </span>
              )}
            </div>
            <div className="relative">
              <input
                type={showCurrentPin ? 'text' : 'password'}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={8}
                value={currentPinInput}
                onChange={(e) => setCurrentPinInput(e.target.value.replace(/\D/g, ''))}
                placeholder={mustChange ? `Contoh: ${currentExpectedPin}` : 'Masukkan PIN lama Anda'}
                required
                className="w-full min-h-[44px] bg-[#070e1d] border border-white/[0.12] rounded-xl px-3 pr-10 py-2 text-xs text-white font-mono tracking-widest placeholder:tracking-normal placeholder:text-neutral-500 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/40"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPin(!showCurrentPin)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
              >
                {showCurrentPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* 2. PIN Baru (6-8 digit) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-neutral-300 font-medium mb-1">
                PIN Baru (6–8 Digit Angka)
              </label>
              <div className="relative">
                <input
                  type={showNewPin ? 'text' : 'password'}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={8}
                  value={newPinInput}
                  onChange={(e) => setNewPinInput(e.target.value.replace(/\D/g, ''))}
                  placeholder="6-8 digit numerik"
                  required
                  className="w-full min-h-[44px] bg-[#070e1d] border border-white/[0.12] rounded-xl px-3 pr-10 py-2 text-xs text-white font-mono tracking-widest placeholder:tracking-normal placeholder:text-neutral-500 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/40"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPin(!showNewPin)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
                >
                  {showNewPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* 3. Konfirmasi PIN Baru */}
            <div>
              <label className="block text-xs text-neutral-300 font-medium mb-1">
                Konfirmasi PIN Baru
              </label>
              <div className="relative">
                <input
                  type={showConfirmPin ? 'text' : 'password'}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={8}
                  value={confirmPinInput}
                  onChange={(e) => setConfirmPinInput(e.target.value.replace(/\D/g, ''))}
                  placeholder="Ketik ulang PIN baru"
                  required
                  className="w-full min-h-[44px] bg-[#070e1d] border border-white/[0.12] rounded-xl px-3 pr-10 py-2 text-xs text-white font-mono tracking-widest placeholder:tracking-normal placeholder:text-neutral-500 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/40"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPin(!showConfirmPin)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
                >
                  {showConfirmPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !currentPinInput || !newPinInput || !confirmPinInput}
            className="w-full min-h-[46px] mt-2 bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-all"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{isSubmitting ? 'Memproses PIN Baru...' : 'Simpan & Aktifkan PIN Baru'}</span>
          </button>
        </form>
      </div>

      {/* Riwayat Perubahan PIN Akses Audit */}
      <PinChangeHistoryView history={client.pinChangeHistory} clientId={client.id} />

      {/* Logout & Lock Session Section */}
      <div className="bg-[#111827] border border-white/[0.08] rounded-2xl p-4 flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold text-white block">Sesi Masuk: {client.nama_lengkap}</span>
          <span className="text-[11px] text-neutral-400">Kunci sesi akun untuk keamanan data latihan Anda</span>
        </div>
        <button
          type="button"
          onClick={() => setShowLogoutModal(true)}
          className="min-h-[40px] px-3.5 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-400 text-xs font-semibold flex items-center gap-1.5 transition active:scale-95"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Keluar</span>
        </button>
      </div>

      {/* Logout Confirmation Dialog */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-white/[0.1] rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center">
                <LogOut className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Konfirmasi Keluar</h3>
                <p className="text-xs text-neutral-400">Sesi Anda akan dikunci.</p>
              </div>
            </div>
            <p className="text-xs text-neutral-300">
              Apakah Anda yakin ingin keluar dari akun <strong className="text-white">{client.nama_lengkap}</strong>?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.08]">
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                className="min-h-[40px] px-3.5 py-2 rounded-xl bg-white/[0.06] text-neutral-300 hover:text-white text-xs font-semibold"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="min-h-[40px] px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold shadow-md shadow-rose-500/20 active:scale-95 transition"
              >
                Ya, Keluar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
