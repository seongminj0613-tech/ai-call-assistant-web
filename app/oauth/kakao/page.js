'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authApi, getApiBase, getAuthHeaders } from '@/lib/api';
import { loginWithFirebaseCustomToken, auth } from '@/lib/firebase';

function KakaoCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    if (!code) {
      router.push('/login');
      return;
    }
    // state 있으면 캘린더 OAuth, 없으면 로그인 OAuth
    if (state) {
      handleCalendarCallback(code, state);
    } else {
      handleLoginCallback(code);
    }
  }, []);

// 캘린더 연결
async function handleCalendarCallback(code, state) {
    try {
      // state에서 firebase_token 추출
      let firebaseToken = null;
      let realState = state;
      try {
        const stateObj = JSON.parse(atob(state));
        firebaseToken = stateObj.firebase_token;
        realState = stateObj.state;
      } catch (e) {
        // state가 JSON이 아니면 그냥 사용
      }

      const headers = { 'Content-Type': 'application/json' };
      if (firebaseToken) {
        headers['Authorization'] = `Bearer ${firebaseToken}`;
      } else {
        // fallback
        const authHeaders = await getAuthHeaders();
        Object.assign(headers, authHeaders);
      }

      const res = await fetch(`${getApiBase()}/calendar/connections/oauth-code`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          provider: 'kakao',
          code,
          redirect_uri: `${window.location.origin}/oauth/kakao`,
          state: realState,
        }),
      });
      if (!res.ok) throw new Error(`서버 오류: ${res.status}`);
      document.getElementById('msg').textContent = '✅ 카카오 캘린더 연결 완료! 앱으로 돌아가세요.';
    } catch (err) {
      console.error(err);
      document.getElementById('msg').textContent = `❌ 연결 실패: ${err.message}`;
    }
  }
  // 로그인
  async function handleLoginCallback(code) {
    try {
      const tokenRes = await fetch('https://kauth.kakao.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: process.env.NEXT_PUBLIC_KAKAO_JS_KEY,
          redirect_uri: `${window.location.origin}/oauth/kakao`,
          code,
        }),
      });
      const tokenData = await tokenRes.json();
      const kakaoAccessToken = tokenData.access_token;
      if (!kakaoAccessToken) throw new Error('카카오 토큰 발급 실패');

      const userRes = await fetch('https://kapi.kakao.com/v2/user/me', {
        headers: { Authorization: `Bearer ${kakaoAccessToken}` },
      });
      const kakaoUser = await userRes.json();
      const nickname = kakaoUser.kakao_account?.profile?.nickname || '';

      const response = await authApi.kakaoLogin(kakaoAccessToken);
      const { custom_token } = response.data;
      await loginWithFirebaseCustomToken(custom_token);

      if (nickname) localStorage.setItem('user_nickname', nickname);

      await new Promise((resolve) => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
          if (user) { unsubscribe(); resolve(); }
        });
        setTimeout(resolve, 5000);
      });

      router.push('/dashboard');
    } catch (err) {
      console.error('카카오 콜백 처리 실패:', err);
      router.push('/login?error=kakao_failed');
    }
  }

  return (
    <div className="text-center p-8">
      <div className="inline-block w-8 h-8 border-4 border-[#FEE500] border-t-transparent rounded-full animate-spin mb-4" />
      <div id="msg" className="text-ink-secondary text-sm">카카오 처리 중...</div>
    </div>
  );
}

export default function KakaoCallbackPage() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <Suspense fallback={
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-[#FEE500] border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-ink-secondary text-sm">로딩 중...</p>
        </div>
      }>
        <KakaoCallback />
      </Suspense>
    </main>
  );
}