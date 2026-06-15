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
  // Firebase는 초기화 시 user=null을 먼저 한 번 뱉음
  // localStorage에 토큰이 있으면 Firebase가 복원 중이므로 null 무시
  let initialized = false;

  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      initialized = true;
      const idToken = await user.getIdToken();
      localStorage.setItem('firebase_id_token', idToken);
      localStorage.setItem('firebase_uid', user.uid);
      callback(user);
    } else {
      // 토큰이 localStorage에 있으면 Firebase가 아직 복원 중 → null 무시
      const hasToken = typeof window !== 'undefined' && !!localStorage.getItem('firebase_id_token');
      if (!initialized && hasToken) {
        // 아직 초기화 안 됐고 토큰 있음 → 기다림 (콜백 호출 안 함)
        return;
      }
      initialized = true;
      callback(null);
    }
  });
}

export default app;
