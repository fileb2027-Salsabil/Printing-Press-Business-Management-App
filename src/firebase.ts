import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  updatePassword,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  initializeFirestore,
  getFirestore,
  memoryLocalCache,
  doc,
  getDocFromServer,
  setLogLevel,
  Firestore,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

setLogLevel('silent');

const isNewApp = getApps().length === 0;
export const app = isNewApp ? initializeApp(firebaseConfig) : getApp();

function createFirestoreInstance(): Firestore {
  if (isNewApp) {
    try {
      return initializeFirestore(
        app,
        {
          localCache: memoryLocalCache(),
          experimentalForceLongPolling: true,
          ignoreUndefinedProperties: true,
        },
        firebaseConfig.firestoreDatabaseId
      );
    } catch {
      return getFirestore(app, firebaseConfig.firestoreDatabaseId);
    }
  }
  return getFirestore(app, firebaseConfig.firestoreDatabaseId);
}

export const db = createFirestoreInstance();
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export function getSecondaryAuth() {
  const secApp =
    getApps().find((a) => a.name === 'partyProvisioner') ||
    initializeApp(firebaseConfig, 'partyProvisioner');
  return getAuth(secApp);
}

export {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  updatePassword,
  signOut,
  onAuthStateChanged,
};
export type { User };

// Clear expired quota lockout marker on load (never call disableNetwork/enableNetwork to avoid WatchStream assertion crashes)
if (typeof localStorage !== 'undefined') {
  try {
    const currentExpiry = localStorage.getItem('firestore_quota_exhausted_until');
    if (currentExpiry && Number(currentExpiry) <= Date.now()) {
      localStorage.removeItem('firestore_quota_exhausted_until');
    }
  } catch {
    // ignore storage read issues
  }
}

// Validate initial connection to Firestore when quota is available
async function testConnection() {
  try {
    if (typeof localStorage !== 'undefined') {
      const val = localStorage.getItem('firestore_quota_exhausted_until');
      if (val && Date.now() < Number(val)) {
        return;
      }
    }
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error) {
      const msg = error.message.toLowerCase();
      if (msg.includes('resource-exhausted') || msg.includes('quota')) {
        try {
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem(
              'firestore_quota_exhausted_until',
              (Date.now() + 12 * 60 * 60 * 1000).toString()
            );
          }
        } catch {
          // ignore storage errors
        }
        console.warn('Firebase quota note:', error.message);
      } else if (msg.includes('the client is offline')) {
        console.warn('Firebase connection note:', error.message);
      }
    }
  }
}
testConnection();
