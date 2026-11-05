import React, { useState } from 'react';
import {
  ArrowLeft,
  Scale,
  Dumbbell,
  MessageCircle,
  CalendarClock,
  Flag,
  TrendingDown,
  TrendingUp,
  Award,
  Check,
  Minus,
  ChevronRight,
  Camera,
  Plus,
  MapPin,
  Clock,
  Activity,
  FileText,
  HeartPulse,
  Flame,
  ShieldAlert,
  Save,
  Sparkles,
  X
} from 'lucide-react';
import { ClientProfile, PRRecord } from '../data/mockData';

export interface MedicalAndBaselinePayload {
  kaloriTarget: number;
  kaloriHarian: number;
  proteinTarget: number;
  proteinHarian: number;
  karboTarget: number;
  lemakTarget: number;
  hidrasiTarget: number;
  hidrasiLiter: number;
  nutritionCoachNote: string;
  dietDetailNote: string;
  medicalHistoryNote: string;
  postureScreeningNote: string;
  berat_awal_kg: number;
  berat_target_kg: number;
  body_fat_awal_pct: number;
  lingkar_pinggang_awal_cm: number;
  lingkar_dada_awal_cm: number;
  lingkar_lengan_awal_cm: number;
  baselinePhotoUrl?: string;
  baselinePhotoPose?: string;
  baselinePhotoDate?: string;
}

interface ClientDetailViewProps {
  client: ClientProfile;
  showFullSessionHistory: boolean;
  onToggleFullSessionHistory: (show: boolean) => void;
  onBackToDashboard: () => void;
  onOpenUpdateMetrics: () => void;
  onOpenLogSession: () => void;
  onOpenReschedule: () => void;
  onAddPR: (newPr: PRRecord) => void;
  onToggleNutritionDay: (dayIndex: number) => void;
  onUploadProgressPhoto: (weekLabel: string, dataUrl?: string) => void;
  onUpdateMedicalAndBaseline: (payload: MedicalAndBaselinePayload) => void;
}

const DAY_LABELS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

export const ClientDetailView: React.FC<ClientDetailViewProps> = ({
  client,
  showFullSessionHistory,
  onToggleFullSessionHistory,
  onBackToDashboard,
  onOpenUpdateMetrics,
  onOpenLogSession,
  onOpenReschedule,
  onAddPR,
  onToggleNutritionDay,
  onUploadProgressPhoto,
  onUpdateMedicalAndBaseline
}) => {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'baseline_medis' | 'pr' | 'sessions' | 'photos'
  >('overview');
  const [sessionFocusFilter, setSessionFocusFilter] = useState<string>('Semua');
  const [showAddPrModal, setShowAddPrModal] = useState(false);

  // State for 'Data Medis & Progres Awal' tab
  const defaultCarbs =
    client.karboTarget ??
    Math.max(80, Math.round((client.kaloriTarget - client.proteinTarget * 4 - 60 * 9) / 4));
  const defaultFat = client.lemakTarget ?? 60;

  const [kaloriTargetInput, setKaloriTargetInput] = useState<string>(String(client.kaloriTarget));
  const [kaloriHarianInput, setKaloriHarianInput] = useState<string>(String(client.kaloriHarian));
  const [proteinTargetInput, setProteinTargetInput] = useState<string>(
    String(client.proteinTarget)
  );
  const [proteinHarianInput, setProteinHarianInput] = useState<string>(
    String(client.proteinHarian)
  );
  const [karboTargetInput, setKarboTargetInput] = useState<string>(String(defaultCarbs));
  const [lemakTargetInput, setLemakTargetInput] = useState<string>(String(defaultFat));
  const [hidrasiTargetInput, setHidrasiTargetInput] = useState<string>(
    String(client.hidrasiTarget)
  );
  const [hidrasiLiterInput, setHidrasiLiterInput] = useState<string>(String(client.hidrasiLiter));
  const [nutritionNoteInput, setNutritionNoteInput] = useState<string>(
    client.nutritionCoachNote || ''
  );
  const [dietDetailInput, setDietDetailInput] = useState<string>(
    client.dietDetailNote ||
      'Pola makan 3x makan utama + 1x protein shake pasca-latihan. Prioritas protein hewani tanpa lemak (dada ayam, telur, ikan), karbohidrat kompleks pre-workout, hindari gorengan & minuman manis. Suplementasi: Creatine Monohydrate 5g/hari & Whey Isolate 1 scoop.'
  );
  const [medicalHistoryInput, setMedicalHistoryInput] = useState<string>(
    client.medicalHistoryNote ||
      'PAR-Q Screening: Tekanan darah normal (118/78 mmHg), tidak ada riwayat penyakit kardiovaskular. Perlu pemanasan rotasi bahu (rotator cuff) & aktivasi core sebelum angkatan beban berat.'
  );
  const [postureScreeningInput, setPostureScreeningInput] = useState<string>(
    client.postureScreeningNote ||
      'Mobilitas dorsifleksi ankle cukup baik, sedikit anterior pelvic tilt akibat duduk kerja lama. Fokus penguatan posterior chain (RDL, Glute Bridge) dan thoracic extension.'
  );
  const [beratAwalInput, setBeratAwalInput] = useState<string>(String(client.berat_awal_kg));
  const [beratTargetInput, setBeratTargetInput] = useState<string>(String(client.berat_target_kg));
  const [bfAwalInput, setBfAwalInput] = useState<string>(String(client.body_fat_awal_pct));
  const [pinggangAwalInput, setPinggangAwalInput] = useState<string>(
    String(client.lingkar_pinggang_awal_cm)
  );
  const [dadaAwalInput, setDadaAwalInput] = useState<string>(String(client.lingkar_dada_awal_cm));
  const [lenganAwalInput, setLenganAwalInput] = useState<string>(
    String(client.lingkar_lengan_awal_cm)
  );
  const [baselinePhotoUrl, setBaselinePhotoUrl] = useState<string | undefined>(
    client.baselinePhotoUrl
  );
  const [baselinePhotoPose, setBaselinePhotoPose] = useState<string>(
    client.baselinePhotoPose || 'Front Relaxed — Postural Baseline'
  );
  const [baselinePhotoDate, setBaselinePhotoDate] = useState<string>(
    client.baselinePhotoDate || 'Minggu 1 — Assessment Awal'
  );

  // Sync local form state when switching clients
  React.useEffect(() => {
    const calcCarbs =
      client.karboTarget ??
      Math.max(80, Math.round((client.kaloriTarget - client.proteinTarget * 4 - 60 * 9) / 4));
    const calcFat = client.lemakTarget ?? 60;
    setKaloriTargetInput(String(client.kaloriTarget));
    setKaloriHarianInput(String(client.kaloriHarian));
    setProteinTargetInput(String(client.proteinTarget));
    setProteinHarianInput(String(client.proteinHarian));
    setKarboTargetInput(String(calcCarbs));
    setLemakTargetInput(String(calcFat));
    setHidrasiTargetInput(String(client.hidrasiTarget));
    setHidrasiLiterInput(String(client.hidrasiLiter));
    setNutritionNoteInput(client.nutritionCoachNote || '');
    setDietDetailInput(
      client.dietDetailNote ||
        'Pola makan 3x makan utama + 1x protein shake pasca-latihan. Prioritas protein hewani tanpa lemak (dada ayam, telur, ikan), karbohidrat kompleks pre-workout, hindari gorengan & minuman manis. Suplementasi: Creatine Monohydrate 5g/hari & Whey Isolate 1 scoop.'
    );
    setMedicalHistoryInput(
      client.medicalHistoryNote ||
        'PAR-Q Screening: Tekanan darah normal (118/78 mmHg), tidak ada riwayat penyakit kardiovaskular. Perlu pemanasan rotasi bahu (rotator cuff) & aktivasi core sebelum angkatan beban berat.'
    );
    setPostureScreeningInput(
      client.postureScreeningNote ||
        'Mobilitas dorsifleksi ankle cukup baik, sedikit anterior pelvic tilt akibat duduk kerja lama. Fokus penguatan posterior chain (RDL, Glute Bridge) dan thoracic extension.'
    );
    setBeratAwalInput(String(client.berat_awal_kg));
    setBeratTargetInput(String(client.berat_target_kg));
    setBfAwalInput(String(client.body_fat_awal_pct));
    setPinggangAwalInput(String(client.lingkar_pinggang_awal_cm));
    setDadaAwalInput(String(client.lingkar_dada_awal_cm));
    setLenganAwalInput(String(client.lingkar_lengan_awal_cm));
    setBaselinePhotoUrl(client.baselinePhotoUrl);
    setBaselinePhotoPose(client.baselinePhotoPose || 'Front Relaxed — Postural Baseline');
    setBaselinePhotoDate(client.baselinePhotoDate || 'Minggu 1 — Assessment Awal');
  }, [client]);

  // Add PR Form state
  const [prExercise, setPrExercise] = useState('Barbell Back Squat');
  const [prCategory, setPrCategory] = useState<'Free Weights' | 'Kabel/Mesin' | 'Kalistenik'>(
    'Free Weights'
  );
  const [prWeight, setPrWeight] = useState('115');
  const [prReps, setPrReps] = useState('5');
  const [prDelta, setPrDelta] = useState('5.0');
  const [prNote, setPrNote] = useState('Kedalaman paralel bersih, kecepatan konsentrik stabil');

  const remainingSessions = Math.max(0, client.paketTotal - client.paketTerpakai);
  const packageProgressPct = Math.min(
    100,
    Math.round((client.paketTerpakai / client.paketTotal) * 100)
  );

  // Biometric Deltas vs Baseline Week 1
  const weightDelta = +(client.berat_terkini_kg - client.berat_awal_kg).toFixed(1);
  const weightDeltaPct = ((weightDelta / client.berat_awal_kg) * 100).toFixed(1);
  const fatDelta = +(client.body_fat_terkini_pct - client.body_fat_awal_pct).toFixed(1);
  const muscleDelta = +(client.massa_otot_terkini_kg - client.massa_otot_awal_kg).toFixed(1);
  const waistDelta = +(
    client.lingkar_pinggang_terkini_cm - client.lingkar_pinggang_awal_cm
  ).toFixed(1);

  const handleCreatePR = (e: React.FormEvent) => {
    e.preventDefault();
    const w = parseFloat(prWeight) || 0;
    const r = parseInt(prReps, 10) || 1;
    const est1RM = +(w * (1 + r / 30)).toFixed(1);

    onAddPR({
      id: `pr-${Date.now()}`,
      exerciseName: prExercise.trim() || 'Barbell Squat',
      category: prCategory,
      weightKg: w,
      reps: r,
      est1RM,
      deltaKg: parseFloat(prDelta) || 2.5,
      achievedDate: '05 Nov 2026',
      note: prNote.trim() || 'Form terverifikasi pelatih'
    });
    setShowAddPrModal(false);
  };

  const handlePhotoInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      onUploadProgressPhoto(`Mgg 8 Check-In`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      onUploadProgressPhoto(`Mgg 8 Check-In`, reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleBaselinePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setBaselinePhotoUrl(dataUrl);
      onUpdateMedicalAndBaseline({
        kaloriTarget: parseInt(kaloriTargetInput, 10) || client.kaloriTarget,
        kaloriHarian: parseInt(kaloriHarianInput, 10) || client.kaloriHarian,
        proteinTarget: parseInt(proteinTargetInput, 10) || client.proteinTarget,
        proteinHarian: parseInt(proteinHarianInput, 10) || client.proteinHarian,
        karboTarget: parseInt(karboTargetInput, 10) || defaultCarbs,
        lemakTarget: parseInt(lemakTargetInput, 10) || defaultFat,
        hidrasiTarget: parseFloat(hidrasiTargetInput) || client.hidrasiTarget,
        hidrasiLiter: parseFloat(hidrasiLiterInput) || client.hidrasiLiter,
        nutritionCoachNote: nutritionNoteInput.trim() || client.nutritionCoachNote,
        dietDetailNote: dietDetailInput.trim(),
        medicalHistoryNote: medicalHistoryInput.trim(),
        postureScreeningNote: postureScreeningInput.trim(),
        berat_awal_kg: parseFloat(beratAwalInput) || client.berat_awal_kg,
        berat_target_kg: parseFloat(beratTargetInput) || client.berat_target_kg,
        body_fat_awal_pct: parseFloat(bfAwalInput) || client.body_fat_awal_pct,
        lingkar_pinggang_awal_cm:
          parseFloat(pinggangAwalInput) || client.lingkar_pinggang_awal_cm,
        lingkar_dada_awal_cm: parseFloat(dadaAwalInput) || client.lingkar_dada_awal_cm,
        lingkar_lengan_awal_cm: parseFloat(lenganAwalInput) || client.lingkar_lengan_awal_cm,
        baselinePhotoUrl: dataUrl,
        baselinePhotoPose,
        baselinePhotoDate
      });
    };
    reader.readAsDataURL(file);
  };

  const handleSaveMedicalAndBaselineForm = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateMedicalAndBaseline({
      kaloriTarget: parseInt(kaloriTargetInput, 10) || client.kaloriTarget,
      kaloriHarian: parseInt(kaloriHarianInput, 10) || client.kaloriHarian,
      proteinTarget: parseInt(proteinTargetInput, 10) || client.proteinTarget,
      proteinHarian: parseInt(proteinHarianInput, 10) || client.proteinHarian,
      karboTarget: parseInt(karboTargetInput, 10) || defaultCarbs,
      lemakTarget: parseInt(lemakTargetInput, 10) || defaultFat,
      hidrasiTarget: parseFloat(hidrasiTargetInput) || client.hidrasiTarget,
      hidrasiLiter: parseFloat(hidrasiLiterInput) || client.hidrasiLiter,
      nutritionCoachNote: nutritionNoteInput.trim() || client.nutritionCoachNote,
      dietDetailNote: dietDetailInput.trim(),
      medicalHistoryNote: medicalHistoryInput.trim(),
      postureScreeningNote: postureScreeningInput.trim(),
      berat_awal_kg: parseFloat(beratAwalInput) || client.berat_awal_kg,
      berat_target_kg: parseFloat(beratTargetInput) || client.berat_target_kg,
      body_fat_awal_pct: parseFloat(bfAwalInput) || client.body_fat_awal_pct,
      lingkar_pinggang_awal_cm: parseFloat(pinggangAwalInput) || client.lingkar_pinggang_awal_cm,
      lingkar_dada_awal_cm: parseFloat(dadaAwalInput) || client.lingkar_dada_awal_cm,
      lingkar_lengan_awal_cm: parseFloat(lenganAwalInput) || client.lingkar_lengan_awal_cm,
      baselinePhotoUrl,
      baselinePhotoPose,
      baselinePhotoDate
    });
  };

  // Dedicated Full Session History View (/klien/[id]/sesi)
  if (showFullSessionHistory) {
    const filteredSessions = client.sessions.filter((s) =>
      sessionFocusFilter === 'Semua'
        ? true
        : s.focus.toLowerCase().includes(sessionFocusFilter.toLowerCase())
    );

    return (
      <div className="space-y-5">
        {/* Sub-header for /klien/[id]/sesi */}
        <div className="bg-[#141b2b] border border-white/[0.08] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onToggleFullSessionHistory(false)}
              className="min-w-[44px] min-h-[44px] rounded-xl bg-[#232a3a] hover:bg-[#323949] text-white flex items-center justify-center transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h2 className="text-base font-bold text-white">
                Riwayat Sesi Lengkap ({client.sessions.length} Log)
              </h2>
              <p className="text-xs text-[#bbcabf]">
                <span>{client.nama_lengkap}</span>
                <span aria-hidden="true"> · </span>
                <span className="font-mono">{client.code}</span>
                <span aria-hidden="true"> · </span>
                <span>Paket {client.paketTerpakai}/{client.paketTotal} Sesi</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenLogSession}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-[#10b981] hover:bg-[#4edea3] text-[#002113] text-xs font-semibold flex items-center justify-center gap-1.5"
          >
            <Dumbbell className="w-4 h-4" />
            <span>+ Catat Sesi #{client.paketTerpakai + 1}</span>
          </button>
        </div>

        {/* Filter Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {['Semua', 'Lower Body', 'Upper', 'Deadlift', 'Conditioning'].map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setSessionFocusFilter(f)}
              className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                sessionFocusFilter === f
                  ? 'bg-[#10b981] text-[#002113]'
                  : 'bg-[#141b2b] border border-white/[0.08] text-[#bbcabf] hover:text-white'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Full Session List */}
        {filteredSessions.length === 0 ? (
          <div className="bg-[#141b2b] border border-white/[0.08] rounded-2xl p-8 text-center space-y-3">
            <p className="text-sm font-semibold text-white">Belum ada log sesi pada kategori ini</p>
            <p className="text-xs text-[#bbcabf]">
              Catat sesi latihan baru untuk mulai merekam tonase, RPE, dan perkembangan beban.
            </p>
            <button
              type="button"
              onClick={onOpenLogSession}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-[#10b981] text-[#002113] text-xs font-semibold inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Catat Sesi Pertama</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredSessions.map((ses) => (
              <div
                key={ses.id}
                className="bg-[#141b2b] border border-white/[0.08] rounded-2xl p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-[#4edea3]">
                        #{ses.sessionNumber}
                      </span>
                      <h3 className="text-sm font-semibold text-white">{ses.focus}</h3>
                    </div>
                    <p className="text-xs text-[#bbcabf] mt-0.5">
                      <span>{ses.date}</span>
                      <span aria-hidden="true"> · </span>
                      <span>{ses.time}</span>
                      <span aria-hidden="true"> · </span>
                      <span>{ses.durationMinutes} Menit</span>
                      <span aria-hidden="true"> · </span>
                      <span>{ses.location}</span>
                    </p>
                  </div>
                  <span className="text-xs font-mono font-semibold text-[#4edea3]">
                    {ses.status}
                  </span>
                </div>

                {/* Telemetry & Readiness strip */}
                <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-[#191f2f] border border-white/[0.05] text-xs font-mono">
                  <div>
                    <span className="text-[10px] font-sans text-[#86948a] block">Volume Tonase</span>
                    <span className="text-white font-semibold">
                      {ses.totalVolumeKg.toLocaleString('id-ID')} kg
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-sans text-[#86948a] block">Intensitas RPE</span>
                    <span className="text-[#ffb95f] font-semibold">RPE {ses.rpe} / 10</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-sans text-[#86948a] block">Readiness</span>
                    <span className="text-[#4edea3]">
                      Energi {ses.readiness.energy}/10 · Tidur {ses.readiness.sleepHours}j
                    </span>
                  </div>
                </div>

                {/* Exercises Breakdown */}
                {ses.exercises.length > 0 && (
                  <div className="space-y-2 pt-1">
                    {ses.exercises.map((ex) => (
                      <div
                        key={ex.id}
                        className="p-2.5 rounded-xl bg-[#070e1d] border border-white/[0.06] space-y-1.5"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-white">{ex.name}</span>
                          <span className="text-[11px] font-mono text-[#86948a]">
                            {ex.category} · Tempo {ex.tempo}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {ex.sets.map((st) => (
                            <span
                              key={st.id}
                              className={`text-[11px] font-mono px-2 py-0.5 rounded border ${
                                st.isPR
                                  ? 'bg-[#10b981]/15 border-[#4edea3]/40 text-[#4edea3] font-semibold'
                                  : 'bg-[#191f2f] border-white/[0.06] text-[#bbcabf]'
                              }`}
                            >
                              S{st.setNumber}: {st.weightKg}kg × {st.reps} {st.isPR ? '★ PR' : ''}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {ses.coachNotes && (
                  <p className="text-xs text-[#bbcabf] bg-[#191f2f]/70 p-2.5 rounded-lg italic">
                    “{ses.coachNotes}”
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Back Navigation & Context Bar */}
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onBackToDashboard}
          className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#141b2b] hover:bg-[#232a3a] border border-white/[0.08] text-xs font-semibold text-white flex items-center gap-2 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-[#4edea3]" />
          <span>Kembali ke Direktori Klien</span>
        </button>

        <span className="text-xs font-mono text-[#86948a]">
          {client.code} · {client.phase}
        </span>
      </div>

      {/* 1. Header Profil Klien & Quick Action Thumb Bar */}
      <section className="bg-[#141b2b] border border-white/[0.08] rounded-2xl p-4 sm:p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-13 h-13 rounded-2xl bg-[#232a3a] border border-[#4edea3]/30 text-[#4edea3] flex items-center justify-center font-bold text-base shrink-0">
              {client.initials}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-white tracking-tight truncate">
                  {client.nama_lengkap}
                </h2>
                <span className="text-xs font-mono text-[#4edea3]">
                  {client.phase}
                </span>
              </div>
              <p className="text-xs text-[#bbcabf] mt-0.5 truncate">
                <span>{client.usia} Thn</span>
                <span aria-hidden="true"> · </span>
                <span>{client.gender}</span>
                <span aria-hidden="true"> · </span>
                <span>{client.pekerjaan}</span>
                <span aria-hidden="true"> · </span>
                <span className="font-mono">{client.code}</span>
              </p>
            </div>
          </div>

          <span className="text-xs font-mono text-[#ffb95f] shrink-0">
            Sisa {remainingSessions} Sesi
          </span>
        </div>

        {/* Target & Package Progress Banner */}
        <div className="bg-[#191f2f] border border-white/[0.06] rounded-xl p-3.5 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-white flex items-center gap-1.5">
              <Flag className="w-4 h-4 text-[#4edea3]" />
              <span>{client.target_utama}</span>
            </span>
            <span className="font-mono text-[#4edea3] font-medium">
              Target BB: {client.berat_target_kg} kg
            </span>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs text-[#bbcabf]">
              <span>
                Paket Latihan:{' '}
                <strong className="text-white font-mono">
                  {client.paketTerpakai} / {client.paketTotal} Sesi
                </strong>
              </span>
              <span className="text-[#4edea3] font-medium">
                Kepatuhan Diet {client.dietCompliancePct}%
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-[#070e1d] overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#10b981] to-[#4edea3] rounded-full"
                style={{ width: `${packageProgressPct}%` }}
              />
            </div>
            <div className="flex items-center justify-between pt-1 text-xs text-[#86948a]">
              <span>
                Lead Coach: <strong className="text-[#dce2f7]">{client.leadCoach}</strong>
              </span>
              <span>Status: {client.status}</span>
            </div>
          </div>
        </div>

        {/* Next Session Card with Quick Reschedule Trigger */}
        <div className="bg-[#070e1d] border border-white/[0.08] rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <span className="text-[11px] text-[#86948a] block">
              Jadwal Sesi Terdekat (#{client.paketTerpakai + 1})
            </span>
            <p className="text-xs font-semibold text-white">
              {client.nextSession.focus}
            </p>
            <p className="text-xs text-[#bbcabf] flex items-center gap-2 flex-wrap">
              <span className="font-mono text-[#4edea3]">
                {client.nextSession.date} · {client.nextSession.time} WIB
              </span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1">
                <MapPin className="w-3 h-3 text-[#06b6d4]" />
                {client.nextSession.location}
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenReschedule}
            className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#232a3a] hover:bg-[#323949] text-[#ffb95f] text-xs font-semibold flex items-center justify-center gap-1.5 shrink-0 transition-colors"
          >
            <CalendarClock className="w-4 h-4" />
            <span>Reschedule Sesi</span>
          </button>
        </div>

        {/* Quick Action Thumb Bar (Min 44px height) */}
        <div className="grid grid-cols-12 gap-2">
          <button
            type="button"
            onClick={onOpenUpdateMetrics}
            className="col-span-5 min-h-[46px] bg-[#10b981] hover:bg-[#4edea3] text-[#002113] rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition-transform shadow-sm"
          >
            <Scale className="w-4 h-4" />
            <span>Update Metrik &amp; Timbang</span>
          </button>
          <button
            type="button"
            onClick={onOpenLogSession}
            className="col-span-5 min-h-[46px] bg-[#232a3a] hover:bg-[#323949] border border-white/[0.08] text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
          >
            <Dumbbell className="w-4 h-4 text-[#4edea3]" />
            <span>Catat Sesi #{client.paketTerpakai + 1}</span>
          </button>
          <a
            href={`https://wa.me/${client.telepon}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Chat WhatsApp Klien"
            className="col-span-2 min-h-[46px] bg-[#232a3a] hover:bg-[#323949] border border-white/[0.08] text-[#4edea3] rounded-xl flex items-center justify-center active:scale-95 transition-transform"
          >
            <MessageCircle className="w-5 h-5" />
          </a>
        </div>
      </section>

      {/* 2. Segmented Navigation Tabs (Functional Filter Controls) */}
      <div className="flex items-center gap-1.5 p-1 bg-[#141b2b] border border-white/[0.08] rounded-xl overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'overview'
              ? 'bg-[#10b981] text-[#002113]'
              : 'text-[#bbcabf] hover:text-white'
          }`}
        >
          Overview &amp; Metrik
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('baseline_medis')}
          className={`min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
            activeTab === 'baseline_medis'
              ? 'bg-[#10b981] text-[#002113]'
              : 'text-[#4edea3] bg-[#191f2f]/80 hover:text-white'
          }`}
        >
          <HeartPulse className="w-3.5 h-3.5" />
          <span>Data Medis &amp; Progres Awal</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('pr')}
          className={`min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'pr'
              ? 'bg-[#10b981] text-[#002113]'
              : 'text-[#bbcabf] hover:text-white'
          }`}
        >
          Papan PR ({client.prList.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('sessions')}
          className={`min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'sessions'
              ? 'bg-[#10b981] text-[#002113]'
              : 'text-[#bbcabf] hover:text-white'
          }`}
        >
          Log Sesi ({client.sessions.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('photos')}
          className={`min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'photos'
              ? 'bg-[#10b981] text-[#002113]'
              : 'text-[#bbcabf] hover:text-white'
          }`}
        >
          Foto Fisik ({client.photos.length})
        </button>
      </div>

      {/* Dedicated Tab View: Data Medis Lanjut & Riwayat Progres Awal */}
      {activeTab === 'baseline_medis' && (
        <form onSubmit={handleSaveMedicalAndBaselineForm} className="space-y-5">
          {/* Top Callout Banner */}
          <div className="bg-gradient-to-r from-[#10b981]/15 via-[#141b2b] to-[#141b2b] border border-[#4edea3]/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#10b981]/20 border border-[#4edea3]/40 text-[#4edea3] flex items-center justify-center shrink-0 mt-0.5">
                <HeartPulse className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">
                  Data Medis Lanjut, Protokol Diet &amp; Referensi Progres Awal
                </h3>
                <p className="text-xs text-[#bbcabf] mt-0.5">
                  Sesuaikan target makronutrisi harian, rekam catatan diet/medis spesifik, dan unggah foto fisik awal (Mgg 1) sebagai tolok ukur jangka panjang.
                </p>
              </div>
            </div>
            <button
              type="submit"
              className="min-h-[42px] px-4 py-2 rounded-xl bg-[#10b981] hover:bg-[#4edea3] text-[#002113] text-xs font-bold flex items-center justify-center gap-1.5 shrink-0 shadow-md shadow-[#10b981]/20 active:scale-95 transition"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Perubahan Data</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Left Column: Custom Macronutrients & Detailed Diet Protocol */}
            <div className="lg:col-span-7 space-y-5">
              {/* Card A: Target Makronutrisi Harian yang Disesuaikan */}
              <section className="bg-[#141b2b] border border-white/[0.08] rounded-2xl p-4 sm:p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                  <div className="flex items-center gap-2">
                    <Flame className="w-4 h-4 text-[#4edea3]" />
                    <div>
                      <h4 className="text-sm font-bold text-white">
                        Target Makronutrisi &amp; Hidrasi Harian
                      </h4>
                      <p className="text-[11px] text-[#bbcabf]">
                        Kustomisasi alokasi kalori, protein, karbohidrat, dan lemak sehat
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono text-[#4edea3] bg-[#10b981]/15 px-2.5 py-1 rounded-lg border border-[#4edea3]/30">
                    {(
                      ((parseInt(proteinTargetInput, 10) || 0) /
                        Math.max(1, client.berat_terkini_kg))
                    ).toFixed(1)}
                    g Protein / kg BB
                  </span>
                </div>

                {/* Macro Distribution Preview Bar */}
                {(() => {
                  const pKcal = (parseInt(proteinTargetInput, 10) || 0) * 4;
                  const cKcal = (parseInt(karboTargetInput, 10) || 0) * 4;
                  const fKcal = (parseInt(lemakTargetInput, 10) || 0) * 9;
                  const totalMacroKcal = Math.max(1, pKcal + cKcal + fKcal);
                  const pPct = Math.round((pKcal / totalMacroKcal) * 100);
                  const cPct = Math.round((cKcal / totalMacroKcal) * 100);
                  const fPct = Math.max(0, 100 - pPct - cPct);

                  return (
                    <div className="bg-[#070e1d] border border-white/[0.06] rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-mono">
                        <span className="text-[#4edea3]">Protein: {pPct}% ({pKcal} kcal)</span>
                        <span className="text-[#06b6d4]">Karbo: {cPct}% ({cKcal} kcal)</span>
                        <span className="text-[#ffb95f]">Lemak: {fPct}% ({fKcal} kcal)</span>
                      </div>
                      <div className="w-full h-2.5 rounded-full bg-[#191f2f] overflow-hidden flex">
                        <div
                          style={{ width: `${pPct}%` }}
                          className="h-full bg-[#10b981] transition-all"
                        />
                        <div
                          style={{ width: `${cPct}%` }}
                          className="h-full bg-[#06b6d4] transition-all"
                        />
                        <div
                          style={{ width: `${fPct}%` }}
                          className="h-full bg-[#f59e0b] transition-all"
                        />
                      </div>
                    </div>
                  );
                })()}

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-[#bbcabf] mb-1">
                      Target Kalori (kcal)
                    </label>
                    <input
                      type="number"
                      step="50"
                      value={kaloriTargetInput}
                      onChange={(e) => setKaloriTargetInput(e.target.value)}
                      className="w-full bg-[#070e1d] border border-white/[0.1] rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#4edea3]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-[#bbcabf] mb-1">
                      Rata-rata Aktual (kcal)
                    </label>
                    <input
                      type="number"
                      step="50"
                      value={kaloriHarianInput}
                      onChange={(e) => setKaloriHarianInput(e.target.value)}
                      className="w-full bg-[#070e1d] border border-white/[0.1] rounded-xl px-3 py-2 text-xs font-mono text-[#4edea3] focus:outline-none focus:border-[#4edea3]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-[#bbcabf] mb-1">
                      Target Protein (g)
                    </label>
                    <input
                      type="number"
                      step="5"
                      value={proteinTargetInput}
                      onChange={(e) => setProteinTargetInput(e.target.value)}
                      className="w-full bg-[#070e1d] border border-white/[0.1] rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#4edea3]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-[#bbcabf] mb-1">
                      Protein Aktual (g)
                    </label>
                    <input
                      type="number"
                      step="5"
                      value={proteinHarianInput}
                      onChange={(e) => setProteinHarianInput(e.target.value)}
                      className="w-full bg-[#070e1d] border border-white/[0.1] rounded-xl px-3 py-2 text-xs font-mono text-[#4edea3] focus:outline-none focus:border-[#4edea3]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-[#bbcabf] mb-1">
                      Target Karbohidrat (g)
                    </label>
                    <input
                      type="number"
                      step="5"
                      value={karboTargetInput}
                      onChange={(e) => setKarboTargetInput(e.target.value)}
                      className="w-full bg-[#070e1d] border border-white/[0.1] rounded-xl px-3 py-2 text-xs font-mono text-[#06b6d4] focus:outline-none focus:border-[#4edea3]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-[#bbcabf] mb-1">
                      Target Lemak Sehat (g)
                    </label>
                    <input
                      type="number"
                      step="2"
                      value={lemakTargetInput}
                      onChange={(e) => setLemakTargetInput(e.target.value)}
                      className="w-full bg-[#070e1d] border border-white/[0.1] rounded-xl px-3 py-2 text-xs font-mono text-[#ffb95f] focus:outline-none focus:border-[#4edea3]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-medium text-[#bbcabf] mb-1">
                      Target Hidrasi Air Putih (Liter)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={hidrasiTargetInput}
                      onChange={(e) => setHidrasiTargetInput(e.target.value)}
                      className="w-full bg-[#070e1d] border border-white/[0.1] rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#4edea3]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-[#bbcabf] mb-1">
                      Realisasi Hidrasi Harian (Liter)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={hidrasiLiterInput}
                      onChange={(e) => setHidrasiLiterInput(e.target.value)}
                      className="w-full bg-[#070e1d] border border-white/[0.1] rounded-xl px-3 py-2 text-xs font-mono text-[#06b6d4] focus:outline-none focus:border-[#4edea3]"
                    />
                  </div>
                </div>

                {/* Detailed Diet Notes & Supplementation */}
                <div className="space-y-3 pt-2 border-t border-white/[0.06]">
                  <div>
                    <label className="block text-xs font-semibold text-white mb-1">
                      Catatan Diet Detail, Jam Makan &amp; Protokol Suplementasi
                    </label>
                    <textarea
                      rows={3}
                      value={dietDetailInput}
                      onChange={(e) => setDietDetailInput(e.target.value)}
                      placeholder="Tuliskan panduan sumber karbohidrat/protein, meal timing pre & post-workout, alergi makanan, dan dosis suplemen..."
                      className="w-full bg-[#070e1d] border border-white/[0.1] rounded-xl p-3 text-xs text-white placeholder-[#86948a] focus:outline-none focus:border-[#4edea3] resize-none leading-relaxed"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-white mb-1">
                      Ringkasan Evaluasi Nutrisi Mingguan (Tampil di Overview)
                    </label>
                    <input
                      type="text"
                      value={nutritionNoteInput}
                      onChange={(e) => setNutritionNoteInput(e.target.value)}
                      placeholder="Catatan singkat evaluasi kepatuhan diet minggu ini..."
                      className="w-full bg-[#070e1d] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white placeholder-[#86948a] focus:outline-none focus:border-[#4edea3]"
                    />
                  </div>
                </div>
              </section>

              {/* Card B: Data Medis Lanjut, Skrining PAR-Q & Evaluasi Postur */}
              <section className="bg-[#141b2b] border border-white/[0.08] rounded-2xl p-4 sm:p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-[#ffb95f]" />
                    <div>
                      <h4 className="text-sm font-bold text-white">
                        Data Medis Lanjut (PAR-Q) &amp; Evaluasi Mobilitas
                      </h4>
                      <p className="text-[11px] text-[#bbcabf]">
                        Riwayat cedera ortopedi, batasan gerak sendi, dan catatan biomekanika
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-[#ffb95f]/15 text-[#ffb95f] border border-[#ffb95f]/30">
                    Rekam Medis Atlet
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-white mb-1">
                    Riwayat Medis, Cedera Sendi &amp; Kesiapan Fisik (PAR-Q)
                  </label>
                  <textarea
                    rows={3}
                    value={medicalHistoryInput}
                    onChange={(e) => setMedicalHistoryInput(e.target.value)}
                    placeholder="Contoh: Riwayat HNP ringan L4-L5, bahu kanan impingement saat tekan vertikal, tekanan darah istirahat, kualitas tidur..."
                    className="w-full bg-[#070e1d] border border-white/[0.1] rounded-xl p-3 text-xs text-white placeholder-[#86948a] focus:outline-none focus:border-[#4edea3] resize-none leading-relaxed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-white mb-1">
                    Hasil Movement Screening &amp; Koreksi Postur Awal
                  </label>
                  <textarea
                    rows={2}
                    value={postureScreeningInput}
                    onChange={(e) => setPostureScreeningInput(e.target.value)}
                    placeholder="Contoh: Overhead squat assessment, mobilitas ankle/hip, aktivasi glute & koreksi postur..."
                    className="w-full bg-[#070e1d] border border-white/[0.1] rounded-xl p-3 text-xs text-white placeholder-[#86948a] focus:outline-none focus:border-[#4edea3] resize-none leading-relaxed"
                  />
                </div>
              </section>
            </div>

            {/* Right Column: Riwayat Progres Awal (Baseline Mgg 1) & Foto Kondisi Fisik Awal */}
            <div className="lg:col-span-5 space-y-5">
              {/* Card C: Foto Kondisi Fisik Awal (Referensi Jangka Panjang) */}
              <section className="bg-[#141b2b] border border-white/[0.08] rounded-2xl p-4 sm:p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                  <div className="flex items-center gap-2">
                    <Camera className="w-4 h-4 text-[#4edea3]" />
                    <div>
                      <h4 className="text-sm font-bold text-white">
                        Foto Kondisi Fisik Awal (Baseline Mgg 1)
                      </h4>
                      <p className="text-[11px] text-[#bbcabf]">
                        Referensi visual utama untuk komparasi progres jangka panjang
                      </p>
                    </div>
                  </div>
                </div>

                {/* Baseline Photo Preview Frame */}
                <div className="relative w-full h-60 rounded-xl overflow-hidden bg-gradient-to-b from-[#191f2f] to-[#070e1d] border border-white/[0.08] flex flex-col items-center justify-center p-3">
                  <span className="absolute top-2.5 left-2.5 z-10 bg-[#070e1d]/90 border border-white/[0.12] text-[#4edea3] font-mono text-[10px] px-2.5 py-1 rounded-lg font-semibold">
                    {baselinePhotoDate}
                  </span>
                  <span className="absolute top-2.5 right-2.5 z-10 bg-[#191f2f]/90 text-[#bbcabf] font-mono text-[10px] px-2 py-1 rounded-lg">
                    {baselinePhotoPose}
                  </span>

                  {baselinePhotoUrl ? (
                    <img
                      src={baselinePhotoUrl}
                      alt={`Foto kondisi fisik awal ${client.nama_lengkap}`}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center space-y-2">
                      <svg
                        viewBox="0 0 120 140"
                        className="w-24 h-28 text-[#86948a]"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <circle cx="60" cy="22" r="12" strokeOpacity="0.7" />
                        <path
                          d="M32 45 C32 38, 88 38, 88 45 L84 85 C84 95, 78 108, 76 125 L44 125 C42 108, 36 95, 36 85 Z"
                          fill="rgba(134,148,138,0.12)"
                        />
                        <line
                          x1="34"
                          y1="92"
                          x2="86"
                          y2="92"
                          stroke="#ffb95f"
                          strokeDasharray="3 2"
                        />
                      </svg>
                      <p className="text-xs font-medium text-white">
                        Belum ada foto kondisi fisik awal (Mgg 1)
                      </p>
                      <p className="text-[11px] text-[#86948a] max-w-xs">
                        Unggah foto postur awal klien untuk disandingkan otomatis dengan foto progres Minggu 8.
                      </p>
                    </div>
                  )}

                  {/* Bottom Anthropometric Overlay */}
                  <div className="absolute bottom-2.5 inset-x-2.5 bg-[#070e1d]/90 backdrop-blur-md border border-white/[0.08] rounded-lg px-3 py-2 flex items-center justify-between text-[11px] font-mono">
                    <span className="text-white font-semibold">
                      BB Awal: {beratAwalInput} kg
                    </span>
                    <span className="text-[#ffb95f]">BF: {bfAwalInput}%</span>
                    <span className="text-[#4edea3]">Pinggang: {pinggangAwalInput} cm</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-medium text-[#bbcabf] mb-1">
                      Pose / Sudut Pengambilan
                    </label>
                    <select
                      value={baselinePhotoPose}
                      onChange={(e) => setBaselinePhotoPose(e.target.value)}
                      className="w-full bg-[#070e1d] border border-white/[0.1] rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-[#4edea3]"
                    >
                      <option value="Front Relaxed — Postural Baseline">
                        Front Relaxed (Depan)
                      </option>
                      <option value="Side Profile — Sagittal Posture">
                        Side Profile (Samping)
                      </option>
                      <option value="Back Alignment — Scapular Check">
                        Back Alignment (Belakang)
                      </option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-[#bbcabf] mb-1">
                      Label Periode Foto Awal
                    </label>
                    <input
                      type="text"
                      value={baselinePhotoDate}
                      onChange={(e) => setBaselinePhotoDate(e.target.value)}
                      className="w-full bg-[#070e1d] border border-white/[0.1] rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-[#4edea3]"
                    />
                  </div>
                </div>

                <label className="w-full min-h-[44px] bg-[#232a3a] hover:bg-[#323949] border border-[#4edea3]/30 text-[#4edea3] rounded-xl text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition active:scale-[0.98]">
                  <Camera className="w-4 h-4" />
                  <span>
                    {baselinePhotoUrl
                      ? 'Ganti Foto Kondisi Fisik Awal (Mgg 1)'
                      : 'Unggah Foto Kondisi Fisik Awal (Mgg 1)'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleBaselinePhotoChange}
                    className="hidden"
                  />
                </label>
              </section>

              {/* Card D: Kalibrasi Riwayat Progres Awal (Minggu 1 Baseline Metrics) */}
              <section className="bg-[#141b2b] border border-white/[0.08] rounded-2xl p-4 sm:p-5 space-y-3.5">
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#06b6d4]" />
                    <div>
                      <h4 className="text-sm font-bold text-white">
                        Kalibrasi Angka Baseline Awal (Minggu 1)
                      </h4>
                      <p className="text-[11px] text-[#bbcabf]">
                        Data titik nol untuk perhitungan selisih progres
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] text-[#bbcabf] mb-1">
                      Berat Badan Awal (kg)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={beratAwalInput}
                      onChange={(e) => setBeratAwalInput(e.target.value)}
                      className="w-full bg-[#070e1d] border border-white/[0.1] rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#4edea3]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-[#bbcabf] mb-1">
                      Target Berat Program (kg)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={beratTargetInput}
                      onChange={(e) => setBeratTargetInput(e.target.value)}
                      className="w-full bg-[#070e1d] border border-white/[0.1] rounded-xl px-3 py-2 text-xs font-mono text-[#4edea3] focus:outline-none focus:border-[#4edea3]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-[#bbcabf] mb-1">
                      Body Fat Awal (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={bfAwalInput}
                      onChange={(e) => setBfAwalInput(e.target.value)}
                      className="w-full bg-[#070e1d] border border-white/[0.1] rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#4edea3]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-[#bbcabf] mb-1">
                      Lingkar Pinggang Awal (cm)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={pinggangAwalInput}
                      onChange={(e) => setPinggangAwalInput(e.target.value)}
                      className="w-full bg-[#070e1d] border border-white/[0.1] rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#4edea3]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-[#bbcabf] mb-1">
                      Lingkar Dada Awal (cm)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={dadaAwalInput}
                      onChange={(e) => setDadaAwalInput(e.target.value)}
                      className="w-full bg-[#070e1d] border border-white/[0.1] rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#4edea3]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-[#bbcabf] mb-1">
                      Lingkar Lengan Awal (cm)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={lenganAwalInput}
                      onChange={(e) => setLenganAwalInput(e.target.value)}
                      className="w-full bg-[#070e1d] border border-white/[0.1] rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#4edea3]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full min-h-[44px] bg-[#10b981] hover:bg-[#4edea3] text-[#002113] rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-[#10b981]/20 active:scale-[0.98] transition"
                >
                  <Save className="w-4 h-4" />
                  <span>Simpan Semua Data Medis &amp; Baseline Awal</span>
                </button>
              </section>
            </div>
          </div>
        </form>
      )}

      {/* Main Content Layout: Responsive 2-column on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left/Primary Column */}
        <div className="lg:col-span-7 space-y-5">
          {/* 3. Bento Card Metrik Biometrik 2x2 Grid */}
          {(activeTab === 'overview' || activeTab === 'photos') && (
            <section className="grid grid-cols-2 gap-3">
              {/* Berat Badan */}
              <div className="bg-[#141b2b] border border-white/[0.08] p-4 rounded-xl flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs text-[#bbcabf] mb-1">
                  <span>Berat Badan</span>
                  <Scale className="w-4 h-4 text-[#4edea3]" />
                </div>
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold font-mono text-white">
                      {client.berat_terkini_kg}
                    </span>
                    <span className="text-xs text-[#bbcabf]">kg</span>
                  </div>
                  <div className="flex items-center gap-1 mt-1 text-xs font-mono font-medium text-[#4edea3]">
                    {weightDelta <= 0 ? (
                      <TrendingDown className="w-3.5 h-3.5" />
                    ) : (
                      <TrendingUp className="w-3.5 h-3.5 text-[#ffb95f]" />
                    )}
                    <span>
                      {weightDelta > 0 ? `+${weightDelta}` : weightDelta} kg ({weightDeltaPct}%)
                    </span>
                  </div>
                </div>
                <div className="mt-2.5 pt-2 border-t border-white/[0.06] text-[11px] text-[#86948a] flex justify-between">
                  <span>Awal: {client.berat_awal_kg} kg</span>
                  <span className="text-white font-mono">Target: {client.berat_target_kg} kg</span>
                </div>
              </div>

              {/* Body Fat */}
              <div className="bg-[#141b2b] border border-white/[0.08] p-4 rounded-xl flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs text-[#bbcabf] mb-1">
                  <span>Persentase Lemak (BF)</span>
                  <Activity className="w-4 h-4 text-[#ffb95f]" />
                </div>
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold font-mono text-white">
                      {client.body_fat_terkini_pct}
                    </span>
                    <span className="text-xs text-[#bbcabf]">%</span>
                  </div>
                  <div className="flex items-center gap-1 mt-1 text-xs font-mono font-medium text-[#4edea3]">
                    <TrendingDown className="w-3.5 h-3.5" />
                    <span>{fatDelta > 0 ? `+${fatDelta}` : fatDelta}% Fat Loss</span>
                  </div>
                </div>
                <div className="mt-2.5 pt-2 border-t border-white/[0.06] text-[11px] text-[#86948a] flex justify-between">
                  <span>Baseline: {client.body_fat_awal_pct}%</span>
                  <span className="text-[#ffb95f] font-medium">Fitness Zone</span>
                </div>
              </div>

              {/* Massa Otot SMM */}
              <div className="bg-[#141b2b] border border-white/[0.08] p-4 rounded-xl flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs text-[#bbcabf] mb-1">
                  <span>Massa Otot (SMM)</span>
                  <Dumbbell className="w-4 h-4 text-[#4edea3]" />
                </div>
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold font-mono text-white">
                      {client.massa_otot_terkini_kg}
                    </span>
                    <span className="text-xs text-[#bbcabf]">kg</span>
                  </div>
                  <div className="flex items-center gap-1 mt-1 text-xs font-mono font-medium text-[#4edea3]">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>
                      {muscleDelta >= 0 ? `+${muscleDelta}` : muscleDelta} kg Hypertrophy
                    </span>
                  </div>
                </div>
                <div className="mt-2.5 pt-2 border-t border-white/[0.06] text-[11px] text-[#86948a] flex justify-between">
                  <span>Baseline: {client.massa_otot_awal_kg} kg</span>
                  <span className="text-[#4edea3] font-medium">Preservasi Optimal</span>
                </div>
              </div>

              {/* Lingkar Perut & Antropometri */}
              <div className="bg-[#141b2b] border border-white/[0.08] p-4 rounded-xl flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs text-[#bbcabf] mb-1">
                  <span>Lingkar Pinggang</span>
                  <span className="font-mono text-[11px] text-[#c0c1ff]">Antropometri</span>
                </div>
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold font-mono text-white">
                      {client.lingkar_pinggang_terkini_cm}
                    </span>
                    <span className="text-xs text-[#bbcabf]">cm</span>
                  </div>
                  <div className="flex items-center gap-1 mt-1 text-xs font-mono font-medium text-[#4edea3]">
                    <TrendingDown className="w-3.5 h-3.5" />
                    <span>
                      {waistDelta > 0 ? `+${waistDelta}` : waistDelta} cm Reduksi
                    </span>
                  </div>
                </div>
                <div className="mt-2.5 pt-2 border-t border-white/[0.06] text-[11px] text-[#86948a] flex justify-between font-mono">
                  <span>Dada: {client.lingkar_dada_terkini_cm}cm</span>
                  <span>Lengan: {client.lingkar_lengan_terkini_cm}cm</span>
                </div>
              </div>
            </section>
          )}

          {/* 4. Grafik Tren Komposisi Tubuh (8 Minggu) */}
          {activeTab === 'overview' && (
            <section className="bg-[#141b2b] border border-white/[0.08] rounded-2xl p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    Tren Komposisi Tubuh (8 Minggu)
                  </h3>
                  <p className="text-xs text-[#bbcabf]">
                    Kalibrasi otomatis terhadap baseline Minggu 1 ({client.berat_awal_kg} kg)
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs font-mono">
                  <span className="text-[#4edea3]">— BB (kg)</span>
                  <span className="text-[#ffb95f]">-- BF (%)</span>
                </div>
              </div>

              {/* Dynamic SVG Chart */}
              <div className="relative w-full h-44 bg-[#070e1d] border border-white/[0.06] rounded-xl p-3 flex flex-col justify-end overflow-hidden">
                <div className="absolute inset-x-3 top-3 border-b border-white/[0.06] flex justify-between text-[10px] font-mono text-[#86948a]">
                  <span>
                    M1: {client.berat_awal_kg}kg / {client.body_fat_awal_pct}%
                  </span>
                </div>
                <div className="absolute inset-x-3 top-1/2 border-b border-white/[0.06] flex justify-between text-[10px] font-mono text-[#86948a]">
                  <span>Mid-Block</span>
                </div>
                <div className="absolute inset-x-3 bottom-7 border-b border-white/[0.06] flex justify-between text-[10px] font-mono text-[#4edea3]">
                  <span>
                    M8 Kini: {client.berat_terkini_kg}kg / {client.body_fat_terkini_pct}%
                  </span>
                </div>

                <svg
                  className="w-full h-28 overflow-visible"
                  preserveAspectRatio="none"
                  viewBox="0 0 320 120"
                >
                  <defs>
                    <linearGradient id="emeraldArea" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#4edea3" stopOpacity="0.28" />
                      <stop offset="100%" stopColor="#4edea3" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  <polygon
                    fill="url(#emeraldArea)"
                    points="10,20 52,30 95,42 140,54 185,66 230,77 272,86 310,94 310,115 10,115"
                  />
                  <polyline
                    fill="none"
                    points="10,20 52,30 95,42 140,54 185,66 230,77 272,86 310,94"
                    stroke="#4edea3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2.5"
                  />
                  <circle cx="10" cy="20" fill="#4edea3" r="3" />
                  <circle cx="140" cy="54" fill="#4edea3" r="3" />
                  <circle
                    cx="310"
                    cy="94"
                    fill="#4edea3"
                    r="4.5"
                    stroke="#070e1d"
                    strokeWidth="2"
                  />
                  <polyline
                    fill="none"
                    points="10,28 52,40 95,51 140,63 185,75 230,86 272,96 310,104"
                    stroke="#ffb95f"
                    strokeDasharray="3 3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  />
                  <circle cx="310" cy="104" fill="#ffb95f" r="3.5" />
                </svg>

                <div className="flex justify-between items-center pt-1.5 text-[10px] font-mono text-[#86948a] border-t border-white/[0.06]">
                  <span>M1</span>
                  <span>M2</span>
                  <span>M3</span>
                  <span>M4</span>
                  <span>M5</span>
                  <span>M6</span>
                  <span>M7</span>
                  <span className="text-[#4edea3] font-bold">M8 (Kini)</span>
                </div>
              </div>

              <div className="p-2.5 bg-[#191f2f] rounded-xl text-xs text-[#bbcabf] flex items-center justify-between">
                <span>
                  Laju Perubahan Rata-rata:{' '}
                  <strong className="text-white font-mono">
                    {(weightDelta / 8).toFixed(2)} kg / minggu
                  </strong>
                </span>
                <button
                  type="button"
                  onClick={onOpenUpdateMetrics}
                  className="text-[#4edea3] font-semibold hover:underline"
                >
                  Kalibrasi Baru →
                </button>
              </div>
            </section>
          )}

          {/* 5. Kepatuhan Nutrisi 7 Hari */}
          {activeTab === 'overview' && (
            <section className="bg-[#141b2b] border border-white/[0.08] rounded-2xl p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    Kepatuhan Nutrisi &amp; Hidrasi 7 Hari
                  </h3>
                  <p className="text-xs text-[#bbcabf]">
                    Ketuk hari untuk memperbarui status kepatuhan harian
                  </p>
                </div>
                <span className="text-xs font-mono font-semibold text-[#4edea3]">
                  {client.dietCompliancePct}% Disiplin
                </span>
              </div>

              <div className="space-y-2.5 bg-[#191f2f] p-3.5 rounded-xl border border-white/[0.05]">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[#bbcabf]">Target Kalori Harian</span>
                    <span className="font-mono text-white font-medium">
                      {client.kaloriHarian.toLocaleString('id-ID')} /{' '}
                      {client.kaloriTarget.toLocaleString('id-ID')} kcal
                    </span>
                  </div>
                  <div className="h-2 w-full bg-[#070e1d] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#4edea3] rounded-full"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.round((client.kaloriHarian / client.kaloriTarget) * 100)
                        )}%`
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[#bbcabf]">Protein Harian (2g/kg BB)</span>
                    <span className="font-mono text-white font-medium">
                      {client.proteinHarian} / {client.proteinTarget} g
                    </span>
                  </div>
                  <div className="h-2 w-full bg-[#070e1d] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#10b981] rounded-full"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.round((client.proteinHarian / client.proteinTarget) * 100)
                        )}%`
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[#bbcabf]">Hidrasi Air Putih</span>
                    <span className="font-mono text-[#06b6d4] font-medium">
                      {client.hidrasiLiter} / {client.hidrasiTarget} L
                    </span>
                  </div>
                  <div className="h-2 w-full bg-[#070e1d] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#06b6d4] rounded-full"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.round((client.hidrasiLiter / client.hidrasiTarget) * 100)
                        )}%`
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Interactive Daily Status Buttons */}
              <div className="grid grid-cols-7 gap-1.5 text-center">
                {DAY_LABELS.map((dayName, idx) => {
                  const state = client.weeklyNutritionDays[idx] || 'tercapai';
                  return (
                    <button
                      key={dayName}
                      type="button"
                      onClick={() => onToggleNutritionDay(idx)}
                      className="flex flex-col items-center gap-1.5 p-1.5 rounded-xl hover:bg-[#232a3a]/60 transition-colors"
                    >
                      <span className="text-[11px] text-[#bbcabf] font-medium">
                        {dayName}
                      </span>
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center font-mono text-xs font-bold ${
                          state === 'tercapai'
                            ? 'bg-[#10b981]/20 text-[#4edea3] border border-[#4edea3]/40'
                            : state === 'longgar'
                            ? 'bg-[#ffb95f]/20 text-[#ffb95f] border border-[#ffb95f]/40'
                            : 'bg-[#ef4444]/20 text-[#f87171] border border-[#f87171]/40'
                        }`}
                      >
                        {state === 'tercapai' ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <Minus className="w-4 h-4" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="bg-[#191f2f] p-3 rounded-xl text-xs text-[#bbcabf]">
                <strong className="text-white">Catatan Coach Panji:</strong> “
                {client.nutritionCoachNote}”
              </div>
            </section>
          )}
        </div>

        {/* Right/Secondary Column */}
        <div className="lg:col-span-5 space-y-5">
          {/* 6. Papan Rekor Beban (Personal Records - PR List) */}
          {(activeTab === 'overview' || activeTab === 'pr') && (
            <section className="bg-[#141b2b] border border-white/[0.08] rounded-2xl p-4 sm:p-5 space-y-3.5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    Papan Rekor Beban (PR)
                  </h3>
                  <p className="text-xs text-[#bbcabf]">
                    Angkatan Utama Teruji &amp; Estimasi 1RM
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddPrModal(true)}
                  className="min-h-[40px] px-3 py-1.5 bg-[#232a3a] hover:bg-[#323949] text-[#4edea3] rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Log PR</span>
                </button>
              </div>

              {client.prList.length === 0 ? (
                <div className="p-6 rounded-xl bg-[#191f2f] text-center space-y-2">
                  <p className="text-xs text-[#bbcabf]">Belum ada rekor PR tercatat.</p>
                  <button
                    type="button"
                    onClick={() => setShowAddPrModal(true)}
                    className="min-h-[40px] px-3 py-1.5 rounded-lg bg-[#10b981] text-[#002113] text-xs font-semibold"
                  >
                    + Tambah Rekor Pertama
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {client.prList.map((pr) => (
                    <div
                      key={pr.id}
                      className="bg-[#191f2f] border border-white/[0.06] p-3.5 rounded-xl flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs sm:text-sm font-semibold text-white truncate">
                            {pr.exerciseName}
                          </span>
                          <span className="text-xs font-mono font-bold text-[#ffb95f]">
                            ★ +{pr.deltaKg} kg PR
                          </span>
                        </div>
                        <p className="text-xs text-[#bbcabf] mt-0.5 font-mono">
                          <span>
                            {pr.weightKg.toFixed(1)} kg × {pr.reps} reps
                          </span>
                          <span aria-hidden="true"> · </span>
                          <span className="text-white">Est. 1RM {pr.est1RM} kg</span>
                        </p>
                        <p className="text-[11px] text-[#86948a] mt-0.5">
                          {pr.achievedDate} · {pr.note}
                        </p>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-[#232a3a] text-[#4edea3] flex items-center justify-center shrink-0">
                        <Award className="w-5 h-5" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* 7. Riwayat Sesi Latihan Terkini */}
          {(activeTab === 'overview' || activeTab === 'sessions') && (
            <section className="bg-[#141b2b] border border-white/[0.08] rounded-2xl p-4 sm:p-5 space-y-3.5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    Riwayat Sesi Terkini
                  </h3>
                  <p className="text-xs text-[#bbcabf]">Log Terverifikasi Coach</p>
                </div>
                <span className="text-xs font-mono text-[#4edea3] font-medium">
                  Total {client.paketTerpakai} Selesai
                </span>
              </div>

              {client.sessions.length === 0 ? (
                <div className="p-5 rounded-xl bg-[#191f2f] text-center space-y-2">
                  <p className="text-xs text-[#bbcabf]">
                    Belum ada sesi yang tercatat di siklus ini.
                  </p>
                  <button
                    type="button"
                    onClick={onOpenLogSession}
                    className="min-h-[40px] px-3.5 py-2 rounded-xl bg-[#10b981] text-[#002113] text-xs font-semibold"
                  >
                    Catat Sesi Sekarang
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {client.sessions.slice(0, 3).map((ses) => (
                    <div
                      key={ses.id}
                      className="bg-[#191f2f] border border-white/[0.06] p-3.5 rounded-xl space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs font-bold text-[#4edea3]">
                              #{ses.sessionNumber}
                            </span>
                            <h4 className="text-xs sm:text-sm font-semibold text-white">
                              {ses.focus}
                            </h4>
                          </div>
                          <p className="text-xs text-[#bbcabf] mt-0.5">
                            {ses.date} · {ses.durationMinutes} Menit · {ses.location}
                          </p>
                        </div>
                        <span className="text-xs font-mono text-[#4edea3] font-semibold">
                          {ses.status}
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-white/[0.06] text-xs text-[#bbcabf]">
                        <span>
                          Volume Tonase:{' '}
                          <strong className="text-white font-mono">
                            {ses.totalVolumeKg.toLocaleString('id-ID')} kg
                          </strong>
                        </span>
                        <span className="font-mono text-[#ffb95f] font-semibold">
                          RPE {ses.rpe}
                        </span>
                      </div>

                      {ses.coachNotes && (
                        <p className="text-xs text-[#bbcabf] bg-[#141b2b] p-2 rounded-lg italic">
                          “{ses.coachNotes}”
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={() => onToggleFullSessionHistory(true)}
                className="w-full min-h-[44px] bg-[#232a3a] hover:bg-[#323949] text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <span>Lihat Semua Riwayat Sesi Lengkap</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </section>
          )}

          {/* 8. Dokumentasi Progres Fisik (Side-by-Side Comparison without fragile external URLs) */}
          {(activeTab === 'overview' || activeTab === 'photos') && (
            <section className="bg-[#141b2b] border border-white/[0.08] rounded-2xl p-4 sm:p-5 space-y-3.5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    Dokumentasi Progres Fisik
                  </h3>
                  <p className="text-xs text-[#bbcabf]">
                    Komparasi Antropometri Mgg 1 vs Mgg 8
                  </p>
                </div>
                <span className="text-xs font-mono text-[#4edea3]">
                  Pinggang {waistDelta} cm
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5 bg-[#070e1d] p-2 rounded-xl border border-white/[0.06]">
                {/* Baseline Week 1 Visual Card */}
                <div className="flex flex-col rounded-lg overflow-hidden bg-[#141b2b] border border-white/[0.06]">
                  <div className="relative h-44 w-full bg-gradient-to-b from-[#191f2f] to-[#0c1322] flex flex-col items-center justify-center p-3">
                    <span className="absolute top-2 left-2 z-10 bg-[#070e1d]/90 text-[#bbcabf] font-mono text-[10px] px-2 py-0.5 rounded font-semibold">
                      Mgg 1 Baseline
                    </span>
                    {client.baselinePhotoUrl ? (
                      <img
                        src={client.baselinePhotoUrl}
                        alt="Foto kondisi fisik awal Minggu 1"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover rounded"
                      />
                    ) : (
                      <>
                        {/* Anatomical Torso Silhouette Baseline */}
                        <svg
                          viewBox="0 0 120 140"
                          className="w-24 h-28 text-[#86948a]"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <circle cx="60" cy="22" r="12" strokeOpacity="0.7" />
                          <path
                            d="M32 45 C32 38, 88 38, 88 45 L84 85 C84 95, 78 108, 76 125 L44 125 C42 108, 36 95, 36 85 Z"
                            fill="rgba(134,148,138,0.12)"
                          />
                          <line
                            x1="34"
                            y1="92"
                            x2="86"
                            y2="92"
                            stroke="#ffb95f"
                            strokeDasharray="3 2"
                          />
                        </svg>
                        <span className="text-[10px] font-mono text-[#ffb95f] mt-1">
                          Pinggang: {client.lingkar_pinggang_awal_cm} cm
                        </span>
                      </>
                    )}
                  </div>
                  <div className="p-2.5 bg-[#191f2f]">
                    <p className="font-mono text-xs font-semibold text-white">
                      {client.berat_awal_kg} kg
                    </p>
                    <p className="text-[11px] text-[#bbcabf]">
                      Body Fat: {client.body_fat_awal_pct}%
                    </p>
                  </div>
                </div>

                {/* Week 8 Current Visual Card */}
                <div className="flex flex-col rounded-lg overflow-hidden bg-[#141b2b] border border-[#4edea3]/30">
                  <div className="relative h-44 w-full bg-gradient-to-b from-[#10b981]/15 to-[#0c1322] flex flex-col items-center justify-center p-3">
                    <span className="absolute top-2 left-2 bg-[#10b981] text-[#002113] font-mono text-[10px] px-2 py-0.5 rounded font-bold">
                      Mgg 8 (Kini)
                    </span>
                    {client.photos.find((p) => p.customImageUrl)?.customImageUrl ? (
                      <img
                        src={client.photos.find((p) => p.customImageUrl)?.customImageUrl}
                        alt="Foto progres fisik terbaru"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover rounded"
                      />
                    ) : (
                      <>
                        {/* Anatomical V-Taper Silhouette Week 8 */}
                        <svg
                          viewBox="0 0 120 140"
                          className="w-24 h-28 text-[#4edea3]"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <circle cx="60" cy="22" r="12" strokeOpacity="0.9" />
                          <path
                            d="M28 44 C28 37, 92 37, 92 44 L80 85 C78 96, 75 108, 74 125 L46 125 C45 108, 42 96, 40 85 Z"
                            fill="rgba(78,222,163,0.16)"
                          />
                          <line x1="52" y1="60" x2="68" y2="60" strokeOpacity="0.6" />
                          <line x1="53" y1="72" x2="67" y2="72" strokeOpacity="0.6" />
                          <line
                            x1="40"
                            y1="92"
                            x2="80"
                            y2="92"
                            stroke="#4edea3"
                            strokeDasharray="3 2"
                          />
                        </svg>
                        <span className="text-[10px] font-mono text-[#4edea3] mt-1">
                          Pinggang: {client.lingkar_pinggang_terkini_cm} cm
                        </span>
                      </>
                    )}
                  </div>
                  <div className="p-2.5 bg-[#191f2f]">
                    <p className="font-mono text-xs font-semibold text-[#4edea3]">
                      {client.berat_terkini_kg} kg ({weightDelta}kg)
                    </p>
                    <p className="text-[11px] text-[#4edea3]">
                      Body Fat: {client.body_fat_terkini_pct}% ({fatDelta}%)
                    </p>
                  </div>
                </div>
              </div>

              <label className="w-full min-h-[44px] bg-[#10b981] hover:bg-[#4edea3] text-[#002113] rounded-xl text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-transform active:scale-[0.98]">
                <Camera className="w-4 h-4" />
                <span>Unggah Foto Cek Berkala</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoInputChange}
                  className="hidden"
                />
              </label>
            </section>
          )}
        </div>
      </div>

      {/* Quick Log PR Modal */}
      {showAddPrModal && (
        <div className="fixed inset-0 z-50 bg-[#070e1d]/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#141b2b] border border-white/[0.12] rounded-2xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div>
                <h3 className="text-base font-semibold text-white">
                  Catat Rekor Beban Baru (PR)
                </h3>
                <p className="text-xs text-[#bbcabf]">
                  Kalkulasi otomatis Estimasi 1RM (Formula Epley)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddPrModal(false)}
                className="min-w-[40px] min-h-[40px] rounded-xl bg-[#232a3a] text-[#bbcabf] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePR} className="space-y-3.5">
              <div>
                <label className="block text-xs text-[#bbcabf] mb-1">Nama Gerakan</label>
                <input
                  type="text"
                  required
                  value={prExercise}
                  onChange={(e) => setPrExercise(e.target.value)}
                  className="w-full min-h-[44px] bg-[#070e1d] border border-white/[0.12] rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-xs text-[#bbcabf] mb-1">Beban (kg)</label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={prWeight}
                    onChange={(e) => setPrWeight(e.target.value)}
                    className="w-full min-h-[44px] bg-[#070e1d] border border-white/[0.12] rounded-xl px-3 py-2 text-xs font-mono text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#bbcabf] mb-1">Repetisi</label>
                  <input
                    type="number"
                    required
                    value={prReps}
                    onChange={(e) => setPrReps(e.target.value)}
                    className="w-full min-h-[44px] bg-[#070e1d] border border-white/[0.12] rounded-xl px-3 py-2 text-xs font-mono text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#bbcabf] mb-1">Selisih (+kg)</label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={prDelta}
                    onChange={(e) => setPrDelta(e.target.value)}
                    className="w-full min-h-[44px] bg-[#070e1d] border border-white/[0.12] rounded-xl px-3 py-2 text-xs font-mono text-[#4edea3]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-[#bbcabf] mb-1">Catatan Teknis</label>
                <input
                  type="text"
                  value={prNote}
                  onChange={(e) => setPrNote(e.target.value)}
                  className="w-full min-h-[44px] bg-[#070e1d] border border-white/[0.12] rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddPrModal(false)}
                  className="flex-1 min-h-[44px] rounded-xl bg-[#232a3a] text-xs font-semibold text-[#bbcabf]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 min-h-[44px] rounded-xl bg-[#10b981] text-[#002113] text-xs font-semibold"
                >
                  Simpan Rekor PR
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
