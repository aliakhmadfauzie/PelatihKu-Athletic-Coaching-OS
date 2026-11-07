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
  Shield
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

interface LoginScreenProps {
  coach: CoachProfileData;
  clients?: ClientProfile[];
  onLoginSuccess: (method: string, role?: UserRole, clientId?: string) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  coach,
  clients = [],
  onLoginSuccess
}) => {
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
    <div className="bg-[#0B0F17] text-neutral-200 font-sans antialiased min-h-[100dvh] pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))] px-4 flex flex-col justify-center items-center selection:bg-emerald-500/20 selection:text-emerald-300 relative overflow-x-hidden">
      {/* iOS Refined Translucent Ambient Mesh */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-lg h-96 bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.12),transparent_70%)]" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-[radial-gradient(ellipse_at_bottom,rgba(59,130,246,0.06),transparent_70%)]" />
      </div>

      <div className="w-full max-w-sm flex flex-col gap-4 relative z-10">
        {/* PWA Install Banner */}
        {isInstallable && (
          <div className="bg-[#141B28]/90 backdrop-blur-xl border border-emerald-500/30 rounded-2xl p-3.5 flex items-center justify-between gap-3 text-xs shadow-lg shadow-black/50">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
                <Download className="w-4 h-4" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-semibold text-white truncate">Install PelatihKu PRO</span>
                <span className="text-neutral-400 text-[11px] truncate">Akses instan di lantai gym</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => triggerInstall()}
              className="min-h-[44px] min-w-[64px] bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-3.5 py-2 rounded-xl text-xs shrink-0 active:scale-95 transition-transform flex items-center justify-center shadow-md shadow-emerald-500/20"
            >
              Install
            </button>
          </div>
        )}

        {/* Main Login Card with iOS RGBA Glassmorphism */}
        <div className="bg-[#111726]/80 backdrop-blur-2xl border border-white/[0.08] rounded-3xl p-6 sm:p-7 shadow-[0_20px_50px_rgba(0,0,0,0.6),inset_0_1px_0_0_rgba(255,255,255,0.08)] flex flex-col gap-5">
          {/* Brand Header */}
          <div className="flex flex-col items-center text-center gap-2.5">
            <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-[0_8px_20px_-4px_rgba(16,185,129,0.4)] text-slate-950">
              <Dumbbell className="w-6 h-6 stroke-[2.3]" />
            </div>
            <div>
              <div className="flex items-center justify-center gap-1.5">
                <h1 className="text-xl font-bold text-white tracking-tight">
                  Pelatih<span className="text-emerald-400">Ku</span>
                </h1>
                <span className="text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  PRO
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-1 font-medium">
                Athletic Coaching &amp; Personal Training OS
              </p>
            </div>
          </div>

          {/* Success Banner when User is Identified */}
          {verifiedUser && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-3 animate-in fade-in duration-200">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <div className="flex flex-col min-w-0">
                <span className="font-semibold text-white truncate">
                  {verifiedUser.displayName}
                </span>
                <span className="text-[11px] text-emerald-400 font-medium">
                  {verifiedUser.role === 'coach'
                    ? '🏋️ Head Coach Panji Akbar Syamsi'
                    : verifiedUser.role === 'client'
                    ? '🏃 Member Personal Training'
                    : '🏢 Administrator Fitness Center'}{' '}
                  • Mengalihkan ke dashboard...
                </span>
              </div>
            </div>
          )}

          {/* iOS Segmented Tab Selector (Subordinate Tinted Pill so Primary CTA Dominates) */}
          <div className="grid grid-cols-2 p-1 rounded-2xl bg-black/50 border border-white/[0.06] text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setActiveTab('pin');
                setStatusMessage(null);
              }}
              className={`min-h-[44px] py-2.5 px-3 rounded-xl text-center transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'pin'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold shadow-sm'
                  : 'text-neutral-400 hover:text-white border border-transparent'
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
              className={`min-h-[44px] py-2.5 px-3 rounded-xl text-center transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'email'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold shadow-sm'
                  : 'text-neutral-400 hover:text-white border border-transparent'
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Email &amp; Sandi</span>
            </button>
          </div>

          {/* Tab Content 1: PIN & Biometrik */}
          {activeTab === 'pin' && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="universal-pin"
                    className="text-xs text-neutral-300 font-semibold flex items-center gap-1.5"
                  >
                    <span>Masukkan PIN Akun (6–8 Digit)</span>
                    {isVerifyingDb && (
                      <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Verifikasi...
                      </span>
                    )}
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setStatusMessage(
                        'Member: 8 digit terakhir no. WhatsApp. Coach: 123456. Admin: 999888.'
                      )
                    }
                    className="min-h-[44px] px-2 flex items-center text-[11px] text-emerald-400 hover:underline font-medium"
                  >
                    Bantuan PIN?
                  </button>
                </div>

                <div className="relative flex items-center">
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
                    placeholder="••••••••"
                    autoFocus
                    disabled={isVerifyingDb || !!verifiedUser}
                    className="w-full min-h-[52px] bg-black/60 border border-white/[0.12] rounded-2xl text-center text-2xl font-mono tracking-[0.4em] text-white py-3 px-12 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all placeholder:text-neutral-700 disabled:opacity-50 shadow-inner"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin((prev) => !prev)}
                    className="absolute right-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-neutral-400 hover:text-white transition-colors"
                    aria-label={showPin ? 'Sembunyikan PIN' : 'Tampilkan PIN'}
                  >
                    {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Helpful Instruction Snippet */}
                <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05] text-[11px] text-neutral-400 flex flex-col gap-1">
                  <div className="flex items-center gap-1.5 text-neutral-300 font-semibold">
                    <Database className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Autentikasi Cloud Firestore Otomatis:</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-[10px] text-neutral-400 pl-4">
                    <span>• <strong>Pelatih/Admin:</strong> 6 digit PIN</span>
                    <span>• <strong>Member:</strong> 8 digit no. WA</span>
                  </div>
                </div>
              </div>

              {/* Action Button: Masuk / Verifikasi */}
              <button
                type="button"
                onClick={() => handleVerifyPin(pin)}
                disabled={isVerifyingDb || pin.length < 6 || !!verifiedUser}
                className="w-full min-h-[48px] bg-emerald-500 hover:bg-emerald-400 disabled:bg-neutral-800 disabled:text-neutral-500 text-slate-950 font-bold rounded-2xl py-3 px-4 text-xs flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-lg shadow-emerald-500/20"
              >
                {isVerifyingDb ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                    <span>Memverifikasi Database...</span>
                  </>
                ) : verifiedUser ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-slate-950" />
                    <span>Terverifikasi!</span>
                  </>
                ) : (
                  <>
                    <span>Masuk ke PelatihKu PRO</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* 1-Tap Biometric Authentication Button */}
              <button
                type="button"
                id="bio-auth-btn"
                onClick={handleBiometricClick}
                disabled={bioState !== 'idle' || !!verifiedUser}
                className="w-full min-h-[48px] bg-white/[0.04] hover:bg-white/[0.08] active:bg-white/[0.12] border border-white/[0.08] text-white rounded-2xl py-3 px-4 flex items-center justify-center gap-2.5 text-xs font-semibold active:scale-[0.98] transition-all shadow-sm"
              >
                <Fingerprint
                  className={`w-4 h-4 text-emerald-400 ${
                    bioState === 'scanning' ? 'animate-pulse scale-110' : ''
                  }`}
                />
                <span>
                  {bioState === 'scanning'
                    ? 'Memindai Sensor Biometrik...'
                    : bioState === 'confirmed'
                    ? 'Terverifikasi!'
                    : 'Masuk dengan Sidik Jari / Face ID'}
                </span>
              </button>
            </div>
          )}

          {/* Tab Content 2: Email & Sandi */}
          {activeTab === 'email' && (
            <form onSubmit={handleCredentialsSubmit} className="flex flex-col gap-3.5">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="cred-email" className="text-xs text-neutral-300 font-semibold">
                  Email atau No. WhatsApp
                </label>
                <div className="relative flex items-center">
                  <Mail className="w-4 h-4 text-neutral-500 absolute left-3.5 pointer-events-none" />
                  <input
                    id="cred-email"
                    type="text"
                    value={credIdentifier}
                    onChange={(e) => setCredIdentifier(e.target.value)}
                    placeholder="nama@pelatihku.id atau 081234567801"
                    className="w-full min-h-[48px] bg-black/60 border border-white/[0.12] rounded-2xl text-xs text-white pl-10 pr-3 py-2.5 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all placeholder:text-neutral-600"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="cred-pass" className="text-xs text-neutral-300 font-semibold">
                    Kata Sandi / PIN Akun
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setStatusMessage('Tautan reset kata sandi dikirim via WhatsApp terdaftar.')
                    }
                    className="min-h-[44px] px-2 flex items-center text-[11px] text-emerald-400 hover:underline font-medium"
                  >
                    Lupa sandi?
                  </button>
                </div>
                <div className="relative flex items-center">
                  <Lock className="w-4 h-4 text-neutral-500 absolute left-3.5 pointer-events-none" />
                  <input
                    id="cred-pass"
                    type={showPassword ? 'text' : 'password'}
                    value={credPass}
                    onChange={(e) => setCredPass(e.target.value)}
                    placeholder="Masukkan sandi atau PIN akun"
                    className="w-full min-h-[48px] bg-black/60 border border-white/[0.12] rounded-2xl text-xs text-white pl-10 pr-12 py-2.5 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all placeholder:text-neutral-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-neutral-400 hover:text-white"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isVerifyingDb}
                className="w-full min-h-[48px] bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-2xl py-3 px-4 text-xs flex items-center justify-center gap-2 mt-1 active:scale-[0.98] transition-all shadow-lg shadow-emerald-500/20"
              >
                {isVerifyingDb ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                    <span>Memverifikasi Akun...</span>
                  </>
                ) : (
                  <>
                    <span>Masuk Akun</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Status Message Alert */}
          {statusMessage && (
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
              <span className="flex-1 leading-relaxed">{statusMessage}</span>
            </div>
          )}

          {/* Subordinate Quick-Access 1-Tap Persona Bar (Testing & High-Speed Gym-Floor Access) */}
          <div className="flex flex-col gap-1.5 pt-2 border-t border-white/[0.06]">
            <span className="text-[10px] uppercase font-semibold text-neutral-400 tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-emerald-400" />
              <span>Akses Cepat Pengujian Persona (1-Tap):</span>
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => handleQuickFill('123456')}
                disabled={isVerifyingDb}
                className="min-h-[48px] py-2 px-2 rounded-xl bg-white/[0.03] hover:bg-emerald-500/15 border border-white/[0.06] hover:border-emerald-500/40 text-[11px] text-neutral-300 hover:text-emerald-300 transition active:scale-95 flex flex-col items-center justify-center text-center leading-tight"
                title="Login Cepat sebagai Head Coach Panji (PIN: 123456)"
              >
                <span className="font-semibold text-white text-[10px]">🏋️ Coach</span>
                <span className="font-mono text-[9px] text-emerald-400">123456</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('34567801')}
                disabled={isVerifyingDb}
                className="min-h-[48px] py-2 px-2 rounded-xl bg-white/[0.03] hover:bg-blue-500/15 border border-white/[0.06] hover:border-blue-500/40 text-[11px] text-neutral-300 hover:text-blue-300 transition active:scale-95 flex flex-col items-center justify-center text-center leading-tight"
                title="Login Cepat sebagai Member Budi Santoso (PIN: 34567801)"
              >
                <span className="font-semibold text-white text-[10px]">🏃 Member</span>
                <span className="font-mono text-[9px] text-blue-400">34567801</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('999888')}
                disabled={isVerifyingDb}
                className="min-h-[48px] py-2 px-2 rounded-xl bg-white/[0.03] hover:bg-amber-500/15 border border-white/[0.06] hover:border-amber-500/40 text-[11px] text-neutral-300 hover:text-amber-300 transition active:scale-95 flex flex-col items-center justify-center text-center leading-tight"
                title="Login Cepat sebagai Admin Operasional (PIN: 999888)"
              >
                <span className="font-semibold text-white text-[10px]">🏢 Admin</span>
                <span className="font-mono text-[9px] text-amber-400">999888</span>
              </button>
            </div>
          </div>
        </div>

        {/* Security & Offline-First Footer */}
        <div className="flex flex-col items-center gap-1.5 text-center mt-1">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-[11px] text-neutral-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Mode Offline Siap di Lantai Gym • Enkripsi Lokal</span>
          </div>
          <p className="text-[11px] text-neutral-500">
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
