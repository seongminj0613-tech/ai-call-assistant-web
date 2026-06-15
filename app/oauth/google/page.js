'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { getApiBase, getAuthHeaders } from '@/lib/api';

function GoogleCalendarCallback() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    if (!code) {
      document.getElementById('msg').textContent = '코드가 없습니다.';
      return;
    }
    handleCallback(code, state);
  }, []);

  async function handleCallback(code, state) {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${getApiBase()}/calendar/connections/oauth-code`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'google',
          code,
          redirect_uri: `${window.location.origin}/oauth/google`,
          state: state || '',
        }),
      });
      if (!res.ok) throw new Error(`서버 오류: ${res.status}`);
      document.getElementById('msg').textContent = '✅ Google 캘린더 연결 완료! 앱으로 돌아가세요.';
    } catch (err) {
      console.error(err);
      document.getElementById('msg').textContent = `❌ 연결 실패: ${err.message}`;
    }
  }

  return (
    <div className="text-center p-8">
      <div id="msg" className="text-lg font-semibold">Google 캘린더 연결 중...</div>
    </div>
  );
}

export default function GoogleCallbackPage() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <Suspense fallback={<div className="text-center">로딩 중...</div>}>
        <GoogleCalendarCallback />
      </Suspense>
    </main>
  );
}