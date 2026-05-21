import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, onAuthStateChanged, signOut, browserLocalPersistence, setPersistence } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

export async function loginWithFirebaseCustomToken(customToken) {
  await setPersistence(auth, browserLocalPersistence);
  const userCredential = await signInWithCustomToken(auth, customToken);
  const idToken = await userCredential.user.getIdToken();
  localStorage.setItem('firebase_id_token', idToken);
  localStorage.setItem('firebase_uid', userCredential.user.uid);
  return userCredential.user;
}

export async function logout() {
  await signOut(auth);
  localStorage.removeItem('firebase_id_token');
  localStorage.removeItem('firebase_uid');
}

export function watchAuthState(callback) {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      const idToken = await user.getIdToken();
      localStorage.setItem('firebase_id_token', idToken);
      localStorage.setItem('firebase_uid', user.uid);
      callback(user);
    } else {
      callback(null);
    }
  });
}

export default app;