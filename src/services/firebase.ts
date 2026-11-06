import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  initializeFirestore,
  getFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  Firestore
} from 'firebase/firestore';

export const firebaseConfig = {
  apiKey: "AIzaSyAsdJj48vIgtHxR07GS1_rEcMWW2Q3paHw",
  authDomain: "pelatihku-pro.firebaseapp.com",
  projectId: "pelatihku-pro",
  storageBucket: "pelatihku-pro.firebasestorage.app",
  messagingSenderId: "19129591508",
  appId: "1:19129591508:web:10c90a1eed1bc24ea47d41"
};

// Singleton Firebase App instance
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Cloud Firestore with Multi-Tab Offline Persistent Cache in browser
let firestoreInstance: Firestore;
if (typeof window !== 'undefined') {
  try {
    firestoreInstance = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
      }),
      ignoreUndefinedProperties: true
    });
  } catch {
    firestoreInstance = getFirestore(app);
  }
} else {
  firestoreInstance = getFirestore(app);
}

export const db = firestoreInstance;
