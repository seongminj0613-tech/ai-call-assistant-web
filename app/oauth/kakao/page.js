'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authApi } from '@/lib/api';
import { loginWithFirebaseCustomToken, auth } from '@/lib/firebase';

function KakaoCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const code = searchParams.get('code');
    if (!code) {
      router.push('/login');
      return;
    }
    handleCallback(code);
  }, []);

  async function handleCallback(code) {
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
      const kakaoId  = String(kakaoUser.id);
      const email    = kakaoUser.kakao_account?.email || '';
      const nickname = kakaoUser.kakao_account?.profile?.nickname || '';

      const response = await authApi.kakaoLogin(kakaoId, email, nickname);
      const { custom_token } = response.data;

      await loginWithFirebaseCustomToken(custom_token);

      if (nickname) localStorage.setItem('user_nickname', nickname);

      await new Promise((resolve) => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
          if (user) {
            unsubscribe();
            resolve();
          }
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
    <div className="text-center">
      <div className="inline-block w-8 h-8 border-4 border-[#FEE500] border-t-transparent rounded-full animate-spin mb-4" />
      <p className="text-ink-secondary text-sm">카카오 로그인 처리 중...</p>
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