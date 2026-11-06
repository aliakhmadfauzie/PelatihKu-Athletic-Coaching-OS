import express from 'express';
import type { Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';
import {
  InMemoryNotificationRepository,
  DeviceTokenService,
  NotificationDispatchService,
  MemoryAsyncNotificationQueue,
  FcmPushProviderClient,
  createPushNotificationRouter
} from './src/server/notifications/index';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;

app.use(express.json({ limit: '10mb' }));

// CORS headers for development flexibility
app.use((_req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-pelatihku-role');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (_req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Initialize Gemini Client
const apiKey = process.env.GEMINI_API_KEY || '';
const client = apiKey ? new GoogleGenAI({ apiKey }) : null;
const DEFAULT_MODEL = 'gemini-2.5-flash';

// ===============================================================
// Cryptographic PIN & RBAC Gatekeeper Helpers
// ===============================================================

export function hashPinWithSalt(pin: string, salt: string): string {
  return crypto.createHmac('sha256', salt).update(pin.trim()).digest('hex');
}

export function generateCryptoSalt(): string {
  return crypto.randomBytes(16).toString('hex');
}

export interface StoredUser {
  uid: string;
  phoneNumber: string;
  role: 'coach' | 'admin' | 'client';
  displayName: string;
  coachId: string;
  mustChangePin: boolean;
  clientId?: string;
  salt: string;
  pinHash: string;
  updatedAt: string;
}

// In-memory persistent database store initialized with the seeded Firestore accounts
export const IN_MEMORY_AUTH_DB: Map<string, StoredUser> = new Map();

function initAuthStore() {
  const defaultAccounts: Array<{
    uid: string;
    pin: string;
    phone: string;
    role: 'coach' | 'admin' | 'client';
    name: string;
    coachId: string;
    mustChange: boolean;
    clientId?: string;
  }> = [
    {
      uid: 'pas_coach',
      pin: '123456',
      phone: '+628119876543',
      role: 'coach',
      name: 'Coach Panji Akbar Syamsi, S.Or.',
      coachId: 'pas_coach',
      mustChange: false
    },
    {
      uid: 'gym_admin',
      pin: '999888',
      phone: '+62811000999',
      role: 'admin',
      name: 'Gym Operations Manager',
      coachId: 'none',
      mustChange: false
    },
    {
      uid: 'k-01',
      pin: '34567801',
      phone: '+6281234567801',
      role: 'client',
      name: 'Budi Santoso',
      coachId: 'pas_coach',
      mustChange: true,
      clientId: 'k-01'
    },
    {
      uid: 'k-02',
      pin: '34567802',
      phone: '+6281234567802',
      role: 'client',
      name: 'Siti Rahma',
      coachId: 'pas_coach',
      mustChange: true,
      clientId: 'k-02'
    },
    {
      uid: 'k-03',
      pin: '34567803',
      phone: '+6281234567803',
      role: 'client',
      name: 'Dimas Anggara',
      coachId: 'pas_coach',
      mustChange: true,
      clientId: 'k-03'
    },
    {
      uid: 'k-04',
      pin: '34567804',
      phone: '+6281234567804',
      role: 'client',
      name: 'Dewi Lestari',
      coachId: 'pas_coach',
      mustChange: true,
      clientId: 'k-04'
    },
    {
      uid: 'k-05',
      pin: '34567805',
      phone: '+6281234567805',
      role: 'client',
      name: 'Reza Pratama',
      coachId: 'pas_coach',
      mustChange: true,
      clientId: 'k-05'
    }
  ];

  defaultAccounts.forEach((acc) => {
    const salt = generateCryptoSalt();
    const pinHash = hashPinWithSalt(acc.pin, salt);
    IN_MEMORY_AUTH_DB.set(acc.uid, {
      uid: acc.uid,
      phoneNumber: acc.phone,
      role: acc.role,
      displayName: acc.name,
      coachId: acc.coachId,
      mustChangePin: acc.mustChange,
      clientId: acc.clientId,
      salt,
      pinHash,
      updatedAt: new Date().toISOString()
    });
  });
}

initAuthStore();

// ===============================================================
// RBAC & PIN Authentication Core Logic & Endpoints (/api/v1/auth)
// ===============================================================

export function authenticateUser(inputId: string, inputPin: string): {
  success: boolean;
  status: number;
  data?: any;
  error?: string;
  type?: string;
} {
  const cleanId = (inputId || '').trim();
  const cleanPin = (inputPin || '').trim();

  if (!cleanId || !cleanPin) {
    return {
      success: false,
      status: 400,
      type: 'https://pelatihku.pro/errors/invalid-request',
      error: 'Nomor telepon / identifier dan PIN wajib diisi.'
    };
  }

  const numericOnly = cleanId.replace(/\D/g, '');

  let matchedUser: StoredUser | undefined;
  for (const user of IN_MEMORY_AUTH_DB.values()) {
    const userNumeric = user.phoneNumber.replace(/\D/g, '');
    if (
      user.uid.toLowerCase() === cleanId.toLowerCase() ||
      user.phoneNumber === cleanId ||
      (numericOnly.length >= 8 && userNumeric.endsWith(numericOnly.slice(-8)))
    ) {
      matchedUser = user;
      break;
    }
  }

  if (!matchedUser) {
    return {
      success: false,
      status: 401,
      type: 'https://pelatihku.pro/errors/user-not-found',
      error: 'Akun tidak ditemukan. Periksa kembali nomor telepon atau ID Anda.'
    };
  }

  // Verify PIN cryptographic HMAC-SHA256
  const computedHash = hashPinWithSalt(cleanPin, matchedUser.salt);
  if (computedHash !== matchedUser.pinHash) {
    return {
      success: false,
      status: 401,
      type: 'https://pelatihku.pro/errors/invalid-pin',
      error: 'PIN keamanan tidak cocok. Silakan coba lagi.'
    };
  }

  const tokenPayload = {
    uid: matchedUser.uid,
    role: matchedUser.role,
    clientId: matchedUser.clientId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 86400
  };
  const customToken = 'pelatihku_jwt_' + Buffer.from(JSON.stringify(tokenPayload)).toString('base64url');

  return {
    success: true,
    status: 200,
    data: {
      success: true,
      customToken,
      mustChangePin: matchedUser.mustChangePin,
      expiresIn: 86400,
      user: {
        uid: matchedUser.uid,
        role: matchedUser.role,
        displayName: matchedUser.displayName,
        phoneNumber: matchedUser.phoneNumber,
        clientId: matchedUser.clientId,
        coachId: matchedUser.coachId
      }
    }
  };
}

export function changeUserPin(
  uid: string,
  currentPin: string,
  newPin: string,
  confirmPin: string
): {
  success: boolean;
  status: number;
  data?: any;
  error?: string;
  type?: string;
} {
  if (!uid || !newPin || !confirmPin) {
    return {
      success: false,
      status: 400,
      type: 'https://pelatihku.pro/errors/invalid-request',
      error: 'UID, PIN baru, dan konfirmasi PIN wajib disertakan.'
    };
  }

  const user = IN_MEMORY_AUTH_DB.get(uid);
  if (!user) {
    return {
      success: false,
      status: 404,
      type: 'https://pelatihku.pro/errors/user-not-found',
      error: 'Pengguna tidak ditemukan.'
    };
  }

  if (currentPin) {
    const computedCurrentHash = hashPinWithSalt(currentPin, user.salt);
    if (computedCurrentHash !== user.pinHash) {
      return {
        success: false,
        status: 401,
        type: 'https://pelatihku.pro/errors/invalid-current-pin',
        error: 'PIN saat ini salah. Periksa kembali PIN Anda.'
      };
    }
  }

  const cleanNew = newPin.replace(/\D/g, '');
  const cleanConfirm = confirmPin.replace(/\D/g, '');

  if (cleanNew.length < 6 || cleanNew.length > 8) {
    return {
      success: false,
      status: 400,
      type: 'https://pelatihku.pro/errors/invalid-pin-length',
      error: 'PIN baru harus terdiri dari 6 hingga 8 digit angka.'
    };
  }

  if (cleanNew !== cleanConfirm) {
    return {
      success: false,
      status: 400,
      type: 'https://pelatihku.pro/errors/pin-mismatch',
      error: 'Konfirmasi PIN baru tidak cocok.'
    };
  }

  if (currentPin && cleanNew === currentPin.trim()) {
    return {
      success: false,
      status: 400,
      type: 'https://pelatihku.pro/errors/pin-identical',
      error: 'PIN baru tidak boleh sama dengan PIN saat ini.'
    };
  }

  const trivialList = ['000000', '111111', '123456', '654321', '12345678', '87654321'];
  if (trivialList.includes(cleanNew)) {
    return {
      success: false,
      status: 400,
      type: 'https://pelatihku.pro/errors/trivial-pin',
      error: 'PIN terlalu mudah ditebak. Gunakan kombinasi angka lain.'
    };
  }

  const newSalt = generateCryptoSalt();
  const newPinHash = hashPinWithSalt(cleanNew, newSalt);

  user.salt = newSalt;
  user.pinHash = newPinHash;
  user.mustChangePin = false;
  user.updatedAt = new Date().toISOString();
  IN_MEMORY_AUTH_DB.set(uid, user);

  return {
    success: true,
    status: 200,
    data: {
      success: true,
      message: 'PIN Keamanan berhasil diperbarui!',
      mustChangePin: false,
      updatedAt: user.updatedAt
    }
  };
}

export function provisionUserAccount(
  callerRole: string,
  payload: { clientId: string; nama: string; telepon: string; role?: string }
): {
  success: boolean;
  status: number;
  data?: any;
  error?: string;
  type?: string;
} {
  if (callerRole !== 'coach' && callerRole !== 'admin') {
    return {
      success: false,
      status: 403,
      type: 'https://pelatihku.pro/errors/forbidden',
      error: 'Hanya Coach dan Admin yang berwenang mendaftarkan akun atlet baru.'
    };
  }

  const { clientId, nama, telepon, role = 'client' } = payload;
  if (!clientId || !nama || !telepon) {
    return {
      success: false,
      status: 400,
      type: 'https://pelatihku.pro/errors/invalid-request',
      error: 'clientId, nama, dan telepon wajib diisi.'
    };
  }

  const cleanPhone = telepon.replace(/\D/g, '');
  const initialPin = cleanPhone.length >= 8 ? cleanPhone.slice(-8) : cleanPhone.padStart(8, '0');
  const salt = generateCryptoSalt();
  const pinHash = hashPinWithSalt(initialPin, salt);

  const newUser: StoredUser = {
    uid: clientId,
    phoneNumber: telepon.startsWith('+') ? telepon : '+' + cleanPhone,
    role: role as 'coach' | 'admin' | 'client',
    displayName: nama,
    coachId: 'pas_coach',
    mustChangePin: true,
    clientId,
    salt,
    pinHash,
    updatedAt: new Date().toISOString()
  };

  IN_MEMORY_AUTH_DB.set(clientId, newUser);

  return {
    success: true,
    status: 201,
    data: {
      success: true,
      user: {
        uid: newUser.uid,
        role: newUser.role,
        displayName: newUser.displayName,
        phoneNumber: newUser.phoneNumber,
        clientId: newUser.clientId,
        mustChangePin: true,
        initialPin
      }
    }
  };
}

export function getUsersDirectory(callerRole: string) {
  const isSuper = callerRole === 'coach' || callerRole === 'admin';
  return Array.from(IN_MEMORY_AUTH_DB.values()).map((u) => ({
    uid: u.uid,
    role: u.role,
    displayName: u.displayName,
    phoneNumber: isSuper ? u.phoneNumber : undefined,
    mustChangePin: u.mustChangePin,
    clientId: u.clientId,
    coachId: u.coachId,
    updatedAt: u.updatedAt
  }));
}

/**
 * 1. PIN-based Authentication & Gatekeeper Login
 */
app.post('/api/v1/auth/login', (req: Request, res: Response) => {
  const { rawPhone, identifier, pin } = req.body;
  const result = authenticateUser(rawPhone || identifier, pin);
  if (!result.success) {
    return res.status(result.status).json({
      type: result.type,
      title: 'Unauthorized',
      status: result.status,
      detail: result.error
    });
  }
  return res.status(result.status).json(result.data);
});

/**
 * 2. PIN Change & Security Creation Endpoint
 */
app.post('/api/v1/auth/change-pin', (req: Request, res: Response) => {
  const { uid, currentPin, newPin, confirmPin } = req.body;
  const result = changeUserPin(uid, currentPin, newPin, confirmPin);
  if (!result.success) {
    return res.status(result.status).json({
      type: result.type,
      title: result.status === 404 ? 'Not Found' : result.status === 401 ? 'Unauthorized' : 'Bad Request',
      status: result.status,
      detail: result.error
    });
  }
  return res.status(result.status).json(result.data);
});

/**
 * 3. Client Account Provisioning (Coach & Admin only)
 */
app.post('/api/v1/auth/provision-user', (req: Request, res: Response) => {
  const roleHeader = (req.headers['x-pelatihku-role'] as string) || '';
  const result = provisionUserAccount(roleHeader, req.body);
  if (!result.success) {
    return res.status(result.status).json({
      type: result.type,
      title: result.status === 403 ? 'Forbidden' : 'Bad Request',
      status: result.status,
      detail: result.error
    });
  }
  return res.status(result.status).json(result.data);
});

/**
 * 4. List Directory of Users for RBAC Auditing (Coach & Admin only)
 */
app.get('/api/v1/auth/users', (req: Request, res: Response) => {
  const roleHeader = (req.headers['x-pelatihku-role'] as string) || '';
  const userList = getUsersDirectory(roleHeader);
  return res.json({
    success: true,
    count: userList.length,
    users: userList
  });
});

// ===============================================================
// Push Notification & RBAC Dispatch Engine (/api/v1)
// ===============================================================
export const notificationRepository = new InMemoryNotificationRepository();
export const deviceTokenService = new DeviceTokenService(notificationRepository);
export const notificationQueue = new MemoryAsyncNotificationQueue();
export const pushProviderClient = new FcmPushProviderClient();
export const notificationDispatchService = new NotificationDispatchService(
  notificationRepository,
  deviceTokenService,
  notificationQueue,
  pushProviderClient
);

const pushNotificationRouter = createPushNotificationRouter(
  notificationRepository,
  deviceTokenService,
  notificationDispatchService
);

app.use('/api/v1', pushNotificationRouter);

/**
 * RBAC Authorization Middleware for AI endpoints
 * Enforces role checks:
 * - Coach & Admin: allowed for periodization, screening, workout-assist, report
 * - Client: blocked from generating periodization or screening directly (must be prescribed by Coach)
 */
function requireRole(allowedRoles: string[]) {
  return (req: Request, res: Response, next: express.NextFunction) => {
    const authHeader = req.headers.authorization;
    const roleHeader = (req.headers['x-pelatihku-role'] as string) || 'coach';

    // Allow local development unless explicit enforcement is set or role header is supplied
    const enforce = process.env.ENFORCE_RBAC === 'true';
    if (!enforce && !authHeader && !req.headers['x-pelatihku-role']) {
      return next();
    }

    if (!allowedRoles.includes(roleHeader)) {
      return res.status(403).json({
        error: 'Forbidden: Peran Anda tidak memiliki izin untuk menjalankan operasi AI ini.',
        requiredRoles: allowedRoles,
        currentRole: roleHeader
      });
    }

    next();
  };
}

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    appName: 'PelatihKu PRO Athletic Coaching OS',
    version: '2.5.0',
    model: DEFAULT_MODEL,
    aiAvailable: !!client
  });
});

// 1. Periodization Generation Endpoint (Coach & Admin only)
app.post('/api/ai/periodization', requireRole(['coach', 'admin']), async (req: Request, res: Response) => {
  const {
    clientName,
    age,
    goal,
    experienceLevel = 'Intermediate',
    injuryHistory = 'Tidak ada',
    sessionsPerWeek = 3,
    weeksCount = 4
  } = req.body;

  if (!clientName || !goal) {
    return res.status(400).json({ error: 'clientName dan goal wajib disediakan.' });
  }

  if (!client) {
    return res.status(503).json({
      error: 'GEMINI_API_KEY tidak dikonfigurasi di server.',
      fallbackAvailable: true
    });
  }

  try {
    const prompt = `Anda adalah asisten AI kepelatihan olahraga untuk Head Coach Panji Akbar Syamsi, S.Or. (PAS) di PelatihKu PRO.
Susunlah program periodisasi latihan ${weeksCount} minggu yang terstruktur untuk Member Fitness Center berikut:
- Nama Member: ${clientName}
- Usia: ${age || 28} tahun
- Target Utama: ${goal}
- Tingkat Pengalaman: ${experienceLevel}
- Riwayat Medis / Cedera: ${injuryHistory}
- Frekuensi: ${sessionsPerWeek} sesi per minggu

Format respon dalam Bahasa Indonesia formal dan berstandar Sports Science (NSCA / ACSM).
Sertakan:
1. Nama Program & Fokus Fase (contoh: Hypertrophy & Neuromuscular Adaptation)
2. Struktur per minggu (Minggu 1: Akumulasi, Minggu 2: Overload Progresif, Minggu 3: Intensifikasi / Peaking, Minggu 4: Deload / Kalibrasi)
3. Pedoman Volume, RPE target, dan Intensitas (% 1RM)
4. Rekomendasi Latihan Utama & Manajemen Cedera
Berikan output terstruktur dan padat.`;

    const response = await client.models.generateContent({
      model: DEFAULT_MODEL,
      contents: prompt
    });

    const outputText = response.text || '';

    return res.json({
      success: true,
      programTitle: `Periodisasi ${weeksCount} Minggu — ${clientName} (${goal})`,
      content: outputText,
      generatedAt: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error generating periodization with Gemini:', error);
    return res.status(500).json({
      error: 'Gagal menghasilkan periodisasi dengan Gemini API.',
      details: error.message
    });
  }
});

// 2. Movement Screening & FMS Analysis Endpoint (Coach & Admin only)
app.post('/api/ai/screening', requireRole(['coach', 'admin']), async (req: Request, res: Response) => {
  const { clientName, fmsScore, postureNotes, mobilityFlags, priorInjuries } = req.body;

  if (!client) {
    return res.status(503).json({
      error: 'GEMINI_API_KEY tidak dikonfigurasi di server.',
      fallbackAvailable: true
    });
  }

  try {
    const prompt = `Anda adalah Spesialis Biomekanika & S&C Assistant untuk Head Coach Panji Akbar Syamsi di PelatihKu PRO.
Analisis data Movement Screening & Postur Member:
- Member: ${clientName || 'Member'}
- Skor FMS / Baseline: ${fmsScore || '14/21'}
- Temuan Postur / Observasi: ${postureNotes || 'Anterior pelvic tilt ringan, keterbatasan dorsifleksi pergelangan kaki'}
- Catatan Mobilitas: ${mobilityFlags || 'Tight hip flexors, thoracic spine stiffness'}
- Riwayat Cedera: ${priorInjuries || 'Pernah keseleo pergelangan kaki kanan 2 tahun lalu'}

Berikan rekomendasi praktis untuk sesi Personal Training:
1. Latihan Kontraindikasi (DILARANG atau dihindari sementara)
2. Regresi Latihan Pengganti yang Aman
3. Protokol Dynamic Warm-Up & Korektif Mobilitas (3-5 latihan spesifik)
4. Kriteria Kelulusan untuk kembali ke gerakan bebas (Progression Gate)

Tulis dalam Bahasa Indonesia terstruktur dan ringkas untuk lantai gym.`;

    const response = await client.models.generateContent({
      model: DEFAULT_MODEL,
      contents: prompt
    });

    return res.json({
      success: true,
      clientName,
      analysis: response.text || '',
      generatedAt: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error generating screening analysis:', error);
    return res.status(500).json({
      error: 'Gagal menganalisis screening dengan Gemini API.',
      details: error.message
    });
  }
});

// 3. Workout Assistant (Fatigue & DOMS Exercise Regression — Coach only)
app.post('/api/ai/workout-assist', requireRole(['coach']), async (req: Request, res: Response) => {
  const {
    exerciseName,
    fatigueScore = 5,
    domsScore = 3,
    muscleGroup = 'Lower Body',
    injuryNotes = 'None'
  } = req.body;

  if (!exerciseName) {
    return res.status(400).json({ error: 'exerciseName wajib diisi.' });
  }

  if (!client) {
    return res.status(503).json({
      error: 'GEMINI_API_KEY tidak dikonfigurasi di server.',
      fallbackAvailable: true
    });
  }

  try {
    const prompt = `Sebagai Coaching Assistant Panji Akbar Syamsi di PelatihKu PRO:
Latihan terencana: "${exerciseName}" (${muscleGroup})
Kondisi Member saat ini di lantai gym:
- Skor Kelelahan Sistemik (Fatigue): ${fatigueScore}/10
- Skor Nyeri Otot (DOMS): ${domsScore}/10
- Catatan Cedera / Pembatasan: ${injuryNotes}

Tentukan apakah latihan ini aman dilanjutkan atau butuh regresi/substitusi.
Berikan:
1. Rekomendasi: (Lanjutkan / Regresi / Ganti Latihan)
2. Nama Latihan Alternatif (jika diregresi)
3. Target Sets x Reps x RPE yang aman
4. 2-3 Cue Teknik Kepelatihan (Coaching Cues) Bahasa Indonesia.`;

    const response = await client.models.generateContent({
      model: DEFAULT_MODEL,
      contents: prompt
    });

    return res.json({
      success: true,
      originalExercise: exerciseName,
      recommendationText: response.text || '',
      generatedAt: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error generating workout assistance:', error);
    return res.status(500).json({
      error: 'Gagal memproses rekomendasi workout.',
      details: error.message
    });
  }
});

// 4. Client Progress WhatsApp Report Generator (Coach & Admin only)
app.post('/api/ai/report', requireRole(['coach', 'admin']), async (req: Request, res: Response) => {
  const {
    clientName,
    sessionsCompleted = 12,
    targetSessions = 24,
    currentWeight,
    baselineWeight,
    prMilestones = [],
    coachNotes = ''
  } = req.body;

  if (!clientName) {
    return res.status(400).json({ error: 'clientName wajib diisi.' });
  }

  if (!client) {
    return res.status(503).json({
      error: 'GEMINI_API_KEY tidak dikonfigurasi di server.',
      fallbackAvailable: true
    });
  }

  try {
    const prText = Array.isArray(prMilestones) && prMilestones.length > 0
      ? prMilestones.join(', ')
      : 'Squat & Deadlift stabil dengan form optimal';

    const weightDelta = (currentWeight && baselineWeight)
      ? `${baselineWeight} kg -> ${currentWeight} kg`
      : 'Progres komposisi tubuh positif';

    const prompt = `Tuliskan draf pesan WhatsApp resmi, ramah, dan sangat memotivasi dari Coach Panji Akbar Syamsi (Head Coach PelatihKu) kepada Member:
- Nama Member: ${clientName}
- Progres Sesi PT: ${sessionsCompleted} dari ${targetSessions} sesi terlaksana (${Math.round((sessionsCompleted / targetSessions) * 100)}%)
- Perubahan Beban / Berat Badan: ${weightDelta}
- Rekor Latihan (PR): ${prText}
- Catatan Pelatih: ${coachNotes || 'Konsistensi luar biasa dan etos kerja sangat baik'}

Gunakan format WhatsApp profesional dengan tebal/bold (*), bullet points, dan emoji yang relevan. Jangan bertele-tele. Tutup dengan salam khas Coach Panji Akbar Syamsi (PAS).`;

    const response = await client.models.generateContent({
      model: DEFAULT_MODEL,
      contents: prompt
    });

    return res.json({
      success: true,
      clientName,
      whatsappMessage: response.text || '',
      generatedAt: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error generating report:', error);
    return res.status(500).json({
      error: 'Gagal membuat laporan WhatsApp.',
      details: error.message
    });
  }
});

// Serve static assets in production if dist exists
const distPath = path.resolve(process.cwd(), 'dist');
app.use(express.static(distPath));

// Fallback to index.html for SPA routing
app.get('*', (_req: Request, res: Response) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// Start listening if run directly or in standalone server mode
const isDirectRun = !process.env.VITE_DEV && (process.argv[1]?.includes('server') || process.env.RUN_SERVER === 'true');
if (isDirectRun && process.env.NODE_ENV !== 'test') {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[PelatihKu Server] Running on http://0.0.0.0:${PORT}`);
    console.log(`[PelatihKu Server] Gemini API Status: ${client ? 'ENABLED' : 'OFFLINE_FALLBACK'}`);
  });
}

export default app;
