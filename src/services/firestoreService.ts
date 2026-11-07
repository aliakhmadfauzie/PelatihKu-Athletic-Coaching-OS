import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  runTransaction,
  onSnapshot,
  Unsubscribe,
  deleteField,
  FieldValue
} from 'firebase/firestore';
import { db } from './firebase';
import {
  ClientProfile,
  CoachProfileData,
  INITIAL_CLIENTS,
  INITIAL_COACH_PROFILE,
  PinChangeLogEntry,
  GymMasterSettings,
  INITIAL_GYM_SETTINGS,
  CatalogExercise,
  EXERCISE_CATALOG
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
const GYM_SETTINGS_COLLECTION = 'gym_settings';
const GYM_SETTINGS_DOC_ID = 'master';
const EXERCISE_CATALOG_DOC_ID = 'exercise_catalog';

/**
 * Recursively removes any keys with `undefined` values to ensure Cloud Firestore
 * never throws "Unsupported field value: undefined".
 */
export function sanitizeForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }
  // Preserve Firestore FieldValue sentinels (e.g. deleteField(), serverTimestamp())
  if (
    typeof data === 'object' &&
    (data instanceof FieldValue ||
      data.constructor?.name === 'FieldValue' ||
      '_methodName' in (data as any) ||
      (data as any)._delegate !== undefined)
  ) {
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

    // Seed 1 sample client (k-01 Budi Santoso)
    const sampleClient = INITIAL_CLIENTS[0];
    const docRef = doc(db, CLIENTS_COLLECTION, sampleClient.id);
    const pin = sampleClient.clientPin || deriveInitialPinFromPhone(sampleClient.telepon);
    batch.set(
      docRef,
      sanitizeForFirestore({
        ...sampleClient,
        clientPin: pin,
        mustChangePin: sampleClient.mustChangePin ?? true,
        updatedAt: new Date().toISOString()
      }),
      { merge: true }
    );

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

    // Seed Gym Master Settings
    const gymRef = doc(db, GYM_SETTINGS_COLLECTION, GYM_SETTINGS_DOC_ID);
    batch.set(
      gymRef,
      sanitizeForFirestore({
        ...INITIAL_GYM_SETTINGS,
        updatedAt: new Date().toISOString()
      }),
      { merge: true }
    );

    // Seed Dynamic Exercise Catalog
    const catalogRef = doc(db, GYM_SETTINGS_COLLECTION, EXERCISE_CATALOG_DOC_ID);
    batch.set(
      catalogRef,
      sanitizeForFirestore({
        items: EXERCISE_CATALOG,
        count: EXERCISE_CATALOG.length,
        updatedAt: new Date().toISOString()
      }),
      { merge: true }
    );

    await batch.commit();
    console.log('[Firestore] Successfully seeded all clients, coach, gym settings & exercise catalog to Firestore!');
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
        console.log('[Firestore] Clients collection is empty. Attempting auto-seed with 1 sample client...');
        seedMockDataIfEmpty().then((seeded) => {
          if (!seeded) {
            onUpdate([INITIAL_CLIENTS[0]]);
          }
        });
        return;
      }

      const clientList: ClientProfile[] = [];
      snapshot.forEach((d) => {
        const data = d.data() as ClientProfile;
        // Keep 1 sample client (k-01) and all coach-created clients (filtering out excess mock k-02 to k-06)
        if (data.id === 'k-01' || !['k-02', 'k-03', 'k-04', 'k-05', 'k-06'].includes(data.id)) {
          clientList.push(data);
        }
      });
      if (clientList.length === 0) {
        clientList.push(INITIAL_CLIENTS[0]);
      }

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
 * Explicitly removes pendingReschedule using deleteField() if not present,
 * ensuring actioned (approved/rejected) requests are permanently cleared from Firestore.
 */
export async function saveClientToFirestore(client: ClientProfile): Promise<void> {
  const docRef = doc(db, CLIENTS_COLLECTION, client.id);
  const payload: any = {
    ...client,
    updatedAt: new Date().toISOString()
  };
  if (!client.pendingReschedule) {
    payload.pendingReschedule = deleteField();
  }
  const sanitized = sanitizeForFirestore(payload);
  await setDoc(docRef, sanitized, { merge: true });
}

/**
 * Writes multiple clients in a batch.
 */
export async function saveClientsBatchToFirestore(clients: ClientProfile[]): Promise<void> {
  const batch = writeBatch(db);
  clients.forEach((client) => {
    const docRef = doc(db, CLIENTS_COLLECTION, client.id);
    const payload: any = {
      ...client,
      updatedAt: new Date().toISOString()
    };
    if (!client.pendingReschedule) {
      payload.pendingReschedule = deleteField();
    }
    const sanitized = sanitizeForFirestore(payload);
    batch.set(docRef, sanitized, { merge: true });
  });
  await batch.commit();
}

/**
 * Persists reschedule decisions atomically to Firestore:
 * Updates nextSession and rescheduleHistory while explicitly deleting pendingReschedule.
 */
export async function updateClientRescheduleInFirestore(
  clientId: string,
  updatedClient: ClientProfile
): Promise<void> {
  const docRef = doc(db, CLIENTS_COLLECTION, clientId);
  const payload: any = {
    nextSession: sanitizeForFirestore(updatedClient.nextSession),
    scheduledSessions: sanitizeForFirestore(updatedClient.scheduledSessions || []),
    rescheduleHistory: sanitizeForFirestore(updatedClient.rescheduleHistory || []),
    updatedAt: new Date().toISOString()
  };
  if (!updatedClient.pendingReschedule) {
    payload.pendingReschedule = deleteField();
  } else {
    payload.pendingReschedule = sanitizeForFirestore(updatedClient.pendingReschedule);
  }
  await updateDoc(docRef, payload);
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
 * Subscribes to real-time changes in Gym Master Settings and locations.
 */
export function subscribeToGymSettings(
  onUpdate: (settings: GymMasterSettings) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const docRef = doc(db, GYM_SETTINGS_COLLECTION, GYM_SETTINGS_DOC_ID);
  return onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as GymMasterSettings;
        onUpdate(data);
      } else {
        onUpdate(INITIAL_GYM_SETTINGS);
        if (typeof window !== 'undefined') {
          saveGymSettingsToFirestore(INITIAL_GYM_SETTINGS).catch(() => {});
        }
      }
    },
    (err) => {
      console.warn('[Firestore] Gym settings listener error:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Saves Gym Master Settings and dynamic locations to Cloud Firestore.
 */
export async function saveGymSettingsToFirestore(settings: GymMasterSettings): Promise<void> {
  const docRef = doc(db, GYM_SETTINGS_COLLECTION, GYM_SETTINGS_DOC_ID);
  const sanitized = sanitizeForFirestore({
    ...settings,
    updatedAt: new Date().toISOString()
  });
  await withFirestoreTimeout(setDoc(docRef, sanitized, { merge: true }), 2500);
}

/**
 * Subscribes to real-time changes in the dynamic exercise catalog.
 */
export function subscribeToExerciseCatalog(
  onUpdate: (catalog: CatalogExercise[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const docRef = doc(db, GYM_SETTINGS_COLLECTION, EXERCISE_CATALOG_DOC_ID);
  return onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data && Array.isArray(data.items)) {
          onUpdate(data.items as CatalogExercise[]);
          return;
        }
      }
      onUpdate(EXERCISE_CATALOG);
      if (typeof window !== 'undefined') {
        saveExerciseCatalogToFirestore(EXERCISE_CATALOG).catch(() => {});
      }
    },
    (err) => {
      console.warn('[Firestore] Exercise catalog listener error:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Saves the dynamic exercise catalog to Cloud Firestore.
 */
export async function saveExerciseCatalogToFirestore(catalog: CatalogExercise[]): Promise<void> {
  const docRef = doc(db, GYM_SETTINGS_COLLECTION, EXERCISE_CATALOG_DOC_ID);
  const sanitized = sanitizeForFirestore({
    items: catalog,
    count: catalog.length,
    updatedAt: new Date().toISOString()
  });
  await withFirestoreTimeout(setDoc(docRef, sanitized, { merge: true }), 2500);
}

/**
 * Updates a client's security PIN directly in Cloud Firestore database and logs to PIN history.
 */
export async function updateClientPinInFirestore(
  clientId: string,
  newPin: string,
  logEntry?: PinChangeLogEntry
): Promise<boolean> {
  const docRef = doc(db, CLIENTS_COLLECTION, clientId);
  try {
    await withFirestoreTimeout(
      runTransaction(db, async (tx) => {
        const docSnap = await tx.get(docRef);
        const existingHistory: PinChangeLogEntry[] = docSnap.exists()
          ? (docSnap.data().pinChangeHistory || [])
          : [];

        const updatedHistory = logEntry
          ? [logEntry, ...existingHistory.filter((e) => e.id !== logEntry.id)]
          : existingHistory;

        tx.update(
          docRef,
          sanitizeForFirestore({
            clientPin: newPin.trim(),
            mustChangePin: false,
            pinChangedAt: new Date().toISOString(),
            pinChangeHistory: updatedHistory,
            updatedAt: new Date().toISOString()
          })
        );
      }),
      2500
    );
    return true;
  } catch {
    try {
      const docSnap = await withFirestoreTimeout(getDoc(docRef), 2000);
      const existingHistory: PinChangeLogEntry[] = docSnap.exists()
        ? (docSnap.data().pinChangeHistory || [])
        : [];

      const updatedHistory = logEntry
        ? [logEntry, ...existingHistory.filter((e) => e.id !== logEntry.id)]
        : existingHistory;

      await withFirestoreTimeout(
        updateDoc(
          docRef,
          sanitizeForFirestore({
            clientPin: newPin.trim(),
            mustChangePin: false,
            pinChangedAt: new Date().toISOString(),
            pinChangeHistory: updatedHistory,
            updatedAt: new Date().toISOString()
          })
        ),
        2500
      );
      return true;
    } catch (err) {
      console.warn('[Firestore] Failed to update client PIN in Firestore, fallback to local state:', err);
      return false;
    }
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
  const docRef = doc(db, CLIENTS_COLLECTION, clientId);
  try {
    await withFirestoreTimeout(
      runTransaction(db, async (tx) => {
        const docSnap = await tx.get(docRef);
        const existing: PinChangeLogEntry[] = docSnap.exists()
          ? (docSnap.data().pinChangeHistory || [])
          : [];
        const updated = [entry, ...existing.filter((e) => e.id !== entry.id)];
        tx.update(
          docRef,
          sanitizeForFirestore({
            pinChangeHistory: updated,
            updatedAt: new Date().toISOString()
          })
        );
      }),
      2500
    );
    return true;
  } catch {
    try {
      const docSnap = await withFirestoreTimeout(getDoc(docRef), 2000);
      const existing: PinChangeLogEntry[] = docSnap.exists()
        ? (docSnap.data().pinChangeHistory || [])
        : [];
      const updated = [entry, ...existing.filter((e) => e.id !== entry.id)];
      await withFirestoreTimeout(
        updateDoc(
          docRef,
          sanitizeForFirestore({
            pinChangeHistory: updated,
            updatedAt: new Date().toISOString()
          })
        ),
        2500
      );
      return true;
    } catch (err) {
      console.warn(`[Firestore] Failed to patch PIN change history for client ${clientId}:`, err);
      return false;
    }
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
