import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';
import { db } from './firebase';
import {
  ClientProfile,
  CoachProfileData,
  INITIAL_CLIENTS,
  INITIAL_COACH_PROFILE,
  PinChangeLogEntry
} from '../data/mockData';
import {
  deriveInitialPinFromPhone,
  getClientPin,
  mustChangeClientPin,
  UserSessionProfile
} from './authGatekeeperService';

const CLIENTS_COLLECTION = 'clients';
const COACH_COLLECTION = 'coach_profile';
const COACH_DOC_ID = 'pas_profile';

/**
 * Recursively removes any keys with `undefined` values to ensure Cloud Firestore
 * never throws "Unsupported field value: undefined".
 */
export function sanitizeForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }
  if (Array.isArray(data)) {
    return data
      .filter((item) => item !== undefined)
      .map((item) => sanitizeForFirestore(item)) as unknown as T;
  }
  if (typeof data === 'object') {
    const cleaned: Record<string, any> = {};
    for (const [key, val] of Object.entries(data)) {
      if (val !== undefined) {
        cleaned[key] = sanitizeForFirestore(val);
      }
    }
    return cleaned as T;
  }
  return data;
}

/**
 * Utility to wrap Firestore network requests with a fast timeout
 * to prevent gym floor UI freezes and enable graceful offline fallback.
 */
export const withFirestoreTimeout = <T>(promise: Promise<T>, ms = 1800): Promise<T> =>
  Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Firestore network timeout')), ms))
  ]);

/**
 * Checks if the clients collection in Firestore is empty.
 * If empty, automatically seeds it with INITIAL_CLIENTS and INITIAL_COACH_PROFILE.
 */
export async function seedMockDataIfEmpty(force: boolean = false): Promise<boolean> {
  try {
    const clientsRef = collection(db, CLIENTS_COLLECTION);
    const existingSnap = await getDocs(clientsRef);

    if (!force && !existingSnap.empty) {
      console.log(`[Firestore] Database already seeded with ${existingSnap.size} clients.`);
      return false;
    }

    console.log('[Firestore] Seeding initial mock data to Cloud Firestore...');
    const batch = writeBatch(db);

    // Seed all initial clients
    INITIAL_CLIENTS.forEach((client) => {
      const docRef = doc(db, CLIENTS_COLLECTION, client.id);
      const pin = client.clientPin || deriveInitialPinFromPhone(client.telepon);
      batch.set(
        docRef,
        sanitizeForFirestore({
          ...client,
          clientPin: pin,
          mustChangePin: client.mustChangePin ?? true,
          updatedAt: new Date().toISOString()
        }),
        { merge: true }
      );
    });

    // Seed Coach Panji profile
    const coachRef = doc(db, COACH_COLLECTION, COACH_DOC_ID);
    batch.set(
      coachRef,
      sanitizeForFirestore({
        ...INITIAL_COACH_PROFILE,
        coachPin: '123456',
        updatedAt: new Date().toISOString()
      }),
      { merge: true }
    );

    await batch.commit();
    console.log('[Firestore] Successfully seeded all clients and coach profile to Firestore!');
    return true;
  } catch (error) {
    console.warn('[Firestore] Error seeding mock data to Firestore:', error);
    return false;
  }
}

/**
 * Subscribes to real-time client changes.
 * Automatically initiates seed if database is found to be empty on first load.
 */
export function subscribeToClients(
  onUpdate: (clients: ClientProfile[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const clientsRef = collection(db, CLIENTS_COLLECTION);

  return onSnapshot(
    clientsRef,
    (snapshot) => {
      if (snapshot.empty) {
        console.log('[Firestore] Clients collection is empty. Attempting auto-seed...');
        seedMockDataIfEmpty().then((seeded) => {
          if (!seeded) {
            onUpdate(INITIAL_CLIENTS);
          }
        });
        return;
      }

      const clientList: ClientProfile[] = [];
      snapshot.forEach((d) => {
        const data = d.data() as ClientProfile;
        clientList.push(data);
      });

      // Stable sorting:
      // 1. Newly registered clients (timestamp id: k-17...) appear at top, newest first
      // 2. Initial clients (k-01 to k-06) follow in sequential order
      clientList.sort((a, b) => {
        const aNum = parseInt(a.id.replace('k-', ''), 10);
        const bNum = parseInt(b.id.replace('k-', ''), 10);
        if (!isNaN(aNum) && !isNaN(bNum)) {
          if (aNum > 1000000 && bNum > 1000000) {
            return bNum - aNum;
          }
          if (aNum > 1000000 && bNum <= 1000000) return -1;
          if (bNum > 1000000 && aNum <= 1000000) return 1;
          return aNum - bNum;
        }
        return a.nama_lengkap.localeCompare(b.nama_lengkap);
      });

      onUpdate(clientList);
    },
    (err) => {
      console.warn('[Firestore] Snapshot listener error:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Subscribes to real-time Coach Profile changes.
 */
export function subscribeToCoachProfile(
  onUpdate: (coach: CoachProfileData) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const coachRef = doc(db, COACH_COLLECTION, COACH_DOC_ID);

  return onSnapshot(
    coachRef,
    (snapshot) => {
      if (snapshot.exists()) {
        onUpdate(snapshot.data() as CoachProfileData);
      } else {
        onUpdate(INITIAL_COACH_PROFILE);
      }
    },
    (err) => {
      console.warn('[Firestore] Coach profile listener error:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Writes or updates a client document in Firestore.
 */
export async function saveClientToFirestore(client: ClientProfile): Promise<void> {
  const docRef = doc(db, CLIENTS_COLLECTION, client.id);
  const sanitized = sanitizeForFirestore({
    ...client,
    updatedAt: new Date().toISOString()
  });
  await setDoc(docRef, sanitized, { merge: true });
}

/**
 * Writes multiple clients in a batch.
 */
export async function saveClientsBatchToFirestore(clients: ClientProfile[]): Promise<void> {
  const batch = writeBatch(db);
  clients.forEach((client) => {
    const docRef = doc(db, CLIENTS_COLLECTION, client.id);
    const sanitized = sanitizeForFirestore({
      ...client,
      updatedAt: new Date().toISOString()
    });
    batch.set(docRef, sanitized, { merge: true });
  });
  await batch.commit();
}

/**
 * Saves Coach profile updates to Firestore.
 */
export async function saveCoachProfileToFirestore(coach: CoachProfileData): Promise<void> {
  const docRef = doc(db, COACH_COLLECTION, COACH_DOC_ID);
  const sanitized = sanitizeForFirestore({
    ...coach,
    updatedAt: new Date().toISOString()
  });
  await setDoc(docRef, sanitized, { merge: true });
}

/**
 * Deletes a client document from Firestore.
 */
export async function deleteClientFromFirestore(clientId: string): Promise<void> {
  const docRef = doc(db, CLIENTS_COLLECTION, clientId);
  await deleteDoc(docRef);
}

/**
 * Updates a client's security PIN directly in Cloud Firestore database and logs to PIN history.
 */
export async function updateClientPinInFirestore(
  clientId: string,
  newPin: string,
  logEntry?: PinChangeLogEntry
): Promise<boolean> {
  try {
    const docRef = doc(db, CLIENTS_COLLECTION, clientId);
    const docSnap = await withFirestoreTimeout(getDoc(docRef), 2000);
    const existingHistory: PinChangeLogEntry[] = docSnap.exists()
      ? (docSnap.data().pinChangeHistory || [])
      : [];

    const updatedHistory = logEntry
      ? [logEntry, ...existingHistory.filter((e) => e.id !== logEntry.id)]
      : existingHistory;

    await withFirestoreTimeout(
      updateDoc(docRef, {
        clientPin: newPin.trim(),
        mustChangePin: false,
        pinChangedAt: new Date().toISOString(),
        pinChangeHistory: updatedHistory,
        updatedAt: new Date().toISOString()
      }),
      2500
    );
    return true;
  } catch (err) {
    console.warn('[Firestore] Failed to update client PIN in Firestore, fallback to local state:', err);
    return false;
  }
}

/**
 * Fetches PIN change history for a given client from Cloud Firestore.
 * Supports offline cache fallback to INITIAL_CLIENTS or empty list.
 */
export async function fetchClientPinHistoryFromFirestore(
  clientId: string
): Promise<PinChangeLogEntry[]> {
  try {
    const docRef = doc(db, CLIENTS_COLLECTION, clientId);
    const docSnap = await withFirestoreTimeout(getDoc(docRef), 2000);
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (Array.isArray(data.pinChangeHistory) && data.pinChangeHistory.length > 0) {
        return data.pinChangeHistory as PinChangeLogEntry[];
      }
    }
    const mockClient = INITIAL_CLIENTS.find((c) => c.id === clientId);
    return mockClient?.pinChangeHistory || [];
  } catch (err) {
    console.warn(`[Firestore] Failed to fetch PIN history for client ${clientId}:`, err);
    const mockClient = INITIAL_CLIENTS.find((c) => c.id === clientId);
    return mockClient?.pinChangeHistory || [];
  }
}

/**
 * Subscribes to real-time PIN change history updates for a specific client.
 */
export function subscribeToClientPinHistory(
  clientId: string,
  onUpdate: (history: PinChangeLogEntry[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const docRef = doc(db, CLIENTS_COLLECTION, clientId);
  return onSnapshot(
    docRef,
    (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const history: PinChangeLogEntry[] = Array.isArray(data.pinChangeHistory)
          ? data.pinChangeHistory
          : [];
        onUpdate(history);
      } else {
        const mockClient = INITIAL_CLIENTS.find((c) => c.id === clientId);
        onUpdate(mockClient?.pinChangeHistory || []);
      }
    },
    (err) => {
      console.warn(`[Firestore] Pin history subscription error for ${clientId}:`, err);
      if (onError) onError(err);
      const mockClient = INITIAL_CLIENTS.find((c) => c.id === clientId);
      onUpdate(mockClient?.pinChangeHistory || []);
    }
  );
}

/**
 * Patches a single PIN change log entry directly into a client document in Cloud Firestore.
 */
export async function patchClientPinChangeHistoryInFirestore(
  clientId: string,
  entry: PinChangeLogEntry
): Promise<boolean> {
  try {
    const docRef = doc(db, CLIENTS_COLLECTION, clientId);
    const docSnap = await withFirestoreTimeout(getDoc(docRef), 2000);
    const existing: PinChangeLogEntry[] = docSnap.exists()
      ? (docSnap.data().pinChangeHistory || [])
      : [];
    const updated = [entry, ...existing.filter((e) => e.id !== entry.id)];
    await withFirestoreTimeout(
      updateDoc(docRef, {
        pinChangeHistory: updated,
        updatedAt: new Date().toISOString()
      }),
      2500
    );
    return true;
  } catch (err) {
    console.warn(`[Firestore] Failed to patch PIN change history for client ${clientId}:`, err);
    return false;
  }
}

/**
 * Verifies PIN and authenticates directly against Cloud Firestore database.
 * Supports offline resilience: falls back to local storage cache if network is unavailable.
 */
export async function authenticateWithFirestore(
  role: 'coach' | 'client' | 'admin',
  enteredPin: string,
  clientId?: string
): Promise<{
  success: boolean;
  user?: {
    uid: string;
    role: 'coach' | 'client' | 'admin';
    displayName: string;
    phoneNumber?: string;
    clientId?: string;
  };
  mustChangePin?: boolean;
  expectedPinHint?: string;
  error?: string;
}> {
  const cleanPin = enteredPin.replace(/\D/g, '');

  if (role === 'client') {
    const targetId = clientId || 'k-01';
    try {
      const docRef = doc(db, CLIENTS_COLLECTION, targetId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data() as ClientProfile & { clientPin?: string };
        const dbPin = data.clientPin || deriveInitialPinFromPhone(data.telepon);
        const matches = cleanPin === dbPin;

        if (matches) {
          return {
            success: true,
            user: {
              uid: targetId,
              role: 'client',
              displayName: data.nama_lengkap || 'Budi Santoso',
              phoneNumber: data.telepon,
              clientId: targetId
            },
            mustChangePin: data.mustChangePin ?? true
          };
        } else {
          return {
            success: false,
            expectedPinHint: dbPin,
            error: `PIN salah! Gunakan PIN Member: ${dbPin}`
          };
        }
      }
    } catch (err) {
      console.warn('[Firestore] Database auth query failed, using offline cache fallback:', err);
    }

    // Offline gym floor fallback for client
    const cachedPin = getClientPin(targetId);
    const matches = cleanPin === cachedPin;
    return {
      success: matches,
      user: matches
        ? {
            uid: targetId,
            role: 'client',
            displayName: 'Budi Santoso',
            clientId: targetId
          }
        : undefined,
      mustChangePin: mustChangeClientPin(targetId),
      expectedPinHint: cachedPin,
      error: matches ? undefined : `PIN salah! Gunakan PIN Member: ${cachedPin}`
    };
  }

  if (role === 'coach') {
    try {
      const coachRef = doc(db, COACH_COLLECTION, COACH_DOC_ID);
      const coachSnap = await getDoc(coachRef);
      if (coachSnap.exists()) {
        const data = coachSnap.data() as CoachProfileData & { coachPin?: string };
        const dbPin = data.coachPin || '123456';
        const matches = cleanPin === dbPin;
        return {
          success: matches,
          user: matches
            ? {
                uid: 'pas_coach',
                role: 'coach',
                displayName: data.name || 'Coach Panji Akbar Syamsi'
              }
            : undefined,
          expectedPinHint: dbPin,
          error: matches ? undefined : `PIN Coach salah! Gunakan PIN Coach: ${dbPin}`
        };
      }
    } catch (err) {
      console.warn('[Firestore] Coach profile auth fetch failed, using fallback:', err);
    }

    const fallbackPin =
      typeof localStorage !== 'undefined'
        ? localStorage.getItem('pelatihku_v45_coach_pin') || '123456'
        : '123456';
    const matches = cleanPin === fallbackPin;
    return {
      success: matches,
      user: matches
        ? {
            uid: 'pas_coach',
            role: 'coach',
            displayName: 'Coach Panji Akbar Syamsi'
          }
        : undefined,
      expectedPinHint: fallbackPin,
      error: matches ? undefined : `PIN Coach salah! Gunakan PIN Coach: ${fallbackPin}`
    };
  }

  // Admin persona
  const adminPin = '999888';
  const matches = cleanPin === adminPin;
  return {
    success: matches,
    user: matches
      ? {
          uid: 'gym_admin',
          role: 'admin',
          displayName: 'Gym Operations Manager'
        }
      : undefined,
    expectedPinHint: adminPin,
    error: matches ? undefined : `PIN Admin salah! Gunakan PIN Admin: ${adminPin}`
  };
}

/**
 * Fetches the active expected PIN directly from Firestore database.
 */
export async function getExpectedPinFromDatabase(
  role: 'coach' | 'client' | 'admin',
  clientId: string = 'k-01'
): Promise<string> {
  if (role === 'coach') {
    try {
      const coachRef = doc(db, COACH_COLLECTION, COACH_DOC_ID);
      const snap = await getDoc(coachRef);
      if (snap.exists()) {
        const data = snap.data() as { coachPin?: string };
        if (data.coachPin) return data.coachPin;
      }
    } catch {
      // Ignore offline error
    }
    return typeof localStorage !== 'undefined'
      ? localStorage.getItem('pelatihku_v45_coach_pin') || '123456'
      : '123456';
  }

  if (role === 'client') {
    try {
      const docRef = doc(db, CLIENTS_COLLECTION, clientId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data() as ClientProfile & { clientPin?: string };
        if (data.clientPin) return data.clientPin;
        if (data.telepon) return deriveInitialPinFromPhone(data.telepon);
      }
    } catch {
      // Ignore offline error
    }
    return getClientPin(clientId);
  }

  return '999888';
}

export interface UniversalAuthResult {
  success: boolean;
  user?: UserSessionProfile;
  mustChangePin?: boolean;
  error?: string;
}

/**
 * Universal PIN Authentication:
 * Checks entered PIN against Coach profile, Admin, or all Clients in Firestore.
 * Automatically identifies user role, name, and ID without hardcoded persona selection.
 */
export async function authenticatePinUniversally(
  enteredPin: string,
  localClientsCache?: ClientProfile[]
): Promise<UniversalAuthResult> {
  const cleanPin = enteredPin.replace(/\D/g, '').trim();
  if (cleanPin.length < 6) {
    return {
      success: false,
      error: 'Masukkan minimal 6 digit PIN akun Anda.'
    };
  }

  // 1. Check Admin PIN
  const adminPin = '999888';
  if (cleanPin === adminPin) {
    return {
      success: true,
      user: {
        uid: 'gym_admin',
        role: 'admin',
        displayName: 'Gym Operations Manager'
      }
    };
  }

  // 2. Fast check Coach local / default PIN
  const localCoachPin =
    typeof localStorage !== 'undefined'
      ? localStorage.getItem('pelatihku_v45_coach_pin') || '123456'
      : '123456';
  if (cleanPin === localCoachPin) {
    return {
      success: true,
      user: {
        uid: 'pas_coach',
        role: 'coach',
        displayName: 'Coach Panji Akbar Syamsi'
      }
    };
  }

  // 3. Fast match in local clients cache or INITIAL_CLIENTS
  const clientsPool =
    localClientsCache && localClientsCache.length > 0 ? localClientsCache : INITIAL_CLIENTS;

  for (const client of clientsPool) {
    const savedPin = client.clientPin;
    const initialPin = client.telepon ? deriveInitialPinFromPhone(client.telepon) : undefined;
    const activeClientPin = savedPin || initialPin || getClientPin(client.id, client.telepon);

    if (cleanPin === activeClientPin) {
      return {
        success: true,
        user: {
          uid: client.id,
          role: 'client',
          displayName: client.nama_lengkap,
          clientId: client.id
        },
        mustChangePin: client.mustChangePin ?? mustChangeClientPin(client.id)
      };
    }
  }

  // 4. If not matched in memory, verify with Cloud Firestore (with 1.5s network timeout protection)
  const withTimeout = <T>(promise: Promise<T>, ms = 1500): Promise<T> =>
    Promise.race([
      promise,
      new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Firestore network timeout')), ms))
    ]);

  try {
    // Check updated Coach PIN in Firestore
    const coachRef = doc(db, COACH_COLLECTION, COACH_DOC_ID);
    const coachSnap = await withTimeout(getDoc(coachRef));
    if (coachSnap.exists()) {
      const data = coachSnap.data() as CoachProfileData & { coachPin?: string };
      const dbCoachPin = data.coachPin;
      if (dbCoachPin && cleanPin === dbCoachPin) {
        return {
          success: true,
          user: {
            uid: 'pas_coach',
            role: 'coach',
            displayName: data.name || 'Coach Panji Akbar Syamsi'
          }
        };
      }
    }
  } catch (err) {
    console.warn('[Firestore] Universal auth coach check fallback:', err);
  }

  try {
    // Check updated Client PIN in Firestore
    const clientsRef = collection(db, CLIENTS_COLLECTION);
    const snap = await withTimeout(getDocs(clientsRef));
    if (!snap.empty) {
      for (const d of snap.docs) {
        const client = d.data() as ClientProfile & { clientPin?: string; mustChangePin?: boolean };
        const savedPin = client.clientPin;
        const initialPin = client.telepon ? deriveInitialPinFromPhone(client.telepon) : undefined;
        const activeClientPin = savedPin || initialPin || getClientPin(client.id, client.telepon);

        if (cleanPin === activeClientPin) {
          return {
            success: true,
            user: {
              uid: client.id,
              role: 'client',
              displayName: client.nama_lengkap,
              clientId: client.id
            },
            mustChangePin: client.mustChangePin ?? (cleanPin === initialPin)
          };
        }
      }
    }
  } catch (err) {
    console.warn('[Firestore] Universal auth clients scan fallback:', err);
  }

  return {
    success: false,
    error: 'PIN tidak terdaftar. Pastikan 6–8 digit PIN Anda sudah sesuai.'
  };
}
