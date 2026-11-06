export interface SetLog {
  id: string;
  setNumber: number;
  type: 'Warm-up' | 'Work Set' | 'Top Set' | 'Drop Set';
  weightKg: number;
  reps: number;
  isPR?: boolean;
}

export interface ExerciseLog {
  id: string;
  name: string;
  category: 'Free Weights' | 'Kabel/Mesin' | 'Kalistenik';
  tempo: string;
  restSeconds: number;
  historicalBestKg: number;
  sets: SetLog[];
}

export interface SessionRecord {
  id: string;
  sessionNumber: number;
  date: string;
  time: string;
  durationMinutes: number;
  focus: string;
  status: 'Hadir' | 'Batal/Izin' | 'Reschedule';
  rpe: number;
  totalVolumeKg: number;
  readiness: {
    energy: number;
    sleepHours: number;
    doms: 'Rendah' | 'Sedang' | 'Tinggi';
  };
  coachNotes: string;
  location: string;
  exercises: ExerciseLog[];
}

export interface PRRecord {
  id: string;
  exerciseName: string;
  category: 'Free Weights' | 'Kabel/Mesin' | 'Kalistenik';
  weightKg: number;
  reps: number;
  est1RM: number;
  deltaKg: number;
  achievedDate: string;
  note: string;
}

export interface WeeklyBiometricPoint {
  weekLabel: string;
  weightKg: number;
  bodyFatPct: number;
  muscleMassKg: number;
  waistCm: number;
}

export interface ProgressCheckPhoto {
  id: string;
  weekLabel: string;
  date: string;
  weightKg: number;
  bodyFatPct: number;
  waistCm: number;
  pose: string;
  lightingNote: string;
  customImageUrl?: string;
}

export interface PinChangeLogEntry {
  id: string;
  changedAt: string;
  changedByRole: 'client' | 'coach' | 'admin';
  changedByName?: string;
  note?: string;
}

export interface RescheduleRequest {
  id: string;
  clientId: string;
  clientName: string;
  clientPhone?: string;
  originalDate: string;
  originalTime: string;
  originalLocation: 'Gym Utama Senayan' | 'SCBD District 8' | 'Private Studio Kemang';
  proposedDate: string;
  proposedTime: string;
  proposedLocation: 'Gym Utama Senayan' | 'SCBD District 8' | 'Private Studio Kemang';
  reason: string;
  requestedAt: string;
  requestedByRole: 'client' | 'coach' | 'admin';
  requestedByName: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  isLateRequest?: boolean; // True jika diajukan <24 jam sebelum sesi
  hoursLeadTime?: number;
  decidedAt?: string;
  decidedByRole?: 'coach' | 'admin' | 'client';
  decidedByName?: string;
  decisionNote?: string;
}

export interface ScheduledSlot {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  durationMinutes: number;
  location: 'Gym Utama Senayan' | 'SCBD District 8' | 'Private Studio Kemang';
  focus: string;
  sessionNumber: number;
  status: 'Selesai' | 'Terkonfirmasi' | 'Menunggu';
  coachNotes?: string;
}

export interface ClientProfile {
  id: string;
  code: string;
  nama_lengkap: string;
  gender: 'Pria' | 'Wanita';
  usia: number;
  pekerjaan: string;
  telepon: string;
  target_utama: string;
  target_category: 'Fat Loss' | 'Hipertrofi' | 'Powerlifting';
  phase: string;
  status: 'Aktif' | 'Cuti';
  initials: string;
  avatarBg: string;
  // Package & Adherence
  paketTotal: number;
  paketTerpakai: number;
  dietCompliancePct: number;
  leadCoach: string;
  // Biometrics (Baseline Week 1 vs Current Week 8)
  berat_awal_kg: number;
  berat_terkini_kg: number;
  berat_target_kg: number;
  body_fat_awal_pct: number;
  body_fat_terkini_pct: number;
  massa_otot_awal_kg: number;
  massa_otot_terkini_kg: number;
  lingkar_pinggang_awal_cm: number;
  lingkar_pinggang_terkini_cm: number;
  lingkar_dada_awal_cm: number;
  lingkar_dada_terkini_cm: number;
  lingkar_lengan_awal_cm: number;
  lingkar_lengan_terkini_cm: number;
  visceralFatScore: number;
  // Nutrition 7-Day & Custom Macros
  kaloriHarian: number;
  kaloriTarget: number;
  proteinHarian: number;
  proteinTarget: number;
  karboTarget?: number;
  lemakTarget?: number;
  hidrasiLiter: number;
  hidrasiTarget: number;
  weeklyNutritionDays: ('tercapai' | 'longgar' | 'terlewat')[];
  nutritionCoachNote: string;
  dietDetailNote?: string;
  // Advanced Medical & Initial Baseline Reference
  medicalHistoryNote?: string;
  postureScreeningNote?: string;
  baselinePhotoUrl?: string;
  baselinePhotoPose?: string;
  baselinePhotoDate?: string;
  // Next Scheduled Session
  nextSession: {
    date: string;
    time: string;
    focus: string;
    location: 'Gym Utama Senayan' | 'SCBD District 8' | 'Private Studio Kemang';
    confirmed: boolean;
    rescheduleReason?: string;
  };
  sesi_terakhir: string;
  weeklyTrend: WeeklyBiometricPoint[];
  prList: PRRecord[];
  sessions: SessionRecord[];
  scheduledSessions?: ScheduledSlot[];
  photos: ProgressCheckPhoto[];
  // Security & Credential Management
  clientPin?: string;
  mustChangePin?: boolean;
  pinChangedAt?: string;
  pinChangeHistory?: PinChangeLogEntry[];
  // Reschedule Approval Matrix & History
  pendingReschedule?: RescheduleRequest;
  rescheduleHistory?: RescheduleRequest[];
  // AI Synthesis Artifacts
  aiPeriodizationPlan?: {
    success: boolean;
    programTitle: string;
    content: string;
    source: 'gemini-api' | 'offline-engine';
    createdAt?: string;
  };
  aiScreeningAnalysis?: {
    success: boolean;
    clientName: string;
    analysis: string;
    source: 'gemini-api' | 'offline-engine';
    createdAt?: string;
  };
  aiReportDraft?: {
    success: boolean;
    whatsappMessage: string;
    source: 'gemini-api' | 'offline-engine';
    createdAt?: string;
  };
}

export interface CoachCertification {
  id: string;
  title: string;
  issuer: string;
  licenseNumber: string;
  validUntil: string;
  verified: boolean;
}

export interface CoachProfileData {
  name: string;
  initials: string;
  roleTitle: string;
  email: string;
  whatsapp: string;
  kemenporaId: string;
  pabsiLicense: string;
  specialization: string;
  acceptingNewClients: boolean;
  activeClientsCount: number;
  maxClientQuota: number;
  primaryLocation: string;
  secondaryLocation: string;
  experienceYears: number;
  certifications: CoachCertification[];
  coachPin?: string;
}

export interface CatalogExercise {
  id: string;
  name: string;
  category: 'Free Weights' | 'Kabel/Mesin' | 'Kalistenik';
  primaryMuscle: string;
  defaultTempo: string;
  defaultRestSeconds: number;
  defaultBestKg: number;
}

export const EXERCISE_CATALOG: CatalogExercise[] = [
  { id: 'ex-01', name: 'Barbell Back Squat', category: 'Free Weights', primaryMuscle: 'Quadriceps & Glutes', defaultTempo: '3-1-X-1', defaultRestSeconds: 150, defaultBestKg: 110 },
  { id: 'ex-02', name: 'Romanian Deadlift (RDL)', category: 'Free Weights', primaryMuscle: 'Hamstrings & Posterior Chain', defaultTempo: '3-1-1-1', defaultRestSeconds: 120, defaultBestKg: 95 },
  { id: 'ex-03', name: 'Conventional Deadlift', category: 'Free Weights', primaryMuscle: 'Posterior Chain & Back', defaultTempo: '2-1-X-1', defaultRestSeconds: 180, defaultBestKg: 140 },
  { id: 'ex-04', name: 'Barbell Bench Press', category: 'Free Weights', primaryMuscle: 'Pectoralis Major & Triceps', defaultTempo: '2-1-X-1', defaultRestSeconds: 120, defaultBestKg: 82.5 },
  { id: 'ex-05', name: 'Overhead Barbell Press (OHP)', category: 'Free Weights', primaryMuscle: 'Anterior Deltoid & Core', defaultTempo: '2-0-X-1', defaultRestSeconds: 120, defaultBestKg: 52.5 },
  { id: 'ex-06', name: 'Incline Dumbbell Press', category: 'Free Weights', primaryMuscle: 'Upper Pectorals', defaultTempo: '3-1-1-0', defaultRestSeconds: 90, defaultBestKg: 34 },
  { id: 'ex-07', name: 'Bulgarian Split Squat', category: 'Free Weights', primaryMuscle: 'Unilateral Quads & Glutes', defaultTempo: '3-1-1-0', defaultRestSeconds: 90, defaultBestKg: 28 },
  { id: 'ex-08', name: 'Lat Pulldown (Wide Neutral Grip)', category: 'Kabel/Mesin', primaryMuscle: 'Latissimus Dorsi', defaultTempo: '2-1-2-0', defaultRestSeconds: 90, defaultBestKg: 75 },
  { id: 'ex-09', name: 'Seated Cable Row (V-Bar)', category: 'Kabel/Mesin', primaryMuscle: 'Mid-Back & Rhomboids', defaultTempo: '2-1-2-1', defaultRestSeconds: 90, defaultBestKg: 70 },
  { id: 'ex-10', name: 'Hack Squat Machine', category: 'Kabel/Mesin', primaryMuscle: 'Quadriceps Sweep', defaultTempo: '3-1-1-0', defaultRestSeconds: 120, defaultBestKg: 130 },
  { id: 'ex-11', name: 'Cable Face Pull & External Rotation', category: 'Kabel/Mesin', primaryMuscle: 'Rear Delts & Rotator Cuff', defaultTempo: '2-2-1-0', defaultRestSeconds: 60, defaultBestKg: 27.5 },
  { id: 'ex-12', name: 'Lying Leg Curl Machine', category: 'Kabel/Mesin', primaryMuscle: 'Hamstrings Isolation', defaultTempo: '2-1-3-0', defaultRestSeconds: 75, defaultBestKg: 55 },
  { id: 'ex-13', name: 'Weighted Pull-Up', category: 'Kalistenik', primaryMuscle: 'Lats & Upper Back', defaultTempo: '2-1-X-1', defaultRestSeconds: 120, defaultBestKg: 20 },
  { id: 'ex-14', name: 'Weighted Parallel Bar Dips', category: 'Kalistenik', primaryMuscle: 'Lower Chest & Triceps', defaultTempo: '3-0-X-1', defaultRestSeconds: 90, defaultBestKg: 25 },
  { id: 'ex-15', name: 'Hanging Leg Raise (Strict)', category: 'Kalistenik', primaryMuscle: 'Core & Hip Flexors', defaultTempo: '2-1-2-0', defaultRestSeconds: 60, defaultBestKg: 0 },
  { id: 'ex-16', name: 'Nordic Hamstring Curl', category: 'Kalistenik', primaryMuscle: 'Eccentric Hamstrings', defaultTempo: '4-0-1-0', defaultRestSeconds: 90, defaultBestKg: 0 }
];

export const INITIAL_COACH_PROFILE: CoachProfileData = {
  name: 'Coach Panji Akbar Syamsi',
  initials: 'PAS',
  roleTitle: 'Head Coach & Master Fitness Trainer',
  email: 'panji.akbar@pelatihku.id',
  whatsapp: '628119876543',
  kemenporaId: 'KMP-INA-2024-8819',
  pabsiLicense: 'PB-PABSI-NAS-0412',
  specialization: 'Fitness Center S&C, Rekomposisi Tubuh & Member Transformation',
  acceptingNewClients: true,
  activeClientsCount: 24,
  maxClientQuota: 27,
  primaryLocation: 'Gym Utama Senayan',
  secondaryLocation: 'SCBD District 8',
  experienceYears: 9,
  certifications: [
    {
      id: 'cert-1',
      title: 'NSCA — Certified Strength & Conditioning Specialist (CSCS)',
      issuer: 'National Strength and Conditioning Association',
      licenseNumber: 'CSCS-2021-994812',
      validUntil: 'Des 2027',
      verified: true
    },
    {
      id: 'cert-2',
      title: 'Lisensi Pelatih Fisik Nasional Level A',
      issuer: 'Kemenpora RI & PB PABSI',
      licenseNumber: 'PB-PABSI-NAS-0412',
      validUntil: 'Nov 2028',
      verified: true
    },
    {
      id: 'cert-3',
      title: 'Precision Nutrition Level 1 (Pn1)',
      issuer: 'Precision Nutrition Inc.',
      licenseNumber: 'PN1-883420',
      validUntil: 'Seumur Hidup',
      verified: true
    },
    {
      id: 'cert-4',
      title: 'EXOS Performance Specialist (XPS)',
      issuer: 'EXOS Human Performance',
      licenseNumber: 'XPS-44019',
      validUntil: 'Agu 2027',
      verified: true
    }
  ],
  coachPin: '123456'
};

export const INITIAL_CLIENTS: ClientProfile[] = [
  {
    id: 'k-01',
    code: '#MBR-2024-082',
    nama_lengkap: 'Budi Santoso',
    gender: 'Pria',
    usia: 29,
    pekerjaan: 'SWE (Remote)',
    telepon: '6281234567801',
    target_utama: 'Fat Loss -5kg',
    target_category: 'Fat Loss',
    phase: 'Cut Phase II',
    status: 'Aktif',
    initials: 'BS',
    avatarBg: 'from-blue-500 to-indigo-600',
    paketTotal: 24,
    paketTerpakai: 16,
    dietCompliancePct: 92,
    leadCoach: 'Panji Akbar Syamsi',
    clientPin: '34567801',
    mustChangePin: true,
    pinChangeHistory: [
      {
        id: 'pin-log-k01-init',
        changedAt: '2026-10-15T09:30:00.000Z',
        changedByRole: 'admin',
        changedByName: 'Supervisor Gym',
        note: 'PIN awal 8-digit nomor telepon (+6281234567801) dibuat saat pendaftaran paket PT.'
      }
    ],
    berat_awal_kg: 84.5,
    berat_terkini_kg: 81.1,
    berat_target_kg: 79.5,
    body_fat_awal_pct: 23.2,
    body_fat_terkini_pct: 19.8,
    massa_otot_awal_kg: 36.8,
    massa_otot_terkini_kg: 37.2,
    lingkar_pinggang_awal_cm: 92.0,
    lingkar_pinggang_terkini_cm: 86.5,
    lingkar_dada_awal_cm: 101.0,
    lingkar_dada_terkini_cm: 102.5,
    lingkar_lengan_awal_cm: 36.0,
    lingkar_lengan_terkini_cm: 37.1,
    visceralFatScore: 6,
    kaloriHarian: 2080,
    kaloriTarget: 2100,
    proteinHarian: 155,
    proteinTarget: 160,
    hidrasiLiter: 3.2,
    hidrasiTarget: 3.0,
    weeklyNutritionDays: ['tercapai', 'tercapai', 'tercapai', 'longgar', 'tercapai', 'tercapai', 'tercapai'],
    nutritionCoachNote: 'Kamis defisit agak longgar (+120 kcal saat meeting lembur), namun diimbangi intake protein tinggi. Rekomendasi dipertahankan.',
    nextSession: {
      date: '2026-11-05',
      time: '16:30',
      focus: 'Lower Body Strength & Hypertrophy',
      location: 'Gym Utama Senayan',
      confirmed: true
    },
    scheduledSessions: [
      {
        id: 'sched-k01-1',
        date: '2026-11-05',
        time: '16:30',
        durationMinutes: 75,
        location: 'Gym Utama Senayan',
        focus: 'Lower Body Strength & Hypertrophy',
        sessionNumber: 17,
        status: 'Terkonfirmasi'
      },
      {
        id: 'sched-k01-2',
        date: '2026-11-07',
        time: '10:30',
        durationMinutes: 75,
        location: 'Gym Utama Senayan',
        focus: 'Upper Body Push & Pull Specialization',
        sessionNumber: 18,
        status: 'Terkonfirmasi'
      }
    ],
    sesi_terakhir: 'Kemarin — Leg Day & Core',
    weeklyTrend: [
      { weekLabel: 'M1', weightKg: 84.5, bodyFatPct: 23.2, muscleMassKg: 36.8, waistCm: 92.0 },
      { weekLabel: 'M2', weightKg: 83.9, bodyFatPct: 22.8, muscleMassKg: 36.8, waistCm: 91.2 },
      { weekLabel: 'M3', weightKg: 83.4, bodyFatPct: 22.3, muscleMassKg: 36.9, waistCm: 90.4 },
      { weekLabel: 'M4', weightKg: 82.8, bodyFatPct: 21.6, muscleMassKg: 37.0, waistCm: 89.5 },
      { weekLabel: 'M5', weightKg: 82.3, bodyFatPct: 21.1, muscleMassKg: 37.0, waistCm: 88.6 },
      { weekLabel: 'M6', weightKg: 81.9, bodyFatPct: 20.6, muscleMassKg: 37.1, waistCm: 87.8 },
      { weekLabel: 'M7', weightKg: 81.5, bodyFatPct: 20.2, muscleMassKg: 37.1, waistCm: 87.1 },
      { weekLabel: 'M8', weightKg: 81.1, bodyFatPct: 19.8, muscleMassKg: 37.2, waistCm: 86.5 }
    ],
    prList: [
      {
        id: 'pr-1',
        exerciseName: 'Barbell Back Squat',
        category: 'Free Weights',
        weightKg: 110.0,
        reps: 5,
        est1RM: 128.3,
        deltaKg: 5.0,
        achievedDate: '04 Nov 2026',
        note: 'Kedalaman hip crease di bawah paralel bersih'
      },
      {
        id: 'pr-2',
        exerciseName: 'Conventional Deadlift',
        category: 'Free Weights',
        weightKg: 140.0,
        reps: 3,
        est1RM: 154.0,
        deltaKg: 7.5,
        achievedDate: '28 Okt 2026',
        note: 'Lockout kuat tanpa hitching'
      },
      {
        id: 'pr-3',
        exerciseName: 'Barbell Bench Press',
        category: 'Free Weights',
        weightKg: 82.5,
        reps: 6,
        est1RM: 99.0,
        deltaKg: 2.5,
        achievedDate: '24 Okt 2026',
        note: 'Pause 1 detik di dada, kontrol skapula solid'
      },
      {
        id: 'pr-4',
        exerciseName: 'Overhead Barbell Press (OHP)',
        category: 'Free Weights',
        weightKg: 52.5,
        reps: 5,
        est1RM: 61.2,
        deltaKg: 2.5,
        achievedDate: '19 Okt 2026',
        note: 'Core bracing ketat tanpa hip layback berlebih'
      }
    ],
    sessions: [
      {
        id: 'ses-16',
        sessionNumber: 16,
        date: '04 Nov 2026',
        time: '16:30 WIB',
        durationMinutes: 90,
        focus: 'Lower Body Strength & Core',
        status: 'Hadir',
        rpe: 8.5,
        totalVolumeKg: 12450,
        readiness: { energy: 8, sleepHours: 7.5, doms: 'Rendah' },
        coachNotes: 'Mobilitas ankle saat deep squat membaik. Set penutup RDL terkendali dengan belt.',
        location: 'Gym Utama Senayan',
        exercises: [
          {
            id: 'log-ex-1',
            name: 'Barbell Back Squat',
            category: 'Free Weights',
            tempo: '3-1-X-1',
            restSeconds: 150,
            historicalBestKg: 105,
            sets: [
              { id: 's1', setNumber: 1, type: 'Warm-up', weightKg: 95, reps: 8 },
              { id: 's2', setNumber: 2, type: 'Work Set', weightKg: 105, reps: 5 },
              { id: 's3', setNumber: 3, type: 'Top Set', weightKg: 110, reps: 5, isPR: true }
            ]
          },
          {
            id: 'log-ex-2',
            name: 'Romanian Deadlift (RDL)',
            category: 'Free Weights',
            tempo: '3-1-1-1',
            restSeconds: 120,
            historicalBestKg: 90,
            sets: [
              { id: 's4', setNumber: 1, type: 'Work Set', weightKg: 80, reps: 10 },
              { id: 's5', setNumber: 2, type: 'Work Set', weightKg: 85, reps: 10 },
              { id: 's6', setNumber: 3, type: 'Work Set', weightKg: 85, reps: 10 }
            ]
          }
        ]
      },
      {
        id: 'ses-15',
        sessionNumber: 15,
        date: '01 Nov 2026',
        time: '10:00 WIB',
        durationMinutes: 75,
        focus: 'Upper Push / Pull Hypertrophy',
        status: 'Hadir',
        rpe: 8.0,
        totalVolumeKg: 9820,
        readiness: { energy: 9, sleepHours: 8.0, doms: 'Rendah' },
        coachNotes: 'Kontraksi lat pulldown sangat simetris. Tambah beban 2.5 kg pada sesi upper berikutnya.',
        location: 'SCBD District 8',
        exercises: [
          {
            id: 'log-ex-3',
            name: 'Barbell Bench Press',
            category: 'Free Weights',
            tempo: '2-1-X-1',
            restSeconds: 120,
            historicalBestKg: 82.5,
            sets: [
              { id: 's7', setNumber: 1, type: 'Warm-up', weightKg: 60, reps: 10 },
              { id: 's8', setNumber: 2, type: 'Work Set', weightKg: 80, reps: 6 },
              { id: 's9', setNumber: 3, type: 'Work Set', weightKg: 82.5, reps: 6 }
            ]
          },
          {
            id: 'log-ex-4',
            name: 'Seated Cable Row (V-Bar)',
            category: 'Kabel/Mesin',
            tempo: '2-1-2-1',
            restSeconds: 90,
            historicalBestKg: 70,
            sets: [
              { id: 's10', setNumber: 1, type: 'Work Set', weightKg: 65, reps: 12 },
              { id: 's11', setNumber: 2, type: 'Work Set', weightKg: 70, reps: 10 }
            ]
          }
        ]
      },
      {
        id: 'ses-14',
        sessionNumber: 14,
        date: '28 Okt 2026',
        time: '17:00 WIB',
        durationMinutes: 85,
        focus: 'Posterior Chain & Deadlift Peak',
        status: 'Hadir',
        rpe: 9.0,
        totalVolumeKg: 11200,
        readiness: { energy: 8, sleepHours: 7.0, doms: 'Sedang' },
        coachNotes: 'PR Deadlift 140 kg x 3 reps berhasil bersih. Kecepatan bar dari lantai sangat eksplosif.',
        location: 'Gym Utama Senayan',
        exercises: [
          {
            id: 'log-ex-5',
            name: 'Conventional Deadlift',
            category: 'Free Weights',
            tempo: '2-1-X-1',
            restSeconds: 180,
            historicalBestKg: 132.5,
            sets: [
              { id: 's12', setNumber: 1, type: 'Warm-up', weightKg: 110, reps: 5 },
              { id: 's13', setNumber: 2, type: 'Work Set', weightKg: 130, reps: 3 },
              { id: 's14', setNumber: 3, type: 'Top Set', weightKg: 140, reps: 3, isPR: true }
            ]
          }
        ]
      },
      {
        id: 'ses-13',
        sessionNumber: 13,
        date: '25 Okt 2026',
        time: '09:30 WIB',
        durationMinutes: 60,
        focus: 'Conditioning, Core & Mobility',
        status: 'Hadir',
        rpe: 7.0,
        totalVolumeKg: 6450,
        readiness: { energy: 7, sleepHours: 6.5, doms: 'Sedang' },
        coachNotes: 'Fokus pemulihan aktif dan penguatan core anti-rotasi.',
        location: 'Gym Utama Senayan',
        exercises: [
          {
            id: 'log-ex-6',
            name: 'Hanging Leg Raise (Strict)',
            category: 'Kalistenik',
            tempo: '2-1-2-0',
            restSeconds: 60,
            historicalBestKg: 0,
            sets: [
              { id: 's15', setNumber: 1, type: 'Work Set', weightKg: 0, reps: 12 },
              { id: 's16', setNumber: 2, type: 'Work Set', weightKg: 0, reps: 12 },
              { id: 's17', setNumber: 3, type: 'Work Set', weightKg: 0, reps: 12 }
            ]
          }
        ]
      }
    ],
    photos: [
      {
        id: 'ph-1',
        weekLabel: 'Mgg 1 Baseline',
        date: '10 Sep 2026',
        weightKg: 84.5,
        bodyFatPct: 23.2,
        waistCm: 92.0,
        pose: 'Front Torso Relaxed',
        lightingNote: 'Studio Netral • Pagi (Puasa)'
      },
      {
        id: 'ph-2',
        weekLabel: 'Mgg 8 (Kini)',
        date: '05 Nov 2026',
        weightKg: 81.1,
        bodyFatPct: 19.8,
        waistCm: 86.5,
        pose: 'Front Torso Conditioning',
        lightingNote: 'Definisi Perut & Bahu Meningkat'
      }
    ]
  },
  {
    id: 'k-02',
    code: '#MBR-2024-091',
    nama_lengkap: 'Siti Rahma',
    gender: 'Wanita',
    usia: 26,
    pekerjaan: 'Product Designer',
    telepon: '6281234567802',
    target_utama: 'Fat Loss & Toning',
    target_category: 'Fat Loss',
    phase: 'Cut & Sculpt I',
    status: 'Aktif',
    initials: 'SR',
    avatarBg: 'from-pink-500 to-rose-600',
    paketTotal: 20,
    paketTerpakai: 12,
    dietCompliancePct: 95,
    leadCoach: 'Panji Akbar Syamsi',
    clientPin: '34567802',
    mustChangePin: true,
    pinChangeHistory: [
      {
        id: 'pin-log-k02-init',
        changedAt: '2026-10-18T10:00:00.000Z',
        changedByRole: 'admin',
        changedByName: 'Supervisor Gym',
        note: 'PIN awal 8-digit nomor telepon (+6281234567802) dibuat saat registrasi.'
      }
    ],
    berat_awal_kg: 62.0,
    berat_terkini_kg: 58.6,
    berat_target_kg: 57.0,
    body_fat_awal_pct: 27.5,
    body_fat_terkini_pct: 23.4,
    massa_otot_awal_kg: 24.1,
    massa_otot_terkini_kg: 24.8,
    lingkar_pinggang_awal_cm: 74.0,
    lingkar_pinggang_terkini_cm: 68.5,
    lingkar_dada_awal_cm: 88.0,
    lingkar_dada_terkini_cm: 87.5,
    lingkar_lengan_awal_cm: 27.5,
    lingkar_lengan_terkini_cm: 27.2,
    visceralFatScore: 4,
    kaloriHarian: 1640,
    kaloriTarget: 1650,
    proteinHarian: 118,
    proteinTarget: 120,
    hidrasiLiter: 2.8,
    hidrasiTarget: 2.7,
    weeklyNutritionDays: ['tercapai', 'tercapai', 'tercapai', 'tercapai', 'tercapai', 'longgar', 'tercapai'],
    nutritionCoachNote: 'Disiplin tinggi sepanjang minggu. Asupan protein tercukupi 98% dari target.',
    nextSession: {
      date: '2026-11-05',
      time: '17:30',
      focus: 'Lower Body Conditioning & Glutes',
      location: 'SCBD District 8',
      confirmed: true
    },
    scheduledSessions: [
      {
        id: 'sched-k02-1',
        date: '2026-11-05',
        time: '17:30',
        durationMinutes: 60,
        location: 'SCBD District 8',
        focus: 'Lower Body Conditioning & Glutes',
        sessionNumber: 13,
        status: 'Terkonfirmasi'
      },
      {
        id: 'sched-k02-2',
        date: '2026-11-07',
        time: '10:00',
        durationMinutes: 60,
        location: 'SCBD District 8',
        focus: 'Full Body Conditioning & Core Rehab',
        sessionNumber: 14,
        status: 'Menunggu'
      }
    ],
    pendingReschedule: {
      id: 'rsch-k02-mock-1',
      clientId: 'k-02',
      clientName: 'Siti Rahmawati',
      clientPhone: '6281234567802',
      originalDate: '2026-11-05',
      originalTime: '17:30',
      originalLocation: 'SCBD District 8',
      proposedDate: '2026-11-07',
      proposedTime: '10:00',
      proposedLocation: 'SCBD District 8',
      reason: 'Jadwal Bentrok — Meeting dadakan di kantor pusat SCBD',
      requestedAt: '2026-11-05T08:30:00.000Z',
      requestedByRole: 'client',
      requestedByName: 'Siti Rahmawati',
      status: 'pending',
      isLateRequest: false,
      hoursLeadTime: 33.0
    },
    sesi_terakhir: '2 Hari lalu — Upper Conditioning',
    weeklyTrend: [
      { weekLabel: 'M1', weightKg: 62.0, bodyFatPct: 27.5, muscleMassKg: 24.1, waistCm: 74.0 },
      { weekLabel: 'M2', weightKg: 61.5, bodyFatPct: 26.9, muscleMassKg: 24.2, waistCm: 73.1 },
      { weekLabel: 'M3', weightKg: 61.0, bodyFatPct: 26.3, muscleMassKg: 24.3, waistCm: 72.2 },
      { weekLabel: 'M4', weightKg: 60.4, bodyFatPct: 25.6, muscleMassKg: 24.4, waistCm: 71.4 },
      { weekLabel: 'M5', weightKg: 59.9, bodyFatPct: 25.0, muscleMassKg: 24.5, waistCm: 70.6 },
      { weekLabel: 'M6', weightKg: 59.4, bodyFatPct: 24.4, muscleMassKg: 24.6, waistCm: 69.8 },
      { weekLabel: 'M7', weightKg: 59.0, bodyFatPct: 23.9, muscleMassKg: 24.7, waistCm: 69.1 },
      { weekLabel: 'M8', weightKg: 58.6, bodyFatPct: 23.4, muscleMassKg: 24.8, waistCm: 68.5 }
    ],
    prList: [
      {
        id: 'pr-sr-1',
        exerciseName: 'Romanian Deadlift (RDL)',
        category: 'Free Weights',
        weightKg: 70.0,
        reps: 8,
        est1RM: 88.7,
        deltaKg: 5.0,
        achievedDate: '02 Nov 2026',
        note: 'Hip hinge sangat terkontrol'
      },
      {
        id: 'pr-sr-2',
        exerciseName: 'Bulgarian Split Squat',
        category: 'Free Weights',
        weightKg: 24.0,
        reps: 10,
        est1RM: 32.0,
        deltaKg: 4.0,
        achievedDate: '29 Okt 2026',
        note: 'Stabilitas lutut kiri meningkat pesat'
      }
    ],
    sessions: [
      {
        id: 'ses-sr-12',
        sessionNumber: 12,
        date: '03 Nov 2026',
        time: '17:30 WIB',
        durationMinutes: 70,
        focus: 'Upper Conditioning & Core',
        status: 'Hadir',
        rpe: 8.0,
        totalVolumeKg: 6840,
        readiness: { energy: 9, sleepHours: 7.5, doms: 'Rendah' },
        coachNotes: 'Eksekusi Seated Cable Row dan Lat Pulldown sangat rapi.',
        location: 'SCBD District 8',
        exercises: []
      }
    ],
    photos: [
      {
        id: 'ph-sr-1',
        weekLabel: 'Mgg 1 Baseline',
        date: '12 Sep 2026',
        weightKg: 62.0,
        bodyFatPct: 27.5,
        waistCm: 74.0,
        pose: 'Side Profile Posture',
        lightingNote: 'Baseline Evaluasi Postur'
      },
      {
        id: 'ph-sr-2',
        weekLabel: 'Mgg 8 (Kini)',
        date: '05 Nov 2026',
        weightKg: 58.6,
        bodyFatPct: 23.4,
        waistCm: 68.5,
        pose: 'Side Profile Conditioning',
        lightingNote: 'Reduksi Lingkar Pinggang -5.5 cm'
      }
    ]
  },
  {
    id: 'k-03',
    code: '#MBR-2024-064',
    nama_lengkap: 'Dimas Anggara',
    gender: 'Pria',
    usia: 32,
    pekerjaan: 'VP Finance',
    telepon: '6281234567803',
    target_utama: 'Hipertrofi / Bulking',
    target_category: 'Hipertrofi',
    phase: 'Hypertrophy Block III',
    status: 'Aktif',
    initials: 'DA',
    avatarBg: 'from-emerald-500 to-teal-600',
    paketTotal: 24,
    paketTerpakai: 19,
    dietCompliancePct: 89,
    leadCoach: 'Panji Akbar Syamsi',
    clientPin: '34567803',
    mustChangePin: true,
    pinChangeHistory: [
      {
        id: 'pin-log-k03-init',
        changedAt: '2026-10-12T11:15:00.000Z',
        changedByRole: 'admin',
        changedByName: 'Supervisor Gym',
        note: 'PIN awal 8-digit nomor telepon (+6281234567803) dibuat saat pendaftaran paket PT.'
      }
    ],
    berat_awal_kg: 68.0,
    berat_terkini_kg: 71.4,
    berat_target_kg: 73.0,
    body_fat_awal_pct: 14.5,
    body_fat_terkini_pct: 15.1,
    massa_otot_awal_kg: 33.4,
    massa_otot_terkini_kg: 35.9,
    lingkar_pinggang_awal_cm: 77.0,
    lingkar_pinggang_terkini_cm: 78.2,
    lingkar_dada_awal_cm: 96.0,
    lingkar_dada_terkini_cm: 101.4,
    lingkar_lengan_awal_cm: 34.5,
    lingkar_lengan_terkini_cm: 37.0,
    visceralFatScore: 5,
    kaloriHarian: 2850,
    kaloriTarget: 2900,
    proteinHarian: 165,
    proteinTarget: 165,
    hidrasiLiter: 3.5,
    hidrasiTarget: 3.5,
    weeklyNutritionDays: ['tercapai', 'tercapai', 'longgar', 'tercapai', 'tercapai', 'tercapai', 'tercapai'],
    nutritionCoachNote: 'Surplus kalori +300 kcal berjalan sangat bersih. Pertumbuhan massa otot rangka +2.5 kg dalam 8 minggu.',
    nextSession: {
      date: '2026-11-05',
      time: '15:00',
      focus: 'Deadlift & Back Hypertrophy',
      location: 'Gym Utama Senayan',
      confirmed: false
    },
    scheduledSessions: [
      {
        id: 'sched-k03-1',
        date: '2026-11-05',
        time: '15:00',
        durationMinutes: 75,
        location: 'Gym Utama Senayan',
        focus: 'Deadlift & Back Hypertrophy',
        sessionNumber: 15,
        status: 'Menunggu'
      },
      {
        id: 'sched-k03-2',
        date: '2026-11-08',
        time: '10:00',
        durationMinutes: 75,
        location: 'Gym Utama Senayan',
        focus: 'Overhead Press & Deltoid Volume',
        sessionNumber: 16,
        status: 'Terkonfirmasi'
      }
    ],
    sesi_terakhir: 'Hari ini 15:00 — Deadlift PR',
    weeklyTrend: [
      { weekLabel: 'M1', weightKg: 68.0, bodyFatPct: 14.5, muscleMassKg: 33.4, waistCm: 77.0 },
      { weekLabel: 'M2', weightKg: 68.5, bodyFatPct: 14.6, muscleMassKg: 33.8, waistCm: 77.2 },
      { weekLabel: 'M3', weightKg: 69.0, bodyFatPct: 14.7, muscleMassKg: 34.1, waistCm: 77.4 },
      { weekLabel: 'M4', weightKg: 69.6, bodyFatPct: 14.8, muscleMassKg: 34.5, waistCm: 77.6 },
      { weekLabel: 'M5', weightKg: 70.1, bodyFatPct: 14.9, muscleMassKg: 34.9, waistCm: 77.8 },
      { weekLabel: 'M6', weightKg: 70.6, bodyFatPct: 15.0, muscleMassKg: 35.3, waistCm: 77.9 },
      { weekLabel: 'M7', weightKg: 71.0, bodyFatPct: 15.0, muscleMassKg: 35.6, waistCm: 78.1 },
      { weekLabel: 'M8', weightKg: 71.4, bodyFatPct: 15.1, muscleMassKg: 35.9, waistCm: 78.2 }
    ],
    prList: [
      {
        id: 'pr-da-1',
        exerciseName: 'Conventional Deadlift',
        category: 'Free Weights',
        weightKg: 155.0,
        reps: 4,
        est1RM: 175.6,
        deltaKg: 10.0,
        achievedDate: '30 Okt 2026',
        note: 'Grip overhand hook solid'
      },
      {
        id: 'pr-da-2',
        exerciseName: 'Weighted Pull-Up',
        category: 'Kalistenik',
        weightKg: 25.0,
        reps: 5,
        est1RM: 29.2,
        deltaKg: 5.0,
        achievedDate: '26 Okt 2026',
        note: 'Dagu melewati bar penuh'
      }
    ],
    sessions: [],
    photos: []
  },
  {
    id: 'k-04',
    code: '#MBR-2024-051',
    nama_lengkap: 'Dewi Lestari',
    gender: 'Wanita',
    usia: 34,
    pekerjaan: 'Arsitek Prinsipal',
    telepon: '6281234567804',
    target_utama: 'Fat Loss Pasca-Melahirkan',
    target_category: 'Fat Loss',
    phase: 'Core Restore & Mobility',
    status: 'Cuti',
    initials: 'DL',
    avatarBg: 'from-amber-500 to-orange-600',
    paketTotal: 16,
    paketTerpakai: 10,
    dietCompliancePct: 86,
    leadCoach: 'Panji Akbar Syamsi',
    clientPin: '34567804',
    mustChangePin: true,
    pinChangeHistory: [
      {
        id: 'pin-log-k04-init',
        changedAt: '2026-10-05T14:20:00.000Z',
        changedByRole: 'admin',
        changedByName: 'Supervisor Gym',
        note: 'PIN awal 8-digit nomor telepon (+6281234567804) dibuat saat pendaftaran paket PT.'
      }
    ],
    berat_awal_kg: 70.2,
    berat_terkini_kg: 67.8,
    berat_target_kg: 64.0,
    body_fat_awal_pct: 31.0,
    body_fat_terkini_pct: 28.4,
    massa_otot_awal_kg: 23.0,
    massa_otot_terkini_kg: 23.4,
    lingkar_pinggang_awal_cm: 85.0,
    lingkar_pinggang_terkini_cm: 80.5,
    lingkar_dada_awal_cm: 94.0,
    lingkar_dada_terkini_cm: 92.5,
    lingkar_lengan_awal_cm: 29.5,
    lingkar_lengan_terkini_cm: 28.8,
    visceralFatScore: 6,
    kaloriHarian: 1750,
    kaloriTarget: 1800,
    proteinHarian: 110,
    proteinTarget: 115,
    hidrasiLiter: 2.6,
    hidrasiTarget: 2.8,
    weeklyNutritionDays: ['tercapai', 'tercapai', 'longgar', 'tercapai', 'longgar', 'tercapai', 'tercapai'],
    nutritionCoachNote: 'Sedang cuti dinas luar kota hingga 10 Nov. Program home mobility tetap dijalankan.',
    nextSession: {
      date: '2026-11-11',
      time: '10:00',
      focus: 'Pelvic Floor, Core & Full Body',
      location: 'Private Studio Kemang',
      confirmed: true
    },
    scheduledSessions: [
      {
        id: 'sched-k04-1',
        date: '2026-11-06',
        time: '09:00',
        durationMinutes: 60,
        location: 'Private Studio Kemang',
        focus: 'Pelvic Floor, Core & Postural Realignment',
        sessionNumber: 9,
        status: 'Terkonfirmasi'
      },
      {
        id: 'sched-k04-2',
        date: '2026-11-11',
        time: '10:00',
        durationMinutes: 60,
        location: 'Private Studio Kemang',
        focus: 'Spinal Decompression & Glute Activation',
        sessionNumber: 10,
        status: 'Terkonfirmasi'
      }
    ],
    sesi_terakhir: '12 Okt 2026 — Mobility Rest',
    weeklyTrend: [
      { weekLabel: 'M1', weightKg: 70.2, bodyFatPct: 31.0, muscleMassKg: 23.0, waistCm: 85.0 },
      { weekLabel: 'M4', weightKg: 69.0, bodyFatPct: 29.7, muscleMassKg: 23.2, waistCm: 82.8 },
      { weekLabel: 'M8', weightKg: 67.8, bodyFatPct: 28.4, muscleMassKg: 23.4, waistCm: 80.5 }
    ],
    prList: [],
    sessions: [],
    photos: []
  },
  {
    id: 'k-05',
    code: '#MBR-2024-103',
    nama_lengkap: 'Reza Pratama',
    gender: 'Pria',
    usia: 24,
    pekerjaan: 'Enthusiast S&C / Eksekutif Muda',
    telepon: '6281234567805',
    target_utama: 'Powerlifting 300kg Total',
    target_category: 'Powerlifting',
    phase: 'Peaking Block Meso 4',
    status: 'Aktif',
    initials: 'RP',
    avatarBg: 'from-purple-500 to-violet-600',
    paketTotal: 24,
    paketTerpakai: 21,
    dietCompliancePct: 97,
    leadCoach: 'Panji Akbar Syamsi',
    clientPin: '34567805',
    mustChangePin: true,
    pinChangeHistory: [
      {
        id: 'pin-log-k05-init',
        changedAt: '2026-10-01T08:45:00.000Z',
        changedByRole: 'admin',
        changedByName: 'Supervisor Gym',
        note: 'PIN awal 8-digit nomor telepon (+6281234567805) dibuat saat registrasi.'
      }
    ],
    berat_awal_kg: 75.0,
    berat_terkini_kg: 77.2,
    berat_target_kg: 77.5,
    body_fat_awal_pct: 13.8,
    body_fat_terkini_pct: 13.5,
    massa_otot_awal_kg: 38.5,
    massa_otot_terkini_kg: 40.2,
    lingkar_pinggang_awal_cm: 79.0,
    lingkar_pinggang_terkini_cm: 79.5,
    lingkar_dada_awal_cm: 104.0,
    lingkar_dada_terkini_cm: 107.0,
    lingkar_lengan_awal_cm: 38.0,
    lingkar_lengan_terkini_cm: 39.6,
    visceralFatScore: 4,
    kaloriHarian: 3100,
    kaloriTarget: 3100,
    proteinHarian: 185,
    proteinTarget: 180,
    hidrasiLiter: 4.0,
    hidrasiTarget: 3.8,
    weeklyNutritionDays: ['tercapai', 'tercapai', 'tercapai', 'tercapai', 'tercapai', 'tercapai', 'tercapai'],
    nutritionCoachNote: 'Kesiapan sistem saraf pusat (CNS) sangat prima menjelang mock meet minggu depan.',
    nextSession: {
      date: '2026-11-05',
      time: '19:00',
      focus: 'Heavy Squat & Bench Peaking',
      location: 'Gym Utama Senayan',
      confirmed: true
    },
    scheduledSessions: [
      {
        id: 'sched-k05-1',
        date: '2026-11-05',
        time: '19:00',
        durationMinutes: 75,
        location: 'Gym Utama Senayan',
        focus: 'Heavy Squat & Bench Peaking',
        sessionNumber: 21,
        status: 'Terkonfirmasi'
      },
      {
        id: 'sched-k05-2',
        date: '2026-11-07',
        time: '16:00',
        durationMinutes: 75,
        location: 'Gym Utama Senayan',
        focus: 'Competition Deadlift & Lat Accessories',
        sessionNumber: 22,
        status: 'Terkonfirmasi'
      }
    ],
    sesi_terakhir: '3 Hari lalu — Squat High-Volume',
    weeklyTrend: [
      { weekLabel: 'M1', weightKg: 75.0, bodyFatPct: 13.8, muscleMassKg: 38.5, waistCm: 79.0 },
      { weekLabel: 'M4', weightKg: 76.1, bodyFatPct: 13.6, muscleMassKg: 39.4, waistCm: 79.2 },
      { weekLabel: 'M8', weightKg: 77.2, bodyFatPct: 13.5, muscleMassKg: 40.2, waistCm: 79.5 }
    ],
    prList: [
      {
        id: 'pr-rp-1',
        exerciseName: 'Barbell Back Squat',
        category: 'Free Weights',
        weightKg: 165.0,
        reps: 2,
        est1RM: 176.0,
        deltaKg: 7.5,
        achievedDate: '02 Nov 2026',
        note: 'Kedalaman IPF legal, bar speed cepat'
      },
      {
        id: 'pr-rp-2',
        exerciseName: 'Conventional Deadlift',
        category: 'Free Weights',
        weightKg: 195.0,
        reps: 1,
        est1RM: 195.0,
        deltaKg: 10.0,
        achievedDate: '29 Okt 2026',
        note: 'Single @ RPE 8.5'
      },
      {
        id: 'pr-rp-3',
        exerciseName: 'Barbell Bench Press',
        category: 'Free Weights',
        weightKg: 112.5,
        reps: 2,
        est1RM: 120.0,
        deltaKg: 5.0,
        achievedDate: '25 Okt 2026',
        note: 'Komando kompetisi pause penuh'
      }
    ],
    sessions: [],
    photos: []
  }
];
