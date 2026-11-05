import React, { useState } from 'react';
import { CoachProfileData } from '../data/mockData';

interface LoginScreenProps {
  coach: CoachProfileData;
  onLoginSuccess: (method: string) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ coach, onLoginSuccess }) => {
  const [showLogoutToast, setShowLogoutToast] = useState(true);
  const [bioState, setBioState] = useState<'idle' | 'scanning' | 'confirmed'>('idle');
  const [pin, setPin] = useState('');
  const [credIdentifier, setCredIdentifier] = useState('');
  const [credPass, setCredPass] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleBiometricClick = () => {
    if (bioState !== 'idle') return;
    setBioState('scanning');
    setTimeout(() => {
      setBioState('confirmed');
      setTimeout(() => {
        setBioState('idle');
        onLoginSuccess('Sidik Jari / Face ID');
      }, 600);
    }, 800);
  };

  const handleVerifyPin = () => {
    onLoginSuccess('PIN Cepat (6 Digit)');
  };

  const handleCredentialsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLoginSuccess(
      credIdentifier.trim()
        ? `Akun ${credIdentifier.trim()}`
        : 'Kredensial Lisensi Federasi'
    );
  };

  return (
    <div className="bg-[#0c1322] font-sans text-[13px] leading-[20px] text-[#dce2f7] min-h-screen flex flex-col">
      <main className="flex-1 flex flex-col relative w-full max-w-md mx-auto bg-[#0c1322]">
        <div className="flex flex-col w-full px-4 pt-4 pb-8">
          {/* Toast Notifikasi Logout Berhasil */}
          {showLogoutToast && (
            <div
              id="logout-toast"
              className="w-full bg-[#232a3a] rounded-lg p-3 shadow-md mb-3 transition-all duration-300"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 min-w-0">
                  <div className="w-6 h-6 rounded-full bg-[#10b981]/20 flex items-center justify-center shrink-0 mt-0.5">
                    <span
                      className="material-symbols-outlined text-[#4edea3] text-[16px]"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      check_circle
                    </span>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[15px] leading-[22px] font-medium tracking-[-0.01em] text-[#dce2f7]">
                      Sesi Berhasil Diakhiri
                    </span>
                    <span className="text-[12px] leading-[18px] text-[#bbcabf] line-clamp-2">
                      Data lokal &amp; log latihan aman tersinkronisasi ke server.
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="Tutup notifikasi"
                  onClick={() => setShowLogoutToast(false)}
                  className="w-6 h-6 rounded-full bg-[#2e3545] flex items-center justify-center text-[#bbcabf] hover:text-[#dce2f7] shrink-0"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              </div>
              <div className="mt-1 pt-1 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#4edea3] animate-pulse"></span>
                  <span className="font-mono text-[12px] leading-[16px] text-[#4edea3]">
                    PelatihKu Cloud • Online
                  </span>
                </div>
                <span className="text-[11px] leading-[14px] font-medium text-[#bbcabf]">
                  Jakarta IDC Node #4
                </span>
              </div>
            </div>
          )}

          {/* Brand & Logo Header */}
          <div className="flex flex-col items-center text-center my-3">
            <div className="relative w-14 h-14 rounded-2xl bg-[#2e3545] flex items-center justify-center shadow-lg mb-2">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#4edea3]/20 via-transparent to-transparent"></div>
              <span
                className="material-symbols-outlined text-[#4edea3] text-[32px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                bolt
              </span>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#10b981] flex items-center justify-center">
                <span
                  className="material-symbols-outlined text-[#00422b] text-[12px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  fitness_center
                </span>
              </div>
            </div>
            <h1 className="text-[26px] leading-[34px] font-semibold text-[#dce2f7] tracking-[-0.02em]">
              PelatihKu
            </h1>
            <p className="text-[12px] leading-[18px] text-[#bbcabf] max-w-[280px]">
              Athletic Coaching OS v4.2 • Platform Manajemen Performa &amp; Klien Atlet
            </p>
          </div>

          {/* Akun Terakhir Digunakan (Quick One-Tap Re-login) */}
          <div className="w-full bg-[#191f2f] rounded-lg p-3 shadow-md mb-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[12px] leading-[16px] font-medium text-[#bbcabf] uppercase tracking-wider">
                Sesi Terakhir Tersimpan
              </span>
              <span className="text-[11px] leading-[14px] font-medium text-[#ffb95f] bg-[#ffb95f]/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#ffb95f]"></span>
                Baru saja keluar
              </span>
            </div>

            {/* Info Coach */}
            <div className="flex items-center gap-3 p-2 rounded bg-[#141b2b] mb-3">
              <div className="relative shrink-0">
                {!avatarError ? (
                  <img
                    alt={coach.name}
                    referrerPolicy="no-referrer"
                    onError={() => setAvatarError(true)}
                    className="w-12 h-12 rounded-full object-cover bg-[#2e3545]"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuCo0B8YFKowncK99lHqPx54yMdzgY0ok1rVkjnP6X1ZL6r-6aAD-Q35P0itXixSiKeSjv0BMdqsR8pRZSk6VspQo9cNSvXkuwdSYZaZDJ-chvOehbNzVt2KSdUrEfW_Li-lkLFFxafM5XrCDb0mZ9PnmzOfdsHtl4rZbNTBpxaDevGieeDWLIiCIyntlZo2k6ZiTGhqNjKgyNeMTHGx1_vTtgorbJwBm2KNIChxgiM"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-[#2e3545] text-[#4edea3] flex items-center justify-center font-bold text-sm">
                    {coach.initials}
                  </div>
                )}
                <div className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-[#4edea3] flex items-center justify-center">
                  <span
                    className="material-symbols-outlined text-[#003824] text-[10px]"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    check
                  </span>
                </div>
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-[15px] leading-[22px] font-medium text-[#dce2f7] truncate">
                    Coach Hendra Kurniawan, M.Or.
                  </span>
                </div>
                <span className="font-mono text-[12px] leading-[16px] text-[#4edea3]">
                  Head S&amp;C Coach • #PLT-8820-JKT
                </span>
              </div>
            </div>

            {/* Quick Biometric Re-Login Button */}
            <button
              type="button"
              id="bio-auth-btn"
              onClick={handleBiometricClick}
              className={`w-full bg-[#4edea3] hover:bg-[#10b981] text-[#003824] text-[15px] leading-[22px] font-medium py-3 px-3 rounded flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98] ${
                bioState !== 'idle' ? 'opacity-90' : ''
              }`}
            >
              <span
                className="material-symbols-outlined text-[20px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                fingerprint
              </span>
              <span>
                {bioState === 'scanning'
                  ? 'Memindai Sensor Biometrik...'
                  : bioState === 'confirmed'
                  ? 'Verifikasi Dikonfirmasi!'
                  : 'Masuk dengan Sidik Jari / Face ID'}
              </span>
            </button>

            {/* Quick PIN Fallback */}
            <div className="mt-3 pt-2 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <label
                  className="text-[11px] leading-[14px] font-medium text-[#bbcabf]"
                  htmlFor="coach-pin"
                >
                  PIN Cepat (6 Digit)
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById('cred-identifier');
                    el?.focus();
                  }}
                  className="text-[11px] leading-[14px] font-medium text-[#4edea3] hover:underline"
                >
                  Ganti Akun
                </button>
              </div>
              <div className="flex gap-1 items-center">
                <div className="relative flex-1">
                  <input
                    id="coach-pin"
                    type="password"
                    maxLength={6}
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleVerifyPin();
                    }}
                    placeholder="••••••"
                    className="w-full bg-[#070e1d] text-[#dce2f7] placeholder:text-[#86948a] font-mono text-[12px] leading-[16px] text-center tracking-[0.5em] py-2 px-3 rounded focus:outline-none focus:bg-[#232a3a]"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleVerifyPin}
                  className="bg-[#232a3a] text-[#dce2f7] px-3 py-2 rounded text-[12px] leading-[16px] font-medium hover:bg-[#2e3545] active:scale-[0.98] transition"
                >
                  Verifikasi
                </button>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="relative flex items-center justify-center my-2">
            <div className="w-full bg-[#2e3545] h-[1px]"></div>
            <span className="absolute bg-[#0c1322] px-2 text-[11px] leading-[14px] font-medium text-[#bbcabf] uppercase tracking-wider">
              atau masuk akun lain
            </span>
          </div>

          {/* Form Kredensial Alternatif */}
          <form
            onSubmit={handleCredentialsSubmit}
            className="flex flex-col gap-3 mt-2 bg-[#141b2b] rounded-lg p-3"
          >
            <div className="flex flex-col gap-1.5">
              <label
                className="text-[11px] leading-[14px] font-medium text-[#bbcabf] flex items-center justify-between"
                htmlFor="cred-identifier"
              >
                <span>Email Pelatih / No. WhatsApp</span>
                <span className="font-mono text-[12px] leading-[16px] text-[#86948a]">
                  Kemenpora ID / SIM-PB
                </span>
              </label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined text-[#86948a] absolute left-3 text-[18px]">
                  badge
                </span>
                <input
                  id="cred-identifier"
                  type="text"
                  value={credIdentifier}
                  onChange={(e) => setCredIdentifier(e.target.value)}
                  placeholder="hendra.k@pelatihku.id atau 0812xxxx"
                  className="w-full bg-[#070e1d] text-[#dce2f7] placeholder:text-[#86948a]/60 text-[13px] leading-[20px] pl-10 pr-3 py-2.5 rounded focus:outline-none focus:bg-[#232a3a]"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label
                  className="text-[11px] leading-[14px] font-medium text-[#bbcabf]"
                  htmlFor="cred-pass"
                >
                  Kata Sandi Akun
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setStatusMessage(
                      'Tautan reset kata sandi dikirim ke WhatsApp terdaftar.'
                    )
                  }
                  className="text-[11px] leading-[14px] font-medium text-[#4edea3] hover:underline"
                >
                  Lupa Kata Sandi?
                </button>
              </div>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined text-[#86948a] absolute left-3 text-[18px]">
                  lock
                </span>
                <input
                  id="cred-pass"
                  type={showPassword ? 'text' : 'password'}
                  value={credPass}
                  onChange={(e) => setCredPass(e.target.value)}
                  placeholder="Masukkan kata sandi terdaftar"
                  className="w-full bg-[#070e1d] text-[#dce2f7] placeholder:text-[#86948a]/60 text-[13px] leading-[20px] pl-10 pr-10 py-2.5 rounded focus:outline-none focus:bg-[#232a3a]"
                />
                <button
                  type="button"
                  aria-label="Tampilkan kata sandi"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 text-[#86948a] hover:text-[#dce2f7] flex items-center"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-[#232a3a] hover:bg-[#2e3545] text-[#dce2f7] text-[15px] leading-[22px] font-medium py-2.5 px-3 rounded flex items-center justify-center gap-2 active:scale-[0.98] transition"
            >
              <span>Masuk Akun Lain</span>
              <span className="material-symbols-outlined text-[18px]">login</span>
            </button>
          </form>

          {statusMessage && (
            <div className="mt-2 px-3 py-2 rounded bg-[#232a3a] text-[11px] text-[#4edea3] text-center">
              {statusMessage}
            </div>
          )}

          {/* Dukungan & Kontak Gym */}
          <div className="flex items-center justify-center gap-3 my-3 text-center">
            <button
              type="button"
              onClick={() =>
                setStatusMessage('Meja bantuan Gym Partner Senayan & SCBD siap melayani.')
              }
              className="text-[11px] leading-[14px] font-medium text-[#bbcabf] hover:text-[#dce2f7] flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[14px]">
                support_agent
              </span>
              Dukungan Teknis Gym Partner
            </button>
            <span className="text-[#86948a]">•</span>
            <button
              type="button"
              onClick={() =>
                setStatusMessage(
                  'Sinkronisasi Cloud: 100% paket data lokal aman di Jakarta IDC Node #4.'
                )
              }
              className="text-[11px] leading-[14px] font-medium text-[#bbcabf] hover:text-[#dce2f7] flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[14px]">
                sync_problem
              </span>
              Status Sinkronisasi
            </button>
          </div>

          {/* Security & Offline-First Badge Footer */}
          <div className="flex flex-col items-center gap-1 mt-auto pt-2 text-center">
            <div className="inline-flex items-center gap-1 bg-[#232a3a] px-3 py-1.5 rounded-xl shadow-sm">
              <span
                className="material-symbols-outlined text-[#4edea3] text-[14px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                security
              </span>
              <span className="text-[11px] leading-[14px] font-medium text-[#bbcabf]">
                Enkripsi End-to-End • Mode Offline Siap Otomatis di Gym
              </span>
            </div>
            <span className="text-[11px] leading-[14px] font-medium text-[#86948a]">
              PelatihKu Mobile v4.2.1 • Berlisensi Resmi PB PABSI &amp; Kemenpora RI
            </span>
          </div>
        </div>
      </main>
    </div>
  );
};
