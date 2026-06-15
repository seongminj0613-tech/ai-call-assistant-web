'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getApiBase, getAuthHeaders } from '@/lib/api';
import { loginWithFirebaseCustomToken, auth } from '@/lib/firebase';

function NaverCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    if (!code) { router.push('/login'); return; }

    // state가 캘린더용 JSON인지 확인
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

  // ── 로그인 콜백 ──
  async function handleLoginCallback(code, state) {
    try {
      setMsg('네이버 로그인 처리 중...');

      // 1) 백엔드 /auth/naver 호출
      // 네이버는 클라이언트에서 직접 토큰 교환이 CORS로 막혀있어서
      // code를 그대로 백엔드에 전달
      const apiBase = getApiBase();
      const res = await fetch(`${apiBase}/auth/naver`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider_access_token: code,  // code를 token으로 전달 (백엔드에서 교환)
          redirect_uri: `${window.location.origin}/oauth/naver`,
          state: state || '',
        }),
      });
      if (!res.ok) throw new Error(`서버 오류: ${res.status}`);
      const data = await res.json();
      const customToken = data.custom_token || data.customToken;
      if (!customToken) throw new Error('Custom token 발급 실패');

      // 2) Firebase 로그인
      await loginWithFirebaseCustomToken(customToken);

      // 3) 닉네임 저장
      const nickname = data.user?.nickname || data.nickname || data.name || '사장님';
      localStorage.setItem('user_nickname', nickname);

      // 4) Firebase 인증 완료 대기
      await new Promise((resolve) => {
        const unsub = auth.onAuthStateChanged((user) => {
          if (user) { unsub(); resolve(); }
        });
        setTimeout(resolve, 5000);
      });

      router.push('/dashboard');
    } catch (err) {
      console.error('네이버 로그인 실패:', err);
      setMsg(`❌ 로그인 실패: ${err.message}`);
      setTimeout(() => router.push('/login'), 2000);
    }
  }

  // ── 캘린더 콜백 ──
  async function handleCalendarCallback(code, state) {
    try {
      setMsg('네이버 캘린더 연결 중...');
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
        const authHeaders = await getAuthHeaders();
        Object.assign(headers, authHeaders);
      }

      const res = await fetch(`${getApiBase()}/calendar/connections/oauth-code`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          provider: 'naver',
          code,
          redirect_uri: `${window.location.origin}/oauth/naver`,
          state: realState,
        }),
      });
      if (!res.ok) throw new Error(`서버 오류: ${res.status}`);
      setMsg('✅ 네이버 캘린더 연결 완료!');
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
      <div className="inline-block w-8 h-8 border-4 border-[#03C75A] border-t-transparent rounded-full animate-spin mb-4" />
      <div id="msg" className="text-ink-secondary text-sm">네이버 처리 중...</div>
    </div>
  );
}

export default function NaverCallbackPage() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <Suspense fallback={<div className="text-center text-sm text-ink-secondary">로딩 중...</div>}>
        <NaverCallback />
      </Suspense>
    </main>
  );
}
