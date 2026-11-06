import crypto from 'crypto';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, writeBatch } from 'firebase/firestore';
import { INITIAL_CLIENTS, INITIAL_COACH_PROFILE } from '../src/data/mockData';
import { deriveInitialPinFromPhone } from '../src/services/authGatekeeperService';

const firebaseConfig = {
  apiKey: "AIzaSyAsdJj48vIgtHxR07GS1_rEcMWW2Q3paHw",
  authDomain: "pelatihku-pro.firebaseapp.com",
  projectId: "pelatihku-pro",
  storageBucket: "pelatihku-pro.firebasestorage.app",
  messagingSenderId: "19129591508",
  appId: "1:19129591508:web:10c90a1eed1bc24ea47d41"
};

export interface SeedUserEntry {
  uid: string;
  pin: string;
  role: 'coach' | 'admin' | 'client';
  phoneNumber: string;
  displayName: string;
  coachId: string;
  mustChangePin: boolean;
  clientId?: string;
}

export function generateHashedCredential(pin: string) {
  const salt = crypto.randomBytes(16).toString('hex');
  const pinHash = crypto.createHmac('sha256', salt).update(pin).digest('hex');
  return { salt, pinHash };
}

export const SEED_USERS: SeedUserEntry[] = [
  {
    uid: 'pas_coach',
    pin: '123456',
    role: 'coach',
    phoneNumber: '+628119876543',
    displayName: INITIAL_COACH_PROFILE.name || 'Coach Panji Akbar Syamsi, S.Or.',
    coachId: 'pas_coach',
    mustChangePin: false
  },
  {
    uid: 'gym_admin',
    pin: '999888',
    role: 'admin',
    phoneNumber: '+62811000999',
    displayName: 'Gym Operations Manager',
    coachId: 'none',
    mustChangePin: false
  },
  ...INITIAL_CLIENTS.map((client) => ({
    uid: client.id,
    pin: deriveInitialPinFromPhone(client.telepon),
    role: 'client' as const,
    phoneNumber: client.telepon.startsWith('+') ? client.telepon : '+' + client.telepon,
    displayName: client.nama_lengkap,
    coachId: 'pas_coach',
    mustChangePin: true,
    clientId: client.id
  }))
];

async function main() {
  console.log('🚀 Initializing PelatihKu PRO RBAC & Auth Database Seeder...');
  console.log(`📦 Preparing ${SEED_USERS.length} accounts for collections "users" and "internal_auth"...`);

  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  const batch = writeBatch(db);
  const timestamp = new Date().toISOString();

  SEED_USERS.forEach((user) => {
    const creds = generateHashedCredential(user.pin);

    // 1. users collection doc
    const userDocRef = doc(db, 'users', user.uid);
    batch.set(userDocRef, {
      uid: user.uid,
      phoneNumber: user.phoneNumber,
      role: user.role,
      coachId: user.coachId,
      profile: {
        displayName: user.displayName,
        avatarUrl: ''
      },
      mustChangePin: user.mustChangePin,
      createdAt: timestamp,
      updatedAt: timestamp
    }, { merge: true });

    // 2. internal_auth collection doc
    const authDocRef = doc(db, 'internal_auth', user.uid);
    const authData: Record<string, any> = {
      uid: user.uid,
      role: user.role,
      salt: creds.salt,
      pinHash: creds.pinHash,
      createdAt: timestamp,
      updatedAt: timestamp
    };
    if (user.clientId) {
      authData.clientId = user.clientId;
    }
    batch.set(authDocRef, authData, { merge: true });

    console.log(`   + [${user.role.toUpperCase()}] ${user.uid} (${user.displayName}) -> Initial PIN: ${user.pin}`);
  });

  try {
    console.log('💾 Committing batch to Cloud Firestore...');
    await batch.commit();
    console.log('✅ RBAC and PIN authentication database successfully seeded to Cloud Firestore!');
    process.exit(0);
  } catch (err: any) {
    console.warn('⚠️ Client-SDK batch commit notice:', err.message);
    console.log('ℹ️ Note: Client SDK writes to internal_auth are blocked by firestore.rules (allow read, write: if false;).');
    console.log('ℹ️ Server-side / Admin operations or Firebase MCP Server must be used to mutate internal_auth.');
    process.exit(0);
  }
}

if (process.argv[1]?.includes('seedAuthDatabase')) {
  main().catch(console.error);
}
