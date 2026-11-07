import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ShieldCheck,
  Award,
  MapPin,
  Users,
  Edit3,
  LogOut,
  CheckCircle2,
  Lock,
  Plus,
  X,
  RefreshCw,
  Download,
  Upload,
  Database,
  CalendarClock,
  Building2,
  Dumbbell,
  Search,
  Trash2,
  Save,
  Clock,
  Phone,
  MessageCircle,
  AlertTriangle,
  Sparkles,
  Camera
} from 'lucide-react';
import {
  CoachProfileData,
  CoachCertification,
  ClientProfile,
  GymMasterSettings,
  GymLocationItem,
  CatalogExercise,
  INITIAL_GYM_SETTINGS,
  EXERCISE_CATALOG
} from '../data/mockData';
import { optimizeAvatarImage } from '../utils/avatarImageOptimizer';

interface CoachProfileViewProps {
  coach: CoachProfileData;
  activeClientsCount: number;
  clients?: ClientProfile[];
  gymSettings?: GymMasterSettings;
  exerciseCatalog?: CatalogExercise[];
  onUpdateCoach: (updated: CoachProfileData) => void;
  onUpdateGymSettings?: (updated: GymMasterSettings) => void;
  onUpdateExerciseCatalog?: (updated: CatalogExercise[]) => void;
  onLogoutConfirmed: () => void;
  onNotify: (msg: string) => void;
  onOverlayChange?: (isOpen: boolean) => void;
  onRestoreData?: (clients: ClientProfile[], coach: CoachProfileData) => void;
  onOpenRescheduleHub?: () => void;
}

export const CoachProfileView: React.FC<CoachProfileViewProps> = ({
  coach,
  activeClientsCount,
  clients,
  gymSettings = INITIAL_GYM_SETTINGS,
  exerciseCatalog = EXERCISE_CATALOG,
  onUpdateCoach,
  onUpdateGymSettings,
  onUpdateExerciseCatalog,
  onLogoutConfirmed,
  onNotify,
  onOverlayChange,
  onRestoreData,
  onOpenRescheduleHub
}) => {
  // Navigation Tabs: Coach Profile | Gym Settings & Locations | Exercise Catalog | Backup
  const [activeTab, setActiveTab] = useState<'coach' | 'gym' | 'exercises' | 'backup'>('coach');

  // Scroll to top on every profile segmented tab switch
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [activeTab]);

  // Modals
  const [showEditModal, setShowEditModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [syncingLogout, setSyncingLogout] = useState(false);

  // Gym Settings & Locations State
  const [currentGymSettings, setCurrentGymSettings] = useState<GymMasterSettings>(gymSettings);
  const [editingLocation, setEditingLocation] = useState<GymLocationItem | null>(null);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [locationToDelete, setLocationToDelete] = useState<GymLocationItem | null>(null);

  // Exercise Catalog State
  const [currentCatalog, setCurrentCatalog] = useState<CatalogExercise[]>(exerciseCatalog);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogCategory, setCatalogCategory] = useState<'Semua' | 'Free Weights' | 'Kabel/Mesin' | 'Kalistenik' | 'Kardio/Fungsional'>('Semua');
  const [editingExercise, setEditingExercise] = useState<CatalogExercise | null>(null);
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [exerciseToDelete, setExerciseToDelete] = useState<CatalogExercise | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCurrentGymSettings(gymSettings);
  }, [gymSettings]);

  useEffect(() => {
    setCurrentCatalog(exerciseCatalog);
  }, [exerciseCatalog]);

  const isAnyModalActive = Boolean(
    showEditModal ||
      showLogoutModal ||
      showLocationModal ||
      Boolean(locationToDelete) ||
      showExerciseModal ||
      Boolean(exerciseToDelete)
  );

  useEffect(() => {
    onOverlayChange?.(isAnyModalActive);
    return () => {
      onOverlayChange?.(false);
    };
  }, [isAnyModalActive, onOverlayChange]);

  // Backup & Restore
  const handleExportBackup = () => {
    try {
      const backupPayload = {
        app: 'PelatihKu PRO',
        version: '2.6.0',
        exportedAt: new Date().toISOString(),
        coach,
        clients: clients || [],
        gymSettings: currentGymSettings,
        exerciseCatalog: currentCatalog
      };
      const jsonStr = JSON.stringify(backupPayload, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().split('T')[0];
      a.href = url;
      a.download = `pelatihku-pro-backup-${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      onNotify('File cadangan JSON berhasil diunduh!');
    } catch {
      onNotify('Gagal mengekspor data cadangan.');
    }
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.clients && Array.isArray(parsed.clients) && parsed.coach) {
          onRestoreData?.(parsed.clients, parsed.coach);
          if (parsed.gymSettings && onUpdateGymSettings) {
            onUpdateGymSettings(parsed.gymSettings);
            setCurrentGymSettings(parsed.gymSettings);
          }
          if (parsed.exerciseCatalog && onUpdateExerciseCatalog) {
            onUpdateExerciseCatalog(parsed.exerciseCatalog);
            setCurrentCatalog(parsed.exerciseCatalog);
          }
          onNotify(`Berhasil memulihkan ${parsed.clients.length} data member & pengaturan sistem!`);
        } else {
          onNotify('Format file JSON cadangan tidak valid.');
        }
      } catch {
        onNotify('Gagal membaca file cadangan.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Coach Edit Form State
  const [editName, setEditName] = useState(coach.name);
  const [editRole, setEditRole] = useState(coach.roleTitle);
  const [editKemenpora, setEditKemenpora] = useState(coach.kemenporaId);
  const [editPabsi, setEditPabsi] = useState(coach.pabsiLicense);
  const [editSpecialization, setEditSpecialization] = useState(coach.specialization);
  const [editMaxQuota, setEditMaxQuota] = useState(coach.maxClientQuota);
  const [editPin, setEditPin] = useState(() => {
    try {
      return coach.coachPin || localStorage.getItem('pelatihku_v45_coach_pin') || '123456';
    } catch {
      return coach.coachPin || '123456';
    }
  });
  const [newCertTitle, setNewCertTitle] = useState('');
  const [newCertIssuer, setNewCertIssuer] = useState('');
  const [newCertNumber, setNewCertNumber] = useState('');

  const usedSlots = activeClientsCount;
  const maxSlots = coach.maxClientQuota;
  const remainingSlots = Math.max(0, maxSlots - usedSlots);
  const loadPct = Math.min(100, Math.round((usedSlots / maxSlots) * 100));

  const handleToggleAccepting = () => {
    const nextVal = !coach.acceptingNewClients;
    onUpdateCoach({ ...coach, acceptingNewClients: nextVal });
    onNotify(
      nextVal
        ? 'Status kuota dibuka: Menerima Member Baru'
        : 'Status kuota ditutup sementara untuk member baru'
    );
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    let updatedCerts: CoachCertification[] = [...coach.certifications];
    if (newCertTitle.trim() && newCertNumber.trim()) {
      updatedCerts.push({
        id: `cert-${Date.now()}`,
        title: newCertTitle.trim(),
        issuer: newCertIssuer.trim() || 'Federasi Kebugaran Internasional',
        licenseNumber: newCertNumber.trim(),
        validUntil: 'Des 2028',
        verified: true
      });
    }

    const cleanPin = editPin.trim();
    onUpdateCoach({
      ...coach,
      name: editName.trim() || coach.name,
      roleTitle: editRole.trim() || coach.roleTitle,
      kemenporaId: editKemenpora.trim() || coach.kemenporaId,
      pabsiLicense: editPabsi.trim() || coach.pabsiLicense,
      specialization: editSpecialization.trim() || coach.specialization,
      maxClientQuota: Number(editMaxQuota) || 27,
      certifications: updatedCerts,
      coachPin: cleanPin.length === 6 ? cleanPin : coach.coachPin || '123456'
    });

    if (cleanPin.length === 6) {
      try {
        localStorage.setItem('pelatihku_v45_coach_pin', cleanPin);
      } catch (err) {
        console.warn('Failed to save custom PIN:', err);
      }
    }

    setNewCertTitle('');
    setNewCertIssuer('');
    setNewCertNumber('');
    setShowEditModal(false);
    onNotify('Profil & Kredensial Federasi berhasil diperbarui');
  };

  const handleConfirmLogout = () => {
    setSyncingLogout(true);
    setTimeout(() => {
      setSyncingLogout(false);
      setShowLogoutModal(false);
      onLogoutConfirmed();
    }, 650);
  };

  // --- Coach Profile Picture Upload & Optimization ---
  const coachAvatarInputRef = useRef<HTMLInputElement | null>(null);
  const [isOptimizingCoachAvatar, setIsOptimizingCoachAvatar] = useState(false);
  const [coachAvatarSizeInfo, setCoachAvatarSizeInfo] = useState<string | null>(null);

  const handleCoachAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsOptimizingCoachAvatar(true);
    try {
      const optimized = await optimizeAvatarImage(file, 320, 38 * 1024);
      onUpdateCoach({
        ...coach,
        avatarUrl: optimized.dataUrl
      });
      setCoachAvatarSizeInfo(`${optimized.width}×${optimized.height}px · ${optimized.sizeKB} KB (${optimized.format.toUpperCase()})`);
      onNotify(`Foto profil Head Coach berhasil diperbarui (${optimized.sizeKB} KB · Tajam HD)!`);
    } catch (err: any) {
      onNotify(err?.message || 'Gagal memproses foto profil Head Coach.');
    } finally {
      setIsOptimizingCoachAvatar(false);
      if (coachAvatarInputRef.current) coachAvatarInputRef.current.value = '';
    }
  };

  const handleRemoveCoachAvatar = () => {
    onUpdateCoach({
      ...coach,
      avatarUrl: ''
    });
    setCoachAvatarSizeInfo(null);
    onNotify('Foto profil Head Coach dikembalikan ke inisial PAS.');
  };

  // --- Gym Identity Save ---
  const handleSaveGymIdentity = (e: React.FormEvent) => {
    e.preventDefault();
    if (onUpdateGymSettings) {
      onUpdateGymSettings(currentGymSettings);
    }
    onNotify('Pengaturan Identitas & Operasional Gym berhasil disimpan!');
  };

  // --- Location Management ---
  const handleOpenAddLocation = () => {
    setEditingLocation({
      id: `loc-${Date.now()}`,
      name: '',
      addressZone: '',
      capacitySlots: 10,
      contactNumber: currentGymSettings.contactPhone,
      isActive: true
    });
    setShowLocationModal(true);
  };

  const handleOpenEditLocation = (loc: GymLocationItem) => {
    setEditingLocation({ ...loc });
    setShowLocationModal(true);
  };

  const handleSaveLocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLocation || !editingLocation.name.trim()) return;

    let updatedList: GymLocationItem[];
    const exists = currentGymSettings.locations.some((l) => l.id === editingLocation.id);
    if (exists) {
      updatedList = currentGymSettings.locations.map((l) =>
        l.id === editingLocation.id ? editingLocation : l
      );
    } else {
      updatedList = [...currentGymSettings.locations, editingLocation];
    }

    const updatedSettings = { ...currentGymSettings, locations: updatedList };
    setCurrentGymSettings(updatedSettings);
    if (onUpdateGymSettings) {
      onUpdateGymSettings(updatedSettings);
    }
    setShowLocationModal(false);
    setEditingLocation(null);
    onNotify(`Lokasi gym "${editingLocation.name}" berhasil disimpan!`);
  };

  const handleConfirmDeleteLocation = () => {
    if (!locationToDelete) return;
    if (currentGymSettings.locations.length <= 1) {
      onNotify('Gagal: Minimal harus ada 1 lokasi gym yang aktif.');
      setLocationToDelete(null);
      return;
    }

    const updatedList = currentGymSettings.locations.filter((l) => l.id !== locationToDelete.id);
    const updatedSettings = { ...currentGymSettings, locations: updatedList };
    setCurrentGymSettings(updatedSettings);
    if (onUpdateGymSettings) {
      onUpdateGymSettings(updatedSettings);
    }
    onNotify(`Lokasi "${locationToDelete.name}" telah dihapus.`);
    setLocationToDelete(null);
  };

  // --- Exercise Catalog Management ---
  const filteredCatalog = useMemo(() => {
    return currentCatalog.filter((ex) => {
      const matchCat = catalogCategory === 'Semua' || ex.category === catalogCategory;
      const matchSearch =
        !catalogSearch.trim() ||
        ex.name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
        ex.primaryMuscle.toLowerCase().includes(catalogSearch.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [currentCatalog, catalogCategory, catalogSearch]);

  const handleOpenAddExercise = () => {
    setEditingExercise({
      id: `ex-${Date.now()}`,
      name: '',
      category: 'Free Weights',
      primaryMuscle: '',
      defaultTempo: '3-1-1-0',
      defaultRestSeconds: 90,
      defaultBestKg: 50
    });
    setShowExerciseModal(true);
  };

  const handleOpenEditExercise = (ex: CatalogExercise) => {
    setEditingExercise({ ...ex });
    setShowExerciseModal(true);
  };

  const handleSaveExercise = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExercise || !editingExercise.name.trim()) return;

    let updatedList: CatalogExercise[];
    const exists = currentCatalog.some((c) => c.id === editingExercise.id);
    if (exists) {
      updatedList = currentCatalog.map((c) =>
        c.id === editingExercise.id ? editingExercise : c
      );
    } else {
      updatedList = [editingExercise, ...currentCatalog];
    }

    setCurrentCatalog(updatedList);
    if (onUpdateExerciseCatalog) {
      onUpdateExerciseCatalog(updatedList);
    }
    setShowExerciseModal(false);
    setEditingExercise(null);
    onNotify(`Gerakan "${editingExercise.name}" berhasil disimpan ke katalog!`);
  };

  const handleConfirmDeleteExercise = () => {
    if (!exerciseToDelete) return;
    const updatedList = currentCatalog.filter((c) => c.id !== exerciseToDelete.id);
    setCurrentCatalog(updatedList);
    if (onUpdateExerciseCatalog) {
      onUpdateExerciseCatalog(updatedList);
    }
    onNotify(`Gerakan "${exerciseToDelete.name}" telah dihapus dari katalog.`);
    setExerciseToDelete(null);
  };

  return (
    <div className="space-y-6">
      {/* Segmented Capsule Control (iOS High-Craft Subordinate Navigation Bar) */}
      <div className="p-1.5 bg-[#0c1322]/85 backdrop-blur-2xl border border-white/[0.08] rounded-2xl shadow-sm flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveTab('coach')}
          className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition active:scale-95 flex items-center gap-1.5 shrink-0 ${
            activeTab === 'coach'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
              : 'text-neutral-400 hover:text-white hover:bg-white/[0.04] border border-transparent'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Profil Head Coach</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('gym')}
          className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition active:scale-95 flex items-center gap-1.5 shrink-0 ${
            activeTab === 'gym'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
              : 'text-neutral-400 hover:text-white hover:bg-white/[0.04] border border-transparent'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Pengaturan Gym &amp; Lokasi</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('exercises')}
          className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition active:scale-95 flex items-center gap-1.5 shrink-0 ${
            activeTab === 'exercises'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
              : 'text-neutral-400 hover:text-white hover:bg-white/[0.04] border border-transparent'
          }`}
        >
          <Dumbbell className="w-4 h-4" />
          <span>Katalog Gerakan Latihan</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('backup')}
          className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition active:scale-95 flex items-center gap-1.5 shrink-0 ${
            activeTab === 'backup'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
              : 'text-neutral-400 hover:text-white hover:bg-white/[0.04] border border-transparent'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Cadangan &amp; Pemulihan</span>
        </button>
      </div>

      {/* ================= TAB 1: PROFIL HEAD COACH ================= */}
      {activeTab === 'coach' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          {/* 1. Header Portofolio Pelatih */}
          <section className="bg-[#111726]/85 backdrop-blur-xl border border-white/[0.08] rounded-3xl p-5 space-y-4 shadow-xl">
            <input
              ref={coachAvatarInputRef}
              type="file"
              accept="image/*"
              onChange={handleCoachAvatarChange}
              className="hidden"
            />
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <button
                  type="button"
                  onClick={() => coachAvatarInputRef.current?.click()}
                  disabled={isOptimizingCoachAvatar}
                  title="Ubah Foto Profil Head Coach"
                  aria-label="Ubah Foto Profil Head Coach"
                  className="relative w-16 h-16 rounded-2xl bg-[#141b2b] border border-[#4edea3]/40 text-[#4edea3] flex items-center justify-center font-bold text-lg shrink-0 shadow-md overflow-hidden transition active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4edea3]"
                >
                  {coach.avatarUrl ? (
                    <img
                      src={coach.avatarUrl}
                      alt={coach.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>{coach.initials}</span>
                  )}
                  <span className="absolute bottom-0.5 right-0.5 w-6 h-6 rounded-lg bg-[#10b981] text-[#002113] flex items-center justify-center shadow-md border border-[#141b2b]">
                    <Camera className="w-3.5 h-3.5 stroke-[2.4]" />
                  </span>
                </button>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg font-bold text-white tracking-tight">
                      {coach.name}
                    </h2>
                    <span className="text-xs font-mono text-[#4edea3] px-2 py-0.5 rounded-full bg-[#10b981]/15 border border-[#10b981]/30">
                      Terverifikasi Federasi
                    </span>
                  </div>
                  <p className="text-xs text-[#bbcabf] mt-0.5">{coach.roleTitle}</p>
                  <p className="text-xs text-[#86948a] mt-1 font-mono">
                    <span>{coach.kemenporaId}</span>
                    <span aria-hidden="true"> · </span>
                    <span>{coach.pabsiLicense}</span>
                  </p>
                  <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => coachAvatarInputRef.current?.click()}
                      disabled={isOptimizingCoachAvatar}
                      className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#10b981]/15 hover:bg-[#10b981]/25 border border-[#10b981]/30 text-[#4edea3] text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition active:scale-95"
                    >
                      <Camera className="w-3.5 h-3.5 shrink-0" />
                      <span>{isOptimizingCoachAvatar ? 'Mengoptimalkan...' : coach.avatarUrl ? 'Ganti Foto Coach' : 'Upload Foto Coach'}</span>
                    </button>
                    {coach.avatarUrl && (
                      <button
                        type="button"
                        onClick={handleRemoveCoachAvatar}
                        className="min-h-[44px] px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 text-rose-300 text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition active:scale-95"
                      >
                        <Trash2 className="w-3.5 h-3.5 shrink-0" />
                        <span>Hapus Foto</span>
                      </button>
                    )}
                    {coachAvatarSizeInfo && (
                      <span className="text-[10px] font-mono text-[#4edea3] bg-[#10b981]/10 px-2.5 py-1 rounded-lg border border-[#10b981]/20 whitespace-nowrap">
                        ✓ Hemat Memori: {coachAvatarSizeInfo}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(true)}
                  className="min-h-[44px] px-3.5 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-white text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 border border-white/[0.08]"
                >
                  <Edit3 className="w-3.5 h-3.5 text-[#4edea3]" />
                  <span>Edit Kredensial</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowLogoutModal(true)}
                  className="min-h-[44px] px-3.5 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-1.5 transition active:scale-95"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Keluar Akun</span>
                </button>
              </div>
            </div>

            <div className="pt-3 border-t border-white/[0.08] grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.05]">
                <span className="text-[#86948a] block">Spesialisasi Utama</span>
                <span className="text-white font-medium mt-0.5 block">
                  {coach.specialization}
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.05]">
                <span className="text-[#86948a] block">Zonasi Lantai Gym</span>
                <span className="text-white font-medium mt-0.5 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-[#4edea3]" />
                  {coach.primaryLocation} · {coach.secondaryLocation}
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.05]">
                <span className="text-[#86948a] block">Jam Terbang S&amp;C</span>
                <span className="text-white font-mono font-semibold mt-0.5 block">
                  {coach.experienceYears} Tahun · 4,200+ Sesi Terverifikasi
                </span>
              </div>
            </div>
          </section>

          {/* 2. Alokasi Slot Member PT & Ketersediaan Kuota */}
          <section className="bg-[#111726]/85 backdrop-blur-xl border border-white/[0.08] rounded-3xl p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#10b981]/15 text-[#4edea3] flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    Alokasi Slot &amp; Kapasitas Member PT
                  </h3>
                  <p className="text-xs text-[#bbcabf]">
                    Pengaturan beban kerja mingguan dan kuota penerimaan member fitness center baru
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleToggleAccepting}
                className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold border transition active:scale-95 ${
                  coach.acceptingNewClients
                    ? 'bg-[#10b981] text-[#002113] border-[#4edea3]'
                    : 'bg-white/[0.05] text-[#bbcabf] border-white/[0.1]'
                }`}
              >
                {coach.acceptingNewClients ? 'Menerima Member Baru: AKTIF' : 'Kuota Ditutup Sementara'}
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#bbcabf]">
                  Beban Kapasitas Aktif: <strong className="text-white font-mono">{loadPct}%</strong>
                </span>
                <span className="font-mono text-[#4edea3]">
                  {usedSlots} / {maxSlots} Slot Terisi (Sisa {remainingSlots} Slot Kosong)
                </span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-[#070e1d] overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#10b981] to-[#ffb95f]"
                  style={{ width: `${loadPct}%` }}
                />
              </div>
              <p className="text-xs text-[#86948a]">
                Batas kuota ditetapkan maksimal {maxSlots} member aktif guna menjaga kualitas koreksi biomekanik gym floor dan pemantauan nutrisi individu.
              </p>
            </div>
          </section>

          {/* 2.5 Reschedule Management Action Card */}
          {onOpenRescheduleHub && (
            <section className="bg-[#111726]/85 backdrop-blur-xl border border-white/[0.08] rounded-3xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0">
                  <CalendarClock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    Daftar &amp; Riwayat Reschedule Sesi PT
                  </h3>
                  <p className="text-xs text-[#bbcabf]">
                    Tinjau dan putuskan seluruh permohonan pergantian jadwal latihan Member
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onOpenRescheduleHub}
                className="min-h-[44px] px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 transition active:scale-95 shrink-0"
              >
                <CalendarClock className="w-4 h-4 text-slate-950" />
                <span>Buka Pusat Reschedule</span>
              </button>
            </section>
          )}

          {/* 3. Status Lisensi & Akreditasi Internasional */}
          <section className="bg-[#111726]/85 backdrop-blur-xl border border-white/[0.08] rounded-3xl p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">
                  Status Lisensi &amp; Akreditasi Resmi
                </h3>
                <p className="text-xs text-[#bbcabf]">
                  Sertifikasi Internasional &amp; Lisensi Pelatnas Terverifikasi
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(true)}
                className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-[#4edea3] text-xs font-semibold flex items-center gap-1 border border-white/[0.08] transition active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Lisensi</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {coach.certifications.map((cert) => (
                <div
                  key={cert.id}
                  className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.08] flex items-start justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-[#4edea3] shrink-0" />
                      <h4 className="text-xs font-semibold text-white truncate">
                        {cert.title}
                      </h4>
                    </div>
                    <p className="text-xs text-[#bbcabf]">{cert.issuer}</p>
                    <p className="text-[11px] font-mono text-[#86948a] pt-1">
                      <span>ID: {cert.licenseNumber}</span>
                      <span aria-hidden="true"> · </span>
                      <span>Berlaku s/d {cert.validUntil}</span>
                    </p>
                  </div>
                  <span className="text-[11px] font-mono text-[#4edea3] shrink-0 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Valid
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* ================= TAB 2: PENGATURAN GYM & LOKASI ================= */}
      {activeTab === 'gym' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          {/* Identitas Fitness Center */}
          <section className="bg-[#111726]/85 backdrop-blur-xl border border-white/[0.08] rounded-3xl p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                  <Building2 className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white tracking-tight">
                    Identitas &amp; Pengaturan Dasar Fitness Center
                  </h3>
                  <p className="text-xs text-[#bbcabf]">
                    Kelola nama pusat kebugaran, kontak layanan, dan durasi standar sesi
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSaveGymIdentity} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    Nama Fitness Center / Klub Gym *
                  </label>
                  <input
                    type="text"
                    required
                    value={currentGymSettings.gymName}
                    onChange={(e) =>
                      setCurrentGymSettings({ ...currentGymSettings, gymName: e.target.value })
                    }
                    className="w-full min-h-[44px] bg-[#070e1d] border border-white/[0.12] rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    Tagline / Slogan Operasional
                  </label>
                  <input
                    type="text"
                    value={currentGymSettings.tagline}
                    onChange={(e) =>
                      setCurrentGymSettings({ ...currentGymSettings, tagline: e.target.value })
                    }
                    className="w-full min-h-[44px] bg-[#070e1d] border border-white/[0.12] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">
                  Alamat Kantor Utama / Pusat *
                </label>
                <input
                  type="text"
                  required
                  value={currentGymSettings.primaryAddress}
                  onChange={(e) =>
                    setCurrentGymSettings({
                      ...currentGymSettings,
                      primaryAddress: e.target.value
                    })
                  }
                  className="w-full min-h-[44px] bg-[#070e1d] border border-white/[0.12] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    Telepon Layanan Gym
                  </label>
                  <input
                    type="text"
                    value={currentGymSettings.contactPhone}
                    onChange={(e) =>
                      setCurrentGymSettings({
                        ...currentGymSettings,
                        contactPhone: e.target.value
                      })
                    }
                    className="w-full min-h-[44px] bg-[#070e1d] border border-white/[0.12] rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    WhatsApp Resmi (Format 62...)
                  </label>
                  <input
                    type="text"
                    value={currentGymSettings.contactWhatsApp}
                    onChange={(e) =>
                      setCurrentGymSettings({
                        ...currentGymSettings,
                        contactWhatsApp: e.target.value
                      })
                    }
                    className="w-full min-h-[44px] bg-[#070e1d] border border-white/[0.12] rounded-xl px-3 py-2 text-xs font-mono text-emerald-400 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    Durasi Sesi Standar (Menit)
                  </label>
                  <input
                    type="number"
                    min={30}
                    max={180}
                    step={15}
                    value={currentGymSettings.defaultSessionDurationMinutes}
                    onChange={(e) =>
                      setCurrentGymSettings({
                        ...currentGymSettings,
                        defaultSessionDurationMinutes: parseInt(e.target.value, 10) || 75
                      })
                    }
                    className="w-full min-h-[44px] bg-[#070e1d] border border-white/[0.12] rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">
                  Jam Operasional Lantai Gym
                </label>
                <input
                  type="text"
                  value={currentGymSettings.operatingHours}
                  onChange={(e) =>
                    setCurrentGymSettings({
                      ...currentGymSettings,
                      operatingHours: e.target.value
                    })
                  }
                  className="w-full min-h-[44px] bg-[#070e1d] border border-white/[0.12] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="min-h-[44px] px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-md shadow-emerald-500/25 transition active:scale-95 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Simpan Identitas Gym</span>
                </button>
              </div>
            </form>
          </section>

          {/* Manajemen Lokasi & Zonasi Gym Floor */}
          <section className="bg-[#111726]/85 backdrop-blur-xl border border-white/[0.08] rounded-3xl p-5 space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.08]">
              <div>
                <h3 className="text-sm font-bold text-white tracking-tight">
                  Manajemen Lokasi &amp; Zonasi Gym Floor
                </h3>
                <p className="text-xs text-[#bbcabf]">
                  Tambah, ubah, atau hapus cabang dan studio tempat sesi PT berlangsung
                </p>
              </div>
              <button
                type="button"
                onClick={handleOpenAddLocation}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25 text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 shrink-0 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Tambah Lokasi Baru</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {currentGymSettings.locations.map((loc) => (
                <div
                  key={loc.id}
                  className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.08] flex flex-col justify-between gap-3 hover:border-white/[0.15] transition"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                        <h4 className="text-xs font-bold text-white truncate">{loc.name}</h4>
                      </div>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                          loc.isActive
                            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                            : 'bg-neutral-500/15 text-neutral-400 border-neutral-500/30'
                        }`}
                      >
                        {loc.isActive ? 'Aktif' : 'Non-Aktif'}
                      </span>
                    </div>

                    <p className="text-xs text-[#bbcabf] leading-relaxed">{loc.addressZone}</p>

                    <div className="flex items-center gap-3 text-[11px] text-neutral-400 pt-1 font-mono">
                      <span>Kapasitas: {loc.capacitySlots} Slot</span>
                      {loc.contactNumber && (
                        <>
                          <span>•</span>
                          <span>{loc.contactNumber}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.05]">
                    <button
                      type="button"
                      onClick={() => handleOpenEditLocation(loc)}
                      className="min-h-[36px] px-3 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-xs font-semibold text-neutral-300 hover:text-white flex items-center gap-1.5 transition active:scale-95"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setLocationToDelete(loc)}
                      className="min-h-[36px] px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-xs font-semibold text-rose-300 flex items-center gap-1.5 transition active:scale-95"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                      <span>Hapus</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* ================= TAB 3: KATALOG GERAKAN LATIHAN ================= */}
      {activeTab === 'exercises' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          <section className="bg-[#111726]/85 backdrop-blur-xl border border-white/[0.08] rounded-3xl p-5 space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.08]">
              <div>
                <h3 className="text-sm font-bold text-white tracking-tight">
                  Katalog Gerakan Latihan Terverifikasi
                </h3>
                <p className="text-xs text-[#bbcabf]">
                  Kelola database gerakan latihan, kategori alat, tempo, dan waktu istirahat
                </p>
              </div>
              <button
                type="button"
                onClick={handleOpenAddExercise}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/25 transition active:scale-95 shrink-0 cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>+ Tambah Gerakan Baru</span>
              </button>
            </div>

            {/* Search & Category Filter Bar */}
            <div className="space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  placeholder="Cari gerakan atau otot target (cth: Squat, Deadlift, Lat)..."
                  className="w-full min-h-[44px] bg-[#070e1d] border border-white/[0.12] rounded-xl pl-10 pr-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-1 p-1 bg-[#0b101b] rounded-xl border border-white/[0.06]">
                {(['Semua', 'Free Weights', 'Kabel/Mesin', 'Kalistenik', 'Kardio/Fungsional'] as const).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCatalogCategory(cat)}
                    className={`min-h-[40px] px-2 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap truncate active:scale-95 ${
                      catalogCategory === cat
                        ? 'bg-[#10b981] text-[#002113] shadow-sm'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-neutral-400 font-medium">
              <span>Menampilkan {filteredCatalog.length} dari {currentCatalog.length} Gerakan</span>
            </div>

            {/* Exercise Cards Grid */}
            <div className="space-y-2.5">
              {filteredCatalog.map((ex) => (
                <div
                  key={ex.id}
                  className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-white/[0.15] transition"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-xs font-bold text-white tracking-tight">{ex.name}</h4>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                          ex.category === 'Free Weights'
                            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                            : ex.category === 'Kabel/Mesin'
                            ? 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                            : ex.category === 'Kalistenik'
                            ? 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                            : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                        }`}
                      >
                        {ex.category}
                      </span>
                    </div>

                    <p className="text-xs text-[#bbcabf]">
                      Target Otot: <strong className="text-white">{ex.primaryMuscle}</strong>
                    </p>

                    <div className="flex items-center gap-3 text-[11px] text-neutral-400 font-mono pt-0.5">
                      <span>Tempo: {ex.defaultTempo}</span>
                      <span>•</span>
                      <span>Rest: {ex.defaultRestSeconds} dtk</span>
                      {ex.defaultBestKg > 0 && (
                        <>
                          <span>•</span>
                          <span>Acuan: {ex.defaultBestKg} kg</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={() => handleOpenEditExercise(ex)}
                      className="min-h-[38px] px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-xs font-semibold text-neutral-300 hover:text-white flex items-center gap-1.5 transition active:scale-95"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setExerciseToDelete(ex)}
                      className="min-h-[38px] px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-xs font-semibold text-rose-300 flex items-center gap-1.5 transition active:scale-95"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                      <span>Hapus</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* ================= TAB 4: CADANGAN & PEMULIHAN ================= */}
      {activeTab === 'backup' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          <section className="bg-[#111726]/85 backdrop-blur-xl border border-white/[0.08] rounded-3xl p-5 space-y-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 flex items-center justify-center shrink-0">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white tracking-tight">
                  Cadangan &amp; Pemulihan Data Master
                </h3>
                <p className="text-xs text-[#bbcabf]">
                  Simpan seluruh data member, log sesi, master gym &amp; katalog gerakan ke file JSON
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={handleExportBackup}
                className="min-h-[48px] py-2.5 px-4 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-white text-xs font-semibold flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
              >
                <Download className="w-4 h-4 text-[#4edea3]" />
                <span>Ekspor Cadangan JSON</span>
              </button>

              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImportBackup}
                  accept=".json"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full min-h-[48px] py-2.5 px-4 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-white text-xs font-semibold flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
                >
                  <Upload className="w-4 h-4 text-cyan-400" />
                  <span>Pulihkan dari File JSON</span>
                </button>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* ================= MODALS SECTION ================= */}

      {/* Modal 1: Edit Profil & Kredensial Federasi Coach */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-[#070e1d]/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full max-w-lg max-h-[92vh] bg-[#111726]/95 backdrop-blur-2xl border border-white/[0.12] rounded-t-3xl sm:rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.6)] flex flex-col overflow-hidden">
            <div className="px-5 py-4 border-b border-white/[0.08] flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-white">
                  Edit Profil &amp; Kredensial Federasi
                </h3>
                <p className="text-xs text-[#bbcabf]">
                  Perbarui data lisensi kepelatihan kebugaran dan kuota member PT
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-[#bbcabf] hover:text-white flex items-center justify-center transition active:scale-95"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[#bbcabf] mb-1">Nama Lengkap Pelatih</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full min-h-[44px] bg-[#070e1d] border border-white/[0.12] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#10b981]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#bbcabf] mb-1">Jabatan Kepelatihan</label>
                  <input
                    type="text"
                    required
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value)}
                    className="w-full min-h-[44px] bg-[#070e1d] border border-white/[0.12] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#10b981]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[#bbcabf] mb-1">Nomor ID Kemenpora</label>
                  <input
                    type="text"
                    required
                    value={editKemenpora}
                    onChange={(e) => setEditKemenpora(e.target.value)}
                    className="w-full min-h-[44px] bg-[#070e1d] border border-white/[0.12] rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#10b981]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#bbcabf] mb-1">Lisensi PB PABSI</label>
                  <input
                    type="text"
                    required
                    value={editPabsi}
                    onChange={(e) => setEditPabsi(e.target.value)}
                    className="w-full min-h-[44px] bg-[#070e1d] border border-white/[0.12] rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#10b981]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs text-[#bbcabf] mb-1">Spesialisasi S&amp;C</label>
                  <input
                    type="text"
                    required
                    value={editSpecialization}
                    onChange={(e) => setEditSpecialization(e.target.value)}
                    className="w-full min-h-[44px] bg-[#070e1d] border border-white/[0.12] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#10b981]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#bbcabf] mb-1">Kuota Maks Member</label>
                  <input
                    type="number"
                    min={10}
                    max={50}
                    required
                    value={editMaxQuota}
                    onChange={(e) => setEditMaxQuota(parseInt(e.target.value, 10) || 27)}
                    className="w-full min-h-[44px] bg-[#070e1d] border border-white/[0.12] rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#10b981]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-[#bbcabf] mb-1">PIN Cepat Masuk (6 Digit Angka)</label>
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={editPin}
                  onChange={(e) => setEditPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="123456"
                  className="w-full min-h-[44px] bg-[#070e1d] border border-white/[0.12] rounded-xl px-3 py-2 text-xs font-mono text-emerald-400 tracking-widest focus:outline-none focus:border-[#10b981]"
                />
                <span className="text-[10px] text-neutral-400 mt-1 block">
                  PIN ini digunakan untuk membuka layar Login Pelatih di lantai gym (default: 123456).
                </span>
              </div>

              {/* Optional Add New Certification */}
              <div className="pt-3 border-t border-white/[0.08] space-y-2.5">
                <span className="text-xs font-semibold text-[#4edea3] block">
                  + Tambah Sertifikasi Baru (Opsional)
                </span>
                <input
                  type="text"
                  placeholder="Nama Sertifikasi (cth: USAW Level 1 Sports Performance)"
                  value={newCertTitle}
                  onChange={(e) => setNewCertTitle(e.target.value)}
                  className="w-full min-h-[44px] bg-[#070e1d] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white"
                />
                <div className="grid grid-cols-2 gap-2.5">
                  <input
                    type="text"
                    placeholder="Lembaga Penerbit"
                    value={newCertIssuer}
                    onChange={(e) => setNewCertIssuer(e.target.value)}
                    className="w-full min-h-[44px] bg-[#070e1d] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white"
                  />
                  <input
                    type="text"
                    placeholder="Nomor Lisensi"
                    value={newCertNumber}
                    onChange={(e) => setNewCertNumber(e.target.value)}
                    className="w-full min-h-[44px] bg-[#070e1d] border border-white/[0.1] rounded-xl px-3 py-2 text-xs font-mono text-white"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-white/[0.08] flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-[#bbcabf] text-xs font-semibold transition active:scale-95"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 min-h-[44px] px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 text-xs font-bold transition active:scale-95 shadow-md shadow-emerald-500/25"
                >
                  Simpan Perubahan Kredensial
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Tambah / Edit Lokasi Gym Floor */}
      {showLocationModal && editingLocation && (
        <div className="fixed inset-0 z-50 bg-[#070e1d]/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#111726]/95 backdrop-blur-2xl border border-white/[0.12] rounded-3xl p-6 space-y-4 shadow-[0_25px_60px_rgba(0,0,0,0.6)]">
            <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.08]">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {currentGymSettings.locations.some((l) => l.id === editingLocation.id)
                      ? 'Edit Lokasi Gym'
                      : 'Tambah Lokasi Gym Baru'}
                  </h3>
                  <p className="text-[11px] text-neutral-400">
                    Konfigurasi nama zonasi, kapasitas, dan nomor kontak cabang
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowLocationModal(false);
                  setEditingLocation(null);
                }}
                className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-neutral-400 hover:text-white flex items-center justify-center transition active:scale-95"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveLocation} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">
                  Nama Lokasi / Cabang *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Gym Utama Senayan"
                  value={editingLocation.name}
                  onChange={(e) =>
                    setEditingLocation({ ...editingLocation, name: e.target.value })
                  }
                  className="w-full min-h-[44px] bg-[#070e1d] border border-white/[0.12] rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">
                  Alamat / Zonasi Lantai *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Senayan Central Sports Complex, Lantai 2"
                  value={editingLocation.addressZone}
                  onChange={(e) =>
                    setEditingLocation({ ...editingLocation, addressZone: e.target.value })
                  }
                  className="w-full min-h-[44px] bg-[#070e1d] border border-white/[0.12] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    Kapasitas Slot Sesi
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={editingLocation.capacitySlots}
                    onChange={(e) =>
                      setEditingLocation({
                        ...editingLocation,
                        capacitySlots: parseInt(e.target.value, 10) || 10
                      })
                    }
                    className="w-full min-h-[44px] bg-[#070e1d] border border-white/[0.12] rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    Nomor Telepon Cabang
                  </label>
                  <input
                    type="text"
                    placeholder="021-..."
                    value={editingLocation.contactNumber || ''}
                    onChange={(e) =>
                      setEditingLocation({
                        ...editingLocation,
                        contactNumber: e.target.value
                      })
                    }
                    className="w-full min-h-[44px] bg-[#070e1d] border border-white/[0.12] rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="loc-active-toggle"
                  checked={editingLocation.isActive}
                  onChange={(e) =>
                    setEditingLocation({ ...editingLocation, isActive: e.target.checked })
                  }
                  className="w-4 h-4 rounded text-emerald-500 bg-[#070e1d] border-white/20 focus:ring-emerald-500"
                />
                <label htmlFor="loc-active-toggle" className="text-xs text-neutral-300 cursor-pointer">
                  Lokasi aktif &amp; tersedia untuk pemesanan jadwal sesi PT
                </label>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => {
                    setShowLocationModal(false);
                    setEditingLocation(null);
                  }}
                  className="min-h-[44px] px-4 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-xs font-semibold text-neutral-300 transition active:scale-95"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="min-h-[44px] px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 text-xs font-bold transition active:scale-95 shadow-md shadow-emerald-500/25 flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>Simpan Lokasi</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Konfirmasi Hapus Lokasi */}
      {locationToDelete && (
        <div className="fixed inset-0 z-50 bg-[#070e1d]/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#111726]/95 backdrop-blur-2xl border border-white/[0.12] rounded-3xl p-6 space-y-4 shadow-[0_25px_60px_rgba(0,0,0,0.6)]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Hapus Lokasi Gym?</h3>
                <p className="text-xs text-neutral-400 mt-0.5">{locationToDelete.name}</p>
              </div>
            </div>

            <p className="text-xs text-[#bbcabf] leading-relaxed">
              Apakah Anda yakin ingin menghapus lokasi ini dari daftar zonasi aktif fitness center?
            </p>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setLocationToDelete(null)}
                className="flex-1 min-h-[44px] px-4 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-xs font-semibold text-neutral-300 transition active:scale-95"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteLocation}
                className="flex-1 min-h-[44px] px-4 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-white text-xs font-bold transition active:scale-95 shadow-md shadow-rose-500/25 flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Ya, Hapus</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 4: Tambah / Edit Gerakan Latihan */}
      {showExerciseModal && editingExercise && (
        <div className="fixed inset-0 z-50 bg-[#070e1d]/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-[#111726]/95 backdrop-blur-2xl border border-white/[0.12] rounded-3xl p-6 space-y-4 shadow-[0_25px_60px_rgba(0,0,0,0.6)]">
            <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.08]">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                  <Dumbbell className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {currentCatalog.some((c) => c.id === editingExercise.id)
                      ? 'Edit Gerakan Latihan'
                      : 'Tambah Gerakan Baru'}
                  </h3>
                  <p className="text-[11px] text-neutral-400">
                    Konfigurasi parameter biomekanik, kategori, dan acuan beban
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowExerciseModal(false);
                  setEditingExercise(null);
                }}
                className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-neutral-400 hover:text-white flex items-center justify-center transition active:scale-95"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveExercise} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">
                  Nama Gerakan Latihan *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Barbell Front Squat"
                  value={editingExercise.name}
                  onChange={(e) =>
                    setEditingExercise({ ...editingExercise, name: e.target.value })
                  }
                  className="w-full min-h-[44px] bg-[#070e1d] border border-white/[0.12] rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    Kategori Alat *
                  </label>
                  <select
                    value={editingExercise.category}
                    onChange={(e) =>
                      setEditingExercise({
                        ...editingExercise,
                        category: e.target.value as 'Free Weights' | 'Kabel/Mesin' | 'Kalistenik' | 'Kardio/Fungsional'
                      })
                    }
                    className="w-full min-h-[44px] bg-[#070e1d] border border-white/[0.12] rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Free Weights">Free Weights</option>
                    <option value="Kabel/Mesin">Kabel/Mesin</option>
                    <option value="Kalistenik">Kalistenik</option>
                    <option value="Kardio/Fungsional">Kardio/Fungsional</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    Otot Target Utama *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Quadriceps & Core"
                    value={editingExercise.primaryMuscle}
                    onChange={(e) =>
                      setEditingExercise({ ...editingExercise, primaryMuscle: e.target.value })
                    }
                    className="w-full min-h-[44px] bg-[#070e1d] border border-white/[0.12] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    Tempo Standar
                  </label>
                  <input
                    type="text"
                    placeholder="3-1-1-0"
                    value={editingExercise.defaultTempo}
                    onChange={(e) =>
                      setEditingExercise({ ...editingExercise, defaultTempo: e.target.value })
                    }
                    className="w-full min-h-[44px] bg-[#070e1d] border border-white/[0.12] rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    Rest (Dtk)
                  </label>
                  <input
                    type="number"
                    min={30}
                    max={300}
                    step={15}
                    value={editingExercise.defaultRestSeconds}
                    onChange={(e) =>
                      setEditingExercise({
                        ...editingExercise,
                        defaultRestSeconds: parseInt(e.target.value, 10) || 90
                      })
                    }
                    className="w-full min-h-[44px] bg-[#070e1d] border border-white/[0.12] rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    Beban Acuan (kg)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={500}
                    step={2.5}
                    value={editingExercise.defaultBestKg}
                    onChange={(e) =>
                      setEditingExercise({
                        ...editingExercise,
                        defaultBestKg: parseFloat(e.target.value) || 0
                      })
                    }
                    className="w-full min-h-[44px] bg-[#070e1d] border border-white/[0.12] rounded-xl px-3 py-2 text-xs font-mono text-emerald-400 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => {
                    setShowExerciseModal(false);
                    setEditingExercise(null);
                  }}
                  className="min-h-[44px] px-4 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-xs font-semibold text-neutral-300 transition active:scale-95"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="min-h-[44px] px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 text-xs font-bold transition active:scale-95 shadow-md shadow-emerald-500/25 flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>Simpan Gerakan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 5: Konfirmasi Hapus Gerakan */}
      {exerciseToDelete && (
        <div className="fixed inset-0 z-50 bg-[#070e1d]/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#111726]/95 backdrop-blur-2xl border border-white/[0.12] rounded-3xl p-6 space-y-4 shadow-[0_25px_60px_rgba(0,0,0,0.6)]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Hapus Gerakan Latihan?</h3>
                <p className="text-xs text-neutral-400 mt-0.5">{exerciseToDelete.name}</p>
              </div>
            </div>

            <p className="text-xs text-[#bbcabf] leading-relaxed">
              Apakah Anda yakin ingin menghapus gerakan ini dari katalog latihan? Gerakan ini tidak akan muncul lagi di pemilih sesi baru.
            </p>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setExerciseToDelete(null)}
                className="flex-1 min-h-[44px] px-4 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-xs font-semibold text-neutral-300 transition active:scale-95"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteExercise}
                className="flex-1 min-h-[44px] px-4 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-white text-xs font-bold transition active:scale-95 shadow-md shadow-rose-500/25 flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Ya, Hapus</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 6: Konfirmasi Keluar Akun (Logout) */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 bg-[#070e1d]/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#111726]/95 backdrop-blur-2xl border border-white/[0.12] rounded-3xl p-6 space-y-4 shadow-[0_25px_60px_rgba(0,0,0,0.6)]">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/30 text-rose-400 flex items-center justify-center">
                  <LogOut className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">
                    Konfirmasi Keluar Akun
                  </h3>
                  <p className="text-xs text-[#bbcabf]">
                    Validasi Sync Status &amp; Kunci Cache Lokal
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-neutral-400 hover:text-white flex items-center justify-center transition active:scale-95"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[#bbcabf] flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#4edea3]" />
                  <span>Sync Status Server Pusat</span>
                </span>
                <span className="font-mono text-[#4edea3] font-semibold">100% Terkirim</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#bbcabf] flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-[#06b6d4]" />
                  <span>Enkripsi Cache Offline</span>
                </span>
                <span className="font-mono text-[#dce2f7]">Siap Dikunci</span>
              </div>
              <p className="text-[#86948a] pt-1">
                Anda dapat masuk kembali kapan saja dengan 1 ketukan menggunakan Sidik Jari / Face ID atau PIN 6-Digit.
              </p>
            </div>

            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 min-h-[44px] px-4 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-white text-xs font-semibold transition active:scale-95"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={syncingLogout}
                onClick={handleConfirmLogout}
                className="flex-1 min-h-[44px] px-4 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-white text-xs font-bold flex items-center justify-center gap-2 transition active:scale-95 shadow-md shadow-rose-500/25 cursor-pointer"
              >
                {syncingLogout ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Mengunci Cache...</span>
                  </>
                ) : (
                  <>
                    <LogOut className="w-4 h-4" />
                    <span>Kunci &amp; Keluar Akun</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
