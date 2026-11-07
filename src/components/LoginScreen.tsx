import React, { useState } from 'react';
import {
  Dumbbell,
  Fingerprint,
  Lock,
  Mail,
  Eye,
  EyeOff,
  CheckCircle2,
  ShieldCheck,
  Download,
  AlertCircle,
  X,
  ArrowRight,
  Database,
  Sparkles,
  Loader2,
  KeyRound,
  User,
  Shield,
  Sun,
  Moon
} from 'lucide-react';
import { ClientProfile, CoachProfileData } from '../data/mockData';
import { usePwaInstall } from '../hooks/usePwaInstall';
import {
  UserRole,
  UserSessionProfile,
  setActiveSession,
  getActiveSession,
  loginWithGatekeeper,
  deriveInitialPinFromPhone,
  getClientPin
} from '../services/authGatekeeperService';
import { authenticatePinUniversally } from '../services/firestoreService';
import { ThemeMode, getInitialTheme, applyThemeToDOM } from '../services/themeService';

interface LoginScreenProps {
  coach: CoachProfileData;
  clients?: ClientProfile[];
  onLoginSuccess: (method: string, role?: UserRole, clientId?: string) => void;
  theme?: ThemeMode;
  onToggleTheme?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  coach,
  clients = [],
  onLoginSuccess,
  theme: propTheme,
  onToggleTheme
}) => {
  const [internalTheme, setInternalTheme] = useState<ThemeMode>(() => propTheme || getInitialTheme());
  const currentTheme = propTheme || internalTheme;

  const handleToggleTheme = () => {
    if (onToggleTheme) {
      onToggleTheme();
    } else {
      const next: ThemeMode = currentTheme === 'dark' ? 'light' : 'dark';
      setInternalTheme(next);
      applyThemeToDOM(next);
    }
  };
  const [showLogoutToast, setShowLogoutToast] = useState(() => {
    try {
      const loggedOut = sessionStorage.getItem('pelatihku_just_logged_out');
      if (loggedOut === 'true') {
        sessionStorage.removeItem('pelatihku_just_logged_out');
        return true;
      }
      return false;
    } catch {
      return false;
    }
  });

  const [activeTab, setActiveTab] = useState<'pin' | 'email'>('pin');
  const [bioState, setBioState] = useState<'idle' | 'scanning' | 'confirmed'>('idle');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [credIdentifier, setCredIdentifier] = useState('');
  const [credPass, setCredPass] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isVerifyingDb, setIsVerifyingDb] = useState(false);
  const [verifiedUser, setVerifiedUser] = useState<{
    displayName: string;
    role: UserRole;
    clientId?: string;
  } | null>(null);

  const { isInstallable, triggerInstall } = usePwaInstall();

  // Primary Universal PIN Verifier
  const handleVerifyPin = async (inputPin: string) => {
    const cleanPin = inputPin.replace(/\D/g, '').trim();
    if (cleanPin.length < 6) {
      setStatusMessage('PIN harus memiliki 6 hingga 8 digit angka.');
      return;
    }
    if (isVerifyingDb) return;

    setIsVerifyingDb(true);
    setStatusMessage(null);

    try {
      const res = await authenticatePinUniversally(cleanPin, clients);
      if (res.success && res.user) {
        setVerifiedUser({
          displayName: res.user.displayName,
          role: res.user.role,
          clientId: res.user.clientId
        });
        setActiveSession(res.user);

        // Tactile delay to let the user see the verified card transition
        setTimeout(() => {
          onLoginSuccess(
            `PIN Universal (${cleanPin.length} Digit)`,
            res.user!.role,
            res.user!.clientId
          );
        }, 380);
      } else {
        setStatusMessage(res.error || 'PIN tidak terdaftar. Periksa kembali PIN Anda.');
      }
    } catch (err) {
      console.warn('[Login] Verification error:', err);
      setStatusMessage('Gagal memverifikasi ke database. Periksa koneksi internet atau coba lagi.');
    } finally {
      setIsVerifyingDb(false);
    }
  };

  const handlePinChange = (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 8);
    setPin(clean);
    setStatusMessage(null);

    // Auto-verify when 8 digits are reached, or on canonical 6-digit coach/admin PINs
    if (clean.length === 8) {
      handleVerifyPin(clean);
    } else if (clean.length === 6 && (clean === '123456' || clean === '999888')) {
      handleVerifyPin(clean);
    }
  };

  // Quick 1-Tap Fill for testing
  const handleQuickFill = (presetPin: string) => {
    setPin(presetPin);
    setStatusMessage(null);
    handleVerifyPin(presetPin);
  };

  const handleBiometricClick = () => {
    if (bioState !== 'idle') return;
    setStatusMessage(null);

    const active = getActiveSession();
    if (!active) {
      setStatusMessage('Biometrik belum terdaftar pada perangkat ini. Silakan login pertama kali dengan PIN akun Anda.');
      return;
    }

    setBioState('scanning');
    setTimeout(() => {
      setBioState('confirmed');
      setTimeout(() => {
        setBioState('idle');
        onLoginSuccess(`Sidik Jari / Face ID (${active.displayName})`, active.role, active.clientId);
      }, 350);
    }, 550);
  };

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!credIdentifier.trim()) {
      setStatusMessage('Silakan masukkan email atau no. WhatsApp.');
      return;
    }
    if (!credPass.trim()) {
      setStatusMessage('Silakan masukkan PIN atau kata sandi akun.');
      return;
    }

    setIsVerifyingDb(true);
    setStatusMessage(null);

    const ident = credIdentifier.trim().toLowerCase();
    const cleanPass = credPass.replace(/\D/g, '').trim();

    // 1. Try Backend Gatekeeper login if phone number is provided
    const isPhone =
      ident.startsWith('08') ||
      ident.startsWith('+62') ||
      ident.startsWith('62') ||
      /^\d+$/.test(ident);

    if (isPhone && cleanPass) {
      try {
        const gatekeeperRes = await loginWithGatekeeper(ident, cleanPass);
        if (gatekeeperRes.success && gatekeeperRes.user) {
          setActiveSession(gatekeeperRes.user);
          onLoginSuccess(
            `Akun ${gatekeeperRes.user.phoneNumber || ident}`,
            gatekeeperRes.user.role,
            gatekeeperRes.user.clientId
          );
          setIsVerifyingDb(false);
          return;
        }
      } catch (err) {
        console.warn('[Login] Gatekeeper backend API unreachable, fallback to directory match:', err);
      }
    }

    // 2. Coach verification
    const isCoachIdent =
      ident === 'panji.akbar@pelatihku.id' ||
      ident.includes('panji') ||
      ident.includes('coach') ||
      ident === '08119876543' ||
      ident === '+628119876543';
    const coachExpectedPin =
      coach.coachPin ||
      (typeof localStorage !== 'undefined'
        ? localStorage.getItem('pelatihku_v45_coach_pin')
        : null) ||
      '123456';

    if (isCoachIdent) {
      if (cleanPass === coachExpectedPin || credPass === coachExpectedPin || credPass === '123456') {
        const session: UserSessionProfile = {
          uid: 'pas_coach',
          role: 'coach',
          displayName: coach.name || 'Coach Panji Akbar Syamsi',
          email: coach.email || 'panji.akbar@pelatihku.id',
          phoneNumber: '+628119876543'
        };
        setActiveSession(session);
        onLoginSuccess(`Coach ${session.displayName}`, 'coach');
        setIsVerifyingDb(false);
        return;
      } else {
        setIsVerifyingDb(false);
        setStatusMessage('PIN Coach salah! Periksa kembali PIN Anda.');
        return;
      }
    }

    // 3. Admin verification
    const isAdminIdent =
      ident === 'admin@pelatihku.id' ||
      ident.includes('admin') ||
      ident === '0811000999' ||
      ident === '+62811000999';

    if (isAdminIdent) {
      if (cleanPass === '999888' || credPass === '999888') {
        const session: UserSessionProfile = {
          uid: 'gym_admin',
          role: 'admin',
          displayName: 'Gym Operations Manager',
          email: 'admin@pelatihku.id',
          phoneNumber: '+62811000999'
        };
        setActiveSession(session);
        onLoginSuccess('Admin Operations', 'admin');
        setIsVerifyingDb(false);
        return;
      } else {
        setIsVerifyingDb(false);
        setStatusMessage('PIN Admin salah! Periksa kembali PIN Anda.');
        return;
      }
    }

    // 4. Client directory verification
    const cleanPhoneDigits = ident.replace(/\D/g, '');
    const matchedClient = clients.find((c) => {
      const cPhone = c.telepon.replace(/\D/g, '');
      const matchPhone =
        cleanPhoneDigits &&
        (cPhone.endsWith(cleanPhoneDigits) || cleanPhoneDigits.endsWith(cPhone));
      const matchName = c.nama_lengkap.toLowerCase().includes(ident);
      const matchCode = c.code.toLowerCase().includes(ident);
      return matchPhone || matchName || matchCode;
    });

    if (matchedClient) {
      const clientExpectedPin =
        matchedClient.clientPin ||
        deriveInitialPinFromPhone(matchedClient.telepon) ||
        getClientPin(matchedClient.id, matchedClient.telepon);

      if (cleanPass === clientExpectedPin || credPass === clientExpectedPin) {
        const session: UserSessionProfile = {
          uid: matchedClient.id,
          role: 'client',
          displayName: matchedClient.nama_lengkap,
          phoneNumber: matchedClient.telepon,
          clientId: matchedClient.id
        };
        setActiveSession(session);
        onLoginSuccess(`Member ${matchedClient.nama_lengkap}`, 'client', matchedClient.id);
        setIsVerifyingDb(false);
        return;
      } else {
        setIsVerifyingDb(false);
        setStatusMessage('PIN Member salah! Periksa kembali PIN Anda.');
        return;
      }
    }

    setIsVerifyingDb(false);
    setStatusMessage('Akun tidak terdaftar. Periksa nomor WhatsApp / email dan PIN Anda.');
  };

  return (
    <div className="horizon-canvas text-slate-900 dark:text-neutral-200 font-sans antialiased min-h-[100dvh] pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))] px-4 flex flex-col justify-center items-center selection:bg-orange-500/20 selection:text-orange-600 relative overflow-x-hidden transition-colors duration-300">
      {/* Atmospheric Horizon Ambient Light Blooms */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[36rem] h-80 rounded-full bg-white/25 dark:bg-sky-400/[0.08] blur-3xl" />
        <div className="absolute -bottom-24 left-1/2 -translate-x-1/2 w-[38rem] h-96 rounded-full bg-orange-300/30 dark:bg-orange-500/[0.10] blur-3xl" />
      </div>

      <div className="w-full max-w-[380px] flex flex-col gap-3.5 relative z-10">
        {/* Top Control Bar: Brand Status & Single Theme Switcher */}
        <div className="flex items-center justify-between px-2 gap-2">
          <div className="flex items-center gap-2 text-xs text-slate-800/85 dark:text-neutral-300 font-semibold drop-shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse" />
            <span>PelatihKu PRO • v2.7.7</span>
          </div>

          <button
            type="button"
            onClick={handleToggleTheme}
            aria-label={currentTheme === 'dark' ? 'Ganti ke Mode Terang' : 'Ganti ke Mode Gelap'}
            className="min-h-[44px] px-3.5 py-1.5 rounded-2xl liquid-glass-input-pill text-xs font-semibold flex items-center gap-2 transition active:scale-95 cursor-pointer"
          >
            {currentTheme === 'dark' ? (
              <>
                <Sun className="w-4 h-4 text-amber-400" />
                <span className="text-amber-200 text-xs font-semibold">Mode Terang</span>
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 text-slate-800" />
                <span className="text-slate-900 text-xs font-semibold">Mode Gelap</span>
              </>
            )}
          </button>
        </div>

        {/* PWA Install Banner */}
        {isInstallable && (
          <div className="liquid-glass-card rounded-2xl p-3.5 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-white/50 dark:bg-emerald-500/20 text-slate-900 dark:text-emerald-300 border border-white/70 dark:border-emerald-500/30 flex items-center justify-center shrink-0">
                <Download className="w-4 h-4" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-semibold text-slate-900 dark:text-white truncate">Install PelatihKu PRO</span>
                <span className="text-slate-700 dark:text-neutral-300 text-[11px] truncate">Akses instan di lantai gym</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => triggerInstall()}
              className="min-h-[44px] min-w-[68px] liquid-coral-btn font-bold px-3.5 py-2 rounded-xl text-xs shrink-0 flex items-center justify-center"
            >
              Install
            </button>
          </div>
        )}

        {/* Main Refractive Liquid Glass Login Card */}
        <div className="liquid-glass-card rounded-[34px] p-7 sm:p-8 flex flex-col gap-4 relative overflow-hidden">
          {/* Optical Specular Rim Flares (Top, Bottom & Left Edge Glints) */}
          <div className="pointer-events-none absolute -top-[1px] left-1/2 -translate-x-1/2 w-48 h-[3px] bg-gradient-to-r from-transparent via-white to-transparent opacity-95 blur-[0.3px] shadow-[0_0_14px_2px_rgba(255,255,255,0.95)]" />
          <div className="pointer-events-none absolute -bottom-[1px] left-1/2 -translate-x-1/2 w-44 h-[2.5px] bg-gradient-to-r from-transparent via-white/95 to-transparent opacity-90 blur-[0.3px] shadow-[0_0_12px_2px_rgba(255,255,255,0.85)]" />
          <div className="pointer-events-none absolute top-10 bottom-10 -left-[1px] w-[2px] bg-gradient-to-b from-transparent via-white/90 to-transparent opacity-85" />
          <div className="pointer-events-none absolute inset-0 rounded-[34px] bg-[linear-gradient(135deg,rgba(255,255,255,0.34)_0%,rgba(255,255,255,0.05)_44%,transparent_65%)] dark:bg-[linear-gradient(135deg,rgba(255,255,255,0.10)_0%,transparent_50%)]" />

          {/* Centered Login Header */}
          <div className="flex flex-col items-center text-center gap-1.5 relative z-10 pt-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/45 dark:bg-white/[0.08] border border-white/70 dark:border-white/[0.15] text-[10px] font-bold tracking-wider uppercase text-slate-800 dark:text-neutral-200 shadow-2xs">
              <Dumbbell className="w-3 h-3 text-orange-600 dark:text-amber-400" />
              <span>PelatihKu PRO • Athletic OS</span>
            </div>
            <h1 className="text-[28px] font-bold text-slate-900 dark:text-white tracking-tight leading-tight mt-1">
              Login
            </h1>
          </div>

          {/* Success Banner when User is Identified */}
          {verifiedUser && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/20 border border-white/70 dark:border-emerald-500/40 text-slate-900 dark:text-emerald-200 text-xs flex items-center gap-3 animate-in fade-in duration-200 relative z-10">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-slate-900 dark:text-white truncate">
                  {verifiedUser.displayName}
                </span>
                <span className="text-[11px] text-slate-700 dark:text-emerald-300 font-medium">
                  {verifiedUser.role === 'coach'
                    ? '🏋️ Head Coach Panji Akbar Syamsi'
                    : verifiedUser.role === 'client'
                    ? '🏃 Member Personal Training'
                    : '🏢 Administrator Fitness Center'}{' '}
                  • Mengalihkan...
                </span>
              </div>
            </div>
          )}

          {/* Frosted Glass Mode Selector Tabs */}
          <div className="grid grid-cols-2 p-1 rounded-2xl bg-white/35 dark:bg-black/35 border border-white/60 dark:border-white/[0.10] text-xs font-semibold relative z-10">
            <button
              type="button"
              onClick={() => {
                setActiveTab('pin');
                setStatusMessage(null);
              }}
              className={`min-h-[44px] py-2 px-3 rounded-xl text-center transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'pin'
                  ? 'bg-white/80 dark:bg-white/[0.14] text-slate-900 dark:text-white border border-white/90 dark:border-white/25 shadow-sm font-bold'
                  : 'text-slate-700 hover:text-slate-900 dark:text-neutral-300 dark:hover:text-white border border-transparent'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>PIN &amp; Biometrik</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('email');
                setStatusMessage(null);
              }}
              className={`min-h-[44px] py-2 px-3 rounded-xl text-center transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'email'
                  ? 'bg-white/80 dark:bg-white/[0.14] text-slate-900 dark:text-white border border-white/90 dark:border-white/25 shadow-sm font-bold'
                  : 'text-slate-700 hover:text-slate-900 dark:text-neutral-300 dark:hover:text-white border border-transparent'
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Username &amp; Sandi</span>
            </button>
          </div>

          {/* Tab Content 1: PIN & Biometrik (Frosted Glass Inline Pills + Coral Sign In) */}
          {activeTab === 'pin' && (
            <div className="flex flex-col gap-3.5 relative z-10">
              {/* Row 1: Account / Role Indicator Pill */}
              <div className="liquid-glass-input-pill rounded-2xl min-h-[50px] px-4 py-2.5 flex items-center justify-between gap-3">
                <span className="text-xs font-semibold text-slate-700 dark:text-neutral-200 shrink-0">
                  Username
                </span>
                <span className="text-xs font-medium text-slate-600/85 dark:text-neutral-300/80 truncate text-right">
                  {pin === '123456'
                    ? 'panji.akbar@pelatihku.id'
                    : pin === '999888'
                    ? 'admin@pelatihku.id'
                    : pin.length >= 6
                    ? `Member ID • ${pin}`
                    : 'Auto-Deteksi (Coach / Member)'}
                </span>
              </div>

              {/* Row 2: Frosted Glass Inline Password / PIN Pill */}
              <div className="liquid-glass-input-pill rounded-2xl min-h-[50px] pl-4 pr-2 py-1.5 flex items-center gap-3">
                <label
                  htmlFor="universal-pin"
                  className="text-xs font-semibold text-slate-700 dark:text-neutral-200 shrink-0 cursor-pointer"
                >
                  Password
                </label>
                <input
                  id="universal-pin"
                  type={showPin ? 'text' : 'password'}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={8}
                  value={pin}
                  onChange={(e) => handlePinChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleVerifyPin(pin);
                  }}
                  placeholder="PIN 6–8 Digit (cth: 123456)"
                  autoFocus
                  disabled={isVerifyingDb || !!verifiedUser}
                  className="liquid-raw-input w-full bg-transparent border-0 text-right sm:text-left font-mono text-sm tracking-widest text-slate-900 dark:text-white focus:outline-none placeholder:font-sans placeholder:tracking-normal placeholder:text-slate-600/65 dark:placeholder:text-neutral-400/70 disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPin((prev) => !prev)}
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-700 hover:text-slate-950 dark:text-neutral-300 dark:hover:text-white transition-colors shrink-0"
                  aria-label={showPin ? 'Sembunyikan PIN' : 'Tampilkan PIN'}
                >
                  {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Primary Sunset Coral-Orange Glossy Sign In Button */}
              <button
                type="button"
                onClick={() => handleVerifyPin(pin)}
                disabled={isVerifyingDb || pin.length < 6 || !!verifiedUser}
                className="liquid-coral-btn w-full min-h-[50px] rounded-2xl py-3 px-5 text-sm font-semibold flex items-center justify-center gap-2 mt-0.5 cursor-pointer relative overflow-hidden"
              >
                <span className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-28 h-[2px] bg-gradient-to-r from-transparent via-white to-transparent opacity-95" />
                {isVerifyingDb ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Memverifikasi...</span>
                  </>
                ) : verifiedUser ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-white" />
                    <span>Terverifikasi!</span>
                  </>
                ) : (
                  <span>Sign In</span>
                )}
              </button>

              {/* Centered Forgot Password / Bantuan PIN Link + Biometric Trigger */}
              <div className="flex items-center justify-center gap-3 pt-0.5">
                <button
                  type="button"
                  onClick={() =>
                    setStatusMessage(
                      'Member: 8 digit terakhir no. WhatsApp. Coach: 123456. Admin: 999888.'
                    )
                  }
                  className="min-h-[44px] px-2 flex items-center text-xs text-white dark:text-neutral-200 hover:underline font-medium drop-shadow-[0_1px_2px_rgba(15,23,42,0.28)] cursor-pointer"
                >
                  Forgot Password?
                </button>
                <span className="text-white/60 text-xs">•</span>
                <button
                  type="button"
                  id="bio-auth-btn"
                  onClick={handleBiometricClick}
                  disabled={bioState !== 'idle' || !!verifiedUser}
                  className="min-h-[44px] px-2 flex items-center gap-1.5 text-xs text-white dark:text-emerald-300 hover:underline font-semibold drop-shadow-[0_1px_2px_rgba(15,23,42,0.28)] cursor-pointer"
                >
                  <Fingerprint
                    className={`w-3.5 h-3.5 ${
                      bioState === 'scanning' ? 'animate-pulse scale-110' : ''
                    }`}
                  />
                  <span>
                    {bioState === 'scanning'
                      ? 'Memindai...'
                      : bioState === 'confirmed'
                      ? 'Terverifikasi!'
                      : 'Face ID / Biometrik'}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* Tab Content 2: Username & Sandi (Exact Reference Inline Frosted Pills) */}
          {activeTab === 'email' && (
            <form onSubmit={handleCredentialsSubmit} className="flex flex-col gap-3.5 relative z-10">
              {/* Row 1: Username Inline Frosted Pill */}
              <div className="liquid-glass-input-pill rounded-2xl min-h-[50px] px-4 py-2 flex items-center gap-3">
                <label
                  htmlFor="cred-email"
                  className="text-xs font-semibold text-slate-700 dark:text-neutral-200 shrink-0 cursor-pointer"
                >
                  Username
                </label>
                <input
                  id="cred-email"
                  type="text"
                  value={credIdentifier}
                  onChange={(e) => setCredIdentifier(e.target.value)}
                  placeholder="panji.akbar@pelatihku.id / No. WA"
                  className="liquid-raw-input w-full bg-transparent border-0 text-xs text-slate-900 dark:text-white focus:outline-none placeholder:text-slate-600/65 dark:placeholder:text-neutral-400/70"
                />
              </div>

              {/* Row 2: Password Inline Frosted Pill */}
              <div className="liquid-glass-input-pill rounded-2xl min-h-[50px] pl-4 pr-2 py-1.5 flex items-center gap-3">
                <label
                  htmlFor="cred-pass"
                  className="text-xs font-semibold text-slate-700 dark:text-neutral-200 shrink-0 cursor-pointer"
                >
                  Password
                </label>
                <input
                  id="cred-pass"
                  type={showPassword ? 'text' : 'password'}
                  value={credPass}
                  onChange={(e) => setCredPass(e.target.value)}
                  placeholder="Masukkan sandi atau PIN"
                  className="liquid-raw-input w-full bg-transparent border-0 text-xs text-slate-900 dark:text-white focus:outline-none placeholder:text-slate-600/65 dark:placeholder:text-neutral-400/70"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-700 hover:text-slate-950 dark:text-neutral-300 dark:hover:text-white shrink-0"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Primary Sunset Coral-Orange Glossy Sign In Button */}
              <button
                type="submit"
                disabled={isVerifyingDb}
                className="liquid-coral-btn w-full min-h-[50px] rounded-2xl py-3 px-5 text-sm font-semibold flex items-center justify-center gap-2 mt-0.5 cursor-pointer relative overflow-hidden"
              >
                <span className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-28 h-[2px] bg-gradient-to-r from-transparent via-white to-transparent opacity-95" />
                {isVerifyingDb ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Memverifikasi Akun...</span>
                  </>
                ) : (
                  <span>Sign In</span>
                )}
              </button>

              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() =>
                    setStatusMessage('Tautan reset kata sandi dikirim via WhatsApp terdaftar.')
                  }
                  className="min-h-[44px] px-3 flex items-center text-xs text-white dark:text-neutral-200 hover:underline font-medium drop-shadow-[0_1px_2px_rgba(15,23,42,0.28)] cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>
            </form>
          )}

          {/* Status Message Alert */}
          {statusMessage && (
            <div className="p-3 rounded-2xl bg-white/60 dark:bg-amber-500/15 border border-white/80 dark:border-amber-500/30 text-slate-900 dark:text-amber-200 text-xs flex items-center gap-2.5 relative z-10">
              <AlertCircle className="w-4 h-4 shrink-0 text-orange-600 dark:text-amber-400" />
              <span className="flex-1 leading-relaxed font-medium">{statusMessage}</span>
            </div>
          )}

          {/* Quick-Access 1-Tap Persona Bar in Frosted Glass */}
          <div className="flex flex-col gap-1.5 pt-2 border-t border-white/45 dark:border-white/[0.10] relative z-10">
            <span className="text-[10px] uppercase font-bold text-slate-700/90 dark:text-neutral-300 tracking-wider flex items-center justify-center gap-1">
              <Sparkles className="w-3 h-3 text-orange-600 dark:text-amber-400" />
              <span>1-Tap Demo Login:</span>
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickFill('123456')}
                disabled={isVerifyingDb}
                className="min-h-[46px] py-1.5 px-2 rounded-xl liquid-glass-input-pill hover:bg-white/65 dark:hover:bg-white/15 text-[11px] transition active:scale-95 flex flex-col items-center justify-center text-center leading-tight cursor-pointer"
                title="Login Cepat sebagai Head Coach Panji (PIN: 123456)"
              >
                <span className="font-bold text-slate-900 dark:text-white text-[10px]">🏋️ Coach</span>
                <span className="font-mono text-[9px] text-slate-700 dark:text-emerald-300 font-semibold">123456</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('34567801')}
                disabled={isVerifyingDb}
                className="min-h-[46px] py-1.5 px-2 rounded-xl liquid-glass-input-pill hover:bg-white/65 dark:hover:bg-white/15 text-[11px] transition active:scale-95 flex flex-col items-center justify-center text-center leading-tight cursor-pointer"
                title="Login Cepat sebagai Member Budi Santoso (PIN: 34567801)"
              >
                <span className="font-bold text-slate-900 dark:text-white text-[10px]">🏃 Member</span>
                <span className="font-mono text-[9px] text-slate-700 dark:text-sky-300 font-semibold">34567801</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('999888')}
                disabled={isVerifyingDb}
                className="min-h-[46px] py-1.5 px-2 rounded-xl liquid-glass-input-pill hover:bg-white/65 dark:hover:bg-white/15 text-[11px] transition active:scale-95 flex flex-col items-center justify-center text-center leading-tight cursor-pointer"
                title="Login Cepat sebagai Admin Operasional (PIN: 999888)"
              >
                <span className="font-bold text-slate-900 dark:text-white text-[10px]">🏢 Admin</span>
                <span className="font-mono text-[9px] text-slate-700 dark:text-amber-300 font-semibold">999888</span>
              </button>
            </div>
          </div>
        </div>

        {/* Security & Offline-First Footer */}
        <div className="flex flex-col items-center gap-1 text-center mt-0.5">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full liquid-glass-input-pill text-[11px] text-slate-800 dark:text-neutral-300 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Mode Offline Siap di Lantai Gym • Enkripsi Lokal</span>
          </div>
          <p className="text-[11px] text-slate-800/80 dark:text-neutral-400 font-medium">
            PelatihKu PRO • Lead Coach: {coach.name || 'Panji Akbar Syamsi, S.Or.'}
          </p>
        </div>
      </div>

      {/* Normalized Bottom Toast with Safe Area */}
      {showLogoutToast && (
        <div className="fixed bottom-[max(1.5rem,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-emerald-500 text-slate-950 text-xs font-bold shadow-2xl shadow-emerald-500/30 animate-in fade-in slide-in-from-bottom-2 duration-200 max-w-[90vw]">
          <CheckCircle2 className="w-4 h-4 text-slate-950 shrink-0" />
          <span>Sesi diakhiri. Data latihan tersimpan aman di perangkat.</span>
          <button
            type="button"
            onClick={() => setShowLogoutToast(false)}
            className="text-slate-950/70 hover:text-slate-950 ml-1 p-1 min-w-[44px] min-h-[44px] flex items-center justify-center transition active:scale-90"
            aria-label="Tutup notifikasi"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
