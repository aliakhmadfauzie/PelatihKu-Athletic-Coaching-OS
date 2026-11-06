import React, { useState, useEffect } from 'react';
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
  Copy,
  Send,
  X,
  Edit3,
  Trash2,
  ShieldCheck,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  Pencil,
  History
} from 'lucide-react';
import { PinChangeHistoryView } from './PinChangeHistoryView';
import { RescheduleApprovalBanner } from './RescheduleApprovalBanner';
import { BiometricTrendChart } from './BiometricTrendChart';
import { mustChangeClientPin } from '../services/authGatekeeperService';
import {
  generatePeriodizationPlan,
  analyzeMovementScreening,
  generateClientProgressReport,
  PeriodizationResult,
  ScreeningResult,
  ReportResult
} from '../services/geminiService';
import { ClientProfile, PRRecord, RescheduleRequest } from '../data/mockData';
import {
  UserRole,
  isCoachOrAdmin,
  deriveInitialPinFromPhone,
  getClientPin
} from '../services/authGatekeeperService';

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
  currentUserRole?: UserRole;
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
  onEditClient?: (clientId: string, payload: Partial<ClientProfile>) => void;
  onDeleteClient?: (clientId: string) => void;
  onOverlayChange?: (isOpen: boolean) => void;
  onOpenChangePin?: () => void;
  onApproveReschedule?: (request: RescheduleRequest, note?: string) => void;
  onRejectReschedule?: (request: RescheduleRequest, reason: string) => void;
  onCancelReschedule?: (request: RescheduleRequest) => void;
  onOpenReviewReschedule?: (request: RescheduleRequest) => void;
}

const DAY_LABELS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

export const ClientDetailView: React.FC<ClientDetailViewProps> = ({
  client,
  currentUserRole = 'coach',
  showFullSessionHistory,
  onToggleFullSessionHistory,
  onBackToDashboard,
  onOpenUpdateMetrics,
  onOpenLogSession,
  onOpenReschedule,
  onAddPR,
  onToggleNutritionDay,
  onUploadProgressPhoto,
  onUpdateMedicalAndBaseline,
  onEditClient,
  onDeleteClient,
  onOverlayChange,
  onOpenChangePin,
  onApproveReschedule,
  onRejectReschedule,
  onCancelReschedule,
  onOpenReviewReschedule
}) => {
  const [showDetailPin, setShowDetailPin] = useState(false);
  const [activeTab, setActiveTab] = useState<
    'overview' | 'baseline_medis' | 'pr' | 'sessions' | 'photos'
  >('overview');
  const [sessionFocusFilter, setSessionFocusFilter] = useState<string>('Semua');
  const [showAddPrModal, setShowAddPrModal] = useState(false);
  const [showEditClientModal, setShowEditClientModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);

  // Form states for Edit Client Profile
  const [editName, setEditName] = useState(client.nama_lengkap);
  const [editPhone, setEditPhone] = useState(client.telepon);
  const [editAge, setEditAge] = useState(String(client.usia));
  const [editGender, setEditGender] = useState<'Pria' | 'Wanita'>(client.gender);
  const [editOccupation, setEditOccupation] = useState(client.pekerjaan);
  const [editStatus, setEditStatus] = useState<'Aktif' | 'Cuti'>(client.status);
  const [editTargetCategory, setEditTargetCategory] = useState<
    'Fat Loss' | 'Hipertrofi' | 'Powerlifting'
  >(client.target_category);
  const [editTargetUtama, setEditTargetUtama] = useState(client.target_utama);
  const [editTargetWeight, setEditTargetWeight] = useState(String(client.berat_target_kg));
  const [editPaketTotal, setEditPaketTotal] = useState(String(client.paketTotal));
  const [editPaketTerpakai, setEditPaketTerpakai] = useState(String(client.paketTerpakai));
  const [editPhase, setEditPhase] = useState(client.phase);

  // Supervisor PIN visibility state (Coach & Admin access)
  const [showSupervisorPin, setShowSupervisorPin] = useState(true);
  const [pinCopied, setPinCopied] = useState(false);
  const latestClientPin =
    client.clientPin ||
    (client.telepon ? deriveInitialPinFromPhone(client.telepon) : undefined) ||
    getClientPin(client.id, client.telepon);
  const [editClientPin, setEditClientPin] = useState(latestClientPin);

  useEffect(() => {
    onOverlayChange?.(showAddPrModal || showEditClientModal || showDeleteConfirmModal);
    return () => {
      onOverlayChange?.(false);
    };
  }, [showAddPrModal, showEditClientModal, showDeleteConfirmModal, onOverlayChange]);

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

    // Sync Edit Profile form
    setEditName(client.nama_lengkap);
    setEditPhone(client.telepon);
    setEditAge(String(client.usia));
    setEditGender(client.gender);
    setEditOccupation(client.pekerjaan);
    setEditStatus(client.status);
    setEditTargetCategory(client.target_category);
    setEditTargetUtama(client.target_utama);
    setEditTargetWeight(String(client.berat_target_kg));
    setEditPaketTotal(String(client.paketTotal));
    setEditPaketTerpakai(String(client.paketTerpakai));
    setEditPhase(client.phase);
    setEditClientPin(
      client.clientPin ||
      (client.telepon ? deriveInitialPinFromPhone(client.telepon) : undefined) ||
      getClientPin(client.id, client.telepon)
    );

    // Sync persisted AI artifacts
    if (client.aiPeriodizationPlan) setAiPeriodization(client.aiPeriodizationPlan);
    if (client.aiScreeningAnalysis) setAiScreening(client.aiScreeningAnalysis);
    if (client.aiReportDraft) setAiReport(client.aiReportDraft);
  }, [client]);

  const handleSaveEditClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim() || !editPhone.trim()) return;

    const payload: Partial<ClientProfile> = {
      nama_lengkap: editName.trim(),
      telepon: editPhone.trim(),
      usia: Math.max(12, Math.min(90, parseInt(editAge, 10) || client.usia)),
      gender: editGender,
      pekerjaan: editOccupation.trim() || client.pekerjaan,
      target_category: editTargetCategory,
      target_utama: editTargetUtama.trim() || client.target_utama,
      berat_target_kg: parseFloat(editTargetWeight) || client.berat_target_kg
    };

    // Role-Based FLAC: Only Coach or Admin can modify quotas, status, and periodization phase
    if (isCoachOrAdmin(currentUserRole)) {
      payload.status = editStatus;
      payload.paketTotal = Math.max(1, parseInt(editPaketTotal, 10) || client.paketTotal);
      payload.paketTerpakai = Math.max(0, parseInt(editPaketTerpakai, 10) || client.paketTerpakai);
      payload.phase = editPhase.trim() || client.phase;
      if (editClientPin.trim().length >= 6) {
        payload.clientPin = editClientPin.trim();
        payload.mustChangePin = false;
      }
    }

    onEditClient?.(client.id, payload);
    setShowEditClientModal(false);
  };

  const handleConfirmDeleteClient = () => {
    if (!isCoachOrAdmin(currentUserRole)) return;
    setShowDeleteConfirmModal(false);
    setShowEditClientModal(false);
    onDeleteClient?.(client.id);
  };

  // AI Periodization & Screening State (Persisted)
  const [aiPeriodization, setAiPeriodization] = useState<PeriodizationResult | null>(
    () => client.aiPeriodizationPlan || null
  );
  const [aiScreening, setAiScreening] = useState<ScreeningResult | null>(
    () => client.aiScreeningAnalysis || null
  );
  const [aiReport, setAiReport] = useState<ReportResult | null>(
    () => client.aiReportDraft || null
  );
  const [loadingPeriodization, setLoadingPeriodization] = useState<boolean>(false);
  const [loadingScreening, setLoadingScreening] = useState<boolean>(false);
  const [loadingReport, setLoadingReport] = useState<boolean>(false);
  const [copiedTextType, setCopiedTextType] = useState<string | null>(null);

  const handleGenerateAiPeriodization = async () => {
    setLoadingPeriodization(true);
    try {
      const res = await generatePeriodizationPlan({
        clientName: client.nama_lengkap,
        age: client.usia,
        goal: client.target_utama,
        experienceLevel: client.phase,
        injuryHistory: medicalHistoryInput,
        sessionsPerWeek: 3,
        weeksCount: 4
      });
      setAiPeriodization(res);
      onEditClient?.(client.id, {
        aiPeriodizationPlan: {
          success: res.success,
          programTitle: res.programTitle,
          content: res.content,
          source: res.source,
          createdAt: new Date().toISOString()
        }
      });
    } finally {
      setLoadingPeriodization(false);
    }
  };

  const handleGenerateAiScreening = async () => {
    setLoadingScreening(true);
    try {
      const res = await analyzeMovementScreening({
        clientName: client.nama_lengkap,
        fmsScore: '14/21',
        postureNotes: postureScreeningInput,
        mobilityFlags: client.target_utama,
        priorInjuries: medicalHistoryInput
      });
      setAiScreening(res);
      onEditClient?.(client.id, {
        aiScreeningAnalysis: {
          success: res.success,
          clientName: res.clientName,
          analysis: res.analysis,
          source: res.source,
          createdAt: new Date().toISOString()
        }
      });
    } finally {
      setLoadingScreening(false);
    }
  };

  const handleGenerateAiReport = async () => {
    setLoadingReport(true);
    try {
      const prs = client.prList.slice(0, 3).map((p) => `${p.exerciseName} ${p.weightKg}kg`);
      const res = await generateClientProgressReport({
        clientName: client.nama_lengkap,
        sessionsCompleted: client.paketTerpakai,
        targetSessions: client.paketTotal,
        currentWeight: client.berat_terkini_kg,
        baselineWeight: client.berat_awal_kg,
        prMilestones: prs,
        coachNotes: client.nutritionCoachNote
      });
      setAiReport(res);
      onEditClient?.(client.id, {
        aiReportDraft: {
          success: res.success,
          whatsappMessage: res.whatsappMessage,
          source: res.source,
          createdAt: new Date().toISOString()
        }
      });
    } finally {
      setLoadingReport(false);
    }
  };

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedTextType(type);
      setTimeout(() => setCopiedTextType(null), 3000);
    } catch {
      // fallback
    }
  };

  // Add PR Form state
  const [prExercise, setPrExercise] = useState('Barbell Back Squat');
  const [prCategory, setPrCategory] = useState<'Free Weights' | 'Kabel/Mesin' | 'Kalistenik'>(
    'Free Weights'
  );
  const [prWeight, setPrWeight] = useState('115');
  const [prReps, setPrReps] = useState('5');
  const [prDelta, setPrDelta] = useState('5.0');
  const [prNote, setPrNote] = useState('Kedalaman paralel bersih, kecepatan konsentrik stabil');

  const remainingSessions = Math.max(0, (client.paketTotal || 0) - (client.paketTerpakai || 0));
  const packageProgressPct = (client.paketTotal || 0) > 0
    ? Math.min(100, Math.round(((client.paketTerpakai || 0) / client.paketTotal) * 100))
    : 0;

  // Biometric Deltas vs Baseline Week 1
  const weightDelta = +(client.berat_terkini_kg - client.berat_awal_kg).toFixed(1);
  const weightDeltaPct = (client.berat_awal_kg || 0) > 0
    ? ((weightDelta / client.berat_awal_kg) * 100).toFixed(1)
    : '0.0';
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

    const todayFormatted = new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(new Date());

    onAddPR({
      id: `pr-${Date.now()}`,
      exerciseName: prExercise.trim() || 'Barbell Squat',
      category: prCategory,
      weightKg: w,
      reps: r,
      est1RM,
      deltaKg: parseFloat(prDelta) || 2.5,
      achievedDate: todayFormatted,
      note: prNote.trim() || 'Form terverifikasi pelatih'
    });
    setShowAddPrModal(false);
  };

  const compressImageFile = (file: File, callback: (compressedDataUrl: string) => void) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_DIM = 800;
        let width = img.width;
        let height = img.height;
        if (width > height && width > MAX_DIM) {
          height = Math.round((height * MAX_DIM) / width);
          width = MAX_DIM;
        } else if (height > MAX_DIM) {
          width = Math.round((width * MAX_DIM) / height);
          height = MAX_DIM;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL('image/jpeg', 0.72);
        callback(compressed);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handlePhotoInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const currentWeekNum = client.weeklyTrend?.length || 8;
    const progressLabel = `Mgg ${currentWeekNum} Check-In`;
    if (!file) {
      onUploadProgressPhoto(progressLabel);
      return;
    }
    compressImageFile(file, (compressedDataUrl) => {
      onUploadProgressPhoto(progressLabel, compressedDataUrl);
    });
  };

  const handleBaselinePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    compressImageFile(file, (dataUrl) => {
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
    });
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

  // Dedicated Full Session History View (/member/[id]/sesi)
  if (showFullSessionHistory) {
    const filteredSessions = client.sessions.filter((s) =>
      sessionFocusFilter === 'Semua'
        ? true
        : s.focus.toLowerCase().includes(sessionFocusFilter.toLowerCase())
    );

    return (
      <div className="space-y-5">
        {/* Sub-header for /member/[id]/sesi */}
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

          {isCoachOrAdmin(currentUserRole) ? (
            <button
              type="button"
              onClick={onOpenLogSession}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-[#10b981] hover:bg-[#4edea3] text-[#002113] text-xs font-semibold flex items-center justify-center gap-1.5"
            >
              <Dumbbell className="w-4 h-4" />
              <span>+ Catat Sesi #{client.paketTerpakai + 1}</span>
            </button>
          ) : (
            <div className="px-3.5 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Log Terverifikasi Coach</span>
            </div>
          )}
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
            {isCoachOrAdmin(currentUserRole) && (
              <button
                type="button"
                onClick={onOpenLogSession}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-[#10b981] text-[#002113] text-xs font-semibold inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Catat Sesi Pertama</span>
              </button>
            )}
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
          className="min-h-[44px] px-4 py-2.5 rounded-2xl bg-[#111726]/80 backdrop-blur-xl hover:bg-white/[0.08] active:bg-white/[0.12] border border-white/[0.08] text-xs font-bold text-white flex items-center gap-2 transition-all active:scale-95 shadow-sm"
        >
          <ArrowLeft className="w-4 h-4 text-emerald-400" />
          <span>{currentUserRole === 'client' ? 'Kembali ke Beranda Saya' : 'Kembali ke Direktori Member'}</span>
        </button>

        <span className="text-xs font-mono text-emerald-400 bg-white/[0.04] px-3 py-1.5 rounded-full border border-white/[0.06] font-semibold">
          {client.code} · {client.phase}
        </span>
      </div>

      {/* 1. Header Profil Member & Quick Action Thumb Bar */}
      <section className="bg-[#111726]/80 backdrop-blur-2xl border border-white/[0.08] shadow-[0_12px_40px_rgba(0,0,0,0.5),inset_0_1px_0_0_rgba(255,255,255,0.06)] rounded-3xl p-4 sm:p-6 space-y-4">
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

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-mono text-[#ffb95f]">
              Sisa {remainingSessions} Sesi
            </span>
            {isCoachOrAdmin(currentUserRole) && (
              <button
                type="button"
                onClick={() => setShowEditClientModal(true)}
                className="min-h-[44px] px-3 py-1.5 rounded-xl bg-[#232a3a] hover:bg-[#323949] text-white text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 border border-white/[0.08]"
                title="Edit Data Member"
                aria-label="Edit Data Member"
              >
                <Edit3 className="w-3.5 h-3.5 text-[#4edea3]" />
                <span className="hidden sm:inline">Ubah Data</span>
              </button>
            )}
          </div>
        </div>

        {/* Supervisor Access: Latest Member PIN Banner (Coach & Admin Only) */}
        {isCoachOrAdmin(currentUserRole) && (
          <div className="bg-[#0b101c] border border-amber-500/30 rounded-xl px-3.5 py-2.5 flex items-center justify-between gap-3 shadow-inner">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0">
                <Lock className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] text-amber-400/90 font-bold uppercase tracking-wider">
                    PIN Akses Member Terkini
                  </span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono font-semibold">
                    Khusus Coach &amp; Admin
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-mono text-sm font-bold text-white tracking-widest">
                    {showSupervisorPin ? latestClientPin : '••••••••'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowSupervisorPin(!showSupervisorPin)}
                    className="text-[11px] text-neutral-400 hover:text-white transition underline"
                  >
                    {showSupervisorPin ? 'Sembunyikan' : 'Tampilkan'}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText(latestClientPin);
                setPinCopied(true);
                setTimeout(() => setPinCopied(false), 2000);
              }}
              className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#191f2f] hover:bg-[#232a3a] border border-white/[0.08] text-amber-400 hover:text-amber-300 text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 shrink-0"
              title="Salin PIN Akses Member"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{pinCopied ? 'Tersalin!' : 'Salin PIN'}</span>
            </button>
          </div>
        )}

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
                Lead Coach: <strong className="text-[#dce2f7]">{client.leadCoach || 'Panji Akbar Syamsi'}</strong>
              </span>
              <span>Status: {client.status}</span>
            </div>
          </div>
        </div>

        {/* Reschedule Approval Matrix Banner (If pending request exists) */}
        {client.pendingReschedule && onApproveReschedule && onRejectReschedule && onCancelReschedule && (
          <RescheduleApprovalBanner
            request={client.pendingReschedule}
            currentUserRole={currentUserRole}
            onApprove={onApproveReschedule}
            onReject={onRejectReschedule}
            onCancel={onCancelReschedule}
            onOpenReview={onOpenReviewReschedule}
          />
        )}

        {/* Next Session Card with Quick Reschedule Trigger */}
        <div className="bg-[#070e1d] border border-white/[0.08] rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <span className="text-[11px] text-[#86948a] block">
              Jadwal Sesi Terdekat (#{client.paketTerpakai + 1})
            </span>
            <p className="text-xs font-semibold text-white">
              {client.nextSession?.focus || 'Sesi Personal Training & Movement'}
            </p>
            <p className="text-xs text-[#bbcabf] flex items-center gap-2 flex-wrap">
              <span className="font-mono text-[#4edea3]">
                {client.nextSession?.date || 'Belum Dijadwalkan'} · {client.nextSession?.time || '--:--'} WIB
              </span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1">
                <MapPin className="w-3 h-3 text-[#06b6d4]" />
                {client.nextSession?.location || 'Gym Utama Senayan'}
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
          {isCoachOrAdmin(currentUserRole) ? (
            <>
              <button
                type="button"
                onClick={onOpenUpdateMetrics}
                className="col-span-5 min-h-[48px] bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-transform shadow-md shadow-emerald-500/20"
              >
                <Scale className="w-4 h-4" />
                <span>Update Metrik &amp; Timbang</span>
              </button>
              <button
                type="button"
                onClick={onOpenLogSession}
                className="col-span-5 min-h-[48px] bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] text-white rounded-2xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
              >
                <Dumbbell className="w-4 h-4 text-emerald-400" />
                <span>Catat Sesi #{client.paketTerpakai + 1}</span>
              </button>
              <a
                href={`https://wa.me/${client.telepon.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Chat WhatsApp Member"
                className="col-span-2 min-h-[48px] bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] text-emerald-400 rounded-2xl flex items-center justify-center active:scale-95 transition-transform"
              >
                <MessageCircle className="w-5 h-5" />
              </a>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onOpenChangePin}
                className="col-span-6 min-h-[48px] bg-[#162032] hover:bg-[#202d44] border border-blue-500/30 text-blue-300 rounded-2xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-sm"
              >
                <KeyRound className="w-4 h-4 text-blue-400" />
                <span>Ubah PIN Akses</span>
              </button>
              <a
                href={`https://wa.me/628119876543?text=${encodeURIComponent(`Halo Coach Panji, saya ${client.nama_lengkap} ingin konsultasi jadwal / program latihan.`)}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Chat WhatsApp Coach Panji"
                className="col-span-6 min-h-[48px] bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-md shadow-emerald-500/20"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Chat Coach Panji</span>
              </a>
            </>
          )}
        </div>
      </section>

      {/* 2. Segmented Navigation Tabs (Functional Filter Controls) */}
      <div className="flex items-center gap-2 p-1.5 bg-[#0c1322]/85 backdrop-blur-2xl border border-white/[0.08] rounded-2xl overflow-x-auto no-scrollbar select-none touch-pan-x shadow-sm">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 active:scale-95 ${
            activeTab === 'overview'
              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
              : 'text-neutral-400 hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Overview &amp; Metrik</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('baseline_medis')}
          className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 active:scale-95 ${
            activeTab === 'baseline_medis'
              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
              : 'text-neutral-400 hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <HeartPulse className="w-3.5 h-3.5" />
          <span>Data Medis &amp; PAR-Q</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('pr')}
          className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 active:scale-95 ${
            activeTab === 'pr'
              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
              : 'text-neutral-400 hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <Award className="w-3.5 h-3.5" />
          <span>Papan PR ({client.prList.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('sessions')}
          className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 active:scale-95 ${
            activeTab === 'sessions'
              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
              : 'text-neutral-400 hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <Dumbbell className="w-3.5 h-3.5" />
          <span>Log Sesi ({client.sessions.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('photos')}
          className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 active:scale-95 ${
            activeTab === 'photos'
              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
              : 'text-neutral-400 hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <Camera className="w-3.5 h-3.5" />
          <span>Foto Fisik ({client.photos.length})</span>
        </button>
      </div>

      {/* Dedicated Tab View: Data Medis Lanjut & Riwayat Progres Awal */}
      {activeTab === 'baseline_medis' && (
        <form onSubmit={handleSaveMedicalAndBaselineForm} className="space-y-5">
          {/* Top Callout Banner */}
          <div className="bg-gradient-to-r from-emerald-500/15 via-[#111726]/85 to-[#111726]/85 backdrop-blur-xl border border-emerald-500/30 rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-[0_4px_24px_rgba(0,0,0,0.35),inset_0_1px_0_0_rgba(255,255,255,0.06)]">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
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
            {isCoachOrAdmin(currentUserRole) ? (
              <button
                type="submit"
                className="min-h-[44px] px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shrink-0 shadow-md shadow-emerald-500/20 active:scale-95 transition"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Perubahan Data</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-neutral-400">
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                <span>Diverifikasi oleh Lead Coach</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Left Column: Custom Macronutrients & Detailed Diet Protocol */}
            <div className="lg:col-span-7 space-y-5">
              {/* Card A: Target Makronutrisi Harian yang Disesuaikan */}
              <section className="bg-[#111726]/85 backdrop-blur-xl border border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.35),inset_0_1px_0_0_rgba(255,255,255,0.06)] rounded-3xl p-4 sm:p-5 space-y-4">
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
              <section className="bg-[#111726]/85 backdrop-blur-xl border border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.35),inset_0_1px_0_0_rgba(255,255,255,0.06)] rounded-3xl p-4 sm:p-5 space-y-4">
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
                    Rekam Medis Member
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-white mb-1">
                    Riwayat Medis, Cedera Sendi &amp; Kesiapan Fisik (PAR-Q)
                    {!isCoachOrAdmin(currentUserRole) && (
                      <span className="text-[10px] text-amber-400 font-normal ml-1.5">(Terkunci / Coach Only)</span>
                    )}
                  </label>
                  <textarea
                    rows={3}
                    disabled={!isCoachOrAdmin(currentUserRole)}
                    value={medicalHistoryInput}
                    onChange={(e) => setMedicalHistoryInput(e.target.value)}
                    placeholder="Contoh: Riwayat HNP ringan L4-L5, bahu kanan impingement saat tekan vertikal, tekanan darah istirahat, kualitas tidur..."
                    className="w-full bg-[#070e1d] disabled:opacity-60 disabled:cursor-not-allowed border border-white/[0.1] rounded-xl p-3 text-xs text-white placeholder-[#86948a] focus:outline-none focus:border-[#4edea3] resize-none leading-relaxed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-white mb-1">
                    Hasil Movement Screening &amp; Koreksi Postur Awal
                    {!isCoachOrAdmin(currentUserRole) && (
                      <span className="text-[10px] text-amber-400 font-normal ml-1.5">(Terkunci / Coach Only)</span>
                    )}
                  </label>
                  <textarea
                    rows={2}
                    disabled={!isCoachOrAdmin(currentUserRole)}
                    value={postureScreeningInput}
                    onChange={(e) => setPostureScreeningInput(e.target.value)}
                    placeholder="Contoh: Overhead squat assessment, mobilitas ankle/hip, aktivasi glute & koreksi postur..."
                    className="w-full bg-[#070e1d] disabled:opacity-60 disabled:cursor-not-allowed border border-white/[0.1] rounded-xl p-3 text-xs text-white placeholder-[#86948a] focus:outline-none focus:border-[#4edea3] resize-none leading-relaxed"
                  />
                </div>
              </section>

              {/* Card B.2: Gemini AI Sports Science & Periodization Assistant (Coach/Admin Only) */}
              {isCoachOrAdmin(currentUserRole) && (
                <section className="bg-[#111726]/90 backdrop-blur-xl border border-emerald-500/30 shadow-[0_4px_24px_rgba(16,185,129,0.1),inset_0_1px_0_0_rgba(255,255,255,0.08)] rounded-3xl p-4 sm:p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white flex items-center gap-2">
                          <span>Gemini AI Sports Science Assistant</span>
                          <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold">
                            PAS AI Engine
                          </span>
                        </h4>
                        <p className="text-[11px] text-[#bbcabf]">
                          Sintesis periodisasi program, analisis screening FMS, dan draf laporan progres
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 3 Quick Generator Buttons */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={handleGenerateAiScreening}
                      disabled={loadingScreening}
                      className="min-h-[52px] p-3 rounded-2xl bg-[#0a101d]/90 hover:bg-[#162035] border border-white/[0.08] hover:border-emerald-500/40 text-left transition active:scale-95 disabled:opacity-50"
                    >
                      <div className="flex items-center gap-2 text-xs font-bold text-white">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>{loadingScreening ? 'Menganalisis...' : 'Analisis FMS'}</span>
                      </div>
                      <p className="text-[10px] text-neutral-400 mt-1">
                        Korektif postur, kontraindikasi, &amp; regresi
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={handleGenerateAiPeriodization}
                      disabled={loadingPeriodization}
                      className="min-h-[52px] p-3 rounded-2xl bg-[#0a101d]/90 hover:bg-[#162035] border border-white/[0.08] hover:border-emerald-500/40 text-left transition active:scale-95 disabled:opacity-50"
                    >
                      <div className="flex items-center gap-2 text-xs font-bold text-white">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>{loadingPeriodization ? 'Menyusun...' : 'Periodisasi 4 Mgg'}</span>
                      </div>
                      <p className="text-[10px] text-neutral-400 mt-1">
                        Blok latihan volume, overload, &amp; deload
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={handleGenerateAiReport}
                      disabled={loadingReport}
                      className="min-h-[52px] p-3 rounded-2xl bg-[#0a101d]/90 hover:bg-[#162035] border border-white/[0.08] hover:border-emerald-500/40 text-left transition active:scale-95 disabled:opacity-50"
                    >
                      <div className="flex items-center gap-2 text-xs font-bold text-white">
                        <MessageCircle className="w-3.5 h-3.5 text-[#06b6d4] shrink-0" />
                        <span>{loadingReport ? 'Menyusun...' : 'Draf WhatsApp'}</span>
                      </div>
                      <p className="text-[10px] text-neutral-400 mt-1">
                        Format laporan apresiasi progres member
                      </p>
                    </button>
                  </div>

                  {/* AI Screening Result */}
                  {aiScreening && (
                    <div className="bg-[#070e1d] border border-emerald-500/30 rounded-2xl p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5" />
                          Hasil Analisis Movement Screening &amp; Mobilitas
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-mono text-neutral-400">
                            {aiScreening.source}
                          </span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(aiScreening.analysis, 'screening')}
                            className="min-h-[36px] px-3 py-1.5 rounded-xl bg-[#191f2f] text-xs text-white hover:text-emerald-400 flex items-center gap-1.5 transition active:scale-95"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            <span>{copiedTextType === 'screening' ? 'Tersalin!' : 'Salin'}</span>
                          </button>
                        </div>
                      </div>
                      <div className="text-xs text-[#bbcabf] whitespace-pre-line leading-relaxed max-h-60 overflow-y-auto pr-1">
                        {aiScreening.analysis}
                      </div>
                    </div>
                  )}

                  {/* AI Periodization Result */}
                  {aiPeriodization && (
                    <div className="bg-[#070e1d] border border-amber-500/30 rounded-2xl p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5" />
                          {aiPeriodization.programTitle}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-mono text-neutral-400">
                            {aiPeriodization.source}
                          </span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(aiPeriodization.content, 'periodization')}
                            className="min-h-[36px] px-3 py-1.5 rounded-xl bg-[#191f2f] text-xs text-white hover:text-amber-400 flex items-center gap-1.5 transition active:scale-95"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            <span>{copiedTextType === 'periodization' ? 'Tersalin!' : 'Salin'}</span>
                          </button>
                        </div>
                      </div>
                      <div className="text-xs text-[#bbcabf] whitespace-pre-line leading-relaxed max-h-60 overflow-y-auto pr-1">
                        {aiPeriodization.content}
                      </div>
                    </div>
                  )}

                  {/* AI WhatsApp Report Result */}
                  {aiReport && (
                    <div className="bg-[#070e1d] border border-[#06b6d4]/30 rounded-2xl p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#06b6d4] flex items-center gap-1.5">
                          <MessageCircle className="w-3.5 h-3.5" />
                          Draf Laporan WhatsApp Member
                        </span>
                        <span className="text-[10px] font-mono text-neutral-400">
                          {aiReport.source}
                        </span>
                      </div>
                      <div className="text-xs text-[#bbcabf] whitespace-pre-line leading-relaxed max-h-60 overflow-y-auto bg-[#141b2b] p-3 rounded-xl border border-white/[0.04] font-mono">
                        {aiReport.whatsappMessage}
                      </div>
                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => copyToClipboard(aiReport.whatsappMessage, 'report')}
                          className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#191f2f] hover:bg-[#232a3a] text-xs font-semibold text-white flex items-center gap-1.5 transition active:scale-95"
                        >
                          <Copy className="w-4 h-4" />
                          <span>{copiedTextType === 'report' ? 'Tersalin!' : 'Salin Pesan'}</span>
                        </button>
                        <a
                          href={`https://wa.me/${client.telepon.replace(/\D/g, '')}?text=${encodeURIComponent(aiReport.whatsappMessage)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="min-h-[44px] px-4 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-[#25D366]/20 transition active:scale-95"
                        >
                          <Send className="w-4 h-4" />
                          <span>Kirim via WhatsApp</span>
                        </a>
                      </div>
                    </div>
                  )}
                </section>
              )}
            </div>

            {/* Right Column: Riwayat Progres Awal (Baseline Mgg 1) & Foto Kondisi Fisik Awal */}
            <div className="lg:col-span-5 space-y-5">
              {/* Card C: Foto Kondisi Fisik Awal (Referensi Jangka Panjang) */}
              <section className="bg-[#111726]/85 backdrop-blur-xl border border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.35),inset_0_1px_0_0_rgba(255,255,255,0.06)] rounded-3xl p-4 sm:p-5 space-y-4">
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
                        Unggah foto postur awal member untuk disandingkan otomatis dengan foto progres Minggu 8.
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

                {isCoachOrAdmin(currentUserRole) ? (
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
                ) : (
                  <div className="w-full min-h-[44px] bg-[#191f2f]/80 border border-white/[0.08] text-neutral-400 rounded-xl text-xs font-semibold flex items-center justify-center gap-2">
                    <Lock className="w-4 h-4 text-emerald-400" />
                    <span>Foto Kondisi Fisik Awal Diverifikasi oleh Pelatih</span>
                  </div>
                )}
              </section>

              {/* Card D: Kalibrasi Riwayat Progres Awal (Minggu 1 Baseline Metrics) */}
              <section className="bg-[#111726]/85 backdrop-blur-xl border border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.35),inset_0_1px_0_0_rgba(255,255,255,0.06)] rounded-3xl p-4 sm:p-5 space-y-3.5">
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#06b6d4]" />
                    <div>
                      <h4 className="text-sm font-bold text-white">
                        Kalibrasi Angka Baseline Awal (Minggu 1)
                      </h4>
                      <p className="text-[11px] text-[#bbcabf]">
                        Data titik nol untuk perhitungan selisih progres
                        {!isCoachOrAdmin(currentUserRole) && (
                          <span className="text-amber-400 ml-1">(Read-Only Member)</span>
                        )}
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
                      disabled={!isCoachOrAdmin(currentUserRole)}
                      value={beratAwalInput}
                      onChange={(e) => setBeratAwalInput(e.target.value)}
                      className="w-full bg-[#070e1d] disabled:opacity-60 disabled:cursor-not-allowed border border-white/[0.1] rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#4edea3]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-[#bbcabf] mb-1">
                      Target Berat Program (kg)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      disabled={!isCoachOrAdmin(currentUserRole)}
                      value={beratTargetInput}
                      onChange={(e) => setBeratTargetInput(e.target.value)}
                      className="w-full bg-[#070e1d] disabled:opacity-60 disabled:cursor-not-allowed border border-white/[0.1] rounded-xl px-3 py-2 text-xs font-mono text-[#4edea3] focus:outline-none focus:border-[#4edea3]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-[#bbcabf] mb-1">
                      Body Fat Awal (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      disabled={!isCoachOrAdmin(currentUserRole)}
                      value={bfAwalInput}
                      onChange={(e) => setBfAwalInput(e.target.value)}
                      className="w-full bg-[#070e1d] disabled:opacity-60 disabled:cursor-not-allowed border border-white/[0.1] rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#4edea3]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-[#bbcabf] mb-1">
                      Lingkar Pinggang Awal (cm)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      disabled={!isCoachOrAdmin(currentUserRole)}
                      value={pinggangAwalInput}
                      onChange={(e) => setPinggangAwalInput(e.target.value)}
                      className="w-full bg-[#070e1d] disabled:opacity-60 disabled:cursor-not-allowed border border-white/[0.1] rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#4edea3]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-[#bbcabf] mb-1">
                      Lingkar Dada Awal (cm)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      disabled={!isCoachOrAdmin(currentUserRole)}
                      value={dadaAwalInput}
                      onChange={(e) => setDadaAwalInput(e.target.value)}
                      className="w-full bg-[#070e1d] disabled:opacity-60 disabled:cursor-not-allowed border border-white/[0.1] rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#4edea3]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-[#bbcabf] mb-1">
                      Lingkar Lengan Awal (cm)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      disabled={!isCoachOrAdmin(currentUserRole)}
                      value={lenganAwalInput}
                      onChange={(e) => setLenganAwalInput(e.target.value)}
                      className="w-full bg-[#070e1d] disabled:opacity-60 disabled:cursor-not-allowed border border-white/[0.1] rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#4edea3]"
                    />
                  </div>
                </div>

                {isCoachOrAdmin(currentUserRole) && (
                  <button
                    type="submit"
                    className="w-full min-h-[44px] bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20 active:scale-[0.98] transition"
                  >
                    <Save className="w-4 h-4" />
                    <span>Simpan Semua Data Medis &amp; Baseline Awal</span>
                  </button>
                )}
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
              <div className="bg-[#111726]/85 backdrop-blur-xl border border-white/[0.08] shadow-[0_4px_20px_rgba(0,0,0,0.35),inset_0_1px_0_0_rgba(255,255,255,0.06)] p-4 rounded-2xl flex flex-col justify-between active:scale-[0.99] transition-transform">
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
              <div className="bg-[#111726]/85 backdrop-blur-xl border border-white/[0.08] shadow-[0_4px_20px_rgba(0,0,0,0.35),inset_0_1px_0_0_rgba(255,255,255,0.06)] p-4 rounded-2xl flex flex-col justify-between active:scale-[0.99] transition-transform">
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
              <div className="bg-[#111726]/85 backdrop-blur-xl border border-white/[0.08] shadow-[0_4px_20px_rgba(0,0,0,0.35),inset_0_1px_0_0_rgba(255,255,255,0.06)] p-4 rounded-2xl flex flex-col justify-between active:scale-[0.99] transition-transform">
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
              <div className="bg-[#111726]/85 backdrop-blur-xl border border-white/[0.08] shadow-[0_4px_20px_rgba(0,0,0,0.35),inset_0_1px_0_0_rgba(255,255,255,0.06)] p-4 rounded-2xl flex flex-col justify-between active:scale-[0.99] transition-transform">
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

          {/* 4. Grafik Tren Komposisi Tubuh Terkalibrasi */}
          {activeTab === 'overview' && (
            <BiometricTrendChart
              client={client}
              currentUserRole={currentUserRole}
              onOpenUpdateMetrics={onOpenUpdateMetrics}
            />
          )}

          {/* 5. Kepatuhan Nutrisi 7 Hari */}
          {activeTab === 'overview' && (
            <section className="bg-[#111726]/85 backdrop-blur-xl border border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.35),inset_0_1px_0_0_rgba(255,255,255,0.06)] rounded-3xl p-4 sm:p-5 space-y-4">
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
                      className="min-h-[48px] flex flex-col items-center justify-center gap-1.5 p-1.5 rounded-2xl hover:bg-[#232a3a]/60 active:scale-95 transition-all"
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
            <section className="bg-[#111726]/85 backdrop-blur-xl border border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.35),inset_0_1px_0_0_rgba(255,255,255,0.06)] rounded-3xl p-4 sm:p-5 space-y-3.5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    Papan Rekor Beban (PR)
                  </h3>
                  <p className="text-xs text-[#bbcabf]">
                    Angkatan Utama Teruji &amp; Estimasi 1RM
                  </p>
                </div>
                {isCoachOrAdmin(currentUserRole) && (
                  <button
                    type="button"
                    onClick={() => setShowAddPrModal(true)}
                    className="min-h-[44px] px-3.5 py-2 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition active:scale-95"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Log PR</span>
                  </button>
                )}
              </div>

              {client.prList.length === 0 ? (
                <div className="p-6 rounded-xl bg-[#191f2f] text-center space-y-2">
                  <p className="text-xs text-[#bbcabf]">Belum ada rekor PR tercatat.</p>
                  {isCoachOrAdmin(currentUserRole) && (
                    <button
                      type="button"
                      onClick={() => setShowAddPrModal(true)}
                      className="min-h-[44px] px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 text-xs font-bold shadow-md shadow-emerald-500/20 active:scale-95 transition"
                    >
                      + Tambah Rekor Pertama
                    </button>
                  )}
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
            <section className="bg-[#111726]/85 backdrop-blur-xl border border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.35),inset_0_1px_0_0_rgba(255,255,255,0.06)] rounded-3xl p-4 sm:p-5 space-y-3.5">
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
                  {isCoachOrAdmin(currentUserRole) && (
                    <button
                      type="button"
                      onClick={onOpenLogSession}
                      className="min-h-[44px] px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 text-xs font-bold shadow-md shadow-emerald-500/20 active:scale-95 transition"
                    >
                      Catat Sesi Sekarang
                    </button>
                  )}
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
                className="w-full min-h-[48px] bg-[#1a2336] hover:bg-[#232f48] border border-white/[0.08] text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
              >
                <span>Lihat Semua Riwayat Sesi Lengkap</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </section>
          )}

          {/* 8. Dokumentasi Progres Fisik (Side-by-Side Comparison without fragile external URLs) */}
          {(activeTab === 'overview' || activeTab === 'photos') && (
            <section className="bg-[#111726]/85 backdrop-blur-xl border border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.35),inset_0_1px_0_0_rgba(255,255,255,0.06)] rounded-3xl p-4 sm:p-5 space-y-3.5">
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
                    {[...client.photos].reverse().find((p) => p.customImageUrl)?.customImageUrl ? (
                      <img
                        src={[...client.photos].reverse().find((p) => p.customImageUrl)?.customImageUrl}
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

              <label className="w-full min-h-[48px] bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-emerald-500/20 transition active:scale-[0.98]">
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

          {/* 9. Keamanan Kredensial & Riwayat Perubahan PIN (Visible to Member, Coach, and Admin) */}
          <section className="bg-[#111726]/85 backdrop-blur-xl border border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.35),inset_0_1px_0_0_rgba(255,255,255,0.06)] rounded-3xl p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    Keamanan &amp; Kredensial PIN Akses
                  </h3>
                  <p className="text-xs text-[#bbcabf]">
                    Kredensial login portal atlet PelatihKu
                  </p>
                </div>
              </div>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                  mustChangeClientPin(client.id)
                    ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                    : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                }`}
              >
                {mustChangeClientPin(client.id) ? 'PIN Bawaan' : 'PIN Kustom Aktif'}
              </span>
            </div>

            <div className="bg-[#070e1d] border border-white/[0.06] rounded-xl p-3 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-neutral-400 block font-medium">PIN Akses Member</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-mono text-base font-bold text-white tracking-widest">
                    {showDetailPin
                      ? client.clientPin || getClientPin(client.id, client.telepon)
                      : '••••••••'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowDetailPin(!showDetailPin)}
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/[0.08] transition active:scale-95"
                    title={showDetailPin ? 'Sembunyikan PIN' : 'Tampilkan PIN'}
                  >
                    {showDetailPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={onOpenChangePin}
                className="min-h-[44px] px-3.5 py-2 rounded-xl bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 text-blue-300 text-xs font-semibold flex items-center gap-1.5 active:scale-95 transition"
                title="Buka form ubah PIN"
              >
                <Pencil className="w-3.5 h-3.5 text-blue-400" />
                <span>Ubah PIN</span>
              </button>
            </div>

            {/* Riwayat Perubahan PIN (Audit Trail) */}
            <PinChangeHistoryView history={client.pinChangeHistory} clientId={client.id} compact />
          </section>
        </div>
      </div>

      {/* Quick Log PR Modal */}
      {showAddPrModal && (
        <div className="fixed inset-0 z-50 bg-[#070e1d]/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#111726]/95 backdrop-blur-2xl border border-white/[0.12] rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xl">
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
                className="w-11 h-11 rounded-2xl bg-white/[0.06] border border-white/[0.1] text-neutral-400 hover:text-white flex items-center justify-center active:scale-95 transition"
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
                  className="flex-1 min-h-[44px] rounded-xl bg-[#232a3a] text-xs font-semibold text-[#bbcabf] hover:text-white active:scale-95 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 min-h-[44px] rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20 active:scale-95 transition"
                >
                  Simpan Rekor PR
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit Profil Member */}
      {showEditClientModal && (
        <div className="fixed inset-0 z-50 bg-[#070e1d]/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-lg max-h-[92vh] bg-[#111726]/95 backdrop-blur-2xl border border-white/[0.12] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden"
          >
            <div className="w-10 h-1 rounded-full bg-[#2e3545] mx-auto mt-3 sm:hidden" />

            <div className="px-5 py-4 border-b border-white/[0.08] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">
                    Ubah Data &amp; Profil Member
                  </h3>
                  <p className="text-xs text-[#bbcabf]">
                    {client.nama_lengkap} · {client.code}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEditClientModal(false)}
                className="w-11 h-11 rounded-2xl bg-white/[0.06] border border-white/[0.1] text-neutral-400 hover:text-white flex items-center justify-center active:scale-95 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditClient} className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[#bbcabf] mb-1">Nama Lengkap *</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full min-h-[44px] bg-[#070e1d] border border-white/[0.12] rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#bbcabf] mb-1">Nomor WhatsApp *</label>
                  <input
                    type="tel"
                    required
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full min-h-[44px] bg-[#070e1d] border border-white/[0.12] rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-xs text-[#bbcabf] mb-1">Usia (Tahun)</label>
                  <input
                    type="number"
                    min="14"
                    max="85"
                    value={editAge}
                    onChange={(e) => setEditAge(e.target.value)}
                    className="w-full min-h-[44px] bg-[#070e1d] border border-white/[0.12] rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#bbcabf] mb-1">Jenis Kelamin</label>
                  <select
                    value={editGender}
                    onChange={(e) => setEditGender(e.target.value as 'Pria' | 'Wanita')}
                    className="w-full min-h-[44px] bg-[#070e1d] border border-white/[0.12] rounded-xl px-2 py-2 text-xs text-white"
                  >
                    <option value="Pria">Pria</option>
                    <option value="Wanita">Wanita</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-[#bbcabf] mb-1">Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as 'Aktif' | 'Cuti')}
                    className="w-full min-h-[44px] bg-[#070e1d] border border-white/[0.12] rounded-xl px-2 py-2 text-xs text-white"
                  >
                    <option value="Aktif">Aktif</option>
                    <option value="Cuti">Cuti</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs text-[#bbcabf] mb-1">Pekerjaan / Mobilitas</label>
                <input
                  type="text"
                  value={editOccupation}
                  onChange={(e) => setEditOccupation(e.target.value)}
                  className="w-full min-h-[44px] bg-[#070e1d] border border-white/[0.12] rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[#bbcabf] mb-1">Kategori Program</label>
                  <select
                    value={editTargetCategory}
                    onChange={(e) => setEditTargetCategory(e.target.value as any)}
                    className="w-full min-h-[44px] bg-[#070e1d] border border-white/[0.12] rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="Fat Loss">Fat Loss (Defisit &amp; Conditioning)</option>
                    <option value="Hipertrofi">Hipertrofi (Massa Otot &amp; Volume)</option>
                    <option value="Powerlifting">Powerlifting &amp; Strength (SBD 1RM)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-[#bbcabf] mb-1">Target Berat Badan (kg)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={editTargetWeight}
                    onChange={(e) => setEditTargetWeight(e.target.value)}
                    className="w-full min-h-[44px] bg-[#070e1d] border border-white/[0.12] rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-[#bbcabf] mb-1">Target Utama (Deskripsi)</label>
                <input
                  type="text"
                  value={editTargetUtama}
                  onChange={(e) => setEditTargetUtama(e.target.value)}
                  className="w-full min-h-[44px] bg-[#070e1d] border border-white/[0.12] rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-xs text-[#bbcabf] mb-1">
                    Total Paket Sesi
                    {!isCoachOrAdmin(currentUserRole) && (
                      <span className="text-[10px] text-amber-400 block font-normal">(Coach/Admin)</span>
                    )}
                  </label>
                  <input
                    type="number"
                    min="1"
                    disabled={!isCoachOrAdmin(currentUserRole)}
                    value={editPaketTotal}
                    onChange={(e) => setEditPaketTotal(e.target.value)}
                    className="w-full min-h-[44px] bg-[#070e1d] disabled:opacity-60 disabled:cursor-not-allowed border border-white/[0.12] rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#bbcabf] mb-1">
                    Sesi Terpakai
                    {!isCoachOrAdmin(currentUserRole) && (
                      <span className="text-[10px] text-amber-400 block font-normal">(Coach/Admin)</span>
                    )}
                  </label>
                  <input
                    type="number"
                    min="0"
                    disabled={!isCoachOrAdmin(currentUserRole)}
                    value={editPaketTerpakai}
                    onChange={(e) => setEditPaketTerpakai(e.target.value)}
                    className="w-full min-h-[44px] bg-[#070e1d] disabled:opacity-60 disabled:cursor-not-allowed border border-white/[0.12] rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#bbcabf] mb-1">
                    Fase Periodisasi
                    {!isCoachOrAdmin(currentUserRole) && (
                      <span className="text-[10px] text-amber-400 block font-normal">(Coach/Admin)</span>
                    )}
                  </label>
                  <input
                    type="text"
                    disabled={!isCoachOrAdmin(currentUserRole)}
                    value={editPhase}
                    onChange={(e) => setEditPhase(e.target.value)}
                    className="w-full min-h-[44px] bg-[#070e1d] disabled:opacity-60 disabled:cursor-not-allowed border border-white/[0.12] rounded-xl px-2 py-2 text-xs text-white"
                  />
                </div>
              </div>

              {/* Supervisor PIN Reset Field */}
              {isCoachOrAdmin(currentUserRole) && (
                <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-amber-400">
                      PIN Akses Member Terkini (Otoritas Supervisor)
                    </label>
                    <span className="text-[10px] text-amber-300 font-mono">
                      6–8 Digit
                    </span>
                  </div>
                  <input
                    type="text"
                    maxLength={8}
                    value={editClientPin}
                    onChange={(e) => setEditClientPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
                    placeholder="Masukkan PIN baru jika ingin mereset"
                    className="w-full min-h-[44px] bg-[#070e1d] border border-amber-500/40 rounded-xl px-3 py-2 text-xs font-mono font-bold text-white tracking-widest focus:outline-none focus:border-amber-400"
                  />
                  <p className="text-[10px] text-[#bbcabf]">
                    PIN aktif saat ini: <strong className="text-white font-mono">{latestClientPin}</strong>
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-4 border-t border-white/[0.08] flex items-center justify-between gap-2.5">
                {isCoachOrAdmin(currentUserRole) ? (
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirmModal(true)}
                    className="min-h-[44px] px-3.5 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-400 text-xs font-semibold flex items-center gap-1.5 transition active:scale-95"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus Member</span>
                  </button>
                ) : (
                  <div className="text-[11px] text-neutral-400 flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Role Member: Akses Terbatas</span>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowEditClientModal(false)}
                    className="min-h-[44px] px-4 py-2 rounded-xl bg-[#232a3a] text-xs font-semibold text-[#bbcabf] hover:text-white"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="min-h-[44px] px-4 py-2 rounded-xl bg-[#10b981] hover:bg-[#4edea3] text-[#002113] text-xs font-bold flex items-center gap-1.5 shadow-md shadow-[#10b981]/20 active:scale-95 transition"
                  >
                    <Save className="w-4 h-4" />
                    <span>Simpan Perubahan</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus Member */}
      {showDeleteConfirmModal && (
        <div className="fixed inset-0 z-[60] bg-[#070e1d]/90 backdrop-blur-md flex items-center justify-center p-4">
          <div
            role="alertdialog"
            aria-modal="true"
            className="w-full max-w-md bg-[#111726]/95 backdrop-blur-2xl border border-rose-500/40 rounded-3xl p-6 shadow-2xl space-y-4"
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/30">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-base font-bold text-white">
                Hapus Member &quot;{client.nama_lengkap}&quot;?
              </h3>
              <p className="text-xs text-[#bbcabf] leading-relaxed">
                Tindakan ini permanen. Profil member beserta seluruh riwayat sesi latihan, catatan PR, dan metrik komposisi tubuh akan dihapus dari Cloud Firestore dan live app.
              </p>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirmModal(false)}
                className="flex-1 min-h-[44px] rounded-xl bg-[#232a3a] hover:bg-[#323949] text-xs font-semibold text-white transition active:scale-95"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteClient}
                className="flex-1 min-h-[44px] rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white transition active:scale-95 shadow-md shadow-rose-600/30"
              >
                Ya, Hapus Member
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
