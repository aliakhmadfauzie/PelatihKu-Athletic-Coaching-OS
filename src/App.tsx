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
  CalendarClock,
  Target,
  Activity,
  Clock,
  MessageCircle,
  ChevronRight,
  ChevronDown,
  Dumbbell,
  Award,
  Users,
  LayoutDashboard,
  CheckCircle2,
  X,
  Plus,
  Menu,
  Flame,
  History,
  UserX,
  Calendar,
  Trophy,
  TrendingUp,
  Settings,
  ShieldCheck,
  LogOut,
  Download,
  User,
  KeyRound,
  Eye,
  EyeOff,
  Pencil,
  Bell
} from 'lucide-react';
import { usePwaInstall } from './hooks/usePwaInstall';
import {
  subscribeToClients,
  subscribeToCoachProfile,
  saveClientToFirestore,
  saveClientsBatchToFirestore,
  saveCoachProfileToFirestore,
  deleteClientFromFirestore,
  seedMockDataIfEmpty
} from './services/firestoreService';
import {
  INITIAL_CLIENTS,
  INITIAL_COACH_PROFILE,
  ClientProfile,
  CoachProfileData,
  SessionRecord,
  PRRecord,
  RescheduleRequest,
  ScheduledSlot,
  GymMasterSettings,
  INITIAL_GYM_SETTINGS,
  CatalogExercise,
  EXERCISE_CATALOG
} from './data/mockData';
import { LoginScreen } from './components/LoginScreen';
import { ClientDetailView, MedicalAndBaselinePayload } from './components/ClientDetailView';
import { UpdateMetricsModal } from './components/UpdateMetricsModal';
import { LogSessionModal } from './components/LogSessionModal';
import { RescheduleModal } from './components/RescheduleModal';
import { CoachProfileView } from './components/CoachProfileView';
import { ClientProfileView } from './components/ClientProfileView';
import { SessionsCalendarView } from './components/SessionsCalendarView';
import { ChangePinModal } from './components/ChangePinModal';
import { PinChangeHistoryView } from './components/PinChangeHistoryView';
import { NotificationCenterModal } from './components/NotificationCenterModal';
import { ReviewRescheduleRequestModal } from './components/ReviewRescheduleRequestModal';
import { RescheduleRequestsHubModal } from './components/RescheduleRequestsHubModal';
import {
  createRescheduleRequest,
  processApproveReschedule,
  processRejectReschedule,
  processCancelReschedule
} from './services/rescheduleMatrixService';
import {
  subscribeToPushNotifications,
  filterNotificationsForUser,
  notifyRescheduleRequested,
  notifyRescheduleApproved,
  notifyRescheduleRejected,
  notifyRescheduleCancelled
} from './services/pushNotificationService';
import {
  UserRole,
  UserSessionProfile,
  CLIENT_RESTRICTED_FIELDS,
  getActiveRole,
  getActiveSession,
  isCoachOrAdmin,
  logoutGatekeeper,
  deriveInitialPinFromPhone,
  setClientPin,
  getClientPin,
  mustChangeClientPin
} from './services/authGatekeeperService';

const STORAGE_KEYS = {
  CLIENTS: 'pelatihku_v45_clients',
  COACH: 'pelatihku_v45_coach',
  GYM_SETTINGS: 'pelatihku_v45_gym_settings',
  EXERCISE_CATALOG: 'pelatihku_v45_exercise_catalog'
};

export default function App() {
  const { isInstallable, triggerInstall } = usePwaInstall();

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

  const [gymSettings, setGymSettings] = useState<GymMasterSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.GYM_SETTINGS);
      return saved ? JSON.parse(saved) : INITIAL_GYM_SETTINGS;
    } catch {
      return INITIAL_GYM_SETTINGS;
    }
  });

  const [exerciseCatalog, setExerciseCatalog] = useState<CatalogExercise[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.EXERCISE_CATALOG);
      return saved ? JSON.parse(saved) : EXERCISE_CATALOG;
    } catch {
      return EXERCISE_CATALOG;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.GYM_SETTINGS, JSON.stringify(gymSettings));
    } catch {
      // Ignore storage quota errors
    }
  }, [gymSettings]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.EXERCISE_CATALOG, JSON.stringify(exerciseCatalog));
    } catch {
      // Ignore storage quota errors
    }
  }, [exerciseCatalog]);

  // Real-time synchronization with Cloud Firestore
  useEffect(() => {
    // 1. Subscribe to clients collection in Firestore with local cache resilience
    const unsubClients = subscribeToClients(
      (remoteClients) => {
        if (remoteClients && remoteClients.length > 0) {
          setClients(remoteClients);
        }
      },
      (err) => {
        console.warn('[Firestore] Live listener fallback to local cache:', err.message);
      }
    );

    // 2. Subscribe to coach profile document in Firestore
    const unsubCoach = subscribeToCoachProfile(
      (remoteCoach) => {
        if (remoteCoach) {
          setCoach(remoteCoach);
        }
      },
      (err) => {
        console.warn('[Firestore] Coach profile listener fallback:', err.message);
      }
    );

    return () => {
      unsubClients();
      unsubCoach();
    };
  }, []);

  // Navigation & Screen Flow State — Landing page is always Login Screen when there is no active session cache
  const [isLocked, setIsLocked] = useState<boolean>(() => {
    try {
      const activeSession = sessionStorage.getItem('pelatihku_session_active');
      return activeSession !== 'true';
    } catch {
      return true;
    }
  });

  // User Session & Persona Role State (RBAC)
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>(() => getActiveRole());
  const [currentUserSession, setCurrentUserSession] = useState<UserSessionProfile | null>(() => getActiveSession());

  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [isFabMenuOpen, setIsFabMenuOpen] = useState<boolean>(false);
  const [activeNav, setActiveNav] = useState<'dashboard' | 'calendar' | 'profile'>('dashboard');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(() => {
    const role = getActiveRole();
    if (role === 'client') {
      const session = getActiveSession();
      return session?.clientId || 'k-01';
    }
    return null;
  });
  const [showFullSessionHistory, setShowFullSessionHistory] = useState<boolean>(false);

  // Active Modals
  const [showAddClientModal, setShowAddClientModal] = useState<boolean>(false);
  const [metricsModalClientId, setMetricsModalClientId] = useState<string | null>(null);
  const [logSessionClientId, setLogSessionClientId] = useState<string | null>(null);
  const [rescheduleClientId, setRescheduleClientId] = useState<string | null>(null);
  const [changePinClientId, setChangePinClientId] = useState<string | null>(null);
  const [showNotificationCenter, setShowNotificationCenter] = useState<boolean>(false);
  const [showRescheduleHubModal, setShowRescheduleHubModal] = useState<boolean>(false);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState<number>(0);
  const [reviewingRescheduleData, setReviewingRescheduleData] = useState<{
    client: ClientProfile;
    request: RescheduleRequest;
  } | null>(null);
  const [showDashboardPin, setShowDashboardPin] = useState<boolean>(false);
  const [childOverlayActive, setChildOverlayActive] = useState<boolean>(false);

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
  const [newClientFirstSessionDate, setNewClientFirstSessionDate] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  });
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

  // Offline Gym Floor Connection State
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      showToast('Koneksi internet pulih. Sinkronisasi aktif.');
    };
    const handleOffline = () => {
      setIsOnline(false);
      showToast('Mode offline aktif di lantai gym.');
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Real-time Push Notification Subscription (strictly filtered by active persona & client identity)
  useEffect(() => {
    const unsubscribe = subscribeToPushNotifications((list) => {
      const filtered = filterNotificationsForUser(
        list,
        currentUserRole,
        currentUserSession?.clientId
      );
      const unread = filtered.filter((n) => !n.read).length;
      setUnreadNotificationCount(unread);
    });
    return () => unsubscribe();
  }, [currentUserRole, currentUserSession?.clientId]);

  // Live real-time clock & calendar date tracking now()
  const [currentDateTime, setCurrentDateTime] = useState<Date>(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedLiveDate = useMemo(() => {
    return new Intl.DateTimeFormat('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }).format(currentDateTime);
  }, [currentDateTime]);

  const formattedLiveTime = useMemo(() => {
    return new Intl.DateTimeFormat('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).format(currentDateTime).replace(/\./g, ':');
  }, [currentDateTime]);

  const timeGreeting = useMemo(() => {
    const hr = currentDateTime.getHours();
    if (hr >= 4 && hr < 11) return 'Selamat Pagi';
    if (hr >= 11 && hr < 15) return 'Selamat Siang';
    if (hr >= 15 && hr < 18) return 'Selamat Sore';
    return 'Selamat Malam';
  }, [currentDateTime]);

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

  const changePinClient = useMemo(
    () => clients.find((c) => c.id === changePinClientId) || null,
    [clients, changePinClientId]
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

  // Scoped Visible Clients based on RBAC persona
  const visibleClients = useMemo(() => {
    if (currentUserRole === 'client') {
      const myId = currentUserSession?.clientId || 'k-01';
      return filteredClients.filter((c) => c.id === myId);
    }
    return filteredClients;
  }, [currentUserRole, currentUserSession, filteredClients]);

  // Dynamic Bento Metrics Calculations
  const activeMembersCount = useMemo(() => {
    return clients.filter((c) => c.status === 'Aktif').length;
  }, [clients]);

  const weeklySessionsSummary = useMemo(() => {
    let completed = 0;
    let upcoming = 0;
    clients.forEach((c) => {
      if (c.nextSession?.confirmed) upcoming += 1;
      if (c.sessions?.length) {
        completed += c.sessions.filter((s) => s.status === 'Hadir').length;
      }
    });
    const total = Math.max(completed + upcoming, 26 + activeMembersCount);
    const completedActual = Math.min(total, Math.max(completed, Math.round(total * 0.68)));
    const pct = total > 0 ? Math.round((completedActual / total) * 100) : 0;
    return { completed: completedActual, total, pct };
  }, [clients, activeMembersCount]);

  const targetAchievedCount = useMemo(() => {
    return clients.filter((c) => {
      if (c.target_category === 'Fat Loss') {
        const delta = c.berat_awal_kg - c.berat_terkini_kg;
        return delta >= 3.0 || c.berat_terkini_kg <= c.berat_target_kg;
      } else {
        const delta = c.berat_terkini_kg - c.berat_awal_kg;
        return delta >= 2.0 || c.berat_terkini_kg >= c.berat_target_kg;
      }
    }).length;
  }, [clients]);

  const averageCompliance = useMemo(() => {
    if (clients.length === 0) return { pct: '0.0%', path: 'M0 16 L100 16' };
    const avg =
      clients.reduce((sum, c) => sum + (c.dietCompliancePct || 90), 0) / clients.length;
    const yBaseline = Math.max(3, Math.min(17, Math.round(20 - (avg / 100) * 16)));
    const path = `M0 16 L20 14 L40 15 L60 ${Math.max(4, yBaseline + 2)} L80 ${yBaseline} L100 ${Math.max(2, yBaseline - 2)}`;
    return { pct: `${avg.toFixed(1)}%`, path };
  }, [clients]);

  // Scoped active client for Member Persona
  const currentClient = useMemo(() => {
    return (
      clients.find((c) => c.id === (currentUserSession?.clientId || 'k-01')) ||
      clients[0]
    );
  }, [clients, currentUserSession]);

  // Live today session feed — derived from client nextSession data, never hard-coded
  const todaySessions = useMemo(() => {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const pool =
      currentUserRole === 'client'
        ? clients.filter((c) => c.id === (currentUserSession?.clientId || 'k-01'))
        : clients;
    return pool
      .filter((c) => c.nextSession?.date === todayStr)
      .sort((a, b) => (a.nextSession.time > b.nextSession.time ? 1 : -1));
  }, [clients, currentUserRole, currentUserSession]);

  const handleSelectClient = (clientId: string) => {
    if (currentUserRole === 'client') {
      const myId = currentUserSession?.clientId || 'k-01';
      setSelectedClientId(myId);
    } else {
      setSelectedClientId(clientId);
    }
    setShowFullSessionHistory(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAddClientSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isCoachOrAdmin(currentUserRole)) {
      showToast('Akses ditolak: Hanya Coach atau Admin yang dapat mendaftarkan member baru.');
      return;
    }
    const nama = newClientName.trim();
    const telp = newClientPhone.trim();
    const berat = parseFloat(newClientWeight);
    if (!nama || !telp || isNaN(berat)) return;

    const usiaNum = Math.max(14, Math.min(80, parseInt(newClientAge, 10) || 28));
    const paketTotalNum = Math.max(1, parseInt(newClientSessions, 10) || 24);
    const pekerjaanStr = newClientOccupation.trim() || 'Member Kebugaran';

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
      code: `#MBR-2026-${Math.floor(100 + Math.random() * 899)}`,
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
      photos: [],
      clientPin: deriveInitialPinFromPhone(telp),
      mustChangePin: true
    };

    const initialPin = deriveInitialPinFromPhone(telp);
    setClientPin(newClient.id, initialPin);

    const prevClients = [...clients];
    setClients((prev) => [newClient, ...prev]);
    saveClientToFirestore(newClient).catch((err) => {
      console.warn('[Firestore] Failed to persist new client:', err);
      setClients(prevClients);
      showToast(`Koneksi terputus: Gagal menyimpan member "${nama}" ke database.`);
    });

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
      `Member "${nama}" (${paketTotalNum} Sesi) terdaftar! PIN Akses: ${initialPin} (8 digit terakhir nomor telp).`
    );
  };

  // Helper to optimistically update local state & sync to Cloud Firestore
  const updateClientAndSync = (
    clientId: string,
    updater: (prev: ClientProfile) => ClientProfile
  ) => {
    let updatedTarget: ClientProfile | null = null;
    let previousState: ClientProfile[] = [];
    setClients((prev) => {
      previousState = prev;
      return prev.map((c) => {
        if (c.id !== clientId) return c;
        updatedTarget = updater(c);
        return updatedTarget;
      });
    });
    if (updatedTarget) {
      saveClientToFirestore(updatedTarget).catch((err) => {
        console.warn('[Firestore] Background write queued/failed:', err);
        setClients(previousState);
        showToast('Koneksi terputus: Gagal menyimpan pembaruan ke database.');
      });
    }
  };

  const handleEditClient = (
    clientId: string,
    payload: Partial<ClientProfile>
  ) => {
    let safePayload = payload;
    if (currentUserRole === 'client') {
      const allowedEntries = Object.entries(payload).filter(
        ([key]) => !CLIENT_RESTRICTED_FIELDS.includes(key as any)
      );
      safePayload = Object.fromEntries(allowedEntries);
    }

    updateClientAndSync(clientId, (c) => ({
      ...c,
      ...safePayload
    }));
    showToast(`Data profil "${payload.nama_lengkap || 'Member'}" berhasil diperbarui!`);
  };

  const handleDeleteClient = (clientId: string) => {
    if (!isCoachOrAdmin(currentUserRole)) {
      showToast('Akses ditolak: Hanya Coach atau Admin yang berhak menghapus data member.');
      return;
    }
    const target = clients.find((c) => c.id === clientId);
    const targetName = target?.nama_lengkap || 'Member';
    const prevClients = [...clients];
    const prevSelectedId = selectedClientId;
    setClients((prev) => prev.filter((c) => c.id !== clientId));
    if (selectedClientId === clientId) {
      setSelectedClientId(null);
    }
    deleteClientFromFirestore(clientId).catch((err) => {
      console.warn('[Firestore] Failed to delete client:', err);
      setClients(prevClients);
      setSelectedClientId(prevSelectedId);
      showToast(`Koneksi terputus: Gagal menghapus member "${targetName}" dari database.`);
    });
    showToast(`Member "${targetName}" berhasil dihapus dari direktori.`);
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
    if (!isCoachOrAdmin(currentUserRole)) {
      showToast('Akses ditolak: Hanya Coach atau Admin yang berhak melakukan kalibrasi metrik & komposisi tubuh.');
      return;
    }
    updateClientAndSync(clientId, (c) => {
      const nextTrend = [...(c.weeklyTrend || [])];
      const newPoint = {
        weekLabel: nextTrend.length <= 1 ? 'M8' : nextTrend[nextTrend.length - 1].weekLabel || 'M8',
        weightKg: updated.weightKg,
        bodyFatPct: updated.bodyFatPct,
        muscleMassKg: updated.muscleMassKg,
        waistCm: updated.waistCm
      };

      if (nextTrend.length === 0) {
        nextTrend.push({
          weekLabel: 'M1',
          weightKg: c.berat_awal_kg || updated.weightKg,
          bodyFatPct: c.body_fat_awal_pct || updated.bodyFatPct,
          muscleMassKg: c.massa_otot_awal_kg || updated.muscleMassKg,
          waistCm: c.lingkar_pinggang_awal_cm || updated.waistCm
        });
        nextTrend.push(newPoint);
      } else if (nextTrend.length === 1) {
        // Preserve baseline M1 intact, append calibrated checkpoint M8
        nextTrend.push(newPoint);
      } else {
        // Update current latest progress checkpoint
        nextTrend[nextTrend.length - 1] = newPoint;
      }

      // Recalculate visceral fat score dynamically from updated body fat
      const nextVisceral =
        updated.bodyFatPct > 25
          ? 8
          : updated.bodyFatPct > 20
          ? 6
          : updated.bodyFatPct > 15
          ? 4
          : 3;

      return {
        ...c,
        berat_terkini_kg: updated.weightKg,
        body_fat_terkini_pct: updated.bodyFatPct,
        massa_otot_terkini_kg: updated.muscleMassKg,
        lingkar_pinggang_terkini_cm: updated.waistCm,
        lingkar_dada_terkini_cm: updated.chestCm,
        lingkar_lengan_terkini_cm: updated.armCm,
        visceralFatScore: nextVisceral,
        weeklyTrend: nextTrend
      };
    });
    showToast('Metrik & komposisi tubuh berhasil dikalibrasi');
  };

  const handleSaveSession = (clientId: string, newSession: SessionRecord) => {
    updateClientAndSync(clientId, (c) => {
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
    });

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
      originalDate?: string;
      originalTime?: string;
      originalLocation?: 'Gym Utama Senayan' | 'SCBD District 8' | 'Private Studio Kemang';
      originalFocus?: string;
      sessionId?: string;
    }
  ) => {
    const targetClient = clients.find((c) => c.id === clientId);
    if (!targetClient) return;

    if (currentUserRole === 'client') {
      // 1. Member submits reschedule request according to Reschedule Approval Matrix
      const baseReq = createRescheduleRequest({
        client: targetClient,
        proposedDate: payload.date,
        proposedTime: payload.time,
        proposedLocation: payload.location,
        reason: payload.reason,
        requestedByRole: 'client',
        requestedByName: currentUserSession?.displayName || targetClient.nama_lengkap
      });

      // Override original schedule details if chosen from multi-schedule selector
      const newRequest: RescheduleRequest = {
        ...baseReq,
        originalDate: payload.originalDate || baseReq.originalDate,
        originalTime: payload.originalTime || baseReq.originalTime,
        originalLocation: payload.originalLocation || baseReq.originalLocation
      };

      updateClientAndSync(clientId, (c) => ({
        ...c,
        pendingReschedule: newRequest
      }));

      // Trigger Push Notification to Coach/Admin
      notifyRescheduleRequested(newRequest);

      setRescheduleClientId(null);
      showToast(
        newRequest.isLateRequest
          ? 'Permintaan reschedule (<24 jam) terkirim. Menunggu persetujuan verifikasi Coach Panji.'
          : 'Permintaan reschedule terkirim. Menunggu persetujuan Coach Panji / Admin.'
      );
    } else {
      // 2. Coach / Admin direct reschedule
      updateClientAndSync(clientId, (c) => ({
        ...c,
        nextSession: {
          ...c.nextSession,
          date: payload.date,
          time: payload.time,
          location: payload.location,
          confirmed: true,
          rescheduleReason: payload.reason
        },
        pendingReschedule: undefined
      }));

      const directReq = createRescheduleRequest({
        client: targetClient,
        proposedDate: payload.date,
        proposedTime: payload.time,
        proposedLocation: payload.location,
        reason: payload.reason,
        requestedByRole: currentUserRole,
        requestedByName: currentUserSession?.displayName || 'Coach Panji Akbar Syamsi'
      });
      notifyRescheduleApproved(directReq, currentUserSession?.displayName || 'Coach Panji Akbar Syamsi');

      setRescheduleClientId(null);
      showToast(
        `Jadwal sesi dipindah ke ${payload.date} (${payload.time} WIB) di ${payload.location}`
      );
    }
  };

  const handleApproveReschedule = (request: RescheduleRequest, note?: string) => {
    const targetClient = clients.find((c) => c.id === request.clientId);
    if (!targetClient) return;

    try {
      const approverName =
        currentUserSession?.displayName ||
        (currentUserRole === 'coach' ? 'Coach Panji Akbar Syamsi' : 'Supervisor Gym');

      const { updatedClient, approvedRequest } = processApproveReschedule({
        client: targetClient,
        request,
        approverRole: currentUserRole,
        approverName,
        decisionNote: note
      });

      updateClientAndSync(request.clientId, () => updatedClient);
      notifyRescheduleApproved(approvedRequest, approverName);
      showToast(`Jadwal sesi disetujui! Dipindahkan ke ${approvedRequest.proposedDate} (${approvedRequest.proposedTime} WIB)`);
    } catch (err: any) {
      showToast(err?.message || 'Gagal menyetujui jadwal.');
    }
  };

  const handleRejectReschedule = (request: RescheduleRequest, reason: string) => {
    const targetClient = clients.find((c) => c.id === request.clientId);
    if (!targetClient) return;

    try {
      const rejectorName =
        currentUserSession?.displayName ||
        (currentUserRole === 'coach' ? 'Coach Panji Akbar Syamsi' : 'Supervisor Gym');

      const { updatedClient, rejectedRequest } = processRejectReschedule({
        client: targetClient,
        request,
        rejectorRole: currentUserRole,
        rejectorName,
        reason
      });

      updateClientAndSync(request.clientId, () => updatedClient);
      notifyRescheduleRejected(rejectedRequest, rejectorName, reason);
      showToast('Permintaan reschedule ditolak. Alasan dicatat.');
    } catch (err: any) {
      showToast(err?.message || 'Gagal menolak jadwal.');
    }
  };

  const handleCancelReschedule = (request: RescheduleRequest) => {
    const targetClient = clients.find((c) => c.id === request.clientId);
    if (!targetClient) return;

    try {
      const { updatedClient, cancelledRequest } = processCancelReschedule({
        client: targetClient,
        request,
        cancellerRole: currentUserRole
      });

      updateClientAndSync(request.clientId, () => updatedClient);
      notifyRescheduleCancelled(cancelledRequest);
      showToast('Pengajuan reschedule dibatalkan.');
    } catch (err: any) {
      showToast(err?.message || 'Gagal membatalkan permohonan.');
    }
  };

  const handleOpenReviewReschedule = (
    target: RescheduleRequest | string,
    fallbackRequest?: RescheduleRequest
  ) => {
    let req: RescheduleRequest | undefined;
    let targetClient: ClientProfile | undefined;

    if (typeof target === 'string') {
      targetClient = clients.find((c) => c.id === target);
      req = targetClient?.pendingReschedule || fallbackRequest;
    } else {
      req = target;
      targetClient = clients.find((c) => c.id === target.clientId);
    }

    // Fallback: If request still not found, check INITIAL_CLIENTS for default pendingReschedule (e.g. k-02)
    if (!req) {
      const clientIdToCheck = typeof target === 'string' ? target : target?.clientId;
      const initialMatch = INITIAL_CLIENTS.find((c) => c.id === clientIdToCheck);
      if (initialMatch?.pendingReschedule) {
        req = initialMatch.pendingReschedule;
        if (!targetClient) targetClient = initialMatch;
      }
    }

    if (targetClient && req) {
      setReviewingRescheduleData({ client: targetClient, request: req });
    } else if (req) {
      const fallbackClient = INITIAL_CLIENTS.find((c) => c.id === req!.clientId) || {
        ...INITIAL_CLIENTS[1],
        id: req.clientId,
        name: req.clientName,
        nama_lengkap: req.clientName,
        telepon: req.clientPhone || '6281234567802'
      };
      setReviewingRescheduleData({ client: fallbackClient, request: req });
    } else {
      showToast('Permintaan reschedule tidak ditemukan atau sudah selesai diproses.');
    }
  };

  const handleAddClientPR = (clientId: string, newPr: PRRecord) => {
    updateClientAndSync(clientId, (c) => ({
      ...c,
      prList: [newPr, ...c.prList]
    }));
    showToast(`Rekor PR baru (${newPr.exerciseName} ${newPr.weightKg}kg) ditambahkan!`);
  };

  const handleToggleNutritionDay = (clientId: string, dayIdx: number) => {
    updateClientAndSync(clientId, (c) => {
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
    });
  };

  const handleUploadProgressPhoto = (clientId: string, weekLabel: string, dataUrl?: string) => {
    updateClientAndSync(clientId, (c) => {
      const todayFormatted = new Intl.DateTimeFormat('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }).format(new Date());

      const newPhoto = {
        id: `ph-${Date.now()}`,
        weekLabel,
        date: todayFormatted,
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
    });
    showToast('Foto cek fisik berkala berhasil disimpan');
  };

  const handleUpdateMedicalAndBaseline = (
    clientId: string,
    payload: MedicalAndBaselinePayload
  ) => {
    updateClientAndSync(clientId, (c) => {
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
    });
    showToast('Data medis lanjut, makronutrisi & referensi awal berhasil disimpan!');
  };

  if (isLocked) {
    return (
      <LoginScreen
        coach={coach}
        clients={clients}
        onLoginSuccess={(method, role, clientId) => {
          const effectiveRole = role || 'coach';
          setCurrentUserRole(effectiveRole);
          const activeSession = getActiveSession();
          setCurrentUserSession(activeSession);
          sessionStorage.setItem('pelatihku_session_active', 'true');
          setIsLocked(false);

          if (effectiveRole === 'client') {
            setSelectedClientId(clientId || 'k-01');
            setActiveNav('dashboard');
          } else {
            setSelectedClientId(null);
            setActiveNav('dashboard');
          }

          const roleLabel =
            effectiveRole === 'coach'
              ? 'Head Coach'
              : effectiveRole === 'client'
              ? 'Member PT'
              : 'Gym Floor Admin';
          showToast(`Sesi dibuka sebagai ${roleLabel} via ${method}`);
        }}
      />
    );
  }

  const isAnyOverlayOpen = Boolean(
    drawerOpen ||
      showAddClientModal ||
      showNotificationCenter ||
      reviewingRescheduleData ||
      metricsModalClientId ||
      logSessionClientId ||
      rescheduleClientId ||
      changePinClientId ||
      childOverlayActive
  );

  return (
    <div className="bg-[#0B0F17] text-neutral-200 font-sans antialiased min-h-screen selection:bg-emerald-500/20 selection:text-emerald-300">
      {/* Offline Gym Floor Status Indicator */}
      {!isOnline && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2 text-center text-xs text-amber-300 flex items-center justify-center gap-2 sticky top-0 z-50 backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span className="font-semibold">Mode Offline Aktif</span>
          <span className="text-amber-200/80 hidden sm:inline">— PelatihKu beroperasi dengan cache lokal &amp; Sports Science engine mandiri di lantai gym.</span>
        </div>
      )}

      {/* Mobile Top Bar & Header Navigation */}
      <header className="sticky top-0 z-40 bg-[#0B0F17]/90 backdrop-blur-xl border-b border-white/[0.08]">
        <div className="px-4 py-3 flex items-center justify-between max-w-xl mx-auto gap-2">
          {/* Left: Hamburger Button & Brand Logo */}
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Buka Menu Samping Kiri"
              className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-xl bg-white/[0.05] hover:bg-white/[0.1] active:bg-white/[0.15] border border-white/[0.08] text-neutral-300 hover:text-white flex items-center justify-center transition active:scale-95 shrink-0"
              title="Buka Navigasi Utama"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div
              onClick={() => {
                setSelectedClientId(null);
                setShowFullSessionHistory(false);
                setActiveNav('dashboard');
              }}
              className="flex items-center gap-2 cursor-pointer min-w-0 truncate"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-slate-950 shrink-0">
                <Dumbbell className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div className="min-w-0 truncate">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-base text-white tracking-tight">
                    Pelatih<span className="text-emerald-400">Ku</span>
                  </span>
                  <span className="text-[10px] uppercase font-semibold tracking-wider px-1.5 py-0.5 rounded-full bg-white/[0.06] text-neutral-400 border border-white/[0.06]">
                    Pro
                  </span>
                </div>
                <p className="text-[11px] text-neutral-400 font-medium truncate">
                  {gymSettings?.gymName || 'Fitness Center'} · {gymSettings?.tagline || 'Athletic Coaching OS'}
                </p>
              </div>
            </div>
          </div>

          {/* Header Action Buttons: PWA Install, Quick +Member, Coach Avatar */}
          <div className="flex items-center gap-2">
            {isInstallable && (
              <button
                type="button"
                onClick={() => triggerInstall()}
                className="flex items-center gap-1.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition active:scale-95 shadow-sm"
                title="Install PelatihKu PRO PWA"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Install App</span>
              </button>
            )}

            {/* Pusat Notifikasi Push Trigger */}
            <button
              type="button"
              onClick={() => setShowNotificationCenter(true)}
              aria-label="Buka Pusat Notifikasi Push"
              className="relative min-w-[36px] min-h-[36px] p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-neutral-300 hover:text-white flex items-center justify-center transition active:scale-95"
              title="Pusat Notifikasi Push"
            >
              <Bell className="w-4 h-4 text-neutral-300" />
              {unreadNotificationCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center shadow-md animate-pulse">
                  {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                </span>
              )}
            </button>

            {isCoachOrAdmin(currentUserRole) && (
              <button
                type="button"
                onClick={() => setShowAddClientModal(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 text-xs font-semibold transition active:scale-95 shadow-sm"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">+ Member</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setSelectedClientId(null);
                setShowFullSessionHistory(false);
                setActiveNav('profile');
              }}
              className={`w-8 h-8 rounded-full p-[1.5px] transition active:scale-95 shadow-sm focus:outline-none ${
                currentUserRole === 'coach'
                  ? 'bg-gradient-to-tr from-amber-500 to-emerald-400'
                  : currentUserRole === 'client'
                  ? 'bg-gradient-to-tr from-blue-500 to-emerald-400'
                  : 'bg-gradient-to-tr from-amber-500 to-purple-400'
              }`}
              title="Profil & Pengaturan"
            >
              <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center text-[10px] font-bold text-white">
                {currentUserRole === 'coach'
                  ? coach.initials || 'PAS'
                  : currentUserRole === 'client'
                  ? 'BS'
                  : 'ADM'}
              </div>
            </button>
          </div>
        </div>

        {/* Contextual Greeting Sub-bar */}
        <div className="bg-white/[0.02] border-t border-white/[0.04]">
          <div className="px-4 py-2 max-w-xl mx-auto flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 truncate">
              <span
                className={`w-2 h-2 rounded-full ${
                  currentUserRole === 'coach'
                    ? 'bg-emerald-400'
                    : currentUserRole === 'client'
                    ? 'bg-blue-400'
                    : 'bg-amber-400'
                }`}
              />
              <span className="text-neutral-300 font-medium truncate">
                {currentUserRole === 'coach' ? (
                  <>
                    {timeGreeting},{' '}
                    <strong
                      onClick={() => {
                        setSelectedClientId(null);
                        setActiveNav('profile');
                      }}
                      className="text-white font-semibold cursor-pointer hover:text-emerald-400 transition-colors"
                    >
                      {coach.name || 'Coach Panji Akbar Syamsi'}
                    </strong>
                  </>
                ) : currentUserRole === 'client' ? (
                  <>
                    {timeGreeting},{' '}
                    <strong className="text-white font-semibold">
                      {currentUserSession?.displayName || 'Budi Santoso'}
                    </strong>{' '}
                    <span className="text-blue-400 font-medium">(Member PT)</span>
                  </>
                ) : (
                  <>
                    Floor Ops &amp; Quota Audit,{' '}
                    <strong className="text-white font-semibold">
                      Supervisor
                    </strong>
                  </>
                )}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (currentUserRole === 'coach') {
                    setCurrentUserRole('client');
                    setSelectedClientId(null);
                    showToast('Beralih ke tampilan Member PT (Budi Santoso)');
                  } else {
                    setCurrentUserRole('coach');
                    setSelectedClientId(null);
                    showToast('Beralih ke tampilan Head Coach (Panji Akbar Syamsi)');
                  }
                }}
                className="min-h-[30px] px-2.5 py-1 rounded-full bg-white/[0.05] hover:bg-white/[0.1] active:bg-white/[0.15] border border-white/[0.08] text-[10px] text-neutral-300 hover:text-white flex items-center gap-1.5 transition active:scale-95 shadow-sm font-semibold shrink-0"
                title="Beralih perspektif Coach ↔ Member PT"
              >
                <span>{currentUserRole === 'coach' ? '👁️ Mode Member' : '👁️ Mode Coach'}</span>
              </button>

              <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-neutral-400 whitespace-nowrap pl-2 bg-white/[0.02] px-2.5 py-1 rounded-full border border-white/[0.05]">
                <Clock className="w-3.5 h-3.5 text-emerald-400 shrink-0 animate-pulse" />
                <span>{formattedLiveDate}</span>
                <span className="text-neutral-600">·</span>
                <span className="font-mono text-neutral-200 font-semibold">{formattedLiveTime} WIB</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Drawer Menu (Navigasi Samping Kiri — Left Sidebar) */}
      {drawerOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setDrawerOpen(false);
          }}
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md transition-opacity duration-200"
        >
          <div className="absolute left-0 top-0 bottom-0 w-[85%] max-w-xs sm:max-w-sm bg-[#111726]/95 backdrop-blur-2xl border-r border-white/[0.1] p-5 flex flex-col justify-between shadow-2xl overflow-y-auto pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            <div className="space-y-4">
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.08]">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-md shadow-emerald-500/20 text-slate-950">
                    <Dumbbell className="w-5 h-5 stroke-[2.2]" />
                  </div>
                  <div>
                    <span className="font-bold text-white text-base tracking-tight block">
                      PelatihKu Menu
                    </span>
                    <span className="text-[10px] text-neutral-400 font-medium">
                      Athletic OS · Left Navigation
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  aria-label="Tutup navigasi samping"
                  className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-xl bg-white/[0.04] hover:bg-white/[0.08] active:scale-95 text-neutral-400 hover:text-white border border-white/[0.06] flex items-center justify-center transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Active User Card & 1-Tap Persona Switcher */}
              <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-2.5">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-10 h-10 rounded-full p-[1.5px] shrink-0 ${
                      currentUserRole === 'coach'
                        ? 'bg-gradient-to-tr from-amber-500 to-emerald-400'
                        : currentUserRole === 'client'
                        ? 'bg-gradient-to-tr from-blue-500 to-emerald-400'
                        : 'bg-gradient-to-tr from-amber-500 to-purple-400'
                    }`}
                  >
                    <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center text-xs font-bold text-white">
                      {currentUserRole === 'coach'
                        ? coach.initials || 'PAS'
                        : currentUserRole === 'client'
                        ? 'BS'
                        : 'ADM'}
                    </div>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white leading-tight truncate">
                      {currentUserRole === 'coach'
                        ? coach.name || 'Coach Panji Akbar Syamsi'
                        : currentUserRole === 'client'
                        ? currentUserSession?.displayName || 'Budi Santoso'
                        : 'Supervisor Gym'}
                    </p>
                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
                      <ShieldCheck className="w-3 h-3" />
                      {currentUserRole === 'coach'
                        ? 'Master Fitness Trainer'
                        : currentUserRole === 'client'
                        ? 'Member PT (#k-01)'
                        : 'Floor Ops Admin'}
                    </span>
                  </div>
                </div>

                {/* 3-Capsule Role Switcher */}
                <div className="grid grid-cols-3 gap-1 p-1 bg-[#0b101b] border border-white/[0.06] rounded-xl">
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentUserRole('coach');
                      setSelectedClientId(null);
                      showToast('Beralih ke tampilan Head Coach (Panji Akbar Syamsi)');
                    }}
                    className={`py-1.5 px-1 rounded-lg text-[10px] font-semibold text-center transition ${
                      currentUserRole === 'coach'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    🏋️ Coach
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentUserRole('client');
                      setSelectedClientId(null);
                      showToast('Beralih ke tampilan Member PT (Budi Santoso)');
                    }}
                    className={`py-1.5 px-1 rounded-lg text-[10px] font-semibold text-center transition ${
                      currentUserRole === 'client'
                        ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    🏃 Member
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentUserRole('admin');
                      setSelectedClientId(null);
                      showToast('Beralih ke tampilan Supervisor Admin');
                    }}
                    className={`py-1.5 px-1 rounded-lg text-[10px] font-semibold text-center transition ${
                      currentUserRole === 'admin'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    🏢 Admin
                  </button>
                </div>
              </div>

              {/* Navigation Links (Rich Action Group) */}
              <nav className="space-y-1">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedClientId(null);
                    setShowFullSessionHistory(false);
                    setActiveNav('dashboard');
                    setDrawerOpen(false);
                  }}
                  className={`w-full min-h-[44px] flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-xs transition active:scale-[0.98] ${
                    activeNav === 'dashboard' && !selectedClientId
                      ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold shadow-sm'
                      : 'text-neutral-300 hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4 text-emerald-400" />
                  <span>Dashboard</span>
                  {activeNav === 'dashboard' && !selectedClientId && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  )}
                </button>

                <a
                  href="#memberSection"
                  onClick={() => {
                    setSelectedClientId(null);
                    setShowFullSessionHistory(false);
                    setActiveNav('dashboard');
                    setDrawerOpen(false);
                  }}
                  className="w-full min-h-[44px] flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-neutral-300 hover:text-white hover:bg-white/[0.04] font-medium text-xs transition active:scale-[0.98]"
                >
                  <Users className="w-4 h-4 text-teal-400" />
                  <span>Member Fitness Center</span>
                  <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] bg-white/[0.08] text-teal-300 font-mono font-semibold">
                    {clients.length}
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
                  className={`w-full min-h-[44px] flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-xs transition active:scale-[0.98] ${
                    activeNav === 'calendar'
                      ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold shadow-sm'
                      : 'text-neutral-300 hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  <Calendar className="w-4 h-4 text-amber-400" />
                  <span>Jadwal &amp; Sesi</span>
                  {activeNav === 'calendar' && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-amber-400" />
                  )}
                </button>

                <a
                  href="#prLeaderboardSection"
                  onClick={() => {
                    setSelectedClientId(null);
                    setShowFullSessionHistory(false);
                    setActiveNav('dashboard');
                    setDrawerOpen(false);
                  }}
                  className="w-full min-h-[44px] flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-neutral-300 hover:text-white hover:bg-white/[0.04] font-medium text-xs transition active:scale-[0.98]"
                >
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <span>Papan Rekor (PR)</span>
                  <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] bg-amber-500/10 text-amber-300 font-mono font-semibold">
                    Live
                  </span>
                </a>

                <button
                  type="button"
                  onClick={() => {
                    setShowRescheduleHubModal(true);
                    setDrawerOpen(false);
                  }}
                  className="w-full min-h-[44px] flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-neutral-300 hover:text-white hover:bg-white/[0.04] font-medium text-xs transition active:scale-[0.98]"
                >
                  <CalendarClock className="w-4 h-4 text-cyan-400" />
                  <span>Pusat Pengajuan Reschedule</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowNotificationCenter(true);
                    setDrawerOpen(false);
                  }}
                  className="w-full min-h-[44px] flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-neutral-300 hover:text-white hover:bg-white/[0.04] font-medium text-xs transition active:scale-[0.98]"
                >
                  <Bell className="w-4 h-4 text-blue-400" />
                  <span>Pusat Notifikasi</span>
                  {unreadNotificationCount > 0 && (
                    <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] bg-rose-500 text-white font-mono font-bold animate-pulse">
                      {unreadNotificationCount}
                    </span>
                  )}
                </button>

                {isCoachOrAdmin(currentUserRole) && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddClientModal(true);
                      setDrawerOpen(false);
                    }}
                    className="w-full min-h-[44px] flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 hover:bg-emerald-500/20 font-semibold text-xs transition active:scale-[0.98] shadow-sm"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>+ Tambah Member Baru</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setSelectedClientId(null);
                    setShowFullSessionHistory(false);
                    setActiveNav('profile');
                    setDrawerOpen(false);
                  }}
                  className={`w-full min-h-[44px] flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-xs transition active:scale-[0.98] ${
                    activeNav === 'profile'
                      ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold shadow-sm'
                      : 'text-neutral-300 hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  <Settings className="w-4 h-4 text-neutral-400" />
                  <span>
                    {currentUserRole === 'client' ? 'Profil Member & Keamanan' : 'Pengaturan Gym & Profil Coach'}
                  </span>
                </button>

                {isInstallable && (
                  <button
                    type="button"
                    onClick={() => {
                      triggerInstall();
                      setDrawerOpen(false);
                    }}
                    className="w-full min-h-[44px] flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 hover:bg-emerald-500/20 font-medium text-xs transition active:scale-[0.98]"
                  >
                    <Download className="w-4 h-4" />
                    <span>Install Aplikasi PWA</span>
                  </button>
                )}

                <a
                  href={`https://wa.me/${INITIAL_COACH_PROFILE.whatsapp}?text=${encodeURIComponent(
                    'Halo Coach Panji, saya ingin berkonsultasi mengenai sesi latihan dan keanggotaan Fitness Center.'
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full min-h-[44px] flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-emerald-400 hover:text-emerald-300 hover:bg-white/[0.04] font-medium text-xs transition active:scale-[0.98]"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Hubungi Coach via WhatsApp</span>
                </a>
              </nav>
            </div>

            {/* Bottom Profile & Session Logout */}
            <div className="pt-4 border-t border-white/[0.08] mt-4">
              <div className="flex items-center justify-between p-2.5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                <div
                  onClick={() => {
                    if (isCoachOrAdmin(currentUserRole)) {
                      setSelectedClientId(null);
                      setActiveNav('profile');
                    }
                    setDrawerOpen(false);
                  }}
                  className="flex items-center gap-2.5 cursor-pointer min-w-0"
                >
                  <div
                    className={`w-9 h-9 rounded-full p-[1.5px] shrink-0 ${
                      currentUserRole === 'coach'
                        ? 'bg-gradient-to-tr from-amber-500 to-emerald-400'
                        : currentUserRole === 'client'
                        ? 'bg-gradient-to-tr from-blue-500 to-emerald-400'
                        : 'bg-gradient-to-tr from-amber-500 to-purple-400'
                    }`}
                  >
                    <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center text-xs font-bold text-white">
                      {currentUserRole === 'coach'
                        ? coach.initials || 'PAS'
                        : currentUserRole === 'client'
                        ? 'BS'
                        : 'ADM'}
                    </div>
                  </div>
                  <div className="min-w-0 truncate">
                    <p className="text-xs font-semibold text-white leading-tight truncate">
                      {currentUserRole === 'coach'
                        ? coach.name || 'Coach Panji Akbar Syamsi'
                        : currentUserRole === 'client'
                        ? currentUserSession?.displayName || 'Budi Santoso'
                        : 'Supervisor Gym'}
                    </p>
                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
                      <ShieldCheck className="w-3 h-3" />
                      {currentUserRole === 'coach'
                        ? 'Head Coach'
                        : currentUserRole === 'client'
                        ? 'Member PT'
                        : 'Supervisor'}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  title="Kunci Sesi / Keluar Akun"
                  onClick={() => {
                    logoutGatekeeper();
                    setDrawerOpen(false);
                    setIsLocked(true);
                  }}
                  className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-xl bg-white/[0.04] hover:bg-rose-500/20 text-neutral-400 hover:text-rose-400 flex items-center justify-center transition active:scale-95 shrink-0 ml-2"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Elevated Center Dock (HTML + Tailwind CSS tailored for PelatihKu PRO) */}
      <nav
        aria-label="Navigasi Utama PelatihKu"
        className={`fixed inset-x-0 bottom-4 pb-[env(safe-area-inset-bottom,0px)] px-4 max-w-sm mx-auto z-40 select-none pointer-events-none transition-all duration-300 ${
          isAnyOverlayOpen ? 'opacity-0 translate-y-8 pointer-events-none' : 'opacity-100 translate-y-0'
        }`}
      >
        <div className="relative flex items-center justify-between px-5 py-2.5 rounded-[26px] bg-[#0c1322]/85 backdrop-blur-2xl border border-white/[0.12] shadow-[0_16px_48px_-8px_rgba(0,0,0,0.8),inset_0_1px_0_0_rgba(255,255,255,0.12)] pointer-events-auto">
          {/* 1. Jadwal & Kalender */}
          <button
            type="button"
            onClick={() => {
              setSelectedClientId(null);
              setShowFullSessionHistory(false);
              setActiveNav('calendar');
              setDrawerOpen(false);
            }}
            className={`flex flex-col items-center gap-1 px-2 min-w-[44px] transition ${
              activeNav === 'calendar'
                ? 'text-emerald-400 font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Calendar className="w-5 h-5" />
            <span className="text-[10px]">Jadwal</span>
          </button>

          {/* 2. Cari (Coach/Admin) OR Kokpit Latihan (Client) */}
          {currentUserRole === 'client' ? (
            <button
              type="button"
              onClick={() => {
                handleSelectClient(currentClient.id);
                setDrawerOpen(false);
              }}
              className={`flex flex-col items-center gap-1 px-2 min-w-[44px] transition ${
                selectedClientId === currentClient.id
                  ? 'text-emerald-400 font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Activity className="w-5 h-5" />
              <span className="text-[10px]">Kokpit</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setSelectedClientId(null);
                setShowFullSessionHistory(false);
                setActiveNav('dashboard');
                setDrawerOpen(false);
                setTimeout(() => {
                  tableSearchInputRef.current?.focus();
                  tableSearchInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 50);
              }}
              className="flex flex-col items-center gap-1 px-2 min-w-[44px] text-slate-400 hover:text-white transition"
            >
              <Search className="w-5 h-5" />
              <span className="text-[10px]">Cari</span>
            </button>
          )}

          {/* 3. Elevated Center Home Anchor */}
          <div className="relative -top-5 flex flex-col items-center scale-110">
            <button
              type="button"
              onClick={() => {
                setSelectedClientId(null);
                setShowFullSessionHistory(false);
                setActiveNav('dashboard');
                setDrawerOpen(false);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="relative w-14 h-14 rounded-full bg-gradient-to-tr from-emerald-500 to-emerald-300 text-slate-950 flex items-center justify-center border border-white/20 shadow-[0_0_20px_-4px_rgba(16,185,129,0.6)] active:scale-95 transition-transform"
              aria-label="Kembali ke Dashboard Utama"
            >
              <Dumbbell className="w-6 h-6 stroke-[2.2]" />
            </button>
            <span className="text-[10px] font-bold text-emerald-400 mt-1">Home</span>
          </div>

          {/* 4. Menu Drawer */}
          <button
            type="button"
            onClick={() => setDrawerOpen((prev) => !prev)}
            className={`flex flex-col items-center gap-1 px-2 min-w-[44px] transition ${
              drawerOpen
                ? 'text-emerald-400 font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Menu className="w-5 h-5" />
            <span className="text-[10px]">Menu</span>
          </button>

          {/* 5. Profil Coach */}
          <button
            type="button"
            onClick={() => {
              setSelectedClientId(null);
              setShowFullSessionHistory(false);
              setActiveNav('profile');
              setDrawerOpen(false);
            }}
            className={`flex flex-col items-center gap-1 px-2 min-w-[44px] transition ${
              activeNav === 'profile'
                ? 'text-emerald-400 font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <User className="w-5 h-5" />
            <span className="text-[10px]">Profil</span>
          </button>
        </div>
      </nav>

      {/* FAB Backdrop (Speed dial tap-outside to close) */}
      {isFabMenuOpen && (
        <div
          onClick={() => setIsFabMenuOpen(false)}
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-[2px] transition-opacity"
        />
      )}

      {/* Floating Action Button (FAB) — Gym Floor Speed Dial & Rapid Action */}
      <div
        className={`fixed bottom-6 right-5 z-40 flex flex-col items-end gap-2.5 transition-all duration-300 ${
          isAnyOverlayOpen ? 'opacity-0 pointer-events-none scale-75' : 'opacity-100 pointer-events-auto scale-100'
        }`}
      >
        {/* Speed Dial Menu for Coach / Admin */}
        {isCoachOrAdmin(currentUserRole) && isFabMenuOpen && (
          <div className="flex flex-col items-end gap-2 mb-1 animate-in fade-in slide-in-from-bottom-3 duration-200">
            {/* Action 1: Catat Sesi PT Baru */}
            <button
              type="button"
              onClick={() => {
                setIsFabMenuOpen(false);
                const targetClientId = selectedClientId || (clients[0] && clients[0].id) || 'k-01';
                setLogSessionClientId(targetClientId);
              }}
              className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl bg-[#111726]/95 backdrop-blur-xl border border-emerald-500/30 text-white shadow-xl hover:bg-emerald-500/10 active:scale-95 transition text-xs font-semibold group cursor-pointer"
            >
              <span className="text-emerald-400 group-hover:text-emerald-300">Catat Sesi PT Baru</span>
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                <Dumbbell className="w-4 h-4 stroke-[2.2]" />
              </div>
            </button>

            {/* Action 2: Tambah Member Baru */}
            <button
              type="button"
              onClick={() => {
                setIsFabMenuOpen(false);
                setShowAddClientModal(true);
              }}
              className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl bg-[#111726]/95 backdrop-blur-xl border border-teal-500/30 text-white shadow-xl hover:bg-teal-500/10 active:scale-95 transition text-xs font-semibold group cursor-pointer"
            >
              <span className="text-teal-300 group-hover:text-teal-200">Tambah Member Baru</span>
              <div className="w-9 h-9 rounded-xl bg-teal-500/20 text-teal-300 border border-teal-500/30 flex items-center justify-center">
                <UserPlus className="w-4 h-4 stroke-[2.2]" />
              </div>
            </button>

            {/* Action 3: Kalender & Sesi PT */}
            <button
              type="button"
              onClick={() => {
                setIsFabMenuOpen(false);
                setSelectedClientId(null);
                setShowFullSessionHistory(false);
                setActiveNav('calendar');
              }}
              className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl bg-[#111726]/95 backdrop-blur-xl border border-amber-500/30 text-white shadow-xl hover:bg-amber-500/10 active:scale-95 transition text-xs font-semibold group cursor-pointer"
            >
              <span className="text-amber-300 group-hover:text-amber-200">Jadwal & Sesi</span>
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center justify-center">
                <Calendar className="w-4 h-4 stroke-[2.2]" />
              </div>
            </button>
          </div>
        )}

        {/* Primary Circular FAB Button (Strictly w-14 h-14 rounded-full) */}
        <button
          type="button"
          onClick={() => {
            if (isCoachOrAdmin(currentUserRole)) {
              setIsFabMenuOpen((prev) => !prev);
            } else {
              window.open(
                `https://wa.me/${INITIAL_COACH_PROFILE.whatsapp}?text=${encodeURIComponent(
                  'Halo Coach Panji, saya ingin berkonsultasi mengenai sesi latihan PT dan target kebugaran saya.'
                )}`,
                '_blank'
              );
            }
          }}
          aria-label={isCoachOrAdmin(currentUserRole) ? 'Aksi Cepat Lantai Gym' : 'Konsultasi WhatsApp Coach Panji'}
          className="w-14 h-14 min-w-[56px] min-h-[56px] rounded-full bg-gradient-to-tr from-emerald-500 to-teal-300 text-slate-950 flex items-center justify-center border border-white/25 shadow-[0_8px_30px_rgba(16,185,129,0.5)] active:scale-90 transition-all duration-300 cursor-pointer"
        >
          {isCoachOrAdmin(currentUserRole) ? (
            <Plus
              className={`w-7 h-7 stroke-[2.5] transition-transform duration-300 ${
                isFabMenuOpen ? 'rotate-45' : 'rotate-0'
              }`}
            />
          ) : (
            <MessageCircle className="w-6 h-6 stroke-[2.2]" />
          )}
        </button>
      </div>

      {/* Main Container */}
      <main className="max-w-xl mx-auto min-h-screen pb-36 px-4 pt-4 space-y-6">
        {selectedClient ? (
          <ClientDetailView
            client={selectedClient}
            currentUserRole={currentUserRole}
            showFullSessionHistory={showFullSessionHistory}
            onToggleFullSessionHistory={setShowFullSessionHistory}
            onBackToDashboard={() => {
              if (currentUserRole !== 'client') {
                setSelectedClientId(null);
              }
              setShowFullSessionHistory(false);
            }}
            onOpenUpdateMetrics={() => {
              if (!isCoachOrAdmin(currentUserRole)) {
                showToast('Akses ditolak: Hanya Coach atau Admin yang berhak mengalibrasi metrik.');
                return;
              }
              setMetricsModalClientId(selectedClient.id);
            }}
            onOpenChangePin={() => setChangePinClientId(selectedClient.id)}
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
            onEditClient={handleEditClient}
            onDeleteClient={handleDeleteClient}
            onOverlayChange={setChildOverlayActive}
            onApproveReschedule={handleApproveReschedule}
            onRejectReschedule={handleRejectReschedule}
            onCancelReschedule={handleCancelReschedule}
            onOpenReviewReschedule={handleOpenReviewReschedule}
          />
        ) : activeNav === 'calendar' ? (
          <SessionsCalendarView
            clients={clients}
            currentUserRole={currentUserRole}
            currentClientId={currentUserSession?.clientId || 'k-01'}
            onBackToDashboard={() => setActiveNav('dashboard')}
            onSelectClient={(clientId) => {
              handleSelectClient(clientId);
            }}
            onOpenLogSession={(clientId) => setLogSessionClientId(clientId)}
            onOpenReschedule={(clientId) => setRescheduleClientId(clientId)}
            onApproveReschedule={handleApproveReschedule}
            onRejectReschedule={handleRejectReschedule}
            onCancelReschedule={handleCancelReschedule}
            onOpenReviewReschedule={handleOpenReviewReschedule}
            onScheduleNewSession={(newSession) => {
              updateClientAndSync(newSession.clientId, (c) => {
                const newSlot: ScheduledSlot = {
                  id: `sched-${c.id}-${Date.now()}`,
                  date: newSession.date,
                  time: newSession.time,
                  location: newSession.location,
                  focus: newSession.focus,
                  durationMinutes: 75,
                  sessionNumber: Math.min(c.paketTotal, c.paketTerpakai + 1),
                  status: 'Terkonfirmasi'
                };
                const existingSlots = (c.scheduledSessions || []).filter(
                  (s) => !(s.date === newSession.date && s.time === newSession.time)
                );
                return {
                  ...c,
                  nextSession: {
                    date: newSession.date,
                    time: newSession.time,
                    location: newSession.location,
                    focus: newSession.focus,
                    confirmed: true
                  },
                  scheduledSessions: [...existingSlots, newSlot]
                };
              });
              const chosen = clients.find((c) => c.id === newSession.clientId);
              showToast(
                `Jadwal sesi baru (${newSession.date} · ${newSession.time} WIB) untuk ${chosen?.nama_lengkap || 'Member'} tersimpan ke Firestore!`
              );
            }}
            onNotify={showToast}
            onOverlayChange={setChildOverlayActive}
            onOpenRescheduleHub={() => setShowRescheduleHubModal(true)}
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
            {currentUserRole === 'client' ? (
              <ClientProfileView
                client={
                  clients.find((c) => c.id === (currentUserSession?.clientId || 'k-01')) ||
                  clients[0]
                }
                coach={coach}
                gymSettings={gymSettings}
                onBackToDashboard={() => setActiveNav('dashboard')}
                onNotify={showToast}
                onLogoutConfirmed={() => {
                  logoutGatekeeper();
                  setIsLocked(true);
                }}
                onOpenRescheduleHistory={() => setShowRescheduleHubModal(true)}
                onOpenRescheduleModal={() =>
                  setRescheduleClientId(currentUserSession?.clientId || 'k-01')
                }
              />
            ) : (
              <CoachProfileView
                coach={coach}
                clients={clients}
                activeClientsCount={activeMembersCount}
                gymSettings={gymSettings}
                exerciseCatalog={exerciseCatalog}
                onOpenRescheduleHub={() => setShowRescheduleHubModal(true)}
                onUpdateCoach={(updatedCoach) => {
                  const prevCoach = coach;
                  setCoach(updatedCoach);
                  saveCoachProfileToFirestore(updatedCoach).catch((err) => {
                    console.warn('[Firestore] Failed to persist coach profile:', err);
                    setCoach(prevCoach);
                    showToast('Koneksi terputus: Gagal menyimpan profil Coach ke database.');
                  });
                }}
                onUpdateGymSettings={(updatedGym) => {
                  setGymSettings(updatedGym);
                  showToast('Pengaturan identitas gym & lokasi berhasil disimpan.');
                }}
                onUpdateExerciseCatalog={(updatedCatalog) => {
                  setExerciseCatalog(updatedCatalog);
                  showToast('Katalog gerakan latihan berhasil diperbarui.');
                }}
                onRestoreData={(restoredClients, restoredCoach) => {
                  const prevClients = clients;
                  const prevCoach = coach;
                  setClients(restoredClients);
                  setCoach(restoredCoach);
                  saveClientsBatchToFirestore(restoredClients)
                    .then(() => saveCoachProfileToFirestore(restoredCoach))
                    .then(() => {
                      showToast(`Data berhasil dipulihkan: ${restoredClients.length} member aktif.`);
                    })
                    .catch((err) => {
                      console.warn('[Firestore] Batch restore to firestore failed:', err);
                      setClients(prevClients);
                      setCoach(prevCoach);
                      showToast('Koneksi terputus: Gagal memulihkan data cadangan ke database.');
                    });
                }}
                onLogoutConfirmed={() => {
                  logoutGatekeeper();
                  setIsLocked(true);
                }}
                onNotify={showToast}
                onOverlayChange={setChildOverlayActive}
              />
            )}
          </div>
        ) : (
          <>
            {/* Search Shortcut & Quick Action Bar */}
            {currentUserRole === 'client' ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-gradient-to-r from-blue-500/10 via-[#111827] to-[#111827] border border-blue-500/25 shadow-lg">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-500 to-emerald-400 text-white font-bold flex items-center justify-center text-sm shadow-md shrink-0">
                      {currentClient.initials}
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-sm font-bold text-white tracking-tight truncate">
                        {currentClient.nama_lengkap}
                      </h2>
                      <p className="text-[11px] text-neutral-400 truncate">
                        Member Personal Training • {currentClient.phase}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSelectClient(currentClient.id)}
                    className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition active:scale-95 shadow-sm shrink-0 flex items-center gap-1.5"
                  >
                    <Dumbbell className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Buka Kokpit Latihan</span>
                  </button>
                </div>

                {/* Member Access PIN & Security Card with Small Edit PIN Icon and History */}
                <div className="card-glass hairline-border bg-[#111827]/90 rounded-2xl p-3.5 border border-white/[0.08] shadow-md space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-500/25 text-blue-400 flex items-center justify-center shrink-0">
                        <KeyRound className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[10px] text-neutral-400 uppercase tracking-wider block font-semibold">
                          PIN Akses Member
                        </span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="font-mono text-sm font-bold text-white tracking-widest">
                            {showDashboardPin
                              ? (currentClient.clientPin || getClientPin(currentClient.id, currentClient.telepon))
                              : '••••••••'}
                          </span>
                          <button
                            type="button"
                            onClick={() => setShowDashboardPin(!showDashboardPin)}
                            className="p-1 rounded text-neutral-400 hover:text-white transition"
                            title={showDashboardPin ? 'Sembunyikan PIN' : 'Tampilkan PIN'}
                          >
                            {showDashboardPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => setChangePinClientId(currentClient.id)}
                            className="px-2 py-1 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 text-blue-300 text-xs font-semibold flex items-center gap-1 transition active:scale-95 shadow-sm"
                            title="Klik untuk membuka layar ubah PIN"
                          >
                            <Pencil className="w-3 h-3 text-blue-400" />
                            <span>Ubah PIN</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                        mustChangeClientPin(currentClient.id)
                          ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                          : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                      }`}
                    >
                      {mustChangeClientPin(currentClient.id) ? '⚠️ Wajib Ganti PIN' : '✓ PIN Kustom Aktif'}
                    </span>
                  </div>

                  {/* Riwayat Perubahan PIN Audit Trail */}
                  <PinChangeHistoryView history={currentClient.pinChangeHistory} compact />
                </div>
              </div>
            ) : (
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

                {isCoachOrAdmin(currentUserRole) && (
                  <button
                    type="button"
                    onClick={() => setShowAddClientModal(true)}
                    className="shrink-0 flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs transition active:scale-95 shadow-md shadow-emerald-500/20"
                  >
                    <UserPlus className="w-4 h-4 stroke-[2.3]" />
                    <span>Tambah Member</span>
                  </button>
                )}
              </div>
            )}

            {/* Asymmetric KPI Bento Grid */}
            <section>
              <div className="grid grid-cols-2 gap-2.5 mb-2.5">
                {currentUserRole === 'client' ? (
                  <>
                    {/* Bento 1: Sisa Kuota Paket PT Saya */}
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => handleSelectClient(currentClient.id)}
                      className="card-glass hairline-border rounded-2xl p-3.5 relative overflow-hidden group hover:border-emerald-500/40 transition cursor-pointer"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-medium text-neutral-400">
                          Sisa Kuota Sesi
                        </span>
                        <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </div>
                      </div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-2xl font-bold text-white tracking-tightest">
                          {Math.max(0, currentClient.paketTotal - currentClient.paketTerpakai)}
                        </span>
                        <span className="text-xs text-neutral-400 font-medium">Sesi</span>
                      </div>
                      <div className="mt-2.5">
                        <div className="flex justify-between text-[10px] text-neutral-400 mb-1">
                          <span>Terpakai {currentClient.paketTerpakai}/{currentClient.paketTotal}</span>
                          <span className="text-emerald-400 font-mono">
                            {Math.round((currentClient.paketTerpakai / currentClient.paketTotal) * 100)}%
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full"
                            style={{
                              width: `${Math.min(100, Math.round((currentClient.paketTerpakai / currentClient.paketTotal) * 100))}%`
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Bento 2: Jadwal Sesi Berikutnya */}
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => setActiveNav('calendar')}
                      className="card-glass hairline-border bg-amber-500/[0.03] rounded-2xl p-3.5 relative overflow-hidden group hover:border-amber-400/50 hover:bg-white/[0.04] active:scale-[0.98] transition-all cursor-pointer select-none"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-medium text-neutral-400 group-hover:text-amber-300 transition-colors flex items-center gap-1">
                          <span>Sesi Terdekat</span>
                          <ChevronRight className="w-3 h-3 text-amber-400 opacity-80 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                        </span>
                        <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20 group-hover:bg-amber-500/25 transition-colors">
                          <Clock className="w-3.5 h-3.5" />
                        </div>
                      </div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-xl font-bold text-white tracking-tight group-hover:text-amber-200 transition-colors font-mono">
                          {currentClient.nextSession?.time || (currentClient.scheduledSessions && currentClient.scheduledSessions[0]?.time) || '-'}
                        </span>
                        <span className="text-xs text-neutral-400 font-medium">WIB</span>
                      </div>
                      <div className="mt-2 text-[10px] text-neutral-400 truncate">
                        <p className="text-amber-300 font-semibold truncate">
                          {currentClient.nextSession?.date || (currentClient.scheduledSessions && currentClient.scheduledSessions[0]?.date) || 'Belum Terjadwal'}
                        </p>
                        <p className="text-neutral-500 truncate">{currentClient.nextSession?.location || 'Fitness Center'}</p>
                      </div>
                    </div>

                    {/* Bento 3: Kepatuhan Nutrisi Saya */}
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => handleSelectClient(currentClient.id)}
                      className="card-glass hairline-border rounded-2xl p-3.5 relative overflow-hidden group hover:border-emerald-500/30 transition cursor-pointer"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-medium text-neutral-400">
                          Kepatuhan Diet
                        </span>
                        <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                          <Flame className="w-3.5 h-3.5" />
                        </div>
                      </div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-2xl font-bold text-white tracking-tightest">
                          {currentClient.dietCompliancePct}%
                        </span>
                        <span className="text-xs text-emerald-400 font-medium font-mono">Tercapai</span>
                      </div>
                      <div className="mt-2 text-[10px] text-neutral-400 flex items-center gap-1.5 truncate">
                        <span className="text-neutral-300 font-mono font-medium">{currentClient.kaloriTarget} kkal</span>
                        <span>•</span>
                        <span className="text-emerald-400 font-mono font-medium">{currentClient.proteinTarget}g Protein</span>
                      </div>
                    </div>

                    {/* Bento 4: Rekor Beban Pribadi (PR) */}
                    {(() => {
                      const topPR = currentClient.prList && currentClient.prList.length > 0
                        ? [...currentClient.prList].sort((a, b) => (b.est1RM || b.weightKg) - (a.est1RM || a.weightKg))[0]
                        : null;
                      return (
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => handleSelectClient(currentClient.id)}
                          className="card-glass hairline-border rounded-2xl p-3.5 relative overflow-hidden group hover:border-emerald-500/30 transition cursor-pointer"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[11px] font-medium text-neutral-400">
                              Top PR Teruji
                            </span>
                            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                              <Award className="w-3.5 h-3.5" />
                            </div>
                          </div>
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-2xl font-bold text-emerald-400 tracking-tightest font-mono">
                              {topPR ? topPR.weightKg : '-'}
                            </span>
                            {topPR && <span className="text-xs text-neutral-400 font-medium">kg</span>}
                          </div>
                          <div className="mt-2 text-[10px] text-neutral-400 truncate">
                            <span className="text-white font-medium truncate block">
                              {topPR ? topPR.exerciseName : 'Belum Ada Rekor PR'}
                            </span>
                            <span className="text-emerald-400/80 font-mono">
                              {topPR ? `1RM: ${topPR.est1RM} kg` : 'Catat di Kokpit Latihan'}
                            </span>
                          </div>
                        </div>
                      );
                    })()}
                  </>
                ) : (
                  <>
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
                          {activeMembersCount}
                        </span>
                        <span className="text-xs text-neutral-400 font-medium">Member</span>
                      </div>
                      <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-emerald-400">
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 font-medium font-mono text-[10px]">
                          {activeMembersCount} Aktif
                        </span>
                        <span className="text-neutral-400">dari {clients.length} total member</span>
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
                      className="card-glass hairline-border bg-amber-500/[0.03] rounded-2xl p-3.5 relative overflow-hidden group hover:border-amber-400/50 hover:bg-white/[0.04] active:scale-[0.98] transition-all cursor-pointer select-none"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-medium text-neutral-400 group-hover:text-amber-300 transition-colors flex items-center gap-1">
                          <span>Sesi Minggu Ini</span>
                          <ChevronRight className="w-3 h-3 text-amber-400 opacity-80 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                        </span>
                        <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20 group-hover:bg-amber-500/25 transition-colors">
                          <CalendarCheck className="w-3.5 h-3.5" />
                        </div>
                      </div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-2xl font-bold text-white tracking-tightest group-hover:text-amber-200 transition-colors">
                          {weeklySessionsSummary.total}
                        </span>
                        <span className="text-xs text-neutral-400 font-medium">Sesi</span>
                      </div>
                      <div className="mt-2.5">
                        <div className="flex justify-between text-[10px] text-neutral-400 mb-1">
                          <span>Progres Sesi</span>
                          <span className="text-amber-400 font-medium font-mono">
                            {weeklySessionsSummary.completed} / {weeklySessionsSummary.total}
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-500"
                            style={{ width: `${weeklySessionsSummary.pct}%` }}
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
                        <span className="text-2xl font-bold text-white tracking-tightest">
                          {targetAchievedCount}
                        </span>
                        <span className="text-xs text-neutral-400 font-medium">Member</span>
                      </div>
                      <div className="mt-2 flex items-center gap-1 text-[11px] text-neutral-400">
                        <Flame className="w-3 h-3 text-amber-400 shrink-0" />
                        <span className="truncate text-[10px]">Fat loss &gt;3kg / surplus massa otot</span>
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
                          {averageCompliance.pct}
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
                            d={averageCompliance.path}
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </section>

            {/* Scoped Center Section: Client Personal Athletic Hub VS Coach/Admin Directory */}
            {currentUserRole === 'client' ? (
              <section className="card-glass hairline-border rounded-2xl p-4 sm:p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-white tracking-tight">
                      Program Atletik &amp; Profil Kebugaran Saya
                    </h3>
                    <p className="text-[11px] text-neutral-400 mt-0.5">
                      Target Utama: <span className="text-emerald-400 font-semibold">{currentClient.target_utama}</span> • Target BB: {currentClient.berat_target_kg} kg
                    </p>
                  </div>
                  <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-semibold">
                    {currentClient.status}
                  </span>
                </div>

                {/* 3 Metric Pills */}
                <div className="grid grid-cols-3 gap-2.5 text-xs font-mono">
                  <div className="bg-[#070e1d] p-3 rounded-xl border border-white/[0.05]">
                    <span className="text-[10px] font-sans text-neutral-400 block mb-0.5">Berat Terkini</span>
                    <span className="text-sm font-bold text-white">{currentClient.berat_terkini_kg} kg</span>
                    <span className="text-[10px] text-emerald-400 block mt-0.5">
                      {(currentClient.berat_terkini_kg - currentClient.berat_awal_kg).toFixed(1)} kg vs M1
                    </span>
                  </div>
                  <div className="bg-[#070e1d] p-3 rounded-xl border border-white/[0.05]">
                    <span className="text-[10px] font-sans text-neutral-400 block mb-0.5">Body Fat</span>
                    <span className="text-sm font-bold text-amber-400">{currentClient.body_fat_terkini_pct}%</span>
                    <span className="text-[10px] text-emerald-400 block mt-0.5">
                      {(currentClient.body_fat_terkini_pct - currentClient.body_fat_awal_pct).toFixed(1)}% vs M1
                    </span>
                  </div>
                  <div className="bg-[#070e1d] p-3 rounded-xl border border-white/[0.05]">
                    <span className="text-[10px] font-sans text-neutral-400 block mb-0.5">Lingkar Pinggang</span>
                    <span className="text-sm font-bold text-cyan-400">{currentClient.lingkar_pinggang_terkini_cm} cm</span>
                    <span className="text-[10px] text-emerald-400 block mt-0.5">
                      {(currentClient.lingkar_pinggang_terkini_cm - currentClient.lingkar_pinggang_awal_cm).toFixed(1)} cm
                    </span>
                  </div>
                </div>

                {/* Action Shortcuts */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleSelectClient(currentClient.id)}
                    className="min-h-[44px] px-3.5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition shadow-sm"
                  >
                    <Dumbbell className="w-4 h-4" />
                    <span>Kokpit Latihan Lengkap</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveNav('calendar')}
                    className="min-h-[44px] px-3.5 py-2.5 rounded-xl bg-[#191f2f] hover:bg-[#232a3a] text-white border border-white/[0.08] font-semibold text-xs flex items-center justify-center gap-2 active:scale-95 transition"
                  >
                    <Calendar className="w-4 h-4 text-amber-400" />
                    <span>Kalender Sesi Saya</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveNav('profile')}
                    className="min-h-[44px] px-3.5 py-2.5 rounded-xl bg-[#191f2f] hover:bg-[#232a3a] text-white border border-white/[0.08] font-semibold text-xs flex items-center justify-center gap-2 active:scale-95 transition"
                  >
                    <User className="w-4 h-4 text-blue-400" />
                    <span>Profil &amp; Ganti PIN</span>
                  </button>
                </div>
              </section>
            ) : (
              /* Direktori Member Fitness Center Section (Coach/Admin Only) */
              <section id="memberSection" className="space-y-3">
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
                    {visibleClients.length} Member Ditampilkan
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
                      <div className="relative flex items-center">
                        <select
                          value={statusFilter}
                          onChange={(e) => setStatusFilter(e.target.value)}
                          className="bg-[#0B0F17] border border-white/[0.08] rounded-md pl-2 pr-6 py-1 text-neutral-200 text-xs focus:outline-none focus:border-emerald-500/50 appearance-none cursor-pointer"
                        >
                          <option value="Semua">Semua Status</option>
                          <option value="Aktif">Aktif</option>
                          <option value="Cuti">Cuti</option>
                        </select>
                        <ChevronDown className="w-3 h-3 text-neutral-400 absolute right-1.5 pointer-events-none" />
                      </div>
                    </div>

                    {/* Target Dropdown Filter */}
                    <div className="flex items-center gap-1 text-[11px] text-neutral-400 shrink-0">
                      <span>Target:</span>
                      <div className="relative flex items-center">
                        <select
                          value={targetFilter}
                          onChange={(e) => setTargetFilter(e.target.value)}
                          className="bg-[#0B0F17] border border-white/[0.08] rounded-md pl-2 pr-6 py-1 text-neutral-200 text-xs focus:outline-none focus:border-emerald-500/50 appearance-none cursor-pointer"
                        >
                          <option value="Semua">Semua Target</option>
                          <option value="Fat Loss">Fat Loss</option>
                          <option value="Hipertrofi">Hipertrofi</option>
                          <option value="Powerlifting">Powerlifting</option>
                        </select>
                        <ChevronDown className="w-3 h-3 text-neutral-400 absolute right-1.5 pointer-events-none" />
                      </div>
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
                {visibleClients.length === 0 ? (
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
                    {visibleClients.map((client) => {
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
                          <div className="flex items-center justify-between pt-1 text-[11px] min-h-[44px]">
                            <div className="flex items-center gap-1 text-neutral-400 truncate max-w-[55%]">
                              <History className="w-3 h-3 text-neutral-500 shrink-0" />
                              <span className="truncate text-[10px]">
                                {client.sesi_terakhir}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <a
                                href={`https://wa.me/${(client.telepon || '').replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Hubungi WhatsApp"
                                className="min-w-[44px] min-h-[44px] rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition flex items-center justify-center active:scale-95"
                              >
                                <MessageCircle className="w-4 h-4" />
                              </a>

                              <button
                                type="button"
                                onClick={() => handleSelectClient(client.id)}
                                className="min-h-[44px] flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-neutral-200 hover:text-white border border-white/[0.08] text-xs font-semibold transition active:scale-95 shadow-sm"
                              >
                                <span>Detail</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            )}

            {/* Jadwal Hari Ini / Live Session Feed */}
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
                <span className="text-[11px] text-neutral-400">
                  {todaySessions.length} Sesi
                </span>
              </div>

              {todaySessions.length === 0 ? (
                <p className="text-xs text-neutral-500 py-3 text-center">
                  Tidak ada sesi terjadwal hari ini.
                </p>
              ) : (
                <div className="space-y-2">
                  {todaySessions.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => handleSelectClient(c.id)}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:border-white/[0.12] cursor-pointer transition"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-xs font-mono font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">
                          {c.nextSession.time}
                        </span>
                        <div>
                          <p className="text-xs font-semibold text-white">{c.nama_lengkap}</p>
                          <p className="text-[11px] text-neutral-400">{c.nextSession.focus}</p>
                        </div>
                      </div>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full border ${
                          c.nextSession.confirmed
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                        }`}
                      >
                        {c.nextSession.confirmed ? 'Terkonfirmasi' : 'Konfirmasi'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>

      {/* Modal: Tambah Member Baru (Enhanced Onboarding & Direct Profile Redirect) */}
      {showAddClientModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAddClientModal(false);
          }}
          className="fixed inset-0 z-50 bg-[#070e1d]/85 backdrop-blur-md flex items-center justify-center p-4"
        >
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-[#111726]/95 backdrop-blur-2xl border border-white/[0.12] rounded-3xl p-6 shadow-[0_25px_60px_rgba(0,0,0,0.6)] space-y-4">
            <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.08]">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0 shadow-sm">
                  <UserPlus className="w-5 h-5 stroke-[2.2]" />
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
                aria-label="Tutup form member"
                className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-xl text-neutral-400 hover:text-white flex items-center justify-center hover:bg-white/[0.06] transition active:scale-95"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddClientSubmit} className="space-y-4">
              {/* Section 1: Data Diri & Kontak */}
              <div className="space-y-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                    1. Identitas &amp; Aktivitas Member
                  </span>
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
                      className="w-full bg-[#0B0F17] border border-white/[0.1] rounded-xl px-3 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 transition"
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
                      className="w-full bg-[#0B0F17] border border-white/[0.1] rounded-xl px-3 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 transition font-mono"
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
                      className="w-full bg-[#0B0F17] border border-white/[0.1] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 transition"
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
                      className="w-full bg-[#0B0F17] border border-white/[0.1] rounded-xl px-3 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 transition font-mono"
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
                    <option value="Member Rekreasional">Member Rekreasional (Aktif)</option>
                    <option value="Member Kompetitif">Member Kompetitif / Spesialis</option>
                  </select>
                </div>
              </div>

              {/* Section 2: Paket Sesi & Program Kepelatihan */}
              <div className="pt-3 border-t border-white/[0.08] space-y-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                    2. Paket Sesi &amp; Program Latihan
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
                      className="w-full bg-[#0B0F17] border border-white/[0.1] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 transition"
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
                      className="w-full bg-[#0B0F17] border border-white/[0.1] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 transition"
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
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                    3. Baseline Fisik &amp; Riwayat Cedera
                  </span>
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
                      className="w-full bg-[#0B0F17] border border-white/[0.1] rounded-xl px-3 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 transition font-mono"
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
                      className="w-full bg-[#0B0F17] border border-white/[0.1] rounded-xl px-3 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 transition font-mono"
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
                      className="w-full bg-[#0B0F17] border border-white/[0.1] rounded-xl px-3 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 transition font-mono"
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
                      className="w-full bg-[#0B0F17] border border-white/[0.1] rounded-xl px-3 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 transition font-mono"
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
                    className="w-full bg-[#0B0F17] border border-white/[0.1] rounded-xl px-3 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 transition resize-none"
                  />
                </div>
              </div>

              <div className="pt-3.5 flex items-center justify-between gap-2.5 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setShowAddClientModal(false)}
                  className="min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-semibold text-neutral-300 border border-white/[0.10] hover:bg-white/[0.06] transition active:scale-95"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 min-h-[44px] flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 text-xs font-bold shadow-md shadow-emerald-500/25 active:scale-95 transition"
                >
                  <span>Simpan &amp; Buka Profil Member</span>
                  <ChevronRight className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Update Metrik & Timbang ──► Konfirmasi 8 Minggu (Coach & Admin Only) */}
      {metricsModalClient && isCoachOrAdmin(currentUserRole) && (
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
          exerciseCatalog={exerciseCatalog}
          onClose={() => setLogSessionClientId(null)}
          onSaveSession={(newSession) => handleSaveSession(logSessionClient.id, newSession)}
          onOpenReschedule={() => setRescheduleClientId(logSessionClient.id)}
        />
      )}

      {/* Modal: Reschedule Sesi Latihan */}
      {rescheduleClient && (
        <RescheduleModal
          client={rescheduleClient}
          currentUserRole={currentUserRole}
          availableLocations={gymSettings.locations.filter((l) => l.isActive).map((l) => l.name)}
          onClose={() => setRescheduleClientId(null)}
          onConfirmReschedule={(payload) =>
            handleConfirmReschedule(rescheduleClient.id, payload)
          }
        />
      )}

      {/* Modal: Pusat Notifikasi Push */}
      {showNotificationCenter && (
        <NotificationCenterModal
          currentUserRole={currentUserRole}
          currentClientId={currentUserSession?.clientId}
          onClose={() => setShowNotificationCenter(false)}
          onSelectClient={(cid) => {
            handleSelectClient(cid);
            setShowNotificationCenter(false);
          }}
          onReviewRequest={(cid, req) => {
            handleOpenReviewReschedule(cid, req);
            setShowNotificationCenter(false);
          }}
        />
      )}

      {/* Modal: Pusat Pengajuan Reschedule Sesi PT (Overview & Tracking) */}
      {showRescheduleHubModal && (
        <RescheduleRequestsHubModal
          currentUserRole={currentUserRole}
          currentClientId={currentUserSession?.clientId}
          clients={clients}
          onClose={() => setShowRescheduleHubModal(false)}
          onReviewRequest={(cid, req) => {
            handleOpenReviewReschedule(cid, req);
            setShowRescheduleHubModal(false);
          }}
          onCancelRequest={(req) => {
            handleCancelReschedule(req);
          }}
        />
      )}

      {/* Modal: Tinjau Permintaan Reschedule Sesi (Review Popup Screen) */}
      {reviewingRescheduleData && (
        <ReviewRescheduleRequestModal
          client={reviewingRescheduleData.client}
          request={reviewingRescheduleData.request}
          currentUserRole={currentUserRole}
          currentUserDisplayName={currentUserSession?.displayName}
          onClose={() => setReviewingRescheduleData(null)}
          onApprove={(req, note) => {
            handleApproveReschedule(req, note);
            setReviewingRescheduleData(null);
          }}
          onReject={(req, reason) => {
            handleRejectReschedule(req, reason);
            setReviewingRescheduleData(null);
          }}
          onCancel={(req) => {
            handleCancelReschedule(req);
            setReviewingRescheduleData(null);
          }}
        />
      )}

      {/* Modal: Ubah PIN Keamanan Member (Accessible to Member, Coach, and Admin) */}
      {changePinClient && (
        <ChangePinModal
          client={changePinClient}
          currentUserRole={currentUserRole}
          currentUserDisplayName={currentUserSession?.displayName}
          onClose={() => setChangePinClientId(null)}
          onPinUpdated={(newPin, logEntry) => {
            updateClientAndSync(changePinClient.id, (c) => ({
              ...c,
              clientPin: newPin,
              mustChangePin: false,
              pinChangedAt: logEntry.changedAt,
              pinChangeHistory: [logEntry, ...(c.pinChangeHistory || [])]
            }));
          }}
          onNotify={showToast}
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
