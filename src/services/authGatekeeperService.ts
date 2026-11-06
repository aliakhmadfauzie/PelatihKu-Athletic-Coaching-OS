/**
 * PelatihKu PRO — Gatekeeper Client Authentication & RBAC Service
 * Communicates with the Cloud Functions v2 gatekeeper API.
 * Handles phone sanitization, 8-digit PIN transmission, and secure token caching.
 * Enforces Role-Based Access Control (RBAC) & Field-Level Access Control (FLAC).
 */

export type UserRole = 'coach' | 'client' | 'admin';

export interface UserSessionProfile {
  uid: string;
  role: UserRole;
  displayName: string;
  phoneNumber?: string;
  email?: string;
  clientId?: string; // Linked clientId if role === 'client'
  coachId?: string;  // Linked coach if role === 'client'
}

export interface GatekeeperLoginResponse {
  success: boolean;
  customToken: string;
  mustChangePin: boolean;
  expiresIn: number;
  user?: UserSessionProfile;
}

export interface ProblemDetailsError {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
}

import { PinChangeLogEntry } from '../data/mockData';

const STORAGE_KEYS = {
  JWT: 'pelatihku_session_jwt',
  ROLE: 'pelatihku_active_role',
  USER: 'pelatihku_user_session'
};

/**
 * Restricted fields that Member (client) cannot modify
 * Strictly mirrors firestore.rules clientOwnerRestrictedFieldsUnchanged()
 */
export const CLIENT_RESTRICTED_FIELDS = [
  'paketTotal',
  'paketTerpakai',
  'code',
  'status',
  'leadCoach',
  'medicalHistoryNote',
  'sessions',
  'prList',
  'berat_awal_kg',
  'lingkar_pinggang_awal_cm',
  'lingkar_dada_awal_cm',
  'lingkar_lengan_awal_cm',
  'massa_otot_awal_kg',
  'body_fat_awal_pct',
  'weeklyTrend',
  'visceralFatScore',
  'massa_otot_terkini_kg'
] as const;

export class GatekeeperAuthError extends Error {
  public problem?: ProblemDetailsError;

  constructor(message: string, problem?: ProblemDetailsError) {
    super(message);
    this.name = 'GatekeeperAuthError';
    this.problem = problem;
  }
}

/**
 * Normalizes phone numbers to standard format for submission
 */
export function sanitizeClientPhone(raw: string): string {
  let cleaned = raw.replace(/[\s\-\(\)\.]/g, '');
  if (cleaned.startsWith('08')) {
    cleaned = '+62' + cleaned.slice(1);
  } else if (cleaned.startsWith('62')) {
    cleaned = '+' + cleaned;
  } else if (!cleaned.startsWith('+')) {
    cleaned = '+' + cleaned;
  }
  return cleaned;
}

/**
 * Authenticates with the backend gatekeeper endpoint
 */
export async function loginWithGatekeeper(
  rawPhone: string,
  pin: string,
  apiBaseUrl: string = '/api/v1'
): Promise<GatekeeperLoginResponse> {
  const sanitized = sanitizeClientPhone(rawPhone);

  const response = await fetch(`${apiBaseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rawPhone: sanitized, pin })
  });

  if (!response.ok) {
    let errorDetail = 'Autentikasi gagal. Periksa nomor telepon dan PIN Anda.';
    let problem: ProblemDetailsError | undefined;

    try {
      problem = await response.json();
      if (problem?.detail) {
        errorDetail = problem.detail;
      }
    } catch {
      // JSON parse fallback
    }

    throw new GatekeeperAuthError(errorDetail, problem);
  }

  const data: GatekeeperLoginResponse = await response.json();

  // Persist session token and user profile locally
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.JWT, data.customToken);
    if (data.user) {
      localStorage.setItem(STORAGE_KEYS.ROLE, data.user.role);
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(data.user));
    }
  }

  return data;
}

/**
 * Retrieves cached session token
 */
export function getCachedCustomToken(): string | null {
  if (typeof localStorage !== 'undefined') {
    return localStorage.getItem(STORAGE_KEYS.JWT);
  }
  return null;
}

/**
 * Retrieves active user role from session
 */
export function getActiveRole(): UserRole {
  try {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEYS.ROLE) as UserRole | null;
      if (stored && ['coach', 'client', 'admin'].includes(stored)) {
        return stored;
      }
    }
    return 'coach'; // Default to coach persona
  } catch {
    return 'coach';
  }
}

/**
 * Retrieves full active user session profile
 */
export function getActiveSession(): UserSessionProfile | null {
  try {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEYS.USER);
      if (stored) {
        return JSON.parse(stored) as UserSessionProfile;
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Sets current user session and role
 */
export function setActiveSession(session: UserSessionProfile): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.ROLE, session.role);
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(session));
    }
  } catch {
    // Ignore quota errors
  }
}

/**
 * Checks if active user has coach or admin authority
 */
export function isCoachOrAdmin(role?: UserRole): boolean {
  const currentRole = role || getActiveRole();
  return currentRole === 'coach' || currentRole === 'admin';
}

/**
 * Checks if active user owns the target client profile
 */
export function isClientOwner(targetClientId: string, session?: UserSessionProfile | null): boolean {
  const currentSession = session !== undefined ? session : getActiveSession();
  if (!currentSession) return false;
  return currentSession.role === 'client' && currentSession.clientId === targetClientId;
}

/**
 * Evaluates Field-Level Access Control (FLAC)
 * Returns true if role is allowed to edit the specified field on a Client document
 */
export function canEditClientField(role: UserRole, fieldName: string): boolean {
  if (role === 'coach' || role === 'admin') {
    return true; // Coach and Admin can edit all fields
  }
  if (role === 'client') {
    return !CLIENT_RESTRICTED_FIELDS.includes(fieldName as any);
  }
  return false;
}

/**
 * Clears session on logout
 */
export function logoutGatekeeper(): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(STORAGE_KEYS.JWT);
    localStorage.removeItem(STORAGE_KEYS.ROLE);
    localStorage.removeItem(STORAGE_KEYS.USER);
  }
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.removeItem('pelatihku_session_active');
    sessionStorage.setItem('pelatihku_just_logged_out', 'true');
  }
}

/**
 * In-memory fallback stores for test runners and environments where localStorage is restricted
 */
const inMemoryPinStore: Record<string, string> = {};
const inMemoryMustChangeStore: Record<string, boolean> = {};

/**
 * Derives initial PIN from the last 8 digits of client's phone number.
 * If phone has fewer than 8 digits, pads with leading zeros.
 */
export function deriveInitialPinFromPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length >= 8) {
    return digits.slice(-8);
  }
  return digits.padStart(8, '0');
}

/**
 * Retrieves the current effective PIN for a client.
 * Prioritizes custom PIN set by client; falls back to phone-derived initial PIN.
 */
export function getClientPin(clientId: string, clientPhone?: string): string {
  try {
    if (inMemoryPinStore[clientId]) {
      return inMemoryPinStore[clientId];
    }
    if (typeof localStorage !== 'undefined') {
      const custom = localStorage.getItem(`pelatihku_client_pin_${clientId}`);
      if (custom && custom.trim()) return custom.trim();
    }
    if (clientPhone) {
      return deriveInitialPinFromPhone(clientPhone);
    }
    return '34567801'; // Default initial PIN for sample member k-01 (last 8 digits of 6281234567801)
  } catch {
    return inMemoryPinStore[clientId] || '34567801';
  }
}

const inMemoryPinHistoryStore: Record<string, PinChangeLogEntry[]> = {};

/**
 * Retrieves the PIN change history for a client from memory or local cache.
 */
export function getClientPinHistory(clientId: string): PinChangeLogEntry[] {
  try {
    if (inMemoryPinHistoryStore[clientId]) {
      return inMemoryPinHistoryStore[clientId];
    }
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(`pelatihku_client_pin_history_${clientId}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    }
    return [];
  } catch {
    return inMemoryPinHistoryStore[clientId] || [];
  }
}

/**
 * Appends an entry to the PIN change history for a client.
 */
export function appendClientPinHistory(clientId: string, entry: PinChangeLogEntry): void {
  try {
    const current = getClientPinHistory(clientId);
    const updated = [entry, ...current];
    inMemoryPinHistoryStore[clientId] = updated;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(`pelatihku_client_pin_history_${clientId}`, JSON.stringify(updated));
    }
  } catch {
    // Ignore quota errors
  }
}

/**
 * Persists a newly updated custom PIN for a client and marks mustChangePin as false.
 * Optionally logs the change to PIN history.
 */
export function setClientPin(
  clientId: string,
  newPin: string,
  logEntry?: PinChangeLogEntry
): void {
  try {
    const clean = newPin.trim();
    inMemoryPinStore[clientId] = clean;
    inMemoryMustChangeStore[clientId] = false;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(`pelatihku_client_pin_${clientId}`, clean);
      localStorage.setItem(`pelatihku_client_must_change_pin_${clientId}`, 'false');
    }
    if (logEntry) {
      appendClientPinHistory(clientId, logEntry);
    }
  } catch {
    // Ignore quota errors
  }
}

/**
 * Checks whether client is still using their default auto-provisioned PIN.
 */
export function mustChangeClientPin(clientId: string): boolean {
  try {
    if (inMemoryMustChangeStore[clientId] !== undefined) {
      return inMemoryMustChangeStore[clientId];
    }
    if (typeof localStorage !== 'undefined') {
      const flag = localStorage.getItem(`pelatihku_client_must_change_pin_${clientId}`);
      if (flag === 'false') return false;
      const custom = localStorage.getItem(`pelatihku_client_pin_${clientId}`);
      return !custom;
    }
    return true;
  } catch {
    return inMemoryMustChangeStore[clientId] ?? true;
  }
}

/**
 * Validates new PIN according to security invariants:
 * - 6 to 8 numeric digits
 * - Exact match with confirmation
 * - Different from current PIN
 * - Rejects trivial sequences (e.g. 123456, 000000)
 */
export function validateNewPin(
  newPin: string,
  confirmPin: string,
  currentPin?: string
): { valid: boolean; error?: string } {
  const cleanNew = newPin.replace(/\D/g, '');
  const cleanConfirm = confirmPin.replace(/\D/g, '');

  if (cleanNew.length < 6 || cleanNew.length > 8) {
    return { valid: false, error: 'PIN baru harus terdiri dari 6 hingga 8 digit angka.' };
  }
  if (cleanNew !== cleanConfirm) {
    return { valid: false, error: 'Konfirmasi PIN baru tidak cocok.' };
  }
  if (currentPin && cleanNew === currentPin) {
    return { valid: false, error: 'PIN baru tidak boleh sama dengan PIN saat ini.' };
  }
  const trivialList = ['000000', '111111', '123456', '654321', '12345678', '87654321'];
  if (trivialList.includes(cleanNew)) {
    return { valid: false, error: 'PIN terlalu mudah ditebak. Gunakan kombinasi angka lain.' };
  }
  return { valid: true };
}
