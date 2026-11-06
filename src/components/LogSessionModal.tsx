import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  X,
  CheckCircle2,
  XCircle,
  CalendarClock,
  Plus,
  Trash2,
  Award,
  Mic,
  MicOff,
  Search,
  ArrowLeft,
  Zap,
  Moon,
  Activity,
  Dumbbell,
  ShieldCheck,
  Timer,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  Sparkles,
  Bot,
  AlertTriangle
} from 'lucide-react';
import { getWorkoutAssistance, WorkoutAssistResult } from '../services/geminiService';
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
  const isQuotaExhausted = client.paketTerpakai >= client.paketTotal;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
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
    'Form squat stabil, kedalaman hip crease di bawah lutut tercapai bersih. Ankle mobility membaik signifikan. Member sedikit lelah di set ke-3 RDL karena kurang tidur semalam.'
  );
  const [dictating, setDictating] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Rest Timer State
  const [timerActive, setTimerActive] = useState<boolean>(false);
  const [timerSecondsLeft, setTimerSecondsLeft] = useState<number>(0);
  const [timerTotalSeconds, setTimerTotalSeconds] = useState<number>(90);
  const [timerExerciseName, setTimerExerciseName] = useState<string>('');
  const [timerIsPaused, setTimerIsPaused] = useState<boolean>(false);

  // Sound chime & vibration when timer completes
  const playRestChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        gain.gain.setValueAtTime(0.18, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.6);
      }
    } catch {
      // Audio context might be restricted
    }
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([200, 100, 200]);
    }
  };

  // Timer Interval Effect
  useEffect(() => {
    let interval: any = null;
    if (timerActive && !timerIsPaused && timerSecondsLeft > 0) {
      interval = setInterval(() => {
        setTimerSecondsLeft((prev) => {
          if (prev <= 1) {
            playRestChime();
            setTimerActive(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerActive, timerIsPaused, timerSecondsLeft]);

  const startRestTimer = (seconds: number, exName?: string) => {
    setTimerTotalSeconds(seconds);
    setTimerSecondsLeft(seconds);
    setTimerExerciseName(exName || 'Istirahat Antar Set');
    setTimerIsPaused(false);
    setTimerActive(true);
  };

  const adjustTimer = (delta: number) => {
    setTimerSecondsLeft((prev) => Math.max(0, prev + delta));
    setTimerTotalSeconds((prev) => Math.max(prev, prev + delta));
  };

  const resetTimer = () => {
    setTimerSecondsLeft(timerTotalSeconds);
    setTimerIsPaused(false);
    setTimerActive(true);
  };

  const stopTimer = () => {
    setTimerActive(false);
    setTimerSecondsLeft(0);
  };

  const formatTimerDisplay = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Catalog filter states
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogCategory, setCatalogCategory] = useState<
    'Semua' | 'Free Weights' | 'Kabel/Mesin' | 'Kalistenik'
  >('Semua');

  // AI Coach Assistant state
  const [showAiAssistant, setShowAiAssistant] = useState(false);
  const [aiTargetExId, setAiTargetExId] = useState<string>('');
  const [aiFatigueScore, setAiFatigueScore] = useState<number>(4);
  const [aiDomsScore, setAiDomsScore] = useState<number>(3);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<WorkoutAssistResult | null>(null);

  const handleRunAiAssist = async () => {
    const targetEx = exercises.find((e) => e.id === aiTargetExId) || exercises[0];
    if (!targetEx) return;
    setAiLoading(true);
    try {
      const res = await getWorkoutAssistance({
        exerciseName: targetEx.name,
        fatigueScore: aiFatigueScore,
        domsScore: aiDomsScore,
        muscleGroup: targetEx.category,
        injuryNotes: client.medicalHistoryNote || client.postureScreeningNote || 'None'
      });
      setAiResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setAiLoading(false);
    }
  };

  const handleApplyAiCueToNotes = () => {
    if (!aiResult) return;
    setCoachNotes((prev) => {
      const addition = `[Saran AI PAS]: ${aiResult.suggestedAction} — ${aiResult.originalExercise}. Fatigue ${aiFatigueScore}/10, DOMS ${aiDomsScore}/10.`;
      return prev ? `${prev}\n${addition}` : addition;
    });
  };

  const handleApplyAiRegressionToSets = () => {
    const targetEx = exercises.find((e) => e.id === aiTargetExId) || exercises[0];
    if (!targetEx) return;
    setExercises((prev) =>
      prev.map((ex) => {
        if (ex.id !== targetEx.id) return ex;
        return {
          ...ex,
          restSeconds: Math.min(180, (ex.restSeconds || 90) + 30),
          sets: ex.sets.map((s) => ({
            ...s,
            weightKg: Math.max(0, Math.round(Number(s.weightKg) * 0.85 * 2) / 2)
          }))
        };
      })
    );
  };

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
    const targetEx = exercises.find((e) => e.id === exId);
    if (targetEx) {
      startRestTimer(targetEx.restSeconds || 90, targetEx.name);
    }
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
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setDictating(true);
      setTimeout(() => {
        setDictating(false);
        setCoachNotes((prev) =>
          prev
            ? `${prev} Kecepatan konsentrik terjaga baik hingga set terakhir.`
            : 'Kecepatan konsentrik terjaga baik hingga set terakhir.'
        );
      }, 700);
      return;
    }

    if (dictating) {
      try {
        recognitionRef.current?.stop();
      } catch {
        // Ignore stop error
      }
      setDictating(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'id-ID';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setDictating(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results?.[0]?.[0]?.transcript;
        if (transcript) {
          setCoachNotes((prev) => (prev ? `${prev} ${transcript}` : transcript));
        }
      };

      recognition.onerror = () => {
        setDictating(false);
      };

      recognition.onend = () => {
        setDictating(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setDictating(false);
    }
  };

  const handleSubmitSession = () => {
    if (isSubmitting) return;

    if (attendance === 'Reschedule') {
      onClose();
      onOpenReschedule();
      return;
    }

    // Invariant validation: check exercise structure and weights
    if (attendance === 'Hadir') {
      if (!exercises || exercises.length === 0) {
        setValidationError('Wajib memiliki minimal 1 gerakan latihan sebelum menyimpan sesi.');
        return;
      }

      for (const ex of exercises) {
        if (!ex.sets || ex.sets.length === 0) {
          setValidationError(`Gerakan "${ex.name}" belum memiliki set latihan.`);
          return;
        }
        for (const s of ex.sets) {
          const w = Number(s.weightKg);
          const r = Number(s.reps);
          if (isNaN(w) || w < 0 || w > 500) {
            setValidationError(`Beban pada ${ex.name} (Set #${s.setNumber}) harus antara 0 dan 500 kg.`);
            return;
          }
          if (isNaN(r) || r < 1 || r > 50) {
            setValidationError(`Repetisi pada ${ex.name} (Set #${s.setNumber}) harus antara 1 dan 50.`);
            return;
          }
        }
      }
    }

    setValidationError(null);
    setIsSubmitting(true);

    const sessionDateFormatted = client.nextSession?.date
      ? new Intl.DateTimeFormat('id-ID', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        }).format(new Date(client.nextSession.date))
      : new Intl.DateTimeFormat('id-ID', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        }).format(new Date());

    const sessionTimeFormatted = client.nextSession?.time
      ? `${client.nextSession.time} WIB`
      : '16:30 WIB';

    const newSession: SessionRecord = {
      id: `ses-${Date.now()}`,
      sessionNumber: nextSessionNum,
      date: sessionDateFormatted,
      time: sessionTimeFormatted,
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

    try {
      onSaveSession(newSession);
    } finally {
      setIsSubmitting(false);
    }
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
        className="w-full max-w-xl max-h-[92vh] bg-[#111726]/95 backdrop-blur-2xl border border-white/[0.12] rounded-t-3xl sm:rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.6)] flex flex-col overflow-hidden relative"
      >
        {/* Top Grab Handle */}
        <div className="w-10 h-1 rounded-full bg-[#2e3545] mx-auto mt-2.5 sm:hidden" />

        {/* Sticky Modal Header */}
        <div className="px-4 py-3.5 bg-[#111726]/95 border-b border-white/[0.08] flex items-start justify-between gap-3 shrink-0">
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
              {/* Validation Invariant Alert */}
              {validationError && (
                <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2.5 animate-in fade-in duration-200">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span className="flex-1 font-medium">{validationError}</span>
                  <button
                    type="button"
                    onClick={() => setValidationError(null)}
                    className="text-rose-400 hover:text-white text-xs p-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Package Quota Invariant Warning */}
              {isQuotaExhausted && (
                <div className="p-3 bg-amber-500/15 border border-amber-500/30 rounded-xl text-xs text-amber-300 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                  <div className="flex-1">
                    <span className="font-semibold block text-amber-200">
                      Perhatian: Kuota Paket Member Habis ({client.paketTerpakai}/{client.paketTotal} Sesi)
                    </span>
                    <span className="text-amber-300/80 text-[11px]">
                      Member telah menghabiskan seluruh kuota paket sesi terprogram. Sesi ini akan dicatat sebagai sesi penyesuaian/ekstra.
                    </span>
                  </div>
                </div>
              )}

              {/* 1. Status Kehadiran Member */}
              <div className="space-y-1.5">
                <span className="text-xs font-medium text-[#bbcabf]">Status Sesi Member</span>
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

              {/* 2. Pemeriksaan Kesiapan Member (Readiness Check) */}
              <div className="p-3.5 bg-[#191f2f] border border-white/[0.08] rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white">
                    Pemeriksaan Kesiapan Member (Readiness Check)
                  </span>
                  <span className="text-xs font-mono text-[#4edea3]">
                    Skor Kesiapan Prima
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  {/* Energy 1-10 */}
                  <div className="p-2.5 bg-[#141b2b] rounded-xl border border-white/[0.06]">
                    <div className="flex items-center justify-between text-[11px] text-[#bbcabf] mb-1">
                      <span>Energi</span>
                      <Zap className="w-3.5 h-3.5 text-[#4edea3]" />
                    </div>
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setEnergyScore((v) => Math.max(1, v - 1))}
                        className="w-10 h-10 min-w-[38px] min-h-[38px] rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-white font-mono text-sm font-bold flex items-center justify-center active:scale-95 transition-all shadow-sm"
                      >
                        -
                      </button>
                      <span className="font-mono text-sm font-bold text-white px-1">
                        {energyScore}/10
                      </span>
                      <button
                        type="button"
                        onClick={() => setEnergyScore((v) => Math.min(10, v + 1))}
                        className="w-10 h-10 min-w-[38px] min-h-[38px] rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-white font-mono text-sm font-bold flex items-center justify-center active:scale-95 transition-all shadow-sm"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Sleep Hours */}
                  <div className="p-2.5 bg-[#141b2b] rounded-xl border border-white/[0.06]">
                    <div className="flex items-center justify-between text-[11px] text-[#bbcabf] mb-1">
                      <span>Tidur</span>
                      <Moon className="w-3.5 h-3.5 text-[#06b6d4]" />
                    </div>
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setSleepHours((v) => Math.max(3, +(v - 0.5).toFixed(1)))}
                        className="w-10 h-10 min-w-[38px] min-h-[38px] rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-white font-mono text-sm font-bold flex items-center justify-center active:scale-95 transition-all shadow-sm"
                      >
                        -
                      </button>
                      <span className="font-mono text-sm font-bold text-white px-1">
                        {sleepHours}j
                      </span>
                      <button
                        type="button"
                        onClick={() => setSleepHours((v) => Math.min(12, +(v + 0.5).toFixed(1)))}
                        className="w-10 h-10 min-w-[38px] min-h-[38px] rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-white font-mono text-sm font-bold flex items-center justify-center active:scale-95 transition-all shadow-sm"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* DOMS Level */}
                  <div className="p-2.5 bg-[#141b2b] rounded-xl border border-white/[0.06] flex flex-col justify-between">
                    <div className="flex items-center justify-between text-[11px] text-[#bbcabf] mb-1">
                      <span>DOMS</span>
                      <Activity className="w-3.5 h-3.5 text-[#ffb95f]" />
                    </div>
                    <select
                      value={domsLevel}
                      onChange={(e) =>
                        setDomsLevel(e.target.value as 'Rendah' | 'Sedang' | 'Tinggi')
                      }
                      className="w-full min-h-[38px] bg-[#070e1d] text-white text-xs font-semibold rounded-xl px-2 py-1.5 border border-white/[0.08] focus:outline-none focus:border-emerald-500"
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
                  <div className="p-3 bg-[#141b2b] rounded-xl border border-white/[0.06]">
                    <span className="text-xs text-[#bbcabf] block">Durasi Latihan</span>
                    <div className="flex items-center justify-between mt-1.5">
                      <button
                        type="button"
                        onClick={() => setDurationMinutes((d) => Math.max(15, d - 5))}
                        className="w-11 h-11 min-w-[40px] min-h-[40px] rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-white font-mono text-base font-bold active:scale-95 transition-all flex items-center justify-center shadow-sm"
                      >
                        -
                      </button>
                      <span className="text-base font-bold font-mono text-white">
                        {durationMinutes} <span className="text-xs font-normal text-[#bbcabf]">Mnt</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setDurationMinutes((d) => Math.min(180, d + 5))}
                        className="w-11 h-11 min-w-[40px] min-h-[40px] rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-white font-mono text-base font-bold active:scale-95 transition-all flex items-center justify-center shadow-sm"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="p-3 bg-[#141b2b] rounded-xl border border-white/[0.06]">
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
                        className={`min-h-[44px] rounded-xl font-mono text-xs transition-transform ${
                          rpe === lvl
                            ? 'bg-[#ffb95f] text-[#2a1700] font-bold scale-105 shadow-md shadow-amber-950/40'
                            : 'bg-[#232a3a] text-[#bbcabf] hover:text-white'
                        }`}
                      >
                        {lvl}
                      </button>
                    ))}
                  </div>
                  <div className="px-3 py-2 bg-[#ee9800]/10 border border-[#ffb95f]/20 rounded-xl text-xs text-[#ffb95f]">
                    {getRpeDescription(rpe)}
                  </div>
                </div>
              </div>

              {/* 4.5 AI Coach Assistant (PAS AI - Fatigue & Regression Guidance) */}
              <div className="bg-[#141b2b] border border-white/[0.08] rounded-xl overflow-hidden transition-all shadow-md">
                <div
                  onClick={() => setShowAiAssistant((prev) => !prev)}
                  className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-white/[0.02] transition"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                          AI Coach Assistant (PAS AI)
                        </h4>
                        <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                          Kesiapan &amp; Regresi Latihan
                        </span>
                      </div>
                      <p className="text-[11px] text-[#bbcabf] mt-0.5">
                        Analisis kelelahan &amp; DOMS member untuk penyesuaian beban real-time di lantai gym
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-emerald-400">
                    {showAiAssistant ? 'Tutup ▲' : 'Buka Asisten ▼'}
                  </span>
                </div>

                {showAiAssistant && (
                  <div className="p-4 pt-1 border-t border-white/[0.06] bg-[#070e1d]/50 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-neutral-300 mb-1">
                          Pilih Gerakan yang Dianalisis:
                        </label>
                        <select
                          value={aiTargetExId || exercises[0]?.id || ''}
                          onChange={(e) => setAiTargetExId(e.target.value)}
                          className="w-full bg-[#141b2b] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                        >
                          {exercises.map((ex) => (
                            <option key={ex.id} value={ex.id}>
                              {ex.name} ({ex.category})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <div className="flex justify-between items-center text-[11px] mb-1">
                          <span className="font-semibold text-neutral-300">Fatigue Sistemik:</span>
                          <span className="font-mono font-bold text-amber-400">{aiFatigueScore}/10</span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="10"
                          value={aiFatigueScore}
                          onChange={(e) => setAiFatigueScore(parseInt(e.target.value, 10))}
                          className="w-full accent-amber-400"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between items-center text-[11px] mb-1">
                          <span className="font-semibold text-neutral-300">Nyeri Otot (DOMS):</span>
                          <span className="font-mono font-bold text-emerald-400">{aiDomsScore}/10</span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="10"
                          value={aiDomsScore}
                          onChange={(e) => setAiDomsScore(parseInt(e.target.value, 10))}
                          className="w-full accent-emerald-400"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1">
                      <p className="text-[11px] text-[#86948a]">
                        Didukung Gemini 2.5 Flash &amp; Sports Science Rules Engine.
                      </p>
                      <button
                        type="button"
                        onClick={handleRunAiAssist}
                        disabled={aiLoading}
                        className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition active:scale-95 disabled:opacity-50"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>{aiLoading ? 'Menganalisis...' : 'Analisis Kesiapan Beban'}</span>
                      </button>
                    </div>

                    {aiResult && (
                      <div className="p-3 bg-[#141b2b] border border-emerald-500/30 rounded-xl space-y-2 mt-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                aiResult.suggestedAction === 'Lanjutkan Sesuai Rencana'
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                  : aiResult.suggestedAction === 'Regresi Beban & Volume'
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                              }`}
                            >
                              {aiResult.suggestedAction}
                            </span>
                            <span className="text-xs font-semibold text-white">
                              {aiResult.originalExercise}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono text-neutral-400">
                            Source: {aiResult.source}
                          </span>
                        </div>

                        <div className="text-xs text-[#bbcabf] whitespace-pre-line leading-relaxed bg-[#070e1d] p-2.5 rounded-lg border border-white/[0.04]">
                          {aiResult.recommendationText}
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={handleApplyAiCueToNotes}
                            className="px-2.5 py-1 rounded bg-[#232a3a] hover:bg-[#323949] text-xs font-semibold text-white transition active:scale-95"
                          >
                            + Masukkan Cue ke Catatan Sesi
                          </button>
                          {aiResult.suggestedAction !== 'Lanjutkan Sesuai Rencana' && (
                            <button
                              type="button"
                              onClick={handleApplyAiRegressionToSets}
                              className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-xs font-semibold text-amber-300 border border-amber-500/30 transition active:scale-95"
                            >
                              ⚡ Terapkan Regresi (-15% Beban &amp; +30s Rest)
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
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
                            <button
                              type="button"
                              onClick={() => startRestTimer(ex.restSeconds || 90, ex.name)}
                              className="font-mono text-emerald-400 hover:underline inline-flex items-center gap-1 active:scale-95 transition-transform"
                              title="Mulai timer istirahat"
                            >
                              <Timer className="w-3 h-3" />
                              <span>Rest {ex.restSeconds} dtk</span>
                            </button>
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
                    placeholder="Tuliskan catatan teknis gerakan, fatigue level member, atau rekomendasi recovery..."
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

            {/* Interactive Rest Countdown Timer Dock */}
            {(timerActive || timerSecondsLeft > 0) && (
              <div className="bg-[#070e1d] border-t border-emerald-500/30 p-3 shrink-0 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center animate-pulse">
                      <Timer className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[11px] font-medium text-[#bbcabf] truncate max-w-[140px] sm:max-w-[200px] block">
                        {timerExerciseName}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-base font-bold font-mono text-emerald-400">
                          {formatTimerDisplay(timerSecondsLeft)}
                        </span>
                        <span className="text-[10px] font-mono text-[#86948a]">
                          / {timerTotalSeconds}s
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Timer Controls */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => adjustTimer(-15)}
                      className="px-2 py-1 rounded bg-[#191f2f] hover:bg-[#232a3a] text-[11px] font-mono text-[#bbcabf]"
                      title="Kurangi 15 detik"
                    >
                      -15s
                    </button>
                    <button
                      type="button"
                      onClick={() => adjustTimer(30)}
                      className="px-2 py-1 rounded bg-[#191f2f] hover:bg-[#232a3a] text-[11px] font-mono text-[#bbcabf]"
                      title="Tambah 30 detik"
                    >
                      +30s
                    </button>
                    <button
                      type="button"
                      onClick={() => setTimerIsPaused((prev) => !prev)}
                      className="w-8 h-8 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 flex items-center justify-center transition active:scale-95"
                      title={timerIsPaused ? 'Lanjutkan Timer' : 'Jeda Timer'}
                    >
                      {timerIsPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={resetTimer}
                      className="w-8 h-8 rounded-lg bg-[#191f2f] hover:bg-[#232a3a] text-[#bbcabf] hover:text-white flex items-center justify-center transition"
                      title="Ulangi Timer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={stopTimer}
                      className="w-8 h-8 rounded-lg bg-[#232a3a] text-[#86948a] hover:text-rose-400 flex items-center justify-center transition"
                      title="Tutup Timer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full h-1.5 bg-white/[0.08] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all duration-300"
                    style={{
                      width: `${timerTotalSeconds > 0 ? (timerSecondsLeft / timerTotalSeconds) * 100 : 0}%`
                    }}
                  />
                </div>
              </div>
            )}

            {/* Sticky Bottom Action Footer */}
            <div className="p-4 bg-[#111726]/95 border-t border-white/[0.08] flex flex-col gap-2.5 shrink-0">
              <button
                type="button"
                onClick={handleSubmitSession}
                disabled={isSubmitting}
                className={`w-full min-h-[52px] py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition-all ${
                  isSubmitting
                    ? 'bg-neutral-700 text-neutral-400 cursor-not-allowed opacity-70'
                    : 'bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 shadow-emerald-500/25'
                }`}
              >
                <ShieldCheck className="w-5 h-5 stroke-[2.2]" />
                <span>
                  {isSubmitting
                    ? 'Menyimpan Sesi...'
                    : attendance === 'Reschedule'
                    ? 'Lanjut ke Penjadwalan Ulang Sesi'
                    : `Simpan & Selesaikan Sesi #${nextSessionNum}`}
                </span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-full min-h-[44px] py-2.5 rounded-xl text-xs font-semibold text-[#bbcabf] hover:text-white hover:bg-white/[0.04] transition-colors"
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
