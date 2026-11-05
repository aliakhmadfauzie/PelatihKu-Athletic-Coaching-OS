/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  UserPlus,
  UserCheck,
  CalendarCheck,
  Target,
  Activity,
  Clock,
  MessageCircle,
  ChevronRight,
  Dumbbell,
  Award,
  Users,
  LayoutDashboard,
  CheckCircle2,
  X,
  Plus,
  Menu,
  RefreshCw,
  Flame,
  History,
  UserX,
  Calendar,
  Trophy,
  TrendingUp,
  Settings,
  ShieldCheck,
  LogOut
} from 'lucide-react';
import {
  INITIAL_CLIENTS,
  INITIAL_COACH_PROFILE,
  ClientProfile,
  CoachProfileData,
  SessionRecord,
  PRRecord
} from './data/mockData';
import { LoginScreen } from './components/LoginScreen';
import { ClientDetailView, MedicalAndBaselinePayload } from './components/ClientDetailView';
import { UpdateMetricsModal } from './components/UpdateMetricsModal';
import { LogSessionModal } from './components/LogSessionModal';
import { RescheduleModal } from './components/RescheduleModal';
import { CoachProfileView } from './components/CoachProfileView';
import { SessionsCalendarView } from './components/SessionsCalendarView';

const STORAGE_KEYS = {
  CLIENTS: 'pelatihku_v45_clients',
  COACH: 'pelatihku_v45_coach'
};

export default function App() {
  // Persistent State
  const [clients, setClients] = useState<ClientProfile[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CLIENTS);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.map((c: ClientProfile) =>
          c.leadCoach === 'Hendra Kurniawan' ? { ...c, leadCoach: 'Panji Akbar Syamsi' } : c
        );
      }
      return INITIAL_CLIENTS;
    } catch {
      return INITIAL_CLIENTS;
    }
  });

  const [coach, setCoach] = useState<CoachProfileData>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.COACH);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.name && parsed.name.includes('Hendra')) {
          return {
            ...parsed,
            name: 'Coach Panji Akbar Syamsi',
            initials: 'PAS',
            email: 'panji.akbar@pelatihku.id'
          };
        }
        return parsed;
      }
      return INITIAL_COACH_PROFILE;
    } catch {
      return INITIAL_COACH_PROFILE;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(clients));
    } catch {
      // Ignore storage quota errors
    }
  }, [clients]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.COACH, JSON.stringify(coach));
    } catch {
      // Ignore storage quota errors
    }
  }, [coach]);

  // Navigation & Screen Flow State
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [activeNav, setActiveNav] = useState<'dashboard' | 'calendar' | 'profile'>('dashboard');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [showFullSessionHistory, setShowFullSessionHistory] = useState<boolean>(false);

  // Active Modals
  const [showAddClientModal, setShowAddClientModal] = useState<boolean>(false);
  const [metricsModalClientId, setMetricsModalClientId] = useState<string | null>(null);
  const [logSessionClientId, setLogSessionClientId] = useState<string | null>(null);
  const [rescheduleClientId, setRescheduleClientId] = useState<string | null>(null);

  // Directory Filter State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('Semua');
  const [targetFilter, setTargetFilter] = useState<string>('Semua');
  const tableSearchInputRef = useRef<HTMLInputElement>(null);

  // Add Client Form State
  const [newClientName, setNewClientName] = useState('');
  const [newClientAge, setNewClientAge] = useState('28');
  const [newClientGender, setNewClientGender] = useState<'Pria' | 'Wanita'>('Pria');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientOccupation, setNewClientOccupation] = useState('Eksekutif / Sedentari');
  const [newClientSessions, setNewClientSessions] = useState('24');
  const [newClientTarget, setNewClientTarget] = useState<string>('Fat Loss');
  const [newClientLocation, setNewClientLocation] = useState<
    'Gym Utama Senayan' | 'Private Studio Kemang' | 'SCBD District 8'
  >('Gym Utama Senayan');
  const [newClientFirstSessionDate, setNewClientFirstSessionDate] = useState<string>('2026-11-06');
  const [newClientFirstSessionTime, setNewClientFirstSessionTime] = useState<string>('16:30');
  const [newClientWeight, setNewClientWeight] = useState('');
  const [newClientTargetWeight, setNewClientTargetWeight] = useState('');
  const [newClientBodyFat, setNewClientBodyFat] = useState('');
  const [newClientWaist, setNewClientWaist] = useState('');
  const [newClientMedicalNote, setNewClientMedicalNote] = useState('');

  // Toast Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3000);
  };

  // Keyboard shortcut Cmd/Ctrl + K for quick search focus
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        tableSearchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const selectedClient = useMemo(
    () => clients.find((c) => c.id === selectedClientId) || null,
    [clients, selectedClientId]
  );

  const metricsModalClient = useMemo(
    () => clients.find((c) => c.id === metricsModalClientId) || null,
    [clients, metricsModalClientId]
  );

  const logSessionClient = useMemo(
    () => clients.find((c) => c.id === logSessionClientId) || null,
    [clients, logSessionClientId]
  );

  const rescheduleClient = useMemo(
    () => clients.find((c) => c.id === rescheduleClientId) || null,
    [clients, rescheduleClientId]
  );

  // Filtered Clients matching attached HTML logic
  const filteredClients = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return clients.filter((client) => {
      const matchSearch =
        !q ||
        client.nama_lengkap.toLowerCase().includes(q) ||
        client.target_utama.toLowerCase().includes(q) ||
        client.sesi_terakhir.toLowerCase().includes(q);
      const matchStatus = statusFilter === 'Semua' || client.status === statusFilter;
      const matchTarget =
        targetFilter === 'Semua' ||
        client.target_category.toLowerCase().includes(targetFilter.toLowerCase());
      return matchSearch && matchStatus && matchTarget;
    });
  }, [clients, searchQuery, statusFilter, targetFilter]);

  const handleSelectClient = (clientId: string) => {
    setSelectedClientId(clientId);
    setShowFullSessionHistory(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAddClientSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nama = newClientName.trim();
    const telp = newClientPhone.trim();
    const berat = parseFloat(newClientWeight);
    if (!nama || !telp || isNaN(berat)) return;

    const usiaNum = Math.max(14, Math.min(80, parseInt(newClientAge, 10) || 28));
    const paketTotalNum = Math.max(1, parseInt(newClientSessions, 10) || 24);
    const pekerjaanStr = newClientOccupation.trim() || 'Atlet Kebugaran';

    const words = nama.split(' ');
    const initials =
      words.length > 1
        ? (words[0][0] + words[1][0]).toUpperCase()
        : words[0].substring(0, 2).toUpperCase();

    const targetCategory: 'Fat Loss' | 'Hipertrofi' | 'Powerlifting' = newClientTarget.includes(
      'Fat Loss'
    )
      ? 'Fat Loss'
      : newClientTarget.includes('Hipertrofi')
      ? 'Hipertrofi'
      : 'Powerlifting';

    const parsedTargetWeight = parseFloat(newClientTargetWeight);
    const beratTarget = !isNaN(parsedTargetWeight)
      ? +parsedTargetWeight.toFixed(1)
      : targetCategory === 'Fat Loss'
      ? +(berat - 5).toFixed(1)
      : +(berat + 3).toFixed(1);

    const parsedBodyFat = parseFloat(newClientBodyFat);
    const bodyFatAwal = !isNaN(parsedBodyFat)
      ? +parsedBodyFat.toFixed(1)
      : newClientGender === 'Pria'
      ? 20.0
      : 25.0;

    const parsedWaist = parseFloat(newClientWaist);
    const lingkarPinggangAwal = !isNaN(parsedWaist)
      ? +parsedWaist.toFixed(1)
      : newClientGender === 'Pria'
      ? 84.0
      : 74.0;

    const targetDiff = +(beratTarget - berat).toFixed(1);
    const targetSign = targetDiff > 0 ? `+${targetDiff}` : `${targetDiff}`;
    const formattedTargetUtama =
      targetCategory === 'Fat Loss'
        ? `Fat Loss ${targetSign}kg`
        : targetCategory === 'Hipertrofi'
        ? `Hipertrofi ${targetSign}kg`
        : `Powerlifting & Strength`;

    const estKalori =
      targetCategory === 'Fat Loss'
        ? Math.round(berat * 26)
        : targetCategory === 'Hipertrofi'
        ? Math.round(berat * 34)
        : Math.round(berat * 32);
    const estProtein = Math.round(berat * 2.0);
    const estMuscleMass = +(berat * (1 - bodyFatAwal / 100) * 0.54).toFixed(1);

    const medicalAndCoachNote = newClientMedicalNote.trim()
      ? `Catatan Medis & Kesiapan: ${newClientMedicalNote.trim()}. Baseline nutrisi (${estKalori} kcal / ${estProtein}g protein) telah ditetapkan.`
      : `Baseline nutrisi (${estKalori} kcal / ${estProtein}g protein) dan target hidrasi telah ditetapkan untuk Minggu 1.`;

    const newClient: ClientProfile = {
      id: `k-${Date.now()}`,
      code: `#KLN-2026-${Math.floor(100 + Math.random() * 899)}`,
      nama_lengkap: nama,
      gender: newClientGender,
      usia: usiaNum,
      pekerjaan: pekerjaanStr,
      telepon: telp.replace(/^0/, '62'),
      target_utama: formattedTargetUtama,
      target_category: targetCategory,
      phase: 'Foundation Block I',
      status: 'Aktif',
      initials,
      avatarBg: 'from-emerald-600 to-cyan-700',
      paketTotal: paketTotalNum,
      paketTerpakai: 0,
      dietCompliancePct: 100,
      leadCoach: 'Panji Akbar Syamsi',
      berat_awal_kg: berat,
      berat_terkini_kg: berat,
      berat_target_kg: beratTarget,
      body_fat_awal_pct: bodyFatAwal,
      body_fat_terkini_pct: bodyFatAwal,
      massa_otot_awal_kg: estMuscleMass,
      massa_otot_terkini_kg: estMuscleMass,
      lingkar_pinggang_awal_cm: lingkarPinggangAwal,
      lingkar_pinggang_terkini_cm: lingkarPinggangAwal,
      lingkar_dada_awal_cm: newClientGender === 'Pria' ? 98.0 : 88.0,
      lingkar_dada_terkini_cm: newClientGender === 'Pria' ? 98.0 : 88.0,
      lingkar_lengan_awal_cm: newClientGender === 'Pria' ? 34.0 : 28.5,
      lingkar_lengan_terkini_cm: newClientGender === 'Pria' ? 34.0 : 28.5,
      visceralFatScore: bodyFatAwal > 22 ? 7 : 5,
      kaloriHarian: estKalori,
      kaloriTarget: estKalori,
      proteinHarian: estProtein,
      proteinTarget: estProtein,
      hidrasiLiter: 3.0,
      hidrasiTarget: 3.0,
      weeklyNutritionDays: [
        'tercapai',
        'tercapai',
        'tercapai',
        'tercapai',
        'tercapai',
        'tercapai',
        'tercapai'
      ],
      nutritionCoachNote: medicalAndCoachNote,
      medicalHistoryNote: newClientMedicalNote.trim() || undefined,
      nextSession: {
        date: newClientFirstSessionDate || '2026-11-06',
        time: newClientFirstSessionTime || '16:30',
        focus: newClientMedicalNote.trim()
          ? `Assessment & Screening (${newClientMedicalNote.trim()})`
          : 'Movement Screening & Baseline Assessment',
        location: newClientLocation || 'Gym Utama Senayan',
        confirmed: true
      },
      sesi_terakhir: `Paket 0/${paketTotalNum} Sesi — Jadwal Perdana`,
      weeklyTrend: [
        {
          weekLabel: 'M1',
          weightKg: berat,
          bodyFatPct: bodyFatAwal,
          muscleMassKg: estMuscleMass,
          waistCm: lingkarPinggangAwal
        }
      ],
      prList: [],
      sessions: [],
      photos: []
    };

    setClients((prev) => [newClient, ...prev]);

    // Reset form state
    setNewClientName('');
    setNewClientAge('28');
    setNewClientPhone('');
    setNewClientOccupation('Eksekutif / Sedentari');
    setNewClientSessions('24');
    setNewClientWeight('');
    setNewClientTargetWeight('');
    setNewClientBodyFat('');
    setNewClientWaist('');
    setNewClientMedicalNote('');
    setShowAddClientModal(false);

    // Navigate directly to the newly created client's profile screen for additional data entry
    setActiveNav('dashboard');
    handleSelectClient(newClient.id);
    showToast(
      `Klien "${nama}" (${paketTotalNum} Sesi) terdaftar! Silakan lengkapi profil & data lanjutan.`
    );
  };

  const handleSaveMetrics = (
    clientId: string,
    updated: {
      weightKg: number;
      bodyFatPct: number;
      muscleMassKg: number;
      waistCm: number;
      chestCm: number;
      armCm: number;
    }
  ) => {
    setClients((prev) =>
      prev.map((c) => {
        if (c.id !== clientId) return c;
        const nextTrend = [...c.weeklyTrend];
        if (nextTrend.length > 0) {
          nextTrend[nextTrend.length - 1] = {
            weekLabel: 'M8',
            weightKg: updated.weightKg,
            bodyFatPct: updated.bodyFatPct,
            muscleMassKg: updated.muscleMassKg,
            waistCm: updated.waistCm
          };
        }
        return {
          ...c,
          berat_terkini_kg: updated.weightKg,
          body_fat_terkini_pct: updated.bodyFatPct,
          massa_otot_terkini_kg: updated.muscleMassKg,
          lingkar_pinggang_terkini_cm: updated.waistCm,
          lingkar_dada_terkini_cm: updated.chestCm,
          lingkar_lengan_terkini_cm: updated.armCm,
          weeklyTrend: nextTrend
        };
      })
    );
    showToast('Metrik & komposisi tubuh berhasil dikalibrasi');
  };

  const handleSaveSession = (clientId: string, newSession: SessionRecord) => {
    setClients((prev) =>
      prev.map((c) => {
        if (c.id !== clientId) return c;

        const updatedPrList = [...c.prList];
        newSession.exercises.forEach((ex) => {
          const prSet = ex.sets.find((s) => s.isPR);
          if (prSet) {
            const est1RM = +(prSet.weightKg * (1 + prSet.reps / 30)).toFixed(1);
            const deltaKg = +(prSet.weightKg - ex.historicalBestKg).toFixed(1);
            const existingIdx = updatedPrList.findIndex(
              (p) => p.exerciseName.toLowerCase() === ex.name.toLowerCase()
            );
            const newPrItem: PRRecord = {
              id: `pr-${Date.now()}-${Math.random()}`,
              exerciseName: ex.name,
              category: ex.category,
              weightKg: prSet.weightKg,
              reps: prSet.reps,
              est1RM,
              deltaKg: deltaKg > 0 ? deltaKg : 2.5,
              achievedDate: newSession.date,
              note: `Sesi #${newSession.sessionNumber} · RPE ${newSession.rpe}`
            };
            if (existingIdx >= 0) {
              updatedPrList[existingIdx] = newPrItem;
            } else {
              updatedPrList.unshift(newPrItem);
            }
          }
        });

        const nextTerpakai =
          newSession.status === 'Hadir'
            ? Math.min(c.paketTotal, c.paketTerpakai + 1)
            : c.paketTerpakai;

        return {
          ...c,
          paketTerpakai: nextTerpakai,
          sesi_terakhir: `Hari ini — ${newSession.focus}`,
          sessions: [newSession, ...c.sessions],
          prList: updatedPrList
        };
      })
    );

    setLogSessionClientId(null);
    showToast(`Sesi #${newSession.sessionNumber} tersimpan & kuota paket diperbarui`);
  };

  const handleConfirmReschedule = (
    clientId: string,
    payload: {
      date: string;
      time: string;
      location: 'Gym Utama Senayan' | 'SCBD District 8' | 'Private Studio Kemang';
      reason: string;
      sendWaNotification: boolean;
    }
  ) => {
    setClients((prev) =>
      prev.map((c) => {
        if (c.id !== clientId) return c;
        return {
          ...c,
          nextSession: {
            ...c.nextSession,
            date: payload.date,
            time: payload.time,
            location: payload.location,
            confirmed: true,
            rescheduleReason: payload.reason
          }
        };
      })
    );
    setRescheduleClientId(null);
    showToast(
      `Jadwal sesi dipindah ke ${payload.date} (${payload.time} WIB) di ${payload.location}`
    );
  };

  const handleAddClientPR = (clientId: string, newPr: PRRecord) => {
    setClients((prev) =>
      prev.map((c) => (c.id === clientId ? { ...c, prList: [newPr, ...c.prList] } : c))
    );
    showToast(`Rekor PR baru (${newPr.exerciseName} ${newPr.weightKg}kg) ditambahkan!`);
  };

  const handleToggleNutritionDay = (clientId: string, dayIdx: number) => {
    setClients((prev) =>
      prev.map((c) => {
        if (c.id !== clientId) return c;
        const nextDays = [...c.weeklyNutritionDays];
        const current = nextDays[dayIdx] || 'tercapai';
        nextDays[dayIdx] =
          current === 'tercapai' ? 'longgar' : current === 'longgar' ? 'terlewat' : 'tercapai';
        const compliantCount = nextDays.filter((d) => d === 'tercapai').length;
        const nextPct = Math.round((compliantCount / 7) * 100);
        return {
          ...c,
          weeklyNutritionDays: nextDays,
          dietCompliancePct: nextPct
        };
      })
    );
  };

  const handleUploadProgressPhoto = (clientId: string, weekLabel: string, dataUrl?: string) => {
    setClients((prev) =>
      prev.map((c) => {
        if (c.id !== clientId) return c;
        const newPhoto = {
          id: `ph-${Date.now()}`,
          weekLabel,
          date: '05 Nov 2026',
          weightKg: c.berat_terkini_kg,
          bodyFatPct: c.body_fat_terkini_pct,
          waistCm: c.lingkar_pinggang_terkini_cm,
          pose: 'Front Torso Check-In',
          lightingNote: 'Cek Berkala Terverifikasi',
          customImageUrl: dataUrl
        };
        return {
          ...c,
          photos: [...c.photos, newPhoto]
        };
      })
    );
    showToast('Foto cek fisik berkala berhasil disimpan');
  };

  const handleUpdateMedicalAndBaseline = (
    clientId: string,
    payload: MedicalAndBaselinePayload
  ) => {
    setClients((prev) =>
      prev.map((c) => {
        if (c.id !== clientId) return c;
        const nextTrend = [...c.weeklyTrend];
        if (nextTrend.length > 0) {
          nextTrend[0] = {
            ...nextTrend[0],
            weightKg: payload.berat_awal_kg,
            bodyFatPct: payload.body_fat_awal_pct,
            waistCm: payload.lingkar_pinggang_awal_cm
          };
        }
        return {
          ...c,
          kaloriTarget: payload.kaloriTarget,
          kaloriHarian: payload.kaloriHarian,
          proteinTarget: payload.proteinTarget,
          proteinHarian: payload.proteinHarian,
          karboTarget: payload.karboTarget,
          lemakTarget: payload.lemakTarget,
          hidrasiTarget: payload.hidrasiTarget,
          hidrasiLiter: payload.hidrasiLiter,
          nutritionCoachNote: payload.nutritionCoachNote,
          dietDetailNote: payload.dietDetailNote,
          medicalHistoryNote: payload.medicalHistoryNote,
          postureScreeningNote: payload.postureScreeningNote,
          berat_awal_kg: payload.berat_awal_kg,
          berat_target_kg: payload.berat_target_kg,
          body_fat_awal_pct: payload.body_fat_awal_pct,
          lingkar_pinggang_awal_cm: payload.lingkar_pinggang_awal_cm,
          lingkar_dada_awal_cm: payload.lingkar_dada_awal_cm,
          lingkar_lengan_awal_cm: payload.lingkar_lengan_awal_cm,
          baselinePhotoUrl: payload.baselinePhotoUrl,
          baselinePhotoPose: payload.baselinePhotoPose,
          baselinePhotoDate: payload.baselinePhotoDate,
          weeklyTrend: nextTrend
        };
      })
    );
    showToast('Data medis lanjut, makronutrisi & referensi awal berhasil disimpan!');
  };

  if (isLocked) {
    return (
      <LoginScreen
        coach={coach}
        onLoginSuccess={(method) => {
          setIsLocked(false);
          showToast(`Sesi dibuka via ${method}`);
        }}
      />
    );
  }

  const isAnyOverlayOpen = Boolean(
    drawerOpen ||
      showAddClientModal ||
      metricsModalClientId ||
      logSessionClientId ||
      rescheduleClientId
  );

  return (
    <div className="bg-[#0B0F17] text-neutral-200 font-sans antialiased min-h-screen selection:bg-emerald-500/20 selection:text-emerald-300">
      {/* Mobile Top Bar & Header Navigation */}
      <header className="sticky top-0 z-40 bg-[#0B0F17]/90 backdrop-blur-xl border-b border-white/[0.08]">
        <div className="px-4 py-3 flex items-center justify-between max-w-xl mx-auto">
          {/* Brand Logo */}
          <div
            onClick={() => {
              setSelectedClientId(null);
              setShowFullSessionHistory(false);
              setActiveNav('dashboard');
            }}
            className="flex items-center gap-2.5 cursor-pointer"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-slate-950">
              <Dumbbell className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-base text-white tracking-tight">
                  Pelatih<span className="text-emerald-400">Ku</span>
                </span>
                <span className="text-[10px] uppercase font-semibold tracking-wider px-1.5 py-0.5 rounded-full bg-white/[0.06] text-neutral-400 border border-white/[0.06]">
                  Pro
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 font-medium">
                Fitness Center &amp; Personal Training OS
              </p>
            </div>
          </div>
        </div>

        {/* Contextual Greeting Sub-bar */}
        <div className="bg-white/[0.02] border-t border-white/[0.04]">
          <div className="px-4 py-2 max-w-xl mx-auto flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 truncate">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-neutral-300 font-medium truncate">
                Selamat Siang,{' '}
                <strong
                  onClick={() => {
                    setSelectedClientId(null);
                    setActiveNav('profile');
                  }}
                  className="text-white font-semibold cursor-pointer hover:text-emerald-400 transition-colors"
                >
                  {coach.name || 'Coach Panji Akbar Syamsi'}
                </strong>
              </span>
            </div>
            <span className="text-[11px] text-neutral-400 whitespace-nowrap pl-2">
              Kamis, 5 Nov 2026
            </span>
          </div>
        </div>
      </header>

      {/* Mobile Drawer Menu (Navigasi Lengkap) */}
      {drawerOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setDrawerOpen(false);
          }}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm transition-opacity duration-200"
        >
          <div className="absolute right-0 top-0 bottom-0 w-4/5 max-w-xs bg-[#111827] border-l border-white/[0.1] p-5 flex flex-col justify-between shadow-2xl">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                    <Dumbbell className="w-4 h-4" />
                  </div>
                  <span className="font-bold text-white text-base">PelatihKu Menu</span>
                </div>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/[0.06]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Navigation Links */}
              <nav className="mt-4 space-y-1">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedClientId(null);
                    setShowFullSessionHistory(false);
                    setActiveNav('dashboard');
                    setDrawerOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium text-sm transition ${
                    activeNav === 'dashboard' && !selectedClientId
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'text-neutral-300 hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Dashboard</span>
                  {activeNav === 'dashboard' && !selectedClientId && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  )}
                </button>

                <a
                  href="#klienSection"
                  onClick={() => {
                    setSelectedClientId(null);
                    setShowFullSessionHistory(false);
                    setActiveNav('dashboard');
                    setDrawerOpen(false);
                  }}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-neutral-300 hover:text-white hover:bg-white/[0.04] font-medium text-sm transition"
                >
                  <Users className="w-4 h-4" />
                  <span>Member Fitness Center</span>
                  <span className="ml-auto px-1.5 py-0.5 rounded text-[10px] bg-white/[0.06] text-neutral-400 font-mono">
                    24
                  </span>
                </a>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedClientId(null);
                    setShowFullSessionHistory(false);
                    setActiveNav('calendar');
                    setDrawerOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium text-sm transition ${
                    activeNav === 'calendar'
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      : 'text-neutral-300 hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                  <span>Jadwal &amp; Sesi</span>
                  {activeNav === 'calendar' && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-amber-400" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleSelectClient(clients[0]?.id || 'k-01');
                    setDrawerOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-neutral-300 hover:text-white hover:bg-white/[0.04] font-medium text-sm transition"
                >
                  <Trophy className="w-4 h-4" />
                  <span>Papan Rekor (PR)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMetricsModalClientId(clients[0]?.id || 'k-01');
                    setDrawerOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-neutral-300 hover:text-white hover:bg-white/[0.04] font-medium text-sm transition"
                >
                  <TrendingUp className="w-4 h-4" />
                  <span>Laporan &amp; Progres</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedClientId(null);
                    setShowFullSessionHistory(false);
                    setActiveNav('profile');
                    setDrawerOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium text-sm transition ${
                    activeNav === 'profile'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'text-neutral-300 hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  <Settings className="w-4 h-4" />
                  <span>Pengaturan &amp; Profil</span>
                </button>
              </nav>
            </div>

            {/* Bottom Profile */}
            <div className="pt-4 border-t border-white/[0.08]">
              <div className="flex items-center justify-between p-2 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <div
                  onClick={() => {
                    setSelectedClientId(null);
                    setActiveNav('profile');
                    setDrawerOpen(false);
                  }}
                  className="flex items-center gap-2.5 cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-500 to-emerald-400 p-[1.5px]">
                    <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center text-xs font-bold text-white">
                      {coach.initials || 'PAS'}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white leading-tight">
                      {coach.name || 'Coach Panji Akbar Syamsi'}
                    </p>
                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
                      <ShieldCheck className="w-3 h-3" /> Master Fitness Trainer
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  title="Keluar"
                  onClick={() => {
                    setDrawerOpen(false);
                    setIsLocked(true);
                  }}
                  className="p-1.5 text-neutral-400 hover:text-rose-400 transition"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Container Tombol Floating */}
      <div className="fixed bottom-6 right-5 z-40 flex flex-col items-end gap-3 pointer-events-none">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label="Buka menu navigasi"
          className={`pointer-events-auto flex items-center justify-center w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-semibold shadow-lg shadow-emerald-950/40 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-slate-900 ${
            isAnyOverlayOpen ? 'opacity-0 pointer-events-none scale-90' : 'opacity-100'
          }`}
        >
          <svg
            className="w-6 h-6 stroke-[2.2]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
            />
          </svg>
        </button>
      </div>

      {/* Main Container */}
      <main className="max-w-xl mx-auto min-h-screen pb-28 px-4 pt-4 space-y-6">
        {selectedClient ? (
          <ClientDetailView
            client={selectedClient}
            showFullSessionHistory={showFullSessionHistory}
            onToggleFullSessionHistory={setShowFullSessionHistory}
            onBackToDashboard={() => {
              setSelectedClientId(null);
              setShowFullSessionHistory(false);
            }}
            onOpenUpdateMetrics={() => setMetricsModalClientId(selectedClient.id)}
            onOpenLogSession={() => setLogSessionClientId(selectedClient.id)}
            onOpenReschedule={() => setRescheduleClientId(selectedClient.id)}
            onAddPR={(newPr) => handleAddClientPR(selectedClient.id, newPr)}
            onToggleNutritionDay={(dayIdx) =>
              handleToggleNutritionDay(selectedClient.id, dayIdx)
            }
            onUploadProgressPhoto={(weekLabel, dataUrl) =>
              handleUploadProgressPhoto(selectedClient.id, weekLabel, dataUrl)
            }
            onUpdateMedicalAndBaseline={(payload) =>
              handleUpdateMedicalAndBaseline(selectedClient.id, payload)
            }
          />
        ) : activeNav === 'calendar' ? (
          <SessionsCalendarView
            clients={clients}
            onBackToDashboard={() => setActiveNav('dashboard')}
            onSelectClient={(clientId) => {
              handleSelectClient(clientId);
            }}
            onOpenLogSession={(clientId) => setLogSessionClientId(clientId)}
            onOpenReschedule={(clientId) => setRescheduleClientId(clientId)}
            onScheduleNewSession={(newSession) => {
              setClients((prev) =>
                prev.map((c) => {
                  if (c.id !== newSession.clientId) return c;
                  return {
                    ...c,
                    nextSession: {
                      date: newSession.date,
                      time: newSession.time,
                      location: newSession.location,
                      focus: newSession.focus,
                      confirmed: true
                    }
                  };
                })
              );
            }}
            onNotify={showToast}
          />
        ) : activeNav === 'profile' ? (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => setActiveNav('dashboard')}
              className="text-xs font-semibold text-emerald-400 hover:underline flex items-center gap-1"
            >
              ← Kembali ke Dashboard
            </button>
            <CoachProfileView
              coach={coach}
              activeClientsCount={24}
              onUpdateCoach={setCoach}
              onLogoutConfirmed={() => setIsLocked(true)}
              onNotify={showToast}
            />
          </div>
        ) : (
          <>
            {/* Search Shortcut & Quick Action Bar */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari member, target PT, sesi..."
                  className="w-full bg-[#111827]/80 border border-white/[0.08] rounded-xl pl-9 pr-14 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/40 transition"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-neutral-500 bg-white/[0.06] border border-white/[0.08] px-1.5 py-0.5 rounded">
                  ⌘K
                </span>
              </div>

              <button
                type="button"
                onClick={() => setShowAddClientModal(true)}
                className="shrink-0 flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-semibold text-xs transition active:scale-95 shadow-md shadow-emerald-500/20"
              >
                <UserPlus className="w-4 h-4 stroke-[2.3]" />
                <span>Tambah Member</span>
              </button>
            </div>

            {/* Asymmetric KPI Bento Grid */}
            <section>
              <div className="flex items-center justify-between mb-2.5">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                  Ringkasan Performa Fitness Center
                </h2>
                <span className="text-[11px] text-emerald-400/90 flex items-center gap-1 font-medium">
                  <RefreshCw className="w-3 h-3" /> Real-time
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {/* Bento 1: Total Member Aktif */}
                <div className="card-glass hairline-border rounded-2xl p-3.5 relative overflow-hidden group hover:border-emerald-500/30 transition">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-medium text-neutral-400">
                      Total Member Aktif
                    </span>
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                      <UserCheck className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-bold text-white tracking-tightest">
                      {clients.length + 19}
                    </span>
                    <span className="text-xs text-neutral-400 font-medium">Member</span>
                  </div>
                  <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-emerald-400">
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 font-medium font-mono text-[10px]">
                      +3
                    </span>
                    <span className="text-neutral-400">bulan ini</span>
                  </div>
                </div>

                {/* Bento 2: Sesi Minggu Ini (Clickable to open Sessions Calendar View) */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    setSelectedClientId(null);
                    setShowFullSessionHistory(false);
                    setActiveNav('calendar');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedClientId(null);
                      setShowFullSessionHistory(false);
                      setActiveNav('calendar');
                    }
                  }}
                  title="Klik untuk membuka Kalender & Jadwal Sesi Mingguan"
                  className="card-glass hairline-border rounded-2xl p-3.5 relative overflow-hidden group hover:border-amber-400/50 hover:bg-white/[0.04] active:scale-[0.98] transition-all cursor-pointer select-none"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-medium text-neutral-400 group-hover:text-amber-300 transition-colors flex items-center gap-1">
                      <span>Sesi Minggu Ini</span>
                      <ChevronRight className="w-3 h-3 text-amber-400 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                    </span>
                    <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20 group-hover:bg-amber-500/25 transition-colors">
                      <CalendarCheck className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-bold text-white tracking-tightest group-hover:text-amber-200 transition-colors">38</span>
                    <span className="text-xs text-neutral-400 font-medium">Sesi</span>
                  </div>
                  <div className="mt-2.5">
                    <div className="flex justify-between text-[10px] text-neutral-400 mb-1">
                      <span>Progres Sesi</span>
                      <span className="text-amber-400 font-medium font-mono">26 / 38</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full"
                        style={{ width: '68%' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Bento 3: Target Member Tercapai */}
                <div className="card-glass hairline-border rounded-2xl p-3.5 relative overflow-hidden group hover:border-emerald-500/30 transition">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-medium text-neutral-400">
                      Target Tercapai
                    </span>
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                      <Target className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-bold text-white tracking-tightest">7</span>
                    <span className="text-xs text-neutral-400 font-medium">Member</span>
                  </div>
                  <div className="mt-2 flex items-center gap-1 text-[11px] text-neutral-400">
                    <Flame className="w-3 h-3 text-amber-400 shrink-0" />
                    <span className="truncate text-[10px]">Fat loss &gt;3kg tercapai</span>
                  </div>
                </div>

                {/* Bento 4: Rata-rata Kepatuhan Sesi */}
                <div className="card-glass hairline-border rounded-2xl p-3.5 relative overflow-hidden group hover:border-emerald-500/30 transition">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-medium text-neutral-400">
                      Kepatuhan Sesi
                    </span>
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                      <Activity className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-bold text-emerald-400 tracking-tightest">
                      94.2%
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-1.5">
                    <svg
                      className="w-full h-4 text-emerald-400"
                      viewBox="0 0 100 20"
                      fill="none"
                      stroke="currentColor"
                    >
                      <path
                        d="M0 16 L20 14 L40 15 L60 8 L80 10 L100 3"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            </section>

            {/* Direktori Member Fitness Center Section */}
            <section id="klienSection" className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-white tracking-tight">
                    Direktori Member Fitness Center
                  </h2>
                  <p className="text-[11px] text-neutral-400">
                    Kelola dan pantau progres latihan &amp; sesi PT member
                  </p>
                </div>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/[0.06] text-neutral-300 border border-white/[0.08] font-mono">
                  {filteredClients.length} Member Ditampilkan
                </span>
              </div>

              {/* Filter Bar: Search, Status, Target */}
              <div className="card-glass hairline-border rounded-xl p-3 space-y-2.5">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    ref={tableSearchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari nama member (contoh: Budi, Siti)..."
                    className="w-full bg-[#0B0F17]/90 border border-white/[0.08] rounded-lg pl-8 pr-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500/50 transition"
                  />
                </div>

                <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs no-scrollbar">
                  {/* Status Dropdown Filter */}
                  <div className="flex items-center gap-1 text-[11px] text-neutral-400 shrink-0">
                    <span>Status:</span>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="bg-[#0B0F17] border border-white/[0.08] rounded-md px-2 py-1 text-neutral-200 text-xs focus:outline-none focus:border-emerald-500/50"
                    >
                      <option value="Semua">Semua Status</option>
                      <option value="Aktif">Aktif</option>
                      <option value="Cuti">Cuti</option>
                    </select>
                  </div>

                  {/* Target Dropdown Filter */}
                  <div className="flex items-center gap-1 text-[11px] text-neutral-400 shrink-0">
                    <span>Target:</span>
                    <select
                      value={targetFilter}
                      onChange={(e) => setTargetFilter(e.target.value)}
                      className="bg-[#0B0F17] border border-white/[0.08] rounded-md px-2 py-1 text-neutral-200 text-xs focus:outline-none focus:border-emerald-500/50"
                    >
                      <option value="Semua">Semua Target</option>
                      <option value="Fat Loss">Fat Loss</option>
                      <option value="Hipertrofi">Hipertrofi</option>
                      <option value="Powerlifting">Powerlifting</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setStatusFilter('Semua');
                      setTargetFilter('Semua');
                    }}
                    className="ml-auto text-[11px] text-neutral-400 hover:text-emerald-400 transition underline shrink-0"
                  >
                    Reset
                  </button>
                </div>
              </div>

              {/* Client Cards List */}
              {filteredClients.length === 0 ? (
                <div className="card-glass hairline-border rounded-2xl p-8 text-center space-y-2">
                  <div className="w-10 h-10 rounded-full bg-white/[0.04] text-neutral-400 flex items-center justify-center mx-auto border border-white/[0.08]">
                    <UserX className="w-5 h-5" />
                  </div>
                  <p className="text-sm font-medium text-white">
                    Tidak ada member ditemukan
                  </p>
                  <p className="text-xs text-neutral-400">
                    Coba ubah kata kunci pencarian atau sesuaikan opsi filter status/target.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {filteredClients.map((client) => {
                    const diffNum = +(
                      client.berat_terkini_kg - client.berat_awal_kg
                    ).toFixed(1);
                    const isLoss = diffNum < 0;
                    const isGain = diffNum > 0;
                    const diffText = isLoss
                      ? `${diffNum.toFixed(1)} kg`
                      : isGain
                      ? `+${diffNum.toFixed(1)} kg`
                      : '0.0 kg';

                    const diffBadgeClass = isLoss
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : isGain
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      : 'bg-neutral-500/10 text-neutral-400 border-neutral-500/20';

                    const statusClass =
                      client.status === 'Aktif'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-neutral-500/10 text-neutral-400 border-neutral-500/20';

                    const avatarGradient = client.avatarBg.includes('from-')
                      ? client.avatarBg
                      : 'from-blue-500 to-indigo-600';

                    return (
                      <div
                        key={client.id}
                        className="card-glass hairline-border rounded-xl p-3.5 hover:border-white/[0.15] transition-all duration-200"
                      >
                        {/* Header Row: Avatar, Name, Status Badge */}
                        <div className="flex items-start justify-between gap-2 mb-2.5">
                          <div
                            onClick={() => handleSelectClient(client.id)}
                            className="flex items-center gap-2.5 min-w-0 cursor-pointer"
                          >
                            <div
                              className={`w-9 h-9 rounded-xl bg-gradient-to-br ${avatarGradient} flex items-center justify-center text-xs font-bold text-white shadow-sm shrink-0`}
                            >
                              {client.initials}
                            </div>
                            <div className="truncate">
                              <div className="flex items-center gap-1.5">
                                <h4 className="text-xs font-semibold text-white tracking-tight truncate">
                                  {client.nama_lengkap}
                                </h4>
                                <span className="text-[10px] text-neutral-400">
                                  ({client.usia} thn)
                                </span>
                              </div>
                              <p className="text-[11px] text-neutral-400 flex items-center gap-1">
                                <span className="inline-block w-1 h-1 rounded-full bg-neutral-500" />
                                {client.gender}
                              </p>
                            </div>
                          </div>

                          <span
                            className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full border font-medium ${statusClass}`}
                          >
                            {client.status}
                          </span>
                        </div>

                        {/* Target & Metrics Grid */}
                        <div
                          onClick={() => handleSelectClient(client.id)}
                          className="bg-black/30 rounded-lg p-2.5 hairline-border-subtle grid grid-cols-2 gap-2 text-xs mb-2.5 cursor-pointer"
                        >
                          <div>
                            <span className="text-[10px] text-neutral-400 block mb-0.5">
                              Target Program:
                            </span>
                            <span className="text-[11px] font-medium text-neutral-200 truncate block">
                              {client.target_utama}
                            </span>
                          </div>

                          <div>
                            <span className="text-[10px] text-neutral-400 block mb-0.5">
                              Metrik Berat:
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span className="text-white font-mono font-medium text-xs">
                                {client.berat_terkini_kg}{' '}
                                <span className="text-[10px] text-neutral-400">kg</span>
                              </span>
                              <span
                                className={`text-[10px] font-mono px-1 py-0.5 rounded border ${diffBadgeClass}`}
                              >
                                {diffText}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Footer: Sesi Terakhir & Quick Action Buttons */}
                        <div className="flex items-center justify-between pt-1 text-[11px]">
                          <div className="flex items-center gap-1 text-neutral-400 truncate max-w-[55%]">
                            <History className="w-3 h-3 text-neutral-500 shrink-0" />
                            <span className="truncate text-[10px]">
                              {client.sesi_terakhir}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <a
                              href={`https://wa.me/${client.telepon}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Hubungi WhatsApp"
                              className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition flex items-center justify-center"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </a>

                            <button
                              type="button"
                              onClick={() => handleSelectClient(client.id)}
                              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-neutral-300 hover:text-white border border-white/[0.08] text-[11px] font-medium transition"
                            >
                              <span>Detail</span>
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Jadwal Hari Ini / Micro Feed */}
            <section
              id="jadwalSection"
              className="card-glass hairline-border rounded-2xl p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
                    Sesi Berikutnya Hari Ini
                  </h3>
                </div>
                <span className="text-[11px] text-neutral-400">3 Sesi Menunggu</span>
              </div>

              <div className="space-y-2">
                <div
                  onClick={() => handleSelectClient('k-03')}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:border-white/[0.12] cursor-pointer transition"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-mono font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">
                      15:00
                    </span>
                    <div>
                      <p className="text-xs font-semibold text-white">Dimas Anggara</p>
                      <p className="text-[11px] text-neutral-400">
                        Deadlift &amp; Back Hypertrophy
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    Konfirmasi
                  </span>
                </div>

                <div
                  onClick={() => handleSelectClient('k-02')}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:border-white/[0.12] cursor-pointer transition"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-mono font-semibold text-amber-400 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20">
                      17:30
                    </span>
                    <div>
                      <p className="text-xs font-semibold text-white">Siti Rahma</p>
                      <p className="text-[11px] text-neutral-400">
                        Lower Body Conditioning &amp; Glutes
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Terkonfirmasi
                  </span>
                </div>
              </div>
            </section>
          </>
        )}
      </main>

      {/* Modal: Tambah Klien Baru (Enhanced Onboarding & Direct Profile Redirect) */}
      {showAddClientModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAddClientModal(false);
          }}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
        >
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-[#111827] border border-white/[0.12] rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white tracking-tight">
                    Tambah Member Baru
                  </h3>
                  <p className="text-[11px] text-neutral-400">
                    Registrasi member fitness center, paket sesi PT &amp; baseline awal
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddClientModal(false)}
                className="text-neutral-400 hover:text-white p-1.5 rounded-lg hover:bg-white/[0.06] transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddClientSubmit} className="space-y-4">
              {/* Section 1: Data Diri & Kontak */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                    1. Identitas &amp; Aktivitas Member
                  </span>
                  <span className="text-[10px] text-neutral-500 font-mono">Wajib Diisi</span>
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  <div className="col-span-2">
                    <label className="block text-[11px] font-medium text-neutral-300 mb-1">
                      Nama Lengkap *
                    </label>
                    <input
                      type="text"
                      required
                      value={newClientName}
                      onChange={(e) => setNewClientName(e.target.value)}
                      placeholder="Contoh: Randy Saputra"
                      className="w-full bg-[#0B0F17] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-neutral-300 mb-1">
                      Usia (Thn) *
                    </label>
                    <input
                      type="number"
                      min="14"
                      max="80"
                      required
                      value={newClientAge}
                      onChange={(e) => setNewClientAge(e.target.value)}
                      placeholder="28"
                      className="w-full bg-[#0B0F17] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 transition font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-medium text-neutral-300 mb-1">
                      Jenis Kelamin
                    </label>
                    <select
                      value={newClientGender}
                      onChange={(e) =>
                        setNewClientGender(e.target.value as 'Pria' | 'Wanita')
                      }
                      className="w-full bg-[#0B0F17] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 transition"
                    >
                      <option value="Pria">Pria</option>
                      <option value="Wanita">Wanita</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-neutral-300 mb-1">
                      No. WhatsApp *
                    </label>
                    <input
                      type="tel"
                      required
                      value={newClientPhone}
                      onChange={(e) => setNewClientPhone(e.target.value)}
                      placeholder="081234567890"
                      className="w-full bg-[#0B0F17] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 transition font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-neutral-300 mb-1">
                    Pekerjaan &amp; Tingkat Aktivitas Harian
                  </label>
                  <select
                    value={newClientOccupation}
                    onChange={(e) => setNewClientOccupation(e.target.value)}
                    className="w-full bg-[#0B0F17] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 transition"
                  >
                    <option value="Eksekutif / Sedentari">Eksekutif / Kantor (Sedentari)</option>
                    <option value="SWE / Remote Worker">Tech / Remote Worker (Duduk Lama)</option>
                    <option value="Wiraswasta / Mobilitas Tinggi">Wiraswasta / Mobilitas Tinggi</option>
                    <option value="Atlet Rekreasional">Atlet Rekreasional (Aktif)</option>
                    <option value="Atlet Kompetitif">Atlet Kompetitif / Spesialis</option>
                  </select>
                </div>
              </div>

              {/* Section 2: Paket Sesi & Program Kepelatihan */}
              <div className="pt-3 border-t border-white/[0.08] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">
                    2. Paket Sesi &amp; Program Latihan
                  </span>
                  <span className="text-[10px] text-neutral-400 font-mono">
                    Kuota: {newClientSessions || 0} Sesi
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-neutral-300 mb-1.5">
                    Jumlah Sesi Paket Latihan (No. of Sessions) *
                  </label>
                  <div className="grid grid-cols-5 gap-1.5">
                    {['8', '12', '16', '24'].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setNewClientSessions(preset)}
                        className={`py-2 rounded-xl text-xs font-mono font-semibold border transition ${
                          newClientSessions === preset
                            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-sm'
                            : 'bg-[#0B0F17] border-white/[0.08] text-neutral-400 hover:text-white'
                        }`}
                      >
                        {preset}x
                      </button>
                    ))}
                    <input
                      type="number"
                      min="1"
                      max="120"
                      required
                      value={newClientSessions}
                      onChange={(e) => setNewClientSessions(e.target.value)}
                      placeholder="Jml"
                      aria-label="Jumlah sesi kustom"
                      className="w-full bg-[#0B0F17] border border-white/[0.12] rounded-xl px-2 py-2 text-center text-xs text-white font-mono focus:outline-none focus:border-emerald-500 transition"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-medium text-neutral-300 mb-1">
                      Target Utama Program
                    </label>
                    <select
                      value={newClientTarget}
                      onChange={(e) => setNewClientTarget(e.target.value)}
                      className="w-full bg-[#0B0F17] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 transition"
                    >
                      <option value="Fat Loss">Fat Loss &amp; Rekomposisi</option>
                      <option value="Hipertrofi">Hipertrofi / Lean Bulk</option>
                      <option value="Powerlifting">Powerlifting &amp; Strength</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-neutral-300 mb-1">
                      Lokasi Gym Utama
                    </label>
                    <select
                      value={newClientLocation}
                      onChange={(e) =>
                        setNewClientLocation(
                          e.target.value as
                            | 'Gym Utama Senayan'
                            | 'Private Studio Kemang'
                            | 'SCBD District 8'
                        )
                      }
                      className="w-full bg-[#0B0F17] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 transition"
                    >
                      <option value="Gym Utama Senayan">Gym Utama Senayan</option>
                      <option value="SCBD District 8">SCBD District 8</option>
                      <option value="Private Studio Kemang">Private Studio Kemang</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-medium text-neutral-300 mb-1">
                      Tgl Sesi Assessment
                    </label>
                    <input
                      type="date"
                      value={newClientFirstSessionDate}
                      onChange={(e) => setNewClientFirstSessionDate(e.target.value)}
                      className="w-full bg-[#0B0F17] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-neutral-300 mb-1">
                      Jam Sesi Perdana
                    </label>
                    <input
                      type="time"
                      value={newClientFirstSessionTime}
                      onChange={(e) => setNewClientFirstSessionTime(e.target.value)}
                      className="w-full bg-[#0B0F17] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500 transition"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Baseline Biometrik & Catatan Pelatih */}
              <div className="pt-3 border-t border-white/[0.08] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                    3. Baseline Fisik &amp; Riwayat Cedera
                  </span>
                  <span className="text-[10px] text-neutral-500">Data Awal Mgg 1</span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-medium text-neutral-300 mb-1">
                      Berat Awal (kg) *
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={newClientWeight}
                      onChange={(e) => setNewClientWeight(e.target.value)}
                      placeholder="78.5"
                      className="w-full bg-[#0B0F17] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 transition font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-neutral-300 mb-1">
                      Target Berat (kg)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={newClientTargetWeight}
                      onChange={(e) => setNewClientTargetWeight(e.target.value)}
                      placeholder="72.0 (Opsional)"
                      className="w-full bg-[#0B0F17] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 transition font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-medium text-neutral-300 mb-1">
                      Estimasi Body Fat (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={newClientBodyFat}
                      onChange={(e) => setNewClientBodyFat(e.target.value)}
                      placeholder="20.0 (Opsional)"
                      className="w-full bg-[#0B0F17] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 transition font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-neutral-300 mb-1">
                      Lingkar Perut (cm)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={newClientWaist}
                      onChange={(e) => setNewClientWaist(e.target.value)}
                      placeholder="84.0 (Opsional)"
                      className="w-full bg-[#0B0F17] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 transition font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-neutral-300 mb-1">
                    Riwayat Cedera / Catatan Medis Penting (PAR-Q)
                  </label>
                  <textarea
                    rows={2}
                    value={newClientMedicalNote}
                    onChange={(e) => setNewClientMedicalNote(e.target.value)}
                    placeholder="Contoh: Riwayat nyeri bahu kanan saat overhead press, mobilitas ankle terbatas, atau tidak ada cedera..."
                    className="w-full bg-[#0B0F17] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 transition resize-none"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-between gap-2 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setShowAddClientModal(false)}
                  className="px-3.5 py-2.5 rounded-xl text-xs font-medium text-neutral-300 hover:bg-white/[0.06] transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold shadow-md shadow-emerald-500/25 active:scale-95 transition"
                >
                  <span>Simpan &amp; Buka Profil Klien</span>
                  <ChevronRight className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Update Metrik & Timbang ──► Konfirmasi 8 Minggu */}
      {metricsModalClient && (
        <UpdateMetricsModal
          client={metricsModalClient}
          onClose={() => setMetricsModalClientId(null)}
          onSaveMetrics={(updated) => handleSaveMetrics(metricsModalClient.id, updated)}
          onNotify={showToast}
        />
      )}

      {/* Modal: Catat Sesi Baru (#17) ──► Pilih & Tambah Gerakan */}
      {logSessionClient && (
        <LogSessionModal
          client={logSessionClient}
          onClose={() => setLogSessionClientId(null)}
          onSaveSession={(newSession) => handleSaveSession(logSessionClient.id, newSession)}
          onOpenReschedule={() => setRescheduleClientId(logSessionClient.id)}
        />
      )}

      {/* Modal: Reschedule Sesi Latihan */}
      {rescheduleClient && (
        <RescheduleModal
          client={rescheduleClient}
          onClose={() => setRescheduleClientId(null)}
          onConfirmReschedule={(payload) =>
            handleConfirmReschedule(rescheduleClient.id, payload)
          }
        />
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 text-slate-950 text-xs font-semibold shadow-xl shadow-emerald-500/20 transition-all duration-300">
          <CheckCircle2 className="w-4 h-4 stroke-[2.4]" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
