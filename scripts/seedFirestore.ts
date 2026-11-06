import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, writeBatch } from 'firebase/firestore';
import { INITIAL_CLIENTS, INITIAL_COACH_PROFILE } from '../src/data/mockData.ts';

const firebaseConfig = {
  apiKey: "AIzaSyAsdJj48vIgtHxR07GS1_rEcMWW2Q3paHw",
  authDomain: "pelatihku-pro.firebaseapp.com",
  projectId: "pelatihku-pro",
  storageBucket: "pelatihku-pro.firebasestorage.app",
  messagingSenderId: "19129591508",
  appId: "1:19129591508:web:10c90a1eed1bc24ea47d41"
};

async function main() {
  console.log('🚀 Connecting to Firebase project: pelatihku-pro...');
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  console.log(`📦 Seeding ${INITIAL_CLIENTS.length} client documents to "clients" collection...`);
  const batch = writeBatch(db);

  INITIAL_CLIENTS.forEach((client) => {
    const docRef = doc(db, 'clients', client.id);
    batch.set(docRef, {
      ...client,
      updatedAt: new Date().toISOString()
    });
    console.log(`   + Added: [${client.id}] ${client.nama_lengkap} (${client.target_utama})`);
  });

  const coachRef = doc(db, 'coach_profile', 'pas_profile');
  batch.set(coachRef, {
    ...INITIAL_COACH_PROFILE,
    updatedAt: new Date().toISOString()
  });
  console.log(`   + Added Coach Profile: [pas_profile] ${INITIAL_COACH_PROFILE.name}`);

  console.log('💾 Committing batch to Cloud Firestore...');
  await batch.commit();

  console.log('✅ Successfully seeded Cloud Firestore with production mock data!');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
