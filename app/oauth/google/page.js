'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getApiBase, getAuthHeaders } from '@/lib/api';
import { loginWithFirebaseCustomToken, auth } from '@/lib/firebase';

function GoogleCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    if (!code) { router.push('/login'); return; }

    // state가 캘린더용 JSON base64인지 확인
    let isCalendar = false;
    try {
      const stateObj = JSON.parse(atob(state));
      if (stateObj.firebase_token) isCalendar = true;
    } catch {}

    if (isCalendar) {
      handleCalendarCallback(code, state);
    } else {
      handleLoginCallback(code, state);
    }
  }, []);

  async function handleLoginCallback(code, state) {
    try {
      setMsg('구글 로그인 처리 중...');

      // 네이버와 동일하게 code + redirect_uri를 백엔드에 전달
      // 백엔드가 토큰 교환 담당
      const apiBase = getApiBase();
      const res = await fetch(`${apiBase}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          state,
          redirect_uri: `${window.location.origin}/oauth/google`,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`백엔드 오류 ${res.status}: ${errText}`);
      }
      const data = await res.json();
      const customToken = data.custom_token || data.customToken;
      if (!customToken) throw new Error('Custom token 없음');

      // Firebase 로그인
      await loginWithFirebaseCustomToken(customToken);

      // 닉네임 저장
      const nickname = data.user?.nickname || data.nickname || data.name || '사장님';
      localStorage.setItem('user_nickname', nickname);

      // Firebase 완료 대기
      await new Promise((resolve) => {
        const unsub = auth.onAuthStateChanged((user) => {
          if (user) { unsub(); resolve(); }
        });
        setTimeout(resolve, 5000);
      });

      router.push('/dashboard');
    } catch (err) {
      console.error('구글 로그인 실패:', err);
      setMsg(`❌ 로그인 실패: ${err.message}`);
      setTimeout(() => router.push('/login'), 3000);
    }
  }

  async function handleCalendarCallback(code, state) {
    try {
      setMsg('구글 캘린더 연결 중...');
      let firebaseToken = null;
      let realState = state;
      try {
        const stateObj = JSON.parse(atob(state));
        firebaseToken = stateObj.firebase_token;
        realState = stateObj.state;
      } catch {}

      const headers = { 'Content-Type': 'application/json' };
      if (firebaseToken) {
        headers['Authorization'] = `Bearer ${firebaseToken}`;
      } else {
        Object.assign(headers, await getAuthHeaders());
      }

      const res = await fetch(`${getApiBase()}/calendar/connections/oauth-code`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          provider: 'google',
          code,
          redirect_uri: `${window.location.origin}/oauth/google`,
          state: realState,
        }),
      });
      if (!res.ok) throw new Error(`서버 오류: ${res.status}`);
      setMsg('✅ Google 캘린더 연결 완료!');
      setTimeout(() => router.push('/calendar/connect'), 1500);
    } catch (err) {
      console.error(err);
      setMsg(`❌ 연결 실패: ${err.message}`);
    }
  }

  function setMsg(text) {
    const el = document.getElementById('msg');
    if (el) el.textContent = text;
  }

  return (
    <div className="text-center p-8">
      <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
      <div id="msg" className="text-ink-secondary text-sm">구글 처리 중...</div>
    </div>
  );
}

export default function GoogleCallbackPage() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <Suspense fallback={<div className="text-center text-sm text-ink-secondary">로딩 중...</div>}>
        <GoogleCallback />
      </Suspense>
    </main>
  );
}
