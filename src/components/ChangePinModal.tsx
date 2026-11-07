import React, { useState } from 'react';
import {
  KeyRound,
  ShieldCheck,
  Eye,
  EyeOff,
  X,
  AlertCircle,
  CheckCircle2,
  Lock,
  UserCheck
} from 'lucide-react';
import { ClientProfile, PinChangeLogEntry } from '../data/mockData';
import {
  getClientPin,
  setClientPin,
  validateNewPin,
  isCoachOrAdmin,
  UserRole
} from '../services/authGatekeeperService';
import { updateClientPinInFirestore } from '../services/firestoreService';

export interface ChangePinModalProps {
  client: ClientProfile;
  currentUserRole: UserRole;
  currentUserDisplayName?: string;
  onClose: () => void;
  onPinUpdated: (newPin: string, logEntry: PinChangeLogEntry) => void;
  onNotify: (msg: string) => void;
}

export const ChangePinModal: React.FC<ChangePinModalProps> = ({
  client,
  currentUserRole,
  currentUserDisplayName,
  onClose,
  onPinUpdated,
  onNotify
}) => {
  const isSupervisor = isCoachOrAdmin(currentUserRole);
  const currentExpectedPin = client.clientPin || getClientPin(client.id, client.telepon);

  const [currentPinInput, setCurrentPinInput] = useState('');
  const [newPinInput, setNewPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');
  const [supervisorNote, setSupervisorNote] = useState('');

  const [showCurrentPin, setShowCurrentPin] = useState(false);
  const [showNewPin, setShowNewPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanCurrent = currentPinInput.replace(/\D/g, '');
    const cleanNew = newPinInput.replace(/\D/g, '');
    const cleanConfirm = confirmPinInput.replace(/\D/g, '');

    // 1. If not supervisor, current PIN is mandatory and must match
    if (!isSupervisor) {
      if (cleanCurrent !== currentExpectedPin) {
        setErrorMsg('PIN saat ini salah! Harap periksa kembali PIN Anda.');
        return;
      }
    }

    // 2. Validate new PIN invariants (6-8 digits, non-trivial, matching confirmation)
    const validation = validateNewPin(
      cleanNew,
      cleanConfirm,
      isSupervisor ? undefined : currentExpectedPin
    );
    if (!validation.valid) {
      setErrorMsg(validation.error || 'PIN baru tidak memenuhi kriteria keamanan.');
      return;
    }

    setIsSubmitting(true);

    const defaultNote = isSupervisor
      ? `Reset PIN oleh ${currentUserRole === 'admin' ? 'Admin' : 'Coach'} (${supervisorNote.trim() || 'Permintaan Kredensial Member'})`
      : 'PIN diperbarui mandiri oleh member via portal atlet';

    const logEntry: PinChangeLogEntry = {
      id: `pin-log-${Date.now()}`,
      changedAt: new Date().toISOString(),
      changedByRole: currentUserRole,
      changedByName: currentUserDisplayName || (isSupervisor ? 'Coach / Admin' : client.nama_lengkap),
      note: defaultNote
    };

    try {
      const dbSuccess = await updateClientPinInFirestore(client.id, cleanNew, logEntry);
      setClientPin(client.id, cleanNew, logEntry);

      onPinUpdated(cleanNew, logEntry);
      onNotify(
        dbSuccess
          ? `PIN Keamanan untuk ${client.nama_lengkap} berhasil diperbarui & disimpan!`
          : `PIN berhasil diperbarui (offline local cache aktif).`
      );
      setIsSubmitting(false);
      onClose();
    } catch (err) {
      setIsSubmitting(false);
      setErrorMsg('Gagal menyimpan PIN baru ke database. Silakan coba kembali.');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-[#070e1d]/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-[#111726]/95 backdrop-blur-2xl border border-white/[0.12] rounded-3xl max-w-md w-full p-6 space-y-4 shadow-[0_25px_60px_rgba(0,0,0,0.6)] relative my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shadow-sm">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                {isSupervisor ? 'Reset & Perbarui PIN Member' : 'Ubah PIN Keamanan Member'}
              </h3>
              <p className="text-[11px] text-neutral-400">
                {client.nama_lengkap} <span className="font-mono text-neutral-500">({client.code})</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup modal PIN"
            className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-xl text-neutral-400 hover:text-white hover:bg-white/[0.06] flex items-center justify-center transition active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Informational Callout */}
        <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-200 flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
          <div className="text-[11px] leading-relaxed">
            <span className="font-semibold text-blue-300 block">Kriteria PIN Keamanan:</span>
            <span>Minimal 6 hingga 8 digit angka numerik. Hindari kombinasi angka berurutan atau terlalu mudah ditebak.</span>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Current PIN verification (for client member only) */}
          {!isSupervisor ? (
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">
                PIN Saat Ini *
              </label>
              <div className="relative">
                <input
                  type={showCurrentPin ? 'text' : 'password'}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={8}
                  value={currentPinInput}
                  onChange={(e) => setCurrentPinInput(e.target.value.replace(/\D/g, ''))}
                  placeholder="Masukkan PIN saat ini"
                  required
                  className="w-full min-h-[46px] bg-[#070e1d] border border-white/[0.12] rounded-xl px-3.5 pr-11 py-2.5 text-xs text-white font-mono tracking-widest placeholder:tracking-normal placeholder:text-neutral-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPin(!showCurrentPin)}
                  aria-label={showCurrentPin ? 'Sembunyikan PIN saat ini' : 'Tampilkan PIN saat ini'}
                  className="w-11 h-11 min-w-[44px] min-h-[44px] absolute right-0.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white flex items-center justify-center rounded-xl"
                >
                  {showCurrentPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          ) : (
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs flex items-center justify-between">
              <span className="text-[11px] text-amber-300 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5" />
                Mode Otorisasi Coach / Admin
              </span>
              <span className="text-[10px] font-mono text-neutral-400">
                PIN Saat Ini: {currentExpectedPin}
              </span>
            </div>
          )}

          {/* New PIN */}
          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1">
              PIN Baru (6–8 Digit) *
            </label>
            <div className="relative">
              <input
                type={showNewPin ? 'text' : 'password'}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={8}
                value={newPinInput}
                onChange={(e) => setNewPinInput(e.target.value.replace(/\D/g, ''))}
                placeholder="6-8 digit angka numerik"
                required
                className="w-full min-h-[46px] bg-[#070e1d] border border-white/[0.12] rounded-xl px-3.5 pr-11 py-2.5 text-xs text-white font-mono tracking-widest placeholder:tracking-normal placeholder:text-neutral-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50"
              />
              <button
                type="button"
                onClick={() => setShowNewPin(!showNewPin)}
                aria-label={showNewPin ? 'Sembunyikan PIN baru' : 'Tampilkan PIN baru'}
                className="w-11 h-11 min-w-[44px] min-h-[44px] absolute right-0.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white flex items-center justify-center rounded-xl"
              >
                {showNewPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm New PIN */}
          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1">
              Konfirmasi PIN Baru *
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
                className="w-full min-h-[46px] bg-[#070e1d] border border-white/[0.12] rounded-xl px-3.5 pr-11 py-2.5 text-xs text-white font-mono tracking-widest placeholder:tracking-normal placeholder:text-neutral-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPin(!showConfirmPin)}
                aria-label={showConfirmPin ? 'Sembunyikan konfirmasi PIN' : 'Tampilkan konfirmasi PIN'}
                className="w-11 h-11 min-w-[44px] min-h-[44px] absolute right-0.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white flex items-center justify-center rounded-xl"
              >
                {showConfirmPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Optional reason for supervisor */}
          {isSupervisor && (
            <div>
              <label className="block text-[11px] font-medium text-neutral-300 mb-1">
                Catatan Alasan Reset (Opsional)
              </label>
              <input
                type="text"
                value={supervisorNote}
                onChange={(e) => setSupervisorNote(e.target.value)}
                placeholder="Misal: Member lupa PIN / ganti perangkat"
                className="w-full bg-[#070e1d] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-3.5 border-t border-white/[0.08]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="min-h-[44px] px-4 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-xs font-semibold text-neutral-300 transition active:scale-95"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !newPinInput || !confirmPinInput || (!isSupervisor && !currentPinInput)}
              className="min-h-[44px] px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 text-xs font-bold transition active:scale-95 shadow-md shadow-emerald-500/25 flex items-center gap-2"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Menyimpan...' : 'Simpan PIN Baru'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
