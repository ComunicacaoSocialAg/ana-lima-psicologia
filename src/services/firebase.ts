import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  initializeFirestore,
  getFirestore,
  Firestore,
  persistentLocalCache,
  persistentMultipleTabManager
} from 'firebase/firestore';
import { getAuth, Auth, setPersistence, browserLocalPersistence } from 'firebase/auth';

// Configuração oficial do Firebase para ana-lima-psi-app
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAqd5ypUjcPWOlzzXCanmrFIVg6B5_4TW0",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "ana-lima-psi-app.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "ana-lima-psi-app",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "ana-lima-psi-app.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "648642882842",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:648642882842:web:b7b7680e3fbca1b52050a3",
};

export const isFirebaseConfigured = true;

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let auth: Auth | null = null;

try {
  const isNewApp = getApps().length === 0;
  app = isNewApp ? initializeApp(firebaseConfig) : getApps()[0];

  if (isNewApp) {
    try {
      // Persistência offline em disco (IndexedDB) com suporte multi-abas e reconexão automática
      db = initializeFirestore(app, {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager(),
        }),
      });
    } catch {
      db = getFirestore(app);
    }
  } else {
    db = getFirestore(app);
  }

  auth = getAuth(app);

  // Garantir persistência de sessão no navegador/celular
  if (auth) {
    setPersistence(auth, browserLocalPersistence).catch((err) => {
      console.warn('Erro ao configurar persistência do Auth:', err);
    });
  }
} catch (error) {
  console.warn("Erro ao inicializar Firebase:", error);
}

export { app, db, auth };
