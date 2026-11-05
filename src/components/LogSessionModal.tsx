import React, { useState, useMemo } from 'react';
import {
  X,
  CheckCircle2,
  XCircle,
  CalendarClock,
  Plus,
  Trash2,
  Award,
  Mic,
  Search,
  ArrowLeft,
  Zap,
  Moon,
  Activity,
  Dumbbell,
  ShieldCheck
} from 'lucide-react';
import {
  ClientProfile,
  ExerciseLog,
  SetLog,
  SessionRecord,
  EXERCISE_CATALOG,
  CatalogExercise
} from '../data/mockData';

interface LogSessionModalProps {
  client: ClientProfile;
  onClose: () => void;
  onSaveSession: (newSession: SessionRecord) => void;
  onOpenReschedule: () => void;
}

const RPE_LEVELS = [5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10];

function getRpeDescription(rpe: number): string {
  if (rpe <= 6) return 'Pemanasan / Ringan · 4+ rep tersisa dalam tangki (RIR 4+)';
  if (rpe <= 7) return 'Moderat Cepat · 3 rep tersisa dengan kecepatan bar stabil (RIR 3)';
  if (rpe <= 8) return 'Berat Terkontrol · 2 rep tersisa dalam tangki (RIR 2)';
  if (rpe === 8.5) return 'Sangat Berat · Masih ada 1–2 rep tersisa dalam tangki (RIR 1–2)';
  if (rpe <= 9.5) return 'Mendekati Maksimal · Maksimal 1 rep tersisa (RIR 0.5–1)';
  return 'Usaha Maksimal Mutlak · Tidak ada rep tersisa (True 10 / RIR 0)';
}

export const LogSessionModal: React.FC<LogSessionModalProps> = ({
  client,
  onClose,
  onSaveSession,
  onOpenReschedule
}) => {
  const nextSessionNum = client.paketTerpakai + 1;
  const remainingQuota = Math.max(0, client.paketTotal - nextSessionNum);

  const [subView, setSubView] = useState<'logger' | 'catalog'>('logger');
  const [attendance, setAttendance] = useState<'Hadir' | 'Batal/Izin' | 'Reschedule'>('Hadir');
  const [focus, setFocus] = useState<string>(
    client.nextSession?.focus || 'Lower Body Strength & Hypertrophy'
  );
  const [durationMinutes, setDurationMinutes] = useState<number>(75);
  const [rpe, setRpe] = useState<number>(8.5);

  // Readiness Check State
  const [energyScore, setEnergyScore] = useState<number>(8);
  const [sleepHours, setSleepHours] = useState<number>(7.5);
  const [domsLevel, setDomsLevel] = useState<'Rendah' | 'Sedang' | 'Tinggi'>('Rendah');

  // Initial Exercises pre-populated for rapid entry (matching reference HTML)
  const [exercises, setExercises] = useState<ExerciseLog[]>([
    {
      id: 'ex-session-1',
      name: 'Barbell Back Squat',
      category: 'Free Weights',
      tempo: '3-1-X-1',
      restSeconds: 150,
      historicalBestKg: 110,
      sets: [
        { id: 'st-1', setNumber: 1, type: 'Warm-up', weightKg: 100, reps: 8 },
        { id: 'st-2', setNumber: 2, type: 'Work Set', weightKg: 110, reps: 5 },
        { id: 'st-3', setNumber: 3, type: 'Work Set', weightKg: 110, reps: 5 },
        { id: 'st-4', setNumber: 4, type: 'Top Set', weightKg: 115, reps: 4, isPR: true }
      ]
    },
    {
      id: 'ex-session-2',
      name: 'Romanian Deadlift (RDL)',
      category: 'Free Weights',
      tempo: '3-1-1-1',
      restSeconds: 120,
      historicalBestKg: 85,
      sets: [
        { id: 'st-5', setNumber: 1, type: 'Work Set', weightKg: 80, reps: 10 },
        { id: 'st-6', setNumber: 2, type: 'Work Set', weightKg: 80, reps: 10 },
        { id: 'st-7', setNumber: 3, type: 'Work Set', weightKg: 80, reps: 10 }
      ]
    }
  ]);

  const [coachNotes, setCoachNotes] = useState<string>(
    'Form squat stabil, kedalaman hip crease di bawah lutut tercapai bersih. Ankle mobility membaik signifikan. Klien sedikit lelah di set ke-3 RDL karena kurang tidur semalam.'
  );
  const [dictating, setDictating] = useState(false);

  // Catalog filter states
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogCategory, setCatalogCategory] = useState<
    'Semua' | 'Free Weights' | 'Kabel/Mesin' | 'Kalistenik'
  >('Semua');

  // Total Volume Calculation
  const totalVolumeKg = useMemo(() => {
    return exercises.reduce((acc, ex) => {
      const exVol = ex.sets.reduce(
        (sum, s) => sum + (Number(s.weightKg) || 0) * (Number(s.reps) || 0),
        0
      );
      return acc + exVol;
    }, 0);
  }, [exercises]);

  const handleSetChange = (
    exId: string,
    setId: string,
    field: 'weightKg' | 'reps' | 'type',
    value: string | number
  ) => {
    setExercises((prev) =>
      prev.map((ex) => {
        if (ex.id !== exId) return ex;
        const updatedSets = ex.sets.map((s) => {
          if (s.id !== setId) return s;
          const next = { ...s, [field]: value };
          const w = Number(next.weightKg) || 0;
          next.isPR = w > ex.historicalBestKg && ex.historicalBestKg > 0;
          return next;
        });
        return { ...ex, sets: updatedSets };
      })
    );
  };

  const handleAddSet = (exId: string) => {
    setExercises((prev) =>
      prev.map((ex) => {
        if (ex.id !== exId) return ex;
        const lastSet = ex.sets[ex.sets.length - 1];
        const nextNum = ex.sets.length + 1;
        const nextWeight = lastSet ? lastSet.weightKg : ex.historicalBestKg;
        const nextReps = lastSet ? lastSet.reps : 8;
        const newSet: SetLog = {
          id: `st-${Date.now()}-${nextNum}`,
          setNumber: nextNum,
          type: 'Work Set',
          weightKg: nextWeight,
          reps: nextReps,
          isPR: nextWeight > ex.historicalBestKg && ex.historicalBestKg > 0
        };
        return { ...ex, sets: [...ex.sets, newSet] };
      })
    );
  };

  const handleRemoveSet = (exId: string, setId: string) => {
    setExercises((prev) =>
      prev.map((ex) => {
        if (ex.id !== exId || ex.sets.length <= 1) return ex;
        const filtered = ex.sets
          .filter((s) => s.id !== setId)
          .map((s, idx) => ({ ...s, setNumber: idx + 1 }));
        return { ...ex, sets: filtered };
      })
    );
  };

  const handleRemoveExercise = (exId: string) => {
    setExercises((prev) => prev.filter((ex) => ex.id !== exId));
  };

  const handleAddExerciseFromCatalog = (item: CatalogExercise) => {
    const existingPr = client.prList.find(
      (p) => p.exerciseName.toLowerCase() === item.name.toLowerCase()
    );
    const bestKg = existingPr ? existingPr.weightKg : item.defaultBestKg;

    const newEx: ExerciseLog = {
      id: `ex-${Date.now()}`,
      name: item.name,
      category: item.category,
      tempo: item.defaultTempo,
      restSeconds: item.defaultRestSeconds,
      historicalBestKg: bestKg,
      sets: [
        {
          id: `st-${Date.now()}-1`,
          setNumber: 1,
          type: 'Warm-up',
          weightKg: bestKg > 0 ? Math.round(bestKg * 0.75) : 0,
          reps: 10
        },
        {
          id: `st-${Date.now()}-2`,
          setNumber: 2,
          type: 'Work Set',
          weightKg: bestKg,
          reps: 8
        }
      ]
    };

    setExercises((prev) => [...prev, newEx]);
    setSubView('logger');
  };

  const handleVoiceDictation = () => {
    setDictating(true);
    setTimeout(() => {
      setDictating(false);
      setCoachNotes((prev) =>
        prev
          ? `${prev} Kecepatan konsentrik terjaga baik hingga set terakhir.`
          : 'Kecepatan konsentrik terjaga baik hingga set terakhir.'
      );
    }, 700);
  };

  const handleSubmitSession = () => {
    if (attendance === 'Reschedule') {
      onClose();
      onOpenReschedule();
      return;
    }

    const newSession: SessionRecord = {
      id: `ses-${Date.now()}`,
      sessionNumber: nextSessionNum,
      date: '05 Nov 2026',
      time: '16:30 WIB',
      durationMinutes,
      focus,
      status: attendance,
      rpe,
      totalVolumeKg,
      readiness: {
        energy: energyScore,
        sleepHours,
        doms: domsLevel
      },
      coachNotes,
      location: client.nextSession?.location || 'Gym Utama Senayan',
      exercises
    };

    onSaveSession(newSession);
  };

  const filteredCatalog = EXERCISE_CATALOG.filter((item) => {
    const matchCat = catalogCategory === 'Semua' || item.category === catalogCategory;
    const matchSearch =
      item.name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
      item.primaryMuscle.toLowerCase().includes(catalogSearch.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="fixed inset-0 z-50 bg-[#070e1d]/85 backdrop-blur-md flex flex-col justify-end sm:items-center sm:justify-center p-0 sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-xl max-h-[92vh] bg-[#141b2b] border border-white/[0.12] rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden relative"
      >
        {/* Top Grab Handle */}
        <div className="w-10 h-1 rounded-full bg-[#2e3545] mx-auto mt-2.5 sm:hidden" />

        {/* Sticky Modal Header */}
        <div className="px-4 py-3.5 bg-[#141b2b]/95 border-b border-white/[0.08] flex items-start justify-between gap-3 shrink-0">
          {subView === 'catalog' ? (
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setSubView('logger')}
                className="min-w-[44px] min-h-[44px] rounded-xl bg-[#232a3a] text-white flex items-center justify-center hover:bg-[#323949] transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h2 className="text-base font-semibold text-white">
                  Pilih &amp; Tambah Gerakan
                </h2>
                <p className="text-xs text-[#bbcabf]">
                  Katalog Gerakan Terverifikasi · Filter Kategori Alat
                </p>
              </div>
            </div>
          ) : (
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-white truncate">
                Catat Sesi Latihan Baru
              </h2>
              <p className="text-xs text-[#bbcabf] mt-0.5 truncate">
                <span>{client.nama_lengkap}</span>
                <span aria-hidden="true"> · </span>
                <span className="font-mono text-[#ffb95f]">
                  Sesi {nextSessionNum}/{client.paketTotal} (Sisa {remainingQuota})
                </span>
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup form sesi"
            className="min-w-[44px] min-h-[44px] rounded-xl bg-[#232a3a] text-[#bbcabf] hover:text-white flex items-center justify-center shrink-0 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sub-view 1: Exercise Catalog Picker */}
        {subView === 'catalog' ? (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Search & Category Filter */}
            <div className="space-y-2.5">
              <div className="relative">
                <Search className="w-4 h-4 text-[#86948a] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  placeholder="Cari gerakan atau otot target (cth: Squat, Lat, Glutes)..."
                  className="w-full min-h-[44px] bg-[#070e1d] border border-white/[0.1] rounded-xl pl-10 pr-3 py-2 text-xs text-white placeholder-[#86948a] focus:outline-none focus:border-[#10b981]"
                />
              </div>

              <div className="grid grid-cols-4 gap-1 p-1 bg-[#070e1d] rounded-xl border border-white/[0.06]">
                {(['Semua', 'Free Weights', 'Kabel/Mesin', 'Kalistenik'] as const).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCatalogCategory(cat)}
                    className={`min-h-[40px] px-2 py-1.5 rounded-lg text-[11px] font-semibold transition-colors whitespace-nowrap truncate ${
                      catalogCategory === cat
                        ? 'bg-[#10b981] text-[#002113]'
                        : 'text-[#bbcabf] hover:text-white'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Catalog List */}
            <div className="space-y-2">
              {filteredCatalog.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-xl bg-[#191f2f] border border-white/[0.08] flex items-center justify-between gap-3 hover:border-[#4edea3]/40 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{item.name}</p>
                    <p className="text-xs text-[#bbcabf] mt-0.5">
                      <span>{item.category}</span>
                      <span aria-hidden="true"> · </span>
                      <span>{item.primaryMuscle}</span>
                      <span aria-hidden="true"> · </span>
                      <span className="font-mono">Tempo {item.defaultTempo}</span>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAddExerciseFromCatalog(item)}
                    className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#10b981] hover:bg-[#4edea3] text-[#002113] text-xs font-semibold flex items-center gap-1 shrink-0 transition-transform active:scale-95"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Pilih</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Sub-view 2: Main Workout Logger */
          <>
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5 overscroll-contain">
              {/* 1. Status Kehadiran Atlet */}
              <div className="space-y-1.5">
                <span className="text-xs font-medium text-[#bbcabf]">Status Sesi Atlet</span>
                <div className="grid grid-cols-3 gap-1 p-1 bg-[#070e1d] rounded-xl border border-white/[0.08]">
                  <button
                    type="button"
                    onClick={() => setAttendance('Hadir')}
                    className={`min-h-[44px] py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                      attendance === 'Hadir'
                        ? 'bg-[#10b981] text-[#002113]'
                        : 'text-[#bbcabf] hover:text-white'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Hadir</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAttendance('Batal/Izin')}
                    className={`min-h-[44px] py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                      attendance === 'Batal/Izin'
                        ? 'bg-[#ef4444] text-white'
                        : 'text-[#bbcabf] hover:text-white'
                    }`}
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Batal/Izin</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAttendance('Reschedule')}
                    className={`min-h-[44px] py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                      attendance === 'Reschedule'
                        ? 'bg-[#ffb95f] text-[#2a1700]'
                        : 'text-[#bbcabf] hover:text-white'
                    }`}
                  >
                    <CalendarClock className="w-4 h-4" />
                    <span>Reschedule</span>
                  </button>
                </div>
              </div>

              {/* 2. Pemeriksaan Kesiapan Atlet (Readiness Check) */}
              <div className="p-3.5 bg-[#191f2f] border border-white/[0.08] rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white">
                    Pemeriksaan Kesiapan Atlet (Readiness Check)
                  </span>
                  <span className="text-xs font-mono text-[#4edea3]">
                    Skor Kesiapan Prima
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  {/* Energy 1-10 */}
                  <div className="p-2.5 bg-[#141b2b] rounded-lg border border-white/[0.06]">
                    <div className="flex items-center justify-between text-[11px] text-[#bbcabf] mb-1">
                      <span>Energi</span>
                      <Zap className="w-3.5 h-3.5 text-[#4edea3]" />
                    </div>
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setEnergyScore((v) => Math.max(1, v - 1))}
                        className="w-7 h-7 rounded bg-[#232a3a] text-white font-mono text-xs"
                      >
                        -
                      </button>
                      <span className="font-mono text-sm font-bold text-white">
                        {energyScore}/10
                      </span>
                      <button
                        type="button"
                        onClick={() => setEnergyScore((v) => Math.min(10, v + 1))}
                        className="w-7 h-7 rounded bg-[#232a3a] text-white font-mono text-xs"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Sleep Hours */}
                  <div className="p-2.5 bg-[#141b2b] rounded-lg border border-white/[0.06]">
                    <div className="flex items-center justify-between text-[11px] text-[#bbcabf] mb-1">
                      <span>Tidur</span>
                      <Moon className="w-3.5 h-3.5 text-[#06b6d4]" />
                    </div>
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setSleepHours((v) => Math.max(3, +(v - 0.5).toFixed(1)))}
                        className="w-7 h-7 rounded bg-[#232a3a] text-white font-mono text-xs"
                      >
                        -
                      </button>
                      <span className="font-mono text-sm font-bold text-white">
                        {sleepHours}j
                      </span>
                      <button
                        type="button"
                        onClick={() => setSleepHours((v) => Math.min(12, +(v + 0.5).toFixed(1)))}
                        className="w-7 h-7 rounded bg-[#232a3a] text-white font-mono text-xs"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* DOMS Level */}
                  <div className="p-2.5 bg-[#141b2b] rounded-lg border border-white/[0.06]">
                    <div className="flex items-center justify-between text-[11px] text-[#bbcabf] mb-1">
                      <span>DOMS</span>
                      <Activity className="w-3.5 h-3.5 text-[#ffb95f]" />
                    </div>
                    <select
                      value={domsLevel}
                      onChange={(e) =>
                        setDomsLevel(e.target.value as 'Rendah' | 'Sedang' | 'Tinggi')
                      }
                      className="w-full bg-[#232a3a] text-white text-xs font-semibold rounded px-1.5 py-1 focus:outline-none"
                    >
                      <option value="Rendah">Rendah</option>
                      <option value="Sedang">Sedang</option>
                      <option value="Tinggi">Tinggi</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 3. Fokus Sesi Hari Ini */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-[#bbcabf]">Fokus Sesi Hari Ini</span>
                  <span className="text-[#4edea3] font-mono">Mesocycle Minggu 5</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Lower Body Strength & Hypertrophy',
                    'Upper Push / Pull',
                    'Conditioning & Core',
                    'Active Recovery'
                  ].map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setFocus(item)}
                      className={`min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        focus === item
                          ? 'bg-[#10b981] text-[#002113] font-semibold'
                          : 'bg-[#232a3a] text-[#bbcabf] hover:text-white'
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. Detail Beban Kerja & RPE Section */}
              <div className="p-4 bg-[#191f2f] border border-white/[0.08] rounded-xl space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-[#141b2b] rounded-lg border border-white/[0.06]">
                    <span className="text-xs text-[#bbcabf] block">Durasi Latihan</span>
                    <div className="flex items-center justify-between mt-1.5">
                      <button
                        type="button"
                        onClick={() => setDurationMinutes((d) => Math.max(15, d - 5))}
                        className="w-8 h-8 rounded-lg bg-[#232a3a] text-white font-mono text-sm font-semibold active:scale-95"
                      >
                        -
                      </button>
                      <span className="text-base font-bold font-mono text-white">
                        {durationMinutes} <span className="text-xs font-normal text-[#bbcabf]">Mnt</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setDurationMinutes((d) => Math.min(180, d + 5))}
                        className="w-8 h-8 rounded-lg bg-[#232a3a] text-white font-mono text-sm font-semibold active:scale-95"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="p-3 bg-[#141b2b] rounded-lg border border-white/[0.06]">
                    <span className="text-xs text-[#bbcabf] block">Estimasi Volume Tonase</span>
                    <div className="flex items-baseline gap-1.5 mt-2">
                      <span className="text-lg font-bold font-mono text-[#4edea3]">
                        {totalVolumeKg.toLocaleString('id-ID')}
                      </span>
                      <span className="text-xs text-[#bbcabf]">kg</span>
                    </div>
                  </div>
                </div>

                {/* RPE Segmented Track */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#bbcabf] font-medium">Intensitas Usaha (RPE)</span>
                    <span className="font-mono font-semibold text-[#ffb95f]">
                      RPE {rpe} / 10
                    </span>
                  </div>
                  <div className="grid grid-cols-10 gap-1">
                    {RPE_LEVELS.map((lvl) => (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setRpe(lvl)}
                        className={`min-h-[38px] rounded font-mono text-xs transition-transform ${
                          rpe === lvl
                            ? 'bg-[#ffb95f] text-[#2a1700] font-bold scale-105 shadow'
                            : 'bg-[#232a3a] text-[#bbcabf] hover:text-white'
                        }`}
                      >
                        {lvl}
                      </button>
                    ))}
                  </div>
                  <div className="px-3 py-2 bg-[#ee9800]/10 border border-[#ffb95f]/20 rounded-lg text-xs text-[#ffb95f]">
                    {getRpeDescription(rpe)}
                  </div>
                </div>
              </div>

              {/* 5. Set-by-Set Exercise Logging */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#bbcabf]">
                    Log Gerakan Utama (Set-by-Set)
                  </span>
                  <span className="font-mono text-[#4edea3]">
                    {exercises.length} Gerakan Terdata
                  </span>
                </div>

                {exercises.map((ex, idx) => {
                  const hasPR = ex.sets.some((s) => s.isPR);
                  const maxWeightInEx = Math.max(...ex.sets.map((s) => Number(s.weightKg) || 0), 0);
                  const prDelta = (maxWeightInEx - ex.historicalBestKg).toFixed(1);

                  return (
                    <div
                      key={ex.id}
                      className="p-4 bg-[#191f2f] border border-white/[0.08] rounded-xl space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-md bg-[#10b981]/15 text-[#4edea3] font-mono text-xs font-bold flex items-center justify-center">
                              {idx + 1}
                            </span>
                            <h4 className="text-sm font-semibold text-white">{ex.name}</h4>
                          </div>
                          <p className="text-xs text-[#bbcabf] mt-0.5">
                            <span>{ex.category}</span>
                            <span aria-hidden="true"> · </span>
                            <span className="font-mono">Tempo {ex.tempo}</span>
                            <span aria-hidden="true"> · </span>
                            <span>Rest {ex.restSeconds} dtk</span>
                            {ex.historicalBestKg > 0 && (
                              <>
                                <span aria-hidden="true"> · </span>
                                <span className="font-mono">Rekor Lama: {ex.historicalBestKg} kg</span>
                              </>
                            )}
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {hasPR && (
                            <span className="px-2 py-1 rounded-lg bg-[#ffb95f]/15 border border-[#ffb95f]/40 text-[#ffb95f] font-mono text-xs font-bold flex items-center gap-1">
                              <Award className="w-3.5 h-3.5" />
                              <span>★ +{prDelta} kg PR!</span>
                            </span>
                          )}
                          {exercises.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveExercise(ex.id)}
                              aria-label={`Hapus ${ex.name}`}
                              className="w-8 h-8 rounded-lg bg-[#232a3a] text-[#86948a] hover:text-[#ffb4ab] flex items-center justify-center"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Set Rows */}
                      <div className="bg-[#141b2b] p-2.5 rounded-lg space-y-1.5 border border-white/[0.05]">
                        <div className="grid grid-cols-12 text-[11px] font-medium text-[#86948a] px-1 pb-1">
                          <span className="col-span-2">SET</span>
                          <span className="col-span-4">TIPE SET</span>
                          <span className="col-span-3 text-right">BEBAN (KG)</span>
                          <span className="col-span-2 text-right">REPS</span>
                          <span className="col-span-1"></span>
                        </div>

                        {ex.sets.map((s) => (
                          <div
                            key={s.id}
                            className={`grid grid-cols-12 items-center gap-1.5 font-mono text-xs py-1 px-1.5 rounded-lg ${
                              s.isPR
                                ? 'bg-[#10b981]/15 border border-[#4edea3]/30'
                                : 'bg-[#232a3a]/50'
                            }`}
                          >
                            <span
                              className={`col-span-2 font-semibold ${
                                s.isPR ? 'text-[#4edea3]' : 'text-[#bbcabf]'
                              }`}
                            >
                              #{s.setNumber}
                            </span>

                            <div className="col-span-4">
                              <select
                                value={s.type}
                                onChange={(e) =>
                                  handleSetChange(ex.id, s.id, 'type', e.target.value)
                                }
                                className="w-full bg-[#070e1d] border border-white/[0.08] rounded px-1.5 py-1 text-[11px] font-sans text-white focus:outline-none"
                              >
                                <option value="Warm-up">Warm-up</option>
                                <option value="Work Set">Work Set</option>
                                <option value="Top Set">Top Set</option>
                                <option value="Drop Set">Drop Set</option>
                              </select>
                            </div>

                            <div className="col-span-3">
                              <input
                                type="number"
                                step="0.5"
                                value={s.weightKg}
                                onChange={(e) =>
                                  handleSetChange(
                                    ex.id,
                                    s.id,
                                    'weightKg',
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                                className="w-full bg-[#070e1d] border border-white/[0.1] rounded px-2 py-1 text-right text-xs font-mono font-semibold text-white focus:outline-none focus:border-[#10b981]"
                              />
                            </div>

                            <div className="col-span-2">
                              <input
                                type="number"
                                value={s.reps}
                                onChange={(e) =>
                                  handleSetChange(
                                    ex.id,
                                    s.id,
                                    'reps',
                                    parseInt(e.target.value, 10) || 0
                                  )
                                }
                                className="w-full bg-[#070e1d] border border-white/[0.1] rounded px-1.5 py-1 text-right text-xs font-mono font-semibold text-white focus:outline-none focus:border-[#10b981]"
                              />
                            </div>

                            <div className="col-span-1 flex justify-end">
                              <button
                                type="button"
                                onClick={() => handleRemoveSet(ex.id, s.id)}
                                disabled={ex.sets.length <= 1}
                                className="text-[#86948a] hover:text-[#ffb4ab] disabled:opacity-30 p-1"
                              >
                                ×
                              </button>
                            </div>
                          </div>
                        ))}

                        <button
                          type="button"
                          onClick={() => handleAddSet(ex.id)}
                          className="w-full min-h-[38px] mt-1 rounded-lg bg-[#232a3a]/80 hover:bg-[#232a3a] text-xs font-medium text-[#4edea3] flex items-center justify-center gap-1 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Tambah Set</span>
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* Open Catalog Button */}
                <button
                  type="button"
                  onClick={() => setSubView('catalog')}
                  className="w-full min-h-[46px] py-2.5 rounded-xl bg-[#232a3a]/80 hover:bg-[#232a3a] border border-white/[0.08] text-white flex items-center justify-center gap-2 text-xs font-semibold transition-colors"
                >
                  <Dumbbell className="w-4 h-4 text-[#4edea3]" />
                  <span>+ Tambah Gerakan / Latihan Lain (Katalog 120+ Gerakan)</span>
                </button>
              </div>

              {/* 6. Catatan Taktis & Evaluasi Pelatih */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-[#bbcabf]">
                    Catatan Taktis &amp; Biomekanik Pelatih
                  </span>
                  <span className="font-mono text-[#86948a]">Auto-saved</span>
                </div>
                <div className="p-3 bg-[#070e1d] border border-white/[0.08] rounded-xl space-y-2">
                  <textarea
                    rows={3}
                    value={coachNotes}
                    onChange={(e) => setCoachNotes(e.target.value)}
                    placeholder="Tuliskan catatan teknis gerakan, fatigue level klien, atau rekomendasi recovery..."
                    className="w-full bg-transparent text-xs text-white placeholder-[#86948a] focus:outline-none resize-none leading-relaxed"
                  />
                  <div className="flex items-center justify-between pt-2 border-t border-white/[0.06] text-xs">
                    <button
                      type="button"
                      onClick={handleVoiceDictation}
                      className="flex items-center gap-1.5 text-[#4edea3] hover:underline font-medium"
                    >
                      <Mic className="w-3.5 h-3.5" />
                      <span>{dictating ? 'Mendengarkan dikte...' : 'Dikte Suara'}</span>
                    </button>
                    <span className="font-mono text-[11px] text-[#86948a]">
                      {coachNotes.length} Karakter
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Sticky Bottom Action Footer */}
            <div className="p-4 bg-[#141b2b] border-t border-white/[0.08] flex flex-col gap-2 shrink-0">
              <button
                type="button"
                onClick={handleSubmitSession}
                className="w-full min-h-[48px] py-3 rounded-xl bg-[#10b981] hover:bg-[#4edea3] text-[#002113] font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#10b981]/20 active:scale-[0.98] transition-transform"
              >
                <ShieldCheck className="w-5 h-5" />
                <span>
                  {attendance === 'Reschedule'
                    ? 'Lanjut ke Penjadwalan Ulang Sesi'
                    : `Simpan & Selesaikan Sesi #${nextSessionNum}`}
                </span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-full min-h-[40px] py-2 rounded-xl text-xs font-medium text-[#bbcabf] hover:text-white transition-colors"
              >
                Batal &amp; Tutup
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
