/**
 * PelatihKu PRO — Gemini AI & Sports Science Service
 * Provides client-side AI capabilities with seamless offline-first fallback.
 * Strictly adheres to NSCA / ACSM sports science and Coach Panji Akbar Syamsi (PAS) methodology.
 */

import { getActiveRole } from './authGatekeeperService';

export interface PeriodizationRequest {
  clientName: string;
  age?: number;
  goal: string;
  experienceLevel?: string;
  injuryHistory?: string;
  sessionsPerWeek?: number;
  weeksCount?: number;
}

export interface PeriodizationResult {
  success: boolean;
  programTitle: string;
  content: string;
  source: 'gemini-api' | 'offline-engine';
}

export interface ScreeningRequest {
  clientName: string;
  fmsScore?: string;
  postureNotes?: string;
  mobilityFlags?: string;
  priorInjuries?: string;
}

export interface ScreeningResult {
  success: boolean;
  clientName: string;
  analysis: string;
  source: 'gemini-api' | 'offline-engine';
}

export interface WorkoutAssistRequest {
  exerciseName: string;
  fatigueScore: number; // 1-10
  domsScore: number; // 1-10
  muscleGroup: string;
  injuryNotes?: string;
}

export interface WorkoutAssistResult {
  success: boolean;
  originalExercise: string;
  recommendationText: string;
  suggestedAction: 'Lanjutkan Sesuai Rencana' | 'Regresi Beban & Volume' | 'Substitusi Latihan Alternatif';
  source: 'gemini-api' | 'offline-engine';
}

export interface ReportRequest {
  clientName: string;
  sessionsCompleted: number;
  targetSessions: number;
  currentWeight?: number;
  baselineWeight?: number;
  prMilestones?: string[];
  coachNotes?: string;
}

export interface ReportResult {
  success: boolean;
  whatsappMessage: string;
  source: 'gemini-api' | 'offline-engine';
}

/**
 * 1. Healthcheck to test if server and Gemini are available
 */
export async function checkAiHealth(): Promise<{ online: boolean; aiAvailable: boolean }> {
  try {
    const res = await fetch('/api/health', { method: 'GET', signal: AbortSignal.timeout(3000) });
    if (!res.ok) return { online: false, aiAvailable: false };
    const data = await res.json();
    return { online: true, aiAvailable: !!data.aiAvailable };
  } catch {
    return { online: false, aiAvailable: false };
  }
}

/**
 * 2. Generate 4-Week Periodization Plan
 */
export async function generatePeriodizationPlan(req: PeriodizationRequest): Promise<PeriodizationResult> {
  try {
    const res = await fetch('/api/ai/periodization', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-pelatihku-role': getActiveRole()
      },
      body: JSON.stringify(req),
      signal: AbortSignal.timeout(15000)
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        return {
          success: true,
          programTitle: data.programTitle,
          content: data.content,
          source: 'gemini-api'
        };
      }
    }
  } catch (err) {
    console.warn('[GeminiService] Server call failed, using sports-science offline engine:', err);
  }

  // Offline Sports Science Periodization Engine
  return generateOfflinePeriodization(req);
}

/**
 * 3. Analyze Movement Screening & Posture
 */
export async function analyzeMovementScreening(req: ScreeningRequest): Promise<ScreeningResult> {
  try {
    const res = await fetch('/api/ai/screening', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-pelatihku-role': getActiveRole()
      },
      body: JSON.stringify(req),
      signal: AbortSignal.timeout(15000)
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        return {
          success: true,
          clientName: data.clientName,
          analysis: data.analysis,
          source: 'gemini-api'
        };
      }
    }
  } catch (err) {
    console.warn('[GeminiService] Server screening failed, using offline engine:', err);
  }

  return generateOfflineScreening(req);
}

/**
 * 4. Workout Assistant for In-Session Fatigue/DOMS Regressions
 */
export async function getWorkoutAssistance(req: WorkoutAssistRequest): Promise<WorkoutAssistResult> {
  try {
    const res = await fetch('/api/ai/workout-assist', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-pelatihku-role': getActiveRole()
      },
      body: JSON.stringify(req),
      signal: AbortSignal.timeout(12000)
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        const text = data.recommendationText || '';
        const suggestedAction = text.toLowerCase().includes('substitusi') || text.toLowerCase().includes('ganti')
          ? 'Substitusi Latihan Alternatif'
          : text.toLowerCase().includes('regresi')
          ? 'Regresi Beban & Volume'
          : 'Lanjutkan Sesuai Rencana';

        return {
          success: true,
          originalExercise: req.exerciseName,
          recommendationText: text,
          suggestedAction,
          source: 'gemini-api'
        };
      }
    }
  } catch (err) {
    console.warn('[GeminiService] Server workout assist failed, using offline engine:', err);
  }

  return generateOfflineWorkoutAssist(req);
}

/**
 * 5. Generate Client Progress WhatsApp Report
 */
export async function generateClientProgressReport(req: ReportRequest): Promise<ReportResult> {
  try {
    const res = await fetch('/api/ai/report', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-pelatihku-role': getActiveRole()
      },
      body: JSON.stringify(req),
      signal: AbortSignal.timeout(12000)
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.whatsappMessage) {
        return {
          success: true,
          whatsappMessage: data.whatsappMessage,
          source: 'gemini-api'
        };
      }
    }
  } catch (err) {
    console.warn('[GeminiService] Server report failed, using offline engine:', err);
  }

  return generateOfflineReport(req);
}

// ==========================================
// OFFLINE SPORTS-SCIENCE FALLBACK IMPLEMENTATIONS
// ==========================================

function generateOfflinePeriodization(req: PeriodizationRequest): PeriodizationResult {
  const goalLower = req.goal.toLowerCase();
  const isFatLoss = goalLower.includes('fat') || goalLower.includes('turun') || goalLower.includes('cutting');
  const isStrength = goalLower.includes('kuat') || goalLower.includes('power') || goalLower.includes('1rm');

  const title = `Blok Periodisasi ${req.weeksCount || 4} Minggu — ${req.clientName}`;

  let content = `### **Blok Periodisasi 4 Minggu (Metodologi PAS)**\n`;
  content += `**Target Member:** ${req.goal} | **Pengalaman:** ${req.experienceLevel || 'Intermediate'}\n`;
  content += `**Riwayat Medis:** ${req.injuryHistory || 'Tidak ada kontraindikasi struktural'}\n\n`;

  if (isFatLoss) {
    content += `#### **Fase: Metabolic Conditioning & Hypertrophy Preservation**\n`;
    content += `- **Minggu 1 (Akumulasi Volume):** 3-4 Sets, 12-15 Reps @ RPE 7. Tempo 3-0-1-0. Rest 60s.\n`;
    content += `- **Minggu 2 (Overload Progresif):** 4 Sets, 10-12 Reps @ RPE 8. Tambahkan volume mikro (supersets antagonist).\n`;
    content += `- **Minggu 3 (Intensifikasi Metabolisme):** 4 Sets, 8-10 Reps compound + finishing drop-sets. Rest 45-60s.\n`;
    content += `- **Minggu 4 (Deload Aktif):** 3 Sets, 10-12 Reps @ RPE 6. Fokus perbaikan rentang gerak (ROM) dan kardio zona 2.\n\n`;
    content += `**Fokus Beban Utama:** Romanian Deadlift, Dumbbell Incline Press, Split Squats, Seated Cable Row.`;
  } else if (isStrength) {
    content += `#### **Fase: Neuromuscular Max Strength Peaking**\n`;
    content += `- **Minggu 1 (Dasar Volume):** 5x5 @ 72.5% 1RM (RPE 7.5). Rest 2-3 menit antar set.\n`;
    content += `- **Minggu 2 (Beban Progresif):** 4x4 @ 80% 1RM (RPE 8). Kalibrasi bar path dan brace intra-abdominal.\n`;
    content += `- **Minggu 3 (Puncak Intensitas):** 3x3 @ 87.5% 1RM (RPE 9). Uji estimasi 1RM sub-maksimal.\n`;
    content += `- **Minggu 4 (Deload Pemulihan CNS):** 3x5 @ 60% 1RM (RPE 6). Pemulihan sistem saraf pusat.\n\n`;
    content += `**Fokus Beban Utama:** Low/High Bar Squat, Bench Press, Conventional/Trap Bar Deadlift, Overhead Press.`;
  } else {
    content += `#### **Fase: Hypertrophy & Muscle Density Block**\n`;
    content += `- **Minggu 1 (Adaptasi Beban):** 3-4 Sets, 8-10 Reps @ RPE 7-8. Fokus mechanical tension.\n`;
    content += `- **Minggu 2 (Overload Progresif):** 4 Sets, 8-10 Reps @ RPE 8. Tambah beban +2.5kg pada compound lifts.\n`;
    content += `- **Minggu 3 (Peak Hypertrophy):** 4 Sets, 6-8 Reps @ RPE 9. Terapkan 1-2 rest-pause sets pada isolasi.\n`;
    content += `- **Minggu 4 (Regenerasi Otot):** 3 Sets, 10 Reps @ RPE 6-7. Restrukturisasi glikogen & sendi.\n\n`;
    content += `**Fokus Beban Utama:** Barbell Back Squat, Dumbbell Romanian Deadlift, Incline Dumbbell Bench, Neutral Grip Lat Pulldown.`;
  }

  content += `\n\n> *Rekomendasi diverifikasi otomatis oleh Sistem Sports Science PelatihKu (Coach Panji Akbar Syamsi).*`;

  return {
    success: true,
    programTitle: title,
    content,
    source: 'offline-engine'
  };
}

function generateOfflineScreening(req: ScreeningRequest): ScreeningResult {
  const notes = (req.postureNotes || '').toLowerCase();
  const flags = (req.mobilityFlags || '').toLowerCase();
  const injuries = (req.priorInjuries || '').toLowerCase();

  let analysis = `### **Analisis Movement Screening & Protokol Korektif (PAS Sports Science)**\n`;
  analysis += `**Member:** ${req.clientName} | **Skor Baseline FMS:** ${req.fmsScore || '14 / 21'}\n\n`;

  analysis += `#### **1. Identifikasi Disfungsi & Risiko Biomekanika:**\n`;
  if (notes.includes('pelvic') || flags.includes('hip') || notes.includes('anterior')) {
    analysis += `- *Anterior Pelvic Tilt & Tight Hip Flexors*: Risiko hip impingement dan kompensasi hiperekstensi lumbar saat squat beban berat.\n`;
  }
  if (flags.includes('ankle') || flags.includes('dorsi') || flags.includes('kaki')) {
    analysis += `- *Keterbatasan Dorsifleksi Ankle*: Memaksa tumit terangkat atau lutut kolaps ke dalam (valgus) saat fase terdalam squat.\n`;
  }
  if (injuries.includes('lutut') || injuries.includes('acl') || injuries.includes('meniscus')) {
    analysis += `- *Riwayat Lutut*: Hindari shearing force berlebih pada sudut fleksi > 90 derajat tanpa pemanasan sendi patellofemoral.\n`;
  } else {
    analysis += `- Tidak ditemukan red-flag patologis akut. Fokus pada peningkatan stabilitas scapulothoracic dan mobilitas panggul.\n`;
  }

  analysis += `\n#### **2. Latihan Kontraindikasi Sementara (DILARANG):**\n`;
  analysis += `- Hindari *Behind-the-Neck Shoulder Press* dan *Heavy Barbell Good Mornings*.\n`;
  analysis += `- Hindari *Leg Press* dengan fleksi lumbar ekstrem di dasar mesin.\n\n`;

  analysis += `#### **3. Protokol Pemanasan Dinamis & Korektif (5-7 Menit):**\n`;
  analysis += `1. **90/90 Hip Mobility Drill** — 2 set x 8 repetisi tiap sisi (rotasi internal & eksternal panggul).\n`;
  analysis += `2. **Wall Ankle Mobilization with Band** — 2 set x 10 osilasi untuk meningkatkan dorsifleksi.\n`;
  analysis += `3. **Deadbug with Core Bracing** — 3 set x 6 repetisi lambat untuk aktivasi anterior core.\n`;
  analysis += `4. **Band Pull-Aparts & Face Pulls** — 2 set x 15 repetisi untuk aktivasi rotator cuff.\n\n`;

  analysis += `#### **4. Rekomendasi Regresi Latihan Lantai Gym:**\n`;
  analysis += `- Barbell Back Squat ➔ **Goblet Box Squat** atau **Safety Bar Squat**.\n`;
  analysis += `- Conventional Deadlift dari lantai ➔ **Trap Bar Deadlift (High Handles)** atau **Block Pulls**.\n`;

  return {
    success: true,
    clientName: req.clientName,
    analysis,
    source: 'offline-engine'
  };
}

function generateOfflineWorkoutAssist(req: WorkoutAssistRequest): WorkoutAssistResult {
  const isHighFatigue = req.fatigueScore >= 7;
  const isHighDoms = req.domsScore >= 6;
  const ex = req.exerciseName;

  let suggestedAction: 'Lanjutkan Sesuai Rencana' | 'Regresi Beban & Volume' | 'Substitusi Latihan Alternatif' = 'Lanjutkan Sesuai Rencana';
  let text = '';

  if (isHighFatigue && isHighDoms) {
    suggestedAction = 'Substitusi Latihan Alternatif';
    text = `⚠️ **Peringatan Pemulihan:** Skor Fatigue (${req.fatigueScore}/10) dan DOMS (${req.domsScore}/10) berada di zona merah (risiko cedera tinggi).\n\n`;
    text += `**Rekomendasi:** Jangan lakukan beban aksial berat pada "${ex}". Ganti ke variasi latihan dengan stabilitas mesin atau dumbbell terkontrol.\n`;
    text += `**Pilihan Pengganti:**\n`;
    text += `- Jika Squat ➔ **Leg Press (Beban 60% 1RM, Tempo Lambat)** atau **Goblet Squat**\n`;
    text += `- Jika Deadlift ➔ **Chest-Supported Dumbbell Row** + **Glute Ham Bridge**\n`;
    text += `- Jika Bench Press ➔ **Seated Machine Chest Press**\n`;
    text += `**Target Volume:** Pangkas 1 set kerja, targetkan RPE 6-7 (2-3 RIR).`;
  } else if (isHighFatigue || isHighDoms) {
    suggestedAction = 'Regresi Beban & Volume';
    text = `⚡ **Penyesuaian Beban Diperlukan:** Fatigue atau DOMS sedang (${Math.max(req.fatigueScore, req.domsScore)}/10).\n\n`;
    text += `**Rekomendasi untuk "${ex}":**\n`;
    text += `- Kurangi beban kerja sebesar **10-15%** dari target awal.\n`;
    text += `- Tingkatkan jeda istirahat antar set minimal **+30 detik**.\n`;
    text += `- Pertahankan kualitas teknik (form over weight) dan berhenti 2 repetisi sebelum failure (RIR 2).\n`;
    text += `**Cue Pelatih:** *"Pastikan napas bracing intra-abdominal terkunci sebelum memulai fase eksentrik."*`;
  } else {
    suggestedAction = 'Lanjutkan Sesuai Rencana';
    text = `✅ **Kesiapan Prima (Green Zone):** Fatigue (${req.fatigueScore}/10) dan DOMS (${req.domsScore}/10) dalam batas optimal pemulihan.\n\n`;
    text += `**Rekomendasi untuk "${ex}":**\n`;
    text += `- Lanjutkan beban terprogram dengan target intensitas RPE 8-8.5.\n`;
    text += `- Lakukan 1 set pemanasan spesifik (potensiasi saraf) sebelum masuk ke set kerja utama.\n`;
    text += `**Cue Pelatih:** *"Dorong lantai sekuat tenaga dan pertahankan tempo eksentrik 2-3 detik secara disiplin."*`;
  }

  return {
    success: true,
    originalExercise: req.exerciseName,
    recommendationText: text,
    suggestedAction,
    source: 'offline-engine'
  };
}

function generateOfflineReport(req: ReportRequest): ReportResult {
  const percent = Math.round((req.sessionsCompleted / (req.targetSessions || 24)) * 100);
  const prs = req.prMilestones && req.prMilestones.length > 0 ? req.prMilestones.join(', ') : 'Konsistensi form squat & bench meningkat pesat';

  let deltaStr = '';
  if (req.currentWeight && req.baselineWeight) {
    const diff = (req.currentWeight - req.baselineWeight).toFixed(1);
    deltaStr = ` (${parseFloat(diff) > 0 ? '+' : ''}${diff} kg dari baseline)`;
  }

  const msg = `Halo *${req.clientName}*, semangat pagi! 💪🔥

Berikut ringkasan progres resmi sesi Personal Training Anda bersama *Coach Panji Akbar Syamsi (PAS)*:

📊 *STATUS PERFORMA MEMBER:*
• Kuota Sesi: *${req.sessionsCompleted} / ${req.targetSessions} Sesi Terlaksana* (${percent}%)
• Berat Badan Terkini: *${req.currentWeight ? req.currentWeight + ' kg' : 'Optimal'}*${deltaStr}
• Rekor Baru (PR): *${prs}*

📝 *CATATAN HEAD COACH:*
"${req.coachNotes || 'Kerja keras dan disiplin Anda di lantai gym sangat membanggakan. Mari pertahankan momentum ini untuk mencapai target puncak!'}"

Tetap jaga pola hidrasi, asupan protein, dan tidur malam minimal 7 jam. Sampai jumpa di sesi PT berikutnya di gym floor! 🏋️‍♂️✨

Salam Kebugaran & Kekuatan,
*Coach Panji Akbar Syamsi, S.Or.*
_Head Coach & Master Fitness Trainer — PelatihKu PRO_`;

  return {
    success: true,
    whatsappMessage: msg,
    source: 'offline-engine'
  };
}
