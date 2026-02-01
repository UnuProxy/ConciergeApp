import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  GoogleAuthProvider,
  signInWithRedirect,
  signInWithPopup,
  getRedirectResult
} from 'firebase/auth';
import { getStorage } from 'firebase/storage';

// Configurația Firebase folosind variabile de mediu
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Log configuration status (without exposing sensitive data)
// console.log('Firebase Config Status:', {
//   apiKey: firebaseConfig.apiKey ? '✓ Set' : '✗ Missing',
//   authDomain: firebaseConfig.authDomain ? '✓ Set' : '✗ Missing',
//   projectId: firebaseConfig.projectId ? '✓ Set' : '✗ Missing',
//   storageBucket: firebaseConfig.storageBucket ? '✓ Set' : '✗ Missing',
//   messagingSenderId: firebaseConfig.messagingSenderId ? '✓ Set' : '✗ Missing',
//   appId: firebaseConfig.appId ? '✓ Set' : '✗ Missing'
// });

// Check if all required config values are present
const missingConfig = Object.entries(firebaseConfig).filter(([key, value]) => !value);
if (missingConfig.length > 0) {
  console.error('Missing Firebase configuration:', missingConfig.map(([key]) => key));
  console.error('Please ensure all VITE_FIREBASE_* environment variables are set');
}

const app = initializeApp(firebaseConfig);

// Exportă serviciile Firebase pentru a fi utilizate în aplicație
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

export function isInAppBrowser() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /FBAN|FBAV|Instagram|Line|WhatsApp|wv/i.test(ua);
}

export function isMobile() {
  if (typeof navigator === 'undefined') return false;
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent || '');
}

export function shouldUseRedirect() {
  return isMobile() || isInAppBrowser();
}

export async function initAuth() {
  await setPersistence(auth, browserLocalPersistence);
  try {
    return await getRedirectResult(auth);
  } catch (e) {
    console.error('getRedirectResult error:', e?.code, e?.message);
    return null;
  }
}

export async function googleSignIn() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  if (shouldUseRedirect()) {
    await signInWithRedirect(auth, provider);
    return { didRedirect: true };
  }

  try {
    const result = await signInWithPopup(auth, provider);
    return { didRedirect: false, result };
  } catch (e) {
    console.warn('Popup failed, falling back to redirect:', e?.code);
    await signInWithRedirect(auth, provider);
    return { didRedirect: true };
  }
}

export default app;
