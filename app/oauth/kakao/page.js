'use client';

import { useEffect, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authApi } from '@/lib/api';
import { loginWithFirebaseCustomToken, auth } from '@/lib/firebase';
import { completeCalendarOAuth } from '@/lib/calendarOAuth';

function KakaoCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const handledRef = useRef(false);

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state') || '';

    if (!code) {
      router.replace('/login');
      return;
    }

    if (handledRef.current) {
      return;
    }

    handledRef.current = true;

    const isCalendarCallback = state.startsWith('calendar:kakao:');
    const storageKey = `kakao_oauth_${isCalendarCallback ? 'calendar' : 'login'}_${code}`;
    const existingStatus = sessionStorage.getItem(storageKey);

    if (existingStatus === 'processing') {
      console.warn('이미 처리 중인 카카오 OAuth code입니다.');
      return;
    }

    if (existingStatus === 'done') {
      console.warn('이미 처리 완료된 카카오 OAuth code입니다.');
      router.replace(isCalendarCallback ? '/dashboard?calendar=connected' : '/dashboard');
      return;
    }

    sessionStorage.setItem(storageKey, 'processing');

    async function run() {
      try {
        if (isCalendarCallback) {
          await handleCalendarCallback(code, state);
          sessionStorage.setItem(storageKey, 'done');
          router.replace('/dashboard?calendar=connected');
          return;
        }

        await handleCallback(code);
        sessionStorage.setItem(storageKey, 'done');
        router.replace('/dashboard');
      } catch (err) {
        sessionStorage.removeItem(storageKey);

        if (isCalendarCallback) {
          console.error('카카오 캘린더 콜백 처리 실패:', err);
          router.replace('/dashboard?calendar=failed');
          return;
        }

        console.error('카카오 콜백 처리 실패:', err);
        router.replace('/login?error=kakao_failed');
      }
    }

    run();
  }, [router, searchParams]);

  async function handleCalendarCallback(code, state) {
    await completeCalendarOAuth({ provider: 'kakao', code, state });
  }

  async function handleCallback(code) {
    const tokenRes = await fetch('https://kauth.kakao.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: process.env.NEXT_PUBLIC_KAKAO_JS_KEY,
        redirect_uri: `${window.location.origin}/oauth/kakao`,
        code,
      }),
    });

    if (!tokenRes.ok) {
      const errorBody = await tokenRes.text();
      throw new Error(`카카오 토큰 발급 실패: ${tokenRes.status} ${errorBody}`);
    }

    const tokenData = await tokenRes.json();
    const kakaoAccessToken = tokenData.access_token;

    if (!kakaoAccessToken) {
      throw new Error('카카오 토큰 응답에 access_token이 없습니다.');
    }

    const userRes = await fetch('https://kapi.kakao.com/v2/user/me', {
      headers: { Authorization: `Bearer ${kakaoAccessToken}` },
    });

    if (!userRes.ok) {
      const errorBody = await userRes.text();
      throw new Error(`카카오 사용자 정보 조회 실패: ${userRes.status} ${errorBody}`);
    }

    const kakaoUser = await userRes.json();
    const kakaoId = String(kakaoUser.id);
    const email = kakaoUser.kakao_account?.email || '';
    const nickname = kakaoUser.kakao_account?.profile?.nickname || '';

    const response = await authApi.kakaoLogin(kakaoId, email, nickname);
    const { custom_token } = response.data;

    if (!custom_token) {
      throw new Error('백엔드 응답에 Firebase custom_token이 없습니다.');
    }

    await loginWithFirebaseCustomToken(custom_token);

    if (nickname) {
      localStorage.setItem('user_nickname', nickname);
    }

    await new Promise((resolve) => {
      const unsubscribe = auth.onAuthStateChanged((user) => {
        if (user) {
          unsubscribe();
          resolve();
        }
      });

      setTimeout(resolve, 5000);
    });
  }

  return (
    <div className="text-center">
      <div className="inline-block w-8 h-8 border-4 border-[#FEE500] border-t-transparent rounded-full animate-spin mb-4" />
      <p className="text-ink-secondary text-sm">카카오 처리 중...</p>
    </div>
  );
}

export default function KakaoCallbackPage() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <Suspense
        fallback={
          <div className="text-center">
            <div className="inline-block w-8 h-8 border-4 border-[#FEE500] border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-ink-secondary text-sm">로딩 중...</p>
          </div>
        }
      >
        <KakaoCallback />
      </Suspense>
    </main>
  );
}
